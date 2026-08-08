# Kimi ERP — Dashboard UI/UX Analysis
**Date:** 2026-08-03 · **Scope:** `DashboardOverview.tsx` (1,916 lines) + embedded `TechnicianPerformanceTab.tsx` + `TechnicianLeaderboardView.tsx` (907 lines) · **Method:** Full code walkthrough (all 7 subtabs), data-logic audit, responsive + a11y check

> ## Implementation Status (2026-08-03)
> **Fixed (batch 1):** Warranty clock anchors to new `completedAt` field (stamped once on Finished/Taken Out in App.tsx — no longer resets on edits) · Revenue counts only Finished/Taken Out · Collected uses `isPaid`/`paidAmount`/`depositAmount` (kills the `depositPaid` TS error) · Ready for Pickup = Finished only · In-Progress chip labeled correctly · Avg Turnaround now a 4th KPI card (completed tickets only) · Fake "Run Re-Scan" replaced with honest live-monitor indicator · Queue roster hides Symptoms/Tech/Priority columns below lg; Warranty table hides dates below md.
> **Fixed (batch 2):** ✨ New **Revenue & Repairs Trend** chart on the Finance tab (dependency-free SVG: revenue bars + completed-repairs line, honors the header date filter, weekly bucketing for >90d ranges, **previous-period delta chips** + empty state) · **Summary cards moved above the tab bar** (always visible glance layer, deep-link into each subtab) · **Keyboard-accessible tabs** (`role=tablist`, Arrow/Home/End navigation, `aria-controls` on all 6 tabs + panels).
> **Still open (P2+):** bump 9–10px table text (mostly covered by global CSS floor) · decide dashboard-vs-module redundancy · convert remaining clickable divs to buttons.

> Companion to `UI_UX_AUDIT.md` (full app) and `RESPONSIVE_UI_UX_ANALYSIS.md`. This report is dashboard-only.

---

## Executive Summary

The dashboard is the strongest module in the app: **live queue badges, deep-linkable cards, a proactive warranty monitor, and real operational alerts** (bottlenecks, low stock, tech overload). The 7-subtab structure (Status Queue / Hardware Analytics / Tech KPI / Inventory / Finance / Warranty Watch) gives a genuine at-a-glance ops picture — the right mental model for a shop manager.

Two clusters of problems hold it back:

1. **Data-trust issues (🔴)**: some numbers are computed from the wrong fields or wrong statuses — "Ready for Pickup" counts already-collected tickets, revenue includes uncollectable statuses, "Total Collected" can read 0 for paid tickets, and the warranty clock *resets whenever a ticket is updated*. A dashboard users trust with money must get this right.
2. **No trends (🟠)**: everything is a static number + CSS bar. There is no time series anywhere — the date filter exists, but nothing compares periods. For a repair shop, revenue/throughput *trend* is the most valuable view there is.

Overall score: **7.5/10** — excellent structure and intent, let down by metric correctness and a few mobile gaps.

---

## 1. Information Architecture — ✅ Strong

- **7 tabs with live-count badges** (Active tickets, Low stock, % Margin, Flagged warranties) — badges turn the tab bar into a monitoring strip. Excellent.
- **Clear job-to-be-done per tab**: Queue (act on tickets) → Analytics (understand demand) → Tech KPI (balance staff) → Inventory/Finance (watch resources) → Warranty (proactive outreach). Mirrors the shop day.
- **Every section has a deep-link CTA** to the real module (Pipeline, POS, Inventory, CRM) — dashboard stays a glance layer, work happens in modules. Correct pattern.
- Empty states exist for every list/table. ✓

**Issues:**
- **7 tabs on mobile** = ~1.5 visible at a time in the horizontal scroll (no swipe affordance, no "more" fallback). Consider a 2-row wrap or a condensed icon-only tab strip on phones.
- Some tabs are **thin for their cost**: Finance tab = 6 static numbers (the Shop Finance module is far richer); Inventory tab = 3 numbers + low-stock cards. Either enrich them (trend sparkline, collection rate, aging) or merge — right now they read as "previews" but sit at the same navigation level as real modules, which is slightly confusing.
- Tab labels are long ("Technician KPI & Leaderboard", "Warranty Watch") — on 768px they scroll a lot.

