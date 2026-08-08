# Desktop → Mobile — Small-Detail UI/UX Analysis (Full App Sweep)

**Date:** 2026-08-06 · **Method:** line-by-line JSX audit of the desktop ERP, hunting desktop-first details that break or degrade on mobile (≤767px, with iPad 768–1024 notes). Line numbers verified via grep. No source files were edited.

**Surface covered:** 21 modules / ~25,700 lines of TSX — App shell & shared components + Intake, Create Ticket, Pipeline, Dashboard, POS, Inventory, Price Catalog (+2 price modals), CRM (+2 modals), Customer Portal, QA, Micro-soldering, Follow-Up, Suppliers, Devices, Finance, Settings.

**Detailed scope files (same folder as this doc):**
- `analysis/small-detail/scope-0-shell-common.md` — shell, topbar, drawer, dropdowns, modals, CSS system (15 findings)
- `analysis/small-detail/scope-A-intake-pipeline-dashboard.md` — Intake / Create Ticket / Pipeline / Dashboard (42 findings)
- `analysis/small-detail/scope-B-pos-inventory-prices.md` — POS / Inventory / Price Catalog / price modals (50 findings)
- `analysis/small-detail/scope-C-crm-qa-misc-settings.md` — CRM / Portal / QA / Micro / Follow-Up / Suppliers / Devices / Finance / Settings (44 findings)

**Total: 151 findings** — 3 P0 · 22 P1 · 126 P2/P3.

---

## Verdict

| Layer | Score | Notes |
|-------|-------|-------|
| App shell & design system | **8.5/10** | Excellent CSS seatbelts, safe-area handling, touch floor, filter drawer, portal patterns |
| Module-level detail | **6.5/10** | Inconsistent: some modules are mobile-first, others are pure desktop tables |
| **Overall mobile readiness** | **7.0/10** | Strong foundation; 3 core-flow P0s + systemic touch-size/table issues to fix |

The gap is not layout — it's **desktop-behavior leakage**: hover-only interactions, fixed-width tables with no card fallback, sub-40px targets, and z-index collisions inside sheets. Every fix below is small and surgical.

---

## P0 — Broken core flows on mobile (fix first)

> ✅ **All 3 fixed 2026-08-06** (commit `00d940e`, deployed to VPS; tsc + build + browser-verified at 390px & 1440px).

| # | Where | Problem | Fix |
|---|-------|---------|-----|
| P0-1 | Pipeline `StatusPipelineView.tsx:466/555/1193` | ~~"Show All / exception stages" controls are `hidden lg:grid` → `showAllStages` can never be enabled on a phone → **Cant Repair / Customer Not Repair columns never render on mobile**, while the scroll hint promises "Scroll for Cant Repair / Customer Not Repair" (dead affordance). Two workflow stages unreachable = data silently hidden.~~ **FIXED:** mobile `Show Exception Stages` chip (controls bar) + the misleading hint is now a one-tap Show All CTA with live counts; scroll hint only renders when the columns actually exist. | Mobile "Show All" toggle (chips row <lg), or auto-show exception columns when tickets exist there; make the hint track `showAllStages`. — done |
| P0-2 | Create Ticket `CreateTicketSoloPage.tsx:1269` | ~~Photo delete button is `opacity-0 group-hover:opacity-100` → **touch users can never delete an intake photo**; wrong photos become permanent ticket data.~~ **FIXED:** badge is `opacity-100` on touch, hover-only from `sm:` up; 40px target via CSS touch floor; helper text updated. | Always-visible delete badge on touch (`sm:opacity-0 sm:group-hover:opacity-100`) or an edit-photos mode. — done |
| P0-3 | CRM `CrmCustomerPortalModule.tsx:483` | ~~Mobile bottom sheet is `z-[60]` while every modal (Full History `z-50`, Invoice, Add Customer) is `z-50` → opening History/Invoice from inside the open sheet renders the modal **underneath the sheet**.~~ **FIXED:** Add/Edit Customer, Repair History Dossier & Printable Invoice raised to `z-[70]` (only `z-[60]` sheet in the app; no other conflicts found). | Raise modals to `z-[70]+` (or lower the sheet), or close the sheet before opening modals. Audit all `z-[60]` sheets app-wide. — done |

---

## P1 — Significant degradation (systemic themes)

