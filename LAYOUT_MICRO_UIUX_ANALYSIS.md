# ERP Layout — Micro-Level UI/UX Analysis (2026-08-06)

**Method:** Live production (erp.i35appleservice.com, logged-in Chrome) at 1440×900 · expanded sidebar · DOM measurement (element rects / computed styles) + visual screenshot review for 7 views (Dashboard, Work Intake, Pipeline, POS, Finance, Inventory, Suppliers).

Screenshots: `~/Desktop/erp-micro/` (also workspace `erp-micro/`)

---

## 1. Layout grid — ✅ consistent
- Sidebar 256px expanded / 56px collapsed · main content fixed at x=256, w=1184 on all views (verified 7/7) · topbar 52px.
- The structural grid is solid. All defects below are INSIDE the content area.

## 2. 🔴 Design tokens do not exist (measured, per view)

| View | Button heights | Font sizes used | Card padding / radius |
|------|---------------|-----------------|----------------------|
| Dashboard | 32 / 39 / 40 / 41 | 12 / 14 / 30 | 16px / r16 |
| Work Intake | 32 / 36 / 84 | 12 / 14 / 18 / 20 | 20px / r16 |
| Pipeline | 32 / 36 | 12 only | — |
| POS | 32 / 36 / 40 / 56 | 12 / 14 / 16 | 16px / r16 · 12px / r12 |
| Finance | 34 / 36 | 12 / 14 / 16 / 18 / 24 | 20px / r16 |
| Inventory | 34 / 36 | 12 / 14 / 16 / 18 | 20px / r16 · 32px / r0 |
| Suppliers | 32 / 34 / 36 / 39 | 12 / 14 / 18 | 16px / r16 · 48px / r16 |

**Measured totals:** 8 distinct button heights (32, 34, 36, 39, 40, 41, 56, 84) · 7 font sizes (12–30) · 5 card paddings (12/16/20/32/48) · 2 radii (12/16) + r0.
→ No shared `height`/`font-size`/`spacing` tokens; every view re-derives its own numbers. Same-purpose buttons differ in height BETWEEN views (e.g., primary action 36px in Pipeline vs 40px in Dashboard vs 84px in Work Intake).

## 3. 🟠 Micro visual defects (screenshot review)

### Global / chrome
1. **Topbar icons off-center** — Search icon, date filter and AI button center-points differ by 1–3px (flex baseline mismatch).
2. **Sidebar badge size inconsistency** — "449" badge font larger than "1"/"3"/"4" badges; also category header vertical rhythm uneven.
3. **Sidebar rail (56px)** — collapsed state shows no tooltips on icon hover (guessability).

### Dashboard
4. **"8 Total Work Orders" badge** crammed against "Status Queue & Stage Distribution" title (missing gap).
5. **Card padding inequality** — "Ready for Pickup" card padding ≠ "Total Revenue" card in the same row.
6. **"View Queue / View Finished"** links not baseline-aligned with their left labels.
7. **Filter pills inconsistent radius** — "Status Queue" pill radius ≫ "Hardware Analytics" pill.

### Work Intake
8. **Toolbar button heights** — "Table"/"Grid Cards" (36px) taller than "Scan Barcode / QR" (32px) in one row.
9. **Card gutter unequal** — gap between "All Active Tickets" and "Intake (Receive)" wider than subsequent gaps.
10. **Table header misalignment** — "Ticket # & Date" header text does not align with ticket icon column below.

### POS
11. **Line-item vertical rhythm** — Qty / Unit Price values float above the item label baseline; "MMK" suffix alignment inconsistent across rows.
12. **Card bottom padding varies** — left ticket cards vs right details card.

### Finance
13. **Type-scale clash** — 10–12px "Gross" label inside green pill vs 24–28px currency value; no intermediate step.
14. **"Record Expense"** spacing to tab row below is excessive vs internal card spacing.
15. **Commission column** right-aligned values with inconsistent MMK suffix baseline.

## 4. 🟡 Accessibility / quality notes (micro)
- **12px base font** dominates every view (Dashboard: 184 elements @12px; Pipeline: 100% @12px) — below comfortable reading size; labels/data 12px is the floor from the earlier font audit, but **body/data should be ≥13–14px**; 12px only for meta.
- Button heights 32px in several views — below the 40px touch/click floor for pointer targets.
- Focus rings: not visually verified on all controls (spot-check needed).
- Pipeline renders everything at a single 12px size → no hierarchy at all.

## 5. Recommended token set (one-line fixes)
- **Buttons:** sm 32 / md 36 / lg 44 (or 36/40/48) — ONE set app-wide; primary = md 40 in all views.
- **Type:** 12 meta · 13–14 body · 16 section · 18 card title · 20–24 page title · 30 hero (Dashboard already uses 30) — enforce via tokens.
- **Spacing:** card padding 16 (compact) / 20 (default) / 24 (hero) — pick max 2 values app-wide; gutter 16 grid, 24 between cards.
- **Radius:** 12 (inputs/buttons) / 16 (cards) — only.
- Sidebar badges: single size token.

## 6. Priority
- **P0:** shared tokens for button height + font scale (kills 80% of the inconsistency in one commit — convert to CSS variables).
- **P1:** topbar icon centering, toolbar height uniformity, card padding normalization, badge token.
- **P2:** baseline alignment passes (POS lines, table headers), gap rhythm (dashboard badge, finance spacing).

*Analysis only — no code changed.*

## Fix status (applied live 2026-08-06)
- **P0 ✅ (commit 972c45b):** font floor 10/11px→12px app-wide (62 files, 909 spots); tokens documented in @theme. Dashboard buttons 32/39/40/41→32/38/40; no <12px text anywhere.
- **P1 ✅ (this commit):** Work Intake toolbar toggle buttons py-2→h-9 (Table/Grid/Scan all 36px — verified live); sidebar badges unified text-xs 12px (was 9/8px mixed; all 23px tall now); topbar Reset Draft py-1.5→h-10 (40px, matches Search/Save).
- **P1b ✅ (this commit):** Dashboard tab pills `py-2 min-h-10` → `h-10` fixed — all 7+ pills exactly 40px (was 38/40 mixed); POS compact cards p-3(12px)→p-4(16px) — POS now 16/20px only (was 12/16/20). p-8/p-12 reviewed: all are standalone cards or empty states (intentional, kept).
- P1 complete. Remaining: P2 (baseline alignment — POS line items/table headers, gap rhythm — dashboard badge spacing, finance spacing).
