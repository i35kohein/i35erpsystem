# Area F — Misc modules (devices / ai / trello / mermaid / auth / common modals)

Audit date: 2026-08-13. Read-only review of JSX micro-details. Severity: P1 = visible/annoying, P2 = polish, P3 = nitpick.

---

## src/components/auth/LoginPage.tsx

### src/components/auth/LoginPage.tsx:60-68 — Missing `autoComplete` on email/password fields
- **Severity:** P2
- **Issue:** Neither input declares `autoComplete`, so password managers and browsers can't reliably save/fill credentials:
  `<Input type="email" required ... placeholder="you@example.com" .../>` and `<Input type={showPassword ? 'text' : 'password'} required .../>`
- **Suggestion:** Add `autoComplete="email"` to the email input and `autoComplete="current-password"` to the password input. For the toggle, keep the attribute regardless of `showPassword` so autofill survives the eye toggle.

### src/components/auth/LoginPage.tsx:70-73 — Error box is not announced to screen readers
- **Severity:** P2
- **Issue:** `{error && (<div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs font-bold text-danger">` has no `role="alert"`/`aria-live`, so a failed login is invisible to assistive tech even though it's visually shown.
- **Suggestion:** Add `role="alert"` (and optionally `aria-live="polite"`) to the error container.

### src/components/auth/LoginPage.tsx:84-86 — Input className duplicates the base component and leaves a trailing space
- **Severity:** P3
- **Issue:** `className="w-full rounded-xl border border-line-strong bg-white py-2.5 pl-10 pr-3 text-sm font-semibold text-ink outline-none transition "` re-declares `rounded-xl border bg-white text-sm` that `ui/input.tsx` already provides, overrides the 40px height with `py-2.5` (input shrinks vs the eye button), and ends in a stray space. Same pattern on the password field (line 98).
- **Suggestion:** Trim to `className="pl-10 pr-10 font-semibold"` (keep `py-2.5` only if a shorter field is intended — otherwise drop it so `h-10` stays).

### src/components/auth/LoginPage.tsx:101 — Submit button removes focus outline without adding a ring
- **Severity:** P2
- **Issue:** `... active:scale-95 disabled:opacity-60 focus-visible:outline-none "` — keyboard focus is made invisible (base button already sets `focus-visible:outline-none` and no ring exists), so Tab-focusing the only CTA on the page gives zero visual indication.
- **Suggestion:** Replace with `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-2`.

### src/components/auth/LoginPage.tsx:57-100 — Inputs stay enabled during the async login
- **Severity:** P3
- **Issue:** While `loading` is true only the submit button is disabled; email/password can still be edited mid-request, and a second Enter does nothing silently (guard is only on the button).
- **Suggestion:** Add `disabled={loading}` to both inputs (base input already styles `disabled:opacity-50`).

### src/components/auth/LoginPage.tsx:42-47 — Card lacks a scale/translate entrance animation
- **Severity:** P3
- **Issue:** The page uses `bg-surface` with no entry motion; the rest of the app fades modals in with `animate-fadeIn`.
- **Suggestion:** Add `animate-fadeIn` to the card wrapper for a consistent entrance.

### src/components/auth/LoginPage.tsx:109 — Hardcoded version string
- **Severity:** P3
- **Issue:** `i35 Apple Service · v2.4.0 · Authorized staff only` — the version is baked into JSX and will drift from the real app version on the next release.
- **Suggestion:** Read from a single `APP_VERSION` constant/env, or drop the version number.

### src/components/auth/LoginPage.tsx:96 — Trim only on submit, but no inline field error
- **Severity:** P3
- **Issue:** `body: JSON.stringify({ email: email.trim(), password })` — if the user types `user@x.com ` the displayed value keeps the trailing space while the submitted one is trimmed; a single generic error box doesn't point at which field failed.
- **Suggestion:** Trim on change or show the field name in the error string (`data.error`).

---

## src/components/mermaid/MermaidModule.tsx

### src/components/mermaid/MermaidModule.tsx:73-75 — Error banner uses hardcoded rose colors instead of the danger tokens
- **Severity:** P2
- **Issue:** `<div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">` — every other error surface in the app uses `border-danger/30 bg-danger/10 text-danger` (e.g. LoginPage:71, CameraQrScannerModal:286). This one escapes the token system and will not follow dark mode overrides.
- **Suggestion:** `className="rounded-2xl border border-danger/30 bg-danger/10 p-3 text-sm text-danger"`.

### src/components/mermaid/MermaidModule.tsx:74-76 — Preview shows a blank box with no loading/empty state
- **Severity:** P2
- **Issue:** `<div className="mt-4 overflow-auto rounded-3xl ... min-h-[280px]" ref={previewRef} />` — during the 300ms debounce and while `mermaid.render` is async, the preview is an empty gray rectangle with zero feedback; on first mount it flashes blank before the SVG lands.
- **Suggestion:** Add a `isRendering` state (set on debounce fire, cleared after render) and show a `Loader2 animate-spin` or "Rendering…" skeleton inside the box.

### src/components/mermaid/MermaidModule.tsx:63-65 — Textarea radius/font inconsistent with app inputs
- **Severity:** P3
- **Issue:** `min-h-[250px] w-full rounded-3xl border border-line bg-surface p-4 text-xs font-mono ...` — `rounded-3xl` and `bg-surface` match the card sections but not the `ui/input` standard (rounded-xl, white bg); the editor looks like a card inside a card.
- **Suggestion:** Use `rounded-xl bg-white` (keep `font-mono text-xs`) so the editable surface reads as a control.

