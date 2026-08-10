# i35 Apple Service ERP — Whole-Site Workflow, Backend & Bug Log

> Generated: 2026-08-10 (stable build `index-B-0Zhpwp.js`, commit `105712b`)
> Scope: **i35erp-stable-v1** (the live/canonical codebase — `~/Desktop/i35erp-stable-v1`)

---

## 1. Stack Overview

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS (SPA, hash-routing `#/tab`) |
| Cloud DB | **Supabase** — single table `erp_records` (`collection_name` TEXT + `data` JSONB), realtime via `postgres_changes` |
| Backend | Node.js + Express (`server.ts`), single process, serves SPA + API |
| Auth | Simple email/password from env → opaque token in `auth-tokens.json` (30-day TTL) |
| AI | Google Gemini (diagnose / draft-message), multi-provider chat (DeepSeek / OpenRouter / Groq / Anthropic / Gemini) |
| Bot | Telegram long-polling copilot (@i35vpn_bot → ERP AI, Burmese replies, live Supabase context) |
| Hosting | DO droplet `178.128.62.242`, systemd `i35erp` on port 3100, Caddy TLS `erp.i35appleservice.com` |
| Local dev | `tsx server.ts` → API on **3001**, Vite middleware on 24678 (stable folder) |
| Deploy | `./deploy.sh` → `npm run build` → brotli precompress → rsync `dist` → `npm install` → restart → health check |

**Data collections (Supabase `erp_records`):**
`workOrders`, `parts`, `suppliers`, `rmas`, `purchaseOrders`, `customers`, `technicians`, `expenses`, `supplierDebts`, `technicianPayouts`, `systemSettings`, `users`, `priceCatalog`, `priceCategories`

---

## 2. Whole-Site Workflow

### 2.1 Entry / Login
1. SPA loads → `App.tsx` calls `/api/auth/verify` with `X-Session-Token` (from localStorage).
2. Valid token → app opens directly. Invalid/absent → `LoginPage` (Apple-style).
3. Login POSTs email+password → server checks env `AUTH_EMAIL`/`AUTH_PASSWORD` → returns token (48 hex chars), persisted server-side in `auth-tokens.json` (survives restart, 30 days).
4. Logout deletes the token server-side and clears client storage.

### 2.2 Sidebar Tabs (Navigation.tsx)
`Dashboard` · `Work Intake` · `Simple Ticket` · `Ticket Board` · `QA & Warranty` · `Follow-Ups` · `Price List` · `POS & Invoicing` · `Finance` · `Inventory` · `Suppliers & RMAs` · `Customers & Staff` · `Settings`

### 2.3 Ticket Lifecycle (the core loop)
```
Receive ──► In Progress ──► Finished ──► QA 21-Point ──► [Confirm QA Pass] ──► POS Checkout ──► Taken Out
   │              │              │                │
   └──────────────┴──► Cant Repair / Customer Not Repair (dead-end stages)
```
- **Ticket statuses** (`WorkOrderStatus`): `Receive`, `In Progress`, `Pending`, `Finished`, `Taken Out`, `Cant Repair`, `Customer Not Repair`.
- **Work Intake** (roster): create full ticket (stepper: customer → device → repairs → diagnostics 21-pt → photos), edit, search, filters, status queue.
  - Finished/Taken Out rows: **Stethoscope Diagnose** → jumps to QA tab (only if no `postRepairChecklist`), else **$ Checkout** → POS tab.
