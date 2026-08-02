export type AppleDeviceCategory = 'iPhone' | 'iPad' | 'MacBook' | 'iMac' | 'AppleWatch' | 'AirPods';

export type PartQualityTier = 
  | 'Original'
  | 'OEM'
  | 'Genuine';

export type WorkOrderStatus = 
  | 'Receive' 
  | 'In Progress' 
  | 'Pending' 
  | 'Finished' 
  | 'Taken Out' 
  | 'Cant Repair'
  | 'Customer Not Repair';

export type RepairPriority = 'Normal' | 'Urgent' | 'B2B Priority' | 'Warranty Redo';

export type TechnicianLevel = 'Level 1 Spareparts' | 'Level 2 Spareparts + Hardware' | 'Level 3 Master';

export type CustomerType = 'Retail' | 'B2B Corporate' | 'Wholesale Mail-In';

export type RmaStatus = 'Draft' | 'Shipped to Vendor' | 'Credit Approved' | 'Replacement Received' | 'Rejected';

export type DiagnosticStatus = 'Pass' | 'Fail' | 'N/A';

export type FollowUpStatus = 
  | 'Pending Call' 
  | 'Satisfied' 
  | 'Issue Reported' 
  | 'No Answer' 
  | 'Callback Scheduled' 
  | 'Closed';

export interface FollowUpRecord {
  id: string;
  timestamp: string;
  author: string;
  status: FollowUpStatus;
  satisfactionRating?: number; // 1 to 5
  notes: string;
  nextFollowUpDate?: string;
}

export interface DiagnosticItemResult {
  id: string;
  name: string; // Display, Touch, Face ID, Main Camera, Front Camera, Charger, Sound, Vibrate, SIM, Microphone, Battery Health, WiFi, Bluetooth, Backglass, Key
  status: DiagnosticStatus;
  note?: string;
}

export interface SelectedRepairItem {
  id: string;
  name: string;
  basePrice: number;
  discountPercent: number; // e.g. 40 for 40%
  finalPrice: number;
}

export interface RepairLogEntry {
  id: string;
  timestamp: string; // e.g. "Jul 22, 2026 5:57 PM"
  author?: string;
  note: string;
  statusChange?: string;
}

export interface PreRepairChecklist {
  powerOn: boolean;
  screenDisplay: boolean;
  touchGrid: boolean;
  faceIdOrTouchId: boolean;
  trueTonePresent: boolean;
  frontCamera: boolean;
  rearCamera: boolean;
  microphones: boolean;
  speakers: boolean;
  wifiBluetooth: boolean;
  cellularSignal: boolean;
  wirelessCharging: boolean;
  liquidIndicatorTriggered: boolean;
  batteryHealthPercent?: number;
  physicalDamageNotes: string;
}

export interface PostRepairChecklist {
  trueToneTransferred: boolean;
  displayNoMessageWarning: boolean;
  batteryHealthVerified: boolean;
  cameraOisFunctional: boolean;
  proximitySensorWorking: boolean;
  speakerClarityPass: boolean;
  enclosureAlignmentPass: boolean;
  cleanAndSanitized: boolean;
  qaTechnicianId: string;
  notes: string;
}

export interface WorkOrderLineItem {
  id: string;
  description: string;
  partId?: string;
  partName?: string;
  partQuality?: PartQualityTier;
  unitCost: number;
  unitPrice: number;
  quantity: number;
  isLabor: boolean;
}

export interface MicroSolderingLog {
  boardModel: string; // e.g. 820-02020 (M1 MacBook Air) or iPhone 13 Pro Logic Board
  diodeReadings: { lineName: string; expectedValue: string; actualValue: string; status: 'PASS' | 'FAIL' }[];
  thermalNotes: string;
  icReplaced: string[]; // e.g. ["U2 / Hydra USB IC", "Audio IC"]
  schematicTags: string[]; // e.g. ["PP_VCC_MAIN", "C3010", "U6100"]
  multimeterDiodeShortFound: boolean;
  microscopePhotos?: string[];
}

export interface WorkOrder {
  id: string;
  orderNumber: string; // Voucher number WO-2026-1001
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerAddress?: string;
  customerType: CustomerType;
  
  // Device Identification
  deviceCategory: AppleDeviceCategory;
  deviceModel: string; // e.g. iPhone 17 Pro Max
  deviceSeries?: string;
  serialNumber: string;
  imei?: string;
  deviceColor: string;
  passcode: string;
  findMyStatus: 'ON' | 'OFF' | 'UNKNOWN';
  
  // Pipeline & Assignment
  status: WorkOrderStatus;
  priority: RepairPriority;
  assignedTechId: string;
  assignedTechName?: string;
  serviceType: 'Standard Modular' | 'Micro-Soldering' | 'B2B Mail-In';
  
  // Selected Repairs & Price Discounts
  selectedRepairs?: SelectedRepairItem[];
  
