# Area A — POS / Finance / Pricing Micro-Level Bug Audit

**Date:** 2026-08-11 · **Branch:** v1.1 (i35erp-stable-v1) · **Mode:** read-only (no files modified, no builds run)
**Scope:** 10 files (9,773 lines). All money math, persistence paths, state races, edge cases verified against surrounding code (types, App.tsx write handlers, SimpleTicketCreator prefill consumer, lib/supabase semantics).

**Business rules used as the contract:**
1. Parts cost + labor are BUNDLED. Customer pays `totalAmount` = labor lines only (after per-item discounts). Part lines (`isLabor:false`, `partId`) are internal tracking (stock consumption + profit), NOT extra charges.
2. Gross Profit = Amount Due (Customer) − Parts Cost. Net Profit = Gross Profit − Tech Commission. Commission base = labor revenue after per-item discounts × tech rate.
3. Discount format: `unitPrice` = ORIGINAL price + `lineItemDiscountPercent`; `discountAmount` = invoice-level only, normally 0. Legacy tickets may have `unitPrice`=final + duplicate `discountAmount` (POS has a self-heal path).
4. Money is MMK integer kyat.

**Count: 31 findings (3 P1 · 15 P2 · 13 P3)**

---

## P1 FINDINGS

### [P1-1] Invoice-level discount is silently ignored on any ticket that has no per-item line discount
- **File:** src/components/pos/PosInvoicingModule.tsx:406-422 (recalculateTotals), 667-675 (handleUpdateInvoiceDiscount)
- **Issue:** The invoice-level discount is only applied when *some* labor line already carries `lineItemDiscountPercent`:
```ts
const hasPerItemDiscount = laborItems.some((li) => Boolean(li.lineItemDiscountPercent));
const effectiveDiscount = hasPerItemDiscount ? discountAmount : 0;
```
The "Invoice Discount" input (line ~1205-1235) is always rendered and editable, and `handleUpdateInvoiceDiscount` stores `discountAmount` and recomputes — but on a fresh ticket created with no per-item discounts (the common case: Simple Ticket with no discounts, or custom repair lines), `effectiveDiscount = 0`, so `totalAmount` never decreases. The summary still *displays* the discount row/input with the entered amount.
- **Impact:** Staff applies a 10,000 MMK invoice discount → ticket shows "Invoice Discount 10,000" but the customer is charged the full amount. Wrong money collected; printed invoice shows a discount that was never deducted. Conversely, on tickets that DO have per-item discounts, removing the last discounted line (or self-heal rewriting lines) silently *disables* the invoice discount again — total jumps back up while `discountAmount` field stays set. This is the highest-frequency POS money bug.
- **Fix:** Do not infer "legacy format" from the presence of per-item discounts. Track legacy explicitly (e.g. a `discountFormat: 'legacy'|'new'` flag set by self-heal), or always subtract `discountAmount` when the ticket was created in new format (flag on WO), and make `recalculateTotals` subtract `discountAmount` unconditionally for new-format tickets: `totalAmount = max(0, round(subtotal) + tax − discountAmount − deposit)`.

### [P1-2] POS legacy self-heal persists `totalAmount` that includes part selling prices and drops tax
- **File:** src/components/pos/PosInvoicingModule.tsx:425-495 (self-heal useEffect)
- **Issue:** In the heal loop, part line values are added into `finalSum` even though parts are internal (never charged):
```ts
finalSum += (Number(li.unitPrice) || 0) * qty; // parts tracked, not charged
```
then `totalAmount: Math.round(finalSum)` (line 488). For any legacy ticket that has part lines (all tickets that consumed stock), `totalAmount` is inflated by the parts' selling price. The same write leaves `taxAmount` untouched (stale legacy value) and computes `totalAmount` without tax, unlike every other code path (`round(subtotal) + tax − discount − deposit`). The `subtotal` written is the pre-discount labor sum (line 486), so the stored object is internally inconsistent: `subtotal − per-item discounts + taxAmount ≠ totalAmount`.
- **Impact:** A legacy WO with a 150,000 MMK battery part line heals to `totalAmount` = labor final + 150,000 — the customer is re-billed for the bundled part. Persisted wrong money (P1). Additionally, in the "invoice discount on new-format ticket" scenario, the heal reinterprets the 10,000 invoice discount as per-item % (Format A) and rewrites `unitPrice` up by the ratio, and the total silently drops by the tax component — the Amount Due changes without any staff action.
- **Fix:** Exclude parts from `finalSum` (labor lines only), recompute `taxAmount` and `depositAmount` consistently: persist `totalAmount = Math.round(finalSum) + (tax on finalSum) − deposit`, and only run Format A when the ticket is genuinely legacy (see P1-1 flag). Add a guard so a WO that already has `discountAmount` + new-format lines is not re-healed.