### src/components/mermaid/MermaidModule.tsx:73 — Render error has no alert semantics and no scroll cap
- **Severity:** P3
- **Issue:** Long Mermaid parser errors render as one unbounded `<div>` with `text-sm` — no `role="alert"`, no `max-h`/`overflow-auto`, so a verbose error pushes the preview far down.
- **Suggestion:** Add `role="alert"` and `max-h-40 overflow-auto` to the error container.

### src/components/mermaid/MermaidModule.tsx:82 — Rendered SVG has no accessible name
- **Severity:** P3
- **Issue:** The diagram is injected via `previewRef.current.innerHTML = output.svg` — the preview div has no `role="img"` or `aria-label`, so the diagram content is invisible to screen readers.
- **Suggestion:** Add `role="img"` + `aria-label="Rendered Mermaid diagram"` on the preview container (or a visually-hidden text fallback).

### src/components/mermaid/MermaidModule.tsx:37-44 — No example/template switcher
- **Severity:** P3
- **Issue:** The only way to see syntax is to hand-type it; there's no "Load example" affordance though the module is a demo/tool surface.
- **Suggestion:** Add a small "Examples" chip row that swaps `diagramText` between 2-3 presets (flowchart, sequence, state).

### src/components/mermaid/MermaidModule.tsx:70 — `focus:ring-brand/15` ring too subtle and no `resize` policy
- **Severity:** P3
- **Issue:** `focus:ring-2 focus:ring-brand/15` at 15% opacity is nearly invisible on white; also the textarea is user-resizable (default `resize`), which fights the `min-h-[250px]` layout.
- **Suggestion:** `focus:ring-brand/30` and add `resize-y` or `resize-none` deliberately.

---

## src/components/devices/DeviceModelChooserModal.tsx

### src/components/devices/DeviceModelChooserModal.tsx:58-64 — "Folder Settings" becomes an unlabeled icon button on mobile
- **Severity:** P2
- **Issue:** The button wraps its label in `<span className="hidden sm:inline">Folder Settings</span>` — below `sm` it renders as a bare gear icon with no `aria-label`/`title`, so the control is unannounced.
- **Suggestion:** Add `aria-label="Folder Settings"` to the button (keep the span for desktop).

### src/components/devices/DeviceModelChooserModal.tsx:86-107 — Family chips forced to 28px height (`!h-7`)
- **Severity:** P2
- **Issue:** `className="shrink-0 rounded-full border px-2.5 !h-7 !min-h-0 text-xs ..."` — hard-forced 28px height violates the app's ~40px touch standard (ui/button default is h-10) and is cramped for tap targets on phones.
- **Suggestion:** Drop the `!h-7 !min-h-0` overrides and let chips be `h-8`/`h-9` minimum, or accept the base height.

