# i35 Apple Service ERP — Module-by-Module Functions & Workflows (Detailed)

**Version:** v1.1 (stable) · **Server:** localhost:3001 · **Updated:** 2026-08-08
*ဤ document သည် module တစ်ခုချင်းစီ၏ function များနှင့် workflow များကို အသေးစိတ် ဖော်ပြသည်။*

---

# 1. INTAKE (Work Intake & Tickets) — `#/intake`

## Screens
| Screen | Route | ရည်ရွယ်ချက် |
|---|---|---|
| Ticket List | `#/intake` | ရှိပြီးသား tickets အားလုံးကို စီမံ |
| Create Ticket | `#/create-ticket` | ဝင်လာတဲ့ ဖုန်းအသစ်အတွက် intake form |

## Functions (IntakeWorkOrderModule — Ticket List)

### View & Filter
| Function | အလုပ်လုပ်ပုံ |
|---|---|
| **Table / Card view toggle** | List ကို table (row detail) သို့မဟုတ် card grid (photo-style) ပြောင်းကြည့် |
| **Status filter chips** | All Active (8) / Intake-Receive (1) / In Progress (1) / Pending Approval (0) / Ready-Finished (3) / Urgent Priority (0) |
| **Clear All (8)** | Filter အားလုံး ပြန်ဖျက် (ticket မဖျက်ပါ) |
| **Priority First sort** | Urgent/Rush tickets ကို ရှေ့တန်းတင်ပြ |
| **Search** | Ticket #, customer, phone, device, serial, IMEI, symptom ရှာ |
| **Scan Barcode / QR** | Camera နဲ့ scan → IMEI (15 digit) / serial → create-ticket form ထဲ auto-fill |
| **Recycle Bin** | ဖျက်ထားတဲ့ tickets (restore / permanent delete) |
| **Open Ticket** | Row/card click → TicketDetailInspector (full history, print tag, edit, delete) |
| **Delete ticket** | Confirm modal → Recycle Bin သို့ ရွှေ့ (restore လို့ရ) |

### Workflow
```
List ကြည့် → filter/search → row click → detail modal
                                   → Print tag / Edit / Move to Recycle Bin
```

---

## Functions (CreateTicketSoloPage — New Intake)

| Step | Function | အလုပ်လုပ်ပုံ |
|---|---|---|
| 1 | **Phone auto-match** | Customer phone ရိုက်တာနဲ့ ရှိပြီးသား customer (name/type) auto-fill |
| 2 | **Device register** | Category → Model → Color → Serial/IMEI (manual) — duplicate open ticket ရှိရင် သတိပေး |
| 3 | **Catalog repair picker** | Price Catalog ကနေ repairs ရွေး → lineItems ဖြစ် |
| 4 | **Per-repair discount** | Repair တစ်ခုချင်းစီ % discount ချပေး |
| 5 | **21-pt before diagnostics** | Intake checklist (Pass/Fail/N/A) — repair type နဲ့ ဆိုက်တဲ့ items ပဲ ပြ |
| 6 | **Financials auto-calc** | Subtotal → Discount → Deposit → Total (MMK) |
| 7 | **Priority** | Normal / Urgent / B2B / Warranty Redo |
| 8 | **Save** | Ticket → status `Receive` → list ထဲ ရောက် |

### Workflow
```
Phone → Customer match → Device → Repairs from catalog
→ Diagnostics → Price (deposit) → Priority → Save → Receive status
```

---

# 2. PIPELINE (Kanban Board) — `#/pipeline`

## Functions

| Function | အလုပ်လုပ်ပုံ |
|---|---|
| **Drag & drop move** | Ticket ကို stage column အကြား ဆွဲချ (Receive→In Progress→Pending→Finished) |
| **Technician assignment** | Dropdown assign / Technician user က ကိုယ့်ကိုယ်ကို "Assign Me" |
| **Repair Log** | Status change + note တိုင်းကို timeline မှတ်တမ်း |
| **Checkout (Finished)** | Finished ticket မှာ ချက်ချင်း POS modal ဖွင့် |
| **Notify (Pending)** | Customer ကို SMS/Viber/Telegram alert ပို့ |
| **More actions (⋯)** | Detail / View Log / Delete |
| **Quick assign (tech dropdown)** | Card ပေါ်ကနေ tech ပြောင်း |
| **Bottleneck filter (>48h)** | 48 နာရီထက် ကြာနေတဲ့ stuck tickets ပဲ ပြ |
| **Stage filter / Tech filter / Date filter** | Kanban ကို ကျဉ်းမြောင်းအောင် filter |
| **Search** | Model, IMEI, name, phone |
| **Before-Diag Pending filter** | Initial 21-pt diagnostic မပြီးသေးတဲ့ tickets |
| **After-Diag Pending filter** | Post-repair QA check မပြီးသေးတဲ့ tickets |
| **Show Exception Stages** | Cant Repair / Customer Not Repair columns ပြ |
| **Drag guards** | Finished မှာ after-diag မရှိရင် alert; In Progress/Pending မှာ before-diag မရှိရင် alert |

