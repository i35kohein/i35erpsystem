# Area G — Micro-Level Bug Audit: Lib / Utils / Server / Data / Config

Date: 2026-08-11 · Repo: `/Users/user/Desktop/i35erp-stable-v1` (branch `v1.1`) · READ-ONLY audit, no builds run.

Scope: server.ts, src/lib/* (supabase, firebase, indexedDB, offlineQueue, domTranslate, toast, utils, lazyWithRetry, firebase-admin), hooks (useIsIpad, useSystemSettings), utils (seedTickets, diagnosticUtils, modelSort, portalWorkflow, timeAgo), contexts (Theme, Language), types, db/*, data/*, main.tsx, vite.config.ts, package.json, deploy.sh, rollback.sh.

Verified-clean areas (checked, no finding): path traversal in static serving (decoded-path + `..` + `startsWith(distPath)` guards hold), `/api/*` JSON 404, health endpoint at `/api/health`, token hashing (SHA-256) + TTL + timing-safe compare, `WorkOrderStatus` includes `'Taken Out'`, offline queue FIFO order (autoIncrement keyPath), timeAgo boundary math, toast bridge, lazyWithRetry retry/throw logic, StrictMode cleanup in `useSystemSettings`/`useIsIpad`, `cloudSafeData` strips `aiApiKey`/`telegramBotToken` on systemSettings writes, no hardcoded Supabase service-role or DO secrets in source (firebase-applet-config.json is `remixed-*` placeholders), queue flush on startup exists (App.tsx `refreshWithFlush()` on mount + every 45 s + refresh event).

---

### [P1] Unauthenticated AI endpoints = free proxy to the server's paid LLM keys
- **File:** server.ts:208 (`/api/ai/chat`), server.ts:296 (`/api/gemini/diagnose`), server.ts:345 (`/api/gemini/draft-message`)
- **Issue:** None of the three AI routes performs any auth check. The client calls them with no session header (verified: `src/App.tsx:25` and `src/components/ai/AiDiagnosticAssistantModal.tsx:378` send only `Content-Type`). `/api/ai/chat` resolves the key server-side: `const resolvedApiKey = apiKey || (provider === "deepseek" ? process.env.DEEPSEEK_API_KEY : ...)` — and the other two use `getGeminiClient()` with `process.env.GEMINI_API_KEY`. Anybody who can reach the server (port 3100 is publicly exposed per the deployment health-check URL) can POST arbitrary prompts and burn the shop's DeepSeek/Gemini/OpenRouter quota, or use the endpoint as a free LLM proxy. `/api/gemini/diagnose` also returns `err.message` verbatim to the client (leaks internals).
- **Impact:** Paid-key cost abuse (billing), unlimited third-party use of the shop's AI accounts, prompt-injection surface, minor info disclosure.
- **Fix:** Require a valid session token (`isTokenValid`) on all three routes (mirror `/api/auth/verify`), or at minimum per-IP rate limit + an allowlist; never echo `err.message` wholesale.

### [P1] `POST /api/auth/logout-all` with no/invalid token revokes every session — unauthenticated mass logout
- **File:** server.ts:196-208
- **Issue:** `const keep = currentHash && authTokens[currentHash] ? { [currentHash]: authTokens[currentHash] } : {};` — when the caller sends no `x-session-token` (or a bogus one), `keep` is empty and the loop deletes **all** auth tokens. There is no `isTokenValid()` check before honoring the request. The comment says "Sending no token revokes ALL sessions" — but nothing stops a random visitor from doing exactly that.
- **Impact:** Anyone with network access can silently log out every staff member/devices (shop-wide DoS; everyone must re-authenticate, login rate-limits could compound it).
- **Fix:** Require a valid token and (ideally) an admin role before processing; reject 401 when `!isTokenValid(token)`.

### [P1] rollback.sh targets the wrong server — old NYC droplet instead of live production
- **File:** rollback.sh:5-7
- **Issue:** `HOST="root@192.34.62.199"` and `PUBLIC_URL="http://192.34.62.199:3100"`, while deploy.sh ships to the live server `178.128.62.242`. Running rollback during an incident SSHes into the **old** NYC droplet and restarts `i35erp` there; production stays broken while the operator believes a rollback happened (health check hits the old host).
- **Impact:** Rollback is a no-op on production exactly when it's needed; worst case it disrupts the stale rollback-only droplet; false confidence during an outage.
- **Fix:** Point rollback.sh at `root@178.128.62.242` / `http://178.128.62.242:3100`, or derive both hosts from a single shared variable/source of truth.

### [P2] deploy.sh destroys the previous release before the new one is verified — rollback can't restore a good build
- **File:** deploy.sh:33
- **Issue:** `ssh ... "cd $REMOTE_DIR && rm -rf dist.prev && cp -r dist dist.prev && npm install ... && systemctl restart i35erp"` — `dist` at this point already contains the **new** (just-rsynced) build, so `dist.prev` is the new build, not the previous good one. rollback.sh then does `cp -r dist.prev dist` and restores... the same broken build. The previous release is deleted before the new one has passed its health check.
- **Impact:** Rollback is structurally ineffective; a bad deploy can only be undone by re-uploading an old artifact manually.
- **Fix:** Snapshot `dist.prev` **before** rsyncing the new dist (`cp -r dist dist.prev` first, or keep `dist.prev` and `dist.old` rotating after a successful health check), and make the health check gate the snapshot swap.

### [P2] fetchCloudCollection has no limit/order — collections silently truncated at Supabase's 1000-row cap
- **File:** src/lib/supabase.ts:59-65
- **Issue:** `supabase.from('erp_records').select('data').eq('collection_name', collectionName)` — no `.limit()`, no `.order()`. Supabase REST defaults to max 1000 rows; older rows beyond that are simply never loaded. The UI's shared cache and `refreshAllCollections()` use this same path.
- **Impact:** Once a collection (workOrders is the obvious one) exceeds 1000 rows, the oldest tickets silently disappear from the app — no pagination, no warning. Archive/recycle-bin and search over older history break invisibly.
- **Fix:** Add `.order('updated_at', { ascending: false }).limit(N)` with pagination, or fetch in pages and concat.

### [P2] seedTickets: 7 of 10 tickets' `subtotal`/`totalAmount` don't match the sum of their line items
- **File:** src/utils/seedTickets.ts (tickets 1, 2, 4, 5, 6, 7, 8)
- **Issue:** Verified arithmetic — line-item `unitPrice × quantity` sums vs stored `subtotal`:
  - T1: 45,000+35,000+40,000 = **120,000** vs subtotal **200,000**
  - T2: 65,000+50,000 = **115,000** vs **170,000**
  - T4: 180,000+40,000 = **220,000** vs **320,000**
  - T5: 35,000+35,000 = **70,000** vs **110,000**
  - T6: 110,000+40,000 = **150,000** vs **230,000**
  - T7: 120,000+80,000 = **200,000** vs **300,000**
  - T8: 20,000+35,000 = **55,000** vs **90,000**
- **Impact:** Any screen that recomputes totals from `lineItems` (P&L, commissions, quotes) will disagree with stored totals for these records; if this seed is ever run against the live DB it writes inconsistent financial data.
- **Fix:** Derive `subtotal`/`totalAmount` from the line items (or fix the literals so they match).

### [P2] seedData customer IDs collide with seedTickets customer IDs (different people, same IDs)
- **File:** src/data/seedData.ts:230 (`INITIAL_CUSTOMERS`), src/utils/seedTickets.ts (cust-1..cust-10)
- **Issue:** `INITIAL_CUSTOMERS` maps `cust-1 = Sarah Jenkins` … `cust-6 = Amanda Ross`, while `generate10TestTickets()` uses the **same** ids for different people (`cust-1 = Aung Aung`, `cust-2 = Daw Su Su`, …). Both seed sets are in the same `customers` collection space.
- **Impact:** If both are loaded, work orders link to the wrong customer profile (Aung Aung's ticket shows Sarah Jenkins), `totalSpent`/`totalOrdersCount` aggregates land on the wrong record.
- **Fix:** Give the two seeds disjoint id namespaces (e.g. `cust-seed-*` for tickets or renumber one set).

### [P2] INITIAL_PARTS priced in USD against an MMK shop
- **File:** src/data/seedData.ts:340-398
- **Issue:** Parts are seeded with `costPrice: 195.00` / `sellingPrice: 320.00` etc. (US-dollar MobileSentrix pricing) while `DEFAULT_SYSTEM_SETTINGS.currencySymbol` is `'MMK'`. If `INITIAL_PARTS` is ever seeded into the live Supabase `parts` collection, stock valuation, margins and POS amounts are off by orders of magnitude.
- **Impact:** Wrong financial math on any inventory/finance screen using these rows.
- **Fix:** Convert to MMK (or mark the seed clearly USD-only and never write it to the live parts collection).

### [P2] Login brute-force limit bypassable via spoofed `X-Forwarded-For`
- **File:** server.ts:135
- **Issue:** `getClientIp` trusts the **first** entry of the client-supplied `x-forwarded-for` header: `(req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip ...`. Proxies append the real client IP after the user-supplied value, and the server is also reachable directly on `:3100` (health-check URL is the bare IP), where the header is fully attacker-controlled. An attacker rotates the header per attempt and bypasses the 5/min + lockout throttle on the main credentials login.
- **Impact:** Unrestricted password brute force on the admin/`AUTH_PASSWORD` login (and on `credentials.json` staff accounts).
- **Fix:** Use `req.ip` only when the server is not behind a proxy, or configure the proxy to overwrite (not append) the header; prefer the last hop or a trusted-proxy allowlist.

### [P2] domTranslate rewrites user-entered data that matches dictionary words (display corruption)
- **File:** src/lib/domTranslate.ts:519-529 (`translateText` / `handleTextNode`)
- **Issue:** The translator walks **every** text node in `document.body` and substring-replaces dictionary phrases. Dictionary entries are generic English words (`'New'`, `'Save'`, `'Clear'`, `'Total'`, `'Select'`, `'Open'`, `'View'`, `'Search'`, `'Print'`, `'No'`, `'OK'`…). Customer names, part names, notes, and symptoms rendered anywhere in the UI get corrupted: a note "order new display" becomes "order အသစ် display"; a customer named "Total" or part named "Clear Case" is rewritten in the DOM. Partial-phrase mangling also occurs ("Click Back to go" → "Click နောက်သို့ to go") because matching is substring-based, not token-boundary-based.
- **Impact:** Displayed business data is visibly corrupted in Burmese mode (stored data untouched, but users see wrong names/notes; screenshots/receipts misleading).
- **Fix:** Restrict translation to known static UI containers/attributes (class/data-attr allowlist), or match on word boundaries and skip nodes whose parent carries data (e.g. `data-raw`, table cells with dynamic values).

### [P3] firebase.ts offline `clearCollection` logs "queued" but never enqueues the clear
- **File:** src/lib/firebase.ts:331-336
- **Issue:** `if (!navigator.onLine) { console.warn(\`Offline clear queued for ${collectionName}\`); return; }` — nothing is added to `idbAddToSyncQueue`; the local store/localStorage are wiped but the cloud docs remain. On reconnect, `onSnapshot` re-populates everything.
- **Impact:** Offline "clear" appears to work then the data resurrects on reconnect. (Currently latent: no `src/` file imports `lib/firebase` — the Supabase path is active — but the bug is real if the legacy path is ever re-enabled.)
- **Fix:** Enqueue a clear action (add `'clear'` to `SyncQueueItem.action` and handle it in `syncOfflineQueueToFirestore`), or refuse the clear offline.

### [P3] Offline queue: no dedupe and no backoff/dead-letter — duplicates replay, poison items retry forever
- **File:** src/lib/supabase.ts:334-341 (queueWrite), src/lib/supabase.ts:461-497 (flush loop)
- **Issue:** (a) `addToQueue` unconditionally appends — rapid repeated saves of the same doc while offline enqueue N copies, all replayed (correct final state for upserts, but wasted writes and larger replay windows). (b) In the flush loop, a permanently failing item (e.g., RLS/constraint error, corrupt data) is retried on **every** subsequent flush — each successful write triggers `void flushOfflineQueue()`, so a stuck item costs an API round-trip on every save, forever, with no backoff or dead-letter.
- **Impact:** Persistent sync badge, extra API cost, and (with a poisoned item) the queue never fully drains.
- **Fix:** Upsert-by-key dedupe on enqueue (replace existing queue entries for the same collection+id+action), and move items that fail N times to a dead-letter list (or drop with a logged error).

### [P3] SPA catch-all returns index.html (200) for missing asset files
- **File:** server.ts:467-470
- **Issue:** The final `app.get("*")` serves `index.html` for any unmatched GET — including `/assets/foo.abc123.js` when the hashed file is missing from `dist` (e.g. after a partial rsync or precompress failure). The browser receives HTML with a JS content-type expectation and fails silently; a broken deployment shows a blank/broken page with no 404 to surface the problem.
- **Impact:** Masks build/deploy integrity failures; hard to diagnose.
- **Fix:** For `/assets/*` and any path with an extension, return 404 instead of the SPA fallback.

### [P3] modelSort: duplicate spellings of the same model survive dedupe → duplicate dropdown entries
- **File:** src/utils/modelSort.ts:19-34
- **Issue:** `IPHONE_ORDER` contains both `'iPhone Xs Max'` and `'iPhone XS Max'`, `'iPhone Xs'`/`'iPhone XS'`, `'iPhone SE 2'` and `'iPhone SE (2nd Gen)'`. `sortModelsNewestFirst` dedupes on the **lowercased** string, so the differently-cased/canonicalized variants are treated as distinct and both appear in model pickers.
- **Impact:** Duplicate entries in Intake/POS/Price-Catalog dropdowns for the same real model.
- **Fix:** Keep one canonical spelling per model (dedupe on a normalized form that strips punctuation/case, e.g. remove spaces/parentheses).

### [P3] ThemeContext accepts any saved string as a theme; removed presets leave broken styling
- **File:** src/context/ThemeContext.tsx:88-95, 33
- **Issue:** `loadTheme()` returns `saved` unvalidated. The `ThemeMode` type still lists `'nunito-navy'` and `'apple-clean'`, but `THEME_PRESETS` only defines `'minimalist-clean'` and `'dark-slate'`. A user who saved one of the removed themes (or any corrupted value) gets `data-theme="nunito-navy"` with no matching CSS and `activePreset` silently falling back to preset[0].
- **Impact:** Broken/inconsistent theming for affected accounts, no migration path.
- **Fix:** Validate against `THEME_PRESETS` ids in `loadTheme` (fall back to default), and prune the dead entries from the type.

### [P3] portalWorkflow: log ids from `Date.now()` → duplicate ids / duplicate entries on rapid double-apply
- **File:** src/utils/portalWorkflow.ts:33, 55
- **Issue:** `id: \`log-cust-approve-${Date.now()}\`` / `\`log-cust-reject-${Date.now()}\`` — two calls within the same millisecond (double-tap "Approve") produce identical ids and two log entries with the same key; nothing dedupes or guards re-entry (the function also doesn't reject approving an already-approved estimate).
- **Impact:** Duplicate/colliding repair-log entries; id collisions can confuse keyed rendering and audits.
- **Fix:** Use a monotonic counter/`crypto.randomUUID()` and bail out when `estimateStatus` is already `Approved`/`Rejected`.

### [P3] Translation of the "Cant Repair" status disagrees with the runtime status value
- **File:** src/data/translations.ts:76, src/types/index.ts:13
- **Issue:** The status value everywhere is `'Cant Repair'` (types, seeds, server filters), but `statusCantRepair.en` is `"Can't Repair"` (with apostrophe). Any UI rendering `t('statusCantRepair')` next to a filter matching `wo.status === 'Cant Repair'` shows a different string than the stored value, and string comparisons in mixed EN/MM renderings fail.
- **Impact:** Inconsistent status labels; cosmetic in UI, but breaks any code path that compares displayed label to value.
- **Fix:** Change the translation to `'Cant Repair'` (or normalize the value).

### [P3] seedTickets: factually wrong device/part combinations in demo data
- **File:** src/utils/seedTickets.ts (ticket 4 ≈ line 332, ticket 10 ≈ line 560)
- **Issue:** Ticket 4 is an iPhone 13 Pro Max (`deviceCategory: "iPhone"`, model `"iPhone 13 Pro Max"`) whose line item is `'Samsung Galaxy S24 Ultra Original Dynamic AMOLED Screen'`; ticket 10 is an iPhone 12 Pro Max whose symptoms/diagnostics mention `'Tensor G3 SoC'` (a Pixel/Google chip) and `'Board cracked across Tensor G3 SoC silicon layers'`.
- **Impact:** Demo/test data that misrepresents real inventory (an iPhone ticketed with a Samsung screen); misleading for staff QA and screenshots.
- **Fix:** Swap in correct iPhone parts/chips (e.g., iPhone 13 Pro Max OLED assembly, A15 Bionic).

### [P3] db/index.ts env-var mismatch and stale schema defaults (legacy Postgres path)
- **File:** src/db/index.ts:11-14, src/db/drizzle.config.ts:10-13, src/db/schema.ts:60, 18
- **Issue:** Runtime pool reads `process.env.SQL_USER`, while the drizzle migration config requires `SQL_ADMIN_USER` — inconsistent names, and `db/index.ts` doesn't import `dotenv` and eagerly `new Pool(...)` at module load with no env presence check (undefined values → opaque connection failures). Also schema defaults have drifted from the app: `workOrders.status` default `'Pending'` vs the app's intake default `'Receive'`; `customers.type` default `'Retail Individual'` vs `CustomerType` `'Retail'`.
- **Impact:** If this legacy path is ever wired up, first-query failures and mismatch between migrations and app data. (Currently unused by the Supabase app.)
- **Fix:** Unify env var names, load dotenv, validate before creating the pool, and align defaults with `types/index.ts` or remove the module.

### [P3] main.tsx deletes legacy IndexedDB on every load, un-awaited
- **File:** src/main.tsx:17-21
- **Issue:** `indexedDB.deleteDatabase('AppleRepairERP_DB')` runs on every app start without awaiting or handling `blocked`/`VersionError`. It's fire-and-forget, so it can race an open connection (the legacy `indexedDB.ts` uses this exact DB name) and silently fail — and any future feature that reuses the name gets its storage wiped per session.
- **Impact:** Legacy-cache cleanup is best-effort (may not happen), and the pattern is a footgun for future storage.
- **Fix:** Await the delete with `onblocked` handling and guard behind a version flag; keep `indexedDB.ts`'s DB name out of any current use.

### [P3] `firebase-applet-config.json` contains `remixed-*` placeholders (dead Firebase path)
- **File:** firebase-applet-config.json (repo root), src/lib/firebase.ts:16
- **Issue:** The config is `projectId: "remixed-project-id"`, `apiKey: "remixed-api-key"`, etc. `firebase.ts` initializes the app from it. No current source imports `lib/firebase` (verified), so it's dormant — but if anyone re-enables the Firebase path it fails with an invalid-app runtime error, and the file's existence may mislead future maintainers into thinking Firebase is configured.
- **Impact:** Latent breakage; confusing state. (Positive: no real Firebase secrets in the repo.)
- **Fix:** Remove the legacy firebase module + placeholder config, or document it as intentionally disabled.

### [P3] /api/error-log accepts unauthenticated, unbounded JSON (log poisoning)
- **File:** server.ts:390-406
- **Issue:** No auth and no body validation on `POST /api/error-log` (express.json limit is 10 MB). Anyone can append arbitrary entries (including fake `uncaught`/`unhandledrejection` records) to `error-log.jsonl`, and each write reads+rewrites the whole file. Entries are JSON-stringified so no newline injection, but content is spoofable.
- **Impact:** Polluted error log makes real incident triage unreliable; minor disk churn from large bodies.
- **Fix:** Rate-limit per IP, cap body size for this route, and optionally require a session token.

### [P3] domTranslate active observers never cleaned while running (memory growth)
- **File:** src/lib/domTranslate.ts:545-570
- **Issue:** While `startDomTranslation()` is active (Burmese mode), `attrOriginals` WeakMap + `trackedElements` Set accumulate entries for every element that ever carried a placeholder/title/aria-label; text nodes re-based on every React re-render. No pruning occurs until `stopDomTranslation()` (language switch). On long sessions with dynamic UIs, this grows unbounded.
- **Impact:** Slow memory growth / GC pressure on low-end iPads; MutationObserver also re-scans on every `characterData` mutation (typing/updates) — O(phrases × text) per mutation.
- **Fix:** Periodically drop `trackedElements` entries for elements no longer in the document (`isConnected` check), and debounce the observer.

### [P3] compressImageFile: PNG→JPEG loses transparency; reader error stores empty string
- **File:** src/lib/utils.ts:29-31
- **Issue:** Always encodes `image/jpeg` — PNGs with transparency get a black background; and on `reader.onerror` the promise resolves `''`, which callers may store as a photo data URL (broken image in the ticket).
- **Impact:** Ugly/blank device photos for affected files; minor data-quality issue.
- **Fix:** Keep PNG when the source is PNG (or composite onto white), and resolve the original data URL on read errors instead of `''`.

### [P3] deploy.sh has no git-clean guard and rsync lacks `--delete`
- **File:** deploy.sh:23-30
- **Issue:** Deploys the current working tree (`npm run build` → rsync `dist`) without checking `git status`/branch; uncommitted or WIP changes ship silently (currently the tree is clean, so this is latent). `rsync -az dist ...` without `--delete` leaves stale hashed assets on the VPS forever.
- **Impact:** Accidental deployment of uncommitted changes; dist ballooning with orphaned assets over time.
- **Fix:** `git diff --quiet` guard (or deploy from a clean checkout), and add `--delete` to the rsync (safe for hashed assets).

---

## Summary

- **Total findings: 20** (P1: 3, P2: 7, P3: 10)
- P1: unauthenticated AI proxy endpoints; unauthenticated `logout-all` mass session revocation; rollback.sh pointed at the wrong (old) server.
- P2: deploy.sh destroys the previous release before verification (rollback ineffective); Supabase fetch truncation at 1000 rows; seed ticket totals vs line items mismatch (7/10); customer ID collisions between seed sets; USD-priced parts in an MMK shop; X-Forwarded-For brute-force bypass; domTranslate corrupting user data in Burmese mode.
- P3: legacy firebase offline-clear not queued; queue dedupe/backoff gaps; SPA fallback masking missing assets; modelSort duplicate spellings; theme validation; portal log-id collisions; status label mismatch; wrong seed device/part combos; db env-var mismatch; IndexedDB delete pattern; placeholder Firebase config; unauth error-log; domTranslate memory growth; image compression edge cases; deploy git/rsync hygiene.
