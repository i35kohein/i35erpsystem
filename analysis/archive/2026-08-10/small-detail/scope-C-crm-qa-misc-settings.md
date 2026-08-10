# Small-Detail Mobile UX Analysis — Scope C (CRM, Customer Portal, QA, Microsoldering, Follow-Up, Suppliers, Devices, Finance, Settings)

**Date:** 2026-08-06 · **Method:** line-by-line JSX review, targets ≤767px phones (also notes 768–1024 iPad)
**Priority legend:** P0 = broken core flow on mobile · P1 = significant degradation · P2 = polish · P3 = nice-to-have
**Context verified:** app topbar `h-[52px] sticky z-40` (App.tsx:1497), AI FAB `fixed z-30`, mobile filter drawer `z-50`, `workspace-grid` uses `clamp()` dvh heights (index.css:707). Shared `Button` is mobile-first (`h-11 lg:h-9`, `sm: h-10 lg:h-8`, `icon: h-11 w-11 lg:h-9 lg:w-9`) — a **good** baseline; violations below are all hand-rolled `<button>`s.

---

## 1. CRM — CrmCustomerPortalModule.tsx (+ CustomerRepairHistoryModal.tsx, CustomerRepairTimeline.tsx)

| # | Location | Desktop detail | Mobile impact | Fix recommendation | Priority |
|---|----------|----------------|---------------|--------------------|----------|
| 1.1 | CrmCustomerPortalModule.tsx:483 (sheet `z-[60]`) vs :598/:~720 + CustomerRepairHistoryModal.tsx:104 (`z-50`) | Mobile detail bottom sheet is `fixed z-[60] max-h-[85vh]`; all modals (Add Customer, History Dossier, Printable Invoice) are `z-50` | Opening **Full History / Invoice from inside the open sheet** on a phone renders the modal at z-50 **underneath** the z-60 sheet — the sheet covers everything from ~15vh down, hiding most of the modal. Core CRM flow broken on mobile. | Raise modal overlays to `z-[70]`+ (or lower sheet to `z-40`), or close the sheet before opening modals. Audit every module modal vs `z-[60]`. | **P0** |
| 1.2 | CrmCustomerPortalModule.tsx:627, :664 | Add/Edit customer form `grid grid-cols-2 gap-2` (Phone+Type, Company+Discount) | Stays 2-col at 360px → ~140px inputs; mono phone input + "Customer Name" labels wrap, small touch targets | `grid-cols-1 sm:grid-cols-2`; or keep 2-col only ≥ sm | P2 |
| 1.3 | CrmCustomerPortalModule.tsx:372 | "Full History" `px-2 py-0.5 text-[10px]` (≈24px tall) | Below 40px minimum tap target; two taps to hit reliably | `min-h-10` / `py-2`, icon+label button | P2 |
| 1.4 | CrmCustomerPortalModule.tsx:386, :401 | Edit/Delete icon buttons `p-1` (~20×20px) | ~20px tap targets — worst in module; fat-finger risk deletes/edits wrong customer | `p-2.5`/`h-9 w-9` with visible bg | P2 |
| 1.5 | CrmCustomerPortalModule.tsx:456 | Device model `truncate max-w-[160px]` in inline history | "iPhone 15 Pro Max (Natural Titanium)" cut mid-word; model is the primary identifier | Remove fixed max-w; allow 2-line clamp or full width | P2 |
| 1.6 | CrmCustomerPortalModule.tsx:529 | Detail panel `grid grid-cols-2` with `truncate` email | Email silently ellipsized on phone; phone `font-mono` un-truncated fits, but email is contact-critical | `break-all` + `min-w-0`, or stack at very narrow widths | P3 |
| 1.7 | CustomerRepairHistoryModal.tsx:105 | `max-w-5xl` desktop dossier modal | On phones: full-bleed but vertically-centered; no full-screen/bottom-sheet treatment; name `<h2>` (no truncate) + type badge crowd the header at 360px | `max-h-[100dvh]` + full-screen sheet on mobile; truncate header name | P2 |
| 1.8 | CustomerRepairHistoryModal.tsx (header X `p-2`, footer "Close Dossier" `px-5 py-2`) | ~32px targets | Small close/save targets | `h-10 w-10` close; `min-h-10` footer button | P3 |
| 1.9 | CustomerRepairTimeline.tsx:424 (Invoice `px-3 py-1.5`), :~470 (Logs `px-2.5 py-1.5`) | ~30px tall actions | Sub-40px on touch; two cramped action buttons + total cost in one row at 360px | `min-h-10`, allow wrap (`flex-wrap`) | P2 |
| 1.10 | CustomerRepairTimeline.tsx (timeline node `group-hover:scale-110`) | Hover-only scale affordance | No touch equivalent (harmless, but nothing signals interactivity on phones) | `active:scale-95` touch equivalent | P3 |
| 1.11 | CustomerRepairHistoryModal.tsx metadata + metrics bars | `grid-cols-2 sm:grid-cols-4` | Correct collapse — good pattern (see §10) | — | ✅ good |

