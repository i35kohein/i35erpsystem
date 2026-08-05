# Small-Detail Mobile UX Analysis — Scope A: Intake / Create Ticket / Pipeline / Dashboard

**Files analyzed (read in full):**
- `src/components/intake/IntakeWorkOrderModule.tsx` (916 lines)
- `src/components/intake/CreateTicketSoloPage.tsx` (1696 lines)
- `src/components/pipeline/StatusPipelineView.tsx` (1585 lines)
- `src/components/dashboard/DashboardOverview.tsx` (2075 lines)

**Target:** mobile ≤767px (also iPad 768–1024). Line numbers verified via grep on 2026-08-06. No files were edited.

**Priority legend:** P0 = broken/blocked on mobile · P1 = hurts badly / violates touch norms · P2 = polish / nice-to-have.

---

## 1. Intake Work Order List (`IntakeWorkOrderModule.tsx`)

| # | Location | Desktop detail | Mobile impact | Fix recommendation | Priority |
|---|----------|----------------|---------------|--------------------|----------|
| 1.1 | L163 `useEffect(() => { if (window.innerWidth < 768) setViewMode('cards'); }, [])` | One-shot viewport check on mount | Stale after rotation/resize (iPad split view, landscape phone ≈740px). Also doesn't force back to cards if user picks Table then rotates; no `resize`/`matchMedia` listener | Use `window.matchMedia('(max-width: 767px)')` + `change` listener; re-apply cards default on entering mobile | P1 |
| 1.2 | L427–439 table: `th w-[132px] / w-[148px] / w-[158px] / w-[114px] / w-[112px] / w-[44px]` (5 cols stay visible <lg) | Fixed 9-col desktop table | ~660px+ of fixed columns on a 360px phone → horizontal scroll inside `.workspace-panel__scroll`; 9–11px fonts; still reachable because the segmented control (L270–289) offers "Table" on mobile | Disable/hide the Table option <md, or make mobile table a proper card stack; keep Table only ≥md | P1 |
| 1.3 | L465, L474, L482, L516: `text-[9px]` for date, phone, serial/IMEI, Paid/Unpaid chip | Tiny desktop mono labels | 9px is below readable size on phones (and Apple HIG 11px floor); phone + serial are *critical* intake data | Raise to `text-[11px]` on mobile (`text-[9px] sm:text-[11px]`), or surface in cards view | P2 |
| 1.4 | L529–530 & L607–608: `h-8 w-8` icon buttons (detail) | 32px icon button | 32px < 40px minimum touch target; two rows of taps on the roster | `h-10 w-10` (40px) or add `min-h-10 min-w-10` padding | P1 |
| 1.5 | L624: `<div className="hidden fixed inset-0 bg-black/45 z-50 …">` custom detail modal | Dead modal (Tailwind `hidden` = display:none, and no `flex` display class even present) | Never renders; the real modal is `TicketDetailInspectorModal` (L~876) rendered right after → duplicate modal DOM on every open (perf/waste on phones); also sits at z-50 same as mobile drawer | Delete the dead custom modal; keep only `TicketDetailInspectorModal` | P2 |
| 1.6 | L641–676: `group relative` + `group-hover:block` tooltips ("Print sticker", "Delete ticket", "Delete locked") | Hover-only tooltips | Useless on touch (buttons have aria-labels so function survives, but labels don't) | Replace with persistent `aria-label`-only affordances or tap-to-show tooltips | P2 |
| 1.7 | L461–465: `title={createdDateFull}` on relative date | Hover reveals full date | Full date unreachable on touch | Show full date on cards view / detail modal (it already exists in modal spec matrix) | P2 |
| 1.8 | L473, L481–483: `max-w-[140px] truncate` / `max-w-[150px] truncate` on customer name, SN/IMEI | Desktop truncation with hover titles | SN/IMEI (key data) cut mid-string on mobile; no tap-to-reveal | In cards view render full SN/IMEI; add `break-all`/full text in detail | P2 |
| 1.9 | L252–261: `h-8` "Clear All" / "Priority First" buttons | 32px buttons | Small touch targets in the controls bar | `min-h-10` | P2 |
| 1.10 | L310 chips: `grid-cols-2 sm:grid-cols-3 lg:grid-cols-6` + `min-h-[84px]` | 6 filter chips | ✅ GOOD — collapses to 2-col on phones with generous 84px touch height | Replicate elsewhere | — |

---

## 2. Create Ticket (`CreateTicketSoloPage.tsx`)

| # | Location | Desktop detail | Mobile impact | Fix recommendation | Priority |
|---|----------|----------------|---------------|--------------------|----------|
| 2.1 | L1269 photo delete: `absolute top-1 right-1 … opacity-0 group-hover:opacity-100` | Hover-to-delete on thumbnails | **Touch devices can never delete an intake photo** — button is invisible and `group-hover` never fires; the caption at L1312 even admits "hover a thumbnail to delete". Wrong photos become permanent data on phones | Always-visible delete badge on touch (`sm:opacity-0 sm:group-hover:opacity-100`), or long-press, or an "edit photos" mode | **P0** |
| 2.2 | L1183–1197: `flex space-x-1 text-[10px]` Pass/Fail/N/A buttons, `flex-1 py-1` | 21 rows × 3 small desktop buttons | ~26px tall × ~105px wide taps; 63 tiny buttons to register a 21-point diagnostic on a phone — highest-friction tap area in the app | `py-2.5` + `text-[11px]` (min 40px height); consider segmented full-width buttons | P1 |
| 2.3 | L1128: pass/fail counts `hidden md:inline-flex`, but "Mark All Pass / N/A / Reset" remain `text-[10px] px-3 py-1` | Compact header pills | Counts correctly hidden on mobile, but the 3 bulk-action pills stay tiny (~24px tall) | `min-h-10` on bulk pills; keep counts hidden | P2 |
| 2.4 | L1338: sticky action bar `sticky bottom-0 z-20 -mx-4 -mb-4 … pb-[calc(0.75rem+env(safe-area-inset-bottom))]` | Desktop sticky register bar | ✅ GOOD safe-area handling; but `z-20` < AI FAB (bottom-right, floats above bottom nav) → FAB can overlap the Register button / totals on short viewports; also 3-col totals grid at 360px is cramped (`grid-cols-3` L1344) | Raise bar z-index above FAB or offset; allow 2-col totals on very narrow screens | P2 |
| 2.5 | L1160: diagnostics grid `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4` | Responsive 1→4 col | ✅ GOOD — single column on phones | Replicate | — |
| 2.6 | L1452–1465 color modal: `max-w-lg w-full p-6`, `grid-cols-2 sm:grid-cols-3`, `max-h-72 overflow-y-auto` | Desktop color picker | ✅ GOOD mobile sizing; only close button (`absolute right-4 top-4`, ~24px) is small | Close button → 40px tap target | P2 |
| 2.7 | L1561–1562 repairs modal: `max-w-2xl w-full max-h-[85vh] flex flex-col` + inner `flex-1 overflow-y-auto min-h-[220px]` | Big catalog modal | ✅ GOOD (modal fills ~85vh, list scrolls internally); item rows `flex justify-between` with `text-right` price can squeeze long names at 360px | Allow name `min-w-0 truncate`/wrap; keep price `shrink-0` | P2 |
| 2.8 | L1049: discount input `w-16 … py-1.5` (~64×30px) + `%` overlay | Inline discount editor | Small numeric tap target on phones; easy fat-finger wrong % | `h-10` / `min-h-10`, larger font | P2 |
| 2.9 | L1055: `min-w-[100px]` on final price | Desktop column alignment | On stacked mobile row (L~1020 `flex-col md:flex-row`) the 100px floor is harmless; in `md` row fine — but combined with L2.8 row it crowds 360px | Verify at 360px; allow shrink below md | P2 |
| 2.10 | L524 & L613: `max-w-3xl xl:max-w-6xl mx-auto` | Fluid container | ✅ GOOD — never overflows | Replicate | — |
| 2.11 | L524–618 success screen: `p-8` card, buttons `w-full sm:w-auto` | Post-register confirmation | ✅ GOOD stacked buttons; `p-8` is roomy on phones | — | — |
| 2.12 | L1321–1331 wizard indicator: 4 chips, labels `hidden sm:inline` | Step chips | ✅ GOOD responsive labels; chips themselves `px-2 py-1 text-[10px]` are small | `min-h-10` chips | P2 |
| 2.13 | L~690 form-mode toggle: description `truncate` | "All sections visible on one page" | Description truncates at 360px; Standard/Wizard buttons `px-3 py-1.5` slightly small | Shorten copy on mobile; `min-h-10` | P2 |
| 2.14 | L~753: `lg:grid lg:grid-cols-2` wrapper + all inner grids `grid-cols-1 sm:grid-cols-2` | Desktop 2-col form | ✅ GOOD — collapses to single column below lg; inputs `py-2.5` ≈42px pass touch height | Replicate | — |
| 2.15 | IMEI input: `inputMode="numeric"` + live `15/15` counter (L~990) | Desktop validation | ✅ GOOD — numeric keypad on phones; counter helps | — | — |
| 2.16 | L1265–1304: thumbnails + add button `w-20 h-20` | Photo grid | ✅ GOOD sizes (80px); camera opens directly via `capture="environment"` | — | — |

---

## 3. Status Pipeline (Kanban) (`StatusPipelineView.tsx`)

| # | Location | Desktop detail | Mobile impact | Fix recommendation | Priority |
|---|----------|----------------|---------------|--------------------|----------|
| 3.1 | L466: entire control cluster `hidden lg:grid` ("Show All / Hide Exceptions", "Before Diag Pending", "Finished Needs Diag", "Clear All") | Desktop-only stage toggles | On mobile there is **no way to enable `showAllStages`**; L555 only renders the exception columns `Cant Repair` / `Customer Not Repair` when `showAllStages` is true → those two whole stages are **invisible & unreachable on phones**. Meanwhile the scroll hint at L1193–1198 ("Scroll for Cant Repair / Customer Not Repair") promises columns that can never render → dead affordance + data loss | Render a mobile "Show All" toggle (chips row <lg), or auto-include exception columns when content fits / when tickets exist there; fix hint to track `showAllStages` | **P0** |
| 3.2 | L641: `draggable` + `onDragStart` on cards; drops at L~570 | HTML5 drag-and-drop is the primary move-between-stages flow | **HTML5 DnD does not fire on touch** (iPhone/iPad) → no way to move a card by drag; no touch fallback exists (cards only have Detail/Log/Notify + Assign); mobile users must open the detail modal timeline to change stage | Add touch move handler (long-press + pick-up, or per-card "Move to ▾" menu) — at minimum a stage `<select>` on the card | P1 |
| 3.3 | L549: `kanban-scroll flex min-h-[calc(100dvh-14rem)] space-x-3 overflow-x-auto pb-4 pt-1 snap-x touch-pan-x no-scrollbar md:grid md:grid-cols-3 … lg:flex lg:overflow-x-auto` | 6-column kanban | ✅ GOOD — horizontal swipe + snap + `touch-pan-x` keeps vertical page scroll; `md:grid-cols-3` gives iPad a 3-col board; `100dvh` avoids iOS toolbar jumps | Replicate (fix only the hint logic in 3.1) | — |
| 3.4 | L620: column inner `overflow-y-auto … max-h-[680px]` | Desktop fixed-height columns | Nested scroll container — works with `touch-pan-x` outer, but 680px cap on a 700px phone viewport leaves ~20px for page context; cards can be hidden below fold with no scroll cue | `max-h` → `max-h-[60dvh]` or drop cap on mobile | P2 |
| 3.5 | L724: card actions `grid grid-cols-3 gap-1` `py-1 px-1 text-[10px]` (Detail/Log/Notify) | 3 compact buttons | ~26px tall taps; 3 across a 260px column ≈ 84px each — height is the problem | `py-2` (≥36–40px), `text-[11px]` | P1 |
| 3.6 | L766 & L791: Checkout / After Diag `py-1.5 text-[10px]` | Finished-stage actions | ~28px tall on touch | `min-h-10` | P2 |
| 3.7 | L643: `cursor-grab active:cursor-grabbing` on whole card | Grab affordance | On touch the card reads as "grabbable" but nothing happens (see 3.2); also no visual "tap to open" affordance for the model/customer block | Match cursor hint to real input (tap = Detail) or add move menu | P2 |
| 3.8 | L810: custom detail modal `hidden fixed inset-0 … z-50 max-w-5xl` + `TicketDetailInspectorModal` at L1109 | Duplicated detail modal | Same dead-DOM + double render as 1.5; z-50 collides with mobile drawer | Delete dead modal | P2 |
| 3.9 | L544: `<div className="hidden lg:block"><ActiveFilterChips …/></div>` | Desktop filter chips | One-tap filter clearing unavailable on mobile (filters themselves live in the app-level toolbar — verify it exposes them <lg) | Render chips on mobile too (wrap instead of hide) | P2 |
| 3.10 | L1122/1157/1204/1259/1403/1495: all modals `max-w-md/sm/xl/lg w-full p-6` (+`max-h-[88vh] overflow-y-auto` L1259) | Desktop-centered modals | ✅ GOOD — width-capped, not fixed, so they fit 360px; after-diag scrolls internally | Replicate | — |
| 3.11 | L~670: `truncate` on `{wo.customerName} • {wo.customerPhone}` | Card subline | Phone number cut off mid-digits on the card; full number only in detail modal | Show full phone or move to detail-only tap affordance | P2 |
| 3.12 | L587: column `min-w-[260px]` | Column width floor | ✅ GOOD for touch swiping (comfortable column width) | — | — |
| 3.13 | L~600/660: `title=` tooltips (bottleneck count, Stethoscope/ShieldCheck icons) | Hover explanations | Icons are self-explanatory-ish but tooltip text lost on touch; bottleneck count still visible | Add `aria-label` text equivalents (already partially present) | P2 |

---

## 4. Dashboard (`DashboardOverview.tsx`)

| # | Location | Desktop detail | Mobile impact | Fix recommendation | Priority |
|---|----------|----------------|---------------|--------------------|----------|
| 4.1 | L823: subtab bar `flex … overflow-x-auto no-scrollbar` with `shrink-0` tabs | 6 dashboard tabs | ✅ GOOD horizontal scroll pattern; tabs `px-3.5 py-2` ≈32px tall — slightly under target | `py-2.5` | P2 |
| 4.2 | L674: KPI grid `grid-cols-1 md:grid-cols-2 lg:grid-cols-4` | 4 headline cards | ✅ GOOD — stacks 1-col on phones; cards are `role="button"` with keydown support | Replicate | — |
| 4.3 | L767: revenue figure `text-xl sm:text-2xl … truncate` | Big revenue number | MMK values ≥ 8–9 digits truncate on 360px (with the margin pill beside) — headline number cut off | `text-lg` on mobile or let number wrap / smaller pill | P2 |
| 4.4 | L112–116: `TrendChart` SVG `viewBox 640×170` + `min-w-[460px]` in `overflow-x-auto` | Fixed-aspect chart | ✅ GOOD — scrolls horizontally instead of crushing | Replicate | — |
| 4.5 | L1257 & L1932: queue & warranty tables in `overflow-x-auto` wrappers; 3 cols `hidden lg:table-cell` (L1264–1266), warranty dates `hidden md:table-cell` (L1939, L1965) | Wide read-only tables | ✅ GOOD — tables scroll, not clip; but on phones 6 visible cols still require sideways scrolling, and **warranty Start/Expiry dates are hidden entirely** (key data for the warranty feature) | Keep scroll; on mobile replace warranty table with stacked rows or move dates into the row card | P2 |
| 4.6 | L1350: `View` button `h-8`; L1361 & L2036: `p-1.5` icon buttons (Tag, CRM) | Compact row actions | 32px / ~26px targets in table rows | `min-h-10` + `min-w-10` | P2 |
| 4.7 | L2022: "Copy Notice" `px-2.5 py-1.5 text-[10px]` | Warranty action | Small tap target for the main outreach action | `min-h-10` | P2 |
| 4.8 | L1774: telemetry stats `grid-cols-2 lg:grid-cols-5`, last card `col-span-2 lg:col-span-1` | 5 dark stat cards | ✅ GOOD — 2-col on phones with full-width last card | Replicate | — |
| 4.9 | L1832: warranty filter tabs `overflow-x-auto no-scrollbar` `px-3 py-1` | 5 filter tabs | ✅ GOOD scrollable pill row; taps slightly small | `py-1.5` | P2 |
| 4.10 | L1033: warranty preview chips `overflow-x-auto` | Horizontal chip strip | ✅ GOOD | — | — |
| 4.11 | L1088–1090: "Total Work Orders"/"Orders" responsive spans; L1148, L1688, L1444 `hidden sm:inline` header swaps | Desktop-long headings | ✅ GOOD — labels swap to short mobile versions | Replicate everywhere | — |
| 4.12 | L~1419: top-device row `flex … gap-2` with `shrink-0` count+revenue right side | Ranked list | Long MMK revenue + count crowd the device name on 360px (name `truncate`) | Stack right-side stats under name on mobile | P2 |

---

## Cross-cutting (all 4 screens)

| # | Location | Desktop detail | Mobile impact | Fix recommendation | Priority |
|---|----------|----------------|---------------|--------------------|----------|
| C.1 | Every modal: `z-50` (Intake L624, Create L1452/1501/1561, Pipeline L1122+…) | Modal overlays | Same stacking layer as the mobile drawer (z-50) and above topbar z-40; if the drawer is opened while a modal is open, stacking order is DOM-dependent and the AI FAB can sit above/below unpredictably | Reserve z-60+ for modals, z-50 drawer, keep FAB ≤ z-40; audit in app shell | P1 |
| C.2 | `window.confirm` for Clear All / Delete (Intake L~255, Pipeline L~532, Dashboard) | Native confirm | Works on mobile but jarring UX; fine | (optional) custom confirm | P2 |
| C.3 | Pervasive `text-[9px]`/`text-[10px]` labels | Dense desktop info | Sub-11px text across roster, cards, badges on phones; compounding with 1.3, 3.5 | Global mobile font bump (`sm:` variants or base scale) | P2 |
| C.4 | `title=` tooltips everywhere (1.6, 1.7, 3.13, dashboard buttons) | Hover-only info | Tooltips are dead weight on touch; info should live in visible text or aria-labels | Replace critical ones with visible text | P2 |

---

## Good patterns to replicate (found in scope)

1. **View-mode default swap on mount** — Intake L163: phones start in cards; keep the manual override (make it reactive to `matchMedia`).
2. **Full-width segmented controls on mobile** — Intake L264–289 (`flex-1 md:flex-none`, icon+short label on mobile).
3. **Mobile-safe Kanban** — Pipeline L549: horizontal scroll + `snap-x` + `touch-pan-x` (vertical page scroll preserved) + `min-h-[calc(100dvh-14rem)]` (iOS-safe) + `md:grid-cols-3` for iPad + `min-w-[260px]` columns; scroll-hint pill (logic needs fixing per 3.1).
4. **Sticky action bar with safe-area** — Create L1338: `sticky bottom-0` + `pb-[calc(0.75rem+env(safe-area-inset-bottom))]` + full-width primary button on mobile (`w-full sm:w-auto`).
5. **Width-capped modals, not fixed-width** — Create/Pipeline: `max-w-lg/md/sm w-full p-6`, `max-h-[85vh]` + internal `overflow-y-auto`; fits 360px without full-screen special-casing.
6. **Tables wrapped in `overflow-x-auto`** (Dashboard L1257/1932) instead of clipping; columns hidden with `hidden lg:table-cell` as a real progressive-enhancement.
7. **Label swapping** — `hidden sm:inline` / `sm:hidden` short labels (Intake Scan button, Create Register button, Dashboard headings) — cheap and effective.
8. **`grid-cols-1 sm:grid-cols-2 lg:grid-cols-N` everywhere** — forms (Create), diagnostics (L1160), KPI cards (Dashboard L674), stat chips with `min-h-[84px]` (Intake L310).
9. **`inputMode="numeric"` + live length counter** on IMEI (Create L~990).
10. **`col-span-2` full-width "Final Estimate"** in the 2-col summary grid (Create L~1070) — mobile-correct math block.
11. **Scrollable pill rows** with `overflow-x-auto no-scrollbar` (Dashboard tabs L823, warranty filters L1832, catalog group pills Create L~1590).
12. **`role="button"` + `tabIndex` + Enter/Space keydown** on clickable cards (Dashboard KPI cards, Pipeline card body) — keyboard a11y already handled.

---

## Top 5 worst offenders

1. **Pipeline: exception stages unreachable on mobile** — controls hidden <lg (L466), columns gated on `showAllStages` (L555), yet the hint promises "Scroll for Cant Repair / Customer Not Repair" (L1193). Mobile users lose access to 2 entire workflow stages. **(P0)**
2. **Create Ticket: intake-photo delete is hover-only** (`opacity-0 group-hover:opacity-100`, L1269) — impossible to remove a wrong photo on touch; bad photos become permanent ticket data. **(P0)**
3. **Intake roster: 9-column fixed-width table (~912px of `w-[…px]` columns, L431–439)** still switchable on phones via the segmented control (L270–289) → unusable horizontal-scroll table with 9px fonts on 360px. **(P1)**
4. **Pipeline: drag-and-drop is the primary stage-move mechanism** (`draggable` L641) with no touch fallback — completely inert on iPhone/iPad; mobile stage changes require the hidden-in-modal timeline. **(P1)**
5. **Touch targets below 40px everywhere in dense controls** — 26–32px buttons: `h-8 w-8` detail icons (Intake L529/607), card action trios `py-1` (Pipeline L724), 21×3 Pass/Fail/N/A `py-1` (Create L1183), `p-1.5` icon buttons (Dashboard L1361/2036). **(P1, systemic)**
