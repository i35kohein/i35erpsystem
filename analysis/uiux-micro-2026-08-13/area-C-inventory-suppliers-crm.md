# UI/UX Micro-Detail Audit — Area C: Inventory / Suppliers / CRM

Date: 2026-08-13 — Read-only audit. Line numbers verified via grep against
`i35erp-stable-v1` HEAD.

Files audited:
- src/components/inventory/InventoryManagementModule.tsx (3219 lines)
- src/components/inventory/InventoryModals.tsx (544 lines)
- src/components/suppliers/SupplierRmaModule.tsx (1103 lines)
- src/components/crm/CrmCustomerPortalModule.tsx (634 lines)
- src/components/common/RecycleBinModal.tsx (283 lines)
- src/components/common/TicketDetailInspectorModal.tsx (473 lines)

---

## src/components/inventory/InventoryManagementModule.tsx

### L2343, L2353, L2617, L2627, L2868 — Broken label text: `Cost Price ' {currency}')`
- **Severity:** P1 (visible/annoying)
- **Issue:** Labels render a literal template-literal artifact: `Cost Price ' MMK')`. A leftover from a refactor where `{currency}` was dropped inside quotes.
  ```jsx
  <label className="block font-bold text-ink mb-1">Cost Price ' {currency}')</label>
  ```
- **Suggestion:** `Cost Price ({currency})` — fix all 5 occurrences (Add modal ×2, Edit modal ×2, Warranty modal "Unit Cost").

### L2063 — Literal `{currency}` text inside matrix cell tooltip
- **Severity:** P2 (polish)
- **Issue:** The matrix cell `title` uses a template literal but `{currency}` is written as literal text, so the tooltip literally reads "Cost 1,234,000 {currency}".
  ```jsx
  title={`${matchingParts.length} SKU... Cost ${costValue.toLocaleString()} {currency} · Retail ...`}
  ```
- **Suggestion:** Use `${currency}`.

### L328 — Native `window.prompt` for bulk "Set Reorder Point"
- **Severity:** P2 (polish)
- **Issue:** Native browser prompt for a bulk destructive-ish edit; every other destructive action in the module uses the styled `confirmDialog`.
  ```js
  const input = window.prompt(`Set reorder point for ${selectedParts.length} selected part(s) to:`);
  ```
- **Suggestion:** Reuse `confirmDialog` with an inline number input (or a small styled modal), matching `bulkDelete`/`bulkSetReorder` patterns.

### L2114–2117, L2517–2520, L2808–2811 — Icon-only X close buttons missing `aria-label` / `title`
- **Severity:** P2 (a11y)
- **Issue:** Add-part, edit-part, and warranty modals close with a bare icon button — no accessible name (screen readers announce nothing).
  ```jsx
  <Button onClick={() => setShowAddModal(false)} variant="iconGhost" className="p-1">
    <X className="w-5 h-5" />
  </Button>
  ```
- **Suggestion:** Add `aria-label="Close"` + `title="Close"` to all three (and the quick-add supplier / edit supplier X buttons at ~L2952 / ~L3025, which have the same issue).

### L2139, L2547 — Device-chip remove buttons have `title` but no `aria-label`
- **Severity:** P3 (nitpick)
- **Issue:** Remove-X inside device chips relies on `title` (hover-only, not exposed to screen readers).
  ```jsx
  <Button ... className="ml-0.5 rounded-full p-0.5 hover:bg-brand/20 transition-colors" title={`Remove ${device}`}>
  ```
- **Suggestion:** Add `aria-label={`Remove ${device}`}` (keep title for sighted hover).

### L1516–1559 — SKU filter popup selects have no `aria-label`/`id`
- **Severity:** P3 (nitpick)
- **Issue:** Three `<select>`s (Model, Category, Owner) inside the sku-filter popup have only a sibling `<p>` label — no `id`/`aria-labelledby`, and no visible close affordance other than backdrop click.
- **Suggestion:** Add `aria-label="Filter by model"` etc. and an explicit "Done/Close" button in the popup footer.

### L1087–1109 — Inline-edit save bar button not disabled when there are no changes
- **Severity:** P3 (nitpick)
- **Issue:** The bar always renders an enabled "Save N Edits" button; clicking with zero edits pops a toast ("No changes to save") instead of the button being disabled. The inline-save *confirm* modal does this correctly with `disabled={!inlineSaveReview.length}`.
- **Suggestion:** `disabled={!inlineSaveReview.length}` on the bar button too (keeps the toast as a fallback).

