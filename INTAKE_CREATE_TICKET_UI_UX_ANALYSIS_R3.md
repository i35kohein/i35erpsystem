# UI/UX Analysis Round 3 — New Intake Ticket Registration (Create Ticket)

- **Page:** Intake → New Intake Ticket Registration (`CreateTicketSoloPage.tsx`, 1,600+ lines)
- **Date:** 2026-08-05 00:14 (post `3475496` R2 upgrade, all 9 items landed)
- **Method:** Live DOM measurement (scroll rects, bounding boxes, badge inventory, overlap math, label association, tap targets) at 1920×1080 + 390×844, plus E2E flows. Image models were down in all prior rounds, so this is measurement-verified rather than screenshot-interpreted.
- **Scope:** Desktop-first (shop counter), mobile checked for regressions.

---

## Overall Score: **8.4 / 10** (R2: 8.2 desktop / 7.0 mobile)

The R2 upgrade fixed the big structural issues (mobile overflow, validation, numbering, guidance). This round found **fewer but real** defects: 1 real layout bug (sticky summary covering the submit button), 1 numbering inconsistency, 4 unlabeled inputs, and a handful of polish items.

---

## 🔴 P0 — Real Defects

### P0-1. Sticky summary bar OVERLAPS the "Register Device" button at scroll bottom
- **Measured:** at scroll bottom, summary bottom edge = 1059, button bottom = 1047 → the sticky bar sits **on top of the button** (12px overlap). Root cause: the summary is `sticky bottom-0 z-30` but the content above it has **no bottom padding**, so at full scroll the last element (the submit button) slides under the bar.
- **Why it matters:** staff may not see the button state change or the tap target is partially covered; on mobile the button is the primary action.
- **Fix:** add bottom padding to the summary's parent container (e.g. `pb-24` on the space-y wrapper or `mb-4` + spacer) so the button always rests fully above the bar.

### P0-2. Stepper "Diagnostics" step lost its number "4"
- **Measured:** stepper labels = `1 Customer`, `2 Device`, `3 Repairs`, `Diagnostics` (no number). In R2 the invalid-state rewrite made the circle content conditional: `{s.invalid ? <X/> : done ? <Check/> : i+1}` — but the Diagnostics step ends up with an empty or missing circle in some states because the `done` condition (`beforeDiagnostics.some(...)`) is false at start and the index math still renders... actually measured it renders "Diagnostics" with NO number at all. The number column for step 4 is blank.
- **Fix:** ensure step 4 always shows `4` when not done/invalid (check the stepper circle rendering branch for the last item).

---

## 🟠 P1 — Labeling / Consistency Defects

### P1-1. Three inputs have NO label association (a11y + autofill)
- **Measured:** Serial Number, Device Passcode, and Intake Notes textarea have `<label>` elements but **no `id` on the input and no `htmlFor`** — clicking the label doesn't focus the field, screen readers can't announce them, and password managers/autofill fail on Passcode.
- **Fix:** add `id` + `htmlFor` to Serial (`field-serial`), Passcode (`field-passcode`), Notes (`field-notes`).

### P1-2. Duplicate badge number "2" — three cards claim Step 2
- **Measured badge inventory:** `1`, `2`, `2`, `2`(warranty), `3`, `4A`, `4B`, `4C`. Device Model, Realistic Color, and Warranty Policy all show badge **2**. This was deliberate ("Phase 2 grouping") but reads as a numbering error to users — "why are there three step 2s?"
- **Fix:** make sub-cards share the phase visually without repeating the number — e.g. Device card keeps "2", Color and Warranty get a subtle linked style (same blue but smaller dot, or "2·a" / "2·b"), or drop their numeric badges and use a "Part of Step 2" caption.

### P1-3. Hidden photo file input has no accessible name
- **Measured:** `input[type=file]` has no `aria-label`. It's visually hidden and triggered by the camera button, so keyboard/screen-reader users hitting it hear nothing.
- **Fix:** `aria-label="Upload device photos"` on the file input.

---

## 🟡 P2 — Polish / Minor

### P2-1. IMEI counter gray at 0 but border neutral — mild state mismatch
- Counter shows `0/15` in gray while the border is neutral blue-focus; earlier rounds suggested amber when `0 < len < 15`. Currently len=0 → neutral (fine), len 1–14 → amber (good), len 15 → green (good). Only nit: the counter stays gray until 15 — could turn amber 1–14 to mirror the border. Cosmetic.

### P2-2. "+ Add comment" whitespace hack
- Clicking "+ Add comment" writes a single space `' '` into `note` to flip the render branch; on save, notes should be `.trim()`-ed or the space leaks into the ticket. Code read shows `note: (d.note || '').trim() || undefined` is NOT applied on save — a space-only note could persist as `" "`.
- **Fix:** on save, map diagnostics with `note: (d.note || '').trim() || undefined`.

### P2-3. Stepper percent counts Repairs as a "phase" but Repairs is optional
- `3 Repairs` step shows done only when ≥1 repair selected; a ticket CAN be submitted with 0 repairs (diagnostic-only intake). The "x/4 complete" meter can never hit 4/4 for diagnostic-only tickets — mildly misleading. Consider showing Repairs as done when visited, or cap percent at the 3 required phases (Customer/Device/Diagnostics) and treat Repairs as a bonus indicator.

---

## 🟢 P3 — Optional
- Success screen could include a "Copy Order Number" button (staff read it aloud over phone).
- Print Voucher opens browser print — fine.
- Consider `inputMode="tel"` on phone (already type=text with digit counter; fine).

---

## Recommended Fix Order
1. **P0-1** summary overlap — add bottom padding (~5 min, real bug)
2. **P0-2** stepper 4 number — fix circle branch (~5 min)
3. **P1-1** id/htmlFor for Serial/Passcode/Notes (~10 min)
4. **P1-2** de-duplicate the three "2" badges (~15 min)
5. **P1-3** file input aria-label (~2 min)
6. **P2-2** trim notes on save (~5 min)
7. **P2-3 / P2-1** optional polish

Items 1–6 ≈ **45 minutes**, all low-risk, verifiable by the same DOM-measurement suite.
