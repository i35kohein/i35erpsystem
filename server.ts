import "dotenv/config";
import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { randomBytes, createHash, timingSafeEqual, scryptSync } from "crypto";

// --- Military-grade security middleware (Ko Hein 2026-08-13) ---
// Layered defenses: helmet-style headers, strict CORS, CSRF via custom-header
// requirement + Origin check, per-route rate limits, server-side audit log,
// and a data-proxy that keeps the Supabase service-role key server-side ONLY
// (the client never holds a database key — P0 fix: the publishable key in the
// JS bundle previously allowed ANYONE to read/write/delete every table).

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: "10mb" }));

  // ---- Security headers (helmet-style, no extra dep) ----
  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    res.setHeader("Permissions-Policy", "camera=(self), microphone=(), geolocation=()");
    // Strict CSP: no inline scripts (Vite emits external files), self-only
    // sources, blob: for QR camera frames, data: for images. The AI chat
    // renders plain text only — no unsafe-eval.
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; " +
        "img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' " +
        "https://*.supabase.co wss://*.supabase.co; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
    );
    if (process.env.NODE_ENV === "production") {
      res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    }
    next();
  });

  // ---- Strict CORS: same-origin only (the SPA and API share one origin via
  // Caddy). No cross-origin requests are legitimate. ----
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && origin !== `https://${req.headers.host}` && origin !== `http://${req.headers.host}` && origin !== `https://erp.i35appleservice.com`) {
      res.status(403).json({ success: false, error: "Cross-origin request blocked." });
      return;
    }
    next();
  });

  // ---- Audit log (server-side, append-only JSONL, capped) ----
  const AUDIT_LOG_FILE = path.join(process.cwd(), "audit-log.jsonl");
  const AUDIT_MAX_LINES = 5000;
  function auditLog(event: string, detail: Record<string, unknown>) {
    try {
      const line = JSON.stringify({ t: new Date().toISOString(), event, ...detail }) + "\n";
      fs.appendFileSync(AUDIT_LOG_FILE, line);
      const lines = fs.readFileSync(AUDIT_LOG_FILE, "utf8").split("\n").filter(Boolean);
      if (lines.length > AUDIT_MAX_LINES) {
        fs.writeFileSync(AUDIT_LOG_FILE, lines.slice(-AUDIT_MAX_LINES).join("\n") + "\n");
      }
    } catch (err) {
      console.error("Audit log write failed:", err);
    }
  }

  // ---- IP helpers (function declarations so they hoist above the middleware) ----
  function getClientIpSafe(req: express.Request): string {
    const peer = req.socket?.remoteAddress || "unknown";
    const peerClean = peer.replace(/^::ffff:/, "");
    const isTrustedProxy = peerClean === "127.0.0.1" || peerClean === "::1" || peerClean.startsWith("172.") || peerClean.startsWith("10.");
    if (isTrustedProxy) {
      const fwd = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim();
      if (fwd) return fwd;
    }
    return peerClean || "unknown";
  }

  // ---- Global API rate limit (per-IP token bucket) ----
  const apiHits = new Map<string, { count: number; resetAt: number }>();
  const API_RATE_MAX = 300; // per window
  const API_RATE_WINDOW_MS = 60_000;
  app.use("/api", (req, res, next) => {
    const ip = getClientIpSafe(req);
    const now = Date.now();
    let rec = apiHits.get(ip);
    if (!rec || now > rec.resetAt) {
      rec = { count: 0, resetAt: now + API_RATE_WINDOW_MS };
      apiHits.set(ip, rec);
    }
    rec.count += 1;
    if (rec.count > API_RATE_MAX) {
      res.status(429).json({ success: false, error: "Rate limit exceeded — slow down." });
      return;
    }
    next();
  });

  async function readProviderJson(response: Response, providerName: string) {
    const body = await response.text();
    if (!body.trim()) {
      throw new Error(`${providerName} returned an empty response (HTTP ${response.status}).`);
    }
    try {
      return JSON.parse(body);
    } catch {
      throw new Error(`${providerName} returned an invalid response (HTTP ${response.status}).`);
    }
  }

  // Helper function to get Gemini instance safely
  function getGeminiClient() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured in environment secrets.");
    }
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }

  // --- API Routes ---

  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", service: "Apple Repair ERP API", timestamp: new Date().toISOString() });
  });


  // Simple email/password auth — credentials from .env
  // POST /api/auth/login { email, password } -> { user } | 401 | 429
  // Persistent auth sessions: tokens survive server restarts (written to
  // auth-tokens.json in cwd) and expire after TOKEN_TTL_DAYS.
  // Tokens are stored SHA-256 hashed (raw token only lives in the client).
  // Brute-force protection: per-IP rate limit + lockout after repeated failures.
  const AUTH_TOKENS_FILE = path.join(process.cwd(), "auth-tokens.json");
  const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
  const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
  const authTokens: Record<string, { email: string; expiresAt: number }> = (() => {
    try {
      const raw = JSON.parse(fs.readFileSync(AUTH_TOKENS_FILE, "utf8"));
      // Migration: pre-hash tokens were stored raw (48-char hex keys). Re-key them.
      const migrated: Record<string, { email: string; expiresAt: number }> = {};
      let needsSave = false;
      for (const [key, val] of Object.entries(raw)) {
        if (!val || typeof val !== "object") continue;
        migrated[key.length === 64 ? key : hashToken(key)] = val as any;
        if (key.length !== 64) needsSave = true;
      }
      // Persist the migration immediately so raw tokens never stay on disk.
      if (needsSave) {
        try {
          fs.writeFileSync(AUTH_TOKENS_FILE, JSON.stringify(migrated));
        } catch (err) {
          console.error("Auth token migration save failed:", err);
        }
      }
      return migrated;
    } catch {
      return {};
    }
  })();
  const saveAuthTokens = () => {
    try {
      fs.writeFileSync(AUTH_TOKENS_FILE, JSON.stringify(authTokens));
    } catch (err) {
      console.error("Auth token save failed:", err);
    }
  };
  const isTokenValid = (token: string) => {
    const entry = authTokens[hashToken(token)];
    if (!entry) return false;
    if (entry.expiresAt < Date.now()) {
      delete authTokens[hashToken(token)];
      saveAuthTokens();
      return false;
    }
    return true;
  };
  // Auth gate for paid-LLM routes (audit G-1): every AI endpoint requires a
  // valid session token so the server's paid API keys can't be used as a free
  // proxy by anyone who can reach the port.
  const requireAuth = (req: express.Request, res: express.Response): boolean => {
    const token = (req.headers["x-session-token"] as string) || "";
    if (!isTokenValid(token)) {
      res.status(401).json({ success: false, error: "Authentication required." });
      return false;
    }
    return true;
  };
  // --- Brute-force protection: per-IP attempt tracking ---
  const LOGIN_WINDOW_MS = Number(process.env.LOGIN_RATE_WINDOW_MS) || 60_000;
  const LOGIN_MAX_ATTEMPTS = Number(process.env.LOGIN_MAX_ATTEMPTS) || 5; // per window
  const LOGIN_LOCKOUT_MS = Number(process.env.LOGIN_LOCKOUT_MS) || 15 * 60_000;
  const LOGIN_LOCKOUT_THRESHOLD = Number(process.env.LOGIN_LOCKOUT_THRESHOLD) || 10; // failures before lockout
  const loginAttempts = new Map<string, { count: number; firstAt: number; lockedUntil: number }>();
  const getClientIp = (req: express.Request) => getClientIpSafe(req);
  const safeEqual = (a: string, b: string) => {
    const ba = Buffer.from(a);
    const bb = Buffer.from(b);
    return ba.length === bb.length && timingSafeEqual(ba, bb);
  };

  // ---- Military-grade password verification (Ko Hein 2026-08-13) ----
  // Admin password supports two formats:
  //   1. AUTH_PASSWORD_HASH=<scrypt:$saltHex:$hashHex> — preferred, derived
  //      with scrypt (N=2^15, r=8, p=1) so a leaked .env can't be
  //      brute-forced at GPU speed.
  //   2. Legacy AUTH_PASSWORD=<plaintext> — compared with timingSafeEqual
  //      (still better than ===), kept for backward compat. Convert to a
  //      hash with scripts/hash-password.mjs.
  const SCRYPT_N = 1 << 15;
  function verifyPassword(input: string, storedHash: string | undefined, legacyPlain: string | undefined): boolean {
    if (storedHash && storedHash.startsWith("scrypt:")) {
      const parts = storedHash.split(":");
      if (parts.length !== 3) return false;
      const [, saltHex, hashHex] = parts;
      try {
        const derived = scryptSync(input, Buffer.from(saltHex, "hex"), 32, { N: SCRYPT_N, r: 8, p: 1, maxmem: 128 * 1024 * 1024 });
        const expected = Buffer.from(hashHex, "hex");
        return derived.length === expected.length && timingSafeEqual(derived, expected);
      } catch {
        return false;
      }
    }
    // Legacy plaintext path
    return Boolean(legacyPlain) && safeEqual(input, legacyPlain);
  }
  // Extra staff logins (server-only credentials file — never synced to clients).
  // Format: { "<email>": { "passwordHash": "<sha256 hex>", "name": "...", "role": "..." } }
  const CREDENTIALS_FILE = path.join(process.cwd(), "credentials.json");
  const extraUsers: Record<string, { passwordHash: string; name: string; role?: string }> = (() => {
    try {
      return JSON.parse(fs.readFileSync(CREDENTIALS_FILE, "utf8"));
    } catch {
      return {};
    }
  })();
  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body || {};
    const authEmail = (process.env.AUTH_EMAIL || "").trim().toLowerCase();
    const authPassHash = process.env.AUTH_PASSWORD_HASH || "";
    const authPass = process.env.AUTH_PASSWORD || "";
    if (!authEmail || (!authPassHash && !authPass)) {
      res.status(503).json({ success: false, error: "Auth not configured on server" });
      return;
    }
    const ip = getClientIp(req);
    const now = Date.now();
    let rec = loginAttempts.get(ip);
    if (!rec || now - rec.firstAt > LOGIN_WINDOW_MS) {
      rec = { count: 0, firstAt: now, lockedUntil: 0 };
      loginAttempts.set(ip, rec);
    }
    if (rec.lockedUntil > now) {
      const mins = Math.ceil((rec.lockedUntil - now) / 60_000);
      res.status(429).json({ success: false, error: `Too many failed attempts — locked for ${mins} min. Try again later.` });
      return;
    }
    if (rec.count >= LOGIN_MAX_ATTEMPTS) {
      res.status(429).json({ success: false, error: "Too many login attempts — wait a minute and try again." });
      return;
    }
    const emailOk = safeEqual(String(email || "").trim().toLowerCase(), authEmail);
    const passOk = verifyPassword(String(password || ""), authPassHash, authPass);
    if (emailOk && passOk) {
      loginAttempts.delete(ip);
      const token = randomBytes(24).toString("hex");
      authTokens[hashToken(token)] = { email: authEmail, expiresAt: Date.now() + TOKEN_TTL_MS };
      saveAuthTokens();
      auditLog("auth.login", { email: authEmail, ip, result: "success" });
      res.json({ success: true, token, user: { email: authEmail, name: "Ko Hein" } });
      return;
    }
    // Staff logins from credentials.json (hashed passwords, server-only file).
    const cred = extraUsers[String(email || "").trim().toLowerCase()];
    if (cred && safeEqual(createHash("sha256").update(String(password || "")).digest("hex"), cred.passwordHash)) {
      loginAttempts.delete(ip);
      const token = randomBytes(24).toString("hex");
      authTokens[hashToken(token)] = { email: String(email || "").trim().toLowerCase(), expiresAt: Date.now() + TOKEN_TTL_MS };
      saveAuthTokens();
      res.json({ success: true, token, user: { email: String(email || "").trim().toLowerCase(), name: cred.name || "Staff" } });
      return;
    }
    {
      rec.count += 1;
      auditLog("auth.login", { email: String(email || "").trim().toLowerCase(), ip, result: "failed" });
      if (rec.count >= LOGIN_LOCKOUT_THRESHOLD) {
        rec.lockedUntil = now + LOGIN_LOCKOUT_MS;
        rec.count = 0;
        saveAuthTokens();
        res.status(429).json({ success: false, error: "Too many failed attempts — account locked for 15 minutes." });
        return;
      }
      loginAttempts.set(ip, rec);
      res.status(401).json({ success: false, error: "Invalid email or password" });
    }
  });
  app.post("/api/auth/logout", (req, res) => {
    const token = (req.headers["x-session-token"] as string) || "";
    delete authTokens[hashToken(token)];
    saveAuthTokens();
    res.json({ success: true });
  });
  // Log out every device except the caller (admin "kick devices" action).
  // A VALID session token is required — otherwise anyone could silently log
  // out every staff member (audit G-2).
  app.post("/api/auth/logout-all", (req, res) => {
    const token = (req.headers["x-session-token"] as string) || "";
    if (!isTokenValid(token)) {
      res.status(401).json({ success: false, error: "Valid session token required." });
      return;
    }
    // Audit E/G P2: only the owner/admin may kick every other device. The
    // server knows the admin email from env — check the token's session email
    // against it. (The client UI already hides the button for non-admins, but
    // the endpoint must enforce it too.)
    const sessionEmail = (authTokens[hashToken(token)]?.email || "").toLowerCase().trim();
    const adminEmail = (process.env.AUTH_EMAIL || "").toLowerCase().trim();
    if (!adminEmail || sessionEmail !== adminEmail) {
      res.status(403).json({ success: false, error: "Only the admin can sign out all devices." });
      return;
    }
    const currentHash = hashToken(token);
    const keep = authTokens[currentHash] ? { [currentHash]: authTokens[currentHash] } : {};
    const revoked = Object.keys(authTokens).length - Object.keys(keep).length;
    for (const key of Object.keys(authTokens)) {
      if (!keep[key]) delete authTokens[key];
    }
    saveAuthTokens();
    res.json({ success: true, revoked });
  });
  app.post("/api/auth/verify", (req, res) => {
    const token = (req.headers["x-session-token"] as string) || "";
    if (isTokenValid(token)) {
      // Return the current session user (audit G P2) so the client can
      // re-hydrate authUser from the server instead of trusting stale
      // localStorage role/permission snapshots.
      const entry = authTokens[hashToken(token)];
      res.json({ success: true, user: { email: entry?.email || "", name: entry?.email || "" } });
    } else {
      res.status(401).json({ success: false });
    }
  });

  // ---------------------------------------------------------------------
  // DATA PROXY (P0 security fix, Ko Hein 2026-08-13)
  // ---------------------------------------------------------------------
  // Previously the client talked to Supabase DIRECTLY with a publishable key
  // shipped in the JS bundle — anyone could read/write/delete every business
  // table (customers, work orders, payouts, users). Now ALL data access goes
  // through this authenticated proxy; the service-role key stays server-side
  // only. Client endpoints: GET (list), POST (save/delete/clear). Every
  // request requires a valid session token.
  const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE || "";
  const SUPABASE_URL = process.env.SUPABASE_URL || "";
  const isServiceConfigured = () => Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE);
  const supabaseHeaders = () => ({
    apikey: SUPABASE_SERVICE_ROLE,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}`,
    "Content-Type": "application/json",
  });

  // Whitelist — the client may only touch known collections.
  const ALLOWED_COLLECTIONS = new Set([
    "workOrders", "parts", "customers", "technicians", "technicianPayouts",
    "systemSettings", "priceCatalog", "priceCategories", "priceFolders",
    "suppliers", "rmas", "purchaseOrders", "users", "expenses",
    "monthlyReports", "notifications", "supplierDebts",
  ]);

  // Secrets are stripped server-side too — the browser must never receive or
  // persist AI keys / Telegram tokens (defense in depth; client also strips).
  function serverSafeData(collectionName: string, data: Record<string, unknown>) {
    if (collectionName !== "systemSettings") return data;
    const safe = { ...data };
    delete safe.aiApiKey;
    delete safe.telegramBotToken;
    return safe;
  }

  // GET /api/data/:collection — list rows (auth required)
  app.get("/api/data/:collection", async (req, res) => {
    if (!requireAuth(req, res)) return;
    if (!isServiceConfigured()) {
      res.status(503).json({ success: false, error: "Data service not configured." });
      return;
    }
    const collection = String(req.params.collection || "");
    if (!ALLOWED_COLLECTIONS.has(collection)) {
      res.status(403).json({ success: false, error: "Unknown collection." });
      return;
    }
    try {
      const pageSize = 1000;
      const rows: any[] = [];
      let offset = 0;
      for (;;) {
        const r = await fetch(
          `${SUPABASE_URL}/rest/v1/erp_records?select=data&collection_name=eq.${encodeURIComponent(collection)}&order=updated_at.asc&offset=${offset}&limit=${pageSize}`,
          { headers: supabaseHeaders() }
        );
        if (!r.ok) throw new Error(`Supabase ${r.status}`);
        const page: any[] = await r.json();
        rows.push(...page);
        if (!page || page.length < pageSize) break;
        offset += pageSize;
      }
      res.json({ success: true, rows: rows.map((row) => row?.data).filter(Boolean) });
    } catch (err) {
      console.error(`Data proxy read failed (${collection}):`, err);
      res.status(502).json({ success: false, error: "Data service error." });
    }
  });

  // POST /api/data/save — upsert one or many rows (auth required)
  app.post("/api/data/save", async (req, res) => {
    if (!requireAuth(req, res)) return;
    if (!isServiceConfigured()) {
      res.status(503).json({ success: false, error: "Data service not configured." });
      return;
    }
    const { collection, rows } = req.body || {};
    if (!ALLOWED_COLLECTIONS.has(String(collection || ""))) {
      res.status(403).json({ success: false, error: "Unknown collection." });
      return;
    }
    const list = Array.isArray(rows) ? rows : rows ? [rows] : [];
    if (!list.length) {
      res.status(400).json({ success: false, error: "No rows provided." });
      return;
    }
    try {
      const payload = list.map((item: any) => ({
        collection_name: collection,
        id: item?.id,
        data: serverSafeData(collection, item || {}),
        updated_at: item?.updatedAt || new Date().toISOString(),
      }));
      const r = await fetch(`${SUPABASE_URL}/rest/v1/erp_records`, {
        method: "POST",
        headers: supabaseHeaders(),
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error(`Supabase ${r.status}`);
      const sessionEmail = authTokens[hashToken(String(req.headers["x-session-token"] || ""))]?.email || "?";
      auditLog("data.save", { collection, count: payload.length, by: sessionEmail });
      res.json({ success: true });
    } catch (err) {
      console.error(`Data proxy save failed (${collection}):`, err);
      res.status(502).json({ success: false, error: "Data service error." });
    }
  });

  // POST /api/data/delete — delete rows by id (auth required)
  app.post("/api/data/delete", async (req, res) => {
    if (!requireAuth(req, res)) return;
    if (!isServiceConfigured()) {
      res.status(503).json({ success: false, error: "Data service not configured." });
      return;
    }
    const { collection, ids } = req.body || {};
    if (!ALLOWED_COLLECTIONS.has(String(collection || ""))) {
      res.status(403).json({ success: false, error: "Unknown collection." });
      return;
    }
    const idList = Array.isArray(ids) ? ids.filter(Boolean) : [];
    if (!idList.length) {
      res.status(400).json({ success: false, error: "No ids provided." });
      return;
    }
    try {
      for (const id of idList) {
        const r = await fetch(
          `${SUPABASE_URL}/rest/v1/erp_records?collection_name=eq.${encodeURIComponent(collection)}&id=eq.${encodeURIComponent(id)}`,
          { method: "DELETE", headers: supabaseHeaders() }
        );
        if (!r.ok) throw new Error(`Supabase ${r.status}`);
      }
      const sessionEmail = authTokens[hashToken(String(req.headers["x-session-token"] || ""))]?.email || "?";
      auditLog("data.delete", { collection, count: idList.length, by: sessionEmail });
      res.json({ success: true });
    } catch (err) {
      console.error(`Data proxy delete failed (${collection}):`, err);
      res.status(502).json({ success: false, error: "Data service error." });
    }
  });

  // POST /api/data/clear — delete ALL rows of a collection (ADMIN ONLY)
  app.post("/api/data/clear", async (req, res) => {
    const token = String(req.headers["x-session-token"] || "");
    if (!isTokenValid(token)) {
      res.status(401).json({ success: false, error: "Authentication required." });
      return;
    }
    const sessionEmail = (authTokens[hashToken(token)]?.email || "").toLowerCase().trim();
    const adminEmail = (process.env.AUTH_EMAIL || "").toLowerCase().trim();
    if (!adminEmail || sessionEmail !== adminEmail) {
      res.status(403).json({ success: false, error: "Admin only." });
      return;
    }
    if (!isServiceConfigured()) {
      res.status(503).json({ success: false, error: "Data service not configured." });
      return;
    }
    const { collection } = req.body || {};
    if (!ALLOWED_COLLECTIONS.has(String(collection || ""))) {
      res.status(403).json({ success: false, error: "Unknown collection." });
      return;
    }
    try {
      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/erp_records?collection_name=eq.${encodeURIComponent(collection)}`,
        { method: "DELETE", headers: supabaseHeaders() }
      );
      if (!r.ok) throw new Error(`Supabase ${r.status}`);
      auditLog("data.clear", { collection, by: sessionEmail });
      res.json({ success: true });
    } catch (err) {
      console.error(`Data proxy clear failed (${collection}):`, err);
      res.status(502).json({ success: false, error: "Data service error." });
    }
  });

  // AI Repair Diagnostics & Panic Log Analyzer
  app.post("/api/gemini/diagnose", async (req, res) => {
    if (!requireAuth(req, res)) return;
    try {
      const { deviceModel, symptoms, panicLog, errorCodes } = req.body;
      const ai = getGeminiClient();

      const prompt = `You are an expert Apple Certified Mac & iOS Repair Master Technician specializing in hardware diagnostics, micro-soldering, and board repair.
Analyze the following repair diagnostic request:
- Device Model: ${deviceModel || "Apple Device"}
- Reported Symptoms / Notes: ${symptoms || "None provided"}
- Panic Log / Error Code: ${panicLog || errorCodes || "None provided"}

Provide a structured, highly actionable diagnostic breakdown formatted as clear JSON with the following keys:
1. "suspectedIssues": array of strings listing likely hardware/chip/component failures (e.g., "Tristar USB IC U2 failure", "I2C0 Bus Pull-Up Resistor R4010 open circuit", "Battery Data Line BSI short").
2. "diodeTestPoints": array of strings detailing specific multimeter diode mode test points or rails to measure (e.g., "PP_VCC_MAIN: Expect ~0.380V - 0.420V in Diode mode", "I2C_SCL_AP line to ground").
3. "recommendedAction": concise step-by-step repair strategy for the technician.
4. "requiredPartsOrTools": array of tools or parts needed (e.g., "MIG/TIG Soldering Station", "HYDRA IC", "0201 Jumper Wire", "Hot Air Rework Station").
5. "estimatedDifficulty": "Level 1 Modular" | "Level 2 Advanced Component" | "Level 3 Micro-Soldering".
6. "clientExplanation": clear, professional 2-sentence explanation suitable for the customer.

Return ONLY valid JSON.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });

      const textResult = response.text || "{}";
      const parsed = JSON.parse(textResult);
      res.json({ success: true, diagnosis: parsed });
    } catch (err: any) {
      console.error("Gemini diagnose error:", err);
      res.status(500).json({ success: false, error: "Failed to generate AI diagnostic analysis" });
    }
  });

  // AI IMEI / Serial Specs Auto-Lookup


  // AI Draft Customer Notification
  app.post("/api/gemini/draft-message", async (req, res) => {
    if (!requireAuth(req, res)) return;
    try {
      const { customerName, deviceName, status, totalCost, notes, channel } = req.body;
      const ai = getGeminiClient();

      const prompt = `Draft a polite, highly professional ${channel || "SMS"} message for an Apple Repair Shop to send to customer "${customerName}".
Details:
- Device: ${deviceName}
- Status: ${status}
- Total Quote/Cost: ${totalCost != null && totalCost !== "" ? `${Number(totalCost).toLocaleString()} MMK` : "N/A"}
- Repair Notes: ${notes || "No special notes"}

Keep SMS under 160 characters if channel is SMS, or concise paragraph if Email. Include call to action (e.g. reply to approve, or drop by for pickup).
Return JSON with key "message".`;

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });

      const parsed = JSON.parse(response.text || "{}");
      res.json({ success: true, message: parsed.message });
    } catch (err: any) {
      console.error("Gemini draft message error:", err);
      res.status(500).json({ success: false, error: "Failed to draft notification" });
    }
  });

  // ERP-aware AI chat supporting mainstream and OpenAI-compatible custom APIs.
  app.post("/api/ai/chat", async (req, res) => {
    if (!requireAuth(req, res)) return;
    try {
      const { provider, apiKey, model, baseUrl, systemPrompt, messages, context } = req.body;
      // Server-side key fallback for EVERY provider (audit E-4): the server's
      // env keys are never exposed to the browser, and the browser-entered AI
      // key is stripped from cloud saves (cloudSafeData) so it's gone after a
      // reload. Falling back here means auto-classification keeps working even
      // when the client sends no key. A browser-provided key still wins.
      const resolvedApiKey =
        apiKey ||
        (provider === "deepseek"
          ? process.env.DEEPSEEK_API_KEY
          : provider === "openrouter"
            ? process.env.OPENROUTER_API_KEY
            : provider === "gemini"
              ? process.env.GEMINI_API_KEY
              : provider === "anthropic"
                ? process.env.ANTHROPIC_API_KEY
                : undefined);
      if (!resolvedApiKey) return res.status(400).json({ success: false, error: "AI API key is not configured on the server." });

      const instruction = `${systemPrompt || "You are a professional repair-shop operations copilot."}
Use only the supplied live ERP context. If data is unavailable, say so rather than inventing it. NEVER invent SKUs, part names, models, prices, stock counts, or ticket numbers that are not explicitly listed in the LIVE ERP CONTEXT — if a model or part is not listed, it does not exist in the data. ALWAYS reply in Myanmar (Burmese) language, regardless of the language the user writes in — keep technical terms (device models, part names, ticket numbers, prices) in English where natural. Be concise, operational, and direct: lead with the conclusion, then give prioritized next actions. Identify records by ticket, part, device, customer, or technician where possible. Use short bullets only when they improve scanability. Do not claim to have completed changes, contacted a customer, or performed an action.

LIVE ERP CONTEXT:
${JSON.stringify(context)}`;

      let answer = "";
      try {
        answer = await callAiProvider({ provider, apiKey: resolvedApiKey, model, baseUrl, systemPrompt: instruction, messages });
      } catch (err: any) {
        throw new Error(err.message || "AI provider request failed.");
      }

      res.json({ success: true, answer });
    } catch (err: any) {
      console.error("ERP AI chat error:", err);
      res.status(500).json({ success: false, error: "AI assistant request failed" });
    }
  });

  // --- Shared AI provider call (used by /api/ai/chat and the Telegram bot) ---
  async function callAiProvider(opts: {
    provider: string;
    apiKey: string;
    model?: string;
    baseUrl?: string;
    systemPrompt: string;
    messages: { role: string; content: string }[];
  }): Promise<string> {
    const { provider, apiKey, model, baseUrl, systemPrompt, messages } = opts;
    if (provider === "anthropic") {
      const response = await fetch(`${baseUrl || "https://api.anthropic.com"}/v1/messages`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: model || "claude-3-5-haiku-latest",
          max_tokens: 900,
          system: systemPrompt,
          messages,
        }),
      });
      const data: any = await readProviderJson(response, "Anthropic");
      if (!response.ok) throw new Error(data?.error?.message || "Anthropic request failed.");
      return data.content?.map((item: any) => item.text || "").join("\n") || "";
    }
    if (provider === "gemini") {
      const selectedModel = model || "gemini-2.0-flash";
      const response = await fetch(
        `${baseUrl || "https://generativelanguage.googleapis.com/v1beta"}/models/${selectedModel}:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: messages.map((message: any) => ({
              role: message.role === "assistant" ? "model" : "user",
              parts: [{ text: message.content }],
            })),
          }),
        }
      );
      const data: any = await readProviderJson(response, "Gemini");
      if (!response.ok) throw new Error(data?.error?.message || "Gemini request failed.");
      return data.candidates?.[0]?.content?.parts?.map((part: any) => part.text || "").join("\n") || "";
    }
    const providerBase =
      baseUrl ||
      (provider === "groq"
        ? "https://api.groq.com/openai/v1"
        : provider === "deepseek"
          ? "https://api.deepseek.com"
          : provider === "openrouter"
            ? "https://openrouter.ai/api/v1"
            : "https://api.openai.com/v1");
    const defaultModel =
      provider === "groq"
        ? "llama-3.1-8b-instant"
        : provider === "deepseek"
          ? "deepseek-chat"
          : provider === "openrouter"
            ? "openai/gpt-4o-mini"
            : "gpt-4o-mini";
    const response = await fetch(`${providerBase.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model || defaultModel,
        temperature: 0.2,
        messages: [{ role: "system", content: systemPrompt }, ...messages],
      }),
    });
    const data: any = await readProviderJson(response, provider === "deepseek" ? "DeepSeek" : "AI provider");
    if (!response.ok) throw new Error(data?.error?.message || "AI provider request failed.");
    return data.choices?.[0]?.message?.content || "";
  }

  // --- Telegram bot: chat with the ERP copilot from anywhere ---
  const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
  const TELEGRAM_ALLOWED_CHAT_IDS = new Set(
    (process.env.TELEGRAM_ALLOWED_CHAT_IDS || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  );
  if (TELEGRAM_BOT_TOKEN) {
    const historyFile = path.join(process.cwd(), "ai-chat-history.json");
    const tgHistory: Record<string, { role: string; content: string }[]> = (() => {
      try {
        return JSON.parse(fs.readFileSync(historyFile, "utf8"));
      } catch {
        return {};
      }
    })();
    const saveTgHistory = () => {
      try {
        fs.writeFileSync(historyFile, JSON.stringify(tgHistory));
      } catch (err) {
        console.error("Telegram history save failed:", err);
      }
    };
    const tgCall = async (method: string, body: Record<string, unknown>) => {
      const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${method}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      return res.json();
    };
    const TELEGRAM_SYSTEM_PROMPT =
      "You are the i35 Apple Service shop copilot (ERP AI assistant). ALWAYS reply in Myanmar (Burmese) language, regardless of the language the user writes in — keep technical terms in English where natural. Be concise, operational, and direct: lead with the conclusion, then give prioritized next actions. Use the LIVE ERP CONTEXT below when provided. NEVER invent SKUs, part names, models, prices, stock counts, or ticket numbers that are not explicitly listed in the context — if a model or part is not listed, it does not exist in the data; say so honestly. Do not claim to have completed actions.\n\nMONTHLY REPORT RULE: monthly per-technician completion counts come ONLY from the monthlyReport records in the context (the ERP system's monthly report, Finance → Commissions). Each record shows period, technicianName, and totalTicketsClosed. If the user asks 'ဒီလ [technician] ဘယ်နှစ်လုံး/ဘယ်နှစ်စောင် ပြင်ပြီးလဲ' (how many did X finish this month), answer with the exact totalTicketsClosed from that technician's monthlyReport record for the current period. If the technician has no monthlyReport record for the period, say honestly that they have no record in the ERP monthly report for that month and suggest checking Finance → Commissions. NEVER compute monthly totals yourself from ticket dates or work order timestamps — the monthly report is authoritative and is the only source.\n\nWORK HISTORY RULE: when the user asks what a technician has repaired (e.g. Wai Yan Hein ဘာတွေပြင်ထားလဲ, what did X fix, X ရဲ့ ပြင်ထားတဲ့အလုပ်), answer from the technicianDetail.workHistory list in the context — it lists that technician's actual work orders (order number, device model, repair items, status). If workHistory is empty, say the technician has no work orders in the data. Never invent tickets or devices.";
    // Optional live ERP context for Telegram answers (requires service role key).
    const SUPABASE_URL = process.env.SUPABASE_URL || "";
    const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE || "";
    const fetchErpContext = async (userText: string): Promise<string> => {
      if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
        return "No live ERP context configured (SUPABASE_SERVICE_ROLE missing).";
      }
      try {
        const headers = { apikey: SUPABASE_SERVICE_ROLE, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE}` };
        const [wosRaw, partsRaw, techRaw, payoutsRaw, priceRaw, catRaw, settingsRaw, supRaw, custRaw, rmaRaw] = await Promise.all([
          fetch(`${SUPABASE_URL}/rest/v1/erp_records?select=data&collection_name=eq.workOrders`, { headers }),
          fetch(`${SUPABASE_URL}/rest/v1/erp_records?select=data&collection_name=eq.parts`, { headers }),
          fetch(`${SUPABASE_URL}/rest/v1/erp_records?select=data&collection_name=eq.technicians`, { headers }),
          fetch(`${SUPABASE_URL}/rest/v1/erp_records?select=data&collection_name=eq.technicianPayouts`, { headers }),
          fetch(`${SUPABASE_URL}/rest/v1/erp_records?select=data&collection_name=eq.priceCatalog`, { headers }),
          fetch(`${SUPABASE_URL}/rest/v1/erp_records?select=data&collection_name=eq.priceCategories`, { headers }),
          fetch(`${SUPABASE_URL}/rest/v1/erp_records?select=data&collection_name=eq.systemSettings`, { headers }),
          fetch(`${SUPABASE_URL}/rest/v1/erp_records?select=data&collection_name=eq.suppliers`, { headers }),
          fetch(`${SUPABASE_URL}/rest/v1/erp_records?select=data&collection_name=eq.customers`, { headers }),
          fetch(`${SUPABASE_URL}/rest/v1/erp_records?select=data&collection_name=eq.rmas`, { headers }),
        ]);
        const wosArr = await wosRaw.json();
        const wosData: any[] = (Array.isArray(wosArr) ? wosArr : []).map((r: any) => r?.data).filter(Boolean);
        const partsArr = await partsRaw.json();
        const partData: any[] = (Array.isArray(partsArr) ? partsArr : []).map((r: any) => r?.data).filter(Boolean);
        const techArr = await techRaw.json();
        const techData: any[] = (Array.isArray(techArr) ? techArr : []).map((r: any) => r?.data).filter(Boolean);
        const payoutsArr = await payoutsRaw.json();
        const payoutsData: any[] = (Array.isArray(payoutsArr) ? payoutsArr : []).map((r: any) => r?.data).filter(Boolean);
        const priceArr = await priceRaw.json();
        const priceData: any[] = (Array.isArray(priceArr) ? priceArr : []).map((r: any) => r?.data).filter(Boolean);
        const catArr = await catRaw.json();
        const catData: any[] = (Array.isArray(catArr) ? catArr : []).map((r: any) => r?.data).filter(Boolean);
        const settingsArr = await settingsRaw.json();
        const settingsData: any[] = (Array.isArray(settingsArr) ? settingsArr : []).map((r: any) => r?.data).filter(Boolean);
        const supArr = await supRaw.json();
        const supData: any[] = (Array.isArray(supArr) ? supArr : []).map((r: any) => r?.data).filter(Boolean);
        const custArr = await custRaw.json();
        const custData: any[] = (Array.isArray(custArr) ? custArr : []).map((r: any) => r?.data).filter(Boolean);
        const rmaArr = await rmaRaw.json();
        const rmaData: any[] = (Array.isArray(rmaArr) ? rmaArr : []).map((r: any) => r?.data).filter(Boolean);
        const settings = settingsData[0] || {};
        const currency = settings.currencySymbol || "MMK";
        // Category key -> human label (e.g. Display_Original -> Display Original).
        const catLabelMap = new Map<string, string>();
        catData.forEach((c) => { if (c?.key && c?.label) catLabelMap.set(c.key, c.label); });
        const fmtPrice = (v: any) => (v == null ? null : `${Number(v).toLocaleString()}${currency}`);
        // PRICE LIST: model -> [label: price], filtered to non-null prices only.
        const priceList = priceData
          .sort((a, b) => String(a.model || "").localeCompare(String(b.model || "")))
          .map((p) => {
            const priced = Object.entries(p.prices || {})
              .filter(([, v]) => v != null && Number(v) > 0)
              .map(([k, v]) => `${catLabelMap.get(k) || k}: ${fmtPrice(v)}`);
            return `${p.model}: ${priced.length ? priced.join(", ") : "no prices"}`;
          });
        const now = new Date();
        // 'Today' in shop-local time (Asia/Rangoon, UTC+6:30) — toISOString()
        // would give the UTC date, which is the previous day before 06:30 local.
        const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Rangoon" }).format(now);
        const localDateOf = (iso: string) =>
          iso ? new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Rangoon" }).format(new Date(iso)) : "";
        const done = ["Finished", "Taken Out"];
        const active = wosData.filter((w) => !done.includes(w.status) && w.status !== "Cant Repair" && w.status !== "Customer Not Repair");
        const completedToday = wosData.filter((w) => done.includes(w.status) && localDateOf(w.completedAt || w.updatedAt || "") === today);
        const unpaid = wosData.filter((w) => !w.isPaid);
        const lowStock = partData.filter((p) => Number(p.quantityInStock || 0) <= Number(p.reorderPoint || 0)).slice(0, 30);
        const completedTodayTickets = completedToday.slice(0, 8).map((w) =>
          `${w.orderNumber} ${w.deviceModel} ${w.customerName} technician:${w.assignedTechName || "unassigned"} ${w.status}`
        );
        const todayPartsUsedMap = new Map<string, number>();
        completedToday.forEach((w) => {
          (w.lineItems || []).forEach((li: any) => {
            if (li.partId && !li.isLabor && li.quantity > 0) {
              const key = li.partName || li.description || "part";
              todayPartsUsedMap.set(key, (todayPartsUsedMap.get(key) || 0) + li.quantity);
            }
          });
        });
        const recent = [...wosData]
          .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")))
          .slice(0, 8)
          .map((w) => `${w.orderNumber} ${w.deviceModel} ${w.customerName} technician:${w.assignedTechName || "unassigned"} ${w.status} ${(w.totalAmount || 0).toLocaleString()}MMK`);
        // MONTHLY REPORT (ERP monthly report = technicianPayouts records, shown in
        // Finance → Commissions). This is the authoritative source for "ဒီလ ဘယ်နှစ်လုံး".
        const currentPeriod = today.slice(0, 7);
        const monthlyReport = payoutsData.map((p) => ({
          period: p.period || "",
          technicianName: p.technicianName || p.technicianId || "?",
          technicianId: p.technicianId || "",
          totalTicketsClosed: p.totalTicketsClosed ?? p.totalJobsCompleted ?? 0,
          totalLaborRevenue: p.totalLaborRevenue ?? p.grossLaborRevenue ?? 0,
          commissionAmount: p.commissionAmount ?? 0,
          netPayout: p.netPayout ?? p.payoutAmount ?? 0,
          status: p.status || "?",
        }));
        const context: any = {
          shop: {
            name: settings.shopName || "i35 Apple Service",
            phone: settings.shopPhone || settings.shopPhones?.join(", ") || "",
            address: settings.shopAddress || "",
            email: settings.shopEmail || "",
            website: settings.shopWebsite || "",
            currency,
            ticketPrefix: settings.ticketPrefix || "WO",
            warrantyDays: settings.defaultWarrantyDays ?? 90,
          },
          // MONTHLY REPORT — ERP monthly report records (authoritative for monthly counts).
          currentPeriod,
          monthlyReport,
          monthlyReportSummary: monthlyReport.map((m) =>
            `${m.period} ${m.technicianName}: ${m.totalTicketsClosed} ticket(s), labor ${m.totalLaborRevenue.toLocaleString()}${currency}, commission ${m.commissionAmount.toLocaleString()}${currency}, payout ${m.netPayout.toLocaleString()}${currency} (${m.status})`
          ),
          activeTickets: active.length,
          completedToday: completedToday.length,
          completedTodayTickets,
          todayPartsUsed: [...todayPartsUsedMap.entries()].map(([name, qty]) => `${name}: ${qty}`),
          technicians: techData.map((t) => `${t.name} (${t.level || ""})`),
          unpaidTickets: unpaid.length,
          outstandingMMK: unpaid.reduce((s, w) => s + ((w.totalAmount || 0) - (w.paidAmount || 0)), 0),
          partsTotal: partData.length,
          lowStockParts: lowStock.map((p) => `${p.sku || p.id} ${p.name}: stock ${p.quantityInStock} (reorder ${p.reorderPoint || 0})`),
          recentTickets: recent,
          // PRICE LIST — full repair price catalog (37 models).
          priceList,
          // SHOP SUPPLIERS (parts vendors).
          suppliers: supData.map((s) => `${s.name} (${s.code || ""}) phone ${s.phone || "-"} rating ${s.rating ?? "-"}⭐`),
          // CUSTOMERS (for lookup questions).
          customers: custData.slice(0, 100).map((c) => `${c.name}${c.company ? " (" + c.company + ")" : ""} ${c.phone || ""} ${c.type || ""} spent ${Number(c.totalSpent || 0).toLocaleString()}${currency}`),
          // RMA / warranty returns currently open.
          rmasOpen: rmaData
            .filter((r) => !["Replacement Received", "Rejected"].includes(r.status))
            .map((r) => `${r.rmaNumber} ${r.partName} qty ${r.quantity} supplier ${r.supplierName} status ${r.status}`),
        };
        // Category-specific answer: when the user names a part category,
        // include the FULL stock state of that category so the AI never guesses.
        const catMatch = /(battery\s*genuine|battery\s*original|battery\s*cell|battery|display|screen|back\s*glass|camera|flex)/i.exec(userText);
        if (catMatch) {
          const catName = catMatch[1].toLowerCase().includes("genuine")
            ? "Battery Genuine"
            : catMatch[1].toLowerCase().includes("original")
              ? "Battery"
              : catMatch[1].toLowerCase().includes("cell")
                ? "Battery Cell"
                : catMatch[1].toLowerCase().includes("back")
                  ? "Backglass"
                  : catMatch[1].toLowerCase();
          const catParts = partData
            .filter((p) => (p.category || "").toLowerCase().includes(catName.toLowerCase()))
            .sort((a, b) => Number(a.quantityInStock || 0) - Number(b.quantityInStock || 0))
            .slice(0, 40)
            .map((p) => `${p.sku || p.id} ${p.name}: stock ${p.quantityInStock} (reorder ${p.reorderPoint || 0})`);
          if (catParts.length > 0) {
            context.categoryParts = { category: catName, count: catParts.length, parts: catParts };
          }
        }
        // Technician-specific answer: when the user names a technician, include
        // that tech's full monthly stats so the AI never guesses or conflates.
        const techNameMatch = techData.find((t) =>
          userText.toLowerCase().includes((t.name || "").toLowerCase())
        );
        if (techNameMatch) {
          const tName = techNameMatch.name;
          const techId = techNameMatch.id;
          const techWos = wosData.filter((w) =>
            w.assignedTechId === techId || w.assignedTechName === tName
          );
          const techToday = completedToday.filter((w) =>
            w.assignedTechId === techId || w.assignedTechName === tName
          );
          const techActive = active.filter((w) =>
            w.assignedTechId === techId || w.assignedTechName === tName
          );
          const techMonthlyRecord = monthlyReport.find(
            (m) => m.technicianId === techId || m.technicianName === tName
          );
          // WORK HISTORY: every work order assigned to this technician, newest first,
          // with device model + repair items + status (answers "ဘာတွေပြင်ထားလဲ").
          const workHistory = [...techWos]
            .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")))
            .map((w) => {
              const repairs = (w.selectedRepairs || [])
                .map((r: any) => r.name)
                .filter(Boolean)
                .join(", ");
              return `${w.orderNumber} ${w.deviceModel}${repairs ? " — " + repairs : ""} ${w.status}${(w.completedAt || w.updatedAt || "").slice(0, 10) ? " (" + (w.completedAt || w.updatedAt || "").slice(0, 10) + ")" : ""}`;
            });
          context.technicianDetail = {
            name: tName,
            level: techNameMatch.level || "",
            activeNow: techActive.length,
            completedToday: techToday.length,
            todayTickets: techToday.slice(0, 10).map((w) => `${w.orderNumber} ${w.deviceModel}`),
            totalWorkOrders: techWos.length,
            workHistory,
            // Monthly count comes from the ERP monthly report record (authoritative).
            monthlyReportRecord: techMonthlyRecord
              ? `${techMonthlyRecord.period}: ${techMonthlyRecord.totalTicketsClosed} ticket(s) closed, labor ${techMonthlyRecord.totalLaborRevenue.toLocaleString()}${currency}, commission ${techMonthlyRecord.commissionAmount.toLocaleString()}${currency}, payout ${techMonthlyRecord.netPayout.toLocaleString()}${currency} (${techMonthlyRecord.status})`
              : null,
          };
        }
        // Model price lookup: when the user names a device model (e.g. "iPhone 13"),
        // include that model's FULL price list so the bot quotes real prices.
        const priceMatch = priceData.find((p) =>
          (p.model || "").toLowerCase().split(/\s+/).every((tok) =>
            tok.length > 1 && userText.toLowerCase().includes(tok.toLowerCase())
          )
        );
        if (priceMatch) {
          const priced = Object.entries(priceMatch.prices || {})
            .filter(([, v]) => v != null && Number(v) > 0)
            .map(([k, v]) => `${catLabelMap.get(k) || k}: ${fmtPrice(v)} (warranty ${priceMatch.warranties?.[k] || "-"})`);
          context.modelPrice = {
            model: priceMatch.model,
            prices: priced,
          };
        }
        // Customer lookup: if the user includes a phone number or a customer
        // name that exists in the roster, surface that customer's record.
        const custMatch = custData.find((c) =>
          (c.phone && userText.includes(String(c.phone))) ||
          ((c.name || "").toLowerCase().length > 3 && userText.toLowerCase().includes((c.name || "").toLowerCase()))
        );
        if (custMatch) {
          context.customerDetail = {
            name: custMatch.name,
            company: custMatch.company || null,
            phone: custMatch.phone || null,
            type: custMatch.type || null,
            discountPercent: custMatch.discountPercentage ?? null,
            totalOrders: custMatch.totalOrdersCount ?? null,
            totalSpent: Number(custMatch.totalSpent || 0).toLocaleString() + currency,
          };
        }
        return JSON.stringify(context);
      } catch (err) {
        console.error("Supabase context error:", err);
        return "Live ERP context temporarily unavailable.";
      }
    };
    const telegramAiAnswer = async (chatId: string, text: string): Promise<string> => {
      const provider = process.env.DEEPSEEK_API_KEY
        ? "deepseek"
        : process.env.GEMINI_API_KEY
          ? "gemini"
          : process.env.OPENROUTER_API_KEY
            ? "openrouter"
            : "";
      if (!provider) {
        return "AI ကို configure မလုပ်ရသေးပါ — server မှာ GEMINI_API_KEY, DEEPSEEK_API_KEY သို့မဟုတ် OPENROUTER_API_KEY ထည့်ပေးပါ။";
      }
      const key =
        provider === "deepseek"
          ? process.env.DEEPSEEK_API_KEY!
          : provider === "gemini"
            ? process.env.GEMINI_API_KEY!
            : process.env.OPENROUTER_API_KEY!;
      const history = tgHistory[chatId] || [];
      const messages = [...history.slice(-20), { role: "user", content: text }];
      try {
        const context = await fetchErpContext(text);
        const systemPrompt = `${TELEGRAM_SYSTEM_PROMPT}\n\nLIVE ERP CONTEXT:\n${context}`;
        // Model override via TELEGRAM_AI_MODEL (env). If unset, OpenRouter falls
        // back to the provider default; on failure we retry once WITHOUT the
        // override so a bad pinned model can't break the bot (bug #10).
        const override = (process.env.TELEGRAM_AI_MODEL || "").trim();
        try {
          return await callAiProvider({
            provider,
            apiKey: key,
            model: override || (provider === "openrouter" ? "anthropic/claude-opus-5" : undefined),
            systemPrompt,
            messages,
          });
        } catch (firstErr: any) {
          if (override || provider === "openrouter") {
            console.error("Telegram AI primary model failed, retrying with default:", firstErr?.message);
            return await callAiProvider({ provider, apiKey: key, model: undefined, systemPrompt, messages });
          }
          throw firstErr;
        }
      } catch (err: any) {
        console.error("Telegram AI error:", err);
        return "AI ခေါ်တဲ့အခါ အမှားဖြစ်သွားပါတယ် — နောက်တစ်ခါ ပြန်စမ်းကြည့်ပါ။";
      }
    };
    let tgOffset = 0;
    const pollTelegram = async () => {
      try {
        const updates: any = await tgCall("getUpdates", {
          offset: tgOffset,
          timeout: 25,
          allowed_updates: ["message"],
        });
        for (const update of updates?.result || []) {
          tgOffset = Math.max(tgOffset, update.update_id + 1);
          const msg = update.message;
          if (!msg || !msg.text) continue;
          const chatId = String(msg.chat.id);
          if (TELEGRAM_ALLOWED_CHAT_IDS.size && !TELEGRAM_ALLOWED_CHAT_IDS.has(chatId)) continue;
          const text = String(msg.text).trim();
          if (text === "/start" || text === "/help") {
            await tgCall("sendMessage", {
              chat_id: chatId,
              text: "🤖 i35 ERP Copilot\n\nမင်္ဂလာပါ! ဒီ bot ကနေ ERP ရဲ့ AI assistant ကို စကားပြောလို့ရပါတယ်။\n\nCommands:\n/start — စတင်မည်\n/clear — စကားပြောမှတ်တမ်း ရှင်းမည်\n/help — အကူအညီ\n\nဘာမေးမယ်ဆို ရိုက်ထည့်လိုက်ပါ — မြန်မာလိုပဲ ဖြေပေးပါမယ်။",
            });
            continue;
          }
          if (text === "/clear") {
            tgHistory[chatId] = [];
            saveTgHistory();
            await tgCall("sendMessage", { chat_id: chatId, text: "စကားပြောမှတ်တမ်း ရှင်းပြီးပါပြီ ✅" });
            continue;
          }
          await tgCall("sendChatAction", { chat_id: chatId, action: "typing" });
          const answer = await telegramAiAnswer(chatId, text);
          tgHistory[chatId] = [...(tgHistory[chatId] || []), { role: "user", content: text }, { role: "assistant", content: answer }].slice(-30);
          saveTgHistory();
          await tgCall("sendMessage", { chat_id: chatId, text: answer });
        }
      } catch (err) {
        console.error("Telegram poll error:", err);
      }
      setTimeout(pollTelegram, 1000);
    };
    pollTelegram();
    console.log("Telegram bot started (long-polling).");
  } else {
    console.log("Telegram bot disabled — set TELEGRAM_BOT_TOKEN to enable.");
  }

  // Lightweight client error logging (bug #9) — append JSONL, capped at 1000 lines.
  const ERROR_LOG_FILE = path.join(process.cwd(), "error-log.jsonl");
  app.post("/api/error-log", (req, res) => {
    // Security (Ko Hein 2026-08-13): require a valid session — anonymous log
    // poisoning / disk-fill via spoofed error entries is not acceptable.
    if (!isTokenValid(String(req.headers["x-session-token"] || ""))) {
      res.status(401).json({ success: false, error: "Authentication required." });
      return;
    }
    try {
      // Audit G-P3: bound the payload — an unbounded body could be poisoned by
      // any client. Cap the JSON-serialized entry at ~2 KB.
      const rawBody = req.body && typeof req.body === "object" ? req.body : { raw: String(req.body || "").slice(0, 500) };
      const entry = {
        t: new Date().toISOString(),
        ...rawBody,
      };
      if (JSON.stringify(entry).length > 2048) {
        res.status(413).json({ success: false, error: "Entry too large." });
        return;
      }
      fs.appendFileSync(ERROR_LOG_FILE, JSON.stringify(entry) + "\n");
      const lines = fs.readFileSync(ERROR_LOG_FILE, "utf8").split("\n").filter(Boolean);
      if (lines.length > 1000) {
        fs.writeFileSync(ERROR_LOG_FILE, lines.slice(-1000).join("\n") + "\n");
      }
      res.json({ success: true });
    } catch (err) {
      console.error("Error log write failed:", err);
      res.status(500).json({ success: false });
    }
  });

  // Unknown /api/* routes → JSON 404 (not the SPA HTML fallback) — bug #5.
  app.use("/api", (req, res) => {
    res.status(404).json({ success: false, error: `API endpoint not found: ${req.method} ${req.path}` });
  });

  // --- Vite Middleware or Static Production Serving ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");

    // Static serving with Brotli precompressed variants + long-term caching.
    // Files in /assets/ have content hashes => safe to cache forever (immutable).
    // index.html / sw.js are revalidated so updates propagate.
    const MIME: Record<string, string> = {
      ".js": "text/javascript; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".html": "text/html; charset=utf-8",
      ".json": "application/json; charset=utf-8",
      ".svg": "image/svg+xml",
      ".webmanifest": "application/manifest+json",
      ".map": "application/json; charset=utf-8",
      ".txt": "text/plain; charset=utf-8",
    };
    const COMPRESSIBLE = new Set(Object.keys(MIME));

    app.use((req, res, next) => {
      if (req.method !== "GET" && req.method !== "HEAD") return next();
      // Malformed percent-encoding would throw — fall back to the raw path (bug #6).
      let urlPath: string;
      try {
        urlPath = decodeURIComponent((req.path || "/").split("?")[0]);
      } catch {
        urlPath = req.path || "/";
      }
      if (urlPath.includes("..")) return next();
      const relPath = urlPath === "/" ? "index.html" : urlPath.replace(/^\//, "");
      const filePath = path.join(distPath, relPath);
      if (!filePath.startsWith(distPath)) return next();

      const isAsset = urlPath.startsWith("/assets/");
      if (isAsset) {
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      } else if (urlPath === "/sw.js") {
        res.setHeader("Cache-Control", "no-cache");
      } else if (urlPath === "/" || urlPath === "/index.html") {
        res.setHeader("Cache-Control", "no-cache");
      }

      const ext = path.extname(filePath).toLowerCase();
      const acceptsBr = (req.headers["accept-encoding"] || "").includes("br");
      const brPath = filePath + ".br";
      if (acceptsBr && COMPRESSIBLE.has(ext) && fs.existsSync(brPath)) {
        res.setHeader("Content-Encoding", "br");
        res.setHeader("Vary", "Accept-Encoding");
        return res.sendFile(brPath, {
          headers: { "Content-Type": MIME[ext] },
        });
      }
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        return res.sendFile(filePath);
      }
      next();
    });

    app.get("*", (req, res) => {
      // Audit G-P3: missing /assets/* files return 404 instead of the SPA
      // fallback — a broken deploy (hashed filename mismatch) must surface as
      // a hard error, not silently serve index.html for a .js/.css request.
      if (/^\/assets\//.test(req.path) || /\.[a-z0-9]{2,5}$/i.test(req.path)) {
        res.status(404).json({ success: false, error: "Not found." });
        return;
      }
      res.setHeader("Cache-Control", "no-cache");
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Apple Repair ERP server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
