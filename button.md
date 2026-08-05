# Button UI/UX Audit & Mobile Upgrade Plan (i35 ERP)

> Scope: all buttons across modules, with a focus on mobile (≤640px) rendering.
> Source files reviewed: `src/components/ui/button.tsx` (design system), all module components under `src/components/`.

---

## 1. Current Design System (`ui/button.tsx`)

```ts
base:  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl
        text-xs font-bold ... cursor-pointer active:scale-95"
sizes:
  default: "h-9 px-4 py-2"          // 36px tall
  sm:     "h-8 rounded-lg px-3 text-xs" // 32px tall
  lg:     "h-11 rounded-xl px-8 text-sm" // 44px tall (EXISTS but NEVER used)
  icon:   "h-9 w-9"                 // 36×36
```

### Findings
- ❌ **`size="lg"` is defined but used **0** times** in the codebase. Modules that need a
  big button hand-roll raw `<button>` elements instead of using the system.
- ❌ Base height `h-9` (36px) and `sm` `h-8` (32px) are **below the 44px Apple HIG /
  48px Material minimum touch target** — hard to tap on phones.
- ❌ `icon` size is 36×36 — too small for thumbs.
- ✅ `whitespace-nowrap` is in the base — good, but many raw buttons don't inherit it.

---

## 2. Issues Found in Modules (mobile-first)

### 2.1 Inconsistent heights across the app
| Pattern | Height | Used in |
|---|---|---|
| `Button size="sm"` | 32px | Navigation.tsx, many modals |
| `Button size="default"` | 36px | Settings, generic actions |
| `py-2.5` raw button | ~42px | POS, Intake detail |
| `py-3` raw button | ~48px | Login, Portal, Pipeline, CreateTicket |
| `py-3` + `px-6/px-8` | ~48px, extra wide | Portal approve/reject, POS |

Result: identical *primary* actions are different heights depending on which file
you're in → visual inconsistency on the same screen.

### 2.2 Oversized buttons on mobile
- `CustomerFacingWebPortal.tsx:810,816` — `w-full px-5/px-6 py-3` (≈48px × edge-to-edge)
- `Pipeline/StatusPipelineView.tsx:1164,1298` — `w-full py-3`
- `auth/LoginPage.tsx:100` — `flex w-full py-3 text-sm` (fine as a lone CTA, but
  inconsistent with everything else)
- `common/CameraQrScannerModal.tsx:451` — `w-full py-3`
- `CreateTicketSoloPage.tsx:573,582,590` — `w-full sm:w-auto px-5 py-3` ✅ good pattern,
  but height still 48px vs 32px `Button sm` elsewhere on the same page

### 2.3 Long labels cause wrapping / crowding on small screens
- `+ Intake Ticket` button + icon + badge count in the sidebar.
- `Open Interactive Pipeline` (DashboardOverview) — long label + 2 icons, wraps on
  small widths.
- Portal buttons: `Approve & Continue` / `Decline / Request Changes` — long labels +
  `w-full` on mobile.
- Fix: `whitespace-nowrap` + `truncate`, or shorten label via responsive spans
  (`<span className="hidden sm:inline">full</span><span className="sm:hidden">short</span>`).

### 2.4 Raw `<button>` elements bypass the design system
~70% of action buttons are raw `<button>` with bespoke Tailwind strings. Any global
change (e.g. touch-target bump) requires editing every file. The `Button` component
is imported in most files already — low effort to migrate.

### 2.5 Inconsistent press feedback
- `active:scale-95` (design system, most raw buttons)
- `active:scale-98` (Portal)
- `active:scale-[0.98]` (Login)
- Some buttons have **no** active/pressed state at all.
- No `focus-visible:ring` on raw buttons → poor keyboard/a11y feedback.

### 2.6 Icon-only buttons too small
- `Button size="icon"` = 36px; sidebar close icon etc.
- Below 44px minimum. On touch devices these are the hardest to hit.

