/**
 * domTranslate — full-UI Myanmar translation layer.
 *
 * Covers the UI strings that are hardcoded in English (not yet wrapped in t()).
 * Runs only when the app language is 'mm'. Technology terms (iPhone, IMEI,
 * Serial, QR, POS, QA, RMA, SKU, Passcode, Genuine/OEM/Original, etc.) are
 * deliberately kept in English.
 *
 * Mechanism: walks text nodes + placeholder/title/aria-label attributes,
 * replaces longest-matching dictionary phrases, remembers originals so
 * switching back to English restores the exact source text, and uses a
 * MutationObserver to translate newly rendered content (tab switches,
 * re-renders, counters, validation messages).
 */

// --- Dictionary: English → Myanmar (longest phrases first is applied at runtime) ---
const DICT: [string, string][] = [
  // App chrome
  ['Global search (⌘K)', 'ရှာဖွေမည် (⌘K)'],
  ['Global search', 'ရှာဖွေမည်'],
  ['Search tickets, parts, customers…', 'လက်မှတ်၊ အပိုပစ္စည်း၊ ဝယ်ယူသူ ရှာဖွေပါ…'],
  ['Search tickets, parts, customers', 'လက်မှတ်၊ အပိုပစ္စည်း၊ ဝယ်ယူသူ ရှာဖွေပါ'],
  ['Type at least 2 characters — search covers tickets, parts & customers.', 'စာလုံး ၂ လုံးထက် ရိုက်ပါ — လက်မှတ်၊ အပိုပစ္စည်းနှင့် ဝယ်ယူသူ အားလုံးတွင် ရှာဖွေပါမည်။'],
  ['No matches for', 'ကိုက်ညီမှုမရှိပါ —'],
  ['Live Database Status', 'Database အခြေအနေ'],
  ['Internet connection', 'အင်တာနက် ချိတ်ဆက်မှု'],
  ['Supabase database', 'Supabase database'],
  ['Pending writes', 'စောင့်ဆိုင်းနေသော သိမ်းဆည်းမှုများ'],
  ['Last synced', 'နောက်ဆုံး ထပ်တူပြုခဲ့သည်'],
  ['Refresh Data Now', 'ယခု ပြန်လည်ရယူမည်'],
  ['Refreshing…', 'ပြန်လည်ရယူနေသည်…'],
  ['Connecting…', 'ချိတ်ဆက်နေသည်…'],
  ['Live database unavailable', 'Database ချိတ်ဆက်၍မရပါ'],
  ['Live Supabase data', 'Supabase data အွန်လိုင်း'],
  ['click for details', 'အသေးစိတ်ကြည့်ရန် နှိပ်ပါ'],
  ['System online', 'စနစ် အွန်လိုင်း'],
  ['Expand sidebar', 'Sidebar ချဲ့မည်'],
  ['Collapse sidebar', 'Sidebar ခေါက်မည်'],
  ['Toggle Navigation Menu', 'မီနူး ဖွင့်/ပိတ်မည်'],
  ['Close menu', 'မီနူး ပိတ်မည်'],
  ['Logout', 'ထွက်မည်'],
  ['Active User', 'အသုံးပြုနေသူ'],
  ['Click to switch', 'ပြောင်းရန် နှိပ်ပါ'],
  ['Online', 'အွန်လိုင်း'],
  ['Offline', 'အော့ဖ်လိုင်း'],
  ['Connected', 'ချိတ်ဆက်ပြီး'],
  ['Unavailable', 'မရရှိနိုင်ပါ'],
  ['Retry', 'ထပ်စမ်းမည်'],
  ['Loading', 'လုပ်ဆောင်နေသည်'],
  ['Loading…', 'လုပ်ဆောင်နေသည်…'],

  // Common actions
  ['Save All Settings', 'ဆက်တင်အားလုံး သိမ်းမည်'],
  ['Dashboard', 'ဒက်ရှ်ဘုတ်'],
  ['Low', 'နည်း'],
  ['In-Shop Repairs', 'ဆိုင်တွင်း ပြုပြင်မှု'],
  ['In-shop repairs', 'ဆိုင်တွင်း ပြုပြင်မှု'],
  ['Work Orders', 'မှာယူမှုများ'],
  ['Are you sure?', 'သေချာပါသလား?'],
  ['Confirm deletion', 'ဖျက်ရန် အတည်ပြုပါ'],
  ['This action cannot be undone', 'ဤလုပ်ဆောင်ချက်ကို ပြန်၍မရနိုင်ပါ'],
  ['Reset Draft', 'အကြမ်းဖျဉ်း ပြန်သတ်မှတ်မည်'],
  ['Save', 'သိမ်းမည်'],
  ['Cancel', 'ပယ်ဖျက်မည်'],
  ['Delete', 'ဖျက်မည်'],
  ['Edit', 'ပြင်မည်'],
  ['Close', 'ပိတ်မည်'],
  ['Search', 'ရှာဖွေမည်'],
  ['Filter', 'စစ်ထုတ်မည်'],
  ['Reset Filters', 'စစ်ထုတ်မှု ပြန်သတ်မှတ်မည်'],
  ['Reset', 'ပြန်သတ်မှတ်မည်'],
  ['Export', 'ထုတ်ယူမည်'],
  ['Print', 'ပုံနှိပ်မည်'],
  ['Add', 'ထည့်မည်'],
  ['Remove', 'ဖယ်ရှားမည်'],
  ['Update', 'မွမ်းမံမည်'],
  ['Confirm', 'အတည်ပြုမည်'],
  ['Back', 'နောက်သို့'],
  ['Back to Tickets', 'လက်မှတ်များသို့ ပြန်သွားမည်'],
  ['Back to Ticket', 'လက်မှတ်သို့ ပြန်သွားမည်'],
  ['Next', 'ရှေ့သို့'],
  ['Done', 'ပြီးပြီ'],
  ['Submit', 'တင်သွင်းမည်'],
  ['Apply', 'အသုံးပြုမည်'],
  ['View', 'ကြည့်မည်'],
  ['Open', 'ဖွင့်မည်'],
  ['Create', 'ဖန်တီးမည်'],
  ['New', 'အသစ်'],
  ['All', 'အားလုံး'],
  ['None', 'မရှိ'],
  ['Yes', 'ဟုတ်သည်'],
  ['No', 'မဟုတ်ပါ'],
  ['OK', 'OK'],
  ['Copy', 'မိတ္တူကူးမည်'],
  ['Download', 'ဒေါင်းလုဒ်'],
  ['Upload', 'တင်မည်'],
  ['Share', 'မျှဝေမည်'],
  ['Clear', 'ရှင်းမည်'],
  ['Change', 'ပြောင်းမည်'],
  ['Select', 'ရွေးမည်'],
  ['Choose', 'ရွေးချယ်မည်'],
  ['Scan', 'စကင်ဖတ်မည်'],
  ['Refresh', 'ပြန်လည်ရယူမည်'],
  ['Show', 'ပြမည်'],
  ['Hide', 'ဝှက်မည်'],
  ['More', 'နောက်ထပ်'],
  ['Less', 'လျှော့'],
  ['Details', 'အသေးစိတ်'],
  ['Settings', 'ဆက်တင်များ'],
  ['Actions', 'လုပ်ဆောင်ချက်များ'],
  ['Cancel Edit', 'ပြင်ဆင်မှု ပယ်ဖျက်မည်'],
  ['Save Changes', 'ပြောင်းလဲမှုများ သိမ်းမည်'],
  ['Discard', 'ပယ်ဖျက်မည်'],

  // Common labels
  ['Customer Information', 'ဝယ်ယူသူ အချက်အလက်'],
  ['Phone Number *', 'ဖုန်းနံပါတ် *'],
  ['Phone Number', 'ဖုန်းနံပါတ်'],
  ['Customer Name *', 'ဝယ်ယူသူ အမည် *'],
  ['Customer Name', 'ဝယ်ယူသူ အမည်'],
  ['Name', 'အမည်'],
  ['Phone', 'ဖုန်း'],
  ['Email', 'အီးမေးလ်'],
  ['Address', 'လိပ်စာ'],
  ['Town / City', 'မြို့'],
  ['Town', 'မြို့'],
  ['City', 'မြို့'],
  ['Date', 'ရက်စွဲ'],
  ['Time', 'အချိန်'],
  ['Amount', 'ပမာဏ'],
  ['Total', 'စုစုပေါင်း'],
  ['Subtotal', 'ပစ္စည်းစုစုပေါင်း'],
  ['Discount', 'လျှော့စျေး'],
  ['Discount Applied', 'လျှော့စျေး သက်ရောက်သည်'],
  ['Select Discount', 'လျှော့စျေး ရွေးချယ်ရန်'],
  ['Tap to add discount', 'လျှော့စျေး ထည့်ရန် နှိပ်ပါ'],
  ['Selected Cart', 'ရွေးထားသော စျေးခြင်းတောင်း'],
  ['Review Cart', 'စျေးခြင်းတောင်း ပြန်သုံးသပ်ရန်'],
  ['Selected Services', 'ရွေးထားသော ဝန်ဆောင်မှုများ'],
  ['Total Estimated', 'စုစုပေါင်း ခန့်မှန်းချေ'],
  ['Standard Price', 'စံဈေး'],
  ['Discounted Price', 'လျှော့စျေးဈေး'],
  ['Create Intake Ticket', 'Intake Ticket ဖန်တီးမည်'],
  ['Copy Customer Quote', 'ဖောက်သည်ဈေးနှုန်း ကူးယူမည်'],
  ['Quote Copied!', 'ဈေးနှုန်း ကူးပြီးပါပြီ'],
  ['View Cart', 'စျေးခြင်းတောင်း ကြည့်မည်'],
  ['Your cart is empty', 'စျေးခြင်းတောင်း ဗလာဖြစ်နေသည်'],
  ['Clear All', 'အားလုံးရှင်းမည်'],
  ['Price', 'ဈေးနှုန်း'],
  ['Selling Price', 'ရောင်းဈေး'],
  ['Cost Price', 'ကုန်ကျဈေး'],
  ['Cost', 'ကုန်ကျ'],
  ['Stock', 'လက်ကျန်'],
  ['Quantity', 'အရေအတွက်'],
  ['Category', 'အမျိုးအစား'],
  ['Status', 'အခြေအနေ'],
  ['Priority', 'ဦးစားပေး'],
  ['Notes', 'မှတ်ချက်များ'],
  ['Note', 'မှတ်ချက်'],
  ['Remarks', 'မှတ်ချက်'],
  ['Description', 'ဖော်ပြချက်'],
  ['Type', 'အမျိုးအစား'],
  ['Customer', 'ဝယ်ယူသူ'],
  ['Technician', 'နည်းပညာရှင်'],
  ['Staff', 'ဝန်ထမ်း'],
  ['User', 'အသုံးပြုသူ'],
  ['Password', 'စကားဝှက်'],
  ['Language', 'ဘာသာစကား'],
  ['Currency', 'ငွေကြေး'],
  ['digit(s)', 'လုံး'],
  ['digits', 'လုံး'],
  ['item(s)', 'ခု'],
  ['items', 'ခု'],
  ['pending', 'စောင့်ဆိုင်း'],
                
  // Statuses & filters
  ['All Statuses', 'အခြေအနေအားလုံး'],
  ['All Priorities', 'ဦးစားပေးအားလုံး'],
  ['All Technicians', 'နည်းပညာရှင်အားလုံး'],
  ['All Categories', 'အမျိုးအစားအားလုံး'],
  ['All Dates', 'ရက်စွဲအားလုံး'],
  ['All Tiers', 'အဆင့်အားလုံး'],
  ['All Folders', 'ဖိုလ်ဒါအားလုံး'],
  ['All Models', 'မော်ဒယ်အားလုံး'],
                              ['Today', 'ယနေ့'],
  ['Yesterday', 'မနေ့က'],
  ['This Week', 'ယခုအပတ်'],
  ['This Month', 'ယခုလ'],
  ['Last Month', 'ပြီးခဲ့သည့်လ'],
  ['All Time', 'အချိန်အားလုံး'],
  ['Filter by date', 'ရက်စွဲအလိုက် စစ်ထုတ်မည်'],
  ['Calendar Picker', 'ပြက္ခဒိန် ရွေးချယ်မှု'],
  ['Calendar', 'ပြက္ခဒိန်'],
  ['Reset active search & filters', 'ရှာဖွေမှုနှင့် စစ်ထုတ်မှုများ ပြန်သတ်မှတ်မည်'],

  // Dashboard
  ['Status Queue', 'အခြေအနေ အစီအစဉ်'],
  ['Hardware Analytics', 'စက်ပစ္စည်း စာရင်းအင်း'],
  ['Technicians', 'နည်းပညာရှင်များ'],
  ['Inventory', 'ပစ္စည်းစာရင်း'],
  ['Finance', 'ဘဏ္ဍာရေး'],
  ['Warranty Watch', 'အာမခံ စောင့်ကြည့်မှု'],
  ['Warranty Watch Clear', 'အာမခံ စောင့်ကြည့်မှု ရှင်းလင်း'],
  ['Active In-Shop Repairs', 'ဆိုင်တွင်း ပြုပြင်ဆဲ ပစ္စည်းများ'],
  ['Total Tickets', 'လက်မှတ် စုစုပေါင်း'],
  ['Total Revenue', 'စုစုပေါင်း ဝင်ငွေ'],
  ['Gross Profit', 'အကြမ်းအမြတ်'],
  ['Net Profit', 'အသားတင်အမြတ်'],
  ['Total Expenses', 'စုစုပေါင်း ကုန်ကျစရိတ်'],
  ['Expenses', 'ကုန်ကျစရိတ်များ'],
  ['Outstanding', 'ကျန်ရှိငွေ'],
  ['Profit Margin', 'အမြတ်နှုန်း'],
  ['Margin', 'အမြတ်နှုန်း'],
  ['Income', 'ဝင်ငွေ'],
  ['Expense', 'ကုန်ကျစရိတ်'],
  ['Open Interactive Pipeline', 'Interactive Pipeline ဖွင့်မည်'],
  ['Filter Queue Below', 'အောက်တွင် စစ်ထုတ်မည်'],
  ['View active repairs queue', 'ပြုပြင်ဆဲ စာရင်း ကြည့်မည်'],
  ['View ready for pickup', 'ပြန်ထုတ်ရန် အသင့် ကြည့်မည်'],
  ['View finance overview', 'ဘဏ္ဍာရေး ခြုံငုံ ကြည့်မည်'],
  ['View technician KPI', 'နည်းပညာရှင် KPI ကြည့်မည်'],
  ['Ticket # & Date', 'လက်မှတ် နံပါတ်နှင့် ရက်စွဲ'],
  ['Customer & Contact', 'ဝယ်ယူသူနှင့် ဆက်သွယ်ရန်'],
  ['Device & Serial/IMEI', 'စက်ပစ္စည်းနှင့် Serial/IMEI'],
  ['Symptoms / Service', 'လက္ခဏာ / ဝန်ဆောင်မှု'],
  ['Assigned Tech', 'တာဝန်ပေးထားသည့် နည်းပညာရှင်'],
  ['Stage & Status', 'အဆင့်နှင့် အခြေအနေ'],
  ['Stage', 'အဆင့်'],
  ['Ticket #', 'လက်မှတ် နံပါတ်'],
  ['Warranty Dates', 'အာမခံ ရက်များ'],
  ['90-Day Elapsed', 'ရက် ၉၀ ကျော်လွန်'],
  ['Warranty Health Status', 'အာမခံ ကျန်းမာရေး အခြေအနေ'],
  ['Status Queue 2 Active', 'အခြေအနေ အစီအစဉ်'],
  ['Hardware Analytics 7 Tickets', 'စက်ပစ္စည်း စာရင်းအင်း'],
  ['Technicians 3 Staff', 'နည်းပညာရှင်များ'],
  ['Inventory 449 Low', 'ပစ္စည်းစာရင်း'],
  ['Finance 16% Margin', 'ဘဏ္ဍာရေး'],
  ['Warranty Watch Clear', 'အာမခံ စောင့်ကြည့်မှု'],

  // Intake / create ticket
  ['New Intake Ticket Registration', 'ပြုပြင်ရေး လက်မှတ်အသစ် စာရင်းသွင်းခြင်း'],
  ['Edit Intake Ticket', 'လက်ခံလက်မှတ် ပြင်ဆင်ခြင်း'],
  ['Enter customer details, choose the device, add repairs, then complete the intake check.', 'ဝယ်ယူသူ အချက်အလက် ဖြည့်ပါ၊ စက်ပစ္စည်း ရွေးပါ၊ ပြုပြင်မှုများ ထည့်ပါ၊ ထို့နောက် လက်ခံစစ်ဆေးမှု ပြီးမြောက်ပါ။'],
  ['Customer Type', 'ဝယ်ယူသူ အမျိုးအစား'],
        ['Choose Device Model', 'စက်ပစ္စည်း ရွေးမည်'],
  ['Select Device Model', 'စက်ပစ္စည်း ရွေးပါ'],
  ['Choose Device Model First', 'စက်ပစ္စည်း အရင်ရွေးပါ'],
  ['Select Model', 'ရွေးမည်'],
  ['Click to select Apple iPhone, iPad, MacBook, Watch, or Mac', 'Apple iPhone, iPad, MacBook, Watch, Mac တို့မှ ရွေးချယ်ရန် နှိပ်ပါ'],
  ['Realistic Color', 'အရောင်အစစ်'],
  ['Selected Color', 'ရွေးထားသော အရောင်'],
  ['Select a device model first to see real color options', 'အရောင်အစစ်များ ကြည့်ရန် စက်ပစ္စည်း အရင်ရွေးပါ'],
  ['Warranty Policy', 'အာမခံ မူဝါဒ'],
  ['Covered Warranty', 'အာမခံသက်တမ်း'],
      ['Available Repairs Selection (MMK Pricing)', 'ရရှိနိုင်သော ပြုပြင်မှုများ ရွေးချယ်ခြင်း (MMK ဈေးနှုန်း)'],
  ['Add Repairs', 'ပြုပြင်မှု ထည့်မည်'],
  ['Intake Notes', 'လက်ခံမှတ်ချက်'],
  ['Customer symptoms or intake notes', 'ဝယ်ယူသူ၏ ပြဿနာ သို့မဟုတ် မှတ်ချက်'],
  ['Diagnostics', 'စစ်ဆေးချက်များ'],
  ['Mark All Pass', 'အားလုံး Pass မှတ်မည်'],
  ['Mark All N/A', 'အားလုံး N/A မှတ်မည်'],
  ['Add comment', 'မှတ်ချက် ထည့်မည်'],
  ['Take / Add Photo', 'ဓာတ်ပုံ ရိုက်/ထည့်မည်'],
  ['Up to 4MB per photo · hover a thumbnail to delete · on mobile the camera opens directly.', 'ဓာတ်ပုံတစ်ပုံ လျှင် 4MB အထိ · ပုံသေးပေါ်တွင် ရွေ့ပြီး ဖျက်နိုင်သည် · ဖုန်းတွင် ကင်မရာ တိုက်ရိုက်ဖွင့်သည်။'],
  ['Register Device & Generate Voucher', 'စက်ပစ္စည်း စာရင်းသွင်းပြီး Voucher ထုတ်မည်'],
  ['Save Ticket Changes', 'လက်မှတ် ပြောင်းလဲမှုများ သိမ်းမည်'],
  ['Registering…', 'စာရင်းသွင်းနေသည်…'],
  ['Existing Customer Profile Matched', 'ရှိပြီးသား ဝယ်ယူသူနှင့် ကိုက်ညီတွေ့ရှိ'],
  ['Editing Existing Ticket', 'ရှိပြီးသား လက်မှတ်ကို ပြင်ဆင်နေသည်'],
  ['Start with Step 1 — customer name & phone', 'အဆင့် ၁ မှ စတင်ပါ — ဝယ်ယူသူ အမည်နှင့် ဖုန်း'],
  ['Next: choose a device model to unlock repairs', 'နောက်တစ်ဆင့်: ပြုပြင်မှုများ ရရှိရန် စက်ပစ္စည်း ရွေးပါ'],
  ['Next: tap "+ Add Repairs" to build the estimate', 'နောက်တစ်ဆင့်: ခန့်မှန်းချေ တွက်ရန် "+ Add Repairs" နှိပ်ပါ'],
  ['Repairs', 'ပြုပြင်မှု'],
  ['Estimate', 'ခန့်မှန်းချေ'],
  ['Saved', 'သက်သာငွေ'],
  ['Off', 'ပိတ်'],
  ['ON', 'ဖွင့်'],
  ['UNKNOWN', 'မသိ'],
  ['Unknown', 'မသိ'],
  ['Ask the customer to turn off Find My before accepting the device.', 'စက်လက်ခံရန် ဝယ်ယူသူကို Find My ပိတ်ရန် တောင်းဆိုပါ။'],
  ['Find My Status', 'Find My အခြေအနေ'],
  ['Serial Number', 'Serial Number'],
  ['IMEI Number (15 Digits)', 'IMEI နံပါတ် (၁၅ လုံး)'],
  ['Device Passcode', 'Device Passcode'],
  ['Scan QR / Barcode', 'QR / Barcode ဖတ်မည်'],
  ['Serial Number & IMEI Information', 'Serial Number နှင့် IMEI အချက်အလက်'],
  ['Upload device photos', 'စက်ပစ္စည်း ဓာတ်ပုံများ တင်မည်'],
  ['Before-Repair Condition Photos', 'ပြုပြင်မှုမတိုင်မီ အခြေအနေ ဓာတ်ပုံများ'],

  // Intake list
  ['Work Intake & Active Tickets', 'လက်ခံလက်မှတ်နှင့် ပြုပြင်ဆဲ လက်မှတ်များ'],
  ['+ Intake Ticket', 'လက်မှတ် အသစ်'],
  ['New Intake Ticket', 'လက်ခံလက်မှတ် အသစ်'],
  ['Search Ticket #, Customer, Phone...', 'လက်မှတ် နံပါတ်၊ ဝယ်ယူသူ၊ ဖုန်း ရှာဖွေပါ...'],
  ['View active repairs queue', 'ပြုပြင်ဆဲ စာရင်း ကြည့်မည်'],
  ['Recycle Bin & Archived Tickets', 'အမှိုက်ပုံးနှင့် မှတ်တမ်းသိမ်း လက်မှတ်များ'],

  // Pipeline
  ['My Jobs', 'ကျွန်ုပ်၏ လုပ်ငန်းများ'],
  ['QA Inspection', 'QA စစ်ဆေးမှု'],
  ['More', 'နောက်ထပ်'],
  ['Drag cards between columns to update status', 'အခြေအနေ ပြောင်းရန် ကတ်များကို ကော်လံများကြား ဆွဲယူပါ'],

  // QA
  ['QA & Warranty Inspection', 'စစ်ဆေးရေးနှင့် အာမခံ စစ်ဆေးမှု'],
  ['Device List', 'စက်ပစ္စည်း စာရင်း'],
  ['Checklist', 'စစ်ဆေးစာရင်း'],
        ['Comment', 'မှတ်ချက်'],
  ['Comments', 'မှတ်ချက်များ'],
    
  // Follow-ups
  ['Customer Follow-Ups', 'ဝယ်ယူသူ ဆက်သွယ်စုံစမ်းရေး'],
  ['Follow Ups', 'ဆက်သွယ်စုံစမ်းရေး'],
  ['Follow-Up', 'ဆက်သွယ်စုံစမ်းမှု'],
  ['Follow Up', 'ဆက်သွယ်စုံစမ်းမည်'],
  ['Call', 'ဖုန်းခေါ်မည်'],
  ['Overdue', 'နောက်ကျနေ'],
  ['Due Today', 'ယနေ့ သတ်မှတ်'],
  ['Snooze', 'ရွှေ့ဆိုင်းမည်'],
  ['Reschedule', 'ပြန်ချိန်းမည်'],
  ['Last Contact', 'နောက်ဆုံး ဆက်သွယ်မှု'],
  ['Next Follow-Up', 'နောက်ထပ် ဆက်သွယ်မည့်ရက်'],

  // Price list
  ['Price List', 'ဈေးနှုန်းစာရင်း'],
  ['Filter services...', 'ဝန်ဆောင်မှုများ စစ်ထုတ်ရန်...'],
  ['Add Service', 'ဝန်ဆောင်မှု ထည့်မည်'],
  ['Edit Service', 'ဝန်ဆောင်မှု ပြင်မည်'],
  ['Base Price', 'အခြေခံဈေး'],
  ['Final Price', 'နောက်ဆုံးဈေး'],
  ['Model', 'မော်ဒယ်'],
  ['Folder', 'ဖိုလ်ဒါ'],
  ['Export Catalog to CSV', 'Catalog ကို CSV ထုတ်ယူမည်'],
  ['Folder & Catalog Settings', 'ဖိုလ်ဒါနှင့် Catalog ဆက်တင်များ'],
  ['Calc', 'တွက်မည်'],
  ['Quick Price Calculator', 'အမြန် ဈေးတွက်စက်'],
  ['Price Catalog', 'ဈေးနှုန်း Catalog'],

  // POS
  ['POS & Invoicing Portal', 'အရောင်းနှင့် ဘေလ်ဖြတ်ပိုင်း ပေါ်တယ်'],
  ['Checkout', 'ငွေရှင်းမည်'],
  ['Pay Now', 'ယခု ပေးချေမည်'],
          ['Total Due', 'ပေးရမည့် စုစုပေါင်း'],
  ['Change', 'ငွေပြန်'],
  ['Amount Received', 'ရရှိသည့်ငွေ'],
  ['Invoice', 'ပြေစာ'],
  ['Generate Invoice', 'ပြေစာ ထုတ်မည်'],
  ['Print Invoice', 'ပြေစာ ပုံနှိပ်မည်'],
  ['Add Item', 'ပစ္စည်း ထည့်မည်'],
  ['Item', 'ပစ္စည်း'],
  ['Unit Price', 'တစ်ခုဈေး'],
  ['Payment Method', 'ငွေပေးချေမှု နည်းလမ်း'],
  ['Search Ticket #, Customer, Model, IMEI...', 'လက်မှတ် နံပါတ်၊ ဝယ်ယူသူ၊ မော်ဒယ်၊ IMEI ရှာဖွေပါ...'],
  ['All Checkout Status', 'ငွေရှင်းမှု အခြေအနေ အားလုံး'],
    ['Pending Payment', 'ငွေပေးချေရန် စောင့်ဆိုင်း'],
  ['Paid', 'ပေးပြီး'],

  // Finance
  ['Shop Finance & P&L Engine', 'ဆိုင်ဘဏ္ဍာရေးနှင့် အမြတ်/ဆုံးရှုံး စာရင်း'],
  ['P&L Statement', 'အမြတ်/ဆုံးရှုံး စာရင်း'],
  ['Add Expense', 'အသုံးစရိတ် ထည့်မည်'],
  ['Add Income', 'ဝင်ငွေ ထည့်မည်'],
  ['Previous Period', 'ယခင်ကာလ'],
  ['Profit / Loss', 'အမြတ် / ဆုံးရှုံး'],
  ['Gross Profit Margin', 'အကြမ်း အမြတ်နှုန်း'],
  ['Net Profit Margin', 'အသားတင် အမြတ်နှုန်း'],
  ['Outstanding Debts', 'ကျန်ရှိ ကြွေးများ'],
  ['Debts', 'ကြွေးများ'],
  ['Supplier Debts', 'ပေးသွင်းသူ ကြွေးများ'],
  ['Technician Payouts', 'နည်းပညာရှင် ပေးချေမှုများ'],
  ['Payout', 'ပေးချေမှု'],
  ['Revenue', 'ဝင်ငွေ'],
  ['Balance', 'လက်ကျန်'],
  ['Due', 'ပေးရန်'],
    ['Remaining', 'ကျန်ငွေ'],

  // Inventory
  ['Parts Inventory & Stock Matrix', 'အပိုပစ္စည်းနှင့် စတော့ Matrix'],
  ['Add Part', 'အပိုပစ္စည်း ထည့်မည်'],
  ['Edit Part', 'အပိုပစ္စည်း ပြင်မည်'],
  ['Delete Part', 'အပိုပစ္စည်း ဖျက်မည်'],
  ['Part Name & SKU', 'အပိုပစ္စည်း အမည်နှင့် SKU'],
  ['Part Name', 'အပိုပစ္စည်း အမည်'],
  ['Part #', 'အပိုပစ္စည်း နံပါတ်'],
  ['Part', 'အပိုပစ္စည်း'],
  ['Parts', 'အပိုပစ္စည်းများ'],
  ['Quality', 'အရည်အသွေး'],
  ['Bin', 'Bin'],
  ['In Stock', 'လက်ကျန်'],
  ['Reorder Point', 'ပြန်မှာရန် သတ်မှတ်ချက်'],
  ['Selling', 'ရောင်းဈေး'],
  ['Profit / Unit', 'တစ်ခု အမြတ်'],
  ['Profit Analysis', 'အမြတ် စစ်ဆေးမှု'],
  ['Cost, selling price, and expected margin per unit', 'ကုန်ကျဈေး၊ ရောင်းဈေးနှင့် တစ်ခုစီ၏ မျှော်မှန်း အမြတ်နှုန်း'],
  ['Low Stock', 'လက်ကျန် နည်း'],
  ['Out of Stock', 'ပြတ်လပ်'],
  ['No inventory components found matching your filter', 'စစ်ထုတ်မှုနှင့် ကိုက်ညီသော ပစ္စည်း မတွေ့ပါ'],
  ['No saved inventory data yet', 'သိမ်းထားသော ပစ္စည်းစာရင်း မရှိသေးပါ'],
  ['No saved bins yet — type a new bin above.', 'Bin များ မသိမ်းရသေးပါ — အပေါ်တွင် Bin အသစ် ရိုက်ထည့်ပါ။'],
  ['Stock Quantity', 'လက်ကျန် အရေအတွက်'],
  ['Filter Part #, Category, SKU...', 'အပိုပစ္စည်း နံပါတ်၊ အမျိုးအစား၊ SKU ရှာဖွေပါ...'],
  ['Filter inventory by category', 'အမျိုးအစားအလိုက် စစ်ထုတ်မည်'],
  ['Filter inventory by quality tier', 'အရည်အသွေးအလိုက် စစ်ထုတ်မည်'],
  ['Quality Tier', 'အရည်အသွေး အဆင့်'],
  ['Device Model', 'စက်ပစ္စည်း မော်ဒယ်'],
  ['Matrix', 'Matrix'],
  ['View part details', 'အပိုပစ္စည်း အသေးစိတ် ကြည့်မည်'],

  // Suppliers
  ['Suppliers & Vendor RMAs', 'ပစ္စည်းပေးသွင်းသူနှင့် RMA များ'],
  ['Add Supplier', 'ပေးသွင်းသူ ထည့်မည်'],
  ['Add RMA', 'RMA ထည့်မည်'],
  ['Vendor', 'ပေးသွင်းသူ'],
  ['Supplier', 'ပေးသွင်းသူ'],
  ['Defective Part & Tier', 'ချွတ်ယွင်းသော အပိုပစ္စည်းနှင့် အဆင့်'],
  ['Defect Reason', 'ချွတ်ယွင်းရသည့် အကြောင်းရင်း'],
  ['Return Tracking', 'ပြန်အပ် ခြေရာခံ'],
  ['No tracking yet', 'ခြေရာခံ မရှိသေးပါ'],
  ['RMA # & Date', 'RMA နံပါတ်နှင့် ရက်စွဲ'],
  ['Search Vendor, Part, RMA #...', 'ပေးသွင်းသူ၊ အပိုပစ္စည်း၊ RMA နံပါတ် ရှာဖွေပါ...'],
  ['New RMA', 'RMA အသစ်'],
  ['Defective Part', 'ချွတ်ယွင်းသော အပိုပစ္စည်း'],

  // CRM
  ['Customer & Staff Portal', 'ဝယ်ယူသူနှင့် ဝန်ထမ်း ပေါ်တယ်'],
  ['Customer Roster', 'ဝယ်ယူသူ စာရင်း'],
  ['Search Name, Phone, Email...', 'အမည်၊ ဖုန်း၊ အီးမေးလ် ရှာဖွေပါ...'],
  ['Add Customer', 'ဝယ်ယူသူ ထည့်မည်'],
  ['Total Orders', 'မှာယူမှု စုစုပေါင်း'],
  ['Total Spent', 'သုံးစွဲမှု စုစုပေါင်း'],
  ['Customer Profile', 'ဝယ်ယူသူ ကိုယ်ရေးအချက်အလက်'],
  ['Account Type', 'အကောင့် အမျိုးအစား'],
        ['Filter by account type', 'အကောင့် အမျိုးအစားအလိုက် စစ်ထုတ်မည်'],
  ['All Account Types', 'အကောင့် အမျိုးအစား အားလုံး'],

  // Settings
  ['System Management', 'စနစ် စီမံခန့်ခွဲမှု'],
  ['System Language & Localization', 'စနစ် ဘာသာစကားနှင့် ဒေသသတ်မှတ်ချက်'],
  ['User Management', 'အသုံးပြုသူ စီမံခန့်ခွဲမှု'],
  ['Users', 'အသုံးပြုသူများ'],
  ['General Settings', 'အထွေထွေ သတ်မှတ်ချက်များ'],
  ['AI Settings', 'AI သတ်မှတ်ချက်များ'],
  ['Backup', 'အရန်သိမ်းဆည်းမှု'],
  ['Role', 'အခန်းကဏ္ဍ'],
  ['Permissions', 'ခွင့်ပြုချက်များ'],
  ['Reset settings draft', 'ဆက်တင် အကြမ်းဖျဉ်း ပြန်သတ်မှတ်မည်'],
  ['Save all settings', 'ဆက်တင်အားလုံး သိမ်းမည်'],
  ['System Language', 'စနစ် ဘာသာစကား'],
  ['English', 'အင်္ဂလိပ်'],
  ['Burmese (Myanmar)', 'မြန်မာ'],

  // AI
  ['AI Assistant', 'AI အကူ'],
  ['Open AI Assistant', 'AI အကူ ဖွင့်မည်'],
  ['Open AI Diagnostic Assistant', 'AI စစ်ဆေးရေး အကူ ဖွင့်မည်'],
  ['Ask AI about your shop data…', 'ဆိုင်ဒေတာအကြောင်း AI ကို မေးပါ…'],

  // Toasts / misc
  ['Save Error — Check Connection', 'သိမ်းရာတွင် အမှား — ချိတ်ဆက်မှု စစ်ဆေးပါ'],
  ['Database save failed', 'Database သိမ်းရန် မအောင်မြင်ပါ'],
  ['Internet connection required', 'အင်တာနက် ချိတ်ဆက်မှု လိုအပ်သည်'],
  ['This ERP uses live Supabase data only. Reconnect to open the system.', 'ဤ ERP သည် live Supabase data ကိုသာ သုံးသည်။ စနစ်ဖွင့်ရန် ပြန်ချိတ်ဆက်ပါ။'],
  ['Customer Deleted', 'ဝယ်ယူသူ ဖျက်ပြီး'],
  ['created successfully', 'အောင်မြင်စွာ ဖန်တီးပြီး'],
  ['saved successfully', 'အောင်မြင်စွာ သိမ်းဆည်းပြီး'],
  ['deleted successfully', 'အောင်မြင်စွာ ဖျက်ပြီး'],
  ['Success', 'အောင်မြင်သည်'],
  ['Error', 'မှားယွင်းမှု'],
  ['Warning', 'သတိပေးချက်'],
  ['Info', 'အချက်အလက်'],
];

