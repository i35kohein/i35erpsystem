# Customer & Staff Portal — Workflow Analysis & Bug Audit (i35 ERP)

- **Modules:** `src/components/crm/CrmCustomerPortalModule.tsx` (460 ln) · `CustomerRepairHistoryModal.tsx` · `CustomerRepairTimeline.tsx` · `src/components/portal/CustomerFacingWebPortal.tsx` (1,204 ln) · `src/components/common/UserRoleSwitcher.tsx` · `src/utils/portalWorkflow.ts` (pure, 6 vitest tests)
- **Date:** 2026-08-05 · **Analyst:** Kimi (OpenClaw)
- **Method:** full source read + live DOM verification in the running app (portal lookup, roster rows).
- **Overall: 7.5 / 10** — good separation of concerns (pure portal workflow, tested) and rich history views; but one **privacy bug** (fixed), one **data-integrity bug** (fixed), plus dead/edge-case issues.

---

## 1. Workflow map

```
INTAKE (ticket created)
   └─ customerName / customerPhone / customerId(if matched) stored on WorkOrder
        │
        ▼
CRM roster (rosterCustomers in App.tsx)
   = Supabase 'customers' accounts  +  customers DERIVED from active tickets
     (key: customerId, or name|phone; totals = sum over activeWorkOrders)
        │
        ├─ Customer Database tab (staff): roster list → expandable history,
        │     detail panel w/ chronological timeline (CustomerRepairTimeline),
        │     Full History modal, per-ticket Invoice print, delete (Admin).
        │
        └─ Portal Simulator tab → CustomerFacingWebPortal (customer view):
              login by phone / email / order# / serial / IMEI
                 → ticket overview + estimate
                 → APPROVE  → applyEstimateApproval(): Receive→In Progress,
                                estimateStatus=Approved, stamp, log entry
                 → REJECT   → applyEstimateRejection(): → Pending (hold),
                                reason + notes logged
              (pure functions in portalWorkflow.ts — unit tested, 6 tests)

UserRoleSwitcher: staff role switch (Admin/Technician/Reception) + Manage Users (Admin)
```

---

## 2. 🐞 Bugs found (verified in code + live)

### B-1 🔴 PRIVACY — portal login matched on raw substring (FIXED)
`CustomerFacingWebPortal.tsx` matched `wo.customerPhone.toLowerCase().includes(query)` — typing **"0"** (verified live) logged into the first ticket whose phone contained a 0: device, symptoms, estimate amount, approve/reject power. Any guessable digit leaked a customer's ticket.
**Fix:** phone lookup is now strict — query digits must **equal** the ticket digits or be its **trailing 6+ digits**; order#/email/serial/IMEI require exact matches. Also removed the regex typo `[^0-[#0-9a-z]` (an accidental `0–[` range) → `[^0-9a-z]`.
**Verified live:** "0" → "No active repair ticket found"; `WO-2026-1001` → ticket opens.

### B-2 🟠 DATA — delete button on ticket-derived customers (FIXED)
The roster is `cloud accounts + derived`; every row showed a delete button. Deleting a derived row called `deleteDocument('customers', <derived-id>)` (a bogus write) and toasted **"Customer removed"** — but the row instantly reappears (it's derived from tickets). False success + junk Supabase writes.
**Fix:** the module now receives `cloudCustomerIds`; derived rows show a **"Derived"** badge instead of delete; `handleDeleteCustomer` guards and explains ("no standalone account — delete the tickets instead").

### B-3 🟡 LOGIC — reject can pull an in-progress job back to Pending (flagged, not changed)
`applyEstimateRejection` forces `status: 'Pending'` regardless of stage. If the shop already started (`In Progress`) and the customer later rejects, the job yanks back to Pending. The portal UI now hides **Decline** unless the ticket is `Receive`/`Pending` (approve stays available). The pure function is unchanged (tests intact).

### B-4 🟡 COSMETIC — dead ternary (FIXED)
`{custOrders.length} Repair{s} {isExpanded ? 'History' : 'History'}` — both branches identical. Now just the count.

### B-5 🟠 GAP — no "Add Customer" UI (flagged)
`onAddCustomer` + `handleAddCustomer` exist and work, but the module renders **no Add Customer button** (`Plus` icon imported, never used). Staff cannot register a standalone customer account from the CRM tab — only intake tickets create (derived) customers. Feature, not crash — offer: add a small Add-Customer modal.

### B-6 🟡 DATA-QUALITY — loose roster matching (flagged)
`getCustomerWorkOrders` matches tickets by `customerId` **OR** exact phone **OR** exact name — same-name customers merge history; a changed phone splits it. Derived totals only count **active** tickets (archived tickets drop out of the roster entirely).

### B-7 🟡 A11Y — UserRoleSwitcher backdrop is a bare `div` (known U-2, still open)
`<div className="fixed inset-0 z-40" onClick={...}>` — no `role`/keyboard; screen-reader users can't dismiss the menu.

---

## 3. What's genuinely good ✅
- **Pure, tested workflow logic** — `portalWorkflow.ts` (approve/reject transitions) extracted and covered by 6 vitest cases; the component delegates. Rare discipline for a solo-built ERP.
- **Roster derivation** means every ticket's customer is visible with zero seed data.
- Rich history: inline expandable per-customer, full modal with stats (completed/in-progress/avg cost), and a chronological timeline with filters/sort — plus invoice printing from every surface.
- Delete is Admin-gated with a proper deny toast; safe-area & mobile stacking handled.

---

## 4. Fixes applied (commit pending deploy)
1. Portal lookup tightened (B-1) + regex typo — **verified live**
2. Derived-customer delete guard + badge (B-2) — **verified live** (8 derived badges, 0 delete buttons)
3. Decline gated to Receive/Pending (B-3)
4. Dead ternary removed (B-4)
5. `tsc` clean · 18/18 tests (portalWorkflow suite untouched & passing)

## 5. Recommendations (next pass)
- **Add Customer modal** (B-5) — ~1h, completes the feature.
- **Archive-aware roster**: include archived tickets in customer totals (or label "active only").
- **Roster identity**: match by customerId first, phone second; drop bare-name matching to avoid merges.
- **A11y pass** on the role switcher + roster rows (role="button", keyboard).
- **Public-portal exposure check**: confirm the portal is only reachable via the staff app (simulator) or behind a share-link token, now that lookup is strict.
