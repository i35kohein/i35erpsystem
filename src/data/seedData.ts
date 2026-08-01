import { WorkOrder, PartItem, Supplier, RmaItem, Customer, Technician, PurchaseOrder, SystemSettings, PaymentMethodConfig, NotificationTemplate, AppUser } from '../types';
import { get21Diagnostics } from '../utils/diagnosticUtils';

export const INITIAL_USERS: AppUser[] = [
  {
    id: 'usr-admin-1',
    name: 'Aung Kyaw (Manager)',
    email: 'admin@applerepairpro.com',
    role: 'Admin',
    phone: '+95 9 790 000 001',
    status: 'Active',
    createdAt: '2026-01-01',
    permissions: {
      canDeleteWorkOrders: true,
      canDeleteInventory: true,
      canDeleteCustomers: true,
      canDeleteLogs: true,
      canAccessSettings: true,
      canAccessFinance: true,
      canEditPrices: true,
    },
  },
  {
    id: 'usr-tech-1',
    name: 'Aung Ko Ko',
    email: 'aungkoko@applerepairpro.com',
    role: 'Technician',
    technicianId: 'tech-1',
    technicianName: 'Aung Ko Ko',
    phone: '+95 9 790 111 222',
    status: 'Active',
    createdAt: '2026-01-05',
    permissions: {
      canDeleteWorkOrders: false,
      canDeleteInventory: false,
      canDeleteCustomers: false,
      canDeleteLogs: false,
      canAccessSettings: false,
      canAccessFinance: false,
      canEditPrices: false,
    },
  },
  {
    id: 'usr-tech-2',
    name: 'Kyaw Swar Lin',
    email: 'kyawswarlin@applerepairpro.com',
    role: 'Technician',
    technicianId: 'tech-2',
    technicianName: 'Kyaw Swar Lin',
    phone: '+95 9 790 333 444',
    status: 'Active',
    createdAt: '2026-01-06',
    permissions: {
      canDeleteWorkOrders: false,
      canDeleteInventory: false,
      canDeleteCustomers: false,
      canDeleteLogs: false,
      canAccessSettings: false,
      canAccessFinance: false,
      canEditPrices: false,
    },
  },
  {
    id: 'usr-tech-3',
    name: 'Thura Aung',
    email: 'thuraaung@applerepairpro.com',
    role: 'Technician',
    technicianId: 'tech-3',
    technicianName: 'Thura Aung',
    phone: '+95 9 790 555 666',
    status: 'Active',
    createdAt: '2026-01-08',
    permissions: {
      canDeleteWorkOrders: false,
      canDeleteInventory: false,
      canDeleteCustomers: false,
      canDeleteLogs: false,
      canAccessSettings: false,
      canAccessFinance: false,
      canEditPrices: false,
    },
  },
  {
    id: 'usr-tech-4',
    name: 'Min Htet (Senior Tech)',
    email: 'minhtet@applerepairpro.com',
    role: 'Technician',
    technicianId: 'tech-4',
    technicianName: 'Min Htet (Senior Tech)',
    phone: '+95 9 790 777 888',
    status: 'Active',
    createdAt: '2026-01-12',
    permissions: {
      canDeleteWorkOrders: false,
      canDeleteInventory: false,
      canDeleteCustomers: false,
      canDeleteLogs: false,
      canAccessSettings: false,
      canAccessFinance: false,
      canEditPrices: false,
    },
  },
  {
    id: 'usr-tech-5',
    name: 'Zin Mar Win',
    email: 'zinmarwin@applerepairpro.com',
    role: 'Technician',
    technicianId: 'tech-5',
    technicianName: 'Zin Mar Win',
    phone: '+95 9 790 999 000',
    status: 'Active',
    createdAt: '2026-01-15',
    permissions: {
      canDeleteWorkOrders: false,
      canDeleteInventory: false,
      canDeleteCustomers: false,
      canDeleteLogs: false,
      canAccessSettings: false,
      canAccessFinance: false,
      canEditPrices: false,
    },
  },
  {
    id: 'usr-reception-1',
    name: 'Ma Su Su (Receptionist)',
    email: 'susu@applerepairpro.com',
    role: 'Reception',
    phone: '+95 9 790 555 666',
    status: 'Active',
    createdAt: '2026-01-10',
    permissions: {
      canDeleteWorkOrders: false,
      canDeleteInventory: false,
      canDeleteCustomers: false,
      canDeleteLogs: false,
      canAccessSettings: false,
      canAccessFinance: false,
      canEditPrices: true,
    },
  },
];


export const DEFAULT_NOTIFICATION_TEMPLATES: NotificationTemplate[] = [
  {
    id: 'tmpl-1',
    key: 'Finished',
    title: 'Finished / Ready for Pickup',
    channel: 'All',
    enabled: true,
    description: 'Sent when device repair is 100% completed & tested',
    templateText: 'မင်္ဂလာပါ {customerName} ခင်ဗျာ၊ {shopName} မှ လူကြီးမင်း၏ {deviceModel} (Ticket: {ticketNumber}) ပြင်ဆင်မှု ပြီးစီးပါပြီ။ ကျသင့်ငွေ {totalAmount} MMK ဖြစ်ပါသည်။ ဆိုင်သို့ လာရောက်ထုတ်ယူနိုင်ပါပြီ ခင်ဗျာ။',
  },
  {
    id: 'tmpl-2',
    key: 'ReadyForPickup',
    title: 'Ready for Pickup (QA Passed)',
    channel: 'All',
    enabled: true,
    description: 'Sent when device passes final QA testing and is ready in storage',
    templateText: 'မင်္ဂလာပါ {customerName} ခင်ဗျာ၊ {shopName} တွင် စစ်ဆေးပြင်ဆင်ထားသော {deviceModel} (Ticket: #{ticketNumber}) သည် QA စစ်ဆေးမှု အောင်မြင်ပြီး လာရောက်ထုတ်ယူရန် အဆင်သင့်ဖြစ်ပါပြီ။ ဖုန်း - {shopPhone}',
  },
  {
    id: 'tmpl-3',
    key: 'NeedsAttention',
    title: 'Needs Attention / Action Required',
    channel: 'All',
    enabled: true,
    description: 'Sent when inspection discovers extra damage or needs customer approval',
    templateText: 'မင်္ဂလာပါ {customerName} ခင်ဗျာ၊ {shopName} မှ လူကြီးမင်း၏ {deviceModel} (Ticket: #{ticketNumber}) စစ်ဆေးတွေ့ရှိချက်များအရ အထူးအကြောင်းအရာ သို့မဟုတ် ဆုံးဖြတ်ချက် လိုအပ်နေပါသဖြင့် ဆိုင်ဖုန်း {shopPhone} သို့ ဆက်သွယ်ပေးပါရန် အကြောင်းကြားအပ်ပါသည်။',
  },
  {
    id: 'tmpl-4',
    key: 'PendingParts',
    title: 'Pending Parts / Component Arrival',
    channel: 'All',
    enabled: true,
    description: 'Sent when waiting for special component or IC replacement arrival',
    templateText: 'မင်္ဂလာပါ {customerName} ခင်ဗျာ၊ {shopName} မှ လူကြီးမင်း၏ {deviceModel} (Ticket: #{ticketNumber}) ပြင်ဆင်ရန် အပိုပစ္စည်း စောင့်ဆိုင်းနေပါသည် ခင်ဗျာ။ အပိုပစ္စည်း ရောက်ရှိပါက ချက်ချင်း ဆက်လက်ပြင်ဆင်ပေးသွားပါမည်။',
  },
  {
    id: 'tmpl-5',
    key: 'Intake',
    title: 'Intake / Device Checked In',
    channel: 'All',
    enabled: true,
    description: 'Sent when customer first drops off device and receives ticket number',
    templateText: 'မင်္ဂလာပါ {customerName} ခင်ဗျာ၊ {shopName} တွင် လူကြီးမင်း၏ {deviceModel} ကို Ticket #{ticketNumber} ဖြင့် လက်ခံရရှိထားပါသည်။ ပြင်ဆင်မှုအခြေအနေများအား အချိန်နှင့်တပြေးညီ အကြောင်းကြားပေးပါမည်။ ဖုန်း - {shopPhone}',
  },
];

export const DEFAULT_PAYMENT_METHODS: PaymentMethodConfig[] = [
  { id: 'cash', name: 'Cash', category: 'Cash', enabled: true },
  { id: 'kbz', name: 'KBZ Pay', category: 'Myanmar Mobile Pay', enabled: true, accountNumber: '09790000000', accountName: 'AppleRepair Pro' },
  { id: 'uab', name: 'UAB Pay', category: 'Myanmar Mobile Pay', enabled: true, accountNumber: '09790000000', accountName: 'AppleRepair Pro' },
  { id: 'aya', name: 'AYA Pay', category: 'Myanmar Mobile Pay', enabled: true, accountNumber: '09790000000', accountName: 'AppleRepair Pro' },
  { id: 'mmqr', name: 'MMQR (National QR)', category: 'Myanmar Mobile Pay', enabled: true, accountNumber: 'MMQR-90210-YGN', notes: 'Universal Myanmar Standard QR' },
  { id: 'cb_bank', name: 'CB Bank (CB Pay)', category: 'Myanmar Banks', enabled: true, accountNumber: '0010-6001-0000-8888', accountName: 'AppleRepair Pro Lab' },
  { id: 'yoma_bank', name: 'Yoma Bank (Next)', category: 'Myanmar Banks', enabled: true, accountNumber: '0008-1122-3344-5566', accountName: 'AppleRepair Pro Lab' },
  { id: 'wave_money', name: 'Wave Money', category: 'Myanmar Mobile Pay', enabled: true, accountNumber: '09790000000', accountName: 'AppleRepair Pro' },
  { id: 'kbz_bank', name: 'KBZ Bank (iBanking)', category: 'Myanmar Banks', enabled: true, accountNumber: '0431-0101-9999-0000', accountName: 'AppleRepair Pro Lab' },
  { id: 'aya_bank', name: 'AYA Bank (mBanking)', category: 'Myanmar Banks', enabled: true, accountNumber: '2000-1234-5678', accountName: 'AppleRepair Pro Lab' },
];

export const getActivePaymentMethods = (settings?: SystemSettings): PaymentMethodConfig[] => {
  if (!settings || !settings.paymentMethods || settings.paymentMethods.length === 0) {
    return DEFAULT_PAYMENT_METHODS;
  }
  return settings.paymentMethods;
};

export const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
  shopName: 'AppleRepair Pro Lab',
  shopLogoUrl: '',
  shopPhone: '+95 9 790 000 000',
  shopPhones: ['+95 9 790 000 000', '+95 9 440 111 222'],
  shopEmail: 'support@applerepairpro.com',
  shopAddress: 'No. 123 Sule Pagoda Road, Downtown Tech Plaza, Yangon',
  shopWebsite: 'www.applerepair.pro',
  taxId: 'MMK-TAX-90210',
  shopInfo: 'Authorized Apple Component Repairs & Micro-Soldering Lab. Mon-Sat 9AM-7PM.',

  ticketPrefix: 'WO-',
  defaultWarrantyDays: 90,
  defaultTechnicianId: 'tech-1',
  requirePasscodeIntake: true,
  requireFindMyCheck: true,

  currencySymbol: 'MMK',
  taxPercentage: 5,
  defaultLaborDiscountPercent: 0,
  paymentMethods: DEFAULT_PAYMENT_METHODS,

  lowStockThreshold: 3,
  autoReserveOnAssignment: true,
  defaultSupplierSlaDays: 3,

  thermalPaperSize: '80mm',
  receiptHeaderTitle: 'AppleRepair Pro Lab - Official Service Voucher',
  receiptFooterNote: 'Thank you for choosing AppleRepair Pro Lab! All repairs covered by warranty.',
  receiptFooterTextAlign: 'left',
  receiptFooterFontSize: 'medium',

  a4PrintColorMode: 'monochrome',
  a4ShowDiagnosticsTable: true,
  a4ShowPricingTable: true,
  a4ShowTermsDisclaimer: true,
  a4CustomHeaderNote: 'Official Device Intake & Hardware Diagnostic Voucher',
  a4PrintLayoutDensity: 'compact',
  a4DiagnosticDisplayFormat: 'comparison_table',

  mandatoryQaChecklist: true,
  requireMicroSolderingLog: true,

  notificationTemplates: DEFAULT_NOTIFICATION_TEMPLATES,
  defaultNotificationChannel: 'Viber',
  autoPromptNotificationModal: true,
  telegramBotToken: '',
  telegramChatId: '',
  aiProvider: 'local',
  aiApiKey: '',
  aiModel: '',
  aiBaseUrl: '',
  aiSystemPrompt: 'You are a concise repair-shop operations assistant. Use only the supplied ERP data, clearly state uncertainty, and prioritize actionable next steps.',
};

