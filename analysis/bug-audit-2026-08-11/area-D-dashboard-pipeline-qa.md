# Area D — Micro-Level Bug Audit: Dashboard / Pipeline / Trello / QA / Follow-Up / techAnalytics

**Date:** 2026-08-11
**Repo:** i35erp-stable-v1 (branch v1.1) — READ-ONLY audit, no files modified
**Scope:** DashboardOverview.tsx, TechnicianDetailModal.tsx, TechnicianLeaderboardView.tsx, TechnicianPerformanceTab.tsx, StatusPipelineView.tsx, TrelloBoardModule.tsx, QualityAssuranceModule.tsx, CompletedDeviceFollowUpModule.tsx, MermaidModule.tsx, techAnalytics.ts (+ supporting reads: DateFilterSelector.tsx, App.tsx status/payment handlers, lib/supabase.ts, PosInvoicingModule.tsx commission, types/index.ts)

**Summary: 23 findings — 1× P1, 10× P2, 12× P3**

Supabase write pattern note (verified): all writes go through `saveDocument` → `supabase.from('erp_records').upsert(toRows(...))` which replaces the whole `data` column (`src/lib/supabase.ts:54-61,263-288`). No partial `.update()` calls exist in the codebase, so the "partial patch clobber" risk materializes only through **stale full-object writes racing fresh full-object writes** (finding #1) — the write must always carry the newest complete object.

---

### [P1] Checkout double-write race clobbers payment data on the server
- **File:** src/components/pipeline/StatusPipelineView.tsx:436-438 (with src/App.tsx:1250-1275, src/lib/supabase.ts:263-288)
- **Issue:** `handleConfirmCheckout` performs **two** full-object saves in the same tick:
```tsx
if (onSaveWorkOrder) onSaveWorkOrder(updatedWo);          // write #1 — full object WITH isPaid, paidAmount, paymentMethod, checkout log
onUpdateWorkOrderStatus(checkoutModalWo.id, 'Taken Out'); // write #2 — built from STALE state
```
`handleUpdateWorkOrderStatus` (App.tsx:1254) does `const wo = workOrders.find((w) => w.id === workOrderId)` against the **pre-update** state (the `setWorkOrders` from write #1 hasn't committed), then:
```ts
saveDocument('workOrders', updated); // { ...w, status: 'Taken Out', completedAt, updatedAt } — no isPaid/paidAmount/paymentMethod/log
```
Both writes are async full-object upserts; whichever lands last on Supabase wins, and write #2's stale object is missing `isPaid`, `paidAmount`, `paymentMethod` and the checkout repair-log entry.
- **Impact:** Payment record loss — after reload the ticket shows unpaid / no payment method / missing "POS Checkout" log entry, so Revenue/Collected analytics understate income. Intermittent (race), worst-case P1 money data loss. The same pattern exists in both `DiagnosticSoftAlert` overrides (StatusPipelineView.tsx:1325-1344 and 1371-1390: `onSaveWorkOrder(updatedWo)` then `onUpdateWorkOrderStatus(...)`), which can clobber the "⚠️ …Notice" log entry.
- **Fix:** In `handleConfirmCheckout` (and the two override flows) drop the second call — `onSaveWorkOrder(updatedWo)` already contains the new status; make `handleSaveWorkOrder` stamp `completedAt` when the object's status is `Finished`/`Taken Out` and `!wo.completedAt`, mirroring the logic in `handleUpdateWorkOrderStatus`.

### [P2] Pipeline checkout bypasses handleMarkPaid — no inventory consumption, no commission payout, no idempotency guard
- **File:** src/components/pipeline/StatusPipelineView.tsx:412-440; src/App.tsx:1528-1630, 2615
- **Issue:** `handleMarkPaid` (which calls `handleConsumeInventoryFromWorkOrder` at App.tsx:1536, creates/updates the technician commission payout at App.tsx:1588-1627, and guards double-payment at App.tsx:1534-1538) is wired **only** to the POS module (App.tsx:2615). The pipeline's own full checkout modal ("Confirm Checkout & Move to Taken Out") calls `onSaveWorkOrder` + `onUpdateWorkOrderStatus` instead.
- **Impact:** A ticket checked out from the pipeline (Finished → Checkout) never records the inventory-fund expense, never creates the technician payout (Finance → Commissions is missing those tickets, so commissions understate and payouts differ depending on which screen the checkout happened on), and double-clicking Confirm fires two writes with no "already paid" guard (compound of finding #1).
- **Fix:** Route the pipeline checkout through `handleMarkPaid` (pass it down or lift the payment handler), or replicate its inventory-consumption + payout + idempotency logic in the pipeline path.

### [P2] Finance KPI cards render the literal text "{currency}" instead of the currency symbol
- **File:** src/components/dashboard/DashboardOverview.tsx:1192, 1199, 1205, 1212
- **Issue:** Template literals don't interpolate `{currency}` — only `${...}`:
```tsx
<KpiCard label="Total Revenue" value={`${totalRevenue.toLocaleString()} {currency}`} ... />
<KpiCard label="Gross Profit (Margin)" value={`${totalMargin.toLocaleString()} {currency}`} ... />
<KpiCard label="Total Collected (Paid)" value={`${financialAnalytics.totalCollected.toLocaleString()} {currency}`} ... />
<KpiCard label="Unpaid Pending Balance" value={`${financialAnalytics.totalUnpaidBalance.toLocaleString()} {currency}`} ... />
```
- **Impact:** All four Finance-subtab KPI cards display e.g. "1,234,567 {currency}". Cosmetic in content but a visible display bug on a money screen.
- **Fix:** Use `value={`${totalRevenue.toLocaleString()} ${currency}`}`.

### [P2] Dashboard technician commission math diverges from POS/Finance commission
- **File:** src/utils/techAnalytics.ts:95-98, 140-148; compare src/components/pos/PosInvoicingModule.tsx:323-350 and src/App.tsx:1583-1600
- **Issue:** Two independent divergences between `computeTechStats().estCommission` and the canonical commission (POS `estCommission` + Finance payout):
  1. **Base:** `getLaborRevenue` sums `(i.unitPrice || 0) * (i.quantity || 1)` with **no per-item discount**, while POS and the payout both subtract `lineItemDiscountPercent` before applying the rate (`Math.round(lineTotal * (disc/100))`).
  2. **Rate selection:** `getRepairType` uses keyword rules (`HARDWARE_KEYWORDS` incl. "no power", "short", "wifi", "water") at techAnalytics.ts:55-57, while POS/payout use only `repairTypeAI || serviceType === 'Micro-Soldering'`.
- **Impact:** For any discounted ticket, the dashboard's Est. Commission is higher than what POS/finance actually pays. A "No Power" ticket (keyword-hardware) is charged at the hardware rate on the dashboard but the parts rate in POS/payout — same ticket, three different commission numbers across the app.
- **Fix:** Reuse the exact POS/payout formula: labor base after per-item discounts, rate from `repairTypeAI || serviceType==='Micro-Soldering'`. Consider exporting the payout computation to one shared util.

### [P2] Trello date filter uses rolling windows and silently ignores custom ranges
- **File:** src/components/trello/TrelloBoardModule.tsx:87-95
- **Issue:** The board re-implements date filtering instead of using the shared `filterByDateRange`/`isDateMatchingFilter`:
```ts
let windowMs = now;
if (dateFilter.preset === 'today') windowMs = now - DAY;          // rolling 24h, NOT calendar day
else if (dateFilter.preset === '7days') windowMs = now - 6 * DAY; // rolling
...
// 'custom' falls through: windowMs = now → created < now → filter is a no-op
```
The shared filter (DateFilterSelector.tsx:307-346) uses local-midnight calendar windows and handles `custom` properly.
- **Impact:** With the navbar "Today" filter, the Trello board shows the last 24 rolling hours (at 3 PM it includes yesterday 3 PM–3 PM) while Pipeline/Dashboard show calendar-today — the two boards disagree. Selecting a custom date range silently shows ALL tickets (the filter appears active but does nothing).
- **Fix:** Replace the inline window logic with `isDateMatchingFilter(wo.createdAt, dateFilter)` exactly as the pipeline does (StatusPipelineView.tsx:511).

### [P2] QA form is wiped by unrelated updates — effect deps include `technicians` and a changing `selectedWo`
- **File:** src/components/qa/QualityAssuranceModule.tsx:199-245
- **Issue:** The form-initialization effect deps are `[selectedWoId, selectedWo, technicians]`. `selectedWo` is re-derived from `workOrders` each render, so **any** workOrders change (realtime sync, another tab saving, another device editing) produces a new object reference and re-runs the effect, which rebuilds `qaData`, `qaDiagnostics` (statuses+notes), and resets `qaBeforePhotos`/`qaAfterPhotos` from the ticket. `technicians` in the deps is pure churn.
- **Impact:** A QA inspector mid-way through the 21-point checklist loses all verdicts and notes whenever any unrelated update arrives — work must be re-entered, and a partially-tested device could be re-passed by "All Pass" defaults without the inspector noticing.
- **Fix:** Remove `technicians` from the deps; depend on `selectedWoId` only and read the WO from a ref, or snapshot the ticket when the modal opens (key the modal by `selectedWoId` so state initializes per-ticket instead of via a resetting effect).

### [P2] Typing a search query while the QA modal is open silently retargets it to another ticket
- **File:** src/components/qa/QualityAssuranceModule.tsx:121-129, 88-98
- **Issue:** `filteredWorkOrders` is recreated on every render (not memoized), so the re-anchor effect `[filteredWorkOrders, selectedWoId]` runs after **every** render:
```ts
useEffect(() => {
  if (skipRetargetRef.current) { skipRetargetRef.current = false; return; }
  if (selectedWoId && !filteredWorkOrders.some((workOrder) => workOrder.id === selectedWoId)) {
    setSelectedWoId(filteredWorkOrders[0]?.id || '');
  }
}, [filteredWorkOrders, selectedWoId]);
```
The shared navbar search filters the roster; if the query excludes the ticket currently open in the QA modal, the effect re-anchors to the first remaining ticket (or `''` → modal closes). The modal body is driven by `selectedWo = filteredWorkOrders.find(...)`, so the form then re-initializes for the *other* ticket (compound of finding #6).
- **Impact:** "Confirm QA Pass" can stamp the wrong ticket's post-repair checklist, or the inspection silently vanishes. The skip-retarget guard only covers the after-pass case, not the search case.
- **Fix:** Gate the re-anchor effect on the modal being closed (`if (isQaModalOpen) return;`), and/or memoize `filteredWorkOrders` so the effect only runs on actual data changes; use `useRef` for the "current ticket id" while the modal is open.

### [P2] Checkout amount: entering 0 is coerced to the full total — free/zero-balance checkout impossible
- **File:** src/components/pipeline/StatusPipelineView.tsx:414
- **Issue:** `const amount = Number(paidAmountInput) || checkoutModalWo.totalAmount;` — `Number("0")` is `0`, which is falsy, so a zero amount silently becomes the full `totalAmount`.
- **Impact:** A fully-deposit-paid or discounted-to-zero ticket cannot be checked out with $0 due; the record shows the customer paid the full total (wrong money in the log + `paidAmount`), and "Confirm Checkout" overstates collected revenue.
- **Fix:** `const amount = paidAmountInput.trim() === '' ? checkoutModalWo.totalAmount : Number(paidAmountInput);`

### [P2] Top Repair Devices / Categories count non-revenue tickets and quoted estimates as revenue
- **File:** src/components/dashboard/DashboardOverview.tsx:381-395, 397-445
- **Issue:** Both blocks iterate **all** `filteredWorkOrders` with no status gate:
```ts
filteredWorkOrders.forEach((wo) => { ... entry.count += 1; entry.revenue += wo.subtotal || wo.totalAmount || 0; });
```
This includes `Cant Repair`, `Customer Not Repair`, and still-open quotes (`Receive`/`In Progress`/`Pending`). The same file's `REVENUE_STATUSES` comment states "quoted subtotals on tickets that were never repaired (Cant Repair / Customer Not Repair) are NOT revenue" (lines 601-605), and the Revenue KPI card correctly counts only Finished/Taken Out.
- **Impact:** "Top Repair Devices" shows declined tickets as completed repairs, and device/category "revenue" columns disagree with the Total Revenue KPI and with the Finance tab; a shop with many Cant-Repair quotes sees inflated device revenue. Category percentages are also computed against that inflated total.
- **Fix:** Filter to revenue-eligible statuses before aggregating (or at minimum exclude `Cant Repair`/`Customer Not Repair`), matching `revenueWorkOrders`.

### [P2] "Bottleneck >48h" is measured from updatedAt — any edit resets the clock
- **File:** src/components/pipeline/StatusPipelineView.tsx:256-261
- **Issue:** `getHoursInStatus` anchors to `wo.updatedAt || wo.createdAt`. `updatedAt` is bumped by **every** save: repair-log entries (handleAddRepairLog), quick-assign (handleQuickAssign), follow-up logs, QA saves — not just stage changes.
- **Impact:** A ticket stuck in `Receive` for 5 days stops being flagged as a bottleneck the moment someone adds a log or reassigns it; the ">48h" filter (`showBottlenecksOnly`) and the red banner silently miss genuinely stagnant tickets. The metric measures "hours since last edit", not "hours in stage".
- **Fix:** Add a `statusChangedAt` timestamp set only in `handleUpdateWorkOrderStatus`/checkout, and anchor `getHoursInStatus` to it (fall back to `updatedAt`).

### [P2] Tech load falls back to a stale static count whenever the date filter hides active jobs
- **File:** src/utils/techAnalytics.ts:123 (used by DashboardOverview.tsx tech-kpi tab)
- **Issue:** `const activeCount = activeOrders.length > 0 ? activeOrders.length : tech.activeJobsCount;` — `activeOrders` derives from **date-filtered** `workOrders` (DashboardOverview passes `filteredWorkOrders`). Under a "Today"/"7 Days" filter, a tech's active jobs created earlier are excluded from the list, so `activeOrders.length === 0` and the code falls back to `tech.activeJobsCount` — a static field that is not recomputed when tickets move.
- **Impact:** Load badges ("Heavy"/"Available"), the queue-imbalance banner, and leaderboard Active counts show numbers that contradict the visible board whenever a date filter is active; a tech with 0 real active jobs can show "Heavy" from a stale record.
- **Fix:** Drop the fallback (`activeCount = activeOrders.length`) or compute active orders from the unfiltered `workOrders` prop specifically for the load metric.

---

### [P3] Revenue & Repairs Trend window mismatches the KPI under "All Dates"
- **File:** src/components/dashboard/DashboardOverview.tsx:508, 544
- **Issue:** With `preset: 'all'`, `filteredWorkOrders` (and thus the Total Revenue KPI) spans all time, but the trend window is hard-coded to the trailing 30 days: `windowStartMs = todayStartMs - 29 * DAY_MS`. The trend also buckets by `wo.createdAt`, so a ticket finished yesterday but created 40 days ago appears in revenue KPI (status-based) but not in the chart.
- **Impact:** The "Revenue & Repairs Trend" chart totals and the Total Revenue card disagree whenever data is older than 30 days or jobs span the window boundary; the delta-vs-previous chips are computed on a different population than the cards above them.
- **Fix:** For `preset:'all'` either chart the full span (with the 7-day bucket rule) or label the chart explicitly as "trailing 30 days" and compute deltas on the same window; consider bucketing by `completedAt` for completed-only metrics.

### [P3] Repair Health bars' percentages don't sum to 100 when exception tickets exist
- **File:** src/components/dashboard/DashboardOverview.tsx:767-791
- **Issue:** Bars are computed for 5 statuses (`Receive`/`In Progress`/`Pending`/`Finished`/`Taken Out`) but the denominator is `filteredWorkOrders.length`, which includes `Cant Repair` and `Customer Not Repair`.
- **Impact:** With declined tickets in the window, the five bars visibly under-fill; users can't tell the remainder is the excluded exception statuses.
- **Fix:** Denominator = tickets in the 5 listed statuses, or add the two exception statuses as rows.

### [P3] financialAnalytics counts zero-total tickets as "Fully Settled"
- **File:** src/components/dashboard/DashboardOverview.tsx:447-475
- **Issue:** `const paid = wo.isPaid ? total : (wo.paidAmount || wo.depositAmount || 0); const balance = Math.max(0, total - paid);` — a ticket with `total = 0` (empty quote, still in `Receive`, never priced) yields `balance === 0` and is counted in `paidCount` ("Tickets Fully Settled").
- **Impact:** The Finance Pulse "Paid tickets" count includes never-paid, never-priced open tickets, inflating the settled figure.
- **Fix:** Only count tickets with `total > 0` (or restrict to revenue/terminal statuses) when classifying paid vs unpaid.

### [P3] Warranty expiry off-by-one: a ticket expired <24h ago shows "0d left / expiring soon"
- **File:** src/components/dashboard/DashboardOverview.tsx:546-550
- **Issue:** `remainingDays = Math.ceil((expiryDateMs - now) / ONE_DAY_MS)` — a ticket whose warranty expired 12 hours ago gives `Math.ceil(-0.5) = 0`, so `isExpiringSoon` (0 ≤ 14) is true and `isExpired` (`< 0`) is false. The roster/banner flags it as "expiring soon, 0d left" instead of "Expired (1d ago)".
- **Impact:** Misleading warranty-health label for roughly the first 24 hours after expiry; expired tickets compete with genuinely expiring ones in the "Flagged Expiration" view.
- **Fix:** Use `Math.floor((expiryDateMs - now) / ONE_DAY_MS)` (or compare `expiryDateMs < now` directly) for the expired/expiring classification.

### [P3] Follow-Up "All 7+ Day Due" tab count includes Closed tickets the list excludes
- **File:** src/components/followup/CompletedDeviceFollowUpModule.tsx:153-156 vs 329
- **Issue:** The default `ALL` filter returns `false` for `Closed` tickets, but the tab label counts `followUpEligible.length` (which includes Closed).
- **Impact:** Tab badge says e.g. "All 7+ Day Due (12)" while the table shows 10 rows — count and list disagree on the default view.
- **Fix:** `label: All 7+ Day Due (${followUpEligible.filter((wo) => (wo.followUpStatus || 'Pending Call') !== 'Closed').length})`.

### [P3] Follow-Up nextFollowUpDate is stored and displayed but never drives reminders
- **File:** src/components/followup/CompletedDeviceFollowUpModule.tsx:225-231 (saved), 606-610 (displayed)
- **Issue:** `nextFollowUpDate` is captured and persisted, and the history modal renders "Next Callback: …", but no tab/list sorts or filters by it — the "Callback Scheduled" tab counts tickets by status only, regardless of the scheduled date.
- **Impact:** A callback scheduled for today can sit unreminded; the field gives a false sense of a reminder system.
- **Fix:** Add a "Callbacks due" view (or sort) driven by `nextFollowUpDate` <= today, or drop the field.

### [P3] Turnaround time computed two different ways in the same dashboard
- **File:** src/utils/techAnalytics.ts:91 vs src/components/dashboard/DashboardOverview.tsx:328-338
- **Issue:** `getDurationHours` clamps to `Math.max(0.5, …)` (minimum half hour), while the dashboard's own `avgTurnaroundHours` uses `Math.max(0, …)`. A 20-minute same-day battery swap reads 0.3h on the Avg Turnaround card but 0.5h in tech KPIs/leaderboard.
- **Impact:** Inconsistent averages for the same tickets on the same screen; the 0.5 floor inflates the tech average slightly.
- **Fix:** Use one shared function (keep the floor, or drop it) for both.

### [P3] successRate mixes windowed completions with all-time static warranty returns
- **File:** src/utils/techAnalytics.ts:154-157
- **Issue:** `qualityTotal = liveCompleted + warrantyReturnCount` — `liveCompleted` is the filtered window, but `warrantyReturnCount` is a static per-tech field (all-time). A tech with 1 historical return and 2 completions in a 7-day window shows 67% "QA Pass Rate" despite a perfect week.
- **Impact:** QA pass rates are diluted by stale all-time counters and not comparable across periods.
- **Fix:** Use windowed warranty returns (e.g. tickets with `status === 'In Progress'` + an error-return flag, or a `warrantyReturnAt` timestamp) instead of the static field.

### [P3] Stale drag state: dropping outside any column never clears draggedWoId
- **File:** src/components/pipeline/StatusPipelineView.tsx:632-676 (onDrop), no onDragEnd
- **Issue:** There is no `onDragEnd` handler; only a successful column drop clears `draggedWoId`. Dropping a card on the board background leaves the id set until the next drag.
- **Impact:** Low impact today (next dragStart overwrites), but a future drop path could reuse the stale id — the same pattern also means a drop that opens the checkout/diag-alert modal (return paths) clears the state, while an aborted drag doesn't.
- **Fix:** Add `onDragEnd={() => setDraggedWoId(null)}` on cards (or `onDragLeave` on the board).

### [P3] Trello board has no exception columns — Cant Repair / Customer Not Repair tickets are invisible
- **File:** src/components/trello/TrelloBoardModule.tsx:16-21 (STAGE_COLUMNS has only 5 entries)
- **Issue:** Unlike the pipeline (which has the Show Exceptions toggle), the Trello board has no `Cant Repair` / `Customer Not Repair` columns and no way to reveal them.
- **Impact:** Declined tickets vanish from the Trello view with no count or toggle; users can't see or reopen them from the board.
- **Fix:** Add the two exception columns (hidden behind a toggle like the pipeline) or surface their counts in the header.

### [P3] Mermaid: `securityLevel: 'loose'` + innerHTML render output; re-initialized every keystroke
- **File:** src/components/mermaid/MermaidModule.tsx:14-38
- **Issue:** `mermaid.initialize({ securityLevel: 'loose', … })` inside the effect, then `previewRef.current.innerHTML = output.svg` — loose mode allows clickable links/HTML labels, and the output is injected unsanitized-by-hand. The effect also re-initializes mermaid on every keystroke with no debounce; fast typing can interleave two async `mermaid.render` calls sharing `renderIdRef.current` (the second removes the first's temp element → transient "element not found" error flash).
- **Impact:** Self-XSS surface (user pastes diagram → rendered HTML in the app context; low risk for a local tool but unnecessary) plus wasted re-render work and possible error flicker while typing.
- **Fix:** Initialize once outside the effect, use `securityLevel: 'strict'`/`'default'`, debounce the render (e.g. 300ms), and give each render a unique id.

### [P3] Inventory-fund reminder is date-filtered despite promising "Stays visible until settled"
- **File:** src/components/dashboard/DashboardOverview.tsx:587-589
- **Issue:** `pendingFundTickets = filteredWorkOrders.filter(...)` — with the header filter on "Today" or "7 Days", unsettled tickets from earlier days disappear from the reminder banner and the "Mark All Settled" button.
- **Impact:** The banner's contract ("Stays visible until settled") breaks under any non-"All" date filter; unsettled funds can be silently missed.
- **Fix:** Compute pending fund tickets from the unfiltered `workOrders` (warranty-check style).

---

## Verified-OK highlights (no action needed)
- QA status preservation: `handleSavePostRepairChecklist` keeps `Taken Out` intact (App.tsx:1654-1656). ✅
- Same-column drop guard + hidden-stage filter never empties the board (pipeline `KANBAN_STAGES` filter StatusPipelineView.tsx:660-664; Trello handleDrop guard). ✅
- QA `canConfirm` gate (verdict + optional photo gate) and the after-pass skip-retarget ref exist and work for their intended (post-pass) case. ✅
- `filterByDateRange` 'today' uses local-midnight correctly for UTC+6:30 (DateFilterSelector.tsx:313-323). ✅
- `completedAt` is stamped once on Finished/Taken Out and preserved on later edits (App.tsx:1262-1268); warranty clock anchors to it. ✅
- Avg Rating correctly shows '—' when no rated follow-ups exist (CompletedDeviceFollowUpModule.tsx:127-134). ✅
- All Supabase writes are full-object upserts — no partial-patch clobber pattern in normal paths (only the #1 race). ✅
