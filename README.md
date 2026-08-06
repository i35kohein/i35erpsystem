# i35 Apple Service — ERP System

iPad-optimized repair-shop ERP (React + Vite + TypeScript + Tailwind v4 + Supabase).
Live: https://erp.i35appleservice.com · Deploy: `./deploy.sh` · Lint: `npm run lint`

## Button policy (required reading before adding UI)

**Every interactive button MUST use the `<Button>` component** from `src/components/ui`
(barrel: `import { Button } from './ui'`). Raw `<button>` tags are banned outside the ui kit.

Why: one definition = one look, one touch-target standard (40px), tokenized colors,
consistent hover/focus/disabled states. The earlier whole-site audits found 477 raw
buttons with 40+ different inline class combinations — that's what this policy kills.

### Variants & sizes available

| Variant | Use for | Size | Use for |
|---|---|---|---|
| `default` | primary actions (brand) | `default` | h-11/lg:h-9 standard |
| `destructive` | delete/danger | `sm` | h-10/lg:h-8 compact |
| `outline` | secondary bordered | `lg` | h-12/lg:h-11 big CTA |
| `secondary` | neutral buttons | `icon` | h-10 w-10 icon-only (40px) |
| `ghost` | subtle/toolbar | `iconSm` | h-8 w-8 in-table icons |
| `link` | inline text link | | |
| `success` | green actions | | |
| `chip` | filter chips / tags (h-8 pill) | | |
| `iconGhost` | icon buttons, muted (navbars) | | |

`className` is merged via tailwind-merge (`cn`) — you can override size/spacing per use.

```tsx
import { Button } from './ui';
<Button size="sm" onClick={...}>Save</Button>
<Button variant="iconGhost" size="icon" aria-label="Filter"><Filter className="h-4 w-4" /></Button>
<Button variant="chip" onClick={...}>iPhone 15 Series</Button>
```

### Enforcement

`npm run lint` runs `tsc --noEmit` + `scripts/check-button-policy.mjs`, which fails
the build if the raw-`<button>` count EXCEEDS the baseline (477 at adoption). The
baseline is lowered as legacy buttons are migrated. Migration is in progress —
do NOT add new raw buttons.

### Legacy migration status

Tracked in `analysis/i35erp-button-policy.md` — files converted so far are listed
there; the biggest remaining offenders: InventoryManagementModule (78), App.tsx (35),
StatusPipelineView (27), CreateTicketSoloPage (26).

---

## Quick reference
- **State lifting pattern:** module state lifted to App = prop-with-local-fallback
- **iPad vs desktop:** clean UI is iPad-only; desktop keeps its original layout
  (`useIsIpad` hook gates everything)
- **Font floor:** nothing under 12px on screen (`@media screen` floor in index.css)
- **Colors:** Carbon design tokens in `carbon-coat.css` (brand #0f62fe, success #24a148,
  purple #8a3ffc); use `--color-*` tokens, never raw hex
