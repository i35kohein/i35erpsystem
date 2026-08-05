import "dotenv/config";
import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { randomBytes } from "crypto";

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: "10mb" }));

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
  // POST /api/auth/login { email, password } -> { user } | 401
  // Persistent auth sessions: tokens survive server restarts (written to
  // auth-tokens.json in cwd) and expire after TOKEN_TTL_DAYS.
  const AUTH_TOKENS_FILE = path.join(process.cwd(), "auth-tokens.json");
  const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
  const authTokens: Record<string, { email: string; expiresAt: number }> = (() => {
    try {
      return JSON.parse(fs.readFileSync(AUTH_TOKENS_FILE, "utf8"));
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
    const entry = authTokens[token];
    if (!entry) return false;
    if (entry.expiresAt < Date.now()) {
      delete authTokens[token];
      saveAuthTokens();
      return false;
    }
    return true;
  };
  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body || {};
    const authEmail = (process.env.AUTH_EMAIL || "").trim().toLowerCase();
    const authPass = process.env.AUTH_PASSWORD || "";
    if (!authEmail || !authPass) {
      res.status(503).json({ success: false, error: "Auth not configured on server" });
      return;
    }
    if (String(email || "").trim().toLowerCase() === authEmail && password === authPass) {
      const token = randomBytes(24).toString("hex");
      authTokens[token] = { email: authEmail, expiresAt: Date.now() + TOKEN_TTL_MS };
      saveAuthTokens();
      res.json({ success: true, token, user: { email: authEmail, name: "Ko Hein" } });
    } else {
      res.status(401).json({ success: false, error: "Invalid email or password" });
    }
  });
  app.post("/api/auth/logout", (req, res) => {
    const token = (req.headers["x-session-token"] as string) || "";
    delete authTokens[token];
    saveAuthTokens();
    res.json({ success: true });
  });
  app.post("/api/auth/verify", (req, res) => {
    const token = (req.headers["x-session-token"] as string) || "";
    if (isTokenValid(token)) {
      res.json({ success: true });
    } else {
      res.status(401).json({ success: false });
    }
  });

  // AI Repair Diagnostics & Panic Log Analyzer
  app.post("/api/gemini/diagnose", async (req, res) => {
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
      res.status(500).json({ success: false, error: err.message || "Failed to generate AI diagnostic analysis" });
    }
  });

  // AI IMEI / Serial Specs Auto-Lookup


  // AI Draft Customer Notification
  app.post("/api/gemini/draft-message", async (req, res) => {
    try {
      const { customerName, deviceName, status, totalCost, notes, channel } = req.body;
      const ai = getGeminiClient();

      const prompt = `Draft a polite, highly professional ${channel || "SMS"} message for an Apple Repair Shop to send to customer "${customerName}".
Details:
- Device: ${deviceName}
- Status: ${status}
- Total Quote/Cost: ${totalCost ? `$${totalCost}` : "N/A"}
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
      res.status(500).json({ success: false, error: err.message || "Failed to draft notification" });
    }
  });

  // ERP-aware AI chat supporting mainstream and OpenAI-compatible custom APIs.
  app.post("/api/ai/chat", async (req, res) => {
    try {
      const { provider, apiKey, model, baseUrl, systemPrompt, messages, context } = req.body;
      // DeepSeek / OpenRouter are configured once on the server, never exposed
      // to the browser or committed with the application source. A browser
      // provided key still wins when the user configures one in Settings → AI.
      const resolvedApiKey =
        apiKey ||
        (provider === "deepseek"
          ? process.env.DEEPSEEK_API_KEY
          : provider === "openrouter"
            ? process.env.OPENROUTER_API_KEY
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
      res.status(500).json({ success: false, error: err.message || "AI assistant request failed." });
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
        const today = now.toISOString().slice(0, 10);
        const done = ["Finished", "Taken Out"];
        const active = wosData.filter((w) => !done.includes(w.status) && w.status !== "Cant Repair" && w.status !== "Customer Not Repair");
        const completedToday = wosData.filter((w) => done.includes(w.status) && (w.completedAt || w.updatedAt || "").slice(0, 10) === today);
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
        return await callAiProvider({
          provider,
          apiKey: key,
          model: provider === "openrouter" ? "anthropic/claude-opus-5" : undefined,
          systemPrompt,
          messages,
        });
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
      const urlPath = decodeURIComponent((req.path || "/").split("?")[0]);
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

    app.get("*", (_req, res) => {
      res.setHeader("Cache-Control", "no-cache");
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Apple Repair ERP server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
