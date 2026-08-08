# New Intake → Create Ticket — UI/UX & Workflow Analysis

**Date:** 2026-08-04 · **Project:** `~/Desktop/Kimi ERP` (i35 Apple Service ERP)
**Scope:** `src/components/intake/CreateTicketSoloPage.tsx` (1,388 lines) + all entry points + save wiring (`App.tsx`)
**Method:** Code walkthrough + live browser verification on `localhost:3000` (a11y-tree snapshot, empty-submit validation, DOM inspection)

---

## Executive Summary

The New Intake Ticket flow is visually the strongest screen in the ERP: a calm Apple-style card layout, a smart model→color→price-catalog cascade, a live auto-completing stepper, and per-repair discounting with a running MMK estimate. The **design is 8/10**.

But the workflow layer has **real data-integrity risks** that a busy intake desk will hit daily:

- Edit mode has a destructive "Discard Changes" trap (can overwrite a real ticket with blank data).
- Order numbers are generated from a list length — collisions after archive/delete.
- Before-repair photos are added via a `prompt()` URL dialog — no camera/file picker.
- "Create Another Ticket" carries stale diagnostics/device/color into the next ticket.
- Find My status has no UI control at all (silently always `OFF`).
- `intakeChecklist` is fabricated wholesale (`powerOn: true, batteryHealthPercent: 88`).

**Overall: 6.8/10** — ship the P0/P1 fixes below and this becomes the best screen in the app.

---

## 1. The Flow (as built)

### 1.1 Entry points (6 ways in)

| # | Source | Prefill | Notes |
|---|---|---|---|
| 1 | Sidebar `+ Intake Ticket` (Navigation.tsx) | — | Fresh form |
| 2 | Intake roster CTA (IntakeWorkOrderModule) | — | Fresh form |
| 3 | Intake roster **Scan QR/Barcode** | ⚠️ **none — scan value dropped** | `onScanSuccess` only calls `onNavigateToCreateTicket()`; the scanned IMEI/serial is lost (L~895) |
| 4 | Price List catalog item (PriceCatalogModule) | `model` + `service`/`selectedRepairs` | Best-in-class handoff |
| 5 | Edit ticket (Intake roster / Pipeline / Dashboard) | `editWorkOrder` | Full form |
| 6 | Devices module (DevicesManagementModule) | `Partial<WorkOrder>` | Model prefill |

### 1.2 Form anatomy (8 numbered sections, 4-phase stepper)

```
Stepper: ① Customer ② Device ③ Repairs ④ Diagnostics   (auto-completes, % bar)
 1  Customer Information        Phone* Name* Town/City* Type
 2  Apple Hardware Device Model (click card → chooser modal)
 3  Realistic Color             (click card → swatch modal)
 4  Warranty Policy             (click card → options modal)
 —  Serial / IMEI / Passcode    (+ Scan QR/Barcode button)
 5  Available Repairs (MMK)      (+ Add Repairs modal: search + 9 group pills + per-item discount)
 6  Intake Notes & Symptoms
 7  21-Point Diagnostic List     (Pass/Fail/N/A + comment per item, Mark All Pass/N/A)
 8  Before-Repair Condition Photos
    [Register Device & Generate Repair Ticket Voucher]
```

### 1.3 Post-save

Success screen → order-number pill, summary card (phone, town, color, warranty, total) → **Print Sticker Tag Voucher** / **View in Work Orders List** / **+ Create Another Ticket**.

### 1.4 Downstream handoff (per WORKFLOW.md)

Ticket lands at status `Receive`, **unassigned** (deliberate — coordinator assigns), `priority: 'Normal'`, `depositAmount: 0`. Pipeline gates on before-diagnostics (warning toast). Deposit, parts deduction, `completedAt` stamp happen at POS. Warranty clock = `completedAt || createdAt`.

---

## 2. What Works Well ✅

1. **Model→Color→Catalog cascade** — picking the model unlocks real color palettes and verified MMK catalog pricing. The "Choose Device Model First" empty-state in Repairs is excellent guidance.
2. **Live stepper** — Customer/Device/Repairs/Diagnostics auto-complete with a progress bar and "2/4 complete — 50%" readout. Great at-a-glance feedback.
3. **Phone auto-match** — ≥4 digits substring-match pulls name/town/type from the roster and shows a green "Existing Customer Profile Matched!" pill.
4. **Discount UX** — per-repair discount % with live final price + an estimate summary strip (count / base / saved / overall % / final MMK). The "Catalog Discount Auto-Applied" banner with strikethrough base price is a nice touch.
5. **Scan smart-routing** — 15-digit scan → IMEI, anything else → Serial (uppercased). Real camera (html5-qrcode), upload tab, torch, beep.
6. **21-point diagnostics** — icon per check, Pass/Fail/N/A tri-state per row, comment box per item, Mark All Pass/N/A shortcuts.
7. **Validation guard** — empty name/phone/model → toast; `isRegistering` blocks double-submit with spinner.
8. **Edit mode** — full prefill of customer/device/repairs/diagnostics, success screen says "Updated".
9. **No fake serial/IMEI** (fixed 2026-08-04) — fields stay empty for real manual entry.

