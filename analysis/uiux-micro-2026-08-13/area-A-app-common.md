# UI/UX Micro-Detail Audit — Area A: App shell + common components

Date: 2026-08-13 · Repo: i35erp-stable-v1 · Read-only audit
Scope: `src/App.tsx`, `src/components/Navigation.tsx`, `src/components/ui/*` (button, input, dialog, badge, card, tabs, dropdown-menu), `src/components/common/*` (ConfirmDialog, ConfirmDeleteModal, ModuleLoadingSkeleton, StatusBadge, StatusChip, PriorityBadge, HoverTooltip, ErrorBoundary, LanguageSwitcher, OfflineSyncStatusBadge, GlobalSearchModal, CustomDropdownMenu, DrawerSelect, DateFilterSelector, RightFilterDrawer, ActiveFilterChips)

Cross-cutting context (affects many findings below):
- `src/index.css:1316-1319` globally strips ALL focus outlines (`:where(button, input, select, textarea, [role="button"], a, [tabindex]):focus-visible { outline: none; }`, comment "clean look — no focus ring/outline decorations… replaces the accessibility focus rings"). This is a deliberate 2026-08-10 change but it removes the only visible keyboard-focus indicator app-wide. Findings about missing focus rings are real regardless.
- The app now has FOUR badge systems (ui `Badge`, `StatusBadge`, `StatusChip`, `PriorityBadge`) and THREE confirm-dialog systems (Radix `Dialog`, `ConfirmDialogHost`, `ConfirmDeleteModal`) styling the same concepts differently.

---

## src/App.tsx

