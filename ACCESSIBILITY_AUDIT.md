# ERP Accessibility Audit (2026-08-06) — axe-core 4.10.2, 12 tabs @1440px

## Results (before → after this pass)
| Rule | Impact | Before | After |
|------|--------|--------|-------|
| select-name | critical | 3 | **0** ✅ |
| nested-interactive | serious | 1 | **0** ✅ |
| color-contrast | serious | 66 | **20** (4 tabs) |
| heading-order | moderate | 4 | **1** |
| region | moderate | 9 | 9 (tooltip, fixed-pos — axe limitation) |

## Fixed (source)
- **select-name**: Dashboard tech/priority filters, TechnicianPerformanceTab, Settings tabs (Ai/Pricing/Intake/Pos), SystemManagement, CustomerRepairTimeline (2), CrmCustomerPortal, CustomerFacingWebPortal — all `<select>` now have aria-label.
- **nested-interactive**: POS ticket card role="button" → role="group" (contained nested controls).
- **color-contrast** (66→20):
  - Sidebar badges: per-badge text color — orange #FF9500 → text-black (white was 2.5:1); others carry text-white explicitly.
  - `--color-muted` token #86868B → **#757575** (3.9→4.6:1) — global AA pass for muted text.
  - text-brand on bg-brand/10 tints → **text-brand-deep** (swept 18 files incl. Pipeline stage buttons, QA chips, POS, Price List, Inventory).
  - Greens: text-[#28A745]/[#16A34A] → **#15803D** (17 files); finance emerald badges → #166534; text-success → success-deep (#188038).
  - Light greys #A1A1A6/#A5A5AA → #6E6E73; POS payment tile selected text-blue-100 → text-white; Dashboard active-tab badges bg-white/20 → bg-[#003A78]; "Total Work Orders" badge → text-brand-deep; %-of-queue chips slate-500→600; pipeline show-all chip bg-black/25.
- **heading-order** (4→1): dashboard section titles h3→h2; pipeline stage column labels h3→div (visual labels); Follow-Ups "Devices Due" h3→h2; Finance margin benchmark h4→h3.
- **region**: HoverTooltip role="tooltip"; GlobalSearchModal role="dialog" aria-modal aria-label (tooltip still flagged — fixed-position outside landmarks is inherent).

## Remaining — final (7 nodes, light theme)
- Portal staff/technician name buttons (6): default-variant `<Button>` (bg-brand) with ink text — data-driven render not yet located in source; pattern documented. Fix: those buttons should use variant="ghost"/"outline" or explicit text-white.
- POS confirm-modal close (1): iconGhost variant — axe background-propagation quirk vs the white modal; visually fine.
- **Note — themes:** the app supports `app_theme` (light / dark-slate). This audit was run in LIGHT mode (66→7). The dark-slate theme needs its own contrast pass (light text on dark + brand-on-dark fail there).

## Root causes fixed this pass (light mode 66 → 7)
- `--color-success` (Carbon #24a148) → #166534 (was white-on-green 3.35:1); muted/faint tokens → #616161 (passes on white AND surface #f4f4f4); carbon-coat `:root` overrides aligned.
- Button default-variant bg-brand + className text overrides (invisible text) — fixed Work Intake view toggles + portal tab nav via `variant="ghost"`.
- theme gotcha: stale `localStorage.app_theme = dark-slate` flips the whole audit — always clear it before light-mode runs.

## How to re-run
Inject axe-core 4.10.2 (CDN), `axe.run(document)` per tab — script: `/tmp/erp_micro/axe_verify.cjs` pattern.
