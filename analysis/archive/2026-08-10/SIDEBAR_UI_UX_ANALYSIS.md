# Side Menu (Navigation) — UI/UX Analysis

**Date:** 2026-08-04 · **File:** `src/components/Navigation.tsx` (~580 lines) · **Baseline:** collapsed=false, 13 nav items, scrollable, width 256px

**Overall Score: 7 / 10** — clean Apple-style shell, good semantics; held back by hardcoded state, dead props, one fake count, and a heavy mobile bottom-nav variant.

---

## What's Working
- Uses `ui/` primitives (Button/Badge) — the reference implementation for the codebase.
- `aria-current`, `aria-label`, `aria-expanded`, backdrop for mobile drawer, 32px touch targets on desktop / 44px on mobile — a11y is solid.
- Role-aware nav (Admin/Reception/Technician filtering) + per-item badge counts wired to real work-order queues.
- Theme-remappable hex + live badge counts (intake/pipeline/QA/follow-up/POS) = useful at-a-glance status.
- Collapsed rail works; logo-tap → dashboard; version pill + system-online pill add polish.

---

## Findings

### P0 — Wrong / misleading
| # | Issue | Where | Evidence |
|---|-------|-------|----------|
| 1 | **Inventory badge is a fake constant** | `const lowStockCount = 2 // sample trigger` | Always shows badge "2" on Parts & Stock Matrix regardless of real stock. Other badges are real — this one is fabricated. **Must** compute from `parts` (below reorder level) or accept prop. |
| 2 | **POS badge logic counts "declined diagnostics" as ready-to-pay** | `posReadyCount` | Tickets that are `Cant Repair`/`Customer Not Repair` with any diagnostic get counted as "POS ready" — inflates the badge with unpayable tickets. |

### P1 — Skip. Confusing IA & wasted pixels
| # | Issue | Where |
|---|-------|-------|
| 3 | **Two side menus** — aside (desktop) + a full second mobile bottom-nav with duplicated labels/logic. The mobile bar uses raw classNames (not primitives) drifting from the desktop style. Hard to keep in sync. |
| 4 | **"More"/"Menu" button and "Intake Ticket" both live in the mobile bar** — but the bar is hidden under the same `isMobileMenuOpen` state; technician bar shows "My Jobs/QA/CRM/More" while admin shows 5 items. Two bars to maintain for ~9 entries. |
| 5 | **Dashboard is both a nav item AND the logo target AND a header action** — 3 ways to do the same thing (logo already says "Dashboard"); the dedicated "Dashboard" button duplicates the logo. |
| 6 | **Group label colors** `#86868B` on white = 3.98:1 contrast (sub-threshold) for 9px text; fine for decoration but it's the primary category signpost. |

### P2 — Dead code (no visual effect, just noise)
| # | Issue | Evidence |
|---|-------|----------|
| 7 | **Dead props: `searchQuery`, `setSearchQuery`, `onOpenAiAssistant`, `archivedCount`** — App passes all 4 but Navigation never renders a search box, an AI (Sparkles) button, or an archived badge. Either build the quick-search + AI entry or delete the props. |
| 8 | **Dead imports: `Search`, `Sparkles`, `ExternalLink`, `Trash2`, `LanguageSwitcher`, `Menu`** — imported but unused (Menu only used in the mobile bar which is `lg:hidden`… actually `Menu` IS used; `Search`/`Sparkles`/`ExternalLink`/`Trash2` unused). Note: `Search` appears 3× but only in the import + searchQuery props, no UI. |

### P3 — Polish
| # | Issue |
|---|-------|
| 9 | Collapsed rail shows only icon + (on hover) badge dot — no tooltip parity for the *Dashboard* and main CTA in collapsed mode; a11y relies on `title` only for some. |
| 10 | Group headers ("REPAIR / FINANCE / INVENTORY / MANAGEMENT") have a hard `w-8` divider that mis-aligns if group titles get long in Burmese. |
| 11 | "System online" is a static text (always shows green dot + "System online") — not actually connected to a health check; can mislead if offline. |

---

## What's already clean (P1/P2 pass confirmations)
- No clickable `<div>` (0 found by check script).
- No focus-visible ring missing — primitives supply focus rings.
- Logout, expand, close-menu buttons have `aria-label`.

---

## Recommended Fixes (applied this session)
1. **Inventory badge → real** — computed in App from `parts` (qty <= reorderPoint); removed the `2 // sample trigger` constant. Live: **457** low-stock parts, matches the Inventory module metric exactly (460 total, 337 at qty 0). *(done, commit 3dedb9b)*
2. **POS badge → only true payable-ready** — dropped the declined-diagnostic inflation; now counts only tickets with `postRepairChecklist`. *(done, 3dedb9b)*
3. **Delete the dead search/AI/archived props + unused imports** (Search, Sparkles, ExternalLink, Trash2, LanguageSwitcher; props `searchQuery`, `setSearchQuery`, `archivedCount`, `onOpenAiAssistant` removed from Navigation + App call). *(done, 3dedb9b)*
4. **Unify mobile nav** to a single source of truth or slim it (only Intake/Pipeline/POS/Menu). *(recommended next)*
5. **Hook the "System online" pill** to a real health check (or drop it). *(recommended next)*
6. **Deploy note:** `git add -A` swept in pre-existing uncommitted work; server.ts had unescaped Burmese quotes in the Telegram prompt → broke esbuild. Fixed + re-deployed (8bf5c24). Lesson: check `git status` before committing.

---
**Status:** Items 1–3 (P0/P1/P2 dead-code) fixed + deployed (3dedb9b, 8bf5c24). Items 4–5 queued as optional polish.
