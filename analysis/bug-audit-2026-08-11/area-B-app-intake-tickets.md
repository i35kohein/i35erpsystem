# Micro-Level Bug Audit — Area B: App / Intake / Tickets (state & flow)

- **Date:** 2026-08-11
- **Repo:** /Users/user/Desktop/i35erp-stable-v1 (branch v1.1)
- **Scope:** App.tsx, CreateTicketSoloPage.tsx, SimpleTicketCreator.tsx, IntakeWorkOrderModule.tsx, deviceData.ts, TabIntake.tsx, TicketDetailInspectorModal.tsx, WorkOrderStatusTimeline.tsx, StatusBadge.tsx, StatusChip.tsx, PriorityBadge.tsx — plus supporting libs (src/lib/supabase.ts, src/lib/offlineQueue.ts, src/utils/diagnosticUtils.ts, src/components/qa/QualityAssuranceModule.tsx, src/components/crm/CustomerRepairTimeline.tsx, src/components/pos/PosInvoicingModule.tsx) read to verify write-path semantics.
- **Mode:** READ-ONLY. No files modified, no builds run.

**Verified ground truth used throughout:**
- `saveDocument()` in `src/lib/supabase.ts:263-288` does `applyLocalChange` + full-row `upsert` of `{ collection_name, id, data: <entire object> }` — **the whole `data` JSONB column is replaced on every write**. Any partial/stale object permanently clobbers fields not present in it. `deleteDocument`/`clearCollection` behave similarly.
- `addToQueue()` (`src/lib/offlineQueue.ts:56-64`) is `store.add` — **no dedup / no per-document coalescing**.
- `flushOfflineQueue()` (`src/lib/supabase.ts:379-455`) replays the queue FIFO; `saveDocument` calls `void flushOfflineQueue()` after every successful write.
- App is wrapped in `<StrictMode>` (`src/main.tsx`) — dev-only double-invoke of state updaters.
- `WorkOrderStatus` = `'Receive' | 'In Progress' | 'Pending' | 'Finished' | 'Taken Out' | 'Cant Repair' | 'Customer Not Repair'` (types/index.ts:8-15). All comparisons in audited files use these exact strings (no `in-progress` mismatch found).

---

## Findings

### [P1] Editing a ticket via Simple Ticket silently destroys workflow, payment, QA, warranty, photo and log data
- **File:** src/components/intake/SimpleTicketCreator.tsx:205-299 (handleSubmit → `base` object), loadTicket at :174-200
- **Issue:** Unlike CreateTicketSoloPage (which spreads `baseWorkOrder`), the Simple Ticket edit path rebuilds the WorkOrder from scratch with hardcoded defaults:
  ```ts
  status: 'Receive',          // line 249 — resets workflow stage
  assignedTechId: '',          // line ~252 — wipes assignment
  customerId: '',              // line ~227 — wipes customer linkage
  isPaid: false,               // line 289 — un-pays a paid ticket
  warrantyDays: systemSettings?.defaultWarrantyDays ?? 90,  // line ~293 — resets warranty
  intakePhotos: [],            // line ~295 — wipes before-photos
  estimatedCompletion: undefined,
  depositAmount: 0,
  // and the object has NO keys for: completedAt, afterDiagnostics,
  // postRepairChecklist, repairLogs, paymentMethod, warrantyLabel
  ```
  `loadTicket` copies only a handful of fields into the form; the rest are simply never carried over. Since Supabase upsert **replaces the whole data object**, every save from the "✏️ Edit existing ticket…" dropdown (which lists *all* tickets, including Finished/Taken Out) erases status, payment, QA checklist, after-diagnostics, photos, warranty and the entire repair log from the database.
- **Impact:** Data loss on every edit through this UI. A Finished/paid ticket edited here regresses to `Receive` + unpaid + unassigned, QA checklist gone, logs gone — irreversible (P1 data corruption). The success flash even says "Ticket updated and saved to the database."
- **Fix:** In edit mode, build from the existing ticket: `const base: WorkOrder = { ...existing, ...formFields, status: existing.status, isPaid: existing.isPaid, ... }` (preserve all fields not edited by the form), or require `onSaveWorkOrder` to merge against the stored record. Add a ref/state guard for double-submit at the same time (see P2 below).