### [P1-3] Finance P&L double-counts bundled parts and counts unpaid tickets as revenue
- **File:** src/components/finance/ShopFinancePlModule.tsx:140-190 (financialSummary), 155-172 (line-item loop), 175-186 (payment breakdown)
- **Issue:** `filteredWorkOrders` includes every ticket in the date window regardless of `isPaid`/status, and the P&L sums raw line items:
```ts
wo.lineItems.forEach((li) => {
  const lineTotal = li.unitPrice * li.quantity;
  if (li.isLabor) { laborIncome += lineTotal; }
  else { partsSalesIncome += lineTotal; cogsTotal += lineCost; }
});
...
const totalRevenue = laborIncome + partsSalesIncome;
const grossProfit = totalRevenue - cogsTotal;
```
Per business rules 1-2 the customer pays only the labor lines (post-discount); parts are bundled. This code (a) counts **unpaid / in-progress** tickets as income, (b) counts parts **selling price** as additional revenue even though it was never charged (double-counts the parts markup), and (c) uses **original** `unitPrice`, ignoring both per-item discounts and `discountAmount` — so labor income is overstated. Payment-method breakdown (line 175-186) does gate on `isPaid` but revenue/COGS/profit do not.
- **Impact:** Gross Revenue, Gross Profit, Net Profit, margin %, and the Revenue tab are all wrong (inflated) — e.g. a ticket with a 450,000 MMK display part bundled into a 500,000 labor charge shows ~950,000 revenue. The POS module's own profit panel (`totalAmount − partsCost`, line 1263) disagrees with this module for the same ticket. Reported shop profit can no longer be trusted for decisions.
- **Fix:** Restrict the revenue loop to `wo.isPaid` (or `paidAmount > 0`), use actual collected amount: `laborIncome += wo.totalAmount` is the simplest correct revenue per ticket (amount due = labor after discounts; parts bundled); keep parts as a separate *internal* P&L (revenue at cost or margin only) and never add part selling price into customer revenue. Deduct `discountAmount`/per-item discounts as computed in `recalculateTotals` if line-item math is kept.

---

## P2 FINDINGS

### [P2-1] `subtotal` semantics flip between intake (pre-discount) and POS (post-discount) after any edit
- **File:** src/components/pos/PosInvoicingModule.tsx:406-422 vs src/components/intake/SimpleTicketCreator.tsx:262-267 (subtotal: baseTotal, totalAmount: finalEstimate)
- **Issue:** Intake stores `subtotal = Σ basePrice` (ORIGINAL/pre-discount). POS `recalculateTotals` stores `subtotal = Math.round(Σ lineTotal − itemDiscount)` (POST-discount). Before any POS edit the summary is consistent (Subtotal − Per-item Discounts − Tax = Amount Due); after the first POS edit (add part, change qty…) `selectedWo.subtotal` becomes the post-discount figure while the "Per-item Discounts" row (line 1192-1196) still subtracts the same discounts again → the visible breakdown no longer ties: e.g. Subtotal 490,000 (net) − 9,900 discount row = 480,100 but Amount Due shows 490,000.
- **Impact:** Staff-facing math confusion on every discounted ticket after editing; the Revenue tab's Subtotal column mixes both semantics across tickets.
- **Fix:** Pick one meaning. Recommended: keep `subtotal` = pre-discount original sum everywhere (match intake + self-heal), and compute `totalAmount = subtotal − perItemDiscounts − discountAmount + tax − deposit`; POS summary then always displays the consistent chain.

