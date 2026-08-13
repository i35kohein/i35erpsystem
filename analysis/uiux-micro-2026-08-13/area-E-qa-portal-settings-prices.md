# UI/UX Micro-Detail Audit — Area E: QA / Portal / Settings / Prices

Date: 2026-08-13 · Read-only audit · 5 files · 54 findings

---

## src/components/qa/QualityAssuranceModule.tsx

### src/components/qa/QualityAssuranceModule.tsx:361,497 — Hardcoded "MMK" instead of currency token
- **Severity:** P2
- **Issue:** Amounts render with a hardcoded string literal while the rest of the app (e.g. CustomerFacingWebPortal) uses `systemSettings.currencySymbol`. If the shop switches currency, QA still shows MMK.
  ```jsx
  <span className="font-mono font-extrabold text-xs text-ink">{wo.totalAmount.toLocaleString()} MMK</span>
  ```
- **Suggestion:** Thread `currencySymbol` (already available via `systemSettings`) and render `{wo.totalAmount.toLocaleString()} {currencySymbol}` in both the cards view (L361) and table view (L497).

### src/components/qa/QualityAssuranceModule.tsx:434-436 — Table row is clickable but not keyboard-accessible
- **Severity:** P2
- **Issue:** `<tr onClick={openQa} className="hover:bg-surface transition-colors cursor-pointer">` — the cards view (L343-346) correctly adds `role="button" tabIndex={0} onKeyDown`, but the table rows have no keyboard equivalent, no `tabIndex`, no focus style. Keyboard users cannot open the QA inspection from the table view.
- **Suggestion:** Add `tabIndex={0}`, `role="button"`, `onKeyDown` (Enter/Space → `openQa()`), and `focus-visible:bg-surface` to the `<tr>` — or better, put the click handler on an inner element.

