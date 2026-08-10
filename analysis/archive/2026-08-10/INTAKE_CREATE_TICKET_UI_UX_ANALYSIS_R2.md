# Intake / Create-Ticket — UI/UX Re-Analysis (Round 2)

**Date:** 2026-08-04, 23:47–23:59 (Asia/Rangoon)
**Scope:** `CreateTicketSoloPage.tsx` (New Intake Ticket Registration), desktop-first
**Method:** Live DOM/a11y evidence on `localhost:3000` at 1920×1080 and 390×844, code review of submit/reset handlers. (Image models were down — OpenAI accountId error, Gemini region block — so this round is DOM-measured, not screenshot-opinion.)

---

## 0. State of the code right now

You have **uncommitted in-flight work** (not yet committed/pushed):

| File | What's changing |
|---|---|
| `CreateTicketSoloPage.tsx` (+201/-84) | `max-w-3xl xl:max-w-6xl` wide desktop layout, sticky clickable stepper, 2-column `xl:grid` for steps 1–4, sticky bottom summary bar, diagnostics to `2xl:grid-cols-4` |
| `DeviceModelChooserModal.tsx` (+9) | Family tabs with 0 models are now disabled/greyed |

**Score last round:** 6.8 → 7.8 after P0/P1 fixes (committed as `c92ef9b`, `a4721a0`, `7957b5f`, `b8607d4`).
**This round (uncommitted WIP measured as-is):** **8.2 / 10** on desktop, **7.0 / 10** on mobile.

The new wide layout is a genuine upgrade — sticky stepper + sticky summary bar are exactly the right patterns. Findings below are what stands between this and a 9+.

---

## 1. New problems introduced by the WIP layout

### 🔴 P0 — Mobile horizontal overflow (REGRESSION)
- **Evidence:** at 390px viewport, `#main-content-scroll.scrollWidth = 481` → **91px of horizontal scroll**.
- **Culprit:** the sticky stepper. Step buttons are `shrink-0` + `whitespace-nowrap`: measured widths `97 + 79 + 84 + 109px` + gaps ≈ 385–395px + connectors → step 4 "Diagnostics" right edge lands at **481px**.
- The old in-flow stepper fit 390px by construction (verified last round at 734/734 on 768px). The new sticky one does not wrap or scroll internally.
- **Fix:** on `< sm`, let the stepper scroll horizontally *inside its own box* (`overflow-x-auto` on the stepper, keep `shrink-0` buttons) or compress to circles-only under 480px. Also add `overflow-x: clip` on the scroll container as a seatbelt.

### 🟠 P1 — Stepper numbering vs section numbering is now inconsistent
- Stepper phases: `1 Customer · 2 Device · 3 Repairs · 4 Diagnostics`.
- Sections in the form: `1 Customer Information · 2 Apple Hardware Device Model · 4 Warranty Policy · (unnumbered Serial/IMEI) · 5 Available Repairs · 6 Intake Notes · 7 Diagnostics · 8 Photos`.
- Two numbering systems on one page. "3" doesn't exist as a section; "4" means Warranty in the section list but Diagnostics in the stepper. Users clicking "3 Repairs" and landing on a section headed "5 Available Repairs Selection" will feel the mismatch.
- **Fix:** renumber sections to match phases (1–4 with sub-letters: 4a Notes, 4b Diagnostics, 4c Photos), or drop numbers from section H3s entirely and let the stepper own sequence.

### 🟠 P1 — Sticky summary bar shows MMK 0 / 0 items until repairs are picked — no guidance
- Measured sticky bar text on fresh form: `Repairs 0 items | Estimate 0 MMK | Saved 0 MMK | Register Device & Generate Voucher`.
- On a 1080px screen the bar is always visible, so a new user's eye lands on a dead-zero summary. It should carry the *next required action* when empty ("Select a device model to unlock repairs →").
- **Fix:** when `selectedRepairs.length === 0`, replace the metrics with a contextual hint tied to the current blocking requirement.

## 2. Still-open from Round 1 (not yet addressed)