### [P1] Offline-queue replay can overwrite a newer, successfully-saved write with stale queued data
- **File:** src/lib/supabase.ts:263-288 (saveDocument), :379-455 (flushOfflineQueue); src/lib/offlineQueue.ts:56 (addToQueue)
- **Issue:** When a write fails (network blip / server error / timeout) while `navigator.onLine` is still true, `saveDocument` queues the object as-is (`queueWrite`) — no timestamp/version check. The user retries with **newer** data: that retry succeeds live (`upsert`), and the success path immediately calls `void flushOfflineQueue()` — which replays the **older queued copy** of the same `(collection_name, id)` afterwards, permanently regressing Supabase. Queue items are never deduped or coalesced per document, and nothing compares `updatedAt` before replay.
- **Impact:** Silent data loss: the UI shows the retry succeeded (toast), then a refresh/realtime event reverts the record to the stale version. Affects any collection (workOrders, parts, customers…).
- **Fix:** (a) Coalesce queued items by `collectionName+id` (keep newest `updatedAt` / last queued) in `addToQueue`; (b) before replaying a `save`, skip it if a newer live write has already landed (compare `updated_at`/`updatedAt`); (c) or replay the queue *before* allowing new live writes (drain-first gate during flush).

---

### [P2] WorkOrderStatusTimeline "Save & Publish Transition Log" is a silent no-op in CRM
- **File:** src/components/common/WorkOrderStatusTimeline.tsx:209-240 (handleAddNewTransitionLog); src/components/crm/CustomerRepairTimeline.tsx:443 (usage)
- **Issue:** The timeline is rendered in CRM without `onSaveWorkOrder`/`onUpdateStatus`:
  ```tsx
  <WorkOrderStatusTimeline workOrder={wo} />
  ```
  In `handleAddNewTransitionLog`, the save is guarded by `if (onSaveWorkOrder) { onSaveWorkOrder(updatedWo); } if (isStatusChanged && onUpdateStatus) { ... }` — with no callbacks, clicking "Save & Publish Transition Log" validates, builds the log, clears the note and closes the panel. **Nothing is persisted and no error is shown.**
- **Impact:** Staff believe they recorded a status transition / audit note; the entry vanishes on refresh. Audit trail integrity.
- **Fix:** Disable the Save button when no save callback is provided, or wire the CRM usage with `onSaveWorkOrder`.

### [P2] Simple Ticket has no submit guard — double-submit creates duplicate tickets
- **File:** src/components/intake/SimpleTicketCreator.tsx:205-320 (handleSubmit), submit button ~:663
- **Issue:** No `submitting` state or ref; the submit button is never disabled. Two rapid submits (double-click, Enter+click) run `handleSubmit` twice: each computes `nextOrderNumber()` from the same `workOrders` prop snapshot and builds a **new** `wo-${Date.now()}` id — producing two tickets with different ids and the *same order number* if both land before the prop refresh, or sequential duplicate tickets otherwise.
- **Impact:** Duplicate records with duplicated WO numbers → double printing, double customer records, reporting/Telegram confusion.
- **Fix:** `const submittingRef = useRef(false)`; set true synchronously at the top of `handleSubmit`, `if (submittingRef.current) return;`, reset after `onSaveWorkOrder` (and clear on error). Also disable the button while submitting.

### [P2] CreateTicketSoloPage `isRegistering` guard is a stale state flag — same-tick double submit still duplicates
- **File:** src/components/intake/CreateTicketSoloPage.tsx:377-378, 428-498
- **Issue:** `handleRegisterDevice` opens with `if (isRegistering) return;` then `setIsRegistering(true); handleRegisterDeviceInner();`. The guard and `disabled={isRegistering}` are state-based: two invocations within the same tick (programmatic double-call, fast touch double-tap on iPad before re-render) both pass. Both calls compute `maxExistingNum + 1` from the same prop snapshot and the `while` loop only checks the prop's `usedNumbers` (the just-created ticket isn't in it yet) → **same order number, different `wo-${Date.now()}` id** → duplicate ticket rows. `customerId` also collides (`cust-${Date.now()}`).
- **Impact:** Duplicate tickets with identical WO numbers; customer merge-key collisions in the CRM roster.
- **Fix:** Use a ref (`submittingRef.current`) instead of / in addition to state, and include just-created ids/numbers in the collision set (e.g., check a module-level Set of issued order numbers).

