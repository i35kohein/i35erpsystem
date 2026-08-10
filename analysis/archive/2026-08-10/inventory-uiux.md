# Parts Inventory & Stock Matrix — UI/UX Analysis & Improvement Plan

> Module: `InventoryManagementModule.tsx` (~3,300 lines)
> Views: **Stock** (table/cards) · **Profit** (table) · **Matrix** (sticky grid)
> Status: reflects the 2026-08-05 mobile pass (toolbar one-line, popup-modals on mobile, dropdowns on desktop, stepper card edit, low-stock banner)

---

## 1. Current Structure

```
Toolbar (one line on lg+; stacked on mobile)
├─ Title (Parts Inventory)
├─ View switcher: Stock | Profit | Matrix   (full-width segmented on mobile)
├─ Filters: All Models · All Categories · All Tiers
│    ├─ mobile: one-line pills → centered POPUP MODAL
│    └─ desktop: DROPDOWN menus
└─ Actions: Print Tags · Edit/Done · Save
Barcode scan bar: [scan icon] [SKU input] [Lookup] [table/card toggle]
Low-stock amber banner (Stock view only, tap to filter)
List: table (md+) / card grid (<md) · card edit steppers in Edit mode
Profit table · Matrix grid (sticky first column, horizontal scroll)
```

## 2. What Already Works ✅
- **One-line toolbar on desktop** — switcher + filters + actions all on one row.
- **Mobile filters as one-line pills** → popup modal (no more dropdown clipping/overflow; modal is portal-rendered, ESC/backdrop/X close, counts shown).
- **View switcher full-width segmented** on mobile (equal thirds), labels visible.
- **Card grid <768px** auto-switch — phones never see the cramped table.
- **Card edit steppers (−/+) in Edit mode** — stock adjustments on phones without touching the table.
- **Low-stock banner** in Stock view (tap to filter) — no longer hidden in Profit.
- Scan bar: no-wrap, Lookup + view toggle stay reachable.
- Profit view shows margin on mobile (inline badge).
- Matrix: sticky model column + horizontal scroll + `overscroll-x-contain`.
- Touch targets ≥40px on icon buttons; Matrix cells tappable → drills into filtered stock view.

## 3. Issues & Friction

### Mobile
| # | Issue | Why it hurts |
|---|---|---|
| M1 | **No in-module search on phones** — search lives in the topbar (narrow w-36) | Finding a part by name/SKU means scrolling or tiny topbar search |
| M2 | **Filter pill labels truncate** ("All Models" → shorter when a long model is selected) | Selected value invisible until opening the modal |
| M3 | **Print Tags / Edit are icon-only** on phones (`hidden sm:inline`) | Unclear at a glance; Edit has no text hint |
| M4 | **Table only for md+; inline-edit (price/supplier) is desktop-only** | Stock editing works on cards, but price edits can't be done on a phone |
| M5 | Long part lists have **no pagination/virtualization** | Hundreds of SKUs → long scroll, sluggish with inline edits |

### Desktop
| # | Issue | Why it hurts |
|---|---|---|
| D1 | **No column sorting** on Stock/Profit tables (click name → sort) | Finding extremes (highest stock, best margin) requires eyeballing |
| D2 | **No bulk selection/actions** (checkbox rows → batch set reorder point / export) | 400+ SKUs maintained one-by-one |
| D3 | Profit table lacks a **"profitability" emphasis** (margin color scale) | Low-margin parts don't stand out |
| D4 | Toolbar title hidden in `basic-ui` mode (`.module-subheader{display:none}`) | Intentional compact mode, but surprising when editing |
| D5 | Matrix cells show **quantities but not values** (no tooltip with cost/retail) | Can't triage value at a glance |

### Both
| # | Issue |
|---|---|
| B1 | **No low-stock drill-down from toolbar** — banner only appears in Stock view |
| B2 | No **barcode label print flow** from the cards view (Print Tags opens A4 modal only) |
| B3 | Add Part / Supplier / Tier / Bin management lives inside **Settings → Inventory** — buried |
| B4 | No **toast feedback** on stock +/- steppers (silent change) |
| B5 | i18n: labels are English hardcoded (module has no `t()` usage) |

## 4. Improvement Plan (prioritized)

### P0 — Mobile search + value visibility
1. **In-module search on mobile**: full-width input above the card grid (mirror Price List pattern) — reuse `searchQuery` state; hide the topbar search on this tab below lg.
2. **Filter pill**: show icon + truncated label + chevron (current), and make the modal title show the **current selection count** ("44 models") for context.

### P1 — Desktop productivity
3. **Column sorting** (name/SKU, stock, price, margin) — clickable `<th>` with asc/desc chevrons; keep filters working.
4. **Row checkboxes + bulk bar**: appears when ≥1 selected → actions: Export CSV, Set Reorder Point, Delete (Admin only).
5. **Margin heat coloring** in Profit table (green→amber→red by margin band) + sortable.

### P1 — Mobile editing completeness
6. **Card price edit**: in Edit mode, tapping the price opens a small inline editor (or numeric modal) so phones can update selling price too — not just stock.
7. **Edit button label on mobile**: show "Edit" text under/next to icon (or a tooltip on long-press).

### P2 — Scan & matrix polish
8. Scan bar: on phones allow the input to be the full row (icon + input), move Lookup **into** the keyboard (form submit) and keep the toggle floating — reduces clutter.
9. Matrix cells: add a **value tooltip** (cost/retail per cell) and a column-group summary row (total cost/retail per category).
10. **Pagination** (e.g., 50/page) or windowed rendering for the stock table with inline edits.

### P2 — Trust & consistency
11. **Toasts** on stock steppers ("iPhone 11 screen → 12 units").
12. Move Add-Part quick access into the module toolbar (not only Settings) — "+ Add Part" button on lg.
13. i18n pass with `t()` / dictionary entries.

## 5. Suggested Target Layout (mobile, 390px)

```
[Parts Inventory]                     ← title (or topbar title)
[ Stock | Profit | Matrix ]           ← full-width segmented
[All Models ▾] [All Categories ▾] [All Tiers ▾]   ← one-line pills → modal
[🔍 Search parts…          ]          ← in-module search (P0)
[ Barcode scan: ______ Lookup ]       ← scan bar (compact)
(low-stock banner if any)
[ Card ] [ Card ]  /  2-col on sm+
```
Desktop (lg+): one-line toolbar (already done) + sortable tables + bulk bar + margin heat map.

## 6. Priority Summary
1. **P0**: in-module mobile search · filter modal context
2. **P1**: column sorting · bulk actions · margin heat map · card price editing · Edit label on phones
3. **P2**: scan-bar keyboard flow · matrix tooltips/summary · pagination · toasts · quick Add Part · i18n
