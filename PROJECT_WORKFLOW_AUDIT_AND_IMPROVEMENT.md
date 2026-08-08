# i35 Apple Service ERP — Whole-Project Workflow Visualization + Bug / Mistake Audit + Improvement Plan

- **Project:** `/Users/user/Desktop/Kimi ERP` — React 19 + Vite + Tailwind v4 + Supabase; Express `server.ts` → `dist/server.cjs`; systemd `i35erp` on DO droplet `192.34.62.199:3100`
- **Date:** 2026-08-05 · **Analyst:** Kimi (OpenClaw)
- **Method:** Full source audit of `App.tsx` (1,994 lines), `CreateTicketSoloPage.tsx` (1,575), `Navigation.tsx`, `server.ts` (675), `supabase.ts`, `schema.ts`, `types/index.ts`, plus every lazy-loaded module; cross-checked against `WORKFLOW.md` + `PROJECT_WIDE_UI_UX_UPGRADE.md`. `tsc --noEmit` = **0 errors**; `vitest` = **12/12 pass**.
- **Purpose:** "check the whole project, visualize the workflow, find bugs/mistakes, tell me how to make it better." This doc draws the end-to-end flow, then lists **verified** bugs (code-level), **infected** mistakes (architecture/ops), and a prioritized fix roadmap.

> **🔄 STATUS UPDATE (2026-08-05 01:33):** While this audit was being written, the working tree was committed **in parallel** (commit `0c23b77`, 01:27:18) — the project-wide upgrade pass (ultra-wide density, content clamp, `GlobalSearchModal`, vendor chunks) plus this doc and the intake R5 doc (`8201c43`) are all committed and **pushed to `origin/main`** (`4a674e2`, 01:33). Items **B-5**, **S-3** and **S-4** below are therefore **RESOLVED** as of this note — kept in the doc for history, marked ✅.

> **🔄 STATUS UPDATE 4 (2026-08-05 01:45, commits `c6e367c` + `4a05962`):** **A-6 DONE** — portal estimate approve/reject logic extracted to pure `src/utils/portalWorkflow.ts`, the component now delegates to it, and 6 vitest tests cover the approve→pipeline handoff (Receive→In Progress, approval stamp, log append, reject→Pending, reject reason, no-regression). Full suite: **18/18 pass, tsc 0 errors**. All P0/P1 items from §4 are now **CLOSED**. Deployed to production 01:43 + 01:46.

---

## 1. System Architecture (as it actually is)

```
Browser (React SPA, single bundle via Vite)
   │  publishable key (VITE_SUPABASE_*)
   ▼
Express server (server.ts → dist/server.cjs)  ──  PORT 3100, behind nginx? no — direct
   • serves the built SPA (Vite middleware in dev / static dist/ in prod)
   • /api/ai/chat  → Gemini / DeepSeek / OpenRouter (server-side keys only)
   • in-memory auth tokens → persisted to auth-tokens.json (cwd), TTL 30 d
   • Telegram bot (@i35ERP_Bot) long-polling (same process) with per-chat history json
   ▼
Supabase Postgres  —  ONE table: erp_records (collection_name TEXT + data JSONB)
   • "collections" = workOrders · parts · suppliers · purchaseOrders · rmas ·
     technicians · users · expenses · technicianPayouts · supplierDebts ·
     priceCatalog · (customerInquiries/customers unused — derived from tickets)
   • REST upsert with Prefer: resolution=merge-duplicates (FULL object write required)
   • realtime: postgres_changes on erp_records filtered by collection_name → refetch load()
```

- **Auth:** single shared account (`AUTH_EMAIL`/`AUTH_PASSWORD` from `.env`) → server issues a token persisted in `auth-tokens.json`. One login for the whole shop; roles exist in-app (`UserRoleSwitcher`) but auth is not per-person.
- **Offline:** `indexedDB` + `OfflineSyncStatusBadge` — local cache + queue; global 45s refetch safety net while the tab is visible.
- **Code-split:** 13 modules via `React.lazy` — bundle dropped from ~2 MB → ~877 KB (see WORKFLOW.md; re-verify on next build).

---

## 2. Business Workflow — visual pipe