- **Simple Ticket**: quick intake sheet (customer data + repairs w/ discount + **PHONE TESTING & CHECKING** checklist + Save & Print).
- **Ticket Board** (Trello-style kanban): drag & drop between stages, ⋯ menu (Detail / Log / Notify / After Diag / Move to Stage), Assign Technician, Checkout Payment modal, After-Repair 21-Point modal, repair-log timeline, intake-diagnostic soft-alert when moving without 21-point.
- **QA & Warranty**: roster of Finished/Taken-Out without checklist → **21-Point Post-Repair Inspection modal** (simple PHONE TESTING & CHECKING style):
  - 21 rows, circle tap-cycle `Pass → Fail → Cant Test → N/A`, name tap = Pass, inline note (`ok / issue… / note / n/a`), counter `X/21`, All Pass / All N/A.
  - Before/After repair photos, Inspector technician, Notes, Confirm QA Pass (gated: ≥1 explicit verdict + optional photo gate from Settings `requireQaPhotoBeforeConfirm`).
  - Taken Out rows: only **Error Return** (reopens to In Progress).
- **POS & Invoicing**: checkout finished devices (paid amount + method), invoice print, payment records.
- **Finance**: P&L, expenses (Record Expense), technician payouts/commissions (monthly report = authoritative for AI "ဒီလ ဘယ်နှစ်လုံး" answers).
- **Inventory**: parts matrix, stock, low-stock alerts, barcode/QR scan.
- **Suppliers & RMAs**: supplier debts, RMA lifecycle (`Draft → Shipped to Vendor → Credit Approved → Replacement Received / Rejected`).
- **Customers & Staff**: CRM (customers, spending, discounts), users/technicians, roles (Admin/Technician gating: technicians only see own QA queue, etc.).
- **Settings**: shop info, ticket prefix, warranty days, payment methods, notification templates, AI provider/key/model, photo-gate toggle.

### 2.4 Data Flow (frontend → Supabase)
```
UI action ──► saveDocument / saveBatchDocuments / deleteDocument (lib/supabase.ts)
                 │  (throws "Internet connection required…" if offline)
                 ▼
             erp_records.upsert (onConflict: collection_name,id)
                 │
                 ▼
        Realtime postgres_changes ──► subscribeToCollection reload ──► onData(items) ──► React state
```
- Every write triggers a **full refetch of that collection** for all open clients (and the writer itself).
- Writes require network — **no offline queue in the live path** (the old offline layer is dead code, see §5).

---

## 3. Backend (server.ts, 724 lines)

### 3.1 API endpoints

| Method | Path | Purpose | Notes |
|---|---|---|---|
| GET | `/api/health` | Health check | `{"status":"ok"}` |
| POST | `/api/auth/login` | Email+password → token | 503 if env unset; 401 on bad creds; **no rate limiting** |
| POST | `/api/auth/logout` | Delete token | header `X-Session-Token` |
| POST | `/api/auth/verify` | Validate token | 401 when expired/invalid |
| POST | `/api/gemini/diagnose` | AI board-repair diagnostics (JSON) | Gemini, `gemini-3.6-flash`, responseMimeType JSON |
| POST | `/api/gemini/draft-message` | Draft SMS/email to customer | Gemini |
| POST | `/api/ai/chat` | ERP copilot chat (multi-provider) | server keys DeepSeek/OpenRouter, or browser-provided key from Settings; system prompt = Burmese + "never invent data" rules; `LIVE ERP CONTEXT` injected |
| GET `*` | SPA fallback | index.html | also swallows unknown `/api/*` (returns HTML 200 — minor) |

### 3.2 Telegram bot (server-side, if `TELEGRAM_BOT_TOKEN`)
- Long-polling `getUpdates` every ~1s, allowlist `TELEGRAM_ALLOWED_CHAT_IDS`.
- Commands: `/start`, `/help`, `/clear`. Per-chat history kept in `ai-chat-history.json` (last 30 msgs).
- Provider auto-pick: DeepSeek → Gemini → OpenRouter (first key found). OpenRouter model hardcoded `anthropic/claude-opus-5`.
- `fetchErpContext()` pulls all collections from Supabase (service role) and builds a live context JSON: shop info, active/completed-today tickets, monthly report (technicianPayouts), low stock, price list, suppliers, customers, RMA. Smart filters: part-category match → full stock of category; technician name → full work history; model name → full price list; phone/name → customer detail.

