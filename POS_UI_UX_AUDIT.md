# POS & Invoicing Portal — UI/UX Audit & Change List
**Date:** 2026-08-03 · **Scope:** POS & Invoicing Portal only (`src/components/pos/PosInvoicingModule.tsx` 1,235 lines, plus `PrintableInvoiceModal.tsx`, `CustomerNotificationModal.tsx`, `App.tsx` toolbar wiring) · **Method:** Live browser walkthrough (desktop 1440px + mobile 390px) + code-level pattern analysis

---

## ✅ Fix Status (2026-08-03, applied + live-verified)

| # | Item | Status | Verification |
|---|---|---|---|
| 3 | Stale cash tendered across WOs | ✅ Fixed | `handleSelectWo` resets cash + split; DOM math 96,000−10,000=Short 86,000 ✓ |
| 4 | POS search unreachable | ✅ Fixed | `'pos'` added to search-input list in App.tsx; box visible desktop+mobile ✓ |
| 5 | Mobile Pay below fold | ✅ Fixed | Sticky bottom bar (Amount Due + Pay), `md:hidden`; display:block@390 / none@1440 ✓ |
| 6 | No confirm before charge | ✅ Fixed | Confirm modal (order/device/method/tendered/change/short + total band) ✓ |
| 7 | Card pill overload + dup Diag badge | ✅ Fixed | Per-card "Diag Finished" removed; selected card gets ✓ checkmark |
| 8 | Text-only payment tiles / broken grid | ✅ Fixed | Brand-colored icons (KBZ red, AYA green, UAB blue…), equal min-h-[56px] |
| 9 | Add-Part block interrupts invoice + no qty | ✅ Fixed | Collapsible (chevron + aria-expanded); qty stepper added; stock-clamped |
| 10 | Cash: no short warning / no quick amounts | ✅ Fixed | Short red warning + Exact/50k/100k/200k/500k chips |
| 12 | No unit price, zigzag qty | ✅ Fixed | Unit Price column added; qty right-aligned |
| 13 | Amount Due not focal | ✅ Fixed | Blue-tinted band, text-2xl font-black total |
| 19 | QR icon implies missing QR | ✅ Fixed | Account box uses Landmark icon; QrCode kept for MMQR tile |
| 20 | Bell bounce | ✅ Fixed | `animate-bounce` removed |
| 21 | Empty payment methods edge | ✅ Fixed | Amber empty-state + Pay guard with toast |
| 22 | Split/cash negative amounts | ✅ Fixed | Inputs clamped to ≥ 0 |
| 24 | Card a11y | ✅ Partial | role=button + tabIndex + Enter/Space; other cursor-pointer divs remain |
| 1–2 | Typography floor + contrast | ✅ Already global | `index.css` L910–920 (9–11px→11/12px, `#86868B`→`#6E6E73`) |
| — | Pre-existing TS errors in POS file | ✅ Fixed | `WorkOrderLineItem` type gap (2 errors) — project 34 → 32 |
| — | Diagnostic Completed Devices list: cards clipped at 520px cap, dense 6-row cards | ✅ Fixed | Cards compacted to 4 rows (model+price merged, repairs→2 tags, IMEI merged into footer); list height adaptive `max-h-[calc(100dvh-280px)]`; all 4 cards fully visible desktop+mobile; pagination pinned to panel bottom |

**Not done (documented):** #11 toolbar alignment, #14 dead "Configured in Settings" text, #15 auto-print (now behind confirm — acceptable), #16 IMEI grouping, #18 pagination 5→10, #23 language policy.

---

## Executive Summary

The POS portal is functionally strong: diagnostic-gated work-order list, itemized labor/parts table, 4 payment methods + split payment, account-transfer details with copy, cash change calculation, and a busy-state guard on the Pay button. The checkout logic is the best part of the app.

The **UI is the weak part**: text is tiny (9–11px dominant), contrast fails WCAG on secondary text, the left list cards are overloaded with colored pills, and on mobile the Pay button is buried below the fold. Two real bugs exist (stale cash tendered when switching work orders; search filter implemented but no search box on the POS page).

Score: **6.5/10** — great engine, needs a faster, clearer checkout surface.

---

## What's Already Good (keep, don't touch)

- **Diagnostic gating** — only WOs with completed diagnostics enter POS; declined tickets still collect the diag fee. Smart.
- **"Cant Repair / Customer Cancelled" banner** with 5,000 MMK Diagnostic-Fee-Only quick action. Excellent edge-case handling.
- **Itemized table** — original-price strikethrough, discount badge, "Inventory Part" badge, per-line remove button. Great detail.
- **Smart inventory filter** — parts auto-filtered by device model + repair text categories; stock count shown in dropdown with low-stock warning.
- **Split Payment** — auto-fill remaining, live Balanced / Change / Short feedback, add/remove rows. Very usable.
- **Payment busy state** (`isProcessingPayment`) + 1.2s re-entry lock — double-charge protection already in place.
- **Empty states** — friendly, instructive ("No Devices with Finished Diagnostics").
- **Print CSS** — receipt + invoice both print-clean with print-exempt media rules.
- Pagination has proper `aria-label`/`aria-current`. Copy button has `aria-label`.

