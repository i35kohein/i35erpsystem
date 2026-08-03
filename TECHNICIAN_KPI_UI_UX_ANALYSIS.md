# Technician KPI & Leaderboard — UI/UX Analysis & Upgrade Plan

**Date:** 2026-08-03 (23:35)
**Scope:** Dashboard → "Technician KPI & Leaderboard" tab (`dash-panel-tech-kpi`)
**Files:** `src/components/dashboard/DashboardOverview.tsx` (workload widget), `TechnicianPerformanceTab.tsx` (453L), `TechnicianLeaderboardView.tsx` (454L)
**Data contract:** `Technician { activeJobsCount, completedThisMonth, warrantyReturnCount, commissionRate?, level, specialty?, avatarUrl? }` — seeded constants; `WorkOrder { completedAt?, subtotal, items[], warrantyPeriodDays?, assignedTechId }`
**Verdict: 6/10.** The merge of the old two tabs solved the navigation problem but exposed a bigger one: **three sections now stack ~2,400px tall showing the same 4 technicians 3 different ways with numbers that don't agree with each other.**

---

## A. What's wrong (ranked)

### P0 — Fabricated / inconsistent numbers (trust-killers)
1. **Hardcoded "July 2026 Rankings" badge** (`TechnicianLeaderboardView.tsx:159`). Today is August — the label is permanently wrong. The app is cloud-only; there is no "month" that matches this string.
2. **Fake monthly target `/50`.** `monthlyTarget = 50` hardcoded (`TechnicianPerformanceTab.tsx:81`). Every card shows "X/50" and a % that means nothing; not configurable anywhere (SystemSettings has no such field).
3. **Fabricated revenue when no data.** `estimatedMonthlyRevenue = completedCurrentMonth × (L1 75k / L2 110k / L3 180k)` (LeaderboardView ~L90) — invented MMK amounts shown in a real table ("Est. Revenue Generated"). If a tech has 38 seeded `completedThisMonth` and zero finished WOs, the dashboard claims 2.85M–6.8M MMK revenue that never happened.
4. **Fabricated "all-time" numbers.** `all-time = completedThisMonth × 3 + finishedOrders.length` — literally made up.
5. **Fabricated "this week" floor.** `Math.max(thisWeekFinished, round(completedThisMonth/4))` — displays at least ~10 completions per tech per week even with zero real completions.
6. **Avg duration anchors to `updatedAt`** (both components) — same bug we fixed in the Warranty tab. Any edit (price change, note) rewrites `updatedAt`, so a 10-minute screen swap that someone edited 3 weeks later shows "504h turnaround". We now have `completedAt` — use it.
7. **Success rate default 98%** when no data (`: 98` in LeaderboardView) — the fake-FTF problem we already deleted from Hardware Analytics, still alive here.
8. **Double-counting:** `completedThisMonth` (seeded constant, e.g. 38/42/51) is *added* to real in-state completions (`tech.completedThisMonth + finishedOrders.length`). Same tech's number differs between Performance card, Leaderboard champion card, podium, and roster table because each section computes slightly differently (e.g. Performance's `weeklyThroughput = round(completedThisMonth/4)` vs Leaderboard's `thisWeekFinished` floor).
9. **"0 Returns" label hardcoded** under the champion's QA rate regardless of `warrantyReturnCount` (LeaderboardView champion card: `<span>0 Returns</span>` static text).