### src/components/devices/DeviceModelChooserModal.tsx:112-116 — Search input shrinks below 40px and loses focus styling
- **Severity:** P2
- **Issue:** `className="w-full pl-9 pr-4 py-2 bg-surface border border-line rounded-lg text-xs font-bold text-ink focus:outline-none "` — `py-2` overrides the base `h-10` (input becomes ~32px tall, shorter than the modal's other controls), `rounded-lg` breaks from the `rounded-xl` base, and `focus:outline-none` removes focus indication with no replacement ring.
- **Suggestion:** Keep base height/radius: `className="pl-9 pr-10 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-brand/20"` (drop `py-2 bg-surface border border-line rounded-lg`).

### src/components/devices/DeviceModelChooserModal.tsx:199 — Model-code subtext is low contrast (`text-brand/60`)
- **Severity:** P2
- **Issue:** `<span className="mt-0.5 block whitespace-normal font-mono text-[10px] font-black leading-tight text-brand/60">` — brand at 60% opacity on white is a washed-out light blue; 10px mono code lines are hard to read and important for model identification.
- **Suggestion:** Use `text-brand` full opacity (or `text-muted`) and bump to `text-[11px]`.

### src/components/devices/DeviceModelChooserModal.tsx:192-196 — Model rows have no visible keyboard focus
- **Severity:** P2
- **Issue:** `className="... focus:outline-none hover:bg-surface ..."` — the focus style is explicitly removed; keyboard users tabbing through models get no indicator, and there's no `aria-current`/`aria-selected` on the selected row.
- **Suggestion:** Replace `focus:outline-none` with `focus-visible:bg-surface focus-visible:ring-2 focus-visible:ring-brand/30` and add `aria-pressed={isSelected}`.

### src/components/devices/DeviceModelChooserModal.tsx:79-82 — Close button touch target 32px
- **Severity:** P3
- **Issue:** `className="w-8 h-8 rounded-full ..."` — 32px, under the 40px minimum (same for the Folder icon header box `w-8 h-8`).
- **Suggestion:** `w-10 h-10` (icon centered) to meet touch target.

### src/components/devices/DeviceModelChooserModal.tsx:153-157 — Nested double scroll regions (82vh modal + 58vh grid)
- **Severity:** P3
- **Issue:** The modal is capped at `max-h-[82vh]` (line 30) while the grid area is separately capped `max-h-[58vh]` with `overflow-y-auto` — on short screens the grid scrolls inside a modal that itself can overflow, and the footer can push off-screen.
- **Suggestion:** Let the grid be `flex-1 min-h-0` inside the flex column modal and drop `max-h-[58vh]` (keep one scroll owner).

### src/components/devices/DeviceModelChooserModal.tsx:162-172 — Good empty state, but grid wrapper still renders empty columns
- **Severity:** P3
- **Issue:** The empty state returns inside the `grid grid-cols-1 ... sm:grid-cols-3` wrapper (line 152), so the message sits in the first cell of a 3-column grid — centered-ish but column-biased on desktop.
- **Suggestion:** Render the empty state *outside* the grid (early-return before the grid div).

### src/components/devices/DeviceModelChooserModal.tsx:175 — 10px uppercase folder header is very small
- **Severity:** P3
- **Issue:** `text-[10px] font-black uppercase tracking-wider text-muted` — 10px arbitrary value; the app's smallest standard label elsewhere is 11-12px.
- **Suggestion:** `text-[11px]` and keep the tracking.

### src/components/devices/DeviceModelChooserModal.tsx:120-123 — "Clear" button overlaps long search text
- **Severity:** P3
- **Issue:** `<Button ... className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-extrabold text-muted hover:text-ink">Clear</Button>` sits on top of the input text; a long query runs underneath it with no padding-right reserve for the button.
- **Suggestion:** Give the input `pr-14` when `deviceSearchQuery` is set, or use an icon-only X with `aria-label="Clear search"`.

### src/components/devices/DeviceModelChooserModal.tsx:243 — Overlay color differs from sibling modals
- **Severity:** P3
- **Issue:** `bg-slate-900/50` here vs `bg-black/70` in CameraQrScannerModal (line 238) and `bg-slate-900/50 backdrop-blur-sm` in CustomerNotificationModal — three different backdrop styles across the app.
- **Suggestion:** Standardize on one token (e.g. `bg-slate-900/50 backdrop-blur-xs`) app-wide.

### src/components/devices/DeviceModelChooserModal.tsx:24-34 — No body scroll lock or focus trap when open
- **Severity:** P2
- **Issue:** Opening the modal leaves the page scrollable behind it, and focus is not trapped — Tab walks into the page behind the overlay; Esc works but focus is never restored to the trigger.
- **Suggestion:** Set `document.body.style.overflow = 'hidden'` while open, and add a lightweight focus trap (or move focus to the panel on open / restore on close).

---

## src/components/trello/TrelloBoardModule.tsx

### src/components/trello/TrelloBoardModule.tsx:226-230 — 9px date text is nearly illegible
- **Severity:** P2
- **Issue:** `<span className="text-[9px] font-mono text-muted shrink-0" title="...">` — 9px muted mono date on a white card is the smallest text on the board and fails readability on phone screens.
- **Suggestion:** `text-[10px]`/`text-[11px]` and consider `text-ink/70` instead of `text-muted`.

### src/components/trello/TrelloBoardModule.tsx:218 — Stagnant card `border-l-4` causes a 3px layout shift
- **Severity:** P3
- **Issue:** `stagnant ? 'border-l-4 border-l-danger' : 'border-line'` — switching border-left width from 1px to 4px shifts the card's inner content by 3px when a ticket becomes stale, a visible jump on refresh/rerender.
- **Suggestion:** Always reserve `border-l-4` (use `border-l-4 border-l-line` normally, `border-l-danger` when stagnant).

### src/components/trello/TrelloBoardModule.tsx:253-268 — Tech-assign button is a ~16px tall link-styled control
- **Severity:** P2
- **Issue:** `className="h-auto min-h-0 bg-transparent p-0 text-[11px] ..."` — the whole assign-technician tap target is just the 11px text+icon line height, far below the 40px standard; easy to mis-tap next to the checkout button.
- **Suggestion:** Add `min-h-6`/`py-1` and keep the link look, or wrap with a larger hit area (`relative` + `after:absolute after:-inset-1`).

### src/components/trello/TrelloBoardModule.tsx:311-340 — 24px circular quick-action buttons
- **Severity:** P2
- **Issue:** `className="!h-6 !min-h-6 w-6 rounded-full ..."` (checkout, diagnose, reopen-QA) — forced 24px circles are well under the 40px touch minimum and sit adjacent to each other; thumb taps will miss.
- **Suggestion:** `!h-8 !min-h-8 w-8` at minimum (32px) with `gap-2`, or `h-9 w-9`.

### src/components/trello/TrelloBoardModule.tsx:345 — Amount hardcodes "MMK" instead of the currency token
- **Severity:** P2
- **Issue:** `<span className="font-mono text-[11px] font-black text-success-deep">{totalAmt.toLocaleString()} MMK</span>` — the rest of the app (AI modal, notification modal) reads `systemSettings.currencySymbol || 'MMK'`; this bypasses the setting and will display MMK even if the shop switches currency.
- **Suggestion:** Accept/derive a currency prop (`systemSettings?.currencySymbol || 'MMK'`) and render `{totalAmt.toLocaleString()} {currency}`.

### src/components/trello/TrelloBoardModule.tsx:345 — No tabular numbers on the amount column
- **Severity:** P3
- **Issue:** Amounts use `font-mono` (good) but no `tabular-nums`; mono is mostly stable, yet adding `tabular-nums` guarantees zero jitter for `.toLocaleString()` groups.
- **Suggestion:** Add `tabular-nums` to the class list.

### src/components/trello/TrelloBoardModule.tsx:198-206 — Board-wide empty state missing
- **Severity:** P2
- **Issue:** When there are zero matching tickets (e.g. strict tech/date filter), all 7 columns render the dashed "Drop tickets here" box — a noisy wall of 7 identical empty hints with no explanation that filters are active.
- **Suggestion:** When `visibleWorkOrders.length === 0`, render one centered empty state ("No tickets match the current filters — clear tech/date filter") instead of the columns.

### src/components/trello/TrelloBoardModule.tsx:272-289 — Tech-assign popover can clip off the right edge and has tiny items
- **Severity:** P3
- **Issue:** The popover is `absolute left-0 top-full ... w-44` anchored to the card — for cards in the rightmost columns (Cant Repair / Customer Not Repair, which sit at the right edge of a horizontally scrolled board) the menu overflows the viewport; menu rows are `px-2.5 py-1.5` (~28px) targets.
- **Suggestion:** Render the menu `right-0` when the column is right-aligned (or use a portal) and bump rows to `py-2`.

### src/components/trello/TrelloBoardModule.tsx:198-200 — Column drop target only highlights border, no card-count delta
- **Severity:** P3
- **Issue:** On `dragOver` the column gets `border-ink/40 bg-surface` but the count badge never previews the +1 — minor, but makes drop feedback feel flat.
- **Suggestion:** Optionally render `col.orders.length + (dragOverStage === col.id && draggedWoId ? 1 : 0)` in the badge.

### src/components/trello/TrelloBoardModule.tsx:214-217 — Card keyboard handler misses Delete/Backspace
- **Severity:** P3
- **Issue:** `onKeyDown` handles Enter/Space to open the inspector, but there's no Delete/Backspace shortcut nor any hint that the card is interactive (no focus ring styling either — `className` has no `focus-visible` rule).
- **Suggestion:** Add `focus-visible:ring-2 focus-visible:ring-brand/40` to the card class.

### src/components/trello/TrelloBoardModule.tsx:224-228 — Order-number row lacks `tabular-nums` and the date tooltip duplicates visible info
- **Severity:** P3
- **Issue:** The `title` attribute re-expands the exact date already shown next to it (only adds time); and `font-mono text-[11px]` numbers shift when IDs change length.
- **Suggestion:** Add `tabular-nums`; keep the tooltip but include the *status-change* time (more useful) or drop it.

### src/components/trello/TrelloBoardModule.tsx:311-345 — Three icon-only circular buttons differ in color language across the app
- **Severity:** P3
- **Issue:** Checkout = green circle, Diagnose = black circle, Reopen QA = amber outline — but the same "checkout" concept elsewhere (POS module) may use a text button; the reopen-QA action (destructive-ish, moves ticket back) uses warning styling while Delete elsewhere is danger-red. Mixed semantics for similar actions.
- **Suggestion:** Add `title` (already present) + keep, but align the reopen action with the app's destructive color (danger) or add a confirm color hierarchy doc.

---

## src/components/ai/AiDiagnosticAssistantModal.tsx

### src/components/ai/AiDiagnosticAssistantModal.tsx:504 — Copy button floats outside the bubble and is hover-only
- **Severity:** P2
- **Issue:** `<Button ... className="absolute -right-8 top-1.5 p-1 text-muted opacity-0 group-hover:opacity-100 hover:text-brand">` — the button sits 32px *outside* the message bubble's right edge (clips at the aside's edge for long messages), and `opacity-0` until hover makes it undiscoverable on touch devices where hover never fires.
- **Suggestion:** Place it inside the bubble (`right-2 top-1.5`) and use `opacity-100 sm:opacity-0 sm:group-hover:opacity-100` so mobile always shows it.