### src/components/qa/QualityAssuranceModule.tsx:558 — Modal backdrop style inconsistent with other modals; no Esc close
- **Severity:** P2
- **Issue:** QA modal overlay: `bg-slate-900/50 p-3 sm:p-5` with **no** `backdrop-blur-xs`, while the portal modals (CustomerFacingWebPortal L1070/1152/1217) and PriceSettingsModal all use `backdrop-blur-xs`. Also there is no Escape-to-close handler (PriceSettingsModal has one; portal modals don't — inconsistent app-wide), and no focus trap in any modal.
- **Suggestion:** Add `backdrop-blur-xs` for consistency; add an `Escape` keydown listener that calls `setIsQaModalOpen(false)` (guard while typing in the notes input).

### src/components/qa/QualityAssuranceModule.tsx:743-748 — 14px tap target for diagnostic status toggle
- **Severity:** P2
- **Issue:** The cycle-status button is `!h-3.5 !w-3.5 !min-h-3.5 !min-w-3.5` (14×14px) with `text-[9px]` glyphs — far below the ~40px touch guideline and very hard to hit on a phone (this is the primary interaction in the whole module).
- **Suggestion:** Grow to at least `!h-6 !w-6 !min-h-6 !min-w-6` (`rounded-full`), keep glyph centered, and add `focus-visible:ring-2 focus-visible:ring-brand/40`; consider a `min-w` hit-area padding on the row instead.

### src/components/qa/QualityAssuranceModule.tsx:651,691 — "Add" photo button text at 9px
- **Severity:** P3
- **Issue:** `text-[9px] gap-0.5` label inside the 48px dashed add-photo tile — nearly illegible, and inconsistent with the `text-[11px]` section headers just above.
- **Suggestion:** Use `text-[10px]`/`text-[11px]` and `gap-1`; the tile itself is a fine target.

### src/components/qa/QualityAssuranceModule.tsx:769 — Non-token focus color (`focus:bg-lime-200/40`)
- **Severity:** P3
- **Issue:** Diagnostic note input flashes `focus:bg-lime-200/40` — a raw lime that clashes with the brand/success palette and looks like a bug when focused.
- **Suggestion:** Use `focus:bg-surface` / `focus:bg-brand-soft/40` or the app's `focus-within:border-brand` pattern used elsewhere (cf. PriceSettingsModal price cell).

### src/components/qa/QualityAssuranceModule.tsx:179 — Files >8MB silently dropped
- **Severity:** P3
- **Issue:** `if (file.size > 8_000_000) return;` — the user taps a photo, nothing happens, no toast or inline message explains why.
- **Suggestion:** Reuse the `photoLimitNotice` pattern: `setPhotoLimitNotice('Photo over 8MB skipped.')` with the same 4s auto-clear.

### src/components/qa/QualityAssuranceModule.tsx:196-217 — Optimistic "QA Confirmed" with no failure feedback
- **Severity:** P2
- **Issue:** `onSavePostRepairChecklist(...)` is fire-and-forget; `qaSavedNotice` shows "✓ QA Confirmed" immediately even if the parent write fails (Supabase error). Silent failure per rubric.
- **Suggestion:** Make the save callback `async`/promise-aware and show a `toast.error('QA save failed…')` (or a red inline notice) on rejection; only show "✓ QA Confirmed" on success.

### src/components/qa/QualityAssuranceModule.tsx:321-325 — Roster empty state flashes before first data load
- **Severity:** P3
- **Issue:** While `workOrders` is still loading (or after a filter), the module shows the full "No Finished Devices Pending QA Control" empty state — indistinguishable from a genuinely empty queue; no skeleton/min-height reserved.
- **Suggestion:** Reserve a minimum height (e.g. `min-h-[240px]`) for the roster container, or gate the empty state on a "loaded" flag so it only appears after the first fetch completes.

### src/components/qa/QualityAssuranceModule.tsx:325-570 — No visual "selected ticket" state in roster
- **Severity:** P2
- **Issue:** `selectedWoId` drives the inspector, but neither the table row nor the card grid highlights the currently selected ticket — after opening a modal and closing it, you can't tell which ticket you inspected.
- **Suggestion:** Add `selectedWoId === wo.id && 'bg-brand/5 ring-1 ring-brand/30'` to the row/card className.

### src/components/qa/QualityAssuranceModule.tsx:743-748 — Status glyph set inconsistent with app icons
- **Severity:** P3
- **Issue:** Status dot renders `\u2713` / `\u2715` / `?` (text glyphs) while the app standardizes on lucide icons (`CheckCircle2`, `X`). The `?` for "Cant Test" is especially ambiguous.
- **Suggestion:** Use lucide `Check`/`X`/`Minus` at `w-2.5 h-2.5` (or `w-3 h-3` once the button is enlarged).

### src/components/qa/QualityAssuranceModule.tsx:799-814 — Pinned footer controls only 24px tall
- **Severity:** P3
- **Issue:** Inspector dropdown and notes input are `!h-6 !min-h-6` (24px) in the pinned footer — compact touch targets and noticeably shorter than every other input in the modal (`!h-7`+ buttons, `h-8` close button).
- **Suggestion:** Bump to `!h-8 !min-h-8` for consistency and touch comfort.

### src/components/qa/QualityAssuranceModule.tsx:600-606 — Disabled Confirm button explains gate only via tooltip
- **Severity:** P3
- **Issue:** `title={...}` holds the only explanation for why Confirm QA Pass is disabled (verdict/photo/micro-soldering gates). Tooltips are invisible on touch and easily missed.
- **Suggestion:** Add a one-line helper under the button when `!canConfirm` (e.g. `"Set at least one Pass/Fail verdict to confirm"`), matching the photo-limit notice style.

---

## src/components/portal/CustomerFacingWebPortal.tsx

### src/components/portal/CustomerFacingWebPortal.tsx:742,1038 — Raw ISO timestamps shown to customers
- **Severity:** P2
- **Issue:** Repair log and chat timestamps render the raw ISO string: `{log.timestamp}` and `<span ...>{msg.timestamp}</span>` — e.g. "2026-08-13T02:45:00.000Z". Ugly and inconsistent with the formatted dates used elsewhere on the same page (e.g. L533-535).
- **Suggestion:** `{new Date(log.timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}` (define one shared formatter and reuse for both).

### src/components/portal/CustomerFacingWebPortal.tsx:767-800,886-935 — Money columns lack tabular-nums
- **Severity:** P2
- **Issue:** All financial figures use `font-mono` but never `tabular-nums`; `font-mono` digits are proportional in most fallback stacks, so totals in the financial card, estimate table and voucher modal wobble as values change.
- **Suggestion:** Append `tabular-nums` to every `font-mono` money span (or add a shared `money` class, e.g. `font-mono tabular-nums`).

### src/components/portal/CustomerFacingWebPortal.tsx:533-535 vs 494-499 — Inconsistent date locale for "Estimated Completion"
- **Severity:** P3
- **Issue:** Header completion date uses `toLocaleDateString(undefined, …)` while other dates in the file use `'en-US'` — locale-dependent output (and device-locale drift) for the same page.
- **Suggestion:** Use `'en-US'` consistently (match L833 approved-date formatting).

### src/components/portal/CustomerFacingWebPortal.tsx:656 — Perpetual `animate-ping` on Estimate tab badge
- **Severity:** P3
- **Issue:** `<span aria-hidden="true" className="w-2 h-2 rounded-full bg-warning animate-ping" />` pings endlessly while the estimate is pending — continuous motion that never resolves and can be visually distracting.
- **Suggestion:** Ping 2–3 times then settle (CSS animation with `animation-iteration-count: 3` and a static dot afterwards), or drop to a static dot.

### src/components/portal/CustomerFacingWebPortal.tsx:553-588 — 5-stage progress grid orphans the 5th card on mobile
- **Severity:** P3
- **Issue:** `grid grid-cols-2 sm:grid-cols-5` with 5 cards → 2+2+1 layout on phones; the final "5. Complete" card sits alone half-width, and there's no connector/arrow between stages to imply flow.
- **Suggestion:** On mobile use `grid-cols-1` stacked list or `flex overflow-x-auto` snap cards; or `grid-cols-3` with the 5th spanning. Add a subtle "current stage" label instead of relying on fill color alone.

### src/components/portal/CustomerFacingWebPortal.tsx:323,445 — 12px base font on a customer-facing portal
- **Severity:** P2
- **Issue:** Root containers use `text-xs` (12px) for body copy aimed at end customers (login page and all tabs). Fine for staff ERP density, but small for consumers, especially elderly/reading glasses.
- **Suggestion:** Bump portal body copy to `text-sm` (14px) at the root; keep labels/badges at `text-xs`.

### src/components/portal/CustomerFacingWebPortal.tsx:1168-1171 — "Submit Request" hover identical to base
- **Severity:** P3
- **Issue:** `className="flex-1 bg-danger hover:bg-danger text-white"` — `hover:bg-danger` equals the base color, so the primary action in the rejection modal has zero hover feedback (color snap missing per rubric).
- **Suggestion:** `hover:bg-danger-deep` or `hover:bg-danger/90` to match the approval modal's `hover:bg-success/90`.

### src/components/portal/CustomerFacingWebPortal.tsx:1070,1152,1217 — Approval/Rejection/Print modals: no Esc, no focus trap
- **Severity:** P2
- **Issue:** All three modals close only via X/Cancel buttons. No Escape handling and no focus trap/initial focus; keyboard users tabbing can reach the page behind the overlay.
- **Suggestion:** Add a shared `useModalEscape(onClose)` + move focus to the modal on open and return it on close (or at minimum Esc-to-close, matching PriceSettingsModal's behavior).

### src/components/portal/CustomerFacingWebPortal.tsx:1142-1144 — Rejection modal: submit never disabled for empty reason flow
- **Severity:** P3
- **Issue:** "Submit Request" is always enabled (even with empty notes — arguably fine), but the approval modal disables its confirm until signature+terms; the two sibling modals behave asymmetrically.
- **Suggestion:** Keep consistent: either require a note for "Other reason" (conditional required) or keep both always-enabled; at minimum mirror the disabled + `disabled:opacity-50` styling pattern.

### src/components/portal/CustomerFacingWebPortal.tsx:505-511 — Raw internal statuses shown verbatim to customers
- **Severity:** P3
- **Issue:** `Status: {currentWorkOrder.status}` renders shop jargon like "Receive" / "Taken Out" / "Cant Repair" (also used in the decline banner gate logic labels), while the progress bar uses friendly labels ("Received", "Ready Pickup").
- **Suggestion:** Map status → friendly label (e.g. `Receive → Received`, `Taken Out → Collected`) via a small lookup used by both badge and banner.

### src/components/portal/CustomerFacingWebPortal.tsx:1095-1102 — Approval modal summary: money row lacks tabular-nums; signature label contrast
- **Severity:** P3
- **Issue:** "Authorized Total" is `font-extrabold text-success` in a `font-mono` container — fine — but the signature hint "Type your full name as signature" placeholder is the only affordance; also the checkbox label `text-xs text-muted` is low-contrast for a legally-important consent line.
- **Suggestion:** Bump consent line to `text-xs text-ink font-semibold`; keep `text-muted` only for secondary hints.

### src/components/portal/CustomerFacingWebPortal.tsx:361-369 — Login error not announced to screen readers
- **Severity:** P3
- **Issue:** `loginError` renders in a plain `div` — no `role="alert"`/`aria-live`, so SR users never hear why login failed (and the brute-force lockout countdown is equally silent).
- **Suggestion:** Add `role="alert"` to the error banner div.

---

## src/components/settings/SystemManagementSettingsModule.tsx

### src/components/settings/SystemManagementSettingsModule.tsx:305,359 — Native `prompt()` dialogs in Settings
- **Severity:** P2
- **Issue:** Adding a custom payment method and adding a notification template both use the browser's `prompt()` — unstyled, inconsistent with the app's styled `confirmDialog`/toasts, and visually jarring mid-UI. Also no validation UX beyond `if (!customName.trim()) return;`.
- **Suggestion:** Replace with a small styled inline form/modal (reuse the `Input` + `confirmDialog` patterns), e.g. an inline "Add custom method" row with name + category fields like the category/supplier drafts in the same file.

### src/components/settings/SystemManagementSettingsModule.tsx:857-862 — Success banner leaks "Supabase" to users
- **Severity:** P2
- **Issue:** `Settings saved to Supabase. The header database icon shows the live connection status.` — internal infrastructure naming in user-facing copy; also shown optimistically with no error path if the save fails.
- **Suggestion:** Shorten to "Settings saved." (like other modules' toasts), and surface a `toast.error` on failure; remove the database-icon hint or move it to a tooltip.

### src/components/settings/SystemManagementSettingsModule.tsx:1005-1016 — Back bar shows no current-tab name
- **Severity:** P3
- **Issue:** After drilling into a tab the launcher is hidden, and the back bar only says "Back to Settings Menu" + dirty dot — no breadcrumb/title of the active section (e.g. "User Roles & Permissions"). Users lose orientation in a 14-tab system.
- **Suggestion:** Add the active tab's label/icon to the back bar (e.g. left side "‹ Back" + centered `User Roles & Permissions`), mirroring the launcher labels.

### src/components/settings/SystemManagementSettingsModule.tsx:1260-1290 — Tech modal: input heights mix `h-10` and `h-9`, radii mix `rounded-xl`/`rounded-lg`
- **Severity:** P3
- **Issue:** Name/email/phone/specialty inputs are `h-10 … rounded-xl`; commission inputs are `h-9 … rounded-lg` inside `p-3` cards; the Skill Tier dropdown is `h-10 rounded-xl` while the Status select is `h-10 rounded-xl` — the commission card fields are visibly shorter than their neighbors in the same grid row.
- **Suggestion:** Unify to `h-10 … rounded-xl` (or `h-9` everywhere) across the modal.

### src/components/settings/SystemManagementSettingsModule.tsx:1208-1216 vs 1373-1381 — User modal inputs vs tech modal inputs use different sizing recipes
- **Severity:** P2
- **Issue:** User modal inputs are `px-3 py-2 rounded-xl` (auto height), tech modal inputs are `h-10 px-3 rounded-xl` — same semantic level ("modal form field") styled two ways; the user modal's name/email rows sit noticeably shorter.
- **Suggestion:** Standardize on one recipe, e.g. `w-full h-10 px-3 rounded-xl border border-line-strong bg-surface focus:bg-white focus:outline-none` for both modals.

### src/components/settings/SystemManagementSettingsModule.tsx:1400-1460 — Role picker uses emoji instead of lucide icons
- **Severity:** P3
- **Issue:** `👑` / `🔧` / `📋` emoji as role icons — render differently per OS, and clash with the lucide icon set used everywhere else (including the header of this same modal, `UserPlus`).
- **Suggestion:** Swap to lucide (`Crown`/`Wrench`/`ClipboardList` or `Shield`, `UserCog`, `Inbox`).

### src/components/settings/SystemManagementSettingsModule.tsx:1473-1483 — Delete-Technician modal size/padding inconsistent with Add/Edit modals
- **Severity:** P3
- **Issue:** Delete confirm is `max-w-sm p-5 space-y-4 shadow-xl` vs Add/Edit modals `max-w-lg/xl p-6 shadow-2xl` — different widths, paddings and shadows for sibling dialogs; also lacks the `border-line-strong` and header structure of its siblings.
- **Suggestion:** Use the same container recipe (`max-w-md p-5 border-line-strong shadow-2xl animate-scale-in`) for all confirm dialogs.

### src/components/settings/SystemManagementSettingsModule.tsx:1401,1412,1423 — Role buttons missing `aria-pressed`
- **Severity:** P3
- **Issue:** The three role cards act as radio buttons (state shown by color) but have no `aria-pressed`/`role="radio"`, so SR users can't tell which role is selected.
- **Suggestion:** Add `aria-pressed={userFormData.role === 'Admin'}` etc. to each.

### src/components/settings/SystemManagementSettingsModule.tsx:1000-1003 — Back bar "Unsaved changes" dot lacks accessible label
- **Severity:** P3
- **Issue:** The dirty indicator is a `w-1.5 h-1.5` dot + text "Unsaved changes" — text is present so this is minor; but the launcher's tiny dot (L960-962) has `title="Unsaved changes"` only, invisible to touch users.
- **Suggestion:** Keep the visible text form everywhere; on launcher cards append `aria-label` to the badge span.

---

## src/components/prices/PriceCatalogModule.tsx

### src/components/prices/PriceCatalogModule.tsx:1061,1074 — Category filter chips 28px tall on mobile
- **Severity:** P2
- **Issue:** `!h-7 !min-h-0` (28px) on phones vs `sm:!h-10` on desktop — below the ~40px touch guideline exactly where the chips are the primary browse control.
- **Suggestion:** Use `!h-9 sm:!h-10` at minimum (36/40px) and add `min-w-0` truncation for long group names.

### src/components/prices/PriceCatalogModule.tsx:1107-1118 — Service cards: keyboard focus invisible
- **Severity:** P2
- **Issue:** Cards are `role="button" tabIndex={0} aria-pressed` with `focus:outline-none` but no `focus-visible` style — keyboard users get no focus indicator at all, while hover has `hover:border-ink/30`.
- **Suggestion:** Add `focus-visible:ring-2 focus-visible:ring-ink/40 focus-visible:border-ink` (or `focus-visible:border-brand`) to the card className.

### src/components/prices/PriceCatalogModule.tsx:1280-1283 — Mobile cart sheet: backdrop tap doesn't close
- **Severity:** P2
- **Issue:** The full-screen sheet wrapper has `role="presentation"` and no `onClick`, so tapping the dark backdrop does nothing — only the small X closes it. Standard bottom-sheet behavior is tap-outside-to-close.
- **Suggestion:** Add `onClick={() => setIsCartSheetOpen(false)}` on the backdrop and `e.stopPropagation()` on the inner content (pattern already used by the QA modal).

### src/components/prices/PriceCatalogModule.tsx:875-900 — Discount popup custom-% input low contrast
- **Severity:** P3
- **Issue:** Custom % input uses `text-ink/60` text and `placeholder:text-muted/50` — faint text on `bg-surface`; also `!h-9` (36px) is borderline for touch.
- **Suggestion:** `text-ink` (full) + `placeholder:text-muted`, `!h-10`.

### src/components/prices/PriceCatalogModule.tsx:654,678,688 vs 1198-1220 — tabular-nums used inconsistently
- **Severity:** P3
- **Issue:** Mobile cart rows use `tabular-nums` on prices, but desktop cart totals (`renderCartTotals` — Subtotal/Discount/Total Estimated) and the mobile floating bar use plain `font-mono` — columns wobble between the two layouts.
- **Suggestion:** Add `tabular-nums` to all `font-mono` money spans in `renderCartTotals` and the floating cart bar.

### src/components/prices/PriceCatalogModule.tsx:521-547 — Quote copy has no error handling or feedback toast
- **Severity:** P2
- **Issue:** `navigator.clipboard.writeText(text)` is unhandled — on insecure contexts/permission denial it silently does nothing, and the button flips to "Quote Copied!" regardless. Feedback is a button-text swap while the app standardizes on `toast()` (used 3× in this same file).
- **Suggestion:** `await navigator.clipboard.writeText(...)` in try/catch → `toast.success('Quote copied')` / `toast.error('Copy failed — permission denied')`; keep button text swap only on success.

### src/components/prices/PriceCatalogModule.tsx:163-166 — Swipe-to-remove "Remove" button has generic aria-label
- **Severity:** P3
- **Issue:** `aria-label="Remove item"` is identical for every row — SR users can't tell which service is being removed; the visual reveals the row context but the label doesn't.
- **Suggestion:** Accept an `itemLabel` prop and use `aria-label={`Remove ${itemLabel}`}`.

### src/components/prices/PriceCatalogModule.tsx:1150-1160 — Service card group label at 9-10px
- **Severity:** P3
- **Issue:** `text-[9px] sm:text-[10px] font-extrabold text-muted uppercase tracking-wider truncate` for the repair-category group — the smallest text on the card, borderline illegible on high-DPI phones.
- **Suggestion:** `text-[10px] sm:text-[11px]` and consider dropping the uppercase tracking for a cleaner look.

### src/components/prices/PriceCatalogModule.tsx:1187-1190 — Mobile discount circle duplicates card toggle logic
- **Severity:** P3
- **Issue:** The mobile `BadgePercent` trigger calls `handleToggleCartItem` inside its click (to add-if-missing) before opening the popup — the same service then appears in the popup header as if "in cart" state; double-taps can toggle the item off while the popup stays open (popup shows a stale item).
- **Suggestion:** Open the popup first, and let the popup's discount apply add the item to the cart (single source of truth), or close the popup whenever the item leaves the cart (`useEffect` on `cart`).

### src/components/prices/PriceCatalogModule.tsx:1363 — Discount notice can overlap the mobile floating cart bar
- **Severity:** P3
- **Issue:** `fixed bottom-24 … whitespace-nowrap` (96px up) vs the mobile cart bar (`bottom-0`, ~64px tall + safe-area) — on small phones the notice may sit right on top of the bar boundary or under the thumb zone; also no `pointer-events-none` so it blocks taps.
- **Suggestion:** Raise to `bottom-28`/`bottom-32` when the cart bar is visible and add `pointer-events-none`.

### src/components/prices/PriceCatalogModule.tsx:702-710 — Duplicated cart-card markup (≤3 vs >3 branch)
- **Severity:** P3
- **Issue:** The `totalItems <= 3` and `> 3` branches render nearly identical card markup (copy-pasted ~50 lines) — any future styling fix must be applied twice (this already diverged once: remove-button indentation at L803).
- **Suggestion:** Extract one `CartItemCard` component and render either the 3-slot array or the scroll list around it.

---

## src/components/prices/PriceSettingsModal.tsx

### src/components/prices/PriceSettingsModal.tsx:575 — Success banner uses raw green palette instead of app tokens
- **Severity:** P2
- **Issue:** `bg-green-50 border-green-200 text-green-700` (and `text-green-600` on the check icon) — the only place in the codebase's UI using raw Tailwind greens; the app standardizes on `bg-success/10 border-success/30 text-success-deep` (used in this same repo's QA/settings banners).
- **Suggestion:** `bg-success/10 border-success/30 text-success-deep` with `text-success` icon.

### src/components/prices/PriceSettingsModal.tsx:564,980 — Raw red/border tokens and invalid `hover:bg-danger/100`
- **Severity:** P2
- **Issue:** Reset button uses `border-red-200`; "Hide All" hover is `hover:bg-danger/100 hover:text-white hover:border-red-500` — `/100` isn't a valid opacity modifier here (no-op/broken), and `red-500`/`red-200` bypass the danger token system.
- **Suggestion:** `border-danger/30` and `hover:bg-danger hover:text-white hover:border-danger` (or `hover:bg-danger/90`), matching other danger buttons in the app.

### src/components/prices/PriceSettingsModal.tsx:541-566 — Icon-only buttons on mobile without aria-label
- **Severity:** P2
- **Issue:** Import CSV / Export JSON / Reset Defaults all do `<span className="hidden sm:inline">…</span>` — on phones the labels vanish leaving bare icon buttons with no `aria-label` (the Reset one has a `title`, which is not accessible to touch/SR reliably).
- **Suggestion:** Add `aria-label="Import CSV"` / `"Export JSON"` / `"Reset Defaults"` to each Button.

### src/components/prices/PriceSettingsModal.tsx:690-760 — Price table has no horizontal scroll on small screens
- **Severity:** P3
- **Issue:** The 3-column price table (`w-1/3` each, `px-4` cells) sits in `overflow-hidden` with no `overflow-x-auto` — on narrow phones the warranty input squeezes to ~80px and labels truncate unpredictably.
- **Suggestion:** Wrap the table in `<div className="overflow-x-auto">` and give `th/td` a `min-w-[140px]` so columns scroll instead of crushing.

### src/components/prices/PriceSettingsModal.tsx:703-716 — Price cell is `type="text"` with no numeric keyboard
- **Severity:** P3
- **Issue:** The price input takes money values but renders a text keyboard on mobile; contrast with the discount popup in PriceCatalogModule which correctly uses `inputMode="numeric"`.
- **Suggestion:** Add `inputMode="decimal"` (or `numeric`) and `autoComplete="off"`.

### src/components/prices/PriceSettingsModal.tsx:169 — Global warranty tool silently lacks the category selector the markup tool has
- **Severity:** P3
- **Issue:** `const [globalWarrantyCategory] = useState<string>('ALL');` — no dropdown, while the adjacent "Global Bulk Price Markup" tool offers both folder + category. The UI is asymmetric: the warranty tool's copy says "across target models" but you can't target a category.
- **Suggestion:** Add the same category `<select>` (bound to a real `setGlobalWarrantyCategory`) and pass it through to `applyGlobalWarranty`.

### src/components/prices/PriceSettingsModal.tsx:575-577,1270-1280 — Save feedback is an inline banner that can scroll out of view
- **Severity:** P3
- **Issue:** `triggerToast` sets `saveSuccess` which renders the banner at the top of the scrollable body — if the user is scrolled to the bottom of a long price table they never see "Settings updated & saved successfully." Inconsistent with the `toast()` system used by every other action in this file (import, delete, global adjust).
- **Suggestion:** Use `toast.success(saveMsg)` instead of (or in addition to) the inline banner.

### src/components/prices/PriceSettingsModal.tsx:1078-1081 — Folder rename Edit button is a 12px hit target
- **Severity:** P3
- **Issue:** `className="text-brand hover:text-brand/80 p-0.5 cursor-pointer"` with a `w-3 h-3` icon — roughly a 16px target next to a large card; hard to tap precisely.
- **Suggestion:** `p-1.5` + `rounded-md hover:bg-brand/10` for a comfortable ~28px target (or match the category-edit `p-1.5` buttons at L924-933).

### src/components/prices/PriceSettingsModal.tsx:464-467 — Close button lacks `type="button"`
- **Severity:** P3
- **Issue:** The header close Button has `onClick={onClose}` with no `type` — inside no form here, but the same component is embedded in Settings (L1473+) where defensive `type="button"` prevents accidental submit behavior if markup shifts. Minor, but the file's own convention sets `type="button"` everywhere else.
- **Suggestion:** Add `type="button"`.

### src/components/prices/PriceSettingsModal.tsx:1278-1290 — Currency preset buttons: active state slightly off-token and no aria-pressed
- **Severity:** P3
- **Issue:** Active preset uses `bg-brand-soft/60` (elsewhere the app uses `bg-brand-soft`) and buttons carry no `aria-pressed`, so SR users can't tell the selected currency.
- **Suggestion:** `bg-brand-soft` + `aria-pressed={currencySymbol === curr.sym}`.

---

## Top 5 quick wins

1. **Portal timestamps** — format raw ISO strings in repair logs (L742) and chat messages (L1038); one shared date formatter, instant visible win on the customer-facing page.
2. **QA table keyboard access** — add `tabIndex`/`onKeyDown` (or real buttons) to the roster `<tr>` at L434; matches the cards view and fixes a real a11y gap.
3. **Replace hardcoded "MMK" in QA (L361, L497)** with the `currencySymbol` token — one prop, consistent with the portal and settings modules.
4. **PriceSettingsModal palette swap** — replace `bg-green-50/border-green-200/text-green-700` (L575) and `border-red-200`/`hover:bg-danger/100` (L564, L980) with `success`/`danger` tokens; kills the only raw-green UI in the app.
5. **Icon-only mobile buttons need aria-labels** — Import CSV / Export JSON / Reset Defaults in PriceSettingsModal (L541-566) lose their labels on phones; add `aria-label` for SR and touch accessibility.

Total findings: **54** (QA 12 · Portal 12 · Settings 9 · PriceCatalog 11 · PriceSettingsModal 10)
