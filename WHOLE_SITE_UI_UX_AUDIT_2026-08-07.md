# i35 ERP — Whole-Site Micro-Level UI/UX Audit

**Date:** 2026-08-07 (evening) · **Scope:** all 12 modules, verified against source
**Method:** 4 parallel subagent audits (A: dashboard+intake, B: pipeline+qa+followup+portal, C: pos+finance+prices, D: inventory+suppliers+crm+settings), every finding line-verified.
**Design system:** tokens in `src/index.css` (`--color-*`: brand/ink/muted/faint/line/surface/success/danger/purple/warning/teal/sky), `dark-slate` theme remaps token utilities ONLY (index.css:157–176) — raw palette utilities stay light in dark mode. Touch floor: 40px (`min-h-10`). Radius: panels `rounded-2xl` (16px) max, buttons/inputs `rounded-xl`, ui `Input` = `rounded-xl`/`text-sm`/`h-10`. Font floor 12px.

---

## Finding counts by module

| Module | P0 | P1 | P2 | P3 |
|---|---|---|---|---|
| DashboardOverview | 2 | 3 | 8 | 4 |
| IntakeWorkOrderModule | 0 | 2 | 6 | 2 |
| CreateTicketSoloPage | 0 | 5 | 8 | 3 |
| TicketDetailInspectorModal | 0 | 3 | 5 | 1 |
| StatusPipelineView | 0 | 3 | 6 | 3 |
| QualityAssuranceModule | 0 | 1 | 5 | 1 |
| CompletedDeviceFollowUpModule | 0 | 1 | 5 | 3 |
| CustomerFacingWebPortal | 0 | 2 | 7 | 3 |
| PosInvoicingModule | 0 | 3 | 8 | 4 |
| ShopFinancePlModule | 0 | 1 | 8 | 3 |
| PriceCatalogModule | 0 | 1 | 7 | 3 |
| WorkOrderStatusTimeline | 0 | 0 | 6 | 5 |
| InventoryManagementModule | 0 | 2 | 6 | 3 |
| SupplierRmaModule | 0 | 1 | 5 | 2 |
| CrmCustomerPortalModule | 0 | 1 | 3 | 1 |
| SystemManagementSettingsModule | 0 | 1 | 3 | 1 |
| CustomerNotificationModal | 0 | 0 | 3 | 2 |
| ModuleLoadingSkeleton | 0 | 0 | 0 | 2 |
| Settings tabs (7 files) | 0 | 0 | 7 | 0 |

**Totals: 0 P0 (no broken layout/overflow found), 30 P1, 104 P2, 46 P3**

---

## P1 issues (must fix)

### P0-1 · DashboardOverview — TrendChart SVG hardcodes light-mode hex
Gridlines `#E5E5EA` (104), bars `#0071E3`/`#E5E5EA` (117), line/dots `#34C759` (122,126), labels `#86868B` (131) — near-invisible in dark mode. → `var(--color-line)` / `var(--color-brand)` / `var(--color-success)` / `var(--color-muted)`.

### P0-2 · DashboardOverview — right-edge scroll fades hardcode white
`from-white/80 to-transparent` (978 subtab bar; 1375 roster) stays white in dark mode. → `from-surface/80`.

### P1 — DashboardOverview
- **P1-1** Raw `<select>` filters `py-1.5 px-2.5` (1181–1185, 1195–1199) ~30px < 40px floor. → ui Select or `min-h-10`.
- **P1-2** "Reset Filters" `px-2.5 py-1.5` (1217) same floor violation.
- **P1-3** Pervasive hardcoded `bg-white` cards (688/694, 728, 764, 1076, 1176, 1445…) → `surface` token.
- **P1-4** Queue search `Input` overridden `rounded-lg`+`text-xs` (1165) vs spec `rounded-xl`/`text-sm`/`h-10`.

### P1 — IntakeWorkOrderModule
- **P1-1** Camera icon `text-brand` inside `bg-brand` CTA (221) — invisible. → `text-white`.
- **P1-2** `<tr onClick>` (389–390) no role/tabIndex/keyboard — card grid does it right (487–491).

### P1 — CreateTicketSoloPage
- **P1-1** Device-model selector = giant `<Button>` wrapping `<h3>` + content (760–808) — heading-in-button invalid; SR label over-long.
- **P1-2** Camera icon `text-brand` inside `bg-ink` button (882–884) low contrast. → `text-white/90`.
- **P1-3** Raw `<textarea>` (1088) bypasses ui kit — no focus ring, non-token border.
- **P1-4** `img alt="Intake"` (1230) generic for all condition photos → include model+index.
- **P1-5** Customer-type dropdown button `h-9` (751) → `h-10`.

