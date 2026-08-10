# i35 ERP — Label Page (Device Intake Print Voucher / Tag Printer) Micro Analysis

**Date:** 2026-08-06 · **Scope:** `src/components/common/DeviceTagPrinterModal.tsx` (A4 Job Voucher + 3"x2" Sticker Tag — opened from Intake/Pipeline/POS/QA via "Print ticket sticker") · **Method:** full source review + live CDP measurement at iPad 1180×820 and 768×1024 (modal opened via intake print trigger, both paper modes measured) · deployed bundle `index-YIuK6znX.js`

---

## What the page is
One modal, two paper formats:
1. **A4 Job Voucher** — shop header (logo/name/address/web/phone), QR + voucher #, customer + device cards, service items table w/ totals, 21-point diagnostic report (4 display formats), terms + custom footer note. Layout/color driven by System Management settings (a4PrintColorMode/Density/ShowDiagnostics/…, receiptFooter*).
2. **3"×2" Sticker Tag** — shop name/phone, order # + service chip, device model, customer/passcode, S/N/color, barcode block + QR.
Print CSS: `@page A4 portrait / 3in 2in`, print-condensed A4 (`a4-voucher-print` 7-8px), full `no-print` isolation of the app shell. **Print output is correct and unaffected by the font floor (floor is `@media screen`-only).**

---

## Verified-good (keep)
- Modal fits both iPad sizes: 1180 → 738×800 (top 41/bottom 779); 768 → 736×850 (top 87/bottom 937 < 1024) ✓
- A4 preview: **0 overflows** at 1180 (800px wide); 141 text nodes at 12px, headers 16px, section 14px ✓
- Tag preview: 384×234, **0 overflows** (even with the new 12px badge floor), at both widths ✓
- ESC close, paper toggle, print button all functional; print CSS intact (A4 condenses to 7-8px in print, tag prints at true 7.5-11px)
- Dual voucher, monochrome/color modes, footer line-size ranges — all render (source review)

---

## Findings

### F1 — P1: All modal control buttons are 32–36px (below the 40px floor)
Measured live (iPad 1180):
| Control | Class | Measured | Should be |
|---|---|---|---|
| Paper segment container | `h-9` | 36px | `h-10` (40) |
| "A4 Job Voucher" / "3\"x2\" Sticker Tag" buttons | `h-7` (28px, min-height floor → 32) | **32px** | `h-8` inside h-10 container |
| Header Close | `h-9 w-9` | **36px** | `h-10 w-10` |
| Footer Close | `px-4 py-2` | **34px** | `h-10 px-4` |
| Footer "Print / Save PDF" | `px-5 py-2` | **32px** | `h-10 px-5` |

### F2 — P1: "Print ticket sticker" triggers are 36px
- Intake module trigger: `h-9 w-9` (36px)
- TicketDetailInspectorModal print button: `h-9 w-9` (36px) — shared by pipeline/POS/QA/follow-up
→ both `h-10 w-10`

### F3 — P0: Font floor escapes — fractional sizes render sub-12px on screen
- `text-[7.5px]` ×2 ("Check Status" caption under QR — A4 header + tag)
- `text-[9.5px]` ×2 (A4 header address / website / phone lines)
Measured live: 7.5px and 9.5px computed on screen. The floor rules cover only integer 7/8/9/10/11px → fractional sizes slip through. **Fix:** extend `@media screen` floor with `.text-\[7\.5px\],.text-\[9\.5px\]{font-size:12px!important;line-height:1.4!important}`. Print unaffected (floor is screen-only). Verified the A4 header will still fit: address line wraps naturally inside the header column.

### F4 — P2 (info, no change needed)
- Modal subtitle `text-[11px]` → floored to 12px ✓ (fine)
- Segment pill + X button alignment: after F1 all controls sit on the same 40px line
- `max-w-4xl` (896px) modal on iPad: preview column 800px — wide but fine; could cap preview narrower on tablets if desired (optional)

---

## Fix status — ALL APPLIED (2026-08-06 ~20:02-20:10, commit `b78f854`, bundle `index-CnWPD-IH.js`)
| # | P | Fix | Status |
|---|---|---|---|
| F3 | P0 | index.css: add `.\text-[7.5px]` / `.\text-[9.5px]` to the screen floor (12px) | 1 line |
| F1 | P1 | Modal controls → 40px: segment container h-10 (inner h-8 = 32px segmented pattern), header X h-10 w-10, footer Close/Print h-10 | ✅ verified: X/Close/Print 40px |
| F2 | P1 | Intake + TicketDetailInspectorModal print triggers → h-10 w-10 | ✅ source verified; modal opens via trigger |