---

## 🔴 P0 — Fix First (blocks fast, safe checkout)

### 1. Typography floor: 9–10px text is unreadable in a shop
- **Where:** ~34 instances of `text-[9px]`/`text-[10px]` in the POS module alone:
  - Card status/paid tags (L~404–414), repair tags (L~421–432), color tag, IMEI/S/N (L~444), "Diag Finished" pill (L~455–462), helper text ("Configured in Settings…" L~660), table header (L~599), discount badge (L~617), invoice modal `text-[9px]` badges (PrintableInvoiceModal L350, L370).
- **Why:** 9px IMEI/S/N strings are illegible; staff 40+ or in bright shop light will misread them.
- **Fix:** floor at **12px** for labels/badges, **13–14px** for card/table body, 15–16px for prices. This is a global `index.css` clamp + targeted overrides, same as the earlier app-wide typography pass — extend it to POS.

### 2. Contrast: `#86868B` on white fails WCAG AA (3.5:1, needs 4.5:1)
- **Where:** every `text-[#86868B]` label/helper (customer line, IMEI/S/N, subtotal/tax rows, "Configured in Settings…", placeholder). Also `#A5A5AA` strikethrough original price (L~622) ≈ 2.5:1 — nearly invisible.
- **Fix:** darken to `#6E6E73` (applies to screen only, not print) + darken strikethrough to `#86868B` or `#A1A1A6` with `font-medium`. This was already done app-wide in the last audit — POS files were missed.

### 3. 🐛 Stale cash tendered carries across work orders
- **Where:** `cashTendered` is module state (L130); switching WOs (L392) only sets `selectedWoId` — never resets `cashTendered`.
- **Result:** technician collects 250,000 cash on WO-A, taps WO-B, the tendered box still shows 250,000 and "Change Due" is wrong → mis-charges a customer.
- **Fix:** reset `setCashTendered(0)` (and `setSplitPayments` to defaults) inside the WO-select handler.

### 4. 🐛 Search is implemented but unreachable — dead filter
- **Where:** `filteredWorkOrders` matches `searchQuery` (L~176–180), but the toolbar search input in `App.tsx` (L1039) only renders for `['intake','pipeline','inventory','crm','suppliers','qa']` — **'pos' is missing**.
- **Result:** no search box on the POS page; with 30+ finished devices the only navigation is pagination (5/page).
- **Fix (choose one):** add `'pos'` to the input list with placeholder "Search Ticket #, Customer, Model, IMEI…", **or** remove the dead filter. Recommend adding it — search by order number is exactly what a counter needs.

### 5. Mobile: Pay button is below the fold — checkout requires a full scroll past the device list
- **Where:** 390px test — list + checkout share one scroll; Pay & Print Receipt is ~3–4 screens down.
- **Fix:** sticky bottom action bar on mobile (Amount Due + Pay button always visible), or convert the right panel to a bottom-sheet when a WO is selected. Minimum viable: sticky "Amount Due 46,000 MMK · Pay" bar.

### 6. No confirmation before charging
- **Where:** `handleProcessPayment` (L318) marks paid + triggers print immediately. Guard exists for double-click, but there is no "Receive 46,000 MMK via KBZPay?" confirm.
- **Why it matters:** one wrong tap on a high-value repair (500k+) is a real loss; a POS confirm step is standard.
- **Fix:** lightweight confirm sheet showing Total, Method, Change (cash), then Confirm & Print. Reuse the existing receipt modal as the post-payment screen.

---

## 🟠 P1 — Should Fix (speed + clarity)

### 7. Left card: too many competing colored pills
- **Where:** L404–462 — up to 6 tags/card: status, PAID/UNPAID, repair names, color, Diag Finished, Deposit.
- **Fix:** consolidate to **2 status chips max**: payment state (PAID/UNPAID — the POS-relevant one) + a single muted device-status line. Move repair names to one line of small text (already truncated +N — fine). **Remove the per-card "Diag Finished" badge** — the list header already says "Diagnostic Completed Devices" and shows a "Diag Finished" badge (L367–371); the card-level duplicate (L455) is pure noise.

### 8. Payment method grid: text-only tiles, broken grid rhythm
- **Where:** L656–739. Cash/KBZ/UAB/AYA are text-only; Split Payment is the only tile with an icon and a different internal layout → the 4-column grid breaks (Split sits alone on row 2 with a void beside it).
- **Fix:** give each method its brand color/logo (KBZPay red, AYA Pay green, UAB blue — or at least a colored dot + icon), equalize tile height/padding, and let Split fill the row (it already uses purple — keep). Larger tap targets (44px min).

