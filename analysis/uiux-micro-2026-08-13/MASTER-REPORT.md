# UI/UX Micro-Detail Audit — Master Report (2026-08-13)

Full sweep of the i35 ERP frontend (~48k lines, 78 TSX files) for UI/UX micro-details.
Read-only audit; no source files touched. Per-area detail files:

| Area | Scope | Findings | File |
|---|---|---|---|
| A | App shell + common components | 103 | `area-A-app-common.md` |
| B | Intake + POS | 101 | `area-B-intake-pos.md` |
| C | Inventory + Suppliers + CRM | 80 | `area-C-inventory-suppliers-crm.md` |
| D | Dashboard + Finance + FollowUp | 74 | `area-D-dashboard-finance.md` |
| E | QA + Portal + Settings + Prices | 55 | `area-E-qa-portal-settings-prices.md` |
| F | Devices + AI + Trello + Mermaid + Auth | 86 | `area-F-misc.md` |
| **Total** | | **499** | |

**Severity:** 7× P1 (visible/annoying) · 177× P2 (polish) · 315× P3 (nitpick)

---

## P1 — fix first (visible defects)

1. **Blanket `outline: none` in `index.css:1316`** — kills keyboard focus visibility for every control in the app. (A)
2. **Broken price label text** — `Cost Price ' {currency}')` renders literal garbage in InventoryManagementModule L2343/L2353/L2617/L2627/L2868. (C)
3. **Literal `{currency}` string** in matrix cell tooltip — InventoryManagementModule L2063 (missing `$`). (C)
4. **Money printed unformatted** — `MMK125000` in CompletedDeviceFollowUpModule L477 (no `toLocaleString()`). (D)
5. **Fake barcode on 3"×2" sticker** — DeviceTagPrinterModal L962 renders a non-scannable barcode customers will scan and get nothing. (F)

## Recurring themes (fix once, fixes everywhere)

### 1. Hardcoded `MMK` vs `{currency}` token (~25 spots)
Intake, POS, QA (L361/L497), Trello (L345), CustomerNotification (L249)… Replace with `systemSettings?.currencySymbol || 'MMK'`. (A/B/C/E/F)

### 2. Modal chrome is inconsistent (10+ modals)
Mixed backdrops (`bg-ink/40` vs `bg-slate-900/50` vs `bg-black/70`), inconsistent radii (`rounded-xl` vs `rounded-2xl`), shadows (`shadow-xl` vs `shadow-2xl`), missing Esc-close, missing `role="dialog" aria-modal`, no focus trap/restore. Fix: one shared modal shell + tiny `useDialog` hook. (A/B/C/D/E/F)

### 3. Icon buttons too small / no focus ring
28px & 20px icon buttons across diagnostic toolbar, roster row actions, POS line items, close buttons → bump to ≥32px + `focus-visible:ring-2`. (B/C)

### 4. Icon-only buttons missing `aria-label`
Close ×, Import CSV / Export JSON / Reset Defaults (PriceSettingsModal L541–566), X closers in inventory modals. (A/C/E)

### 5. Color contradicts meaning
- Tab badge always danger-red even for positive counts (Finance L500 — "7 Sold" reads as alert). (D)
- Net Profit stays brand-blue when negative (Finance L596, FollowUp L324). (D)
- Raw-green palette in PriceSettingsModal (`bg-green-50/border-green-200`) vs `success` token elsewhere. (E)

### 6. Async feedback lies or is missing
- `navigator.clipboard.writeText` shows "Copied" without `.catch()` (Dashboard L286, Timeline L277). (D)
- `window.prompt` in bulkSetReorder (Inventory L328) — route through styled `confirmDialog`. (C)
- Missing toasts on save failures in several modules. (A/D)

### 7. A11y gaps
- QA roster `<tr>` clickable without keyboard access (E, L434).
- `div`-with-onClick instead of `<button>` in several places. (A)
- Missing `type="button"` on buttons in forms. (A)
- Login error box / AI chat / notification textarea need `role="alert"`. (F)
- Low-contrast gray-on-gray text. (A)

### 8. Data presentation
- Raw ISO timestamps on customer portal repair logs (L742) + chat (L1038). (E)
- No `tabular-nums` for money columns. (A)
- Missing truncation on long phone/email/ticket IDs. (A/D)

## Top 12 quick wins (highest impact per line of code)

1. `focus-visible: outline` fix in index.css — restores keyboard focus app-wide. (A)
2. Fix 5 broken `Cost Price` labels + literal `{currency}` — visible text corruption. (C)
3. `toLocaleString()` on FollowUp L477 money. (D)
4. Semantic tab-badge + negative-profit colors in Finance. (D)
5. Currency token sweep (~25 spots, one grep + sed). (B/C/E/F)
6. `role="dialog" aria-modal` + Esc on the 6 most-used modals. (D/B)
7. `aria-label` on all icon-only buttons (close ×, CSV/JSON/reset). (C/E)
8. QA roster row keyboard access. (E)
9. Real barcode or decorative styling on the sticker. (F)
10. `hover:bg-transparent!` on QA Table|Cards toggles (App.tsx:2461/2471) erases active fill on hover. (A)
11. Fix invalid `border-success/30/80` class (OfflineSyncStatusBadge L63). (A)
12. Replace text `×` with lucide X icon + aria-label (App.tsx:2135). (A)

## Per-area highlights

- **A (app/common):** focus loss (P1), 3 dropdown surfaces disagree (`bg-white` vs `bg-surface`), 2 parallel confirm-dialog systems (ConfirmDialog vs ConfirmDeleteModal), hover state erases active toggle fill.
- **B (intake/POS):** "Create Ticket & Print" label doesn't print (misleading), diagnostic fee `5000` hardcoded in 2 places, 10 modals without unified behavior, small icon buttons.
- **C (inventory/suppliers/CRM):** price label corruption (P1), native prompt, modal chrome drift, `z-60` invalid class (RecycleBinModal L233) → `z-[60]`.
- **D (dashboard/finance):** unformatted MMK (P1), alert-red badge on positive counts, clipboard lies, 6 modals no dialog semantics.
- **E (QA/portal/settings/prices):** raw ISO timestamps on customer-facing portal, QA table not keyboard accessible, raw-green palette, icon-only buttons lose labels on mobile.
- **F (misc):** fake barcode (P1), QR reticle mismatches decode box (qrbox 256×176), inconsistent backdrops, `MMK` hardcode + missing `|| 0` guards that can crash on legacy tickets.

## Suggested fix order

1. **P1 batch** (5 fixes, ~15 min) — visible defects + text corruption.
2. **Currency token sweep** (one commit) + `toLocaleString()`.
3. **Modal shell unification** — biggest structural win; new modals inherit it.
4. **A11y pass** — focus-visible CSS, aria-labels, keyboard rows.
5. **P2/P3 polish** — color semantics, badge colors, barcode, QR reticle.