### L1132–1133 — APP/KZH count chips at `text-[10px]`
- **Severity:** P3 (nitpick)
- **Issue:** In the "Total Active SKUs" metric card the owner counts are `text-[10px] font-black` — near-illegible on small cards next to the `text-xl/2xl` headline.
- **Suggestion:** `text-[11px]` or `text-xs` with `px-2 py-1`.

### L1818–1820 / L1988–1990 — Footer repeats the same count twice
- **Severity:** P3 (nitpick)
- **Issue:** `Showing all <strong>N</strong> parts` on the left and `N items` on the right — redundant information in the same row.
- **Suggestion:** Keep the left count, replace right with e.g. selection status or omit.

### L1512–1572 vs L1941–1949 — Inconsistent table cell density (stock vs profit)
- **Severity:** P2 (polish)
- **Issue:** Stock table `th`/`td` use `px-2 py-2`; profit table uses `p-2.5`. Same module, same-level tables, different vertical rhythm; also stock table is `text-xs` with `py-2` while profit rows are `p-2.5` — cramped vs airy.
- **Suggestion:** Normalize to one cell padding token (e.g. `px-2.5 py-2` both).

### L1728–1732 — Selling-price cell has no `tabular-nums`
- **Severity:** P2 (polish)
- **Issue:** Read-only money cell `font-sans text-sm font-semibold` with `toLocaleString()` — digits jitter as values change/sort. The inline-edit inputs *do* use `tabular-nums` (L1676, L1725, L1729).
  ```jsx
  <td className={`w-[13%] ... font-sans text-sm font-semibold text-success-deep whitespace-nowrap ...`}>
  ```
- **Suggestion:** Add `tabular-nums` (and apply to the profit table money cells L1859–1862, which use `font-mono` — fine — but the cards grid at L1923–1931 uses `font-mono`, ok).

### L1918–1939 — Mobile profit cards show bare numbers without currency symbol
- **Severity:** P2 (polish)
- **Issue:** The `<sm` card grid renders Cost/Selling/Profit as `{part.costPrice.toLocaleString()}` with **no currency**, while the desktop table in the same view shows `{currency}`.
- **Suggestion:** Append `{currency}` (or a compact `K`-suffix) to all three values.

### L1301 vs L1983–1986 vs L2120–2126 — Three different empty-state designs in one module
- **Severity:** P2 (polish)
- **Issue:** Stock empty state: big padded card with icon + helper + "Reset All Filters" button. Profit empty state: bare centered text, no button. Matrix empty state: minimal icon + 2 lines, no container card. Same module, three visual languages.
- **Suggestion:** Extract one `<EmptyState icon title hint action?>` component and use it in all three (the RMA/PO/supplier modules use yet another variant — see below).

### L1368 vs L1913 vs L1799–1800 vs L1971 — Same "View details" action, four button sizes
- **Severity:** P3 (nitpick)
- **Issue:** Card grid `h-8 w-8`, stock table `h-10 w-10`, profit cards `h-8 w-8`, profit table `h-10 w-10 lg:h-7 lg:w-7`. Same icon, same action, three different footprints; the `lg:h-7` variant drops to 28px (below the 40px target guideline).
- **Suggestion:** Pick one size (`h-9 w-9` or `h-10 w-10`) for the detail affordance everywhere.

### L1280 vs L1105/L2465 — Inconsistent press feedback (`active:scale-[0.99]` vs `active:scale-95`)
- **Severity:** P3 (nitpick)
- **Issue:** The low-stock banner uses `active:scale-[0.99]` (barely perceptible) while every other pressable in the module uses `active:scale-95`.
- **Suggestion:** `active:scale-[0.99]` → `active:scale-[0.99]` is the outlier; use `active:scale-[0.98]` or unify on `active:scale-95`.

### L1471 — Supplier name constrained to `max-w-[45%]` with no `title` fallback
- **Severity:** P3 (nitpick)
- **Issue:** Card footer supplier name truncates at 45% width with `truncate` but no `title` attribute — full name unrecoverable on hover.
- **Suggestion:** Add `title={part.supplierName}`.

### L2343 area — Add-part inputs `bg-surface` → `focus:bg-white` while edit modal inputs never change on focus
- **Severity:** P3 (nitpick)
- **Issue:** Add modal fields get `focus:bg-white focus:outline-none`; the edit modal (L2552+) fields are `bg-surface border border-line rounded-xl` with no focus change. Focus state is invisible in the edit modal.
- **Suggestion:** Mirror the add-modal focus treatment (`focus:bg-white focus:outline-none` or a `focus:border-brand` ring).

