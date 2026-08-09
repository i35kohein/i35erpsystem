# POS & Invoicing Portal — Right Panel (Terminal Checkout) UI/UX Analysis

**Date:** 2026-08-09 · **Request:** Ko Hein ("POS & Invoicing Portal > right pos ui analysis")
**Method:** Code inspection (`src/components/pos/PosInvoicingModule.tsx`) + live DOM measurement at 430×932 (mobile) and 1920×928 (desktop). Vision models out of credits — measurements, not screenshots.
**Sections audited:** Ticket header, Itemized Labor & Parts, Add Inventory Part, Calculation Summary, Payment Method Selection, Split Payment, Cash numpad, Receipt preview, action buttons, mobile sticky checkout bar.

## Overall Score: 8.8 / 10 (post-fix) — was 8.0 before this round's P1/P2 fixes

| Dimension | Score | Notes |
|-----------|-------|-------|
| Layout (desktop) | 9 | 2-column split: items/summary left, payment right; Pay visible without scroll |
| Layout (mobile) | 8.5 | Sticky bar keeps Amount Due + Pay always visible; single-column flow |
| Text/typography | 9 | Text-based Review Cart-style line items; readable floor respected (12px min) |
| Payment flow clarity | 8.5 | Tiles with icons + selected states; under/double-charge guards; change-due feedback |
| Visual hierarchy | 8.5 | Amount Due Now (text-2xl brand) stands out; muted labels consistent |
| Discoverability | 8 | Split Payment auto-fills halves; settings access now icon-only on mobile |

## Strengths (keep)

1. **Desktop 2-column split** (`f747a51`): ticket+items+summary left, payment+receipt+pay right. Pay & Print Receipt visible at y≈703 (was y≈1129 below the fold). Panel 1126px → 719px, no page scroll.
2. **Mobile sticky checkout bar** (md:hidden): Amount Due + Pay pinned bottom with safe-area padding — the single best mobile POS pattern here.
3. **Text-based line items** (`f145d59`): `# | Item | Amount` grid, no horizontal scroll, Qty + `· Inventory Part` sub-line, strike+% for discounts, plain X for removable parts.
4. **Payment tiles**: shared `PaymentMethodTile` (deduped in P2 audit), icon chips, clear selected states (brand bg / purple for Split).
5. **Safety guards** (P1 round): underpayment disabled Pay, double-charge blocked when isPaid, cash short/change-due live feedback, numpad with aria-labels.
6. **Receipt preview**: text-based monospace mock of the printed receipt — exactly what the customer gets.

## P1 — Must fix (fixed this round)

1. **Payment header squeezed on mobile** — `Payment Method Selection (4 Enabled)` heading was truncated to ~100px because the 265px ghost label-button `Configured in Settings → Payment Methods` hogged the row (heading + button ≈ 500px > 430px).
   **Fix:** label hidden on mobile (`hidden md:inline`), replaced by an inline gear icon (`Settings`); heading now shows fully.

## P2 — Should fix (fixed this round)

2. **Payment tiles squashed to 40px** — design intent `min-h-[56px]`, but the global `button { min-height: 40px !important }` (readability/touch floor) beat the utility → desc line (`Myanmar Mobile Pay`) cramped.
   **Fix:** `!min-h-[56px]` on `tileBase` — tiles render 56px, desc readable.
3. **Sticky bar covered the end of the scroll** — mobile bottom padding was 20px vs 61px sticky bar → last in-flow buttons partially hidden at full scroll.
   **Fix:** panel `pb-24 md:pb-5`.
4. **Duplicate Pay action on mobile** — in-flow `Pay & Print Receipt` AND the sticky bar both appeared; user could tap either.
   **Fix:** in-flow Pay button `hidden md:flex`; sticky bar is the single mobile pay path. `Print Itemized Invoice` stays on mobile.

## P3 — Nice to have (not done, optional)

- Notify Customer (purple) on mobile is 144px — could be icon-only (`hidden sm:inline` label) to give the WO number breathing room.
- `Itemized Labor & Parts` heading could carry a count badge (`(2)`).
- Receipt preview truncates at 3 items with `… +N more` — fine for a preview; a tap-to-expand would be nicer.
- Split Payment default halves is great; consider remembering the last-used split per ticket.
- Cash numpad keys could show the target amount near the top when Cash is selected (already shows short/change — enough).

## Verified measurements (post-fix)

| Check | Mobile 430×932 | Desktop 1920×928 |
|-------|----------------|------------------|
| Line items grid | `1 Battery Qty 1 138,000 (~~230,000~~ · 40%)` | left col x=489 w=685 |
| Payment tiles height | 56px | 56px |
| Pay & Print Receipt | sticky bar bottom (always visible) | right col x=1541 y=703 |
| Page scroll | none (internal panel scroll) | none |
| Payment header | full text, gear icon link | label + link |

## Status
- Analysis round commit: **`b13d4b6`** (pending — this doc + 4 fixes in one commit)
- Prior POS rounds today: P1 guards → P2 split/currency → `f145d59` text items → `f747a51` desktop 2-col → this analysis
