# i35 ERP — Whole-Site Color Analysis (all components, code + runtime)

**Date:** 2026-08-06 · **Method:** source scan of every color in `src/` (components + CSS) + live CDP computed-color measurement across 11 tabs at iPad 1180×820 (bg/text/border frequency + WCAG contrast on 112 unique text pairs) · bundle `index-CnWPD-IH.js`

---

## 1. The color architecture (3 layers — this is the core finding)

| Layer | What | Where |
|---|---|---|
| **A. Tailwind @theme tokens (Apple palette)** | `--color-brand #0071E3`, ink, muted, faint, line, line-strong, surface, success, danger | `index.css` @theme |
| **B. carbon-coat.css (ACTIVE coat)** | `:root` overrides → **Carbon IBM**: brand **#0f62fe**, ink **#161616**, muted **#6f6f6f**, line **#e0e0e0**, surface **#f4f4f4**, success **#24a148**, danger **#da1e28** + IBM Plex font + 4 straggler-hex overrides | `src/carbon-coat.css` (imported in main.tsx) |
| **C. .basic-ui theme vars (5 CSS themes)** | `--primary/--text-main/--text-secondary/--bg/--border/--success/--warning/--danger…` — default = **minimalist-clean** (#0F172A primary, #09090B text, #10B981 success, #EF4444 danger) | `index.css` `:root` + `[data-theme]` blocks |

**Runtime verdict:** layer B dominates the newer token-based UI (measured: brand #0F62FE ×315, ink #161616 ×875, muted #6F6F6F ×277, line #E0E0E0 ×155, surface #F4F4F4 ×47) — consistent Carbon look ✓. But layers A/C + hardcoded hexes leak through in older components → visible mismatches below.

---

## 2. Findings

### F1 — P1: 4 real WCAG contrast failures (all small 12px text)
Measured on-screen (computed colors, oklch converted):
| Text | Pair | Ratio | Location |
|---|---|---|---|
| "100% Gross" | emerald-500 `#10B981` on emerald-50 | **2.23:1** | Finance (ShopFinancePlModule ~487) |
| "✓ TARGET ACHIEVED" | emerald-500 on white | **2.54:1** | Finance (ShopFinancePlModule ~493) |
| "UNPAID" badge | amber-600 `#D97706` on `#FFF4E5` | **2.93:1** | POS ticket rows (PosInvoicingModule ~472) |
| "Inspect Bottlenecks" | white on amber-600 | **3.22:1** | Dashboard (DashboardOverview ~1084) |
Needs ≥4.5:1 (12px text). Fix: darken the greens to `#24a148`-family, amber text to `#B45309` (amber-700), white→`#1C1917` text on amber button or amber-700 button.

### F2 — P1: Two competing success greens (and it's not just cosmetics)
- **Carbon success `#24A148`** (coat token) vs **theme-var success `#10B981`** (emerald-500, minimalist-clean default).
- ROOT CAUSE (verified in live CSS): `.finance-module [class~="text-[#16A34A]"] … { color: var(--success) }` (index.css, specificity 0,2,0) **beats** carbon-coat's `.text-\[\#16A34A\] { color: var(--color-success) }` (0,1,0) → finance renders **#10B981** (theme var) instead of carbon #24A148. Same for emerald-300/400/700-950 classes in finance.
- Plus raw green hexes still in components: `#28A745` ×39, `#1E7E34` ×15, `#30B753` ×8 (only #16A34A/#28A745 are coat-overridden).

### F3 — P2: ~45 raw hex values still in components (~350 instances)
Biggest uncovered stragglers (carbon-coat does NOT touch them):
- `#F8F9FA` ×69 (surface — 3rd surface gray: #F4F4F4 token vs #F8F9FA vs #F8FBFD/FAFAFA/F9F9FB)
- `#AF52DE` ×42 + `#7360F2` ×27 + `#7C3AED` ×16 — **three purples** (payment methods/split)
- `#FF9500` ×23 (warning — vs theme #F59E0B/#EA580C/#ED7132 — 3+ oranges)
- `#7F7F7F` ×21 + `#526375` ×13 + `#C7C7CC` ×11 + `#424245` ×7 — 4 extra grays beyond muted #6F6F6F
- `#DC2626` ×15 (red-600 — vs carbon danger #DA1E28 — 2 reds), `#EAF8ED` ×20 / `#E5F1FF` ×8 / `#FFF4E5` ×4 (tint bgs), `#111111` ×16 (input text — vs ink #161616), `#27B1AE` ×6 + `#229ED9` ×5 (teal + 3rd blue), `#D8E5ED` ×25 (old border — vs #E0E0E0)

### F4 — P2: Dark-slate-900 text ×109 renders against the Carbon look
Measured `rgb(15,23,42)` (#0F172A) — e.g. `text-blue-900` "KBZPay / WavePay" label, `.basic-ui` elements using minimalist-clean `--text-main #09090B`/`--primary #0F172A`. The **.basic-ui theme system and the carbon tokens disagree** (near-black #0F172A/#09090B vs carbon ink #161616, dark #0F172A "primary" vs carbon brand #0F62FE) — older .basic-ui UI shows slate-900 where new UI shows carbon ink/brand.

### F5 — P3: Five .basic-ui themes + one carbon coat = 6 palettes maintained
`minimalist-clean` (default) / `nunito-navy` / `apple-clean` / `dark-slate` / `:root` fallback + carbon-coat. Each sets the same 16 var names with different values; the coat only overrides the 9 `--color-*` Tailwind tokens. Theme switching (if any) won't touch carbon colors → half the UI re-themes, half stays carbon.

---

## 3. Verified-good (keep)
- Carbon tokens are the dominant, consistent palette for token-based UI (brand/ink/muted/line/surface/success all uniform)
- Brand buttons #0F62FE on white/soft-blue text — contrast fine
- Borders mostly #E0E0E0 (155) — consistent hairlines
- Dark-slate theme exists for dark mode (vars defined; not audited visually — vision models down)

---

## 4. Fix status — ALL APPLIED (2026-08-06 ~20:24-20:35, commit `6453c6a`, bundle `index-BAAgmOBp.js`)
| # | P | Fix | Status |
|---|---|---|---|
| F1 | P1 | Finance greens → `text-success-deep` #188038 (5.02/4.77:1 ✓), UNPAID → #B45309 (4.62 ✓), Inspect Bottlenecks → amber-700 (5.02 ✓) | ✅ all 4 verified |
| F2 | P1 | Dual-success-green killed via F4 (theme var --success now #24a148 = carbon) — finance + coat + theme vars all resolve to the same green | ✅ verified |
| F3 | P2 | carbon-coat: + `--color-purple #8a3ffc` / `--color-warning #ff9500` / `--color-success-deep #188038`; overrides for #AF52DE/#7360F2/#7C3AED→purple, #FF9500→warning, #FAFAFA→surface, #DC2626→danger, #111111→ink, #7F7F7F/#526375/#424245/#C7C7CC→muted, #D8E5ED/#C7C7CC→line, #229ED9→brand, #1E7E34/#30B753→success | ✅ applied (bg-vs-color split fixed) |
| F4 | P2 | Default (`:root` + minimalist-clean) theme vars → carbon values: primary #0f62fe, text-main #161616, muted #6f6f6f, border #e0e0e0, success #24a148, danger #da1e28, purple #8a3ffc, bg #f4f4f4 | ✅ verified: --primary #0f62fe, --text-main #161616, --success #24a148 |
| F5 | P3 | Consolidate: one theme system (either the coat or the CSS themes, not both) | big, optional |
