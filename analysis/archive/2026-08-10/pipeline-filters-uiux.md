# Pipeline Filters — UI/UX Analysis & Improvement Plan

> Module: `StatusPipelineView.tsx` + App topbar filter system + `RightFilterDrawer.tsx`
> Measured live at 390 / 768 / 1440 (2026-08-05 night). Overall score: **7.8 / 10**

---

## 1. Current Architecture (after the 2026-08-05 mobile rework)

```
DESKTOP (lg+)
┌─ App topbar ────────────────────────────────────────────────┐
│ Search | Bottlenecks(>48h) | All Stages ▾ | All Techs ▾ |   │
│ Date ▾ | Recycle Bin | DB status                            │
└─────────────────────────────────────────────────────────────┘
┌─ Module header ─────────────────────────────────────────────┐
│ Active Pipeline Overview (n) · Show All | Before Diag Pending│
│ | Finished Needs Diag | Clear All                           │
└─────────────────────────────────────────────────────────────┘
Kanban: 5 columns by default (Cant Repair / Customer Not Repair
hidden until "Show All")

MOBILE (<lg)
┌─ App topbar ────────────────────────────────────────────────┐
│ Title | Search | ⚙️ Filters (badge = active count)          │
└─────────────────────────────────────────────────────────────┘
┌─ Right filter drawer (slide-in) ────────────────────────────┐
│ Bottlenecks · Show All Stages · Before Diag · Needs Diag    │
│ Stage select · Technician select · Date · Recycle Bin ·     │
│ Reset All (when active)                                     │
└─────────────────────────────────────────────────────────────┘
Kanban: clean board (all toggles live in the drawer)
```

## 2. What Works Well ✅
- **One mobile entry point**: single ⚙️ Filters button with a live active-count badge — the drawer keeps the phone UI clean and the kanban fully visible.
- **Drawer pattern is right**: slide-in side panel, backdrop/ESC/X close, safe-area aware, native `<select>`s (mobile picker, no clipping).
- **Show All stages concept**: hides the exception columns by default, reveals on demand — the board stays focused.
- **Instant apply**: no modal "Apply" step — filters take effect immediately, matching the desktop behavior.
- **Badge counts**: the Filters button shows how many filters are active — users know when they've left a filter on.
- **Toggle rows mirror desktop colors** (red bottleneck / blue before-diag / purple needs-diag) — consistent language.

## 3. Issues Found

### Desktop
| # | Issue | Impact |
|---|---|---|
| D1 | Filters live in **two places** (topbar dropdowns + module header toggles) with no visual connection | Users scan two rows to find a filter |
| D2 | Module toggles (Show All / Before Diag / Needs Diag) show **no counts** on desktop buttons (mobile drawer rows don't either) | Can't judge whether a filter is worth enabling |
| D3 | Bottlenecks count is duplicated (topbar button text + red badge in module) | Redundant info, adds noise |
| D4 | Stage dropdown lists **all 7 statuses** including the 2 hidden-by-default ones | Selecting "Cant Repair" while Show All is off is confusing (filter applies but column is hidden) |
| D5 | No **active-filter summary** anywhere on desktop — you must inspect each control | After applying 3 filters, state is hard to read at a glance |

### Mobile (drawer)
| # | Issue | Impact |
|---|---|---|
| M1 | Drawer toggles have **no counts** (Before Diag: n, Needs Diag: n, Bottlenecks: n) | Guesswork — enable a filter blindly |
| M2 | After closing the drawer only the **badge number** remains — no summary of WHICH filters | Re-opening to check = friction |
| M3 | **No search in the drawer**; topbar search is hidden <lg (desktop-only input) | Can't search tickets on the phone |
| M4 | Reset All appears **only when ≥1 filter is active** — fine, but no "clear single filter" affordance | Must reset everything or reopen drawer |
| M5 | Native select value is invisible when the select is styled dark/white contrast on some OEM browsers | Minor styling risk |

### Both
| # | Issue |
|---|---|
| B1 | Filter state is not **persisted** (leaving the tab resets everything) |
| B2 | No keyboard shortcut to open the drawer (desktop: ⌘K exists for search, none for filters) |
| B3 | Empty kanban state doesn't explain *why* (all columns empty vs filtered-out) |

## 4. Improvement Plan (prioritized)

### P0 — Readability of active state
1. **Active-filter summary chips** (desktop + drawer): a small chips row showing each applied filter, e.g. `Stage: Pending ✕` `Tech: Wai ✕` `>48h ✕` — one-tap clear each. Placed under the module header (desktop) and at the top of the drawer (mobile).
2. **Counts everywhere**: add counts to module buttons (desktop) and drawer toggle rows — `Before Diag Pending (2)`, `Show All (Cant:1)`, `Bottlenecks (3)`.

### P1 — Consistency & clarity
3. **Unify desktop filters**: move the module toggles (Show All / Before Diag / Needs Diag) into the topbar's filter group on desktop too — ONE place for filters; module header keeps only the title + ticket count + Reset. (Or group topbar filters into a desktop popover with the same layout as the drawer.)
4. **Stage dropdown respects Show All**: when Show All is off, hide Cant Repair / Customer Not Repair in the stage list (or label them "hidden — enable Show All").
5. **Search in drawer**: add a search input at the top of the drawer (mobile) bound to the same searchQuery.

### P2 — Polish
6. **Persist filter state** in sessionStorage per tab.
7. **⌘K-style shortcut** (desktop) to open filters, e.g. `F` key or ⌘⇧F.
8. **Filtered-empty state**: when filters hide everything, show "No tickets match your filters — Reset" instead of empty columns.
9. **Drawer footer**: sticky Reset + Done button at the bottom of the drawer (mobile) for clearer closure.

## 5. Suggested Target Layout

### Mobile drawer (P0 applied)
```
┌─ Pipeline Filters ─────────────✕─┐
│ [🔍 Search tickets…]            │
│ ── Active (2) ──                │
│ [Stage: Pending ✕] [>48h ✕]    │
│ ── Toggles ──                   │
│ [Bottlenecks (3)        On/Off] │
│ [Show All Stages (Cant:1) On/Off]│
│ [Before Diag (2)       On/Off]  │
│ [Needs Diag (0)        On/Off]  │
│ ── Selects ──                   │
│ [Stage ▾] [Technician ▾] [Date ▾]│
│ [Recycle Bin (2)]               │
│ ────────────────────────────────│
│ [        Reset All Filters     ]│  ← always visible, disabled when none
└─────────────────────────────────┘
```

### Desktop (P1 applied)
```
Topbar: Search | ⚙ Filters | Bottlenecks(3) | All Stages ▾ | All Techs ▾ | Date | Recycle | DB
Module: Active Pipeline Overview (n) · [Stage: Pending ✕] [>48h ✕] · Reset
Kanban: 5 columns (+2 with Show All)
```

## 6. Priority Summary
1. **P0**: active-filter summary chips · counts on toggles/buttons
2. **P1**: unify desktop filters · stage list respects Show All · drawer search
3. **P2**: persist state · keyboard shortcut · filtered-empty state · drawer footer
