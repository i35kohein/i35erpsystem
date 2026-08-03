# Kimi ERP — UI/UX Audit Report
**Date:** 2026-08-02 · **Scope:** Full app (11 modules, 49 tsx components) · **Method:** Live browser walkthrough (desktop 1440px + mobile 390px) + code-level pattern analysis

---

## Executive Summary

Kimi ERP is a dense, feature-rich repair-shop operations app with a clean Apple-inspired visual language (SF-style grays `#1D1D1F/#86868B`, system blue `#0071E3`). The overall design system is **consistent and professional**, and the information architecture (Repair → Finance → Inventory → Management) matches real shop workflow. The biggest UX risks are **tiny typography (10–11px dominant)**, **weak mobile ergonomics**, **sparse accessibility**, and **no dark mode** despite technicians often working in dim environments.

Overall score: **7/10** — strong bones, needs polish on readability, touch, and feedback states.

---

## 1. Information Architecture & Navigation ✅ Good

- Sidebar groups: Dashboard / REPAIR (Intake, Pipeline, QA, Follow-Ups, Price List) / FINANCE (POS, Shop Finance) / INVENTORY (Parts, Suppliers) / MANAGEMENT (CRM, System). Logical, matches daily flow: intake → repair → QA → payment → follow-up.
- Badge counts on nav (Intake 4, Pipeline 1, QA 2, POS 2) give live queue awareness — excellent for a busy shop.
- Bottom mobile nav exists (Intake, Pipeline, POS, CRM, Menu) — right 4 choices for a technician on the move.
- User identity + role ("Aung Kyaw (Manager) / Admin") + system status + version visible in sidebar footer — good ops hygiene.

**Issues:**
- Sidebar labels truncate at ~220px ("QA & Warranty Inspe…", "Parts Inventory & Sto…"). Either widen sidebar, reduce font, or add tooltip on hover.
- "System Management" vs module name "Settings" inconsistency in code (`navSettings`) — minor.
- No breadcrumbs or back affordance when deep inside Create Ticket flow (user relies on sidebar).

## 2. Visual Design & Consistency ✅ Good

- Single coherent palette: Apple HIG-inspired neutrals + `#0071E3` primary, semantic `#34C759` (success), `#FF3B30` (danger), `#AF52DE` (QA purple). 1003 uses of `#1D1D1F` — consistent.
- Card-based layout with rounded-2xl, soft borders `#E5E5EA`, subtle shadows — professional, calm.
- Lucide icon set used throughout (consistent stroke).
- Tailwind v4 + small `ui/` primitives (button/card/dialog/badge/input/tabs) — but most screens use raw className instead of the primitives (394 `cursor-pointer` instances) — primitives exist but aren't enforced.

**Issues:**
- **Typography too small**: `text-xs` ×934, `text-[10px]` ×507, `text-[11px]` ×290, `text-[9px]` ×110, even `text-[7px]` ×2. For a tool used 8h/day by technicians (some 40+), body text should floor at 12–13px. 9–10px labels are a real strain.
- Inline-edit numeric inputs on Inventory use text-sm+ — good; the *labels* above them are the tiny ones. Raise label size, keep values.
- No dark mode (`dark:` classes = 0). Theme context exists (`ThemeContext.tsx`) but appears unused for palette switching.

## 3. Module-by-Module Findings

