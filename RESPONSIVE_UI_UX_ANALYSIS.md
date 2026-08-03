# Kimi ERP — Responsive UI/UX Analysis (Mobile · iPad · Desktop)
**Date:** 2026-08-03 · **Scope:** Responsive behavior across breakpoints · **Method:** Code-level audit of all 11 modules + layout shell (App.tsx, Navigation.tsx, index.css)

> Prior audits (`UI_UX_AUDIT.md`, `POS_UI_UX_AUDIT.md`) covered general UX. This report is focused **only on responsiveness**: how the app adapts from 390px phones → 768–1100px tablets → 1440px+ desktops.

---

## Executive Summary

The app has a **solid responsive foundation**: a real mobile drawer + bottom tab bar, a collapsing desktop sidebar, snap-scrolling Kanban, stacking grids, and a dedicated iPad topbar media query. It is genuinely usable on all three form factors — this is far ahead of most internal ERP tools.

The main risks: **several fixed-bottom elements collide on mobile** (POS checkout bar vs bottom nav), **wide tables on phones** (Intake 1120px, Inventory `min-w-max`), **touch targets below 44px in dense toolbars**, **iPad portrait (768–1023px) wastes space** on some split views, and **no safe-area-inset handling** for notched iPhones/iPads.

Responsive score: **7.5/10** — functional everywhere, but mobile needs collision fixes and iPad needs density tuning.

---

## 1. Breakpoint System

Tailwind defaults in use: `sm` 640 / `md` 768 / `lg` 1024 / `xl` 1280.

| Zone | Width | Current behavior |
|---|---|---|
| **Phone** | <640px | Sidebar → drawer + backdrop; bottom tab bar (44px targets ✓); hamburger in header; header actions collapsed (`.basic-ui` hides all but first action <640px); grids stack to 1 col |
| **iPad portrait** | 768–1023px | Sidebar hidden (drawer via hamburger), **but no bottom nav** (`lg:hidden` keeps it until 1024 — actually bottom nav *does* show here ✓); custom topbar compression (640–1100px media query) |
| **iPad landscape / small laptop** | 1024–1280px | Sidebar appears (56px collapsed or 224px expanded); `lg:pl-14` content offset; most `md:grid-cols-12` splits active |
| **Desktop** | ≥1280px | Full layout; `xl:` grids (dashboard 8-col KPI strip) |

**Assessment:** Breakpoint logic is coherent. The `lg` (1024) choice for the sidebar is correct for iPad landscape. One gap: **no `md`-only refinements** — most modules jump from phone-stacked (1 col) straight to `md:grid-cols-12` desktop splits at 768px, skipping a comfortable tablet-portrait density.

---

## 2. Layout Shell (App.tsx + Navigation.tsx)

### ✅ What's working well

- **Mobile drawer**: `translate-x` slide + backdrop blur, `lg:hidden`, closes on selection. Correct pattern.
- **Bottom tab bar**: role-aware (Technician gets My Jobs / QA / CRM / More; others get Intake / Pipeline / POS / CRM / Menu), `min-h-[44px]` targets, active-state tint. This is the right 4+1 model.
- **Desktop sidebar**: collapsible 224px ↔ 56px, persisted, `lg:pl-14` main offset matches collapsed width.
- **Header**: fixed 52px, `contain: layout style` prevents CLS; hamburger visible only `<lg`; search field scales `w-28 sm:w-36 md:w-44 lg:w-52` — nice touch.
- **iPad topbar media query (640–1100px)**: icon-only 34px buttons, hidden labels — deliberate tablet compression. Good thinking.
- **Content panels**: `.workspace-panel--*` clamps use `100dvh` (correct for mobile Safari URL bar) with phone-specific reductions at `<767px`.

### ⚠️ Issues

