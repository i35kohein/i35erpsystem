# Full Project UI/UX Audit — Every Line of Code (i35 ERP)

- **Date:** 2026-08-05 · **Analyst:** Kimi (OpenClaw)
- **Scope:** **all 85 source files · 44,982 lines** (`src/**/*.tsx|ts`) — no line skipped. Scanned for font sizes, button sizes/paddings, colors, radii, shadows, a11y gaps, and maintainability, via `scripts/uiux-audit.mjs` + `scripts/uiux-buttons.mjs` (re-runnable).
- **Overall score: 6.9 / 10** — functionally rich and mobile-safe, but visually *unbalanced*: 5 inconsistent button height tiers, 737 text instances below the 11px floor, 210 distinct raw hex colors, and 9-radius / 9-shadow scales.

---

## 1. Executive summary (what's actually wrong)

| Metric | Number | Verdict |
|---|---|---|
| Font sizes in use | 7px → 30px (14 distinct) | 🔴 **737 instances < 11px** (10px×586, 9px×134, 8px×15, 7px×2) |
| Raw `<button>` elements | 472 | 🟠 5 different `py` tiers → 5 button heights (≈28/32/36/40/48px) |
| Design-system `Button` files | 18 | 🟡 used in parallel with raw buttons — same roles, different sizes |
| Distinct raw hex colors | **210** | 🔴 top-12 Apple palette ≈ 84% of usage; ~198 one-off colors |
| Radius classes | 9 levels (incl. bare `rounded`) | 🟡 consolidate to 3 |
| Shadow classes | 9 levels (2xs→2xl + customs) | 🟡 consolidate to 3–4 |
| Icon-only buttons w/o `aria-label` | ~46 (line-flagged) | 🟠 verify + label during fix pass |
| Clickable `<div>` w/o `role` | 2+ (line-scan; more span lines) | 🟡 convert to `<button>` |
| Lines > 220 chars | 166 | 🟡 refactor targets |

---

## 2. 🔴 A. Font-size imbalance (P0)

Usage (px → occurrences): **7×2 · 8×15 · 9×134 · 10×586 · 11×324 · 12×929 · 13×5 · 14×204 · 15×1 · 16×76 · 18×38 · 20×39 · 24×28 · 30×4**

**Problems**
1. **737 sub-11px texts** — unreadable on phones, below the project's own a11y floor (button.md: "never < 11px"). 10px alone = 586.
2. Same *role* renders at different sizes across modules: table cell labels 9–10px in Inventory/Finance, 11–12px in CRM/Follow-ups; badges 7–10px.
3. Mixed naming: `text-[10px]` vs `text-xs` (12px) for the same "small label" job.

**Top offenders (sub-11px count / file):** Inventory 89 · Settings 65 · Dashboard 56 · Finance 45 · POS 38 · CreateTicket 36 · Portal 36 · Pipeline 34 · Devices 33 · PriceCatalog 33 · DeviceTagPrinter 26 · Intake 25 · Follow-ups 24 · TechnicianDetailModal 18 · TicketDetailInspector 17.

**Fix plan (P0):** global sweep `text-[10px]→text-[11px]`, `text-[9px]→text-[11px]` where space allows (badges) or `text-[10px]`→`text-xs` for dense tables; 7–8px only on print-only media. Est. 2–3 h across ~20 files, zero layout risk (sizes only shrink gaps).

---

## 3. 🟠 B. Button-size imbalance (P0/P1)

**Design system** (`ui/button.tsx`, mobile-first): `default h-11 lg:h-9` · `sm h-10 lg:h-8` · `lg h-12 lg:h-11` · `icon h-11 w-11 lg:h-9 lg:w-9` — 44px mobile / 36px desktop, blue focus ring, `active:scale-95`.

**Raw buttons (472) size via padding only** — five tiers measured:
| Tier | Padding | Est. height | Where |
|---|---|---|---|
| T1 | `py-1` (×4) | ≈28px | inline pills |
| T2 | `py-1.5` (×21) | ≈32px | toolbar chips, table actions |
| T3 | `py-2` (×24) | ≈36px | most secondary buttons |
| T4 | `py-2.5` (×2) | ≈40px | POS/Price CTAs |
| T5 | `py-3` (×5) | ≈48px | Login, Portal, Pipeline CTAs |

**Imbalance:** identical *primary* CTAs differ by module — e.g. Login/Portal `py-3` (48px) vs Price Catalog `py-2.5` (40px) vs `Button sm` (32px) in the same screens. Icon buttons: `h-7`/`h-8`/`h-9`/`h-10` mixed (28–40px) — several below the 44px touch floor.

**Fix plan:** (P1) standardize *primary CTAs* app-wide: full-width on phones + `min-h-11`; (P2) migrate raw buttons to the `Button` component (button.md P2 — ~70% are raw).

---

## 4. 🔴 C. Color token debt (P0 maintainability)

**210 distinct raw hex colors.** Top 12 (≈84% of all usage):
`#0071E3 ×1150 · #1D1D1F ×1103 · #E5E5EA ×995 · #86868B ×855 · #F5F5F7 ×427 · #D2D2D7 ×159 · #34C759 ×156 · #F8F9FA ×69 · #F0F6FF ×62 · #FF3B30 ×49 · #AF52DE ×44 · #2C3E50 ×44`

~198 colors appear < 20× each — drift risk (e.g. near-black variants `#111`, `#09090B`, `#2C3E50`, `#51525C`, `#6E6E73`, `#7F7F7F`, `#A1A1A6` all in use for "gray text").