export const INITIAL_TECHNICIANS: Technician[] = [
  {
    id: 'tech-1',
    name: 'Aung Ko Ko',
    email: 'aungkoko@applerepairpro.com',
    phone: '+95 9 790 111 222',
    level: 'Level 3 Master',
    specialty: 'MacBook Logic Boards & Face ID Repair',
    status: 'Active',
    commissionRate: 15,
    activeJobsCount: 4,
    completedThisMonth: 38,
    warrantyReturnCount: 1,
  },
  {
    id: 'tech-2',
    name: 'Kyaw Swar Lin',
    email: 'kyawswarlin@applerepairpro.com',
    phone: '+95 9 790 333 444',
    level: 'Level 2 Spareparts + Hardware',
    specialty: 'iPhone Screen & Battery Replacement',
    status: 'Active',
    commissionRate: 12,
    activeJobsCount: 3,
    completedThisMonth: 42,
    warrantyReturnCount: 0,
  },
  {
    id: 'tech-3',
    name: 'Thura Aung',
    email: 'thuraaung@applerepairpro.com',
    phone: '+95 9 790 555 666',
    level: 'Level 1 Spareparts',
    specialty: 'iPad & Apple Watch Modular Repairs',
    status: 'Active',
    commissionRate: 10,
    activeJobsCount: 2,
    completedThisMonth: 51,
    warrantyReturnCount: 2,
  },
  {
    id: 'tech-4',
    name: 'Min Htet (Senior Tech)',
    email: 'minhtet@applerepairpro.com',
    phone: '+95 9 790 777 888',
    level: 'Level 3 Master',
    specialty: 'iMac, M-Series Power IC & GPU Repair',
    status: 'Active',
    commissionRate: 15,
    activeJobsCount: 5,
    completedThisMonth: 46,
    warrantyReturnCount: 1,
  },
  {
    id: 'tech-5',
    name: 'Zin Mar Win',
    email: 'zinmarwin@applerepairpro.com',
    phone: '+95 9 790 999 000',
    level: 'Level 2 Spareparts + Hardware',
    specialty: 'TrueTone & Battery Health Calibration',
    status: 'Active',
    commissionRate: 12,
    activeJobsCount: 3,
    completedThisMonth: 29,
    warrantyReturnCount: 0,
  },
];

export const INITIAL_SUPPLIERS: Supplier[] = [
  {
    id: 'sup-1',
    name: 'MobileSentrix',
    code: 'MSX',
    website: 'https://www.mobilesentrix.com',
    contactEmail: 'rma@mobilesentrix.com',
    phone: '1-800-418-8090',
    avgRmaTurnaroundDays: 3,
    rating: 4.8,
  },
  {
    id: 'sup-2',
    name: 'InjuredGadgets',
    code: 'IG',
    website: 'https://www.injuredgadgets.com',
    contactEmail: 'support@injuredgadgets.com',
    phone: '1-800-501-1681',
    avgRmaTurnaroundDays: 4,
    rating: 4.7,
  },
  {
    id: 'sup-3',
    name: 'Mengtor Apple Parts',
    code: 'MGT',
    website: 'https://www.mengtor.com',
    contactEmail: 'sales@mengtor.com',
    phone: '1-888-636-4867',
    avgRmaTurnaroundDays: 5,
    rating: 4.5,
  },
];

export const INITIAL_PARTS: PartItem[] = [
  {
    id: 'part-101',
    sku: 'DISP-iP14PM-OEM',
    name: 'iPhone 14 Pro Max Super Retina XDR OLED Assembly',
    applePartNumber: '661-2894',
    category: 'Display',
    deviceCompatibility: ['iPhone 14 Pro Max'],
    qualityTier: 'OEM Original Pulled',
    quantityInStock: 8,
    reservedQuantity: 2,
    reorderPoint: 4,
    costPrice: 195.00,
    sellingPrice: 320.00,
    supplierId: 'sup-1',
    supplierName: 'MobileSentrix',
    locationBin: 'BIN-A01',
    isSerialized: true,
    serialNumbers: ['SN-DISP-89211', 'SN-DISP-89212'],
  },
  {
    id: 'part-102',
    sku: 'DISP-iP13P-AM-PREM',
    name: 'iPhone 13 Pro OLED Display Screen Assembly',
    category: 'Display',
    deviceCompatibility: ['iPhone 13 Pro'],
    qualityTier: 'Premium Aftermarket',
    quantityInStock: 12,
    reservedQuantity: 1,
    reorderPoint: 5,
    costPrice: 98.00,
    sellingPrice: 189.00,
    supplierId: 'sup-2',
    supplierName: 'InjuredGadgets',
    locationBin: 'BIN-A02',
    isSerialized: true,
  },
  {
    id: 'part-103',
    sku: 'BATT-iP13-OEM-AMPS',
    name: 'iPhone 13 High-Capacity Battery (3227mAh)',
    category: 'Battery',
    deviceCompatibility: ['iPhone 13', 'iPhone 13 Pro'],
    qualityTier: 'Refurbished Grade A',
    quantityInStock: 19,
    reservedQuantity: 3,
    reorderPoint: 8,
    costPrice: 22.00,
    sellingPrice: 79.00,
    supplierId: 'sup-1',
    supplierName: 'MobileSentrix',
    locationBin: 'BIN-B04',
    isSerialized: false,
  },
  {
    id: 'part-104',
    sku: 'BATT-iP11-STD',
    name: 'iPhone 11 Replacement Battery Pack',
    category: 'Battery',
    deviceCompatibility: ['iPhone 11'],
    qualityTier: 'Standard Aftermarket',
    quantityInStock: 3,
    reservedQuantity: 1,
    reorderPoint: 6,
    costPrice: 12.50,
    sellingPrice: 59.00,
    supplierId: 'sup-3',
    supplierName: 'Mengtor Apple Parts',
    locationBin: 'BIN-B01',
    isSerialized: false,
  },
  {
    id: 'part-105',
    sku: 'CHIP-HYDRA-USB',
    name: 'Hydra USB-C Controller IC Chip (1612A1 / 1614A1)',
    category: 'Logic Board Chip',
    deviceCompatibility: ['iPhone 12', 'iPhone 12 Pro', 'iPhone 13', 'iPhone 14'],
    qualityTier: 'OEM Original Pulled',
    quantityInStock: 25,
    reservedQuantity: 0,
    reorderPoint: 10,
    costPrice: 8.50,
    sellingPrice: 45.00,
    supplierId: 'sup-1',
    supplierName: 'MobileSentrix',
    locationBin: 'MICRO-BIN-02',
    isSerialized: false,
  },
  {
    id: 'part-106',
    sku: 'DISP-iP8-SE2-SE3',
    name: 'iPhone 8 / SE (2020) / SE (2022) Universal LCD Assembly',
    category: 'Display',
    deviceCompatibility: ['iPhone 8', 'iPhone SE (2020)', 'iPhone SE (2022)'],
    qualityTier: 'Premium Aftermarket',
    quantityInStock: 15,
    reservedQuantity: 0,
    reorderPoint: 5,
    costPrice: 24.00,
    sellingPrice: 89.00,
    supplierId: 'sup-2',
    supplierName: 'InjuredGadgets',
    locationBin: 'BIN-A08',
    isSerialized: false,
  },
  {
    id: 'part-107',
    sku: 'DISP-MBP16-M1M2',
    name: 'MacBook Pro 16" Liquid Retina XDR Display Assembly (Space Gray)',
    applePartNumber: '661-21971',
    category: 'Display',
    deviceCompatibility: ['MacBook Pro 16" (2021 M1)', 'MacBook Pro 16" (2023 M2)'],
    qualityTier: 'OEM Original Pulled',
    quantityInStock: 2,
    reservedQuantity: 1,
    reorderPoint: 2,
    costPrice: 520.00,
    sellingPrice: 780.00,
    supplierId: 'sup-1',
    supplierName: 'MobileSentrix',
    locationBin: 'MAC-BIN-01',
    isSerialized: true,
  }
];

export const INITIAL_CUSTOMERS: Customer[] = [
  {
    id: 'cust-1',
    name: 'Sarah Jenkins',
    email: 'sarah.j@gmail.com',
    phone: '(555) 234-5678',
    type: 'Retail',
    discountPercentage: 0,
    totalOrdersCount: 2,
    totalSpent: 735.00,
    createdAt: '2026-03-12T10:30:00Z',
  },
  {
    id: 'cust-2',
    name: 'Apex Creative Tech Solutions',
    company: 'Apex Creative LLC',
    email: 'it@apexcreative.io',
    phone: '(555) 888-1212',
    type: 'B2B Corporate',
    discountPercentage: 15,
    totalOrdersCount: 14,
    totalSpent: 6420.00,
    notes: 'Net 30 payment terms approved. Priority repair turnaround.',
    createdAt: '2025-11-04T09:15:00Z',
  },
  {
    id: 'cust-3',
    name: 'Bay Area Mobile Mail-In',
    company: 'Bay Repairs Wholesale',
    email: 'wholesale@bayrepairs.com',
    phone: '(555) 777-9900',
    type: 'Wholesale Mail-In',
    discountPercentage: 20,
    totalOrdersCount: 28,
    totalSpent: 11250.00,
    notes: 'Outsourced L3 micro-soldering board repairs.',
    createdAt: '2025-08-20T14:00:00Z',
  },
  {
    id: 'cust-4',
    name: 'Michael Chang',
    email: 'm.chang@techcorp.com',
    phone: '(555) 432-1098',
    type: 'Retail',
    discountPercentage: 0,
    totalOrdersCount: 3,
    totalSpent: 890.00,
    notes: 'VIP customer, prefers original OEM pulled Apple components.',
    createdAt: '2026-04-10T11:20:00Z',
  },
  {
    id: 'cust-5',
    name: 'Horizon Design Studio',
    company: 'Horizon Media Inc',
    email: 'ops@horizondesign.co',
    phone: '(555) 901-2345',
    type: 'B2B Corporate',
    discountPercentage: 10,
    totalOrdersCount: 8,
    totalSpent: 3850.00,
    createdAt: '2026-01-15T08:45:00Z',
  },
  {
    id: 'cust-6',
    name: 'Amanda Ross',
    email: 'amanda.ross@icloud.com',
    phone: '(555) 654-3210',
    type: 'Retail',
    discountPercentage: 0,
    totalOrdersCount: 1,
    totalSpent: 280.00,
    createdAt: '2026-05-18T15:10:00Z',
  }
];

