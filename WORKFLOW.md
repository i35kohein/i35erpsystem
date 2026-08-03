# i35 Apple Service ERP — Project Workflow & Maintenance Guide

**Generated:** 2026-08-04 · **Project:** `/Users/user/Desktop/Kimi ERP` (React 19 + Vite + Tailwind v4 + Supabase)
**Production:** http://192.34.62.199:3100 · **GitHub:** github.com/i35kohein/i35erpsystem (main)

---

## 1. System Overview

| Layer | Tech |
|---|---|
| Frontend | React 19, TypeScript, Tailwind CSS v4, Lucide icons, motion/react |
| Backend | Express + Vite middleware (`server.ts` → `dist/server.cjs`), in-memory auth tokens |
| Database | Supabase Postgres — single table `erp_records` (collection_name + data JSONB) |
| AI | Gemini / DeepSeek / Anthropic via `/api/ai/chat` (server-side keys) |
| Hosting | DigitalOcean droplet 192.34.62.199, systemd `i35erp`, Node 22 |
| Deploy | `./deploy.sh` (vite build → rsync dist → npm install → restart → health check) |

**Data collections (in `erp_records`, keyed by `collection_name`):**
`workOrders` · `parts` · `suppliers` · `purchaseOrders` · `rmas` · `technicians` · `users` · `expenses` · `technicianPayouts` · `supplierDebts` · `customerInquiries`(unused) · `customers`(unused — derived from tickets) · `priceCatalog`

