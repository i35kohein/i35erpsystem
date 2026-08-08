# Price List — Detailed UI/UX Analysis (Mobile + Desktop)

> Module: `PriceCatalogModule.tsx` (1,230 lines) + topbar (`App.tsx`) + modals
> (`PriceSettingsModal`, `QuickPriceCalculatorModal`, `DeviceModelChooserModal`)

---

## 0. Layout Architecture

| Surface | Layout |
|---|---|
| **Desktop (lg+)** | `grid-cols-12`: catalog 8 cols + cart panel 4 cols, each independently scrollable |
| **Mobile** | vertical stack: device strip → category chips → service cards → sticky "View Cart" bar → bottom-sheet cart |

This split is correct: desktop gets the classic POS two-pane, mobile gets a focus-mode flow with a persistent cart affordance.

---

## 1. Mobile — What Works ✅
- **Device strip** pinned at top (model always visible while scrolling).
- **Category chips** (now on mobile + desktop) kill the endless single-column scroll.
- **Sticky bottom bar** only when cart has items; shows count + total + big CTA.
- **Bottom sheet cart**: drag handle, clean header, no placeholder slots, compact warranty pill beside the name, centered discount modal (portal — never clipped).
- **Savings banner** ("You save X MMK") when a discount is applied.
- **Empty states** everywhere (catalog empty, cart empty).
- `active:scale-95` press feedback + `focus-visible` rings on primary buttons.

## 1.1 Mobile — Issues

### M1 (P1) Cards still tall in single column
`h-[140px]` cards, 1 column. Chips reduce the list, but a dense 2-line **list row** (`icon 32px + name + warranty + price right, ~64px`) would cut remaining scroll ~50%. (2-col grid was tried and reverted by owner — list row is the alternative that keeps readability.)

### M2 (P1) Device strip Switch button ~30px
`px-2.5 py-1.5` — below the 40px mobile touch minimum. Should be `min-h-10`.

### M3 (P1) Search is not in the module on mobile
Search lives in the topbar at ~144px wide. It belongs **under the device strip** as a full-width input on phones (filters while browsing chips).

### M4 (P2) Sheet: totals + actions scroll away
`renderCartItems + renderCartTotals` both live in the scrollable body. On a long cart, the user must scroll to the bottom to reach **Create Intake Ticket**. Fix: split the sheet — items scroll, **totals + actions in a sticky footer** (shrink-0).

### M5 (P2) Discount modal a11y
Centered modal has no ESC handler, no focus trap, no initial focus. Add ESC-close + focus the first option.

### M6 (P2) Card semantics
Service cards are `motion.div` with `onClick` — no `role="button"`, `tabIndex`, `aria-pressed`, or keydown handling. Not operable via keyboard/talkback.

### M7 (P2) Topbar still busy on small phones (≤360px)
Hamburger + title + global-search icon + 144px input + ⋯ menu fits ~360px, but the title truncates hard. Consider hiding the global-search icon on this tab (contextual search already present).

### M8 (P2) Sticky bar lacks savings info
When discounts are active, the bar shows only count + due total. Add a compact "−X MMK" green hint.

---

## 2. Desktop — What Works ✅
- **8/4 two-pane** with independent scrolling = classic, efficient POS layout.
- **Big device card** (icon + model + service count + Switch Model) anchors the screen.
- Category chips now also available on desktop (cross-tab filtering).
- Responsive card grid: 2 → 3 → 4 → 5 columns by breakpoint.
- Cart panel shows real items + **placeholder slots** up to 3 (visual slot structure for the primary/add-on model).
- Hover states everywhere; strikethrough pricing on discounts.

## 2.1 Desktop — Issues

### D1 (P1) Cart panel footer scrolls with content
Totals + Create/Copy actions are at the bottom of the scrollable column. With 6+ items, actions are below the fold. Fix: pin the totals+actions as a **sticky footer** inside the panel (panel: scrollable items + fixed summary block).

### D2 (P2) Placeholder slots add noise
"Primary Service Slot / Add-on Service #2 / Empty" dashed boxes are decorative; users may tap them expecting action (they're inert). Either make them clearly decorative (smaller, no "Empty" pill) or remove.

### D2b (P2) Redundant global search
Desktop has both the ⌘K search icon and the contextual "Filter services…" input. The ⌘K icon adds little here — could be hidden on this tab.

### D3 (P2) Card keyboard/a11y
Same as M6: cards not keyboard-operable; add `role="button"`, `aria-pressed`, Enter/Space handling.

### D4 (P2) No keyboard navigation for catalog
Typing a letter doesn't jump; no arrow-key navigation across cards. Nice-to-have for a fast-paced POS.

### D5 (P2) Panel header Clear All is a tiny text button
`px-2 py-1` text-only in a `w-20` slot — easy to mis-click, small target. Make it a proper small button with border.

---

## 3. Shared / Cross-Cutting

### C1 (P2) Language consistency
`Navigation.tsx` uses `useLanguage()` (Burmese labels), but Price List UI is hardcoded English ("Selected Cart", "Create Intake Ticket", "Filter services…"). For a Myanmar shop, customer/tech-facing labels should go through `t()`.

### C2 (P2) ESC / focus management in modals
QuickCalc, PriceSettings, Device chooser, discount modal — no ESC-close / focus trap / restore-focus. Standard for a11y.

### C3 (P2) Toast feedback
Only "Quote Copied!" has inline feedback. Cart add/remove, discount apply, ticket created — no toast. A lightweight toast (add to cart = micro-feedback on the sticky bar; remove = nothing) would help.

### C4 (OK) Performance
`availableRepairItems`, `filteredItems`, `chipGroups` all memoized; cart is a `Map`. No obvious re-render hazards.

### C5 (OK) Visual system
Consistent `#0071E3` primary, `text-xs/11px` hierarchy, rounded-xl/2xl, `shadow-2xs`. Feels native to the rest of the ERP.

---

## 4. Recommended Priority Backlog

| # | Item | Surface | Priority |
|---|---|---|---|
| 1 | Sticky totals+actions footer (sheet & desktop panel) | both | P1 |
| 2 | Mobile search under device strip | mobile | P1 |
| 3 | Compact list-row cards on mobile | mobile | P1 |
| 4 | Switch button ≥40px | mobile | P1 |
| 5 | ESC + focus for discount modal / modals | both | P2 |
| 6 | Card `role`/`aria-pressed`/keyboard | both | P2 |
| 7 | Savings hint in sticky bar | mobile | P2 |
| 8 | Placeholder slots polish / remove | desktop | P2 |
| 9 | Panel Clear All as real button | desktop | P2 |
| 10 | i18n (`t()`) for labels | both | P2 |
| 11 | Toasts for cart actions | both | P2 |
