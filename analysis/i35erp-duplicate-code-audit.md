# i35 ERP — Duplicate / Dead-Code Space Audit (what's taking space unnecessarily)

**Date:** 2026-08-06 · **Method:** import graph scan + `tsc --noUnusedLocals` (373 unused declarations) + CSS selector dedupe + className conflict scan + dist chunk inspection · bundle `index-BAAgmOBp.js`

---

## Summary
**~1,256 lines of dead module files + 373 unused declarations** (mostly dead imports). Bundle impact ≈ 0 for tree-shaken imports, but: dead files rot, hide bugs, and block strict lint. The MicroSoldering chunk ships in dist but is never fetched.

---

## 1. Dead module files (never rendered — safe to delete)

| File | Lines | Proof |
|---|---|---|
| `components/devices/DevicesManagementModule.tsx` | **793** | 0 imports anywhere (only self-reference) — not in dist |
| `components/microsoldering/MicroSolderingModule.tsx` | **286** | `lazy()` in App.tsx:90 but `MicroSolderingModule` never read → never rendered. Chunk **MicroSolderingModule-CEIm6TTO.js IS in dist** (shipped, never fetched). Also dead: `handleSaveMicroSolderingLog` (App.tsx:1405) + `MicroSolderingLog` type plumbing (types/index.ts:111,161). No nav tab, no route |
| `components/common/UserRoleSwitcher.tsx` | **177** | imported App.tsx:77, never rendered |

## 2. 373 unused declarations (`npx tsc --noEmit --noUnusedLocals`)

**By file (top 12):**
| File | Unused |
|---|---|
| settings/SystemManagementSettingsModule.tsx | 39 |
| pipeline/StatusPipelineView.tsx | 30 |
| intake/IntakeWorkOrderModule.tsx | 27 |
| dashboard/DashboardOverview.tsx | 27 |
| App.tsx | 23 |
| prices/PriceCatalogModule.tsx | 20 |
| inventory/InventoryManagementModule.tsx | 19 |
| crm/CustomerRepairHistoryModal.tsx | 16 |
| finance/ShopFinancePlModule.tsx | 15 |
| crm/CrmCustomerPortalModule.tsx | 13 |
| common/WorkOrderStatusTimeline.tsx | 13 |
| followup/CompletedDeviceFollowUpModule.tsx | 11 |

**Composition:** ~200 are unused lucide icon imports (Sparkles ×11, Phone ×10, DollarSign ×9, CheckCircle2 ×9, FileText ×8, Calendar ×8…). Notable non-icon dead items:
- `setDateFilter` imported-but-unused in **5 files**
- App.tsx: `saveBatchDocuments` (supabase import), `UserRoleSwitcher`, `UserRole` type, `isDbSynced`, `selectCls`, `activePipelineFilterCount`, `handleDeleteExpense`, 12 lucide icons, `React`
- CameraQrScannerModal: `isTorchOn/setIsTorchOn` — **half-built torch feature state**
- DeviceTagPrinterModal: `CheckCircle`, `AlertCircle`, `DIAGNOSTIC_NAMES`
- LanguageSwitcher: `t` param unused

## 3. Duplicate imports (mergeable, same module twice)
- `App.tsx:74-75` — `./utils/diagnosticUtils` imported in 2 statements
- `Navigation.tsx:26-27` — `./ui` imported in 2 statements

## 4. Checked — NOT real issues (no action)
- **27 "conflicting" classNames** (e.g. `text-base sm:text-lg`, `h-9 lg:h-8`) — all intentional responsive variants ✓
- **Duplicate `.basic-ui button/table/th` CSS blocks** — complementary properties (font/letter-spacing/border), not conflicting values ✓
- **`onClearAllWorkOrders` prop chain** — USED (desktop pipeline Delete All + intake Clear All restored) ✓
- **644 `{/* */}` markers** — legit comments; **0 `{false &&` dead JSX** ✓
- Repeated long classNames — legit per-field repeats (settings inputs, table cells) ✓

---

## 5. Recommended cleanup batch (awaiting "fix")
| # | P | Action | Effort |
|---|---|---|---|
| C1 | P1 | Delete `DevicesManagementModule.tsx` (793) | 1 line |
| C2 | P1 | Delete `MicroSolderingModule.tsx` (286) + App lazy import + `handleSaveMicroSolderingLog` + `MicroSolderingLog` type fields (verify: no nav/route — confirmed) | ~10 lines |
| C3 | P1 | Delete `UserRoleSwitcher.tsx` (177) + App import | 2 lines |
| C4 | P2 | Remove the 373 unused imports/decls (top 6 files = 165 of them) | mechanical |
| C5 | P3 | Merge duplicate import statements (App, Navigation) | 2 edits |
| C6 | P3 | Enable `noUnusedLocals: true` in tsconfig so future dead code fails lint (after C4) | 1 line |