### L2465–2467 vs L2771 — Footer save buttons inconsistent padding
- **Severity:** P3 (nitpick)
- **Issue:** Add modal Save = `px-4 py-2`, edit modal Save = `px-5 py-2`, warranty modal = `px-5 py-2`; Cancel buttons `px-3/px-4` mixed too. Same role, three paddings.
- **Suggestion:** One shared footer-button class (e.g. `px-4 py-2`).

### L2801 — Warranty modal padding `p-6` vs `p-5` everywhere else
- **Severity:** P3 (nitpick)
- **Issue:** `className="bg-white border border-line rounded-2xl max-w-lg w-full p-6 space-y-4 text-xs shadow-2xl"` — only modal in the file using `p-6`.
- **Suggestion:** `p-5` to match add/edit/supplier modals.

### L2967–2972 — Warranty submit button `bg-warning hover:bg-warning` (no-op hover)
- **Severity:** P3 (nitpick)
- **Issue:** `hover:bg-warning` on a `bg-warning` button — hover does nothing (no depth cue).
- **Suggestion:** `hover:bg-warning-deep`/`hover:brightness-95` or `hover:bg-amber-500`-style darkening.

### L3133 — "Category changes" stat card always 0 (dead metric)
- **Severity:** P3 (nitpick)
- **Issue:** The inline-save confirm modal shows a "Category changes" count filtered by `/category/i`, but inline drafts can never edit category — the card is permanently 0 and confuses.
- **Suggestion:** Remove the card or repurpose it (e.g. "Stock changes" vs "Price changes").

### L1406–1459 — Card edit steppers fire a toast on every ± tap
- **Severity:** P3 (nitpick)
- **Issue:** Each `−`/`+` tap calls `toast.info/toast.success` (`Stock −1`, `Stock +1`) — toast spam while rapidly adjusting stock; the visible number is feedback enough.
- **Suggestion:** Drop the per-tap toast (or debounce to a single "Saved" on blur).

### Modals — No Esc-to-close / no focus trap / no backdrop-click close (all modals in file)
- **Severity:** P2 (a11y)
- **Issue:** Add/Edit/Warranty/Supplier/Inline-confirm modals ignore `Escape`, never trap focus, and only the filter popup registers an Esc handler (L113–120). Tab can wander behind the overlay; the modal can't be dismissed by keyboard.
- **Suggestion:** Shared `useModalBehavior(onClose)` hook: Esc close + focus trap + `aria-modal="true"` + return focus to trigger.

---

## src/components/inventory/InventoryModals.tsx

### L71–72 — Stock steppers shrink below the touch-target guideline on desktop (`lg:h-7 lg:w-7`)
- **Severity:** P2 (a11y)
- **Issue:** `className="flex h-10 w-10 lg:h-7 lg:w-7 ..."` — 40px on mobile, 28px on lg. Same shrink pattern appears on the Warranty button (L90 `lg:h-8`) and the profit-table detail button (InventoryManagementModule L1971). Inconsistent with the stock-table detail button which stays `h-10 w-10`.
- **Suggestion:** Drop the `lg:` shrink (keep `h-10 w-10`).

### L40–44 — Part header shows a leading "·" when category is empty
- **Severity:** P3 (nitpick)
- **Issue:** `{part.category} · {part.qualityTier}` — empty category renders " · Original" with no fallback, unlike the "—" fallback used elsewhere in the modal (`Bin: {part.locationBin || '—'}`).
- **Suggestion:** `{[part.category, part.qualityTier].filter(Boolean).join(' · ') || '—'}`.

### L33–34 — Modal lacks Esc-close, focus trap, and backdrop blur parity
- **Severity:** P2 (a11y)
- **Issue:** PartDetailsModal overlay uses `bg-slate-900/50` with `backdrop-blur-sm` (good) but no Esc handler and no focus management; repeated across the whole app.
- **Suggestion:** Shared modal hook (see InventoryManagementModule finding).

### L49 — No `alt`/`aria-hidden` concern; but device chips at `text-[10px]` (L53)
- **Severity:** P3 (nitpick)
- **Issue:** `text-[10px]` chips inside the details header are small for readability next to the `text-sm` title.
- **Suggestion:** `text-[11px]` with `px-2 py-1`.

### L243 — Print sheet "Checker: ______" hardcoded
- **Severity:** P3 (nitpick)
- **Issue:** Matrix print header prints an English blank line ("Checker: ______________________") even when the app UI is otherwise localized with the currency token; harmless but rigid.
- **Suggestion:** Keep (paper form), or hide behind settings — nitpick-level.

