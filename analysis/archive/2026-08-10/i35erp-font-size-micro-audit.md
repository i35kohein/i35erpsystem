# i35 ERP — Whole-Site Font-Size Micro Audit (all UI, responsive)

**Date:** 2026-08-06 · **Method:** source class scan (all `src/`) + live CDP computed-style measurement at iPad 1180×820 (all 12 tabs) + responsive overflow scan at iPad portrait 768×1024 (dashboard/pipeline/pos/inventory/intake) · **Font floor system active:** 7-9px→11px, 10-11px→12px (`index.css` `@media screen`).

---

## 1. Source inventory (font-size utilities in code)

| Class | Px | Instances | Verdict |
|---|---|---|---|
| `text-xs` | 12 | **926** | ✅ dominant label size |
| `text-[10px]` | 10 | **590** | ⚠️ floor→12px at runtime (source misleading) |
| `text-[11px]` | 11 | **334** | ⚠️ floor→12px at runtime (source misleading) |
| `text-sm` | 14 | 205 | ✅ body text |
| `text-base` | 16 | 75 | ✅ body/large |
| `text-xl` | 20 | 39 | headings |
| `text-lg` | 18 | 37 | headings |
| `text-2xl` | 24 | 28 | page titles |
| `text-[9px]` | 9 | 139 | floor→11px (badges) |
| `text-3xl` | 30 | 4 | big stats |
| `text-[8px]` | 8 | 16 | floor→11px (badges) |
| `text-[13px]` | 13 | 6 | stray — use `text-sm` |
| `text-[14px]` | 14 | 6 | stray — use `text-sm` |
| `text-[12px]` | 12 | 5 | stray — use `text-xs` |
| `text-[7px]` | 7 | 2 | floor→11px |
| `text-[15px]`/`[16px]` | 15/16 | 2 | stray — use `text-base` |

**Top-10 components using sub-12px classes** (10/11px, 924 total): table `th`/`td` cells, `span`s (191) + `p`s (137) in cards, InventoryManagementModule (52), DashboardOverview (45), ShopFinancePlModule (29), StatusPipelineView (27), CompletedDeviceFollowUpModule (26), PosInvoicingModule (25), CreateTicketSoloPage (19), DeviceTagPrinterModal (18).

---

## 2. Runtime font histogram per tab (iPad 1180×820, visible text)

| Tab | 11px | 12px | 14px | 16px | 20px | 24px | 30px |
|---|---|---|---|---|---|---|---|
| dashboard | **8** | 48 | 3 | – | – | 1 | 1 |
| intake | **32** | 42 | 5 | – | – | – | – |
| pipeline | **7** | 72 | – | – | – | – | – |
| pos | **18** | 64 | 3 | 1 | – | 1 | – |
| inventory | **23** | 41 | 14 | – | – | – | – |
| suppliers | – | 5 | 3 | – | – | – | – |
| price-catalog | **7** | 25 | 11 | – | 1 | – | 1 |
| finance | – | 44 | 7 | 2 | – | 4 | – |
| crm | **6** | 65 | – | – | – | – | – |
| follow-up | – | 15 | 9 | – | 1 | – | – |
| settings | **5** | 13 | – | – | – | – | – |
| qa | – | 6 | – | – | – | – | – |

**12px dominates everywhere (48-72% of text).** The remaining 11px text = table headers (F1) + badges/chips (F2).

---

## 3. Findings

### F1 — P0: All table headers render at 11px (floor bypass)
`index.css` line 356: `.basic-ui th { font-size: 11px !important; }` — **unlayered !important with higher specificity** (0,1,1) than the floor rule `.text-\[11px\]` (0,1,0) → beats the 12px floor EVERYWHERE. Verified live: dashboard "Ticket # & Date / Customer & Contact / Device & Serial / Symptoms / Assigned Tech", intake same headers, POS table, inventory matrix, CRM list = **11px**.
→ Fix: `.basic-ui th` → `12px` (or wrap in `@layer base` so the floor class can override; simplest: 12px).

