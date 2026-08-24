import  {useState, useRef, useEffect, useMemo, Suspense} from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { createPortal } from 'react-dom';
import {Sparkles, Plus, Search, Filter, AlertTriangle, CheckCircle2, Info, AlertCircle, X, RotateCcw, Save, SlidersHorizontal, Edit2,
  MoreHorizontal,
  Printer, List,
  TrendingUp,
  Grid, Smartphone, Layers, ScanLine, ListFilter, Activity, Users, Boxes, Coins, ShieldAlert,
  Table as TableIcon, LayoutGrid, Flame, Camera, ClipboardCheck} from 'lucide-react';
import { subscribeToCollection, refreshCollection, refreshAllCollections, flushOfflineQueue, saveDocument, deleteDocument } from './lib/supabase';
import { LITE_MODE, isLiteHiddenModule } from './lib/lite';
import { setActiveUserId, notifyAccountChanged } from './utils/accountSettings';

// ---- AI repair-type classification (Spareparts Change vs Hardware Repair) ----
const AI_CLASSIFY_SYSTEM_PROMPT =
  'You are a repair-shop ticket classifier. Reply with EXACTLY ONE WORD only: SPAREPARTS or HARDWARE.\n' +
  'SPAREPARTS = modular parts replacement (display/screen, battery, camera, speaker, flex, back glass, charging port connector/flex, buttons, vibrator, microphone, earpiece).\n' +
  'HARDWARE = board-level work (logic board, motherboard, IC or chip replacement, micro-soldering, reballing, jumpers, trace repair, water/liquid damage, no power, charging IC, audio IC, wifi IC, baseband, NAND, MOSFET, short circuit, boot loop).\n' +
  'If a ticket mixes both, choose board-level work if present. No explanations, no punctuation.';

async function classifyRepairWithAI(wo: WorkOrder, settings: SystemSettings): Promise<{
  verdict: 'spareparts' | 'hardware' | null;
  /** true when the failure was a missing/not-configured API key (retry-able, never marks the ticket failed). */
  configError: boolean;
}> {
  const provider = settings.aiProvider || 'local';
  if (provider === 'local') return { verdict: null, configError: true };
  const repairs = (wo.selectedRepairs || []).map((r) => r.name).join(', ') || '—';
  try {
    const token = localStorage.getItem('i35_session_token') || '';
    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-session-token': token },
      body: JSON.stringify({
        provider,
        // DeepSeek uses the server-only DEEPSEEK_API_KEY — never send a key from the browser.
        apiKey: provider === 'deepseek' ? undefined : settings.aiApiKey,
        model: settings.aiModel,
        baseUrl: settings.aiBaseUrl,
        systemPrompt: AI_CLASSIFY_SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: `Ticket ${wo.orderNumber} | Service: ${wo.serviceType} | Repairs: ${repairs} | Symptoms: ${wo.symptomsReported || '—'}\n\nReply with exactly one word.`,
          },
        ],
      }),
    });
    // 400 = API key not configured on the server (or rejected) — a config
    // issue, NOT a ticket problem. Never flag the ticket as failed for this;
    // it stays eligible for retry once a key is configured (audit E-4).
    if (res.status === 400) return { verdict: null, configError: true };
    const text = await res.text();
    const data = text ? JSON.parse(text) : {};
    if (!res.ok || !data.success || !data.answer) return { verdict: null, configError: false };
    const answer = String(data.answer).trim().toUpperCase();
    if (answer.includes('HARDWARE')) return { verdict: 'hardware', configError: false };
    if (answer.includes('SPAREPARTS')) return { verdict: 'spareparts', configError: false };
    return { verdict: null, configError: false };
  } catch {
    return { verdict: null, configError: false };
  }
}

import { DEFAULT_SYSTEM_SETTINGS, INITIAL_USERS } from './data/seedData';
import { 
  WorkOrder, 
  PartItem, 
  Supplier, 
  RmaItem, 
  PurchaseOrder, 
  Customer, 
  Technician, 
  WorkOrderStatus, 
  RmaStatus, 
  PostRepairChecklist,
  DiagnosticItemResult,
  SystemSettings,
  ExpenseItem,
  SupplierDebtRecord,
  TechnicianPayoutRecord,
  AppUser} from './types';
import { DateFilterSelector, DateFilterState, formatDateLabel } from './components/common/DateFilterSelector';
import { RightFilterDrawer } from './components/common/RightFilterDrawer';
import { ActiveFilterChips } from './components/common/ActiveFilterChips';
import { DrawerSelect } from './components/common/DrawerSelect';
import { checkIsDiagnosticCompleted, checkIsBeforeDiagnosticCompleted, checkIsAfterDiagnosticCompleted } from './utils/diagnosticUtils';
import { CustomDropdownMenu } from './components/common/CustomDropdownMenu';
import { ConfirmDialogHost, confirmDialog } from './components/common/ConfirmDialog';
import { Button , Input } from './components/ui';
import { ModuleLoadingSkeleton } from './components/common/ModuleLoadingSkeleton';
import { useLanguage } from './context/LanguageContext';
import { Navigation } from './components/Navigation';
// Heavy modules are code-split (lazyWithRetry) so the initial bundle stays lean
// and chunk load errors auto-retry before forcing a reload.
import { lazyWithRetry } from './lib/lazyWithRetry';

const DashboardOverview = lazyWithRetry(() => import('./components/dashboard/DashboardOverview').then((m) => ({ default: m.DashboardOverview })), 'DashboardOverview');
const IntakeWorkOrderModule = lazyWithRetry(() => import('./components/intake/IntakeWorkOrderModule').then((m) => ({ default: m.IntakeWorkOrderModule })), 'IntakeWorkOrderModule');
const SimpleTicketCreator = lazyWithRetry(() => import('./components/intake/SimpleTicketCreator'), 'SimpleTicketCreator');
const CreateTicketSoloPage = lazyWithRetry(() => import('./components/intake/CreateTicketSoloPage').then((m) => ({ default: m.CreateTicketSoloPage })), 'CreateTicketSoloPage');
const TrelloBoardModule = lazyWithRetry(() => import('./components/trello/TrelloBoardModule').then((m) => ({ default: m.TrelloBoardModule })), 'TrelloBoardModule');
const InventoryManagementModule = lazyWithRetry(() => import('./components/inventory/InventoryManagementModule').then((m) => ({ default: m.InventoryManagementModule })), 'InventoryManagementModule');
const SupplierRmaModule = lazyWithRetry(() => import('./components/suppliers/SupplierRmaModule').then((m) => ({ default: m.SupplierRmaModule })), 'SupplierRmaModule');
const PosInvoicingModule = lazyWithRetry(() => import('./components/pos/PosInvoicingModule').then((m) => ({ default: m.PosInvoicingModule })), 'PosInvoicingModule');
const CrmCustomerPortalModule = lazyWithRetry(() => import('./components/crm/CrmCustomerPortalModule').then((m) => ({ default: m.CrmCustomerPortalModule })), 'CrmCustomerPortalModule');
const QualityAssuranceModule = lazyWithRetry(() => import('./components/qa/QualityAssuranceModule').then((m) => ({ default: m.QualityAssuranceModule })), 'QualityAssuranceModule');
const PriceCatalogModule = lazyWithRetry(() => import('./components/prices/PriceCatalogModule').then((m) => ({ default: m.PriceCatalogModule })), 'PriceCatalogModule');
const SystemManagementSettingsModule = lazyWithRetry(() => import('./components/settings/SystemManagementSettingsModule').then((m) => ({ default: m.SystemManagementSettingsModule })), 'SystemManagementSettingsModule');
const CustomerFacingWebPortal = lazyWithRetry(() => import('./components/portal/CustomerFacingWebPortal').then((m) => ({ default: m.CustomerFacingWebPortal })), 'CustomerFacingWebPortal');
const MermaidModule = lazyWithRetry(() => import('./components/mermaid/MermaidModule').then((m) => ({ default: m.MermaidModule })), 'MermaidModule');

// Modal / tab modules below are also code-split (lazyWithRetry) so their chunks
// only download when actually opened (AI chat, tag printing, recycle bin,
// Cmd+K search, follow-up & finance tabs.
const AiDiagnosticAssistantModal = lazyWithRetry(() => import('./components/ai/AiDiagnosticAssistantModal').then((m) => ({ default: m.AiDiagnosticAssistantModal })), 'AiDiagnosticAssistantModal');
const DeviceTagPrinterModal = lazyWithRetry(() => import('./components/common/DeviceTagPrinterModal').then((m) => ({ default: m.DeviceTagPrinterModal })), 'DeviceTagPrinterModal');
const RecycleBinModal = lazyWithRetry(() => import('./components/common/RecycleBinModal').then((m) => ({ default: m.RecycleBinModal })), 'RecycleBinModal');
const CompletedDeviceFollowUpModule = lazyWithRetry(() => import('./components/followup/CompletedDeviceFollowUpModule').then((m) => ({ default: m.CompletedDeviceFollowUpModule })), 'CompletedDeviceFollowUpModule');
const ShopFinancePlModule = lazyWithRetry(() => import('./components/finance/ShopFinancePlModule').then((m) => ({ default: m.ShopFinancePlModule })), 'ShopFinancePlModule');
import { usePriceCatalog } from './hooks/usePriceCatalog';
import { useIsIpad } from './hooks/useIsIpad';
const GlobalSearchModal = lazyWithRetry(() => import('./components/common/GlobalSearchModal').then((m) => ({ default: m.GlobalSearchModal })), 'GlobalSearchModal');
import { HoverTooltip } from './components/common/HoverTooltip';
import { registerToastHandler, unregisterToastHandler } from './lib/toast';
import { LoginPage } from './components/auth/LoginPage';