### P1 — TicketDetailInspectorModal
- **P1-1** Entire component uses legacy CSS-var scheme (`var(--border)`, `var(--card-bg)`, `var(--blue-tint)`…) (126–415) mixed with `bg-brand` (442). → `--color-*` tokens.
- **P1-2** Close `h-9 w-9` (201) + tabs `lg:h-8` (213,226) below floor → `min-h-10`.
- **P1-3** Tab nav no ARIA tabs (208–231) — no `role="tab"`/`aria-selected`; count not announced.

### P1 — StatusPipelineView
- **P1-1** Card action row buttons `min-h-9` (852,864,874) + ⋯ `!h-9 !w-9` (886) < 40px on most-tapped control.
- **P1-2** After-Diag Pass/Fail/N/A toggles `flex-1 py-1` ~28px (1174,1185,1196). → `min-h-10`.
- **P1-3** Status changes are drag-and-drop ONLY — no keyboard path to move tickets between stages. Add status action in ⋯ menu.

### P1 — QualityAssuranceModule
- **P1-1** Orphaned wizard badge `<span>7</span>` (365) next to "21-Point Post-Repair Hardware Inspection" — leftover step artifact. Remove.

### P1 — CompletedDeviceFollowUpModule
- **P1-1** Call button = raw `<a href="tel:">` `p-2` (32px) no aria-label (535–537). → Button + `aria-label` + `min-h-10`.

### P1 — CustomerFacingWebPortal
- **P1-1** Literal `aria-label="{wo.orderNumber} -"` (331) — template string inside quotes; SR reads raw braces.
- **P1-2** Diagnostics N/A badge `bg-muted text-white` (874) fails contrast. → `bg-slate-600`/ink-on-surface.

### P1 — PosInvoicingModule
- **P1-1** Selectable WO card `<div role="group">` no `tabIndex` (437–443) — keyboard handler is dead code. → `role="radio"`+`tabIndex`+`aria-checked` or real Button.
- **P1-2** Icon-only Remove-part button `h-9 w-9` (658) + raw rose palette → danger token.
- **P1-3** "Add Part" `h-9` (748) beside Qty `Input` (h-10) + select — mixed heights in one row.

### P1 — ShopFinancePlModule
- **P1-1** Missing empty states on Revenue (636), Expenses (698), Inventory-asset (758), Commissions (814), Accounts-payable (892) tables — bare header with zero rows. (Inventory-fund 1233 & parts-revenue 1293 DO have them — inconsistent.)

### P1 — PriceCatalogModule
- **P1-1** Service cards `role="button"`+`tabIndex` but NO `focus-visible` ring (955–971) — keyboard focus invisible.

### P1 — InventoryManagementModule
- **P1-1** Profit view no empty state (1873+; Stock 1427 & Matrix 2004 have them) — add "no parts match" + reset.
- **P1-2** Pagination footer misleading: prints `Showing 1-{N} of {N}` + `All rows visible` (1864–1866) but only renders 50 rows/page (861,868). → real `(page-1)*50+1–min(page*50, N)`.

### P1 — SupplierRmaModule
- **P1-1** Crash path: `parts.find(...) || parts[0]` then `part.id` (130) — empty parts → TypeError on RMA submit. Guard or disable Submit.

### P1 — CrmCustomerPortalModule
- **P1-1** `aria-label="Filter"` (635) on Account Type dropdown — wrong label. → `aria-label="Account Type"`.

### P1 — SystemManagementSettingsModule
- **P1-1** `aria-label="Active"` (1127) on technician Status (→ "Status"); `aria-label="Active User"` (1297) on Account Status (→ "Account Status").

---

## Top P2 themes (systemic)

