# i35 Apple Service — ERP System Documentation

**Live:** https://erp.i35appleservice.com · **Repo:** github.com/i35kohein/i35erpsystem (main)
**Source:** `/Users/user/Desktop/Kimi ERP` · **Updated:** 2026-08-06

---

## 1. Overview

Repair-shop ERP for i35 Apple Service (Yangon). One codebase, two UI modes:
**iPad (primary, clean)** and **desktop (original layout)**. Real-time sync via
Supabase, offline-tolerant with a local cache, AI assistant for diagnostics.

## 2. Tech Stack

| Layer | Tech |
|---|---|
| Frontend | **React 18 + TypeScript + Vite** |
| Styling | **Tailwind CSS v4** (`@tailwindcss/vite`), design tokens, **carbon-coat.css** (IBM Carbon palette override), SCSS |
| UI kit | **Radix UI** (dialog/dropdown/popover/select/tabs/slot) — incl. `ui/dropdown-menu.tsx` kebab primitive, **lucide-react** icons, **motion** |
| Helpers | class-variance-authority + tailwind-merge (Button variants), html5-qrcode, jsbarcode, qrcode.react |
| Backend | **Node.js + Express** (server.ts, port 3100 on VPS; 3000 locally) — static SPA + AI proxy |
| AI | Gemini (`@google/genai`) + OpenRouter (multi-provider) via server proxy |
| Data | **Supabase** (Postgres, table `erp_records` — JSONB rows keyed by `collection_name`) + **drizzle-orm** (schema/migrations, `src/db`) + **pg** (direct Postgres) |
| Legacy sync | Firebase (`firebase` + `firebase-admin`) — offline cache/bridge |
| Testing | **vitest** |
| Infra | DigitalOcean droplet (SGP1 `178.128.62.242`, Ubuntu 24.04) · systemd (`i35erp`) · Caddy reverse proxy (HTTPS) · DNS @ Z.com |

## 3. Architecture

```
React SPA (src/) ──┬── Supabase (erp_records, realtime channels, offline cache)
                   ├── Express server (server.ts) ── AI providers (Gemini/OpenRouter)
                   └── local state lifted to App (prop-with-local-fallback)
```

- **State lifting pattern:** module state that App-level chrome needs (navbar/drawer
  controls) lives in `App.tsx` and flows down as props; modules keep a local fallback
  (`const x = propX !== undefined ? propX : localX`) so they work standalone.
- **Hash navigation:** `#/tab` URL sync (back/forward + deep links), validated against `KNOWN_NAV_TABS`.
- **Realtime:** Supabase channels per collection; offline writes queue and sync.

## 4. Modules (tabs)

| Tab | Component | Notes |
|---|---|---|
| Dashboard | DashboardOverview | KPI, status queue, roster, warranty watch, tech leaderboard, AI assistant |
| Intake | IntakeWorkOrderModule + CreateTicketSoloPage | ticket intake, duplicate IMEI warning |
| Pipeline | StatusPipelineView | kanban board, stage filters, card actions, ticket detail inspector |
| POS | PosInvoicingModule | checkout, split payment, cash numpad, receipts |
| Inventory | InventoryManagementModule | stock/profit/matrix views, barcode scan, inline edit, print tags |
| Suppliers | SupplierRmaModule | purchase orders, RMA, debts |
| Price Catalog | PriceCatalogModule | device × component pricing, cart, discounts |
| Finance | ShopFinancePlModule | P&L engine, expenses, supplier payments, payouts |
| CRM | CrmCustomerPortalModule | customers, repair history, timelines |
| Follow-Ups | CompletedDeviceFollowUpModule | after-service follow-up |
| QA | QualityAssuranceModule | 21-point QA checklist, warranty inspection |
| Settings | SystemManagementSettingsModule (+ tabs) | shop info, theme, users, intake, pricing, payment, inventory, POS layout, notifications, QA, AI, recycle bin |

## 5. Data Layer (Supabase)

- Single table `erp_records(id, collection_name, data JSONB, created_at)`.
- **Collections:** workOrders, customers, parts, suppliers, expenses, supplierDebts,
  technicianPayouts, systemSettings, users, purchases + more (see `src/App.tsx` loaders).
