# Area F — Common Components + UI Kit: Micro-Level Bug Audit

Date: 2026-08-11 · Branch v1.1 · READ-ONLY audit (no files modified, no builds run)

Scope: `src/components/common/*` (16 files), `src/components/devices/DeviceModelChooserModal.tsx`, `src/components/ui/*` (8 files).
Verified against: `html5-qrcode@2.3.8` source (constructor throws when element missing), `src/lib/utils.ts` (cn = clsx + tailwind-merge), `src/components/pos/PosInvoicingModule.tsx` (subtotal/tax/discount semantics + legacy self-heal), `src/utils/seedTickets.ts` (legacy WO data), `src/types/index.ts`, `src/types/priceCatalog.ts`, call sites in App.tsx / IntakeWorkOrderModule.tsx / CreateTicketSoloPage.tsx / CrmCustomerPortalModule.tsx.

Severity: **P1** = data loss/crash/security · **P2** = wrong behavior/edge case · **P3** = cosmetic/minor.

---

## P2 findings

### [P2] Camera QR scanner: "Upload Photo" tab is 100% broken — mount element only exists on the Camera tab
- **File:** src/components/common/CameraQrScannerModal.tsx:273–295 (`handleFileUpload`) and ~line 305 (`<div id="reader-file-temp" className="hidden" />`)
- **Issue:** The hidden mount element is rendered *inside* the camera-tab conditional:
  ```jsx
  {activeTab === 'camera' && (
    <div className="space-y-3">
      ...
      <div id={scannerContainerId} className="w-full h-full text-white" />
      {/* Hidden temp mount for file upload */}
      <div id="reader-file-temp" className="hidden" />
    </div>
  )}
  ```
  When the user switches to the **Upload** tab, that JSX unmounts, so `document.getElementById('reader-file-temp')` returns null. `handleFileUpload` then runs `new Html5Qrcode('reader-file-temp', false)`, and html5-qrcode@2.3.8's constructor throws synchronously (`if (!document.getElementById(elementId)) { throw "HTML Element with id=... not found" }` — verified in `node_modules/html5-qrcode/esm/html5-qrcode.js:88`). The throw is swallowed by the generic `catch` which shows "Could not read barcode from image. Ensure the label is clear and well lit." — **every upload attempt fails, no matter the image**.
- **Impact:** The entire "Upload Photo" scanning feature is dead. There is no working path: the file input is only rendered on the Upload tab, where the element is guaranteed missing. Users silently get a misleading "bad image" error; the app's documented recovery path (upload barcode photo when camera is unavailable — see the "No camera hardware detected" message) never works.
- **Fix:** Move `<div id="reader-file-temp" className="hidden" />` outside the camera-tab conditional (sibling of the viewfinder container, always mounted while the modal is open). Optionally also `event.target.value = ''` so re-selecting the same file re-fires `onChange`.

### [P2] DrawerSelect: ESC keydown listener added on every open, never removed — listener leak
- **File:** src/components/common/DrawerSelect.tsx:57–66
- **Issue:** The open-effect registers an anonymous ESC handler on `document` but the cleanup only removes the scroll/resize listeners:
  ```jsx
  useEffect(() => {
    if (!open) return;
    const closeOnOutside = (e: Event) => { ... };
    window.addEventListener('scroll', closeOnOutside, true);
    window.addEventListener('resize', closeOnOutside);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
    return () => {
      window.removeEventListener('scroll', closeOnOutside, true);
      window.removeEventListener('resize', closeOnOutside);
      // ← document keydown listener is never removed
    };
  }, [open, close]);
  ```
- **Impact:** Every open→close cycle of any DrawerSelect permanently adds a document-level keydown listener holding a closure over that instance. With several DrawerSelect instances (filter drawer uses many) and repeated open/close over a long session, listeners accumulate unboundedly (memory leak + needless global ESC handling on stale instances). Each stale listener also calls `close()` on its old closure when ESC is pressed later.
- **Fix:** Hoist the keydown handler to a named function and remove it in the cleanup:
  ```js
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  return () => { window.removeEventListener('scroll', closeOnOutside, true); window.removeEventListener('resize', closeOnOutside); document.removeEventListener('keydown', onKey); };
  ```