### [P2-2] Self-heal Format-A fallback mutates prop-owned line-item objects directly
- **File:** src/components/pos/PosInvoicingModule.tsx:460-478
- **Issue:** For lines not matched by rep (`return li`, line 464) the original object (shared with the parent `workOrders` state array) is then mutated in place:
```ts
newLis.forEach((li) => {
  if (li.isLabor && !li.lineItemDiscountPercent) {
    li.unitPrice = Math.round((Number(li.unitPrice) || 0) * ratio);
```
- **Impact:** Direct mutation of state objects without setState; if `onSaveWorkOrder` fails (network) the mutation already happened in memory and shows on screen — UI/persisted divergence; also any other component holding that WO reference sees mutated prices.
- **Fix:** Always copy: `return { ...li }` in the non-matching branch, and rebuild `newLis` via `.map` instead of mutating `forEach`.

### [P2-3] Per-keystroke full-document saves race in POS line-item editor (and price editor)
- **File:** src/components/pos/PosInvoicingModule.tsx:579-600 (handleUpdateLineItem), src/components/prices/PriceSettingsModal.tsx:188-192 (handlePriceChange)
- **Issue:** Every `onChange` keystroke calls `onSaveWorkOrder({...})` → `saveDocument` (Supabase PATCH of the whole data column). Two rapid edits computed from the same render closure each write the *full* WO derived from a stale base — the second write can revert the first (edits to different fields in quick succession), and out-of-order PATCH completion can leave an intermediate value persisted (e.g. qty "1" while typing "15", or price "38" while typing "380000").
- **Impact:** Silently lost/incorrect persisted edits; on price catalog, clearing a field instantly nulls the price with no commit, and interrupted typing leaves a nonsense price (45 MMK) persisted.
- **Fix:** Debounce (e.g. 400-600 ms) or commit-on-blur/Enter for line-item fields; for price catalog use a local draft per cell and write on blur. Optionally add a `version`/`updatedAt` compare-and-swap in `handleSaveWorkOrder`.

### [P2-4] Diagnostic-fee-only action wipes all line items and can zero the fee on legacy tickets
- **File:** src/components/pos/PosInvoicingModule.tsx:739-762
- **Issue:** `handleApplyDiagnosticFeeOnly` replaces `lineItems` with a single diag-fee line (destroying all repair/part tracking with no confirmation), and computes:
```ts
totalAmount: Math.max(0, Math.round(diagFee * (1 + taxRate)) - (selectedWo.discountAmount || 0) - (selectedWo.depositAmount || 0)),
```
On a legacy ticket `discountAmount` is a duplicate of the discount already embedded in prices (rule 3) — e.g. 20,000 → the 5,000 fee becomes 0. `selectedRepairs` are left stale (old repairs/prices still on the WO).
- **Impact:** Free diagnostic charge on legacy tickets; permanent loss of parts/repair history on the ticket (no undo).
- **Fix:** Reset `discountAmount: 0` in the write (keep deposit subtraction if intentional), confirm before wiping existing line items, and clear/annotate `selectedRepairs`.

### [P2-5] Price-list picker selection leaks across tickets when closed via X/backdrop
- **File:** src/components/pos/PosInvoicingModule.tsx:206-211, 2255-2265, 2435-2447
- **Issue:** `posCatalogSelection` / `posCatalogDiscounts` are only cleared on the "Done" button path. Closing the modal with the X, backdrop, or switching ticket leaves the selection armed; reopening for a different ticket pre-selects the old ticket's repairs/discounts, and "Done" adds them to the new ticket.
- **Impact:** Wrong repairs (and discounts) added to the wrong customer's invoice.
- **Fix:** Clear selection/discounts/discount-menu state in the modal's close handler (X and backdrop paths).

