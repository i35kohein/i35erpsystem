# iPad Table UI/UX Analysis — Whole Project

Date: 2026-08-06 12:26–13:00 MMT
Method: live measurements via CDP at iPad widths (768×1024 portrait, 1024×1024, 1180×1024 landscape) in iPad mode (UA-emulated), across all nav modules. Source review for non-table modules.

## 1. Inventory of tables per module

| Module | Tables in code | On iPad portrait 768 | On iPad landscape 1024/1180 |
|---|---|---|---|
| Work Intake & Tickets | 1 (roster) | ✅ fits, 9 cols | ✅ fits @1180; ⚠️ micro-scroll @1024 |
| Dashboard (Queue Roster) | 2 | ⚠️ horizontal scroll, NO sticky | n/a (not re-measured) |
| Parts & Stock Matrix | 4 (stock/profit/cards/matrix) | ✅ fits, 7 cols | ✅ fits, 7 cols |
| POS & Invoicing | 1 (invoice items) | ⚠️ scrolls (min-w-520), NO sticky | ⚠️ scrolls @1024; fits @1180 |
| Suppliers & RMA | 1 (desktop-only fallback) | ❌ cards | ❌ cards |
| Shop Finance | 8 (income/expense/ledger…) | ❌ not rendered at these widths | ❌ not rendered |
| Follow-Ups | 0 visible (cards) | ❌ cards | ❌ cards |
| QA & Warranty | 0 visible (cards) | ❌ cards | ❌ cards |
| Price List | 1 (price matrix, cards on iPad) | ❌ cards | ❌ cards |
| CRM Portal | 0 visible (cards) | ❌ cards | ❌ cards |
| Microsoldering / Devices / Settings | tables exist (devices has overflow-x-auto) | not nav-reachable directly; devices table = overflow-x-auto ✓ | — |

## 2. Measured numbers (live, iPad mode)

### Work Intake roster (9 columns)
| Width | Table vs wrapper | Scroll? | Row height | Sticky |
|---|---|---|---|---|
| 768 | 694 = 694 (fits exactly) | no | 84px | ✅ |
| 1024 | 936 vs 886 | **yes, +50px micro-scroll** | 84px | ✅ |
| 1180 | 1042 = 1042 | no | 67px | ✅ |

- At 768 the 9 columns share 694px → **~77px per column** — Ticket#, Customer, Device, Stage, Amount, Actions all squeezed; cells wrap to multi-line (drives the 84px rows).
- At 1024 the table is only 50px wider than its wrapper → a tiny, awkward horizontal scroll with no edge affordance.

### Dashboard Queue Roster (9 columns) @768
- Table 777px vs wrapper 694px → scrolls (~83px overflow).
- **No sticky header** → column labels scroll away horizontally.
- Rows 90px (wrapped).

### Inventory Stock table (7 columns)
| Width | Table = wrapper | Row height | Sticky |
|---|---|---|---|
| 768 | 734 = 734 ✅ | 97px | ✅ |
| 1024 | 926 = 926 ✅ | 82px | ✅ |
| 1180 | 1082 = 1082 ✅ | 65px | ✅ |

- Best-behaved table: fits at all iPad widths, sticky header, 50 rows. Rows are tall (97px at 768) because cells wrap.

### POS invoice items (4 columns)
- min-w-520 → scrolls at 768 (382 wrap) and 1024 (494 wrap), fits at 1180.
- **No sticky header** while scrolling; no scroll affordance.

## 3. Issues found (priority-ordered)

### 🔴 P1 — Scrollable tables lose their headers (POS, Dashboard roster)
- POS invoice table and Dashboard Queue Roster scroll horizontally but the `<thead>` is not sticky → while scrolling, you can't see which column is which. The Intake + Inventory tables already do `sticky top-0` correctly — apply the same pattern.
- Files: `PosInvoicingModule.tsx` (~L610), `DashboardOverview.tsx` roster.