### A. Touch targets below 40px — the #1 systemic issue (20+ instances)
Shared `Button` component is mobile-first (`h-11 lg:h-9`) — every violation is a hand-rolled `<button>`:
- **QA Pass/Fail/N/A** `py-1` ≈26px × 21 rows (`QualityAssuranceModule.tsx:424/433/442`) — highest-frequency tap in QA
- **Create Ticket diagnostic Pass/Fail/N/A** ≈26px × 63 buttons (`CreateTicketSoloPage.tsx:1183`)
- **Pipeline card actions** Detail/Log/Notify `py-1 text-[10px]` (`StatusPipelineView.tsx:724`); Checkout/After Diag `py-1.5` (L766/791)
- **Intake roster detail icons** `h-8 w-8` (`IntakeWorkOrderModule.tsx:529/607`)
- **CRM Full History** `px-2 py-0.5`, Edit/Delete `p-1` ≈20px (`CrmCustomerPortalModule.tsx:372/386/401`)
- **Follow-Up call button** `p-2` — the module's primary CTA is 32px (`CompletedDeviceFollowUpModule.tsx:549`)
- **POS remove-part** `h-6 w-6` = 24px (`PosInvoicingModule.tsx:660`); cash chips `py-1` (L1077)
- **Devices / Suppliers toggles** `h-7 w-7` (28px); Dashboard `p-1.5` icons, `h-8` View buttons
- **QuickCalc / Price modal** buttons `py-1.5`–`py-2`

**Standard fix:** `min-h-10` (40px) on mobile for all controls; `h-10 w-10 lg:h-8 lg:w-8` convention (Inventory L1531) as the house pattern; migrate remaining raw buttons to the `Button` component (P2 migration already tracked in `button.md`).

### B. Tables with no mobile fallback
- **Intake roster** — 9 fixed-width cols (~912px) still switchable on phones via segmented control (`IntakeWorkOrderModule.tsx:431-439`) → unreadable horizontal scroll with 9px fonts
- **Inventory Profit view** — the *only* inventory view without a card fallback; `whitespace-nowrap` MMK prices crush part names to ~70px (`InventoryManagementModule.tsx:1910`)
- **Devices** — 6-col table, no hidden cols, no card view (`DevicesManagementModule.tsx:404`) — Suppliers already solved this (forced cards <768)
- **POS line-items** — `overflow-hidden` container, **no horizontal scroll escape**; prices/remove button clipped ≤390px (`PosInvoicingModule.tsx:604`)
- **Finance** — every sub-view is a horizontal-scroll table; card/row-stack for revenue/expenses/AP (`ShopFinancePlModule.tsx` §8.3)
- **Price & Warranty editor** — 3× `w-1/3` cols inside `overflow-hidden`, `text-xs` inputs ≈60px wide (`PriceSettingsModal.tsx:688`) — the core daily pricing UI is the least usable on phones

**Standard fix:** card-stack <768px (pattern exists: SupplierRma/Inventory Stock), or `overflow-x-auto` + `min-w` so it scrolls instead of crushing, + `hidden lg:table-cell` column hiding (already used in Dashboard).

### C. Hover-only information (invisible on touch)
- **Inventory matrix cells** — cost/retail/share live only in `title=` tooltip; touch sees just "12" (`InventoryManagementModule.tsx:2026`)
- **HoverTooltip** also fires on `focusin` → tooltip flash over the button on Android taps (scope-0 S2)
- `title=` tooltips across Intake, Pipeline, Dashboard, cards (dates, full SN/IMEI, supplier names) — dead weight on touch; info should be visible text or aria-label

### D. Missing touch fallback for desktop-only interactions
- **Pipeline drag-and-drop** is the primary stage-move mechanism (`draggable`, `StatusPipelineView.tsx:641`) — HTML5 DnD doesn't fire on touch → mobile users must dig into the detail modal timeline. Add per-card "Move to ▾" or long-press pick-up.

### E. iOS auto-zoom (inputs <16px)
Pervasive `text-xs` (12px) / 14px editable inputs (POS qty, Inventory inline-edit L1736+, Price modal, CRM forms) → Safari zooms into the field on focus. **Fix:** `text-[16px]` on touch/coarse pointers for editable inputs (or `@media (pointer:coarse)` rule in index.css — one line, fixes everything).

