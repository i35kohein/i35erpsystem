# UI/UX Micro-Detail Audit — Area D: Dashboard + Finance

Files audited (2026-08-13):
- src/components/dashboard/DashboardOverview.tsx
- src/components/finance/ShopFinancePlModule.tsx
- src/components/followup/CompletedDeviceFollowUpModule.tsx
- src/components/common/PrintableInvoiceModal.tsx
- src/components/common/WorkOrderStatusTimeline.tsx

Total findings: 74 (Dashboard 19 / Finance 19 / FollowUp 14 / Invoice 11 / Timeline 11)

---

## src/components/dashboard/DashboardOverview.tsx

### src/components/dashboard/DashboardOverview.tsx:796 — Total Revenue KPI uses smaller type than its sibling cards
- **Severity:** P2 (polish)
- **Issue:** The 4 headline KPI cards are the same semantic level, but Total Revenue renders `text-xl sm:text-2xl ... truncate block` while Active Repairs / Ready for Pickup / Avg Turnaround use `text-2xl sm:text-3xl`. The most important number on the dashboard is visually the smallest.
- **Suggestion:** Use the same `text-2xl sm:text-3xl font-black text-ink tracking-tight` as the other three cards; keep `truncate` only if overflow is a real risk (large MMK values).

### src/components/dashboard/DashboardOverview.tsx:141-159 — KpiCard styling diverges from headline cards for the same semantic level
- **Severity:** P2 (polish)
- **Issue:** `KpiCard` renders label as `text-xs font-bold text-muted uppercase` (no tracking) and value as `text-2xl font-extrabold`, while the 4 headline cards (L744-816) and section headers (L839/888/925) use `text-xs font-extrabold uppercase tracking-wider text-muted` and `text-2xl sm:text-3xl font-black`. Two different "KPI card" vocabularies in one file.
- **Suggestion:** Unify KpiCard to `text-xs font-extrabold uppercase tracking-wider text-muted` label + `text-2xl font-black` value, matching the inline cards.

### src/components/dashboard/DashboardOverview.tsx:286 — Clipboard copy has no failure handling and lies about success
- **Severity:** P2 (polish)
- **Issue:** `navigator.clipboard.writeText(msg);` — the promise is ignored and `setCopiedNoticeId(item.wo.id)` runs unconditionally, so "Copied Notice" shows even when the write failed (HTTP/non-secure context, permission denied). Silent failure.
- **Suggestion:** `navigator.clipboard.writeText(msg).then(() => setCopiedNoticeId(item.wo.id)).catch(() => toast.error('Copy failed — please copy manually'))` with a `setTimeout` reset in both paths.

### src/components/dashboard/DashboardOverview.tsx:634-637 — Hardcoded palette + tiny text in the inventory-fund reminder
- **Severity:** P3 (nitpick)
- **Issue:** `text-[10px]` arbitrary size and raw `text-violet-700` / `text-sky-700` colors inside the amber warning banner, while the finance module's KZH/APP chips use `bg-violet-100 text-violet-700 border-violet-200`. 10px on a warning banner is hard to read.
- **Suggestion:** Bump to `text-xs`, and reuse the same chip classes as ShopFinancePlModule (L1439-1449) for cross-module consistency.

### src/components/dashboard/DashboardOverview.tsx:872-876 — "Top device" row duplicates the first list entry
- **Severity:** P2 (polish)
- **Issue:** The Repair Health footer shows a "Top device … {topRepairDevices[0]?.count ?? 0} tickets" summary row, then immediately lists `topRepairDevices.slice(0, 3)` starting with the same #1 device + count. Duplicated info; and when the list is empty it shows "0 tickets" with no empty state.
- **Suggestion:** Drop the summary row and rely on the numbered list, or replace the row with a small "No data in period" note when `topRepairDevices.length === 0`.

### src/components/dashboard/DashboardOverview.tsx:698-711 — Warranty chips mix emoji with lucide iconography
- **Severity:** P3 (nitpick)
- **Issue:** The expiry badge uses a `⏳` emoji (`{item.remainingDays}d left`) while every other status indicator in the app uses lucide icons (Clock, ShieldCheck…). Emoji glyphs render differently per OS/font.
- **Suggestion:** Swap `⏳` for `<Clock className="w-3 h-3" />` inline before the text.

### src/components/dashboard/DashboardOverview.tsx:730 / 833 / 984 vs 1118 / 1246 / 1362 — Inconsistent grid gaps for same-style card rows
- **Severity:** P3 (nitpick)
- **Issue:** Card grids alternate `gap-3.5` (KPI row L730, summary L833, repair-data L984) and `gap-4` (inventory L1118, finance KPI L1246, ATV grid L1362) with no visual reason.
- **Suggestion:** Pick one gutter (e.g. `gap-4`) for full-width card grids and use `gap-3.5` only for tight sub-rows.