---

## 2. Customer-Facing Web Portal — CustomerFacingWebPortal.tsx (customer phones: hardest scrutiny)

| # | Location | Desktop detail | Mobile impact | Fix recommendation | Priority |
|---|----------|----------------|---------------|--------------------|----------|
| 2.1 | CustomerFacingWebPortal.tsx:323–360 | Sticky header: brand block (logo + shop name + LIVE badge + `Logged in: name (phone)` L336, no truncate) + ticket `<select>` ("WO-2026-1001 - iPhone 15 Pro Max") + Log Out | No `flex-wrap`/truncate → header overflows/crowds at 360px; long customer names push the select off-screen; multi-ticket customers can't reach the selector | `flex-wrap`, `truncate min-w-0` on the logged-in line, move select into a collapsible row or below header | **P1** |
| 2.2 | CustomerFacingWebPortal.tsx:482 | 5-stage progress `grid grid-cols-2 sm:grid-cols-5` | 5th stage renders alone at half width leaving a hole; 2-up cards read as "stages 1–2, 3–4, 5" — confusing hierarchy | `grid-cols-1` vertical stepper on phones, or make stage 5 `col-span-2` | P2 |
| 2.3 | CustomerFacingWebPortal.tsx:559–560 | Portal tabs `overflow-x-auto no-scrollbar whitespace-nowrap`, ~34px tall (`pb-3 px-3`) | Scrolls fine but no visible scroll affordance (hidden scrollbar); tab hit area ~34px < 44px | `min-h-11` tabs + fade/chevron scroll hint | P2 |
| 2.4 | CustomerFacingWebPortal.tsx:771, :779 | Estimate table `grid grid-cols-12` (Desc 6 / Type 2 / Qty 2 / Price 2) | At ~320px content width: price col ≈53px → "180,000 MMK" wraps 2–3 lines; long part names truncate the description; amounts misalign | Stack rows (`grid-cols-2` with price full-width right-aligned) below `sm:` | P2 |
| 2.5 | CustomerFacingWebPortal.tsx:415–424 | Urgent banner buttons `flex items-center space-x-2 shrink-0` (Approve + Decline row) | `whitespace-nowrap` keeps them 1 line but leaves ~0px slack at 320px; easy to mis-tap | `flex-col w-full` buttons on mobile (full-width 44px+) | P2 |
| 2.6 | CustomerFacingWebPortal.tsx (print voucher modal) | Voucher metadata `grid grid-cols-2` + `p-6` inside `p-4` wrapper | 280px content → 2-col ≈134px cells; serial/IMEI and long device names wrap into tall messy cells | 1-col stack or `text-[9px]` mono with `break-all` | P2 |
| 2.7 | CustomerFacingWebPortal.tsx:336 | "Logged in: …" line includes full phone/email | On a shared/customer phone this is fine, but the line wraps and breaks the header layout (see 2.1) | Truncate + `title` attr | P2 |
| 2.8 | CustomerFacingWebPortal.tsx login view (~L190–310) | `max-w-md` centered; input `py-3`, CTA `py-3 w-full`, `tel:` footer link | **Excellent** mobile ergonomics: full-width targets, one-hand reachable | — | ✅ good |
| 2.9 | CustomerFacingWebPortal.tsx MESSAGES tab (composer `flex gap-2`, thread `max-h-80`), approval/rejection modals (`max-w-lg w-full` + `flex-1` button rows), diagnostics `grid-cols-1 sm:2 md:3` | — | All scale correctly on phones; approval modal buttons 50/50 full width | — | ✅ good |
| 2.10 | CustomerFacingWebPortal.tsx print `<style>` block | `@media print` resets | Print-to-PDF from phone works (A4 portrait) — genuinely good | — | ✅ good |

