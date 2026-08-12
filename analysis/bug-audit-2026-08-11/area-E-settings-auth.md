# Micro-Level Bug Audit — Area E: Settings / Navigation / Auth / System Modals

**Date:** 2026-08-11
**Repo:** i35erp-stable-v1 (branch v1.1)
**Scope:** SystemManagementSettingsModule + tabs, LoginPage, UserRoleSwitcher, Navigation, accountSettings, RecycleBinModal, CustomerNotificationModal, plus wiring in App.tsx / supabase.ts / server.ts (read-only audit)
**Findings:** 15 total — 5× P1, 4× P2, 6× P3

---

## P1 Findings

### [P1] Settings module has no role guard — any authenticated user can reach full admin settings via URL deep link, and most settings handlers have no authorization checks
- **File:** src/App.tsx:199, src/App.tsx:2694; handlers src/App.tsx:326 (handleAddUser), :332 (handleUpdateUser), :1121 (handleUpdateSettings), :1135 (handleAddTechnician), :1140 (handleUpdateTechnician)
- **Issue:** The `#/settings` hash is whitelisted for ALL roles (App.tsx:199 `['dashboard',…,'settings',…]`) and the settings module is rendered with no role check:
  ```tsx
  {activeTab === 'settings' && (
    <SystemManagementSettingsModule … onUpdateSettings={handleUpdateSettings} … />
  )}
  ```
  Only Navigation.tsx:63-195 hides the *menu item* for non-admins — a technician (or reception) can open `https://erp/#/settings` directly and get the full admin UI (user CRUD, payment gateways, telegram config, recycle bin). Unlike `handleDeleteUser` (:342), `handleDeleteTechnician` (:1146), `handleDeleteWorkOrder` (:1156), `handlePermanentDeleteWorkOrder` (:1190) — which all check `currentUser.role !== 'Admin'` — the update handlers above have **no role check at all**. Data-layer enforcement is also absent: `saveDocument`/`deleteDocument` (src/lib/supabase.ts:166-259) upsert/delete `erp_records` directly from the browser with the **publishable key** (`VITE_SUPABASE_PUBLISHABLE_KEY`), no Supabase auth session, no role claim. The custom `i35_session_token` is never part of these requests, and roles live in the `users` collection, which any client with the bundle's publishable key can rewrite (RLS is evidently permissive/absent since the app functions).