| Module | Strengths | Weaknesses |
|---|---|---|
| **Dashboard** | Status queue + stage distribution + live roster; 88 card elements give at-a-glance ops picture | Information density high; no charts (all text/cards); H1 missing on page (only H3s) — weak page hierarchy |
| **Work Intake** | Ticket table + single "+ Intake Ticket" CTA; search; 18 actions | Create form is a long single page; model→color cascade is smart; AI assist present. Form could use step indicators (Customer → Device → Repairs → Review) |
| **Pipeline** | True Kanban: 6 stage columns (Received → In Progress → Pending → Finished → Taken Out → Can't Repair) | No visible drag-and-drop affordance in snapshot; 25 buttons but 0 inputs — filtering may be hidden; column count means horizontal scroll on <1280px |
| **QA & Warranty** | 21-point checklist is genuinely valuable; per-item pass/fail | **66 buttons + 22 inputs on one screen** — cognitive overload; checklist should be grouped/collapsible (Power, Display, Audio…); |
| **POS & Invoicing** | Work-order selector + itemized table + 10 payment methods; inventory-part badges (new) | Dense right column; payment method grid of 10 could be 2 rows of 5 w/ icons |
| **Shop Finance** | Cash drawer + reconciliation + capital/debt sections | Text-heavy, no visualizations (sparkline would help); 7 buttons only — exports? |
| **Inventory** | Stock/profit/matrix views; inline edit with review-confirm flow (excellent); low-stock filter; per-part detail modal | Table is wide — horizontal scroll on laptop; inline edit inputs good size but labels 10px |
| **Suppliers/RMA** | Simple table, focused | Sparse — 5 buttons, 0 filters visible |
| **CRM/Portal** | Customer roster + self-service portal concept | Buttons 5, inputs 0 — search likely hidden behind toggle |
| **System Mgmt** | Users & roles | — |

## 4. Accessibility (a11y) ⚠️ Needs Work

- Only **35 aria-labels** across 49 components for **394 pointer targets** — most icon-only buttons have `title=` (tooltip) but not `aria-label` (screen readers).
- Only **6 onKeyDown** handlers — modals likely not Esc-dismissible consistently; no visible focus rings audit possible from code, but custom `cursor-pointer` divs (394) suggest many non-semantic clickable elements (should be `<button>`).
- autoFocus used only 2× — e.g., Intake search, new-ticket first field would benefit.
- Color-only status encoding in several badges (StatusBadge exists — good — but pipeline columns rely on color headers).
- Contrast: `#86868B` on white ≈ 3.5:1 — fails WCAG AA for small text (needs 4.5:1). Used 728×, mostly for 10px text → **double failure** (size + contrast).

## 5. Feedback & States

- **Loading:** only 3 components have loading states (portal, intake AI, AI modal). Supabase-backed lists appear to render instantly with cached/seed data, but network ops (save work order, process payment) lack spinners/skeletons — risk of double-submit. Payment button especially needs a busy state.
- **Empty states:** present in ~10 components ("No parts found" etc.) — good coverage.
- **Destructive confirms:** 26 confirm usages + dedicated `ConfirmDeleteModal` — good.
- **Error surfacing:** 67 `console.error` but no toast/notification system found — failures are silent to the user. **Add a global toast (e.g., sonner) — highest ROI single improvement.**
- Offline badge exists (`OfflineSyncStatusBadge`) — nice.

## 6. Mobile / Touch 📱

- Mobile layout works: hamburger header, bottom nav, cards stack (390px test passed).
- **But:** bottom nav covers content on short viewports; tap targets in tables remain ~28–32px (Apple HIG min 44px); the wide Inventory/POS tables will require horizontal scroll on phones.
- Only 5 `xl:` breakpoints — desktop-first; fine for shop PC, but technicians with phones need the Intake/Pipeline/POS triad to be excellent at 390px.
- No PWA manifest seen (`metadata.json` exists for Firebase Studio, not PWA) — adding installable PWA + offline queue would fit the shop (they already built OfflineSyncStatusBadge).

## 7. Localization 🌐

- LanguageContext + `t()` wired through App (64 keys), plus Myanmar strings in Settings/Notification/LanguageSwitcher/POS/AI modal.
- But most module content is hardcoded English (Intake has only 3 `t()` calls, POS 1, Inventory 1). For staff who read Myanmar faster, partial translation may be more confusing than none. Either finish i18n or keep UI English with Myanmar only in customer-facing texts (SMS/notifications) — recommend the latter short-term.

## 8. Data & Formatting

- MMK currency with `toLocaleString()` ×167 — consistent thousands separators. Good.
- Dates: 18 `toLocaleDateString` — no relative times ("2h ago") which suit queue screens; consider date-fns.
- Version footer (v2.4.0) + system online indicator — good for support.

---

## Priority Recommendations

**P0 (do first):**
1. **Global toast system** for save/payment/error feedback (currently silent failures).
2. **Raise base font sizes**: floor 12px for labels, 13–14px for table body; eliminate 7–10px text.
3. **Payment/save buttons busy state** (disable + spinner) to prevent double submissions.

**P1:**
4. **aria-labels on all icon-only buttons** + convert clickable `div[onClick]` → `<button>` (394 instances to audit; script can find most).
5. **Fix `#86868B` on white for small text** → darken to `#6E6E73` or enlarge text.
6. **QA 21-point checklist** → collapsible groups with progress bar (e.g., "Power 4/4 ✓").
7. **Sidebar label truncation** — tooltips or wider sidebar.

**P2:**
8. Dark mode (ThemeContext already scaffolded).
9. PWA + installable for phones; enlarge touch targets to 44px in Intake/Pipeline/POS.
10. Dashboard sparklines/mini-charts (status trend, revenue trend) — currently all numeric cards.
11. Relative timestamps in queue views.
12. Decide i18n strategy: complete it or scope Myanmar to customer-facing messages.

**P3:**
13. Stepper for Create Ticket (4 steps) to reduce long-form fatigue.
14. Standardize on `ui/` primitives; lint rule to discourage raw hex in className (use tokens).

---

## What's Already Excellent (keep doing)
- Inline-edit **review-confirm** flow in Inventory (rare, thoughtful).
- Live badge counts in nav.
- 21-point QA checklist concept.
- Inventory-part badge + remove handler in POS (just added).
- Consistent Apple-esque design language, version/status footer, offline badge.