---

## 3. QA — QualityAssuranceModule.tsx

| # | Location | Desktop detail | Mobile impact | Fix recommendation | Priority |
|---|----------|----------------|---------------|--------------------|----------|
| 3.1 | QualityAssuranceModule.tsx:424/:433/:442 | Pass/Fail/N/A segmented buttons `flex-1 py-1` (≈26px tall) | QA tech on phone: 26px targets, 3-across, right below a 21-card grid — high mis-tap rate during inspection | `min-h-10` (py-2.5); keep segmented but taller | P2 |
| 3.2 | QualityAssuranceModule.tsx (~:405 "Mark All Pass" / "Mark All N/A") | `px-3 py-1 text-[10px]` pills | ~26px targets | `min-h-9` | P2 |
| 3.3 | QualityAssuranceModule.tsx QA Inspector dropdown | `CustomDropdownMenu … menuPlacement="top" menuAlign="left"` | Menu opens **upward**; when the inspector field sits near the top of the scrolled page the menu can escape the viewport top on mobile | `menuPlacement="auto"`/flip, or verify overflow | P3 |
| 3.4 | QualityAssuranceModule.tsx (notes `textarea min-h-8 resize-y`) | 32px default height | Tiny tap area; easy to miss | `min-h-12` | P3 |
| 3.5 | QualityAssuranceModule.tsx:queue `max-h-[calc(100dvh-260px)]`, diag grid `grid-cols-1 sm:2 lg:3`, `role="button"`+Enter/Space keys | — | dvh-capped scroll area, sane grid collapse, keyboard support = all good | — | ✅ good |

---

## 4. Micro-Soldering — MicroSolderingModule.tsx

| # | Location | Desktop detail | Mobile impact | Fix recommendation | Priority |
|---|----------|----------------|---------------|--------------------|----------|
| 4.1 | MicroSolderingModule.tsx:185 | Diode-entry row `grid grid-cols-3 gap-2` (Line / Expected / Actual+`+`) | At 360px ≈93px/input; "PP_VCC_MAIN" (11 chars) barely visible; the `+` button sits squeezed next to Actual | 1-col stack (`sm:grid-cols-3`), or 2-col with `+` full-width | P2 |
| 4.2 | MicroSolderingModule.tsx:166 ("Save Board Worksheet" `px-4 py-2`) | ~36px button | Below 40px | `min-h-10` | P3 |
| 4.3 | MicroSolderingModule.tsx:~126 queue maps **all** `workOrders`, not `microJobs` | Desktop: long list of non-micro tickets | Mobile: unrelated tickets flood the Level-3 queue; extra scrolling | Filter to `microJobs` (functional bug + mobile scroll cost) | P2 |
| 4.4 | MicroSolderingModule.tsx structure | `grid grid-cols-1 md:grid-cols-12` 5/7 split | Clean vertical stack on phones | — | ✅ good |

---

## 5. Follow-Up — CompletedDeviceFollowUpModule.tsx