### src/components/dashboard/DashboardOverview.tsx:965 — Arbitrary `text-[11px]` vs `text-xs` badges in the same card
- **Severity:** P3 (nitpick)
- **Issue:** The warranty mini-list badge uses `text-[11px]`, while the identical badge style in the banner chips (L710) and roster table use `text-xs`/`text-[11px]` inconsistently — the same semantic "days left" badge has 3 different sizes across the file.
- **Suggestion:** Normalize all "Xd left" badges to `text-xs`.

### src/components/dashboard/DashboardOverview.tsx:1467 — Text "×" glyph instead of lucide X icon, no aria-label
- **Severity:** P2 (polish)
- **Issue:** The warranty search clear button renders a raw `×` character (with `size="iconSm"`) instead of the `<X>` icon used everywhere else; it's a button with only a visual glyph — no aria-label, and the touch target is ~20px.
- **Suggestion:** Use `<X className="w-3.5 h-3.5" />` inside an icon button with `aria-label="Clear search"` and `size="iconSm"` → keep ≥ 32px hit area via `p-2`.

### src/components/dashboard/DashboardOverview.tsx:1473-1499 — Warranty filter tabs are undersized, no focus-visible ring
- **Severity:** P3 (nitpick)
- **Issue:** `px-3 py-1` ghost buttons ≈ 28px tall (below the ~40px touch target) and the only focus indicator is the browser default outline, which `focus:outline-none`-style styling elsewhere suppresses.
- **Suggestion:** Add `min-h-10` and a `focus-visible:ring-2 focus-visible:ring-brand/50` class to each tab.

### src/components/dashboard/DashboardOverview.tsx:1667-1673 — CRM icon button has title but no aria-label
- **Severity:** P2 (polish)
- **Issue:** `<Button variant="iconGhost" size="iconSm" ... title="Open Customer Dossier in CRM">` — `title` only shows on hover; screen readers announce nothing meaningful.
- **Suggestion:** Add `aria-label="Open customer dossier in CRM"` (keep title for hover tooltip).

### src/components/dashboard/DashboardOverview.tsx:1449-1454 — Warranty search focus feedback is only a background change
- **Severity:** P2 (polish)
- **Issue:** `focus:bg-white focus:outline-none transition-all` — keyboard users get a barely-visible bg tint; no ring, and `outline-none` removes the default focus indicator.
- **Suggestion:** Replace with `focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand/50`.

### src/components/dashboard/DashboardOverview.tsx:1409-1412 — Double spacing from `mr-1` inside `space-x-1` flex
- **Severity:** P3 (nitpick)
- **Issue:** `<span aria-hidden ... className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block mr-1" />` sits in a `flex items-center space-x-1` parent — `space-x-1` plus `mr-1` adds a double gap between the ping dot and "Background Scanner Active".
- **Suggestion:** Drop `mr-1` and let `space-x-1` handle the gap.

### src/components/dashboard/DashboardOverview.tsx:1394-1430 — Warranty banner uses raw palette tokens instead of theme tokens
- **Severity:** P3 (nitpick)
- **Issue:** `text-slate-300`, `text-rose-200`, `text-amber-200`, `text-emerald-300`, `border-rose-500/40`, `bg-rose-900/60` etc. while the rest of the dashboard uses `text-muted` / `text-ink` theme tokens. Breaks dark/light theme theming and token discipline.
- **Suggestion:** Define banner-local semantic tokens (e.g. extend the theme with `onDark` text colors) or accept the palette deliberately and document it; at minimum replace `text-muted` (L1421) with a consistent `text-slate-300` like its siblings.

### src/components/dashboard/DashboardOverview.tsx:195-240 — TrendChart relies on magic `-ml-4` offset
- **Severity:** P3 (nitpick)
- **Issue:** `<div className="w-full h-64 mt-4 -ml-4">` — the negative margin is a magic number to align the chart's left axis with the card padding; it breaks if the card padding ever changes, and the CustomTooltip reads `payload[0].value` / `payload[1].value` without guards.
- **Suggestion:** Use `margin={{ left: -12 }}` inside the chart's own margin config instead of layout-negative-margin, and optional-chain the payload values (`payload[0]?.value`).

### src/components/dashboard/DashboardOverview.tsx:833-836 — `min-h-[210px]` cards leave uneven dead space
- **Severity:** P3 (nitpick)
- **Issue:** The three Compact Summary cards share `min-h-[210px]` but Repair Health's content is taller; Financial Pulse / Inventory & Warranty get stretched with empty space at the bottom, and the arbitrary 210px is a magic number.
- **Suggestion:** Drop `min-h` and let the grid stretch naturally, or set `items-stretch` with equal internal spacing so the footer rows align across cards.

### src/components/dashboard/DashboardOverview.tsx:1284 vs 1329 — Section title sizes inconsistent (`text-base` vs `text-sm`)
- **Severity:** P3 (nitpick)
- **Issue:** Same-level card titles in the finance subtab: "Revenue & Repairs Trend" is `text-base font-extrabold`, "Financial Revenue Intelligence" is `text-sm font-extrabold` — different sizes for identical hierarchy.
- **Suggestion:** Unify all subtab card titles to `text-sm font-extrabold text-ink` (or all `text-base`).