## 2. Visual Design & Hierarchy — ✅ Good, ⚠️ dense

- Consistent Apple-style cards, semantic color coding (blue=ops, green=revenue/success, amber=warning, rose=critical, purple=analytics). Coherent.
- The **Warranty Watch hero** (dark slate→rose gradient, ping-dot scanner, glassy stat cards) is a genuine visual highlight — it makes urgency feel real. Keep.
- Ranked lists (Top Devices with medal circles 🥇🥈🥉, category cards with colored icons) are scannable and pleasant.

**Issues:**
- **Density overload on Status Queue tab**: 3 summary cards + bottleneck alert + 4 stage-progress bars + filter bar + 9-column table stacked vertically = a long scroll of competing attention. The prior audit counted 88 card elements on the dashboard. Recommend: collapse the stage-progress bars into the summary row, and consider making the roster table the *only* full-width element.
- **The 3 summary cards are no-ops where they sit** — they render *inside* the Status Queue tab and their onClick just re-selects that same tab (+ reset filter). "View Queue" is a dead link on the tab it lives on. They'd be far more useful **above the tab bar** (always visible, deep-linking into each subtab), which was clearly the original intent.
- Table header text is `text-[10px] uppercase` and row labels go down to `text-[9px]` (Paid/Unpaid chips) — below the readability floor the app set for itself. These specific spots should be bumped to 11–12px.

## 3. Metric Correctness — 🔴 Needs Fixing (most important section)

| # | Metric | Problem | Fix |
|---|---|---|---|
| 3.1 | **Ready for Pickup** card | `readyForPickup` includes `Taken Out` — tickets **already collected** still count as awaiting pickup. Card is inflated. | Filter `status === 'Finished'` only; show Taken Out as its own count if useful. |
| 3.2 | **"In Progress"** chip on Active Repairs card | `inRepair` = `In Progress` **or** `Receive`, but label says "In Progress". Receive ≠ In Progress. | Label "In Progress / Received" or count only `In Progress`. |
| 3.3 | **Total Revenue** (cards + Finance tab) | Sums `subtotal` of *all* filtered WOs — includes `Cant Repair` / `Customer Not Repair` (no revenue realized) and **unpaid** tickets. Overstates revenue. | Count only revenue-eligible statuses (`Finished`/`Taken Out`), or show "Revenue (billed)" vs "Collected" clearly separated. |
| 3.4 | **Total Collected (Paid)** | Uses `wo.depositPaid || 0` — but the Paid/Unpaid badge in the roster table uses `wo.isPaid`. If tickets are marked `isPaid: true` without `depositPaid` set, the finance tab shows **0 collected** for a paid ticket. Two sources of truth. | Single source: derive collected = `isPaid ? totalAmount : depositPaid`. Align the badge and the finance calc on one field. |
| 3.5 | **Warranty clock resets on every edit** 🔴 | Warranty start = `updatedAt || createdAt`. `updatedAt` changes on *any* update (payment logged, note added) → an 80-day-old ticket jumps back to day 0; warranties effectively never expire if the ticket is touched. | Use a dedicated completion field (`completedAt`/`takenOutAt`/`finishedAt`) or freeze `createdAt` at finish time. This is a **customer-trust P0** — you'd text a customer "warranty expires in 10 days" when it expired weeks ago. |
| 3.6 | **Unused computed metrics** | `avgTurnaroundHours` and `monthlyRepairsCount` are computed but **never rendered** anywhere on the dashboard (dead code). | Either surface them (avg turnaround is a headline ops metric!) or delete. |
| 3.7 | **Repair-category classification** | The 4th bucket ("Glass, Port, Camera & Housing") is the *else* branch — every unmatched ticket lands there, so "housing" demand is systematically overstated and the breakdown misleads buying decisions. | Add a true "Other" bucket + explicit keywords for glass/camera/port; keep 4 revenue categories clean. |

## 4. Interactions & Feedback — ⚠️ Mixed

**Good:**
- Stage progress bars → "Filter Queue Below" button actually applies the filter. Nice drill-down.
- Bottleneck alert → "Inspect Bottlenecks" jumps to Pipeline. Actionable.
- "Copy Notice" (warranty SMS) gives a green "Copied" confirmation state. ✓
- Filter controls have Reset, and empty states offer "Show All Stages". ✓
- Subtabs use `role="tab"` + `aria-selected`. ✓