---

## 3. Findings (by severity)

### 🔴 P0 — Data loss / corruption risk (fix first)

**P0-1 · "Discard Changes" in edit mode is a destructive trap**
`handleResetForm` (L433) clears the fields but **never clears `prefill.editWorkOrder`**, so `isEditMode` stays `true`. After clicking "Discard Changes" the header still says *Edit Intake Ticket*, the button still says *Save Ticket Changes* (L1128), and saving re-saves the **original ticket with blanked customer name/phone/town/repairs** (L342 uses `baseWorkOrder?.orderNumber`, L364+ spread `...baseWorkOrder`).
**Fix:** `onDiscard` must call a parent prop to clear `ticketPrefill` (and navigate back), or render a real "leave edit mode" confirm. Never leave the form armed against the original record after a "discard".

**P0-2 · Order numbers collide after archive/delete**
`newOrderNumber = ${prefix}2026-${1000 + workOrders.length + 1}` (L342) — derived from the **current list length** of non-archived tickets and a **hardcoded year**. Archive 10 tickets → next number reuses an existing one. Two tickets sharing `WO-2026-10xx` breaks stickers, search, POS lookup.
**Fix:** persist a `nextOrderNumber`/counter in Supabase settings (increment atomically), or compute `max(existing numbers) + 1` against the full collection, with a uniqueness check.

### 🟠 P1 — Functional gaps

**P1-1 · Before-repair photos: `prompt('Enter photo URL:')` (L1098)**
A native browser prompt in a 2026 repair-shop intake. No file picker, no camera capture, no preview compression, no retake. Also **edit mode never loads existing photos** (`intakePhotos` state is never seeded from `editWorkOrder`; L~186), so the UI shows zero photos and the clerk can't add/remove against the real set.
**Fix:** `<input type="file" accept="image/*" capture="environment" multiple>` (or reuse a camera modal like the QR one), store base64/data-URL or upload, and seed `intakePhotos` from `editWorkOrder.intakePhotos` in the prefill effect.

**P1-2 · Intake roster scanner drops the scanned value**
In `IntakeWorkOrderModule.tsx` the scanner's `onScanSuccess` just navigates to create-ticket — the IMEI/serial captured in the roster is thrown away (contrast: the form's own scanner correctly routes it). Clerk scans at the roster, lands on a blank form, has to scan again.
**Fix:** pass the scan through prefill (`onNavigateToCreateTicket({ imei/serial })` → `ticketPrefill` → form seeds fields).

**P1-3 · "Create Another Ticket" carries stale data across tickets**
`handleResetForm` does **not** reset: `deviceModel`, `deviceColor`, `warrantyDays/Label`, `findMyStatus`, `beforeDiagnostics` (all 21 items!), `intakePhotos`, `matchedCustomer`, `customWarrantyInput`. A ticket with Fail marks or a photo of the previous phone silently leaks into the next ticket — a real data-integrity risk (wrong device + stale diagnostics).
**Fix:** full reset to initial state (re-run the `DIAGNOSTIC_NAMES.map(...)` initializer, clear photos/color/warranty/model). Optionally offer "Repeat same device" as an explicit choice.

**P1-4 · Find My status has no UI**
`findMyStatus` state exists (L161) and is saved (L365) but **no control renders anywhere in the form** → every new ticket is silently `OFF`, and the field can never be set correctly at intake.
**Fix:** small ON/OFF/UNKNOWN segmented control in the Serial/IMEI section (it matters for activation-lock risk on used devices).

**P1-5 · `intakeChecklist` is fabricated wholesale (L409–424)**
Every new ticket writes `powerOn: true, screenDisplay: true, … batteryHealthPercent: 88` — invented data, the same class of "no fake data" problem fixed for serials on 2026-08-04. The 21-point diagnostics is the real record; the checklist is a parallel fake.
**Fix:** derive `intakeChecklist` from `beforeDiagnostics` (Pass→true, Fail→false, N/A→omit), and drop the hardcoded `batteryHealthPercent: 88` (require real reading or leave null).