### src/components/dashboard/DashboardOverview.tsx:1174 — Fixed-width `w-20` revenue label with `text-[11px]`
- **Severity:** P3 (nitpick)
- **Issue:** Top Selling Parts row revenue `<span className="text-[11px] ... w-20 text-right">` — the fixed 80px width truncates long formatted values ("1,234,567 MMK" overflows/wraps) and 11px is below the established `text-xs` body size.
- **Suggestion:** Use `text-xs whitespace-nowrap tabular-nums` without the fixed width, letting the flex row shrink the bar instead.

### src/components/dashboard/DashboardOverview.tsx:1118-1145 — Inventory summary cards are bare while identical summary grids elsewhere use inset cells
- **Severity:** P3 (nitpick)
- **Issue:** The 3 inventory valuation cards are `p-4 ... space-y-1` with raw values, but the visually parallel "Financial Pulse" / "Inventory & Warranty" mini-grids wrap values in `p-3 bg-surface rounded-2xl` cells. Two densities for the same "stat card" concept within one dashboard.
- **Suggestion:** Either add surface cells to the inventory cards or remove them from the summary grids — pick one pattern for stat clusters.

---

## src/components/finance/ShopFinancePlModule.tsx

### src/components/finance/ShopFinancePlModule.tsx:500 — Inactive tab badge is always red, including "N Sold"
- **Severity:** P2 (polish)
- **Issue:** `isActive ? 'bg-white/20 text-white' : 'bg-danger text-white'` — every inactive badge renders danger-red, so the Parts Profit tab's positive badge "7 Sold" shows as a red alert while the Debts tab's "2 Overdue" uses the same red. Color no longer encodes severity.
- **Suggestion:** Give badges a semantic class per tab: `bg-danger text-white` only for `overdueDebtsCount`; `bg-brand text-white` (or `bg-success`) for the Sold badge.

### src/components/finance/ShopFinancePlModule.tsx:596-598 — Net Profit card stays brand-blue even when negative
- **Severity:** P2 (polish)
- **Issue:** `<span className="text-2xl font-black text-brand font-mono leading-none">{financialSummary.netProfit.toLocaleString()} {currency}</span>` — a loss (negative net profit) is displayed in brand blue with no sign coloring, while the dashboard's own margin card colors negative values `text-danger`.
- **Suggestion:** Mirror the dashboard pattern: `className={netProfit < 0 ? 'text-danger' : 'text-brand'}`.

### src/components/finance/ShopFinancePlModule.tsx:641-675 — Emoji icons in payment rows vs lucide icons everywhere else
- **Severity:** P2 (polish)
- **Issue:** Cash/KBZPay/Card/Split rows use raw emoji (`💵 📱 💳 🔀`) inside `<span>` labels, while the same card's header and all other sections use lucide-react icons. Emoji render inconsistently across platforms and look unpolished on a finance screen.
- **Suggestion:** Replace with lucide icons (e.g. `Banknote`, `Smartphone`, `CreditCard`, `Shuffle`) and keep the label text.

### src/components/finance/ShopFinancePlModule.tsx:1171 & 1284 — Modals lack dialog semantics, Esc, focus trap
- **Severity:** P2 (polish)
- **Issue:** Both the Add Expense and Supplier Payment modals are plain `<div className="fixed inset-0 ...">` — no `role="dialog"`, no `aria-modal`, no Esc-to-close, no focus trap, backdrop click doesn't close. The printable invoice modal (same app) already implements Esc.
- **Suggestion:** Add `role="dialog" aria-modal="true"`, an Esc keydown handler, and `tabIndex={-1}` + focus on open (a tiny `useDialog` hook reused across modals).

### src/components/finance/ShopFinancePlModule.tsx:1196-1200 vs 1290 — Close buttons inconsistent a11y
- **Severity:** P2 (polish)
- **Issue:** Add Expense modal close (`<X className="w-5 h-5" />` ghost button) has no aria-label, while the Supplier Payment modal close has `aria-label="Close debt payment"`. Same action, different accessibility treatment two screens apart.
- **Suggestion:** Add `aria-label="Close"` (or "Close add expense") to the expense modal close button.

### src/components/finance/ShopFinancePlModule.tsx:1652-1653 — Clickable table rows are keyboard-inaccessible
- **Severity:** P2 (polish)
- **Issue:** Sales-by-Day rows: `<tr className="cursor-pointer hover:bg-surface" onClick={() => setExpandedDay(...)}>` — no `tabIndex`, no `onKeyDown`, no `aria-expanded`. Keyboard users can't expand a day, and screen readers don't know the row is interactive.
- **Suggestion:** Either convert the first cell to a real `<button>` with `aria-expanded` / Chevron, or add `tabIndex={0}` + Enter/Space handling on the row.

