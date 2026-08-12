# Micro-Level Bug Audit — Area C: Inventory / Suppliers / CRM / Customer Portal

**Date:** 2026-08-11 · **Repo:** i35erp-stable-v1 (branch v1.1) · **Mode:** READ-ONLY (no files modified)
**Scope:** InventoryManagementModule.tsx, SupplierRmaModule.tsx, CrmCustomerPortalModule.tsx, CustomerRepairHistoryModal.tsx, CustomerRepairTimeline.tsx, CustomerFacingWebPortal.tsx + parent wiring (App.tsx, lib/supabase.ts, lib/offlineQueue.ts, utils/portalWorkflow.ts) verified for context.

**Totals: 22 findings — P1: 0 · P2: 14 · P3: 8**

---

### [P2] Warranty claim silently wipes a part's supplier when submitted without picking a supplier
- **File:** src/components/inventory/InventoryManagementModule.tsx:500–521 (`handleSubmitWarrantyClaim`)
- **Issue:** The warranty/RMA modal opens with `warrantyForm.supplierId = ''` and does **not** pre-fill the part's existing supplier, and there is no validation that a supplier was chosen. On submit:
  ```js
  if (onUpdatePart && (claimingWarrantyPart.supplierId !== warrantyForm.supplierId || claimingWarrantyPart.supplierName !== resolvedSupName)) {
    onUpdatePart({ ...claimingWarrantyPart, supplierId: warrantyForm.supplierId, supplierName: resolvedSupName });
  }
  ```
  `resolvedSupName` = `selectedSup?.name || warrantyForm.supplierName || 'Supplier Vendor'`. If the user files the claim without touching the supplier select (allowed — nothing is enforced), the part's real `supplierId`/`supplierName` are replaced with `''` / `"Supplier Vendor"`.
- **Impact:** Data loss on the inventory record — the part's assigned supplier reference is destroyed by a normal "File Warranty Claim" action. Later warranty/RMA lookups and supplier reports lose the link.
- **Fix:** Pre-fill `warrantyForm.supplierId` from `claimingWarrantyPart.supplierId` when opening the modal, and/or require a supplier selection before submit (disable the submit button, validate in the handler). Only call `onUpdatePart` when the supplier actually changed to a non-empty value.

### [P2] RMA/warranty claim never decrements stock, but "Replacement Received" always increments it
- **File:** src/components/inventory/InventoryManagementModule.tsx:470–530 (`handleSubmitWarrantyClaim`) + src/App.tsx:1510–1522 (`handleUpdateRmaStatus`)
- **Issue:** Creating an RMA/warranty claim (SupplierRmaModule `handleCreateRma` or the inventory warranty modal) does **not** reduce `quantityInStock`, yet marking the RMA `'Replacement Received'` does `quantityInStock += rma.quantity`. The claim-quantity input is capped only by a UI `max` attribute (`max={claimingWarrantyPart.quantityInStock || 99}` at line 2902) which is not enforced on submit — a claim for 99 units on a part with stock 2 passes validation, and receiving it later adds 99 back.
- **Impact:** Stock accounting asymmetry: defective units sent to the vendor never leave stock, and receiving a replacement adds stock on top → inventory inflation / phantom stock. Oversized claims inflate stock further.
- **Fix:** Pick one consistent model — decrement stock at claim time (unit leaves the shelf) and keep the increment on replacement received (or vice versa), and validate `quantity ≤ quantityInStock` in `handleSubmitWarrantyClaim`/`handleCreateRma` before creating the RMA.

