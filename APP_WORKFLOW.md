# i35 Apple Service ERP — Whole App Workflow Guide (Stable v1.1)

**Version:** v1.1 (stable) · **Git tag:** `stable-v1.1` · **Server:** localhost:3001
**Updated:** 2026-08-08 · **App:** Apple Repair ERP — React 19 + Vite + Supabase

---

## 1. One-Picture Overview

```
                    ┌─────────────────────────────────────────────┐
                    │              SIDEBAR (12 modules)           │
                    └─────────────────────────────────────────────┘

 CUSTOMER WALKS IN
      │
      ▼
 ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
 │  INTAKE │───▶│ PIPELINE│───▶│   QA    │───▶│   POS   │───▶│FOLLOW-UP│
 │ (Create │    │ (Kanban │    │ (21-pt  │    │(Checkout│    │ (3-7 day│
 │  Ticket)│    │  board) │    │ inspect)│    │ + Pay)  │    │  call)  │
 └─────────┘    └─────────┘    └─────────┘    └─────────┘    └─────────┘
      │              │              │              │              │
      │              │              │              │              └──▶ WARRANTY
      │              │              │              │                    (90-day clock)
      │              │              │              │
      │              │              ▼              ▼
      │              │        ┌──────────┐   ┌──────────┐
      │              │        │ INVENTORY│   │ FINANCE  │
      │              │        │ (Parts   │   │ (P&L,    │
      │              │        │  Stock)  │   │  Fund)   │
      │              │        └──────────┘   └──────────┘
      │              ▼
      │        ┌──────────┐    ┌──────────┐    ┌──────────┐
      │        │ SUPPLIERS│    │   CRM    │    │ PRICE    │
      └───────▶│ (RMA /   │    │(Customer │    │ CATALOG  │
               │  PO)     │    │ History) │    │ (Fixed)  │
               └──────────┘    └──────────┘    └──────────┘
                    ┌─────────────────────────────────┐
                    │        SYSTEM MANAGEMENT        │
                    │  (Settings: users, techs, AI,   │
                    │   payment, theme, recycle bin)  │
                    └─────────────────────────────────┘
```

---

## 2. Core Repair Flow (The Main Loop)

### Step 1 — INTAKE (Create Ticket)
**Screen:** `#/create-ticket` (via sidebar "+ Intake Ticket" or New Intake button)

1. **Customer:** phone number → auto-match existing customer (name/type auto-filled)
2. **Device:** category → model → color → serial/IMEI (manual, no fake auto-gen)
3. **Repairs:** pick from **Price Catalog** → `lineItems` created (labor vs parts)
4. **Diagnostics:** 21-point before-repair checklist (optional at intake)
5. **Financials:** subtotal → discount → deposit → total (MMK)
6. **Priority:** Normal / Urgent / B2B Priority / Warranty Redo
7. **Save** → ticket enters **Receive** status

> Ticket list: `#/intake` — filter by status (All Active / Receive / In Progress / Ready / Urgent), table or card view, scan barcode/QR.

### Step 2 — PIPELINE (Repair Work)
**Screen:** `#/pipeline` — kanban board with columns

```
Receive ──▶ In Progress ──▶ Pending ──▶ Finished
  │             │              │            │
  │             │              │            ├──▶ QA required
  │             │              └──▶ Notify customer (SMS/Viber/TG)
  │             └──▶ Technician assignment + repair logs
  └──▶ Assign tech
```

- **Drag & drop** tickets between stages
- **Assign technician** per ticket (dropdown / self-assign for techs)
- **Before-diag / after-diag** pending flags (stethoscope/shield icons)
- **Bottleneck detection:** ticket stuck >48h → amber alert
- **Checkout** button on Finished tickets → opens POS directly
- **Logs:** every status change recorded in repair log timeline
- Exception stages: **Cant Repair** / **Customer Not Repair** (hidden by default, View Options → Show Exception Stages)

### Step 3 — QA (Quality Assurance)
**Screen:** `#/qa` — only Finished/Taken-Out tickets without checklist appear

- Left: **QA queue** (tickets awaiting inspection)
- Right: **21-point post-repair checklist** (Pass/Fail/N/A per item + comments)
  - Display, Touch, Face ID, Cameras, Charger, Sound, Vibrate, Flash, SIM, Microphone, Battery Health, WiFi, Bluetooth, Backglass, Keys, Proximity, Compass, Gyroscope, Panic Log, Other
- **Mark All Pass / N/A** shortcuts
- **Confirm QA Pass** → ticket becomes **Ready for Checkout** (green)
- QA pass stamps `completedAt` → **warranty clock anchor**

### Step 4 — POS (Checkout & Payment)
**Screen:** `#/pos` — tickets with QA passed

1. Select ticket → shows order summary
2. **Notify Customer** (SMS/Viber/Telegram)
3. **Add Inventory Part Used** → deducts stock, records expense, marks inventory fund `pending`
4. **Payment method:** Cash / KBZ Pay / UAB Pay / AYA Pay / Split Payment (multi-method)
5. Quick amounts: Exact / 50k / 100k / 200k / 500k + custom
6. **Pay & Print Receipt** → ticket becomes **Taken Out**
7. **Print Itemized Invoice** (optional)

### Step 5 — FOLLOW-UP (After Service)
**Screen:** `#/follow-up` — completed devices

