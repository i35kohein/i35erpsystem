# i35 ERP — Create Ticket UI/UX Micro Diagnosis

**Date:** 2026-08-06 · **Scope:** `CreateTicketSoloPage` (slide-over drawer + wizard + standard mode) · **Method:** source review + live CDP geometry at 1180/1024 + screenshot vision analysis of 6 states (wizard steps 0-2, standard, standard-bottom, error toasts)

---

## Findings

### P0 — fixed this session (commit `83e5c7a`)
| # | Issue | Fix |
|---|---|---|
| 1 | **Duplicate error toasts stacked** — "Step 1 Required" fired twice (Next + validation), toasts piled over the sticky action bar blocking Next/Quick Create | **Toast dedup** in `addToast` (same type+title+message visible → skip) |
| 2 | **Toast overlap** — bottom-right toasts sat exactly on the drawer sticky bar (Next button) | Toasts → **top-24 right** (clears app topbar + drawer header + action bars) |
| 3 | **Wizard step scope broken** — step 0 (Customer) also showed Serial/IMEI + Intake Notes (badge 4A) + color/warranty; section numbers 1/2/2a/2b/4A/4C appeared out of order | Wizard hidden classes: Serial/IMEI + color/warranty → step ≥1; Notes/diagnostics/photos → step ≥3. **Step 0 now shows ONLY Customer** — numbering reads logically per step |
| 4 | **Warranty (2b) overlapped the Form Mode toggle** (y144 vs toggle 113-153 at 1024) — cause: color/warranty block missing wizard hidden class, floated over the toggle when device section was hidden | Same as #3 (hidden at step 0) — verified overlap gone |

### P1 — remaining (recommended next)
| # | Issue | Suggestion |
|---|---|---|
| 5 | **Standard mode at 1024+**: "Choose Device Model First" amber banner + Realistic Color card visually crowd the Serial card (nested `lg:grid` + `sm:grid` stacking) | Standard mode: make the inner color/warranty grid `gap-3`, add `min-w-0` to grid children, or collapse to 1 col below xl |
| 6 | **Section numbering** (1 / 2 / 2a / 2b / 3 / 4A / 4C) — fine per-step now, but Standard mode shows all at once (cognitive load) | Option: in Standard mode show plain section headers without the lettered badges |
| 7 | **Placeholder clipping** in narrow columns (Customer Name "e.g. Mg Mg / Dav…", Town "e.g. Yangon,") | Shorten placeholders or `text-xs` placeholders |
| 8 | **Grid inconsistency**: Town/City field wider than Customer Type; Serial card height < Customer card | Align the 2-col grids (uniform col widths), `items-start` on the grid |

### P2 — polish
| # | Issue |
|---|---|
| 9 | MapPin icon in Town/City slightly off-center vertically |
| 10 | Toast X touch target small (~16px) — bump to 28px hit area |
| 11 | Photo upload box "Take / Add Photo" text close to dashed border |
| 12 | Diagnostic grid N/A badges tight against card titles |
| 13 | "Quick Create" button close to the wizard step indicator (spacing) |
| 14 | Before/After diagnostic status colors use raw hexes (#16A34A, #15803D) — should use tokens |

### Good (keep)
- Sticky action bar solid + flush (fixed earlier); inputs uniform 40px; wizard stepper clear; Quick Create workflow (3-field → edit mode) works; success screen actions balanced.

---

## State after fixes (verified live @1180 + @1024)
- Step 0 = Customer only ✓ · Serial/IMEI + color/warranty appear at step 1 ✓ · Notes/diagnostics/photos at review ✓
- Single dedup'd toast at top-right, no action-bar overlap ✓
- No toggle/warranty overlap at 1024 ✓

## Suggested next round
1. P1-5/6/7/8 (standard-mode grid + placeholders) — medium
2. P2-9/10/13 — small polish batch