## Workflow
```
Receive → [Assign tech] → In Progress → [Log work] → Pending → [Notify] → Finished
                                                                          │
                                                  after-diag မပြည့်ရင် alert ─┘
```

---

# 3. QA (Quality Assurance & Warranty Inspection) — `#/qa`

## Functions

| Function | အလုပ်လုပ်ပုံ |
|---|---|
| **QA Queue (left panel)** | Finished/Taken Out ဖြစ်ပြီး checklist မရှိသေးတဲ့ tickets |
| **21-pt diagnostic checklist** | Display, Touch, Face ID, Main/Front Camera, Charger, Sound, Vibrate, Flash, SIM, Microphone, Battery Health, WiFi, Bluetooth, Backglass, Keys, Proximity, Compass, Gyroscope, Panic Log, Other — Pass/Fail/N/A + comment |
| **Mark All Pass** | 21 items လုံး Pass ချ |
| **Mark All N/A** | 21 items လုံး N/A ချ |
| **Confirm QA Pass** | Checklist save → ticket **Ready for Checkout** (green) → `completedAt` stamp (warranty clock) |
| **Technician select** | QA လုပ်တဲ့ သူကို မှတ် |
| **Final QA notes** | Additional notes |

## Workflow
```
Finished ticket → QA queue → 21-pt inspect → Pass/Fail/N/A per item
→ Confirm QA Pass → Ready for checkout → completedAt stamped
```

---

# 4. POS (Checkout & Invoicing Portal) — `#/pos`

## Functions

| Function | အလုပ်လုပ်ပုံ |
|---|---|
| **Select ticket** | QA ပြီးတဲ့ tickets (postRepairChecklist ရှိတဲ့) — radio select |
| **Notify Customer** | SMS/Viber/Telegram alert |
| **Add Inventory Part Used** | Ticket မှာ သုံးတဲ့ stock part ရွေး → stock deduct + expense record + inventory fund `pending` |
| **Remove part** | ထည့်ထားတဲ့ part ပြန်ဖျက် |
| **Payment method** | Cash / KBZ Pay / UAB Pay / AYA Pay / Split Payment (multi-method) |
| **Quick amounts** | Exact / 50,000 / 100,000 / 200,000 / 500,000 + custom input |
| **Pay & Print Receipt** | Payment confirm → ticket **Taken Out** → receipt print (PAID badge) |
| **Print Itemized Invoice** | A4 invoice (intake voucher + PAID badge) |
| **Diagnostic Fee Only** | ပြင်မရဘဲ diagnostic fee ပဲ ကောက်တဲ့ case |

## Workflow
```
QA-ready ticket → select → [parts consume] → payment method → amount
→ Pay → Taken Out → receipt/invoice print
```

---

# 5. FOLLOW-UP (Completed Device Follow-Up) — `#/follow-up`

## Functions

| Function | အလုပ်လုပ်ပုံ |
|---|---|
| **Due filter chips** | All / 7+ Day Due / 1 Month (30d) / 2 Months (60d) |
| **Status filter** | Pending Call / Satisfied / Issue Reported / No Answer / Callback Scheduled |
| **Search** | Ticket, customer, device |
| **Log follow-up call** | Call လုပ်ပြီးတဲ့ record (status + note) ထည့် → ticket ပေါ်မှာ history |

## Workflow
```
Finished device → due date ရောက် → call → log result
→ Satisfied (done) / Callback Scheduled / Issue Reported
```

---

# 6. DASHBOARD — `#/dashboard`

## Functions (tabs ၆ ခု)