### src/components/ai/AiDiagnosticAssistantModal.tsx:456-461 — Dialog does not close on Escape and focus is not managed
- **Severity:** P2
- **Issue:** `<aside role="dialog" aria-modal="true" aria-label="Operations Copilot chat" ...>` — no Escape handler, no focus move into the panel on open, no focus restore on close, no focus trap. Chat is the one modal in the app that ignores the Esc convention every other modal implements.
- **Suggestion:** Add a keydown listener for `Escape → onClose()` (guarded when a text field has focus, or just close), and move focus to the input on open.

### src/components/ai/AiDiagnosticAssistantModal.tsx:534 — Message textarea has no visible focus ring
- **Severity:** P2
- **Issue:** `className="flex-1 min-h-[42px] max-h-28 resize-none border border-line bg-white rounded-xl px-3 py-2 text-xs focus:outline-none "` — raw textarea with `focus:outline-none` and no ring/border change; keyboard users get zero focus feedback on the primary input.
- **Suggestion:** Add `focus:border-brand focus:ring-2 focus:ring-brand/20`.

### src/components/ai/AiDiagnosticAssistantModal.tsx:482-483 — Quick-prompt chips are 28px targets with no disabled affordance distinction
- **Severity:** P3
- **Issue:** `className="px-2.5 py-1.5 bg-surface border border-line ... disabled:opacity-50"` — chip height ~28px (under 40px standard) and the disabled state (while loading) looks identical to the active look minus opacity.
- **Suggestion:** `py-2` chips, and when disabled add `cursor-not-allowed`.

### src/components/ai/AiDiagnosticAssistantModal.tsx:492-494 — System notice row and message role styles are inconsistent with bubble radius scale
- **Severity:** P3
- **Issue:** User bubble uses `rounded-2xl rounded-br-md`, assistant `rounded-2xl rounded-bl-md`, but the typing indicator re-uses `rounded-2xl rounded-bl-md` while the system notice is `rounded-lg` — three different corner treatments for "chat items."
- **Suggestion:** Standardize system notices as `rounded-lg` (fine) and keep bubbles consistent — the typing bubble should mirror assistant bubble exactly.

