# Area B — Intake + POS: UI/UX Micro-Detail Audit (2026-08-13)

Files audited:
- `src/components/intake/CreateTicketSoloPage.tsx`
- `src/components/intake/SimpleTicketCreator.tsx`
- `src/components/intake/IntakeWorkOrderModule.tsx`
- `src/components/pos/PosInvoicingModule.tsx`
- `src/components/pos/PosCheckoutPanel.tsx`
- `src/components/pos/PosModals.tsx`

Line numbers verified via grep. Read-only audit — no source changes.

---

## src/components/intake/CreateTicketSoloPage.tsx

### CreateTicketSoloPage.tsx:758-773 — Wizard step chips look clickable but future steps silently ignore clicks
- **Severity:** P2
- **Issue:** Every chip renders as an active `Button` with `cursor-pointer`, but steps ahead of the current one only work if `canNextStep()` passes. Clicking "4 Diagnostic" on step 1 does nothing with zero feedback — no disabled style, no toast.
  ```tsx
  onClick={() => { if (s.n < wizardStep || canNextStep()) setWizardStep(s.n); }}
  ```
- **Suggestion:** Render future-step chips with `disabled` styling + `cursor-not-allowed` (or a toast "Complete step 3 first") so the affordance matches reality.

### CreateTicketSoloPage.tsx:786 vs 942/1044/1140 — Step-title font sizes inconsistent across wizard steps
- **Severity:** P2
- **Issue:** Step 1 heading is `text-sm` inside the h3 (`<span className="text-sm truncate">Customer Information</span>`), while every other section heading (Device, Repairs, Diagnostics, Photos) is `text-xs`. Same semantic level, different size.
- **Suggestion:** Unify all step-card h3 titles to `text-xs font-extrabold` (or all `text-sm`).

### CreateTicketSoloPage.tsx:989-1014 / 1036-1056 — `<h3>` heading nested inside a `<Button>`
- **Severity:** P2
- **Issue:** The Color and Warranty picker cards are `<Button>` elements containing `<h3>` headings and `<span>` blocks — interactive element containing a heading is invalid/nested-interactive markup (same pattern at 989 and 1036).
  ```tsx
  <Button ... className="w-full min-w-0 text-left p-3 ...">
    <h3 className="text-xs font-extrabold text-ink ...">Realistic Color ...</h3>
  ```
- **Suggestion:** Convert the outer `<Button>` to a `<div role="button" tabIndex={0} onKeyDown>` (pattern already used at line 944 for the model card) or move the heading outside the button.

### CreateTicketSoloPage.tsx:993/1019/1040/1273/1296/1537 — Dead `hidden` step-badge spans
- **Severity:** P3
- **Issue:** Six hardcoded `hidden` badge spans ("2a", "2b", "4A", "4B") ship in the DOM — dead code that bloats markup and signals the step-numbering scheme is half-removed.
- **Suggestion:** Delete the spans; if the badge concept is retired, remove entirely.

### CreateTicketSoloPage.tsx:809 vs 866 — `aria-required="false"` on the field whose label shows "Phone Number *"
- **Severity:** P2
- **Issue:** The phone field is visually required (`Phone Number *`) and its label counter shows, but it sets `aria-required="false"` and `handleRegisterDevice` never validates phone — screen readers get the opposite of what the label promises.
- **Suggestion:** Either enforce non-empty phone (with `errs['field-customer-phone']`) or drop the `*` from the label; set `aria-required` consistently with reality.

### CreateTicketSoloPage.tsx:941-954 — Device model card: 20px unlabeled swatch space + `role="button"` div
- **Severity:** P3
- **Issue:** The model selector is a div with `role="button"` (has keyboard support — good), but the "Choose Device Model First" CTA row uses `bg-warning` box without `aria-hidden` issues; minor: `animate-pulse` on the warning icon at 957 runs forever.
- **Suggestion:** Keep pulse animation only briefly (e.g., 2 iterations via `animate-[pulse_1s_ease-in-out_3]`) so it doesn't distract permanently.

### CreateTicketSoloPage.tsx:1228-1232 — Remove-repair button missing `type="button"` and hover color snap
- **Severity:** P3
- **Issue:** The row delete button has `onClick` but no `type="button"`; it also toggles `hover:text-danger` with `transition-colors` (fine) but lacks focus-visible styling.
- **Suggestion:** Add `type="button"` and `focus-visible:ring-2 focus-visible:ring-danger/30` for keyboard users.

### CreateTicketSoloPage.tsx:1205-1218 — Per-repair discount `<input type="number">` with no accessible label
- **Severity:** P2
- **Issue:** The discount input is a bare number field with a floating `%` suffix span; no `id`/`aria-label`/`name` links it to "Discount:". Screen readers announce it as an unnamed edit box.
- **Suggestion:** Add `aria-label={`Discount percent for ${repair.name}`}` and `title`.

### CreateTicketSoloPage.tsx:1243-1265 — Summary grid leaves an empty cell on md+ (col-span mismatch)
- **Severity:** P3
- **Issue:** 5 cells in a `grid-cols-2 md:grid-cols-3` grid; "Final Estimate" is `col-span-2 md:col-span-2`, so on desktop row 2 has final(2) + one empty slot — visible dead space.
- **Suggestion:** Use `md:col-span-3` for the final box, or make it `col-span-2 md:col-span-1` and let it fill the last slot.

### CreateTicketSoloPage.tsx:652/1181/1203/1224/1251/1263/1615/1619/1895 — Currency hardcoded `MMK` in ~10 places instead of the settings token
- **Severity:** P2
- **Issue:** `{...toLocaleString()} MMK` is hardcoded throughout; `SimpleTicketCreator`/POS use `systemSettings?.currencySymbol || 'MMK'`. A shop changing currency in Settings won't see intake update.
- **Suggestion:** Thread `currency` (from `systemSettings?.currencySymbol || 'MMK'`) and replace every literal `MMK`.

