# Mobile Filter Drawer (Side Menu) — UI/UX Analysis & Improvement Plan

> Component: `src/components/common/RightFilterDrawer.tsx` + `renderMobileFilters()` in App.tsx
> Used by: intake, pipeline, inventory, pos, crm, suppliers, qa, finance, dashboard (9 modules)
> Measured live at 390 / 768 / 1024 / 1440 (2026-08-06 00:05). Score: **7.5 / 10**

---

## 1. Current Structure

```
⚙️ Filters button (topbar, <lg) — badge = active filter count
   └─ RightFilterDrawer (portal → document.body)
      ├─ Backdrop (bg-black/45, backdrop-blur, click = close)
      └─ Panel (right slide-in, w-[300px] max-w-[85vw], full height)
         ├─ Header: title ("Pipeline Filters"…) + ✕ close
         └─ Body (overflow-y-auto, safe-area bottom):
            ├─ [Active (n) chips section] (P0, when filters on)
            ├─ Toggle rows (Bottlenecks / Show All / Before Diag / Needs Diag — pipeline)
            ├─ Native selects (Stage / Technician / Category / Tier / Account Type)
            ├─ Date filter
            ├─ Recycle Bin (intake/pipeline)
            └─ Reset All Filters (when active)
```

## 2. What Works Well ✅
- **Portal rendering** — no clipping inside transforms/overflow ancestors.
- **Backdrop + ESC + ✕ + backdrop-click** — four standard close paths.
- **Slide animation** 300ms ease-out with `translate-x-0 / translate-x-full` — cheap GPU transform, no layout thrash.
- **Safe-area bottom padding** on the body.
- **Native `<select>`s** — mobile OS pickers, no custom-menu clipping; instant apply (no Apply step).
- **Per-tab content** — each module only shows its relevant filters; titles match the tab.
- **Active-count badge** on the trigger button — signals "you left filters on".
- **P0 chips** — active-filter summary + one-tap clear (added this session).
- Counts on pipeline toggles.

## 3. Issues Found

### Interaction & behavior
| # | Issue | Impact |
|---|---|---|
| I1 | **Body scroll is NOT locked** while the drawer is open — the page scrolls behind the panel | Scrolling while a filter is open feels broken; kanban moves behind the sheet |
| I2 | **No focus management**: focus stays on `<body>`; no initial focus into the panel, no focus trap, focus is not returned to the Filters button on close | Keyboard/screen-reader users lose their place; Tab can escape into the page behind |
| I3 | No swipe-to-close gesture on the panel edge | Feels less "native" on iOS-style drawers (minor) |
| I4 | Panel stays open after applying filters (good) but there is **no "Done" affordance** — close is only ✕/backdrop/ESC | Users look for a bottom action to confirm/close |
| I5 | Backdrop-blur on the scrim can be expensive on low-end Android while dragging | Perf jank on budget devices |

### Layout & sizing
| # | Issue | Impact |
|---|---|---|
| L1 | Panel is **w-[300px] fixed** (max-w-85vw) — on 360px phones it covers 83% of the screen; the live kanban behind is nearly invisible | Context loss; users can't see results change until closing |
| L2 | On **iPad portrait (768-1023)** the drawer still slides over a wide screen where filters could fit inline | Drawer feels oversized for tablets; also the lg breakpoint (1024) means 768-1023 use the drawer even though space exists |
| L3 | Drawer body has no **sticky footer** — Reset All scrolls with content | On long filter lists (inventory categories) Reset is out of reach |

### Content & clarity
| # | Issue | Impact |
|---|---|---|
| C1 | No per-toggle **"what this does"** microcopy (except pipeline rows) | Category/Tier selects are self-evident, but OK; minor |
| C2 | Active chips section appears only when ≥1 filter is on — **no empty-state hint** on first open | Users don't discover that filters are summarized there |
| C3 | Recycle Bin row inside the drawer navigates away (closes drawer, opens modal) — abrupt | Slight context jump; acceptable |

### Accessibility
| # | Issue |
|---|---|
| A1 | Panel has no `role="dialog"` / `aria-modal` / labelled-by the title |
| A2 | No focus trap / initial focus (I2) |
| A3 | Close button has aria-label ✓, but the backdrop div is not `aria-hidden`-managed for screen readers (wrapper has aria-hidden={!open} — ok) |
| A4 | Reduced-motion users get no `motion-reduce` fallback for the slide |

## 4. Improvement Plan (prioritized)

### P0 — Feel native & locked
1. **Lock body scroll** while open: set `overflow: hidden` on the scroll container (`#main-content-scroll`) in a `useEffect` on `open`, restore on close. (One-liner, big feel win.)
2. **Focus management**: on open → focus the panel (tabIndex=-1) or the close button; on close → return focus to the Filters trigger (pass a `triggerRef` or use a data-attribute). Add `role="dialog"` + `aria-modal="true"` + `aria-labelledby`.

### P1 — Sizing & closure
3. **Responsive width**: `w-[min(85vw,320px)]` (phones) instead of fixed 300 — or expose a `width` prop; on ≥768 keep it narrower (280px) since tablet space exists.
4. **Sticky footer** inside the drawer body: `Reset All Filters` pinned bottom + a **"Done"** button that closes the drawer (both in one footer bar). Reset disabled when nothing active.
5. **motion-reduce**: `motion-reduce:transition-none` on the panel.

### P2 — Polish
6. Swipe-to-close on the panel edge (touch handlers) — optional, larger effort.
7. Empty-state hint in the chips area: "No active filters — use the options below" on first open.
8. Consider showing the drawer on tablets as a **right column panel** (lg- boundary split) instead of an overlay — bigger architectural change; revisit after P0/P1.
9. Optional: keep drawer open state per-tab (sessionStorage) so reopening shows last used filters.

## 5. Target Layout (mobile 390 after P0+P1)

```
┌─ Pipeline Filters ──────────────✕─┐
│ [🔍 Search…]          (P1 add)   │
│ ── Active (2) ──                 │
│ [Stage: Pending ✕] [>48h ✕]     │
│ ── Options ──                    │
│ [Bottlenecks (3)       On/Off]   │
│ [Show All (2)          On/Off]   │
│ [Before Diag (3)       On/Off]   │
│ [Needs Diag (1)        On/Off]   │
│ [Stage ▾] [Technician ▾] [Date ▾]│
│                                 │
│ ──────────────────────────────── │
│ [Reset All (disabled when off)]  │
│ [            Done → close       ]│  ← sticky footer
└──────────────────────────────────┘
  (body scroll locked, focus in panel, focus returns on close)
```

## 6. Priority Summary
1. **P0**: lock body scroll · focus trap + role=dialog + return focus
2. **P1**: responsive width · sticky footer (Reset + Done) · motion-reduce
3. **P2**: swipe-close · empty-state hint · tablet right-panel variant · per-tab persistence