const RAW_WORK_ORDERS: WorkOrder[] = [
  // --- MAY 2026 TICKETS ---
  {
    id: 'wo-100',
    orderNumber: 'WO-2026-0501',
    customerId: 'cust-4',
    customerName: 'Michael Chang',
    customerPhone: '(555) 432-1098',
    customerEmail: 'm.chang@techcorp.com',
    customerType: 'Retail',
    deviceCategory: 'iPhone',
    deviceModel: 'iPhone 15 Pro',
    serialNumber: 'G6X9012PL81',
    imei: '359012345678901',
    deviceColor: 'Natural Titanium',
    passcode: '112233',
    findMyStatus: 'OFF',
    status: 'Finished',
    priority: 'Normal',
    assignedTechId: 'tech-2',
    assignedTechName: 'Kyaw Swar Lin',
    serviceType: 'Standard Modular',
    repairLogs: [
      { id: 'log-501-1', timestamp: 'May 02, 2026 10:15 AM', author: 'Kyaw Swar Lin', note: 'Ticket intake logged.', statusChange: 'Receive' },
      { id: 'log-501-2', timestamp: 'May 02, 2026 02:30 PM', author: 'Kyaw Swar Lin', note: 'Display panel & back glass replaced.', statusChange: 'Finished' }
    ],
    intakeChecklist: {
      powerOn: true, screenDisplay: true, touchGrid: true, faceIdOrTouchId: true, trueTonePresent: true,
      frontCamera: true, rearCamera: true, microphones: true, speakers: true, wifiBluetooth: true,
      cellularSignal: true, wirelessCharging: true, liquidIndicatorTriggered: false, batteryHealthPercent: 96,
      physicalDamageNotes: 'Rear back glass cracked after dropping from car roof.'
    },
    symptomsReported: 'Shattered back glass, Wireless charging coil exposed.',
    diagnosticResult: 'Back glass replacement required. Internal magnets and MagSafe coil inspected normal.',
    lineItems: [
      { id: 'li-501-1', description: 'iPhone 15 Pro Back Glass Assembly (Natural Titanium)', unitCost: 45000, unitPrice: 200000, quantity: 1, isLabor: false },
      { id: 'li-501-2', description: 'Labor: Back Glass Laser & Alignment', unitCost: 0, unitPrice: 80000, quantity: 1, isLabor: true }
    ],
    subtotal: 280000, depositAmount: 50000, discountAmount: 0, taxAmount: 0, totalAmount: 280000,
    isPaid: true, paymentMethod: 'Credit Card', warrantyDays: 90, intakePhotos: [],
    createdAt: '2026-05-02T10:15:00Z', updatedAt: '2026-05-02T16:00:00Z', estimatedCompletion: '2026-05-02T17:00:00Z'
  },
  {
    id: 'wo-099',
    orderNumber: 'WO-2026-0428',
    customerId: 'cust-1',
    customerName: 'Sarah Jenkins',
    customerPhone: '(555) 234-5678',
    customerEmail: 'sarah.j@gmail.com',
    customerType: 'Retail',
    deviceCategory: 'iPhone',
    deviceModel: 'iPhone 13 Pro',
    serialNumber: 'F2LXK09PN6T',
    imei: '358921102938102',
    deviceColor: 'Sierra Blue',
    passcode: '123456',
    findMyStatus: 'OFF',
    status: 'Taken Out',
    priority: 'Normal',
    assignedTechId: 'tech-2',
    assignedTechName: 'Kyaw Swar Lin',
    serviceType: 'Standard Modular',
    repairLogs: [
      { id: 'log-428-1', timestamp: 'Apr 28, 2026 09:00 AM', author: 'Kyaw Swar Lin', note: 'Intake logged for screen repair.', statusChange: 'Receive' },
      { id: 'log-428-2', timestamp: 'Apr 28, 2026 01:30 PM', author: 'Kyaw Swar Lin', note: 'Screen replaced & device handed over.', statusChange: 'Taken Out' }
    ],
    intakeChecklist: {
      powerOn: true, screenDisplay: true, touchGrid: false, faceIdOrTouchId: true, trueTonePresent: true,
      frontCamera: true, rearCamera: true, microphones: true, speakers: true, wifiBluetooth: true,
      cellularSignal: true, wirelessCharging: true, liquidIndicatorTriggered: false, batteryHealthPercent: 88,
      physicalDamageNotes: 'Cracked screen display glass.'
    },
    symptomsReported: 'Unresponsive touch after drop.',
    diagnosticResult: 'OLED touch digitizer damaged. Display assembly replaced.',
    lineItems: [
      { id: 'li-428-1', description: 'iPhone 13 Pro OLED Display Screen Assembly', unitCost: 98000, unitPrice: 190000, quantity: 1, isLabor: false },
      { id: 'li-428-2', description: 'Labor: Screen Replacement', unitCost: 0, unitPrice: 60000, quantity: 1, isLabor: true }
    ],
    subtotal: 250000, depositAmount: 50000, discountAmount: 0, taxAmount: 0, totalAmount: 250000,
    isPaid: true, paymentMethod: 'Credit Card', warrantyDays: 90, intakePhotos: [],
    createdAt: '2026-04-28T09:00:00Z', updatedAt: '2026-04-28T14:00:00Z', estimatedCompletion: '2026-04-28T16:00:00Z'
  },
  {
    id: 'wo-100b',
    orderNumber: 'WO-2026-0515',
    customerId: 'cust-5',
    customerName: 'Horizon Design Studio',
    customerPhone: '(555) 901-2345',
    customerEmail: 'ops@horizondesign.co',
    customerType: 'B2B Corporate',
    deviceCategory: 'MacBook',
    deviceModel: 'MacBook Air 13" (M2, 2022)',
    serialNumber: 'C02H1029Q102',
    deviceColor: 'Midnight',
    passcode: 'horizon2026',
    findMyStatus: 'OFF',
    status: 'Finished',
    priority: 'B2B Priority',
    assignedTechId: 'tech-1',
    assignedTechName: 'Aung Ko Ko',
    serviceType: 'Micro-Soldering',
    repairLogs: [
      { id: 'log-515-1', timestamp: 'May 15, 2026 09:00 AM', author: 'Aung Ko Ko', note: 'Received coffee liquid damage Mac.', statusChange: 'Receive' },
      { id: 'log-515-2', timestamp: 'May 16, 2026 11:30 AM', author: 'Aung Ko Ko', note: 'Ultrasonic board clean & PWM IC replaced.', statusChange: 'Finished' }
    ],
    intakeChecklist: {
      powerOn: false, screenDisplay: false, touchGrid: true, faceIdOrTouchId: true, trueTonePresent: true,
      frontCamera: true, rearCamera: true, microphones: true, speakers: true, wifiBluetooth: true,
      cellularSignal: true, wirelessCharging: false, liquidIndicatorTriggered: true, batteryHealthPercent: 92,
      physicalDamageNotes: 'Coffee spill across keyboard area. Liquid indicators triggered red.'
    },
    symptomsReported: 'Spilled coffee, laptop shut off immediately and will not take charge.',
    diagnosticResult: 'Corrosion on PP3V3_S2 rail near U8100 power management chip. Ultrasonic bath & IC rebuild.',
    lineItems: [
      { id: 'li-515-1', description: 'Ultrasonic Bath & Board Deoxidation Treatment', unitCost: 15000, unitPrice: 130000, quantity: 1, isLabor: true },
      { id: 'li-515-2', description: 'Level 3 PMIC Reballing & Component Service', unitCost: 12000, unitPrice: 250000, quantity: 1, isLabor: true }
    ],
    subtotal: 380000, depositAmount: 100000, discountAmount: 30000, taxAmount: 0, totalAmount: 350000,
    isPaid: true, paymentMethod: 'Net 30', warrantyDays: 180, intakePhotos: [],
    createdAt: '2026-05-15T09:00:00Z', updatedAt: '2026-05-16T14:00:00Z', estimatedCompletion: '2026-05-17T12:00:00Z'
  },
  {
    id: 'wo-100c',
    orderNumber: 'WO-2026-0528',
    customerId: 'cust-6',
    customerName: 'Amanda Ross',
    customerPhone: '(555) 654-3210',
    customerEmail: 'amanda.ross@icloud.com',
    customerType: 'Retail',
    deviceCategory: 'AppleWatch',
    deviceModel: 'Apple Watch Ultra (49mm)',
    serialNumber: 'H7820199LL1',
    deviceColor: 'Titanium / Orange Loop',
    passcode: '9081',
    findMyStatus: 'OFF',
    status: 'Finished',
    priority: 'Normal',
    assignedTechId: 'tech-3',
    assignedTechName: 'Thura Aung',
    serviceType: 'Standard Modular',
    repairLogs: [
      { id: 'log-528-1', timestamp: 'May 28, 2026 01:20 PM', author: 'Thura Aung', note: 'Received watch with swollen battery.', statusChange: 'Receive' },
      { id: 'log-528-2', timestamp: 'May 29, 2026 10:00 AM', author: 'Thura Aung', note: 'Battery replaced, gasket resealed.', statusChange: 'Finished' }
    ],
    intakeChecklist: {
      powerOn: true, screenDisplay: true, touchGrid: true, faceIdOrTouchId: true, trueTonePresent: true,
      frontCamera: true, rearCamera: true, microphones: true, speakers: true, wifiBluetooth: true,
      cellularSignal: true, wirelessCharging: true, liquidIndicatorTriggered: false, batteryHealthPercent: 74,
      physicalDamageNotes: 'Display lifting slightly due to battery expansion.'
    },
    symptomsReported: 'Screen pushing up from body, battery health 74%.',
    diagnosticResult: 'Swollen internal 542mAh battery. Water seal adhesive replacement required.',
    lineItems: [
      { id: 'li-528-1', description: 'Apple Watch Ultra High-Capacity Battery Pack', unitCost: 18000, unitPrice: 140000, quantity: 1, isLabor: false },
      { id: 'li-528-2', description: 'Labor: Watch Disassembly & Waterproofing Seal', unitCost: 0, unitPrice: 80000, quantity: 1, isLabor: true }
    ],
    subtotal: 220000, depositAmount: 0, discountAmount: 0, taxAmount: 0, totalAmount: 220000,
    isPaid: true, paymentMethod: 'Apple Pay', warrantyDays: 90, intakePhotos: [],
    createdAt: '2026-05-28T13:20:00Z', updatedAt: '2026-05-29T11:00:00Z', estimatedCompletion: '2026-05-29T16:00:00Z'
  },

  // --- JUNE 2026 TICKETS ---
  {
    id: 'wo-100d',
    orderNumber: 'WO-2026-0604',
    customerId: 'cust-1',
    customerName: 'Sarah Jenkins',
    customerPhone: '(555) 234-5678',
    customerEmail: 'sarah.j@gmail.com',
    customerType: 'Retail',
    deviceCategory: 'iPad',
    deviceModel: 'iPad Pro 12.9" (6th Gen, M2)',
    serialNumber: 'DLX20918Q90',
    deviceColor: 'Space Gray',
    passcode: '882190',
    findMyStatus: 'OFF',
    status: 'Finished',
    priority: 'Normal',
    assignedTechId: 'tech-2',
    assignedTechName: 'Kyaw Swar Lin',
    serviceType: 'Standard Modular',
    repairLogs: [
      { id: 'log-604-1', timestamp: 'Jun 04, 2026 11:00 AM', author: 'Kyaw Swar Lin', note: 'iPad received with non-charging port.', statusChange: 'Receive' },
      { id: 'log-604-2', timestamp: 'Jun 05, 2026 03:00 PM', author: 'Kyaw Swar Lin', note: 'USB-C flex port replaced & tested.', statusChange: 'Finished' }
    ],
    intakeChecklist: {
      powerOn: true, screenDisplay: true, touchGrid: true, faceIdOrTouchId: true, trueTonePresent: true,
      frontCamera: true, rearCamera: true, microphones: true, speakers: true, wifiBluetooth: true,
      cellularSignal: true, wirelessCharging: false, liquidIndicatorTriggered: false, batteryHealthPercent: 89,
      physicalDamageNotes: 'Charging port pins bent, cable loose.'
    },
    symptomsReported: 'Only charges at specific angle. High heat at charger tail.',
    diagnosticResult: 'Damaged USB-C connector pins inside port module.',
    lineItems: [
      { id: 'li-604-1', description: 'iPad Pro 12.9" OEM USB-C Charging Port Flex', unitCost: 14000, unitPrice: 120000, quantity: 1, isLabor: false },
      { id: 'li-604-2', description: 'Labor: iPad Screen Removal & Port Soldering', unitCost: 0, unitPrice: 120000, quantity: 1, isLabor: true }
    ],
    subtotal: 240000, depositAmount: 50000, discountAmount: 0, taxAmount: 0, totalAmount: 240000,
    isPaid: true, paymentMethod: 'Credit Card', warrantyDays: 180, intakePhotos: [],
    createdAt: '2026-06-04T11:00:00Z', updatedAt: '2026-06-05T15:00:00Z', estimatedCompletion: '2026-06-05T17:00:00Z'
  },
  {
    id: 'wo-100e',
    orderNumber: 'WO-2026-0618',
    customerId: 'cust-3',
    customerName: 'Bay Area Mobile Mail-In',
    customerPhone: '(555) 777-9900',
    customerEmail: 'wholesale@bayrepairs.com',
    customerType: 'Wholesale Mail-In',
    deviceCategory: 'iPhone',
    deviceModel: 'iPhone 14 Pro',
    serialNumber: 'K90128912LL',
    imei: '351298019283019',
    deviceColor: 'Deep Purple',
    passcode: '000000',
    findMyStatus: 'OFF',
    status: 'Finished',
    priority: 'B2B Priority',
    assignedTechId: 'tech-1',
    assignedTechName: 'Aung Ko Ko',
    serviceType: 'Micro-Soldering',
    repairLogs: [
      { id: 'log-618-1', timestamp: 'Jun 18, 2026 09:30 AM', author: 'Aung Ko Ko', note: 'Received wholesale audio loop IC board.', statusChange: 'Receive' },
      { id: 'log-618-2', timestamp: 'Jun 19, 2026 12:00 PM', author: 'Aung Ko Ko', note: 'Audio Codec IC reballed & jumper wire installed.', statusChange: 'Finished' }
    ],
    intakeChecklist: {
      powerOn: true, screenDisplay: true, touchGrid: true, faceIdOrTouchId: true, trueTonePresent: true,
      frontCamera: true, rearCamera: true, microphones: false, speakers: false, wifiBluetooth: true,
      cellularSignal: true, wirelessCharging: true, liquidIndicatorTriggered: false, batteryHealthPercent: 90,
      physicalDamageNotes: 'Wholesale mail-in board. Voice memo app greyed out.'
    },
    symptomsReported: 'No sound on calls, voice recorder disabled, bootup takes 3 minutes.',
    diagnosticResult: 'Broken pad underneath Audio IC U4900 due to frame torsion drop.',
    lineItems: [
      { id: 'li-618-1', description: 'Level 3 Micro-Soldering: Audio Codec IC Reball & Micro-Jumper', unitCost: 5000, unitPrice: 290000, quantity: 1, isLabor: true }
    ],
    subtotal: 290000, depositAmount: 0, discountAmount: 30000, taxAmount: 0, totalAmount: 260000,
    isPaid: true, paymentMethod: 'Net 30', warrantyDays: 90, intakePhotos: [],
    createdAt: '2026-06-18T09:30:00Z', updatedAt: '2026-06-19T12:00:00Z', estimatedCompletion: '2026-06-19T17:00:00Z'
  },
  {
    id: 'wo-100f',
    orderNumber: 'WO-2026-0625',
    customerId: 'cust-2',
    customerName: 'Apex Creative Tech Solutions',
    customerPhone: '(555) 888-1212',
    customerEmail: 'it@apexcreative.io',
    customerType: 'B2B Corporate',
    deviceCategory: 'iMac',
    deviceModel: 'iMac 24" (M3, 2023)',
    serialNumber: 'C02K90182711',
    deviceColor: 'Blue',
    passcode: 'apex2026!',
    findMyStatus: 'OFF',
    status: 'Finished',
    priority: 'Urgent',
    assignedTechId: 'tech-2',
    assignedTechName: 'Kyaw Swar Lin',
    serviceType: 'Standard Modular',
    repairLogs: [
      { id: 'log-625-1', timestamp: 'Jun 25, 2026 08:30 AM', author: 'Kyaw Swar Lin', note: 'iMac 24 received from creative studio.', statusChange: 'Receive' },
      { id: 'log-625-2', timestamp: 'Jun 26, 2026 11:00 AM', author: 'Kyaw Swar Lin', note: 'Power supply board replaced and stress tested.', statusChange: 'Finished' }
    ],
    intakeChecklist: {
      powerOn: false, screenDisplay: false, touchGrid: true, faceIdOrTouchId: true, trueTonePresent: true,
      frontCamera: true, rearCamera: true, microphones: true, speakers: true, wifiBluetooth: true,
      cellularSignal: true, wirelessCharging: false, liquidIndicatorTriggered: false, batteryHealthPercent: 100,
      physicalDamageNotes: 'Power surge in studio during thunderstorm.'
    },
    symptomsReported: 'Unit completely dead, power button yields no LED or fan turn.',
    diagnosticResult: 'Internal AC-DC power supply board fuse blown from grid surge.',
    lineItems: [
      { id: 'li-625-1', description: 'iMac 24" Internal OEM Power Supply Board', unitCost: 85000, unitPrice: 200000, quantity: 1, isLabor: false },
      { id: 'li-625-2', description: 'Labor: iMac Screen Removal & Component Service', unitCost: 0, unitPrice: 150000, quantity: 1, isLabor: true }
    ],
    subtotal: 350000, depositAmount: 100000, discountAmount: 30000, taxAmount: 0, totalAmount: 320000,
    isPaid: true, paymentMethod: 'Credit Card', warrantyDays: 365, intakePhotos: [],
    createdAt: '2026-06-25T08:30:00Z', updatedAt: '2026-06-26T11:00:00Z', estimatedCompletion: '2026-06-26T16:00:00Z'
  },

  // --- JULY 2026 TICKETS ---
  {
    id: 'wo-101',
    orderNumber: 'WO-2026-1001',
    customerId: 'cust-1',
    customerName: 'Sarah Jenkins',
    customerPhone: '(555) 234-5678',
    customerEmail: 'sarah.j@gmail.com',
    customerType: 'Retail',
    deviceCategory: 'iPhone',
    deviceModel: 'iPhone 14 Pro Max',
    serialNumber: 'F2LXK09PN6T',
    imei: '358921102938102',
    deviceColor: 'Deep Purple',
    passcode: '882190',
    findMyStatus: 'OFF',
    status: 'In Progress',
    priority: 'Normal',
    assignedTechId: 'tech-2',
    assignedTechName: 'Kyaw Swar Lin',
    serviceType: 'Standard Modular',
    repairLogs: [
      { id: 'log-101-1', timestamp: 'Jul 21, 2026 2:20 PM', author: 'Kyaw Swar Lin', note: 'Ticket created & received from customer Sarah Jenkins.', statusChange: 'Receive' },
      { id: 'log-101-2', timestamp: 'Jul 22, 2026 8:00 AM', author: 'Kyaw Swar Lin', note: 'Began screen disassembly and TrueTone transfer.', statusChange: 'In Progress' }
    ],
    intakeChecklist: {
      powerOn: true, screenDisplay: true, touchGrid: false, faceIdOrTouchId: true, trueTonePresent: true,
      frontCamera: true, rearCamera: true, microphones: true, speakers: true, wifiBluetooth: true,
      cellularSignal: true, wirelessCharging: true, liquidIndicatorTriggered: false, batteryHealthPercent: 88,
      physicalDamageNotes: 'Cracked screen glass, upper right quadrant unresponsive to touch.'
    },
    symptomsReported: 'Dropped phone on sidewalk. Screen glass shattered and touch function failing on top portion.',
    diagnosticResult: 'Display assembly shattered, digitizer damaged. Internal chassis and logic board undamaged.',
    lineItems: [
      { id: 'li-1', description: 'iPhone 14 Pro Max Super Retina XDR OLED Assembly (OEM Original)', partId: 'part-101', partName: 'iPhone 14 Pro Max Display', partQuality: 'OEM Original Pulled', unitCost: 195000, unitPrice: 240000, quantity: 1, isLabor: false },
      { id: 'li-2', description: 'Labor: OLED Replacement & TrueTone EEPROM Programmer Transfer', unitCost: 0, unitPrice: 80000, quantity: 1, isLabor: true }
    ],
    subtotal: 320000, depositAmount: 100000, discountAmount: 0, taxAmount: 0, totalAmount: 320000,
    isPaid: false, warrantyDays: 365, intakePhotos: ['https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=400&q=80'],
    createdAt: '2026-07-21T14:20:00Z', updatedAt: '2026-07-22T08:00:00Z', estimatedCompletion: '2026-07-22T17:00:00Z'
  },
  {
    id: 'wo-102',
    orderNumber: 'WO-2026-1002',
    customerId: 'cust-3',
    customerName: 'Bay Area Mobile Mail-In',
    customerPhone: '(555) 777-9900',
    customerEmail: 'wholesale@bayrepairs.com',
    customerType: 'Wholesale Mail-In',
    deviceCategory: 'iPhone',
    deviceModel: 'iPhone 13 Pro',
    serialNumber: 'DN6FT2010L',
    imei: '354091192834190',
    deviceColor: 'Sierra Blue',
    passcode: '000000',
    findMyStatus: 'OFF',
    status: 'Receive',
    priority: 'B2B Priority',
    assignedTechId: 'tech-1',
    assignedTechName: 'Aung Ko Ko',
    serviceType: 'Micro-Soldering',
    repairLogs: [
      { id: 'log-102-1', timestamp: 'Jul 20, 2026 11:00 AM', author: 'Aung Ko Ko', note: 'Wholesale mail-in board received in shop. Pending diagnostic.', statusChange: 'Receive' }
    ],
    intakeChecklist: {
      powerOn: false, screenDisplay: false, touchGrid: false, faceIdOrTouchId: true, trueTonePresent: true,
      frontCamera: true, rearCamera: true, microphones: true, speakers: true, wifiBluetooth: true,
      cellularSignal: true, wirelessCharging: false, liquidIndicatorTriggered: true, batteryHealthPercent: 91,
      physicalDamageNotes: 'Wholesale mail-in board repair. Liquid exposure near charger port.'
    },
    symptomsReported: 'No power, consumes 0.000A on DC Power Supply. iTunes error 4013 when forced into DFU mode.',
    microSolderingLog: {
      boardModel: 'iPhone 13 Pro Logic Board (820-02210)',
      diodeReadings: [
        { lineName: 'PP_VCC_MAIN', expectedValue: '0.380V', actualValue: '0.002V', status: 'FAIL' },
        { lineName: 'PP_VDD_BOOST', expectedValue: '0.410V', actualValue: '0.408V', status: 'PASS' }
      ],
      thermalNotes: 'Thermal camera shows localized hotspot (112°C) at capacitor C3010 near Hydra USB IC.',
      icReplaced: ['Decoupling Capacitor C3010', 'Hydra USB Controller U2'],
      schematicTags: ['PP_VCC_MAIN', 'C3010', 'U2_HYDRA'],
      multimeterDiodeShortFound: true,
    },
    lineItems: [
      { id: 'li-3', description: 'Level 3 Micro-Soldering: PP_VCC_MAIN Short Removal & Hydra USB IC Replacement', unitCost: 8500, unitPrice: 260000, quantity: 1, isLabor: true }
    ],
    subtotal: 260000, depositAmount: 0, discountAmount: 30000, taxAmount: 0, totalAmount: 230000,
    isPaid: false, warrantyDays: 90, intakePhotos: [],
    createdAt: '2026-07-20T11:00:00Z', updatedAt: '2026-07-22T06:30:00Z', estimatedCompletion: '2026-07-23T12:00:00Z'
  },
  {
    id: 'wo-103',
    orderNumber: 'WO-2026-1003',
    customerId: 'cust-2',
    customerName: 'Apex Creative Tech Solutions',
    customerPhone: '(555) 888-1212',
    customerEmail: 'it@apexcreative.io',
    customerType: 'B2B Corporate',
    deviceCategory: 'MacBook',
    deviceModel: 'MacBook Pro 16" (M2 Max, 2023)',
    serialNumber: 'C02G8281Q051',
    deviceColor: 'Space Gray',
    passcode: 'apex2026!',
    findMyStatus: 'OFF',
    status: 'Finished',
    priority: 'Urgent',
    assignedTechId: 'tech-2',
    assignedTechName: 'Kyaw Swar Lin',
    serviceType: 'Standard Modular',
    repairLogs: [
      { id: 'log-103-1', timestamp: 'Jul 19, 2026 9:00 AM', author: 'Kyaw Swar Lin', note: 'MacBook Pro received. Screen replacement needed.', statusChange: 'Receive' },
      { id: 'log-103-2', timestamp: 'Jul 22, 2026 5:00 AM', author: 'Kyaw Swar Lin', note: 'Display replaced and QA verification passed successfully.', statusChange: 'Finished' }
    ],
    intakeChecklist: {
      powerOn: true, screenDisplay: false, touchGrid: true, faceIdOrTouchId: true, trueTonePresent: true,
      frontCamera: true, rearCamera: true, microphones: true, speakers: true, wifiBluetooth: true,
      cellularSignal: true, wirelessCharging: true, liquidIndicatorTriggered: false, batteryHealthPercent: 94,
      physicalDamageNotes: 'Lid pinched on pen. Outer shell pristine, inner LCD panel spiderweb fracture.'
    },
    symptomsReported: 'Cracked internal Liquid Retina display. External Monitor works fine via HDMI.',
    diagnosticResult: 'Display panel replacement required. Logic board & Lid sensors tested normal.',
    postRepairChecklist: {
      trueToneTransferred: true, displayNoMessageWarning: true, batteryHealthVerified: true, cameraOisFunctional: true,
      proximitySensorWorking: true, speakerClarityPass: true, enclosureAlignmentPass: true, cleanAndSanitized: true,
      qaTechnicianId: 'tech-1', notes: 'Lid closure sensor calibrated, TrueTone active, Lid angle sensor tested 100%.'
    },
    lineItems: [
      { id: 'li-4', description: 'MacBook Pro 16" Liquid Retina XDR Display Assembly (OEM Original)', partId: 'part-107', partName: 'MacBook Pro 16" Display Assembly', partQuality: 'OEM Original Pulled', unitCost: 200000, unitPrice: 350000, quantity: 1, isLabor: false },
      { id: 'li-5', description: 'Labor: MacBook Pro Display Replacement & Lid Sensor Calibration', unitCost: 0, unitPrice: 100000, quantity: 1, isLabor: true }
    ],
    subtotal: 450000, depositAmount: 100000, discountAmount: 30000, taxAmount: 0, totalAmount: 420000,
    isPaid: true, paymentMethod: 'Credit Card', warrantyDays: 365, intakePhotos: [],
    createdAt: '2026-07-19T09:00:00Z', updatedAt: '2026-07-22T05:00:00Z', estimatedCompletion: '2026-07-21T18:00:00Z'
  },
  {
    id: 'wo-104',
    orderNumber: 'WO-2026-1004',
    customerId: 'cust-4',
    customerName: 'Michael Chang',
    customerPhone: '(555) 432-1098',
    customerEmail: 'm.chang@techcorp.com',
    customerType: 'Retail',
    deviceCategory: 'iPhone',
    deviceModel: 'iPhone 13',
    serialNumber: 'F2L01928301',
    imei: '350192837482910',
    deviceColor: 'Starlight',
    passcode: '112233',
    findMyStatus: 'OFF',
    status: 'Pending',
    priority: 'Normal',
    assignedTechId: 'tech-3',
    assignedTechName: 'Thura Aung',
    serviceType: 'Standard Modular',
    repairLogs: [
      { id: 'log-104-1', timestamp: 'Jul 22, 2026 07:15 AM', author: 'Thura Aung', note: 'Customer waiting for OEM battery stock order.', statusChange: 'Pending' }
    ],
    intakeChecklist: {
      powerOn: true, screenDisplay: true, touchGrid: true, faceIdOrTouchId: true, trueTonePresent: true,
      frontCamera: true, rearCamera: true, microphones: true, speakers: true, wifiBluetooth: true,
      cellularSignal: true, wirelessCharging: true, liquidIndicatorTriggered: false, batteryHealthPercent: 78,
      physicalDamageNotes: 'Battery health degraded message in iOS settings.'
    },
    symptomsReported: 'Battery drains quickly and phone gets hot during FaceTime.',
    lineItems: [
      { id: 'li-6', description: 'iPhone 13 High-Capacity Battery Pack', partId: 'part-103', partName: 'iPhone 13 Battery', partQuality: 'Refurbished Grade A', unitCost: 22000, unitPrice: 150000, quantity: 1, isLabor: false },
      { id: 'li-7', description: 'Labor: Battery Replacement & BMS Spot Weld Calibration', unitCost: 0, unitPrice: 60000, quantity: 1, isLabor: true }
    ],
    subtotal: 210000, depositAmount: 30000, discountAmount: 0, taxAmount: 0, totalAmount: 210000,
    isPaid: false, warrantyDays: 180, intakePhotos: [],
    createdAt: '2026-07-22T07:15:00Z', updatedAt: '2026-07-22T08:00:00Z', estimatedCompletion: '2026-07-23T14:00:00Z'
  },
  {
    id: 'wo-105',
    orderNumber: 'WO-2026-1005',
    customerId: 'cust-1',
    customerName: 'Sarah Jenkins',
    customerPhone: '(555) 234-5678',
    customerEmail: 'sarah.j@example.com',
    customerType: 'Retail',
    deviceCategory: 'iPhone',
    deviceModel: 'iPhone 14',
    serialNumber: 'R5CW30921XX',
    imei: '358910293847192',
    deviceColor: 'Midnight',
    passcode: '2468',
    findMyStatus: 'OFF',
    status: 'In Progress',
    priority: 'Normal',
    assignedTechId: 'tech-3',
    assignedTechName: 'Thura Aung',
    serviceType: 'Standard Modular',
    repairLogs: [
      { id: 'log-105-1', timestamp: 'Jul 23, 2026 10:00 AM', author: 'Thura Aung', note: 'Lightning port flex cable replacement initiated.', statusChange: 'In Progress' }
    ],
    intakeChecklist: {
      powerOn: true, screenDisplay: true, touchGrid: true, faceIdOrTouchId: true, trueTonePresent: true,
      frontCamera: true, rearCamera: true, microphones: true, speakers: true, wifiBluetooth: true,
      cellularSignal: true, wirelessCharging: true, liquidIndicatorTriggered: false, batteryHealthPercent: 92,
      physicalDamageNotes: 'Wobbly Lightning connector. Slow charging or intermittent contact.'
    },
    symptomsReported: 'Phone only charges when cable is held at an upward angle.',
    lineItems: [
      { id: 'li-8', description: 'iPhone 14 OEM Lightning Port Assembly', unitCost: 15000, unitPrice: 140000, quantity: 1, isLabor: false },
      { id: 'li-9', description: 'Labor: Charging Port Assembly Replacement', unitCost: 0, unitPrice: 60000, quantity: 1, isLabor: true }
    ],
    subtotal: 200000, depositAmount: 25000, discountAmount: 0, taxAmount: 0, totalAmount: 200000,
    isPaid: false, warrantyDays: 180, intakePhotos: [],
    createdAt: '2026-07-23T10:00:00Z', updatedAt: '2026-07-23T11:00:00Z', estimatedCompletion: '2026-07-24T16:00:00Z'
  },
  {
    id: 'wo-106',
    orderNumber: 'WO-2026-1006',
    customerId: 'cust-2',
    customerName: 'Apex Creative Tech Solutions',
    customerPhone: '(555) 888-1212',
    customerEmail: 'it@apexcreative.io',
    customerType: 'B2B Corporate',
    deviceCategory: 'iPad',
    deviceModel: 'iPad Pro 12.9" (M2, 2022)',
    serialNumber: 'DNP78291039',
    deviceColor: 'Space Gray',
    passcode: '0000',
    findMyStatus: 'OFF',
    status: 'Receive',
    priority: 'Normal',
    assignedTechId: 'tech-1',
    assignedTechName: 'Aung Ko Ko',
    serviceType: 'Standard Modular',
    repairLogs: [
      { id: 'log-106-1', timestamp: 'Jul 23, 2026 01:30 PM', author: 'Aung Ko Ko', note: 'iPad received from corporate client. Outer glass cracked.', statusChange: 'Receive' }
    ],
    intakeChecklist: {
      powerOn: true, screenDisplay: true, touchGrid: true, faceIdOrTouchId: true, trueTonePresent: true,
      frontCamera: true, rearCamera: true, microphones: true, speakers: true, wifiBluetooth: true,
      cellularSignal: true, wirelessCharging: true, liquidIndicatorTriggered: false, batteryHealthPercent: 96,
      physicalDamageNotes: 'Front touch glass cracked in bottom left corner.'
    },
    symptomsReported: 'Accidental drop in studio. LCD intact, outer glass cracked.',
    lineItems: [
      { id: 'li-10', description: 'iPad Pro 12.9" M2 Display Assembly (Original Pulled)', unitCost: 180000, unitPrice: 260000, quantity: 1, isLabor: false },
      { id: 'li-11', description: 'Labor: iPad Glass & Display Panel Replacement', unitCost: 0, unitPrice: 100000, quantity: 1, isLabor: true }
    ],
    subtotal: 360000, depositAmount: 100000, discountAmount: 30000, taxAmount: 0, totalAmount: 330000,
    isPaid: false, warrantyDays: 180, intakePhotos: [],
    createdAt: '2026-07-23T13:30:00Z', updatedAt: '2026-07-23T13:30:00Z', estimatedCompletion: '2026-07-25T12:00:00Z'
  },
  {
    id: 'wo-107',
    orderNumber: 'WO-2026-1007',
    customerId: 'cust-4',
    customerName: 'Michael Chang',
    customerPhone: '(555) 432-1098',
    customerEmail: 'm.chang@techcorp.com',
    customerType: 'Retail',
    deviceCategory: 'AppleWatch',
    deviceModel: 'Apple Watch Series 8 (45mm)',
    serialNumber: 'GY6C920192',
    deviceColor: 'Midnight',
    passcode: '1234',
    findMyStatus: 'OFF',
    status: 'Finished',
    priority: 'Normal',
    assignedTechId: 'tech-2',
    assignedTechName: 'Kyaw Swar Lin',
    serviceType: 'Standard Modular',
    repairLogs: [
      { id: 'log-107-1', timestamp: 'Jul 21, 2026 10:00 AM', author: 'Kyaw Swar Lin', note: 'New battery installed, gasket re-sealed.', statusChange: 'Finished' }
    ],
    intakeChecklist: {
      powerOn: true, screenDisplay: true, touchGrid: true, faceIdOrTouchId: true, trueTonePresent: true,
      frontCamera: true, rearCamera: true, microphones: true, speakers: true, wifiBluetooth: true,
      cellularSignal: true, wirelessCharging: true, liquidIndicatorTriggered: false, batteryHealthPercent: 74,
      physicalDamageNotes: 'Battery health down to 74%. Normal cosmetic wear.'
    },
    symptomsReported: 'Watch dies before end of workday.',
    lineItems: [
      { id: 'li-12', description: 'Apple Watch Series 8 45mm Battery Replacement', unitCost: 12000, unitPrice: 120000, quantity: 1, isLabor: false },
      { id: 'li-13', description: 'Labor: Watch Disassembly, Sealing & Pressure Test', unitCost: 0, unitPrice: 80000, quantity: 1, isLabor: true }
    ],
    subtotal: 200000, depositAmount: 20000, discountAmount: 0, taxAmount: 0, totalAmount: 200000,
    isPaid: true, paymentMethod: 'Cash', warrantyDays: 180, intakePhotos: [],
    createdAt: '2026-07-21T10:00:00Z', updatedAt: '2026-07-22T14:00:00Z', estimatedCompletion: '2026-07-22T16:00:00Z'
  },
  {
    id: 'wo-108',
    orderNumber: 'WO-2026-1008',
    customerId: 'cust-1',
    customerName: 'Sarah Jenkins',
    customerPhone: '(555) 234-5678',
    customerEmail: 'sarah.j@example.com',
    customerType: 'Retail',
    deviceCategory: 'iPhone',
    deviceModel: 'iPhone 15 Pro',
    serialNumber: '3A291039201',
    imei: '359102938475819',
    deviceColor: 'Blue Titanium',
    passcode: '9876',
    findMyStatus: 'OFF',
    status: 'Pending',
    priority: 'Normal',
    assignedTechId: 'tech-3',
    assignedTechName: 'Thura Aung',
    serviceType: 'Standard Modular',
    repairLogs: [
      { id: 'log-108-1', timestamp: 'Jul 23, 2026 03:00 PM', author: 'Thura Aung', note: 'Awaiting rear camera glass module delivery.', statusChange: 'Pending' }
    ],
    intakeChecklist: {
      powerOn: true, screenDisplay: true, touchGrid: true, faceIdOrTouchId: true, trueTonePresent: true,
      frontCamera: true, rearCamera: false, microphones: true, speakers: true, wifiBluetooth: true,
      cellularSignal: true, wirelessCharging: true, liquidIndicatorTriggered: false, batteryHealthPercent: 95,
      physicalDamageNotes: 'Rear camera lens glass shattered over telephoto camera.'
    },
    symptomsReported: 'Telephoto camera photos are blurry due to broken protective glass.',
    lineItems: [
      { id: 'li-14', description: 'iPhone 15 Pro Camera Lens Glass Cover', unitCost: 8000, unitPrice: 120000, quantity: 1, isLabor: false },
      { id: 'li-15', description: 'Labor: Rear Camera Glass & Dust Cleanup', unitCost: 0, unitPrice: 100000, quantity: 1, isLabor: true }
    ],
    subtotal: 220000, depositAmount: 20000, discountAmount: 0, taxAmount: 0, totalAmount: 220000,
    isPaid: false, warrantyDays: 90, intakePhotos: [],
    createdAt: '2026-07-23T15:00:00Z', updatedAt: '2026-07-23T15:30:00Z', estimatedCompletion: '2026-07-25T11:00:00Z'
  },
  {
    id: 'wo-109',
    orderNumber: 'WO-2026-1009',
    customerId: 'cust-3',
    customerName: 'Bay Area Mobile Mail-In',
    customerPhone: '(555) 777-9900',
    customerEmail: 'wholesale@bayrepairs.com',
    customerType: 'Wholesale Mail-In',
    deviceCategory: 'MacBook',
    deviceModel: 'MacBook Air 13" (M2, 2022)',
    serialNumber: 'C02HL920193',
    deviceColor: 'Starlight',
    passcode: '0000',
    findMyStatus: 'OFF',
    status: 'In Progress',
    priority: 'B2B Priority',
    assignedTechId: 'tech-1',
    assignedTechName: 'Aung Ko Ko',
    serviceType: 'Micro-Soldering',
    repairLogs: [
      { id: 'log-109-1', timestamp: 'Jul 24, 2026 08:30 AM', author: 'Aung Ko Ko', note: 'Ultrasonic cleaning of trackpad connector completed.', statusChange: 'In Progress' }
    ],
    intakeChecklist: {
      powerOn: true, screenDisplay: true, touchGrid: true, faceIdOrTouchId: true, trueTonePresent: true,
      frontCamera: true, rearCamera: true, microphones: true, speakers: true, wifiBluetooth: true,
      cellularSignal: true, wirelessCharging: true, liquidIndicatorTriggered: true, batteryHealthPercent: 90,
      physicalDamageNotes: 'Coffee spill around trackpad and lower keyboard row.'
    },
    symptomsReported: 'Trackpad click unreliable, keys sticky after coffee spill.',
    lineItems: [
      { id: 'li-16', description: 'MacBook Air M2 OEM Keyboard & Trackpad Flex Assembly', unitCost: 45000, unitPrice: 150000, quantity: 1, isLabor: false },
      { id: 'li-17', description: 'Labor: Ultrasonic Board Decontamination & Top Case Service', unitCost: 0, unitPrice: 130000, quantity: 1, isLabor: true }
    ],
    subtotal: 280000, depositAmount: 50000, discountAmount: 30000, taxAmount: 0, totalAmount: 250000,
    isPaid: false, warrantyDays: 180, intakePhotos: [],
    createdAt: '2026-07-24T08:30:00Z', updatedAt: '2026-07-24T09:00:00Z', estimatedCompletion: '2026-07-25T17:00:00Z'
  },
  {
    id: 'wo-110',
    orderNumber: 'WO-2026-1010',
    customerId: 'cust-4',
    customerName: 'Michael Chang',
    customerPhone: '(555) 432-1098',
    customerEmail: 'm.chang@techcorp.com',
    customerType: 'Retail',
    deviceCategory: 'iPhone',
    deviceModel: 'iPhone 15 Pro',
    serialNumber: 'G6TN9201934',
    imei: '350192837492810',
    deviceColor: 'Natural Titanium',
    passcode: '151515',
    findMyStatus: 'OFF',
    status: 'Finished',
    priority: 'Normal',
    assignedTechId: 'tech-2',
    assignedTechName: 'Kyaw Swar Lin',
    serviceType: 'Standard Modular',
    repairLogs: [
      { id: 'log-110-1', timestamp: 'Jul 18, 2026 11:00 AM', author: 'Kyaw Swar Lin', note: 'Back glass replaced, ticket completed.', statusChange: 'Finished' }
    ],
    intakeChecklist: {
      powerOn: true, screenDisplay: true, touchGrid: true, faceIdOrTouchId: true, trueTonePresent: true,
      frontCamera: true, rearCamera: true, microphones: true, speakers: true, wifiBluetooth: true,
      cellularSignal: true, wirelessCharging: true, liquidIndicatorTriggered: false, batteryHealthPercent: 99,
      physicalDamageNotes: 'Back glass spiderweb shattered.'
    },
    symptomsReported: 'Back glass cracked from key bump.',
    lineItems: [
      { id: 'li-18', description: 'iPhone 15 Pro OEM Back Glass Panel (Natural Titanium)', unitCost: 35000, unitPrice: 160000, quantity: 1, isLabor: false },
      { id: 'li-19', description: 'Labor: Back Glass Removal & MagSafe Housing Calibration', unitCost: 0, unitPrice: 90000, quantity: 1, isLabor: true }
    ],
    subtotal: 250000, depositAmount: 50000, discountAmount: 0, taxAmount: 0, totalAmount: 250000,
    isPaid: true, paymentMethod: 'Cash', warrantyDays: 180, intakePhotos: [],
    createdAt: '2026-07-18T11:00:00Z', updatedAt: '2026-07-19T16:00:00Z', estimatedCompletion: '2026-07-19T12:00:00Z'
  },
  {
    id: 'wo-111',
    orderNumber: 'WO-2026-1011',
    customerId: 'cust-1',
    customerName: 'Sarah Jenkins',
    customerPhone: '(555) 234-5678',
    customerEmail: 'sarah.j@gmail.com',
    customerType: 'Retail',
    deviceCategory: 'iPhone',
    deviceModel: 'iPhone 16 Pro Max',
    serialNumber: 'X92MKL0192A',
    imei: '359123019283741',
    deviceColor: 'Desert Titanium',
    passcode: '000000',
    findMyStatus: 'OFF',
    status: 'In Progress',
    priority: 'Urgent',
    assignedTechId: 'tech-1',
    assignedTechName: 'Aung Ko Ko',
    serviceType: 'Standard Modular',
    repairLogs: [
      { id: 'log-111-1', timestamp: 'Jul 24, 2026 09:15 AM', author: 'Aung Ko Ko', note: 'Logged ticket for screen replacement.', statusChange: 'Receive' },
      { id: 'log-111-2', timestamp: 'Jul 24, 2026 10:00 AM', author: 'Aung Ko Ko', note: 'Disassembly started under thermal pad.', statusChange: 'In Progress' }
    ],
    intakeChecklist: {
      powerOn: true, screenDisplay: false, touchGrid: false, faceIdOrTouchId: true, trueTonePresent: true,
      frontCamera: true, rearCamera: true, microphones: true, speakers: true, wifiBluetooth: true,
      cellularSignal: true, wirelessCharging: true, liquidIndicatorTriggered: false, batteryHealthPercent: 98,
      physicalDamageNotes: 'OLED screen blacked out after severe dropped impact.'
    },
    symptomsReported: 'Display stays black, phone vibrates when charged.',
    diagnosticResult: 'OLED panel shattered internally. Touch digitization failure.',
    lineItems: [
      { id: 'li-111-1', description: 'iPhone 16 Pro Max Original OLED Display Assembly', unitCost: 160000, unitPrice: 220000, quantity: 1, isLabor: false },
      { id: 'li-111-2', description: 'Labor: TrueTone Programming & Water Seal Re-application', unitCost: 0, unitPrice: 80000, quantity: 1, isLabor: true }
    ],
    subtotal: 300000, depositAmount: 100000, discountAmount: 20000, taxAmount: 0, totalAmount: 280000,
    isPaid: false, warrantyDays: 180, intakePhotos: [],
    createdAt: '2026-07-24T09:15:00Z', updatedAt: '2026-07-24T10:00:00Z', estimatedCompletion: '2026-07-24T15:00:00Z'
  },
  {
    id: 'wo-112',
    orderNumber: 'WO-2026-1012',
    customerId: 'cust-2',
    customerName: 'David Miller',
    customerPhone: '(555) 876-5432',
    customerEmail: 'd.miller@apex.io',
    customerType: 'B2B Corporate',
    deviceCategory: 'MacBook',
    deviceModel: 'MacBook Pro 16" M3 Max',
    serialNumber: 'C02G8109Q1M',
    imei: '',
    deviceColor: 'Space Black',
    passcode: '889900',
    findMyStatus: 'OFF',
    status: 'Pending',
    priority: 'Normal',
    assignedTechId: 'tech-3',
    assignedTechName: 'Thura Aung',
    serviceType: 'Micro-Soldering',
    repairLogs: [
      { id: 'log-112-1', timestamp: 'Jul 23, 2026 02:00 PM', author: 'Thura Aung', note: 'No power consumption on USB-C Port 1.', statusChange: 'In Progress' },
      { id: 'log-112-2', timestamp: 'Jul 24, 2026 08:30 AM', author: 'Thura Aung', note: 'CD3217 Power Delivery Controller IC ordered.', statusChange: 'Pending' }
    ],
    intakeChecklist: {
      powerOn: false, screenDisplay: false, touchGrid: false, faceIdOrTouchId: false, trueTonePresent: false,
      frontCamera: false, rearCamera: false, microphones: false, speakers: false, wifiBluetooth: false,
      cellularSignal: false, wirelessCharging: false, liquidIndicatorTriggered: false, batteryHealthPercent: 94,
      physicalDamageNotes: 'No physical damage visible, power surge during thunder storm.'
    },
    symptomsReported: 'Will not turn on or charge from MagSafe 3 or USB-C.',
    diagnosticResult: 'Blown USB-C PD Controller IC (CD3217) shorted to ground.',
    lineItems: [
      { id: 'li-112-1', description: 'CD3217 USB-C Power Controller IC Chipset', unitCost: 12000, unitPrice: 90000, quantity: 2, isLabor: false },
      { id: 'li-112-2', description: 'Labor: BGA Chip Rework & Logic Board Ultrasonic Wash', unitCost: 0, unitPrice: 200000, quantity: 1, isLabor: true }
    ],
    subtotal: 290000, depositAmount: 100000, discountAmount: 0, taxAmount: 0, totalAmount: 290000,
    isPaid: false, warrantyDays: 180, intakePhotos: [],
    createdAt: '2026-07-24T14:00:00Z', updatedAt: '2026-07-24T15:30:00Z', estimatedCompletion: '2026-07-26T17:00:00Z'
  },
  {
    id: 'wo-113',
    orderNumber: 'WO-2026-1013',
    customerId: 'cust-3',
    customerName: 'Amanda Croft',
    customerPhone: '(555) 345-6789',
    customerEmail: 'amanda.c@designco.com',
    customerType: 'Retail',
    deviceCategory: 'iPad',
    deviceModel: 'iPad Pro 13" M4',
    serialNumber: 'DMPZK810291',
    imei: '351293810293847',
    deviceColor: 'Space Black',
    passcode: '111111',
    findMyStatus: 'OFF',
    status: 'Receive',
    priority: 'Normal',
    assignedTechId: 'tech-2',
    assignedTechName: 'Kyaw Swar Lin',
    serviceType: 'Standard Modular',
    repairLogs: [
      { id: 'log-113-1', timestamp: 'Jul 24, 2026 10:30 AM', author: 'Kyaw Swar Lin', note: 'Customer dropped off iPad for battery replacement.', statusChange: 'Receive' }
    ],
    intakeChecklist: {
      powerOn: true, screenDisplay: true, touchGrid: true, faceIdOrTouchId: true, trueTonePresent: true,
      frontCamera: true, rearCamera: true, microphones: true, speakers: true, wifiBluetooth: true,
      cellularSignal: true, wirelessCharging: true, liquidIndicatorTriggered: false, batteryHealthPercent: 74,
      physicalDamageNotes: 'Battery swollen slightly pushing screen up on right side.'
    },
    symptomsReported: 'Battery drains fast, tablet gets warm during Apple Pencil charging.',
    diagnosticResult: 'Degraded battery cell with swelling. Immediate swap required.',
    lineItems: [
      { id: 'li-113-1', description: 'iPad Pro 13" M4 High Capacity OEM Battery Cell', unitCost: 55000, unitPrice: 150000, quantity: 1, isLabor: false },
      { id: 'li-113-2', description: 'Labor: Screen Separation & Thermal Glue Removal', unitCost: 0, unitPrice: 90000, quantity: 1, isLabor: true }
    ],
    subtotal: 240000, depositAmount: 40000, discountAmount: 10000, taxAmount: 0, totalAmount: 230000,
    isPaid: false, warrantyDays: 180, intakePhotos: [],
    createdAt: '2026-07-24T10:30:00Z', updatedAt: '2026-07-24T10:30:00Z', estimatedCompletion: '2026-07-25T14:00:00Z'
  },
  {
    id: 'wo-114',
    orderNumber: 'WO-2026-1014',
    customerId: 'cust-4',
    customerName: 'Michael Chang',
    customerPhone: '(555) 432-1098',
    customerEmail: 'm.chang@techcorp.com',
    customerType: 'Retail',
    deviceCategory: 'AppleWatch',
    deviceModel: 'Apple Watch Ultra 2',
    serialNumber: 'H78LK901928',
    imei: '350912384910293',
    deviceColor: 'Titanium',
    passcode: '9988',
    findMyStatus: 'OFF',
    status: 'Finished',
    priority: 'Normal',
    assignedTechId: 'tech-1',
    assignedTechName: 'Aung Ko Ko',
    serviceType: 'Standard Modular',
    repairLogs: [
      { id: 'log-114-1', timestamp: 'Jul 22, 2026 11:00 AM', author: 'Aung Ko Ko', note: 'Sapphire crystal glass replacement started.', statusChange: 'In Progress' },
      { id: 'log-114-2', timestamp: 'Jul 23, 2026 03:00 PM', author: 'Aung Ko Ko', note: 'Waterproofing pressure test passed 100m. Finished.', statusChange: 'Finished' }
    ],
    intakeChecklist: {
      powerOn: true, screenDisplay: true, touchGrid: true, faceIdOrTouchId: true, trueTonePresent: true,
      frontCamera: false, rearCamera: false, microphones: true, speakers: true, wifiBluetooth: true,
      cellularSignal: true, wirelessCharging: true, liquidIndicatorTriggered: false, batteryHealthPercent: 95,
      physicalDamageNotes: 'Deep gouge on titanium bezel corner.'
    },
    symptomsReported: 'Cracked screen glass after mountain biking fall.',
    diagnosticResult: 'Sapphire glass cracked. Touch & Digital Crown functional.',
    lineItems: [
      { id: 'li-114-1', description: 'Apple Watch Ultra 2 Sapphire Glass Screen Assembly', unitCost: 70000, unitPrice: 170000, quantity: 1, isLabor: false },
      { id: 'li-114-2', description: 'Labor: Gasket Seal & Pressure Test Calibration', unitCost: 0, unitPrice: 80000, quantity: 1, isLabor: true }
    ],
    subtotal: 250000, depositAmount: 50000, discountAmount: 0, taxAmount: 0, totalAmount: 250000,
    isPaid: true, paymentMethod: 'Credit Card', warrantyDays: 180, intakePhotos: [],
    createdAt: '2026-07-24T11:00:00Z', updatedAt: '2026-07-24T15:00:00Z', estimatedCompletion: '2026-07-24T16:00:00Z'
  },
  {
    id: 'wo-115',
    orderNumber: 'WO-2026-1015',
    customerId: 'cust-5',
    customerName: 'Robert Vance',
    customerPhone: '(555) 987-6543',
    customerEmail: 'rob.vance@vancecool.com',
    customerType: 'Retail',
    deviceCategory: 'iPhone',
    deviceModel: 'iPhone 15',
    serialNumber: 'K90X1029384',
    imei: '358910293847102',
    deviceColor: 'Pink',
    passcode: '2580',
    findMyStatus: 'OFF',
    status: 'In Progress',
    priority: 'Normal',
    assignedTechId: 'tech-2',
    assignedTechName: 'Kyaw Swar Lin',
    serviceType: 'Micro-Soldering',
    repairLogs: [
      { id: 'log-115-1', timestamp: 'Jul 24, 2026 08:00 AM', author: 'Kyaw Swar Lin', note: 'Phone dropped in pool, water damage diagnostic.', statusChange: 'In Progress' }
    ],
    intakeChecklist: {
      powerOn: false, screenDisplay: false, touchGrid: false, faceIdOrTouchId: false, trueTonePresent: false,
      frontCamera: false, rearCamera: false, microphones: false, speakers: false, wifiBluetooth: false,
      cellularSignal: false, wirelessCharging: false, liquidIndicatorTriggered: true, batteryHealthPercent: 91,
      physicalDamageNotes: 'Corrosion visible inside USB-C port.'
    },
    symptomsReported: 'Submerged in swimming pool for 20 minutes, won\'t power on.',
    diagnosticResult: 'Corrosion present on main power rail VDD_MAIN. Ultrasonic wash in progress.',
    lineItems: [
      { id: 'li-115-1', description: 'Ultrasonic Board Cleaning & Chemical Deoxidation', unitCost: 10000, unitPrice: 100000, quantity: 1, isLabor: true },
      { id: 'li-115-2', description: 'iPhone 15 OEM Battery Cell', unitCost: 28000, unitPrice: 120000, quantity: 1, isLabor: false }
    ],
    subtotal: 220000, depositAmount: 30000, discountAmount: 0, taxAmount: 0, totalAmount: 220000,
    isPaid: false, warrantyDays: 90, intakePhotos: [],
    createdAt: '2026-07-24T08:00:00Z', updatedAt: '2026-07-24T09:30:00Z', estimatedCompletion: '2026-07-25T18:00:00Z'
  },
  {
    id: 'wo-116',
    orderNumber: 'WO-2026-1016',
    customerId: 'cust-1',
    customerName: 'Sarah Jenkins',
    customerPhone: '(555) 234-5678',
    customerEmail: 'sarah.j@gmail.com',
    customerType: 'Retail',
    deviceCategory: 'MacBook',
    deviceModel: 'MacBook Air 15" M2',
    serialNumber: 'FVFGK901923',
    imei: '',
    deviceColor: 'Midnight',
    passcode: '654321',
    findMyStatus: 'OFF',
    status: 'In Progress',
    priority: 'Urgent',
    assignedTechId: 'tech-3',
    assignedTechName: 'Thura Aung',
    serviceType: 'Standard Modular',
    repairLogs: [
      { id: 'log-116-1', timestamp: 'Jul 24, 2026 11:00 AM', author: 'Thura Aung', note: 'Replacing cracked Retina Display Panel.', statusChange: 'In Progress' }
    ],
    intakeChecklist: {
      powerOn: true, screenDisplay: false, touchGrid: true, faceIdOrTouchId: true, trueTonePresent: true,
      frontCamera: true, rearCamera: false, microphones: true, speakers: true, wifiBluetooth: true,
      cellularSignal: false, wirelessCharging: false, liquidIndicatorTriggered: false, batteryHealthPercent: 93,
      physicalDamageNotes: 'Screen lid slammed shut on earbud.'
    },
    symptomsReported: 'Internal LCD glass spider-webbed, vertical colorful bars.',
    diagnosticResult: 'LCD matrix destroyed. Aluminum top lid intact.',
    lineItems: [
      { id: 'li-116-1', description: 'MacBook Air 15" M2 OEM Full Screen Assembly (Midnight)', unitCost: 190000, unitPrice: 280000, quantity: 1, isLabor: false },
      { id: 'li-116-2', description: 'Labor: Display Hinge & Lid Installation', unitCost: 0, unitPrice: 90000, quantity: 1, isLabor: true }
    ],
    subtotal: 370000, depositAmount: 100000, discountAmount: 20000, taxAmount: 0, totalAmount: 350000,
    isPaid: false, warrantyDays: 180, intakePhotos: [],
    createdAt: '2026-07-24T11:00:00Z', updatedAt: '2026-07-24T11:30:00Z', estimatedCompletion: '2026-07-24T17:00:00Z'
  },
  {
    id: 'wo-117',
    orderNumber: 'WO-2026-1017',
    customerId: 'cust-2',
    customerName: 'David Miller',
    customerPhone: '(555) 876-5432',
    customerEmail: 'd.miller@apex.io',
    customerType: 'B2B Corporate',
    deviceCategory: 'iPhone',
    deviceModel: 'iPhone 14 Pro',
    serialNumber: 'N89LK091238',
    imei: '357891029384710',
    deviceColor: 'Deep Purple',
    passcode: '432109',
    findMyStatus: 'OFF',
    status: 'Finished',
    priority: 'Normal',
    assignedTechId: 'tech-1',
    assignedTechName: 'Aung Ko Ko',
    serviceType: 'Standard Modular',
    repairLogs: [
      { id: 'log-117-1', timestamp: 'Jul 21, 2026 10:00 AM', author: 'Aung Ko Ko', note: 'Charging port replacement completed.', statusChange: 'Finished' }
    ],
    intakeChecklist: {
      powerOn: true, screenDisplay: true, touchGrid: true, faceIdOrTouchId: true, trueTonePresent: true,
      frontCamera: true, rearCamera: true, microphones: true, speakers: true, wifiBluetooth: true,
      cellularSignal: true, wirelessCharging: true, liquidIndicatorTriggered: false, batteryHealthPercent: 88,
      physicalDamageNotes: 'Lightning port pins corroded.'
    },
    symptomsReported: 'Cable drops out, charges only when held at exact angle.',
    diagnosticResult: 'Lightning flex assembly pins worn down and oxidized.',
    lineItems: [
      { id: 'li-117-1', description: 'iPhone 14 Pro Lightning Charging Port Flex Cable', unitCost: 18000, unitPrice: 140000, quantity: 1, isLabor: false },
      { id: 'li-117-2', description: 'Labor: Bottom Modular Service', unitCost: 0, unitPrice: 70000, quantity: 1, isLabor: true }
    ],
    subtotal: 210000, depositAmount: 30000, discountAmount: 0, taxAmount: 0, totalAmount: 210000,
    isPaid: true, paymentMethod: 'Cash', warrantyDays: 180, intakePhotos: [],
    createdAt: '2026-07-24T10:00:00Z', updatedAt: '2026-07-24T14:00:00Z', estimatedCompletion: '2026-07-24T15:00:00Z'
  },
  {
    id: 'wo-118',
    orderNumber: 'WO-2026-1018',
    customerId: 'cust-3',
    customerName: 'Amanda Croft',
    customerPhone: '(555) 345-6789',
    customerEmail: 'amanda.c@designco.com',
    customerType: 'Retail',
    deviceCategory: 'iMac',
    deviceModel: 'Mac Studio M2 Ultra',
    serialNumber: 'S8019283741',
    imei: '',
    deviceColor: 'Silver',
    passcode: '334455',
    findMyStatus: 'OFF',
    status: 'Pending',
    priority: 'Urgent',
    assignedTechId: 'tech-4',
    assignedTechName: 'Min Htet',
    serviceType: 'Micro-Soldering',
    repairLogs: [
      { id: 'log-118-1', timestamp: 'Jul 23, 2026 04:00 PM', author: 'Min Htet', note: 'Internal PSU fan failure diagnostic.', statusChange: 'Pending' }
    ],
    intakeChecklist: {
      powerOn: true, screenDisplay: true, touchGrid: true, faceIdOrTouchId: true, trueTonePresent: true,
      frontCamera: false, rearCamera: false, microphones: true, speakers: true, wifiBluetooth: true,
      cellularSignal: false, wirelessCharging: false, liquidIndicatorTriggered: false, batteryHealthPercent: 100,
      physicalDamageNotes: 'Dust clogging rear exhaust blower vents.'
    },
    symptomsReported: 'Loud buzzing noise from fan, powers off due to overheating when rendering 8K video.',
    diagnosticResult: 'Dual copper blower fan bearing seized. Replacement blower unit ordered.',
    lineItems: [
      { id: 'li-118-1', description: 'Mac Studio OEM Dual Blower Cooling Assembly', unitCost: 42000, unitPrice: 150000, quantity: 1, isLabor: false },
      { id: 'li-118-2', description: 'Labor: Thermal Paste Replacement & Internal Dusting', unitCost: 0, unitPrice: 100000, quantity: 1, isLabor: true }
    ],
    subtotal: 250000, depositAmount: 50000, discountAmount: 10000, taxAmount: 0, totalAmount: 240000,
    isPaid: false, warrantyDays: 180, intakePhotos: [],
    createdAt: '2026-07-24T16:00:00Z', updatedAt: '2026-07-24T16:30:00Z', estimatedCompletion: '2026-07-27T12:00:00Z'
  },
  {
    id: 'wo-119',
    orderNumber: 'WO-2026-1019',
    customerId: 'cust-1',
    customerName: 'Hlaing Win',
    customerPhone: '+95 9 421 002 991',
    customerEmail: 'hlaingwin@gmail.com',
    customerType: 'Retail',
    deviceCategory: 'iPhone',
    deviceModel: 'iPhone 12 Pro Max',
    serialNumber: 'F2LXK091029',
    imei: '358910291029381',
    deviceColor: 'Pacific Blue',
    passcode: '123456',
    findMyStatus: 'OFF',
    status: 'Taken Out',
    priority: 'Normal',
    assignedTechId: 'tech-1',
    assignedTechName: 'Aung Ko Ko',
    serviceType: 'Standard Modular',
    repairLogs: [
      { id: 'log-119-1', timestamp: 'Jun 14, 2026 10:00 AM', author: 'Aung Ko Ko', note: 'OLED screen & battery replaced.', statusChange: 'Finished' },
      { id: 'log-119-2', timestamp: 'Jun 15, 2026 11:30 AM', author: 'Aung Ko Ko', note: 'Customer picked up device.', statusChange: 'Taken Out' }
    ],
    intakeChecklist: {
      powerOn: true, screenDisplay: false, touchGrid: false, faceIdOrTouchId: true, trueTonePresent: true,
      frontCamera: true, rearCamera: true, microphones: true, speakers: true, wifiBluetooth: true,
      cellularSignal: true, wirelessCharging: true, liquidIndicatorTriggered: false, batteryHealthPercent: 79,
      physicalDamageNotes: 'Screen shattered, battery degraded.'
    },
    postRepairChecklist: {
      trueToneTransferred: true, displayNoMessageWarning: true, batteryHealthVerified: true, cameraOisFunctional: true,
      proximitySensorWorking: true, speakerClarityPass: true, enclosureAlignmentPass: true, cleanAndSanitized: true,
      qaTechnicianId: 'tech-1', notes: 'QA verification passed.'
    },
    symptomsReported: 'Display shattered, battery drains in 3 hours.',
    diagnosticResult: 'Display assembly shattered, battery capacity 79%.',
    lineItems: [
      { id: 'li-119-1', description: 'iPhone 12 Pro Max OLED Screen Assembly', unitCost: 120000, unitPrice: 180000, quantity: 1, isLabor: false },
      { id: 'li-119-2', description: 'iPhone 12 Pro Max OEM Battery', unitCost: 20000, unitPrice: 60000, quantity: 1, isLabor: false }
    ],
    subtotal: 240000, depositAmount: 50000, discountAmount: 0, taxAmount: 0, totalAmount: 240000,
    isPaid: true, paymentMethod: 'Cash', warrantyDays: 180, intakePhotos: [],
    followUpStatus: 'Pending Call',
    createdAt: '2026-06-14T10:00:00Z', updatedAt: '2026-06-15T11:30:00Z', estimatedCompletion: '2026-06-15T10:00:00Z'
  },
  {
    id: 'wo-120',
    orderNumber: 'WO-2026-1020',
    customerId: 'cust-2',
    customerName: 'Khin Zaw',
    customerPhone: '+95 9 250 881 200',
    customerEmail: 'khinzaw@yangontech.com',
    customerType: 'B2B Corporate',
    deviceCategory: 'MacBook',
    deviceModel: 'MacBook Pro 14" M1 Pro',
    serialNumber: 'C02G9012938',
    imei: '',
    deviceColor: 'Space Gray',
    passcode: '0000',
    findMyStatus: 'OFF',
    status: 'Taken Out',
    priority: 'Normal',
    assignedTechId: 'tech-2',
    assignedTechName: 'Kyaw Swar Lin',
    serviceType: 'Micro-Soldering',
    repairLogs: [
      { id: 'log-120-1', timestamp: 'May 17, 2026 09:00 AM', author: 'Kyaw Swar Lin', note: 'Keyboard backlight flex soldering finished.', statusChange: 'Finished' },
      { id: 'log-120-2', timestamp: 'May 18, 2026 02:00 PM', author: 'Kyaw Swar Lin', note: 'Customer picked up laptop.', statusChange: 'Taken Out' }
    ],
    intakeChecklist: {
      powerOn: true, screenDisplay: true, touchGrid: true, faceIdOrTouchId: true, trueTonePresent: true,
      frontCamera: true, rearCamera: false, microphones: true, speakers: true, wifiBluetooth: true,
      cellularSignal: false, wirelessCharging: false, liquidIndicatorTriggered: false, batteryHealthPercent: 88,
      physicalDamageNotes: 'Keyboard backlight failing on center rows.'
    },
    postRepairChecklist: {
      trueToneTransferred: true, displayNoMessageWarning: true, batteryHealthVerified: true, cameraOisFunctional: true,
      proximitySensorWorking: true, speakerClarityPass: true, enclosureAlignmentPass: true, cleanAndSanitized: true,
      qaTechnicianId: 'tech-2', notes: 'QA verification passed.'
    },
    symptomsReported: 'Keyboard keys unlit.',
    diagnosticResult: 'Ripped backlight flex cable. Micro-soldered jumper wires.',
    lineItems: [
      { id: 'li-120-1', description: 'Level 2 Trace Micro-Soldering & Backlight Repair', unitCost: 10000, unitPrice: 150000, quantity: 1, isLabor: true }
    ],
    subtotal: 150000, depositAmount: 30000, discountAmount: 0, taxAmount: 0, totalAmount: 150000,
    isPaid: true, paymentMethod: 'Credit Card', warrantyDays: 180, intakePhotos: [],
    followUpStatus: 'Pending Call',
    createdAt: '2026-05-17T09:00:00Z', updatedAt: '2026-05-18T14:00:00Z', estimatedCompletion: '2026-05-18T12:00:00Z'
  },
  {
    id: 'wo-121',
    orderNumber: 'WO-2026-1021',
    customerId: 'cust-4',
    customerName: 'Michael Chang',
    customerPhone: '(555) 432-1098',
    customerEmail: 'm.chang@techcorp.com',
    customerType: 'Retail',
    deviceCategory: 'iPhone',
    deviceModel: 'iPhone 13 mini',
    serialNumber: 'M9012837491',
    imei: '350129384758102',
    deviceColor: 'Starlight',
    passcode: '778899',
    findMyStatus: 'OFF',
    status: 'In Progress',
    priority: 'Normal',
    assignedTechId: 'tech-2',
    assignedTechName: 'Kyaw Swar Lin',
    serviceType: 'Standard Modular',
    repairLogs: [
      { id: 'log-119-1', timestamp: 'Jul 24, 2026 09:30 AM', author: 'Kyaw Swar Lin', note: 'Replacing camera module & battery.', statusChange: 'In Progress' }
    ],
    intakeChecklist: {
      powerOn: true, screenDisplay: true, touchGrid: true, faceIdOrTouchId: true, trueTonePresent: true,
      frontCamera: true, rearCamera: false, microphones: true, speakers: true, wifiBluetooth: true,
      cellularSignal: true, wirelessCharging: true, liquidIndicatorTriggered: false, batteryHealthPercent: 78,
      physicalDamageNotes: 'Rear main camera lens cracked.'
    },
    symptomsReported: 'Rear camera produces blurry black spots and vibrates uncontrollably.',
    diagnosticResult: 'Optical Image Stabilization (OIS) motor coil broken from drop impact.',
    lineItems: [
      { id: 'li-119-1', description: 'iPhone 13 mini Rear Dual Camera Module', unitCost: 45000, unitPrice: 140000, quantity: 1, isLabor: false },
      { id: 'li-119-2', description: 'iPhone 13 mini OEM Battery Cell', unitCost: 22000, unitPrice: 90000, quantity: 1, isLabor: false },
      { id: 'li-119-3', description: 'Labor: Camera & Battery Combo Service', unitCost: 0, unitPrice: 50000, quantity: 1, isLabor: true }
    ],
    subtotal: 280000, depositAmount: 50000, discountAmount: 20000, taxAmount: 0, totalAmount: 260000,
    isPaid: false, warrantyDays: 180, intakePhotos: [],
    createdAt: '2026-07-24T09:30:00Z', updatedAt: '2026-07-24T10:00:00Z', estimatedCompletion: '2026-07-24T16:00:00Z'
  },
  {
    id: 'wo-120',
    orderNumber: 'WO-2026-1020',
    customerId: 'cust-5',
    customerName: 'Robert Vance',
    customerPhone: '(555) 987-6543',
    customerEmail: 'rob.vance@vancecool.com',
    customerType: 'Retail',
    deviceCategory: 'iPhone',
    deviceModel: 'iPhone 16 Pro',
    serialNumber: 'P1029384756',
    imei: '351029384756102',
    deviceColor: 'Natural Titanium',
    passcode: '121212',
    findMyStatus: 'OFF',
    status: 'Receive',
    priority: 'Urgent',
    assignedTechId: 'tech-1',
    assignedTechName: 'Aung Ko Ko',
    serviceType: 'Standard Modular',
    repairLogs: [
      { id: 'log-120-1', timestamp: 'Jul 24, 2026 11:45 AM', author: 'Aung Ko Ko', note: 'Fresh intake for screen & back glass combo.', statusChange: 'Receive' }
    ],
    intakeChecklist: {
      powerOn: true, screenDisplay: false, touchGrid: false, faceIdOrTouchId: true, trueTonePresent: true,
      frontCamera: true, rearCamera: true, microphones: true, speakers: true, wifiBluetooth: true,
      cellularSignal: true, wirelessCharging: true, liquidIndicatorTriggered: false, batteryHealthPercent: 100,
      physicalDamageNotes: 'Both front screen and rear back glass shattered in vehicle runover.'
    },
    symptomsReported: 'Ran over by car tire. Screen black and back glass crushed.',
    diagnosticResult: 'Front OLED and Back Glass shattered. Titanium frame slightly bent but restorable.',
    lineItems: [
      { id: 'li-120-1', description: 'iPhone 16 Pro Original OLED Screen Assembly', unitCost: 145000, unitPrice: 220000, quantity: 1, isLabor: false },
      { id: 'li-120-2', description: 'iPhone 16 Pro OEM Back Glass Assembly (Natural Titanium)', unitCost: 40000, unitPrice: 120000, quantity: 1, isLabor: false },
      { id: 'li-120-3', description: 'Labor: Frame Realignment & Full Housing Rebuild', unitCost: 0, unitPrice: 80000, quantity: 1, isLabor: true }
    ],
    subtotal: 420000, depositAmount: 100000, discountAmount: 30000, taxAmount: 0, totalAmount: 390000,
    isPaid: false, warrantyDays: 180, intakePhotos: [],
    createdAt: '2026-07-24T11:45:00Z', updatedAt: '2026-07-24T11:45:00Z', estimatedCompletion: '2026-07-25T16:00:00Z'
  }
];