### [P2] Simple Ticket "Serial / IMEI" single field pollutes both serialNumber and imei on edit and on save
- **File:** src/components/intake/SimpleTicketCreator.tsx:174-200 (loadTicket), :245-246 (save)
- **Issue:** `loadTicket` maps the ticket's serial into the IMEI field: `imei: wo.imei || wo.serialNumber || ''`. On save both are written from that one value:
  ```ts
  serialNumber: form.imei.trim(),
  imei: form.imei.trim() || undefined,
  ```
  Editing a serial-only ticket writes the serial into `imei`; typing a real 15-digit IMEI writes it into `serialNumber` too. Both fields end up holding the same wrong identifier.
- **Impact:** Wrong serial/IMEI data on disk; duplicate-device detection and warranty lookups keyed on these fields misbehave.
- **Fix:** Keep two fields (serial + imei) like the main intake form, or on save only set the field the user actually entered and preserve the other from the stored record.

### [P2] Intake roster (and QA search) crash with a TypeError on legacy tickets missing orderNumber/customerName/etc.
- **File:** src/components/intake/IntakeWorkOrderModule.tsx:168-177; same pattern src/components/qa/QualityAssuranceModule.tsx:82-85
- **Issue:** With a non-empty `searchQuery`, the filter calls `wo.orderNumber.toLowerCase()`, `wo.customerName.toLowerCase()`, `wo.deviceModel.toLowerCase()`, `wo.serialNumber.toLowerCase()` unguarded. Legacy/partial records (no `orderNumber`, missing `customerName`, etc. — the business context explicitly warns `ticket.status` may be absent on legacy tickets) throw `Cannot read properties of undefined` inside the filter, which propagates through `dateFilteredOrders.filter(...)` and crashes the whole roster render.
- **Impact:** White-screen / "No Repair Tickets Found" replaced by an error boundary on the Intake tab whenever a search is typed and one legacy ticket exists.
- **Fix:** Guard with optional chaining + fallback: `(wo.orderNumber || '').toLowerCase().includes(query)` etc. (also for `wo.customerName`, `wo.deviceModel`, `wo.serialNumber`).

### [P2] "Mandatory quality test required!" gate for Finished is warning-only — tickets reach Finished without QA
- **File:** src/App.tsx:1250-1287 (handleUpdateWorkOrderStatus)
- **Issue:** When `newStatus === 'Finished'` and `checkIsAfterDiagnosticCompleted(wo)` is false, the code fires a persistent, non-dismissible error toast ("Mandatory quality test required!") but **still executes the status transition** — `setWorkOrders` proceeds and `saveDocument` persists `status: 'Finished'`. The roster status picker, Trello and the Timeline can all mark a ticket Finished with no post-repair checklist; the only real blocker is the POS checkout queue (which excludes them), so the ticket sits "Finished" and un-QA'd, and the nagging persistent toast stays until QA later passes it.
- **Impact:** Workflow rule advertised as mandatory is not enforced; Finished state can be reached without QA on all UI paths, persistent non-dismissible toast stuck on screen.
- **Fix:** Either block the transition (return without saving, keep toast) or downgrade to a dismissible info toast so the messaging matches the actual behavior. If blocking, also block `Taken Out` (currently settable with no payment — see next finding).

### [P2] handleMarkPaid idempotency guard reads stale closure state — double-charge race can double-consume stock, duplicate expenses and double-accrue commission
- **File:** src/App.tsx:1528-1560 (handleMarkPaid), :1409-1432 (handleConsumeInventoryFromWorkOrder)
- **Issue:** 
  ```ts
  const current = workOrders.find((w) => w.id === workOrder.id) || workOrder;
  if (current.isPaid) { ... return; }
  handleConsumeInventoryFromWorkOrder(current, paymentMethod);
  ```
  `current` comes from the render closure. Two invocations in the same tick (POS `isProcessingPayment` is also a state flag released after 1200ms; same-tick double call, or a parallel call from another surface) both observe `isPaid === false` and `inventoryConsumedAt` unset → `handleConsumeInventoryFromWorkOrder` deducts stock twice, creates two "Inventory Consumption" expenses, increments customer `totalSpent`/`totalOrdersCount` twice and accrues the technician payout twice.
- **Impact:** Wrong money (double expenses, double commission), stock over-deduction, duplicated payout records.
- **Fix:** Move idempotency to a ref/Set of in-flight ticket ids (`markingPaidRef.current.add(wo.id)`) checked synchronously, and make `handleConsumeInventoryFromWorkOrder` re-read the latest workOrder from state via a functional update.