### [P2] Inline stock/price editor accepts non-numeric and negative input → stock silently zeroed or negative
- **File:** src/components/inventory/InventoryManagementModule.tsx:1048–1063 (`confirmInlineSave`)
- **Issue:** The inline-edit stock field is `type="text" inputMode="numeric"`, and saving parses with `Number(...)`:
  ```js
  const parsedQuantity = draft.quantityInStock?.trim() ? Number(draft.quantityInStock) : part.quantityInStock;
  ...
  onUpdatePart({ ...part, ..., quantityInStock: parsedQuantity, ... });
  ```
  Typing `abc` (or `-`, `e`) yields `NaN`; `JSON.stringify(NaN)` → `null` in Supabase → normalized back to **0** on reload — the real stock count is silently destroyed. Typing `-5` persists **negative stock** (App's `handleUpdatePart` does not clamp; only `handleUpdatePartStock` does). The Edit-Part modal (`handleSaveEditPart`) and New-Part form (`handleSaveNewPart`, `Number(x) || 0` allows `-5`) have the same lack of clamps.
- **Impact:** Corrupted inventory numbers — items silently showing OUT OF STOCK or negative after a typo; reorder/valuation metrics wrong.
- **Fix:** Validate/normalize in `confirmInlineSave` (and the edit/add forms): reject non-numeric (`Number.isFinite`), clamp `Math.max(0, …)`, and show an inline error instead of saving.

### [P2] Inventory metrics crash the whole module on a part with any owner other than APP/KZH
- **File:** src/components/inventory/InventoryManagementModule.tsx:858–863 (`metrics` useMemo)
- **Issue:** `ownerCounts` guards unknown owners (`ownerCounts[owner] = (ownerCounts[owner] || 0) + 1`) but `ownerValuation` does not:
  ```js
  const ownerValuation: Record<string, { cost: number; retail: number }> = { APP: {…}, KZH: {…} };
  ...
  ownerValuation[owner].cost += Number(p.costPrice || 0) * Number(p.quantityInStock || 0);
  ```
  `owner` comes from raw cloud data (`p.owner || 'APP'`); nothing normalizes `owner` on load (App.tsx part normalization doesn't touch it). Any part with `owner: "WHOLESALE"` (or a legacy/typo value) → `ownerValuation[owner]` is `undefined` → `TypeError` → profit/stock view render crash.
- **Impact:** Inventory page renders blank for the whole staff when one bad row exists.
- **Fix:** `ownerValuation[owner] ??= { cost: 0, retail: 0 }` before use (or a Map), same guard style as `ownerCounts`.

### [P2] Customer repair history merges unrelated customers who share the same name (cross-customer data exposure in staff UI)
- **File:** src/components/crm/CrmCustomerPortalModule.tsx:200–206 (`getCustomerWorkOrders`) and src/components/crm/CustomerRepairHistoryModal.tsx:52–56
- **Issue:** Both match tickets to a customer by `customerId`, exact phone string, **or case-insensitive name equality**:
  ```js
  (cust.name && wo.customerName?.toLowerCase() === cust.name.toLowerCase())
  ```
  Two different customers with the same name (very common in Myanmar phone books, e.g. multiple "U Aung" / "Daw Hla") each see **both** customers' work orders in the roster row and the repair-history dossier — including serial numbers, IMEIs, repair logs, and financial totals. The same name fallback exists in App.tsx `handleMarkPaid` customer lookup (~line 1555), which can add the paid amount to the **wrong** customer's `totalSpent`/`totalOrdersCount`.
- **Impact:** Wrong repair history, wrong per-customer spend totals, and display of one customer's ticket data inside another customer's record.
- **Fix:** Drop the name-only match (or require name AND normalized phone together). Match on `customerId`, else normalized phone digits (shared normalizer, see next finding), never name alone.

### [P2] Phone matching is inconsistent across modules — same customer splits into duplicates / histories missed
- **File:** src/App.tsx:1086 (derived roster key), src/components/crm/CrmCustomerPortalModule.tsx:200–206, src/App.tsx:~1555 (markPaid), src/components/portal/CustomerFacingWebPortal.tsx:24–31
- **Issue:** Three different phone-matching semantics exist:
  - CRM `getCustomerWorkOrders`: **exact string equality** (`wo.customerPhone === cust.phone`) — `"09 123 456 789"` ≠ `"09123456789"`.
  - App `handleMarkPaid` / portal: **digit-normalized** matching.
  - Derived roster key (App.tsx:1086): raw `name.toLowerCase()|phone.trim()` — formatting variants create separate derived customers.
  So the same physical person with tickets recorded under two phone formats appears as two customers, each missing the other's tickets; the portal and markPaid match them but the CRM roster doesn't.
- **Impact:** Split customer histories, wrong repair counts, duplicate derived customers in the roster.
- **Fix:** Single shared `normalizePhone` util (digits only) used by the roster key, `getCustomerWorkOrders`, markPaid lookup, and the portal.

### [P2] Portal voucher auth: any 6+ trailing digits of a ticket's phone grants access (and no rate limiting)
- **File:** src/components/portal/CustomerFacingWebPortal.tsx:24–31 (`makePhoneMatcher`)
- **Issue:** "Login" accepts a query whose digits equal the ticket's phone digits **or are the trailing 6+ digits of it**:
  ```js
  const digits = (wo.customerPhone || '').replace(/[^0-9]/g, '');
  if (!digits || queryDigits.length < 6) return false;
  return digits === queryDigits || digits.endsWith(queryDigits);
  ```
  Two tickets whose phones share the same last 6 digits are both returned to either customer — each can read the other's repair logs, IMEI/serial, full financials, and send messages / approve & reject estimates. 6 digits is also brute-forceable (1e6 combinations, no lockout/rate limit anywhere). Note: in the current repo the portal is only reachable inside the auth-gated ERP (portal tab + simulator), so exposure is currently staff-side; but the component is a self-contained full-screen page (`min-h-screen`, "LIVE PORTAL") with no server-side check — if ever served standalone, this client-side filter is the *only* authorization.
- **Impact:** Cross-customer ticket exposure; enumeration (login error reveals whether a phone/order exists); if deployed standalone, unauthorized PATCH of work orders via the anon-key Supabase client.
- **Fix:** Require a longer match (e.g., full 9+ digit normalized phone OR a per-ticket nonce/voucher code printed on the receipt), add attempt throttling, and add a server-side authorization layer (RLS policy matching `data->>customerPhone` with `request.jwt` claims) before any standalone deployment.

### [P2] Portal writes clobber concurrent technician edits (full-object lost update)
- **File:** src/components/portal/CustomerFacingWebPortal.tsx:129–143 (`handleApproveEstimate`), 146–162 (`handleRejectEstimate`), 165–188 (`handleSendMessage`) → src/App.tsx:1228 (`handleSaveWorkOrder`) / src/lib/supabase.ts `saveDocument`
- **Issue:** All three handlers save a **snapshot** of `currentWorkOrder` (stale by definition if the ticket changed since render). App's `handleSaveWorkOrder` replaces the array entry and `saveDocument` does a full-object upsert. Example: technician marks a ticket `In Progress` with a log entry on the shop iPad while the customer's browser still holds `Receive`; the customer then sends a message → the stale object (status `Receive`, without the tech's log) is upserted wholesale, **wiping the technician's status and log** on the server and pushing it back to every device via realtime.
- **Impact:** Silent data loss of concurrent edits — the exact "realtime vs local state clobber" failure mode.
- **Fix:** Merge-based persistence or a version/`updatedAt` compare-before-write with conflict warning; at minimum, re-read the freshest work order before writing and only patch the specific fields the portal owns (inquiries, estimate flags, status when approval is the actor).

### [P2] "Decline / Request Callback" can regress a finished (possibly paid) ticket back to Pending
- **File:** src/components/portal/CustomerFacingWebPortal.tsx:375 (banner condition) + src/utils/portalWorkflow.ts:70–80 (`applyEstimateRejection`)
- **Issue:** The banner shows whenever `estimateStatus === 'Pending Approval'` **regardless of ticket status** (the second clause requires `Receive`, the first does not). `applyEstimateRejection` unconditionally sets `status: 'Pending'`:
  ```js
  return { ...workOrder, status: 'Pending', estimateStatus: 'Rejected' as const, ... };
  ```
  `estimateStatus: 'Pending Approval'` is never written by this codebase (only legacy rows carry it), so a legacy ticket that is already `Finished`/`Taken Out` (even `isPaid`) still shows Approve/Decline; clicking Decline resets its status to `Pending` while `isPaid`/`completedAt` remain — the pipeline and finance views then show a paid, completed job stuck at "awaiting approval". (The ESTIMATE tab's Decline button is correctly gated to `Receive`/`Pending`, but the banner's is not.)
- **Impact:** Wrong state on financial/pipeline records; possible double-processing (ticket re-enters the active queue after being paid/collected).
- **Fix:** Gate the banner to non-terminal statuses (`Receive`/`Pending` only), and make `applyEstimateRejection` refuse to downgrade from `Finished`/`Taken Out`.

### [P2] Portal renders unguarded numeric/list fields — crash on legacy/malformed work orders
- **File:** src/components/portal/CustomerFacingWebPortal.tsx:389, 681, 698, 768, 795, 811, 845, 974
- **Issue:** `currentWorkOrder.totalAmount.toLocaleString()`, `currentWorkOrder.subtotal.toLocaleString()`, and `currentWorkOrder.lineItems.map(...)` are called without optional guards, and — unlike parts — **work orders are NOT normalized on load** (App.tsx:402 `setWorkOrders(data)` passes raw cloud rows; only `parts` get a legacy-mapping pass). Any legacy row missing `subtotal`/`totalAmount`/`lineItems` throws `TypeError`, blanking the portal.
- **Impact:** White-screen on the portal tab / simulator for older records.
- **Fix:** Normalize work orders on load (mirror the parts mapping in App.tsx) and/or use `(currentWorkOrder.totalAmount || 0).toLocaleString()` and `(currentWorkOrder.lineItems || []).map(...)`.

### [P2] Offline queue can replay a stale snapshot AFTER a newer direct write (offline→online race)
- **File:** src/lib/supabase.ts:299–305 (`saveDocument`), 369–437 (`flushOfflineQueue`)
- **Issue:** `saveDocument` ends every successful online write with `void flushOfflineQueue()`, and `flushInProgress` makes flushes mutually exclusive but **no per-document freshness check exists**. Sequence: (1) offline edit queues snapshot A; (2) connection returns, `online` event starts flushing A; (3) before the flush's upsert lands, the user makes a newer edit B which upserts directly (cloud = B); (4) the in-flight flush then upserts A (cloud = A — **stale wins**), and realtime propagates A to every device. B is lost without any error.
- **Impact:** Silent rollback of the newest edit on reconnect — worst case for stock counts/status changes made right at the connectivity boundary.
- **Fix:** In the direct-write path, first remove queued items with the same `collectionName`+`id` (or compare `queuedAt`/`updated_at` and drop older ones), and have the flush skip an item if a newer direct write already landed (e.g., compare `updated_at`).

### [P2] `handleMarkPaid` double-click race can consume stock twice and duplicate the expense
- **File:** src/App.tsx:1528–1536 (`handleMarkPaid`), 1326–1370 (`handleConsumeInventoryFromWorkOrder`)
- **Issue:** The idempotency guards read **pre-update state**: `const current = workOrders.find(...)`, `if (current.isPaid) return`, then `handleConsumeInventoryFromWorkOrder(current, …)` which itself guards on `workOrder.inventoryConsumedAt` — again the same snapshot. Two rapid checkouts dispatched before React re-renders (double-click, or Enter+click on a touch device) both see `isPaid: false` / no `inventoryConsumedAt` → stock decremented twice for the same sale and a second `Inventory Consumption` expense row created.
- **Impact:** Wrong stock and duplicate expense entries (money impact in finance).
- **Fix:** Make the guards race-proof — e.g., a module-level in-flight flag/ref for the paid ticket id, or derive the guard from the updater function (`setWorkOrders(prev => …)` checking `prev`), and make `handleConsumeInventoryFromWorkOrder` return early based on state rather than the passed snapshot.

### [P2] RMA with $0 unit cost impossible — cost silently replaced by part cost (wrong credit amount)
- **File:** src/components/suppliers/SupplierRmaModule.tsx:193–194 (`handleCreateRma`)
- **Issue:**
  ```js
  quantity: Number(newRmaData.quantity) || 1,
  unitCost: Number(newRmaData.unitCost) || part.costPrice,
  ```
  A legitimately zero-cost claim (vendor gives free replacement credit) is replaced by `part.costPrice`. If `part.costPrice` is missing on a legacy row, `unitCost` becomes `undefined`, and the Approve-Credit button computes `rma.unitCost * rma.quantity` → `NaN` credit stored / displayed as "NaN".
- **Impact:** Wrong vendor-credit amounts recorded against RMAs (money accuracy in supplier accounting).
- **Fix:** `Number.isFinite(...) ? value : 0` handling that preserves 0, and guard `rma.unitCost || 0` when computing credit.

---

### [P3] RMA status flow is one-way and mutually exclusive — no return to "Shipped" or correction path
- **File:** src/components/suppliers/SupplierRmaModule.tsx:418–454, 568–605
- **Issue:** From `Shipped to Vendor` the UI offers "Approve Credit" and "Replacement Received". Once either is chosen the other is gone forever and the RMA cannot be corrected (e.g., approving credit then later receiving the replacement, or a misclick). RMA numbers are `RMA-<year>-<random 3 digits>` generated in two modules — collisions are possible (`Math.floor(100 + Math.random() * 900)`).
- **Impact:** Wrong status stuck on records; duplicate RMA numbers confuse lookups (cosmetic-to-moderate).
- **Fix:** Allow status rollback / "both" path, and generate RMA numbers from an incrementing sequence instead of 900 random values.

### [P3] PO line default cost silently uses 60% of selling price when costPrice is 0
- **File:** src/components/suppliers/SupplierRmaModule.tsx:585–587 (PO modal part select)
- **Issue:** `unitCost: part ? Number(part.costPrice || part.sellingPrice * 0.6 || 0) : it.unitCost` — when a part's `costPrice` is 0, the PO silently records `sellingPrice × 0.6` as the unit cost, which flows into `po.totalCost` and the restock valuation.
- **Impact:** Wrong money on POs / stock valuation with no user awareness.
- **Fix:** Default to 0 (or the part's real cost only), and let the user type the actual negotiated cost.

### [P3] Duplicate SKUs and duplicate supplier codes are not prevented
- **File:** src/components/inventory/InventoryManagementModule.tsx:1000–1020 (`handleSaveNewPart`), 240–255 (`handleCreateSupplier`)
- **Issue:** No uniqueness check on `part.sku` or `supplier.code`. Duplicate SKUs make barcode scan return the first match silently; duplicate supplier codes break vendor reports.
- **Impact:** Scan looks up the wrong part; confusing vendor lists.
- **Fix:** Warn/block on duplicate SKU/code at save time (case-insensitive check against existing `parts`/`suppliers`).

### [P3] Zero-cost parts still create Inventory Consumption expense rows
- **File:** src/App.tsx:1360–1370 (`handleConsumeInventoryFromWorkOrder`)
- **Issue:** `handleAddExpense` is called unconditionally when `usageItems.length > 0`, even if `totalInventoryCost === 0` (free/zero-cost parts) — a `0 MMK` expense row pollutes finance reports.
- **Impact:** Zero-amount rows in the expense ledger / inventory-fund reminders for nothing.
- **Fix:** `if (totalInventoryCost > 0)` before creating the expense.

### [P3] Duplicate customer accounts allowed for the same phone; phone search can't match formatted variants
- **File:** src/components/crm/CrmCustomerPortalModule.tsx:158–190 (`handleCreateCustomerSubmit`), 125–131 (filter)
- **Issue:** No existing-phone/name check when creating a customer → unlimited duplicates for the same person. Search uses raw substring on the stored phone string, so `"091234"` won't match `"09 123 456 789"`.
- **Impact:** Duplicate accounts, missed search results (annoyance; compounds with the P2 matching inconsistency).
- **Fix:** On create, offer to reuse the existing account when normalized phone matches; search on digit-normalized phone.

### [P3] Timeline: invalid/missing `createdAt` breaks chronological sort; status filter omits "Taken Out"
- **File:** src/components/crm/CustomerRepairTimeline.tsx:119–125 (sort), 218–225 (filter options)
- **Issue:** Sorting uses `new Date(a.createdAt).getTime()` — for a row without `createdAt` both sides are `NaN` and order is unstable (no crash, "Invalid Date" shown in the date line). The status `<select>` lists Finished/In Progress/Pending/Receive/Cant Repair/Declined but not `Taken Out`, even though `getOutcomeMeta` styles it — collected tickets can't be filtered.
- **Impact:** Wrong chronological order for legacy rows; missing filter option.
- **Fix:** Fall back to `createdAt || ''` (or the record id) in the comparator and add the `Taken Out` option.

### [P3] Portal login response reveals whether a phone/order exists (enumeration)
- **File:** src/components/portal/CustomerFacingWebPortal.tsx:109–118
- **Issue:** Distinct error strings distinguish "no ticket found" from success; an attacker can probe which phone numbers/order numbers have active tickets. Message timestamps are also written as `new Date().toLocaleString()` (locale-dependent) while the rest of the app uses ISO — inconsistent ordering/display.
- **Impact:** Minor info disclosure; timestamp format inconsistency.
- **Fix:** Generic error message ("enter the identifier on your voucher"), and store `new Date().toISOString()` for inquiry/repair-log timestamps.

### [P3] Dead no-op effect leaves stock view stuck after resize/rotation
- **File:** src/components/inventory/InventoryManagementModule.tsx:818–826
- **Issue:** The "force card grid below md" effect has an empty `apply = () => {}` body — the listener does nothing. App initializes `inventoryStockView` once from `window.innerWidth` (App.tsx:215), so rotating/resizing never switches table↔cards; phones that start as cards keep cards on rotation to a wide layout (and vice versa).
- **Impact:** Minor UX inconsistency on rotation/resize.
- **Fix:** Implement the `apply` body (matchMedia `(max-width: 639px)` toggling `setStockView('cards'|'table')`) or delete the dead effect and rely on CSS-only responsive rendering.

### [P3] Stock bar renders NaN width when reorderPoint is 0
- **File:** src/components/inventory/InventoryManagementModule.tsx:1764–1768 and 1840–1843 (stock bar style)
- **Issue:** `style={{ width: `${Math.min(100, Math.max(8, (part.quantityInStock / (part.reorderPoint * 3)) * 100))}%` }}` — with `reorderPoint = 0`: `qty/0` is `Infinity` (bar pinned at 100%, misleading) or, when stock is also 0, `0/0 = NaN` → invalid CSS width, empty bar.
- **Impact:** Misleading/blank stock bar for parts with reorder point 0.
- **Fix:** Guard `part.reorderPoint > 0 ? ... : (part.quantityInStock > 0 ? 100 : 0)`.

---

## Verified-clean areas (checked, no bug found)

- **Supabase PATCH clobber:** `saveDocument`/`saveBatchDocuments` always `upsert` the **full** document (`toRows` maps the whole object into `erp_records.data`) — no partial writes at the persistence layer. All component handlers spread the complete object before saving (App.tsx `handleUpdatePart`, `handleUpdateRmaStatus`, `handleSaveWorkOrder`, portal writes, etc.). The one clobber risk found is the stale-snapshot race (#9), not partial-write.
- **Offline queue bypass / double-write on reconnect:** every write path (parts, suppliers, RMAs, POs, customers, work orders, expenses) goes through `saveDocument`/`deleteDocument` → queue on failure; no direct Supabase writes found in these modules. Reconnect flush is idempotent (upsert). The only queue defect is the stale-replay race (#11).
- **Negative stock from POS:** `handleConsumeInventoryFromWorkOrder` clamps via `Math.max(0, Number(stock) - consumed)` (App.tsx:1369) — no negative stock from checkout. Manual steppers also clamp at 0.
- **Double receive/decrement guards:** PO receive checks `po.status === 'Received'`; RMA replacement increment is gated on `status === 'Replacement Received'`; `handleUpdateWorkOrderStatus` anchors `completedAt` only once.
- **Keys/secrets:** no admin tokens or secrets found in these components; the Supabase publishable (anon) key is the only credential in the bundle, which is expected — data protection depends on RLS (not auditable from this repo, noted in #7's fix).