// Longest phrases first so "Customer Name *" wins over "Customer Name".
const SORTED: [string, string][] = [...DICT].sort((a, b) => b[0].length - a[0].length);

const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'CODE', 'PRE', 'TEXTAREA', 'INPUT', 'SELECT', 'OPTION', 'NOSCRIPT']);
const TRANS_ATTRS = ['placeholder', 'title', 'aria-label'];

let observer: MutationObserver | null = null;
const textOriginals = new WeakMap<Text, string>();
const trackedElements = new Set<Element>();
const attrOriginals = new WeakMap<Element, Map<string, string>>();

export function translateText(text: string): string {
  let out = text;
  for (const [en, mm] of SORTED) {
    if (out.includes(en)) out = out.split(en).join(mm);
  }
  return out;
}

function handleTextNode(node: Text): void {
  const parent = node.parentElement;
  if (!parent || SKIP_TAGS.has(parent.tagName)) return;
  const current = node.nodeValue ?? '';
  if (current.trim().length < 2) return;

  const base = textOriginals.get(node);
  if (base === undefined) {
    textOriginals.set(node, current);
    const translated = translateText(current);
    if (translated !== current) node.nodeValue = translated;
    return;
  }
  const translatedBase = translateText(base);
  if (current === translatedBase) return; // already our output
  if (current === base) {
    node.nodeValue = translatedBase;
    return;
  }
  // React wrote new content — adopt it as the new base.
  textOriginals.set(node, current);
  const translated = translateText(current);
  if (translated !== current) node.nodeValue = translated;
}

