Audit complete. All classes verified against the token system (index.css `@theme` + `html[data-theme="dark-slate"]` remaps) and compiled with the Tailwind v4 CLI to confirm validity. Report below.

---

# i35 ERP Audit — Intake + Pipeline (branch v1.1)

## IntakeWorkOrderModule.tsx

- [P1] [theme] Cards view "Ticket" icon hover effect is dead: `group-hover:scale-110 group-hover:bg-brand group-hover:text-white` (line 579) but the card wrapper (line 577) has no `group` class. Add `group` to the card className.
- [P2] [workflow] Stat chips lie for Technician users: `counts` (lines 154-162) are computed from `dateFilteredOrders` (all tickets), while the roster list is tech-filtered (lines 168-178) — chip counts show global numbers, not the tech's own list. Compute counts from the tech-filtered set.
- [P2] [workflow] Latent pagination reset bug: the page-reset effect (line 171) depends on `dateFilter`, which is a fresh object literal every render when uncontrolled (`localDateFilter`, line 93). Works today only because App.tsx always passes a stable `dateFilter`; if that prop is ever removed, every render resets the roster to page 1 and "Next" becomes unusable. Memoize `localDateFilter` or drop it from deps.
- [P2] [workflow] RUSH chip inconsistent: label "Urgent Priority" but `counts.rush` (line ~160) counts `Urgent` + `Warranty Redo` and misses `Rush`-priority tickets, while the toggled sort (`getPriorityWeight`) includes `Rush` (weight 4). Align count and sort.
- [P2] [theme] `getPriorityStyle` default (line 118): `border-line bg-white hover:border-line` — hardcoded `bg-white` (no dark-slate remap) and `hover:border-line` is a no-op (same as base border). Use `bg-surface` + `hover:border-line-strong`.
- [P2] [ui] Dead code: inner table empty-state `<tr>` (line ~315) is unreachable — the outer ternary already handles `filteredOrders.length === 0`.
- [P2] [theme] Systemic: all panels use `bg-white` (toolbar, roster panel, pagination footer, sticky header) — dark-slate remaps only `bg-white/50`, so these stay bright white in dark mode. Convert to `bg-surface`/tokens.

## CreateTicketSoloPage.tsx

- [P1] [workflow] Edit mode silently discards form changes — `baseWorkOrder?.X || stateX` pattern: `beforeDiagnostics: baseWorkOrder?.beforeDiagnostics || ...` (line 458) and `intakePhotos: baseWorkOrder?.intakePhotos || intakePhotos` (line 481). Any non-empty base array wins, so in edit mode: resetting diagnostics to N/A, clearing diagnostic notes, or deleting photos NEVER persists — deleting all photos even re-adds the old ones on save. Fix: in edit mode always prefer the live form state (e.g. `...baseWorkOrder, beforeDiagnostics: beforeDiagnostics.map(...), intakePhotos`).
- [P1] [workflow] `handleResetForm` (line 523) never resets `wizardStep` — after creating a ticket, "+ Create Another Ticket" reopens the form on step 4 (Diagnostic) with a blank ticket. Add `setWizardStep(1)`.
- [P2] [workflow] Gating is bypassable: step chips (line 698) let the user jump to step 4 with only `canNextStep()` (name+phone) checked, and `handleRegisterDevice` validates only name/phone/device/imei — so a ticket can be registered with 0 repairs and no diagnostics by chip-jumping, while the normal flow blocks "Next" at step 3 without a repair. Either allow repair-less tickets or enforce validation on the register path regardless of step.
- [P2] [theme] Invalid class `bg-warning/10/80` (line 1081) — double opacity compiles to NOTHING (verified with Tailwind v4 CLI). The "Choose Device Model First" empty-state box loses its background; fix `bg-warning/10`.
- [P2] [theme] Disabled "Next" button `bg-slate-300 text-slate-500` (line 1562) — raw palette, not dark-remapped (stays light gray on dark). Use `bg-line text-muted` or `bg-surface`.
- [P2] [theme] Scan button `bg-ink hover:bg-black` (line ~1015) — `hover:bg-black` raw; use `hover:bg-ink/90`.
- [P2] [workflow] Same `||`-pattern edge: `symptomsReported: extraReportedNotes.trim() || baseWorkOrder?.symptomsReported` (line 459) — clearing symptoms in edit resurrects the old text.
- [P2] [ui] Custom warranty: `if (days >= 0)` (line ~1750) accepts empty input (`Number('') === 0`) → saves "Custom 0 Days Warranty". Require `days > 0`.

