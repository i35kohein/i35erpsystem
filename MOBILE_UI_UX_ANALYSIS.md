# Kimi ERP — Mobile UI/UX Analysis (Live Browser Audit)
**Date:** 2026-08-03 22:30 · **Method:** Live walkthrough of all 11 modules at 390×844 (iPhone 14) + 844×390 landscape · **Viewport:** `width=device-width, initial-scale=1, viewport-fit=cover`

> Companion to `RESPONSIVE_UI_UX_ANALYSIS.md` (code-level, all breakpoints). This report is **mobile-only**, measured in the running app after the P0+P1 responsive fixes.

---

## Executive Summary

**Mobile score: 8.5/10** — up from 7.5/10 before the responsive fixes. The app is now genuinely usable on phones: zero document-level horizontal overflow anywhere, POS checkout bar clears the bottom nav, AI FAB doesn't collide, Intake defaults to cards, and the touch-floor CSS brought most controls to 40px.

What remains is **density polish**, not breakage: one module (Inventory) still has small filter/tab controls, a few tables need scroll-shadow affordances, and landscape mode loses 13% of height to the bottom nav.

### Measured results per module (390×844)

| Module | Doc overflow | H-scroll containers | Tiny targets (<40px) | Verdict |
|---|---|---|---|---|
| Dashboard | ✅ none | 0 | 3/58 (36×40 icons) | ✅ Good |
| Work Intake | ✅ none | 0 | 12/44 (36×40 status icons) | ✅ Good |
| Pipeline | ✅ none | 1 (Kanban 1892px — **intended**) | 2/84 | ✅ Good |
| POS | ✅ none | 0 | 2/39 | ✅ Good |
| CRM | ✅ none | 1 (tab strip 384px — fine) | 14/72 | ⚠️ View tabs 34px |
| Inventory (Stock) | ✅ none | 1 (table 507px — needed) | **486/509** | ❌ Dense controls |
| Inventory (Matrix) | ✅ none | 1 (table 1207px — needed) | — | ⚠️ No scroll hint |
| QA & Warranty | ✅ none | 0 | 2/111 | ✅ Good |
| Shop Finance | ✅ none | 1 | 4/31 | ✅ Good |
| Follow-Ups | ✅ none | 1 | 2/33 | ✅ Good |
| Price List | ✅ none | 0 | 2/26 | ✅ Good |
| Suppliers | ✅ none | 1 | 2/28 | ✅ Good |
| Settings | ✅ none | 0 | 6/42 | ✅ Good |
| Create Ticket form | ✅ none | 0 | 3/121 (28 inputs, **all ≥40px**) | ✅ Good |
| POS checkout | ✅ none | 0 | 2/39 | ✅ Good |

---

## Fixed elements — collision check (390×844)

| Element | Position | Clearance | Status |
|---|---|---|---|
| POS checkout bar | bottom edge 780px | 11px above bottom nav (top 791px) | ✅ No collision |
| Bottom nav | 52px tall, top at 791px | — | ✅ |
| AI FAB | bottom edge 756px | 35px above bottom nav | ✅ No collision |
| Ticket detail modal | full-screen 390×844 | no internal h-scroll | ✅ |

---

## Findings (prioritized)

### P1 — Inventory module density (the one weak spot)