// Work orders always begin empty in the live ERP.  Records are loaded from
// Supabase or created through the intake workflow.
export const INITIAL_WORK_ORDERS: WorkOrder[] = [];

export const INITIAL_RMAS: RmaItem[] = [
  {
    id: 'rma-1',
    rmaNumber: 'RMA-2026-081',
    workOrderId: 'wo-101',
    partId: 'part-102',
    partName: 'iPhone 13 Pro OLED Display Screen Assembly',
    partQuality: 'Premium Aftermarket',
    supplierId: 'sup-2',
    supplierName: 'InjuredGadgets',
    quantity: 1,
    unitCost: 98.00,
    reason: 'Intermittent touch ghosting on bottom left corner after 10 mins usage.',
    status: 'Shipped to Vendor',
    trackingNumber: '1Z9999990111223344',
    createdAt: '2026-07-18T16:00:00Z',
  },
  {
    id: 'rma-2',
    rmaNumber: 'RMA-2026-082',
    partId: 'part-104',
    partName: 'iPhone 11 Replacement Battery Pack',
    partQuality: 'Standard Aftermarket',
    supplierId: 'sup-3',
    supplierName: 'Mengtor Apple Parts',
    quantity: 2,
    unitCost: 12.50,
    reason: 'Triggers iOS Important Battery Message & rapid drain in testing.',
    status: 'Credit Approved',
    vendorCreditAmount: 25.00,
    createdAt: '2026-07-12T10:00:00Z',
  }
];

