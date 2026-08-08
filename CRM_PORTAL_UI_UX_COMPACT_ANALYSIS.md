# Customer & Staff Portal — Mobile UI/UX Analysis & Compact Pass (i35 ERP)

- **Module:** `src/components/crm/CrmCustomerPortalModule.tsx` (Customer Database + Portal Simulator tabs, embeds `CustomerFacingWebPortal`)
- **Date:** 2026-08-05 · **Analyst:** Kimi (OpenClaw)
- **Method:** live DOM measurement at 390×844 + screenshot review + desktop check; cross-referenced with the earlier workflow/bug audit (`CRM_PORTAL_WORKFLOW_ANALYSIS.md`).
- **Score before: 7.0 / 10** (mobile) → **7.7 / 10** after compact pass.

---

## 1. What already works ✅
- Zero horizontal overflow at 390px; no tap targets < 30px.
- Roster + detail stack cleanly on phones (`grid-cols-1` → `md:grid-cols-12` 6/6 → `xl:` 5/7).
- Derived/cloud distinction (badge vs delete/edit) — no bogus destructive actions.
- Timeline, history modal, invoice print — all reachable from phone.

## 2. Findings (measured)

| # | Finding | Severity | Fix |
|---|---|---|---|
| C-1 | Header + subtitle + tabs consumed ~15–20% of the viewport on phones | 🟠 | Hide subtitle <sm, shrink title + tabs, tighten toolbar padding → saved ~30–40px |
| C-2 | Roster rows ~150px each → only 2–3 customers visible | 🟠 | `p-3`→`p-2.5`, tighter margins → 138px; a true single-line list is a bigger redesign (see §4) |
| C-3 | "Add Customer" button clipped at the roster header's right edge at 390px (no wrap) | 🔴 | Header now `flex-wrap` — button wraps instead of clipping (verified: fully visible) |
| C-4 | "Full Repair History Modal" button label too long for mobile | 🟡 | → "Full History" / "History" (<sm) |
| C-5 | Card-in-card nesting + generous paddings in detail panel | 🟡 | `p-5`→`p-4`, stats grid `p-3/gap-3`→`p-2.5/gap-2` |
| C-6 | Redundancy: selected customer shown in roster row AND full detail panel below (scroll fatigue) | 🟡 | Not changed — see recommendation R-1 |

## 3. Compact changes applied
- Header: subtitle hidden on phones, title text-base/sm, tabs `px-3 py-1.5`, toolbar `p-1.5` on mobile.
- Roster rows: tighter padding/margins (150px → 138px measured).
- Roster header: `flex-wrap` so Add Customer never clips (verified).
- Detail panel: `p-4`, stats grid tightened.
- Button labels: "Full History" / "History" on phones.
- tsc clean; deployed with the rest of the day's work.

## 4. Recommendations (next pass — bigger redesigns)
- **R-1 Master–detail on mobile:** tapping a roster row should open the detail as a **bottom sheet** (like the Price List cart sheet) or scroll-to-panel, instead of stacking both panels — kills the duplicate-info scroll fatigue (C-6). ~1–2 h.
- **R-2 Full-width tabs:** make Customer Database / Portal Simulator 50/50 on phones to use the empty rail space.
- **R-3 Single-line roster list** (name + type + phone + spent on one row, expand on tap) — densest option, ~1 h, optional.
- **R-4 Timeline filter box** padding reduction on mobile.
- **R-5 Portal Simulator** is the customer-facing surface (1,204 ln) — separate compact audit if counter staff use it on phones (login lookup, estimate cards, approve/reject buttons already improved this session).

## 5. Verification log
| Check | Before | After |
|---|---|---|
| Roster row height @390px | 150px | 138px |
| Header vertical space | ~15–20% viewport | ~12–15% |
| Add Customer clipping | clipped | wrap-safe, fully visible |
| Horizontal overflow | 0 | 0 |
| Tap targets < 30px | 0 | 0 |