/** ⋯ More menu — fixed-positioned so the header's overflow-x-auto strip can't clip it. */
function FixedMoreMenu({ anchorRef, isOpen, editMode, onClose, onPrintTags, onToggleEdit, onView, onAddPart }: {
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  isOpen: boolean;
  editMode: boolean;
  onClose: () => void;
  onPrintTags: () => void;
  onToggleEdit: () => void;
  onView: (v: 'stock' | 'profit' | 'matrix') => void;
  onAddPart: () => void;
}) {
  // audit A-P2: Escape closes the menu (matches CustomDropdownMenu / Radix).
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  const rect = anchorRef.current?.getBoundingClientRect();
  if (!rect) return null;
  const menuW = 192;
  const menuH = 296; // conservative max height for the flip/clamp math
  let left = rect.right - menuW;
  left = Math.max(8, Math.min(left, window.innerWidth - menuW - 8));
  // audit A-P2: mirror CustomDropdownMenu — flip above when there isn't
  // ~296px below the trigger, and clamp so the menu stays on-screen.
  const spaceBelow = window.innerHeight - rect.bottom;
  const spaceAbove = rect.top;
  let top = rect.bottom + 6;
  if (spaceBelow < menuH && spaceAbove > menuH) {
    top = rect.top - menuH - 6;
  }
  top = Math.max(8, Math.min(top, window.innerHeight - menuH - 8));
  return createPortal(
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} role="presentation" aria-hidden="true" />
      <div className="fixed z-50 w-48 rounded-xl border border-line bg-white p-1.5 shadow-xl animate-in fade-in zoom-in-95 duration-150" style={{ top, left }}>
        {/* audit A-P2: the view-switcher + Add Part group (and its separator)
            hide together on desktop — no more dangling divider between the
            two groups at lg. */}
        <div className="lg:hidden">
          {(['stock', 'profit', 'matrix'] as const).map((v) => (
            <Button
              key={v}
              type="button"
              onClick={() => { onView(v); onClose(); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-extrabold rounded-lg hover:bg-surface transition-colors cursor-pointer text-left focus:outline-none"
            >
              {v === 'stock' ? <List className="w-4 h-4 text-brand shrink-0" /> : v === 'profit' ? <TrendingUp className="w-4 h-4 text-brand shrink-0" /> : <Grid className="w-4 h-4 text-brand shrink-0" />}
              {v === 'stock' ? 'Stock View' : v === 'profit' ? 'Profit View' : 'Matrix View'}
            </Button>
          ))}
          <Button
            type="button"
            onClick={() => { onAddPart(); onClose(); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-extrabold rounded-lg hover:bg-surface transition-colors cursor-pointer text-left focus:outline-none"
          >
            <Plus className="w-4 h-4 text-brand shrink-0" />
            Add Part
          </Button>
          <div className="my-1 border-t border-line" />
        </div>
        <Button
          type="button"
          onClick={onPrintTags}
          className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-extrabold rounded-lg hover:bg-surface transition-colors cursor-pointer text-left focus:outline-none"
        >
          <Printer className="w-4 h-4 text-brand shrink-0" />
          Print Tags
        </Button>
        <Button
          type="button"
          onClick={onToggleEdit}
          className={`w-full flex items-center gap-2 px-3 py-2.5 text-xs font-extrabold rounded-lg transition-colors cursor-pointer text-left focus:outline-none ${
            editMode ? 'text-warning hover:bg-warning/10' : 'hover:bg-surface'
          }`}
        >
          <Edit2 className="w-4 h-4 shrink-0" />
          {editMode ? 'Done Editing' : 'Edit Stock'}
        </Button>
      </div>
    </>,
    document.body,
  );
}

// audit A-P3: tiny centered spinner for code-split modal chunks — fallback={null}
// left a blank screen (header still showed the old tab) on slow connections.
const modalLoadingFallback = (
  <div className="fixed inset-0 z-[100] grid place-items-center">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-brand" />
  </div>
);

export default function App() {
  const { t } = useLanguage();
  const [isOnline, setIsOnline] = useState(() => typeof navigator === 'undefined' || navigator.onLine);
  const [authUser, setAuthUser] = useState<{ email: string; name: string } | null>(() => {
    try {
      const raw = localStorage.getItem('i35_session_user');
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  });
  const [authChecking, setAuthChecking] = useState(true);
  const [activeTab, setActiveTab] = useState<string>(() => {
    // Restore tab from URL hash (#/pipeline) so deep links & reloads land correctly
    if (typeof window !== 'undefined') {
      const h = window.location.hash.replace(/^#\/?/, '');
      if (h && ['dashboard','intake','simple-ticket','trello','qa','follow-up','price-catalog','pos','finance','inventory','suppliers','crm','settings','create-ticket','mermaid'].includes(h)) return h;
    }
    return 'dashboard';
  });
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Dynamic Header Top Bar Filter States
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [techFilter, setTechFilter] = useState<string>('ALL');
  const [dashboardSubTab, setDashboardSubTab] = useState<string>('status-queue');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [stockFilter, setStockFilter] = useState<string>('ALL');
  const [modelFilter, setModelFilter] = useState<string>('ALL');
  // Inventory view/edit — drawer controls these on iPad (module toolbar keeps them on desktop)
  const [inventoryViewMode, setInventoryViewMode] = useState<'stock' | 'profit' | 'matrix'>('stock');
  const [inventoryEditMode, setInventoryEditMode] = useState(false);
  const [inventoryStockView, setInventoryStockView] = useState<'table' | 'cards'>(() =>
    typeof window !== 'undefined' && window.innerWidth < 640 ? 'cards' : 'table'
  );

  // Warm lazy-loaded module chunks once the user is signed in, so the first
  // tab visit doesn't flash the loading skeleton ("lazy" feel).
  const warmedRef = useRef(false);
  // Settings-driven stock reservation guard (Ko Hein 2026-08-11): tickets whose
  // part lines already bumped reservedQuantity — prevents double-reserve on
  // repeated In Progress saves.
  const reservedTicketsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (authUser && !warmedRef.current) {
      warmedRef.current = true;
      void import('./components/dashboard/DashboardOverview');
      void import('./components/intake/IntakeWorkOrderModule');
      void import('./components/intake/SimpleTicketCreator');
      void import('./components/trello/TrelloBoardModule');
      void import('./components/inventory/InventoryManagementModule');
      void import('./components/suppliers/SupplierRmaModule');
      void import('./components/pos/PosInvoicingModule');
      void import('./components/crm/CrmCustomerPortalModule');
      void import('./components/qa/QualityAssuranceModule');
      void import('./components/prices/PriceCatalogModule');
      void import('./components/settings/SystemManagementSettingsModule');
      void import('./components/followup/CompletedDeviceFollowUpModule');
      void import('./components/finance/ShopFinancePlModule');
      void import('./components/portal/CustomerFacingWebPortal');
      void import('./components/ai/AiDiagnosticAssistantModal');
      void import('./components/common/DeviceTagPrinterModal');
    }
  }, [authUser]);


  // Phones (<sm) get the compact card grid; sm+ keeps the table (no horizontal scroll on phones).
  useEffect(() => {
    const onResize = () => setInventoryStockView(window.innerWidth < 640 ? 'cards' : 'table');
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  const [inventoryTagsPrintOpen, setInventoryTagsPrintOpen] = useState(false);
  const [inventoryMoreOpen, setInventoryMoreOpen] = useState(false);
  const [inventorySideMenuOpen, setInventorySideMenuOpen] = useState(false);
  // Close the phone side menu on Escape.
  useEffect(() => {
    if (!inventorySideMenuOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setInventorySideMenuOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [inventorySideMenuOpen]);
  const inventoryMoreAnchorRef = useRef<HTMLButtonElement | null>(null);
  const [inventoryScanQuery, setInventoryScanQuery] = useState('');
  const [inventoryLowStockOnly, setInventoryLowStockOnly] = useState(false);
  const [qaViewMode, setQaViewMode] = useState<'table' | 'cards'>('cards');
  const [intakeViewMode, setIntakeViewMode] = useState<'table' | 'cards'>('cards');
  const [intakeSortByPriority, setIntakeSortByPriority] = useState(false);
  const [intakeScanRequest, setIntakeScanRequest] = useState(0);
  const inventoryScanSubmitRef = useRef<(() => void) | null>(null);
  const [customerTypeFilter, setCustomerTypeFilter] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<DateFilterState>({ preset: 'all' });

  // Modal triggers from top bar
  const [inventoryAddModalOpen, setInventoryAddModalOpen] = useState(false);
  const [rmaModalOpen, setRmaModalOpen] = useState(false);

  // Finance: Record Expense button lives in the top navbar — module exposes openAddExpense via ref
  const financeModuleRef = useRef<{ openAddExpense: () => void } | null>(null);
  const dashboardRef = useRef<{ setSubTab: (tab: string) => void } | null>(null);
  
  // Price Catalog top navigation controls state
  const [priceCatalogDeviceModalOpen, setPriceCatalogDeviceModalOpen] = useState(false);
  const [priceCatalogSettingsModalOpen, setPriceCatalogSettingsModalOpen] = useState(false);
  const priceCatalogExportRef = useRef<(() => void) | null>(null);
  
  // Settings top navigation controls state
  const settingsResetRef = useRef<(() => void) | null>(null);
  const settingsSaveRef = useRef<(() => void) | null>(null);
  // Unsaved-changes state reported by the Settings module (Ko Hein 2026-08-24).
  const [settingsDirty, setSettingsDirty] = useState(false);
  
  // Intake Ticket prefill state
  const [ticketPrefill, setTicketPrefill] = useState<any | null>(null);

  const handleOpenNewWorkOrder = (prefillData?: any) => {
    if (prefillData) {
      setTicketPrefill(prefillData);
    } else {
      setTicketPrefill(null);
    }
    setActiveTab('create-ticket');
  };

  // Leaving edit mode must fully clear the prefill — otherwise the form stays
  // armed against the original ticket and a later save overwrites it (P0 fix).
  const handleCancelEdit = () => {
    setTicketPrefill(null);
    setActiveTab('intake');
  };
  
  // Primary ERP State
  const [systemSettings, setSystemSettings] = useState<SystemSettings>(DEFAULT_SYSTEM_SETTINGS);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [currentUser, setCurrentUser] = useState<AppUser>(INITIAL_USERS[0]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [parts, setParts] = useState<PartItem[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [rmas, setRmas] = useState<RmaItem[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [supplierDebts, setSupplierDebts] = useState<SupplierDebtRecord[]>([]);
  const [technicianPayouts, setTechnicianPayouts] = useState<TechnicianPayoutRecord[]>([]);
  const [, setIsDbSynced] = useState<boolean>(true);
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);

  // User Management Handlers
  const handleAddUser = (newUser: AppUser) => {
    if (currentUser.role !== 'Admin') {
      addToast('🔒 Access Denied: Only Admin accounts can create users.', 'error', 'Permission Denied');
      return;
    }
    setUsers((prev) => [...prev, newUser]);
    saveDocument('users', newUser).catch(reportSaveError);
    addToast(`User account "${newUser.name}" (${newUser.role}) created successfully!`, 'success');
  };

  const handleUpdateUser = (updatedUser: AppUser) => {
    if (currentUser.role !== 'Admin') {
      addToast('🔒 Access Denied: Only Admin accounts can edit users.', 'error', 'Permission Denied');
      return;
    }
    setUsers((prev) => prev.map((u) => (u.id === updatedUser.id ? updatedUser : u)));
    saveDocument('users', updatedUser).catch(reportSaveError);
    if (currentUser.id === updatedUser.id) {
      setCurrentUser(updatedUser);
    }
    addToast(`User account "${updatedUser.name}" updated successfully!`, 'success');
  };

  const handleDeleteUser = (id: string) => {
    if (currentUser.role !== 'Admin') {
      addToast('🔒 Access Denied: Only Admin users can delete user accounts.', 'error', 'Permission Required');
      return;
    }
    setUsers((prev) => prev.filter((u) => u.id !== id));
    deleteDocument('users', id).catch(reportSaveError);
    addToast('User account deleted.', 'info');
  };

  // Settings access (audit E-1): Admin or an explicit canAccessSettings grant.
  // The settings tab used to be reachable by ANY role via #/settings deep link.
  const canAccessSettings =
    currentUser?.role === 'Admin' || Boolean(currentUser?.permissions?.canAccessSettings);

  // Render guard: non-privileged roles are bounced away from #/settings even on
  // deep links or role switches (audit E-1).
  useEffect(() => {
    if (activeTab === 'settings' && !canAccessSettings) {
      setActiveTab('dashboard');
    }
  }, [activeTab, canAccessSettings]);

  // Module visibility guard (Ko Hein 2026-08-14): if the active tab belongs to
  // a module disabled in Settings > Modules & Visibility (e.g. via deep link,
  // hash restore, or a role switch after toggling), bounce back to Dashboard.
  const disabledModules = systemSettings.disabledModules || [];
  useEffect(() => {
    if (disabledModules.includes(activeTab) || isLiteHiddenModule(activeTab)) {
      setActiveTab('dashboard');
    }
  }, [activeTab, disabledModules]);

  // Persistent Price Catalog Hook with global currency sync
  const priceCatalog = usePriceCatalog(systemSettings.currencySymbol, (newSymbol) => {
    handleUpdateSettings({ ...systemSettings, currencySymbol: newSymbol });
  });
  // iPad gets the clean UI (filters in drawer, minimal toolbars); desktops keep the original layout.
  const isIpad = useIsIpad();

  // Inventory Categories are independent from the Price List categories.
  const inventoryCategories = systemSettings.inventoryCategories || [];

  // Inventory filters use only the categories explicitly managed in
  // System Management. Part rows must not create new filter options.
  const inventoryCategoryOptions = [...inventoryCategories].sort((a, b) => a.localeCompare(b));
  const inventoryQualityOptions = Array.from(new Set(parts.map((part) => part.qualityTier).filter(Boolean))).sort((a, b) => a.localeCompare(b));
  // Device models for the inventory filter (mirrors what the module used to own).
  const inventoryDeviceModels = useMemo(() => priceCatalog.catalog.map((m) => m.model), [priceCatalog.catalog]);

  const normalizeInventoryPartCategory = (category: unknown) => {
    const value = String(category || '').trim().toLowerCase().replace(/\s+/g, ' ');
    if (value === 'back glass' || value === 'backglass') return 'Backglass';
    if (value === 'battery') return 'Battery';
    if (value === 'battery cell') return 'Battery Cell';
    return String(category || '').trim();
  };

  // Cloud-only ERP data. No browser cache or offline queue is used.
  useEffect(() => {
    const unsubWo = subscribeToCollection<WorkOrder>('workOrders', (data) => {
      setWorkOrders(data);
      setIsDbSynced(true);
    }, []);

    const unsubParts = LITE_MODE ? () => {} : subscribeToCollection<PartItem>('parts', (data) => {
      // Normalize older Supabase rows so inventory values remain editable after schema/UI changes.
      const normalized = data.map((raw: any) => ({
        ...raw,
        category: normalizeInventoryPartCategory(raw.category),
        quantityInStock: Number(raw.quantityInStock ?? raw.quantity_in_stock ?? raw.stock ?? 0),
        reorderPoint: Number(raw.reorderPoint ?? raw.reorder_point ?? 0),
        costPrice: Number(raw.costPrice ?? raw.cost_price ?? raw.cost ?? 0),
        sellingPrice: Number(raw.sellingPrice ?? raw.selling_price ?? raw.price ?? 0),
        qualityTier: (() => {
          const value = String(raw.qualityTier ?? raw.quality_tier ?? '').toLowerCase();
          if (value.includes('genuine') || value.includes('service pack')) return 'Genuine';
          if (value.includes('oem')) return 'OEM';
          return 'Original';
        })(),
      })) as PartItem[];
      setParts(normalized);
    }, []);

    const unsubSuppliers = LITE_MODE ? () => {} : subscribeToCollection<Supplier>('suppliers', (data) => {
      setSuppliers(data);
    }, []);

    const unsubRmas = LITE_MODE ? () => {} : subscribeToCollection<RmaItem>('rmas', (data) => {
      setRmas(data);
    }, []);

    const unsubPos = LITE_MODE ? () => {} : subscribeToCollection<PurchaseOrder>('purchaseOrders', (data) => {
      setPurchaseOrders(data);
    }, []);

    const unsubCust = subscribeToCollection<Customer>('customers', (data) => {
      setCustomers(data);
    }, []);

    const unsubTech = subscribeToCollection<Technician>('technicians', (data) => {
      setTechnicians(data);
    }, []);

    const unsubExpenses = subscribeToCollection<ExpenseItem>('expenses', (data) => {
      setExpenses(data);
    }, []);

    const unsubDebts = LITE_MODE ? () => {} : subscribeToCollection<SupplierDebtRecord>('supplierDebts', (data) => {
      setSupplierDebts(data);
    }, []);

    const unsubPayouts = subscribeToCollection<TechnicianPayoutRecord>('technicianPayouts', (data) => {
      setTechnicianPayouts(data);
    }, []);

    const unsubSettings = subscribeToCollection<any>('systemSettings', (data) => {
      if (data && data.length > 0) {
        const globalSettings = data.find((s) => s.id === 'global') || data[0];
        setSystemSettings((prev) => ({ ...prev, ...globalSettings }));
      }
    }, [{ id: 'global', ...DEFAULT_SYSTEM_SETTINGS }]);

    const unsubUsers = subscribeToCollection<AppUser>('users', (data) => {
      setUsers(data);
    }, []);

    return () => {
      unsubWo();
      unsubParts();
      unsubSuppliers();
      unsubRmas();
      unsubPos();
      unsubCust();
      unsubTech();
      unsubExpenses();
      unsubDebts();
      unsubPayouts();
      unsubSettings();
      unsubUsers();
    };
  }, []);

  // Realtime safety net: Supabase realtime does not push for collections outside
  // the supabase_realtime publication, so periodically refetch key collections
  // (only while the tab is visible) to keep tickets/parts fresh.
  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      if (cancelled || document.visibilityState !== 'visible') return;
      // Route through the shared collection cache so the 45s refresh, realtime
      // events and offline-optimistic writes all stay consistent (bug #1/#2).
      await Promise.allSettled([
        refreshCollection<WorkOrder>('workOrders'),
        ...(LITE_MODE ? [] : [refreshCollection<PartItem>('parts')]),
      ]);
    };
    // Push any queued offline writes first, then re-fetch.
    const refreshWithFlush = async () => {
      if (cancelled) return;
      await flushOfflineQueue();
      await refresh();
    };
    void refreshWithFlush(); // startup: flush leftovers from a previous session
    const id = window.setInterval(refresh, 45_000);
    // Manual refresh from the topbar database icon (OfflineSyncStatusBadge):
    // flush queued writes, then re-fetch every subscribed collection.
    const handleRefreshRequest = () => {
      void (async () => {
        if (cancelled) return;
        await flushOfflineQueue();
        refreshAllCollections();
      })();
    };
    window.addEventListener('erp-refresh-request', handleRefreshRequest);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      window.removeEventListener('erp-refresh-request', handleRefreshRequest);
    };
  }, []);

  // Global search: Cmd/Ctrl+K opens the cross-module search modal.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsGlobalSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  // Toast Notification System
  interface ToastNotification {
    id: string;
    type: 'success' | 'info' | 'error';
    title?: string;
    message: string;
    persistent?: boolean;
    dismissible?: boolean;
    workOrderId?: string;
  }
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  const reportSaveError = (err: unknown) => {
    console.error(err);
    const detail = err instanceof Error ? err.message : String(err);
    // audit A-P2: save errors stay visible (persistent, dismissible) — a
    // 4s auto-dismiss could be missed during a busy moment.
    addToast(`Database save failed: ${detail}`, 'error', 'Save Error — Check Connection', { persistent: true });
  };

  const addToast = (
    message: string, 
    type: 'success' | 'info' | 'error' = 'success', 
    title?: string,
    options?: { persistent?: boolean; dismissible?: boolean; workOrderId?: string }
  ) => {
    const id = Math.random().toString(36).substring(2, 9);
    const persistent = options?.persistent ?? false;
    const dismissible = options?.dismissible ?? true;
    const workOrderId = options?.workOrderId;

    // Dedup: identical message+type already visible → skip (prevents toast stacking)
    setToasts((prev) => {
      if (prev.some((t) => t.type === type && t.message === message && t.title === title)) return prev;
      return [...prev, { id, type, title, message, persistent, dismissible, workOrderId }];
    });
    if (!persistent) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    }
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Expose the toast system globally so deeply-nested modules (POS, Pipeline,
  // Settings, Inventory…) can fire toasts without prop-drilling. Replaces the
  // remaining native alert() calls flagged in the UI/UX audit.
  useEffect(() => {
    registerToastHandler(addToast);
    return () => unregisterToastHandler();
  }, [addToast]);

  // Verify stored session against the server on first load
  useEffect(() => {
    const token = localStorage.getItem('i35_session_token');
    if (!token) { setAuthChecking(false); return; }
    (async () => {
      try {
        const res = await fetch('/api/auth/verify', { method: 'POST', headers: { 'x-session-token': token } });
        // Audit G P2: verify must check the response BODY (success flag), not
        // just HTTP status — and the server re-stamps the current user info so
        // a stale localStorage role/permission snapshot can't outlive a server
        // change (role revoked / user deleted / email updated).
        let body: { success?: boolean; user?: { email?: string; name?: string } } = {};
        try { body = await res.json(); } catch { /* non-JSON */ }
        if (!res.ok || !body.success) {
          localStorage.removeItem('i35_session_token');
          localStorage.removeItem('i35_session_user');
          setAuthUser(null);
          setActiveUserId(null);
          notifyAccountChanged();
          return;
        }
        if (body.user?.email) {
          const freshUser = {
            email: body.user.email,
            name: body.user.name || '',
          };
          localStorage.setItem('i35_session_user', JSON.stringify(freshUser));
          setAuthUser(freshUser);
        }
      } catch { /* offline: keep session */ }
      setAuthChecking(false);
    })();
  }, []);

  // Auto-select the matching role profile when a staff account logs in
  // (multi-user auth: email → users collection record). Applied once per login so
  // manual role switches via the sidebar keep working.
  const appliedAuthEmailRef = useRef<string | null>(null);
  useEffect(() => {
    if (!authUser) {
      appliedAuthEmailRef.current = null;
      return;
    }
    const email = authUser.email.toLowerCase();
    if (appliedAuthEmailRef.current === email) return;
    const match = users.find((u) => u.email?.toLowerCase() === email);
    if (match) {
      appliedAuthEmailRef.current = email;
      setCurrentUser(match);
    }
  }, [authUser, users]);

  const handleLogout = () => {
    const token = localStorage.getItem('i35_session_token');
    if (token) { fetch('/api/auth/logout', { method: 'POST', headers: { 'x-session-token': token } }).catch(() => {}); }
    localStorage.removeItem('i35_session_token');
    localStorage.removeItem('i35_session_user');
    setAuthUser(null);
    // Settings (theme/language/geometry) revert to the anonymous defaults.
    setActiveUserId(null);
    notifyAccountChanged();
  };

  // Per-account settings: persist the active profile id so theme / language /
  // geometry follow the account, and re-hydrate providers on login & switch.
  useEffect(() => {
    if (authUser && currentUser) {
      setActiveUserId(currentUser.id);
      // Defer past mount: provider listeners attach after App's effect runs
      // (child effects fire before parent effects), so a direct dispatch here
      // would be lost on first load.
      setTimeout(() => notifyAccountChanged(), 0);
    }
  }, [authUser, currentUser]);

  // ── Browser Back/Forward support (iPad/desktop) ─────────────────────────
  // activeTab ↔ URL hash (#/tab). Back/Forward & the iPad edge-swipe gesture
  // now walk visited tabs instead of exiting the app.
  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;
  useEffect(() => {
    const onPopState = () => {
      const h = window.location.hash.replace(/^#\/?/, '');
      if (h && h !== activeTabRef.current) setActiveTab(h);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const target = '#/' + activeTab;
    if (window.location.hash !== target) {
      // First load: replace so the implicit landing entry isn't duplicated.
      if (!window.location.hash) window.history.replaceState(null, '', target);
      else window.history.pushState(null, '', target);
    }
  }, [activeTab]);

  // Smooth scroll to top & reset search on tab change for tab-isolated searching
  useEffect(() => {
    setSearchQuery('');
    const mainScroll = document.getElementById('main-content-scroll');
    if (mainScroll) {
      mainScroll.scrollTo({ top: 0, behavior: 'smooth' });
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeTab]);

  // AI repair-type classification: auto-classify recently completed tickets  // (Finished / Taken Out within the last 3 days). One ticket per pass, so
  // completed orders trickle through the queue without API bursts. The verdict
  // is persisted as repairTypeAI; failures get aiClassifyFailed (no retry loop).
  const aiClassifyInFlight = useRef<Set<string>>(new Set());
  // In-flight guard for handleMarkPaid (audit B/D P2): synchronously prevents
  // same-tick double-charge races that could double-consume stock, duplicate
  // expenses and double-accrue commission.
  const markingPaidRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const provider = systemSettings.aiProvider || 'local';
    if (provider === 'local') return;
    const cutoff = Date.now() - 3 * 24 * 60 * 60 * 1000;
    const candidate = workOrders.find(
      (wo) =>
        (wo.status === 'Finished' || wo.status === 'Taken Out') &&
        !wo.repairTypeAI &&
        !wo.aiClassifyFailed &&
        !aiClassifyInFlight.current.has(wo.id) &&
        new Date(wo.completedAt || wo.updatedAt || wo.createdAt).getTime() >= cutoff
    );
    if (!candidate) return;
    aiClassifyInFlight.current.add(candidate.id);
    const candidateId = candidate.id;
    classifyRepairWithAI(candidate, systemSettings).then(({ verdict, configError }) => {
      aiClassifyInFlight.current.delete(candidateId);
      // Config issue (no API key on server) — do NOT mark the ticket failed:
      // it stays eligible for retry once a key is configured (audit E-4). Only
      // genuine provider failures get aiClassifyFailed.
      if (configError && !verdict) return;
      // Fresh-merge write (audit B P2): merge into the CURRENT state instead
      // of saving the pre-fetch snapshot — a QA/status/line-item edit that
      // landed while the network call was in flight must not be clobbered.
      setWorkOrders((prev) =>
        prev.map((w) => {
          if (w.id !== candidateId) return w;
          const updated = {
            ...w,
            repairTypeAI: verdict || undefined,
            aiClassifyFailed: verdict ? false : true,
            updatedAt: new Date().toISOString(),
          };
          saveDocument('workOrders', updated).catch(reportSaveError);
          return updated;
        })
      );
    });
  }, [workOrders, systemSettings.aiProvider, systemSettings.aiModel, systemSettings.aiApiKey, systemSettings.aiBaseUrl]);

  // Manual AI re-scan: classify every finished ticket lacking a verdict
  // (including previously failed ones). Sequential + polite delay.
  const handleAiRescanTickets = async (): Promise<{ classified: number; failed: number }> => {
    const provider = systemSettings.aiProvider || 'local';
    if (provider === 'local') {
      addToast('Configure an AI provider first (Settings → AI Assistant & API).', 'error', 'AI Not Configured');
      return { classified: 0, failed: 0 };
    }
    const pending = workOrders.filter(
      (wo) =>
        (wo.status === 'Finished' || wo.status === 'Taken Out') &&
        !wo.repairTypeAI &&
        !aiClassifyInFlight.current.has(wo.id)
    );
    if (pending.length === 0) {
      addToast('No finished tickets need classification — all already have an AI verdict.', 'info', 'AI Re-scan');
      return { classified: 0, failed: 0 };
    }
    let classified = 0;
    let failed = 0;
    for (const wo of pending) {
      aiClassifyInFlight.current.add(wo.id);
      const woId = wo.id;
      const { verdict, configError } = await classifyRepairWithAI(wo, systemSettings);
      aiClassifyInFlight.current.delete(woId);
      // Config issue → leave the ticket un-flagged so it can be retried later
      // (audit E-4); do not burn a permanent aiClassifyFailed on it.
      if (configError && !verdict) {
        failed++;
        continue;
      }
      // Fresh-merge write (audit B P2): merge into current state so a ticket
      // edited while the scan was running keeps its newer fields.
      setWorkOrders((prev) =>
        prev.map((w) => {
          if (w.id !== woId) return w;
          const updated = {
            ...w,
            repairTypeAI: verdict || undefined,
            aiClassifyFailed: verdict ? false : true,
            updatedAt: new Date().toISOString(),
          };
          saveDocument('workOrders', updated).catch(reportSaveError);
          return updated;
        })
      );
      if (verdict) classified++;
      else failed++;
      await new Promise((r) => setTimeout(r, 200));
    }
    addToast(
      `AI re-scan complete: ${classified} classified, ${failed} skipped/failed.`,
      classified > 0 ? 'success' : 'info',
      'AI Re-scan'
    );
    return { classified, failed };
  };


  // Modals State
  const [isAiAssistantOpen, setIsAiAssistantOpen] = useState(false);
  const [settingsInitialSubTab, setSettingsInitialSubTab] = useState<'users' | 'ai'>('users');
  const [printableTagWo, setPrintableTagWo] = useState<WorkOrder | null>(null);
  const [isRecycleBinOpen, setIsRecycleBinOpen] = useState(false);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const filtersTriggerRef = useRef<HTMLButtonElement | null>(null);
  // Sidebar defaults to collapsed on desktop (Ko Hein 2026-08-05) so the
  // content area keeps usable width; user can still expand it manually.
  const [isCollapsed, setIsCollapsed] = useState(
    () => typeof window !== 'undefined' && window.innerWidth >= 1024
  );
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Quick Filter Helper States & Resetter
  const getActiveFilterCount = (tab: string): number => {
    const d = dateFilter.preset !== 'all' ? 1 : 0;
    switch (tab) {
      case 'trello':
        return (techFilter !== 'ALL' ? 1 : 0) + d;
      case 'intake':
      case 'pos':
      case 'suppliers':
      case 'qa':
        return (statusFilter !== 'ALL' ? 1 : 0) + d;
      case 'inventory':
        return (modelFilter !== 'ALL' ? 1 : 0) + (categoryFilter !== 'ALL' ? 1 : 0) + (stockFilter !== 'ALL' ? 1 : 0) + (inventoryLowStockOnly ? 1 : 0);
      case 'crm':
        return (customerTypeFilter !== 'ALL' ? 1 : 0) + d;
      case 'finance':
      case 'dashboard':
        return d;
      default:
        return 0;
    }
  };

  const renderMobileFilters = (tab: string) => {
    const drawerChips = ([
          statusFilter !== 'ALL' ? { key: 'stage', label: `Status: ${statusFilter}`, onClear: () => setStatusFilter('ALL') } : null,
          techFilter !== 'ALL' ? { key: 'tech', label: `Tech: ${techFilter === 'unassigned' ? 'Unassigned' : techFilter}`, onClear: () => setTechFilter('ALL') } : null,
          dateFilter.preset !== 'all' ? { key: 'date', label: 'Date', onClear: () => setDateFilter({ preset: 'all' }) } : null,
          searchQuery ? { key: 'q', label: `"${searchQuery}"`, onClear: () => setSearchQuery('') } : null,
        ].filter(Boolean) as Array<{ key: string; label: string; onClear: () => void }>)
    const labelCls = "mb-1 block text-xs font-extrabold uppercase tracking-wider text-muted";
    const rowCls = "flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-xs font-extrabold transition-colors cursor-pointer";
    return (
      <div className="space-y-3">
        {drawerChips.length > 0 ? (
          <div className="rounded-xl border border-line bg-surface p-2.5">
            <p className="mb-1.5 text-xs font-extrabold uppercase tracking-wider text-muted">Active ({drawerChips.length})</p>
            <ActiveFilterChips chips={drawerChips} />
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-line bg-surface px-3 py-2 text-center text-xs font-bold text-muted">
            No active filters — pick options below to filter the list
          </p>
        )}


        {(tab === 'intake' || tab === 'suppliers' || tab === 'qa') && (
          <div>
            <DrawerSelect
              label={tab === 'suppliers' ? 'RMA Status' : tab === 'qa' ? 'QA Status' : 'Status'}
              value={statusFilter}
              onChange={(v) => setStatusFilter(v as any)}
              options={
                tab === 'suppliers'
                    ? [
                        { value: 'ALL', label: 'All RMA Statuses' },
                        { value: 'Draft', label: 'Draft' },
                        { value: 'Shipped to Vendor', label: 'Shipped to Vendor' },
                        { value: 'Replaced / Refunded', label: 'Replaced / Refunded' },
                        { value: 'Closed', label: 'Closed' },
                      ]
                    : tab === 'qa'
                      ? [
                          { value: 'ALL', label: 'All QA Statuses' },
                          { value: 'Pending QA', label: 'Pending QA' },
                        ]
                      : [
                          { value: 'ALL', label: 'All Statuses' },
                          { value: 'Receive', label: 'Receive' },
                          { value: 'In Progress', label: 'In Progress' },
                          { value: 'Pending', label: 'Pending' },
                          { value: 'Finished', label: 'Finished' },
                          { value: 'Taken Out', label: 'Taken Out' },
                          { value: 'Cant Repair', label: 'Cant Repair' },
                          { value: 'Customer Not Repair', label: 'Customer Not Repair' },
                        ]
              }
            />
          </div>
        )}

        {tab === 'intake' && (
          <>
            <div>
              <label className={labelCls}>View</label>
              <div className="grid grid-cols-2 gap-1.5">
                {(['table', 'cards'] as const).map((v) => (
                  <Button
                    key={v}
                    type="button"
                    onClick={() => setIntakeViewMode(v)}
                    className={`flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-xs font-extrabold transition-colors cursor-pointer ${
                      intakeViewMode === v
                        ? 'bg-ink text-white border-ink shadow-2xs'
                        : 'bg-white text-ink border-line hover:bg-surface'
                    }`}
                  >
                    {v === 'table' ? <TableIcon className="w-4 h-4" /> : <LayoutGrid className="w-4 h-4" />}
                    {v === 'table' ? 'Table' : 'Grid Cards'}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <label className={labelCls}>Sort</label>
              <Button
                type="button"
                onClick={() => setIntakeSortByPriority((v) => !v)}
                className={`${rowCls} ${intakeSortByPriority ? 'bg-brand text-white border-brand shadow-2xs' : 'bg-white text-ink border-line hover:bg-surface'}`}
              >
                <span className="flex items-center gap-2">
                  <Flame className={`w-4 h-4 ${intakeSortByPriority ? 'text-white' : 'text-danger'}`} />
                  Priority First
                </span>
                <span className={`text-xs ${intakeSortByPriority ? 'text-white/80' : 'text-muted'}`}>{intakeSortByPriority ? 'On' : 'Off'}</span>
              </Button>
            </div>
            <div>
              <label className={labelCls}>Scan</label>
              <Button
                type="button"
                onClick={() => setIntakeScanRequest((n) => n + 1)}
                className={`${rowCls} bg-white text-ink border-line hover:bg-surface`}
              >
                <span className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-brand" />
                  Scan Barcode / QR
                </span>
              </Button>
            </div>
          </>
        )}

        {tab === 'inventory' && (
          <>
            <div>
              <DrawerSelect
                label="Model"
                value={modelFilter}
                onChange={(v) => setModelFilter(v as any)}
                options={[
                  { value: 'ALL', label: 'All Models' },
                  ...inventoryDeviceModels.map((m) => ({ value: m, label: m })),
                ]}
              />
            </div>
            <div>
              <DrawerSelect
                label="Category"
                value={categoryFilter}
                onChange={(v) => setCategoryFilter(v as any)}
                options={[
                  { value: 'ALL', label: 'All Categories' },
                  ...inventoryCategoryOptions.map((c) => ({ value: c, label: c })),
                ]}
              />
            </div>
            <div>
              <DrawerSelect
                label="Quality"
                value={stockFilter}
                onChange={(v) => setStockFilter(v as any)}
                options={[
                  { value: 'ALL', label: 'All Tiers' },
                  ...inventoryQualityOptions.map((t) => ({ value: t, label: t })),
                ]}
              />
            </div>
            <div>
              <label className={labelCls}>Stock Level</label>
              <Button
                type="button"
                onClick={() => setInventoryLowStockOnly((v) => !v)}
                className={`${rowCls} ${inventoryLowStockOnly ? 'bg-warning text-white border-warning shadow-2xs' : 'bg-white text-ink border-line hover:bg-surface'}`}
              >
                <span className="flex items-center gap-2">
                  <AlertTriangle className={`w-4 h-4 ${inventoryLowStockOnly ? 'text-white' : 'text-warning'}`} />
                  Low Stock Only
                </span>
                <span className={`text-xs ${inventoryLowStockOnly ? 'text-white/80' : 'text-muted'}`}>{inventoryLowStockOnly ? 'On' : 'Off'}</span>
              </Button>
            </div>
            <div>
              <label className={labelCls}>View</label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['stock', 'profit', 'matrix'] as const).map((v) => (
                  <Button
                    key={v}
                    type="button"
                    onClick={() => setInventoryViewMode(v)}
                    className={`flex items-center justify-center rounded-xl border px-2 py-2.5 text-xs font-extrabold transition-colors cursor-pointer active:scale-95 ${
                      inventoryViewMode === v
                        ? 'bg-ink text-white border-ink shadow-2xs'
                        : 'bg-white text-ink border-line hover:bg-surface'
                    }`}
                  >
                    {v === 'stock' ? 'Stock' : v === 'profit' ? 'Profit' : 'Matrix'}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <label className={labelCls}>Edit</label>
              <Button
                type="button"
                onClick={() => setInventoryEditMode((m) => !m)}
                className={`${rowCls} ${
                  inventoryEditMode
                    ? 'bg-warning text-white border-warning shadow-2xs'
                    : 'bg-white text-ink border-line hover:bg-surface'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Edit2 className={`w-4 h-4 ${inventoryEditMode ? 'text-white' : 'text-warning'}`} />
                  Edit Rows
                </span>
                <span className={`text-xs ${inventoryEditMode ? 'text-white/80' : 'text-muted'}`}>{inventoryEditMode ? 'On' : 'Off'}</span>
              </Button>
            </div>
            <div>
              <label className={labelCls}>Actions</label>
              <Button
                type="button"
                onClick={() => setInventoryTagsPrintOpen(true)}
                className={`${rowCls} bg-white text-ink border-line hover:bg-surface`}
              >
                <span className="flex items-center gap-2">
                  <Printer className="w-4 h-4 text-brand" />
                  Print Spare-Parts Tags (A4)
                </span>
              </Button>
            </div>
          </>
        )}

        {tab === 'crm' && (
          <div>
            <DrawerSelect
              label="Account Type"
              value={customerTypeFilter}
              onChange={(v) => setCustomerTypeFilter(v as any)}
              options={[
                { value: 'ALL', label: 'All Account Types' },
                { value: 'Retail', label: 'Retail' },
                { value: 'B2B Corporate', label: 'B2B Corporate' },
              ]}
            />
          </div>
        )}

        {(tab === 'intake' || tab === 'crm' || tab === 'suppliers' || tab === 'qa' || tab === 'finance' || tab === 'dashboard') && (
          <div>
            <DrawerSelect
              label="Date"
              value={dateFilter.preset === 'custom' ? 'custom' : dateFilter.preset}
              onChange={(v) => setDateFilter(v === 'all' ? { preset: 'all' } : { preset: v as DateFilterState['preset'] })}
              options={[
                { value: 'all', label: 'All Dates' },
                { value: 'today', label: 'Today' },
                { value: '7days', label: 'Last 7 Days' },
                { value: '30days', label: 'Last 30 Days' },
                { value: '60days', label: 'Last 60 Days' },
                {
                  value: 'custom',
                  // audit A-P2: same "Jan 3 - Jan 8" formatting as the header
                  // control (was raw ISO with a literal "(custom)" suffix).
                  label:
                    dateFilter.preset === 'custom' && dateFilter.startDate
                      ? `${formatDateLabel(dateFilter.startDate)} → ${formatDateLabel(dateFilter.endDate)}`
                      : 'Custom Range…',
                },
              ]}
            />
          </div>
        )}

      </div>
    );
  };

  

  const hasActiveFilters =
    searchQuery !== '' ||
    statusFilter !== 'ALL' ||
    techFilter !== 'ALL' ||
    categoryFilter !== 'ALL' ||
    stockFilter !== 'ALL' ||
    customerTypeFilter !== 'ALL' ||
    modelFilter !== 'ALL' ||
    dateFilter.preset !== 'all';

  const handleResetAllFilters = () => {
    setSearchQuery('');
    setStatusFilter('ALL');
    setTechFilter('ALL');
    setCategoryFilter('ALL');
    setStockFilter('ALL');
    setCustomerTypeFilter('ALL');
    setModelFilter('ALL');
    setInventoryLowStockOnly(false);
    setDateFilter({ preset: 'all' });
  };

  // Active vs Archived Work Orders
  const activeWorkOrders = workOrders.filter((w) => !w.isArchived);
  const archivedWorkOrders = workOrders.filter((w) => w.isArchived);

  // CRM roster: Supabase customer accounts + customers derived from existing
  // tickets — every ticket's customer is visible even without a standalone
  // customer account (no demo/seed data needed).
  const rosterCustomers = useMemo(() => {
    const cloudIds = new Set(customers.map((c) => c.id));
    const byKey = new Map<string, { base: Customer; orders: WorkOrder[] }>();
    activeWorkOrders.forEach((wo) => {
      // Audit C-P2 (roster key): digit-normalize the phone so formatting
      // variants (09xxx vs +959xxx vs spaces/dashes) of the same person merge
      // into ONE roster row instead of splitting into duplicates.
      const normPhone = String(wo.customerPhone || '').replace(/\D/g, '');
      const key =
        wo.customerId ||
        `${(wo.customerName || '').trim().toLowerCase()}|${normPhone}`;
      if (!key || cloudIds.has(key)) return;
      const entry = byKey.get(key);
      if (entry) {
        entry.orders.push(wo);
      } else {
        byKey.set(key, {
          base: {
            id: key,
            name: wo.customerName || 'Unknown Customer',
            email: wo.customerEmail || '',
            phone: wo.customerPhone || '',
            type: (wo.customerType as Customer['type']) || 'Retail',
            discountPercentage: 0,
            totalOrdersCount: 0,
            totalSpent: 0,
            createdAt: wo.createdAt,
          },
          orders: [wo],
        });
      }
    });
    const derived: Customer[] = [];
    byKey.forEach(({ base, orders }) => {
      derived.push({
        ...base,
        totalOrdersCount: orders.length,
        totalSpent: orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0),
        createdAt: orders.map((o) => o.createdAt || '').sort()[0] || base.createdAt,
      });
    });
    return [...customers, ...derived];
  }, [customers, activeWorkOrders]);

  // --- Handlers ---
  const handleUpdateSettings = (newSettings: SystemSettings) => {
    // Settings writes are admin-scoped (audit E-1): the tab was reachable by
    // any role via deep link, and this handler had no authorization check.
    // canEditPrices keeps the price-catalog currency picker working for
    // non-admin staff with that permission.
    if (
      currentUser.role !== 'Admin' &&
      !currentUser.permissions?.canAccessSettings &&
      !currentUser.permissions?.canEditPrices
    ) {
      addToast('🔒 Access Denied: Only Admin accounts can change settings.', 'error', 'Permission Denied');
      return;
    }
    // Preserve independently managed inventory data when another settings
    // draft (for example the print or shop form) is saved from an older draft.
    // Truthiness-aware merge (audit E P2): `??` only guards undefined, so a
    // STALE EMPTY ARRAY from an older/offline snapshot would wipe the
    // categories/tiers/bins another admin added. Only non-empty incoming
    // values replace the current list.
    const mergedSettings: SystemSettings = {
      ...systemSettings,
      ...newSettings,
      inventoryCategories: newSettings.inventoryCategories?.length
        ? newSettings.inventoryCategories
        : systemSettings.inventoryCategories,
      inventoryQualityTiers: newSettings.inventoryQualityTiers?.length
        ? newSettings.inventoryQualityTiers
        : systemSettings.inventoryQualityTiers,
      inventoryBinNames: newSettings.inventoryBinNames?.length
        ? newSettings.inventoryBinNames
        : systemSettings.inventoryBinNames,
    };
    setSystemSettings(mergedSettings);
    saveDocument('systemSettings', { id: 'global', ...mergedSettings }).catch(reportSaveError);
  };

  const handleAddTechnician = (tech: Technician) => {
    if (currentUser.role !== 'Admin') {
      addToast('🔒 Access Denied: Only Admin accounts can add technicians.', 'error', 'Permission Denied');
      return;
    }
    setTechnicians((prev) => [...prev, tech]);
    saveDocument('technicians', tech).catch(reportSaveError);
  };

  const handleUpdateTechnician = (tech: Technician) => {
    if (currentUser.role !== 'Admin') {
      addToast('🔒 Access Denied: Only Admin accounts can edit technicians.', 'error', 'Permission Denied');
      return;
    }
    setTechnicians((prev) => prev.map((t) => (t.id === tech.id ? tech : t)));
    saveDocument('technicians', tech).catch(reportSaveError);
  };

  const handleDeleteTechnician = (id: string) => {
    if (currentUser.role !== 'Admin') {
      addToast('🔒 Access Denied: Only Admin accounts can delete technicians.', 'error', 'Permission Denied');
      return;
    }
    setTechnicians((prev) => prev.filter((t) => t.id !== id));
    deleteDocument('technicians', id).catch(reportSaveError);
  };

  // Archive / Delete Work Order -> Move to Recycle Bin
  const handleDeleteWorkOrder = (id: string) => {
    if (currentUser.role !== 'Admin') {
      addToast('🔒 Access Denied: Only Admin accounts can delete or trash work orders.', 'error', 'Permission Denied');
      return;
    }
    const wo = workOrders.find((w) => w.id === id);
    if (!wo) return;
    const woLabel = `${wo.orderNumber || wo.id} (${wo.customerName})`;
    const updatedWo: WorkOrder = {
      ...wo,
      isArchived: true,
      archivedAt: new Date().toISOString(),
    };
    setWorkOrders((prev) => prev.map((w) => (w.id === id ? updatedWo : w)));
    saveDocument('workOrders', updatedWo).catch(reportSaveError);
    addToast(`Work order ${woLabel} moved to Recycle Bin`, 'info', 'Moved to Recycle Bin');
  };

  // Restore Work Order from Recycle Bin
  const handleRestoreWorkOrder = (id: string) => {
    const wo = workOrders.find((w) => w.id === id);
    if (!wo) return;
    const woLabel = `${wo.orderNumber || wo.id}`;
    const restoredWo: WorkOrder = {
      ...wo,
      isArchived: false,
      archivedAt: undefined,
    };
    setWorkOrders((prev) => prev.map((w) => (w.id === id ? restoredWo : w)));
    saveDocument('workOrders', restoredWo).catch(reportSaveError);
    addToast(`Work order ${woLabel} restored to active pipeline`, 'success', 'Ticket Restored');
  };

  // Permanent Delete Work Order
  const handlePermanentDeleteWorkOrder = (id: string) => {
    if (currentUser.role !== 'Admin') {
      addToast('🔒 Access Denied: Only Admin accounts can permanently delete items.', 'error', 'Permission Denied');
      return;
    }
    const wo = workOrders.find((w) => w.id === id);
    const woLabel = wo ? `${wo.orderNumber || wo.id}` : id;
    setWorkOrders((prev) => prev.filter((w) => w.id !== id));
    deleteDocument('workOrders', id).catch(reportSaveError);
    addToast(`Work order ${woLabel} permanently deleted`, 'info', 'Permanently Deleted');
  };

  // Restore All Archived Work Orders
  const handleRestoreAllWorkOrders = () => {
    if (currentUser.role !== 'Admin') {
      addToast('🔒 Access Denied: Only Admin accounts can restore archived work orders.', 'error', 'Permission Denied');
      return;
    }
    const count = archivedWorkOrders.length;
    if (count === 0) return;
    setWorkOrders((prev) =>
      prev.map((w) => {
        if (w.isArchived) {
          const restored = { ...w, isArchived: false, archivedAt: undefined };
          saveDocument('workOrders', restored).catch(reportSaveError);
          return restored;
        }
        return w;
      })
    );
    addToast(`Restored all ${count} archived work orders`, 'success', 'All Tickets Restored');
  };

  // Empty Recycle Bin
  const handleEmptyRecycleBin = () => {
    if (currentUser.role !== 'Admin') {
      addToast('🔒 Access Denied: Only Admin accounts can empty the recycle bin.', 'error', 'Permission Denied');
      return;
    }
    const archived = workOrders.filter((w) => w.isArchived);
    archived.forEach((w) => {
      deleteDocument('workOrders', w.id).catch(reportSaveError);
    });
    setWorkOrders((prev) => prev.filter((w) => !w.isArchived));
    addToast(`Permanently deleted ${archived.length} archived work orders`, 'info', 'Recycle Bin Emptied');
  };

  const handleSaveWorkOrder = (wo: WorkOrder) => {
    const isUpdate = workOrders.some((x) => x.id === wo.id);
    // Settings-driven stock reservation (Ko Hein 2026-08-11): autoReserveOnAssignment
    // reserves the ticket's inventory part lines once when the work moves into
    // In Progress (reservedQuantity is a soft hold; POS checkout still consumes
    // from quantityInStock and clears the reservation).
    if (systemSettings?.autoReserveOnAssignment && wo.status === 'In Progress') {
      const partLines = (wo.lineItems || []).filter((li) => li.partId && !li.isLabor && li.quantity > 0);
      if (partLines.length > 0 && !reservedTicketsRef.current.has(wo.id)) {
        reservedTicketsRef.current.add(wo.id);
        setParts((prev) =>
          prev.map((p) => {
            const line = partLines.find((li) => li.partId === p.id);
            if (!line) return p;
            return { ...p, reservedQuantity: (Number(p.reservedQuantity) || 0) + (Number(line.quantity) || 0) };
          })
        );
      }
    }
    // Anchor the warranty clock the moment a repair completes, mirroring
    // handleUpdateWorkOrderStatus — so single-save flows (POS checkout, soft
    // overrides) stamp completedAt without a second race-prone write (audit D-1).
    const withCompletedAt =
      (wo.status === 'Finished' || wo.status === 'Taken Out') && !wo.completedAt
        ? { ...wo, completedAt: wo.completedAt || new Date().toISOString() }
        : wo;
    if (checkIsDiagnosticCompleted(withCompletedAt)) {
      setToasts((prev) => prev.filter((t) => t.workOrderId !== withCompletedAt.id));
    }
    setWorkOrders((prev) => {
      const idx = prev.findIndex((x) => x.id === withCompletedAt.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = withCompletedAt;
        return copy;
      }
      return [withCompletedAt, ...prev];
    });
    saveDocument('workOrders', withCompletedAt).catch(reportSaveError);
    if (isUpdate) {
      addToast(`Work order ${withCompletedAt.id} updated successfully`, 'success', 'Work Order Saved');
    } else {
      addToast(`Work order ${withCompletedAt.id} created for ${withCompletedAt.customerName}`, 'success', 'Work Order Created');
    }
  };

  const handleUpdateWorkOrderStatus = (workOrderId: string, newStatus: WorkOrderStatus) => {
    const wo = workOrders.find((w) => w.id === workOrderId);
    if (wo && newStatus === 'Finished' && !checkIsAfterDiagnosticCompleted(wo)) {
      // Audit B-P2: the transition is intentionally allowed (soft override
      // flows exist in the pipeline/QA), so the messaging must match — a stuck
      // persistent non-dismissible ERROR toast implied the transition was
      // blocked. Downgrade to a dismissible info notice.
      addToast(
        `Ticket ${wo.orderNumber || wo.id} (${wo.deviceModel}) was marked as Finished WITHOUT a completed post-repair diagnostic checklist — run QA before checkout.`,
        'info',
        '⚠️ Finished Diagnostic Pending',
        { persistent: true, dismissible: true, workOrderId: wo.id }
      );
    } else if (wo && ['Receive', 'In Progress', 'Pending'].includes(newStatus) && !checkIsBeforeDiagnosticCompleted(wo)) {
      addToast(
        `Ticket ${wo.orderNumber || wo.id} (${wo.deviceModel}) moved to "${newStatus}" without initial 21-point diagnostic inspection.`,
        'info',
        '⚠️ Initial Diagnostic Pending'
      );
    } else if (wo && newStatus === 'Finished' && checkIsAfterDiagnosticCompleted(wo)) {
      setToasts((prev) => prev.filter((t) => t.workOrderId !== wo.id));
      addToast(`Ticket ${wo.orderNumber || wo.id} status updated to "Finished"`, 'success', 'Status Updated');
    } else {
      addToast(`Ticket ${wo?.orderNumber || workOrderId} status updated to "${newStatus}"`, 'info', 'Status Updated');
    }
    setWorkOrders((prev) =>
      prev.map((w) => {
        if (w.id === workOrderId) {
          const updated = {
            ...w,
            status: newStatus,
            // Stamp the status-change clock ONLY on a real status transition
            // (audit D-P2): updatedAt is bumped by every save (logs, assign,
            // QA), so bottleneck age must not anchor to it.
            statusChangedAt: newStatus !== w.status ? new Date().toISOString() : w.statusChangedAt,
            // Anchor the warranty clock the moment a repair completes; keep
            // the original completion stamp even if the ticket is edited later.
            ...((newStatus === 'Finished' || newStatus === 'Taken Out') && !w.completedAt
              ? { completedAt: new Date().toISOString() }
              : {}),
            updatedAt: new Date().toISOString(),
          };
          saveDocument('workOrders', updated).catch(reportSaveError);
          return updated;
        }
        return w;
      })
    );
  };

  const handleAddPart = (part: PartItem) => {
    setParts((prev) => [part, ...prev]);
    saveDocument('parts', part).catch(reportSaveError);
  };

  const handleUpdatePart = (part: PartItem) => {
    setParts((prev) => prev.map((p) => (p.id === part.id ? part : p)));
    saveDocument('parts', part).catch(reportSaveError);
  };

  const handleDeletePart = (partId: string) => {
    if (currentUser.role !== 'Admin') {
      addToast('🔒 Access Denied: Only Admin accounts can delete inventory parts.', 'error', 'Permission Required');
      return;
    }
    const p = parts.find((x) => x.id === partId);
    setParts((prev) => prev.filter((x) => x.id !== partId));
    deleteDocument('parts', partId).catch(reportSaveError);
    addToast(`Part SKU "${p ? p.name : partId}" deleted from inventory`, 'info', 'Part Deleted');
  };

  const handleUpdatePartStock = (partId: string, newStock: number) => {
    setParts((prev) =>
      prev.map((p) => {
        if (p.id === partId) {
          const updated = { ...p, quantityInStock: Math.max(0, newStock) };
          saveDocument('parts', updated).catch(reportSaveError);
          return updated;
        }
        return p;
      })
    );
  };

  const handleConsumeInventoryFromWorkOrder = (workOrder: WorkOrder, _paymentMethod: string) => {
    const inventoryLines = (workOrder.lineItems || []).filter((item) => item.partId && !item.isLabor && item.quantity > 0);
    if (!inventoryLines.length || workOrder.inventoryConsumedAt) return;

    const nowIso = new Date().toISOString();
    const aggregate = inventoryLines.reduce((acc, item) => {
      const partId = item.partId as string;
      const existing = acc.get(partId);
      const lineCost = (Number(item.unitCost) || 0) * (Number(item.quantity) || 0);
      if (existing) {
        existing.quantity += Number(item.quantity) || 0;
        existing.totalCost += lineCost;
      } else {
        acc.set(partId, {
          partId,
          partName: item.partName || item.description || partId,
          quantity: Number(item.quantity) || 0,
          unitCost: Number(item.unitCost) || 0,
          totalCost: lineCost,
        });
      }
      return acc;
    }, new Map<string, { partId: string; partName: string; quantity: number; unitCost: number; totalCost: number }>());

    const usageItems = [...aggregate.values()];
    if (!usageItems.length) return;

    const totalInventoryCost = usageItems.reduce((sum, item) => sum + item.totalCost, 0);
    const updatedWorkOrder: WorkOrder = {
      ...workOrder,
      inventoryConsumedAt: nowIso,
      inventoryConsumptionAmount: totalInventoryCost,
      inventoryConsumptionNote: `Inventory used for ${workOrder.orderNumber}`,
      inventorySettlementStatus: 'pending',
      updatedAt: nowIso,
    };

    setParts((prev) => {
      const next = prev.map((part) => {
        const consumed = aggregate.get(part.id);
        if (!consumed) return part;
        // Audit A-P2-14: never silently floor negative stock — surface the
        // shortfall so the shop knows the count drifted (stock may have been
        // reduced after the part was added to the ticket).
        const available = Number(part.quantityInStock || 0);
        if (consumed.quantity > available) {
          addToast(
            `${part.name} stock is ${available} but this ticket needs ${consumed.quantity} — stock floored at 0, please reconcile.`,
            'error',
            'Stock Shortfall'
          );
        }
        const updated = {
          ...part,
          quantityInStock: Math.max(0, available - consumed.quantity),
        };
        saveDocument('parts', updated).catch(reportSaveError);
        return updated;
      });
      return next;
    });

    saveDocument('workOrders', updatedWorkOrder).catch(reportSaveError);

    // audit C-P3: skip the expense row entirely when nothing was actually
    // consumed (zero-cost / free parts) — a 0 MMK "Inventory Consumption"
    // row only pollutes the finance P&L.
    if (totalInventoryCost > 0) {
      const inventoryExpense: Omit<ExpenseItem, 'id'> = {
        category: 'Inventory Consumption',
        description: `${workOrder.orderNumber} • ${workOrder.deviceModel} • ${usageItems.length} part(s) used from stock`,
        amount: totalInventoryCost,
        date: nowIso.split('T')[0],
        paymentMethod: 'Inventory Settlement',
        payee: workOrder.customerName,
        createdByName: currentUser.name,
      };
      handleAddExpense(inventoryExpense);
    }
    addToast(
      `Inventory stock deducted for ${workOrder.orderNumber}: ${usageItems.length} part(s), ${totalInventoryCost.toLocaleString()} MMK recorded.`,
      'success',
      'Inventory Settled'
    );
  };

  // Inventory Fund settlement: mark consumed parts as settled once the shop
  // has set the money aside / restocked. Clears the dashboard reminder.
  const handleSettleInventoryFund = (ids: string[]) => {
    if (!ids.length) return;
    const nowIso = new Date().toISOString();
    let settledCost = 0;
    setWorkOrders((prev) =>
      prev.map((w) => {
        if (ids.includes(w.id) && w.inventoryConsumptionAmount && w.inventorySettlementStatus !== 'settled') {
          settledCost += w.inventoryConsumptionAmount;
          const updated = {
            ...w,
            inventorySettlementStatus: 'settled' as const,
            inventorySettledAt: nowIso,
            updatedAt: nowIso,
          };
          saveDocument('workOrders', updated).catch(reportSaveError);
          return updated;
        }
        return w;
      })
    );
    addToast(
      `Inventory fund settled: ${ids.length} ticket${ids.length > 1 ? 's' : ''} · ${settledCost.toLocaleString()} MMK parts cost covered.`,
      'success',
      'Inventory Fund'
    );
  };

  const handleAddRma = (rma: RmaItem) => {
    setRmas((prev) => [rma, ...prev]);
    saveDocument('rmas', rma).catch(reportSaveError);
  };

  const handleAddSupplier = (supplier: Supplier) => {
    setSuppliers((prev) => [...prev, supplier]);
    saveDocument('suppliers', supplier).catch(reportSaveError);
  };

  // --- Purchase Orders (feature wiring: create + receive → restock) ---
  const handleAddPurchaseOrder = (po: PurchaseOrder) => {
    setPurchaseOrders((prev) => [po, ...prev]);
    saveDocument('purchaseOrders', po).catch(reportSaveError);
    addToast(`PO ${po.poNumber} created for ${po.supplierName} · ${po.totalCost.toLocaleString()} MMK`, 'success', 'Purchase Order');
  };

  // Mark a PO as Received and add its items back into parts stock (the flow was
  // display-only before — nothing ever wrote purchaseOrders or restocked).
  const handleReceivePurchaseOrder = (poId: string) => {
    const po = purchaseOrders.find((p) => p.id === poId);
    if (!po) return;
    if (po.status === 'Received') {
      addToast(`${po.poNumber} is already received.`, 'info', 'Purchase Order');
      return;
    }
    const nowIso = new Date().toISOString();
    let restocked = 0;
    setParts((prev) =>
      prev.map((part) => {
        const line = po.items.find((it) => it.partId === part.id);
        if (!line) return part;
        restocked += line.quantity;
        const updated = {
          ...part,
          quantityInStock: Number(part.quantityInStock || 0) + line.quantity,
        };
        saveDocument('parts', updated).catch(reportSaveError);
        return updated;
      })
    );
    const updatedPo: PurchaseOrder = {
      ...po,
      status: 'Received',
      receivedAt: nowIso,
    };
    setPurchaseOrders((prev) => prev.map((p) => (p.id === poId ? updatedPo : p)));
    saveDocument('purchaseOrders', updatedPo).catch(reportSaveError);
    addToast(`${po.poNumber} received — ${restocked} unit(s) added to stock.`, 'success', 'PO Received');
  };

  const handleUpdateSupplier = (supplier: Supplier) => {
    setSuppliers((prev) => prev.map((s) => (s.id === supplier.id ? supplier : s)));
    saveDocument('suppliers', supplier).catch(reportSaveError);
    addToast(`Supplier "${supplier.name}" updated successfully`, 'success', 'Supplier Updated');
  };

  const handleDeleteSupplier = (supplierId: string) => {
    if (currentUser.role !== 'Admin') {
      addToast('🔒 Access Denied: Only Admin accounts can delete suppliers.', 'error', 'Permission Required');
      return;
    }
    const sup = suppliers.find((s) => s.id === supplierId);
    setSuppliers((prev) => prev.filter((s) => s.id !== supplierId));
    deleteDocument('suppliers', supplierId).catch(reportSaveError);
    addToast(`Supplier "${sup ? sup.name : supplierId}" deleted from system`, 'info', 'Supplier Deleted');
  };

  const handleUpdateRmaStatus = (rmaId: string, status: RmaStatus, creditAmount?: number) => {
    const rma = rmas.find((r) => r.id === rmaId);
    setRmas((prev) =>
      prev.map((r) => {
        if (r.id === rmaId) {
          const updated = {
            ...r,
            status,
            vendorCreditAmount: creditAmount !== undefined ? creditAmount : r.vendorCreditAmount,
          };
          saveDocument('rmas', updated).catch(reportSaveError);
          return updated;
        }
        return r;
      })
    );
    // Replacement Received → the replacement part comes back into stock.
    if (status === 'Replacement Received' && rma) {
      const qty = Number(rma.quantity || 0);
      if (qty > 0) {
        setParts((prev) =>
          prev.map((p) => {
            if (p.id === rma.partId) {
              const updated = { ...p, quantityInStock: Number(p.quantityInStock || 0) + qty };
              saveDocument('parts', updated).catch(reportSaveError);
              return updated;
            }
            return p;
          })
        );
        addToast(`Replacement received — ${qty} × ${rma.partName} added back to stock.`, 'success', 'RMA Replacement');
      }
    }
  };

  const handleMarkPaid = (workOrder: WorkOrder, paymentMethod: string, completedAtIso?: string) => {
    // Synchronous idempotency guard (audit B/D P2): a same-tick double call
    // (or a parallel call from another surface) must not consume stock twice,
    // duplicate the Inventory Consumption expense, double-accrue commission or
    // double-count the customer totals. The render-closure isPaid check alone
    // races — two invocations can both observe isPaid === false.
    if (markingPaidRef.current.has(workOrder.id)) {
      addToast(`${workOrder.orderNumber || workOrder.id} is already being processed — no double charge.`, 'info', 'Already Paid');
      return;
    }
    const current = workOrders.find((w) => w.id === workOrder.id) || workOrder;
    if (current.isPaid) {
      addToast(`${current.orderNumber} is already paid — nothing to record.`, 'info', 'Already Paid');
      return;
    }
    markingPaidRef.current.add(workOrder.id);
    try {
      handleConsumeInventoryFromWorkOrder(current, paymentMethod);
    } catch (err) {
      markingPaidRef.current.delete(workOrder.id);
      throw err;
    }
    setWorkOrders((prev) =>
      prev.map((w) => {
        if (w.id === workOrder.id) {
          const updated: WorkOrder = {
            ...w,
            isPaid: true,
            paymentMethod: paymentMethod as any,
            status: 'Taken Out' as WorkOrderStatus,
            statusChangedAt: w.status !== 'Taken Out' ? new Date().toISOString() : w.statusChangedAt,
            completedAt: w.completedAt || completedAtIso || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          saveDocument('workOrders', updated).catch(reportSaveError);
          return updated;
        }
        return w;
      })
    );
    // Keep the stored customer record's totals in sync (CRM list + Telegram bot
    // read the stored totalSpent — it was frozen at 0 for every customer).
    // Match on customerId or digit-normalized phone — NEVER name alone (audit
    // C-P2): same-name customers would accrue the payment on the wrong person.
    const norm = (p: string) => (p || '').replace(/\D/g, '');
    const cust = customers.find(
      (c) =>
        c.id === current.customerId ||
        (current.customerPhone && c.phone && norm(c.phone) === norm(current.customerPhone))
    );
    if (cust) {
      const updatedCust: Customer = {
        ...cust,
        totalSpent: Number(cust.totalSpent || 0) + Number(current.totalAmount || 0),
        totalOrdersCount: Number(cust.totalOrdersCount || 0) + 1,
      };
      setCustomers((prev) => prev.map((c) => (c.id === cust.id ? updatedCust : c)));
      saveDocument('customers', updatedCust).catch(reportSaveError);
    }

    // Auto-create/update technician commission payout (Ko Hein 2026-08-10)
    const techId = current.assignedTechId || (current as WorkOrder & { qaTechnicianId?: string }).qaTechnicianId;
    if (techId && technicians.length > 0) {
      const tech = technicians.find((t) => t.id === techId);
      if (tech) {
        const repairType =
          current.repairTypeAI ||
          (current.serviceType === 'Hardware' ? ('hardware' as const) : ('spareparts' as const));
        const rate =
          repairType === 'hardware'
            ? tech.commissionRateHardware ?? tech.commissionRate ?? 0
            : tech.commissionRateParts ?? tech.commissionRate ?? 0;

        // Labor revenue (kept for the payout record display — commission itself
        // is based on profit after parts cost below).
        const laborRevenue = (current.lineItems || [])
          .filter((li) => li.isLabor)
          .reduce((s, li) => {
            const lineTotal = (Number(li.unitPrice) || 0) * (Number(li.quantity) || 0);
            const disc = li.lineItemDiscountPercent ? Math.round(lineTotal * (li.lineItemDiscountPercent / 100)) : 0;
            return s + lineTotal - disc;
          }, 0);
        // Commission base = profit AFTER parts (Ko Hein 2026-08-11): Amount Due
        // (Customer) − Parts at SELLING price — matches the POS System block,
        // where the parts deduction is shown at selling price (the repair price
        // list already includes parts). Mirrors POS estCommission + techAnalytics.
        const partsCost = (current.lineItems || [])
          .filter((li) => !li.isLabor)
          .reduce((s, li) => s + (Number(li.unitPrice) || 0) * (Number(li.quantity) || 1), 0);
        const commissionBase = Math.max(0, (current.totalAmount || 0) - partsCost);
        const commissionAmt = Math.round(commissionBase * (rate / 100));
        if (commissionAmt > 0) {
          const now = new Date();
          const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
          const existingPayout = technicianPayouts.find((p) => p.technicianId === tech.id && p.period === period);

          if (existingPayout) {
            const updatedPayout: TechnicianPayoutRecord = {
              ...existingPayout,
              totalTicketsClosed: (existingPayout.totalTicketsClosed || 0) + 1,
              totalLaborRevenue: (existingPayout.totalLaborRevenue || 0) + laborRevenue,
              totalPartsCost: (existingPayout.totalPartsCost || 0) + partsCost,
              commissionAmount: (existingPayout.commissionAmount || 0) + commissionAmt,
              netPayout: ((existingPayout.netPayout || 0) + commissionAmt),
            };
            setTechnicianPayouts((prev) => prev.map((p) => (p.id === existingPayout.id ? updatedPayout : p)));
            saveDocument('technicianPayouts', updatedPayout).catch(reportSaveError);
          } else {
            const newPayout: TechnicianPayoutRecord = {
              id: `payout-${tech.id}-${period}`,
              technicianId: tech.id,
              technicianName: tech.name,
              period,
              totalTicketsClosed: 1,
              totalLaborRevenue: laborRevenue,
              totalPartsCost: partsCost,
              commissionRatePercent: rate,
              commissionAmount: commissionAmt,
              netPayout: commissionAmt,
              status: 'Pending',
            };
            setTechnicianPayouts((prev) => [...prev, newPayout]);
            saveDocument('technicianPayouts', newPayout).catch(reportSaveError);
          }
        }
      }
    }
    addToast(`Payment recorded for ${workOrder.orderNumber} via ${paymentMethod} — Moved to Takeout`, 'success', 'Payment Received');
    // Release the in-flight guard once the state writes have been queued.
    window.setTimeout(() => markingPaidRef.current.delete(workOrder.id), 1500);
  };


  const handleSavePostRepairChecklist = (
    workOrderId: string,
    checklist: PostRepairChecklist,
    afterDiagnostics?: DiagnosticItemResult[],
    photos?: { before: string[]; after: string[] }
  ) => {
    setWorkOrders((prev) =>
      prev.map((w) => {
        if (w.id === workOrderId) {
          const updated = {
            ...w,
            postRepairChecklist: checklist,
            ...(afterDiagnostics ? { afterDiagnostics } : {}),
            intakePhotos: photos?.before?.length ? photos.before : w.intakePhotos,
            afterRepairPhotos: photos?.after?.length ? photos.after : w.afterRepairPhotos,
            status: w.status === 'Taken Out' ? ('Taken Out' as WorkOrderStatus) : ('Finished' as WorkOrderStatus),
            completedAt: w.completedAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          saveDocument('workOrders', updated).catch(reportSaveError);
          return updated;
        }
        return w;
      })
    );
    addToast(`QA Post-Repair Checklist completed for ${workOrderId}`, 'success', 'QA Passed');
  };

  // Reopen QA: clear a Finished ticket's passed post-repair checklist so it
  // flows back into the QA queue for re-inspection (bug #12). Status stays
  // Finished — the QA roster picks it up via the missing checklist.
  const handleReopenQa = (workOrderId: string) => {
    const target = workOrders.find((w) => w.id === workOrderId);
    if (!target) return;
    setWorkOrders((prev) =>
      prev.map((w) => {
        if (w.id === workOrderId) {
          const updated = {
            ...w,
            postRepairChecklist: undefined,
            afterRepairPhotos: undefined,
            // Audit P2 (QA gate bypass): the old diagnostics from the previous
            // inspection were left in place, so the ticket could be marked
            // Finished again without a re-inspection (checkIsAfterDiagnosticCompleted
            // saw the stale Pass/Fail entries). Clear them too — the re-opened
            // ticket must pass the full post-repair gate again.
            afterDiagnostics: undefined,
            updatedAt: new Date().toISOString(),
          };
          saveDocument('workOrders', updated).catch(reportSaveError);
          return updated;
        }
        return w;
      })
    );
    addToast(`${target.orderNumber || target.id} moved back to QA queue — re-run the 21-point check.`, 'info', 'QA Reopened');
    setActiveTab('qa');
  };

  const handleAddCustomer = (cust: Customer) => {
    setCustomers((prev) => [cust, ...prev]);
    saveDocument('customers', cust).catch(reportSaveError);
  };

  const handleUpdateCustomer = (updated: Customer) => {
    setCustomers((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    saveDocument('customers', updated).catch(reportSaveError);
  };

  const handleDeleteCustomer = (customerId: string) => {
    if (currentUser.role !== 'Admin') {
      addToast('🔒 Access Denied: Only Admin accounts can delete customer records.', 'error', 'Permission Required');
      return;
    }
    // Ticket-derived customers have no standalone account — deleting their tickets
    // is the only real removal; don't fire a bogus Supabase delete or a success toast.
    if (!customers.some((c) => c.id === customerId)) {
      addToast('This customer has no standalone account — it is derived from repair tickets. Archive/delete the tickets instead.', 'info', 'Nothing to Delete');
      return;
    }
    const cust = customers.find((c) => c.id === customerId);
    setCustomers((prev) => prev.filter((c) => c.id !== customerId));
    deleteDocument('customers', customerId).catch(reportSaveError);
    addToast(`Customer "${cust ? cust.name : customerId}" removed from database`, 'info', 'Customer Deleted');
  };

  const handleAddExpense = (expenseData: Omit<ExpenseItem, 'id'>) => {
    const newExp: ExpenseItem = {
      ...expenseData,
      id: `exp-${Date.now()}`
    };
    setExpenses((prev) => [newExp, ...prev]);
    saveDocument('expenses', newExp).catch(reportSaveError);
    addToast('Operating expense recorded successfully.', 'success', 'Expense Recorded');
  };

  

  const handleRecordSupplierPayment = (debtId: string, paymentAmount: number, paymentMethod: string, note: string) => {
    setSupplierDebts((prev) => prev.map((d) => {
      if (d.id === debtId) {
        const newPaid = d.paidAmount + paymentAmount;
        const newStatus = newPaid >= d.totalAmount ? 'Paid' : 'Partial';
        const updated = {
          ...d,
          paidAmount: newPaid,
          status: newStatus as any,
          paymentHistory: [
            ...(d.paymentHistory || []),
            { date: new Date().toISOString().split('T')[0], amount: paymentAmount, method: paymentMethod, note }
          ]
        };
        saveDocument('supplierDebts', updated).catch(reportSaveError);
        return updated;
      }
      return d;
    }));
    addToast(`Recorded payment of ${paymentAmount.toLocaleString()} MMK to supplier.`, 'success', 'Supplier Debt Updated');
  };

  const handleUpdatePayoutStatus = (payoutId: string, status: 'Pending' | 'Approved' | 'Paid') => {
    setTechnicianPayouts((prev) => prev.map((p) => {
      if (p.id === payoutId) {
        const updated = {
          ...p,
          status,
          paidAt: status === 'Paid' ? new Date().toISOString() : p.paidAt
        };
        saveDocument('technicianPayouts', updated).catch(reportSaveError);
        return updated;
      }
      return p;
    }));
    addToast(`Technician payout status updated to "${status}".`, 'success', 'Commission Status Updated');
  };

  const getTabInfo = (tab: string) => {
    switch (tab) {
      case 'dashboard': return { category: t('navRepair'), title: 'Dashboard' };
      case 'create-ticket': return { category: t('navRepair'), title: t('navCreateTicket') };
      case 'intake': return { category: t('navRepair'), title: t('navIntakeFull') };
      case 'simple-ticket': return { category: t('navRepair'), title: 'Simple Ticket' };
      case 'trello': return { category: t('navRepair'), title: 'Ticket Board' };
      case 'inventory': return { category: t('navInventory'), title: t('navPartsMatrix') };
      case 'suppliers': return { category: t('navInventory'), title: t('navSuppliers') };
      case 'price-catalog': return { category: t('navFinance'), title: t('navPriceList') };
      case 'pos': return { category: t('navFinance'), title: t('navPos') };
      case 'finance': return { category: t('navFinance'), title: 'Finance' };
      case 'crm': return { category: t('navPeople'), title: t('navCrm') };
      case 'follow-up': return { category: t('navRepair'), title: 'Follow-Ups' };
      case 'settings': return { category: t('navSettings'), title: t('navSettings') };
      case 'qa': return { category: t('navRepair'), title: t('navQa') };
      case 'mermaid': return { category: t('navMore'), title: t('navMermaid') };
      default: return { category: 'ERP', title: t('appTitle') };
    }
  };

  const currentTab = getTabInfo(activeTab);

  // Transient offline (audit B P2): keep the app mounted and state alive — a
  // flaky connection (shop Wi-Fi / hotspot) must not destroy half-entered
  // forms. The offline queue handles writes; we only show a non-blocking
  // banner. The full-screen block below is replaced by the banner overlay
  // rendered inside the layout (see OfflineBanner), so mid-form state survives.
  const offlineBanner = !isOnline ? (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[95] flex justify-center pt-3">
      <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-warning/30 bg-warning/10 px-4 py-2 text-xs font-bold text-warning shadow-md">
        <AlertTriangle className="h-3.5 w-3.5" />
        <span>Offline — changes are queued locally and will sync when reconnected</span>
      </div>
    </div>
  ) : null;

  if (authChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-brand" />
      </div>
    );
  }

  if (!authUser) {
    return <LoginPage onLoginSuccess={(u) => setAuthUser(u)} />;
  }

  return (
    <div className="basic-ui h-screen h-dvh w-full bg-surface text-ink font-sans antialiased flex flex-col lg:flex-row overflow-hidden selection:bg-brand selection:text-white">
      {/* Transient-offline banner (audit B P2) — app stays mounted, state kept */}
      {offlineBanner}
      {/* Persistent Left Sidebar Navigation */}
      <Navigation
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        workOrders={activeWorkOrders}
        systemSettings={systemSettings}
        currentUser={currentUser}
        users={users}
        onLogout={handleLogout}
        onOpenUserManagement={() => setActiveTab('settings')}
        onOpenNewWorkOrder={() => handleOpenNewWorkOrder()}
        onOpenRecycleBin={() => setIsRecycleBinOpen(true)}
        lowStockCount={parts.filter((p) => p.quantityInStock <= p.reorderPoint).length}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        isMobileMenuOpen={isMobileMenuOpen}
        isIpad={isIpad}
        isOnline={isOnline}
        disabledModules={systemSettings.disabledModules}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
      />

      {/* Main Right Content Column */}
      <div id="main-content-scroll" className={`relative flex h-full h-dvh min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto [scrollbar-gutter:stable] transition-[padding] duration-300 ${isIpad ? '' : isCollapsed ? 'lg:pl-14' : 'lg:pl-64'}`}>
        {/* Top Navigation Bar Header */}
        <header className="app-topbar flex flex-row items-center justify-between px-3 sm:px-5 h-[52px] min-h-[52px] bg-white border-b border-line sticky top-0 z-40 gap-2 shrink-0">
          {/* Active Tab Title & Mobile Toggle */}
          <div className="flex items-center space-x-2 sm:space-x-3 shrink-0 w-[150px] sm:w-[240px] lg:w-auto lg:shrink-0">
            <Button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className={`${isIpad ? '' : 'lg:hidden'} h-10 w-10 flex items-center justify-center bg-surface hover:bg-line border border-line text-ink rounded-xl active:scale-95 transition-all shrink-0 cursor-pointer`}
              aria-label="Toggle Navigation Menu"
              title="Toggle Navigation Menu"
            >
              {/* 3-line hamburger — clean, bold, evenly spaced for mobile */}
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.75"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M3.5 6.5h17" />
                <path d="M3.5 12h17" />
                <path d="M3.5 17.5h17" />
              </svg>
            </Button>
            <h1 className="font-extrabold text-ink tracking-tight text-sm sm:text-base truncate">
              {currentTab.title}
            </h1>
          </div>

          {/* Dynamic Header Actions & Quick Filters per Tab */}
          <div className="app-topbar-actions flex min-w-0 flex-1 items-center flex-nowrap gap-1.5 sm:gap-2 text-xs py-1 relative z-30 overflow-x-auto no-scrollbar max-w-full justify-end">
            {/* Reset All Filters Pill Button when any filter is active */}
            {hasActiveFilters && (
              <Button
                type="button"
                onClick={handleResetAllFilters}
                // audit A-P3: token colors (danger) + one label (was raw rose
                // and an sm: label swap that made the button jump width).
                className="h-10 px-2.5 bg-danger/10 hover:bg-danger/15 text-danger border border-danger/30 text-xs font-bold rounded-xl transition-all flex items-center space-x-1 cursor-pointer shrink-0 active:scale-95 shadow-2xs"
                title="Reset active search & filters"
              >
                <X className="w-3.5 h-3.5 text-danger" />
                <span>Reset Filters</span>
              </Button>
            )}
            {/* System Settings Header Actions */}
            {activeTab === 'settings' && (
              <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
                <Button variant="ghost"
                  type="button"
                  disabled={!settingsDirty}
                  onClick={async () => {
                    if (!settingsDirty) return;
                    const ok = await confirmDialog({
                      title: 'Discard Unsaved Changes',
                      message: 'Reset all unsaved settings edits back to the last saved state?',
                      confirmLabel: 'Discard Changes',
                      danger: true,
                    });
                    if (ok) settingsResetRef.current?.();
                  }}
                  className="h-10 px-2.5 sm:px-3 bg-surface hover:bg-line text-ink font-bold text-xs rounded-xl border border-line-strong transition-all flex items-center space-x-1 sm:space-x-1.5 cursor-pointer shadow-2xs active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                  title={settingsDirty ? 'Discard unsaved changes' : 'No unsaved changes'}
                >
                  <RotateCcw className="w-3.5 h-3.5 text-muted" />
                  <span className="hidden md:inline">Discard changes</span>
                  <span className="md:hidden">Discard</span>
                </Button>
                <Button
                  type="button"
                  disabled={!settingsDirty}
                  onClick={() => settingsSaveRef.current?.()}
                  className="h-10 px-3 sm:px-3.5 bg-brand hover:bg-brand-deep text-white font-extrabold text-xs rounded-xl transition-all shadow-2xs flex items-center space-x-1 sm:space-x-1.5 cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed relative"
                  title={settingsDirty ? 'Save all settings' : 'No unsaved changes'}
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save All Settings</span>
                  {settingsDirty && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-warning border-2 border-white animate-pulse" aria-label="Unsaved changes" />
                  )}
                </Button>
              </div>
            )}

            {/* Price Catalog: top navbar controls hidden — module has its own device switcher,
                settings live in Settings tab (Ko Hein 2026-08-09) */}
            {activeTab === 'price-catalog' || activeTab === 'inventory' ? null : ['intake', 'pos', 'inventory', 'crm', 'suppliers'].includes(activeTab) ? (
              /* Contextual Search Input — desktop only (modules have their own mobile search);
                  also hidden on iPad inventory where the navbar scan box handles search */
              !(isIpad && activeTab === 'inventory') && (
              <div className="relative hidden lg:block w-52 shrink-0">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
                <Input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  // audit A-P3: tab-specific name so the field stays labelled
                  // once the placeholder disappears while typing.
                  aria-label={
                    activeTab === 'intake' ? 'Search tickets'
                    : activeTab === 'inventory' ? 'Search parts'
                    : activeTab === 'crm' ? 'Search customers'
                    : activeTab === 'suppliers' ? 'Search suppliers'
                    : activeTab === 'qa' ? 'Search QA tickets'
                    : activeTab === 'pos' ? 'Search POS tickets'
                    : `Search ${currentTab.title}`
                  }
                  placeholder={
                    activeTab === 'intake'
                      ? "Search Ticket #, Customer, Phone..."
                      : activeTab === 'inventory'
                      ? "Search Part #, Category, SKU..."
                      : activeTab === 'crm'
                      ? "Search Name, Phone, Email..."
                      : activeTab === 'suppliers'
                      ? "Search Vendor, Part, RMA #..."
                      : activeTab === 'qa'
                      ? "Search Ticket #, Model, Tech..."
                      : activeTab === 'pos'
                      ? "Search Ticket #, Customer, Model, IMEI..."
                      : `Search ${currentTab.title}...`
                  }
                  className="w-full h-10 bg-surface text-xs text-ink placeholder-muted pl-7 pr-8 rounded-xl border border-line focus:bg-white focus:outline-none transition-all shadow-2xs"
                />
                {searchQuery && (
                  <Button variant="ghost"
                    onClick={() => setSearchQuery('')}
                    // audit A-P2/A-P3: lucide X (was a raw × glyph) + a
                    // padded hit target + aria-label.
                    aria-label="Clear search"
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 text-muted hover:text-ink"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
              )
            ) : null}

            {/* Dynamic Filters depending on Active Tab */}
            {activeTab === 'intake' && (
              <>
                <div className="hidden md:flex items-center gap-2">
                {/* Status Dropdown removed 2026-08-10 (Ko Hein) — roster has quick status
                    chips + filter indicator; status still resettable via those chips. */}

                {/* Date Filter Dropdown */}
                <DateFilterSelector filter={dateFilter} onChange={setDateFilter} compact iconOnly />

                {/* Scan + Simple Ticket — navbar (Ko Hein 2026-08-10); Table/Grid stay in roster chips row */}
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    onClick={() => setIntakeScanRequest((n) => n + 1)}
                    className="!h-8 !min-h-8 px-2.5 bg-brand hover:bg-brand-deep text-white font-extrabold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer shrink-0 active:scale-95"
                    title="Scan Device Barcode or QR Code"
                  >
                    <Camera className="w-3.5 h-3.5 text-white" />
                    <span className="hidden md:inline">Scan</span>
                  </Button>
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => setActiveTab('simple-ticket')}
                    className="!h-8 !min-h-8 px-2.5 rounded-lg border-line bg-white text-ink hover:border-brand hover:text-brand font-bold text-xs flex items-center gap-1.5 cursor-pointer shrink-0"
                    title="Open Simple Ticket form"
                  >
                    <ClipboardCheck className="w-3.5 h-3.5" />
                    <span className="hidden md:inline">Simple</span>
                  </Button>
                </div>

                </div>              </>
            )}

            {/* Work Intake controls moved into the roster chips row (Ko Hein 2026-08-10) */}



            {activeTab === 'dashboard' && (
              <>
                <div className="hidden md:flex items-center gap-2">
                <DateFilterSelector filter={dateFilter} onChange={setDateFilter} compact iconOnly />
                </div>
              </>
            )}

            {activeTab === 'dashboard' && (
              <>
                <div className={isIpad ? 'flex items-center gap-1.5' : 'hidden lg:flex items-center gap-1.5'}>
                  {[
                    { id: 'status-queue', label: 'Status Queue', icon: ListFilter },
                    { id: 'repair-data', label: 'Analytics', icon: Activity },
                    { id: 'tech-kpi', label: 'Technicians', icon: Users },
                    ...(LITE_MODE ? [] : [{ id: 'inventory', label: 'Inventory', icon: Boxes }]),
                    { id: 'finance', label: 'Finance', icon: Coins },
                    { id: 'warranty-watch', label: 'Warranty', icon: ShieldAlert },
                  ].map((tab) => {
                    const Icon = tab.icon;
                    const isActive = dashboardSubTab === tab.id;
                    return (
                      <Button
                        key={tab.id}
                        type="button"
                        onClick={() => {
                          setDashboardSubTab(tab.id);
                          dashboardRef.current?.setSubTab(tab.id as any);
                        }}
                        aria-pressed={isActive}
                        className={`px-3 h-10 rounded-xl text-xs font-extrabold transition-all flex items-center space-x-1.5 shrink-0 cursor-pointer border select-none active:scale-95 ${
                          isActive
                            ? 'bg-brand text-white border-brand shadow-xs'
                            : 'bg-white hover:bg-surface text-muted hover:text-ink border-line'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{tab.label}</span>
                      </Button>
                    );
                  })}
                </div>
              </>
            )}

            {activeTab === 'trello' && (
              <>
                <div className="hidden md:flex items-center gap-2">
                  <CustomDropdownMenu
                    value={techFilter}
                    onChange={(val) => setTechFilter(val)}
                    buttonClassName="!px-2.5 !py-1.5 !h-10 text-xs"
                    options={[
                      { value: 'ALL', label: 'All Techs' },
                      { value: 'unassigned', label: 'Unassigned' },
                      ...technicians.map((t) => ({ value: t.id, label: t.name })),
                    ]}
                  />
                  <DateFilterSelector filter={dateFilter} onChange={setDateFilter} compact iconOnly />
                </div>
              </>
            )}

            {activeTab === 'inventory' && (
              <>
              {/* Desktop/tablet row (sm+): search + view switcher + Add Part + ⋯ */}
              <div className={`hidden sm:flex items-center gap-1.5 sm:gap-2 shrink-0`}>
              {/* Scan / search — leftmost */}
              <div className="shrink-0">
                <div className="relative">
                  <ScanLine className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-brand" />
                  <Input
                    value={inventoryScanQuery}
                    onChange={(e) => {
                      setInventoryScanQuery(e.target.value);
                      setSearchQuery(e.target.value);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        inventoryScanSubmitRef.current?.();
                      }
                    }}
                    placeholder="Scan barcode or search part..."
                    autoComplete="off"
                    className="h-10 w-32 sm:w-40 xl:w-56 rounded-lg border border-line bg-white pl-8 pr-2 font-mono text-xs text-ink outline-none transition "
                  />
                </div>
              </div>

              {/* Stock / Profit / Matrix — desktop only (mobile: in ⋯ menu) */}
              <div className="hidden md:flex items-center gap-1.5 sm:gap-2 shrink-0">
                {(['stock', 'profit', 'matrix'] as const).map((v) => (
                  <Button
                    key={v}
                    type="button"
                    onClick={() => setInventoryViewMode(v)}
                    className={`h-9 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer focus:outline-none ${
                      inventoryViewMode === v
                        ? 'bg-brand text-white shadow-2xs'
                        : 'bg-white text-ink border border-line hover:border-brand hover:text-brand'
                    }`}
                  >
                    {v === 'stock' ? <List className="w-3.5 h-3.5" /> : v === 'profit' ? <TrendingUp className="w-3.5 h-3.5" /> : <Grid className="w-3.5 h-3.5" />}
                    {v === 'stock' ? 'Stock' : v === 'profit' ? 'Profit' : 'Matrix'}
                  </Button>
                ))}
              </div>

              {/* Add Part */}
              <Button
                type="button"
                onClick={() => setInventoryAddModalOpen(true)}
                className="hidden lg:inline-flex h-10 items-center gap-1.5 px-3 sm:px-3.5 bg-brand hover:bg-brand-deep text-white text-xs font-bold rounded-xl shadow-2xs transition-all active:scale-95 cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Part</span>
              </Button>

              {/* More actions — Print Tags + Edit (⋯) */}
              <div className={'relative block shrink-0'}>
                <Button
                  type="button"
                  ref={inventoryMoreAnchorRef}
                  onClick={() => setInventoryMoreOpen(!inventoryMoreOpen)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-white text-ink hover:border-brand hover:text-brand transition-colors cursor-pointer focus:outline-none"
                  title="More actions"
                  aria-label="More actions"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
                {inventoryMoreOpen && (
                  <FixedMoreMenu
                    anchorRef={inventoryMoreAnchorRef}
                    isOpen={inventoryMoreOpen}
                    editMode={inventoryEditMode}
                    onClose={() => setInventoryMoreOpen(false)}
                    onPrintTags={() => { setInventoryTagsPrintOpen(true); setInventoryMoreOpen(false); }}
                    onToggleEdit={() => { setInventoryEditMode((m) => !m); setInventoryMoreOpen(false); }}
                    onView={(v) => setInventoryViewMode(v)}
                    onAddPart={() => setInventoryAddModalOpen(true)}
                  />
                )}
              </div>
              </div>

              {/* Phone side menu (drawer) */}
              {inventorySideMenuOpen && (
                <div className="fixed inset-0 z-[70] sm:hidden" role="dialog" aria-modal="true" aria-label="Inventory menu">
                <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" role="presentation" aria-hidden="true" onClick={() => setInventorySideMenuOpen(false)} />
                  <div className="absolute right-0 top-0 flex h-full w-72 max-w-[85vw] flex-col bg-white shadow-2xl">
                    <div className="flex items-center justify-between border-b border-line px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <Boxes className="h-4 w-4 text-brand" />
                        <span className="text-sm font-extrabold text-ink">Parts Inventory</span>
                      </div>
                      <Button type="button" variant="iconGhost" onClick={() => setInventorySideMenuOpen(false)} aria-label="Close menu" className="rounded-lg p-1.5 text-muted hover:bg-surface hover:text-ink transition-colors cursor-pointer">
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex-1 space-y-5 overflow-y-auto p-3">
                      <div className="space-y-1.5">
                        <p className="px-2 text-[10px] font-extrabold uppercase tracking-wider text-muted">View</p>
                        {(['stock', 'profit', 'matrix'] as const).map((v) => (
                          <Button
                            key={v}
                            type="button"
                            onClick={() => { setInventoryViewMode(v); setInventorySideMenuOpen(false); }}
                            className={`w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-bold transition-colors cursor-pointer text-left ${
                              inventoryViewMode === v ? 'bg-brand text-white shadow-2xs' : 'text-ink hover:bg-surface'
                            }`}
                          >
                            {v === 'stock' ? <List className="h-4 w-4 shrink-0" /> : v === 'profit' ? <TrendingUp className="h-4 w-4 shrink-0" /> : <Grid className="h-4 w-4 shrink-0" />}
                            {v === 'stock' ? 'Stock & Quantities' : v === 'profit' ? 'Profit Analysis' : 'Stock Matrix'}
                          </Button>
                        ))}
                      </div>
                      <div className="space-y-1.5">
                        <p className="px-2 text-[10px] font-extrabold uppercase tracking-wider text-muted">Actions</p>
                        <Button type="button" onClick={() => { setInventoryAddModalOpen(true); setInventorySideMenuOpen(false); }} className="w-full flex items-center gap-2.5 rounded-xl bg-brand/10 px-3 py-2.5 text-xs font-extrabold text-brand hover:bg-brand/15 transition-colors cursor-pointer text-left">
                          <Plus className="h-4 w-4 shrink-0" /> Add Part
                        </Button>
                        <Button type="button" onClick={() => { setInventoryTagsPrintOpen(true); setInventorySideMenuOpen(false); }} className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-extrabold text-ink hover:bg-surface transition-colors cursor-pointer text-left">
                          <Printer className="h-4 w-4 shrink-0 text-brand" /> Print Tags
                        </Button>
                        <Button type="button" onClick={() => { setInventoryEditMode((m) => !m); setInventorySideMenuOpen(false); }} className={`w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-extrabold transition-colors cursor-pointer text-left ${inventoryEditMode ? 'bg-warning/10 text-warning hover:bg-warning/15' : 'text-ink hover:bg-surface'}`}>
                          <Edit2 className="h-4 w-4 shrink-0" /> {inventoryEditMode ? 'Done Editing' : 'Edit Stock'}
                        </Button>
                      </div>
                      <div className="space-y-2.5">
                        <p className="px-2 text-[10px] font-extrabold uppercase tracking-wider text-muted">Filters</p>
                        <DrawerSelect
                          label="Device Model"
                          value={modelFilter}
                          onChange={(v) => setModelFilter(v as any)}
                          options={[
                            { value: 'ALL', label: 'All Models' },
                            ...inventoryDeviceModels.map((model) => ({ value: model, label: model })),
                          ]}
                        />
                        <DrawerSelect
                          label="Category"
                          value={categoryFilter}
                          onChange={(v) => setCategoryFilter(v as any)}
                          options={[
                            { value: 'ALL', label: 'All Categories' },
                            ...inventoryCategoryOptions.map((category) => ({ value: category, label: category })),
                          ]}
                        />
                        <DrawerSelect
                          label="Quality Tier"
                          value={stockFilter}
                          onChange={(v) => setStockFilter(v as any)}
                          options={[
                            { value: 'ALL', label: 'All Tiers' },
                            ...inventoryQualityOptions.map((tier) => ({ value: tier, label: tier })),
                          ]}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
              </>
            )}

            {activeTab === 'crm' && (
              <>
                <div className="hidden md:flex items-center gap-2">
                <CustomDropdownMenu
                  value={customerTypeFilter}
                  onChange={(val) => setCustomerTypeFilter(val)}
                  buttonClassName="!px-2.5 !py-1.5 !h-10 text-xs"
                  triggerIcon={<Users className="w-3.5 h-3.5" />}
                  options={[
                    { value: 'ALL', label: 'All Account Types' },
                    { value: 'Retail', label: 'Retail' },
                    { value: 'B2B Corporate', label: 'B2B Corporate' },
                  ]}
                />

                <DateFilterSelector filter={dateFilter} onChange={setDateFilter} compact iconOnly />

                </div>              </>
            )}

            {activeTab === 'suppliers' && (
              <>
                <div className="hidden md:flex items-center gap-2">
                <CustomDropdownMenu
                  value={statusFilter}
                  onChange={(val) => setStatusFilter(val)}
                  buttonClassName="!px-2.5 !py-1.5 !h-10 text-xs"
                  triggerIcon={<ListFilter className="w-3.5 h-3.5" />}
                  options={[
                    { value: 'ALL', label: 'All RMA Statuses' },
                    { value: 'Draft', label: 'Draft' },
                    { value: 'Shipped to Vendor', label: 'Shipped to Vendor' },
                    { value: 'Replaced / Refunded', label: 'Replaced / Refunded' },
                    { value: 'Closed', label: 'Closed' },
                  ]}
                />

                <DateFilterSelector filter={dateFilter} onChange={setDateFilter} compact iconOnly />

                </div>              </>
            )}

            {activeTab === 'qa' && (
              <>
                {/* All QA Status dropdown + date filter + search removed 2026-08-10 (Ko Hein);
                    only the Table|Cards toggle lives here */}
                <div className="flex items-center gap-1.5">
                  <div className="bg-surface p-0.5 rounded-lg border border-line flex items-center gap-0.5">
                    <Button
                      variant="ghost"
                      type="button"
                      onClick={() => setQaViewMode('table')}
                      // audit A-P1: hover:bg-transparent! erased the ACTIVE
                      // fill exactly while the pointer was on it — use the
                      // dashboard subtab-pill pattern instead.
                      className={`!h-8 !min-h-8 w-8 px-0 rounded-md flex items-center justify-center cursor-pointer ${qaViewMode === 'table' ? 'bg-brand text-white shadow-2xs hover:bg-brand-deep' : 'text-muted hover:text-ink hover:bg-surface'}`}
                      title="Table View"
                      aria-label="Table View"
                    >
                      <TableIcon className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      type="button"
                      onClick={() => setQaViewMode('cards')}
                      className={`!h-8 !min-h-8 w-8 px-0 rounded-md flex items-center justify-center cursor-pointer ${qaViewMode === 'cards' ? 'bg-brand text-white shadow-2xs hover:bg-brand-deep' : 'text-muted hover:text-ink hover:bg-surface'}`}
                      title="Cards Grid View"
                      aria-label="Cards Grid View"
                    >
                      <LayoutGrid className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'finance' && (
              <div className="hidden md:flex items-center gap-2">
                <DateFilterSelector
                  filter={dateFilter}
                  onChange={setDateFilter}
                  compact
                  // audit A-P2: real `labeled` prop — the 8 `!` overrides are gone.
                  labeled
                />
                <Button
                  type="button"
                  onClick={() => financeModuleRef.current?.openAddExpense()}
                  className="inline-flex items-center space-x-1.5 bg-brand hover:bg-brand-deep text-white font-extrabold text-xs rounded-xl px-3.5 min-h-10 transition-all shadow-2xs active:scale-95 cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Record Expense</span>
                </Button>
              </div>
            )}



            {/* Contextual Action Button */}
            {activeTab === 'inventory' ? (
              <>
              {/* Model / Category / Tier filter icons — iPad navbar quick access */}
              {isIpad && (
                <div className="flex items-center gap-1.5 shrink-0">
                  <CustomDropdownMenu
                    value={modelFilter}
                    onChange={(v) => setModelFilter(v)}
                    iconOnly
                    triggerIcon={<Smartphone className="h-4 w-4" />}
                    ariaLabel="Filter by device model"
                    menuAlign="right"
                    buttonClassName="!h-10 !w-10"
                    options={[
                      { value: 'ALL', label: 'All Models' },
                      ...inventoryDeviceModels.map((m) => ({ value: m, label: m })),
                    ]}
                  />
                  <CustomDropdownMenu
                    value={categoryFilter}
                    onChange={(v) => setCategoryFilter(v)}
                    iconOnly
                    triggerIcon={<Layers className="h-4 w-4" />}
                    ariaLabel="Filter inventory by category"
                    menuAlign="right"
                    buttonClassName="!h-10 !w-10"
                    options={[
                      { value: 'ALL', label: 'All Categories' },
                      ...inventoryCategoryOptions.map((c) => ({ value: c, label: c })),
                    ]}
                  />
                  <CustomDropdownMenu
                    value={stockFilter}
                    onChange={(v) => setStockFilter(v)}
                    iconOnly
                    triggerIcon={<Filter className="h-4 w-4" />}
                    ariaLabel="Filter by quality tier"
                    menuAlign="right"
                    buttonClassName="!h-10 !w-10"
                    options={[
                      { value: 'ALL', label: 'All Tiers' },
                      ...inventoryQualityOptions.map((t) => ({ value: t, label: t })),
                    ]}
                  />
                </div>
              )}
              </>
            ) : activeTab === 'suppliers' ? (
              <Button
                onClick={() => setRmaModalOpen(true)}
                // audit A-P3: token hover pair (was raw purple-600).
                className="h-10 flex items-center space-x-1.5 px-3.5 bg-purple hover:bg-purple/90 text-white text-xs font-bold rounded-xl shadow-2xs transition-all active:scale-95 cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t('flagRma')}</span>
              </Button>
            ) : null}

            {/* Mobile filter drawer trigger — rightmost on phones (all tabs);
                audit A-P2: on iPad the always-visible drawer had no trigger
                ≥640px — show it at all widths when isIpad. */}
            <Button
              type="button"
              onClick={() => setIsFilterDrawerOpen(true)}
              className={`${isIpad ? '' : 'sm:hidden'} relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-line bg-white text-ink hover:border-brand hover:text-brand transition-all cursor-pointer`}
              title="Open filters"
              aria-label="Open filters"
            >
              <SlidersHorizontal className="h-4 w-4" />
              {getActiveFilterCount(activeTab) > 0 && (
                <span className="absolute -right-1 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1.5 text-[10px] font-black leading-none text-white">
                  {getActiveFilterCount(activeTab)}
                </span>
              )}
            </Button>

            {/* Live Supabase connection indicator — dev-mode only (VITE_DEV_MODE or localhost); hidden in production & iPad */}
          </div>
        </header>

        <main className="min-h-0 flex-1 w-full max-w-[1920px] mx-auto px-3 sm:px-4 lg:px-5 pt-3 pb-6 lg:pb-5 flex flex-col">
          <Suspense fallback={<ModuleLoadingSkeleton />}>
          <div key={activeTab} className="app-module-content flex-1 w-full min-w-0 flex flex-col">
              {activeTab === 'dashboard' && (
                <DashboardOverview
                  ref={dashboardRef}
                  activeSubTab={dashboardSubTab as any}
                  onSubTabChange={(tab) => setDashboardSubTab(tab)}
                  workOrders={activeWorkOrders}
                  parts={parts}
                  rmas={rmas}
                  technicians={technicians}
                  onNavigateToTab={setActiveTab}
                  dateFilter={dateFilter}
                  setDateFilter={setDateFilter}
                  currencySymbol={systemSettings?.currencySymbol}
                  onSettleInventoryFund={handleSettleInventoryFund}
                />
              )}

              {activeTab === 'create-ticket' && (
                <CreateTicketSoloPage
                  workOrders={workOrders}
                  customers={rosterCustomers}
                  technicians={technicians}
                  systemSettings={systemSettings}
                  priceCatalog={priceCatalog.catalog}
                  prefill={ticketPrefill}
                  onSaveWorkOrder={handleSaveWorkOrder}
                  onSelectPrintTag={(wo) => setPrintableTagWo(wo)}
                  onOpenAiAssistant={() => setIsAiAssistantOpen(true)}
                  onNavigateToTab={(tab) => {
                    setTicketPrefill(null);
                    setActiveTab(tab as any);
                  }}
                  onViewRepairTickets={() => {
                    setTicketPrefill(null);
                    setActiveTab('intake');
                  }}
                  onCancelEdit={handleCancelEdit}
                />
              )}

              {activeTab === 'intake' && (
                <IntakeWorkOrderModule
                  workOrders={activeWorkOrders}
                  parts={parts}
                  customers={rosterCustomers}
                  technicians={technicians}
                  currentUser={currentUser}
                  onSaveWorkOrder={handleSaveWorkOrder}
                  onSelectPrintTag={(wo) => setPrintableTagWo(wo)}
                  onOpenAiAssistant={() => setIsAiAssistantOpen(true)}
                  onOpenNewWorkOrder={(prefill) => handleOpenNewWorkOrder(prefill)}
                  onDeleteWorkOrder={handleDeleteWorkOrder}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  filterStatus={statusFilter}
                  setFilterStatus={setStatusFilter}
                  dateFilter={dateFilter}
                  setDateFilter={setDateFilter}
                  onNavigateToCreateTicket={(prefill) => {
                    if (prefill) setTicketPrefill(prefill);
                    setActiveTab('create-ticket');
                  }}
                  onNavigateToTab={(tab) => setActiveTab(tab as any)}
                  onReopenQa={handleReopenQa}
                  onUpdateWorkOrderStatus={handleUpdateWorkOrderStatus}
                  viewMode={intakeViewMode}
                  setViewMode={setIntakeViewMode}
                  sortByPriority={intakeSortByPriority}
                  setSortByPriority={setIntakeSortByPriority}
                  scanRequested={intakeScanRequest}
                />
              )}

              {activeTab === 'simple-ticket' && (
                <SimpleTicketCreator
                  workOrders={workOrders}
                  customers={rosterCustomers}
                  technicians={technicians}
                  priceCatalog={priceCatalog.catalog}
                  systemSettings={systemSettings}
                  onSaveWorkOrder={handleSaveWorkOrder}
                  onSelectPrintTag={(wo) => setPrintableTagWo(wo)}
                  onNavigateToTab={(tab) => setActiveTab(tab as any)}
                  onOpenAiAssistant={() => setIsAiAssistantOpen(true)}
                />
              )}

              {activeTab === 'trello' && (
                <TrelloBoardModule
                  workOrders={activeWorkOrders}
                  technicians={technicians}
                  systemSettings={systemSettings}
                  currentUser={currentUser}
                  onUpdateWorkOrderStatus={handleUpdateWorkOrderStatus}
                  onSaveWorkOrder={handleSaveWorkOrder}
                  onDeleteWorkOrder={handleDeleteWorkOrder}
                  onSelectPrintTag={(wo) => setPrintableTagWo(wo)}
                  onNavigateToTab={(tab) => setActiveTab(tab as any)}
                  onReopenQa={handleReopenQa}
                  techFilter={techFilter}
                  setTechFilter={setTechFilter}
                  dateFilter={dateFilter}
                  setDateFilter={setDateFilter}
                />
              )}

              {activeTab === 'inventory' && (
                <InventoryManagementModule
                  parts={parts}
                  suppliers={suppliers}
                  systemSettings={systemSettings}
                  deviceModels={inventoryDeviceModels}
                  priceCatalog={priceCatalog.catalog}
                  inventoryCategories={inventoryCategoryOptions}
                  onAddPart={handleAddPart}
                  onUpdatePart={handleUpdatePart}
                  onDeletePart={handleDeletePart}
                  onAddRma={handleAddRma}
                  onAddSupplier={handleAddSupplier}
                  onUpdateSupplier={handleUpdateSupplier}
                  onDeleteSupplier={handleDeleteSupplier}
                  onUpdatePartStock={handleUpdatePartStock}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  selectedCategory={categoryFilter}
                  setSelectedCategory={setCategoryFilter}
                  selectedQuality={stockFilter}
                  setSelectedQuality={setStockFilter}
                  selectedModelFilter={modelFilter}
                  setSelectedModelFilter={setModelFilter}
                  viewMode={inventoryViewMode}
                  setViewMode={setInventoryViewMode}
                  inlineEditMode={inventoryEditMode}
            showLowStockOnly={inventoryLowStockOnly}
            onSetLowStockOnly={(v) => setInventoryLowStockOnly(v)}
                  setInlineEditMode={setInventoryEditMode}
                  stockView={inventoryStockView}
                  setStockView={setInventoryStockView}
                  isTagsPrintOpen={inventoryTagsPrintOpen}
                  setIsTagsPrintOpen={setInventoryTagsPrintOpen}
                  scanQuery={inventoryScanQuery}
                  setScanQuery={setInventoryScanQuery}
                  onRegisterScanHandler={(fn) => { inventoryScanSubmitRef.current = fn; }}
                  onNavigateToTab={(tab) => setActiveTab(tab as any)}
                  showAddModal={inventoryAddModalOpen}
                  setShowAddModal={setInventoryAddModalOpen}
                />
              )}

              {activeTab === 'suppliers' && (
                <SupplierRmaModule
                  suppliers={suppliers}
                  rmas={rmas}
                  purchaseOrders={purchaseOrders}
                  parts={parts}
                  systemSettings={systemSettings}
                  onAddRma={handleAddRma}
                  onUpdatePart={handleUpdatePart}
                  onAddSupplier={handleAddSupplier}
                  onUpdateSupplier={handleUpdateSupplier}
                  onDeleteSupplier={handleDeleteSupplier}
                  onUpdateRmaStatus={handleUpdateRmaStatus}
                  onAddPurchaseOrder={handleAddPurchaseOrder}
                  onReceivePurchaseOrder={handleReceivePurchaseOrder}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  statusFilter={statusFilter}
                  setStatusFilter={setStatusFilter}
                  showNewRmaModal={rmaModalOpen}
                  setShowNewRmaModal={setRmaModalOpen}
                />
              )}

              {activeTab === 'price-catalog' && (
                <PriceCatalogModule
                  catalog={priceCatalog.catalog}
                  systemSettings={systemSettings}
                  updatePriceAndWarranty={priceCatalog.updatePriceAndWarranty}
                  importCatalogRows={priceCatalog.importCatalogRows}
                  addModel={priceCatalog.addModel}
                  renameModel={priceCatalog.renameModel}
                  deleteModel={priceCatalog.deleteModel}
                  resetToDefaults={priceCatalog.resetToDefaults}
                  currencySymbol={priceCatalog.currencySymbol}
                  setCurrencySymbol={priceCatalog.setCurrencySymbol}
                  folders={priceCatalog.folders}
                  toggleFolder={priceCatalog.toggleFolder}
                  setAllFoldersEnabled={priceCatalog.setAllFoldersEnabled}
                  addFolder={priceCatalog.addFolder}
                  renameFolder={priceCatalog.renameFolder}
                  categories={priceCatalog.categories}
                  updateCategoryLabel={priceCatalog.updateCategoryLabel}
                  addCategory={priceCatalog.addCategory}
                  deleteCategory={priceCatalog.deleteCategory}
                  applyGlobalPriceAdjustment={priceCatalog.applyGlobalPriceAdjustment}
                  applyGlobalWarranty={priceCatalog.applyGlobalWarranty}
                  formatPrice={priceCatalog.formatPrice}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  isDeviceModalOpen={priceCatalogDeviceModalOpen}
                  setIsDeviceModalOpen={setPriceCatalogDeviceModalOpen}
                  isSettingsModalOpen={priceCatalogSettingsModalOpen}
                  setIsSettingsModalOpen={setPriceCatalogSettingsModalOpen}
                  onRegisterExportHandler={(handler) => {
                    priceCatalogExportRef.current = handler;
                  }}
                  onOpenNewWorkOrder={(prefill) => handleOpenNewWorkOrder(prefill)}
                />
              )}

              {activeTab === 'follow-up' && (
                <CompletedDeviceFollowUpModule
                  workOrders={activeWorkOrders}
                  onSaveWorkOrder={handleSaveWorkOrder}
                  systemSettings={systemSettings}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  dateFilter={dateFilter}
                />
              )}

              {activeTab === 'pos' && (
                <PosInvoicingModule
                  workOrders={activeWorkOrders}
                  customers={rosterCustomers}
                  parts={parts}
                  technicians={technicians}
                  systemSettings={systemSettings}
                  onMarkPaid={handleMarkPaid}
                  onOpenPrintTag={(wo) => setPrintableTagWo(wo)}
                  onSaveWorkOrder={handleSaveWorkOrder}
                  priceCatalog={priceCatalog.catalog}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                />
              )}

              {activeTab === 'finance' && (
                <ShopFinancePlModule
                  ref={financeModuleRef}
                  workOrders={activeWorkOrders}
                  parts={parts}
                  technicians={technicians}
                  suppliers={suppliers}
                  expenses={expenses}
                  supplierDebts={supplierDebts}
                  technicianPayouts={technicianPayouts}
                  systemSettings={systemSettings}
                  onAddExpense={handleAddExpense}
                  onRecordSupplierPayment={handleRecordSupplierPayment}
                  onUpdatePayoutStatus={handleUpdatePayoutStatus}
                  onSettleInventoryFund={handleSettleInventoryFund}
                  dateFilter={dateFilter}
                  setDateFilter={setDateFilter}
                />
              )}

              {activeTab === 'crm' && (
                <CrmCustomerPortalModule
                  customers={rosterCustomers}
                  cloudCustomerIds={new Set(customers.map((c) => c.id))}
                  workOrders={activeWorkOrders}
                  onAddCustomer={handleAddCustomer}
                  onUpdateCustomer={handleUpdateCustomer}
                  onDeleteCustomer={handleDeleteCustomer}
                  systemSettings={systemSettings}
                  onSaveWorkOrder={handleSaveWorkOrder}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  customerTypeFilter={customerTypeFilter}
                  setCustomerTypeFilter={setCustomerTypeFilter}
                />
              )}

              {activeTab === 'mermaid' && (
                <MermaidModule />
              )}

              {activeTab === 'portal' && (
                <CustomerFacingWebPortal
                  workOrders={activeWorkOrders}
                  customers={rosterCustomers}
                  systemSettings={systemSettings}
                  onUpdateWorkOrder={handleSaveWorkOrder}
                  onExitPortalMode={() => setActiveTab('dashboard')}
                />
              )}

              {activeTab === 'qa' && (
                <QualityAssuranceModule
                  workOrders={activeWorkOrders}
                  technicians={technicians}
                  users={users}
                  currentUser={currentUser}
                  onSavePostRepairChecklist={handleSavePostRepairChecklist}
                  onErrorReturn={(id) => handleUpdateWorkOrderStatus(id, 'In Progress')}
                  systemSettings={systemSettings}
                  viewMode={qaViewMode}
                  setViewMode={setQaViewMode}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  statusFilter={statusFilter}
                  setStatusFilter={setStatusFilter}
                  onNavigateToTab={(tab) => setActiveTab(tab as any)}
                />
              )}

              {activeTab === 'settings' && canAccessSettings && (
                <SystemManagementSettingsModule
                  initialSubTab={settingsInitialSubTab}
                  settings={systemSettings}
                  onUpdateSettings={handleUpdateSettings}
                  technicians={technicians}
                  onAddTechnician={handleAddTechnician}
                  onUpdateTechnician={handleUpdateTechnician}
                  onDeleteTechnician={handleDeleteTechnician}
                  inventoryCategories={inventoryCategories}
                  onUpdateInventoryCategories={(inventoryCategories) => handleUpdateSettings({ ...systemSettings, inventoryCategories })}
                  parts={parts}
                  suppliers={suppliers}
                  onAddSupplier={handleAddSupplier}
                  onUpdateSupplier={handleUpdateSupplier}
                  onDeleteSupplier={handleDeleteSupplier}
                  onUpdatePart={handleUpdatePart}
                  onOpenRecycleBin={() => setIsRecycleBinOpen(true)}
                  archivedCount={archivedWorkOrders.length}
                  users={users}
                  currentUser={currentUser}
                  onAddUser={handleAddUser}
                  onUpdateUser={handleUpdateUser}
                  onDeleteUser={handleDeleteUser}
                  onRegisterActions={(actions) => {
                    settingsResetRef.current = actions.reset;
                    settingsSaveRef.current = actions.save;
                  }}
                  onDirtyChange={(dirty) => setSettingsDirty(dirty)}
                  onAiRescanTickets={handleAiRescanTickets}
                  priceCatalogManager={{
                    catalog: priceCatalog.catalog,
                    updatePriceAndWarranty: priceCatalog.updatePriceAndWarranty,
                    importCatalogRows: priceCatalog.importCatalogRows,
                    addModel: priceCatalog.addModel,
                    renameModel: priceCatalog.renameModel,
                    deleteModel: priceCatalog.deleteModel,
                    resetToDefaults: priceCatalog.resetToDefaults,
                    currencySymbol: priceCatalog.currencySymbol,
                    setCurrencySymbol: priceCatalog.setCurrencySymbol,
                    folders: priceCatalog.folders,
                    toggleFolder: priceCatalog.toggleFolder,
                    setAllFoldersEnabled: priceCatalog.setAllFoldersEnabled,
                    addFolder: priceCatalog.addFolder,
                    renameFolder: priceCatalog.renameFolder,
                    categories: priceCatalog.categories,
                    updateCategoryLabel: priceCatalog.updateCategoryLabel,
                    addCategory: priceCatalog.addCategory,
                    deleteCategory: priceCatalog.deleteCategory,
                    applyGlobalPriceAdjustment: priceCatalog.applyGlobalPriceAdjustment,
                    applyGlobalWarranty: priceCatalog.applyGlobalWarranty,
                    formatPrice: priceCatalog.formatPrice,
                  }}
                />
              )}
          </div>
          </Suspense>
        </main>
      </div>

      {/* Global Search Modal (Cmd/Ctrl+K) — mounted only when open so the chunk loads on demand */}
      {isGlobalSearchOpen && (
        <Suspense fallback={modalLoadingFallback}>
          <GlobalSearchModal
            open={isGlobalSearchOpen}
            onClose={() => setIsGlobalSearchOpen(false)}
            workOrders={workOrders}
            parts={parts}
            customers={rosterCustomers}
            onNavigate={(tab) => setActiveTab(tab)}
          />
        </Suspense>
      )}

      {/* AI FAB: mobile only — desktop uses the header AI button (decluttered) */}
      {!isAiAssistantOpen && (
        <Button
          type="button"
          onClick={() => setIsAiAssistantOpen(true)}
          // audit A-P3: bottom-4 matches the toast stack; z-40 (was z-30,
          // under drawers/toasts); safe-area kept in the calc.
          className="lg:hidden fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-brand text-white shadow-lg cursor-pointer active:scale-95 transition-transform hover:scale-105"
          aria-label="Open AI Assistant"
          title="Open AI Assistant"
        >
          <Sparkles size={20} />
        </Button>
      )}

      {/* AI Diagnostic Assistant Modal — mounted only when open */}
      {isAiAssistantOpen && (
        <Suspense fallback={modalLoadingFallback}>
          <AiDiagnosticAssistantModal
            isOpen={isAiAssistantOpen}
            onClose={() => setIsAiAssistantOpen(false)}
            workOrders={activeWorkOrders}
            parts={parts}
            customers={rosterCustomers}
            technicians={technicians}
            suppliers={suppliers}
            technicianPayouts={technicianPayouts}
            priceCatalog={priceCatalog.catalog}
            systemSettings={systemSettings}
            currentUserId={currentUser?.id}
            onOpenAiSettings={() => {
              setIsAiAssistantOpen(false);
              setSettingsInitialSubTab('ai');
              setActiveTab('settings');
              // One-shot: the next Settings visit must open the launcher,
              // not drill into the AI tab again (audit P2).
              window.setTimeout(() => setSettingsInitialSubTab('users'), 0);
            }}
          />
        </Suspense>
      )}

      {/* Printable Device Tag Sticker Modal — mounted only when printing */}
      {printableTagWo && (
        <Suspense fallback={modalLoadingFallback}>
          <DeviceTagPrinterModal
            workOrder={printableTagWo}
            systemSettings={systemSettings}
            onClose={() => setPrintableTagWo(null)}
          />
        </Suspense>
      )}

      {/* Recycle Bin & Archive Modal — mounted only when open */}
      {isRecycleBinOpen && (
        <Suspense fallback={modalLoadingFallback}>
          <RecycleBinModal
            isOpen={isRecycleBinOpen}
            onClose={() => setIsRecycleBinOpen(false)}
            archivedWorkOrders={archivedWorkOrders}
            onRestoreWorkOrder={handleRestoreWorkOrder}
            onPermanentDeleteWorkOrder={handlePermanentDeleteWorkOrder}
            onRestoreAll={handleRestoreAllWorkOrders}
            onEmptyRecycleBin={handleEmptyRecycleBin}
          />
        </Suspense>
      )}

            {/* Mobile filter drawer — per-tab filters in one right panel (dropdowns live here on mobile) */}
      <RightFilterDrawer
        open={isFilterDrawerOpen}
        onClose={() => setIsFilterDrawerOpen(false)}
        triggerRef={filtersTriggerRef}
        onReset={() => {
          handleResetAllFilters();
        }}
        resetDisabled={getActiveFilterCount(activeTab) === 0}
        alwaysVisible={isIpad}
        title={`${activeTab === 'crm' ? 'CRM' : activeTab === 'inventory' ? 'Inventory' : activeTab === 'suppliers' ? 'Suppliers' : activeTab === 'qa' ? 'QA' : activeTab === 'finance' ? 'Finance' : activeTab === 'dashboard' ? 'Dashboard' : 'Intake'} Filters`}
      >
        {renderMobileFilters(activeTab)}
      </RightFilterDrawer>

      <HoverTooltip />

      {/* App-styled confirm modal (replaces window.confirm) */}
      <ConfirmDialogHost />

      {/* Floating Toast Notification Container — bottom-right, compact, theme-following (Ko Hein 2026-08-11) */}
      <div className="fixed bottom-4 right-3 sm:right-4 z-[60] flex flex-col items-end gap-2 max-w-[320px] w-full pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className={`pointer-events-auto flex items-start gap-2.5 rounded-xl border p-2.5 shadow-lg backdrop-blur-sm ${
                toast.type === 'success'
                  ? 'bg-[var(--card-bg)] border-emerald-500/40 text-[var(--text-main)]'
                  : toast.type === 'error'
                  ? 'bg-[var(--card-bg)] border-rose-500/40 text-[var(--text-main)]'
                  : 'bg-[var(--card-bg)] border-sky-500/40 text-[var(--text-main)]'
              }`}
            >
              <span className={`mt-0.5 shrink-0 flex h-5 w-5 items-center justify-center rounded-full ${
                toast.type === 'success'
                  ? 'bg-emerald-500/15 text-emerald-500'
                  : toast.type === 'error'
                  ? 'bg-rose-500/15 text-rose-500'
                  : 'bg-sky-500/15 text-sky-500'
              }`}>
                {toast.type === 'success' && <CheckCircle2 className="w-3 h-3" />}
                {toast.type === 'error' && <AlertCircle className="w-3 h-3" />}
                {toast.type === 'info' && <Info className="w-3 h-3" />}
              </span>
              <div className="min-w-0 flex-1 pr-1">
                {/* audit A-P2: readable toast text (11px → xs / 10px tag). */}
                {toast.title && <div className="text-xs font-black leading-tight mb-0.5">{toast.title}</div>}
                <div className="text-xs leading-snug text-[var(--text-secondary)]">{toast.message}</div>
                {toast.persistent && (
                  <div className={`mt-1.5 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-extrabold border ${
                    toast.type === 'success'
                      ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                      : toast.type === 'error'
                      ? 'bg-rose-500/10 text-rose-500 border-rose-500/30'
                      : 'bg-sky-500/10 text-sky-500 border-sky-500/30'
                  }`}>
                    <AlertTriangle className="w-2.5 h-2.5 shrink-0" />
                    <span>Persistent</span>
                  </div>
                )}
              </div>
              {toast.dismissible !== false && (
                <button
                  type="button"
                  onClick={() => removeToast(toast.id)}
                  aria-label="Dismiss notification"
                  className="shrink-0 -mr-0.5 mt-0.5 p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--border-subtle)] transition-colors cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