### F. Layout overflows at 360px
- **Customer Portal sticky header** — brand + "Logged in: name (phone)" (no truncate) + ticket select + logout, no flex-wrap → overflows; the one screen real customers use (`CustomerFacingWebPortal.tsx:323-360`)
- **Finance Inventory Fund stats** — 3 mono MMK figures + dividers in unbreakable row (`ShopFinancePlModule.tsx:1165`)
- **POS payment tiles** `min-w-[150px]!` ×2 = overflow on 320px (`PosInvoicingModule.tsx:824`)
- **Quick Price Calculator** — live total (the whole point) stacks a full screen below services with no sticky summary (`QuickPriceCalculatorModal.tsx:389`)

### G. Other P1s
- **Stale one-shot view-mode checks** (`window.innerWidth` on mount, Intake L163 / Inventory L1486) → use `matchMedia` + change listener
- **Dropdown menus** (CustomDropdownMenu) are in-place absolute popovers, no portal → clip in overflow containers & can escape viewport edge on phones (scope-0 S1)
- **Topbar actions** row scrolls with hidden scrollbar → trailing controls silently cut off on phones (scope-0 S4)
- **Bulk inventory ops** (CSV export/reorder/delete) exist only in table view — phones are force-card, so bulk ops are unreachable (Inventory §I8)
- **QuickCalc currency** hardcoded `$`/en-US while app shows MMK — calculator totals are wrong-looking (QuickPriceCalculatorModal.tsx:294)

---

## Good patterns to replicate (the app already has a strong mobile toolkit)

1. **RightFilterDrawer** — portal + backdrop + swipe-to-close + focus return + safe-area footer
2. **POS on-screen numpad** (`md:hidden`, `h-11` keys, `inputMode="numeric"`, ⌫)
3. **POS / Settings / Price Catalog sticky bottom bars** — `z-40`, `env(safe-area-inset-bottom)`, label swap, `pb-16` parent compensation
4. **Price Catalog floating cart bar + bottom sheet** (drag handle, `max-h-[88vh] rounded-t-3xl`, `z-[70]` portal popups)
5. **CRM master-detail bottom sheet** (`md:static` reflow — just fix z-index, P0-3)
6. **Forced card-view fallbacks** (Suppliers, Inventory Stock) via resize/matchMedia
7. **Kanban mobile scroll** — `snap-x` + `touch-pan-x` + `100dvh` + `min-w-[260px]` columns + thin scrollbar cue
8. **Width-capped modals** (`max-w-* w-full` + internal `overflow-y-auto`) instead of fixed widths
9. **Touch-size convention** `h-10 w-10 lg:h-8 lg:w-8`; shared `Button` `h-11 lg:h-9`
10. **CSS seatbelts** — `overflow-x: clip`, `scrollbar-gutter: stable`, print resets, landscape-phone rule, readability floor (7–11px → 11–12px)
11. **Settings launcher→drill-in tabs** with sticky mobile save bar + dirty dot (fix badge overlap P3)
12. **Scrollable pill/tab strips** (`overflow-x-auto no-scrollbar`) everywhere
13. **Responsive column hiding** (`hidden lg:table-cell`) + `overflow-x-auto` wrappers
14. **Label swapping** (`hidden sm:inline`) and `grid-cols-1 sm:2 lg:4` collapse cadence everywhere
15. **`inputMode="numeric"` + live counter** on IMEI; `capture="environment"` camera intake

---

## Suggested fix order

**Round 1 (P0s, ~half a day):** pipeline mobile Show-All toggle → photo delete touch badge → CRM sheet z-index. All three are <20-line changes.

**Round 2 (high-leverage P1s):** ✅ **done 2026-08-06** (commit `c81f893`, deployed): 16px input zoom rule (`@media (pointer: coarse)`) · mobile card fallback for Profit view + hidden cols for Devices + POS line-items scroll · matrix cell touch fallback line · QA/CreateTicket segmented `min-h-10` · dropdown menu portaled (viewport-aware, backdrop, auto-flip) · HoverTooltip gated to fine pointers.

**Round 3 (P1 layout):** customer portal header wrap, finance stat grid, POS tiles grid, QuickCalc sticky total, topbar overflow menu.

**Round 4 (P2 backlog):** the remaining ~126 items in the scope files — bulk ops in card view, camera barcode scan, dead-modal cleanup (Intake L624, Pipeline L810), iPad scroll-shadow for wide tables, 3xl/4xl density check, QuickCalc MMK currency.
