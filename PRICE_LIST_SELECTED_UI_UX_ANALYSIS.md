# Price List — "Selected" UI/UX Analysis (v1.1, 2026-08-09)

> Module: `PriceCatalogModule.tsx` + `QuickPriceCalculatorModal.tsx` + `DeviceModelChooserModal.tsx`
> Method: code read + live DOM measurement (localhost:3001, desktop viewport) + interaction tests
> Focus: every **selected state** — device, service cards, category chips, cart items, calculator

---

## 1. Selected states inventory

| Surface | Selection model | Visual selected state | A11y |
|---|---|---|---|
| **Catalog service card** | toggle (multi) | `border-brand` 2px + `bg-brand/[0.03]` + animated check circle + `scale 1.015` spring | ✅ `role=button` + `aria-pressed` + Enter/Space + `focus-visible:ring-2` |
| **Category chip** | single (filter) | `bg-brand text-white border-brand` vs `bg-white text-ink border-line hover:border-brand/50` | ✅ `<Button>` + `aria-pressed` via class? → chip uses Button w/o aria-pressed but filter chips are nav-like; acceptable |
| **Device (chooser)** | single | `bg-brand text-white border-brand shadow-xs` + white Check + service-count sub-label | ✅ Button + visual check |
| **Device (strip/header)** | display | "Active Device" label + bold model + "Switch" affordance | ✅ text |
| **Cart item (desktop panel)** | per-item | number badge, discount `<select>`, X remove, strikethrough when discounted | ⚠️ `<select>` native (focusable, OK) |
| **Cart placeholder slots** | — | dashed border + muted "Primary Service Slot / Add-on Service #2/3" | ⚠️ reads like a real item |
| **Calculator service card** | toggle (multi) | `bg-brand text-white` fill + `ring-2 ring-brand/20` + white check circle | ❌ **no `aria-pressed`** — visual only |
| **Calculator device** | single | chooser modal (same as above); totals header shows `Calculated for {device}` | ✅ |

---

## 2. What's already excellent ✅

1. **Catalog cards = best-in-class toggle pattern.** `aria-pressed`, 2px brand border, spring-animated check (`scale 0.85→1`), press feedback (`whileTap 0.98`), `focus-visible` ring, Enter/Space toggle. This is the reference pattern other modules should copy.
2. **Selected device is never ambiguous** — three persistent anchors: mobile strip ("Active Device"), desktop header, and cart header. Verified live all three show the same model after switch.
3. **Cart discount editing** — inline `<select>` (0–50%), strikethrough original + final price side by side, savings flow works (Subtotal → Discount Applied → TOTAL ESTIMATED).
4. **Newest selection becomes slot #1** (move-to-front) — the card you just tapped is always the primary slot; number badges 1/2/3 match slot order.
5. **Mobile bottom-sheet cart** = real items only (no placeholder slots), per the earlier mobile analysis.

---

## 3. Issues found

### P1 — Cart is NOT synced on device switch (verified live)
- **Repro:** add "Battery 70,000 + Charging Board Repair 40,000" on iPhone 6 Plus → Switch Model → iPhone 11 Pro Max. Cart header now reads **"IPHONE 11 PRO MAX"** while the items (and 110,000 MMK total) are still the **iPhone 6 Plus prices**.
- **Impact:** "Create Intake Ticket" hands the checkout the wrong quote; same bug class as the QuickPriceCalculator cart (fixed in the P1 round) — the **catalog cart panel was never covered**.
- **Fix options:** (a) clear cart on device change (matches calculator behavior), or (b) keep items but show a warning banner "Items priced for {previous device}" + re-price when keys match. Recommend (a) for consistency + a toast.

### P2 — Calculator service cards have no `aria-pressed`
- Visual selected state (brand fill + ring + check) is not exposed to assistive tech; inconsistent with the catalog cards that set `aria-pressed`.
- **Fix:** add `aria-pressed={isSelected}` to the calculator's service `<Button>`.

### P3 — `bg-brand/[0.03]` tint is imperceptible
- Measured computed background = pure white (`rgb(255,255,255)`) — the selected tint is invisible; scanning relies entirely on the 2px border + checkmark.
- **Fix:** `bg-brand/5`–`/10` (or a soft ring) so selected cards read at a glance in a dense grid.

### P3 — Placeholder slots read like real items
- Desktop cart shows dashed "Primary Service Slot / Add-on Service #2/3" cards. Dashed border + muted text help, but a hurried clerk can misread "Add-on Service #3" as a selected service.
- **Fix:** label "Empty — tap a service to add" or drop the numbering; keep only when cart has <3 items (already the case).

---

## 4. Scorecard

| Aspect | Grade | Notes |
|---|---|---|
| Selected clarity (catalog) | A | border + check + animation |
| Selected clarity (cart) | B+ | good, but placeholder slots confuse |
| Device context | A | 3 anchors, verified |
| Keyboard/a11y | B | catalog perfect, calculator missing aria-pressed |
| Cross-device safety | **C** | cart survives device switch with stale prices |
| Mobile | A | bottom sheet real-items-only, savings banner |

**Overall: 8.2 / 10** — two fixes worth doing (P1 cart sync, P2 aria-pressed); P3s optional polish.