### 9. "Add Inventory Part" block interrupts the invoice flow
- **Where:** L535–579 — a full bordered card (heading + select + stock status + button) sits mid-invoice between the itemized table and totals.
- **Fix:** collapse to a compact inline row ("＋ Add part used →" opens a small popover/modal with the searchable select + qty), keep the table as the visual center. Also: **no quantity input exists** — `inventoryPartQty` (L139) is never rendered; users can only add qty 1 per click. Add a qty stepper (or accept the merge-on-repeat behavior and remove the dead state).

### 10. Cash tendered: missing "short" warning + quick-cash buttons
- **Where:** L940–955. Shows green "Change Due" when tendered ≥ total, but **silent when short** (no red "Short by X").
- **Fix:** mirror the split-payment feedback (green change / red short). Add quick-cash chips: Exact · 50,000 · 100,000 · 200,000 — huge speed win for a repair counter.

### 11. Toolbar: filters not aligned; no search (see #4)
- **Where:** App.tsx L1209 — status + date dropdowns sit at different baseline than "+ Intake Ticket". Unify heights; add search.

### 12. Itemized table: no unit price, zigzag alignment
- **Where:** L594–645. Only line totals shown (qty × price); with qty > 1 you cannot see unit price. Qty column centered vs right-aligned amount = zigzag eye path.
- **Fix:** add a slim unit-price column (right-aligned) and right-align qty.

### 13. Amount Due Now is not enough of a focal point
- **Where:** L648–652. Same row style as subtotal/tax, just blue + larger.
- **Fix:** dedicated summary block — large Amount Due (20px+), green or blue, with a subtle background band. This is the number the cashier reads under pressure.

### 14. "Configured in Settings → Payment Methods" is dead text
- **Where:** L660 — 10px grey, not clickable.
- **Fix:** make it a real link that opens the Settings payment tab, or drop it.

### 15. Receipt/invoice: two print paths, auto-print on pay
- **Where:** `handleProcessPayment` auto-calls `onOpenPrintTag` (prints the intake A4 tag with PAID badge) whenever available — the receipt modal only shows when no tag handler exists.
- **Fix:** after confirm (see #6), show the receipt modal with explicit Print / Full Invoice choices instead of silently printing. Silent auto-print wastes paper and confuses staff when the printer is off (no error surfaced).

---

## 🟡 P2 — Polish (later)

- **16. IMEI/S/N formatting** — ungrouped 15-digit strings (L444); group as `3506 2779 2231 777` + tap-to-copy. Consider hiding behind an expand chevron on mobile.
- **17. Selected-WO affordance** — thin blue border only; add a checkmark/chevron and a slightly stronger fill so the active card reads at a glance.
- **18. Pagination 5/page** — raise to 10 or make it "load more"; a POS counter wants a longer visible queue.
- **19. QrCode icon implies a QR exists** (L891) but no QR is rendered — either render the actual QR from the account number or swap the icon.
- **20. `animate-bounce` on the Notify Customer bell (L489)** — distracting; drop the bounce.
- **21. Empty payment methods edge** — if all methods are disabled in settings, `paymentMethod` still defaults to `'Cash'` and Pay charges "Cash" with no tile visible. Add an empty state: "Enable a payment method in Settings."
- **22. Split payment** — cap/short the amount inputs at the remaining due; currently overpay shows "Change" (acceptable, but confirm on overpay). Disallow negatives/NaN.
- **23. Language mix** — Burmese strings inside the banner/split/diag-fee are useful for staff, but inconsistent with the rest of the page; pick one policy per screen (suggest: English labels, Burmese in parentheses for money-affecting actions only).
- **24. A11y** — 13 `cursor-pointer` divs in the module (device cards L388, split remove buttons, etc.) → real `<button>` or `role="button"` + keyboard support. Card selection is currently mouse-only (no arrow-key navigation).

---

## Mobile Checklist (390px)

| Issue | Severity |
|---|---|
| Pay button ~3–4 scrolls below fold → sticky bar/bottom sheet | 🔴 P0 |
| Tap targets 24–30px (tags, dropdowns) — need 44px | 🟠 P1 |
| IMEI/S/N 9px ungrouped — illegible | 🔴 P0 |
| Card shows 7 data points — collapse to ID/Model/Price + expandable details | 🟠 P1 |
| Tags crowd the right edge on 390px — allow wrap / shorten | 🟡 P2 |

---

## Suggested Quick Win (highest ROI, in order)

1. Reset `cashTendered` on WO change (bug fix, 2 lines).
2. Add `'pos'` to the App.tsx search-input tab list (bug fix, 1 line).
3. Global typography floor to 12px + `#6E6E73` contrast pass over POS files.
4. Sticky mobile Pay bar.
5. Confirm-before-charge sheet.
6. Kill the duplicate "Diag Finished" badge; consolidate card pills to 2.

---

## Files Touched

| File | Change area |
|---|---|
| `src/components/pos/PosInvoicingModule.tsx` | #1–3, #5–10, #12–22, #24 |
| `src/App.tsx` | #4 (search list), #11 (toolbar) |
| `src/components/common/PrintableInvoiceModal.tsx` | #1 (9px badges), #15 |
| `src/index.css` | #1–2 (global floor + contrast tokens, screen-only) |