### 3.3 Auth implementation notes
- Single admin account from env (`AUTH_EMAIL` / `AUTH_PASSWORD`), plaintext in `.env` / VPS `.env.production`.
- Tokens: `randomBytes(24)` hex, stored in `auth-tokens.json` (cwd), 30-day TTL, verified on each request via header `X-Session-Token`.
- No rate limiting / lockout / audit log on login → brute-force exposure on the public URL.

### 3.4 Static serving (production)
- Brotli precompressed assets (`*.br`), immutable cache for `/assets/` (content-hashed), `no-cache` for `index.html` + `sw.js`.
- Path traversal guard on `..`.

---

## 4. Bugs & Issues (prioritized)

| # | Severity | Area | Bug / Issue | Suggested Fix |
|---|---|---|---|---|
| ~~1~~ | ~~🔴 High~~ | ~~`lib/supabase.ts`~~ | ✅ **FIXED 2026-08-10 (commit `27139b4`)** — offline queue (IndexedDB) + optimistic local updates + auto-flush on reconnect. Live-verified: offline settings save queued → UI keeps value → online → flushed to cloud → queue empty. | `lib/offlineQueue.ts` + rewritten `lib/supabase.ts` |
| ~~2~~ | ~~🟠 Medium~~ | ~~`lib/supabase.ts` `subscribeToCollection`~~ | ✅ **FIXED 2026-08-10 (commit `27139b4`)** — incremental realtime: one shared channel per collection patches INSERT/UPDATE/DELETE into a shared cache; no `onData([])` flash; refresh keeps last-known data on failure. Live-verified: test ticket INSERT/DELETE 1→2→1 with zero empty-flash samples. | rewritten `subscribeToCollection` + `refreshCollection` |
| 1 | 🔴 High | `lib/supabase.ts` | **No offline support in live path.** `saveDocument/deleteDocument` throw "Internet connection required to save ERP data." The old offline queue (firebase.ts + indexedDB.ts) is dead code. If Wi-Fi drops mid-work, all writes fail silently-ish (toast/error) and work is lost. | Re-enable a sync queue (IndexedDB → flush on `online`) or surface a clear offline banner; remove misleading offline-sync UI or wire it to real state. |
| 2 | 🟠 Medium | `lib/supabase.ts` `subscribeToCollection` | **Data flicker / full refetch.** Every realtime event calls `onData([])` then refetches the whole collection → lists flash empty, scroll resets, selection can be lost during heavy use (e.g. many tabs open). | Diff-based updates (`event: INSERT/UPDATE/DELETE` payloads) instead of full reload; keep previous data while loading. |
| 3 | 🟠 Medium | `server.ts` `/api/auth/login` | **No brute-force protection** on a public endpoint; single shared account + 30-day tokens in a plaintext JSON file. | Rate limit per IP (e.g. 5/min), constant-time compare, optional lockout; store tokens hashed. |
| 4 | 🟡 Low | `server.ts` `/api/gemini/draft-message` | **Wrong currency symbol** — prompt formats `$${totalCost}` (USD) for MMK amounts. | Use `totalCost.toLocaleString() + " MMK"`. |
| 5 | 🟡 Low | `server.ts` SPA fallback | Unknown `/api/*` routes return **index.html with HTTP 200** instead of 404 JSON → misleading API errors. | Add `app.use('/api', 404 JSON)` before the SPA catch-all. |
| 6 | 🟡 Low | `server.ts` static handler | `decodeURIComponent(req.path)` can throw on malformed URIs → 500. | Wrap in try/catch or use safe decode. |
| 7 | 🟡 Low | QA modal / photos | Photos stored as **base64 data URLs inside `workOrders.data`** (JSONB). Multiple before/after photos can blow past Supabase request-size limits → save fails. | Upload to Supabase Storage, store paths; or downscale harder (max 2–3 photos). |
| 8 | 🟡 Low | `App.tsx` + `auth-tokens.json` | Tokens live 30 days and are written to disk on every login; no server-side revocation list / admin UI to kick devices. | Add logout-all + token rotation on password change. |
| 9 | 🟢 Info | Telemetry | No error tracking (no Sentry etc.); console errors only. Bugs surface as toasts. | Add a lightweight error log endpoint or Sentry. |
| 10 | 🟢 Info | Telegram bot | OpenRouter model pinned `anthropic/claude-opus-5`; if the key/account doesn't have it → bot errors. | Make model configurable via env; fallback chain. |
| 11 | 🟢 Info | `SimpleTicketCreator` | `window.print()` fires 600 ms after save — prints the browser page; some browsers block/behave oddly after async save. | Use a print-stylesheet wrapper or explicit print button. |
| 12 | 🟢 Info | QA gate | "Confirm QA Pass" requires ≥1 explicit verdict + optional photo — good, but there is **no edit-after-confirm** path in the roster (only Error Return for Taken Out). | Consider "Reopen QA" for Finished tickets. |

