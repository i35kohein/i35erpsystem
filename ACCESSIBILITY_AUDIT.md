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

## FINAL — ✅ 0 real violations (light theme, all 11 tabs)
- **color-contrast: 0** (was 66) · **heading-order: 0** · **landmark: 0** · **select-name/nested-interactive: 0**
- Remaining: `region` ×9 — the fixed-position `role="tooltip"` overlay (axe known limitation for position:fixed elements outside landmarks; functionally fine — tooltip is aria-describedby-linked). Acceptable.
- **Theme note:** ✅ BOTH themes audited to 0 real violations (light + dark-slate). Only `region` ×9 remains (fixed-position tooltip — axe limitation, acceptable).

## Root causes fixed this pass (66 → 0)
1. `--color-success` (Carbon #24a148) → #166534 (white-on-green 3.35 fail); muted/faint → #616161 (passes white AND surface).
2. **Button default-variant bg-brand + className text override** (invisible text on blue) — the dominant pattern. Fixed by:
   - Work Intake view toggles, Parts Stock/Profit/Matrix toggles, portal tab nav → `variant="ghost"`
   - CRM roster name/expand/Full-History buttons, mobile close, details header name + Full History, POS IMEI copy → converted to **plain `<button>`** with same classes + focus ring (deterministic, no CSS order gamble)
3. ⚠️ **Runtime crash lesson:** esbuild doesn't type-check — referencing an undefined `FOCUS` const in className template literals built fine but blank-screened the CRM module at runtime. Fix: define `const FOCUS` in each file. Always verify the affected tab renders after deploy (body text non-empty).

## How to re-run
Inject axe-core 4.10.2 (CDN), `axe.run(document)` per tab — script: `/tmp/erp_micro/axe_verify.cjs` pattern.

## F7 — dark-slate theme pass (2026-08-06, 129 → 0 contrast)
- Dark audit: 129 contrast nodes across 9 tabs. Fixed via `index.css` F7 dark override block (unlayered + !important):
  - text remaps: .text-brand/-deep → #6EA8FE, .text-success(-deep)/emerald-* → #4ADE80, danger/red → #F87171, purple/violet → #C4B5FD, amber/orange → #FBBF24/#FDBA74, rose-7/8/950 → #FDA4AF, slate-600/700 → #CBD5E1/#E2E8F0, hardcoded text-[#15803D]/[#16A34A]/[#166534]/[#1E7E34]/[#27B1AE]/[#ED7132]/[#5A3FD4] → light variants
  - pastel wells (bg-*-50 + /20-/80 opacity variants) → translucent dark tints; borders → tinted
  - var(--primary)-mapped button bgs (bg-[#AF52DE]/[#7360F2]/[#0077ED], purple-5/6/700, indigo-600, teal-5/600) → dark button blues (dark --primary #38BDF8 is an accent, fails with white text)
  - bg-ink (tooltip) → #26334D; bg-white/50 (stage columns) → dark; sidebar active nav bg-[#EAF2FF]/text-[#1559A6]/border-[#B8D3F4] → dark variants; bg-[#FAFAFC]/[#F8FAFC] → dark
- Source fixes: POS IMEI + Configured-in-Settings, CRM roster name/expand/Full History/Edit/mobile-close/details-name/details-Full-History → `variant="ghost"` (raw plain-buttons were reverted by a concurrent refactor's button-policy pass; ghost is the policy-compliant way); `!text-brand` → `text-brand` in StatusPipelineView (important-variant utilities beat unlayered important in CSS layers — the `!` was the reason the override never applied).
- ⚠️ LESSONS: (1) Tailwind v4 PURGES rules inside `@layer utilities` that carry html[] selectors — keep overrides unlayered; (2) important-variant utilities (`!text-brand`) beat unlayered !important overrides (layer priority for !important) — fix source, not CSS; (3) `[class~="bg-[#AF52DE]"]`-style tie specificity → place dark remaps at END of file; (4) REPO IS CONCURRENTLY EDITED by another process — re-check git log/status before assuming your edits are live; deploy from working tree can conflict.
- Final: light 0 + dark 0 (only region ×9 tooltip). Screenshots erp-micro/dark_*.png.