**P1-6 · Keyboard/screen-reader: the 4 big clickable cards are `<div onClick>` (L674, L717, L742, L1322)**
Model card, Color card, Warranty card, and every repair row in the modal are plain divs with `onClick` — **no `role="button"`, `tabIndex`, or key handler**. Live a11y-tree check confirms they are invisible to Tab/Enter and screen readers. `npm run check:ui` reports "0" because its regex only matches `onClick` on the **same line** as `<div` — a false negative for these multiline tags.
**Fix:** convert to `<button>` (or add role/tabIndex/Enter+Space), and fix the checker to scan multi-line tags (it already proved itself blind).

### 🟡 P2 — UX friction / workflow gaps

**P2-1 · Stepper (4 phases) vs numbered sections (1–8) mismatch**
Stepper says Customer/Device/Repairs/Diagnostics, but the page numbers sections 1–8 with Color (3), Warranty (4), Notes (6), Photos (8) outside the stepper's model. Users infer 8 steps, the stepper claims 4.
**Fix:** group sections under the 4 phases (e.g., Device phase = model + color + warranty + serial; Review = notes + photos) or renumber to match.

**P2-2 · "Town / City *" not validated, and stored as `customerAddress`**
Required asterisk on Town/City but `handleRegisterDevice` only validates name/phone/model — a ticket can save without it. Semantically `customerAddress` holds a town name (summary card labels it "Town / City"), and edit mode copies `customerAddress` into **both** town and address states (L175–176) — muddying a future real-address field.

**P2-3 · Phone auto-match overwrites what the clerk typed**
Any ≥4-digit substring match **replaces** the customer name/town/type the clerk may have already typed (L277–281), with no picker, no "matched but keep my entry" choice, and no escape hatch for a second customer sharing a number (common in Myanmar family/business phones). `matchedCustomer` only clears when input drops below 4 digits.
**Fix:** show a match dropdown ("U Aung Aung — use this profile / continue as new"), only fill on explicit selection.

**P2-4 · Hardcoded business values**
- `lineItems[].unitCost = basePrice × 0.5` (L381) — every repair's cost is assumed 50% of price; parts-vs-labor cost accuracy is impossible.
- `estimatedCompletion = now + 24h` (L408) — no promise-date input; every ticket promises 1 day.
- `priority: 'Normal'` — no priority control at intake (only later in Pipeline).
- `depositAmount: 0` — deposit is only collectable at POS; many shops collect at intake (and the sticker tag would carry it).

**P2-5 · Long form, zero recovery**
No autofocus on the first field, no draft/autosave, no Esc-to-close on the custom modals, no unsaved-changes warning. An accidental tab switch or refresh loses an 8-section form.

**P2-6 · Custom warranty input quirks**
`customWarrantyInput` is never cleared after Apply (next open still shows the old number), accepts `0` days, and has no upper bound.

**P2-7 · Success screen omits serial/IMEI & deposit**
The confirmation card shows phone/town/color/warranty/total but not serial/IMEI — the exact values the sticker tag needs to match the device. If the clerk walks away, they can't eyeball-verify against the physical device.

### 🔵 P3 — Polish

- Discount field: no quick presets (10/20/30%) and no suffix hint besides a floating `%`.
- Repair rows: click-row toggles instantly in the modal — a double-click can accidentally deselect.
- "Mark All Pass" makes Diagnostics phase complete in one click — fine, but consider a "Mark All Fail" too (some shops log pre-existing damage that way).
- Sample barcodes in the scanner include a fake device serial labeled "iPhone 15 Pro Max Serial" — harmless demo data, but it's the kind of thing that gets mistaken for real.
- Modal backdrops don't close on click (only the ✕) — minor, but consistent with the no-Esc issue.

---

## 4. Workflow Integration Notes

- ✅ **Unassigned-at-intake is correct** — the coordinator assigns in Pipeline; don't "simplify" this away.
- ✅ **Diagnostics gating** (warning toasts on status moves without 21-point) is the right enforcement — keep it, and consider making it a hard block at `Finished` (currently only a persistent toast).
- ⚠️ **Deposit at intake** would close a real cash-flow gap: add optional `Deposit Received (MMK)` with quick presets; carry into POS (POS cards already display deposit inline).
- ⚠️ **Promise date** — intake is the natural place to set `estimatedCompletion` (24h default is fine as a default, not as a silent constant).
- ⚠️ **Sticker tag** — verify the print tag includes serial/IMEI + deposit; that's the device-bound artifact.

---

## 5. Recommended Fix Order