### [P2-6] POS price-list picker offers fabricated fallback prices for unmatched devices with no warning
- **File:** src/utils/priceCatalogLookup.ts:79-97 (getFallbackPriceForCategory) + src/components/pos/PosInvoicingModule.tsx:2255-2259 (selectedCatalogItems filter `item.price > 0`)
- **Issue:** For models not in the catalog, `getModelPriceCatalogItems` synthesizes prices (battery 120,000×tier multiplier, display 380,000×tier, etc.) with `isCatalogMatch: false`. The POS picker filters only `price > 0` and never surfaces `isCatalogMatch`, so staff can add these fictional prices to a live invoice (e.g. an Android or unlisted model gets iPhone 15 Pro Max battery/display prices — line 55 fallback).
- **Impact:** Customer charged made-up amounts for unlisted models.
- **Fix:** In POS (and intake) filter `isCatalogMatch === true` for addable items, or visibly badge fallback items as "Estimate — confirm price" and require an explicit price confirmation before adding.

### [P2-7] Catalog model lookup: substring match picks the wrong sibling model (order-dependent)
- **File:** src/utils/priceCatalogLookup.ts:31-33
- **Issue:**
```ts
matched = catalogToSearch.find(
  (c) => lowerTarget.includes(c.model.toLowerCase()) || c.model.toLowerCase().includes(lowerTarget)
);
```
The first array entry that substring-matches wins, and base models precede Pro/Max/Mini in both seed data (iPhone 13 at line 945 before iPhone 13 Mini 992; iPhone 15 at 1321 before 15 Pro 1415 / 15 Pro Max 1462) and likely live Supabase order. So "iPhone 13 Mini 128GB" matches plain **iPhone 13**, "iPhone 15 Pro Max 256GB" matches **iPhone 15**, "iPhone 15 Pro (A3102)" matches **iPhone 15** — cheaper sibling prices (or wrong ones) flow into the POS picker.
- **Impact:** Wrong repair prices quoted/charged whenever the device model string has any suffix/annotation (free-text intake models).
- **Fix:** Match exact → then longest-prefix/word-boundary match (score by matched length and prefer tokens), e.g. sort candidates by `c.model.length` descending; never match a bare "iphone 15" when "iphone 15 pro max" also matches unless the target literally equals the shorter name.

### [P2-8] Float kyat leaks into cart math, quotes, and ticket prefill
- **File:** src/components/prices/PriceCatalogModule.tsx:424-427 (cartSummary), 469 (savings), 526-537 (handleCopyCustomerQuote), 544-575 (handleCreateWorkOrderFromCart)
- **Issue:** Discounts are computed unrounded: `const discount = item.price * (item.discountPercent / 100)` (line 424), `const finalP = baseP - discAmt` (line ~556), `totalDiscAmt` (564). With custom percentages (e.g. 7% of 380,000 → 26,600.000000000004) floats flow into `cartSummary.totalDue`, the copied customer quote text, and the `onOpenNewWorkOrder` prefill (`finalPrice`, `discountAmount`, `price`).
- **Impact:** Quotes can display fractional kyat ("353,400.00000000006 MMK"); the created ticket's prefill carries float discounts (SimpleTicketCreator rounds on subsequent edits, so the damage is mostly display, but the copied quote is customer-facing).
- **Fix:** `Math.round` every discount/final computation: `Math.round(price * pct / 100)`, `Math.round(baseP * (1 - pct/100))`, and round `totalDue`/`totalDiscAmt` at the end.

### [P2-9] Finance "Revenue" window buckets by ticket creation date, not payment date
- **File:** src/components/finance/ShopFinancePlModule.tsx:92-96 (filteredWorkOrders) + src/components/common/DateFilterSelector.tsx:2-40 (filterByDateRange filters on `createdAt`)
- **Issue:** The P&L date window filters on `wo.createdAt`. Tickets created last month but paid today (including POS backdated checkout support, which anchors `completedAt`) are reported in last month's revenue; the "Parts sold by day" view (line ~230) instead uses `inventoryConsumedAt` — two different windows in the same module.
- **Impact:** Period revenue/profit misattributed; cash-flow reconciliation against the daily drawer is wrong.
- **Fix:** Filter finance by `paidAt`/`completedAt` (fallback `createdAt`) consistently, or label the window "tickets created".