### CreateTicketSoloPage.tsx:1611-1620 — Sticky-bar "Estimate" (pre-tax) vs success screen "Total Estimate" (with tax) — same word, different number
- **Severity:** P2
- **Issue:** The sticky bar shows `{finalEstimate} MMK` labeled "Estimate" (line 1615), while the success card shows `createdTicket.totalAmount` labeled "Total Estimate" (line 652) — totalAmount includes tax. Both are called "estimate" but differ, and the Summary Box "Final Estimate" (1263) is also pre-tax. Headline number changes meaning between screens.
- **Suggestion:** Label the pre-tax number "Subtotal (before tax)" and reserve "Total / Amount Due" for the tax-inclusive figure everywhere in intake.

### CreateTicketSoloPage.tsx:1410/1452/1491/1689/1738/1800 — Raw `bg-slate-900/40|50` overlays + no Esc/focus-trap/animation on 6 modals
- **Severity:** P2
- **Issue:** All six overlays use raw `bg-slate-900/40` or `/50` (not a design token), none close on `Escape`, none trap focus, none restore focus to the trigger, and none have an open/close transition (no fade/scale) — while `PosAddPartModal` at least has `animate-i35-slide-up`. Inconsistent modal behavior across the app.
- **Suggestion:** Extract one shared `<ModalShell>` (token overlay `bg-ink/40`, Esc handler, `role="dialog" aria-modal`, focus trap, `animate-fadeIn`/scale) and reuse in all 6 places.

### CreateTicketSoloPage.tsx:1798-1916 — Repairs modal close X missing `aria-label` + `type="button"`
- **Severity:** P2
- **Issue:** MODAL 4's close button is a bare `<X>` with no `aria-label` and no `type="button"` — the other two modals (1689, 1738) have labels. Icon-only button with no accessible name.
- **Suggestion:** Add `aria-label="Close repairs picker"` and `type="button"` (match the pattern at lines 1689/1738).

### CreateTicketSoloPage.tsx:1818-1835 — Price-catalog list has no "no results" empty state
- **Severity:** P2
- **Issue:** If `priceSearchQuery`/group filter matches nothing, the `min-h-[220px]` list renders blank white space — silent dead end (SimpleTicket's twin picker at SimpleTicketCreator.tsx:1100 has the "No repairs match your search." message; this one doesn't).
- **Suggestion:** Add the same empty-state block: `No repairs match your search.` with a clear-filters action.

### CreateTicketSoloPage.tsx:1310-1334 — Diagnostics toolbar buttons ~28px tall (`!h-7 !min-h-7`) and ⋮ menu button 20px (`!h-5 w-5`)
- **Severity:** P2
- **Issue:** "Mark All Pass / Mark All N/A / Reset" are 28px and the per-item ⋮ button (1378) is 20px — well under the ~40px touch-target guideline, on an iPad-first workflow.
- **Suggestion:** Bump to `!h-9 !min-h-9` / `w-8 h-8` at minimum on touch devices; keep text `text-[11px]`.

### CreateTicketSoloPage.tsx:1396 — Fail-reason note rendered at `text-[9px]`
- **Severity:** P3
- **Issue:** `⚠ {item.note}` chip is 9px with `truncate` — the most important diagnostic info (why a part failed) is the smallest text on screen and gets truncated with only a hover title (useless on touch).
- **Suggestion:** Raise to `text-[11px]` and show full note (or `line-clamp-2`), or open it in the comment modal on tap.

### CreateTicketSoloPage.tsx:1410-1450 / 1452-1490 / 1491-1533 — Custom confirm dialogs: no `role="dialog"`, no Esc, no initial focus, no animation
- **Severity:** P2
- **Issue:** The Mark-All-Pass, duplicate-device, and comment modals are plain divs; keyboard users can tab into the page behind them, and Esc doesn't cancel. Comment modal autoFocus (good) but the others have no focus management.
- **Suggestion:** Wrap in a shared dialog shell with `role="dialog" aria-modal="true"`, Esc-to-close, and focus the cancel button on open.

### CreateTicketSoloPage.tsx:1535-1570 — Photo hint text omits the 6-photo cap
- **Severity:** P3
- **Issue:** Helper says "Up to 8MB per photo — tap × on a thumbnail to delete." but the code enforces `MAX_INTAKE_PHOTOS = 6` and toasts about it — the hint doesn't mention the count cap.
- **Suggestion:** Say "Up to 6 photos, 8MB each — tap × on a thumbnail to delete."

### CreateTicketSoloPage.tsx:1642-1672 — "Create Ticket & Print" label but no print happens
- **Severity:** P2
- **Issue:** Primary button reads `Create Ticket & Print` (1667), yet `handleRegisterDeviceInner` only calls `onSaveWorkOrder`; printing requires a *second* tap on "Print Sticker Tag Voucher" on the success screen. Same misleading pattern in SimpleTicketCreator ("Save & Print", line 920).
- **Suggestion:** Rename to "Create Ticket" (or actually trigger the print/voucher modal on save).

### CreateTicketSoloPage.tsx:627 — Success-screen phone number not truncated; long numbers can overflow
- **Severity:** P2
- **Issue:** `{createdTicket.customerPhone}` renders inside `flex justify-between` with no `truncate`/`break-all` — a long international phone pushes the card width on mobile.
- **Suggestion:** Wrap in `<span className="truncate ml-2">` with `min-w-0` on the flex container.

### CreateTicketSoloPage.tsx:814-839 — Phone suggestion dropdown: double-firing handlers + no keyboard navigation
- **Severity:** P3
- **Issue:** Each suggestion has both `onMouseDown` (with preventDefault) and `onClick` calling the same handler — fires twice per click path; also no ArrowUp/Down/Enter keyboard support for the list.
- **Suggestion:** Keep only `onMouseDown` (it beats blur) and remove `onClick`, or keep onClick and drop the mousedown; add arrow-key navigation.

### CreateTicketSoloPage.tsx:844-854 — "NEW USER" chip text-[10px] + Customer-Type dropdown `h-10` vs inputs `py-2.5` (height mismatch)
- **Severity:** P3
- **Issue:** The NEW USER pill is 10px type (small but readable); more notably the `CustomDropdownMenu` button is fixed `h-10` (40px) while sibling `Input`s are `py-2.5` (~42px) — fields in the same grid row differ by 2px, causing a subtle stagger.
- **Suggestion:** Give the dropdown `h-[42px]` or align inputs to `h-10` with `py-0`.