## StatusPipelineView.tsx

- [P2] [workflow] Same-column drop corrupts data: `onDrop` (line 722) calls `onUpdateWorkOrderStatus(draggedWoId, stage.id)` with no same-status guard. Dropping a card back on its own column fires a spurious "Status Updated" toast AND bumps `updatedAt` — silently resetting the 48h stagnation/bottleneck clock. Guard with `if (targetWo.status !== stage.id)`.
- [P2] [workflow] `statusFilter` set to a hidden exception stage (Cant Repair / Customer Not Repair) with `showAllStages=false` renders ZERO columns (line 692 filter excludes the requested stage) — empty board despite matching tickets, with no recovery hint except "Show All". Force `showAllStages` true (or clear the filter) when the filtered stage is hidden.
- [P2] [ui] Dead code: Assign Technician modal + `handleAssignTechnician` (lines 227, 412-434, 1059) are unreachable — nothing ever calls `setAssignTechModalWo(wo)`; the ⋯ menu has no "assign" option. Wire it into `handleCardMenuAction` or delete.
- [P2] [theme] Invalid double-opacity classes `bg-warning/10/20` (line 814) and `bg-purple/10/20` (line 816) compile to nothing — before/after-diag-pending cards lose their tinted background (only the left border shows). Fix `bg-warning/10` / `bg-purple/10`.
- [P2] [theme] Raw palette classes bypassing tokens (not all dark-remapped): `border-blue-700` (599), `border-purple-700` (619), `border-red-600` + `bg-danger/100` (624), `hover:border-amber-500` / `ring-amber-400/30` (281, 289), `hover:border-rose-400` (293), `hover:border-orange-400` (295), `hover:ring-slate-400/20` (default), `border-l-amber-500`/`border-l-purple-600` (814/816), `bg-slate-600` (1311). Use tokens: border-warning, border-danger, border-ink, bg-ink, etc.
- [P2] [theme] Kanban cards are `bg-white` (getCardStyle, ~281-297) inside columns `bg-white/50` — dark-slate remaps only the column, so cards stay stark white on dark columns. Convert cards to `bg-surface`.
- [P2] [theme] Scroll fade `from-white/70` (line ~975) stays light in dark mode (only `bg-white/50` is remapped). Use `from-surface/70`.
- [P2] [workflow] After-diag "Mark All Pass" (line ~1318) overwrites every item's note with `'QA Passed'`, clobbering existing fail notes. Only set the note when empty.

## StatusBadge.tsx

- [P2] [theme] `dotColor = 'bg-surface0'` (lines 36, 100, 107) — `surface0` is not a defined token (verified in index.css/carbon-coat.css), class compiles to nothing → the status dot is invisible for default/'Taken Out' badges. Fix: `bg-faint` or `bg-line`.
- [P2] [theme] `pingColor` raw palette (`bg-blue-400`, `bg-emerald-400`, `bg-rose-400`, `bg-slate-400`, `bg-purple-400`, lines 46-83) — dead code today (`isPulsing` never true), but would clash with dark theme if enabled. Use token equivalents.

## PriorityBadge.tsx

- Clean. Token-only classes; no bugs found.

## CustomDropdownMenu.tsx

- [P2] [ui] `custom-scrollbar` (line 143) is never defined in any CSS — the option list silently uses the default scrollbar (same bug in UserRoleSwitcher.tsx:113). Define the utility or drop the class.
- [P2] [theme] Menu panel `bg-white` (line ~139) and trigger `bg-white` (line ~175) — not dark-remapped; dropdowns stay white in dark-slate. Use `bg-surface`.

---
**Verified non-bugs (checked, no action):** `bg-danger/100` compiles fine; modal `bg-slate-900/50` scrims are intentionally dark in both themes; `PriorityBadge` 'Rush'→'Urgent' display is intentional; `text-teal`/`text-faint`/`text-success-deep` are real tokens; the intake pagination works in production because App.tsx passes a stable `dateFilter`.