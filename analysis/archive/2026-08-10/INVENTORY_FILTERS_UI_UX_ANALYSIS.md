# Inventory Filters — UI/UX Analysis

**Date:** 2026-08-09 · **Score:** 7.8 / 10 (was 6.5 before fixes)
**Scope:** `App.tsx` (RightFilterDrawer + renderMobileFilters) + `InventoryManagementModule.tsx` (filter pipeline, table-header popover, Quality column dropdown)

---

## How filtering works today

| Surface | Where | Filters available |
|---|---|---|
| Mobile (<sm) | ⚙ drawer (right, navbar) | Model, Category, Quality, **Low Stock Only**, View, Edit, Actions(Print Tags) |
| Desktop stock table | ⚙ popover in "Part Name & SKU" header | Model, Category, Low-stock checkbox |
| Desktop stock table | Quality column header dropdown | Quality Tier |
| All sizes | Profit view "Low Stock Warning" card | Low-stock toggle (Audit) |

- Filter chain: App state (`modelFilter`/`categoryFilter`/`stockFilter` + now `inventoryLowStockOnly`) → controlled props → module `filteredParts` memo → paginated list.
- Model options are computed from **parts that actually have stock rows** (`inventoryDeviceModels`) — no empty/ghost models.
- Model/Category option lists carry live badge counts (memoized once per data change).
- Filter icon gets a brand dot + ⚙ badge when any filter is active; Reset All clears everything.

---

## Issues found & fixed (this round)

### P1-1 — Duplicate Model/Category/Quality selects in mobile drawer ✅ FIXED
The inventory drawer rendered **two complete sets** of Model/Category/Quality selects (a leftover merge from the earlier ☰ side-drawer work) — "All Models/All Categories/All Tiers" appeared twice. Confusing, wasted 3 rows of tap-space.
**Fix:** removed the second block (Device Model/Category/Quality Tier); kept Actions (Print Tags) + View + Edit.

### P1-2 — Dead "Date" filter in the inventory drawer ✅ FIXED
`renderMobileFilters` included `inventory` in the shared Date-filter block, but `filteredParts` never looks at `dateFilter` — the control did nothing. Worse, `getActiveFilterCount('inventory')` counted it, so the ⚙ badge could show "1" with zero visible effect.
**Fix:** excluded `inventory` from the Date block; removed `+ d` from the inventory count.

### P2-1 — Low-stock filter unreachable from the mobile drawer ✅ FIXED
`showLowStockOnly` was module-local — only reachable via desktop table popover or the Profit-view Audit card. Phones (stock view = cards) had no way to filter low stock from the drawer.
**Fix:** lifted to App state (`inventoryLowStockOnly`), controlled prop `showLowStockOnly`/`onSetLowStockOnly` into the module (local fallback preserved), added a "Stock Level → Low Stock Only" row to the drawer (same row-style as Bottlenecks toggles), wired module Reset + Audit card + table-popover checkbox through the same controlled setter. Badge count includes it.

### P2-2 — Drawer Reset didn't clear low-stock ✅ FIXED (part of the lift)

---

## What works well (keep)
- Single source of truth: all surfaces drive the same `filteredParts` memo.
- Sort + filter share one pipeline; page resets to 1 on any change.
- Badge counts on options; active-filter dot on the table icon.
- Drawer shows active-filter chips + Reset All (disabled when nothing active).

## Remaining P3 (optional, left for Ko Hein)
- Model/Category badge counts not shown inside the drawer selects (desktop popover only shows plain labels too) — nice-to-have.
- Search is desktop-only by request (mobile scan removed 19:13) — if Ko Hein wants mobile search back, the drawer could host it.
- `showLowStockOnly` label in the Profit Audit card says "Tap to Filter" — fine as-is.
- Quality options list is static (Original/A+…); could derive from live data like models do.

## Verified
- tsc clean; mobile 430px drawer: labels = Model, Category, Quality, Stock Level, View, Edit, Actions — no duplicates, no Date.
- Toggling Low Stock Only → ⚙ badge "1", list drops to low-stock items only; Reset clears.