### 2.7 Full-width stacking creates tall action zones
Multiple `w-full` buttons stacked vertically (POS split-payment area, portal actions)
force the user to scroll through a wall of buttons. Prefer:
- `w-full sm:w-auto` (full width only on phones, inline on desktop)
- `grid grid-cols-2 gap-2` for equal-pair actions on mobile
- Sticky bottom action bar for multi-step flows (POS, Create Ticket)

---

## 3. Upgrade Plan (mobile-first)

### 3.1 Fix the design system first (`ui/button.tsx`)
```ts
sizes:
  sm:      "h-10 lg:h-8 rounded-lg px-3 text-xs"        // 40px mobile / 32px desktop
  default: "h-11 lg:h-9 px-4 py-2"                       // 44px mobile / 36px desktop
  lg:      "h-12 lg:h-11 rounded-xl px-6 lg:px-8 text-sm" // 48px mobile / 44px desktop
  icon:    "h-11 w-11 lg:h-9 lg:w-9"                     // 44px mobile / 36px desktop
base:  add "focus-visible:ring-2 focus-visible:ring-[#0071E3]/40
           focus-visible:outline-none"
```
This single change lifts every `Button`-based control above the touch-target
minimum **without touching module files**, while keeping desktop compact.

### 3.2 Replace raw buttons with the `Button` component
- Migrate: Login, Portal, Pipeline, POS, CameraQrScannerModal, CreateTicketSoloPage,
  IntakeWorkOrderModule.
- Use `size="lg"` for the **single primary CTA** on a mobile screen (login, save,
  approve, confirm payment), `size="default"` for secondary actions, `size="sm"` only
  for dense table/toolbar actions.

### 3.3 Standardize full-width behavior
- Primary CTAs: `className="w-full sm:w-auto"` (mobile edge-to-edge, desktop inline).
- Pairs (Confirm/Cancel): `grid grid-cols-2 gap-2` on mobile.
- Cap CTA width on large phones: `max-w-md mx-auto` so buttons don't span the whole
  screen unnecessarily.

### 3.4 Shorten labels on mobile
Use the responsive-span trick (already used in DashboardOverview):
```tsx
<Button>
  <span className="hidden sm:inline">Open Interactive Pipeline</span>
  <span className="sm:hidden">Open Pipeline</span>
</Button>
```
Plus `truncate` + `title` attribute for full text on hover/long-press.

### 3.5 Unify press & focus feedback
- `active:scale-95` everywhere (delete `scale-98` / `scale-[0.98]`).
- Add `focus-visible:ring-2 ring-[#0071E3]/40` to all raw buttons during migration.
- Keep `disabled:opacity-60` + `disabled:pointer-events-none`.

### 3.6 Sticky bottom action bar (mobile flows)
For POS invoicing, Create Ticket, Portal approval — move primary actions into a
fixed bottom bar with `pb-[env(safe-area-inset-bottom)]`:
- Always visible, no scrolling needed
- Frees the content area from a tall button stack

### 3.7 Audit checklist (after upgrade)
- [ ] No raw `<button>` left outside `ui/button.tsx` (or documented exceptions)
- [ ] Every tappable control ≥44px on mobile (measure with devtools)
- [ ] No button label wraps to 2 lines on 320px viewport
- [ ] `size="lg"` used exactly once per screen (primary CTA)
- [ ] Consistent `active:scale-95` + focus ring everywhere
- [ ] Icon buttons 44px+ on mobile
- [ ] Two-button groups use grid-cols-2, not stacked full-width
- [ ] Safe-area padding on sticky bottom bars

---

## 4. Priority Order
1. **P0 — Design system sizing** (`ui/button.tsx`) — one file, biggest impact.
2. **P0 — Login + Portal CTAs** (customer-facing, most-used on mobile).
3. **P1 — POS + Create Ticket** sticky action bars.
4. **P1 — Sidebar + topbar icon buttons** touch target.
5. **P2 — Migrate remaining raw buttons** + label shortening sweep.