### [P2] AI auto-classify writes a stale full-object copy — can clobber concurrent QA/status/line-item edits
- **File:** src/App.tsx:692-712 (auto-classify effect), :719-747 (handleAiRescanTickets)
- **Issue:** The effect captures `candidate` from `workOrders` at fire time, then `classifyRepairWithAI(candidate, …)` awaits a network call (1-3s+). The `.then` writes `{ ...candidate, repairTypeAI, aiClassifyFailed }` — a full-object save of the *snapshot*. If the same ticket is edited in that window (QA checklist save, status change, POS payment), the classification save **replaces the whole data column** with the stale snapshot → the QA checklist / status / payment fields are erased in Supabase, and `setWorkOrders(prev => prev.map(w => w.id === candidate.id ? updated : w))` reverts them locally too until the next realtime push. The manual "AI re-scan" loop (200ms apart, every finished ticket) has the same pattern, but writes against the array captured at click time, so any ticket changed while the scan runs gets reverted to the click-time snapshot.
- **Impact:** Data loss on Finished/Taken Out tickets (QA pass, photos, payment markers) whenever AI classification is enabled and overlaps with an edit; local UI shows the regression immediately.
- **Fix:** Re-read the freshest copy at write time: `setWorkOrders(prev => prev.map(w => w.id === id ? { ...w, repairTypeAI, aiClassifyFailed } : w))` and save from inside that updater (or look up the current object from a ref mirror of state), preserving all other fields.

