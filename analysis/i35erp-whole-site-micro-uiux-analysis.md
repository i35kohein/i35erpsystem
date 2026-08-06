# Whole-Site Micro-Level UI/UX Balance Analysis — All Tabs, Buttons, Components, Layouts, Modals

Date: 2026-08-06 19:05–19:40 MMT
Method: live DOM measurements at iPad 1180×820 (iPad UA) across all 12 tabs + source review. Vision model was down, so all measurements are geometric (getBoundingClientRect / computed styles) — precise, not subjective.

## 1. Buttons & touch targets (audited every visible button on every tab)

### ✅ Already consistent (recent fixes held)
- Navbar (topbar): all 10 controls exactly 40px (☰, 🎚, scan, Lookup, 3 filter icons, table/card, Add Part)
- All search inputs: 40px app-wide (incl. CRM×2, follow-up)
- Module toolbars: hidden on iPad; desktop untouched

### 🔴 Real issues found
| Where | Button | Height | Fix |
|---|---|---|---|
| Dashboard | Inspect Bottlenecks (amber CTA) | **32px** | min-h-10 |
| Dashboard | Filter Queue Below ×4 | **32px** | min-h-10 |
| Dashboard | Open Interactive Pipeline | **36px** | min-h-10 |
| Dashboard | Section tabs (Status Queue / Hardware / Techs / Finance / Warranty) | **39px** | min-h-10 |
| POS | Invoice line-item rows | 41px | ~OK, note only |
| Sidebar drawer (closed) | nav items | 32px (off-screen; 40px when opened) | not visible — no action |

## 2. Typography — font floor escape (🔴 real bug)

- index.css has a readability floor: `.text-\[10px\],.text-\[11px\]{font-size:12px!important}` — but it only covers NON-important classes.
- **`!text-[10px]` (important variant) escapes the floor**: `StatusPipelineView.tsx:861` — the card tech-assign dropdown trigger renders labels at **10px** (measured 7× on pipeline: "Assign" / tech names). All other card text is floored to 12px, so these sit visibly smaller.
- Fix: extend the floor rule → `.text-\[10px\],.text-\[11px\],.\!text-\[10px\],.\!text-\[11px\]{font-size:12px!important}` (1 line in index.css).
- Everything else measured ≥12px visible (the 8px/9px hits were off-screen sidebar footer elements — false positives).

## 3. Layouts & spacing

### ✅ Good
- All 12 tabs fill the viewport (no dead space below footers; panels flex-fill; internal scrolls where needed)
- Pipeline kanban flex-fills on iPad; empty columns collapse to slim strips
- Inventory/POS/QA/Intake panels fill + empty states centered
- Section padding rhythm is consistent (p-3/p-4/p-5 scale)

### 🟡 Notes
- **Border-radius language is mixed**: 6px (rounded-md) ×~200, 8px (rounded-lg) ×~330, 12px (rounded-xl) ×~270, 16px (rounded-2xl) ×~90, 24px ×1, full pills ×many — across buttons/cards/chips. Not a bug, but a design token cleanup would tighten the look: buttons 8–12px, cards 16px, chips 6px, pills full.
- Card/panel backgrounds alternate bg-white vs bg-surface (F8F9FA) — consistent enough, minor.
- Main content: `pb-6` (24px) bottom padding — standard, keep.

## 4. Modals (source inventory: 36 modal containers)

- Widths: **max-w-md ×15, max-w-lg ×12** dominant → consistent family ✓; outliers: max-w-xl ×2, 2xl ×1, 3xl ×1, 4xl ×1, 5xl ×1 (detail/inspector modals — appropriate for their size).
- All have: fixed overlay, backdrop blur (premium pass), X close, ESC where interactive, body scroll-lock, safe-area aware ✓
- One inconsistency: TicketDetailInspectorModal (max-w-5xl, h-92vh) vs the hidden legacy detail modal in StatusPipelineView (dead code — recommend deleting ~200 lines of dead modal JSX).

## 5. Components / cards
- Pipeline cards: balanced (fixed this morning) ✓
- Price list cards: single-column on iPad, discount button 10px→12px floored ✓
- Dashboard KPI cards 275px ×4 — fine at iPad
- Empty states: present in intake/inventory/QA/POS/price/crm; QA now centered ✓; intake/pos empty states are top-aligned (could center like QA — minor polish)