| Tab | Function များ |
|---|---|
| **Status Queue** | KPI cards ၄ ခု (Active, Pickup, Revenue, Turnaround) · stage distribution bars (click→filter) · bottleneck alert · queue roster (search, tech filter, priority filter) |
| **Hardware Analytics** | Top repair devices · top repair categories (revenue %) |
| **Technicians** | Tech KPI / leaderboard / drill-down detail modal |
| **Inventory** | Low stock alerts · inventory summary |
| **Finance** | Revenue trend chart · P&L summary · unpaid balance |
| **Warranty Watch** | Expiring ≤14d warning · ≤7d critical · copy courtesy message |

## Workflow
```
Open dashboard → scan Needs-Attention (bottleneck/ready) → click into module
```

---

# 7. INVENTORY (Parts & Stock Matrix) — `#/inventory`

## Functions

| Function | အလုပ်လုပ်ပုံ |
|---|---|
| **View modes** | Stock / Profit / Matrix |
| **Filters** | Model · Category · Quality tier · Low-stock only |
| **Low-stock banner** | 449 SKUs at/below reorder → tap to filter |
| **Table / Card view** | Row detail vs card grid |
| **Add Part** | SKU, name, category, device compatibility, quality tier, cost/sell price, reorder point, quantity |
| **Edit Part** | Price/stock update |
| **Delete Part** | Confirm → ဖျက် |
| **Select + Bulk Print Tags** | Selected parts ရဲ့ shelf tags print |
| **Scan/Lookup** | Barcode/QR scan သို့မဟုတ် search |
| **Export CSV** | Selected → CSV |
| **Supplier CRUD** | Vendor ထည့်/ပြင် |
| **Warranty claim** | Defective part → vendor warranty claim submit |

## Workflow
```
Stock ကြည့် → low-stock filter → reorder → Add/Edit part
→ POS မှာ consume → stock လျော့ → inventory fund pending
```

---

# 8. FINANCE (Shop Finance & P&L Engine) — `#/finance`

## Sections (8 tabs)

| Section | Functions |
|---|---|
| **Financial Overview** | Gross revenue · gross profit % · OpEx · net P&L summary cards |
| **Revenue & Payment Methods** | Income by method (cash/KBZ/UAB/AYA) · collected vs unpaid |
| **OpEx & COGS Costs** | Expense list · Record Expense modal · parts COGS |
| **Parts Asset Valuation** | Total stock value (cost × qty) |
| **Tech Commissions** | Technician payouts · monthly totals · commission split (parts vs labor) |
| **Accounts Payable / Debts** | Supplier debts · overdue count · Record/confirm supplier payment |
| **Inventory Fund** | Parts consumed from stock (pending) · **Mark Settled** (fund return) |
| **Parts Revenue & Profit** | Parts sold · units · profit margin |

## Workflow
```
Daily: Record Expense → check Revenue → settle Inventory Fund
Weekly: Tech commissions → supplier debts → P&L review
```

---

# 9. SUPPLIERS (RMA & Purchase Orders) — `#/suppliers`

## Functions

| Function | အလုပ်လုပ်ပုံ |
|---|---|
| **Supplier CRUD** | Vendor ထည့် / ပြင် / ဖျက် |
| **RMA Defective Returns** | Defective part return: Draft → Shipped to Vendor → Replaced/Refunded → Closed |
| **Flag Defective RMA** | RMA အသစ် စတင် |
| **Purchase Orders** | Vendor ဆီ PO မှတ်တမ်း |
| **Vendor Catalog** | Vendor ရဲ့ parts catalog |
| **Table / Card view** | RMA list ပြပုံ ပြောင်း |
| **Status filter / Date filter** | RMA statuses နဲ့ date စစ် |

## Workflow
```
Defective part → Flag RMA → Ship to vendor → Replaced/Refunded → Closed
```

---

# 10. CRM (Customer & Staff Portal) — `#/crm`

## Functions

| Function | အလုပ်လုပ်ပုံ |
|---|---|
| **Customer Database** | Customers (name, phone, email, type, repair count) |
| **Add Customer** | Manual customer create |
| **Edit Customer** | Update contact info |
| **Full History modal** | Customer ရဲ့ tickets အားလုံး (timeline) |
| **Search** | Name, phone, email |
| **Account type filter** | Regular / B2B စသဖြင့် |
| **Portal Simulator** | Customer-facing portal (estimate approval / inquiry) ကို preview |
| **Customer ticket history** | Invoice / Logs tabs |