### L348–361 — TagsPrintSheet "Print Selected" toggles a class around `window.print()` synchronously
- **Severity:** P3 (nitpick)
- **Issue:** If the print dialog is canceled, the class is already removed — correct; but if `print()` throws (some mobile browsers), the class stays applied. Also no `aria-live` for selection changes.
- **Suggestion:** Wrap in try/finally and announce selection count via `aria-live="polite"` on the "Print Selected (n)" label.

### L397–427 — Tag-card keyboard handling is correct, but the visible checkbox is tiny (`h-3.5 w-3.5`)
- **Severity:** P3 (nitpick)
- **Issue:** The whole card is clickable (good, `role="button"` + Enter/Space), so the checkbox is redundant — but it's a 14px target inside the card.
- **Suggestion:** Keep card-click as primary; enlarge checkbox hit area with a padded wrapper.

### L331 — Tags sheet header shows "(0 parts)" with an empty grid when `parts` is empty
- **Severity:** P3 (nitpick)
- **Issue:** No empty state — the sheet renders an empty box of pages. The module's other views all have styled empty states.
- **Suggestion:** If `parts.length === 0`, show an inline "No parts to print" message instead of the grid.

### L53 / L311 — `truncate` on chip labels but no `max-w` bound in details modal chips
- **Severity:** P3 (nitpick)
- **Issue:** Device chips in PartDetailsModal (`L53`) truncate only via parent flex; long model names can stretch the modal. Cards elsewhere cap at `max-w-[130px]`.
- **Suggestion:** Add `max-w-[140px] truncate` to chip label spans.

### L90 — Warranty shortcut button double-close (`onWarranty(part); onClose();`)
- **Severity:** P3 (nitpick)
- **Issue:** `onWarranty(part); onClose();` — parent also closes via its own handler (`onWarranty` in InventoryManagementModule sets `claimingWarrantyPart` and clears `selectedPartForDetails`); the explicit `onClose()` is redundant and can cause a flicker if both state updates render one frame apart.
- **Suggestion:** Let the parent own modal switching; call only `onWarranty(part)`.

---

## src/components/suppliers/SupplierRmaModule.tsx

### L418, L794 — `bg-purple hover:bg-purple` no-op hover (same base and hover color)
- **Severity:** P3 (nitpick)
- **Issue:** Primary buttons "Flag Defective RMA" and "Submit Defective RMA" declare identical base/hover classes — no hover feedback. (`hover:bg-purple` = same as `bg-purple`.)
- **Suggestion:** `hover:bg-purple-deep` (check the purple token scale) or `hover:brightness-95`.

### L256–264 — Responsive view switch only forces cards, never restores table
- **Severity:** P2 (polish)
- **Issue:** The resize listener sets `setRmaView('cards')` below 768px but has no restore branch; rotating a phone to landscape (or resizing a window up) leaves the card grid even though the table would fit — unlike InventoryManagementModule's matchMedia listener which applies both directions (L230–242).
- **Suggestion:** Mirror the inventory pattern: `mql.addEventListener('change', e => setRmaView(e.matches ? 'cards' : 'table'))`.

### L700–796 — New RMA modal: no X close button, `shadow-xl` (vs `shadow-2xl`), plain-text title
- **Severity:** P2 (polish)
- **Issue:** Every other modal in the app has a header row with icon + title + X close. This one is a bare `shadow-xl` card with only a text `<h3>` and Cancel at the bottom — no way to dismiss without scrolling to footer; inconsistent shadow and header pattern.
- **Suggestion:** Add the standard header (icon + title + `aria-label` X) and bump to `shadow-2xl`.

### L706–756 — Modal labels use `text-muted` instead of the `font-bold text-ink` label style used in every sibling modal
- **Severity:** P2 (polish)
- **Issue:** `className="block text-muted mb-1"` labels in the RMA modal vs `font-bold text-ink` in the supplier/PO modals of the same file — inconsistent visual weight; low-contrast labels on low-contrast `bg-surface` fields.
- **Suggestion:** Unify: `block font-bold text-ink mb-1`.