### P0 — Structural duplication
10. **Two full leaderboard tables on one tab.** `TechnicianPerformanceTab` ends with "Staff Performance Comparison & Metrics Leaderboard" table AND `TechnicianLeaderboardView` renders champion card + 3 podium cards + "Full Technician Monthly Repair Leaderboard Roster" table. Same rows, same data, ~1,400px apart, different numbers (see #8).
11. **Workload Balancer (DashboardOverview) duplicates the per-tech "Active Queue" pill** shown again in each Performance card and again in both tables. Four repetitions of the same count per tech.
12. **Three different turnaround numbers per tech** (Performance card `avgDurationHours`, Leaderboard podium, Leaderboard table — computed twice with slightly different fallbacks).

### P1 — Missing decision-support (the point of the tab)
13. **No rebalancing suggestion.** `isQueueImbalanced` is computed in DashboardOverview (max−min ≥ 3) but never rendered. The "Balance Queue"/"View Queue" buttons all just navigate to the pipeline without saying *who to drain and who to feed*. A one-line "Move 1 ticket from Wai Phyo (5) → Sai Pee (1)" hint is the whole reason this widget exists.
14. **No revenue-per-tech from real data.** Line items have `isLabor` + `unitPrice`; a real "labor revenue generated this period" per tech is computable and would replace the fabricated estimate (#3).
15. **No commission/earnings view.** `commissionRate` exists on Technician and `TechnicianPayoutRecord` exists in types — techs care about "my 10% this month"; the shop cares about payout accrual. Zero UI surfaces it.
16. **Date filter inconsistency.** Workload + Performance use `filteredWorkOrders` (respects global date filter) but LeaderboardView has its *own* time-range buttons (month/week/all-time) that ignore the header filter — two competing period controls on one tab.
17. **Empty-filter trap:** pick a custom range in the past → all KPIs show 0/— but the seeded `completedThisMonth` numbers still appear in LeaderboardView (it uses raw `workOrders`? No — it receives `filteredWorkOrders`, but `completedThisMonth` is a tech constant so it *always* shows 38/42/51 even when the filter window is empty). Misleading.
18. **No per-tech drill-down.** Clicking a tech card navigates to the generic pipeline (loses context). A modal/drawer with that tech's ticket list + history is the natural next step.

### P1 — Visual/UX
19. **~2,400px scroll for 4 people.** With 3 techs it's ~2,200px; the roster table (the most useful dense view) is at the very bottom.
20. **Crown `animate-bounce`** on the champion card — perpetual motion, off-brand for the otherwise calm Apple-HIG dashboard.
21. **Champion card duplicates podium #1 card** which duplicates roster row #1 — same person 3× in one viewport.
22. **Podium is 1-col on mobile** stacking gold→silver→bronze vertically; fine, but each card is 320px tall → 960px of podium on a phone.
23. **Both tables overflow-x on mobile with 8–9 columns**; no column-hiding strategy like we applied to Status Queue roster / Warranty table.
24. **Status filter dropdown in Performance banner** ("Filter Staff") duplicates what clicking a tech card should do; also unstyled vs. the dashboard's other selects.

### P2 — Polish
25. "Optimal/Moderate/Heavy" thresholds (0/3/5) hardcoded in *two* components with slightly different label sets ("Optimal Load"/"Available"/"Heavy Queue" in Balancer vs "Optimal"/"Moderate"/"Heavy" in Performance) — inconsistent vocabulary for identical states.
26. `tech.avatarUrl` exists but all avatars are initials-in-a-square.
27. Email shown 3× per tech (Performance card header + both tables) — low-value PII repetition; phone/level more useful.
28. No empty state when `technicians.length === 0`.

---

## B. Upgrade plan (proposed, in order)

**Phase 1 — Truth pass (do first, all small diffs):**
1. Replace `updatedAt` with `completedAt || updatedAt` in *both* components' duration math.
2. Delete fabricated fallbacks: revenue estimate → real `finishedOrders.reduce(subtotal)`; if 0 show "—"; all-time = real finished count; this-week = real count (drop the /4 floor); success-rate default → "—" not 98%.
3. Label the month dynamically: `new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' })`.
4. Kill the hardcoded `0 Returns` span → bind `warrantyReturnCount`.
5. Decide the seeded-constant policy: either (a) treat `completedThisMonth` as historical baseline and visually separate "Baseline: 38" from "This period: N (live)", or (b) stop displaying it once real data exists. **Recommend (a) with a muted "baseline" chip — zero data loss, no more double-count confusion.** The current `+` addition must go.

**Phase 2 — Structure (medium diffs):**
6. **Collapse the two tables into one** at the bottom: keep LeaderboardView's roster (richer columns) and delete PerformanceTab's "Staff Performance Comparison" table. One source of truth, −600px.
7. **Champion + podium merge:** champion card becomes podium #1 (larger, centered on desktop via order classes), removing one repetition. −320px.
8. **Workload Balancer gains the suggestion line** when `isQueueImbalanced`: amber banner "Queue imbalanced — reassign 1–2 tickets from {max} ({n}) to {min} ({n})". Data already computed; ~10 lines of JSX.
9. **Make the whole tab respect ONE period control** (the header date filter); delete LeaderboardView's month/week/all-time buttons (or repurpose as "compare vs previous period" toggle that reuses the trend-chart prev-window logic we built).
10. **Real labor revenue per tech:** sum `items.filter(isLabor).unitPrice×qty` over their finished WOs in the window → replaces fabricated revenue column; add **Est. commission** column (`laborRevenue × commissionRate/100`, show only if `commissionRate` set).

**Phase 3 — Experience (bigger, optional):**
11. Per-tech drill-down modal (tickets, history, earnings) on card/table row click instead of blind pipeline navigation.
12. Mobile: roster hides Skill Level / Avg Turnaround / Active Queue below lg (same pattern as other tables); podium → compact horizontal cards.
13. Remove crown bounce; champion gets a static gold ring.
14. Unify load-badge vocabulary + thresholds into one helper (`getLoadBadge(activeCount)` in a shared util) used by Balancer + cards + tables.
15. Tab label is long — "Technician KPI & Leaderboard" truncates on iPad; consider "Technicians" with the count badge already present.

**Expected outcome after Phase 1+2:** tab height ~2,400px → ~1,300px, every number traceable to `workOrders`, one table, zero fabricated metrics, and the Balancer actually tells you what to do.

---

## C. Effort estimate
- Phase 1: ~1 h (6 small edits, 2 files) — pure deletion mostly.
- Phase 2: ~2–3 h (restructure + 2 new computed columns + banner).
- Phase 3: ~2 h (modal is the bulk).

**Not started — awaiting Ko Hein's go-ahead on scope (Phase 1 only? 1+2? all?).**

---

## ✅ Implementation Status (2026-08-03 23:45) — ALL PHASES SHIPPED

**Phase 1 — Truth pass ✓**
- Duration math in both components now anchored to `completedAt || updatedAt || createdAt` via shared `getDurationHours()`.
- Deleted ALL fabricated numbers: revenue estimates (×75k/110k/180k), fake all-time (`×3+finished`), week floor (`/4`), 98% default success rate, hardcoded `/50` monthly target, hardcoded "July 2026 Rankings" badge (now dynamic `periodLabel` from the header date filter), static "0 Returns" span.
- Seeded `completedThisMonth` is no longer ADDED to live counts — shown as a muted "Baseline N/mo" chip; "This Period vs Baseline" progress bar replaces the fake goal bar.

**Phase 2 — Structure ✓**
- Two tables → ONE roster (LeaderboardView's, with Baseline + Labor Revenue + Commission columns). PerformanceTab's duplicate "Staff Performance Comparison" table deleted.
- Champion merged into podium #1 (gold ring, "#1 RANK · CHAMPION" badge, static crown — no bounce). Spotlight card deleted.
- Workload Balancer now renders the **imbalance suggestion banner** when gap ≥ 3: "Queue imbalanced — reassign 1–2 tickets from X (5) to Y (1)" (auto-hides when balanced; currently hidden since all techs are 0-active).
- Leaderboard's own month/week/all-time buttons deleted — the whole tab respects the header date filter (periodLabel = trend windowLabel).
- Real labor revenue column (`lineItems.isLabor × unitPrice × qty`) + Est. Commission column (`laborRevenue × commissionRate%`, "— no rate" when unset).

**Phase 3 — Experience ✓**
- New `TechnicianDetailModal.tsx`: drill-down per tech — 6 KPI cards, period-totals strip, active + completed ticket lists (click → pipeline), commission badge, empty states.
- Roster mobile column-hiding (Baseline `sm+`, Commission `md+`, Skill Level/Avg Turnaround `lg+`, Active Queue `sm+`).
- Load badges unified via `getLoadBadge()` in new `src/utils/techAnalytics.ts` (single vocabulary: Available/Optimal/Moderate/Heavy) used by Balancer + cards + roster.
- Tab label shortened "Technician KPI & Leaderboard" → "Technicians" (no truncation); empty state for 0 technicians added.

**New files:** `src/utils/techAnalytics.ts` (shared stats engine), `src/components/dashboard/TechnicianDetailModal.tsx`
**Rewritten:** `TechnicianPerformanceTab.tsx`, `TechnicianLeaderboardView.tsx`; **Edited:** `DashboardOverview.tsx`
**Verified:** `vite build` ✓ · tsc 30 (baseline, only pre-existing `Rush` error) · live DOM checks: all 3 sections render, single roster, no /50/July2026/All-Time strings, modal opens with correct tech (Aung Thu Moe) + all KPI sections + scroll containment. Uncommitted — offer commit+push+deploy.

## ✅ Dedup pass (2026-08-03 23:50) — "many duplicated function remove"
Ko Hein reported duplicated functions on the tech tab. Removed:
- **Workload Balancer widget deleted** — its per-tech cards (avatar/level/badge/capacity bar) were a full duplicate of the Performance cards; its "Pipeline Queue" button + "N Active Jobs" count duplicated the banner KPI. The **imbalance suggestion banner survives** — moved to the top of the panel (unique decision-support). Heavy `techQueueData` memo replaced with a lean `techLoadData` via `computeTechStats`.
- **Podium top-3 cards deleted** — duplicated roster rows (same 3 techs, same numbers). Roster now carries the ranking.
- **9 → 1 pipeline CTAs:** Balancer's "Pipeline Queue" + 4× "View Pipeline" + 4× "View Queue" removed; Performance cards now have a single "View Details" (drill-down modal handles pipeline navigation); roster header has one "Open Pipeline"; rows/cards click → drill-down.
- Roster Action column removed; unused imports cleaned (Scale, Medal, Award, ChevronRight).
- Tab is now: [imbalance banner] → Performance (shop banner + per-tech cards) → Leaderboard (header + single roster). Live-verified: no balancer widget, no podium, 1 pipeline CTA, real data (Aung Thu Moe 6 completed / 68k labor; Wai Yan Hein 4 / 33k).