- **Impact:** Any logged-in staff member can promote themselves to Admin (edit `users` row), edit system settings (payment methods, shop identity), add/delete users & technicians, and reach the recycle bin (see P1 #5). RBAC is cosmetic; the security model relies entirely on UI hiding.
- **Fix:** (a) Render-guard: `if (activeTab === 'settings' && currentUser?.role !== 'Admin' && !currentUser?.permissions?.canAccessSettings) setActiveTab('dashboard')` (effect on activeTab/role change, plus guard at render). (b) Add the same `currentUser.role !== 'Admin'` check to handleUpdateSettings/handleAddUser/handleUpdateUser/handleAddTechnician/handleUpdateTechnician. (c) Move data writes behind a server endpoint that authorizes by session token + server-side role, and restrict Supabase RLS so the publishable key cannot write `erp_records`.

### [P1] CustomerNotificationModal violates Rules of Hooks — closing the notify modal in the pipeline crashes the whole app into the ErrorBoundary fallback
- **File:** src/components/common/CustomerNotificationModal.tsx:38, 41-60; trigger src/components/pipeline/StatusPipelineView.tsx:1301-1307
- **Issue:** Early return happens **before** all hooks:
  ```tsx
  export const CustomerNotificationModal = ({ isOpen, … }) => {
    if (!isOpen || !workOrder) return null;          // line 38 — BEFORE hooks
    const [channel, setChannel] = useState(…);        // 5× useState + 1× useEffect below
  ```
  The parent mounts it with `{notifWo && <CustomerNotificationModal isOpen={isNotifModalOpen} … />}` and sets `setNotifWo(wo); setIsNotifModalOpen(true)` together (StatusPipelineView.tsx:354-356, :923-925). Closing only calls `setIsNotifModalOpen(false)`; **`setNotifWo(null)` never happens anywhere** (grep confirms only :354 and :923 set it). So the instance stays mounted with `isOpen=false` and re-renders with 0 hooks after previously rendering 6 → React throws "Rendered fewer hooks than during the previous render" → top-level ErrorBoundary (src/main.tsx) unmounts the entire app.
- **Impact:** Every time a user (typically a technician) opens the "Alert Customer" modal in the Pipeline and closes it, the whole app white-screens to the error fallback; only a hard reload recovers. PosInvoicingModule's copy (:189) is dead (`notifWo` never set).
- **Fix:** Remove the early return and gate hooks with a mounted-only pattern: `const [mounted, setMounted] = useState(isOpen && !!workOrder); useEffect(() => { if (isOpen && workOrder) setMounted(true); else if (!isOpen) setMounted(false); }, [isOpen, workOrder]); if (!mounted) return null;` — or have the parent unmount on close (`setNotifWo(null)` in onClose) so the component never renders while closed.

### [P1] Any Inventory-data action (category / quality tier / bin add, edit, delete) silently discards ALL other unsaved settings-draft edits
- **File:** src/components/settings/SystemManagementSettingsModule.tsx:267 (sync effect), :771-780 (handleAddInventoryCategory), :796-798 (saveInventoryQualityTiers), :836-842 (handleAddInventoryBin); src/components/settings/tabs/TabInventory.tsx:238 (bin delete `×`)
- **Issue:** The module syncs its draft on every settings change:
  ```tsx
  React.useEffect(() => { setFormData(settings); }, [settings]);
  ```
  Meanwhile inventory data ops write settings immediately, bypassing the draft:
  ```tsx
  // TabInventory.tsx:238 — bin delete, no confirm, no formData update
  onClick={() => onUpdateSettings({ ...settings, inventoryBinNames: inventoryBinNames.filter((item) => item !== bin) })}
  // module:796 — quality tiers
  const saveInventoryQualityTiers = (tiers: string[]) => { onUpdateSettings({ ...settings, inventoryQualityTiers: tiers }); };
  ```
  `onUpdateSettings` → App.handleUpdateSettings → `setSystemSettings(...)` → new `settings` prop → sync effect resets `formData` to the server snapshot. Any unsaved edits in other tabs (e.g. shop name typed but not yet saved) are **silently wiped**; the sticky "Save Changes" bar disappears with them. Even the "good" path (category add at :776 calls `onUpdateInventoryCategories` **and** `setFormData`) triggers the same wipe, because `onUpdateInventoryCategories` → `handleUpdateSettings({...systemSettings, inventoryCategories})` (App.tsx:2704) changes the settings prop. The writes also use the `settings` prop snapshot rather than the draft, so they can clobber a newer server state.
- **Impact:** Data loss of unsaved settings work with no warning or undo; user believes edits exist but they were reverted the moment they touched inventory data. Multi-admin: a write based on a stale `settings` snapshot overwrites the other admin's concurrent changes.
- **Fix:** Route inventory data ops through the draft (`setFormData` only, like every other tab) so nothing persists until "Save Changes"; or suppress the sync effect when the change originated from the draft (e.g. compare-and-merge instead of blind replace: `setFormData(prev => ({ ...prev, ...settings }))` only for fields not dirty). Add a confirm dialog to bin delete (matches categories/suppliers/tiers which all confirm).

### [P1] AI API key and Telegram bot token are never persisted — after any page reload the AI auto-classifier permanently marks finished tickets as failed and never retries them
- **File:** src/lib/supabase.ts:44-52 (`cloudSafeData`), src/App.tsx:20-49 (classifyRepairWithAI), :689-712 (auto-classify loop), :717-736; src/components/settings/tabs/TabAi.tsx:96-104; TabNotifications.tsx:113-116
- **Issue:** Settings are saved through `cloudSafeData`, which strips secrets before upsert:
  ```ts
  if (collectionName !== 'systemSettings') return data;
  const { aiApiKey: _aiApiKey, telegramBotToken: _telegramBotToken, ...safe } = data;
  ```
  There is no server-side fallback store for browser-entered keys (server reads only `process.env.DEEPSEEK_API_KEY`/`OPENROUTER_API_KEY`, server.ts:291-296). After a reload, `systemSettings.aiApiKey`/`telegramBotToken` come back empty. The auto-classifier then calls `/api/ai/chat` with `apiKey: undefined` → server 400 "AI API key is not configured on the server" → `classifyRepairWithAI` returns null → App.tsx:708-709 sets `aiClassifyFailed: true` on the ticket, and the loop filters `!wo.aiClassifyFailed` — **the ticket is never classified again**. Same for manual re-scan failures.
- **Impact:** Every Finished/Taken-Out ticket after a reload is permanently flagged `aiClassifyFailed` (silent data-quality corruption — repair-type stats/AI features degrade permanently, no retry). The Telegram bot token entered in Settings does nothing: the server bot uses `TELEGRAM_BOT_TOKEN` env only, and the field resets on reload — it's dead configuration that misleads the admin.
- **Fix:** Persist secrets server-side only (e.g. a server-only `credentials.json`/env-based settings merge the client never sees), and have `/api/ai/chat` fall back to server env keys for every provider when the client sends none. Change auto-classify to only set `aiClassifyFailed` on genuine provider errors vs. missing-key, and allow retry (`aiClassifyFailed: false` when the failure was a config issue). Remove or clearly mark the dead Telegram token field.

### [P1] "Empty Recycle Bin" / "Restore All" have no admin authorization while single "Permanently Delete" does
- **File:** src/App.tsx:1202 (handleRestoreAllWorkOrders), :1219 (handleEmptyRecycleBin) vs :1189-1190 (handlePermanentDeleteWorkOrder)
- **Issue:** Permanent delete is guarded:
  ```tsx
  const handlePermanentDeleteWorkOrder = (id: string) => {
    if (currentUser.role !== 'Admin') { addToast('🔒 Access Denied …'); return; }
  ```
  but the two bulk destructive handlers are not:
  ```tsx
  const handleEmptyRecycleBin = () => {
    const archived = workOrders.filter((w) => w.isArchived);
    archived.forEach((w) => { deleteDocument('workOrders', w.id).catch(reportSaveError); });
    setWorkOrders((prev) => prev.filter((w) => !w.isArchived));
  ```
  Combined with P1 #1 (settings reachable by any role), a technician can open Settings → Recycle Bin → Empty Bin and permanently purge every archived ticket.
- **Impact:** Permanent mass data destruction without authorization. Also inconsistent: individual purge asks for Admin, bulk purge does not.
- **Fix:** Add the same `currentUser.role !== 'Admin'` guard to `handleRestoreAllWorkOrders` and `handleEmptyRecycleBin` (restore-all could stay open, but Empty Bin must be Admin-only), and enforce server-side.

---

## P2 Findings

### [P2] /api/auth/logout-all has no server-side authorization — any valid session can revoke all other sessions
- **File:** server.ts:189-198; UI gate src/components/settings/tabs/TabUsers.tsx:52-58
- **Issue:** The client only shows "Sign Out All Devices" to Admins, but the endpoint itself trusts any caller:
  ```ts
  app.post("/api/auth/logout-all", (req, res) => {
    const token = (req.headers["x-session-token"] as string) || "";
    const currentHash = token ? hashToken(token) : "";
    const keep = currentHash && authTokens[currentHash] ? { [currentHash]: authTokens[currentHash] } : {};
    const revoked = Object.keys(authTokens).length - Object.keys(keep).length;
    for (const key of Object.keys(authTokens)) { if (!keep[key]) delete authTokens[key]; }
  ```
  Sending **no token at all** revokes every session; sending any valid token revokes everything except the caller.
- **Impact:** A disgruntled technician (or anyone with a valid token, or a leaked token) can repeatedly kick the admin out of every device — an availability/abuse issue with no server-side restriction.
- **Fix:** Require a valid session whose email is the admin (`AUTH_EMAIL`) or whose role is Admin (look up `users` collection server-side) before allowing logout-all; reject token-less calls.

### [P2] AI endpoints are unauthenticated and can burn paid server API keys
- **File:** server.ts:210 (/api/gemini/diagnose), :252 (/api/gemini/draft-message), :284 (/api/ai/chat), env-key fallback :291-296
- **Issue:** None of the AI routes verify the session token. `/api/ai/chat` accepts `provider` and `apiKey` from the body; with `provider: "deepseek"` or `"openrouter"` and no key, the server substitutes `process.env.DEEPSEEK_API_KEY` / `OPENROUTER_API_KEY`:
  ```ts
  const resolvedApiKey = apiKey || (provider === "deepseek" ? process.env.DEEPSEEK_API_KEY : provider === "openrouter" ? process.env.OPENROUTER_API_KEY : undefined);
  ```
  There is no rate limit on any of these routes.
- **Impact:** Anyone on the internet (or any logged-out visitor) can call the server's paid DeepSeek/OpenRouter/Gemini quota repeatedly — cost abuse; /api/gemini/* also exposes diagnostic generation. No ERP data leaks (context is supplied by the caller), so severity is P2.
- **Fix:** Require a valid `x-session-token` (isTokenValid) on all AI routes; add per-IP rate limiting; consider not accepting arbitrary client `apiKey` values for billed providers.

### [P2] Offline / outdated client with empty inventory arrays defeats the merge guard and wipes shared data
- **File:** src/App.tsx:1121-1132
- **Issue:** The merge intended to protect inventory data only guards `undefined`, not empty arrays:
  ```tsx
  const mergedSettings: SystemSettings = {
    ...systemSettings, ...newSettings,
    inventoryCategories: newSettings.inventoryCategories ?? systemSettings.inventoryCategories,
    inventoryQualityTiers: newSettings.inventoryQualityTiers ?? systemSettings.inventoryQualityTiers,
    inventoryBinNames: newSettings.inventoryBinNames ?? systemSettings.inventoryBinNames,
  };
  ```
  If a client's draft snapshot predates categories added by another admin (so `newSettings.inventoryCategories` is `[]` or absent-but-spread to `undefined` → wait, absent key → `undefined` → falls back correctly; the vulnerable case is a **stale empty array** from a snapshot taken before categories existed, or an explicit clear from an offline client whose queue replays later) the `??` keeps `[]` and the upsert wipes the categories/tiers/bins the other admin added. Offline queueing (supabase.ts `queueWrite`) makes stale full-object saves replayable.
- **Impact:** Concurrent/offline admin loses inventory categories/tiers/bin lists (shared reference data) with no recovery; only bins/tiers/categories are affected, but they're used across part registration and filters.
- **Fix:** Use truthiness-aware merge: `(newSettings.inventoryCategories?.length ? newSettings.inventoryCategories : systemSettings.inventoryCategories)` — and treat an explicit "clear all" as a deliberate action only from a fresh, online draft (or introduce per-field updatedAt timestamps).

### [P2] Session restore trusts stale localStorage user info; verify only checks HTTP status, and the token lives in localStorage
- **File:** src/App.tsx:188-194 (authUser init from localStorage), :588-607 (verify), :615-626 (email→role auto-match); src/components/auth/LoginPage.tsx:36-44
- **Issue:** (a) On load, `authUser` is restored straight from `localStorage['i35_session_user']` — the app renders fully before `/api/auth/verify` completes; if the token was revoked server-side, there is a window where the UI is live. (b) Verify discards the response body — it only tests `res.ok`, so a 200 `{success:false}` (if the server ever returns one) would keep a dead session. (c) The role comes from the client-side `users` collection match; a stale cached role (changed/deleted server-side) persists until re-login. (d) `i35_session_token` is stored in plain localStorage — exfiltratable by any XSS; no httpOnly cookie.
- **Impact:** Revoked sessions briefly continue working; role/permission changes don't take effect until re-login; token theft via XSS gives full session. Combined with P1 #1, the token is not even required for data access.
- **Fix:** Have `/api/auth/verify` return the current user record (and ideally role) and use it to hydrate `authUser`/`currentUser`; gate rendering on `authChecking` before restoring from localStorage; move the session token to an httpOnly, Secure, SameSite cookie (server-set) and stop keeping role-bearing user JSON in localStorage.

---

## P3 Findings

### [P3] Recycle bin search crashes the modal on legacy rows missing optional-ish fields
- **File:** src/components/common/RecycleBinModal.tsx:38-46
- **Issue:** The filter calls `.toLowerCase()` unguarded on fields that can be absent in older Supabase rows:
  ```tsx
  wo.orderNumber.toLowerCase().includes(query) || wo.id.toLowerCase().includes(query) ||
  wo.customerName.toLowerCase().includes(query) || wo.customerPhone.toLowerCase().includes(query) ||
  wo.deviceModel.toLowerCase().includes(query) || (wo.serialNumber && wo.serialNumber.toLowerCase().includes(query))
  ```
  `wo.serialNumber` is guarded but `orderNumber`, `customerPhone`, `deviceModel`, `customerName` are not (TS marks them required, but JSONB rows predating the field exist).
- **Impact:** If any archived ticket is missing one of these keys, typing in the search box throws a TypeError inside the modal (uncaught → ErrorBoundary fallback of the whole app).
- **Fix:** Coalesce: `String(wo.orderNumber || '').toLowerCase()`, same for the other fields.

### [P3] Number inputs (low-stock threshold, RMA SLA) silently coerce cleared fields to 0 and allow out-of-range saves
- **File:** src/components/settings/tabs/TabInventory.tsx:274-276, 290-292
- **Issue:** `onChange={(e) => setFormData({ ...formData, lowStockThreshold: Number(e.target.value) })}` — clearing the field yields `Number('') === 0` immediately; the save bar is not a `<form>`, so the `min="1"`/`max="20"` attributes never block a save of 0 or a typed negative/huge value.
- **Impact:** A cleared threshold persists as 0 (inverts the low-stock warning semantics); typos like 999 bypass max. Minor data-quality issue.
- **Fix:** Clamp in the handler (`Math.min(Math.max(Number(v)||fallback, min), max)`) and keep the previous value when input is empty.

### [P3] Saving a user with a cleared email silently rewrites their login email to a fabricated address; no duplicate-email validation
- **File:** src/components/settings/SystemManagementSettingsModule.tsx:557, 571 (handleSaveUser)
- **Issue:** `email: userFormData.email.trim() || \`${userFormData.name.toLowerCase().replace(/\s+/g, '')}@applerepairpro.com\`` — editing an existing user and leaving email blank generates a new fake address, desyncing the profile from any credentials/auto-match; nothing checks that the email isn't already used by another user (auto-match at App.tsx:615-626 picks the first match).
- **Impact:** Login auto-match may bind the wrong profile (e.g., two users with the same generated email); account email silently changes.
- **Fix:** On edit, keep the existing email when blank (`email: userFormData.email.trim() || editingUser.email`), and validate uniqueness against `users`.

### [P3] Technician commission inputs can silently zero-out saved rates and accept out-of-range values on the save path
- **File:** src/components/settings/SystemManagementSettingsModule.tsx:699-740 (handleTechSubmit), 1166-1192 (inputs)
- **Issue:** `commissionRate: Number(techFormData.commissionRate) || 0` — clearing a field stores `Number('')=0` in state (`onChange` at :1180), so saving writes 0, destroying the previous rate; negative values typed before submit are stored as-is (HTML `min=0 max=50` only blocks *form* submission, and the form is bypassed by... actually the modal is a form, so submit is blocked for out-of-range — but `Number('-5')` typed then `Number(...)||0` = -5 passes only if the browser doesn't block; the cleared-field→0 path definitely executes).
- **Impact:** A slip of the keyboard while editing a rate silently sets the technician's commission to 0% (payouts affected).
- **Fix:** Clamp on change: `Math.max(0, Math.min(50, Number(e.target.value) || 0))` and keep previous value on empty.

### [P3] UserRoleSwitcher is dead code with no permission guard — a latent privilege-escalation UI if ever wired
- **File:** src/components/common/UserRoleSwitcher.tsx (whole file); src/App.tsx:1822 passes `onSwitchUser` to Navigation, which never destructures it (src/components/Navigation.tsx props interface lists `onSwitchUser`/`onLogout`/`users`/`onOpenUserManagement` but the destructure at :46-60 omits them)
- **Issue:** `UserRoleSwitcher` lists **all** users (including Admins) and calls `onSwitchUser(usr)` with no role restriction; `handleSwitchUser` (App.tsx:351-364) simply does `setCurrentUser(user)`. Currently nothing renders the switcher (grep: no usage), and the Navigation props it was wired to are ignored, so `handleSwitchUser` is unreachable — but if anyone re-adds the component (or the sidebar footer), any technician could click the Admin profile and become admin client-side.
- **Impact:** Latent P1 if re-enabled; today it's confusing dead code (props advertised but ignored, logout button missing from sidebar).
- **Fix:** Either remove the dead wiring or, if the switcher is intentional (demo multi-user), restrict the switchable list to profiles the current user is allowed to impersonate and enforce the same restriction server-side.

### [P3] Navigation defaults to the most privileged role when currentUser is missing
- **File:** src/components/Navigation.tsx:63
- **Issue:** `const role = currentUser?.role || 'Admin';` — if `currentUser` is ever undefined while the app shell renders, every nav item (including Settings) becomes visible. Today App.tsx:1808 gates the whole app on `authUser`, so this is unreachable in practice — but it's the wrong default for a security-sensitive check and would silently regress if the gate changes.
- **Impact:** Latent over-privileged menu exposure (defense-in-depth failure).
- **Fix:** Default to the least privileged role (`'Technician'`) or hide role-specific items when `currentUser` is undefined; additionally enforce the same rule at render (see P1 #1).

---

## Notes on items checked and found OK
- **Partial-save clobber (main path):** App.tsx `handleUpdateSettings` merges `{...systemSettings, ...newSettings}` and saves the FULL object — tab saves that go through `onUpdateSettings(formData)` are safe (the P1 risk is the inventory-data path above, not the tab save itself).
- **Recycle-bin restore:** `handleRestoreWorkOrder` (App.tsx:1174-1187) restores the full object with the same `id`, sets `isArchived:false` and clears `archivedAt` — no new-ID/reference breakage. Filtering is consistent (`w.isArchived`).
- **Permanent delete** (single) has confirm + admin check; "Empty Bin" has a confirm dialog client-side (RecycleBinModal.tsx:196-219).
- **i18n:** `t()` falls back to `fallback || key` (LanguageContext.tsx:86-89) — no missing-key crash.
- **Settings load defaults:** `setSystemSettings(prev => ({...prev, ...globalSettings}))` (App.tsx:449-455) fills legacy-missing keys from `DEFAULT_SYSTEM_SETTINGS`, so `formData.receiptFooterNote.split(...)` (module:352) is safe today.
- **Login page:** error strings are generic ("Invalid email or password"); timing-safe comparisons; per-IP rate limit + lockout on the server. No hardcoded credentials in the client.