### CreateTicketSoloPage.tsx:782/944/1059/1138/1271/1293/1535 — Card surface alpha inconsistent across wizard steps
- **Severity:** P2
- **Issue:** Same wizard cards alternate `bg-surface` (782, 1271, 1293, 1535), `bg-surface/80` (944, 1059, 1138), and `bg-surface/60`-style nesting — the step cards visibly shade differently on the same page.
- **Suggestion:** Standardize all step cards to one value (e.g., `bg-surface`).

### CreateTicketSoloPage.tsx:1922 — Camera scanner `Suspense fallback={null}` — blank flash while ~340KB chunk loads
- **Severity:** P2
- **Issue:** Opening "Scan QR / Barcode" shows nothing until html5-qrcode resolves; on slow networks this looks like a dead tap.
- **Suggestion:** Render a small centered spinner fallback (e.g., `<div className="p-10"><span className="animate-spin ..."/></div>`).

### CreateTicketSoloPage.tsx:389-392 — `import { Button , Input } from '../ui';` stray space + missing blank line before `serviceType`
- **Severity:** P3
- **Issue:** Formatting nits: `Button , Input` and `assignedTechName: ...,      serviceType:` runs onto one line (line ~453-454) breaking readability.
- **Suggestion:** Run Prettier on the file.

---

## src/components/intake/SimpleTicketCreator.tsx

### SimpleTicketCreator.tsx:731/898/1197 — MMK hardcoded in the "simple" form while the success screen uses the currency token
- **Severity:** P2
- **Issue:** `finalEstimate.toLocaleString()} MMK` at 731/898/1197 (row summary, footer, picker summary) vs `systemSettings?.currencySymbol || 'MMK'` at 501 (success screen). Same component, two currency sources.
- **Suggestion:** Derive `const currency = systemSettings?.currencySymbol || 'MMK'` and use everywhere.

### SimpleTicketCreator.tsx:882 — Note input highlight uses raw `focus:bg-lime-200/40` (non-token color)
- **Severity:** P2
- **Issue:** `focus:bg-lime-200/40` is a raw Tailwind color in a design system that otherwise uses tokens (brand/success/line) — the flash of lime clashes with the palette.
- **Suggestion:** Use a token tint, e.g. `focus:bg-brand-soft/50`.

### SimpleTicketCreator.tsx:864 — 21-point status toggle button is 16px (`!h-4 !w-4`)
- **Severity:** P2
- **Issue:** The Pass/Fail cycle button is 16×16px — far below the ~40px touch target, and it's the *primary* interaction for 21 rows on an iPad workflow.
- **Suggestion:** Enlarge to `!h-6 !w-6` (24px) with `p-1` hit area, or wrap in a larger invisible hit zone.

### SimpleTicketCreator.tsx:859-878 — Checklist note input invisible until focus (no border, transparent bg)
- **Severity:** P2
- **Issue:** The per-row note `<input>` is `bg-transparent px-1` with no border — nothing signals it's editable until the user happens to click it.
- **Suggestion:** Add a faint bottom border or a `hover:bg-surface` affordance, plus `aria-label` (it has one — good) and `title="Add note"`.

### SimpleTicketCreator.tsx:554 — Emoji `✏️ Edit existing ticket…` in a native `<option>`
- **Severity:** P3
- **Issue:** Emoji inside a `<select>` renders inconsistently across platforms and breaks the otherwise clean type system.
- **Suggestion:** Plain text: `Edit existing ticket…`.

### SimpleTicketCreator.tsx:495-547 vs CreateTicketSoloPage.tsx:614-680 — Two success screens, two button languages
- **Severity:** P2
- **Issue:** SimpleTicket success uses raw `<button>`s with `px-5 py-2.5 text-xs` while CreateTicket's twin screen uses the `<Button>` component — same semantic screen, different padding/typography/component. Also SimpleTicket's screen omits the phone/color summary rows the other screen shows.
- **Suggestion:** Extract one shared `TicketSuccessCard` component used by both.

### SimpleTicketCreator.tsx:920 — "Save & Print"/"Update & Print" button prints nothing on save
- **Severity:** P2
- **Issue:** Same misleading label as CreateTicket — `handleSubmit` saves and shows the success screen; printing needs the extra "Print Sticker Tag Voucher" tap (and the savedFlash bar also offers "🖨 Print Ticket").
- **Suggestion:** Rename to "Save Ticket" or auto-open the print tag flow after save.

### SimpleTicketCreator.tsx:921-926 — "Clear" reset button has no confirmation and wipes a half-filled form silently
- **Severity:** P3
- **Issue:** `type="reset"` instantly clears name/phone/repairs/photos with no undo or confirm; a fat-finger tap on mobile loses everything.
- **Suggestion:** Either `confirmDialog` before reset or a "Undo" toast after reset.

### SimpleTicketCreator.tsx:1002-1013 — Photo-remove X only visible on hover on desktop (`sm:opacity-0 sm:group-hover:opacity-100`)
- **Severity:** P3
- **Issue:** On desktop there's no persistent affordance that thumbnails are removable; also the "+ Add Photo" button is `text-[10px]` — tiny.
- **Suggestion:** Keep a faint border/× at `opacity-40` by default on the thumbnails; bump add button to `text-xs`.

### SimpleTicketCreator.tsx:1025-1031 — Color picker & repairs popup lack Esc/backdrop-focus handling and animation
- **Severity:** P2
- **Issue:** Both bottom-sheet popups close on backdrop click (good) but don't close on Escape, don't trap focus, and don't animate open — inconsistent with `PosAddPartModal`'s `animate-i35-slide-up`.
- **Suggestion:** Add `onKeyDown` Esc handling + a slide-up animation class; consider focus on the close button on open.

### SimpleTicketCreator.tsx:1049-1052 — Repairs popup uses fixed `h-[248px]` list height
- **Severity:** P3
- **Issue:** Hardcoded `h-[248px]` scroll area (~4 cards) is a magic number that doesn't adapt to screen heights; on short landscape screens it may overflow the `max-h-[88vh]` shell awkwardly.
- **Suggestion:** Use `flex-1 min-h-0` inside the flex column (shell is already `flex flex-col`).