- `src/lib/supabase.ts` — fetch/save/delete/realtime helpers; `cloudSafeData` strips
  secrets from `systemSettings` before upload.
- **Unique index on `orderNumber` (workOrders): PENDING** — app-level duplicate guard
  active; needs Supabase DB password to add the index (blocked, Ko Hein action).
- Optional: `src/db/schema.ts` (drizzle) + `pg` for direct SQL paths.

## 6. Server (server.ts)

- Serves the built SPA (`dist/`), health check at `/api/health`.
- **AI proxy:** `/api/ai/*` routes to Gemini (GEMINI_API_KEY) or OpenRouter with
  provider/model fallbacks, streaming, usage tracking.

## 7. iPad vs Desktop (GOVERNING RULE)

- **iPad (detected by `useIsIpad`: iPad UA or Mac + touch):** clean UI — filters in a
  right drawer, minimal toolbars, hidden sidebar (hamburger), 40px touch targets,
  tables fill + sticky headers, fonts ≥12px.
- **Desktop:** original layout unchanged — inline filters, toolbar toggles, full sidebar.
- Phones: drawer-based as before. Every divergence is gated on `useIsIpad()`, never CSS alone.

## 8. Design System

- **Palette:** Tailwind `@theme` tokens overridden by `src/carbon-coat.css`
  (IBM Carbon): brand `#0f62fe`, ink `#161616`, muted `#6f6f6f`, line `#e0e0e0`,
  surface `#f4f4f4`, success `#166534`, danger `#da1e28`, purple `#8a3ffc`, warning `#ff9500`.
- **Themes (2):** light (default carbon) + dark-slate. `.basic-ui` vars ALIAS the tokens
  (single source). Dark-slate also overrides `--color-*` so modern classes go dark.
- **Fonts:** IBM Plex Sans (UI) / IBM Plex Mono (numbers/codes).
- **Font floor:** nothing under 12px on screen (`@media screen` rules in index.css; print exempt).
- **Radii:** md 6 (chips) · lg 8 (inputs) · xl 12 (buttons/cards) · 2xl 16 (panels) · full (pills).
- **Buttons:** ONE component `src/components/ui/button.tsx` — variants
  default/destructive/outline/secondary/ghost/link/success/chip/iconGhost; sizes
  default(h-10)/sm/lg/icon(h-10)/iconSm. **Raw `<button>` banned outside the ui kit**
  (lint-enforced, `scripts/check-button-policy.mjs`). Logo always on a white `logo-chip`
  in dark mode.
- **Kebab action menus:** `ui/dropdown-menu.tsx` (Radix) — table/modal action rows use
  a ⋮ menu (e.g. TicketDetailInspectorModal: Edit/Print/Delete; inventory part detail).
- **Create Ticket = slide-over drawer** (right-side, max-w-2xl/3xl, backdrop close) —
  not a full page; `embedded` prop on CreateTicketSoloPage.

## 9. Development Workflow

```bash
npm run dev        # vite dev + express (port 3000)
npm run lint       # tsc --noEmit + button-policy guard
npm run test       # vitest
npm run build      # vite build + esbuild server.cjs → dist/
npm run start      # node dist/server.cjs
./deploy.sh        # build → rsync → systemctl restart i35erp → health check
git push origin main
```

## 10. Conventions

- **Clean UI is iPad-only**; desktop keeps its original look.
- **State lifting:** App state + prop-with-local-fallback.
- **New buttons:** `<Button>` from `./ui` (variants above) — never raw `<button>`.
- **Colors:** `--color-*` tokens only; no raw hex in new code.
- **Fonts:** `text-xs` minimum on screen; `font-mono` for codes/numbers.
- **CSS layering trap:** custom rules that must yield to Tailwind utilities go in
  `@layer base` (unlayered beats layered regardless of specificity — learned the hard way).
- **Imports:** no unused imports/vars (`noUnusedLocals` + `noUnusedParameters` on).

## 11. Known Open Items

- ⏳ **Supabase DB password** needed for `orderNumber` unique index (app guard active).
- Optional: none remaining from the 2026-08-06 audits (UI/UX, tables, fonts, colors,
  dead code, button policy — all complete).

---

_See also: `README.md` (button policy + quick reference), `analysis/` (audit reports)._
