# Parts Inventory & Stock Matrix — Mobile UI/UX Analysis (i35 ERP)

> Module: `src/components/inventory/InventoryManagementModule.tsx` (3,123 lines)
> Views: **Stock** (table/cards) · **Profit** (table) · **Matrix** (sticky grid)
> Focus: ≤640px phones

---

## 1. What Already Works on Mobile ✅
- Auto-switch: `window.innerWidth < 768 → setStockView('cards')` — phones land in the card grid, not the cramped table.
- Card grid is well designed: stock bar, OUT/REORDER badges, quality badge, bin, price, supplier.
- Toolbar labels use `hidden sm:inline` (Print Tags, Edit, Matrix) — icon-only on phones.
- Stock/Profit tables hide non-essential columns below `md`/`lg`.
- Matrix view has a sticky first column + horizontal scroll (correct pattern for wide grids).

---

## 2. Issues Found (mobile)

### 2.1 Toolbar overload — the biggest problem
The top toolbar packs **everything** into `flex-wrap` rows:
- Stock / Profit / Matrix switcher
- 3 filter pills (Model `min-w-[130px]`, Category `min-w-[130px]`, Tier `min-w-[120px]`)
- Print Tags, Edit, Save buttons

On a 360px phone this stacks into **4–6 rows** of controls before the content even starts. The filters are the tallest offenders — each pill is a 32px `h-8` control with a 20px icon box + 130px dropdown.

### 2.2 Touch targets below 44px everywhere
| Control | Size |
|---|---|
| Table/card view toggle buttons | `h-7 w-7` (28px) |
| Part detail button (cards + tables) | `h-7` / `h-8` (28–32px) |
| Modal stock stepper − / + | `h-7 w-7` (28px) |
| Toolbar pills, dropdowns, scan Lookup | `h-8` (32px) |
| Matrix cells | `p-1.5` (~30px tap area) |

All below the 44px minimum — hard to hit on a phone.

### 2.3 Inline Edit forces the table on phones
`stockView === 'cards' && !inlineEditMode` — tapping **Edit** on a phone silently switches to the dense desktop table with inline number inputs. Mobile stock updates become a horizontal-scroll + tiny-input experience. The card grid has no edit path at all.

### 2.4 Low-stock alert only exists in the Profit view
The "Low Stock Reorders" summary card lives inside `viewMode === 'profit'`. The default Stock view has no low-stock summary or quick filter — a technician on a phone must switch views to audit stock. (Dashboard has one, but the module itself should too.)

### 2.5 Card grid is single-column even on large phones
`grid-cols-1 gap-3` — a 430px phone shows one tall card per row. Two per row would halve scrolling.

### 2.6 Scan bar mixed responsibilities
The barcode scan bar also holds the table/card toggle (`ml-auto`) — on small screens the toggle jumps around depending on input width. Scan input `basis-[160px]` + Lookup + toggle wraps awkwardly on 320px screens.

### 2.7 Matrix has no mobile affordance
`min-w-max` table scrolls horizontally with no scroll hint / no drag affordance; header title "Apple Device Model × Component Stock Matrix" is long and unwrapped on phones; print button hides its label (fine) but the title still crowds.

### 2.8 Profit view row buttons
Detail button `h-7 w-7` + profit numbers `whitespace-nowrap` — on 320px, Part column gets squeezed to a sliver.

---

## 3. Upgrade Recommendations (mobile-first)

### 3.1 Collapse the toolbar (P0)
- Keep visible on phones: **view switcher** + **one primary action** (Add Part / Edit).
- Move Model / Category / Tier filters into a **horizontal scrollable chip row** (`overflow-x-auto no-scrollbar`) below the toolbar, or into a collapsible "Filters" disclosure.
- Move Print Tags / secondary actions into a **"⋯" overflow menu** on mobile.
- Reduce dropdown `min-w` on phones: `min-w-[130px]` → `min-w-0 flex-1` inside a full-width row, so filters become full-width stacked controls instead of floating pills.

### 3.2 Enforce touch targets (P0)
Bump all `h-7`/`h-8` icon buttons to `h-10 w-10 lg:h-8 lg:w-8` (40–44px on mobile). Specifically:
- Card/table toggle, part detail buttons, modal steppers, matrix cells (`p-1.5` → `p-2`).

### 3.3 Mobile-friendly edit path (P1)
- Add a **stepper (− / +) directly in each card** when edit mode is on (reuse the modal stepper logic), instead of switching to the table.
- Or: detect narrow width and show a toast "Editing is best done on desktop" while keeping the table path.

### 3.4 Surface low-stock everywhere (P1)
- Move the Low Stock summary card **above the view switcher** (visible in Stock + Profit), or add a compact low-stock chip to the Stock view toolbar.

### 3.5 Card grid density (P2)
- `grid-cols-1` → `grid-cols-1 sm:grid-cols-2 xl:grid-cols-3` so large phones get 2-up.
- Trim card footer (supplier truncation at 45% is fine; keep).

### 3.6 Scan bar (P2)
- Fixed-height row, no wrap: input `flex-1 min-w-0` + Lookup + toggle in a single non-wrapping row; allow horizontal squeeze of the input instead of wrapping.

### 3.7 Matrix view (P2)
- Add `overscroll-x-contain` + a one-time "← swipe →" hint; shorten title on mobile (`hidden sm:inline` full / `Matrix` short).
- Keep sticky column; add a subtle right-edge fade to signal more columns.

### 3.8 Profit view (P2)
- Show margin % on mobile too (swap hidden Margin column for an inline badge under Profit/Unit) — profit is the whole point of the view.

---

## 4. Priority Order
1. **P0 — Toolbar collapse** (biggest visible win on phones)
2. **P0 — Touch targets ≥40px** (icons, steppers, matrix cells)
3. **P1 — Card edit steppers + low-stock summary in Stock view**
4. **P2 — Density, scan bar, matrix affordance, profit margin badge**