### [P2-10] Revenue tab lists unpaid/incomplete tickets as "Completed Repair Income Records" and derefs `subtotal`
- **File:** src/components/finance/ShopFinancePlModule.tsx:775-810
- **Issue:** The table renders `filteredWorkOrders` (all statuses, unpaid included) under the heading "Completed Repair Income Records", and `{wo.subtotal.toLocaleString()}` (line ~792) throws if a legacy row lacks `subtotal` — same crash risk at POS lines 1189/1199 for `subtotal`/`taxAmount`.
- **Impact:** Confusing/wrong income list; React render crash on malformed legacy rows takes down the whole Finance or POS view.
- **Fix:** Filter to paid tickets; guard numeric fields: `(wo.subtotal ?? 0).toLocaleString()`.

### [P2-11] `setCurrencySymbol` fallback writes a PARTIAL systemSettings document (latent clobber)
- **File:** src/hooks/usePriceCatalog.ts:54-61
- **Issue:** Without the App-provided `onUpdateGlobalCurrency` callback:
```ts
saveDocument('systemSettings', { id: 'global', currencySymbol: symbol })
```
Supabase REST PATCH replaces the whole `data` column — this write would wipe every other setting (tax, shop profile, receipt footer, payment methods). Currently dead code in production (App always passes the callback, App.tsx:366-369), but it's one wiring change away from wiping global settings.
- **Impact:** Latent data loss of all system settings.
- **Fix:** Read-modify-write full settings, or remove the fallback branch.

### [P2-12] User-added repair categories never appear in the POS/intake price picker
- **File:** src/hooks/usePriceCatalog.ts:139-160 (addCategory adds to models + priceCategories) vs src/utils/priceCatalogLookup.ts:70 (iterates the STATIC `REPAIR_CATEGORIES` constant only)
- **Issue:** The catalog editor lets you add categories and prices for them (and CSV import can too), but `getModelPriceCatalogItems` builds items from the hard-coded `REPAIR_CATEGORIES`, so custom categories are invisible in the POS "Price List" picker and intake. `deleteCategory` also leaves orphan price keys in every model doc.
- **Impact:** Paid-for feature silently dead; orphan keys accumulate in model data.
- **Fix:** Pass live `categories` into the lookup (or store the category list on each catalog doc), and strip the deleted key from all model `prices`/`warranties` on delete.

### [P2-13] Cart cleared on device change, but prefill path can race with stale `cartSummary`
- **File:** src/components/prices/PriceCatalogModule.tsx:441-447 (handleDeviceChange) + 544-575 (handleCreateWorkOrderFromCart)
- **Issue:** `handleCreateWorkOrderFromCart` reads `cartSummary.totalDue` (memoized) while the `price` fallback is computed from possibly-fresh `selectedRepairsList` — if a discount popup apply and "Create Intake Ticket" land in the same tick, the two totals can disagree; the prefill `discountAmount` is also float (see P2-8). Minor race; primary issue is the float.
- **Impact:** Occasional off-by-a-few-kyat prefill; float values (covered by P2-8).
- **Fix:** Compute the WO totals once from `selectedRepairsList` with rounding and drop the `cartSummary` fallback.

### [P2-14] Stock consumption at checkout clamps negative stock silently
- **File:** src/App.tsx:1398-1420 (handleConsumeInventoryFromWorkOrder — write path used by POS handleProcessPayment)
- **Issue:** `quantityInStock: Math.max(0, Number(part.quantityInStock||0) - consumed.quantity)` — if stock was reduced between add-part and checkout (another ticket, manual edit), consumption silently floors at 0 with no warning.
- **Impact:** Negative-stock situation hidden; inventory fund/asset numbers drift from reality.
- **Fix:** If `consumed.quantity > stock`, block checkout or surface a warning toast listing short parts.

