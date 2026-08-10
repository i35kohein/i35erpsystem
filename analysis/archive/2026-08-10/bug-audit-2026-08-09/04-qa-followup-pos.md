# i35 ERP Audit — QA / Follow-Up / POS (branch v1.1)

## src/components/qa/QualityAssuranceModule.tsx

- [P1][workflow] `matchesStatus = statusFilter === 'ALL' || statusFilter === 'Pending QA'` — the module receives the DASHBOARD-SHARED `statusFilter` (App.tsx:2539), so any filter other than ALL/Pending QA (e.g. "Finished", "Paid", "In Progress") silently empties the whole QA roster. Line 72-74. Fix: treat unrelated filters as ALL, or accept 'Finished'/'Taken Out'.
- [P1][workflow] After "Confirm QA Pass", the parent stamps `postRepairChecklist` → the order drops out of `finishedWorkOrders` → `useEffect` (line 93-95) retargets `selectedWoId` to the next ticket → the still-open modal **jumps to a different ticket** mid-edit, or closes itself when the queue is empty. Lines 93-95 + 244-250. Fix: close the modal on save, or lock `selectedWo` while open.
- [P1][workflow] Roster includes 'Taken Out' orders (line 48), but App.tsx `handleSavePostRepairChecklist` (App.tsx:1400) forces `status: 'Finished'` — QA on an already paid/picked-up order regresses it from Taken Out → Finished. Fix: preserve 'Taken Out' in the parent handler.
- [P2][workflow] `handleSaveQaPass` has no `canConfirm` guard — only the button is disabled; a programmatic/enter-triggered call saves without any verdict or photo. Line 244. Fix: early-return when `!canConfirm`.
- [P2][ui] The 'Cant Test' note `<p>` is rendered inside the name/⋮ flex row (line 641) — on the lg 6-col grid the card is ~100px wide and the note crowds/overlaps the name and ⋮ button. Fix: render the note as its own line below the row.
- [P2][theme] Raw palette bypassing tokens: `bg-slate-300 text-slate-500` disabled Confirm (456), `bg-slate-900/50` modal overlay (418), `bg-slate-900/40` comment overlay (671), `bg-black/70` photo-remove buttons (492, 532). Use `bg-muted/…`, `bg-surface`, `bg-line-strong` + tokens. (`bg-white` here is fine — remapped by data-theme.)
- [P2][ui/dead] "Ready" badge branch unreachable: roster excludes WOs that have a checklist (line 48), so `isQaPassed` (302) is always false at 364.

## src/components/followup/CompletedDeviceFollowUpModule.tsx

- [P2][workflow] Date filter uses `wo.updatedAt || wo.createdAt` (line 104) — every follow-up log bumps `updatedAt` (line 197), so a logged ticket jumps to "today" in the date filter, contradicting the completedAt-stable-anchor design stated at line 39-42. Fix: use `wo.completedAt`.
- [P2][workflow] Avg Rating shows **'5.0'** with zero rated orders (line 129-134) — a fake perfect metric on a fresh shop. Fix: show '—' / 'No ratings'.
- [P2][workflow] 'Closed' status exists (badge 214, option 609) but has no filter tab and Closed tickets stay in the "Due for Follow-Up" list forever — nothing ever removes a ticket from the roster. Fix: add Closed tab / exclude Closed.
- [P2][theme] `bg-purple/10/70` (line 298) — **invalid double opacity**; class generates nothing → 1-Month card has transparent background. Fix: `bg-purple/10` or `bg-purple/15`.
- [P2][theme] Default-palette classes bypassing design tokens (won't remap in dark-slate): `border-indigo-200` (288), `bg-violet-50/80 border-violet-200 text-violet-800` (308), `bg-violet-100 text-violet-900 border-violet-300` (443), `bg-gray-100 text-gray-700` (455), `border-sky-200` (224, `bg-sky/10 text-sky` are fine), `fill-amber-400 text-slate-300` (330/642). Replace with `bg-purple/10 border-purple/30 text-purple`, `bg-line text-muted`.
- [P2][ui/dead] The `<7 days` badge branch (455, "Today") is unreachable — roster is ≥7 days by construction (line 64).

## src/components/pos/PosInvoicingModule.tsx

- [P1][workflow] Split-payment method string has literal `{currency}` text: `` `${s.method}: ${s.amount.toLocaleString()} {currency}` `` (line 393) — the recorded/printed method reads "KBZ Pay: 50,000 {currency}". Fix: `` ${currency} ``.
- [P1][workflow] No underpayment guard: "Confirm & Print" (1370) is enabled with cash tendered < total (even 0), and split sums < total are only shown as "Short" — `handleProcessPayment` (383-406) validates only that ≥1 split amount > 0. Order gets marked PAID for less than due. Fix: block confirm (or require explicit override) when tendered/split sum < `totalAmount`.
- [P1][workflow] Paid orders remain payable: `handleMarkPaid` (App.tsx:1365) sets isPaid+Taken Out, but the filter (233-237) still passes them under default 'ALL', the queue shows "PAID", and "Pay & Print" stays fully enabled → **double-charge possible** on a re-select. Fix: disable Pay when `wo.isPaid` or exclude paid from default view.
- [P1][workflow] "Diagnostic Fee Only" banner (622-650) is unreachable — the filter at 233 hard-excludes 'Cant Repair'/'Customer Not Repair', so `selectedWo` can never have those statuses. Dead feature. Fix: allow those statuses into the filtered set (or move the action elsewhere).
- [P2][workflow] Collapsed-queue ticket click (564) only calls `setSelectedWoId` and **skips the cash/split reset** that expanded-row `handleSelectWo` does (486-492) — previous customer's tendered cash / split amounts leak into the next checkout when the queue is collapsed. Fix: extract and share the reset.
- [P2][workflow] Initial split row method `'KBZPay'` (line 220) doesn't match real method names ('KBZ Pay') — the select shows no selected option, and typing an amount records an invalid 'KBZPay' method (line 393). Fix: default to `activePaymentMethods[1]?.name || 'Cash'` (as done at 492).
- [P2][workflow] `handleApplyDiagnosticFeeOnly` (412-435) wipes all existing `lineItems` and can produce a **negative total** (no `Math.max(0, …)` when discount+deposit > fee). Fix: clamp + preserve/annotate items.
- [P2][ui] `selectedWo` falls back to `filteredWorkOrders[0]` (line 253) while the left queue still highlights the stale `selectedWoId` — right panel and highlight desync when the selected ticket leaves the list. Fix: sync `selectedWoId` in an effect.
- [P2][theme] Invalid double opacity: `bg-purple/10/80` (919), `bg-purple/15/70` (937) → transparent backgrounds. Fix: single opacity. Also `bg-slate-900/50` overlays (1290, 1379), `from-white/70` fade (735), `hover:bg-purple-200` (941) — default palette, use tokens.

**Cross-cutting note:** `bg-white` usages are fine (remapped via data-theme); the theme bugs are the raw slate/violet/gray/sky-200/amber-400 classes and the three double-opacity `bg-purple/…/…` classes which silently fail to render.