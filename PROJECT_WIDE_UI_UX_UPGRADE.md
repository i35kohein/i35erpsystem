# Project-Wide UI/UX Analysis & Upgrade Plan — i35 Apple ERP

**Date:** 2026-08-05 · **Analyst:** Kimi (OpenClaw)
**Scope:** ALL 12 modules + layout shell, every tab, at 9 viewports: **390 (phone) · 640 · 768 (iPad portrait) · 1024 (iPad landscape) · 1280 · 1440 · 1920 · 2560 · 3440 (ultra-wide)**
**Method:** Live DOM measurement at 3440×1440 for every module this session (overflow, stretched elements >2800 px, max-width clamps, table scroll widths, grid column counts) + prior per-module measurements at ≤1920 (2026-08-03 `RESPONSIVE_UI_UX_ANALYSIS.md`) + intake deep-dives R1–R4.

---

## 1. Executive Summary

The ERP is **functionally strong and genuinely usable at every form factor** — zero horizontal overflow was measured on all 12 modules even at 3440 px, mobile has a drawer + full-screen modals, and the intake flow just got 9 rounds of hardening.

The gap is **"professional density" at the extremes**: at ultra-wide (3440×1440) **10 of 12 modules stretch edge-to-edge with no content clamp** — KPI cards become 826 px slabs, tables run 3,300+ px, and Parts & Stock renders **467 elements wider than 2,800 px**. On the small end, dense tables (Intake, Inventory, Suppliers) and 10–11 px text still strain phones. Between them, iPad portrait (768–1023) wastes width in split views (CRM 5/7, QA 3/9, Pipeline flex-scroll).

**Overall score: 7.6 / 10** (Desktop 1920: 8.6 · Ultra-wide 3440: **6.8** · iPad: 7.5 · Mobile: 7.3)

| Form factor | Score | Key gap |
|---|---|---|
| Ultra-wide 2560–5120 | **6.8** | No content clamp, sparse stretched grids, 3,300 px tables |
| Desktop 1280–1920 | **8.6** | Near-complete (intake now polished) |
| iPad portrait 768–1023 | **7.5** | Split-view ratios waste width; bottom zone recently cleaned |
| Phone <640 | **7.3** | Dense tables → horizontal scroll; 12 px body text |

---

## 2. Ultra-Wide Measurements (new, 3440×1440)

| Module | Overflow | Elements >2800 px | Content clamp | Widest table | Notes |
|---|---|---|---|---|---|
| Dashboard | ✅ none | 27 | ❌ | 3302 px | KPI cards 826 px wide (4-up) — sparse |
| Work Intake | ✅ | 3 | ✅ has | — | Only 2 modules with a clamp |
| Pipeline | ✅ | 6 | ❌ | — | 7 columns stretch to 467 px — OK-ish |
| QA & Warranty | ✅ | 5 | ❌ | — | Checklist stretches |
| Customer Follow-Ups | ✅ | 3 | ✅ has | — | |
| Price List | ✅ | 7 | ❌ | — | 3-col cards stretch to ~1,000 px |
| POS & Invoicing | ✅ | 5 | ❌ | 1902 px | Product grid 4-up only |
| Shop Finance | ✅ | 10 | ❌ | — | Stat cards 814 px wide |
| **Parts & Stock Matrix** | ✅ | **467** | ❌ | **3342 px** | Worst offender — table edge-to-edge |
| Suppliers & RMAs | ✅ | 12 | ❌ | 3342 px | Same table problem |
| CRM / Staff Portal | ✅ | 6 | ❌ | — | 5/7 split stretches |
| System Management | ✅ | 12 | ❌ | — | Forms stretch |

**Root cause:** `<main>` has **no max-width**; module containers mostly use `w-full` grids with `xl:` column caps (e.g. `xl:grid-cols-4`), so at 3440 px columns just get wider instead of more numerous. Tables use `min-w-max`/`min-w-[…px]` so they stretch with the viewport.

---

## 3. Shell-Level Findings & Upgrades (all form factors)