1. **Raw palette vs tokens (dominant)** — dozens of rose/emerald/amber/blue/purple/slate/red/pink/indigo utilities + `bg-black/45`, `bg-slate-900/40-60` scrims across EVERY module; `dark-slate` only remaps token utilities → status banners/drawer cards/badges stay pastel in dark mode. Map to success/danger/warning/purple/sky/brand tokens.
2. **Raw `<select>`/`<textarea>` bypassing ui kit** — 7+ instances (POS 696/901, Finance 971/1010/1092, Timeline 407/468, Inventory 1799/2598/2698/2744, SupplierRma 512/525/538, CRM 635/684, Settings tabs ×8). Standardize on `CustomDropdownMenu`/ui controls.
3. **Duplicated markup blocks** — payment tiles (POS 825/857), WarrantyPill ×4 (Prices 479/609/698/988), cart card ×3 (Prices 595–750), filter pills ×4 (Timeline 517–547), modal shells ×6 (Pipeline 954–1428), Supplier form ×2 (579–769), repair-chips ×3 (FollowUp). Extract components/consts.
4. **Sub-40px touch targets** — compact toolbar buttons (`h-8 sm:h-7`, `h-9`, `h-7`, `px-3 py-1.5` chips) across Dashboard, Intake, Pipeline, FollowUp, Inventory, SupplierRma.
5. **Dead code/state** — `localDateFilter` never set (Intake 84, FollowUp 39), `setCustomQualityTiers` no-op + orphaned Create-Quality-Tier modal (Inventory ~250/2869), `bg` field never used (Timeline 31–35), dead `filterType==='POS'` branch (Timeline 195), hardcoded `new Date('2026-07-22')` baseline (Pipeline 182), `animate-fade-in` class not defined (POS 563/878/1012), `setDateFilter` prop unused (FollowUp 26).
6. **Magic numbers** — `min-h-[200px]`, `h-[20px]`, `max-h-[680px]`, `max-h-[calc(100dvh-260px)]`, `w-[52px]`, `max-w-[140px]/[150px]/[180px]`, `min-w-[460px]`, `h-[92vh] max-h-[760px]` — break at 390/768/1440.
7. **Inconsistent overlays/shadow** — `bg-slate-900/40` vs `/50` vs `bg-black/40/45/50`; arbitrary `shadow-[0_-4px_12px_rgba(0,0,0,0.06)]` ×3 (POS 1221, Prices 1078, Settings 1570). Unify + tokenize.
8. **Hardcoded MMK** — 57× in Finance, several in POS, `0 MMK` in Prices (769) while `systemSettings.currencySymbol` exists (POS receipt uses it, 1429). Also `const diagFee = 5000` (POS 380) should come from systemSettings.

---

## Notable P3 (quick wins)

- `animate-pulse` on status text (QA 402, Finance 356) — noisy; drop.
- `animate-ping`/`animate-pulse` chips lack `aria-hidden` (Portal 571/752).
- SVG axis `fontSize={10}` (Dashboard 131) — bump to 11–12.
- Stage grid `3xl:grid-cols-6 4xl:grid-cols-8` with 4 cards → empty columns (Dashboard 1096).
- `rounded-3xl` desktop card (Prices 867) exceeds 16px radius scale.
- `h-4.5 w-4.5` non-standard size (Inspector 202).
- `aria-hidden` skeleton with no `role="status"` (ModuleLoadingSkeleton 9).
- KPI card ×4 copy-paste → `KpiCard` component (Dashboard 688–796).
- `text-faint` for body copy (Portal 388/721) → `text-muted`.
- Overlay `bg-black/40` vs `bg-black/50` inside Portal (946/1028 vs 1093).

---

## Positives (verified, keep)

- QA status toggles enforce `min-h-10` (414–432); queue items keyboard-accessible (240–245).
- Portal login/approve/decline buttons have `focus-visible` rings (251–255, 1031–1038, 1069–1076); message thread has proper bubbles + empty state.
- CRM `[`/`]` keyboard cycling, mobile bottom-sheet auto-open, roster/detail empty states.
- Settings: 13 tabs lazy-load with skeletons, dirty-dot, unsaved-changes guard.
- Timeline/others: stage cards `role="button"`+Enter/Space (needs `aria-pressed`).
- No dead `wizardMode`/`wizardStep` code anywhere (removed earlier commit e9f073c).
- FollowUp empty states + keyboard-safe list.
- CustomerNotificationModal: token-based channel colors, char counter, copied-state.

---

## Suggested fix order

1. **P0-1/P0-2 + all P1** (30 items) — dark-mode SVG, focus/a11y, touch floor, crash path, wrong aria-labels.
2. **Token sweep (P2 theme 1)** — biggest visual win for dark mode; scriptable with careful per-file review (watch CSS-layer trap: unlayered beats layered).
3. **Raw form controls (P2 theme 2)** + component extraction (theme 3).
4. **Dead code cleanup (theme 5)** + magic numbers (theme 6) + overlay/shadow unification (theme 7).
5. **Currency from settings (theme 8)** + P3 quick wins.