| # | Location | Desktop detail | Mobile impact | Fix recommendation | Priority |
|---|----------|----------------|---------------|--------------------|----------|
| 5.1 | CompletedDeviceFollowUpModule.tsx:290 | Analytics `grid-cols-2 md:grid-cols-6` | Mobile 2-col is fine; at 640–1024 the 6-col squeezes to ~100px cards — "Total Completed" labels wrap 3 lines; "Avg Rating" `col-span-2 md:col-span-1` lands alone | `sm:grid-cols-3 md:grid-cols-6` | P2 |
| 5.2 | CompletedDeviceFollowUpModule.tsx:549 | `tel:` icon button `p-2` (32px) | Primary call-to-action on a follow-up module is 32px — should be the biggest target, not smallest | `h-11 w-11` with visible bg | P2 |
| 5.3 | CompletedDeviceFollowUpModule.tsx (Log modal status selector `grid-cols-2 sm:grid-cols-3` `p-2`) | ~36px buttons | Borderline; 6 statuses in 2-col on phone is OK | `min-h-10` | P2 |
| 5.4 | CompletedDeviceFollowUpModule.tsx (quick-note chips `tmpl.slice(0, 32)...`) | Chips truncate template text at 32 chars | Meaning cut ("Customer reported minor query about bat…") — user can't tell templates apart | Full text or 2-line clamp; tooltip doesn't exist on touch | P3 |
| 5.5 | CompletedDeviceFollowUpModule.tsx:336 filter tabs `overflow-x-auto no-scrollbar shrink-0`; actions bar `border-t md:border-t-0`; modals `max-w-lg/max-w-md w-full` | — | All scale well; horizontal tab scroll is the right call for 8 filters | — | ✅ good |

---

## 6. Suppliers — SupplierRmaModule.tsx

| # | Location | Desktop detail | Mobile impact | Fix recommendation | Priority |
|---|----------|----------------|---------------|--------------------|----------|
| 6.1 | SupplierRmaModule.tsx:163 | `window.innerWidth < 768 → setRmaView('cards')` on mount+resize | **Best-in-codebase mobile fallback** — table forced to cards on phones, user toggle wins on desktop | — | ✅ good (note: prefer `matchMedia` listener over resize handler, P3) |
| 6.2 | SupplierRmaModule.tsx:254/:263 | Table/Card view toggle `h-7 w-7` (28px) | 28px targets; and on mobile the toggle is pointless (cards forced) — hide it below md | `hidden md:inline-flex` or `h-9 w-9` | P2 |
| 6.3 | SupplierRmaModule.tsx:184 | Sub-tab segmented `grid grid-cols-3 gap-1.5 w-full` on mobile | "RMA Defective Returns" wraps 2 lines in ⅓ width (~105px); "Purchase Orders" / "Vendor Catalog" uneven | Keep grid but shorten labels or `grid-cols-1` stacked tabs | P2 |
| 6.4 | SupplierRmaModule.tsx table (`hidden lg:table-cell`, `hidden xl:table-cell` cols) | Column hiding by breakpoint | Correct responsive-table technique; on 768–1024 five visible cols are tight but readable | Consider hiding "Vendor" at md too | P2 |
| 6.5 | SupplierRmaModule.tsx:333 ("Approve Credit" `px-2.5 py-1.5`) | ~30px button | Small but one-tap action | `min-h-9` | P3 |
| 6.6 | SupplierRmaModule.tsx supplier card grid `grid-cols-1 sm:grid-cols-3`; PO grid `grid-cols-1 md:grid-cols-2`; modals `max-w-md/lg w-full` | — | Correct card collapse and modal widths | — | ✅ good |

---

## 7. Devices — DevicesManagementModule.tsx