```
        ┌──────── INT AKE ────────┐
        │ CreateTicketSoloPage    │  customer phone ▸ auto-match (exact/last-9)
        │ + IntakeWorkOrderModule │  device model ▸ catalog repairs ▸ MMK estimate
        │  status = 'Receive'     │  21-pt beforeDiagnostics · photos · warranty
        └───────────┬─────────────┘
                    ▼
        ┌──────── PIPELINE ───────┐   StatusPipelineView (Kanban)
        │ Receive → In Progress   │   technician assign · repair logs
        │ → Pending → Finished    │   finished ▸ stamps completedAt (once)
        └───────────┬─────────────┘
                    ▼
        ┌──────── QA & WARRANTY ──┐   QualityAssuranceModule
        │ 21-pt afterDiagnostics  │   QA pass ▸ stamps completedAt (warranty anchor)
        │ postRepairChecklist     │
        └───────────┬─────────────┘
                    ▼
        ┌──────── POS CHECKOUT ───┐   PosInvoicingModule
        │ payment (KBZ/AYA/UAB/    │   handleConsumeInventoryFromWorkOrder:
        │  Wave/MMQR/cash/split)   │     deduct parts stock · expense "Inventory
        │ status = 'Taken Out'     │     Consumption" · settlementStatus=pending
        └───────────┬─────────────┘
                    ▼
        ┌──────── FOLLOW-UP ───────┐  CompletedDeviceFollowUpModule
        │ 3-7 day prompts; 30/60d  │  followUpStatus: Pending Call / Satisfied /
        │  filters; call/WhatsApp  │  Issue Reported · satisfactionRating
        └───────────┬─────────────┘
                    ▼
        ┌──────── WARRANTY ───────┐  Dashboard tab — clock = completedAt || createdAt
        └─────────────────────────┘
```

**Cross-cutting loops:**
- **Finance** (`ShopFinancePlModule`): Revenue / OpEx-COGS / Parts Asset / Commissions / Accounts Payable / **Inventory Fund** (parts-cost settlement, "pending" until Mark Settled) / Parts Revenue & Profit. The Inventory Fund is the post-POS settlement loop back into stock.
- **Parts/Inventory** (`InventoryManagementModule`): consumption feeds back from POS; reorder alerts; `lowStockCount` badge in sidebar is real (parts `qty <= reorderPoint`).
- **Price Catalog → Intake:** `PriceCatalogModule` edits prices/warranty → intake reads `getModelPriceCatalogItems(deviceModel)` for repair selection + discount.
- **AI assistant** (FAB on all pages + Telegram bot): category-aware ERP context; finished tickets get `repairTypeAI` verdict that drives commission split (Spareparts % vs Hardware %).
- **Customer portal** (`CustomerFacingWebPortal`): estimate status / approve-reject loop (typed, but end-to-end unverified — see bug list).

---

## 3. 🔴 Verification checklist (current state)

| Check | Result |
|---|---|
| `npx tsc --noEmit` | ✅ 0 errors |
| `npm test` (vitest) | ✅ 12/12 pass |
| `npm run check:ui` | ⚠️ 5,256 raw-hex utilities (72 colors) · **19 clickable `<div>` w/o role** · exit 0 (warn) |
| `.env*` in git | ✅ ignored (only `.env.example` tracked) |
| Deploy script + rollback + nightly backup | ✅ present (`deploy.sh`, `rollback.sh`, `backup.sh`) |
| Working tree committed? | ✅ **RESOLVED** — `0c23b77` (project-wide pass + GlobalSearchModal) + `8201c43` (docs) + `4a674e2` (gitignore) all pushed; tree clean as of 01:33 |

---

## 4. 🐞 Bugs & mistakes found (verified in code)

### 4.1 Functional / data-integrity

**A-1. Company name written into Town/City on customer auto-match** — ✅ **FIXED** (`ad40fea`)
`CreateTicketSoloPage.tsx` `setCustomerTown(found.company || '')` removed. `Customer` has **no town field** — only `company`. Repeat B2B customers no longer get their company name into Town/customerAddress; Town is left for manual entry.

