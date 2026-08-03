import React, { useState, useRef, useEffect, useMemo } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Sparkles, Plus, CircleDot, Search, Filter, Calculator, Folder, Settings, Download, Database, ExternalLink, ClipboardList, Kanban, Tag, ShieldCheck, AlertTriangle, CheckCircle2, Info, AlertCircle, X, Trash2, RotateCcw, Save, Menu, ChevronDown, PhoneCall, Truck, Boxes, CreditCard, Users, DollarSign, LayoutDashboard, Timer } from 'lucide-react';
import { subscribeToCollection, saveDocument, saveBatchDocuments, deleteDocument, clearCollection } from './lib/supabase';
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
  MicroSolderingLog, 
  PostRepairChecklist,
  DiagnosticItemResult,
  SystemSettings,
  ExpenseItem,
  SupplierDebtRecord,
  TechnicianPayoutRecord,
  AppUser,
  UserRole
} from './types';
import { DateFilterSelector, DateFilterState } from './components/common/DateFilterSelector';
import { checkIsDiagnosticCompleted, checkIsBeforeDiagnosticCompleted, checkIsAfterDiagnosticCompleted } from './utils/diagnosticUtils';
import { CustomDropdownMenu } from './components/common/CustomDropdownMenu';
import { UserRoleSwitcher } from './components/common/UserRoleSwitcher';
import { useLanguage } from './context/LanguageContext';
import { Navigation } from './components/Navigation';
import { DashboardOverview } from './components/dashboard/DashboardOverview';
import { IntakeWorkOrderModule } from './components/intake/IntakeWorkOrderModule';
import { CreateTicketSoloPage } from './components/intake/CreateTicketSoloPage';
import { StatusPipelineView } from './components/pipeline/StatusPipelineView';
import { InventoryManagementModule } from './components/inventory/InventoryManagementModule';
import { SupplierRmaModule } from './components/suppliers/SupplierRmaModule';
import { PosInvoicingModule } from './components/pos/PosInvoicingModule';
import { CrmCustomerPortalModule } from './components/crm/CrmCustomerPortalModule';
import { MicroSolderingModule } from './components/microsoldering/MicroSolderingModule';
import { QualityAssuranceModule } from './components/qa/QualityAssuranceModule';
import { AiDiagnosticAssistantModal } from './components/ai/AiDiagnosticAssistantModal';
import { DeviceTagPrinterModal } from './components/common/DeviceTagPrinterModal';
import { RecycleBinModal } from './components/common/RecycleBinModal';
import { PriceCatalogModule } from './components/prices/PriceCatalogModule';
import { SystemManagementSettingsModule } from './components/settings/SystemManagementSettingsModule';
import { CustomerFacingWebPortal } from './components/portal/CustomerFacingWebPortal';
import { CompletedDeviceFollowUpModule } from './components/followup/CompletedDeviceFollowUpModule';
import { ShopFinancePlModule } from './components/finance/ShopFinancePlModule';
import { usePriceCatalog } from './hooks/usePriceCatalog';
import { OfflineSyncStatusBadge } from './components/common/OfflineSyncStatusBadge';
import { HoverTooltip } from './components/common/HoverTooltip';
import { registerToastHandler, unregisterToastHandler } from './lib/toast';
import { LoginPage } from './components/auth/LoginPage';

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
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Dynamic Header Top Bar Filter States
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [techFilter, setTechFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [stockFilter, setStockFilter] = useState<string>('ALL');
  const [customerTypeFilter, setCustomerTypeFilter] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<DateFilterState>({ preset: 'all' });
  const [showBottlenecksOnly, setShowBottlenecksOnly] = useState<boolean>(false);

  // Modal triggers from top bar
  const [inventoryAddModalOpen, setInventoryAddModalOpen] = useState(false);
  const [rmaModalOpen, setRmaModalOpen] = useState(false);
  
  // Price Catalog top navigation controls state
  const [priceCatalogQuickCalcOpen, setPriceCatalogQuickCalcOpen] = useState(false);
  const [priceCatalogDeviceModalOpen, setPriceCatalogDeviceModalOpen] = useState(false);
  const [priceCatalogSettingsModalOpen, setPriceCatalogSettingsModalOpen] = useState(false);
  const priceCatalogExportRef = useRef<(() => void) | null>(null);
  
  // Settings top navigation controls state
  const settingsResetRef = useRef<(() => void) | null>(null);
  const settingsSaveRef = useRef<(() => void) | null>(null);
  
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
  const [isDbSynced, setIsDbSynced] = useState<boolean>(true);

  // User Management Handlers
  const handleAddUser = (newUser: AppUser) => {
    setUsers((prev) => [...prev, newUser]);
    saveDocument('users', newUser).catch(reportSaveError);
    addToast(`User account "${newUser.name}" (${newUser.role}) created successfully!`, 'success');
  };

  const handleUpdateUser = (updatedUser: AppUser) => {
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

  const handleSwitchUser = (user: AppUser) => {
    setCurrentUser(user);
    addToast(`Switched active profile to ${user.name} (${user.role})`, 'info', 'Role Switch');
    if (user.role === 'Technician') {
      const allowedTechTabs = ['pipeline', 'qa', 'crm'];
      if (!allowedTechTabs.includes(activeTab)) {
        setActiveTab('pipeline');
      }
    } else if (user.role === 'Reception') {
      if (activeTab === 'settings') {
        setActiveTab('intake');
      }
    }
  };

  // Persistent Price Catalog Hook with global currency sync
  const priceCatalog = usePriceCatalog(systemSettings.currencySymbol, (newSymbol) => {
    handleUpdateSettings({ ...systemSettings, currencySymbol: newSymbol });
  });

  // Inventory Categories are independent from the Price List categories.
  const inventoryCategories = systemSettings.inventoryCategories || [];

  // Inventory filters use only the categories explicitly managed in
  // System Management. Part rows must not create new filter options.
  const inventoryCategoryOptions = [...inventoryCategories].sort((a, b) => a.localeCompare(b));
  const inventoryQualityOptions = Array.from(new Set(parts.map((part) => part.qualityTier).filter(Boolean))).sort((a, b) => a.localeCompare(b));

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

    const unsubParts = subscribeToCollection<PartItem>('parts', (data) => {
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

    const unsubSuppliers = subscribeToCollection<Supplier>('suppliers', (data) => {
      setSuppliers(data);
    }, []);

    const unsubRmas = subscribeToCollection<RmaItem>('rmas', (data) => {
      setRmas(data);
    }, []);

    const unsubPos = subscribeToCollection<PurchaseOrder>('purchaseOrders', (data) => {
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

    const unsubDebts = subscribeToCollection<SupplierDebtRecord>('supplierDebts', (data) => {
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
    addToast(`Database save failed: ${detail}`, 'error', 'Save Error — Check Connection');
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

    setToasts((prev) => [...prev, { id, type, title, message, persistent, dismissible, workOrderId }]);
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
        const res = await fetch('/api/auth/verify', { headers: { 'x-session-token': token } });
        if (!res.ok) {
          localStorage.removeItem('i35_session_token');
          localStorage.removeItem('i35_session_user');
          setAuthUser(null);
        }
      } catch { /* offline: keep session */ }
      setAuthChecking(false);
    })();
  }, []);

  const handleLogout = () => {
    const token = localStorage.getItem('i35_session_token');
    if (token) { fetch('/api/auth/logout', { method: 'POST', headers: { 'x-session-token': token } }).catch(() => {}); }
    localStorage.removeItem('i35_session_token');
    localStorage.removeItem('i35_session_user');
    setAuthUser(null);
  };

  // Smooth scroll to top & reset search on tab change for tab-isolated searching
  useEffect(() => {
    setSearchQuery('');
    const mainScroll = document.getElementById('main-content-scroll');
    if (mainScroll) {
      mainScroll.scrollTo({ top: 0, behavior: 'smooth' });
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeTab]);

  // Modals State
  const [isAiAssistantOpen, setIsAiAssistantOpen] = useState(false);
  const [settingsInitialSubTab, setSettingsInitialSubTab] = useState<'users' | 'ai'>('users');
  const [printableTagWo, setPrintableTagWo] = useState<WorkOrder | null>(null);
  const [isRecycleBinOpen, setIsRecycleBinOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Quick Filter Helper States & Resetter
  const hasActiveFilters =
    searchQuery !== '' ||
    statusFilter !== 'ALL' ||
    techFilter !== 'ALL' ||
    categoryFilter !== 'ALL' ||
    stockFilter !== 'ALL' ||
    customerTypeFilter !== 'ALL' ||
    dateFilter.preset !== 'all' ||
    showBottlenecksOnly;

  const handleResetAllFilters = () => {
    setSearchQuery('');
    setStatusFilter('ALL');
    setTechFilter('ALL');
    setCategoryFilter('ALL');
    setStockFilter('ALL');
    setCustomerTypeFilter('ALL');
    setDateFilter({ preset: 'all' });
    setShowBottlenecksOnly(false);
  };

  // Active vs Archived Work Orders
  const activeWorkOrders = workOrders.filter((w) => !w.isArchived);
  const archivedWorkOrders = workOrders.filter((w) => w.isArchived);

  // --- Handlers ---
  const handleUpdateSettings = (newSettings: SystemSettings) => {
    // Preserve independently managed inventory data when another settings
    // draft (for example the print or shop form) is saved from an older draft.
    const mergedSettings: SystemSettings = {
      ...systemSettings,
      ...newSettings,
      inventoryCategories: newSettings.inventoryCategories ?? systemSettings.inventoryCategories,
      inventoryQualityTiers: newSettings.inventoryQualityTiers ?? systemSettings.inventoryQualityTiers,
      inventoryBinNames: newSettings.inventoryBinNames ?? systemSettings.inventoryBinNames,
    };
    setSystemSettings(mergedSettings);
    saveDocument('systemSettings', { id: 'global', ...mergedSettings }).catch(reportSaveError);
  };

  const handleAddTechnician = (tech: Technician) => {
    setTechnicians((prev) => [...prev, tech]);
    saveDocument('technicians', tech).catch(reportSaveError);
  };

  const handleUpdateTechnician = (tech: Technician) => {
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
    const archived = workOrders.filter((w) => w.isArchived);
    archived.forEach((w) => {
      deleteDocument('workOrders', w.id).catch(reportSaveError);
    });
    setWorkOrders((prev) => prev.filter((w) => !w.isArchived));
    addToast(`Permanently deleted ${archived.length} archived work orders`, 'info', 'Recycle Bin Emptied');
  };

  const handleClearAllWorkOrders = () => {
    setWorkOrders([]);
    clearCollection('workOrders').catch(reportSaveError);
    addToast('All work orders have been cleared', 'info', 'Work Orders Cleared');
  };

  const handleSaveWorkOrder = (wo: WorkOrder) => {
    const isUpdate = workOrders.some((x) => x.id === wo.id);
    if (checkIsDiagnosticCompleted(wo)) {
      setToasts((prev) => prev.filter((t) => t.workOrderId !== wo.id));
    }
    setWorkOrders((prev) => {
      const idx = prev.findIndex((x) => x.id === wo.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = wo;
        return copy;
      }
      return [wo, ...prev];
    });
    saveDocument('workOrders', wo).catch(reportSaveError);
    if (isUpdate) {
      addToast(`Work order ${wo.id} updated successfully`, 'success', 'Work Order Saved');
    } else {
      addToast(`Work order ${wo.id} created for ${wo.customerName}`, 'success', 'Work Order Created');
    }
  };

  const handleUpdateWorkOrderStatus = (workOrderId: string, newStatus: WorkOrderStatus) => {
    const wo = workOrders.find((w) => w.id === workOrderId);
    if (wo && newStatus === 'Finished' && !checkIsAfterDiagnosticCompleted(wo)) {
      addToast(
        `Ticket ${wo.orderNumber || wo.id} (${wo.deviceModel}) was marked as Finished without a completed post-repair diagnostic checklist. Mandatory quality test required!`,
        'error',
        '🚨 Finished Diagnostic Pending',
        { persistent: true, dismissible: false, workOrderId: wo.id }
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
          const updated = { ...w, status: newStatus, updatedAt: new Date().toISOString() };
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

  const handleConsumeInventoryFromWorkOrder = (workOrder: WorkOrder, paymentMethod: string) => {
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
      updatedAt: nowIso,
    };

    setParts((prev) => {
      const next = prev.map((part) => {
        const consumed = aggregate.get(part.id);
        if (!consumed) return part;
        const updated = {
          ...part,
          quantityInStock: Math.max(0, Number(part.quantityInStock || 0) - consumed.quantity),
        };
        saveDocument('parts', updated).catch(reportSaveError);
        return updated;
      });
      return next;
    });

    saveDocument('workOrders', updatedWorkOrder).catch(reportSaveError);

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
    addToast(
      `Inventory stock deducted for ${workOrder.orderNumber}: ${usageItems.length} part(s), ${totalInventoryCost.toLocaleString()} MMK recorded.`,
      'success',
      'Inventory Settled'
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
  };

  const handleMarkPaid = (workOrder: WorkOrder, paymentMethod: string) => {
    const current = workOrders.find((w) => w.id === workOrder.id) || workOrder;
    handleConsumeInventoryFromWorkOrder(current, paymentMethod);
    setWorkOrders((prev) =>
      prev.map((w) => {
        if (w.id === workOrder.id) {
          const updated: WorkOrder = {
            ...w,
            isPaid: true,
            paymentMethod: paymentMethod as any,
            status: 'Taken Out' as WorkOrderStatus,
            updatedAt: new Date().toISOString(),
          };
          saveDocument('workOrders', updated).catch(reportSaveError);
          return updated;
        }
        return w;
      })
    );
    addToast(`Payment recorded for ${workOrder.orderNumber} via ${paymentMethod} — Moved to Takeout`, 'success', 'Payment Received');
  };

  const handleSaveMicroSolderingLog = (workOrderId: string, log: MicroSolderingLog) => {
    setWorkOrders((prev) =>
      prev.map((w) => {
        if (w.id === workOrderId) {
          const updated = { ...w, microSolderingLog: log };
          saveDocument('workOrders', updated).catch(reportSaveError);
          return updated;
        }
        return w;
      })
    );
    addToast(`Micro-soldering diagnostic log saved for ${workOrderId}`, 'success', 'Log Saved');
  };

  const handleSavePostRepairChecklist = (
    workOrderId: string,
    checklist: PostRepairChecklist,
    afterDiagnostics?: DiagnosticItemResult[]
  ) => {
    setWorkOrders((prev) =>
      prev.map((w) => {
        if (w.id === workOrderId) {
          const updated = {
            ...w,
            postRepairChecklist: checklist,
            ...(afterDiagnostics ? { afterDiagnostics } : {}),
            status: 'Finished' as WorkOrderStatus,
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

  const handleAddCustomer = (cust: Customer) => {
    setCustomers((prev) => [cust, ...prev]);
    saveDocument('customers', cust).catch(reportSaveError);
  };

  const handleDeleteCustomer = (customerId: string) => {
    if (currentUser.role !== 'Admin') {
      addToast('🔒 Access Denied: Only Admin accounts can delete customer records.', 'error', 'Permission Required');
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

  const handleDeleteExpense = (expenseId: string) => {
    if (currentUser.role !== 'Admin') {
      addToast('🔒 Access Denied: Only Admin accounts can delete expenses.', 'error', 'Permission Required');
      return;
    }
    const exp = expenses.find((e) => e.id === expenseId);
    setExpenses((prev) => prev.filter((e) => e.id !== expenseId));
    deleteDocument('expenses', expenseId).catch(reportSaveError);
    addToast(`Expense record "${exp ? exp.description : expenseId}" deleted`, 'info', 'Expense Deleted');
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
      case 'pipeline': return { category: t('navRepair'), title: t('navPipeline') };
      case 'inventory': return { category: t('navInventory'), title: t('navPartsMatrix') };
      case 'suppliers': return { category: t('navInventory'), title: t('navSuppliers') };
      case 'price-catalog': return { category: t('navRepair'), title: t('navPriceList') };
      case 'pos': return { category: t('navFinance'), title: t('navPos') };
      case 'finance': return { category: t('navFinance'), title: 'Shop Finance & P&L Engine' };
      case 'crm': return { category: t('navManagement'), title: t('navCrm') };
      case 'follow-up': return { category: t('navRepair'), title: 'Follow Ups' };
      case 'settings': return { category: t('navManagement'), title: t('navSettings') };
      case 'qa': return { category: t('navRepair'), title: t('navQa') };
      default: return { category: 'ERP', title: t('appTitle') };
    }
  };

  const currentTab = getTabInfo(activeTab);

  if (!isOnline) {
    return (
      <main className="flex min-h-dvh w-full items-center justify-center bg-[#F5F5F7] p-5 text-[#1D1D1F]">
        <section className="w-full max-w-sm rounded-2xl border border-[#E5E5EA] bg-white p-6 text-center shadow-sm">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <h1 className="text-base font-bold">Internet connection required</h1>
          <p className="mt-1 text-xs leading-5 text-[#6E6E73]">This ERP uses live Supabase data only. Reconnect to open the system.</p>
        </section>
      </main>
    );
  }

  if (authChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5F5F7]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#E5E5EA] border-t-[#0071E3]" />
      </div>
    );
  }

  if (!authUser) {
    return <LoginPage onLoginSuccess={(u) => setAuthUser(u)} />;
  }

  return (
    <div className="basic-ui h-screen h-dvh w-full bg-[#F5F5F7] text-[#1D1D1F] font-sans antialiased flex flex-col lg:flex-row overflow-hidden selection:bg-[#0071E3] selection:text-white">
      {/* Persistent Left Sidebar Navigation */}
      <Navigation
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        workOrders={activeWorkOrders}
        systemSettings={systemSettings}
        currentUser={currentUser}
        users={users}
        onSwitchUser={handleSwitchUser}
        onLogout={handleLogout}
        onOpenUserManagement={() => setActiveTab('settings')}
        onOpenNewWorkOrder={() => handleOpenNewWorkOrder()}
        onOpenAiAssistant={() => setIsAiAssistantOpen(true)}
        onOpenRecycleBin={() => setIsRecycleBinOpen(true)}
        archivedCount={archivedWorkOrders.length}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
      />

      {/* Main Right Content Column */}
      <div id="main-content-scroll" className="relative flex h-full h-dvh min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto [scrollbar-gutter:stable]">
        {/* Top Navigation Bar Header */}
        <header className="app-topbar flex flex-row items-center justify-between px-3 sm:px-5 h-[52px] min-h-[52px] bg-white border-b border-[#E5E5EA] sticky top-0 z-40 gap-2 shrink-0">
          {/* Active Tab Title & Mobile Toggle */}
          <div className="flex items-center space-x-2 sm:space-x-3 shrink-0 min-w-0">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-1.5 bg-[#F5F5F7] hover:bg-[#E5E5EA] border border-[#E5E5EA] text-[#1D1D1F] rounded-xl active:scale-95 transition-all shrink-0 cursor-pointer"
              aria-label="Toggle Navigation Menu"
              title="Toggle Navigation Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="font-extrabold text-[#1D1D1F] tracking-tight text-sm sm:text-base truncate">
              {currentTab.title}
            </h1>
          </div>

          {/* Dynamic Header Actions & Quick Filters per Tab */}
          <div className="app-topbar-actions flex min-w-0 items-center flex-nowrap justify-end gap-1.5 sm:gap-2 text-xs py-1 shrink-0 relative z-30">
            {/* Reset All Filters Pill Button when any filter is active */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetAllFilters}
                className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-xl transition-all flex items-center space-x-1 cursor-pointer shrink-0 active:scale-95 shadow-2xs"
                title="Reset active search & filters"
              >
                <X className="w-3.5 h-3.5 text-rose-600" />
                <span className="hidden sm:inline">Reset Filters</span>
                <span className="sm:hidden">Reset</span>
              </button>
            )}
            {/* System Settings Header Actions */}
            {activeTab === 'settings' && (
              <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
                <button
                  type="button"
                  onClick={() => settingsResetRef.current?.()}
                  className="px-2.5 sm:px-3 py-1.5 bg-[#F5F5F7] hover:bg-[#E5E5EA] text-[#1D1D1F] font-bold text-xs rounded-xl border border-[#D2D2D7] transition-all flex items-center space-x-1 sm:space-x-1.5 cursor-pointer shadow-2xs active:scale-95"
                  title="Reset settings draft"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-[#86868B]" />
                  <span className="hidden sm:inline">Reset Draft</span>
                </button>
                <button
                  type="button"
                  onClick={() => settingsSaveRef.current?.()}
                  className="px-3 sm:px-3.5 py-1.5 bg-[#0071E3] hover:bg-[#0051B3] text-white font-extrabold text-xs rounded-xl transition-all shadow-2xs flex items-center space-x-1 sm:space-x-1.5 cursor-pointer active:scale-95"
                  title="Save all settings"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save All Settings</span>
                </button>
              </div>
            )}

            {/* Price Catalog Header Controls */}
            {activeTab === 'price-catalog' ? (
              <>
                <div className="relative w-28 sm:w-36 md:w-44 lg:w-52 shrink-0">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#86868B]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filter services..."
                    className="w-full bg-[#F5F5F7] text-xs text-[#1D1D1F] placeholder-[#86868B] pl-7 pr-5 py-1.5 rounded-xl border border-[#E5E5EA] focus:bg-white focus:outline-none focus:border-[#0071E3] transition-all shadow-2xs"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-[#86868B] hover:text-[#1D1D1F]"
                    >
                      ×
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setPriceCatalogQuickCalcOpen(true)}
                  className="px-2.5 sm:px-3 py-1.5 bg-[#34C759] hover:bg-[#34C759]/90 text-white font-extrabold text-xs rounded-xl transition-all flex items-center space-x-1 sm:space-x-1.5 shadow-2xs cursor-pointer shrink-0 active:scale-95"
                >
                  <Calculator className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Calc</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPriceCatalogDeviceModalOpen(true)}
                  className="px-2.5 sm:px-3 py-1.5 bg-[#0071E3] hover:bg-[#0071E3]/90 text-white font-extrabold text-xs rounded-xl transition-all flex items-center space-x-1 sm:space-x-1.5 shadow-2xs cursor-pointer shrink-0 active:scale-95"
                >
                  <Folder className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Model</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPriceCatalogSettingsModalOpen(true)}
                  className="px-2.5 sm:px-3 py-1.5 bg-[#F5F5F7] hover:bg-[#E5E5EA] text-[#1D1D1F] font-bold text-xs rounded-xl border border-[#E5E5EA] transition-all cursor-pointer shrink-0 shadow-2xs flex items-center space-x-1.5"
                  title="Folder & Catalog Settings"
                >
                  <Settings className="w-3.5 h-3.5 text-[#0071E3]" />
                  <span className="hidden md:inline">Settings</span>
                </button>

                <button
                  type="button"
                  onClick={() => priceCatalogExportRef.current?.()}
                  className="px-2.5 sm:px-3 py-1.5 bg-[#F5F5F7] hover:bg-[#E5E5EA] text-[#1D1D1F] font-bold text-xs rounded-xl border border-[#E5E5EA] transition-all cursor-pointer shrink-0 shadow-2xs flex items-center space-x-1.5"
                  title="Export Catalog to CSV"
                >
                  <Download className="w-3.5 h-3.5 text-[#34C759]" />
                  <span className="hidden md:inline">Export</span>
                </button>
              </>
            ) : ['intake', 'pipeline', 'inventory', 'crm', 'suppliers', 'qa'].includes(activeTab) ? (
              /* Contextual Search Input */
              <div className="relative w-28 sm:w-36 md:w-44 lg:w-52 shrink-0">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#86868B]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={
                    activeTab === 'pipeline'
                      ? "Search Model, IMEI, Name, Phone..."
                      : activeTab === 'intake'
                      ? "Search Ticket #, Customer, Phone..."
                      : activeTab === 'inventory'
                      ? "Search Part #, Category, SKU..."
                      : activeTab === 'crm'
                      ? "Search Name, Phone, Email..."
                      : activeTab === 'suppliers'
                      ? "Search Vendor, Part, RMA #..."
                      : activeTab === 'qa'
                      ? "Search Ticket #, Model, Tech..."
                      : `Search ${currentTab.title}...`
                  }
                  className="w-full bg-[#F5F5F7] text-xs text-[#1D1D1F] placeholder-[#86868B] pl-7 pr-5 py-1.5 rounded-xl border border-[#E5E5EA] focus:bg-white focus:outline-none focus:border-[#0071E3] transition-all shadow-2xs"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-[#86868B] hover:text-[#1D1D1F]"
                  >
                    ×
                  </button>
                )}
              </div>
            ) : null}

            {/* Dynamic Filters depending on Active Tab */}
            {activeTab === 'intake' && (
              <>
                {/* Status Dropdown */}
                <CustomDropdownMenu
                  value={statusFilter}
                  onChange={(val) => setStatusFilter(val)}
                  buttonClassName="!px-2.5 !py-1.5 text-xs"
                  options={[
                    { value: 'ALL', label: 'All Statuses' },
                    { value: 'Receive', label: 'Receive' },
                    { value: 'In Progress', label: 'In Progress' },
                    { value: 'Pending', label: 'Pending' },
                    { value: 'Finished', label: 'Finished' },
                    { value: 'Taken Out', label: 'Taken Out' },
                    { value: 'Cant Repair', label: 'Cant Repair' },
                    { value: 'Customer Not Repair', label: 'Customer Not Repair' },
                  ]}
                />

                {/* Date Filter Dropdown */}
                <DateFilterSelector filter={dateFilter} onChange={setDateFilter} compact />
              </>
            )}

            {activeTab === 'pipeline' && (
              <>
                <button
                  type="button"
                  onClick={() => setShowBottlenecksOnly(!showBottlenecksOnly)}
                  className={`py-1.5 px-3 rounded-xl border text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer shrink-0 ${
                    showBottlenecksOnly
                      ? 'bg-red-500 text-white border-red-600 shadow-2xs'
                      : 'bg-red-50 hover:bg-red-100 text-red-800 border-red-200'
                  }`}
                  title="Toggle Bottlenecks (>48h stationary)"
                >
                  <Timer className={`w-3.5 h-3.5 shrink-0 ${showBottlenecksOnly ? 'text-white' : 'text-red-600'}`} />
                  <span className="hidden sm:inline">
                    Bottlenecks (&gt;48h)
                    {workOrders.filter((wo) => {
                      if (wo.status === 'Taken Out' || wo.status === 'Finished' || wo.status === 'Cant Repair' || wo.status === 'Customer Not Repair') return false;
                      const refTime = Math.max(Date.now(), new Date('2026-07-22T08:46:00Z').getTime());
                      const updatedTime = new Date(wo.updatedAt || wo.createdAt).getTime();
                      if (isNaN(updatedTime)) return false;
                      return Math.max(0, Math.floor((refTime - updatedTime) / (1000 * 60 * 60))) >= 48;
                    }).length > 0 ? ` (${workOrders.filter((wo) => {
                      if (wo.status === 'Taken Out' || wo.status === 'Finished' || wo.status === 'Cant Repair' || wo.status === 'Customer Not Repair') return false;
                      const refTime = Math.max(Date.now(), new Date('2026-07-22T08:46:00Z').getTime());
                      const updatedTime = new Date(wo.updatedAt || wo.createdAt).getTime();
                      if (isNaN(updatedTime)) return false;
                      return Math.max(0, Math.floor((refTime - updatedTime) / (1000 * 60 * 60))) >= 48;
                    }).length})` : ''}
                  </span>
                  <span className="sm:hidden">&gt;48h</span>
                </button>

                <CustomDropdownMenu
                  value={statusFilter}
                  onChange={(val) => setStatusFilter(val)}
                  buttonClassName="!px-2.5 !py-1.5 text-xs"
                  options={[
                    { value: 'ALL', label: 'All Stages' },
                    { value: 'Receive', label: 'Receive' },
                    { value: 'In Progress', label: 'In Progress' },
                    { value: 'Pending', label: 'Pending' },
                    { value: 'Finished', label: 'Finished' },
                    { value: 'Taken Out', label: 'Taken Out' },
                    { value: 'Cant Repair', label: 'Cant Repair' },
                    { value: 'Customer Not Repair', label: 'Customer Not Repair' },
                  ]}
                />

                <CustomDropdownMenu
                  value={techFilter}
                  onChange={(val) => setTechFilter(val)}
                  buttonClassName="!px-2.5 !py-1.5 text-xs"
                  options={[
                    { value: 'ALL', label: 'All Techs' },
                    { value: 'unassigned', label: 'Unassigned' },
                    ...technicians.map((t) => ({ value: t.id, label: t.name })),
                  ]}
                />

                <DateFilterSelector filter={dateFilter} onChange={setDateFilter} compact />
              </>
            )}

            {activeTab === 'dashboard' && (
              <>
                <DateFilterSelector filter={dateFilter} onChange={setDateFilter} compact />
                <button
                  type="button"
                  onClick={() => setIsAiAssistantOpen(true)}
                  className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-bold rounded-xl transition-all flex items-center space-x-1.5 cursor-pointer shrink-0 active:scale-95"
                  title="Open AI Diagnostic Assistant"
                >
                  <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                  <span className="hidden sm:inline">AI Assistant</span>
                </button>
              </>
            )}

            {activeTab === 'inventory' && (
              <>
                <CustomDropdownMenu
                  value={categoryFilter}
                  onChange={(val) => setCategoryFilter(val)}
                  iconOnly
                  triggerIcon={<Tag className="h-3.5 w-3.5" />}
                  ariaLabel="Filter inventory by category"
                  menuAlign="right"
                  options={[
                    { value: 'ALL', label: 'All Categories' },
                    ...inventoryCategoryOptions.map((category) => ({ value: category, label: category })),
                  ]}
                />

                <CustomDropdownMenu
                  value={stockFilter}
                  onChange={(val) => setStockFilter(val)}
                  iconOnly
                  triggerIcon={<ShieldCheck className="h-3.5 w-3.5" />}
                  ariaLabel="Filter inventory by quality tier"
                  menuAlign="right"
                  options={[
                    { value: 'ALL', label: 'All Tiers' },
                    ...inventoryQualityOptions.map((tier) => ({ value: tier, label: tier })),
                  ]}
                />

                <DateFilterSelector filter={dateFilter} onChange={setDateFilter} compact iconOnly />
              </>
            )}

            {activeTab === 'pos' && (
              <>
                <CustomDropdownMenu
                  value={statusFilter}
                  onChange={(val) => setStatusFilter(val)}
                  buttonClassName="!px-2.5 !py-1.5 text-xs"
                  options={[
                    { value: 'ALL', label: 'All Checkout Status' },
                    { value: 'Pending Payment', label: 'Unpaid / Ready' },
                    { value: 'Paid', label: 'Paid' },
                  ]}
                />

                <DateFilterSelector filter={dateFilter} onChange={setDateFilter} compact />
              </>
            )}

            {activeTab === 'crm' && (
              <>
                <CustomDropdownMenu
                  value={customerTypeFilter}
                  onChange={(val) => setCustomerTypeFilter(val)}
                  buttonClassName="!px-2.5 !py-1.5 text-xs"
                  options={[
                    { value: 'ALL', label: 'All Account Types' },
                    { value: 'Retail', label: 'Retail' },
                    { value: 'B2B Corporate', label: 'B2B Corporate' },
                    { value: 'Wholesale Mail-In', label: 'Wholesale' },
                  ]}
                />

                <DateFilterSelector filter={dateFilter} onChange={setDateFilter} compact />
              </>
            )}

            {activeTab === 'suppliers' && (
              <>
                <CustomDropdownMenu
                  value={statusFilter}
                  onChange={(val) => setStatusFilter(val)}
                  buttonClassName="!px-2.5 !py-1.5 text-xs"
                  options={[
                    { value: 'ALL', label: 'All RMA Statuses' },
                    { value: 'Draft', label: 'Draft' },
                    { value: 'Shipped to Vendor', label: 'Shipped to Vendor' },
                    { value: 'Replaced / Refunded', label: 'Replaced / Refunded' },
                    { value: 'Closed', label: 'Closed' },
                  ]}
                />

                <DateFilterSelector filter={dateFilter} onChange={setDateFilter} compact />
              </>
            )}

            {activeTab === 'qa' && (
              <>
                <CustomDropdownMenu
                  value={statusFilter}
                  onChange={(val) => setStatusFilter(val)}
                  buttonClassName="!px-2.5 !py-1.5 text-xs"
                  options={[
                    { value: 'ALL', label: 'All QA Statuses' },
                    { value: 'Pending QA', label: 'Pending QA' },
                  ]}
                />

                <DateFilterSelector filter={dateFilter} onChange={setDateFilter} compact />
              </>
            )}

            {activeTab === 'finance' && (
              <DateFilterSelector filter={dateFilter} onChange={setDateFilter} compact />
            )}

            {/* Quick Access Recycle Bin Button (Only shown in Work Intake & Status Pipeline) */}
            {(activeTab === 'intake' || activeTab === 'pipeline') && (
              <button
                onClick={() => setIsRecycleBinOpen(true)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border transition-all active:scale-95 cursor-pointer shrink-0 ${
                  archivedWorkOrders.length > 0
                    ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200 shadow-2xs'
                    : 'bg-[#F5F5F7] hover:bg-[#E5E5EA] text-[#1D1D1F] border-[#E5E5EA]'
                }`}
                title="Recycle Bin & Archived Tickets"
              >
                <Trash2 className={`w-3.5 h-3.5 ${archivedWorkOrders.length > 0 ? 'text-rose-600' : 'text-[#86868B]'}`} />
                <span className="hidden sm:inline">{t('recycleBin')}</span>
                {archivedWorkOrders.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-rose-600 text-white text-[10px] font-bold">
                    {archivedWorkOrders.length}
                  </span>
                )}
              </button>
            )}

            {/* Contextual Action Button */}
            {activeTab === 'inventory' ? (
              <button
                onClick={() => setInventoryAddModalOpen(true)}
                className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-[#0071E3] hover:bg-[#0051B3] text-white text-xs font-bold rounded-xl shadow-2xs transition-all active:scale-95 cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t('addPart')}</span>
              </button>
            ) : activeTab === 'suppliers' ? (
              <button
                onClick={() => setRmaModalOpen(true)}
                className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-[#AF52DE] hover:bg-purple-600 text-white text-xs font-bold rounded-xl shadow-2xs transition-all active:scale-95 cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t('flagRma')}</span>
              </button>
            ) : activeTab === 'price-catalog' || activeTab === 'create-ticket' || activeTab === 'portal' || activeTab === 'settings' ? null : (
              <button
                onClick={() => setActiveTab('create-ticket')}
                className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-[#0071E3] hover:bg-[#0051B3] text-white text-xs font-bold rounded-xl shadow-2xs transition-all active:scale-95 cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Intake Ticket</span>
              </button>
            )}

            {/* Live Supabase connection indicator */}
            <OfflineSyncStatusBadge />
          </div>
        </header>

        <main className="min-h-0 flex-1 w-full max-w-full px-3 sm:px-4 lg:px-5 pt-3 pb-5 flex flex-col">
          <div key={activeTab} className="app-module-content flex-1 w-full min-w-0 flex flex-col">
              {activeTab === 'dashboard' && (
                <DashboardOverview
                  workOrders={activeWorkOrders}
                  parts={parts}
                  rmas={rmas}
                  technicians={technicians}
                  onNavigateToTab={setActiveTab}
                  onOpenNewWorkOrder={(prefill) => handleOpenNewWorkOrder(prefill)}
                  onOpenAiAssistant={() => setIsAiAssistantOpen(true)}
                  onDeleteWorkOrder={handleDeleteWorkOrder}
                  onUpdateWorkOrderStatus={handleUpdateWorkOrderStatus}
                  onSelectPrintTag={(wo) => setPrintableTagWo(wo)}
                  dateFilter={dateFilter}
                  setDateFilter={setDateFilter}
                />
              )}

              {activeTab === 'create-ticket' && (
                <CreateTicketSoloPage
                  workOrders={activeWorkOrders}
                  customers={customers}
                  technicians={technicians}
                  systemSettings={systemSettings}
                  prefill={ticketPrefill}
                  onSaveWorkOrder={handleSaveWorkOrder}
                  onSelectPrintTag={(wo) => setPrintableTagWo(wo)}
                  onOpenAiAssistant={() => setIsAiAssistantOpen(true)}
                  onViewRepairTickets={() => setActiveTab('intake')}
                />
              )}

              {activeTab === 'intake' && (
                <IntakeWorkOrderModule
                  workOrders={activeWorkOrders}
                  parts={parts}
                  customers={customers}
                  technicians={technicians}
                  currentUser={currentUser}
                  onSaveWorkOrder={handleSaveWorkOrder}
                  onSelectPrintTag={(wo) => setPrintableTagWo(wo)}
                  onOpenAiAssistant={() => setIsAiAssistantOpen(true)}
                  onOpenNewWorkOrder={(prefill) => handleOpenNewWorkOrder(prefill)}
                  onDeleteWorkOrder={handleDeleteWorkOrder}
                  onClearAllWorkOrders={handleClearAllWorkOrders}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  filterStatus={statusFilter}
                  setFilterStatus={setStatusFilter}
                  dateFilter={dateFilter}
                  setDateFilter={setDateFilter}
                  onNavigateToCreateTicket={() => setActiveTab('create-ticket')}
                />
              )}

              {activeTab === 'pipeline' && (
                <StatusPipelineView
                  workOrders={activeWorkOrders}
                  technicians={technicians}
                  systemSettings={systemSettings}
                  currentUser={currentUser}
                  onUpdateWorkOrderStatus={handleUpdateWorkOrderStatus}
                  onSaveWorkOrder={handleSaveWorkOrder}
                  onDeleteWorkOrder={handleDeleteWorkOrder}
                  onClearAllWorkOrders={handleClearAllWorkOrders}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  statusFilter={statusFilter}
                  setStatusFilter={setStatusFilter}
                  techFilter={techFilter}
                  setTechFilter={setTechFilter}
                  dateFilter={dateFilter}
                  setDateFilter={setDateFilter}
                  showBottlenecksOnly={showBottlenecksOnly}
                  setShowBottlenecksOnly={setShowBottlenecksOnly}
                  onSelectPrintTag={(wo) => setPrintableTagWo(wo)}
                  onOpenNewWorkOrder={(prefill) => handleOpenNewWorkOrder(prefill)}
                />
              )}

              {activeTab === 'inventory' && (
                <InventoryManagementModule
                  parts={parts}
                  suppliers={suppliers}
                  systemSettings={systemSettings}
                  deviceModels={priceCatalog.catalog.map((m) => m.model)}
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
                  onAddRma={handleAddRma}
                  onAddSupplier={handleAddSupplier}
                  onUpdateSupplier={handleUpdateSupplier}
                  onDeleteSupplier={handleDeleteSupplier}
                  onUpdateRmaStatus={handleUpdateRmaStatus}
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
                  isQuickCalcOpen={priceCatalogQuickCalcOpen}
                  setIsQuickCalcOpen={setPriceCatalogQuickCalcOpen}
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
                  setDateFilter={setDateFilter}
                />
              )}

              {activeTab === 'pos' && (
                <PosInvoicingModule
                  workOrders={activeWorkOrders}
                  customers={customers}
                  parts={parts}
                  systemSettings={systemSettings}
                  onMarkPaid={handleMarkPaid}
                  onSaveWorkOrder={handleSaveWorkOrder}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  dateFilter={dateFilter}
                  setDateFilter={setDateFilter}
                  statusFilter={statusFilter}
                  setStatusFilter={setStatusFilter}
                />
              )}

              {activeTab === 'finance' && (
                <ShopFinancePlModule
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
                  dateFilter={dateFilter.preset === 'today' ? 'TODAY' : dateFilter.preset === '7days' ? 'THIS_WEEK' : dateFilter.preset === '30days' ? 'THIS_MONTH' : 'ALL'}
                  setDateFilter={(f) => {
                    if (f === 'TODAY') setDateFilter({ preset: 'today' });
                    else if (f === 'THIS_WEEK') setDateFilter({ preset: '7days' });
                    else if (f === 'THIS_MONTH') setDateFilter({ preset: '30days' });
                    else setDateFilter({ preset: 'all' });
                  }}
                />
              )}

              {activeTab === 'crm' && (
                <CrmCustomerPortalModule
                  customers={customers}
                  workOrders={activeWorkOrders}
                  onAddCustomer={handleAddCustomer}
                  onDeleteCustomer={handleDeleteCustomer}
                  systemSettings={systemSettings}
                  onSaveWorkOrder={handleSaveWorkOrder}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  customerTypeFilter={customerTypeFilter}
                  setCustomerTypeFilter={setCustomerTypeFilter}
                />
              )}

              {activeTab === 'portal' && (
                <CustomerFacingWebPortal
                  workOrders={activeWorkOrders}
                  customers={customers}
                  systemSettings={systemSettings}
                  onUpdateWorkOrder={handleSaveWorkOrder}
                  onExitPortalMode={() => setActiveTab('dashboard')}
                />
              )}

              {activeTab === 'qa' && (
                <QualityAssuranceModule
                  workOrders={activeWorkOrders}
                  technicians={technicians}
                  currentUser={currentUser}
                  onSavePostRepairChecklist={handleSavePostRepairChecklist}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  statusFilter={statusFilter}
                  setStatusFilter={setStatusFilter}
                />
              )}

              {activeTab === 'settings' && (
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
                />
              )}
          </div>
        </main>
      </div>

      {!isAiAssistantOpen && (
        <button
          type="button"
          onClick={() => setIsAiAssistantOpen(true)}
          className="fixed bottom-20 right-4 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent)] text-white shadow-lg lg:hidden"
          aria-label="Open AI Assistant"
          title="Open AI Assistant"
        >
          <Sparkles size={20} />
        </button>
      )}

      {/* AI Diagnostic Assistant Modal */}
      <AiDiagnosticAssistantModal
        isOpen={isAiAssistantOpen}
        onClose={() => setIsAiAssistantOpen(false)}
        workOrders={activeWorkOrders}
        parts={parts}
        customers={customers}
        technicians={technicians}
        suppliers={suppliers}
        systemSettings={systemSettings}
        onOpenAiSettings={() => {
          setIsAiAssistantOpen(false);
          setSettingsInitialSubTab('ai');
          setActiveTab('settings');
        }}
      />

      {/* Printable Device Tag Sticker Modal */}
      <DeviceTagPrinterModal
        workOrder={printableTagWo}
        systemSettings={systemSettings}
        onClose={() => setPrintableTagWo(null)}
      />

      {/* Recycle Bin & Archive Modal */}
      <RecycleBinModal
        isOpen={isRecycleBinOpen}
        onClose={() => setIsRecycleBinOpen(false)}
        archivedWorkOrders={archivedWorkOrders}
        onRestoreWorkOrder={handleRestoreWorkOrder}
        onPermanentDeleteWorkOrder={handlePermanentDeleteWorkOrder}
        onRestoreAll={handleRestoreAllWorkOrders}
        onEmptyRecycleBin={handleEmptyRecycleBin}
      />

      <HoverTooltip />

      {/* Floating Toast Notification Container */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className={`pointer-events-auto flex items-start p-3.5 rounded-2xl shadow-2xl border backdrop-blur-md text-xs transition-all ${
                toast.type === 'success'
                  ? 'bg-slate-900/95 text-white border-emerald-500/50 shadow-emerald-950/20'
                  : toast.type === 'error'
                  ? 'bg-slate-900/95 text-white border-rose-500/50 shadow-rose-950/20'
                  : 'bg-slate-900/95 text-white border-blue-500/50 shadow-blue-950/20'
              }`}
            >
              <div className="mr-3 mt-0.5 shrink-0">
                {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 animate-pulse" />}
                {toast.type === 'info' && <Info className="w-4 h-4 text-blue-400" />}
              </div>
              <div className="flex-1 pr-2">
                {toast.title && <div className="font-bold text-[13px] leading-tight mb-0.5">{toast.title}</div>}
                <div className="text-[11px] text-slate-300 leading-snug">{toast.message}</div>
                {toast.persistent && (
                  <div className="mt-2 flex items-center gap-1.5 text-[10px] text-rose-300 font-extrabold bg-rose-950/70 px-2 py-1 rounded-lg border border-rose-500/40">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0 animate-pulse" />
                    <span>Persistent Notice • Non-dismissible until inspection complete</span>
                  </div>
                )}
              </div>
              {toast.dismissible !== false && (
                <button
                  type="button"
                  onClick={() => removeToast(toast.id)}
                  className="shrink-0 text-slate-400 hover:text-white transition-colors cursor-pointer p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