### src/components/ai/AiDiagnosticAssistantModal.tsx:470-472 — Header buttons 32px with no focus-visible style
- **Severity:** P3
- **Issue:** `className="p-2 text-muted hover:text-brand hover:bg-brand-soft rounded-lg"` — 32px targets (borderline) and no `focus-visible:ring`; hover-only feedback.
- **Suggestion:** Add `focus-visible:ring-2 focus-visible:ring-brand/30`; consider `p-2.5`.

### src/components/ai/AiDiagnosticAssistantModal.tsx:511-516 — Loading state has no stop/cancel affordance
- **Severity:** P3
- **Issue:** While `isLoading`, the only indicator is the typing bubble; there's no way to cancel a slow provider request, and the send button is disabled with no spinner on it.
- **Suggestion:** Swap the send icon for a `Square`/`X` "Stop" button while loading (AbortController), or at least put a spinner in the send button.

### src/components/ai/AiDiagnosticAssistantModal.tsx:470 — "New conversation" clears history without confirmation
- **Severity:** P3
- **Issue:** `clearConversation()` wipes the persisted chat and the visible conversation in one click with no confirm — an easy mis-tap on a long useful thread.
- **Suggestion:** Guard with the app's `confirmDialog` ("Clear this conversation and its saved history?").

### src/components/ai/AiDiagnosticAssistantModal.tsx:524-533 — Mobile bottom-sheet has no drag-handle or safe-area padding at the bottom
- **Severity:** P3
- **Issue:** The aside is `fixed inset-0` on mobile with `pt-[env(safe-area-inset-top)]` but no `pb-[env(safe-area-inset-bottom)]` — the input row sits flush against the home-indicator area on iPhones.
- **Suggestion:** Add `pb-[env(safe-area-inset-bottom)]` (or `pb-4` when in the sheet mode).

### src/components/ai/AiDiagnosticAssistantModal.tsx:296-300 — Assistant label row uses `text-muted` on white; fine, but the copy affordance duplicates the label row spacing
- **Severity:** P3
- **Issue:** Minor: the `mb-1` label inside bubbles + `space-y-3` list makes the feed feel airier than the input area; no alignment issue, but bubble max width 90% + copy button at -right-8 (see above) means the *actual* visible text width is ~90% minus nothing — the -right-8 button can overflow the aside padding.
- **Suggestion:** Fold into the copy-button fix (place inside bubble).

### src/components/ai/AiDiagnosticAssistantModal.tsx:449-452 — `isExternalAi` gate makes the status dot binary but never shows *which* failure mode
- **Severity:** P3
- **Issue:** The header dot is green (external) or brand (local); if external AI is configured but the provider call fails, the dot stays green while messages fall back to local silently (only a thin system notice appears mid-feed).
- **Suggestion:** Flip the dot to warning when the last response was a fallback (track `lastUsedSource`).

---

## src/components/common/CameraQrScannerModal.tsx