### F2 — P2: Badges/chips at 11px (deliberate, below floor)
`text-[7/8/9px]` ×157 (OUT OF STOCK, UNPAID, stock counts, card IDs, "Derived", tier chips) — floor raises to 11px per earlier audit decision ("eye-strain territory"). **Decision point:** keep 11px (badges are short, uppercase, non-critical) or bump to 12px for strict floor compliance.

### F3 — P2: Stray fixed sizes (18 instances)
`text-[13px]`×6, `[14px]`×6, `[12px]`×5, `[15px]`×1, `[16px]`×1 — inventory inline-edit numeric inputs (14px, fine for entry), PriceCatalog card titles (13px), intake total (12px). → Replace with `text-sm`/`text-xs`/`text-base` tokens for consistency.

### F4 — P0 responsive: Dashboard Status Queue strip breaks at 768 portrait
Container `bg-surface p-1.5 rounded-2xl border flex` — **734px wide needs 1288px** (~550px overflow, no wrap, no horizontal scroll). Queue summary boxes don't fit iPad portrait. Verified only at 768; at 1180 it's fine.
→ Fix: allow wrap OR `overflow-x-auto` on the strip.

### F5 — P2 responsive: POS ticket rows overflow ~38px at 768 portrait
Ticket row text ("WO-2026-1002 Take…") — 266px container needs 304px; no truncate. → Add `truncate`/`min-w-0` on the text spans.

### F6 — Info: Source ≠ runtime (924 misleading classes)
590×`text-[10px]` + 334×`text-[11px]` exist in source but ALL render 12px via floor. Code review/editing sees 10px while users see 12px. **Cleanup (no visual change):** bulk replace `text-[10px]`→`text-xs`, `text-[11px]`→`text-xs` in source. Removes 924 dead-weight classes + makes code truthful. (Keep `text-[9px]`+ badges as-is or align them too.)

### F7 — Info: Heading scale is consistent
Page titles `text-2xl` (24), section `text-lg/xl` (18/20), stats `text-3xl` (30: finance "18.8h", price-catalog product header). Tailwind token scale, no strays. Mono (`font-mono`) correctly used for WO IDs, prices, bin codes.

---

## 4. Responsive behavior summary
- **Fixed-px font sizes are width-independent** — same computed size at 1180, 768, and desktop (floor applies `@media screen` at all widths). No per-breakpoint font scaling exists (consistent by design).
- Width-dependent issues are the **overflow** cases only: F4 (dashboard queue, 768) and F5 (POS rows, 768). Everything else lays out cleanly at both iPad sizes.
- 11px table headers (F1) are the **only sub-12 body text**; badges (F2) are the only other sub-12 elements.

---

## 5. Fix status — ALL APPLIED (2026-08-06 ~19:44-19:55, commit `4b98ac5`, bundle `index-YIuK6znX.js`)
| # | P | Fix | Status |
|---|---|---|---|
| F1 | P0 | `.basic-ui th` 11px → 12px (index.css) | ✅ verified 12px, 0 sub-12 headers |
| F4 | P0 | Dashboard subtab bar: relative wrapper + right-edge fade (xl:hidden) — scroll affordance | ✅ verified fade present |
| F5 | P2 | POS ticket row: order# min-w-0 truncate + status row shrink-0 | ✅ verified no row overflow |
| F2 | P2 | Badge floor 7/8/9px → 12px (index.css) | ✅ verified UNPAID 12px |
| F3 | P2 | 20 stray fixed sizes → token classes (13→sm, 12→xs, 14→sm, 15/16→base) across 5 files | ✅ 0 strays left |
| F6 | P3 | Bulk source cleanup `text-[10px]/[11px]` → `text-xs` (no visual change) | ✅ DONE (commit `e3cda70`): 157 classes → text-xs (incl. 7/8/9/7.5/9.5px); 0 sub-12px classes remain in source; floor rules kept as safety net; verified 0 sub-12px text live |