**Real-time:** Supabase `postgres_changes` subscription per collection; **note — some tables are NOT in the realtime publication** (workOrders didn't auto-push during tests → reload needed).

---

## 2. Core Business Workflow

```
Intake ──► Pipeline ──► QA ──► POS ──► Follow-Up ──► Warranty
(Create   (Receive→     (21-pt    (Checkout,   (3-7 day   (clock anchored
 ticket)   In Progress→  checklist) parts deduct, follow-up)  to completedAt)
           Pending→      QA pass    payment)
           Finished)
```

### Step-by-step data flow
1. **Intake** (`CreateTicketSoloPage` / `IntakeWorkOrderModule`)
   - Customer phone → auto-match existing customer (name/type)
   - Device + repairs from price catalog → `lineItems` (isLabor flags) → subtotal/total
   - `inventorySettlementStatus: 'pending'` NOT set here (only at consumption)
   - Serial/IMEI left blank (no fake auto-gen since 2026-08-04)
2. **Pipeline** (`StatusPipelineView`) — status transitions Receive → In Progress → Pending → Finished; technician assignment; repair logs
3. **QA** (`QualityAssuranceModule`) — 21-point `beforeDiagnostics`/`afterDiagnostics`; passing stamps `completedAt` (warranty anchor)
4. **POS** (`PosInvoicingModule`) — checkout: payment methods (KBZ/AYA/UAB/Wave/MMQR), cash/split; **`handleConsumeInventoryFromWorkOrder`** deducts stock, records expense (Inventory Consumption), marks `inventorySettlementStatus: 'pending'`, sets `completedAt` on Taken Out
5. **Finance** (`ShopFinancePlModule`) — Revenue, OpEx/COGS, Parts Asset, Commissions, Accounts Payable, **6. Inventory Fund** (parts-cost settlement, stays pending until "Mark Settled"), **7. Parts Revenue & Profit**
6. **Follow-up** (`CompletedDeviceFollowUpModule`) — completed devices get 3-7 day follow-up prompts
7. **Warranty** (Dashboard tab) — warranty clock = `completedAt || createdAt` (fixed: previously `updatedAt` reset on edits)

### AI Assistant (web + Telegram)
- **Web:** FAB (every tab, all sizes) → bottom-right chat widget, always-Burmese, per-account history (localStorage `i35_ai_chat_<userId>`)
- **Telegram:** `@i35ERP_Bot` long-polling on server; per-chat history in `/opt/i35erp/ai-chat-history.json`; live ERP context via Supabase service role (workOrders + parts + technicians); category-aware answers; anti-hallucination prompt
- **Auto-classify:** finished tickets get `repairTypeAI` (AI verdict) — drives commission split (Spareparts % vs Hardware %)

---

## 3. Known Issues — STATUS

### ✅ Fixed 2026-08-03/04 (this pass)
| # | Issue | Fix |
|---|---|---|
| 1 | **30 pre-existing TS errors → 0** | See section 4 |
| 2 | Warranty clock reset on every edit | `completedAt` stamped once on Finished/Taken Out |
| 3 | Fake serial/IMEI auto-gen (`SN-######`, `35...`) | Removed — fields left blank for manual entry |
| 4 | Auto "Town / City: Yangon" in notes + fake `@customer.mm` email | Removed defaults/fallbacks (incl. prints) |
| 5 | Fake supplier/RMA demo data in Supabase (RMA-081/082, MobileSentrix PO) | Deleted |
| 6 | Battery Genuine parts for pre-12 series | Deleted (16) — only 12+ remain (20) |
| 7 | Duplicated dashboard tech widgets / fabricated KPI numbers | One roster, real data only (techAnalytics.ts) |
| 8 | AI assistant modal blocked page (drawer+backdrop), mobile-only FAB | Bottom-right slide-up chat widget, FAB everywhere |
| 9 | AI answered in English / invented SKUs | Always-Burmese prompt + anti-hallucination + category context |
| 10 | Supplier payable (wrong model — shop buys parts outright) | Replaced with **Inventory Fund** internal settlement |
| 11 | Dashboard-vs-module redundancy (partial) | Tab label "Technicians", single table, deduped CTAs |

### ⚠️ Remaining (known, not yet done)
| # | Issue | Impact | Suggested fix |
|---|---|---|---|
| 1 | **No auth session persistence** — in-memory token map; server restart = re-login | Annoying after deploys | JWT/signed token with expiry in `server.ts` |
| 2 | **Realtime not enabled for all tables** (workOrders missed pushes) | Stale UI until reload | Add tables to Supabase `supabase_realtime` publication |
| 3 | **Single 2.09 MB JS bundle** (509 KB gzip) | Slow first load | Code-split modules via React.lazy |
| 4 | **No tests** for React app (server has none either) | Regressions slip | Vitest smoke tests for core flows |
| 5 | **Git identity** is `User <user@m4-8.local>` | History attribution | `git config --global user.name/email` + amend if desired |
| 6 | **Portal fields typed loosely** (`estimateStatus` etc. are string-ish) | Now typed but portal UX unverified end-to-end | Test customer portal flow with a real ticket |
| 7 | **Local AI mode** canned answers | Basic only | Consider on-device LLM later |
| 8 | **Price catalog** category names vs parts categories can drift | Filters miss parts | Seed a canonical category list + migration |
| 9 | **VPS has no backups** of Supabase data | Data loss risk | Scheduled `supabase db dump` / erp_records export to droplet |
| 10 | **Deploy lacks rollback** | Bad release sticks | Keep previous dist/ dir + symlink |

### ✅ Upgrades shipped 2026-08-04 (commit series bc4a5bf → 5b2f6f5)
| # | Upgrade | Status |
|---|---|---|
| 1 | **Auth session persistence** | ✅ tokens in `auth-tokens.json` (cwd) with 30-day expiry; verify checks expiry; survives restarts |
| 2 | **Realtime safety net** | ✅ app refetches workOrders+parts every 45s while tab visible (publication change still needs Supabase dashboard SQL: `alter publication supabase_realtime add table erp_records;`) |
| 3 | **Code splitting** | ✅ React.lazy on 13 heavy modules — bundle 2,089 KB → 877 KB (gzip 509→240 KB); Suspense fallback |
| 4 | **Vitest smoke tests** | ✅ `src/utils/techAnalytics.test.ts` — 12 tests (load badges, repair-type rules, AI override, durations, labor revenue, est commission split, no-fabrication); `npm test` |
| 5 | **Git identity** | ✅ local+global set to i35kohein / i35kohein@gmail.com (future commits) |
| 6 | **Backup cron** | ✅ `/opt/i35erp/backup.sh` nightly 02:30 (erp_records JSON, keeps 14 days, log at backup.log); first backup ran (628 KB) |
| 7 | **Deploy rollback** | ✅ deploy.sh keeps `dist.prev`; `./rollback.sh` swaps + restarts |
| 8 | **Parts category normalization** | ✅ `Backglass ( Ring )` → `Backglass (Ring)` (134 parts, name-only, no merge) |

---

## 4. TypeScript Errors — Fixed (30 → 0)

| File | Error | Fix |
|---|---|---|
| `types/index.ts` | `RepairPriority` missing `'Rush'` (used by portal + dashboard) | Added `'Rush'` to union |
| `types/index.ts` | WorkOrder missing `estimateStatus` / `estimateApprovedAt` / `estimateRejectionReason` / `customerInquiries` (customer portal feature) | Added optional typed fields |
| `types/index.ts` | SystemSettings missing `taxRatePercent` (PrintableInvoiceModal) | Added optional field |
| `SystemManagementSettingsModule.tsx` ×2 | `qualityTier: string` → `PartQualityTier` | Cast + import |
| `PriceCatalogModule.tsx` | `onOpenNewWorkOrder` prefill type too narrow (`selectedRepairs` etc.) | Widened prefill type |
| `WorkOrderStatusTimeline.tsx` ×3 | `string` → `WorkOrderStatus` | Casts |
| `TicketDetailInspectorModal.tsx` ×2 | tuple union `string \| Icon` in `{label}`/`{value}` | typeof guards |
| `DashboardOverview.tsx` | `'Rush'` comparison | Fixed via type |

**Run:** `npx tsc --noEmit` → 0 errors · `npx vite build` → ✓

---

## 5. Recommended Upgrades (priority order)

1. **Auth persistence** (server): store token with expiry; verify on boot. ~2h
2. **Realtime publication**: enable all collections in Supabase. 10 min
3. **Code splitting**: lazy-load non-core modules (portal, settings, finance). ~3h
4. **Vitest smoke suite**: intake→POS happy path + settlement logic. ~4h
5. **Supabase backup cron** on droplet (nightly export). 30 min
6. **Deploy rollback**: keep 2 previous releases. 30 min
7. **Git identity** cleanup. 5 min
8. **Price catalog ↔ parts category sync** job. ~2h

---

## 6. Operational Notes

- **Deploy:** `./deploy.sh` from `~/Desktop/Kimi ERP` (builds + rsyncs + restarts + health check)
- **Telegram bot:** needs `TELEGRAM_BOT_TOKEN` + `TELEGRAM_ALLOWED_CHAT_IDS` in `/opt/i35erp/.env.production` (set). History: `/opt/i35erp/ai-chat-history.json`
- **AI keys (server):** `GEMINI_API_KEY` + `DEEPSEEK_API_KEY` set on VPS (bot prefers DeepSeek); web app uses Settings → AI tab provider
- **Supabase service role:** in VPS `.env.production` (`SUPABASE_SERVICE_ROLE`) — server-only, never in client
- **Data writes:** Supabase REST `Prefer: resolution=merge-duplicates` upsert; JSONB `data` column — **always write the FULL data object** (partial PATCH replaces the whole object — painful lesson from 2026-08-03)
- **Cleanup convention:** test inserts use `test-*` ids and are deleted after verification