### src/components/finance/ShopFinancePlModule.tsx:1665-1666 — Dead conditional: identical branches
- **Severity:** P3 (nitpick)
- **Issue:** `margin >= 40 ? 'bg-success/15 text-success-deep' : margin >= 20 ? 'bg-success/15 text-success-deep' : ...` — the first two branches are identical, so 20–39% margins render exactly like 40%+; the intended "good/ok" distinction is missing.
- **Suggestion:** Give the middle band its own class (e.g. `bg-brand/15 text-brand`) so 20-39% reads differently from 40%+.

### src/components/finance/ShopFinancePlModule.tsx:1439-1449 — KZH/APP chips hardcode violet/sky palette
- **Severity:** P3 (nitpick)
- **Issue:** `bg-violet-100 text-violet-700 border-violet-200` / `bg-sky-100 text-sky-700 border-sky-200` — raw palette rather than theme tokens; also duplicated in the dashboard reminder (L634-637). Any theme change won't propagate.
- **Suggestion:** Add theme tokens (e.g. `--color-owner-kzh` / `--color-owner-app`) and reference those.

### src/components/finance/ShopFinancePlModule.tsx:957 — 9px owner chip text
- **Severity:** P3 (nitpick)
- **Issue:** `<span className="rounded px-1.5 py-0.5 text-[9px] font-black uppercase ...">` — 9px is below readable size for a data table cell.
- **Suggestion:** Use `text-[10px]` at minimum, or `text-xs` with tighter padding.