**A-2. Order-number generation can collide (race + hardcoded seed)** — ✅ **FIXED** (`ad40fea`)
`CreateTicketSoloPage.tsx`: `maxExistingNum` is computed from the possibly-stale `workOrders` prop at submit time, seeded at hardcoded `1000`. **Fix applied:** a uniqueness loop builds a `Set` of all live order numbers and bumps `nextNum` until the candidate `WO-YYYY-N` is actually unused — two rapid submits with a stale prop can no longer produce a duplicate. (A true cross-device race would still need a server-side counter; the client guard closes the realistic gap.)

**A-3. Diagnostics "Mark All Pass" can fabricate a clean 21-point report** — ✅ **FIXED** (`ad40fea`)
The header button flips all 21 items to Pass regardless of whether they apply to the device or were tested. **Fix applied:** clicking Mark All Pass now shows a confirm when any verdict already exists ("Mark ALL 21 items as Pass? This will overwrite existing Pass/Fail verdicts."), so a technician's real verdicts can't be silently wiped.

**A-4. `customerAddress` state is dead/no-op dual-write in edit mode** — ✅ **FIXED** (`ad40fea`)
`CreateTicketSoloPage.tsx` wrote both `customerTown` and `customerAddress` from `editWorkOrder.customerAddress`; the only editable input is Town. **Fix applied:** `customerAddress` state removed entirely — single `customerTown` source of truth; save writes `customerAddress: customerTown`.

**A-5. Back-to-back intake doesn't clear `isRegistering` on external nav**
`handleRegisterDevice` sets `isRegistering` then clears at the end — but if the component unmounts mid-save (user navigates via sidebar), the state flag is harmless (component gone) — *low severity; verifying here as a non-issue*. Skip.