### SimpleTicketCreator.tsx:1078-1098 — Repair card is a `div role="button"` containing an inner `<button>` (nested interactive)
- **Severity:** P2
- **Issue:** The discount circle `<button>` (1090) sits inside the `role="button"` card div (1080) — nested interactive elements; keyboard users tab into both, and the card's Enter/Space handler could fight the inner button.
- **Suggestion:** Use a checkbox-style `aria-pressed` card without the inner button, or move the discount trigger out of the card.

### SimpleTicketCreator.tsx:1100-1106 — Duplicated filter predicate computed twice per render (perf + drift risk)
- **Severity:** P3
- **Issue:** The list renders `catalogItemsForModel.filter(...)` then re-runs the same filter for the empty-state check — double work per render and a drift risk if predicates diverge.
- **Suggestion:** Compute `const visibleItems = useMemo(...)` once and test `visibleItems.length === 0`.

### SimpleTicketCreator.tsx:1135-1140 — Summary box: "Base"/"Discount" cells show bare numbers, only "Final" has the currency
- **Severity:** P3
- **Issue:** `{baseTotal.toLocaleString()}` and `-{savedAmount...}` have no `MMK`/currency while Final does — inconsistent units in one row of 4 cells.
- **Suggestion:** Add currency to Base and Discount (or drop it from Final for a compact "₭-less" style used consistently).

### SimpleTicketCreator.tsx:1148-1213 — Discount popup appears at fixed screen position with no arrow/pointer and no Esc
- **Severity:** P3
- **Issue:** The anchored `discount-popup` is a floating box that can overlap the list; no Escape handling, no arrow indicator tying it to the trigger; custom-% input commits only on blur/Enter with no visual hint.
- **Suggestion:** Add Esc-to-close, a small caret, and `title` on the custom input ("Type 1–100, Enter to apply").

### SimpleTicketCreator.tsx:706-713 — Left column labels `w-32` fixed width cramp on small screens
- **Severity:** P3
- **Issue:** Each row's label is `w-32 shrink-0` — on a 360px phone the input gets ~160px after label+gap, tight for phone numbers and the "Intake Note" textarea.
- **Suggestion:** Stack labels above inputs under `sm:` breakpoint (`flex-col sm:flex-row`, label `w-full sm:w-32`).

### SimpleTicketCreator.tsx:884 — `{checkedCount}/{DIAGNOSTIC_NAMES.length}` counter lacks a label for screen readers
- **Severity:** P3
- **Issue:** The Pass counter is a bare span of numbers with no `aria-label`/`role="status"`; SR users don't know what it counts.
- **Suggestion:** Add `role="status"` and `aria-label="Passed checks"`.

---

## src/components/intake/IntakeWorkOrderModule.tsx

### IntakeWorkOrderModule.tsx:619/798 — Amount column hardcodes `MMK` while POS uses the currency token
- **Severity:** P2
- **Issue:** Roster table and card footer render `...toLocaleString()} MMK` — the POS module 20 lines away uses `{currency}`. Same data, two representations.
- **Suggestion:** Pass `currency` from settings (or `systemSettings?.currencySymbol || 'MMK'`) into the module.

### IntakeWorkOrderModule.tsx:272/324/640/656/667/678 — All row action buttons are 28px (`!h-7 !min-h-7 w-7`)
- **Severity:** P2
- **Issue:** Status circle, checkout $, diagnose, reopen-QA, inspector, and print buttons are all 28×28px — under the ~40px target and the row is dense with 4-6 of them.
- **Suggestion:** Bump to `!h-8 !min-h-8 w-8` with `gap-1.5`, and add `focus-visible:ring-2` (only the status picker has focus ring today).

### IntakeWorkOrderModule.tsx:393/403 — `hover:bg-transparent!` important-modifier hack on view toggle
- **Severity:** P3
- **Issue:** `hover:bg-transparent!` fights the ghost variant with an `!` — a smell that the Button variant system is being overridden per-call; also means no hover feedback on the inactive toggle.
- **Suggestion:** Use a plain `<button>` for the segmented toggle or a variant that allows hover bg.

### IntakeWorkOrderModule.tsx:360-380 — "Urgent" chip is a sort toggle styled identically to filter chips
- **Severity:** P2
- **Issue:** The RUSH chip toggles `sortByPriority` (a sort) but looks exactly like the status filter chips — users will expect it to filter to urgent tickets; selecting it also re-orders but keeps showing all statuses. No tooltip explains it.
- **Suggestion:** Add `title="Sort urgent/rush tickets to top"` and/or a small sort arrow icon to differentiate.

### IntakeWorkOrderModule.tsx:372-386 — Filter chips are 32px (`h-8`) with 11px text — small targets, dense row
- **Severity:** P3
- **Issue:** 7 chips at `h-8`/`text-[11px]` plus counts — easy to mis-tap on touch; count numbers are `font-mono font-black` at 11px.
- **Suggestion:** `h-9` and `text-xs`, keep `gap-1.5`.

### IntakeWorkOrderModule.tsx:487-497 — "Latest"/"Oldest" sort control duplicated (toolbar + table header)
- **Severity:** P3
- **Issue:** The date sort exists in the toolbar (439-451) AND as a mini sort button in the table header (488-496) — same state, two controls, with different visual language (`Sort Latest|Oldest` pill vs arrow+label).
- **Suggestion:** Keep one (toolbar) or make the header one a consistent mirror of the toolbar control.

### IntakeWorkOrderModule.tsx:519-528 — Table serial cell mislabels IMEI as "SN"
- **Severity:** P2
- **Issue:** `SN: {wo.serialNumber || wo.imei}` — when a ticket has only an IMEI, the cell prints "SN: 3589…" which mislabels a 15-digit IMEI as a serial. Also no truncation guard on phone at 526.
- **Suggestion:** Render `SN: {serial}` or `IMEI: {imei}` depending on which exists; add `truncate max-w-[140px]` to the phone.