| # | Severity | Issue |
|---|---|---|
| 2.1 | 🔴 High | **AI Assistant FAB overlaps bottom nav zone**: `fixed bottom-20 right-4 lg:hidden`. On phones it floats above content that scrolls under the bottom nav; combined with POS's fixed checkout bar (`fixed bottom-0 md:hidden`), the screen can have **three stacked fixed layers** (POS bar / FAB / bottom nav). The FAB's `bottom-20` (80px) only clears the ~64px tab bar — on POS the checkout bar sits *behind* the tab bar (see 3.2). |
| 2.2 | 🟡 Med | **No `padding-bottom` on `<main>` for the bottom nav.** `<main>` uses `pb-5` only. Content at the bottom of scroll can hide under the 64px fixed tab bar. POS works around it with its own `pb-16 md:pb-0`, but **every other module relies on luck**. Fix once in App.tsx: `pb-20 lg:pb-5` on `<main>` (or `pb-[calc(4rem+env(safe-area-inset-bottom))]`). |
| 2.3 | 🟡 Med | **No safe-area-inset handling anywhere** (`env(safe-area-inset-*)` = 0 matches). On notched iPhones in portrait the bottom tab bar touches the home indicator; on iPad landscape the drawer header can sit under the Dynamic Island when PWA-installed. Add `pb-[env(safe-area-inset-bottom)]` to the bottom nav and `pt-[env(safe-area-inset-top)]` to header/drawer. Viewport also lacks `viewport-fit=cover` — required for env() to work in standalone PWA mode. |
| 2.4 | 🟢 Low | **Sidebar collapsed state is desktop-only** (`lg:w-14`). iPad landscape (1024–1280) could benefit from an auto-collapse default — 224px sidebar + 52px header leaves only ~700px content width on a 1024px screen. Consider `isCollapsed` default `true` when `1024 ≤ width < 1280`. |
| 2.5 | 🟢 Low | `h-full h-dvh` duplicated classes on `<aside>` and `#main-content-scroll` — harmless but sloppy; `h-dvh` wins. |

---

## 3. Module-by-Module Responsive Findings

### 3.1 Dashboard (`DashboardOverview.tsx`) — ✅ Good
- KPI strip: `grid-cols-2 sm:grid-cols-4 xl:grid-cols-8` — perfect progression (2 tiles/row on phone).
- Main panels: `grid-cols-1 md:grid-cols-3`, tables wrapped in `overflow-x-auto`.
- Filter pill bars use `overflow-x-auto no-scrollbar` — swipeable on touch. Good.
- ⚠️ `min-w-[200px]` search inputs inside cards can force card overflow on very narrow screens (<360px); minor.

### 3.2 POS (`PosInvoicingModule.tsx`) — ⚠️ Needs mobile fixes
- ✅ Right call: `grid-cols-1 md:grid-cols-12` (selector 5 / invoice 7) and a **mobile-only fixed checkout summary bar** (`fixed bottom-0 md:hidden`) so the pay button is always reachable.
- 🔴 **The fixed checkout bar (`bottom-0`) collides with the global bottom nav (also `bottom-0`, both ~60-64px tall).** The module adds `pb-16 md:pb-0` to clear its own bar, but the global tab bar renders *on top* (both z-40; nav comes later in DOM order) — the checkout bar's total/pay button can be partially covered on phones. **This is the single most important responsive bug.** Fix: raise POS bar to `bottom-16` (above tab bar) on `<md`, or hide global bottom nav on POS tab and let the module own the bottom zone.
- Payment method grid `grid-cols-2 sm:grid-cols-3 md:grid-cols-4` — 2×5 on phone is fine for 10 methods.

### 3.3 Pipeline (`StatusPipelineView.tsx`) — ✅ Good (mobile), ⚠️ (tablet)
- ✅ Kanban: `overflow-x-auto snap-x touch-pan-x` + `min-w-[260px]` columns — on phone, columns become swipeable full-width cards. Exactly right.
- ✅ Drag-and-drop has touch-unfriendly HTML5 DnD, but status can still be changed via card actions — acceptable fallback.
- ⚠️ iPad portrait (768px): ~3 columns of 260px visible with dead space; `flex-1` stretches them awkwardly when only 1–2 stages are filtered. Consider `md:grid md:grid-cols-3` for 640–1280 instead of flex-scroll.

