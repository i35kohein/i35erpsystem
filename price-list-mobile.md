# Price List (Catalog) — Mobile UI/UX Analysis (i35 ERP)

> Module: `src/components/prices/PriceCatalogModule.tsx` + topbar actions in `App.tsx`
> Mobile flow: device strip → service cards (1-col) → sticky View Cart bar → bottom-sheet cart

---

## 1. What Already Works ✅
- **Sticky bottom bar** only appears when cart has items (`cart.size > 0`) — no dead space.
- **Bottom-sheet cart** has a clean mobile variant now (no placeholder slots, compact discount control).
- **Device strip** keeps the active model visible while scrolling the list — good pattern.
- Desktop cart panel + mobile sheet share the same logic — no behavior drift.
- `whileTap` scale feedback + selected checkmark on cards.

---

## 2. Issues Found (mobile)

### 2.1 Topbar overload (P0) — in `App.tsx`
The price-catalog topbar packs: hamburger + title + global-search icon + **search input (only 128px wide)** + Quick Calc + Model + Settings + Export buttons, all in one `flex-nowrap` row. On a 360px phone the secondary buttons overflow/get clipped off-screen. The most-used control (search) gets the least space.

### 2.2 No category/folder filtering on mobile (P0)
The grid is a flat single-column list of every category for the device (~20–40 items). Desktop has the cart panel to break the scan, mobile has nothing — no category chips, no group sections. Users must scroll the whole list or use the cramped topbar search.

### 2.3 Cards are tall for a single column (P1)
`h-[140px]` × 1 column = ~30–40 cards of scrolling. Each card repeats icon + label + group + warranty pill + price. On a phone a **compact list row** (icon + name + warranty + right-aligned price, ~64px) would cut scroll distance by half. (2-col was tried and reverted by the owner.)

### 2.4 Device strip controls are small (P1)
Switch button ≈ `px-2.5 py-1.5` (~30px tall) — below touch minimum. The strip is otherwise great.

### 2.5 Card tap semantics (P2)
Cards are `motion.div` with `onClick` but **no `role`/`tabIndex`/`aria-pressed`** — not keyboard/talkback friendly. The selected state is only visual (border + check).

### 2.6 Discount control (P2)
Native `<select>` with 9 options is functional but slow for a shop floor: technicians tap 2–3× to reach 30/40%. Quick-tap preset chips (0/10/20/30/40%) would be faster.

### 2.7 Bottom sheet polish (P2)
- No drag-handle / swipe-down-to-close affordance.
- Totals: "Discount Applied: 0 MMK" row always visible even at 0 — minor noise.
- Sheet max height 88vh — fine; body scrolls — fine.

### 2.8 Search discoverability (P2)
The search input lives in the topbar and is 128px wide on mobile — easy to miss, hard to read. Search belongs inside the module on mobile (below the device strip, full width).

---

## 3. Upgrade Recommendations (mobile-first)

### P0 — Fix topbar, add category chips
1. **Topbar (App.tsx):** on mobile show only: title + search icon + **one** primary action. Move Calc / Model / Settings / Export into a compact **"⋯" overflow menu** (`lg:hidden`), or into a module-level toolbar row. Give the search input `w-40 sm:w-52` minimum.
2. **Category chips:** add a horizontal scrollable chip row under the device strip (mobile only) listing categories/groups (`All` + each group with count). Tap to filter `availableRepairItems` client-side. This is the single biggest mobile win.

### P1 — Compact rows + bigger strip controls
3. **Mobile list rows:** on `<sm`, render a compact row instead of the 140px card:
   - Icon (32px) · name (truncate) · warranty chip · right: price + check
   - ~64px tall, full-width tap, `aria-pressed={isSelected}`, `role="button"` + `tabIndex`.
   - Keep the existing card markup for `sm+`.
4. **Device strip:** bump Switch button to `min-h-10` (40px) on mobile.

### P2 — Micro-polish
5. **Discount presets:** add quick-tap chips (0 / 10 / 20 / 30 / 40%) beside the select in the sheet; keep select for custom values.
6. **Bottom sheet:** add a drag handle bar at the top + `overscroll-y-contain`; hide the "0 MMK" discount row when no discount.
7. **Search:** on mobile, move search into the module (full-width input under the strip); keep topbar search on desktop only.
8. **Card a11y:** add `role`, `tabIndex`, `aria-pressed`, and `onKeyDown` Enter/Space toggles for the remaining card layout.

---

## 4. Priority Order
1. **P0 — Category chips row** (kills the endless scroll)
2. **P0 — Topbar declutter** (search + "⋯" menu)
3. **P1 — Compact list rows on mobile**
4. **P1 — Strip control touch targets**
5. **P2 — Discount chips, sheet handle, search relocation, a11y**
