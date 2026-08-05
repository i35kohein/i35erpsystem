export type Language = 'en' | 'mm';

export type TranslationDictionary = Record<string, { en: string; mm: string }>;

export const translations: TranslationDictionary = {
  // Application Title & Brand
  appTitle: { en: 'RepairDesk Pro ERP', mm: 'RepairDesk Pro ပြုပြင်ရေး ERP' },
  appSubtitle: { en: 'Repair Shop Operating System', mm: 'စက်ပစ္စည်းပြုပြင်ရေးဆိုင် စီမံခန့်ခွဲမှုစနစ်' },

  // Navigation Groups
  navRepair: { en: 'REPAIR', mm: 'ပြုပြင်ရေး' },
  navInventory: { en: 'INVENTORY', mm: 'ပစ္စည်းစာရင်း' },
  navFinance: { en: 'FINANCE', mm: 'ဘဏ္ဍာရေး' },
  navManagement: { en: 'MANAGEMENT', mm: 'စီမံခန့်ခွဲမှု' },
  navSpecialized: { en: 'SPECIALIZED', mm: 'အထူးပြုစနစ်' },

  // Navigation Tabs & Header Titles
  navDashboard: { en: 'Dashboard', mm: 'ဒက်ရှ်ဘုတ်' },
  navDashboardFull: { en: 'Dashboard & Hardware Analytics', mm: 'ဒက်ရှ်ဘုတ်နှင့် စက်ပစ္စည်း စာရင်းအင်းများ' },
  navIntake: { en: 'Work Intake & Tickets', mm: 'လက်ခံလက်မှတ်နှင့် ပြုပြင်ရေး' },
  navIntakeFull: { en: 'Work Intake & Active Tickets', mm: 'လက်ခံလက်မှတ်နှင့် ပြုပြင်ဆဲ လက်မှတ်များ' },
  navCreateTicket: { en: 'New Intake Ticket Registration', mm: 'ပြုပြင်ရေး လက်မှတ်အသစ် စာရင်းသွင်းခြင်း' },
  navPipeline: { en: 'Pipeline', mm: 'လုပ်ငန်းစဉ် လိုင်း' },
  navPriceList: { en: 'Price List', mm: 'ဈေးနှုန်းစာရင်း' },
  navQa: { en: 'QA & Warranty Inspection', mm: 'စစ်ဆေးရေးနှင့် အာမခံ စစ်ဆေးမှု' },
  navFollowUp: { en: 'Customer Follow-Ups', mm: 'ဝယ်ယူသူ ဆက်သွယ်စုံစမ်းရေး' },
  navPartsMatrix: { en: 'Parts Inventory & Stock Matrix', mm: 'အပိုပစ္စည်းနှင့် စတော့စာရင်း Matrix' },
  navSuppliers: { en: 'Suppliers & Vendor RMAs', mm: 'ပစ္စည်းပေးသွင်းသူနှင့် အာမခံ ပြန်အပ်လွှဲ' },
  navPos: { en: 'POS & Invoicing Portal', mm: 'အရောင်းနှင့် ဘေလ်ဖြတ်ပိုင်း ပေါ်တယ်' },
  navDevices: { en: 'Devices Management', mm: 'စက်ပစ္စည်းများ စီမံခန့်ခွဲမှု' },
  navCrm: { en: 'Customer & Staff Portal', mm: 'ဝယ်ယူသူနှင့် ဝန်ထမ်း ပေါ်တယ်' },
  navMicroSoldering: { en: 'Micro-Soldering Lab', mm: 'မိုက်ခရို ဂဟေဆက်ဓာတ်ခွဲခန်း' },
  navSettings: { en: 'System Management', mm: 'စနစ် စီမံခန့်ခွဲမှု' },
  navPortal: { en: 'Customer Public Portal', mm: 'ဝယ်ယူသူ အများပြည်သူ ပေါ်တယ်' },

  // Statuses
  statusReceive: { en: 'Receive', mm: 'လက်ခံရရှိ' },
  statusInProgress: { en: 'In Progress', mm: 'လုပ်ဆောင်ဆဲ' },
  statusPending: { en: 'Pending', mm: 'စောင့်ဆိုင်း' },
  statusFinished: { en: 'Finished', mm: 'ပြီးစီး' },
  statusTakenOut: { en: 'Taken Out', mm: 'ထုတ်ယူသွား' },
  statusCantRepair: { en: "Can't Repair", mm: 'ပြုပြင်၍မရ' },
  statusCustomerNotRepair: { en: 'Customer Not Repair', mm: 'ဝယ်ယူသူ မပြုပြင်' },

  // Common Buttons & Actions
  newTicket: { en: 'New Ticket', mm: 'လက်မှတ်အသစ်' },
  createTicket: { en: 'Create Ticket', mm: 'လက်မှတ်ဖန်တီးမည်' },
  save: { en: 'Save', mm: 'သိမ်းဆည်းမည်' },
  cancel: { en: 'Cancel', mm: 'ပယ်ဖျက်မည်' },
  delete: { en: 'Delete', mm: 'ဖျက်မည်' },
  edit: { en: 'Edit', mm: 'ပြင်ဆင်မည်' },
  search: { en: 'Search...', mm: 'ရှာဖွေပါ...' },
  filter: { en: 'Filter', mm: 'စစ်ထုတ်ရန်' },
  export: { en: 'Export', mm: 'ထုတ်ယူမည်' },
  import: { en: 'Import', mm: 'ထည့်သွင်းမည်' },
  copy: { en: 'Copy', mm: 'ကူးယူမည်' },
  copied: { en: 'Copied!', mm: 'ကူးယူပြီးပါပြီ!' },
  close: { en: 'Close', mm: 'ပိတ်မည်' },
  refresh: { en: 'Refresh', mm: 'ပြန်လည်စတင်ရန်' },
  reset: { en: 'Reset', mm: 'မူလအတိုင်းပြန်ထားမည်' },
  details: { en: 'Details', mm: 'အသေးစိတ်' },
  actions: { en: 'Actions', mm: 'လုပ်ဆောင်ချက်များ' },
  add: { en: 'Add', mm: 'အသစ်ထည့်မည်' },
  addPart: { en: 'Add Part', mm: 'အပိုပစ္စည်းထည့်မည်' },
  flagRma: { en: 'Flag RMA', mm: 'RMA ပြန်အပ်လွှဲမည်' },
  registerDevice: { en: 'Register Device', mm: 'စက်ပစ္စည်း မှတ်ပုံတင်မည်' },
  print: { en: 'Print Tag', mm: 'တံဆိပ်ရိုက်နှိပ်မည်' },
  logStatus: { en: 'Log Status Transition', mm: 'အခြေအနေပြောင်းလဲမှု မှတ်တမ်းတင်မည်' },
  aiAssistant: { en: 'AI Assistant', mm: 'AI ကူညီမည့်သူ' },
  recycleBin: { en: 'Recycle Bin', mm: 'အမှိုက်ပုံး' },
  language: { en: 'Language', mm: 'ဘာသာစကား' },
  english: { en: 'English', mm: 'အင်္ဂလိပ်' },
  burmese: { en: 'Myanmar (မြန်မာ)', mm: 'မြန်မာ' },
  calc: { en: 'Calc', mm: 'တွက်ချက်ရန်' },
  model: { en: 'Model', mm: 'မော်ဒယ်' },
  settings: { en: 'Settings', mm: 'ဆက်တင်များ' },

  // Filters
  filterAllStatuses: { en: 'All Statuses', mm: 'အခြေအနေအားလုံး' },
  filterAllStages: { en: 'All Stages', mm: 'အဆင့်အားလုံး' },
  filterAllTechs: { en: 'All Technicians', mm: 'နည်းပညာရှင်အားလုံး' },
  filterAllCategories: { en: 'All Categories', mm: 'အမျိုးအစားအားလုံး' },
  filterAllStock: { en: 'All Stock', mm: 'စတော့အားလုံး' },
  filterAllTiers: { en: 'All Quality Tiers', mm: 'အသွင်အပြင် အဆင့်အားလုံး' },
  filterAllAccountTypes: { en: 'All Account Types', mm: 'အကောင့်အမျိုးအစားအားလုံး' },
  filterAllRmaStatuses: { en: 'All RMA Statuses', mm: 'RMA အခြေအနေအားလုံး' },
  filterAllQaStatuses: { en: 'All QA Statuses', mm: 'QA အခြေအနေအားလုံး' },
  filterBottlenecks: { en: 'Bottlenecks (>48h)', mm: 'ကြန့်ကြာနေသည်များ (>၄၈ နာရီ)' },
  unassigned: { en: 'Unassigned', mm: 'တာဝန်မပေးရသေးပါ' },

  // Dashboard Overview
  dashActiveJobs: { en: 'Active Jobs in Shop', mm: 'ဆိုင်အတွင်း လုပ်ဆောင်နေသော ပြုပြင်မှုများ' },
  dashCompletedToday: { en: 'Completed Today', mm: 'ယနေ့ ပြီးစီးသည်များ' },
  dashRevenueThisMonth: { en: 'Monthly Revenue', mm: 'ဒီလ ဝင်ငွေ' },
  dashLowStockAlerts: { en: 'Low Stock Alerts', mm: 'စတော့နည်းပါးမှု သတိပေးချက်' },
  dashStagnantJobs: { en: 'Stagnant Tickets (>48h)', mm: 'ကြန့်ကြာနေသော လက်မှတ်များ (>၄၈ နာရီ)' },
  dashRecentWorkOrders: { en: 'Recent Work Orders', mm: 'လတ်တလော ပြုပြင်ရေး လက်မှတ်များ' },
  dashTechnicianPerformance: { en: 'Technician Workload', mm: 'နည်းပညာရှင်များ ဝန်ထမ်းဆောင်မှု' },

  // Work Order Details / Headers
  orderNumber: { en: 'Work Order #', mm: 'ပြုပြင်ရေး အမှတ် #' },
  customer: { en: 'Customer', mm: 'ဝယ်ယူသူ' },
  customerName: { en: 'Customer Name', mm: 'ဝယ်ယူသူ အမည်' },
  phone: { en: 'Phone Number', mm: 'ဖုန်းနံပါတ်' },
  email: { en: 'Email Address', mm: 'အီးမေးလ် လိပ်စာ' },
  serialOrImei: { en: 'Serial / IMEI Number', mm: 'စီရီရယ် / IMEI နံပါတ်' },
  device: { en: 'Device', mm: 'စက်ပစ္စည်း' },
  deviceModel: { en: 'Device Model', mm: 'စက်ပစ္စည်း မော်ဒယ်' },
  deviceCategory: { en: 'Device Category', mm: 'စက်ပစ္စည်း အမျိုးအစား' },
  assignedTech: { en: 'Assigned Tech', mm: 'တာဝန်ယူထားသော နည်းပညာရှင်' },
  issueReported: { en: 'Reported Issue', mm: 'သတင်းပို့ထားသော ချို့ယွင်းချက်' },
  estimatedCost: { en: 'Estimated Cost', mm: 'ခန့်မှန်းကုန်ကျစရိတ်' },
  deposit: { en: 'Deposit Paid', mm: 'စလံငွေ ပေးပြီး' },
  createdAt: { en: 'Created Date', mm: 'ဖန်တီးသည့် ရက်စွဲ' },
  updatedAt: { en: 'Last Updated', mm: 'နောက်ဆုံးပြင်ဆင်သည့် ရက်စွဲ' },
  timelineTitle: { en: 'Status Transition Timeline & Audit Trail', mm: 'အခြေအနေ ပြောင်းလဲမှု မှတ်တမ်းလိုင်း' },
  timelineDesc: { en: 'Interactive chronological tracking of repair stages, timestamps, and technician notes.', mm: 'ပြုပြင်မှု အဆင့်ဆင့်၊ အချိန်နှင့် နည်းပညာရှင် မှတ်စုများ၏ မှတ်တမ်းစာရင်း။' },

  // Pipeline View
  pipelineHeader: { en: 'Visual Status Pipeline', mm: 'ပြုပြင်မှု အဆင့်ဆင့် ရုပ်ပုံလိုင်း' },
  pipelineDragHelp: { en: 'Drag and drop tickets between columns to update repair status.', mm: 'အခြေအနေ ပြောင်းလဲရန် လက်မှတ်များကို ကော်လံများအကြား ဆွဲယူရွှေ့ပြောင်းပါ။' },
  stagnantWarning: { en: 'Stagnant Ticket Alert (>48 Hours Unchanged)', mm: 'သတိပေးချက်: ၄၈ နာရီကျော် မပြောင်းလဲသေးသော လက်မှတ်' },

  // POS & Invoicing
  posCartTitle: { en: 'Active POS Register & Checkout', mm: 'အရောင်းနှင့် ငွေချေစနစ်' },
  posTotal: { en: 'Total Amount', mm: 'စုစုပေါင်း ပမာဏ' },
  posPay: { en: 'Process Payment', mm: 'ငွေပေးချေမှု ပြုလုပ်မည်' },
  posInvoiceNumber: { en: 'Invoice #', mm: 'ဘေလ်အမှတ် #' },

  // Inventory & Stock
  partName: { en: 'Part Name', mm: 'အပိုပစ္စည်း အမည်' },
  skuNumber: { en: 'SKU / Part #', mm: 'ပစ္စည်း အမှတ်' },
  quantity: { en: 'In Stock', mm: 'စတော့ ရှိပမာဏ' },
  unitPrice: { en: 'Unit Price', mm: 'တစ်ခုချင်း ဈေးနှုန်း' },
  reorderLevel: { en: 'Reorder Point', mm: 'ပြန်လည်မှာယူမည့် ပမာဏ' },

  // CRM
  crmTitle: { en: 'Customer Relationship Management', mm: 'ဝယ်ယူသူများ စီမံခန့်ခွဲမှု' },
  crmTotalSpent: { en: 'Total Spent', mm: 'စုစုပေါင်း သုံးစွဲမှု' },
  crmRepairHistory: { en: 'Repair History', mm: 'ပြုပြင်ခဲ့သည့် မှတ်တမ်း' },
  crmViewHistory: { en: 'View Repair History', mm: 'ပြုပြင်မှု မှတ်တမ်းကြည့်မည်' },

  // Settings
  settingsTitle: { en: 'System Settings & Branding', mm: 'စနစ် ဆက်တင်နှင့် အမှတ်တံဆိပ်' },
  shopName: { en: 'Shop Name', mm: 'ဆိုင်အမည်' },
  currencySymbol: { en: 'Currency Symbol', mm: 'ငွေကြေး သင်္ကေတ' },
  taxRate: { en: 'Tax Rate (%)', mm: 'အခွန်နှုန်း (%)' },
  themePreset: { en: 'Theme Color Palette', mm: 'အပြင်အဆင် ရောင်စုံ' },
};