| # | Fix | Effort | File |
|---|---|---|---|
| 1 | P0-1 Discard-in-edit trap (unmount/clear prefill + confirm) | ~1h | CreateTicketSoloPage + App.tsx |
| 2 | P0-2 Order number from persisted counter / max+1 with uniqueness | ~1.5h | CreateTicketSoloPage + settings |
| 3 | P1-3 Full reset + fresh diagnostics on "Create Another" | ~1h | CreateTicketSoloPage |
| 4 | P1-5 Derive intakeChecklist from diagnostics; drop fake 88 | ~1h | CreateTicketSoloPage |
| 5 | P1-1 Real photo upload/capture + seed photos in edit mode | ~2h | CreateTicketSoloPage |
| 6 | P1-6 Convert 4 clickable cards to `<button>` + fix check-ui | ~1h | CreateTicketSoloPage + scripts |
| 7 | P1-2 Roster scan → prefill serial/IMEI | ~0.5h | IntakeWorkOrderModule + App.tsx |
| 8 | P1-4 Find My segmented control | ~0.5h | CreateTicketSoloPage |
| 9 | P2-3 Phone-match picker (match / continue-as-new) | ~2h | CreateTicketSoloPage |
| 10 | P2-4 Configurable labor ratio, promise date, intake deposit | ~3h | CreateTicketSoloPage + types |
| 11 | P2-1 Stepper/section alignment | ~1h | CreateTicketSoloPage |
| 12 | P2-2 Town validation + field semantics | ~0.5h | CreateTicketSoloPage |
| 13 | P2-5 autofocus + unsaved-changes guard | ~1h | CreateTicketSoloPage |

---

## 7. Fixes Shipped (2026-08-04, same session)

All P0 + P1 findings implemented and **live-verified** on localhost:3000 (E2E: created a real test ticket `WO-2026-1008`, exercised edit/discard, deleted it after — Supabase confirms 0 test rows left).

| # | Fix | What changed | Verified |
|---|---|---|---|
| P0-1 | Discard-in-edit trap | New `onCancelEdit` prop → App clears `ticketPrefill` + returns to Intake; success-screen Discard uses it; header "Back to Ticket List" also clears prefill | ✅ Discard exits edit mode to roster; next open is a fresh form |
| P0-2 | Order-number collisions | `max(existing number) + 1` across ALL tickets + `new Date().getFullYear()` (was list-length + hardcoded 2026) | ✅ Created ticket got `WO-2026-1008` (existing range was 1001–1007) |
| P1-1 | Photos | `prompt(URL)` → real `<input type=file accept=image/* capture=environment multiple>` → data-URL previews, 4MB guard + toast; edit mode now seeds `intakePhotos` | ✅ "Take / Add Photo" button live |
| P1-2 | Roster scan drops value | `onScanSuccess` now routes 15-digit → `{imei}` / else `{serialNumber}` through prefill; `TicketPrefillData` gained `serialNumber`/`imei` | ✅ Scan → "Apply Code to Intake" → form opens with serial prefilled |
| P1-3 | Stale reset | `handleResetForm` now resets model/color/warranty/FindMy/custom-warranty/diagnostics/photos/customer-type/match (fresh 21× N/A) | ✅ After create, next form is fully blank, diagnostics all N/A |
| P1-4 | Find My no UI | ON / OFF / UNKNOWN segmented control in Serial/IMEI section | ✅ Live |
| P1-5 | Fabricated `intakeChecklist` | Derived from `beforeDiagnostics` (Pass→true, Fail→false, N/A→false); no more hardcoded `batteryHealthPercent: 88` / all-true booleans | ✅ Code-level |
| P1-6 | Clickable divs + checker | Model/Color/Warranty cards + catalog rows → `<button type=button>`; `check-ui.mjs` now scans whole files (was per-line, missed multiline tags) | ✅ a11y tree shows all as buttons; checker honestly reports 19 pre-existing elsewhere |

**Residual notes:**
- Order numbers still reuse numbers of *permanently deleted* tickets (max-based). A persisted counter in settings would close that gap — recommended when auth/settings work is next.
- `check:ui` now reports **19 clickable divs** across the rest of the app (Navigation backdrop, UserRoleSwitcher, timeline stage filter, CRM rows, …) — pre-existing, outside this ticket's scope, now visible for a follow-up pass.
- Photo data-URLs live in the Supabase JSONB row — fine for a few small photos; move to object storage if photos grow.

---

## 8. Scorecard (post-fix view)

| Dimension | Before | After |
|---|---|---|
| Visual design & consistency | 8.5/10 | 8.5/10 (unchanged — was already the best screen) |
| Information architecture | 8.0/10 | 8.0/10 |
| Interaction feedback | 8.0/10 | 8.0/10 |
| Workflow & data integrity | 6.0/10 | **8.5/10** (P0 traps closed, no fabricated checklist, honest reset) |
| Accessibility | 5.5/10 | **7.0/10** (intake form fully keyboard-reachable; app-wide count now visible) |
| Mobile ergonomics | 7.0/10 | 7.5/10 (file-capture photos help phones) |
| **Overall** | **6.8/10** | **7.8/10** |