| # | Location | Desktop detail | Mobile impact | Fix recommendation | Priority |
|---|----------|----------------|---------------|--------------------|----------|
| 7.1 | DevicesManagementModule.tsx:404–405 | 6-column table (`Device & Model / Serial-IMEI / Color & Lock / Owner / Service History / Actions`) with **no hidden columns and no card fallback** | ~800px+ table on a phone; users must horizontal-scroll for every row; primary module view is hostile to mobile | Add `hidden lg:table-cell` to non-essential cols + card-list fallback (<768) like SupplierRma; or `min-w` collapse | **P1** |
| 7.2 | DevicesManagementModule.tsx:262 | KPI `grid grid-cols-2 sm:grid-cols-5` (6 cards) | At 640–1024: 5 cols ≈110px cards, labels like "Initial Diag Pending" wrap 3 lines; 6th card wraps alone | `sm:grid-cols-3 lg:grid-cols-6` | P2 |
| 7.3 | DevicesManagementModule.tsx:736 | Register modal `grid grid-cols-3 gap-2` (Color / Passcode / Find My) | ~90px inputs at 360px; mono passcode + color fields truncated | `grid-cols-1 sm:grid-cols-3`, or 2+1 | P2 |
| 7.4 | DevicesManagementModule.tsx:345 | Category tabs `overflow-x-auto no-scrollbar whitespace-nowrap` | Good scroll pattern (see 5.5) | — | ✅ good |
| 7.5 | DevicesManagementModule.tsx dossier modal `max-w-3xl w-full max-h-[90vh] overflow-y-auto`; header SN line wraps | — | Serviceable full-width modal; SN wrap is cosmetic | `break-all` on SN line | P3 |

---

## 8. Finance — ShopFinancePlModule.tsx

| # | Location | Desktop detail | Mobile impact | Fix recommendation | Priority |
|---|----------|----------------|---------------|--------------------|----------|
| 8.1 | ShopFinancePlModule.tsx:1165–1177 | Inventory Fund header: 3 stat blocks (`Parts Revenue / Pending Settlement / Settled`) in one `flex items-center gap-3` row with `h-8 w-px` dividers; `flex-col sm:flex-row` only on the **outer** wrapper | Inner stat row stays horizontal on phones → 3 × (label + big mono MMK number) + dividers ≈ 400px+ at 360px → **horizontal overflow / clipped numbers** | `grid grid-cols-3` with `min-w-0` + smaller text, or stack with dividers removed | **P1** |
| 8.2 | ShopFinancePlModule.tsx:347 | 8 sub-tabs in `overflow-x-auto no-scrollbar shrink-0` strip with long labels ("1. Revenue & Payment Methods") | Scrolls correctly; no scrollbar → discoverability issue only | Fade edge + `min-h-11` | P2 |
| 8.3 | ShopFinancePlModule.tsx revenue/expenses/inventory/commissions/AP/fund/parts tables (6–8 cols, `overflow-x-auto` wrappers) | Wide financial tables | Every sub-view is a horizontal-scroll table on mobile; no card fallback anywhere in Finance | Card/row-stack for the top-3 most-used (revenue, expenses, AP); keep scroll as fallback | P2 |
| 8.4 | ShopFinancePlModule.tsx expense modal `grid grid-cols-2` (Date+Category / Amount+Method) with `col-span-2` fields | 2-col at 360px = ~140px | Acceptable but cramped; date + select wrap labels | `grid-cols-1 sm:grid-cols-2` | P3 |
| 8.5 | ShopFinancePlModule.tsx P&L cards `grid-cols-1 sm:2 lg:4`, parts-revenue cards `grid-cols-2 lg:4`, benchmark banner `flex-col sm:flex-row` | — | Correct responsive collapse | — | ✅ good |

---

## 9. Settings — SystemManagementSettingsModule.tsx (tabs pattern check)