### 3.1 Global content clamp — 🔴 top priority
- Add `max-w-[1920px] mx-auto` to `#main-content-scroll` inner wrapper (or per module) so ultra-wide monitors get a readable 1920 px content band, centered, with the sidebar anchoring the left.
- Keep tables usable: clamp the *container*, let tables scroll within it (they already `overflow-x-auto`).

### 3.2 Grid density at ultra-wide (add `3xl:` = 1920+ / `4xl:` = 2560+ breakpoints)
- **KPI/stat cards** (Dashboard, Finance): `xl:grid-cols-4` → `3xl:grid-cols-6`, `4xl:grid-cols-8`. Measured: 826 px cards at 3440 are 40 % empty.
- **Price List cards**: `lg:grid-cols-3` → `3xl:grid-cols-4/5`.
- **POS product grid**: `md:grid-cols-4` → `3xl:grid-cols-6`.
- **QA checklist**: `lg:grid-cols-3` → `3xl:grid-cols-4`, and widen the inspector split (3/9 → 2/10 at 3xl).
- **Dashboard tab strip**: consider 3xl density for sub-tabs.

### 3.3 Tables — column priority hiding (universal pattern)
For Intake, Inventory, Suppliers, POS, Dashboard: declare a column priority order and hide low-priority columns below breakpoints (`hidden xl:table-cell`), instead of shrinking/overlapping. Phones get a **card list** (Intake already has one — reuse the pattern for Inventory/Suppliers) or row-tap → detail modal (modal exists).

### 3.4 Topbar / sidebar (recently improved — keep)
- ✅ Sidebar now **collapsed by default** (2026-08-05); expand works.
- ✅ Mobile footer nav removed; hamburger drawer is the only mobile nav (2026-08-05).
- ✅ DB status icon is now a working button with status panel + Refresh (2026-08-05).
- 💡 Add **global search** (Cmd/Ctrl+K) in the topbar — search tickets/parts/customers across modules.
- 💡 Sidebar auto-expand on hover (desktop) for discoverability of collapsed icons.

### 3.5 Modals — ✅ good foundation, small upgrades
- Phone: near-fullscreen (verified). Desktop: cap at `max-w-5xl/6xl` (done in most).
- Add **Esc-to-close** everywhere + focus trap audit; currently inconsistent.
- Loading skeletons inside modals instead of blank space during Supabase fetch.

### 3.6 PWA / installability (shop iPads are the intake habitat)
- Add 192/512 PNG icons + `theme_color` → `#0071E3` (manifest still `#7360F2`).
- `viewport-fit=cover` already added ✅ — install on the counter iPad for a fullscreen kiosk feel.

---

## 4. Module-by-Module Matrix (each page / each tab)

Legend: ✅ good · ⚠️ needs work · 🔴 fix first

### 4.1 Dashboard — 6 sub-tabs: Status Queue / Hardware Analytics / Technicians / Inventory / Finance / Warranty Watch
| Aspect | Status |
|---|---|
| Responsive | ✅ 2→4 KPI cols; no overflow; ⚠️ ultra-wide 4-up sparse (826 px cards) |
| Enhance | **KPI strip 3xl:grid-cols-6** · sparkline mini-charts on KPIs · tab strip sticky under topbar · empty-state art for "no tickets" panels · 3302 px table → column priority hiding · date-range presets persist per user |