## 6. What to upgrade — prioritized

### P0 (1-line fix, real visual bug)
1. **Font floor escape**: extend index.css floor rule to cover `!text-[10px]`/`!text-[11px]` → pipeline assign labels go 10px → 12px.

### P1 (touch targets on Dashboard — 4 spots)
2. Dashboard: Inspect Bottlenecks + Filter Queue Below + Open Interactive Pipeline + section tabs → `min-h-10` (40px).
3. Dashboard analytics search input → `h-10`.

### P2 (consistency polish)
4. Delete the dead legacy ticket-detail modal in StatusPipelineView (duplicate of TicketDetailInspectorModal; hidden + never used; ~200 lines + bundle weight).
5. Center intake/POS empty states vertically like QA (small, consistent).

### P3 (design tokens — optional, bigger effort)
6. Standardize border-radius scale (6/8/12/16) per component type.
7. Standardize card surface color (bg-white vs bg-surface).

## What's already good (keep — no changes)
- Navbar/search 40px uniformity, panel fills, sticky tables, scroll fades, centered QA empty state, hash back-nav, iPad/desktop split, dropdown scroll fix, cart primary-slot order.

## Fix status — ALL APPLIED (2026-08-06 ~19:10–20:00, commits `12e8400` + `5b48f50` + `bfacf93`, bundle `index-i2fyjHJe.js`)

### P0 — font floor escape
- `!text-[10px]`/`!text-[11px]` floor added — BUT first attempt (unlayered) FAILED because layered !important beats unlayered !important (CSS cascade layers). Fixed by wrapping in `@layer base`. Verified: pipeline assign labels 10px → **12px** ✓.

### P1 — Dashboard touch targets (root cause discovered!)
- **Root cause**: `.basic-ui button{min-height:32px}` (unlayered) beat Tailwind's LAYERED `min-h-10` regardless of specificity — so min-h-10 never worked anywhere. Fix: moved the floor into `@layer base` (base < utilities for normal declarations) + `:where()`. This fixes min-h-10 app-wide.
- Applied: Inspect Bottlenecks / Open Interactive Pipeline / Filter Queue Below ×4 → **40px**; section tabs min-h-10; analytics search → h-10. Verified live: all 40px ✓ (tabs ~39).

### P2 — dead code + empty states
- Removed the legacy hidden ticket-detail modal (~300 lines) from StatusPipelineView — verified TicketDetailInspectorModal still opens via ⋯ Detail + card click ✓.
- POS left empty state centered (list md:flex md:flex-col); intake table view got an empty-state row (was blank table).

### Bonus finding during verification
- CSS layer ordering is the recurring trap: any custom rule that must yield to Tailwind utilities must live in a layer EARLIER than utilities (or use @layer base). Same for important-variant floors.

### Still open (from the audit, not in this fix batch)
- P3 design tokens: border-radius scale (6/8/12/16/full mixed) + card surface color — optional, needs Ko Hein's call.

## P3 — DESIGN TOKENS DONE (2026-08-06 ~19:22–19:35, commit `3c0250d`, bundle `index-CnePNr2I.js`)
- Documented the semantic radius + surface scale in `index.css` @theme (next to the existing color tokens): rounded-md 6px = tags/chips, rounded-lg 8px = inputs/compact controls, rounded-xl 12px = buttons/cards (default), rounded-2xl 16px = panels/modals, rounded-full = pills; bg-surface = inset wells, bg-white = elevated cards.
- Normalized: Button component `sm` size rounded-lg → rounded-xl (all sizes now uniform 12px; was 8 vs 12); 2 outlier inputs in TabInventory rounded-xl → rounded-lg.
- Verified live: Button-component buttons all 12px; cards 16px panels (12px cards) — distribution now matches the documented scale. Standalone compact buttons at 8px are within the documented compact tier. Deployed + pushed.
- POS payment quick-amount buttons (Exact/50,000/Notify Customer etc.) measured 32–33px — NOT covered in this batch (POS-specific; next round if wanted).