### [P2] CustomDropdownMenu + DrawerSelect: no vertical viewport clamp — portal menus render off-screen (top or bottom)
- **File:** src/components/common/CustomDropdownMenu.tsx:96–105 (computeMenuPos) and src/components/common/DrawerSelect.tsx:36–42 (toggle)
- **Issue:** Both components clamp `left` horizontally (`left = Math.max(VIEWPORT_MARGIN, Math.min(left, window.innerWidth - MENU_WIDTH - VIEWPORT_MARGIN))`) but never clamp `top`. The menu height is unbounded relative to the clamp: `max-h-64` (256px) + `p-1.5` + shadow ≈ up to ~296px, and DrawerSelect's `max-h-56` ≈ ~240px.
  - Flip logic in CustomDropdownMenu: `placeTop = spaceBelow < MENU_MIN_HEIGHT && spaceAbove > spaceBelow` → when `spaceBelow < 232 && spaceAbove > spaceBelow` but `spaceAbove < ~296`, the menu is placed at `top: rect.top - 8` with `-translate-y-full`, so its top edge lands at `rect.top - 8 - menuHeight` → **negative → hangs off the top of the viewport** (e.g., trigger at y≈150 on a 600px viewport: top ≈ −154px).
  - Same class of bug at the bottom: trigger at y≈450 on a 700px viewport → placed at `rect.bottom + 8` = 458, menu bottom = 458+296 = 754 > 700 → bottom options clipped/unreachable.
  - DrawerSelect has the identical pattern (`MENU_MIN_HEIGHT = 120`, no top clamp).
- **Impact:** On short viewports / phones (the exact scenario the comment claims to protect: "can never escape the viewport edge on phones"), the open menu is partially or fully off-screen; topmost/bottommost options are unreachable, and the page may scroll-jump.
- **Fix:** After computing `top`, clamp with the estimated menu height: `top = Math.max(VIEWPORT_MARGIN, Math.min(top, window.innerHeight - MENU_MAX_HEIGHT - VIEWPORT_MARGIN))`, and re-choose `placeTop` if the clamped value would put the menu over the trigger (or measure the menu with a ref after first paint and clamp then, as done in the rAF in `open`).

### [P2] PrintableInvoiceModal: parts (non-labor line items) are silently omitted from the itemized table AND the final balance — legacy WOs print an understated invoice
- **File:** src/components/common/PrintableInvoiceModal.tsx:47–52 (labor-only math), 102–110 (table renders only `laborItemsWithTotals`)
- **Issue:** The invoice is built exclusively from labor items:
  ```js
  const laborItems = workOrder.lineItems?.filter((item) => item.isLabor) || [];
  const laborSubtotal = laborItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  ...
  const customerTotal = Math.max(0, laborSubtotal - laborDiscount + workOrder.taxAmount - workOrder.discountAmount - (workOrder.depositAmount || 0));
  ```
  Non-labor line items (`isLabor: false`, i.e. parts) appear nowhere: not in the itemized table, not in any subtotal line, not in "Final Balance Due". The current POS semantics ("parts tracked, not charged", PosInvoicingModule.tsx:449) make this correct for *new* WOs, but **legacy data charged parts**: seed WO-2026-0003 (seedTickets.ts:182–193) has `lineItems` = part 150,000 + labor 150,000, `subtotal: 300000`, `discountAmount: 20000`, `depositAmount: 100000`, `totalAmount: 280000`. Printing its invoice yields `customerTotal = 150000 − 0 + 0 − 20000 − 100000 = 30,000` — the printed "Final Balance Due" is 30,000 MMK while the stored total is 280,000 MMK, and the 150,000 MMK part charge is missing from the document entirely. The CRM portal prints invoices (`CrmCustomerPortalModule.tsx:595`) for WOs that were never run through the POS self-heal migration, so legacy-format WOs reach the printer unchanged.
  - Secondary aspect of the same legacy gap: for old-format WOs where `unitPrice` is already the FINAL price and `discountAmount` duplicates the embedded discount (exactly what the POS self-heal detects and neutralizes at PosInvoicingModule.tsx:415–419), the invoice subtracts `workOrder.discountAmount` unconditionally → **double discount** in the printed total.
