# Pipeline Card UI/UX Balance — Desktop (1440px) Focus Pass

Date: 2026-08-06 ~08:11 MMT (session, live ERP @ 1440×900)
Source commit: `12fff61` (clean tree), `src/components/pipeline/StatusPipelineView.tsx`

## Context
Round-3 (commit `b0f0761`) already fixed the big structural issues: 6→2 buttons per card, Age chips,
responsive snap-scroll, empty-column slim strips. This is a *card-level balance* pass — hierarchy,
alignment, encoding, contrast — on top of that greenfield work.

## Verified live measurements @ 1440×900
- Board: 5 visible stages (Receive/In Progress/Pending/Finished/Taken Out), each `259px` wide,
  `12px` gaps, flex-fills main band (56 → 1440). Last column right edge 1420 → 20px dead space. **No horizontal scroll on desktop, board is balanced.**
- Cards: all `231px` content width (`259px` col − 2×12px padding + borders). Variable height
  239–253px driven by repair-issue line-clamp-2. Grid-row wrapping is clean.
- Card typography scale: 9px (order # chip) / 10px (meta, tech, actions) / 11px (repair issue) /
  12px (model, customer, stage). Tight but legible.

## Issues found (priority-ordered)

### 🔴 P0 — HTML-entity string leaks raw into UI
`StatusPipelineView.tsx:816` →
```jsx
{hoursInStatus < 1 ? '&lt; 1h' : `${hoursInStatus}h`}
```
In JSX, an expression string is **not** HTML-decoded — React renders the literal `&lt; 1h`.
**Users see: `In stage: &lt; 1h`** (confirmed live in Receive/In Progress cards).
Same bug at :799 `'&gt;48h'` in the red "Bottleneck" banner → users see `Bottleneck (&gt;48h)`.
Fix: use `'< 1h'` and `'>48h'` (plain `<`/`>` are fine in JSX text/expressions), or `&#8211;`-free
unicode. (The header at :503 uses `'>48h'` correctly because it's inside a plain JSX text attribute
child, not a quoted string.)

### 🟠 P1 — Action-button visual weight inconsistent across stages
Primary action swaps hue + weight per stage while occupying the same slot:
- `Log` (Receive/In Progress): grey `bg-surface`, semibold blue text — reads as *secondary*
- `Notify` (Pending): purple `#7360F2` tint — reads as *tertiary-but-colored*
- `Checkout` (Finished): solid green (success), bold white — reads as *primary*

Same slot, three different perceived priorities. For a kanban, the stage-primary action SHOULD be
the loudest (it's "the next thing to do" for that column). Recommend: give `Log` and `Notify`
equal-tone treatment (filled/high-contrast) OR standardize all three as secondary outline buttons
with the color as the differentiator, keeping `Checkout` green since $ is the terminal payoff.

Also: button heights differ (`min-h-9` = 36px primary, `!h-10` = 40px ⋯ menu) → the ⋯ sits taller
than its row partner, throwing off baseline alignment.

### 🟠 P1 — Tech-assign control inconsistent
- Tech user: `Assign Me` (icon + text button)
- Manager: `CustomDropdownMenu` with `!h-7` (28px) ghost button

Two completely different interaction affordances for the same "assign" action, different heights
(28 vs 36px) in adjacent slots. Confusing muscle memory. Also `!h-7` at 28px is **below the 40px
touch floor** set in Round-2 mobile work — flag for touch, though this desktop pass is mouse.

### 🟡 P2 — Color-semantics mismatch on empty columns vs border accents
Cards get a colored `border-l-4` accent when a diag is pending (amber=before, purple=after). Column
headers carry `stage.color` ring/border. But the "Pending" column's orange `stage.color` has **no**
corresponding card accent — so the only colored-border signals on cards are the *diag-pending* ones,
which read as "this card is special" rather than "this is stage-coded." Not wrong, but the diag
accent can be mistaken for priority. Consider an explicit priority color chip (or keep diag accent
but ensure priority shows via the PriorityBadge *always*, which it does).

### 🟡 P2 — Variable card height, no min-height floor
Finished-column cards (245px) vs active (239–253px) — the "short" cards in a column look squashed
beside a taller neighbour, and drop-target affordance is uneven. Kanban-idiomatic heights are fine,
but a consistent `min-h` (e.g. 150–180px content) would make drag targets uniform. Empty columns
already collapse to 52/64px strips (good).

### 🟡 P2 — Metadata line-length headroom
`customerName • customerPhone` is a single `truncate` line; names like "Myat Noe Yu Ya Nwe •
09791223700" sit right at the 231px edge. At 1024px (col drops to 240px) this clips harder. Fine at
1440 but no safety margin for longer names / localized (Myanmar) names which are often longer.

### 🟢 P3 — Contrast nits
- `text-muted` on "Tech: / Duration" and customer line: light grey — borderline WCAG AA for the
  shop-floor glance. The value is `text-ink` (dark) so the key figure reads; the labels are the weak
  part.
- Empty-column `text-muted` vertical labels on white/50 blur: faint but acceptable.

## What's already GOOD (keep)
- Board fills width with zero dead space at 1440 (no scroll).
- 2 actions per card (stage-primary + ⋯ menu) — clean vs the old 6.
- Age chip amber≥24h / red≥48h semantics are correct and consistent with the Bottleneck banner.
- Empty columns collapse to slim vertical strips labelled `[writing-mode:vertical-rl]` — nice space
  saver, still a valid drop target.
- Card info hierarchy (model > customer > issue > tech) is logical and scannable.

## Recommended minimal fix set (quick)
1. **P0:** `StatusPipelineView.tsx:816` `'&lt; 1h'` → `'< 1h'`; `:799` `'&gt;48h'` → `'>48h'`.
2. **P1:** Align primary action heights → `!h-9` for ⋯ (or drop ⋯ to `min-h-9`) so the action row sits
   flat. Optionally tint `Log` with a stronger fill so stage-primary reads consistently.
3. **P2:** Add `min-h-[160px]` (or so) to non-empty card content so drag targets are uniform.
4. Consider bumping `text-muted` label contrast on customer/tech lines (~#667085 instead of current).