export const INITIAL_POS: PurchaseOrder[] = [
  {
    id: 'po-1',
    poNumber: 'PO-2026-044',
    supplierId: 'sup-1',
    supplierName: 'MobileSentrix',
    items: [
      { partId: 'part-101', partName: 'iPhone 14 Pro Max Super Retina XDR OLED', quantity: 5, unitCost: 195.00 },
      { partId: 'part-105', partName: 'Hydra USB-C Controller IC Chip', quantity: 20, unitCost: 8.50 }
    ],
    totalCost: 1145.00,
    status: 'Sent',
    createdAt: '2026-07-21T11:30:00Z'
  }
];

export const INITIAL_EXPENSES = [
  {
    id: 'exp-1',
    date: '2026-07-01',
    category: 'Rent' as const,
    amount: 450000,
    paymentMethod: 'Bank Transfer' as const,
    payee: 'Downtown Tech Plaza Real Estate',
    description: 'Main Shop Premises Rent for July 2026',
    createdByName: 'Shop Owner'
  },
  {
    id: 'exp-2',
    date: '2026-07-05',
    category: 'Utilities' as const,
    amount: 125000,
    paymentMethod: 'Bank Transfer' as const,
    payee: 'Yangon Electricity Supply Corporation',
    description: 'Lab Air Conditioning & Power Bill',
    createdByName: 'Shop Owner'
  },
  {
    id: 'exp-3',
    date: '2026-07-10',
    category: 'Tools & Equipment' as const,
    amount: 85000,
    paymentMethod: 'Cash' as const,
    payee: 'SunShine Micro Tools Wholesale',
    description: 'Replacing JBC Soldering Tips & Thermal Paste Supply',
    createdByName: 'Aung Ko Ko'
  },
  {
    id: 'exp-4',
    date: '2026-07-15',
    category: 'Marketing' as const,
    amount: 60000,
    paymentMethod: 'Card' as const,
    payee: 'Meta Ads Manager',
    description: 'Facebook Campaign: iPhone Screen Replacement Discounts',
    createdByName: 'Shop Owner'
  },
  {
    id: 'exp-5',
    date: '2026-07-18',
    category: 'Shipping & Logistics' as const,
    amount: 35000,
    paymentMethod: 'Cash' as const,
    payee: 'Express Air Cargo Service',
    description: 'Express Freight for Wholesaler OEM Screen Shipment',
    createdByName: 'Thura Aung'
  }
];