---

## 5. Dead Code / Tech Debt

| File | Status | Note |
|---|---|---|
| `src/components/pipeline/StatusPipelineView.tsx` | **Not imported anywhere** | Pipeline tab was replaced by Ticket Board + Work Intake roster. Restyled 2026-08-10 (commit `1763d97`) for consistency, but it never ships. |
| `src/lib/firebase.ts` | Not imported (except internally) | Old Firestore + offline-queue data layer — superseded by Supabase. Contains the offline sync logic that the app no longer uses. |
| `src/lib/indexedDB.ts` | Not imported | Same — offline cache/sync queue for the old layer. |
| `src/lib/firebase-admin.ts` | Not imported | Legacy Firebase Admin init. |
| `firebase-applet-config.json`, `firestore.rules`, `firebase-blueprint.json` | Orphaned configs | Leftovers of the Firestore era. |
| `~/Desktop/Kimi ERP` (sibling repo) | Diverged lineage | Has Pipeline tab + dashboard redesign, **not deployed**. Edits there do NOT affect the live site. Live/canonical = `~/Desktop/i35erp-stable-v1`. |
| `~/caveman-main/phone-repair-erp` | Ancient copy | Vite on 5173/5174 — ignore. |

---

## 6. Deploy & Ops Cheat Sheet

```bash
# Local build + deploy (from ~/Desktop/i35erp-stable-v1)
./deploy.sh          # build → brotli → rsync → npm install → systemctl restart i35erp → health check

# Live
https://erp.i35appleservice.com        # Caddy TLS → 178.128.62.242:3100
GET https://erp.i35appleservice.com/api/health

# VPS
ssh -i ~/.ssh/n8ndigitalocean root@178.128.62.242
systemctl status i35erp                # /opt/i35erp, port 3100
tail -f /var/log/...                   # journalctl -u i35erp -f

# Local dev
cd ~/Desktop/i35erp-stable-v1 && npm run dev   # API 3001, Vite middleware (24700s range)
```

- ⚠️ `/api/health` only — no `/health` alias (root `/` returns the SPA HTML).
- Rollback: `/opt/i35erp/dist.prev` is kept by deploy.sh.
- Data is **cloud-first (Supabase)** — clearing browser data does not lose tickets; it does lose the auth token (re-login needed).

---

## 7. Verified Working (2026-08-10 sweep)
- Auth: login → token → verify → logout ✅ (live)
- QA 21-Point modal: 21 rows, circle cycle, counter `4/21`, All Pass/N/A, Confirm gate ✅ (live, screenshot `qa-modal-simple-style.png`)
- Browser console: no errors on Dashboard / Work Intake / QA tabs ✅
- tsc: clean on current HEAD; build byte-identical to live ✅