  // Diagnostics
  beforeDiagnostics?: DiagnosticItemResult[];
  afterDiagnostics?: DiagnosticItemResult[];
  afterRepairSummary?: string;
  
  // Checklists & Legacy
  intakeChecklist: PreRepairChecklist;
  postRepairChecklist?: PostRepairChecklist;
  symptomsReported: string;
  diagnosticResult?: string;
  microSolderingLog?: MicroSolderingLog;
  
  // Financials
  lineItems: WorkOrderLineItem[];
  subtotal: number;
  depositAmount: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount?: number;
  isPaid: boolean;
  paymentMethod?: 'Credit Card' | 'Cash' | 'Apple Pay' | 'Split Payment' | 'Net 30';
  inventoryConsumedAt?: string;
  inventoryConsumptionAmount?: number;
  inventoryConsumptionNote?: string;
  
  // Warranty & Signatures
  warrantyDays: number; // e.g. 30, 90, 180, 365, 0
  warrantyLabel?: string;
  customerSignatureUrl?: string;
  intakePhotos: string[];
  afterRepairPhotos?: string[];
  
  // Repair Logs
  repairLogs?: RepairLogEntry[];
  
  // Follow-Up Tracking for Completed Devices
  followUpStatus?: FollowUpStatus;
  followUpRecords?: FollowUpRecord[];
  lastFollowUpAt?: string;
  
  // Archive / Recycle Bin
  isArchived?: boolean;
  archivedAt?: string;
  archivedReason?: string;

  createdAt: string; // ISO date
  updatedAt: string;
  estimatedCompletion: string;
}

export interface PartItem {
  id: string;
  sku: string;
  name: string;
  applePartNumber?: string;
  category: string; // e.g., Display, Battery, Charging Port, Logic Board Chip, Back Glass
  deviceCompatibility: string[]; // e.g., ["iPhone 13", "iPhone 13 Pro"]
  backGlassColor?: string;
  qualityTier: PartQualityTier;
  quantityInStock: number;
  reservedQuantity: number;
  reorderPoint: number;
  costPrice: number;
  sellingPrice: number;
  supplierId: string;
  supplierName: string;
  locationBin: string; // e.g. BIN-A12
  isSerialized: boolean;
  serialNumbers?: string[];
}

export interface Supplier {
  id: string;
  name: string;
  code: string;
  website: string;
  contactEmail: string;
  phone: string;
  avgRmaTurnaroundDays: number;
  rating: number; // 1-5 stars
}

export interface RmaItem {
  id: string;
  rmaNumber: string; // RMA-8812
  workOrderId?: string;
  partId: string;
  partName: string;
  partQuality: PartQualityTier;
  supplierId: string;
  supplierName: string;
  quantity: number;
  unitCost: number;
  reason: string; // e.g. "Screen Flickering / Touch Ghosting", "Battery Non-Genuine Warning Failure"
  status: RmaStatus;
  trackingNumber?: string;
  vendorCreditAmount?: number;
  createdAt: string;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  items: { partId: string; partName: string; quantity: number; unitCost: number }[];
  totalCost: number;
  status: 'Draft' | 'Sent' | 'Received' | 'Partially Received';
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  company?: string;
  email: string;
  phone: string;
  type: CustomerType;
  discountPercentage: number;
  totalOrdersCount: number;
  totalSpent: number;
  notes?: string;
  createdAt: string;
}

export interface Technician {
  id: string;
  name: string;
  email: string;
  phone?: string;
  level: TechnicianLevel;
  specialty?: string;
  status?: 'Active' | 'On Leave' | 'Inactive';
  commissionRate?: number; // e.g. 15 for 15%
  activeJobsCount: number;
  completedThisMonth: number;
  warrantyReturnCount: number;
  avatarUrl?: string;
}

export interface PaymentMethodConfig {
  id: string;
  name: string;
  category: 'Cash' | 'Myanmar Mobile Pay' | 'Myanmar Banks' | 'Card & Digital';
  enabled: boolean;
  accountName?: string;
  accountNumber?: string;
  notes?: string;
}

export interface SystemSettings {
  // Store Branding & General
  shopName: string;
  shopLogoUrl?: string;
  shopPhone: string;
  shopPhones?: string[];
  shopEmail: string;
  shopAddress: string;
  shopWebsite?: string;
  taxId: string;
  shopInfo?: string;

  // Work Order & Intake Defaults
  ticketPrefix: string;
  defaultWarrantyDays: number;
  defaultTechnicianId: string;
  requirePasscodeIntake: boolean;
  requireFindMyCheck: boolean;

  // Pricing & Finance
  currencySymbol: string;
  taxPercentage: number;
  defaultLaborDiscountPercent: number;
  paymentMethods?: PaymentMethodConfig[];