- **Impact:** Printed invoices can materially understate what the customer owes (and omit charged parts) for legacy/imported work orders — a real money/trust problem when handed to a customer.
- **Fix:** Mirror the POS reconciliation rules in the invoice: if any line item has `lineItemDiscountPercent`, use `discountAmount` as an extra invoice-level discount; otherwise treat `discountAmount` as already embedded (`effectiveDiscount = hasPerItemDiscount ? discountAmount : 0`). For the parts question, either (a) include non-labor line items in the table and add them to `customerTotal`, or (b) explicitly state "Parts: internal / not charged" on the invoice so a missing part row can never be mistaken for an omission — and at minimum add a mismatch guard when `laborSubtotal` doesn't reconcile with stored `subtotal`/`totalAmount`.

### [P2] ConfirmDialogHost: Enter key confirms regardless of which element has focus — pressing Enter on "Cancel" triggers the destructive action
- **File:** src/components/common/ConfirmDialog.tsx:52–60
- **Issue:** A window-level keydown handler treats Enter as unconditional confirm:
  ```js
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') close(false);
    else if (e.key === 'Enter') close(true);
  };
  window.addEventListener('keydown', onKey);
  ```
  There is no check of `document.activeElement`. If a keyboard user tabs to the **Cancel** button (or the X close button) and presses Enter, the dialog resolves `true` — the action is confirmed, not cancelled. (The button's own click would also fire, but the keydown handler wins the race and the first `resolve` sticks.)
- **Impact:** Keyboard-only users can accidentally confirm destructive operations (delete / recycle-bin moves) that they explicitly navigated to cancel. All `confirmDialog({danger: true})` call sites are exposed.
- **Fix:** Only confirm on Enter when focus is on the confirm button (`document.activeElement === confirmBtnRef.current`), or drop the Enter shortcut entirely and let the focused button handle it natively.

### [P2] DateFilterSelector: custom range with endDate < startDate is accepted silently and yields an empty list
- **File:** src/components/common/DateFilterSelector.tsx:120–132 (`handleApplyCustomRange`), 165–169 (`filterByDateRange` custom branch)
- **Issue:** No validation that `tempEndDate >= tempStartDate` before applying:
  ```js
  const handleApplyCustomRange = () => {
    if (tempStartDate) {
      onChange({ preset: 'custom', startDate: tempStartDate, endDate: tempEndDate || tempStartDate });
    }
    setShowCalendarModal(false);
  };
  ```
  The filter then computes `startMs = new Date(start + 'T00:00:00')` and `endMs = new Date(end + 'T23:59:59')`; with `end < start`, `startMs > endMs` and the predicate `itemTime >= startMs && itemTime <= endMs` matches nothing.
- **Impact:** User picks a reversed range (easy with two `<input type="date">` fields — e.g., 20 Aug → 10 Aug), the popover closes, and the ticket list silently becomes empty with no explanation. Data is not lost (state still holds the range) but the UI gives zero feedback about why "no results".
- **Fix:** In `handleApplyCustomRange`, if `tempEndDate && tempEndDate < tempStartDate`, show an inline error (or swap the dates) instead of applying; also disable the Apply button while the range is invalid.

---

## P3 findings

### [P3] DeviceTagPrinterModal: lineItems fallback ignores lineItemDiscountPercent — printed rows don't sum to the shown total
- **File:** src/components/common/DeviceTagPrinterModal.tsx:107–115
- **Issue:** When `selectedRepairs` is empty, the fallback builds rows with `discountPercent: 0` and `finalPrice: item.unitPrice * item.quantity` — the per-item `lineItemDiscountPercent` is dropped:
  ```js
  : (workOrder.lineItems || []).map((item) => ({
      id: item.id,
      name: item.description,
      basePrice: item.unitPrice * item.quantity,
      discountPercent: 0,
      finalPrice: item.unitPrice * item.quantity,
    }));
  ```
  The footer "Estimated Total Charge" however always prints `workOrder.subtotal`, which for new-format WOs is the **discounted** labor sum.
- **Impact:** For any WO with discounted line items but no `selectedRepairs` (e.g., migrated/edited tickets where only lineItems survive), the printed A4 voucher shows each item at its undiscounted price with "0%" discount, while the total row is lower — the document internally contradicts itself and the discount is invisible.
- **Fix:** In the fallback, compute `discountPercent: item.lineItemDiscountPercent || 0` and `finalPrice: Math.round(item.unitPrice * item.quantity * (1 - (item.lineItemDiscountPercent || 0) / 100))`.

### [P3] DeviceTagPrinterModal: 3"×2" sticker page math — edges clipped and/or second page printed
- **File:** src/components/common/DeviceTagPrinterModal.tsx:198–200 (`@page`), 349 (`tag-printable-area`)
- **Issue:** For the tag, `@page { size: 3in 2in; margin: 4mm }` leaves a printable area of ~2.69in × ~1.69in, but the tag is forced to `width: 76.2mm !important` (= 3in exactly, `.tag-printable-area`). 76.2mm content + 8mm horizontal margins > 76.2mm page → the sticker is wider than the printable region; browsers will clip (or auto-shrink) the right edge including the border and QR. Vertically, the tag content (header row + model + customer/passcode + S/N/color + barcode strip + 46px QR with caption + 4mm×2 padding) comfortably exceeds the ~43mm printable height → content spills onto a **second page**, so a 2-inch sticker prints 2 sheets (or an extra blank one).
- **Impact:** Physical sticker tags come out cut off / split across pages — the exact artifact this modal exists to avoid.
- **Fix:** For the tag paper size use `@page { size: 3in 2in; margin: 0 }` (printers that need margins get them from driver settings), or reduce `.tag-printable-area` width to ≤ 68mm and its internal spacing so it fits 2in of height; add `break-after: page` guard if a second page is still possible.

### [P3] CameraQrScannerModal: new AudioContext created per scan and never closed — beeps die after ~6 scans (Chrome limit)
- **File:** src/components/common/CameraQrScannerModal.tsx:62–75 (`playBeep`)
- **Issue:** Every successful scan runs `new (window.AudioContext || ...)()` and never calls `audioCtx.close()`. Chrome caps concurrent AudioContexts (~6); beyond that `new AudioContext()` starts failing/limiting, so after a handful of scans the confirmation beep silently stops working (errors are only `console.warn`'d).
- **Impact:** Scan feedback degrades during a busy intake session; also a minor memory/resource leak.
- **Fix:** Create one module-level (or ref-held) `AudioContext`, reuse it, and `close()` it when the modal unmounts; or use a short-lived `AudioContext` + `audioCtx.close()` in a `finally`.

### [P3] PrintableInvoiceModal: no Escape-to-close (every sibling dialog has it)
- **File:** src/components/common/PrintableInvoiceModal.tsx (whole component — no keydown/ESC handling anywhere)
- **Issue:** DeviceTagPrinterModal, CameraQrScannerModal, ConfirmDeleteModal, ConfirmDialogHost, RightFilterDrawer, GlobalSearchModal all close on ESC; the invoice modal does not. It's also not using the Radix `Dialog` (no focus trap / aria-modal).
- **Impact:** Keyboard users must click Close/Print; ESC does nothing while the invoice covers the screen (annoying and inconsistent).
- **Fix:** Add a `useEffect` with a `keydown` Escape → `onClose()` handler (and remove it on cleanup).

### [P3] PrintableInvoiceModal: popout-print window is never closed after printing
- **File:** src/components/common/PrintableInvoiceModal.tsx:71–101 (`handlePopoutPrint`)
- **Issue:** The popup runs `window.print()` via `setTimeout(..., 250)` and then stays open. There is no `matchMedia('print')` / `onafterprint` handler to `printWindow.close()`. The user is left with a second browser window containing the invoice.
- **Impact:** Minor UX clutter; on mobile Safari/Android the extra window is especially awkward. Also, if the original tab is closed first, `el.outerHTML` in the popup is static — fine — but the popup lingers.
- **Fix:** Add `printWindow.onafterprint = () => printWindow.close();` (plus a `matchMedia('print')` listener fallback for browsers that don't fire `onafterprint`).

### [P3] Icon-only buttons missing aria-label (screen readers announce nothing)
- **Files:**
  - CameraQrScannerModal.tsx:236–242 (X close button), 365–370 ("Close Scanner" footer button — icon-free but text? No: it has "Close Scanner" text — the X is the icon-only one)
  - ConfirmDeleteModal.tsx:63–70 (X button, no aria-label/title)
  - DeviceModelChooserModal.tsx:143–149 (X button, no aria-label/title)
  - PrintableInvoiceModal.tsx:193–199 (X button, no aria-label/title)
- **Issue:** These are icon-only `<Button>`s (no visible text) with neither `aria-label` nor `title`. The ui Button has no automatic label. Compare: PriceSettingsModal's close button *does* set `aria-label="Close price settings"` — so this is an inconsistency, not a kit-level design.
- **Impact:** Screen-reader users hear the button as unlabeled ("button"); hover tooltip users get nothing.
- **Fix:** Add `aria-label="Close"` (and a matching `title`) to each icon-only button.

### [P3] GlobalSearchModal: ArrowDown with zero results sets cursor to −1; no debounce on the 5,000-item scan
- **File:** src/components/common/GlobalSearchModal.tsx:78–80 (keydown), 41–65 (results memo)
- **Issue:** `setCursor((c) => Math.min(c + 1, results.length - 1))` with `results.length === 0` yields `Math.min(1, -1) = -1`. Harmless today (Enter guards on `results[cursor]`), but it's an invalid state that also means `data-active` briefly lands on nothing. Separately, the memo scans up to `workOrders.slice(0,2000) + parts.slice(0,2000) + customers.slice(0,1000)` with several `.toLowerCase().includes()` per record on **every keystroke** (no debounce) — fine on desktop, janky on low-end phones with big datasets.
- **Impact:** Edge-case state anomaly + per-keystroke full rescans on large data sets (search-as-you-type).
- **Fix:** Clamp with `Math.max(0, results.length - 1)` / early-return when `results.length === 0`; consider a ~120ms debounce or precomputed lowercase indexes for the three collections.

### [P3] ErrorBoundary: no reset except full page reload — a transient render error bricks the entire app
- **File:** src/components/common/ErrorBoundary.tsx (mounted at app root in src/main.tsx:76)
- **Issue:** The class never resets `hasError` (no `componentDidUpdate` on props/route, no "Try again" that clears state). Because it wraps the whole app in `main.tsx`, **any** render error anywhere (e.g., a single malformed record causing a list item to throw) replaces the entire UI with the fixed overlay until the user manually reloads. There's also no `key`-based reset by the parent.
- **Impact:** One transient error (often recoverable, e.g. a stale/bad data row or a momentary offline fetch shaping render) = the whole ERP is unusable until reload; data entry in progress is lost by the forced reload.
- **Fix:** Add a `Try again` button that `setState({ hasError: false, error: null })`, and/or auto-reset when `location.pathname` changes (reset on navigation) so a broken view can be navigated away from.

### [P3] HoverTooltip: horizontal clamp clamps the tooltip *center*, not the edges — right-edge buttons overflow the viewport
- **File:** src/components/common/HoverTooltip.tsx:74–79
- **Issue:** `left: Math.min(window.innerWidth - 12, Math.max(12, rect.left + rect.width / 2))` clamps the anchor point, but the element is then centered with `transform: translate(-50%, …)` and can be up to `max-w-64` (256px) wide. For a button near the right edge, the tooltip's right half extends past the viewport (up to ~116px overflow).
- **Impact:** Tooltips over the right-edge buttons (header action rows are exactly this layout) hang off-screen; text is cut.
- **Fix:** Clamp `left` by half the measured tooltip width after render, or compute `left` with edge-aware logic: `Math.min(Math.max(12, center - w/2), innerWidth - w - 12)` once `w` is known.

### [P3] ui/button.tsx: no default `type="button"` — latent form-submit footgun
- **File:** src/components/ui/button.tsx:32–46
- **Issue:** `Button` renders a native `<button>` with no default `type` (HTML default is `type="submit"`). The codebase is disciplined about passing `type="button"` at most call sites (verified in TabInventory.tsx, PriceSettingsModal.tsx, etc.), but any Button rendered inside a `<form>` without an explicit `type` will submit the form on click — including icon-only action buttons (edit/delete/expand) inside settings forms.
- **Impact:** Latent wrong-behavior risk: an unlabelled Button inside a form triggers an unintended save/reload; easy to introduce in future edits.
- **Fix:** Default the prop in the component: `type={props.type ?? 'button'}` (preserving explicit `type="submit"` usage), or document a lint rule requiring explicit `type`.

---

## Verified-clean areas (checked, no bug found)

- **DateFilterSelector** presets `today`/`7days`/`30days`/`60days` use local-midnight math consistently (`filterByDateRange`); the `today` comment about UTC+6:30 off-by-one is correctly handled via numeric local-day boundaries. No week-start bug (no week preset exists).
- **CustomDropdownMenu** re-anchor-on-scroll correctly ignores scrolls inside the open menu (`menuRef.contains(target)`), and the rAF-then-position open sequence is sound; ESC listener is registered once on mount and removed on unmount (no leak, unlike DrawerSelect).
- **DeviceTagPrinterModal** ESC, `window.print()` call, monochrome `@page`/grayscale rules, and the 21-point diagnostic pass/fail math are all consistent (`get21Diagnostics` always returns 21 entries; `hasAfterQa` gating is correct). Voucher footer text-size range slicing is bounded and can't crash.
- **CameraQrScannerModal** camera permission-denied path (`getCameras` catch) and stream cleanup on close/unmount are both present; the `startCameraScanner` → `await stopScanner()` guard prevents double-start. IMEI/serial parsing at both call sites (IntakeWorkOrderModule:796, CreateTicketSoloPage:1902) is correct.
- **OfflineSyncStatusBadge** reads real `pendingCount` from `erp-offline-sync-status` events (`lib/supabase.ts` dispatches the actual queue count), online/offline listeners are correct, outside-click closes the panel, and the panel has `aria-expanded`/labels.
- **ui kit**: badge/card/dialog/dropdown-menu/input/tabs all forward refs and props correctly; `cn` (tailwind-merge) resolves the badge `border-transparent`+`border-danger/30` conflict in the intended direction; `CardTitle`'s `HTMLParagraphElement` ref type is a TS nit only.
- **RightFilterDrawer / ActiveFilterChips / ModuleLoadingSkeleton / LanguageSwitcher / DeviceModelChooserModal / GlobalSearchModal**: no correctness bugs found (drawer focus restore, scroll lock, edge-swipe, ESC gating, tab counts, search case-insensitivity and 30-item cap all verified).

---

## Summary

- **Total findings: 17** (6 × P2, 11 × P3, 0 × P1)
- **Most critical:**
  1. **Upload Photo scanner is completely broken** (CameraQrScannerModal) — mount element only rendered on the Camera tab; html5-qrcode constructor throws; every upload fails with a misleading error.
  2. **Printed invoice understates legacy totals** (PrintableInvoiceModal) — parts silently omitted from table and balance; legacy WOs (e.g., seed WO-2026-0003: prints 30,000 vs stored 280,000) and legacy `discountAmount` double-counting.
  3. **Enter key confirms destructive dialogs regardless of focus** (ConfirmDialogHost) — keyboard users on Cancel/X can accidentally confirm dangerous actions.