**Fix plan:** alias the top-12 to CSS vars (`--primary`, `--text-main`, `--border`, `--text-muted`, …) and add a raw-hex lint gate to `check:ui` (blocking). ~2 h + rolling.

---

## 5. 🟡 D/E. Radius & shadow scale

**Radii (9 levels):** `rounded-xl 630 · lg 376 · 2xl 272 · full 209 · md 136 · rounded 95 · 3xl 21 · sm 5 · none 2`
→ bare `rounded` (95×) is ambiguous (0.25rem default) and mixes with md (0.375rem). **Fix:** keep `lg / xl / 2xl / full`; map `rounded→rounded-md`.

**Shadows (9 levels):** `2xs 246 · xs 153 · (none) 66 · 2xl 52 · sm 25 · md 25 · xl 13 · lg 7 · custom 3`
→ 5 "card elevation" levels for 3 real needs. **Fix:** keep `2xs` (cards), `sm/md` (menus), `xl/2xl` (modals).

---

## 6. 🟠 F. Accessibility gaps

- **Icon-only buttons without `aria-label`** (line-flagged, verify): App.tsx (6), Inventory (6+), Settings (5), DateFilterSelector (3), POS (3), CustomerRepairTimeline (2), WorkOrderStatusTimeline (2), Dashboard (2), CRM (1), Navigation (1), LoginPage (2), CameraQrScannerModal (1), PrintableInvoiceModal (1), Devices (1), PriceSettingsModal (1), QuickPriceCalculator (1), AiModal (1).
- **Clickable `<div>` without role/keyboard**: IntakeWorkOrderModule (525, 603) + multi-line cases elsewhere.
- **Focus-visible rings**: present in `ui/button.tsx` and most raw buttons, but missing on some list rows / dropdown triggers.

**Fix plan:** add `aria-label` + `title` to the flagged icon buttons (~1 h); convert clickable divs to `<button>` (0.5 h).

---

## 7. 🟡 G. Maintainability

- **166 lines > 220 chars** (worst in Inventory 26, Settings 29, Pipeline 8, Intake 7, POS 6, Dashboard 6, CreateTicket 6, Portal 5) — JSX strings spanning 400+ chars; hard to diff/review. Refactor during feature work, not as a batch.

---

## 8. Per-module snapshot

| Module | Lines | <11px | Hex | Long lines | Buttons |
|---|---|---|---|---|---|
| Inventory | 3,579 | 89 | 26 | 26 | 81 |
| Settings | 4,061 | 65 | 36 | 29 | 61 |
| Dashboard | 2,076 | 56 | 20 | 6 | 20 |
| Finance | 1,394 | 45 | 12 | 1 | 9 |
| POS | 1,479 | 38 | 32 | 6 | 16 |
| CreateTicket | 1,599 | 36 | 22 | 6 | 23 |
| Portal (customer) | 1,233 | 36 | 14 | 5 | 13 |
| Pipeline | 1,505 | 34 | 19 | 8 | 28 |
| Devices | 794 | 33 | 11 | 0 | 9 |
| PriceCatalog | 1,278 | 33 | 12 | 4 | 12 |
| DeviceTagPrinter | 1,003 | 26 | 10 | 2 | 10 |
| Intake list | 917 | 25 | 15 | 7 | 11 |
| Follow-ups | 897 | 24 | 15 | 0 | 9 |
| QA | 1,050 | 16 | 15 | 3 | 9 |
| Suppliers | 1,064 | 15 | 15 | 2 | 9 |
| CRM | 640 | 14 | 12 | 0 | 10 |
| App shell | 2,100 | 13 | 16 | 6 | 23 |

*(full per-file data available in `/tmp/uiux-audit.json` — re-run `node scripts/uiux-audit.mjs`)*

---

## 9. Prioritized fix plan

### P0 — this week (visible balance + a11y floor)
1. **Font floor sweep**: `text-[10px]→11px`, `text-[9px]→11px` (badges) or `→text-xs` (tables) across the top-15 files. *(737 instances — biggest single win)*
2. **Color tokens**: alias top-12 hex → CSS vars + lint gate in `check:ui`.
3. **Primary CTA standard**: Login/Portal/POS/CreateTicket CTAs → consistent `min-h-11 w-full sm:w-auto` + `active:scale-95` + focus ring (mostly done; align the stragglers).

### P1 — this month
4. **Button-tier cleanup**: raw `py-1.5/py-2/py-3` → map onto `Button` sizes; icon buttons → ≥40px mobile.
5. **Radii/shadow consolidation**: bare `rounded`→`rounded-md`; collapse shadow set.
6. **A11y**: label the ~46 icon-only buttons; convert clickable divs (Intake 525/603) to `<button>`.

### P2 — backlog
7. **Raw→`Button` migration sweep** (button.md P2, ~70% of 472).
8. **Long-line refactors** (166) — split during feature work.
9. Per-module "visual density" pass for the remaining tables (Inventory/Finance/POS).

---

## 10. What's already good ✅
- Mobile-first design system exists (`Button`, `.basic-ui`, safe-area, sticky bars).
- Zero horizontal overflow app-wide; tap targets audited clean in the CRM/Price passes.
- Consistent Apple palette family at the top (tokens would lock it in).
- Focus rings + `active:scale-95` already standardized in `ui/button.tsx` (previous pass).
- The toolbar/label responsive patterns (`hidden sm:inline` etc.) are applied consistently now.