  // Inventory & Stock
  // Simple names used only when classifying physical stock parts. These are
  // intentionally separate from the repair-service categories in Price List.
  inventoryCategories?: string[];
  // Configured from System Management > Inventory Data & Quality.
  inventoryQualityTiers?: string[];
  inventoryBinNames?: string[];
  lowStockThreshold: number;
  autoReserveOnAssignment: boolean;
  defaultSupplierSlaDays: number;

  // POS & Thermal Receipt
  thermalPaperSize: '80mm' | '58mm';
  receiptHeaderTitle: string;
  receiptFooterNote: string;
  // Footer wording stays as plain text. Individual hard-return lines can have
  // their own alignment without storing rich HTML in the database.
  receiptFooterLineAlignments?: Record<number, 'left' | 'center' | 'right'>;
  receiptFooterTextSizeRanges?: Array<{ start: number; end: number; size: 'small' | 'medium' | 'large' }>;
  receiptFooterTextAlign?: 'left' | 'center' | 'right';
  receiptFooterFontSize?: 'small' | 'medium' | 'large';

  // A4 Print Voucher Settings
  a4PrintColorMode?: 'monochrome' | 'color';
  a4ShowDiagnosticsTable?: boolean;
  a4ShowPricingTable?: boolean;
  a4ShowTermsDisclaimer?: boolean;
  a4CustomHeaderNote?: string;
  a4PrintLayoutDensity?: 'standard' | 'compact' | 'dual_voucher';
  a4DiagnosticDisplayFormat?: 'comparison_table' | 'dual_grid' | 'before_only' | 'after_only';

  // Quality Assurance
  mandatoryQaChecklist: boolean;
  requireMicroSolderingLog: boolean;

  // Automated SMS & Telegram Notification Templates
  notificationTemplates?: NotificationTemplate[];
  defaultNotificationChannel?: 'SMS' | 'Telegram' | 'Viber';
  autoPromptNotificationModal?: boolean;
  telegramBotToken?: string;
  telegramChatId?: string;

  // ERP AI Operations Assistant
  aiProvider?: 'local' | 'openai' | 'anthropic' | 'gemini' | 'deepseek' | 'groq' | 'openrouter' | 'custom';
  aiApiKey?: string;
  aiModel?: string;
  aiBaseUrl?: string;
  aiSystemPrompt?: string;
}

export interface NotificationTemplate {
  id: string;
  key: string; // e.g. 'Finished', 'ReadyForPickup', 'NeedsAttention', 'PendingParts', 'Intake', 'Custom'
  title: string; // e.g. 'Finished / Ready for Pickup', 'Needs Attention / Action Required'
  channel?: 'SMS' | 'Telegram' | 'Viber' | 'All';
  templateText: string;
  description?: string;
  enabled?: boolean;
}

export interface ExpenseItem {
  id: string;
  category: 'Rent' | 'Utilities' | 'Tools & Equipment' | 'Staff Wages' | 'Shipping & Logistics' | 'Marketing' | 'Miscellaneous' | string;
  description: string;
  amount: number;
  date: string;
  paymentMethod: 'Bank Transfer' | 'Cash' | 'Card' | 'Supplier Credit' | string;
  payee?: string;
  loggedByTechId?: string;
  createdByName?: string;
}

export interface SupplierDebtRecord {
  id: string;
  supplierId: string;
  supplierName: string;
  invoiceNumber: string;
  issueDate?: string;
  dueDate: string;
  totalAmount: number;
  paidAmount: number;
  status: 'Unpaid' | 'Partial' | 'Paid Overdue' | 'Cleared' | 'Paid';
  notes?: string;
  createdAt?: string;
  paymentHistory?: { date: string; amount: number; method: string; note?: string }[];
}

export interface TechnicianPayoutRecord {
  id: string;
  technicianId: string;
  technicianName: string;
  period: string; // e.g. "2026-07"
  totalTicketsClosed?: number;
  totalJobsCompleted?: number;
  totalLaborRevenue?: number;
  grossLaborRevenue?: number;
  totalPartsCost?: number;
  commissionRatePercent: number;
  commissionAmount?: number;
  bonusAmount?: number;
  netPayout?: number;
  payoutAmount?: number;
  status: 'Pending' | 'Approved' | 'Paid';
  paidAt?: string;
  notes?: string;
}

export type UserRole = 'Admin' | 'Technician' | 'Reception';

export interface UserPermissions {
  canDeleteWorkOrders?: boolean;
  canDeleteInventory?: boolean;
  canDeleteCustomers?: boolean;
  canDeleteLogs?: boolean;
  canAccessSettings?: boolean;
  canAccessFinance?: boolean;
  canEditPrices?: boolean;
}

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  technicianId?: string;
  technicianName?: string;
  avatarUrl?: string;
  status: 'Active' | 'Inactive';
  createdAt?: string;
  permissions?: UserPermissions;
}