## Workflow
```
Customer ရှာ → history ကြည့် → edit / add → (portal simulator နဲ့ test)
```

---

# 11. PRICE CATALOG (Price List) — `#/price-catalog`

## Functions

| Function | အလုပ်လုပ်ပုံ |
|---|---|
| **Model switcher** | iPhone model ရွေး → price list ပြောင်း |
| **Category filter** | Battery / Display / Charging / Audio / Logic Board / Network / Sensors & Keys |
| **Service filter** | Name နဲ့ ရှာ |
| **Calc (Quick Price Calculator)** | Service combo ရဲ့ စုစုပေါင်း ဈေး တွက် |
| **Cart toggle** | Repair ရွေး → cart |
| **Per-item discount** | Selected repair % discount |
| **Copy Customer Quote** | Quote text clipboard ကူး |
| **Create Intake Ticket** | Cart ကနေ တိုက်ရိုက် ticket ဖွင့် |
| **Export CSV** | Catalog download |
| **Catalog Settings** | Folder/category စီမံ |

## Workflow
```
Model → service ရွေး → cart → discount → Create Intake Ticket / Copy Quote
```

---

# 12. SYSTEM MANAGEMENT (Settings) — `#/settings`

## Groups (4)

### Business
| Section | Functions |
|---|---|
| **Shop Settings & Logo** | Shop name, logo upload, contact info |
| **Pricing & Currency** | Currency symbol, tax rate |
| **Payment Methods & MM QR** | Cash/KBZ/UAB/AYA toggle, custom method add, QR config |
| **POS & Receipt Layout** | Receipt footer lines, print layout |

### Staff
| Section | Functions |
|---|---|
| **User Roles & Permissions** | Add/edit users, role (Admin/Reception/Technician), permission toggles |
| **Technicians & Staff** | Add/edit tech, commission rate, delete tech |

### Operations
| Section | Functions |
|---|---|
| **Work Orders & Intake** | Ticket numbering, intake rules |
| **QA & Diagnostic Rules** | QA checklist rules |
| **Inventory Data & Quality** | Categories, suppliers, quality tiers, bins, stock rules |
| **SMS & Telegram Alerts** | Notification templates + variables + custom template |

### System
| Section | Functions |
|---|---|
| **Theme & Color Palette** | Theme switcher |
| **AI Assistant & API** | AI provider, API keys, AI re-scan classification |
| **Recycle Bin & Trash** | Archived tickets restore / empty bin |

## Global Functions
| Function | အလုပ်လုပ်ပုံ |
|---|---|
| **Reset Draft** | မသိမ်းရသေးတဲ့ ပြောင်းလဲမှုတွေ ပြန်ဖျက် |
| **Save All Settings** | Settings အားလုံး တစ်ခါတည်း save |
| **Search settings** | Section ရှာ |
| **Unsaved-changes guard** | Tab ပြောင်းတဲ့အခါ confirm |

---

# 13. AI ASSISTANT (Web + Telegram)

| Function | အလုပ်လုပ်ပုံ |
|---|---|
| **Web chat widget** | Header AI button / mobile FAB → bottom-right chat — မြန်မာလို အမြဲဖြေ |
| **Context-aware** | Live workOrders/parts/technicians data ကို သုံးပြီး ဖြေ — မရှိတဲ့ data ကို မလုပ်ကြံဘူး |
| **Telegram bot** | `@i35ERP_Bot` — chat history, category-aware |
| **AI repair classification** | Finished tickets → `repairTypeAI` (spareparts vs hardware) → commission split |

---

# Global / Cross-Module Functions

| Function | ဘယ်ကရလဲ | အလုပ်လုပ်ပုံ |
|---|---|---|
| **Global Search (⌘K)** | Header — screen တိုင်း | Cross-module search modal |
| **Date Filter** | Header — screen တိုင်း | Today/7d/30d/60d/custom range |
| **Ticket Detail Inspector** | Intake/Pipeline row click | Full ticket: info, line items, logs, diagnostics, print/edit/delete |
| **Printable Tag** | Detail modal → Print | Device shelf tag |
| **Recycle Bin** | Header (intake/pipeline) | Restore / permanent delete |
| **Live Supabase badge** | Header (dev only) | Connection status + manual refresh |

---

*End of document — module 12 ခုလုံး၏ functions နှင့် workflows အပြည့်အစုံ။*