### [P2-15] Expense date default off-by-one; payout totals not date-filtered
- **File:** src/components/finance/ShopFinancePlModule.tsx:60 (newExpense default `new Date().toISOString().split('T')[0]`), 270-272 (totalCommissionsEarned sums ALL payouts regardless of the date window)
- **Issue:** `toISOString()` yields the UTC date — for UTC+6:30, entries made before 06:30 local get yesterday's date (same pattern also produces the misleading "Period Commissions" which ignores `dateFilter` entirely while the page header says "Total Period Commissions").
- **Impact:** Expenses recorded on the wrong day (daily P&L off by a rent-sized expense); commissions labeled "period" show all-time.
- **Fix:** Build the default date from local components (as POS checkoutDate does); filter payouts by `period` within the window or relabel.

---

## P3 FINDINGS

### [P3-1] Per-item discount display rounding drift
- **File:** src/components/pos/PosInvoicingModule.tsx:344-351 vs 406-422
- **Issue:** `perItemDiscountTotal` rounds each line's discount (`Math.round(unitPrice*qty*pct/100)`) but `recalculateTotals` sums unrounded floats and rounds only the subtotal — the "Per-item Discounts" row can differ from `subtotal_original − subtotal_net` by a few kyat.
- **Fix:** Round per-line discounts in `recalculateTotals` identically.

### [P3-2] Hardcoded "MMK" in POS price-list picker Final card
- **File:** src/components/pos/PosInvoicingModule.tsx:~2364 — `{selectedCatalogFinalTotal.toLocaleString()} MMK` — ignores `currency` (breaks for USD/THB shops).
- **Fix:** Use `{currency}`.

### [P3-3] Profit figures clamped with Math.max(0, …) mask negative profit
- **File:** src/components/pos/PosInvoicingModule.tsx:1263, 1274
- **Issue:** Gross/Net profit show 0 instead of a negative number when parts cost exceeds amount due; Net Profit row only renders when `partsItems.length > 0`, so the tech-commission estimate is hidden on labor-only tickets.
- **Fix:** Show signed values (or an explicit "−" loss badge); render the System/commission block whenever `estCommission > 0 || partsItems.length > 0`.

### [P3-4] Unconditional `.toLocaleString()` on `selectedWo.subtotal`/`taxAmount`
- **File:** src/components/pos/PosInvoicingModule.tsx:1189, 1199
- **Issue:** Legacy Supabase rows missing these fields crash the checkout panel (React unhandled TypeError). (See P2-10.)
- **Fix:** `(selectedWo.subtotal ?? 0).toLocaleString()`.

### [P3-5] Cash numpad "00"/"0" are no-ops when tendered is 0
- **File:** src/components/pos/PosInvoicingModule.tsx:1513-1524 — `Number(String(cashTendered || '') + key)` with 0 yields 0 for both "0" and "00" first press; also no decimal/fractional handling (fine for integer MMK).
- **Fix:** For `'00'` when current is 0, set 0 (harmless) — or prepend '0' literal for consistency; consider `setCashTendered(cashTendered * 10)` for '0'.

### [P3-6] Payment-method breakdown buckets by string, "other" includes split only by prefix
- **File:** src/components/finance/ShopFinancePlModule.tsx:175-186 — `method.startsWith('Split Payment')` covers `Split Payment (Cash: … + KBZPay: …)`; a hypothetical "Cash Split" would mis-bucket, and exact-match 'Cash' means the split cash portion never lands in the drawer reconciliation.
- **Impact:** Drawer reconciliation can't be trusted for split payments (known limitation; display-level).
- **Fix:** Parse split components and allocate each portion to its bucket.

### [P3-7] CSV export doesn't quote-escape fields
- **File:** src/components/prices/PriceCatalogModule.tsx:589-605 — values are `"${item.model}"`-wrapped but internal quotes/commas in labels (e.g. "3 M ( Touch )") are not escaped; re-import of exported CSV with commas in warranty strings mis-parses.
- **Fix:** Proper CSV escaping (`"` doubling) for every field.