### 3.4 Work Intake list (`IntakeWorkOrderModule.tsx`) — 🔴 Worst mobile offender
- 🔴 **Table is `min-w-[1120px]`** inside (presumably) an overflow container — on a 390px phone that's ~3× horizontal scroll to reach row actions. Tables with 8+ columns need a **card/list alternative** below `md`, or a prioritized subset (Ticket, Customer, Status, Total → tap row for detail). The `TicketDetailInspectorModal` already exists — link rows to it on mobile.
- Create form (`CreateTicketSoloPage`) is fine: `grid-cols-1 sm:grid-cols-2`, full-width buttons `w-full sm:w-auto`, `py-3` (48px) submit targets. ✓

### 3.5 Inventory (`InventoryManagementModule.tsx`) — 🔴 Wide tables
- 🔴 Main parts table: `min-w-max` + cells like `min-w-[176px]` price columns — massive horizontal scroll on phones and even iPad portrait. Same recommendation: card layout `<md`, or column priority hiding (`hidden md:table-cell` for Cost/Profit/Supplier).
- ✅ Inline-edit + review-confirm flow is excellent on desktop; on mobile, tapping tiny inline inputs in a scrolled table is error-prone — inline edit should probably be desktop-only (`hidden md:`) with the edit modal as the mobile path.
- Toolbar dropdowns `min-w-[120–130px]` × several → the module-toolbar scrolls horizontally, which is acceptable (`.module-toolbar` handles it).

### 3.6 CRM (`CrmCustomerPortalModule.tsx`) — ⚠️ iPad portrait gap
- `grid-cols-1 md:grid-cols-12` (roster 5 / detail 7): on phone it stacks (roster list, then detail below) ✓; on desktop split view ✓.
- 🟡 **iPad portrait (768px)**: split 5/7 activates at `md` — the roster column is only ~300px while names + type badges + phone numbers compete; and both panes use `h-full` inside `.workspace-grid` clamp — fine — but the roster cards (`p-3` + badges) feel cramped. Consider `md:grid-cols-2` (6/6) for 768–1024 and 5/7 only at `lg+`.
- Roster cards have generous `p-3` touch targets ✓.

### 3.7 QA (`QualityAssuranceModule.tsx`) — ✅ Good
- `md:grid-cols-12` (device list 3 / checklist 9), checklist items `sm:grid-cols-2 lg:grid-cols-3`, device list scroll region `max-h-[calc(100dvh-260px)]`.
- On phone: stacks device picker above checklist — workable. Pass/fail buttons should verify 44px height (prior audit flagged density).

### 3.8 Follow-Up (`CompletedDeviceFollowUpModule.tsx`) — ✅ Good
- Stat cards `grid-cols-2 md:grid-cols-6`, list rows `flex-col md:flex-row` with action buttons wrapping (`flex-wrap gap-1`) — rows become vertical cards on phone with full-width actions. One of the best mobile adaptations in the app. ✓

### 3.9 Finance (`ShopFinancePlModule.tsx`) — ✅ Good
- `sm:grid-cols-2 lg:grid-cols-4` summaries, `lg:grid-cols-2` sections. Text-heavy but reflows cleanly. No fixed-width tables found.

### 3.10 Suppliers/RMA (`SupplierRmaModule.tsx`) — ✅ Mostly good
- `grid-cols-1 md:grid-cols-2` forms, `sm:grid-cols-3` stats. Table at line 241 is `w-full` without min-width — reflows, though cells may wrap hard; acceptable given low column count.

### 3.11 Settings (`SystemManagementSettingsModule.tsx`) — ✅ Good
- Nav grid `grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6`, forms `md:grid-cols-2/3`. Dense but stacks fine. 3,728 lines — verify each sub-tab, but sampled sections all use responsive grids.

### 3.12 Modals (shared) — ✅ Good
- `TicketDetailInspectorModal`: `p-3 sm:p-5`, `h-[92vh] max-h-[760px]`, `max-w-5xl` — good phone behavior (near-fullscreen).
- `PrintableInvoiceModal`: `p-3 sm:p-6` + overflow-y-auto ✓.
- Internal `sm:p-5` padding scaling is consistent. ✓