- Filter: All / 7+ Day Due / 1 Month / 2 Months / Pending Call / Satisfied / Issue Reported / No Answer / Callback Scheduled
- Track call status until **Satisfied**
- Search by ticket/customer/device

### Step 6 — WARRANTY
- Clock starts at `completedAt` (Finished/Taken Out), default **90 days**
- Dashboard **Warranty Watch** tab: expiring ≤14 days (warning), ≤7 days (critical)
- Copy courtesy message to send customer

---

## 3. Support Modules

### INVENTORY (`#/inventory`)
- Stock view / Profit view / Matrix view
- Filters: model, category, quality tier, low-stock only
- **Low-stock banner:** parts at/below reorder point (tap to filter)
- Add Part / Edit / Print Tags / Barcode lookup
- Stock deducted automatically at POS consumption

### FINANCE (`#/finance`)
| Section | What it shows |
|---|---|
| Financial Overview | Gross revenue, gross profit %, OpEx, net |
| Revenue & Payment Methods | Income by method (cash/KBZ/UAB/AYA) |
| OpEx & COGS Costs | Expenses + cost of goods sold |
| Parts Asset Valuation | Total stock value |
| Tech Commissions | Per-technician payouts |
| Accounts Payable / Debts | Supplier debts, overdue |
| Inventory Fund | Parts taken from stock, **Mark Settled** until paid back |
| Parts Revenue & Profit | Parts sales vs cost |

### SUPPLIERS (`#/suppliers`)
- RMA Defective Returns (Draft → Shipped to Vendor → Replaced/Refunded → Closed)
- Purchase Orders
- Vendor Catalog

### CRM (`#/crm`)
- Customer Database (name, phone, # repairs, full history)
- Portal Simulator (customer-facing estimate approval)
- Ticket history per customer

### PRICE CATALOG (`#/price-catalog`)
- Fixed price list per device model
- Categories: Battery / Display / Charging / Audio / Logic Board / Network / Sensors & Keys
- Quick Calc, Copy Customer Quote, Create Intake Ticket from selection

### SYSTEM MANAGEMENT (`#/settings`)
- **Business:** Shop Settings & Logo, Pricing & Currency, Payment Methods & MM QR, POS & Receipt Layout
- **Staff:** User Roles & Permissions, Technicians & Staff
- **Operations:** Work Orders & Intake, QA & Diagnostic Rules, Inventory Data & Quality, SMS & Telegram Alerts
- **System:** Theme & Color Palette, AI Assistant & API, Recycle Bin & Trash

### DASHBOARD (`#/dashboard`)
- **4 KPI cards:** Active Repairs, Ready for Pickup, Total Revenue, Avg Turnaround
- **6 tabs:** Status Queue / Hardware Analytics / Technicians / Inventory / Finance / Warranty Watch
- Stage distribution bars (click to filter queue)
- Bottleneck alert + Open Pipeline shortcut

---

## 4. Data & Tech

| Layer | Tech |
|---|---|
| Frontend | React 19, TypeScript, Tailwind CSS v4, Lucide icons |
| Backend | Express + Vite middleware (`server.ts`), in-memory auth tokens (`auth-tokens.json`) |
| Database | Supabase Postgres — table `erp_records` (collection_name + data JSONB) |
| Auth | Email/password from `.env` → token (30-day expiry) |
| AI | Gemini / DeepSeek / Anthropic — web widget (always Burmese) + Telegram bot |
| Real-time | Supabase postgres_changes + 45s refetch fallback |

**Collections:** `workOrders` · `parts` · `suppliers` · `purchaseOrders` · `rmas` · `technicians` · `users` · `expenses` · `technicianPayouts` · `supplierDebts` · `priceCatalog`

---

## 5. Ticket Lifecycle (Statuses)

```
Receive → In Progress → Pending → Finished → Taken Out (done)
                              ↘ Finished → QA pass → POS → Taken Out
Receive → Cant Repair / Customer Not Repair (dead ends, exceptions)
```

| Status | Meaning | Next action |
|---|---|---|
| Receive | Just registered at intake | Assign tech → In Progress |
| In Progress | Being repaired | Update log → Pending or Finished |
| Pending | Waiting approval/parts | Notify customer |
| Finished | Repair done | QA inspection required |
| Taken Out | Customer collected, paid | Follow-up in 3-7 days |
| Cant Repair | Cannot fix | Explain to customer |
| Customer Not Repair | Customer declined | Close |

---

## 6. Role Permissions

| Role | Access |
|---|---|
| **Admin** | Everything (all 12 modules + settings) |
| **Reception** | Everything except System Settings (unless granted) |
| **Technician** | Pipeline (own jobs), QA, CRM, Price List, Finance (if granted) |

---

## 7. Quick Reference — Where Things Live

| I want to... | Go to |
|---|---|
| Register a new repair | `+ Intake Ticket` |
| See all tickets | Work Intake & Tickets |
| Move a ticket along / assign tech | Pipeline (drag & drop) |
| Inspect finished repair | QA & Warranty Inspection |
| Collect payment | POS & Invoicing Portal |
| Call customer after service | Customer Follow-Ups |
| Check profit / expenses | Shop Finance |
| Buy parts / check stock | Parts Inventory & Stock Matrix |
| Return defective part to vendor | Suppliers & Vendor RMAs |
| Look up customer history | Customer & Staff Portal |
| Set service prices | Price List |
| Add staff / configure app | System Management |