**Issues:**
- 🔴 **"Run Re-Scan" is cosmetic** — it only animates its own label ("Scanning… → Scan Complete"); no scan logic runs. Data recomputes on state change anyway, so the button should either *actually* re-derive (force re-read) or be replaced by a live "Auto-scanning" indicator. A button that fakes work erodes trust.
- **Clickable `<div>`s without keyboard support**: the 3 summary cards, warranty chips, and tech cards are `div[onClick]` — no `role="button"`, no `tabIndex`, no Enter/Space handling. Keyboard users can't use them.
- No `role="tablist"` wrapper, no arrow-key tab navigation, no `aria-controls` — tabs are mouse-only.
- No loading/skeleton states (data renders instantly from cache, so acceptable — but a subtle "synced HH:MM" or "last updated" label would help trust).

## 5. Mobile / Responsive — 🟠 Main gap: the roster table

- ✅ All KPI grids scale (`sm:`/`lg:` columns); warranty hero is `grid-cols-2 lg:grid-cols-5`; tech cards `sm:grid-cols-2 lg:grid-cols-4`; stage bars `1→2→4`.
- ✅ Tabs + filter chips scroll horizontally; alert banners stack (`flex-col sm:flex-row`).
- 🔴 **Status Queue roster table is a full 9-column table with zero mobile treatment** — no hidden columns, no card mode (the Intake module got card mode; this one didn't). On a 390px phone it's ~2.5 screens of horizontal scroll. Since this is the *default* dashboard tab, it's the most-seen table in the app on phones.
- 🟠 Warranty roster table: same issue (7 columns), though fewer columns make it tolerable.
- 🟠 6–7 subtabs + 5 warranty filter tabs both rely on hidden horizontal scroll — add edge fade/chevron affordance so users know more tabs exist.

## 6. Accessibility & i18n

- **i18n regression**: the rest of the app uses `t()` for nav labels, but the dashboard is ~100% hardcoded English (only one `t()` in the file). For Myanmar-speaking staff this is the least localized screen. Consistent with the app-wide finding, but worth noting the dashboard is the worst offender.
- Text sizes 9–10px in tables (see §2), contrast mostly handled by the global `#86868B → #6E6E73` override.
- Good: `aria-label`s on icon-only buttons (View, print, CRM shortcut); `aria-selected` on tabs.

---

## Priority Recommendations

**P0 (trust & money — fix first):**
1. **Warranty start date** → dedicated completion date (3.5). Wrong warranty data → wrong customer promises.
2. **Single payment truth** for Paid/Collected (3.4); revenue excludes non-revenue statuses (3.3).
3. **Ready for Pickup** → `Finished` only (3.1).

**P1 (high value):**
4. **Add one trend visualization** — a simple revenue + repairs-per-day sparkline/area chart (SVG, no library needed; ~40 lines) honoring the existing date filter. Single biggest analytics upgrade; turns the dashboard from a mirror into a lens.
5. **Surface `avgTurnaroundHours`** as a headline KPI (it's already computed — 1 line to render).
6. **"Run Re-Scan"** → honest label ("Auto-scanning — updates live") or real re-derive.
7. **Mobile roster tables** → card mode or `hidden lg:table-cell` column trimming, matching the Intake fix.

**P2 (polish):**
8. Move the 3 summary cards above the tab bar so they're always visible and their deep-links work.
9. Collapse stage-progress bars into the summary row to cut Status Queue density.
10. Tabs: `role="tablist"` + arrow-key nav; convert clickable divs to buttons.
11. Bump 9–10px table text to 11–12px; add "updated HH:MM" freshness label.
12. Decide dashboard vs module redundancy (Finance/Inventory tabs): enrich or merge.

---

## What's Already Excellent (keep)

- Live-count badges in the tab bar — the monitoring strip concept.
- Warranty Watch hero banner + background alert that appears across tabs when tickets near expiry.
- Bottleneck alert and tech-load badges (Optimal/Heavy/Overloaded) — proactive, not reactive.
- Drill-down links everywhere (progress bar → filtered queue, alert → pipeline).
- Copy-courtesy-SMS flow with confirmation state.
- Empty states + reset paths on every list.
- Consistent visual language with the rest of the app.