export const INITIAL_SUPPLIER_DEBTS = [
  {
    id: 'debt-1',
    supplierId: 'sup-1',
    supplierName: 'MobileSentrix OEM Wholesale',
    invoiceNumber: 'INV-MSX-88219',
    issueDate: '2026-07-01',
    dueDate: '2026-08-05',
    totalAmount: 1250000,
    paidAmount: 500000,
    status: 'Partial' as const,
    notes: 'Net 30 payment terms for bulk OLED screen shipment.',
    paymentHistory: [
      { date: '2026-07-10', amount: 500000, method: 'Bank Transfer', note: 'Advance partial deposit' }
    ]
  },
  {
    id: 'debt-2',
    supplierId: 'sup-2',
    supplierName: 'InjuredGadgets Component Supply',
    invoiceNumber: 'INV-IG-99102',
    issueDate: '2026-07-12',
    dueDate: '2026-08-12',
    totalAmount: 680000,
    paidAmount: 0,
    status: 'Unpaid' as const,
    notes: 'Micro-soldering IC chips and iPhone 15 batteries order.',
    paymentHistory: []
  },
  {
    id: 'debt-3',
    supplierId: 'sup-3',
    supplierName: 'Mengtor Apple Wholesale',
    invoiceNumber: 'INV-MT-4401',
    issueDate: '2026-06-20',
    dueDate: '2026-07-20',
    totalAmount: 320000,
    paidAmount: 320000,
    status: 'Paid' as const,
    notes: 'Fully cleared prior invoice.',
    paymentHistory: [
      { date: '2026-07-18', amount: 320000, method: 'KBZPay', note: 'Full settlement' }
    ]
  }
];

