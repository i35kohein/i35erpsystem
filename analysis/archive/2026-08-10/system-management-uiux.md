# System Management (Settings) — UI/UX Analysis & Target Design

> Module: `SystemManagementSettingsModule.tsx` (3,884 lines — the largest component in the app)
> 13 sub-tabs: users · shop · theme · technicians · intake · pricing · payment · inventory · pos · notifications · ai · qa · recycle

---

## 1. Current Structure

```
┌────────────────────────────────────────────────┐
│ Save toast banner (top, transient)             │
├────────────────────────────────────────────────┤
│ Sub-tab grid (2/3/4/6 cols) — 13 icon buttons  │
│   [👥 User Roles] [🏪 Shop] [🎨 Theme] ...     │
├────────────────────────────────────────────────┤
│ Active tab content:                            │
│  card: header (icon + title + subtitle)        │
│        + form grids / lists / banners / modals  │
└────────────────────────────────────────────────┘
```

## 2. What Already Works ✅
- **13 sub-tabs in one grid** — everything reachable in one tap; badges (users, technicians, categories, archived) give at-a-glance counts.
- **Consistent card anatomy** (icon + title + description + 2-col form grids) — visually uniform across tabs.
- **Save feedback toast** after persisting to Supabase.
- **Role-rules banner** (Admin/Technician/Reception purple cards) — teaches permissions where they're configured.
- **Draft + Reset Draft** (topbar) — edits aren't lost instantly on refresh.
- Inline add/edit for suppliers, quality tiers, bins (no page jump).
- Content is mostly forms/lists — already mobile-friendly (no wide tables except a few).
- Logo preview + MM QR preview + theme swatch grid — good visual feedback.

## 3. Issues Found

### Mobile
| # | Issue | Impact |
|---|---|---|
| M1 | **13-tab grid on phones**: 2-col grid + `truncate` labels → "Payment Methods & MM QR" becomes "Payment Method…". Users must guess from icons. | Tab discoverability |
| M2 | **No grouping**: 13 flat tabs, no visual categories (business vs staff vs ops vs system) — mental load | Scannability |
| M3 | **Save is far away**: on long tabs (intake, pos, notifications) the save/action buttons sit at the top; on phones the user scrolls 2–3 screens and must scroll back up | Friction |
| M4 | **No dirty indicator**: nothing tells you a tab has unsaved edits; switching tabs silently discards | Data loss risk |
| M5 | **Long sections never collapse**: intake/pos/notifications tabs are single long scrolls | Scrolling fatigue |
| M6 | Some selects/inputs are `p-2.5` (40px) — acceptable, but a few small icon buttons (`p-1.5`, `p-1`) remain below touch target | Touch |

### Desktop
| # | Issue | Impact |
|---|---|---|
| D1 | **Monolithic component (3,884 lines)** — 13 tabs in one file; every render re-evaluates all tabs; future edits risky | Maintainability |
| D2 | **Tab grid maxes at 6 cols** on wide screens — 13 tabs wrap to 3 rows; wasted width; a sidebar or row-with-groups would fit | Layout |
| D3 | No global settings search (Cmd+K exists app-wide — not wired to settings tabs) | Findability |
| D4 | Two save paths (topbar "Save All Settings" + per-tab saves) can confuse which one applies | Trust |
| D5 | Tables in a few areas (user list, inventory category matrix) lack the card-list treatment phones need (partially done for suppliers/technicians) | Consistency |

## 4. How the UI *Should* Be (Target Design)

### 4.1 Navigation — grouped, searchable, chip-friendly (mobile)
```
[ Search settings…                     ]   ← filter input (mobile + desktop)
─────────────────────────────────────────
BUSINESS    🏪 Shop · 💱 Pricing · 💳 Payment · 🖨 POS
STAFF       👥 Users · 🧑🔧 Technicians
OPERATIONS  📋 Intake · 🧪 QA · 📦 Inventory · 🔔 Notifications
SYSTEM      🎨 Theme · 🤖 AI · 🗑 Recycle
```
- **Mobile**: the grid becomes a **horizontal scrollable chip row per group** (or one scrollable row with group separators) — full labels, no truncation.
- **Desktop**: same groups as a single row, or a compact left rail at ≥xl.
- The filter input filters tab chips live (like Price List category chips) — instant findability.

### 4.2 Sticky action bar (mobile)
- Tabs with a top-level save (shop, theme, users, ai) get a **fixed bottom bar**: `[Reset] [Save Changes]` visible only when the form is **dirty**.
- Dirty = any tracked field differs from last-saved snapshot → also drive a **dirty dot** on the tab chip and a **confirm dialog** when switching away.

### 4.3 Consistent card system
- Every tab: one card per concern, header `icon + title + 1-line description`, body form grid (1-col mobile / 2-col md / 3-col xl).
- **Section collapsibles** on mobile for long tabs (intake/pos/notifications) — remember open state.
- Per-card footer action: single primary `Save` (right-aligned) — removes the dual-save confusion; topbar "Save All Settings" stays only on the main (non-settings) screen.

### 4.4 Lists → responsive cards
- Users / technicians / suppliers / inventory categories: **card rows on <md** (avatar/icon + name + role + actions), table only on md+ — mirrors the Inventory/Supplier pattern already shipped.

### 4.5 Maintainability (desktop/engineering)
- **Split into per-tab components** (`SettingsUsersTab.tsx`, `SettingsShopTab.tsx`, …) with a thin shell — enables `React.lazy` per tab (code-split the 3,884-line chunk) and isolated editing.
- Shared `<SettingsCard>`, `<SettingsField>`, `<SettingsToggle>` primitives to kill repeated markup.

## 5. Priority Backlog

| # | Item | Surface | Priority |
|---|---|---|---|
| 1 | Grouped + searchable tab navigation (chips on mobile) | both | P0 |
| 2 | Dirty tracking + sticky mobile save bar + switch-away confirm | both | P0 |
| 3 | Collapsible sections on long tabs | mobile | P1 |
| 4 | Card-list rows for remaining tables | mobile | P1 |
| 5 | Split into per-tab components + lazy load | desktop | P2 |
| 6 | Touch-target sweep (p-1/p-1.5 buttons) | mobile | P2 |