### 🔴 P1 — Intake roster micro-scroll at 1024 (iPad landscape)
- 50px overflow = worst of both worlds: not enough to be a deliberate scroll, but the rightmost column (Actions) is cut. Either (a) hide low-priority columns below xl (e.g. Amount stays, move Actions into row ⋯ menu), or (b) commit to a real horizontal scroll with `min-w` + edge fade + sticky header.

### 🟠 P2 — 9 columns in 694px at iPad portrait = density overload
- Intake roster at 768 packs 9 columns into ~77px each; dashboard roster identical. Cells wrap → 84–90px rows. Readable but visually dense; scanning a ticket list on iPad is slower than it should be.
- Recommendation: **column priority hiding** at <xl (the pattern already used in the pipeline Round-3): keep Ticket# / Customer / Device / Stage / Amount; collapse Date + Actions (actions already duplicated in row menus) and hide low-value columns on smaller widths.

### 🟠 P2 — No horizontal-scroll affordance on scrollable tables
- POS + Dashboard scroll without any edge fade/hint. The inventory module already has a `.scroll-shadow-right` pattern (F2 from an earlier round) — reuse it for every `overflow-x-auto` table.

### 🟠 P2 — Inventory rows 97px at portrait — too tall?
- Wrapped cells inflate rows. For a 50-row parts table that's a lot of scrolling. Consider `line-clamp-1` + `title` on the part-name/SKU cells with a min-h floor (~56–64px) instead of full wrap. (Same for intake rows: clamp secondary lines.)

### 🟡 P3 — Module inconsistency: tables vs cards on iPad
- Suppliers, Finance, Follow-Ups, QA, Price List, CRM all render **card layouts** on iPad at every width (tables exist in code but only appear on wide desktop). This is consistent-looking but: (a) Finance's income/expense tables never appear on iPad → less scannable than desktop; (b) verify Ko Hein is OK with cards on iPad for these, or add a table/card toggle like Inventory's.
- Note: Suppliers' desktop table already uses `hidden lg:table-cell` column hiding — good pattern; it just never renders <lg.

### 🟡 P3 — Inconsistent row heights across modules
- Intake 67–84px, Inventory 65–97px, POS 37px (tiny — below the 44px touch floor for the item rows!), Dashboard 90px. POS item rows at 37px are tap-hazard on iPad; give them min-h-12.

## 4. What's already good (keep)
- Inventory stock table: sticky header, fits all iPad widths, column set right-sized for 7 columns.
- Intake + Inventory sticky headers (top-0 z-20) work.
- Row heights in Intake/Inventory/Dashboard are comfortably ≥44px touch targets.
- Suppliers desktop table hides columns by breakpoint (`hidden lg:table-cell`) — correct direction.
- No text truncation anywhere measured (0 truncated cells) — nothing gets cut off, cells wrap instead.

## 5. Recommended fix set (if Ko Hein says fix)
1. **P1 sticky headers**: POS invoice + Dashboard roster → `sticky top-0 z-10 bg-…` on thead (2 files, ~2 lines each).
2. **P1 intake @1024**: hide the "Date" column below xl (or move Actions into ⋯) so the table fits ≥1024 without micro-scroll; add edge fade if it still scrolls.
3. **P2 column priority at <xl**: intake + dashboard rosters hide low-priority columns (Date; Actions→row menu) at <xl — frees ~150px, drops row heights.
4. **P2 scroll affordance**: reuse `.scroll-shadow-right` on POS + Dashboard table wrappers (mobile/tablet only).
5. **P3 POS rows**: `min-h-12` on item rows; `line-clamp-1` + title on POS item description + inventory part name.
6. Optional: table/card toggle for Finance (income/expense) like Inventory has.

## Files touched in analysis
- Screenshots: `~/.openclaw/media/outbound/e90ef1bb…png` (intake @768)
- Audit scripts: `/tmp/ipad-table-audit.mjs`, `/tmp/ipad-audit3.mjs`