---

## 4. Touch Targets & Mobile Ergonomics

| Area | Status |
|---|---|
| Bottom nav buttons | ✅ `min-h-[44px]` (HIG compliant) |
| Sidebar drawer items | ✅ `py-2.5` + text-xs ≈ 40px — close enough, full-width |
| Create-ticket submit buttons | ✅ `py-3` = 48px |
| Header icon buttons | ⚠️ ~32–34px (`basic-ui` floor 32px) — acceptable for desktop-dense header, but the **hamburger** on mobile should be 44px |
| Table row action icon buttons | 🔴 ~28–32px in Intake/Inventory tables — below HIG 44px; combined with horizontal scroll, mis-taps are likely |
| `.basic-ui` global floor | ⚠️ `min-height: 32px` on buttons/inputs — fine for desktop, but **mobile should floor at 40–44px**. Add `@media (max-width: 768px) { .basic-ui button { min-height: 40px } }` |

**Font readability on mobile:** the readability floor added in `index.css` (9–11px → 11–12px) applies at all breakpoints — good — but 12px labels in dense tables on a 390px screen are still small. Consider a phone-specific bump of table body text to 13px.

---

## 5. PWA / Viewport

- ✅ `manifest.json` exists with `display: standalone`, service worker pre-caches shell, `100dvh` used throughout (mobile Safari correct).
- 🔴 Viewport meta missing `viewport-fit=cover` → safe-area env() vars won't apply in standalone mode; content can collide with notch/home indicator once installed.
- ⚠️ `theme_color: #7360F2` in manifest doesn't match current primary (`#0071E3`) — cosmetic, shows in Android task switcher.
- ⚠️ Only favicon.ico icons — no 192/512 PNG icons → "Add to Home Screen" will look broken on Android/iOS.

---

## 6. Priority Fix List (Responsive Only)

**P0 — mobile-breaking:**
1. **POS fixed checkout bar vs bottom nav collision** → move POS bar to `bottom-16` on `<md` (or suppress global nav on POS). *(PosInvoicingModule.tsx:1199)*
2. **Global bottom-nav clearance** → `<main>` gets `pb-20 lg:pb-5`; remove per-module `pb-16` workarounds. *(App.tsx:1330)*
3. **Intake table 1120px min-width** → card/list layout below `md`, or hide secondary columns (`hidden md:table-cell`) + row-tap → `TicketDetailInspectorModal`. *(IntakeWorkOrderModule.tsx:445)*
4. **`viewport-fit=cover` + safe-area padding** on bottom nav and header. *(index.html:5, Navigation.tsx)*

**P1 — tablet & ergonomics:**
5. **Inventory `min-w-max` table** → same card/column-priority treatment; disable inline edit `<md`.
6. **iPad portrait density**: CRM 5/7 split → 6/6 between 768–1024; Pipeline flex-scroll → `md:grid-cols-3`; sidebar auto-collapse 1024–1280.
7. **Touch floor on mobile**: `@media <768px` button/input `min-height: 40px`; hamburger 44px; table action buttons ≥36px with more gap.
8. **AI FAB stacking**: `bottom-20` → `bottom-[calc(5rem+env(safe-area-inset-bottom))]`, and hide it when POS checkout bar is visible.

**P2 — polish:**
9. Phone table body text 12px → 13px.
10. PWA icons (192/512) + manifest `theme_color` → `#0071E3`.
11. Consider `overflow-x-auto` scroll shadows (affordance that more columns exist) on Pipeline/table containers.

---

## What's Already Excellent (keep)

- Role-aware bottom tab bar with 44px targets and active states.
- Kanban snap-scroll on mobile — best pattern choice for 6 columns.
- Follow-Up module's row → vertical card transformation.
- iPad-specific topbar compression media query (640–1100px).
- `100dvh`-based workspace clamps with phone reductions.
- Readability floor CSS that already eliminated sub-11px text globally.