### src/components/common/CameraQrScannerModal.tsx:255-258 — Sound toggle lacks `aria-pressed` and its title describes state, not action
- **Severity:** P2
- **Issue:** `<Button onClick={() => setSoundEnabled(!soundEnabled)} ... title={soundEnabled ? 'Beep Audio On' : 'Beep Audio Muted'}>` — a toggle button with no `aria-pressed` (screen readers can't tell the state), and the title states the current state rather than the action ("Mute beep").
- **Suggestion:** Add `aria-pressed={soundEnabled}` and change title to `soundEnabled ? 'Mute beep' : 'Enable beep'`.

### src/components/common/CameraQrScannerModal.tsx:351-359 — Viewfinder shows a black void while the camera starts (no loading state)
- **Severity:** P2
- **Issue:** `<div className="relative bg-slate-900 rounded-3xl ... min-h-[280px] ...">` — between modal open and `isScanning` becoming true (camera enumeration + stream start can take 1-3s) the box is plain black with no spinner or "Starting camera…" text; on permission denial it stays black until the error swaps in.
- **Suggestion:** While `!isScanning && !errorMsg && activeTab === 'camera'`, render a centered `Loader2 animate-spin` + "Starting camera…" inside the viewfinder.

### src/components/common/CameraQrScannerModal.tsx:155-157 — Reticle and actual scan box are mis-sized (260x180 vs w-64 h-44)
- **Severity:** P2
- **Issue:** `qrbox: { width: 260, height: 180 }` vs the drawn reticle `<div className="w-64 h-44 border-2 border-brand rounded-2xl">` (256×176, line 355) — the highlighted frame the user aligns to is 4px narrower/shorter than the actual decode region, so edge codes can decode outside the visible frame.
- **Suggestion:** Use `qrbox: { width: 256, height: 176 }` (or change the reticle to `w-[260px] h-[180px]`).

### src/components/common/CameraQrScannerModal.tsx:238 — Overlay opacity inconsistent with other modals
- **Severity:** P2
- **Issue:** `bg-black/70 backdrop-blur-xs` vs `bg-slate-900/50` in DeviceModelChooserModal/CustomerNotificationModal — the same app shows three different backdrop darkness levels.
- **Suggestion:** Pick one overlay recipe (e.g. `bg-slate-900/50 backdrop-blur-xs`) and use it in all modals.

### src/components/common/CameraQrScannerModal.tsx:363 — Hardcoded hex for laser glow
- **Severity:** P3
- **Issue:** `shadow-[0_0_8px_#f43f5e]` — raw rose-500 hex; breaks token consistency and ignores dark-mode overrides.
- **Suggestion:** Use `shadow-[0_0_8px] shadow-danger/70` or a CSS var.

### src/components/common/CameraQrScannerModal.tsx:316-330 — Upload "dropzone" is not a real dropzone and the label lacks keyboard access
- **Severity:** P2
- **Issue:** The dashed box is decorative; only the inner `<label>` opens the picker, and a `<label>` is not keyboard-focusable — Enter/Space can't trigger it, and drag-and-drop of an image onto the box does nothing.
- **Suggestion:** Make the whole box a `<label>` (or add `tabIndex={0}` + `onKeyDown` + `onDrop`/`onDragOver` handlers with `e.preventDefault()`).

### src/components/common/CameraQrScannerModal.tsx:246-253 — Camera `<select>` removes focus outline with no replacement
- **Severity:** P3
- **Issue:** `className="bg-surface border border-line text-ink text-xs font-semibold px-2.5 py-1.5 rounded-xl focus:outline-none"` — invisible focus on the only dropdown in the modal.
- **Suggestion:** `focus:border-brand focus:ring-2 focus:ring-brand/20`.

### src/components/common/CameraQrScannerModal.tsx:213-241 — Tab buttons have no `aria-selected`/role="tab"
- **Severity:** P3
- **Issue:** Three buttons act as tabs (camera/upload/samples) with `activeTab === ...` styling but no `role="tablist"`/`role="tab"`/`aria-selected`; screen readers hear three plain buttons.
- **Suggestion:** Add `role="tablist"` on the container, `role="tab"` + `aria-selected` on each button.

### src/components/common/CameraQrScannerModal.tsx:90-110 — Scanner state isn't reset when the modal reopens
- **Severity:** P2
- **Issue:** Reopening the modal keeps `scannedResult` (and the success banner) from the previous session — the user sees a stale "Barcode Decoded" banner immediately on open; only tab switches clear it.
- **Suggestion:** In the `isOpen` effect, `setScannedResult(null)` and `setErrorMsg('')` on open.

### src/components/common/CameraQrScannerModal.tsx:286-290 — Camera error has no retry affordance
- **Severity:** P3
- **Issue:** When `startCameraScanner` fails (permission transiently denied, camera busy), the error banner appears but the only way to retry is closing and reopening the modal.
- **Suggestion:** Add a "Try again" button in the error banner that re-calls `startCameraScanner(selectedCameraId)`.

### src/components/common/CameraQrScannerModal.tsx:402-411 — Footer close button uses `hover:bg-black` hardcoded
- **Severity:** P3
- **Issue:** `className="px-4 py-2 bg-ink hover:bg-black ..."` — `hover:bg-black` is a raw color while the token system uses `ink`-family shades.
- **Suggestion:** `hover:bg-ink/90`.

### src/components/common/CameraQrScannerModal.tsx:282-284 — "Align Barcode" hint has no safe-area/landscape handling
- **Severity:** P3
- **Issue:** The reticle is fixed `w-64 h-44` inside a `min-h-[280px]` container; in landscape phone orientation the viewfinder can be shorter than the reticle + hint, clipping the hint pill.
- **Suggestion:** Use `max-h` + responsive reticle (`w-56 sm:w-64`) or `aspect-video` container.

---

## src/components/common/CustomerNotificationModal.tsx

### src/components/common/CustomerNotificationModal.tsx:143-145 — Header close button has no aria-label/title
- **Severity:** P2
- **Issue:** `<Button type="button" onClick={onClose} className="p-1.5 rounded-full hover:bg-white/10 ..."><X className="w-5 h-5" /></Button>` — icon-only close with no accessible name (every other modal's close has `aria-label`/`title`).
- **Suggestion:** Add `aria-label="Close notification modal"` (and `title` for parity).

### src/components/common/CustomerNotificationModal.tsx:127-131 — No Escape-to-close handler
- **Severity:** P2
- **Issue:** Every other modal in this audit (DeviceModelChooser, CameraQr, DeviceTagPrinter) closes on Escape; this one doesn't — inconsistent keyboard UX.
- **Suggestion:** Add the standard `window.addEventListener('keydown', ...)` Escape handler (and remove on unmount).

### src/components/common/CustomerNotificationModal.tsx:137-139 — Hardcoded `text-blue-300` and `text-slate-300` instead of tokens
- **Severity:** P2
- **Issue:** `Ticket <span className="font-mono text-blue-300 font-bold">` and `<p className="text-xs text-slate-300">` — raw Tailwind palette colors that won't follow the app's brand/dark-mode token overrides.
- **Suggestion:** `text-brand`/`text-brand-soft` for the ticket number; `text-muted` for the subtitle (on the dark header use `text-white/60` if needed).

### src/components/common/CustomerNotificationModal.tsx:249 — `totalAmount` rendered without a fallback (potential crash / NaN)
- **Severity:** P2
- **Issue:** `{workOrder.deviceModel} • {workOrder.totalAmount.toLocaleString()} MMK` — if `totalAmount` is `undefined` for a legacy/edge-case ticket, `.toLocaleString()` throws and the modal crashes; Trello (line 345) defensively uses `wo.totalAmount || wo.subtotal || 0` but this modal doesn't.
- **Suggestion:** `{(workOrder.totalAmount || 0).toLocaleString()}` and use `systemSettings?.currencySymbol || 'MMK'` for the suffix.

### src/components/common/CustomerNotificationModal.tsx:149-154 — Template textarea has no visible focus state
- **Severity:** P2
- **Issue:** `className="w-full bg-surface border border-line rounded-2xl p-3.5 text-xs ... focus:bg-white resize-none"` — the only focus change is the background flipping from surface to white; no border/ring change, so focus is subtle and easy to miss.
- **Suggestion:** Add `focus:border-brand focus:ring-2 focus:ring-brand/20`.

### src/components/common/CustomerNotificationModal.tsx:170-186 — `handleCopy` doesn't catch clipboard failures
- **Severity:** P3
- **Issue:** `navigator.clipboard.writeText(messageText)` with no try/catch (unlike AiDiagnosticAssistantModal's `copyMessage`); on non-HTTPS or permission-denied contexts the copy silently fails while still showing "Copied!".
- **Suggestion:** Wrap in try/catch and only set `copied` on success (fall back to `document.execCommand('copy')` with a textarea).

### src/components/common/CustomerNotificationModal.tsx:156-167 — Channel buttons lack `aria-pressed` and labels are English-only
- **Severity:** P3
- **Issue:** The three channel toggle buttons (Viber/SMS/Telegram) style by `channel === ...` but don't expose pressed state; also the surrounding template label says "(မြန်မာဘာသာ)" while the UI text itself is English — mixed-language labeling within one card.
- **Suggestion:** Add `aria-pressed={channel === 'Viber'}` etc.; consider localizing the button labels consistently.

### src/components/common/CustomerNotificationModal.tsx:138 — Long phone number not truncated/wrappable
- **Severity:** P3
- **Issue:** `({workOrder.customerPhone})` sits in a one-line subtitle — an 11-14 digit phone can overflow on narrow screens (no `truncate`/`break-all` on the flex parent).
- **Suggestion:** Add `truncate` to the subtitle paragraph and `min-w-0` on the flex container.

### src/components/common/CustomerNotificationModal.tsx:49-56 — Channel state initialized once; settings changes mid-session are ignored
- **Severity:** P3
- **Issue:** `const [channel, setChannel] = useState<'SMS' | 'Viber' | 'Telegram'>(initialChannel)` — if `settings.defaultNotificationChannel` changes while the app runs, the modal keeps the stale default.
- **Suggestion:** Sync via `useEffect` on `settings?.defaultNotificationChannel` (only when user hasn't chosen).

### src/components/common/CustomerNotificationModal.tsx:158-164 — Template chips are 28px targets with no keyboard focus style
- **Severity:** P3
- **Issue:** `className="px-3 py-1.5 rounded-xl text-xs font-bold ..."` — sub-40px touch targets; no `focus-visible` ring (base button removes outline).
- **Suggestion:** `py-2` and add `focus-visible:ring-2 focus-visible:ring-brand/30`.

### src/components/common/CustomerNotificationModal.tsx:96-99 — Copy/Send buttons lack loading or success state on Send
- **Severity:** P3
- **Issue:** "Send via {channel}" opens an external app via `window.open` — if the popup is blocked (common for `viber://`/`sms:` URLs), nothing happens and no feedback is given; there's also no disabled state while `isLogged`.
- **Suggestion:** After `handleSendAction`, show a transient "Opened {channel} ✓" inline confirmation; handle popup-blocker by also offering the copy fallback.

---

## src/components/common/DeviceTagPrinterModal.tsx

### src/components/common/DeviceTagPrinterModal.tsx:63-67 — `voucherFooterPreviewSizeClass` is a no-op map (all sizes → 'text-xs')
- **Severity:** P3
- **Issue:** `const voucherFooterPreviewSizeClass = { small: 'text-xs', medium: 'text-xs', large: 'text-xs' }[...]` — three keys, one identical value; the class adds nothing (the real sizing comes from the `.footer-text-*` classes at line 498). Dead code that suggests a bug: preview doesn't reflect chosen size.
- **Suggestion:** Map to real preview sizes (`small: 'text-[10px]', medium: 'text-xs', large: 'text-sm'`) or remove the map.

### src/components/common/DeviceTagPrinterModal.tsx:250-258 — Inconsistent date formatting within the same header block
- **Severity:** P2
- **Issue:** `Date: {new Date(workOrder.createdAt).toLocaleDateString()}` (locale-default) vs `Est. Return: ...toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })` (explicit) vs `Taken Out: ...toLocaleDateString()` — the same block renders dates in two different shapes depending on the browser locale.
- **Suggestion:** Use one formatter everywhere, e.g. `toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })`.

### src/components/common/DeviceTagPrinterModal.tsx:339 — `warrantyDays` can print "undefined Days"
- **Severity:** P3
- **Issue:** `<td className="p-1.5 text-right">{workOrder.warrantyDays} Days</td>` — if a ticket predates the warranty-days field, the printed voucher shows "undefined Days" on a customer-facing document.
- **Suggestion:** `{workOrder.warrantyDays ?? 0} Days` (the authorization text at line 67 already uses `?? 0`).

### src/components/common/DeviceTagPrinterModal.tsx:348 — `subtotal` rendered without fallback
- **Severity:** P2
- **Issue:** `{workOrder.subtotal.toLocaleString()} MMK` — same crash risk as CustomerNotificationModal: a ticket without `subtotal` (some flows set `totalAmount` only) throws during render of the print preview.
- **Suggestion:** `{(workOrder.subtotal || 0).toLocaleString()}`.

### src/components/common/DeviceTagPrinterModal.tsx:962 — Fake ASCII-art barcode on the sticker tag looks scannable but isn't
- **Severity:** P2
- **Issue:** `<div className="h-8 bg-black w-32 ...">|||| | |||||| | ||| | |||</div>` — a decorative barcode that mimics a real one; customers/techs may try to scan it and get nothing.
- **Suggestion:** Render a real barcode (e.g. JsBarcode/`bwip-js` with the order number) or clearly style it as decorative (thin dashed outline + "S/N lookup" label).

### src/components/common/DeviceTagPrinterModal.tsx:932 — Generic `alt="Logo"` on the tag preview logo
- **Severity:** P3
- **Issue:** `<img src={shopLogoUrl} alt="Logo" ...>` — the A4 voucher logo (line ~117) uses `alt={shopName}`, the tag uses generic "Logo".
- **Suggestion:** `alt={shopName}` for consistency.

### src/components/common/DeviceTagPrinterModal.tsx:177 — Inline `fontSize: '64px'` PAID watermark ignores theme/scale
- **Severity:** P3
- **Issue:** `style={{ fontSize: '64px', lineHeight: 1 }}` — hardcoded inline px on the watermark; on narrow screens the diagonal PAID stamp can clip oddly (it's inside `overflow-hidden`, so it just gets cut differently per device).
- **Suggestion:** Use a responsive class (`text-6xl sm:text-7xl`) or scale with `min()` (`style={{ fontSize: 'min(64px, 14vw)' }}`).

### src/components/common/DeviceTagPrinterModal.tsx:250-258 — No `tabular-nums` on the printed figures
- **Severity:** P3
- **Issue:** Voucher numbers, dates, and money cells use `font-mono` for some figures but `font-sans` for others (e.g. `Date:` line is sans, QR caption mono); printed totals can jitter between font metrics.
- **Suggestion:** Add `tabular-nums` to the `font-mono` money cells and keep date lines mono for alignment.

### src/components/common/DeviceTagPrinterModal.tsx:491-512 — Footer text-size-range boundary logic is fragile and hard to maintain
- **Severity:** P3
- **Issue:** The `voucherFooterTextSizeRanges` slicing (`boundaries`, `Math.max/min` clamps) is dense inline logic with no unit tests; a malformed range (start > end) silently drops footer text. UI/UX-wise, any bug here prints wrong-sized footer text on every voucher.
- **Suggestion:** Extract to a tested util (`applyFooterTextRanges(lines, ranges)`) and clamp/ignore invalid ranges.

### src/components/common/DeviceTagPrinterModal.tsx:796-808 — Footer size classes defined only inside `@media print` (preview mismatch)
- **Severity:** P3
- **Issue:** `.footer-text-small/medium/large` print overrides exist, but the *screen* preview relies on `voucherFooterPreviewSizeClass` (see first finding) which is a no-op — so the on-screen preview always shows the same footer size regardless of the saved setting, then prints at a different size. Users see one thing, print another.
- **Suggestion:** Fix the preview size map so screen preview matches print output.

### src/components/common/DeviceTagPrinterModal.tsx:302-307 — No loading state while `window.print()` dialog is open
- **Severity:** P3
- **Issue:** `handlePrint` calls `window.print()` synchronously; on slower devices the print dialog takes a moment and there's no visual ack on the Print button. Minor, but a brief "Preparing…" state improves perceived responsiveness.
- **Suggestion:** Set a `printing` state, show `Loader2` on the button, clear on `afterprint` event.

### src/components/common/DeviceTagPrinterModal.tsx:232-236 — Long header/shop-name text has no truncation in preview
- **Severity:** P3
- **Issue:** `{shopName}` (h1, `font-black text-base`) and `{voucherHeaderText}` are single-line paragraphs with no `truncate`/wrap control — a long saved receipt header wraps awkwardly under the logo and can push the QR block down in the preview.
- **Suggestion:** Allow wrapping with `leading-snug` and add `min-w-0` to the flex children, or `truncate` the shop name with `title` tooltip.

---

## Top 5 quick wins

1. **Fix the fake barcode on the 3"×2" sticker** (DeviceTagPrinterModal:962) — render a real scannable barcode or clearly decorative styling; customers scan it today and get nothing.
2. **Add `role="alert"` + focus rings to the three highest-traffic surfaces** — LoginPage error box (:70), AI chat textarea (:534), CustomerNotification textarea (:237): one-line a11y wins with visible payoff.
3. **Replace hardcoded `MMK` with the currency token in TrelloBoardModule:345 and CustomerNotificationModal:249** (and add `|| 0` guards there + DeviceTagPrinterModal:348) — prevents crashes on legacy tickets and respects the shop currency setting.
4. **Standardize modal backdrops** — pick one overlay recipe (`bg-slate-900/50 backdrop-blur-xs` or `bg-black/70`) and apply it to DeviceModelChooserModal:243, CameraQrScannerModal:238, CustomerNotificationModal:127.
5. **Sync the QR scan reticle with the real scan box** (CameraQrScannerModal:155 vs :363) — change `qrbox` to 256×176 so the highlighted frame matches the decode region exactly.

---

### File totals
| File | Findings |
|---|---|
| src/components/auth/LoginPage.tsx | 8 |
| src/components/mermaid/MermaidModule.tsx | 7 |
| src/components/devices/DeviceModelChooserModal.tsx | 12 |
| src/components/trello/TrelloBoardModule.tsx | 12 |
| src/components/ai/AiDiagnosticAssistantModal.tsx | 11 |
| src/components/common/CameraQrScannerModal.tsx | 12 |
| src/components/common/CustomerNotificationModal.tsx | 11 |
| src/components/common/DeviceTagPrinterModal.tsx | 12 |
| **Total** | **85** |