### src/App.tsx:1316 (index.css) + ui/button.tsx — app-wide keyboard focus indicator removed
- **Severity:** P1 (visible/annoying)
- **Issue:** `:where(button, input, select, textarea, [role="button"], a, [tabindex]):focus-visible { outline: none; }` removes every focus ring; no replacement ring/box-shadow exists anywhere. Keyboard-only users (and the shop's data entry on tablets with keyboards) cannot see where focus is.
- **Suggestion:** Restore a focus affordance without the "decorative" look: `:where(button, a, [role="button"], input, select, textarea):focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; }` — or add `focus-visible:ring-2 focus-visible:ring-brand/60` to the Button/Input base classes and remove the global blanket rule.

### src/App.tsx:138-175 — FixedMoreMenu only clamps horizontally, can overflow the bottom of the viewport
- **Severity:** P2 (polish)
- **Issue:** `const top = rect.bottom + 6;` (line 146) — no vertical flip/clamp like the sibling `CustomDropdownMenu`/`DrawerSelect` do. When the ⋯ button sits near the bottom of the viewport (short windows, browser chrome), the menu opens off-screen.
- **Suggestion:** Mirror the pattern from `CustomDropdownMenu.computeMenuPos`: measure `window.innerHeight - rect.bottom`, flip to `rect.top - menuHeight` when below ~296px, and clamp.

### src/App.tsx:149-175 — FixedMoreMenu has no ESC handling, no focus management, no mount animation
- **Severity:** P2 (polish)
- **Issue:** Unlike `CustomDropdownMenu` (ESC + backdrop + re-anchor) and the Radix menus, this menu: (a) can't be closed with Escape, (b) focus never moves into it, (c) pops in with no fade/scale. Also, the first 4 items (view switcher + Add Part) are `lg:hidden` while Print Tags/Edit are always visible — on desktop the ⋯ opens a menu where half the items are invisible, with no separator between the two groups (the `<div className="lg:hidden my-1 border-t border-line" />` divider is also hidden on lg).
- **Suggestion:** Add a `keydown` Escape listener while `isOpen`, and restructure: split into two groups with a real separator, or hide the ⋯-menu view items on desktop too and keep the menu consistent across breakpoints.

### src/App.tsx:1984-1987 — Offline banner uses raw amber palette instead of the `warning` token
- **Severity:** P3 (nitpick)
- **Issue:** `border-amber-300 bg-amber-50 … text-amber-700` — raw palette while the rest of the app uses `warning`/`danger` tokens (e.g. `bg-warning/10 text-warning`). Under the dark theme this hardcoded light amber pill will look out of place.
- **Suggestion:** Use token classes: `border-warning/30 bg-warning/10 text-warning` (matches the badge system), or a `bg-[var(--card-bg)] border-warning/40` theme-aware pill.

### src/App.tsx:2069-2072 — "Reset Filters" pill uses raw rose palette + inconsistent label
- **Severity:** P3 (nitpick)
- **Issue:** `bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200` and `text-rose-600` icon — raw colors again; elsewhere destructive is `danger` or `rose-500`. Also two labels ("Reset Filters" / "Reset") switch mid-breakpoint which makes the button jump width.
- **Suggestion:** Use `bg-danger/10 text-danger border-danger/30 hover:bg-danger/15`; keep one label ("Reset Filters") and drop the `sm:` swap.

### src/App.tsx:2130-2137 — Search-clear button uses a text `×` glyph, not the lucide `X` icon
- **Severity:** P2 (polish)
- **Issue:** `×` (line 2135) — a raw multiplication-sign character inside a ghost Button. Every other close/clear affordance in the app uses `<X className="h-4 w-4" />` (header close, toasts, chips, drawers). Inconsistent iconography; the glyph also renders at text weight/position that can't be sized like an icon.
- **Suggestion:** Replace with `<X className="h-3.5 w-3.5" />` and import `X` from lucide-react (already imported at line 4).

### src/App.tsx:2118-2137 — Contextual search Input has no `aria-label` and clear button is a tiny hit target
- **Severity:** P3 (nitpick)
- **Issue:** The `Input` relies on `placeholder` only (placeholder disappears on typing; screen readers announce the placeholder as the only name). The ghost clear button (`absolute right-2 top-1/2 … text-xs`) has roughly a 20px hit area.
- **Suggestion:** Add `aria-label={…tab-specific…}` to the Input; give the clear button `aria-label="Clear search"` and at least `p-1.5` with the icon sized `h-3.5 w-3.5`.

### src/App.tsx:2458-2475 — QA Table|Cards toggle: `hover:bg-transparent!` erases the active state on hover
- **Severity:** P1 (visible/annoying)
- **Issue:** `hover:bg-transparent!` with Tailwind v4 important-suffix — when the ACTIVE tab (bg-brand) is hovered, the important transparent background wins, so the white text sits on the transparent strip with no fill → the selected state visually vanishes exactly while the pointer is on it.
- **Suggestion:** Remove `hover:bg-transparent!`; use `hover:bg-brand-deep` for the active variant and `hover:bg-surface` for the inactive one (mirrors the Dashboard subtab pills at lines 2220-2230 which do this correctly).

### src/App.tsx:2484-2495 — Same date-filter control styled three different ways across tabs
- **Severity:** P2 (polish)
- **Issue:** Finance passes `buttonClassName="!h-10 !min-h-10 !min-w-[150px] !rounded-xl !border-line-strong !bg-white !px-3 …"` (8 `!` overrides) while intake/dashboard/trello/crm/suppliers use `compact iconOnly` (bare 32px icon button). One control, three looks in the same header row — and the `!` overrides fight the component's own classes.
- **Suggestion:** Add a real prop (e.g. `size="md"`/`labeled`) to `DateFilterSelector` instead of external `!` overrides; pick one visual for the header (recommend the icon-only compact used elsewhere) so the header strip is uniform.

### src/App.tsx:2562-2572 + 3036-3040 — Mobile filter drawer trigger is `sm:hidden`, but the drawer is `alwaysVisible` on iPad → unreachable entry point
- **Severity:** P2 (polish)
- **Issue:** The only `setIsFilterDrawerOpen(true)` caller is a `sm:hidden` button (line 2564). On iPad (`alwaysVisible={isIpad}` renders the drawer without `lg:hidden`) the trigger is hidden ≥640px, so the drawer can never be opened from the header — the `alwaysVisible` prop seems to expect a trigger that doesn't exist. Either the iPad entry point is missing or the always-visible drawer is dead code.
- **Suggestion:** Verify the iPad flow; if the drawer is meant to be openable, add an iPad-visible trigger (e.g. show the Sliders button when `isIpad`), otherwise drop `alwaysVisible`.

### src/App.tsx:2581 — `main` caps at `max-w-[3840px]` (8K) — rows stretch far too wide on desktop
- **Severity:** P3 (nitpick)
- **Issue:** `max-w-[3840px]` is a magic number; on a 2560px monitor tables/cards span the full width, producing very long line lengths and cramped multi-column tables. The ui Card system is designed for ~max-w-7xl-ish containers.
- **Suggestion:** Cap at a readable width, e.g. `max-w-[1920px]` or `max-w-screen-2xl`, and center.

### src/App.tsx:2943-2961 — Lazy modal chunks mount under `Suspense fallback={null}` → blank screen while loading
- **Severity:** P3 (nitpick)
- **Issue:** GlobalSearch/AI/DeviceTag/RecycleBin modals are code-split and mounted with `fallback={null}` — on slow connections (shop hotspot) the screen shows nothing until the chunk arrives, and the header still shows the old tab.
- **Suggestion:** Use a tiny centered spinner fallback: `fallback={<div className="fixed inset-0 z-[100] grid place-items-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-brand" /></div>}` (reuse the auth-checking spinner).

### src/App.tsx:2963-2973 — AI FAB uses magic `bottom-[calc(5.5rem+env(safe-area-inset-bottom))]` and may overlap content
- **Severity:** P3 (nitpick)
- **Issue:** 5.5rem assumes a bottom bar that doesn't exist in the app shell — the FAB floats high above the bottom edge; at `z-30` it also sits under drawers (z-70/80) and the toast stack (z-60) can overlap it.
- **Suggestion:** Use `bottom-4 right-4` (matches the toast stack position) and `z-40`; keep `env(safe-area-inset-bottom)` in the calc.

### src/App.tsx:3049-3090 — Toast text sizes are tiny (11px body, 9px tag) and errors auto-dismiss in 4s
- **Severity:** P2 (polish)
- **Issue:** `text-[11px]` title/message and a `text-[9px]` "Persistent" badge (lines 3080-3083) — below comfortable reading size on phones; the `Persistent` tag is also always rose-styled even when attached to an info toast. All non-persistent toasts (including `error` saves) vanish after 4s, so a save error can be missed during a busy moment.
- **Suggestion:** Bump body to `text-xs`, tag to `text-[10px]`; color the tag by `toast.type`; keep error toasts `persistent: true` (dismissible) in `reportSaveError`.

### src/App.tsx:2554-2557 — Suppliers "Flag RMA" button hovers to raw `bg-purple-600`
- **Severity:** P3 (nitpick)
- **Issue:** `bg-purple hover:bg-purple-600` — token base + raw palette hover; every other brand-colored button uses `hover:bg-brand-deep`/`hover:bg-danger-deep` token pairs.
- **Suggestion:** `hover:bg-purple/90` (or define a `purple-deep` token) for consistency.

### src/App.tsx:1047 + 1127-1133 — Mobile filter drawer active toggles use raw amber/rose hex-ish palette
- **Severity:** P3 (nitpick)
- **Issue:** `bg-amber-500 text-white border-amber-600`, `text-amber-600`, and `hover:bg-slate-100` inline in `renderMobileFilters` — raw palette inside the tokenized system; `bg-amber-500` (active) vs `bg-warning` (token) are different hues, so "Low Stock Only" and "Edit Rows" active states clash with the rest of the app.
- **Suggestion:** Use `bg-warning text-white border-warning` + `bg-warning/10 text-warning` inactive, and `bg-surface` for hovers.

### src/App.tsx:2570-2571 — Active-filter count badge is 16px tall with `px-1` — cramped for 2+ filters
- **Severity:** P3 (nitpick)
- **Issue:** `h-4 min-w-4 … px-1 text-xs font-black` — a 2-digit count ("10" never happens, but "3") renders tight; at 16px it's below the readable minimum and barely visible next to the 40px button.
- **Suggestion:** `h-5 min-w-5 px-1.5 text-[10px]` with `leading-none`, or reuse the Badge component.

---

## src/components/Navigation.tsx

### src/components/Navigation.tsx:117,192,412 — Untranslated nav labels next to translated ones
- **Severity:** P2 (polish)
- **Issue:** `'Simple Ticket'` (117), `'Mermaid'` (192), plus `'Finance'`, `'Ticket Board'`, `'Follow-Ups'`, `'Dashboard'` (412) are hardcoded English while siblings use `t('navIntake')` etc. The sidebar mixes languages when the UI is set to မြန်မာ.
- **Suggestion:** Route all labels through the LanguageContext dictionary (`t('navSimpleTicket')`, `t('navTicketBoard')`, `t('navFinance')`, `t('navMermaid')`, `t('navDashboard')`).

### src/components/Navigation.tsx:464-474 — "System online" pill is static and version is hardcoded
- **Severity:** P2 (polish)
- **Issue:** The footer always shows a green dot + "System online" even when the app is offline (App.tsx tracks `isOnline` but never passes it), and `v2.4.0` is hardcoded text that will drift from the real build.
- **Suggestion:** Accept an `isOnline` prop (or reuse `OfflineSyncStatusBadge` state) and render the dot `bg-danger` + "Offline" when offline; derive the version from `import.meta.env.VITE_APP_VERSION` or a build-time constant.

### src/components/Navigation.tsx:379-396 — "+ Intake Ticket" shows both a Plus icon AND a literal "+" in the label
- **Severity:** P2 (polish)
- **Issue:** `<Plus …/>` icon + `<span>+ Intake Ticket</span>` — doubled plus sign. Also the icon uses `mr-2` inside a flex while the rest of the sidebar uses `space-x`/`gap` utilities (mixed spacing patterns).
- **Suggestion:** Drop the `+` from the span text; use a single `gap-2` on the container and remove `mr-2`.

### src/components/Navigation.tsx:375 — Raw `scrollbar-thumb-gray-200` on the nav scroll container
- **Severity:** P3 (nitpick)
- **Issue:** `scrollbar-thin scrollbar-thumb-gray-200` — raw gray vs the `line`/`surface` tokens used everywhere else; in dark theme the thumb stays light gray.
- **Suggestion:** Use a CSS-var-based scrollbar or `scrollbar-thumb-line`.

### src/components/Navigation.tsx:412,447 — `!h-4.5 !w-4.5` non-standard icon size
- **Severity:** P3 (nitpick)
- **Issue:** `!h-4.5 !w-4.5` works only because Tailwind v4 has dynamic spacing; the rest of the app uses `h-4 w-4` / `h-3.5 w-3.5`. Mixed icon scale (18px here vs 16px in header buttons) makes sidebar icons slightly larger than the topbar's.
- **Suggestion:** Standardize on `h-4 w-4` (or `h-[18px] w-[18px]` with a comment) to match the header's `h-4 w-4` icons.

### src/components/Navigation.tsx:423-426 — Group headers depend on `space-y-3` + per-group `border-b` for rhythm; collapsed mode hides the header but keeps the border
- **Severity:** P3 (nitpick)
- **Issue:** In collapsed mode the group title is hidden but the group's `pb-2 border-b` still renders, so the collapsed rail shows a floating border line under every icon group with no label — visually noisy.
- **Suggestion:** When `effectiveCollapsed`, render groups without `border-b`/`pb-2` (or use `space-y-2` only).

### src/components/Navigation.tsx:260-270 — `navButtonBase` collapsed mode: `h-10 w-10 mx-auto` but the Intake button overrides to `w-10 mx-auto justify-center p-0` with `!w-5 !h-5` plus — sizes are hand-tuned per state
- **Severity:** P3 (nitpick)
- **Issue:** Three different ways of centering content in collapsed mode (`justify-center p-0`, `mx-auto`, `w-10`), plus the `!w-5 !h-5` icon override. Fragile; a future class change breaks alignment.
- **Suggestion:** Extract a single `collapsedNavBtn` class string and reuse for both buttons.

---

## src/components/ui/button.tsx

### src/components/ui/button.tsx:14-26 — Contradictory `transition-colors` + `transition-all` in the same base class
- **Severity:** P3 (nitpick)
- **Issue:** Base string has both `transition-colors … active:scale-95 transition-all` — tailwind-merge keeps only `transition-all` (last wins), so `transition-colors` is dead weight and the intent (colors-only for most hovers, all for press) is undocumented.
- **Suggestion:** Keep `transition-all` only, or scope: base `transition-colors`, add `transition-transform active:scale-95`.

### src/components/ui/button.tsx:26 — `focus-visible:outline-none` with no replacement ring (see also index.css:1316)
- **Severity:** P1 (visible/annoying)
- **Issue:** Every Button in the app (this is THE button) has no visible focus state — combined with the global outline removal, keyboard users get zero indication of the focused control.
- **Suggestion:** Add `focus-visible:ring-2 focus-visible:ring-brand/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white` to the base (respect dark theme via ring-offset var).

### src/components/ui/button.tsx:16-21 — `chip` variant is h-8 (32px); `sm` size is `h-10 lg:h-8` — sub-40px targets on desktop
- **Severity:** P3 (nitpick)
- **Issue:** The chip variant and lg: breakpoints drop buttons to 32px. Desktop mouse users are fine, but hybrid tablets (iPad with keyboard/trackpad) and the stated "40px everywhere (app touch standard)" comment are contradicted by these sizes.
- **Suggestion:** Either honor the comment (`h-10` at all sizes) or keep `h-8` for desktop-only controls and document it.

### src/components/ui/button.tsx:27-29 — No `loading` prop in the Button API
- **Severity:** P2 (polish)
- **Issue:** Async actions must hand-roll spinner + disabled state per call site (the audit shows many sites doing it differently — some with `disabled:opacity-60`, some with `animate-spin` icons, some with nothing). A shared primitive would standardize this.
- **Suggestion:** Add `loading?: boolean` that renders a `Loader2` spinner (swap icon out), sets `disabled`, and keeps width stable (`aria-busy`).

---

## src/components/ui/input.tsx

### src/components/ui/input.tsx:22 — Doc comment promises a "brand focus ring" that doesn't exist
- **Severity:** P1 (visible/annoying)
- **Issue:** Comment says "brand focus ring" but the class list has only `focus-visible:outline-none` and `transition-colors` — no ring, no border-color change. Typing fields give zero focus feedback (compounded by index.css:1316).
- **Suggestion:** Add `focus:border-brand focus:ring-2 focus:ring-brand/25 focus:ring-offset-0` (or `focus-visible:` variants) to the base class.

### src/components/ui/input.tsx:23 — `invalid` uses raw `border-rose-500` and doesn't set `aria-invalid`
- **Severity:** P2 (polish)
- **Issue:** `invalid && "border-rose-500 "` — raw rose (elsewhere `danger`), a trailing space, and no `aria-invalid={invalid}` or error text contract, so screen readers never hear the error state.
- **Suggestion:** `invalid && "border-danger ring-2 ring-danger/20"` and pass `aria-invalid={invalid || undefined}`; consider an `errorMessage` prop.

### src/components/ui/input.tsx:22 — `disabled:cursor-not-allowed` + `disabled:opacity-50` but no background change
- **Severity:** P3 (nitpick)
- **Issue:** Disabled inputs look nearly identical to enabled ones at 50% opacity on white — with the muted placeholder it's hard to tell "can't edit" from "empty".
- **Suggestion:** Add `disabled:bg-surface` to the disabled state.

---

## src/components/ui/dialog.tsx

### src/components/ui/dialog.tsx:38 — No `max-h` / scroll on DialogContent — long content overflows the viewport
- **Severity:** P2 (polish)
- **Issue:** `fixed … w-full max-w-lg … p-6` with no `max-h-[90vh] overflow-y-auto` — any dialog with a long form (common in this ERP: line items, checklists) clips off-screen on short/phone viewports, and the fixed positioning makes it unreachable.
- **Suggestion:** Add `max-h-[85dvh] overflow-y-auto` to DialogContent (and keep the X close sticky).

### src/components/ui/dialog.tsx:44-46 — Close button hit area is ~24px
- **Severity:** P3 (nitpick)
- **Issue:** `absolute right-4 top-4 … rounded-sm` with `X h-4 w-4` and no padding — a ~24px target, well under the 40px touch standard used elsewhere (the app's own ConfirmDialog close uses `size="iconSm"` = 32px).
- **Suggestion:** Give it `p-1.5` (→ ~34px) and `rounded-lg`, or `size="iconSm"`.

### src/components/ui/dialog.tsx:57-63 — DialogTitle is `text-sm` while ConfirmDialog/ConfirmDeleteModal titles are `text-base font-extrabold`
- **Severity:** P2 (polish)
- **Issue:** The same "dialog title" semantic renders at two sizes across the two dialog systems in the same app; the Radix one also has no `leading-relaxed` for wrapped titles.
- **Suggestion:** Unify title size (`text-base font-extrabold`) across Radix Dialog and the confirm components.

### src/components/ui/dialog.tsx:29 — Overlay uses `bg-slate-900/50` while ConfirmDialog uses the same but ConfirmDeleteModal lacks backdrop-blur
- **Severity:** P3 (nitpick)
- **Issue:** Radix overlay and ConfirmDialog blur the backdrop (`backdrop-blur-sm`/`backdrop-blur-xs`); ConfirmDeleteModal's backdrop (`bg-slate-900/50` line 39, no blur) doesn't — subtle inconsistency between the two confirm modals.
- **Suggestion:** Add `backdrop-blur-xs` to ConfirmDeleteModal's backdrop.

---

## src/components/ui/badge.tsx

### src/components/ui/badge.tsx:27-29 — Badge renders a `<div>`, but it's used inline inside buttons/text (e.g. Navigation badges)
- **Severity:** P3 (nitpick)
- **Issue:** `<div className={cn(badgeVariants…)}/>` — a div inside `<Button>`/`<span>` contexts is invalid HTML nesting and can break flex alignment; StatusBadge correctly uses `<span>`.
- **Suggestion:** Render a `<span>` (BadgeProps already extends HTMLAttributes; change the element to span).

### src/components/ui/badge.tsx:8 — `focus:outline-none` on a non-focusable div
- **Severity:** P3 (nitpick)
- **Issue:** Dead class — a div can't receive focus; if it's ever made interactive this class alone (without a focus style) would hide focus.
- **Suggestion:** Remove it, or add `focus-visible:ring-2` if the badge can be focusable.

### src/components/ui/badge.tsx:8-24 — Fourth badge system: `rounded-full px-2.5 py-0.5` (≈20px) vs StatusBadge (16-22px, rounded-md/lg) vs StatusChip (≈24px, rounded-md) vs PriorityBadge (20-30px)
- **Severity:** P2 (polish)
- **Issue:** Four components render "status/priority" pills with different radii, heights, and shadow treatment (PriorityBadge adds `shadow-2xs` on some variants only). The same ticket status looks different depending on which component rendered it.
- **Suggestion:** Consolidate on one `Badge` with a `size` prop (`xs/sm/md`) and map StatusBadge/StatusChip/PriorityBadge to it, or at least align radius (`rounded-lg`) and height tokens.

---

## src/components/ui/card.tsx

### src/components/ui/card.tsx:9 — Card has no `overflow-hidden`; rounded corners don't clip children
- **Severity:** P3 (nitpick)
- **Issue:** `rounded-2xl border` without `overflow-hidden` — any Card with an edge-to-edge header image/color block (module cards use colored headers) bleeds past the rounded corner.
- **Suggestion:** Add `overflow-hidden` to the base (verify no tooltip/overlay children need to escape; the app's cards are simple containers, safe here).

### src/components/ui/card.tsx:19-24 — CardHeader/CardContent padding `p-5` but module skeletons use `p-4`
- **Severity:** P3 (nitpick)
- **Issue:** `ModuleLoadingSkeleton` placeholder cards use `p-4` while real cards use `p-5` — a 4px padding jump when the skeleton swaps to the real module (adds to perceived layout shift during loading).
- **Suggestion:** Make the skeleton use `p-5` to match Card.

---

## src/components/ui/tabs.tsx

### src/components/ui/tabs.tsx:31-37 — TabsTrigger is ~30px tall with no gap between triggers
- **Severity:** P3 (nitpick)
- **Issue:** `px-3 py-1.5` ≈ 30px — sub-40px target, and triggers sit flush against each other inside `p-1` list (no `gap`), making mis-taps easy on touch devices.
- **Suggestion:** `py-2` (≈36px) and add `gap-1` to TabsList; keep `whitespace-nowrap` (already there).

---

## src/components/ui/dropdown-menu.tsx

### src/components/ui/dropdown-menu.tsx:25 — Radix menu surface is `bg-white` while CustomDropdownMenu is `bg-surface`
- **Severity:** P2 (polish)
- **Issue:** Two dropdown primitives serving the same "action menu" role render different menu backgrounds. In dark theme the Radix one will stay white while CustomDropdownMenu follows the token.
- **Suggestion:** Unify on `bg-white` (or `bg-[var(--card-bg)]`) in both.

### src/components/ui/dropdown-menu.tsx:25 — `animate-in` without fade/zoom keyframes → menu pops with no animation
- **Severity:** P3 (nitpick)
- **Issue:** `data-[state=open]:animate-in data-[state=closed]:animate-out` alone doesn't specify opacity/scale, so there's no visible transition (CustomDropdownMenu has the same gap).
- **Suggestion:** Add `data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95` (matches DialogContent's pattern).

### src/components/ui/dropdown-menu.tsx:41 — Menu item `px-2.5 py-2` (36px) vs CustomDropdownMenu option `px-3 py-2 min-h-9` vs DrawerSelect option `px-3 py-2.5`
- **Severity:** P2 (polish)
- **Issue:** The same "option row" renders at three paddings/heights in the three dropdown implementations — menus feel different per module.
- **Suggestion:** Standardize option rows: `min-h-9 px-3` everywhere (or migrate all three to one primitive).

---

## src/components/common/ConfirmDialog.tsx

### src/components/common/ConfirmDialog.tsx:69-77 — No initial focus, no focus trap
- **Severity:** P2 (polish)
- **Issue:** On open, keyboard focus stays on the trigger (nothing calls `focus()`); Tab can walk behind the modal. Radix Dialog and ConfirmDeleteModal both at least move focus; this one doesn't.
- **Suggestion:** On open, `requestAnimationFrame(() => confirmBtnRef.current?.focus())` (or the Cancel button) and trap Tab within the panel (or reuse Radix Dialog).

### src/components/common/ConfirmDialog.tsx:69-75 — Backdrop click silently cancels, including for destructive confirms
- **Severity:** P3 (nitpick)
- **Issue:** `onClick={() => close(false)}` on the full-screen backdrop — an accidental click outside a destructive delete silently cancels. Not dangerous (cancel is the safe direction), but for destructive actions the standard is "outside click = ignore" (as ConfirmDeleteModal does — its panel stopPropagation is on the panel but the outer div has NO click handler at all, i.e. outside clicks do nothing there). The two confirm components disagree on outside-click behavior.
- **Suggestion:** Pick one behavior: recommend outside-click = no-op for `danger: true`, close for non-danger.

### src/components/common/ConfirmDialog.tsx:83-84 — "Action Requires Confirmation" subtitle is hardcoded English
- **Severity:** P3 (nitpick)
- **Issue:** The app has a LanguageContext with မြန်မာ support, but this subtitle (and ConfirmDeleteModal's identical one) is hardcoded.
- **Suggestion:** Use `t('confirmSubtitle')` or drop the subtitle entirely (it adds no information).

### src/components/common/ConfirmDialog.tsx:76 — `rounded-3xl` while Radix Dialog is `sm:rounded-2xl` — three confirm surfaces, three radii
- **Severity:** P3 (nitpick)
- **Issue:** ConfirmDialog and ConfirmDeleteModal both use rounded-3xl; the Radix Dialog uses rounded-2xl. The "confirm" family should share one radius.
- **Suggestion:** Unify to `rounded-2xl` (or `rounded-3xl` for confirms only, but then make Radix matches).

---

## src/components/common/ConfirmDeleteModal.tsx

### src/components/common/ConfirmDeleteModal.tsx:39-46 — Panel has no `role="dialog"` / `aria-modal` (unlike ConfirmDialog and Radix)
- **Severity:** P2 (polish)
- **Issue:** The inner panel has `tabIndex={-1}` and gets focus, but no dialog role/name — screen readers announce it as a plain div; no `aria-label`/`aria-labelledby` either.
- **Suggestion:** Add `role="dialog" aria-modal="true" aria-label={title}` on the panel (and keep `aria-labelledby` if a title id is added).

### src/components/common/ConfirmDeleteModal.tsx:78-85 — Confirm button hand-rolls Button styles instead of using variants
- **Severity:** P2 (polish)
- **Issue:** `px-5 py-2.5 text-white text-xs font-black rounded-xl shadow-md … active:scale-95` duplicates the kit's destructive variant, and `shadow-rose-200` is a raw color. This bypasses the "one Button" policy the ui kit documents.
- **Suggestion:** Use `<Button variant={isDanger ? "destructive" : "default"}>` and keep only `className="flex-1 sm:flex-none"`.

### src/components/common/ConfirmDeleteModal.tsx:95-98 — Closes before the async `onConfirm` resolves; no busy state
- **Severity:** P2 (polish)
- **Issue:** `onClick={() => { onConfirm(); onClose(); }}` — fire-and-close; callers doing async deletes (Supabase save) have no spinner/disabled state, and a double-tap can fire twice.
- **Suggestion:** Let the parent own closing: call `onConfirm()` and have the parent flip `isOpen` when done; or accept an `isConfirming` prop that disables + shows a spinner.

### src/components/common/ConfirmDeleteModal.tsx:84 — Non-danger confirm uses `bg-warning` (amber) for a positive action
- **Severity:** P3 (nitpick)
- **Issue:** `isDanger ? 'bg-danger hover:bg-danger-deep' : 'bg-warning hover:bg-warning'` — when `isDanger=false` the primary confirm button is amber with a no-op `hover:bg-warning`; amber reads as "caution", not "proceed". There is no success/brand fallback.
- **Suggestion:** Use `bg-brand hover:bg-brand-deep` for the non-danger branch (matching ConfirmDialog's non-danger confirm).

### src/components/common/ConfirmDeleteModal.tsx:27-38 — Duplicate of ConfirmDialog: two confirmation systems coexist
- **Severity:** P2 (polish)
- **Issue:** `ConfirmDeleteModal` (prop-driven, used by modules) and `ConfirmDialogHost` (promise-based, used via `confirmDialog()`) render the same "confirm with danger icon + subtitle + Cancel/Confirm" UI with subtly different props, focus handling, and outside-click behavior. Future fixes must be made twice.
- **Suggestion:** Consolidate onto one component (make ConfirmDeleteModal a thin wrapper around `confirmDialog()`), or migrate both to Radix Dialog.

---

## src/components/common/ModuleLoadingSkeleton.tsx

### src/components/common/ModuleLoadingSkeleton.tsx:29 — Magic-number chip widths via inline style
- **Severity:** P3 (nitpick)
- **Issue:** `style={{ width: w }}` with `[72, 88, 64, 96, 80]` — arbitrary pixel widths that don't correspond to any real chip; fine visually, but it bypasses Tailwind and can't adapt to font-scale.
- **Suggestion:** Use `w-16 w-20 w-14 w-24 w-18`-style classes (or `w-[4.5rem]` with comments).

### src/components/common/ModuleLoadingSkeleton.tsx:36-39 — Skeleton card header block uses `bg-surface` where the page skeleton header uses `bg-line`
- **Severity:** P3 (nitpick)
- **Issue:** Icon placeholder `bg-surface` (line 38) inside cards vs `bg-line` (line 14) for the same icon slot in the header — inconsistent skeleton shade for the same semantic element, so the loading look differs per region.
- **Suggestion:** Use `bg-line` for icon slots everywhere; `bg-surface` only for secondary text lines.

### src/components/common/ModuleLoadingSkeleton.tsx:22-25 — Skeleton action buttons are `h-9` but real header buttons are `h-10`
- **Severity:** P3 (nitpick)
- **Issue:** `h-9 w-24` placeholders (line 23-24) vs the app's 40px button standard — a 4px jump when real content swaps in.
- **Suggestion:** Use `h-10 w-24`.

---

## src/components/common/StatusBadge.tsx

### src/components/common/StatusBadge.tsx:36-39 — Arbitrary micro heights (16-22px) for status pills
- **Severity:** P3 (nitpick)
- **Issue:** `h-[16px] h-[18px] h-[20px] h-[22px]` with `text-[11px]` — the xs/sm sizes render tiny, cramped text ("CUSTOMER NOT REPAIR" at 11px in an 18px pill is borderline illegible).
- **Suggestion:** Use `min-h` tokens aligned to the Badge system (`h-5/h-6/h-7`) and `text-[10px]`/`text-xs` consistently.

### src/components/common/StatusBadge.tsx:48-55 — `isPulsing` is always false — dead ping animation
- **Severity:** P3 (nitpick)
- **Issue:** Every branch sets `isPulsing = false`; the `animate-ping` block (lines 52-55) can never render. Either wire it (e.g. pulse the dot on 'Pending'/'Diagnosing') or delete the dead code.
- **Suggestion:** Enable `isPulsing = true` for `Pending`/`Awaiting Parts` states (attention-worthy), or remove the branch.

### src/components/common/StatusBadge.tsx:104-107 — `whitespace-nowrap` on long uppercased statuses overflows narrow cards
- **Severity:** P2 (polish)
- **Issue:** `whitespace-nowrap` + `uppercase tracking-wider` turns "Customer Not Repair" into a ~180px wide pill; in a 320px card grid cell it pushes past the card edge with no truncation.
- **Suggestion:** Keep `whitespace-nowrap` but drop `uppercase` for multi-word statuses, or add `max-w-full truncate` on the label span.

### src/components/common/StatusBadge.tsx:80-87 — "Taken Out"/"Paid" uses solid `bg-ink text-white` while every other state is a soft pastel
- **Severity:** P3 (nitpick)
- **Issue:** `bg-ink text-white border-ink` is visually heavy next to the soft `bg-*-/10` pills — a completed state reads as more prominent than an active one. (StatusChip mirrors this, so it's consistent between the two — but it clashes with the soft system as a whole.)
- **Suggestion:** Use `bg-success/10 text-success-deep border-success/30` for all completed states and reserve solid ink for truly terminal/disabled rows.

---

## src/components/common/StatusChip.tsx

### src/components/common/StatusChip.tsx:48-52 — No `whitespace-nowrap` — long statuses wrap inside the chip
- **Severity:** P2 (polish)
- **Issue:** Unlike StatusBadge, this chip has no `whitespace-nowrap`, so "CUSTOMER NOT REPAIR" (uppercased via `uppercase tracking-wide`) wraps onto two lines inside the pill — misaligned in table cells and chip rows.
- **Suggestion:** Add `whitespace-nowrap` (and consider `tracking-normal` for multi-word statuses).

### src/components/common/StatusChip.tsx:48 — `uppercase` on all statuses widens already-long labels
- **Severity:** P3 (nitpick)
- **Issue:** `font-extrabold uppercase tracking-wide` — "Customer Not Repair" at full caps is ~30% wider than mixed case, aggravating the wrap/overflow issue in tight table cells.
- **Suggestion:** Render statuses in mixed case with `font-bold` (drop uppercase) or add a short-label map.

---

## src/components/common/PriorityBadge.tsx

### src/components/common/PriorityBadge.tsx:34-42 — `shadow-2xs` only on Urgent/Warranty/B2B variants; Normal gets none
- **Severity:** P3 (nitpick)
- **Issue:** Inconsistent elevation between priority levels — the shadow adds a "raised" look that makes Urgent feel like a different component rather than a different color.
- **Suggestion:** Drop `shadow-2xs` from all variants (badges shouldn't float), or add it to all.

### src/components/common/PriorityBadge.tsx:51-53 — 'Rush' silently renders as 'Urgent'
- **Severity:** P3 (nitpick)
- **Issue:** `{normPriority === 'Rush' ? 'Urgent' : normPriority}` — a technician who set "Rush" sees "Urgent"; label substitution is invisible and makes filtering/debugging confusing (filter by "Urgent" won't match the stored "Rush" value).
- **Suggestion:** Display the stored value as-is, or rename the option in the picker so the data and display always agree.

---

## src/components/common/HoverTooltip.tsx

### src/components/common/HoverTooltip.tsx:12-13 — Tooltip selector only matches buttons and `[role="button"]`
- **Severity:** P3 (nitpick)
- **Issue:** `button[title], button[aria-label], button[data-tooltip], [role="button"]…` — links and inputs with `title` attributes never get tooltips, so the affordance is inconsistent (e.g. the logo `<a>`/div in Navigation has a title but no tooltip).
- **Suggestion:** Widen the selector to `a[title], [data-tooltip]` (careful not to cover the whole document — keep `title` matching to interactive elements only).

### src/components/common/HoverTooltip.tsx:87-101 — Title is stolen/restored on every show; unmount mid-hover leaves the title removed
- **Severity:** P3 (nitpick)
- **Issue:** `target.removeAttribute('title')` … `restoreTitle()` — if the target unmounts (tab switch, list re-render) while hovered, the original `title` is never restored, and the element keeps `data-tooltip`-less state. Also `hideTooltip` on scroll fires constantly during scroll (hide → re-show flicker on the next mouseover).
- **Suggestion:** Restore the title in a `MutationObserver`-safe way or skip the title-stripping entirely (native title + custom tooltip is acceptable; set `title` to `undefined` only while showing).

### src/components/common/HoverTooltip.tsx:142-152 — Tooltip appears instantly with no transition or caret
- **Severity:** P3 (nitpick)
- **Issue:** After the 350ms delay it pops in with no fade/scale and no arrow pointing at the trigger — feels abrupt next to the app's animated menus/drawers.
- **Suggestion:** Wrap in the app's `animate-in fade-in zoom-in-95 duration-150` pattern (as used by dialogs) and add a 6px caret via a rotated square.

---

## src/components/common/ErrorBoundary.tsx

### src/components/common/ErrorBoundary.tsx:86-99 — Both fallback buttons hand-roll Button styles instead of using variants
- **Severity:** P2 (polish)
- **Issue:** `className="flex-1 inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-line bg-surface px-4 …"` duplicates `variant="outline"` and the second duplicates `variant="default"` — drift risk (e.g. shadow-2xs vs shadow-xs differences) and violates the kit policy.
- **Suggestion:** `<Button variant="outline" className="flex-1">Try Again</Button>` and `<Button variant="default" className="flex-1">…Reload</Button>`.

### src/components/common/ErrorBoundary.tsx:30-35 — Full-screen `bg-slate-900/80` modal hides the entire app; chunk-error retry may loop
- **Severity:** P3 (nitpick)
- **Issue:** Any render error in any module takes over the whole screen (no context visible). For chunk errors the Retry button may immediately re-throw → visible reload loop. The component does log to `/api/error-log` (good).
- **Suggestion:** Consider a scoped boundary per module (already present via lazyWithRetry for chunks) and keep the app-level boundary as the last resort; auto-reload once on chunk errors before showing the manual screen.

---

## src/components/common/LanguageSwitcher.tsx

### src/components/common/LanguageSwitcher.tsx:18-26 — Compact variant: MM button lacks `variant`/`size` while EN button has them → mismatched heights on lg
- **Severity:** P2 (polish)
- **Issue:** EN uses `variant="ghost" size="sm"` (`h-10 lg:h-8`), MM uses the default size (`h-10`) with hand-rolled `px-2 py-1 rounded-lg` — on desktop the two pills have different heights and radius handling; they're visibly uneven inside the same 40px container.
- **Suggestion:** Mirror the EN button props on MM (add `variant="ghost" size="sm"`) and let the shared `className` handle the active state.

### src/components/common/LanguageSwitcher.tsx:2 — `import { Languages} from 'lucide-react'` — missing space (lint) 
- **Severity:** P3 (nitpick)
- **Issue:** Cosmetic formatting inconsistency (`Languages}` ) in an otherwise formatted file.
- **Suggestion:** `import { Languages } from 'lucide-react'`.

### src/components/common/LanguageSwitcher.tsx:51-53 — Pills variant: the Languages icon sits in an empty padded div with no label
- **Severity:** P3 (nitpick)
- **Issue:** `<div className="flex items-center px-2 py-0.5 text-muted …"><Languages …/></div>` renders a floating globe icon with no adjacent text — it reads as a decorative divider, not a "language" indicator; screen readers get nothing (no aria-label).
- **Suggestion:** Remove the div or give it `aria-hidden` + `title="Language"`, or drop the icon entirely and keep the two flag pills.

### src/components/common/LanguageSwitcher.tsx:20-26 — Compact variant buttons have `title` but pills variant don't
- **Severity:** P3 (nitpick)
- **Issue:** Compact EN/MM have `title`/`aria-label`-ish attributes; pills variant (the default, line 54+) buttons have neither — inconsistent tooltip/a11y affordances between variants.
- **Suggestion:** Add `title="English"`/`title="မြန်မာဘာသာ"` to the pills variant too.

---

## src/components/common/OfflineSyncStatusBadge.tsx

### src/components/common/OfflineSyncStatusBadge.tsx:63 — Invalid class `border-success/30/80` (double opacity)
- **Severity:** P2 (polish)
- **Issue:** `border-success/30/80` — Tailwind has no double-slash opacity; the class is silently dropped, so the online-state button falls back to the theme's default border (usually `line`), making the green "online" button look like a plain gray-outline button.
- **Suggestion:** `border-success/30` (or `border-success/30 border-opacity-80` if the intent was 24% alpha).

### src/components/common/OfflineSyncStatusBadge.tsx:55 — Entire DB-status control is `hidden lg:block` — phones/tablets never see connectivity state
- **Severity:** P2 (polish)
- **Issue:** The app's only live-database indicator disappears below 1024px — exactly the devices where the offline queue is most likely to matter (shop phones on flaky Wi-Fi). The offline banner covers "offline" but not "connected but Supabase unreachable" states.
- **Suggestion:** Show a compact dot-only variant on small screens (e.g. `block lg:inline-flex` with the panel still `lg:`-only), or fold the status into the offline banner.

### src/components/common/OfflineSyncStatusBadge.tsx:60 — Status button is `h-8 w-8` (32px)
- **Severity:** P3 (nitpick)
- **Issue:** Below the 40px touch standard used by the rest of the header (all other header buttons are h-10).
- **Suggestion:** `h-10 w-10` when shown, or accept 32px only for this non-primary indicator.

### src/components/common/OfflineSyncStatusBadge.tsx:94 — `toLocaleTimeString()` without locale — device-dependent formatting
- **Severity:** P3 (nitpick)
- **Issue:** "Last synced" time renders per device locale (e.g. "1:05 PM" vs "13:05") while the rest of the app formats dates consistently (month-name style in DateFilterSelector).
- **Suggestion:** Use `new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' })` once, or a shared `formatTime` util.

### src/components/common/OfflineSyncStatusBadge.tsx:72-92 — Status panel pops in with no animation
- **Severity:** P3 (nitpick)
- **Issue:** The panel appears instantly (no fade/scale) — inconsistent with drawers (300ms) and dialogs (150ms) in the same shell.
- **Suggestion:** Add `animate-in fade-in zoom-in-95 duration-150` to the panel (with `origin-top-right`).

---

## src/components/common/GlobalSearchModal.tsx

### src/components/common/GlobalSearchModal.tsx:121 + 127 — Duplicate nested `role="dialog" aria-modal="true" aria-label="Global search"`
- **Severity:** P2 (polish)
- **Issue:** The outer backdrop wrapper AND the inner card both declare `role="dialog" aria-modal="true"` — screen readers announce two stacked modal dialogs; the outer one has no focusable content.
- **Suggestion:** Outer wrapper → `role="presentation"` (keep the mouse-down close); inner card keeps `role="dialog" aria-modal="true"`.

### src/components/common/GlobalSearchModal.tsx:163-176 — Results are Buttons with mouse-hover cursor highlight only; no listbox semantics, arrow-key focus not announced
- **Severity:** P3 (nitpick)
- **Issue:** Arrow keys move a `data-active` highlight but focus stays in the input; screen readers never hear the highlighted result, and there's no `aria-activedescendant` wiring. Also no `role="option"`/`aria-selected` on the rows (they're plain buttons).
- **Suggestion:** Add `role="listbox"` on the results container, `role="option" aria-selected={active}` per row, and `aria-activedescendant` on the input pointing at the active row id.

### src/components/common/GlobalSearchModal.tsx:146 — "Esc to close" hint lives only in the placeholder, which disappears while typing
- **Severity:** P3 (nitpick)
- **Issue:** `placeholder="Search tickets, parts, customers…  (Esc to close)"` — once the user types (the only time they need the hint), it's gone; also the placeholder truncates on narrow screens.
- **Suggestion:** Show a persistent footer hint bar ("↑↓ navigate · Enter open · Esc close") like desktop search palettes.

### src/components/common/GlobalSearchModal.tsx:121 — `pt-[12vh]` magic number
- **Severity:** P3 (nitpick)
- **Issue:** Arbitrary 12vh top offset — on short landscape phones the modal can sit too low/tall.
- **Suggestion:** `pt-[12vh]` → `pt-[10vh] max-h-[85vh]` on the card with internal scroll (list already caps at 52vh).

### src/components/common/GlobalSearchModal.tsx:152-153 — Results silently capped at 30 with no indication
- **Severity:** P3 (nitpick)
- **Issue:** `items.slice(0, 30)` — searching "iPhone" with 200 matching tickets shows 30 with no "showing 30 of 200" note; users may think the search is broken.
- **Suggestion:** Append a footer row `Showing 30 of N matches` when `items.length > 30`.

---

## src/components/common/CustomDropdownMenu.tsx

### src/components/common/CustomDropdownMenu.tsx:219-221 — Menu surface `bg-surface` while Radix menu and DrawerSelect use `bg-white`
- **Severity:** P2 (polish)
- **Issue:** Same "listbox" concept, three background tokens. In dark theme this one turns gray while the others stay white (or vice versa) — the menus visibly disagree.
- **Suggestion:** Unify on `bg-[var(--card-bg)]` (or `bg-white`) across CustomDropdownMenu, DrawerSelect, and the Radix wrapper.

### src/components/common/CustomDropdownMenu.tsx:196-208 — Option rows are `min-h-9` (36px) — under the 40px touch target
- **Severity:** P3 (nitpick)
- **Issue:** `min-h-9 … px-3 py-2` — 36px rows in a touch-first ERP; combined with `gap-3` between label and badge, mis-taps are easy on phones.
- **Suggestion:** `min-h-10` for the `md` size, `min-h-9` only for `sm`.

### src/components/common/CustomDropdownMenu.tsx:9-12 — Position constants duplicated with DrawerSelect (224/232/296 vs 200/120/240)
- **Severity:** P3 (nitpick)
- **Issue:** Two copies of the same viewport-clamp math with different magic numbers; if the menu width/height classes change, the clamps silently drift (already off: DrawerSelect menu is `w-48` = 192px but `MENU_WIDTH = 200`).
- **Suggestion:** Extract a shared `useFloatingMenuPosition` hook (or a shared `menuGeometry.ts`) used by both components.

### src/components/common/CustomDropdownMenu.tsx:150-155 — Transparent full-screen backdrop uses `onTouchStart={close}` — a scroll that begins on the backdrop closes the menu
- **Severity:** P3 (nitpick)
- **Issue:** On touch, starting a scroll anywhere over the (invisible) backdrop closes the menu immediately — scrolling past the open menu dismisses it, which is aggressive.
- **Suggestion:** Close on `touchend` outside the menu only (track start point like RightFilterDrawer's swipe logic), or rely on the `scroll` re-anchor listener instead.

---

## src/components/common/DrawerSelect.tsx

### src/components/common/DrawerSelect.tsx:125 — Trigger has `outline-none` and no focus-visible ring — invisible focus
- **Severity:** P1 (visible/annoying)
- **Issue:** `outline-none transition-colors` with no ring replacement: the filter-drawer selects give zero focus feedback (global outline removal compounds it).
- **Suggestion:** `focus-visible:ring-2 focus-visible:ring-brand/60` on the trigger.

### src/components/common/DrawerSelect.tsx:104-107 — Menu is `w-48` (192px) but `MENU_WIDTH = 200` — clamp math off by 8px
- **Severity:** P3 (nitpick)
- **Issue:** `const MENU_WIDTH = 200;` (line 8) vs `className="… w-48 …"` (192px) — the right-edge viewport clamp can leave the menu up to 8px past the computed boundary.
- **Suggestion:** Set `MENU_WIDTH = 192` (or switch the menu to `w-50`/`w-[200px]` to match the constant).

### src/components/common/DrawerSelect.tsx:104-113 — Label isn't associated with the control; listbox lacks `aria-labelledby`
- **Severity:** P3 (nitpick)
- **Issue:** The `<label>` (line 103) has no `htmlFor` and the button no `id`/`aria-labelledby`; the `role="listbox"` menu is unnamed. Screen readers announce the trigger only via its content text.
- **Suggestion:** Add `id={…}` to the trigger and `htmlFor`/`aria-labelledby` wiring, and `aria-labelledby` on the menu div.

### src/components/common/DrawerSelect.tsx:119-121 — Raw `<button>` options have no focus-visible styling (default outline removed globally)
- **Severity:** P3 (nitpick)
- **Issue:** Menu options are raw buttons — global CSS strips their outlines, so keyboard users tabbing through options see no indicator (they do get the default browser focus ring removed by index.css:1316).
- **Suggestion:** Add `focus-visible:bg-surface focus-visible:ring-2 focus-visible:ring-brand/40` to option rows.

---

## src/components/common/DateFilterSelector.tsx

### src/components/common/DateFilterSelector.tsx:216-220 — Calendar popover is anchored to the top-right of the VIEWPORT, not to the trigger
- **Severity:** P2 (polish)
- **Issue:** `fixed inset-0 z-[110] flex items-start justify-end px-4 pt-12` — the popover always appears at the far top-right corner. On desktop the trigger sits mid-header (segmented control), so the calendar floats far away with no visual connection; users must re-find their button.
- **Suggestion:** Position the popover relative to the trigger rect (portal + fixed coords like CustomDropdownMenu), or keep the segmented control and the popover adjacent by anchoring to the Custom button.

### src/components/common/DateFilterSelector.tsx:282-295 — Date inputs override the kit to `h-8` (32px) and `text-[11px]`
- **Severity:** P2 (polish)
- **Issue:** `className="h-8 w-full px-1.5 … text-[11px]"` on the ui `Input` — contradicts the Input kit's h-10/text-sm base, and 11px date text in a 32px field is cramped on phones (iOS date pickers also render awkwardly small).
- **Suggestion:** Use the Input base height `h-10` and `text-xs` at minimum, or add a `size="sm"` variant to Input (32px is defensible in a 280px popover, but then make it a real variant).

### src/components/common/DateFilterSelector.tsx:300-317 — Cancel/Apply are `!h-7` (28px) and the header close is `!h-6` (24px)
- **Severity:** P3 (nitpick)
- **Issue:** Three sub-40px touch targets inside the popover (`!h-7 !min-h-7` buttons, `!h-6 !min-h-6` close) — far below the app's stated 40px touch standard.
- **Suggestion:** `!h-9` minimum for Apply/Cancel and `h-8 w-8` for the close.

### src/components/common/DateFilterSelector.tsx:157-197 — Five near-identical segment Buttons; the Custom segment grows when a range is picked → layout shift
- **Severity:** P2 (polish)
- **Issue:** All/Today/7/30 segments are static `px-3 py-1`, but Custom renders `<Calendar/> + "Jan 3 - Jan 8"` — the segment roughly doubles in width after picking a range, pushing the whole segmented control wider (it can overflow the topbar strip on md screens). Also the duplicated button blocks are unmaintainable.
- **Suggestion:** Map over a presets array; give the Custom segment `min-w` and let its label truncate (`max-w-[110px] truncate`) so the control width stays stable.

### src/components/common/DateFilterSelector.tsx:77-86 vs App.tsx:868-872 — Same custom date range formatted two ways
- **Severity:** P2 (polish)
- **Issue:** The header DateFilterSelector formats as `Jan 3 - Jan 8` (`formatDateLabel`), but the mobile drawer's DrawerSelect (App.tsx renderMobileFilters) shows raw ISO `2026-08-01 → 2026-08-05 (custom)`. The same filter reads differently on desktop vs mobile.
- **Suggestion:** Export `formatDateLabel` and reuse it for the drawer option label (or format ISO → `Aug 1 → Aug 5`).

### src/components/common/DateFilterSelector.tsx:216-219 — Backdrop wrapper is `role="presentation"` with a mouse-down close, but no `aria-hidden`
- **Severity:** P3 (nitpick)
- **Issue:** The full-screen click-catcher div is in the a11y tree as presentation (fine) but interactive-only-by-mouse — keyboard users can Tab into the background content behind it (no inert/focus trap).
- **Suggestion:** While the popover is open, `inert` the app root or add a `data-state` that makes background inert; at minimum focus the first date input on open.

---

## src/components/common/RightFilterDrawer.tsx

### src/components/common/RightFilterDrawer.tsx:101-116 — No focus trap — Tab walks behind the drawer
- **Severity:** P3 (nitpick)
- **Issue:** Focus moves into the panel on open and returns on close (good), but Tab continues into the page behind the backdrop; combined with `aria-modal="true"` this is an a11y contradiction.
- **Suggestion:** Implement a lightweight Tab loop (keydown handler on the panel cycling first/last focusable) or use `inert` on the app shell while open.

### src/components/common/RightFilterDrawer.tsx:129-144 — Footer Reset button hand-rolls destructive styles instead of using `Button variant="destructive"` / outline
- **Severity:** P2 (polish)
- **Issue:** `rounded-xl border border-danger/30 bg-danger/10 … text-danger` duplicates the kit; also the Reset button and Done button use inconsistent vertical padding (`py-2.5` both, fine) but Reset relies on raw color classes that dark-theme overrides may not catch.
- **Suggestion:** `<Button variant="destructive" className="flex-1">` for Reset (or a new `outline-destructive` variant) and keep Done as `variant="default"`.

### src/components/common/RightFilterDrawer.tsx:86-91 — Backdrop has no `motion-reduce` (panel does)
- **Severity:** P3 (nitpick)
- **Issue:** Panel respects `motion-reduce:transition-none`; the backdrop's `transition-opacity duration-300` doesn't — users with reduced-motion get a still-animating backdrop.
- **Suggestion:** Add `motion-reduce:transition-none` to the backdrop.

### src/components/common/RightFilterDrawer.tsx:82-83 — Closed drawer keeps full DOM mounted with `pointer-events-none invisible`
- **Severity:** P3 (nitpick)
- **Issue:** Fine for transitions, but the drawer content (filter selects) stays mounted and any component-level timers/effects keep running invisibly on every tab. Also `aria-hidden={!open}` toggles on a container that holds focusable content while "closed".
- **Suggestion:** Acceptable as-is; just ensure nothing inside starts async work while hidden, or unmount children when closed after the transition.

---

## src/components/common/ActiveFilterChips.tsx

### src/components/common/ActiveFilterChips.tsx:22-27 — Chips are 32px (`chip` variant h-8) with a 12px X icon; no aria-label
- **Severity:** P2 (polish)
- **Issue:** The chip button is `h-8` with `X w-3 h-3` — a tiny tap target for the exact action (clearing a filter) users do most. There's `title="Clear …"` but no `aria-label`/`aria-live`, so screen readers announce the raw label ("Status: In Progress") with no hint that it's a clear button.
- **Suggestion:** Add `aria-label={`Clear filter ${chip.label}`}`; bump the chip to `h-9`/`h-10` and the X to `w-3.5 h-3.5`.

### src/components/common/ActiveFilterChips.tsx:22-27 — Hover flips the whole chip to solid brand — aggressive for a dismiss action
- **Severity:** P3 (nitpick)
- **Issue:** `hover:bg-brand hover:text-white` turns the pastel chip solid on hover — reads like the chip is "selected" rather than "will be removed"; the X alone should signal dismissal.
- **Suggestion:** Hover to `hover:border-danger/40 hover:bg-danger/10 hover:text-danger` so hovering communicates "this will clear".

---

## Top 5 quick wins

1. **Restore keyboard focus visibility** — replace `index.css:1316`'s blanket `outline: none` with `focus-visible: outline: 2px solid var(--brand)` (or add `focus-visible:ring-2 ring-brand/60` to Button/Input base classes): one-line CSS fix that un-fixes P1 focus loss for every control in the app.
2. **Delete `hover:bg-transparent!` on the QA Table|Cards toggles (App.tsx:2461/2471)** — hovering the active toggle currently erases its brand fill; swap to `hover:bg-brand-deep`/`hover:bg-surface`.
3. **Fix `border-success/30/80` → `border-success/30` (OfflineSyncStatusBadge.tsx:63)** — an invalid class is silently dropping the online-status border; one token fix makes the green DB indicator actually render green-bordered.
4. **Replace the text `×` clear button with the lucide `X` icon (App.tsx:2135)** — instant iconography consistency with every other close/clear affordance, plus a proper `aria-label`.
5. **Unify the three dropdown menu surfaces (`bg-white`/`bg-surface`) and two confirm-dialog systems** — start by making CustomDropdownMenu use `bg-white` (one-class change), then align ConfirmDeleteModal onto `confirmDialog()` so future fixes happen once instead of twice.
