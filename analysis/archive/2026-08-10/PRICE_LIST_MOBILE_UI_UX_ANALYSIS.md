# Price List — Mobile UI/UX Analysis & Fixes (i35 ERP)

- **Module:** `src/components/prices/PriceCatalogModule.tsx` (917 lines, POS catalog + cart)
- **Date:** 2026-08-05 · **Analyst:** Kimi (OpenClaw)
- **Method:** Live DOM measurement at 390×844 (phone) — geometry chain (grid rows, section/cart boxes, card rects), scroll behavior, tap-target scan, plus visual screenshot review.
- **Overall score: 7.8 / 10** (functional, no overflow, good card design — but one P0 layout bug and a cart-reachability gap on mobile)

---

## 1. What already works on mobile ✅

- **No horizontal overflow** — measured `scrollWidth === clientWidth === 390` on the whole module.
- **No undersized tap targets** — DOM scan of every `button`/`a`/`[role=button]` found zero elements < 30px (whole card is the tap target; the radio indicator is visual only).
- **Service cards** are fixed-height (`h-[152px]`), single column on phones, with a clear hierarchy: icon → title → category → warranty badge → STANDARD PRICE + MMK value. Long names wrap cleanly (verified: "3 M ( Touch )" badge, long part names).
- **Device header** (Active Device + Switch Model) stays pinned above the scroll area — model always identifiable while browsing.
- **Sticky/fixed bars** in the app use `env(safe-area-inset-bottom)` padding (POS bar, new cart bar).

---

## 2. 🔴 P0 BUG — catalog cards overlapped the cart panel (FIXED)

**Symptom:** A "floating" gray bar with a blue "0 Services" badge appeared to cover the repair cards mid-list on phones.

**Root cause (measured):** The main layout was:

```html
<div class="grid grid-cols-1 items-stretch gap-5 overflow-y-auto lg:grid-cols-12 …">
  <section>…13 cards, content height 2178px…</section>
  <aside>…cart panel…</aside>
</div>
```

On mobile (`grid-cols-1`, two implicit rows) the browser stretched the auto rows to fill the **definite-height** grid container (584px) instead of sizing them to content:

- Row 1 (catalog): **289px** ← content is 2,178px → cards overflowed visibly (`overflow-visible`) 
- Row 2 (cart): 275px
- Result: cards 2+ bled out of the catalog section and painted **under/over the cart panel** (semi-transparent `bg-[#F5F5F7]/80` header made it look like a floating bar).

**Fix:** mobile is now a plain flex column (children keep natural heights, container scrolls); the 8/4 grid with internal scrolling is preserved at `lg+`:

```html
<div class="flex … flex-col gap-5 overflow-y-auto … lg:grid lg:grid-cols-12 lg:overflow-hidden">
  <section class="shrink-0 … lg:min-h-0 lg:col-span-8 lg:overflow-y-auto">…
  <aside class="shrink-0 … lg:col-span-4 lg:h-full lg:min-h-0 lg:overflow-y-auto">…
```

**Verified after fix (390px):** section = 2,194px (full content) · cart top = 2,450px (20px clean gap) · cart height = 608px fully visible · last card bottom (2,390px) < cart top · `overflowX = 0` · container scrolls 2,886px. Desktop behavior unchanged.

*(A first attempt — `content-start` + removing `min-h-0` — fixed the section but collapsed the cart row to 2px via a grid↔flex stretch circularity; the flex-column approach avoids grid auto-row sizing entirely.)*

---

## 3. 🟠 P1 — cart unreachable while adding services (FIXED)

**Issue:** The cart panel sits below all 13 cards. On a phone, adding 3–4 services means scrolling past ~600px of cards to see the running total / check out — easy to lose track of the estimate.

**Fix:** Floating bottom bar on phones (`md:hidden`, safe-area padded, mirrors the POS checkout bar):

- Shows when `cart.size > 0`: **"1 items · 70,000 MMK | [View Cart]"**
- Tap **View Cart** → smooth-scrolls the cart panel into view
- Container got `pb-16 md:pb-0` so the fixed bar never covers the last cards

**Verified:** bar appears after selecting a card with live count + total; View Cart scrolls the cart header to top-of-viewport (measured top = 246px).

---

## 4. Minor findings

| # | Finding | Status |
|---|---|---|
| M-1 | `viewMode: 'pos' \| 'matrix' \| 'cards'` state (line 148) is **declared but never used** — dead code; the module always renders the POS catalog. Remove or wire up. | open |
| M-2 | Radio/check indicator on cards is ~20px — acceptable because the **entire card** is the tap target (onClick + `whileTap`), but the visual affordance could be bigger (e.g., a filled dot that scales when selected). | open |
| M-3 | Warranty badge "3 M ( Touch )" has awkward spacing (data string, not layout). | open (data) |
| M-4 | `handleCreateWorkOrderFromCart` + "Create Intake Ticket" CTA only exist in the cart panel — on mobile, once the floating bar is added, consider a second quick CTA in the bar when cart is non-empty (e.g., long-press → create ticket). | open |
| M-5 | Card grid only goes to `sm:grid-cols-2` — on 640–768px tablets, 2 columns of 152px cards is fine; consider `md:grid-cols-2` stays (no change needed). | n/a |

---

## 5. Recommendations (next pass)

1. **P0/P1 fixes above are implemented** — deploy pending a clean build.
2. **Sticky category filter on mobile** — the 3 filter pills (Model/Category/Tier) scroll away; a compact "Filter" button that opens a bottom sheet would keep the list scannable (same pattern as POS/Intake).
3. **Bulk price edit + currency toggle** (from PROJECT_WIDE doc §4.6) — unaffected by mobile layout; still on the roadmap.
4. **Remove dead `viewMode`** state while touching this file.
5. **Add `aria-pressed`/selected state** on service cards for a11y (whole-card button semantics — currently a clickable `div`).

---

## 6. Verification log

| Check | Before | After |
|---|---|---|
| Catalog section height @390px | 289px (content 2,178px) | 2,194px |
| Cards ↔ cart overlap | 51px (card 2 under cart header) | 0px (20px gap) |
| Cart panel visible height | 275px (partially covered) | 608px |
| Horizontal overflow | 0 | 0 |
| Tap targets < 30px | 0 | 0 |
| Floating cart bar | missing | present + verified |