### [P2] Reopen-QA clears the checklist but leaves afterDiagnostics — the QA gate is bypassed on re-inspection
- **File:** src/App.tsx:1663-1683 (handleReopenQa)
- **Issue:** Reopen clears `postRepairChecklist` and `afterRepairPhotos` but keeps `afterDiagnostics`. `checkIsAfterDiagnosticCompleted` (`diagnosticUtils.ts:104-111`) returns true if `afterDiagnostics` has any Pass/Fail — i.e., the *previous* inspection's diagnostics still count. After a reopen, the ticket: (1) still appears in the QA roster (no checklist) but (2) can be marked Finished again with **no** "Finished Diagnostic Pending" toast, because `handleUpdateWorkOrderStatus` sees the stale `afterDiagnostics` as completed — the mandatory re-inspection is silently skippable.
- **Impact:** QA re-inspection loophole (bug #12 fix incomplete); tickets can bypass the post-repair gate after being reopened.
- **Fix:** Clear `afterDiagnostics` in `handleReopenQa` too, or make `checkIsAfterDiagnosticCompleted` require `postRepairChecklist` when it was previously set and cleared.

### [P2] Order-number/id generation races and legacy-timestamp pollution
- **File:** src/components/intake/CreateTicketSoloPage.tsx:428-448; src/components/intake/SimpleTicketCreator.tsx:74-90
- **Issue:** (a) Both forms compute `maxExistingNum` from the same prop snapshot; the `while (usedNumbers.has(...))` loop only inspects the prop — two creates in the same tick produce the same number (see P2 duplicate findings). (b) The regex `/(\d+)\s*$/` against any legacy `wo-<timestamp>`-style orderNumber yields a 13-digit number, so the "next" number becomes e.g. `WO-2026-1712345678902` — absurd numbers that then persist in the sequence. (c) `id: wo-${Date.now()}` collides for same-millisecond creates (both forms), and `cust-${Date.now()}` for customerIds.
- **Impact:** Duplicate/absurd voucher numbers; same-ms id collisions overwrite records on upsert (create A then B in same ms → B replaces A silently).
- **Fix:** Add a module-scoped issued-numbers Set consulted by both forms; filter the max-regex to the `WO-\d{4}-\d+` shape; use `crypto.randomUUID()` for ids.

### [P2] Transient offline (navigator.onLine=false) unmounts the entire app — mid-form state is lost
- **File:** src/App.tsx:1786-1797
- **Issue:** `if (!isOnline) return <main>Internet connection required…</main>` replaces the whole UI tree (including the form the user is typing into) whenever the browser flips offline — even for a second. All component state (half-entered ticket, filters, scroll) is destroyed, and the offline queue can never be used interactively because the UI is gone while offline. This contradicts the offline-queue feature set (OfflineSyncStatusBadge, indexedDB queue) which only ever fills from write-failures-while-online.
- **Impact:** Lost work on flaky connections (common on shop Wi-Fi / mobile hotspots); the advertised offline mode is unreachable.
- **Fix:** Render an overlay/banner instead of unmounting the app (keep state), or gate only the write path; at minimum keep the form mounted behind the notice.

### [P2] Intake-created tickets never consume inventory — all line items are isLabor with no partId
- **File:** src/components/intake/CreateTicketSoloPage.tsx:472-482; src/components/intake/SimpleTicketCreator.tsx:258-268; src/App.tsx:1409-1412 (handleConsumeInventoryFromWorkOrder filters `item.partId && !item.isLabor`)
- **Issue:** Both intake forms map every selected repair to `{ isLabor: true, unitPrice: basePrice, unitCost: basePrice*0.5 }` with **no `partId`**, even for parts-swap repairs ("Display Original", "Battery"). `handleConsumeInventoryFromWorkOrder` only deducts stock for lines with `partId` → parts used on intake-created tickets are never deducted from stock, and no inventory-consumption expense is recorded. (Additionally, `unitCost: Math.round(basePrice * 0.5)` fabricates a 50% cost for every labor line, so profit reports show a fixed 50% margin on labor.)
- **Impact:** Stock levels never decrease for the main ticket-creation flow → inventory reports permanently wrong; profit margins overstated.
- **Fix:** Map catalog repairs to real part SKUs when the catalog row has a part, or add an optional partId picker per repair line; keep `isLabor` only for genuine labor services; derive `unitCost` from the part's cost price when available.

---

### [P3] StatusBadge vs StatusChip color disagreement + Taken Out renders as "unknown"
- **File:** src/components/common/StatusBadge.tsx:65-90; src/components/common/StatusChip.tsx:20-38
- **Issue:** `'Customer Not Repair'` is amber/warning in StatusBadge but rose/danger in StatusChip. `'Taken Out'` (completed + paid) renders `bg-surface text-muted` — visually identical to the default/unknown fallback in both components, so a finished-then-taken-out ticket looks greyed-out/error-ish rather than complete.
- **Impact:** Inconsistent status semantics across modules (intake roster vs POS/QA chips); Taken Out reads as "missing" to staff.
- **Fix:** Unify the two components' mappings (single shared tone map); give Taken Out a distinct completed tone (e.g., ink/success border).

### [P3] Side-effect saves inside setState updaters — impure updaters, double-write in StrictMode dev
- **File:** src/App.tsx:1280-1286 (handleUpdateWorkOrderStatus), :1644-1656 (handleSavePostRepairChecklist), :1402-1407 (handleUpdatePartStock), :1416-1425 (handleConsumeInventoryFromWorkOrder), :1564-1576 (handleSettleInventoryFund), :1628-1642 (handleRecordSupplierPayment), :1706-1716 (handleUpdatePayoutStatus)
- **Issue:** `saveDocument(...)` is invoked inside the `prev.map(...)` updater function. React may invoke updaters more than once (StrictMode dev double-invoke; future concurrent features), causing duplicate `saveDocument` calls (double upserts; duplicate offline-queue entries if offline). Updaters should be pure.
- **Impact:** Dev double-writes; queue bloat in offline/failure scenarios; latent risk under concurrent rendering.
- **Fix:** Compute the updated object outside the updater from the current state (or inside the updater without side effects, then save in an effect keyed on the change).

### [P3] Received-date input allows future dates
- **File:** src/components/intake/CreateTicketSoloPage.tsx (Received Date input, ~:1100-1110); src/components/intake/SimpleTicketCreator.tsx (date input ~:510)
- **Issue:** `<input type="date">` has no `max` (and no `min`). A staff member can pick tomorrow/next month → `createdAt` stored in the future → tickets sort to the top, "Today" date filters exclude them, warranty-clock and dashboard analytics skew.
- **Fix:** Add `max={todayISO}` (allow backdating only).

### [P3] Photo-size copy says 4MB, code enforces 8MB
- **File:** src/components/intake/CreateTicketSoloPage.tsx:1571-1590
- **Issue:** The helper text reads "Up to 4MB per photo" while the check is `file.size > 8_000_000` and compressImageFile re-encodes anyway.
- **Impact:** Misleading copy only.
- **Fix:** Align text with the 8MB check (or lower the check to 4MB).

### [P3] Roster sort uses `new Date(b.createdAt)` with no fallback — NaN comparator on missing dates
- **File:** src/components/intake/IntakeWorkOrderModule.tsx:184-186
- **Issue:** `new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()` yields NaN when `createdAt` is undefined (legacy tickets) → comparator returns NaN → sort order unstable/undefined (engine-dependent).
- **Impact:** Legacy tickets may float in arbitrary order in the roster.
- **Fix:** `new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()`.

### [P3] TabIntake warranty select can't represent "No Warranty" (0 days)
- **File:** src/components/settings/tabs/TabIntake.tsx:38-48
- **Issue:** The `defaultWarrantyDays` select offers 30–365 only, while `WARRANTY_OPTIONS` in deviceData.ts includes `{ label: 'No Warranty', days: 0 }`. If a ticket/setting carries 0, the select shows blank (no matching option).
- **Impact:** Setting UI can't express no-warranty default; blank select display for 0.
- **Fix:** Add `<option value={0}>No Warranty</option>`.

### [P3] Timeline pipeline misrepresents terminal-status tickets ("Cant Repair" shows all stages as Upcoming)
- **File:** src/components/common/WorkOrderStatusTimeline.tsx:101-103 (`currentStageIndex: currentIdx >= 0 ? currentIdx : 0`), render at :300-330
- **Issue:** For `Cant Repair` / `Customer Not Repair`, `findIndex` returns -1 → index forced to 0 → every stage computes `isPassed = idx < 0` = false and `isCurrent` = false → all five stages render dimmed "Upcoming" beneath the red terminal banner.
- **Impact:** Misleading progress display for exception tickets (cosmetic).
- **Fix:** For terminal statuses, render all prior stages as Completed, or hide the pipeline and keep only the terminal banner.

---

## Verified-as-fixed / non-issues (explicitly checked per the hunt list)
- **Discount double-apply:** stays fixed — `updateRepairDiscount` clamps 0–100 and recomputes `finalPrice = basePrice × (1 − pct/100)`; `totalAmount = Σ finalPrice`; `subtotal = Σ basePrice`; `discountAmount` stays 0; lineItems carry `lineItemDiscountPercent`. Single discount application confirmed in both intake forms and in `handleMarkPaid`'s laborRevenue math.
- **Status string mismatches:** none found — all comparisons use the canonical `WorkOrderStatus` strings ('In Progress', not 'in-progress').
- **ID regeneration on edit:** CreateTicketSoloPage preserves `id`/`orderNumber` on edit (`baseWorkOrder?.id ||`, `baseWorkOrder?.orderNumber ||`); only Simple Ticket's edit path has the clobber bug (P1 #1).
- **Realtime subscription cleanup:** App's `subscribeToCollection` effect has a proper cleanup that unsubscribes all 12 collections (App.tsx:406-446).
- **Toast dedup:** identical message+type+title toasts are skipped (App.tsx:560-566).
- **QA save preserves 'Taken Out':** `handleSavePostRepairChecklist` keeps `'Taken Out'` (App.tsx:1650) — confirmed per business context.
- **Wizard step skipping:** register path re-validates all steps (`repairCount === 0` → blocked with step-3 error), so the clickable step chips can't bypass validation.

## Summary
- **Total findings: 23** — **P1: 2, P2: 13, P3: 8**
- Most critical:
  1. **P1 — Simple Ticket edit clobbers workflow/payment/QA/photo/log data** (SimpleTicketCreator.tsx:205-299): every edit through the "Edit existing ticket" dropdown rebuilds the record from scratch with `status: 'Receive'`, `isPaid: false`, and wipes QA/after-diagnostics/photos/logs/completedAt — full-object upsert makes it permanent DB data loss.
  2. **P1 — Offline-queue replay overwrites newer live writes with stale queued copies** (supabase.ts): a failed write is queued as-is (no dedup/version check); the next successful save auto-flushes the queue and replays the older copy over the newer data.
  3. **P2 — 'Finished' QA gate is warning-only + reopen-QA keeps afterDiagnostics** (App.tsx:1250-1287, :1663-1683): tickets can be marked Finished without any post-repair checklist on every UI path (only POS checkout blocks them), and after a reopen the old diagnostics still satisfy the gate so re-inspection can be skipped.