### L707–752 — Form controls lack any focus treatment (`outline-none` with no focus class)
- **Severity:** P3 (nitpick)
- **Issue:** RMA modal `<select>`, `<Input>`, `<textarea>` all `outline-none` and never change on focus — invisible focus state for keyboard users. The PO modal selects (L1010+) have the same issue.
- **Suggestion:** `focus:border-brand focus:ring-2 focus:ring-brand/20` (matches TicketDetailInspectorModal's textarea L449).

### L441 vs L563 — RMA number and PO number use identical styling (`font-mono font-bold text-brand`)
- **Severity:** P3 (nitpick)
- **Issue:** Two different identifiers (RMA vs PO) share the exact same brand styling in the same module — no visual distinction between a defective-return ticket and a purchase order.
- **Suggestion:** Keep RMA brand; give PO numbers `text-purple` or a different token to differentiate at a glance.

### L577 — PO line items `{it.quantity}x {it.partName}` never truncate
- **Severity:** P3 (nitpick)
- **Issue:** Long part names can wrap/overflow the two-column PO card (flex row, no `min-w-0`/`truncate` on the span).
- **Suggestion:** `<span className="min-w-0 truncate">` and `title={it.partName}`.

### L427 / L605 / L683 — Empty states duplicated three times (copy-paste, only icon/heading differ)
- **Severity:** P3 (nitpick)
- **Issue:** Three nearly identical `min-h-[280px]` empty-state blocks — fine visually, but drift risk; also no action button (unlike inventory's "Reset All Filters").
- **Suggestion:** Extract a shared EmptyState component (used by all modules).

### L492–498 — RMA card "Action" block renders actions twice in some states
- **Severity:** P3 (nitpick)
- **Issue:** `{renderRmaActions(rma) && (<div>{renderRmaActions(rma)}</div>)}` — the actions are computed and rendered twice (guard + render). Works, but double DOM work and a smell; the two renders can disagree if the status changes mid-render.
- **Suggestion:** `const actions = renderRmaActions(rma); {actions && <div>{actions}</div>}`.

### L355–374 — Subtab badges: PO tab shows count, Supplier tab has none
- **Severity:** P3 (nitpick)
- **Issue:** RMA tab badge = `rmas.length`, PO tab badge = `purchaseOrders.length`, but the Vendor Catalog tab omits `suppliers.length` — inconsistent affordance for the same kind of info.
- **Suggestion:** Add `{suppliers.length}` badge to the Vendor Catalog tab.

### L322–333 — Status badge ternary treats any non-Approved/non-Shipped status as gray
- **Severity:** P3 (nitpick)
- **Issue:** `'Replacement Received'` (a positive, stock-restoring state) renders the same gray `bg-surface text-muted` badge as an unknown status; the card view handles it with a ↻ message but the badge color contradicts it.
- **Suggestion:** Give "Replacement Received" a distinct positive style (e.g. `bg-brand/10 text-brand`).

### L578–582 — PO card "Total PO Value" row: `font-bold` label but `text-sm` value vs `text-xs` card body
- **Severity:** P3 (nitpick)
- **Issue:** The total value is `text-sm` in a `text-xs` card — intentional emphasis, but no `tabular-nums`; totals jitter as lines change. Minor.
- **Suggestion:** Add `tabular-nums` to `font-mono text-sm` value.

---

## src/components/crm/CrmCustomerPortalModule.tsx

### L1 — `const FOCUS = 'focus-visible:outline-none ';` removes the focus ring without replacement
- **Severity:** P2 (a11y)
- **Issue:** The repair-count toggle (L288–296) gets `focus-visible:outline-none` and nothing else — keyboard users lose all focus indication on a button whose only label is a number + chevron.
- **Suggestion:** Replace with a visible focus treatment: `focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-1` (or remove the FOCUS string entirely).

### L319–320 — Customer name/company truncated at `max-w-[140px]` with no `title`
- **Severity:** P3 (nitpick)
- **Issue:** Long names cut off with no hover tooltip; common for Myanmar full names.
- **Suggestion:** Add `title={cust.name}` / `title={cust.company}`.

### L345 — Total-spent column lacks `tabular-nums`
- **Severity:** P3 (nitpick)
- **Issue:** `font-bold text-success-deep` with `toLocaleString()` — digits shift when rows change; the phone column beside it is `font-mono` (fine).
- **Suggestion:** `tabular-nums` on the spent cell (and the inline history amount L442).

### L371–378 — Edit/Delete icon buttons are `p-1.5` (~26px targets)
- **Severity:** P2 (a11y)
- **Issue:** Three icon actions in a row (`p-1.5` + `w-3.5 h-3.5` icons ≈ 26×26px) — below the 40px touch guideline and hard to hit on phones; also the Invoice button in the expanded row is `px-1.5 py-0.5` (≈20px).
- **Suggestion:** `p-2.5` minimum (40px) or `h-9 w-9` icon buttons.

### L262–267 — Whole row is clickable AND contains stopPropagation buttons
- **Severity:** P3 (nitpick)
- **Issue:** Row click opens the history modal; edit/delete/chevron stop propagation. Works, but the "Repairs" count button toggles inline expansion while the row opens the modal — two adjacent affordances with different destinations; misclicks are easy.
- **Suggestion:** Make only the count/chevron toggle expand and the "View" button open the modal; remove row-level onClick (or make row click = expand, button = modal).

### L133–134 — Keyboard `[`/`]` navigation gives almost no visible feedback
- **Severity:** P3 (nitpick)
- **Issue:** The shortcut only tints the row `bg-brand-soft/60` (subtle); since row click opens a modal, the tint may not be noticed and there's no toast/announcement. Also no `aria-live` for the selection.
- **Suggestion:** Announce via `aria-live="polite"` (or a brief toast) and strengthen the selected-row style.

### L216–223 — `handleCreateCustomerSubmit` has no success toast
- **Severity:** P2 (consistency)
- **Issue:** Inventory/Suppliers toast on every save (`toast.success('Supplier vendor ... registered.')`); CRM create/update silently closes the modal — no confirmation, and the failure path (missing name/phone) also silently returns.
- **Suggestion:** `toast.success(editingCustomer ? 'Customer updated' : 'Customer registered', 'Customer Saved')` and an error toast for the empty-name/phone guard.

### L316–318 — "Repairs" count is a `<Button>` whose only label is a number
- **Severity:** P3 (a11y)
- **Issue:** `title="Toggle repair history"` exists but the accessible name comes from the digits + chevron; screen readers announce "3" with no context.
- **Suggestion:** `aria-label={`${custOrders.length} repairs for ${cust.name}`}`.

### L300–310 — Customer type badge: Retail is `bg-white text-ink border-line` (flat), others colored
- **Severity:** P3 (nitpick)
- **Issue:** The most common type (Retail) looks like a disabled/empty state while rarer types are colored — inverted emphasis.
- **Suggestion:** Give Retail a subtle neutral fill (`bg-surface text-ink`) instead of white.

### L464–475 — Expanded history rows: order number and status compete for the same line
- **Severity:** P3 (nitpick)
- **Issue:** `{wo.orderNumber || wo.id}` (mono, bold) + status badge + Invoice button in one flex row — on narrow screens the row wraps awkwardly (badge/button have no `shrink-0` on the wrapper).
- **Suggestion:** `shrink-0` on the badge+button group and `truncate` on the order number.

### L483–484 — Serial number shown with no truncation
- **Severity:** P3 (nitpick)
- **Issue:** `SN: {wo.serialNumber}` in a flex row with date — long IMEI/serials push layout.
- **Suggestion:** `truncate` + `title` or `max-w-[40%]`.

### L418–420 — Add-customer modal is `max-h-[90vh] overflow-y-auto` but the footer scrolls with content
- **Severity:** P3 (nitpick)
- **Issue:** On short screens the Save/Cancel footer can scroll out of view — no sticky footer (other modals in the app keep the footer pinned with `shrink-0`).
- **Suggestion:** Wrap body in `overflow-y-auto` + `shrink-0` footer (pattern used by the Add Part modal).

### L222–230 — `selectedCustomer` state is nearly dead weight
- **Severity:** P3 (nitpick)
- **Issue:** The detail panel was replaced by a modal; `selectedCustomer` now only drives a subtle row tint. Two effects (L128–136, L144–149) manage it. Simplifiable, and its keyboard nav ties to it.
- **Suggestion:** Either restore a right-side detail panel (bigger win) or remove the state and highlight via the history modal instead.

---

## src/components/common/RecycleBinModal.tsx

### L233 — Invalid Tailwind class `z-60`
- **Severity:** P2 (polish)
- **Issue:** `className="fixed inset-0 bg-slate-900/50 z-60 ..."` — Tailwind has no `z-60` utility; the class generates nothing, so the nested "Empty Recycle Bin" confirm overlay relies on DOM order to stack above the parent (`z-50`). Fragile, and `z-70`/`z-80` in InventoryManagementModule (L2416, L2423) are also non-standard.
- **Suggestion:** Use `z-[60]` (and `z-[70]`/`z-[80]`).

### L233 — Nested confirm modal lacks the backdrop blur of its parent
- **Severity:** P3 (nitpick)
- **Issue:** Parent overlay uses `backdrop-blur-xs`; the nested one is plain `bg-slate-900/50` — the two overlaid layers render inconsistently.
- **Suggestion:** `backdrop-blur-xs` on the nested overlay too.

### L50 — Only modal in the app with an entrance animation
- **Severity:** P3 (nitpick)
- **Issue:** `animate-in fade-in duration-200` here; every other modal (inventory, suppliers, CRM, ticket inspector) opens with a hard cut. Either propagate this to all modals or remove for consistency — the app clearly supports the animation (Tailwind plugin classes).
- **Suggestion:** Add the same two classes to all modal overlays for uniform motion.

### L151–153 — Archived date rendered in danger red
- **Severity:** P2 (polish)
- **Issue:** `className="text-xs text-danger font-medium"` for "Archived on …" — red is reserved for destructive/error semantics elsewhere; an archival date is neutral info and reads as an error here.
- **Suggestion:** `text-muted` (or a warning tone if you want emphasis).

### L175–184 — Restore/Delete-permanently buttons grow full-width on mobile with no `title` on Restore
- **Severity:** P3 (nitpick)
- **Issue:** `flex-1 sm:flex-initial` is fine, but the Restore button has no `title`/`aria-label` distinguishing it beyond text (Delete has `title="Permanently Delete"`). Minor asymmetry.
- **Suggestion:** Add `title="Restore this ticket"`.

### L186 — "Delete Permanently" label hidden below md (`hidden md:inline`) leaving icon-only
- **Severity:** P3 (a11y)
- **Issue:** On mobile the button shows only the trash icon; it still has `title="Permanently Delete"` but no `aria-label` — screen readers get the title (not exposed by default).
- **Suggestion:** Add `aria-label="Delete permanently"`.

### L96–99 — Search input has no clear (×) affordance
- **Severity:** P3 (nitpick)
- **Issue:** Long searches must be manually cleared; the filter affects a long list with no visible reset.
- **Suggestion:** Add a small clear button when `searchQuery` is non-empty (mirrors the SKU filter popup pattern).

### L158–159 — `hover:border-brand/40 transition-all` — `transition-all` is broader than needed
- **Severity:** P3 (nitpick)
- **Issue:** `transition-all` animates layout-affecting properties; prefer `transition-colors` (used correctly elsewhere in the same file's buttons).
- **Suggestion:** `transition-colors`.

### Modal (whole file) — No Esc-to-close, no focus trap
- **Severity:** P2 (a11y)
- **Issue:** Same as the inventory modals: no Escape handler, no focus containment, no `aria-modal`/`role="dialog"` on the container.
- **Suggestion:** Shared modal hook (app-wide).

### L101–102 — Header Restore All / Empty Bin buttons `hidden sm:flex` duplicated into the filter bar for mobile
- **Severity:** P3 (nitpick)
- **Issue:** Works, but two copies of the same action in the same dialog; if the list is long, mobile users scroll past the filter bar copy. Acceptable, but a sticky action bar would be cleaner.
- **Suggestion:** Keep as-is (low value) or make the header bar sticky.

---

## src/components/common/TicketDetailInspectorModal.tsx

### L313 — Total estimate hardcodes `MMK` (module receives no currency)
- **Severity:** P2 (consistency)
- **Issue:** `{(workOrder.totalAmount || workOrder.subtotal || 0).toLocaleString()} MMK` — every other module formats with `systemSettings.currencySymbol` (CRM L345, inventory `currency` token). If settings change the symbol, this modal shows the wrong currency.
- **Suggestion:** Accept a `currency` prop (or `systemSettings`) and render `{currency}`.

### L54–55 — Outer modal `rounded-xl` vs `rounded-2xl` used by every sibling modal
- **Severity:** P3 (nitpick)
- **Issue:** `flex h-[92vh] ... flex-col overflow-hidden rounded-xl border border-line bg-white shadow-xl` — all other modals in the app (inventory, recycle bin, suppliers) use `rounded-2xl`. Also `shadow-xl` vs `shadow-2xl` elsewhere.
- **Suggestion:** `rounded-2xl` + `shadow-2xl` for parity.

### L52 — Overlay has no `backdrop-blur-sm` (all other modals blur)
- **Severity:** P3 (nitpick)
- **Issue:** `bg-slate-900/50` alone — content behind stays sharp, while inventory/CRM/RecycleBin overlays blur. Inconsistent depth cue.
- **Suggestion:** `backdrop-blur-sm`.

### Modal (whole file) — No Esc close / focus trap / `aria-modal`
- **Severity:** P2 (a11y)
- **Issue:** Same app-wide gap: Escape does nothing, focus leaks behind the overlay, no `role="dialog"`.
- **Suggestion:** Shared modal hook (see earlier finding).

### L323–324 — "Before · After" legend chip at `text-[9px]`
- **Severity:** P3 (nitpick)
- **Issue:** `text-[9px] font-black uppercase` — smallest text in the app; below comfortable readability.
- **Suggestion:** `text-[10px]` at minimum.

### L335–353 — Diagnostics rows use `min-h-7` (28px) with 16px dots
- **Severity:** P3 (nitpick)
- **Issue:** Dense list — okay for a scan-heavy inspector, but `min-h-7` rows with `gap-1.5` make the Pass/Fail dots easy to misread; consider `min-h-8` and `gap-2`.
- **Suggestion:** Slightly more breathing room.

### L442–458 — "Add Log" button: fake 300ms `setTimeout` reset with no spinner
- **Severity:** P3 (nitpick)
- **Issue:** `isSavingLog` disables the button for 300ms but never renders a spinner or "Saving…" label — the disable is invisible, so users may click twice believing nothing happened. The inline-save confirm modal has a proper spinner pattern (L3153–3155).
- **Suggestion:** Show a tiny inline spinner (reuse the `h-3 w-3 border-2 animate-spin` pattern) or drop the fake delay.

### L396–398 — Log timestamps come from `toLocaleString('en-US', ...)` while the rest of the app uses locale-default formatting
- **Severity:** P3 (nitpick)
- **Issue:** Hardcoded `en-US` produces "Aug 13, 2026, 9:15 AM" regardless of the user's locale; RecycleBinModal uses `toLocaleString([], {dateStyle, timeStyle})`. Two formats for the same kind of timestamp.
- **Suggestion:** Use the same locale-neutral format as RecycleBinModal.

### L203–204 — `repairSummary` joins repairs with ` • ` with no truncation
- **Severity:** P3 (nitpick)
- **Issue:** A long multi-repair summary can wrap to several lines in the narrow "Repairs" row; value has `truncate` on the span (L283) but the summary is precomputed text.
- **Suggestion:** `line-clamp-2` on the summary row value (there is a `truncate` but multi-line clamp is better).

### L291 — Color swatch `h-5 w-5` with `border-2 border-white` — no contrast ring on white modal background
- **Severity:** P3 (nitpick)
- **Issue:** Light colors (white/silver back glass) get a white border on a white card — the swatch edge disappears. `shadow` exists but is subtle.
- **Suggestion:** `border-line` instead of `border-white` (or `ring-1 ring-line`).

### L80–87 — StatusDot renders empty span for N/A with no visible placeholder
- **Severity:** P3 (nitpick)
- **Issue:** N/A rows show an empty 16px circle — fine, but keyboard/screen-reader users get only `aria-label` (title also present). Acceptable; listed for completeness with the suggestion to keep `aria-hidden` off (it's informative).

### L330 — Note column `max-w-[45%] truncate` in diagnostics rows
- **Severity:** P3 (nitpick)
- **Issue:** Same 45% cap as inventory's supplier name — truncation without `title` on mobile where hover doesn't exist (the `title={note}` IS present here — good; the real gap is mobile: no way to read a truncated note).
- **Suggestion:** Tap-to-expand (or `line-clamp-1`) on small screens.

---

## Top 5 quick wins

1. **Fix the broken price labels** — replace `Cost Price ' {currency}')` with `Cost Price ({currency})` at InventoryManagementModule L2343/L2353/L2617/L2627/L2868 (P1 visible text corruption).
2. **Fix the literal `{currency}` string** in the matrix cell tooltip (InventoryManagementModule L2063) — `${currency}`.
3. **Add `aria-label` to every icon-only X close button** (InventoryManagementModule L2115/L2518/L2809, supplier mini-modals) — one-line fixes, real a11y win.
4. **Kill the native `window.prompt`** in bulkSetReorder (L328) — route through the existing styled `confirmDialog`/mini-modal pattern.
5. **Normalize modal chrome** — warranty modal `p-6`→`p-5` (L2801), ticket inspector `rounded-xl`→`rounded-2xl` + `backdrop-blur-sm` (L54–55), RMA modal missing X close + `shadow-xl`→`shadow-2xl` (L703), and fix invalid `z-60` (RecycleBinModal L233) to `z-[60]`.