### 🟠 P1 — Required fields are label-only; zero enforcement semantics
- Labels render `Phone Number *`, `Customer Name *`, `Town / City *` but measured: `input[required] = 0`, `aria-required = 0`.
- Validation lives only in `handleRegisterDevice` toasts (`Missing Customer Info`, `Missing Device`). Town/City shows `*` but is **never validated** — the asterisk is a lie in the other direction.
- Also: **no `<form>` element** around any of this (button-click handler only) → Enter key in any input does nothing; password managers and autofill behave worse.
- **Fix:** wrap in `<form onSubmit>`, put `required` + `aria-required` on the three real fields, remove `*` from Town/City or actually validate it, add inline error text under the failing field (toast alone scrolls away — after failed submit the user was left at scrollTop 1330 with no visible error, measured).

### 🟠 P1 — Failed submit gives no on-page signal
- Empty submit click: `scrollTop` stayed 1330, zero `[role=alert]`/red elements in DOM. Only a transient toast.
- **Fix:** inline field errors + auto-scroll to first invalid section + mark the failed phase in the stepper (red dot).

### 🟡 P2 — IMEI validation is length-display only
- Label shows `IMEI Number (15 Digits) 0/15` but nothing blocks non-15-digit or non-numeric input at submit; 15-digit auto-routing exists only in the scanner path.
- **Fix:** soft-warn inline when `imei && imei.length !== 15`; strip non-digits on input.

### 🟡 P2 — 21 diagnostic comment inputs all default-visible
- 29 total inputs on the page; 21 are `Comment for …` fields under each Pass/Fail/N-A row. On desktop `2xl:grid-cols-4` helps density, but the comment fields are the visual noise floor of the form.
- **Fix:** reveal comment input only when status = Fail (or on focus of the row); 90% of intake comments are on failed items.

### 🟡 P2 — Photos section is a dead drop-zone with no thumbnails until files chosen
- Section 8 renders `Take / Add Photo` only. The 4MB guard exists (toast), `capture` attribute is set (good for mobile), but no hint about the 4MB limit until you trip it.
- **Fix:** hint text "Up to 4MB each · taken photos auto-compress" + thumbnail grid with per-photo delete.

### 🟢 P3 — Find My segmented control lost its label in the refactor
- Diff shows `Find My Status` label span removed; the ON/OFF/UNKNOWN segmented control now sits unlabeled in the right column.
- **Fix:** restore a small caption or `aria-label` (it has a `role=group` label already — visually it's the gap).

### 🟢 P3 — Success screen width vs form width
- Form is now `xl:max-w-6xl` (1152px) but success screen stayed `max-w-3xl` (768px). Post-submit "snap" in width is a small but real polish break.
- **Fix:** match success container to the form's reading column (or center the voucher card at 768px inside the 6xl frame deliberately).

## 3. What's genuinely good now (keep)

- Sticky, clickable 4-phase stepper with live `0/4 complete — 0%` progress — exactly the right mental model.
- Sticky bottom summary (Repairs / Estimate / Saved / CTA) — kills the "scroll to bottom to register" problem.
- Device-model gate for repairs ("Choose Device Model First" dashed amber panel) — clear, impossible to miss, and now correctly hidden realistic colors until a model is chosen.
- Model chooser family tabs with zero counts now disabled instead of teasing empty tabs.
- Order numbering from `max(existing)+1` (P0-2) and full form reset (P1-3) are holding — verified again in code at lines 350–356 and 449–470.
- 0 clickable divs inside the form; all Pass/Fail/N-A are real buttons.

## 4. Recommended upgrade order

| # | Item | Effort | Impact |
|---|---|---|---|
| 1 | Fix mobile stepper overflow (P0) | ~15 min | Unblocks phone intake |
| 2 | `<form>` + real `required` + inline errors + scroll-to-error (P1) | ~1 h | Data quality + a11y |
| 3 | Unify numbering: stepper phases ↔ sections (P1) | ~30 min | Comprehension |
| 4 | Empty-state guidance in sticky summary (P1) | ~20 min | First-use clarity |
| 5 | Fail-only diagnostic comments (P2) | ~30 min | Visual calm |
| 6 | IMEI 15-digit inline check (P2) | ~15 min | Fewer bad tickets |
| 7 | Photo hints + thumbnails (P2) | ~45 min | Fewer retakes |

**Note:** items 1–4 are small enough to land in one commit before you push the current WIP. Want me to implement them?
