Audit complete. All four modules read in full (6,851 lines), invalid Tailwind classes verified by compiling the project's own Tailwind v4 engine, and cross-module state wiring (App.tsx, types) checked.

# i35 ERP Bug Audit — v1.1 (inventory / finance / suppliers / prices)

## src/components/inventory/InventoryManagementModule.tsx

- [P2][theme] Invalid double-opacity classes generate NO CSS (verified via Tailwind v4 compile) → tinted backgrounds silently missing. `bg-warning/10 hover:bg-warning/15/80` :1254, `bg-warning/25/80` :1270 & :1387, `bg-warning/10/80` :2660. Fix: single modifier (`bg-warning/10`, `hover:bg-warning/15`).
- [P2][theme] Profit heat map uses raw palette `bg-lime-100 text-lime-800` :1863 & :1924 — bypasses tokens, stays light in dark-slate. Fix: `bg-success/15 text-success-deep` (or a token shade) for the 20–39% band.
- [P2][theme] `bg-ink … text-white` :3325 (Print Selected) & :3401 (quality badge) — in dark-slate `--color-ink` inverts to #F8FAFC → white-on-white, unreadable. Fix: `bg-brand` or `bg-faint` with `text-white`.
- [P2][theme] Hardcoded "MMK" everywhere (e.g. :750, :1230–1241, :1718, :1931, :2258) — module receives `systemSettings` but never reads `currencySymbol` (0 refs). Fix: `const currency = systemSettings?.currencySymbol || 'MMK'` like the finance module.
- [P2][workflow] Barcode scan clears `scanQuery` but not `searchQuery` (:404) — after scanning, the list stays filtered to the scanned SKU even after the detail modal opens (both are set together in onChange :1308). Fix: also `setSearchQuery('')` in `handleScanSubmit`.
- [P2][workflow] "Select all visible" checkbox (:345, header :~1638) selects/checks ALL filtered parts across every 50-row page, not just the visible page — user on page 3 hits select-all and silently selects hundreds off-screen. Fix: scope to `tablePageParts` or relabel.
- [P2][ui] "Print Selected" adds `.print-selected-only` to the sheet but never removes it (~:3290) — a second `window.print()` in the same open sheet prints selected-only even via "Print All". Fix: remove class after print.
- [P2][workflow] Metrics valuation `p.costPrice * p.quantityInStock` :750 unguarded — legacy parts with undefined costPrice/quantityInStock → NaN cascades through all summary cards (matrix code guards with `|| 0`, metrics don't). Fix: `Number(p.costPrice || 0)`.
- [P2][ui] Warranty modal binds BOTH a `<select>` and a free-text `<Input>` to the same `warrantyForm.reason` (:2720–2734) — typing a custom reason leaves the select showing option #1 while the text shows the custom string. Fix: keep the select read-only value from text, or replace select with chips.

## src/components/finance/ShopFinancePlModule.tsx

- [P1][workflow] OpEx is NOT date-filtered: `totalOpEx = expenses.reduce(...)` :188 sums all-time expenses while revenue/COGS are period-filtered → Net Profit for TODAY/THIS_WEEK/THIS_MONTH is wrong (subtracts months of rent from one day's profit); the OpEx tab list is also unfiltered. Fix: filter `expenses` by the same `dateFilter` window.
- [P2][workflow] TODAY filter uses UTC: `new Date().toISOString().split('T')[0]` :95 vs local Myanmar time (+6:30) — tickets created 00:00–06:30 MMT are bucketed under yesterday (createdAt is UTC ISO). THIS_MONTH :103 uses local month — inconsistent clocks. Fix: compare local date strings.
- [P2][workflow] THIS_WEEK `diffDays <= 7` :102 includes future-dated tickets (negative diff) and is a rolling window, not the week label implies. Fix: clamp `diffDays >= 0`.
- [P2][workflow] Payment-method breakdown :166–176 lumps `'Split Payment'` and `'Net 30'` into the "KBZPay/WavePay/Banking" mobileBanking bucket — mislabeled cash reconciliation. Fix: explicit buckets or "Other".
- [P2][theme] Dead double-opacity classes: `bg-warning/10/80` :504, `bg-purple/10/80` :526 → Cash Drawer / Card POS rows render without their tint. Fix: single opacity.
- [P2][theme] `bg-rose-200/80` overdue badge :573 — raw palette, stays bright pink in dark-slate. Fix: `bg-danger/15 text-danger`.
- [P2][workflow] Supplier payment modal doesn't clamp payment to remaining balance (`handleConfirmSupplierPayment` ~:287) — overpayments create negative balances. Fix: validate `paymentAmountInput <= balance`.

## src/components/suppliers/SupplierRmaModule.tsx

- [P1][workflow] New-RMA form has no quantity/unit-cost fields and `unitCost` defaults to hardcoded `98.00` (:124); `handleCreateRma` uses `Number(newRmaData.unitCost) || part.costPrice` (:~137) → 98 always wins. "Approve Credit" then credits `unitCost × quantity` = 98 MMK for ANY part regardless of actual cost. Fix: default unitCost from the selected part's costPrice (as inventory's warranty flow does) or add editable fields.
- [P2][workflow] `rmaNumber: \`RMA-2026-…\`` :139 hardcoded year — will mislabel forever; inventory module correctly uses `getFullYear()`. Fix: `new Date().getFullYear()`.
- [P2][theme] Hardcoded "MMK" :315, :375, :422, :429, :541 (0 `currencySymbol` refs) — same as inventory; route through a currency prop/token.
- [P2][ui] RMA card action logic `rma.vendorCreditAmount ? credit : status==='Shipped…' ? Approve : null` :~316 — a Credit Approved RMA with 0 credit renders neither credit line nor button (blank row). Fix: key off status.

## src/components/prices/PriceCatalogModule.tsx

- [P1][workflow] Cart is never cleared/resynced when `selectedDevice` changes (:1159, :1198 set device; `setCart` only in toggle/clear/discount :333–369). Add iPhone 15 Battery, switch to iPhone 11 → cart totals iPhone 15 prices while the header shows iPhone 11 → wrong quotes and wrong "Create Intake Ticket" totals. Fix: clear cart (or re-price entries) on device change.
- [P2][workflow] If the selected model disappears from the catalog (import/reset), `activeDeviceData` silently falls back to `catalog[0]` :270 while the UI keeps displaying the stale model name (:822/:875) — user quotes catalog[0]'s prices under a dead model name. Fix: sync `selectedDevice` to `activeDeviceData.model`.
- [P2][workflow] CSV export :434–437 uses the static `REPAIR_CATEGORIES` constants, ignoring the `categories` prop — settings renames (custom labels) not reflected in exported headers. Fix: use the `categories` prop.
- [P2][theme] QuickPriceCalculatorModal.tsx:597 hardcoded `0 MMK` — `currencySymbol` prop exists but unused. Fix: `0 {currencySymbol}`.

**Verified non-bugs (checked, no issue):** iPad scan handler closure re-registers every render (App passes inline fn) — no stale closure; table pagination resets correctly and clamps via `tablePageSafe`; matrix merge/rowSpan logic correct; `bg-slate-900/50` scrims and `bg-white` card elevation are intentional per index.css design comments; `bg-brand/[0.03]` arbitrary value compiles.