### IntakeWorkOrderModule.tsx:618-623 — Unpaid/Paid chip uses raw color semantics but tiny 12px text in a 0.5 padding chip
- **Severity:** P3
- **Issue:** `text-xs font-bold px-1.5 py-0.5` Paid/Unpaid chip is very small next to the amount; also `bg-danger/15 text-danger` for Unpaid may read as an error to cashiers (it's normal, not an error).
- **Suggestion:** Consider `bg-warning/15 text-warning` for Unpaid; bump to `px-2 py-1`.

### IntakeWorkOrderModule.tsx:459-471 — Empty state has good iconography but `m-5` + `min-h-[320px]` doubles margins oddly
- **Severity:** P3
- **Issue:** `p-10 m-5` — margin on an empty-state card inside the panel creates an unbalanced inset.
- **Suggestion:** Drop `m-5`, keep padding + `min-h-[320px]`.

### IntakeWorkOrderModule.tsx:695-700 — Card grid `p-1` with `gap-2 sm:gap-3` — cramped on phones
- **Severity:** P3
- **Issue:** `grid-cols-1 ... gap-2 sm:gap-3 content-start rounded-xl p-1` — cards at `p-3` inside a 4px padding container feel tighter than the table view's `px-3` rows.
- **Suggestion:** `p-2 sm:p-3` and `gap-2.5`.

### IntakeWorkOrderModule.tsx:716-719 — Card date at `text-[9px]`, "NORM" chip at `text-[9px]`
- **Severity:** P3
- **Issue:** Meta info on cards is 9px — hard to read; also "NORM" (728) as a substitute for PriorityBadge is a different visual language than the table's `-` for Normal.
- **Suggestion:** Raise to `text-[10px]/text-[11px]`; use a shared "Normal" muted chip in both views.

### IntakeWorkOrderModule.tsx:278/574/770 — Popover backdrops: `role="presentation"` divs with onClick (OK) but no Escape-to-close
- **Severity:** P3
- **Issue:** Status picker and tech-assign popovers close on outside click but not on Esc; after closing via Esc-miss, focus stays in the page with the popover open.
- **Suggestion:** Add Esc handling on the picker/popover root (or a `useEffect` keydown listener while open).

### IntakeWorkOrderModule.tsx:653 — Reopen-QA uses `confirmDialog` (styled — good) but returns a promise; no loading state while awaiting
- **Severity:** P3
- **Issue:** Fine UX overall; minor: the button doesn't show any busy state between confirm and `onReopenQa` completion.
- **Suggestion:** Optional `disabled` while awaiting; low priority.

### IntakeWorkOrderModule.tsx:474 — Table sticky header lacks solid background behind `z-10` when scrolling under cards view is fine, but `bg-surface` thead may show rows bleeding through on hover rows
- **Severity:** P3
- **Issue:** `thead` is `bg-surface` sticky — okay; but no `shadow`/border under sticky header when scrolled, rows can visually merge with it.
- **Suggestion:** Add `shadow-[0_1px_0_0_var(--line)]` or `border-b-2 border-line-strong` on the sticky thead.

---

## src/components/pos/PosInvoicingModule.tsx

### PosInvoicingModule.tsx:972-975 — Queue panel width is a magic `md:w-[340px]` / collapsed `md:w-32` with no transition
- **Severity:** P3
- **Issue:** Collapse/expand snaps instantly (`md:w-32` ↔ `md:w-[340px]`) — janky layout jump; also 340px is a hardcoded number that may crowd the 8-col checkout on 1024px screens.
- **Suggestion:** Add `transition-[width] duration-200` and consider `md:w-[300px]` or `md:w-1/4`.

### PosInvoicingModule.tsx:988-993 / 1122-1128 — Collapsed-queue tickets use `text-[8px]`/`text-[9px]` — unreadably small
- **Severity:** P2
- **Issue:** In the 32px collapsed column, order/device/amount lines are 8–10px (`text-[8px] font-black` at 1128). Older staff will struggle; also `'$ DUE'` uses a dollar glyph for a MMK amount.
- **Suggestion:** Use `text-[10px]` minimum and a local currency-aware icon/label (e.g., `· DUE` without `$`).

### PosInvoicingModule.tsx:1043-1058 — Queue rows are `role="radio"` with a single tab stop; good pattern, but the DUE/PAID chip lacks a live-region
- **Severity:** P3
- **Issue:** After payment, the selected row's chip flips PAID but there's no announcement; fine visually.
- **Suggestion:** Add `aria-live="polite"` on the chip or a toast on success (there is none for successful payment in POS).

### PosInvoicingModule.tsx:1097 — "— End of queue —" footer text lacks a container check
- **Severity:** P3
- **Issue:** Cosmetic divider text is fine, but it renders inside the scroll area and scrolls away — intended? If meant as a footer, move outside the scroll container.
- **Suggestion:** Keep as-is or move below the scroll area; nitpick.

### PosInvoicingModule.tsx:1025-1030 — Queue list `min-h-[360px] max-h-[calc(100dvh-280px)]` — magic-number stacking on non-iPad
- **Severity:** P3
- **Issue:** Two different height regimes for iPad vs desktop (`isIpad` branches) — brittle; on short laptop screens the queue may exceed the panel.
- **Suggestion:** Use a single `flex-1 min-h-0` pattern (the panel is already a flex column).

### PosInvoicingModule.tsx:1152-1160 — Mobile sticky bar and full-checkout overlay both render "Amount Due" — double pay affordance on mobile
- **Severity:** P3
- **Issue:** The `md:hidden` sticky bar (1152) shows a Pay button; the full-screen checkout (1110) also pins its own Pay button. Not a bug (z-order covers the bar) but the in-flow "Pay & Print Receipt" also renders on mobile inside the overlay — three Pay buttons visible across the flow.
- **Suggestion:** Hide the in-flow action row on mobile (`hidden md:flex`) and rely on the pinned Pay.

### PosInvoicingModule.tsx:60-64 — `selectedWoId` initializes to `workOrders[0]?.id` but the module only mounts after load (fine); no loading/skeleton state at all
- **Severity:** P2
- **Issue:** While `workOrders` is loading, the module renders an empty queue + "No Finished Device Selected" blank state — a flash of empty UI with no skeleton.
- **Suggestion:** Add a `loading` prop (or detect empty+loading) and render skeleton rows in the queue.

### PosInvoicingModule.tsx:892 — `const diagFee = 5000` magic number duplicated with the hardcoded `5,000` cell in PosCheckoutPanel.tsx:196
- **Severity:** P2
- **Issue:** The diagnostic fee lives in two files (constant here, literal table cell there) — changing the fee in one place desyncs the other.
- **Suggestion:** Export `DIAGNOSTIC_FEE` from `posUtils` and render it in the checkout panel's table.

### PosInvoicingModule.tsx:976-980 — Decorative green "Checkout" pill is non-interactive but styled like a button
- **Severity:** P3
- **Issue:** The `bg-success/10 ... border-success/20` pill labeled "Checkout" in the queue header is a static label — looks clickable.
- **Suggestion:** Drop it or make it a real shortcut (e.g., scroll to payment area).

### PosInvoicingModule.tsx:47-50 — `posOwner` filter ('APP'/'KZH') only reachable inside the Add-Part modal — no visible filter state on the main screen
- **Severity:** P3
- **Issue:** The owner filter affects which parts are offered, but the main POS screen never shows the active owner; a cashier may add parts expecting the shop's stock and silently get another owner's.
- **Suggestion:** Show the active owner as a small badge in the checkout header when != 'ALL'.

### PosInvoicingModule.tsx:1145-1150 — Mobile overlay close button `p-1.5` (24px) — small touch target for a full-screen escape
- **Severity:** P3
- **Issue:** The X to close the full checkout is tiny and top-right without a labeled "Back".
- **Suggestion:** Make it `p-3` with an adjacent "Back" label or a slide-down chevron.

### PosInvoicingModule.tsx:1009-1020 — Queue item hover shadow `hover:shadow-md hover:border-ink/30` but no `focus-visible` ring on the radio rows
- **Severity:** P3
- **Issue:** `role="radio"` rows have `focus:outline-none` nowhere — keyboard focus is invisible on the selectable cards.
- **Suggestion:** Add `focus-visible:ring-2 focus-visible:ring-brand/40`.

### PosInvoicingModule.tsx:55-58 — `checkoutDate` backdate input only inside confirm modal — no inline hint that backdating exists
- **Severity:** P3
- **Issue:** Fine feature; discoverability nit — nothing on the queue/checkout hints at backdate capability.
- **Suggestion:** (Optional) title tooltip on the Pay button: "You can backdate the checkout date in the confirm step."

---

## src/components/pos/PosCheckoutPanel.tsx

### PosCheckoutPanel.tsx:234-268 — Ghost "Add Part / Custom / Price List / Edit" text links are ~24-30px targets with underline-on-hover only
- **Severity:** P2
- **Issue:** These are the primary ways to edit an invoice, but they're tiny text links (`text-[11px]`, `p-0`) — easy to mis-tap, hard to notice.
- **Suggestion:** Give them `px-2 py-1 rounded-md hover:bg-surface` hit areas and `gap-1.5`.

### PosCheckoutPanel.tsx:376-395 / 467-486 — Remove (X) buttons only appear in Edit mode as `invisible pointer-events-none` otherwise
- **Severity:** P2
- **Issue:** Nothing tells the cashier that Edit mode enables row deletion; the X is also 20px (`!h-5 !min-h-5 w-5`) when visible.
- **Suggestion:** Always show a faint X (`opacity-40 hover:opacity-100`) with confirm, and enlarge to 24px; or show a hint chip "Edit to remove items" next to the Edit toggle.

### PosCheckoutPanel.tsx:333-353 / 430-450 — Sheet-edit inputs are 20px tall (`!h-5 !min-h-0`) with `border-0` — invisible editing surfaces
- **Severity:** P3
- **Issue:** In edit mode the qty/price/disc inputs have no borders and are 20px — no visual affordance they're editable, and tiny tap targets.
- **Suggestion:** Give edit inputs a visible `border border-line rounded` and `!h-7`.

### PosCheckoutPanel.tsx:376-389 — Dead conditional: discounted and non-discounted amount cells render identical spans
- **Severity:** P3
- **Issue:** `hasDiscount ? <span className="font-black text-ink text-xs">{effectiveTotal}</span> : <span>{effectiveTotal}</span>` — both branches show the same final number; the "original → discount" relationship is never shown in the amount column.
- **Suggestion:** For discounted rows show `strike-through original → final` (like the picker cards do), and delete the redundant conditional.

### PosCheckoutPanel.tsx:618-621 — "Amount Due (Customer)" row: `bg-ink text-white` with `text-lg` — strong, but no `text-[13px]` label contrast check on the label row above
- **Severity:** P3
- **Issue:** The due row is good; minor — the section lacks a `min-w-0` on the left label so long currency strings wrap awkwardly on narrow panels.
- **Suggestion:** Add `whitespace-nowrap` + `tabular-nums` is present; add `min-w-0`/truncate on the label.

### PosCheckoutPanel.tsx:580-608 — Invoice Discount inline input: borderless, 80px wide, only a placeholder hints it's editable
- **Severity:** P2
- **Issue:** The discount field is `border-0 bg-transparent w-20` inside a table row — cashiers can't tell it's an input; there's no suffix label for the input itself, and commit only happens on blur/Enter (no visual feedback on pending state).
- **Suggestion:** Give it a subtle `border-b border-success/40 focus:border-success` underline + `aria-label="Invoice discount amount"`, and show a temporary "Applied ✓" state.

### PosCheckoutPanel.tsx:691-724 — Payment method pills are 28px (`!h-7`) with no `title`/description
- **Severity:** P3
- **Issue:** Payment method selection is a critical step, but pills are small with no tooltip (e.g., which account/QR applies); also no `aria-pressed` (they're Buttons, fine) — add `aria-current` for SR.
- **Suggestion:** `!h-9` pills and `title={m.description}` where available.

### PosCheckoutPanel.tsx:743-760 — Split-payment method `<select>` has no accessible label
- **Severity:** P3
- **Issue:** The native select for split method is unlabeled (`className="bg-surface ..."` no aria-label) — SR users hear an unnamed combo box.
- **Suggestion:** `aria-label={`Split ${idx+1} payment method`}`.

### PosCheckoutPanel.tsx:764-782 — Split amount inputs: no `aria-label`, and `auto-fill` button uses `remForThis` silently
- **Severity:** P3
- **Issue:** The amount input is unlabeled; Auto-Fill fills the remaining silently with no feedback (good behavior, but the button text could say "Fill rest").
- **Suggestion:** `aria-label` on inputs; keep Auto-Fill label.

### PosCheckoutPanel.tsx:936-962 — Cash quick-amount chips `h-8` (32px) — small for rapid cashier taps
- **Severity:** P3
- **Issue:** The "Exact / 50000 / 100000 / 200000 / 500000" chips are 32px; the numpad below is 44px (`h-11`, good).
- **Suggestion:** Bump chips to `h-9`/`h-10` for consistency with numpad.

### PosCheckoutPanel.tsx:963-987 — Numpad ⌫ backspace is a Button with `aria-label="Numpad ⌫"` — screen reader reads "Numpad backspace symbol"? Minor; also no long-press repeat for ⌫
- **Severity:** P3
- **Issue:** Clearing a large tendered amount requires many taps; no long-press repeat.
- **Suggestion:** Add onPointerDown repeat or a "C" (clear) key; change aria-label to "Backspace".

### PosCheckoutPanel.tsx:981-986 — Numpad `'0'` and `'00'` keys multiply (`*10`, `*100`) which skips the digit logic — typing "0" then "5" gives 5, but "0" when 0 is a no-op (already handled); UX oddity: after `5`, pressing `0` gives 50 — correct; but `⌫` divides by 10, so `150 ⌫ = 15` — loses trailing zeros only — acceptable; flag: no way to type a decimal (MMK has none — fine)
- **Severity:** P3
- **Issue:** Behavior is mostly right; minor: no visual distinction between the multiply keys and digit keys.
- **Suggestion:** Cosmetic only — keep.

### PosCheckoutPanel.tsx:1020-1045 — "Pay & Print Receipt" disabled state uses `bg-muted text-white opacity-80` only when processing; when `isPaymentShort` it uses success green but disabled — misleading color
- **Severity:** P2
- **Issue:** With `isPaymentShort`, the button renders `bg-success hover:bg-success/90 text-white` AND `disabled` — a green, full-contrast button that does nothing. Cashiers will tap it repeatedly.
- **Suggestion:** When short, render `bg-warning text-white` with the short amount, or gray it out (`bg-muted opacity-60`).

### PosCheckoutPanel.tsx:173-210 — "Unrepairable Device" diagnostic-fee table: fee row hardcodes `5,000 {currency}` (see PosInvoicingModule.tsx:892)
- **Severity:** P2
- **Issue:** Duplicated magic fee value across files; also the fee row is styled `font-mono font-black` with no `tabular-nums`.
- **Suggestion:** Import shared constant; add `tabular-nums`.

### PosCheckoutPanel.tsx:622-666 — System profit section only renders when parts OR commission exist — good; but "Parts Cost (deducted)" uses `text-warning` (amber) for a negative — color implies warning rather than neutral deduction
- **Severity:** P3
- **Issue:** `-{partsCostTotal}` in `text-warning` reads as an error; the parallel "Tech Commission" row uses `text-muted`.
- **Suggestion:** Use `text-muted` for both deductions (keep danger only for genuine overruns).

### PosCheckoutPanel.tsx:504-546 — Custom repair form: `grid-cols-[1fr_80px_80px]` hardcodes 80px columns — on 320px screens with padding this squeezes the name field
- **Severity:** P3
- **Issue:** Magic 80px columns; name input can collapse to ~120px on small phones.
- **Suggestion:** `grid-cols-1 sm:grid-cols-[1fr_90px_70px]`.

### PosCheckoutPanel.tsx:142-170 — Ticket header card: order number + StatusChip row has no wrap protection for long order numbers on narrow panels
- **Severity:** P3
- **Issue:** `flex flex-wrap items-center gap-2` is fine, but `font-mono font-black` order number has no `truncate` — long IDs can push the StatusChip.
- **Suggestion:** Add `truncate min-w-0` to the number span.

---

## src/components/pos/PosModals.tsx

### PosModals.tsx:50-88 — PosConfirmPaymentModal: no Esc, no focus trap, no backdrop-click cancel, no animation
- **Severity:** P2
- **Issue:** Every other modal here closes on backdrop click; this one's backdrop has no onClick (only the X/Cancel), no Esc handler, no focus trap, and no open animation — inconsistent with PosAddPartModal which has backdrop close + `animate-i35-slide-up`.
- **Suggestion:** Add backdrop onClick (with inner stopPropagation), Esc handler, `role="dialog" aria-modal="true"`, and the slide-up animation.

### PosModals.tsx:50-88 — Confirmation modal hides the "Short" row but keeps "Change" math independent of it; also shows both Tendered and Change but not the payment-method breakdown for Split
- **Severity:** P3
- **Issue:** For Split Payment the confirm modal never shows the split detail (method names/amounts) — only the method string "Split Payment (Cash: x + KBZPay: y)" passed via `paymentMethod`, which is displayed but not broken down. The `Change` row renders only for Cash.
- **Suggestion:** When `paymentMethod` starts with "Split Payment", render the split lines in the confirm modal.

### PosModals.tsx:96-103 — Confirm modal "Confirm & Print" disabled state: same green-while-disabled issue as the panel Pay button
- **Severity:** P2
- **Issue:** `disabled={isProcessingPayment || isPaymentShort || selectedWo.isPaid}` with `className="flex-1 bg-success hover:bg-success/90 text-white"` — when short, it stays green and looks actionable.
- **Suggestion:** Conditional classes: short → `bg-muted text-white opacity-60`.

### PosModals.tsx:107-131 — PosAddPartModal backdrop is `role="presentation"` with `onClick={onClose}` — keyboard users can't dismiss (no Esc) and the dialog lacks `role="dialog"`
- **Severity:** P2
- **Issue:** Best-behaved modal in the set, but still no Esc/focus-trap; `role="presentation"` on the backdrop div is also semantically off (presentation implies decorative).
- **Suggestion:** Add Esc handler, `role="dialog" aria-modal="true"` on the sheet, and remove `role="presentation"`.

### PosModals.tsx:146-170 — External-part form: `Cost (ဝယ်ရင်)` label mixes Burmese with English label style; other labels are English only
- **Severity:** P3
- **Issue:** "Cost (ဝယ်ရင်)" is the only mixed-language label in the app's POS surfaces (other Burmese strings appear as helper text, e.g. the diagnostic fee button). Inconsistent label language.
- **Suggestion:** "Cost (buy-in)" or plain "Cost" for consistency.

### PosModals.tsx:229-231 — Part rows: `focus:outline-none` with no `focus-visible` ring
- **Severity:** P3
- **Issue:** The selectable part buttons remove focus outline entirely — keyboard users can't see which part is focused.
- **Suggestion:** Replace with `focus-visible:ring-2 focus-visible:ring-brand/40`.

### PosModals.tsx:269-278 — Qty input + Add button use `flex items-end` — the label/Qty row has no `htmlFor`/`id` link
- **Severity:** P3
- **Issue:** `<label className="block shrink-0">` wraps the Input but the input has no `id`, so the label isn't programmatically linked (partially fine as wrapper, but add `id`+`htmlFor` for SR).
- **Suggestion:** Add `id="pos-part-qty"` + `htmlFor`.

### PosModals.tsx:330-345 — Receipt modal injects a `<style>` block with `!important` print overrides inside the component
- **Severity:** P3
- **Issue:** A global `@media print` style scoped to nothing (selectors like `nav, header, footer, aside`) is injected every time the modal renders — potential cross-page print side effects and duplicate style nodes.
- **Suggestion:** Move print CSS to a single global stylesheet or a shared `usePrintStyles` hook rendered once.

### PosModals.tsx:366-371 — Receipt "TOTAL PAID" uses `selectedWo.totalAmount` — but for cash with change, the paid amount displayed is the due, not tendered; no change line on the receipt
- **Severity:** P3
- **Issue:** The digital receipt never shows tendered/change for cash payments — the confirm modal did, the receipt doesn't.
- **Suggestion:** Add `Tendered` / `Change` rows when `paymentMethod === 'Cash'` and `cashTendered > total`.

### PosModals.tsx:426-443 — PriceList modal list is `h-[248px]` fixed again (same magic number as SimpleTicket)
- **Severity:** P3
- **Issue:** Duplicated hardcoded 248px scroll height across two files.
- **Suggestion:** Use `flex-1 min-h-0` (parent is `flex flex-col max-h-[88vh]`).

### PosModals.tsx:449-460 — PriceList cards: `<h3>` inside `div role="button"` (nested-heading-in-interactive) and no `aria-label` for the discount button's state change
- **Severity:** P2
- **Issue:** Same nested-interactive pattern as SimpleTicketCreator:1078; the discount circle button (516) sits inside the card div and relies on `title` only.
- **Suggestion:** Add `aria-label` on the discount button (e.g., "Set discount for {name}") and consider heading-outside-card markup.

### PosModals.tsx:453-455 — "Already in invoice" / "Estimate only" cards show `opacity-60 cursor-not-allowed` but remain focusable via `tabIndex={0}` when `notSelectable` is false-path only; `tabIndex={notSelectable ? -1 : 0}` — OK, but aria-pressed is set on non-interactive cards
- **Severity:** P3
- **Issue:** `aria-pressed={isSelected}` is announced even when the card is `notSelectable` — misleading SR state.
- **Suggestion:** Omit `aria-pressed` when `notSelectable` (or set `aria-disabled="true"`).

### PosModals.tsx:494-511 — Warranty pill shows raw `{item.warranty}` ("6 Months") while SimpleTicket's identical card uses `shortWarranty()` ("6M")
- **Severity:** P2
- **Issue:** Two copies of the same price-list card render warranty differently — POS modal says "6 Months", SimpleTicket says "6M". Same concept, different label.
- **Suggestion:** Export `shortWarranty` from `posUtils`/`deviceData` and use it in both.

### PosModals.tsx:560-580 — Summary "Base"/"Discount" cells lack currency while "Final" has it (same inconsistency as SimpleTicket)
- **Severity:** P3
- **Issue:** `{selectedCatalogTotal.toLocaleString()}` and `-{selectedCatalogSaved...}` bare numbers vs `{currency}` on Final.
- **Suggestion:** Add currency to Base/Discount cells.

### PosModals.tsx:600-610 — "Done" button `disabled={selection.length === 0}` but the summary counts `selection` even when items are not selectable — a stale selection of already-in-invoice items would show Done(n) while adding nothing
- **Severity:** P3
- **Issue:** Edge case: selection may include items that became non-selectable; count and actual added items can diverge.
- **Suggestion:** Count `selectedCatalogItems.length` for the Done label.

---

## Top 5 quick wins

1. **Currency token everywhere (B-2, B-3, B-4):** replace ~15 hardcoded `MMK` literals in intake/roster with `systemSettings?.currencySymbol || 'MMK'` — one grep, kills the cross-module inconsistency in one commit.
2. **Fix the misleading Pay/Print labels (B-1, B-5):** rename "Create Ticket & Print" / "Save & Print" to "Create Ticket" / "Save Ticket" (or actually trigger the voucher print on save) — removes a promise the UI doesn't keep.
3. **Unify modal behavior (B-1, B-6):** extract one shared modal shell (Esc close, `role="dialog" aria-modal`, token overlay `bg-ink/40`, slide/fade animation, focus trap) and use it for the 6 intake modals + 4 POS modals — biggest a11y/consistency win per change.
4. **Enlarge 28px/20px icon buttons to ≥32px with focus-visible rings (B-1, B-3, B-4, B-6):** diagnostic toolbar, roster row actions, POS line-item actions — swap `!h-7 !min-h-7 w-7` → `!h-8 !min-h-8 w-8` and add `focus-visible:ring-2` in a handful of spots.
5. **De-duplicate the diagnostic fee constant (B-4, B-5):** export `DIAGNOSTIC_FEE = 5000` from `posUtils` and render it in PosCheckoutPanel's fee table instead of the hardcoded `5,000 {currency}` cell.