export const INITIAL_TECHNICIAN_PAYOUTS = [
  {
    id: 'payout-1',
    technicianId: 'tech-1',
    technicianName: 'Aung Ko Ko',
    period: '2026-07',
    totalTicketsClosed: 38,
    totalLaborRevenue: 2450000,
    totalPartsCost: 1100000,
    commissionRatePercent: 15,
    commissionAmount: 367500,
    bonusAmount: 50000,
    netPayout: 417500,
    status: 'Approved' as const,
    notes: 'Senior Micro-Soldering Level 3 Commission + QA Zero-Warranty Bonus'
  },
  {
    id: 'payout-2',
    technicianId: 'tech-2',
    technicianName: 'Kyaw Swar Lin',
    period: '2026-07',
    totalTicketsClosed: 42,
    totalLaborRevenue: 1980000,
    totalPartsCost: 850000,
    commissionRatePercent: 12,
    commissionAmount: 237600,
    bonusAmount: 0,
    netPayout: 237600,
    status: 'Paid' as const,
    paidAt: '2026-07-20T10:00:00Z',
    notes: 'Regular monthly commission'
  },
  {
    id: 'payout-3',
    technicianId: 'tech-3',
    technicianName: 'Thura Aung',
    period: '2026-07',
    totalTicketsClosed: 51,
    totalLaborRevenue: 1650000,
    totalPartsCost: 720000,
    commissionRatePercent: 10,
    commissionAmount: 165000,
    bonusAmount: 20000,
    netPayout: 185000,
    status: 'Pending' as const,
    notes: 'Awaiting month-end final audit'
  }
];