### [P3-8] `handleExportCsv` stale-closure deps
- **File:** src/components/prices/PriceCatalogModule.tsx:589-605 — `useCallback` deps `[catalog]` but reads `categories`; renaming categories without a catalog change exports old labels.
- **Fix:** Add `categories` to deps.

### [P3-9] "Reset Defaults" button is a silent no-op in production
- **File:** src/hooks/usePriceCatalog.ts:351-380 + src/components/prices/PriceSettingsModal.tsx:~540-552
- **Issue:** `resetToDefaults` returns early when `VITE_ENABLE_DEMO_SEED !== 'true'` (live ERP), but the modal shows a success toast "Price catalog and preferences reset to factory defaults."
- **Fix:** Disable the button (or explain) unless demo seeding is enabled.

### [P3-10] "Save & Close" does nothing
- **File:** src/components/prices/PriceSettingsModal.tsx:1257-1268 — all writes already happen per keystroke; the Save button only toasts. Combined with P2-3 this gives a false sense of commit safety.
- **Fix:** Make edits draft-local and commit on Save (also fixes P2-3), or relabel the button.

### [P3-11] Fractional kyat accepted in price editor
- **File:** src/components/prices/PriceSettingsModal.tsx:188-192 — `parseFloat` accepts 380000.5; persisted decimal prices flow into totals.
- **Fix:** `Math.round` after parse (MMK integer rule).

### [P3-12] Tax / discount % inputs not clamped on save
- **File:** src/components/settings/tabs/TabPricing.tsx:56-96 — `min/max` are HTML hints only; typing 500 in taxPercentage makes `taxRate = 5.0` and POS totals 5× tax. `defaultLaborDiscountPercent` is also unclamped (and appears unused in the audited POS path).
- **Fix:** Clamp in onChange: `Math.min(30, Math.max(0, …))` / `Math.min(50, …)`.

### [P3-13] `renameModel` non-atomic double-write and doc-id collisions
- **File:** src/hooks/usePriceCatalog.ts:205-224
- **Issue:** Soft-delete + create are two independent writes (a failure between them leaves both models); renaming to a name whose slugified id already exists (e.g. "iPhone 15 ProMax" vs existing "iPhone 15 Pro Max" → both `iphone_15_pro_max`) overwrites the other model's document.
- **Fix:** Single upsert with collision check; reject if target doc id exists and belongs to a different model.

---

## Verified-clean notes (checked, no bug found)
- All `saveDocument` work-order writes from POS/Finance pass FULL objects (`{...selectedWo, …}`), and `handleSaveWorkOrder`/`handleMarkPaid`/`handleRecordSupplierPayment`/`handleUpdateSettings` in App.tsx write complete docs — no partial-`data`-column clobber in the audited write paths (the only partial write is the latent systemSettings fallback, P2-11).
- Commission formula (POS `estCommission` vs App `handleMarkPaid`) is identical and matches business rule 2 (labor after per-item discounts × rate, rounded).
- Split-payment sum/change math, cash change, backdate anchor (17:30 local = 12:00 UTC), and idempotency guard in `handleMarkPaid` are correct.
- `partsCostTotal`/gross-profit display in POS matches business rule 2 (except the Math.max clamp, P3-3).
- `recalculateTotals` deposit handling and `handleUpdateLineItem` clamps (qty ≥ 1, price ≥ 0, discount 0–100) are correct; no NaN paths found in POS handlers (empty inputs coerce to 0).
- TabPos.tsx contains no money math (settings/print-layout UI only).

---

## Top 3 most critical findings
1. **P1-3** — Finance P&L reports revenue that includes bundled parts' selling price and unpaid tickets: the shop's headline revenue/profit numbers are wrong.
2. **P1-1** — POS invoice-level discount silently never applied (or retroactively disabled) on tickets without per-item discounts: wrong amount collected while a discount is displayed.
3. **P1-2** — POS self-heal can persist `totalAmount` inflated by part selling prices and strip tax on legacy tickets: silent wrong-money persistence.