| # | Location | Desktop detail | Mobile impact | Fix recommendation | Priority |
|---|----------|----------------|---------------|--------------------|----------|
| 9.1 | SystemManagementSettingsModule.tsx:954 | Tab launcher: `flex flex-col gap-1` on mobile → `md:grid md:grid-cols-3 lg:4 xl:6` | **Best tab pattern in the app**: full-width rows on phones (icon 40px + label + `ChevronRight` L997) instead of a squeezed grid; drill-in + Back bar (L900s) instead of 13-tab horizontal strip | — | ✅ good (replicate everywhere) |
| 9.2 | SystemManagementSettingsModule.tsx:986 / :990 | Dirty-dot and count-badge both `absolute top-1.5 right-1.5` | Overlap on tabs that have both a badge (users/technicians/inventory/recycle) and unsaved changes — badge occludes the dot, or vice-versa | Offset badge to `top-1.5 right-5` / different corner | P3 |
| 9.3 | SystemManagementSettingsModule.tsx:1623 | Sticky mobile save bar `lg:hidden fixed bottom-0 z-40` + `pb-[calc(0.625rem+env(safe-area-inset-bottom))]`; module root `pb-20 lg:pb-0` | Correct safe-area handling + bottom padding compensation; sits above content, below modals (z-50) — no z-conflict | — | ✅ good |
| 9.4 | SystemManagementSettingsModule.tsx:1366 | User role selector `grid grid-cols-3` (Admin/Technician/Reception emoji cards) | ~100px cards on 360px — acceptable; tap area ≈40px | `min-h-12` on cards | P3 |
| 9.5 | SystemManagementSettingsModule.tsx (tech modal `max-w-xl my-8` inside `overflow-y-auto` overlay; commission grids `grid-cols-1 sm:grid-cols-2`) | — | Modal margins + inner stacking are mobile-correct | — | ✅ good |

---

## 10. Good patterns to replicate (consolidated)

1. **Master-detail bottom sheet** (CRM L483): `fixed inset-x-0 bottom-0 z-[60] max-h-[85vh] rounded-t-3xl` + grab-handle + close + `pb-[calc(1rem+env(safe-area-inset-bottom))]`, then `md:static` to reflow into the grid. (Fix z-index per 1.1.)
2. **Forced card-view fallback** (SupplierRma L163): table→cards below 768 via resize check; user toggle only matters on desktop.
3. **Mobile-first Button sizes** (ui/button.tsx): `h-11 lg:h-9` — bigger on touch, smaller on mouse.
4. **Horizontal scrolling tab strips** with `overflow-x-auto no-scrollbar shrink-0` (Follow-Up L336, Finance L347, Devices L345, CRM header, Portal tabs) — the right pattern for 6–8 filters; just add a fade hint + `min-h-11`.
5. **Settings two-level navigation** (9.1): launcher → drill-in with Back bar; search filter; dirty-state dot; sticky save bar with safe-area padding (`pb-20` root compensation).
6. **dvh-based scroll caps** (`max-h-[calc(100dvh-260px)]` in QA; `workspace-grid` clamp in index.css) — avoids iOS URL-bar jump.
7. **Responsive table column hiding** (`hidden lg:table-cell`, SupplierRma) + `overflow-x-auto` wrappers everywhere.
8. **Correct collapse cadence** seen repeatedly: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`, `flex-col sm:flex-row`, `w-full sm:w-64` search inputs.
9. **Touch-first portal login** (2.8) and **print-CSS scoping** (2.10).
10. **Keyboard + ARIA extras** (QA queue `role="button"` + Enter/Space; `focus-visible:ring` on portal CTAs) — harmless on touch, valuable on desktop.

## Top 5 worst offenders

1. **CRM bottom-sheet z-[60] above every modal z-50** (1.1) — on phones, Full History / Invoice / Add Customer opened from the sheet are visually swallowed by the sheet. P0.
2. **Customer portal sticky header has no wrap/truncate** (2.1) — long customer names + ticket selector + logout overflow 360px; the one screen real customers touch. P1.
3. **Devices table has zero mobile fallback** (7.1) — 6-column table with no hidden columns and no card view, while its sibling module (Suppliers) already solved this. P1.
4. **Finance Inventory Fund stat row overflows** (8.1) — three large mono MMK figures in an unbreakable horizontal row on a 360px screen. P1.
5. **QA 21-point Pass/Fail/N/A segmented controls at ~26px** (3.1) — the highest-frequency tap action in the QA flow has the smallest targets. P2 (adjacent to the P0/P1s because it's the whole module's core interaction).