**F1. Inventory filter/tab controls are 32px tall** — below the 40px mobile floor.
- View tabs "Stock" (77×32), "Profit" (74×32), "Matrix" (40×32 — icon-only at this width)
- Filter dropdowns "All Models" (111×32), "All Categories" (133×32), "All Tiers" (97×32)
- "Print Tags"/"Edit" icon buttons 36×32
- Row "View" buttons 36×36
- **Impact:** 486 of 509 interactive elements on this screen are below 40px — by far the worst module. Tapping the right filter requires precision.
- **Fix:** extend the `@media <768px` touch-floor CSS to include `.workspace-panel` selects + segmented tabs + Inventory row actions (or add `min-h-[40px]` to those components' mobile classes).

**F2. Inventory Matrix table (1207px) has no scroll-shadow affordance.**
- Users can't tell the table scrolls horizontally. Same for the Stock table (507px, less severe).
- **Fix:** add a CSS scroll-shadow (right-edge gradient when scrolled) or a "⟵ scroll ⟶" hint on first view.

### P2 — Polish

**F3. Segmented view tabs in CRM are 34px tall** ("Customer Database" / "Customer Portal View Simula…").
- Second tab label is truncated ("Simula…"). Consider stacking to full-width tabs on <400px or shortening labels ("Portal View").

**F4. Header search placeholder truncated** on all modules ("Search Tic…", "Search Mo…", "Search Par…").
- The search box shrinks to fit the title. On 390px the placeholder gives almost no hint. Consider a search-icon-only button that expands a full-width search bar, or shorten placeholders ("Search…").

**F5. Module titles truncated in header** ("Parts Inventory & Stock Mat…").
- Cosmetic. Could shorten to "Inventory" on mobile via a `max-width` + `text-overflow` media rule, or use a shorter mobile title.

**F6. Landscape mode (844×390): bottom nav takes 13% of height.**
- 52px of 390px is significant. Consider hiding the bottom nav in landscape phones (`@media (max-height: 500px) and (orientation: landscape) { .bottom-nav { display: none } }`) — users can use the hamburger drawer instead.

**F7. 36×40 icon buttons** (hamburger, card status icons) — height meets the floor but width is 36px.
- Minor. Widening to 40×40 is a one-class change (`w-9` → `w-10` on those buttons) but not urgent since 36×40 passes most guidelines.

---

## What's working well (keep)

- **Zero document horizontal overflow on every module** — the `min-w-max`/`min-w-[1120px]` removals + `overflow-x-auto` containment are working.
- **Intake auto-defaults to Grid Cards on phones** — no more 1120px table on 390px screens.
- **POS checkout bar raised above bottom nav** — verified 11px clearance.
- **AI FAB raised + hidden when POS bar visible** — verified 35px clearance.
- **Pipeline Kanban snap-scrolls horizontally** — correct mobile pattern.
- **Ticket detail modal goes full-screen on mobile** — correct.
- **Create-ticket form inputs all ≥40px** — the touch-floor CSS is effective.
- **Safe-area insets** on topbar/sidebar/bottom nav (`env()`) — no-op in browser tabs, active in standalone PWA.

---

## Screenshots

| # | Screen | File |
|---|---|---|
| 1 | Dashboard | `outputs/mobile-ux/01-dashboard.png` |
| 2 | Work Intake (cards) | `outputs/mobile-ux/02-intake.png` |
| 3 | Pipeline (Kanban) | `outputs/mobile-ux/03-pipeline.png` |
| 4 | POS (device list) | `outputs/mobile-ux/04-pos.png` |
| 5 | CRM (roster) | `outputs/mobile-ux/05-crm.png` |
| 6 | Inventory (Stock) | `outputs/mobile-ux/06-inventory.png` |
| 7 | Inventory (Matrix) | `outputs/mobile-ux/07-inventory-matrix.png` |
| 8 | Ticket detail modal | `outputs/mobile-ux/08-ticket-modal.png` |
| 9 | Create ticket form | `outputs/mobile-ux/09-create-ticket.png` |
| 10 | POS checkout | `outputs/mobile-ux/10-pos-checkout.png` |

---

## Fix Status (implemented 2026-08-03 22:45, verified in browser at 390×844 & 1440×900)

| Finding | Fix | Verified |
|---|---|---|
| **F1** Inventory toolbar/tab/filter controls 32px | Added higher-specificity override in the mobile touch-floor block (`.basic-ui .module-toolbar button, .app-control, [role=tab]` → `min-height: 40px`) | Stock/Profit/Matrix tabs + All Models/Categories/Tiers filters + Print Tags/Edit = **40px** ✓ |
| **F1b** Table-row icon buttons 36×36 | Intentional design floor for dense grids (`.basic-ui table button` 36px) — kept | No change |
| **F2** Matrix/Stock tables no scroll hint | `.workspace-panel__scroll.scroll-shadow-right` mask (right-edge fade, mobile-only) + effect in `InventoryManagementModule` (scroll/resize listener, keyed on `viewMode`) | Shadow on at scroll-left, **off at end** ✓ (Stock 507px, Matrix 1207px in 364px view) |
| **F3** CRM view tabs 34px + truncated label | Floor override raised height; label shortened to "Portal Simulator" | 40px, no truncation ✓ |
| **F4** Header search placeholder truncated | Search input `w-28` → `w-32` on phones | "Search Ticket…" now visible ✓ |
| **F5** Module titles truncated | Accepted — cosmetic, unchanged | — |
| **F6** Bottom nav eats 13% of landscape height | `@media (orientation: landscape) and (max-height: 500px) and (max-width: 1023px)`: nav hidden, `<main>` padding → 1.25rem | Nav `display:none`, main pb 20px at 844×390 ✓ |
| **F7** 36×40 icon buttons | svg-only buttons → `min-width/min-height: 40px` (table rows stay 36px) | Intake card icons now 40px ✓ |

**Regression check (1440×900):** bottom nav hidden as designed, controls compact 32px, scroll-shadow off, no doc overflow — desktop unaffected. `tsc --noEmit` clean for changed files; `npm run build` ✓.

---

## Recommended next actions

1. **F1** (Inventory touch targets) — the only real usability gap left. ~30 min.
2. **F2** (scroll-shadow on wide tables) — small CSS addition. ~15 min.
3. **F3–F6** — polish batch if desired.

Everything else on mobile is in good shape.
