# i35 ERP — Button Policy Migration Log

**Policy (2026-08-06):** every interactive button MUST use `<Button>` from `src/components/ui`.
Raw `<button>` banned outside the ui kit + 3 primitives (CustomDropdownMenu, DrawerSelect,
UserRoleSwitcher). Enforced by `scripts/check-button-policy.mjs` (fails when count exceeds
baseline; baseline drops as migration progresses). Details in README "Button policy".

**Baseline at adoption: 477 raw buttons.** Guard: `npm run lint` → `tsc --noEmit && node scripts/check-button-policy.mjs`

## Migration status

| Date | Count | Converted |
|---|---|---|
| 2026-08-06 (adoption) | 477 | — |
| 2026-08-06 (round 1, commit `8db2c32`) | **448** | Navigation (2), ActiveFilterChips (1), TechnicianLeaderboardView (1), TechnicianPerformanceTab (1), TabAi (1), TabTheme (1), LanguageSwitcher (4), ConfirmDeleteModal (2), DeviceTagPrinterModal (6), DateFilterSelector (6) |
| 2026-08-06 (round 2, commits `c0b85df` + `680e16e`) | **389** | **App.tsx (35 — drawer rows/toggles)**, **DashboardOverview (20 — tabs incl. role=tab, queue/warranty filters, roster View/Print, Copy Notice, search ×)**, POS (12 — Pay&Print, quick amounts, numpad, account copy, confirm X), StatusPipelineView tag fix (accidental h3→div mismatch reverted), dashboard tab 40px guard (`lg:h-10`) |

## Remaining offenders (by count)
- InventoryManagementModule **78** · StatusPipelineView **27** · CreateTicketSoloPage **26** ·
  PriceSettingsModal **20** · PosInvoicingModule **~13** · TabInventory **16** · CustomerFacingWebPortal **13** ·
  PriceCatalogModule **12** · SupplierRmaModule **11** · SystemManagementSettingsModule **11** ·
  CrmCustomerPortalModule **11** · IntakeWorkOrderModule **11** · QuickPriceCalculatorModal **10** …
- Note: many remaining are legitimately tricky (dynamic role/state colors, table cell micro-buttons,
  calendar day grids, dropdown options) — decide per case: convert to Button where it fits,
  or move into a small reusable local component that uses Button internally.

## Rules of thumb for migration
1. Standard action/label buttons → `<Button variant="default|outline|secondary|ghost" size="sm|default">`
2. Icon-only (h-9/10 w-9/10) → `<Button variant="iconGhost" size="icon">` (40px standard)
3. In-table tiny icons (h-7/8) → `<Button variant="iconGhost" size="iconSm">`
4. Chips/filter pills → `<Button variant="chip">` (h-8 pill; color overrides via className)
5. Segmented controls → `<Button variant="ghost" size="sm">` inside the p-1 container
6. Listbox options / calendar day cells → keep raw (semantic roles, not buttons)
7. className overrides merge via tailwind-merge — put conditional colors in className, keep base in variant

After each round: run lint, update BASELINE in `scripts/check-button-policy.mjs` to the new count,
commit + deploy.