### 4.2 Work Intake & Tickets (list + Create Ticket page)
| Aspect | Status |
|---|---|
| Responsive | ✅ clamp exists; phones default to card view; table hides 3 cols <lg; intake form is now 8.6/10 after R1–R4 (equal-height row 2, 14 px inputs, exact-match customer lookup, CTA above all bars) |
| Enhance | **Row-tap → TicketDetailInspectorModal on phones** (action icons 28–32 px are below the 44 px floor) · sticky first column (Ticket #) · bulk status change · filter chips row on mobile · "My tickets" tech filter quick-switch |

### 4.3 Pipeline (Kanban)
| Aspect | Status |
|---|---|
| Responsive | ✅ snap-scroll columns on phone; columns stretch to 467 px at 3440 |
| Enhance | **`md:grid-cols-3` at 640–1279** (currently flex-scroll with dead space on iPad portrait) · touch drag via pointer events (HTML5 DnD is mouse-only) · WIP-limit badges per column · card density: 2-col grid inside columns at 3xl |

### 4.4 QA & Warranty Inspection
| Aspect | Status |
|---|---|
| Responsive | ✅ 3/9 split, checklist 2→3 cols |
| Enhance | **2/10 split at 3xl + checklist 4 cols** · Pass/Fail → segmented control · pass-rate % per device model header · save-draft per ticket · keyboard 1/2/3 quick-mark |

### 4.5 Customer Follow-Ups
| Aspect | Status |
|---|---|
| Responsive | ✅ clamp exists; stats 2→6 cols; rows become cards on phone |
| Enhance | **Overdue red-tint rows** · one-tap Call/WhatsApp link · follow-up template snippets · timeline view per customer · snooze until date picker |

### 4.6 Price List
| Aspect | Status |
|---|---|
| Responsive | ✅ 12-col split + 3-col cards; ⚠️ ultra-wide cards ~1,000 px |
| Enhance | **3xl:grid-cols-4/5** · sticky category rail on desktop · bulk price-change editor (select rows → % adjust) · currency toggle (MMK/USD) · compact table/list view toggle |

### 4.7 POS & Invoicing Portal
| Aspect | Status |
|---|---|
| Responsive | ✅ mobile checkout bar at bottom-0 (fixed 2026-08-05); 5/7 split; 1902 px table at ultra-wide |
| Enhance | **3xl: product grid 6-up + 6/6 split** · Enter = add item, keyboard-first checkout · recent items quick row · barcode scanner already exists (camera modal) — surface it in product search · split payment UI |

### 4.8 Shop Finance & P&L
| Aspect | Status |
|---|---|
| Responsive | ✅ 4-col stats; 2-col sections; no overflow |
| Enhance | **3xl:grid-cols-6 stats** · month/quarter selector with prev-period comparison · mini bar/line charts (CSS/SVG, no lib needed) · export P&L to CSV/PDF · cost-of-goods drill-down from margin % |

### 4.9 Parts & Stock Matrix — 🔴 biggest mobile/ultra-wide offender
| Aspect | Status |
|---|---|
| Responsive | ✅ no overflow (table scrolls) but 🔴 **467 ultra-wide elements, 3,342 px table, `min-w-max`**, phones get massive horizontal scroll |
| Enhance | **Card list < md** (reuse Intake card pattern) · column priority hiding (`hidden md:table-cell` for Cost/Profit/Supplier) · **inline edit desktop-only**, modal on mobile · sticky header + sticky first column · stock-alert color coding on the cell, not just a badge · 3xl: keep table max-w 1920 with internal scroll |

### 4.10 Suppliers & Vendor RMAs
| Aspect | Status |
|---|---|
| Responsive | ✅ no overflow; ⚠️ 3,342 px table |
| Enhance | Same table treatment as 4.9 · RMA status mini-pipeline per vendor · debts overview card (owed/to-pay) · email/phone quick actions |

### 4.11 Customer & Staff Portal (CRM)
| Aspect | Status |
|---|---|
| Responsive | ✅ 5/7 split, stacks on phone; ⚠️ iPad portrait roster ~300 px cramped; 6 ultra-wide elements |
| Enhance | **`md:grid-cols-2` (6/6) for 768–1024, 5/7 at lg+** · customer 360 drawer (history, tickets, spend timeline) · staff vs customer tabs clearer · roster search on top (not buried) |

### 4.12 System Management (Settings)
| Aspect | Status |
|---|---|
| Responsive | ✅ nav 2→6 cols; forms 2/3-col |
| Enhance | **Sticky sub-nav** under topbar · form containers `max-w-3xl` clamp (not full-bleed) · destructive actions in a consistent "Danger Zone" card · role/permission visual matrix · last-saved-by/at footers |

---

## 5. Professional Polish Checklist (cross-cutting)

**Design system**
- Consolidate ~9 button color combos → tokens: primary `#0071E3`, success, danger, warning, neutral, ghost (R1 finding, still open).
- Unify radius scale (8/12/16) and shadow tokens; remove `shadow-2xs` variance.
- Typography floor: **never < 11 px**; table body 12→13 px on phones; inputs 14 px (done in intake — roll out globally via the `.basic-ui` input rule).

**Interaction & feedback**
- Focus-visible rings on every interactive element (currently spotty).
- Empty states with icon + message + action for all lists (tickets, parts, CRM, expenses).
- Loading skeletons (grids/tables) instead of spinners/blank.
- Destructive actions → typed confirm (type "DELETE") for bulk ops.
- Toast position above bottom zone on mobile (already raised ✅).

**Accessibility**
- `aria-label` on all icon-only buttons (audit; intake fixed).
- `label htmlFor` audit (intake fixed; check POS/Inventory/Finance forms).
- Color-contrast: placeholders `#D8E5ED`-adjacent grays borderline — darken.

**Keyboard & power-user**
- `Ctrl/Cmd+Enter` submit on intake/POS; `/` focuses global search; Esc closes modals consistently.
- Tab-order audit on intake + POS.

**Language (shop value)**
- **English ⇄ Myanmar (Unicode) toggle** for labels/statuses — biggest real-world win for counter staff; start with a translation map for the 20 most-used strings.

**Performance**
- `index-*.js` is **969 kB / 270 kB gzip** — route-level code-splitting + `manualChunks` (React/lucide vendor split). This is the #1 perceived-speed upgrade.

---

## 6. Prioritized Roadmap

### Quick wins — 1–2 days total
1. **Global content clamp** `max-w-[1920px] mx-auto` on main + verify all 12 modules at 3440/2560. *(P0 ultra-wide)*
2. **`3xl:`/`4xl:` grid density** — Dashboard KPIs, Finance stats, Price List, POS grid, QA checklist. *(P0 ultra-wide)*
3. **Table column priority hiding** — Intake, Inventory, Suppliers, Dashboard. *(P1)*
4. PWA icons 192/512 + `theme_color`. *(P2)*
5. Empty states for the 6 main lists. *(P1)*
6. Focus-visible rings global CSS. *(P2)*

### Medium — 3–5 days
7. **Inventory/Suppliers card-list on phones** (reuse Intake pattern) + row-tap detail.
8. **CRM 6/6 at iPad portrait**; Pipeline `md:grid-cols-3` 640–1280.
9. **Global search Cmd+K** across tickets/parts/customers.
10. **My/Myanmar label toggle** for the top 20 strings (labels, statuses, buttons).
11. Esc-to-close + focus-trap audit on all modals; loading skeletons.
12. Keyboard-first: Ctrl+Enter submit (intake/POS), `/` search.

### Bigger bets — 1–2 weeks
13. **Route-level code-splitting** (969 kB → ~250 kB initial) + vendor chunks.
14. Design-token refactor (colors/radii/shadows) across all modules.
15. Guided 4-step intake wizard toggle + diagnostic presets (from intake R4 §6).
16. POS: keyboard-first checkout + split payment + recent items.
17. Dashboard: sparklines, drill-down tabs, per-user saved date presets.

---

## 7. What Already Got Fixed (2026-08-04 → 08-05, commits `c92ef9b` → `0e04051`)

- Intake: P0/P1 hardening (order numbering, photo file input, discard-in-edit trap) · R2 validation & numbering · R3 defect fixes · R4 responsive (CTA above tab bar, real 14 px inputs, lg 2-col, stepper removed per Ko Hein, Find My removed, Color/Warranty/Serial equal 214 px row, exact-match customer lookup) · sidebar collapsed default · working DB status button · mobile footer nav removed · POS/intake bars safe-area.
- Global: `viewport-fit=cover`, safe-area insets, main nav clearance (now simplified after nav removal), Intake phone card view, responsive topbar compression.

*Companion docs: `RESPONSIVE_UI_UX_ANALYSIS.md` (per-module ≤1920), `INTAKE_CREATE_TICKET_UI_UX_ANALYSIS[_R2|_R3|_R4].md`, `POS_UI_UX_AUDIT.md`, `SIDEBAR_UI_UX_ANALYSIS.md`.*