### src/components/finance/ShopFinancePlModule.tsx:1542-1574 — Second KPI card design in the same module (w-7 chips, 10px labels)
- **Severity:** P2 (polish)
- **Issue:** Parts-revenue KPI cards use `w-7 h-7 rounded-lg` icon chips and `text-[10px]` labels with `tabular-nums`, while the Financial Overview cards (L518-608) use `w-12 h-12 rounded-2xl` chips and `text-xs` labels. Same "KPI card" semantic, two designs in one module.
- **Suggestion:** Unify on the `w-12 h-12 rounded-2xl` + `text-xs` pattern (keep `tabular-nums` — it's the good part).

### src/components/finance/ShopFinancePlModule.tsx:1585-1608 — Parts Profit Summary panel labels at 9-10px
- **Severity:** P3 (nitpick)
- **Issue:** `text-[9px]` / `text-[10px]` uppercase labels on the dark panel (e.g. "Parts Revenue", "Parts Cost", "Parts Profit") — legibility is poor, especially the `text-white/40`-`white/70` opacity layers on top.
- **Suggestion:** Raise to `text-[10px]`→`text-[11px]`/`text-xs` and keep secondary text at ≥ `text-white/60` opacity.

### src/components/finance/ShopFinancePlModule.tsx:1378-1388 — Vertical dividers break in the stacked mobile layout
- **Severity:** P3 (nitpick)
- **Issue:** The Inventory Fund header uses `<div className="h-8 w-px bg-line" />` separators between three stat blocks. On `flex-col` mobile the divider renders as a stray 1px×32px vertical sliver between stacked blocks instead of a horizontal rule.
- **Suggestion:** Use `hidden sm:block` on the dividers (or `sm:flex-row`-only separators via border classes).

### src/components/finance/ShopFinancePlModule.tsx:871 / 1122-1124 / 1461 — Inconsistent date formatting across tables
- **Severity:** P2 (polish)
- **Issue:** Expenses show raw `{exp.date}` (YYYY-MM-DD), Debts show raw `Issued: {debt.issueDate}` / `Due: {debt.dueDate}`, while the Inventory Fund table uses `new Date(...).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })` ("Aug 10, 2026"). Three formats for dates in one module.
- **Suggestion:** Format all dates through one helper (e.g. `formatDate` from utils) — short style for tables: "Aug 10, 2026".

### src/components/finance/ShopFinancePlModule.tsx:883 — Money minus sign not tabular-aligned
- **Severity:** P2 (polish)
- **Issue:** Expense amounts render `-{exp.amount.toLocaleString()} {currency}` with the minus glued to the digits; the parts KPI cards use `tabular-nums` but the big tables don't, so digits jitter when scrolling.
- **Suggestion:** Add `tabular-nums` to all `font-mono` money cells and use a consistent minus handling (e.g. `<span className="text-danger">−</span>`).

### src/components/finance/ShopFinancePlModule.tsx:1661-1781 — Money column alignment flips between tables
- **Severity:** P3 (nitpick)
- **Issue:** Sales-by-Day / Category / Ticket tables center money columns (`text-center font-mono`), while Revenue / Expenses / Debts / Fund tables right-align money (`text-right`). Numeric columns should align consistently.
- **Suggestion:** Right-align all money/number columns in every finance table.

### src/components/finance/ShopFinancePlModule.tsx:1046-1056 & 916-923 — Small action/filter buttons (~26-28px)
- **Severity:** P3 (nitpick)
- **Issue:** Commission "Approve"/"Mark Paid" (`px-2.5 py-1`) and owner filter ALL/APP/KZH (`px-2 py-1`) are ~26-28px tall — below comfortable touch targets.
- **Suggestion:** Add `min-h-9`/`min-h-10` to both.

### src/components/finance/ShopFinancePlModule.tsx:1400 — "Mark All Settled" button has no disabled/confirm state
- **Severity:** P3 (nitpick)
- **Issue:** Full-width destructive-ish action can be double-clicked, firing `onSettleInventoryFund` twice; no inline confirmation.
- **Suggestion:** Add `disabled` while processing (or a `confirm` step: "Mark 5 tickets settled?" inline).

### src/components/finance/ShopFinancePlModule.tsx:489 — Tab bar buttons lack focus-visible styling
- **Severity:** P3 (nitpick)
- **Issue:** `active:scale-95` + `cursor-pointer` but no `focus-visible` ring on the 8 sub-tab buttons; keyboard tabbing gives no visible location.
- **Suggestion:** Add `focus-visible:ring-2 focus-visible:ring-brand/50` to the active/inactive class template.

### src/components/finance/ShopFinancePlModule.tsx:518-608 — Centered absolute icons can collide with wrapping footers
- **Severity:** P3 (nitpick)
- **Issue:** Overview KPI cards position the `w-12 h-12` icon at `top-1/2 -translate-y-1/2` with `min-h-[168px]`; on narrow widths the card footer (e.g. "Customer Paid (Labor): …") wraps to two lines and the icon can overlap the text.
- **Suggestion:** Pin the icon with `top-4 right-4` (not vertically centered) or move it into the flow next to the label.

---

## src/components/followup/CompletedDeviceFollowUpModule.tsx

### src/components/followup/CompletedDeviceFollowUpModule.tsx:477 — Money printed without toLocaleString or separator
- **Severity:** P1 (visible/annoying)
- **Issue:** `{systemSettings.currencySymbol}{wo.totalAmount || 0}` renders e.g. "MMK125000" — no thousands separators and no space, unlike every other money value in the app ("125,000 MMK"). Most prominent numeric column in the roster.
- **Suggestion:** `{Number(wo.totalAmount || 0).toLocaleString()} {systemSettings.currencySymbol}` (match the app-wide `value {currency}` order).

### src/components/followup/CompletedDeviceFollowUpModule.tsx:478 — "Warranty undefined Days" when warrantyDays is missing
- **Severity:** P2 (polish)
- **Issue:** `Warranty {wo.warrantyDays} Days` — legacy tickets without `warrantyDays` render the literal string "undefined" (the invoice modal defensively defaults `{workOrder.warrantyDays || 90}`).
- **Suggestion:** `Warranty {wo.warrantyDays || 90} Days` (and append `·` fallback like the invoice).

### src/components/followup/CompletedDeviceFollowUpModule.tsx:487/497/507 — 28px action buttons via `!important` overrides
- **Severity:** P2 (polish)
- **Issue:** Call / Logs / Log buttons are forced to `!h-7 !min-h-7 w-7` (28px) with `!` important modifiers that fight the Button component's own sizing. Below the ~40px touch target and a maintenance smell.
- **Suggestion:** Add a `size="sm"` compact variant to the Button component (or use `h-9`) instead of `!` overrides; 36-40px min height.

### src/components/followup/CompletedDeviceFollowUpModule.tsx:526 & 738 — Modals use `backdrop-blur-xs`, rest of app uses `backdrop-blur-sm`
- **Severity:** P3 (nitpick)
- **Issue:** Both modals here use `backdrop-blur-xs`; the finance and invoice modals use `backdrop-blur-sm`. Inconsistent backdrop blur across the app.
- **Suggestion:** Unify to `backdrop-blur-sm`.

### src/components/followup/CompletedDeviceFollowUpModule.tsx:542-547 & 752-757 — Icon-only close buttons without aria-label
- **Severity:** P2 (polish)
- **Issue:** `<Button variant="ghost" onClick={...}><X className="w-4 h-4" /></Button>` — no aria-label/title on either modal's close button.
- **Suggestion:** Add `aria-label="Close follow-up log"` / `aria-label="Close history"`.

### src/components/followup/CompletedDeviceFollowUpModule.tsx:526-534 — Log modal can overflow short viewports
- **Severity:** P2 (polish)
- **Issue:** The Record Follow-Up modal is tall (summary card + 6 status buttons + stars + author + templates + textarea + date) with `max-w-lg` and NO max-height/scroll; the backdrop is `items-center p-4` without `overflow-y-auto`, so on small laptops the footer buttons fall off-screen.
- **Suggestion:** Add `max-h-[90vh] overflow-y-auto` to the modal panel (matching PrintableInvoiceModal's `max-h-[92vh]` pattern).

### src/components/followup/CompletedDeviceFollowUpModule.tsx:324-325 — Hardcoded violet shades vs theme purple
- **Severity:** P2 (polish)
- **Issue:** "2-Month Check" card uses `text-violet-900`/`text-violet-800` while the visually identical "1-Month Check" card (L317-319) uses theme `text-purple` — same semantic card, different colors.
- **Suggestion:** Use `text-purple` for both, or introduce one shared "violet" token.

### src/components/followup/CompletedDeviceFollowUpModule.tsx:329 & 339 — `bg-success/50` / `bg-warning/50` tint intensity inconsistent with siblings
- **Severity:** P3 (nitpick)
- **Issue:** Satisfied and Avg Rating cards use 50% background opacity while every other card in the row uses /10 (e.g. `bg-purple/10`, `bg-brand-soft/70`); the row looks unbalanced.
- **Suggestion:** Drop to `/15`-`/20` range for visual parity.

### src/components/followup/CompletedDeviceFollowUpModule.tsx:651 — Empty stars are nearly invisible
- **Severity:** P3 (nitpick)
- **Issue:** Unfilled rating stars use `text-line` (border-gray) on a `bg-warning/10` amber panel — very low contrast; users can't tell 5 stars exist.
- **Suggestion:** Use `text-warning/30` (or a dedicated star-empty token) instead of `text-line`.

### src/components/followup/CompletedDeviceFollowUpModule.tsx:324-339 — Card label weights differ across the same stat row
- **Severity:** P3 (nitpick)
- **Issue:** "Total Completed" and "Satisfied" labels use `font-semibold`, while "7-Day Check"/"1-Month Check"/"2-Month Check" use `font-bold` — same row, mixed label weights.
- **Suggestion:** Normalize to `font-bold` (or `font-semibold`) across all six stat cards.

### src/components/followup/CompletedDeviceFollowUpModule.tsx:477 — Money cell not tabular
- **Severity:** P3 (nitpick)
- **Issue:** The Amount cell is `font-mono font-extrabold` but lacks `tabular-nums`; digits shift when scrolling rows.
- **Suggestion:** Add `tabular-nums` (fold into the P1 money fix).

### src/components/followup/CompletedDeviceFollowUpModule.tsx:438-451 — Truncation widths are arbitrary and phone never truncates
- **Severity:** P3 (nitpick)
- **Issue:** `truncate max-w-[140px]` / `truncate max-w-[150px]` magic widths for name/device while the phone cell (`font-mono`) has no truncation — long numbers push the row.
- **Suggestion:** Replace magic widths with percentage/grid-based truncation (`min-w-0` + `max-w-full`) and add truncation to the phone cell.

### src/components/followup/CompletedDeviceFollowUpModule.tsx:526 & 738 — Modals lack Esc / focus management / role="dialog"
- **Severity:** P2 (polish)
- **Issue:** Neither modal handles Escape, traps focus, or declares `role="dialog"` (the printable invoice modal in this app already does Esc).
- **Suggestion:** Same shared dialog hook as the finance modals: Esc-close + focus first input + `role="dialog" aria-modal="true"`.

### src/components/followup/CompletedDeviceFollowUpModule.tsx:686 — Quick-template buttons swallow the click-to-fill pattern silently
- **Severity:** P3 (nitpick)
- **Issue:** Tapping a template replaces the entire textarea (`setFormNotes(tmpl)`) with no way to append or undo; accidental taps destroy typed notes.
- **Suggestion:** Append instead of replace (`setFormNotes(prev => prev ? prev + ' ' + tmpl : tmpl)`), or show a transient "Template added" state.

---

## src/components/common/PrintableInvoiceModal.tsx

### src/components/common/PrintableInvoiceModal.tsx:155 — Modal root missing dialog semantics and focus management
- **Severity:** P2 (polish)
- **Issue:** `<div className="printable-invoice-root fixed inset-0 ...">` has no `role="dialog"` / `aria-modal="true"`; focus is neither moved into the modal on open nor trapped, and it's not restored to the trigger on close (Esc works, but focus stays lost).
- **Suggestion:** Add `role="dialog" aria-modal="true"`, `tabIndex={-1}` + focus on open, and restore focus on unmount.

### src/components/common/PrintableInvoiceModal.tsx:239-241 — "Popout Print" becomes an unlabeled icon button on mobile
- **Severity:** P2 (polish)
- **Issue:** `<span className="hidden sm:inline">Popout Print</span>` hides the label under `sm`, leaving an icon-only button with only a `title` (no aria-label). Screen-reader and touch users get no name.
- **Suggestion:** Add `aria-label="Open print in new window"` to the button.

### src/components/common/PrintableInvoiceModal.tsx:336 — Empty address renders a dangling "Town / City:" label
- **Severity:** P3 (nitpick)
- **Issue:** `Town / City: <strong className="text-ink">{workOrder.customerAddress || ''}</strong>` — when no address is stored the printed invoice shows "Town / City:" with nothing after the colon.
- **Suggestion:** Conditional render (`{workOrder.customerAddress && <p>…</p>}`) or fall back to `'—'`.

### src/components/common/PrintableInvoiceModal.tsx:407 & 518 — 10px annotation text on a printed document
- **Severity:** P3 (nitpick)
- **Issue:** The "Internal part — tracked for inventory, not charged to customer" row note and the reconciliation note both use `text-[10px]` — tiny for a customer-facing print, and the row note repeats on every part row.
- **Suggestion:** Raise to `text-[11px]`/`text-xs`, and consider showing the internal-part note once in the totals box instead of per row.

### src/components/common/PrintableInvoiceModal.tsx:465 — Entire totals box set to font-mono, including prose labels
- **Severity:** P2 (polish)
- **Issue:** `<div className="bg-white p-4 rounded-xl border border-line space-y-2 shadow-2xs font-mono">` makes labels like "Labor & Services Subtotal:" render in monospace; the code then awkwardly adds `font-sans` to the final total's label to undo it. Mixing happens by accident.
- **Suggestion:** Put `font-mono tabular-nums` on the number spans only; keep labels in the default sans.

### src/components/common/PrintableInvoiceModal.tsx:382-420 — Money columns lack tabular-nums
- **Severity:** P3 (nitpick)
- **Issue:** The itemized table uses `font-mono` for prices but no `tabular-nums`; column digits can jitter between rows on screen (and in the printout).
- **Suggestion:** Add `tabular-nums` to the `font-mono` price/amount cells.

### src/components/common/PrintableInvoiceModal.tsx:226-231 — Printable content base size is 12px, then print-zoomed to 0.84
- **Severity:** P3 (nitpick)
- **Issue:** The invoice body is `text-xs` and the print CSS applies `zoom: 0.84` — a customer-facing A4 document effectively prints smaller than 12px. Legal-ish fine print gets hard to read.
- **Suggestion:** Use `text-sm` for the printable content region (keep `text-xs` for the modal chrome), and drop the 0.84 zoom for A4 (keep it only for 58mm thermal).

### src/components/common/PrintableInvoiceModal.tsx:233-249 vs 561-574 — Duplicate Print buttons in header and footer
- **Severity:** P3 (nitpick)
- **Issue:** Two identical "Print Invoice" buttons (header + footer) on the same modal; harmless but adds clutter, and their paddings differ slightly (`px-3.5 py-1.5` vs `px-5 py-2`).
- **Suggestion:** Keep the footer one (near the Close action) and drop the header duplicate, or make them identical.

### src/components/common/PrintableInvoiceModal.tsx:219-224 — Header vs footer padding mismatch on no-print chrome
- **Severity:** P3 (nitpick)
- **Issue:** Action header uses `px-5 py-3.5`, footer uses `px-6 py-3` — the modal's top and bottom bars don't share padding.
- **Suggestion:** Use `px-5 py-3` in both.

### src/components/common/PrintableInvoiceModal.tsx:161-162 — Print CSS depends on a fragile DOM shape
- **Severity:** P3 (nitpick)
- **Issue:** `body > #root > .basic-ui > *:not(.printable-invoice-root)` — the print stylesheet hard-codes the app's root nesting; any layout refactor silently breaks invoice printing.
- **Suggestion:** Add a `.printable-invoice-root`-scoped print class on the app shell instead of child selectors, or print the popout window path by default.

### src/components/common/PrintableInvoiceModal.tsx:511 — Final total lacks a currency-token class abstraction (minor)
- **Severity:** P3 (nitpick)
- **Issue:** All currency is interpolated as `{currency}` — good — but the final total's `font-black text-lg` has no `tabular-nums` while it's the row users scan most.
- **Suggestion:** Add `tabular-nums` to the final total span.

---

## src/components/common/WorkOrderStatusTimeline.tsx

### src/components/common/WorkOrderStatusTimeline.tsx:218 — Native window.alert for the read-only guard
- **Severity:** P2 (polish)
- **Issue:** `window.alert?.('Save is unavailable here — open the ticket from Intake/Pipeline to publish transition logs.')` — a native browser alert dialog, inconsistent with the app's toast system and jarring mid-flow.
- **Suggestion:** Import the app `toast` and call `toast.error('Save is unavailable here…', 'Read-only mode')` instead.

### src/components/common/WorkOrderStatusTimeline.tsx:277 — Copy audit summary has no failure handling
- **Severity:** P3 (nitpick)
- **Issue:** `navigator.clipboard.writeText(summaryText); setIsCopied(true);` — promise ignored; the "Copied" state shows even if the write failed.
- **Suggestion:** `.then(() => setIsCopied(true)).catch(() => {})` with a toast on failure (mirror the Dashboard fix).

### src/components/common/WorkOrderStatusTimeline.tsx:512 — Search icon vertically misaligned
- **Severity:** P3 (nitpick)
- **Issue:** `<Search className="w-3.5 h-3.5 text-muted absolute left-3 top-2.5" />` — positioned with `top-2.5` instead of `top-1/2 -translate-y-1/2` (as the dashboard and follow-up search inputs do), so the icon sits slightly off-center against the `py-1.5` input.
- **Suggestion:** Use `left-3 top-1/2 -translate-y-1/2`.

### src/components/common/WorkOrderStatusTimeline.tsx:369 — `text-muted` theme token on a dark slate card
- **Severity:** P2 (polish)
- **Issue:** The stage-card footer ("Current Stage / Completed / Upcoming") uses `text-xs text-muted` inside the dark `from-slate-900` header card; `text-muted` is tuned for light surfaces and reads with poor contrast here, while sibling text uses `text-slate-300`.
- **Suggestion:** Use `text-slate-400`/`text-slate-300` inside the dark header card (or introduce an `onDark-muted` token).

### src/components/common/WorkOrderStatusTimeline.tsx:35 — Mixed tokens and raw palette for the Taken Out stage
- **Severity:** P3 (nitpick)
- **Issue:** `color: 'text-muted border-slate-700 bg-ink/80'` mixes theme tokens (`text-muted`, `bg-ink/80`) with a raw `border-slate-700` in the same stage definition.
- **Suggestion:** Pick one system — e.g. `text-slate-300 border-slate-600 bg-slate-800/60` all raw, or all tokens.

### src/components/common/WorkOrderStatusTimeline.tsx:646 — Dashed empty state uses `border-line` instead of `border-line-strong`
- **Severity:** P3 (nitpick)
- **Issue:** `border border-dashed border-line` — every other dashed empty-state box in the app (dashboard, finance, follow-up) uses `border-line-strong`; this one looks fainter than its siblings.
- **Suggestion:** Change to `border-line-strong`.

### src/components/common/WorkOrderStatusTimeline.tsx:350-370 — Stage cards lack aria-label / focus-visible affordance
- **Severity:** P3 (nitpick)
- **Issue:** The clickable stage cards have `role="button"` + `aria-pressed` but no accessible name (the label text is inside, so it's implicit — acceptable) and no distinct `focus-visible` style; the selected `ring-2 ring-white` is the only focus cue and only matches the *selected* state.
- **Suggestion:** Add `focus-visible:ring-2 focus-visible:ring-brand/60` to the card class template.

### src/components/common/WorkOrderStatusTimeline.tsx:461-466 — Form controls lack label association (htmlFor/id)
- **Severity:** P3 (nitpick)
- **Issue:** The add-log panel's select and inputs are wrapped in `<label className="block ...">` without `htmlFor`/`id`, so clicking the label doesn't focus the control and SR association is only implicit.
- **Suggestion:** Add matching `id`/`htmlFor` pairs to the three fields.

### src/components/common/WorkOrderStatusTimeline.tsx:475-510 — Save button not disabled when note is empty
- **Severity:** P3 (nitpick)
- **Issue:** "Save & Publish Transition Log" is always enabled; `handleAddNewTransitionLog` silently returns on empty note (`if (!newLogNote.trim()) return;`) with zero feedback.
- **Suggestion:** Disable the button when `!newLogNote.trim()`, or show an inline error.

### src/components/common/WorkOrderStatusTimeline.tsx:522-530 — Filter pills are ~26px tall
- **Severity:** P3 (nitpick)
- **Issue:** `px-2.5 py-1` pills in the timeline toolbar — below the ~40px touch target (the follow-up module's equivalent uses `min-h-10`).
- **Suggestion:** Add `min-h-9`/`min-h-10`.

### src/components/common/WorkOrderStatusTimeline.tsx:574-598 — Timeline node offsets are magic numbers
- **Severity:** P3 (nitpick)
- **Issue:** Node dots use `-left-6 sm:-left-8` hard-coded against the rail's `pl-6 sm:pl-8`; any spacing tweak silently misaligns the dots with the connecting line.
- **Suggestion:** Derive the offset from the same CSS variable used for padding (e.g. `--timeline-rail: 1.5rem`) or use a grid/flex column with the rail as a real column.

---

## Top 5 quick wins

1. **FollowUp L477:** format money with `toLocaleString()` + currency token order (`125,000 MMK`) — the most visible inconsistency in the whole area, one-line fix.
2. **Finance L500:** make the tab badge color semantic (green/brand for "Sold", red only for "Overdue") — currently a positive count reads as a danger alert.
3. **Finance L596 & FollowUp L324:** negative Net Profit should render `text-danger`; 2-Month card should use the theme `text-purple` — two one-class fixes that kill the "wrong color for meaning" class of bugs.
4. **Dashboard L286 + Timeline L277:** attach `.catch()`/toast to both `navigator.clipboard.writeText` calls so "Copied" never lies and failures surface.
5. **All 6 modals in the area:** add `role="dialog" aria-modal="true"` + Esc-close (invoice already has Esc) + focus management via one tiny shared `useDialog` hook — biggest a11y+consistency win per line of code.