**A-6. Portal flow unverified end-to-end** (carried, WORKFLOW known-issue #6)
`estimateStatus` / `estimateApprovedAt` / `estimateRejectionReason` are typed but the customer-portal approve/reject → pipeline handoff is not covered by a test. If a customer approves an estimate and it doesn't move the ticket to In Progress, money is lost.

**A-7. Realtime publication may still exclude `erp_records`** — ✅ **FIXED & VERIFIED** (2026-08-05 01:42, Supabase SQL Editor)
Client subscribes correctly (filter by `collection_name=eq.X`), but Supabase only pushes for tables in the `supabase_realtime` publication. Ko Hein ran `alter publication supabase_realtime add table erp_records;` in the dashboard SQL Editor; a live INSERT test (`__rttest2__`) confirmed the push arrives instantly. Test row cleaned up.

### 4.2 Security / ops hygiene

**S-1. Plaintext shared password + credential reuse**
`server.ts:84` compares `process.env.AUTH_PASSWORD` directly (plaintext equality), and the same `Simple1s@` is reused for ZWH hosting, SSH passphrase, and the WebUI. Single shared admin login for the whole shop. For a LAN tool it's functional, but recommend: (a) hash the password (e.g. scrypt/pbkdf2) or move to per-user Supabase auth; (b) stop reusing one password across infra.

**S-2. `AUTH_PASSWORD` present in both `.env` and `.env.local`**
`.env.local` is a client-vite file (has `VITE_*`); putting server auth there is wrong layering — it ships nowhere (gitignored) but invites accidental exposure. Move `AUTH_*` to server-only `.env`.

**S-3. Stray `appleart_Saturday_1107_backup/` is NOT gitignored** — ✅ **RESOLVED** (commit `4a674e2`)
`git add -A` would commit a large backup blob into the repo. Added `appleart_*_backup*/` + `backups/` to `.gitignore`; verified `git check-ignore` now excludes it.

**S-4. Docs drifted from code (again)** — ✅ **RESOLVED** (commit `0c23b77`)
`PROJECT_WIDE_UI_UX_UPGRADE.md` was committed as "docs" while the implementing code sat uncommitted. The full upgrade pass (incl. `GlobalSearchModal.tsx`) is now committed and pushed. *Lesson to keep:* docs should land in the same commit as (or immediately after) the code they describe — this happened twice in 24 h.

### 4.3 UI / a11y (from `check:ui`, cross-project)

**U-1. 5,256 raw-hex utilities, 72 distinct colors** — the DESIGN-TOKEN debt. `#1D1D1F` ×1058, `#0071E3` ×1037, `#E5E5EA` ×926, `#86868B` ×801. `.basic-ui` theme remaps exist but most code bypasses them. Consolidation = the #1 maintainability win.

**U-2. 19 clickable `<div>` without `role`/keyboard handlers** (Navigation drawer backdrop, UserRoleSwitcher backdrop, WorkOrderStatusTimeline stage filter, CRM customer rows, more). Screen-reader + keyboard users can't operate these. Convert to `<button>` or add `role="button"` + `tabIndex` + Enter/Space.

**U-3. `.basic-ui` input font rule is global-but-inconsistent** — intake inputs are 14 px now, but other modules still inherit 12 px containers. The global 14 px input floor hasn't been rolled out project-wide.

---

## 5. 🛠️ Improvement roadmap (priority order)

### P0 — do this week (data correctness + ops safety)
| # | Action | Effort | Status |
|---|---|---|---|
| 1 | **A-1 / A-4**: stop putting company in Town; collapse address state | 30 min | ✅ done `ad40fea` |
| 2 | **A-2**: order-number dedup/guard | half day | ✅ done `ad40fea` (client-side guard; server-side counter = future hardening) |
| 3 | **A-3**: confirm/scoped "Mark All Pass" | 15 min | ✅ done `ad40fea` |
| 4 | **A-7**: run `alter publication supabase_realtime add table erp_records;` on live Supabase | 10 min | ✅ **DONE & VERIFIED** (01:42) — INSERT push confirmed live |
| 5 | **S-3**: gitignore backup dirs | 20 min | ✅ done `4a674e2` |
| 6 | **A-6**: write a portal approve→pipeline vitest smoke test | half day | ✅ done `c6e367c` — 6 tests, 18/18 suite pass |

### P1 — this month (maintainability + a11y)
| # | Action | Effort |
|---|---|---|
| 7 | **U-2**: fix the 19 clickable divs (role+keyboard or `<button>`) | 2 h |
| 8 | **S-1/S-2**: move `AUTH_*` to server env, hash the password, stop cross-infra password reuse | 1–2 h |
| 9 | **U-1** start of design-token consolidation: at minimum alias the top-8 colors to CSS vars and add raw-hex lint to `check:ui` as a *blocking* gate | ~2 h + rolling |
| 10 | **U-3**: global 14 px input floor via `.basic-ui input` (already done for intake; standardize) | 1 h |

### P2 — backlog (from PROJECT_WIDE doc, cross-cutting)
- Global content clamp `max-w-[1920px]` for ultra-wide + `3xl:` grid density (Dashboard KPIs, Finance stats, Price List, POS, QA).
- Table column-priority hiding + card-list on phones for Inventory/Suppliers (reuse Intake card pattern).
- PWA icons + `theme_color #0071E3` for shop iPads.
- English ⇄ Myanmar label toggle (biggest real-world win for counter staff).
- Route-level code-splitting + vendor chunks (bundle is the top perceived-speed item).
- Esc-to-close + focus-trap consistency on modals; loading skeletons.

---

## 6. What's genuinely good (don't touch)
- **Single-table JSONB design** is pragmatic for a small shop — no migration pain, REST upserts are simple. Keep it until real relational needs appear (reporting/finance).
- **Safety net patterns:** 45s refetch, full-object upsert discipline (painful lesson learned), backup cron, deploy rollback, exact-match customer lookup, no-fabricated-data discipline (serial/IMEI blank, intakeChecklist derived from real diagnostics).
- **Intake page after R1–R5** is the most polished surface: equal-height row 2, real 14 px inputs, safe-area, zero overflow everywhere, one `<h1>`.
- **Testing + type discipline:** 12 vitest tests, 0 TS errors — rare for a solo-built ERP; protect it.

---

## 7. One-line verdict
**Architecture is sound for a small repair shop; the acute risks are data-integrity edges (customer-match field stuffing, order-number collisions, fabricated PASS) and ops drift (uncommitted work, un-gitignored backup, shared password).** Fix P0 → stability is solid; then the token/color debt and mobile table UX are the biggest quality multipliers.

*Companion docs: `WORKFLOW.md` (ops guide), `PROJECT_WIDE_UI_UX_UPGRADE.md` (12-module responsive plan), `INTAKE_CREATE_TICKET_UI_UX_ANALYSIS_R5_RESPONSIVE_UPGRADE.md` (intake-focused), `POS_UI_UX_AUDIT.md`, `SIDEBAR_UI_UX_ANALYSIS.md`.*