function handleAttrs(el: Element): void {
  if (SKIP_TAGS.has(el.tagName)) return;
  let map = attrOriginals.get(el);
  if (!map) {
    map = new Map();
    attrOriginals.set(el, map);
    trackedElements.add(el);
  }
  for (const attr of TRANS_ATTRS) {
    if (!el.hasAttribute(attr)) continue;
    const value = el.getAttribute(attr) ?? '';
    if (value.trim().length < 2) continue;
    const original = map.get(attr);
    if (original === undefined) {
      map.set(attr, value);
      const translated = translateText(value);
      if (translated !== value) el.setAttribute(attr, translated);
    } else if (el.getAttribute(attr) === original) {
      const translated = translateText(original);
      if (translated !== original) el.setAttribute(attr, translated);
    } else {
      // changed by React — re-base
      map.set(attr, value);
      const translated = translateText(value);
      if (translated !== value) el.setAttribute(attr, translated);
    }
  }
}

function applyTo(root: Node): void {
  if (root.nodeType === Node.TEXT_NODE) {
    handleTextNode(root as Text);
    return;
  }
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) handleTextNode(walker.currentNode as Text);
  if (root.nodeType === Node.ELEMENT_NODE) {
    (root as Element).querySelectorAll<Element>('*').forEach(handleAttrs);
  }
}

export function startDomTranslation(): void {
  if (observer) return;
  applyTo(document.body);
  observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.type === 'characterData' && m.target.nodeType === Node.TEXT_NODE) {
        handleTextNode(m.target as Text);
      } else if (m.type === 'childList') {
        m.addedNodes.forEach((n) => {
          if (n.nodeType === Node.TEXT_NODE) handleTextNode(n as Text);
          else if (n.nodeType === Node.ELEMENT_NODE) applyTo(n);
        });
      } else if (m.type === 'attributes' && m.target.nodeType === Node.ELEMENT_NODE) {
        handleAttrs(m.target as Element);
      }
    }
  });
  observer.observe(document.body, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: TRANS_ATTRS,
  });
}

export function stopDomTranslation(): void {
  observer?.disconnect();
  observer = null;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    const original = textOriginals.get(node);
    if (original !== undefined) node.nodeValue = original;
  }
  trackedElements.forEach((el) => {
    const map = attrOriginals.get(el);
    map?.forEach((value, attr) => el.setAttribute(attr, value));
  });
  trackedElements.clear();
}
