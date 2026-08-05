import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { 
  Search, 
  ShieldCheck, 
  Smartphone, 
  ListChecks, 
  SlidersHorizontal, 
  Download, 
  Plus, 
  Check, 
  ShoppingBag, 
  Receipt, 
  X, 
  Copy, 
  Zap, 
  Cpu, 
  Layers, 
  Volume2, 
  Wifi, 
  Scan, 
  Power, 
  Mic, 
  CheckCircle2, 
  FileText, 
  Folder, 
  Tablet, 
  Watch, 
  Laptop, 
  Settings,
  Calculator,
  Sparkles,
  Tag,
  ChevronDown,
  Trash2
} from 'lucide-react';
import { 
  ModelRepairPrice, 
  PriceCatalogImportRow,
  REPAIR_CATEGORIES, 
  RepairCategoryDef, 
  FolderConfig, 
  DEFAULT_DEVICE_FOLDERS, 
  getModelFolderId 
} from '../../types/priceCatalog';
import { PriceSettingsModal } from './PriceSettingsModal';
import { DeviceModelChooserModal } from '../devices/DeviceModelChooserModal';
import { QuickPriceCalculatorModal } from './QuickPriceCalculatorModal';
import { Button } from '../ui';
import { toast } from '../../lib/toast';

interface PriceCatalogModuleProps {
  catalog: ModelRepairPrice[];
  updatePriceAndWarranty: (modelName: string, categoryKey: string, newPrice: number | null, newWarranty: string) => void;
  importCatalogRows?: (
    rows: PriceCatalogImportRow[],
    importedCategories?: RepairCategoryDef[],
    replaceCategories?: boolean,
  ) => Promise<number>;
  addModel: (modelName: string, folderId?: string, cloneFromModel?: string) => void;
  renameModel?: (oldName: string, newName: string) => void;
  deleteModel?: (modelName: string) => void;
  resetToDefaults: () => void;
  currencySymbol: string;
  setCurrencySymbol: (sym: string) => void;
  folders?: FolderConfig[];
  toggleFolder?: (folderId: string) => void;
  setAllFoldersEnabled?: (enabled: boolean) => void;
  addFolder?: (name: string, family: FolderConfig['family']) => void;
  renameFolder?: (id: string, newName: string) => void;
  categories?: RepairCategoryDef[];
  updateCategoryLabel?: (key: string, newLabel: string) => void;
  addCategory?: (key: string, label: string, group: RepairCategoryDef['group']) => void;
  deleteCategory?: (key: string) => void;
  applyGlobalPriceAdjustment?: (folderId: string | 'ALL', categoryKey: string | 'ALL', percentChange: number, flatChange: number) => void;
  applyGlobalWarranty?: (folderId: string | 'ALL', categoryKey: string | 'ALL', warrantyTerm: string) => void;
  formatPrice: (amount: number | null | undefined) => string;
  onOpenNewWorkOrder?: (prefill?: {
    model?: string;
    service?: string;
    price?: number;
    selectedRepairs?: { id: string; name: string; basePrice: number; discountPercent: number; finalPrice: number }[];
    subtotal?: number;
    discountAmount?: number;
    discountPercent?: number;
  }) => void;
  searchQuery?: string;
  setSearchQuery?: (q: string) => void;
  isQuickCalcOpen?: boolean;
  setIsQuickCalcOpen?: (open: boolean) => void;
  isDeviceModalOpen?: boolean;
  setIsDeviceModalOpen?: (open: boolean) => void;
  isSettingsModalOpen?: boolean;
  setIsSettingsModalOpen?: (open: boolean) => void;
  onRegisterExportHandler?: (handler: () => void) => void;
}

interface CartItem {
  categoryKey: string;
  label: string;
  price: number;
  warranty: string;
  discountPercent: number;
}

const DEVICE_SERIES_ORDER = [
  'iPhone 16 Series',
  'iPhone 15 Series',
  'iPhone 14 Series',
  'iPhone 13 Series',
  'iPhone 12 Series',
  'iPhone 11 Series',
  'iPhone X / XS / XR',
  'iPhone 8 / SE Series',
  'iPhone 7 / 6 Series',
  'iPad / Watch / Mac / Other'
];

export const PriceCatalogModule: React.FC<PriceCatalogModuleProps> = ({
  catalog,
  updatePriceAndWarranty,
  importCatalogRows,
  addModel,
  renameModel,
  deleteModel,
  resetToDefaults,
  currencySymbol,
  setCurrencySymbol,
  folders = DEFAULT_DEVICE_FOLDERS,
  toggleFolder = () => {},
  setAllFoldersEnabled = () => {},
  addFolder,
  renameFolder,
  categories = REPAIR_CATEGORIES,
  updateCategoryLabel,
  addCategory,
  deleteCategory,
  applyGlobalPriceAdjustment,
  applyGlobalWarranty,
  formatPrice,
  onOpenNewWorkOrder,
  searchQuery: externalSearchQuery,
  setSearchQuery: setExternalSearchQuery,
  isQuickCalcOpen: externalQuickCalcOpen,
  setIsQuickCalcOpen: setExternalQuickCalcOpen,
  isDeviceModalOpen: externalDeviceModalOpen,
  setIsDeviceModalOpen: setExternalDeviceModalOpen,
  isSettingsModalOpen: externalSettingsModalOpen,
  setIsSettingsModalOpen: setExternalSettingsModalOpen,
  onRegisterExportHandler,
}) => {
  // State
  const [selectedDevice, setSelectedDevice] = useState<string>(catalog[0]?.model || 'iPhone 15 Pro Max');
  const [viewMode, setViewMode] = useState<'pos' | 'matrix' | 'cards'>('pos');
  
  // Controlled / Uncontrolled state synchronization
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const queryToUse = externalSearchQuery !== undefined ? externalSearchQuery : localSearchQuery;
  const handleSearchChange = (value: string) => {
    if (setExternalSearchQuery) setExternalSearchQuery(value);
    else setLocalSearchQuery(value);
  };

  const [localDeviceModalOpen, setLocalDeviceModalOpen] = useState(false);
  const deviceModalOpen = externalDeviceModalOpen !== undefined ? externalDeviceModalOpen : localDeviceModalOpen;
  const setDeviceModalOpen = setExternalDeviceModalOpen || setLocalDeviceModalOpen;

  const [localSettingsModalOpen, setLocalSettingsModalOpen] = useState(false);
  const settingsModalOpen = externalSettingsModalOpen !== undefined ? externalSettingsModalOpen : localSettingsModalOpen;
  const setSettingsModalOpen = setExternalSettingsModalOpen || setLocalSettingsModalOpen;

  const [localQuickCalcOpen, setLocalQuickCalcOpen] = useState(false);
  const quickCalcOpen = externalQuickCalcOpen !== undefined ? externalQuickCalcOpen : localQuickCalcOpen;
  const setQuickCalcOpen = setExternalQuickCalcOpen || setLocalQuickCalcOpen;

  const [deviceSearchQuery, setDeviceSearchQuery] = useState('');
  const [activeFamilyTab, setActiveFamilyTab] = useState<'All' | 'iPhone' | 'iPad' | 'Apple Watch' | 'Mac' | 'Other'>('All');
  const [quoteCopied, setQuoteCopied] = useState(false);
  const [isCartSheetOpen, setIsCartSheetOpen] = useState(false);
  // Which cart item has its discount picker expanded (mobile sheet only).
  const [discountMenuOpenFor, setDiscountMenuOpenFor] = useState<string | null>(null);

  // ESC closes the discount modal.
  useEffect(() => {
    if (!discountMenuOpenFor) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDiscountMenuOpenFor(null);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [discountMenuOpenFor]);

  // Cart State: Map of categoryKey -> CartItem
  const [cart, setCart] = useState<Map<string, CartItem>>(() => new Map<string, CartItem>());

  // Filter folders enabled by user
  const enabledFolders = useMemo(() => {
    return folders.filter((f) => f.enabled);
  }, [folders]);

  const enabledFolderIds = useMemo(() => {
    return new Set(enabledFolders.map((f) => f.id));
  }, [enabledFolders]);

  // Category Icon & Color Configuration matching 21 diagnostic tests
  const getCategoryConfig = (key: string, group: string) => {
    const k = key.toLowerCase();
    if (k.includes('battery')) {
      return {
        icon: Zap,
        color: 'text-amber-600',
        bg: 'bg-amber-50 border-amber-200/80',
      };
    }
    if (k.includes('display') || k.includes('touch') || k.includes('lcd')) {
      return {
        icon: Smartphone,
        color: 'text-blue-600',
        bg: 'bg-blue-50 border-blue-200/80',
      };
    }
    if (k.includes('backglass') || k.includes('housing')) {
      return {
        icon: Layers,
        color: 'text-rose-600',
        bg: 'bg-rose-50 border-rose-200/80',
      };
    }
    if (k.includes('charing') || k.includes('charging') || k.includes('flex')) {
      return {
        icon: Power,
        color: 'text-red-600',
        bg: 'bg-red-50 border-red-200/80',
      };
    }
    if (k.includes('speaker') || k.includes('ear_') || k.includes('ring_')) {
      return {
        icon: Volume2,
        color: 'text-purple-600',
        bg: 'bg-purple-50 border-purple-200/80',
      };
    }
    if (k.includes('mic')) {
      return {
        icon: Mic,
        color: 'text-pink-600',
        bg: 'bg-pink-50 border-pink-200/80',
      };
    }
    if (k.includes('logic') || k.includes('rf_layer') || k.includes('no_power')) {
      return {
        icon: Cpu,
        color: 'text-indigo-600',
        bg: 'bg-indigo-50 border-indigo-200/80',
      };
    }
    if (k.includes('network') || k.includes('wifi') || k.includes('pay') || k.includes('nfc')) {
      return {
        icon: Wifi,
        color: 'text-sky-600',
        bg: 'bg-sky-50 border-sky-200/80',
      };
    }
    if (k.includes('face_id') || k.includes('key') || k.includes('sensor')) {
      return {
        icon: Scan,
        color: 'text-emerald-600',
        bg: 'bg-emerald-50 border-emerald-200/80',
      };
    }
    return {
      icon: ListChecks,
      color: 'text-slate-600',
      bg: 'bg-slate-100 border-slate-200',
    };
  };

  // Group catalog devices by series for modal selection
  const categorizedDevices = useMemo(() => {
    const groups: { [key: string]: string[] } = {};
    DEVICE_SERIES_ORDER.forEach((g) => (groups[g] = []));

    catalog.forEach((item) => {
      const m = item.model;
      if (m.includes('16')) groups['iPhone 16 Series'].push(m);
      else if (m.includes('15')) groups['iPhone 15 Series'].push(m);
      else if (m.includes('14')) groups['iPhone 14 Series'].push(m);
      else if (m.includes('13')) groups['iPhone 13 Series'].push(m);
      else if (m.includes('12')) groups['iPhone 12 Series'].push(m);
      else if (m.includes('11')) groups['iPhone 11 Series'].push(m);
      else if (m.includes('X') || m.includes('XS') || m.includes('XR')) groups['iPhone X / XS / XR'].push(m);
      else if (m.includes('8') || m.includes('SE')) groups['iPhone 8 / SE Series'].push(m);
      else if (m.includes('7') || m.includes('6')) groups['iPhone 7 / 6 Series'].push(m);
      else groups['iPad / Watch / Mac / Other'].push(m);
    });

    return groups;
  }, [catalog]);

  // Selected Active Device Data
  const activeDeviceData = useMemo(() => {
    return catalog.find((c) => c.model === selectedDevice) || catalog[0];
  }, [catalog, selectedDevice]);

  // Filtered repair categories for selected active device
  const availableRepairItems = useMemo(() => {
    if (!activeDeviceData) return [];
    return categories.map((cat) => {
      const price = activeDeviceData.prices[cat.key];
      const warranty = activeDeviceData.warranties[cat.key] || 'No Warranty';
      return {
        ...cat,
        price,
        warranty,
      };
    }).filter((item) => {
      if (item.price === null || item.price === undefined) return false;
      if (queryToUse.trim()) {
        const q = queryToUse.toLowerCase();
        return item.label.toLowerCase().includes(q) || item.group.toLowerCase().includes(q) || item.warranty.toLowerCase().includes(q);
      }
      return true;
    });
  }, [activeDeviceData, queryToUse, categories]);

  // Mobile category chips — group quick-filter for the catalog list (mobile only).
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const chipGroups = useMemo(() => {
    const map = new Map<string, number>();
    availableRepairItems.forEach((item) => {
      const g = item.group || 'Other';
      map.set(g, (map.get(g) || 0) + 1);
    });
    return Array.from(map.entries());
  }, [availableRepairItems]);
  // If the selected group disappears (device/search changed), fall back to ALL.
  const effectiveCategoryFilter = chipGroups.some(([g]) => g === categoryFilter) ? categoryFilter : 'ALL';
  const filteredItems = useMemo(() => {
    if (effectiveCategoryFilter === 'ALL') return availableRepairItems;
    return availableRepairItems.filter((item) => (item.group || 'Other') === effectiveCategoryFilter);
  }, [availableRepairItems, effectiveCategoryFilter]);

  // Cart Calculations
  const cartSummary = useMemo(() => {
    let subtotal = 0;
    let totalDiscountAmount = 0;

    cart.forEach((item: CartItem) => {
      subtotal += item.price;
      const discount = item.price * (item.discountPercent / 100);
      totalDiscountAmount += discount;
    });

    const totalDue = subtotal - totalDiscountAmount;
    return {
      subtotal,
      totalDiscountAmount,
      totalDue,
      count: cart.size,
    };
  }, [cart]);

  // Handlers
  const handleToggleCartItem = (categoryKey: string, label: string, price: number, warranty: string) => {
    setCart((prev) => {
      const next = new Map(prev);
      if (next.has(categoryKey)) {
        next.delete(categoryKey);
      } else {
        next.set(categoryKey, {
          categoryKey,
          label,
          price,
          warranty,
          discountPercent: 0,
        });
      }
      return next;
    });
  };

  const handleUpdateItemDiscount = (categoryKey: string, discountPercent: number) => {
    setCart((prev) => {
      const next = new Map(prev);
      const existing = next.get(categoryKey) as CartItem | undefined;
      if (existing) {
        next.set(categoryKey, {
          categoryKey: existing.categoryKey,
          label: existing.label,
          price: existing.price,
          warranty: existing.warranty,
          discountPercent,
        });
      }
      return next;
    });
    if (discountPercent > 0) {
      toast.success(`${discountPercent}% discount applied`, 'Discount');
    } else {
      toast.info('Discount removed', 'Discount');
    }
  };

  const handleClearCart = () => {
    setCart(new Map());
    setDiscountMenuOpenFor(null);
    toast.info('Cart cleared', 'Cart');
  };

  const handleSelectDevice = (modelName: string) => {
    setSelectedDevice(modelName);
    setDeviceModalOpen(false);
    setCart(new Map()); // clear cart on device change for accuracy
  };

  const handleCopyCustomerQuote = () => {
    if (cart.size === 0) {
      // Copy single estimated service or active device total
      const text = `🔧 *i35 Apple Repair Quote*\nDevice: ${selectedDevice}\nDate: ${new Date().toLocaleDateString()}\nStatus: Available Today`;
      navigator.clipboard.writeText(text);
    } else {
      let lines = [`🔧 *i35 Service - Official Repair Quote*`, `Device: *${selectedDevice}*`, `----------------------------------`];
      cart.forEach((item: CartItem) => {
        const itemFinal = item.price - item.price * (item.discountPercent / 100);
        lines.push(`• *${item.label}*`);
        lines.push(`  Warranty: ${item.warranty}`);
        lines.push(`  Price: ${formatPrice(itemFinal)} ${item.discountPercent > 0 ? `(${item.discountPercent}% Off)` : ''}`);
      });
      lines.push(`----------------------------------`);
      lines.push(`*Total Estimated:* ${formatPrice(cartSummary.totalDue)}`);
      lines.push(`📍 Store: i35 Service Center | Express Same-Day Repair`);
      navigator.clipboard.writeText(lines.join('\n'));
    }
    setQuoteCopied(true);
    setTimeout(() => setQuoteCopied(false), 2200);
  };

  const handleCreateWorkOrderFromCart = () => {
    if (!onOpenNewWorkOrder) return;
    const itemsList = Array.from(cart.values()) as CartItem[];
    const serviceName = itemsList.length > 0 ? itemsList.map((i) => i.label).join(' + ') : 'General Diagnostic';
    
    const selectedRepairsList = itemsList.map((item) => {
      const baseP = item.price;
      const discPct = item.discountPercent || 0;
      const discAmt = baseP * (discPct / 100);
      const finalP = baseP - discAmt;
      return {
        id: item.categoryKey,
        name: item.label,
        basePrice: baseP,
        discountPercent: discPct,
        finalPrice: finalP,
      };
    });

    const totalSub = selectedRepairsList.reduce((acc, r) => acc + r.basePrice, 0);
    const totalDiscAmt = selectedRepairsList.reduce((acc, r) => acc + (r.basePrice * (r.discountPercent / 100)), 0);
    const totalNetDue = totalSub - totalDiscAmt;

    onOpenNewWorkOrder({
      model: selectedDevice,
      service: serviceName,
      selectedRepairs: selectedRepairsList,
      subtotal: totalSub,
      discountAmount: totalDiscAmt,
      discountPercent: totalSub > 0 ? Math.round((totalDiscAmt / totalSub) * 100) : 0,
      price: totalNetDue > 0 ? totalNetDue : cartSummary.totalDue,
    });
  };

  // CSV Export
  const handleExportCsv = useCallback(() => {
    const headers = ['Model', ...REPAIR_CATEGORIES.map((c) => `${c.label} Price`), ...REPAIR_CATEGORIES.map((c) => `${c.label} Warranty`)];
    const rows = catalog.map((item) => {
      const priceVals = REPAIR_CATEGORIES.map((c) => item.prices[c.key] ?? '');
      const warrantyVals = REPAIR_CATEGORIES.map((c) => item.warranties[c.key] ?? '');
      return [`"${item.model}"`, ...priceVals, ...warrantyVals].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `applerepair_price_list_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  }, [catalog]);

  useEffect(() => {
    if (onRegisterExportHandler) {
      onRegisterExportHandler(handleExportCsv);
    }
  }, [onRegisterExportHandler, handleExportCsv]);

  const renderCartItems = (mobile = false) => (
    <div className={mobile ? 'p-3 space-y-2' : 'p-3.5 space-y-2.5'}>
            {(() => {
              const cartItems = Array.from(cart.values()) as CartItem[];
              const totalItems = cartItems.length;

              // Mobile bottom sheet: real items only — no placeholder slots, upgraded card UI.
              if (mobile) {
                const DISCOUNT_OPTIONS = [0, 5, 10, 15, 20, 25, 30, 40, 50];
                return (
                  <div className="p-3 space-y-2.5">
                    {cartItems.length === 0 ? (
                      <div className="py-10 text-center space-y-2">
                        <div className="w-12 h-12 rounded-full bg-[#F5F5F7] flex items-center justify-center mx-auto text-[#86868B]">
                          <Receipt className="w-5 h-5" />
                        </div>
                        <p className="text-sm font-bold text-[#1D1D1F]">Your cart is empty</p>
                        <p className="text-xs text-[#86868B]">Tap services in the catalog to add them here.</p>
                      </div>
                    ) : (
                      cartItems.map((item, idx) => {
                        const discAmt = item.price * (item.discountPercent / 100);
                        const finalItemPrice = item.price - discAmt;

                        return (
                          <div
                            key={item.categoryKey}
                            className="bg-white border border-[#E5E5EA] rounded-2xl p-3 shadow-2xs"
                          >
                            {/* Item header row — warranty pill sits beside the service name */}
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center space-x-2 min-w-0 flex-1">
                                <span className="w-5 h-5 rounded-md bg-[#0071E3]/10 text-[#0071E3] flex items-center justify-center font-extrabold text-[10px] shrink-0">
                                  {idx + 1}
                                </span>
                                <h4 className="font-extrabold text-[13px] text-[#1D1D1F] leading-snug truncate min-w-0">{item.label}</h4>
                                <span className="inline-flex items-center space-x-0.5 text-[8px] font-extrabold text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded-full border border-emerald-200 shrink-0">
                                  <ShieldCheck className="w-2 h-2 text-emerald-600 shrink-0" />
                                  <span>{item.warranty}</span>
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleToggleCartItem(item.categoryKey, item.label, item.price, item.warranty)}
                                className="text-[#A1A1A6] hover:text-[#FF3B30] hover:bg-[#FF3B30]/10 p-1.5 rounded-lg transition-colors cursor-pointer shrink-0"
                                title="Remove item"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>

                            {/* Price row */}
                            <div className="mt-2.5 pt-2.5 border-t border-[#F0F0F2] flex items-center justify-between gap-2">
                              <span className="text-[9px] font-extrabold uppercase tracking-wider text-[#86868B]">Price</span>
                              <div className="flex items-baseline space-x-1.5 min-w-0">
                                {item.discountPercent > 0 && (
                                  <span className="text-[10px] text-[#A1A1A6] line-through font-mono">
                                    {formatPrice(item.price)}
                                  </span>
                                )}
                                <span className="font-mono text-sm font-black text-[#1D1D1F]">
                                  {formatPrice(finalItemPrice)}
                                </span>
                              </div>
                            </div>

                            {/* Compact Discount button — opens a centered modal popup, no layout shift */}
                            <div className="mt-2 flex items-center justify-between gap-2">
                              <button
                                type="button"
                                onClick={() => setDiscountMenuOpenFor(discountMenuOpenFor === item.categoryKey ? null : item.categoryKey)}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-extrabold transition-all cursor-pointer active:scale-95 ${
                                  discountMenuOpenFor === item.categoryKey
                                    ? 'bg-[#F0F7FF] text-[#0071E3] border-[#0071E3]/40'
                                    : item.discountPercent > 0
                                      ? 'bg-[#34C759]/10 text-[#34C759] border-[#34C759]/30'
                                      : 'bg-[#F5F5F7] text-[#1D1D1F] border-[#E5E5EA] hover:border-[#0071E3]/50'
                                }`}
                              >
                                <Tag className="w-3.5 h-3.5 shrink-0" />
                                <span>Discount</span>
                                {item.discountPercent > 0 && (
                                  <span className="font-mono">{item.discountPercent}%</span>
                                )}
                                <ChevronDown className={`w-3 h-3 shrink-0 transition-transform ${discountMenuOpenFor === item.categoryKey ? 'rotate-180' : ''}`} />
                              </button>

                              <span className="text-[10px] font-semibold text-[#86868B]">
                                {item.discountPercent > 0
                                  ? `Save ${formatPrice(discAmt)}`
                                  : 'Tap to add discount'}
                              </span>
                            </div>

                            {/* Centered discount modal — portal to body so it never clips under the sheet header */}
                            {discountMenuOpenFor === item.categoryKey &&
                              createPortal(
                                <div
                                  className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 backdrop-blur-sm animate-fadeIn"
                                  onClick={() => setDiscountMenuOpenFor(null)}
                                >
                                  <div
                                    className="w-64 rounded-2xl border border-[#E5E5EA] bg-white p-3 shadow-2xl animate-i35-slide-up"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <div className="flex items-center justify-between px-1 pb-2">
                                      <p className="text-xs font-extrabold text-[#1D1D1F]">Select Discount</p>
                                      <span className="text-[10px] font-bold text-[#86868B]">{item.label}</span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-1.5">
                                      {DISCOUNT_OPTIONS.map((p) => (
                                        <button
                                          key={p}
                                          type="button"
                                          autoFocus={item.discountPercent === p}
                                          onClick={() => {
                                            handleUpdateItemDiscount(item.categoryKey, p);
                                            setDiscountMenuOpenFor(null);
                                          }}
                                          className={`py-2.5 rounded-lg text-xs font-extrabold border transition-all cursor-pointer active:scale-95 ${
                                            item.discountPercent === p
                                              ? 'bg-[#0071E3] text-white border-[#0071E3] shadow-2xs'
                                              : 'bg-white text-[#1D1D1F] border-[#E5E5EA] hover:border-[#0071E3]/50'
                                          }`}
                                        >
                                          {p}%
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                </div>,
                                document.body,
                              )}
                          </div>
                        );
                      })
                    )}
                  </div>
                );
              }

              // If 3 or fewer items: render real items + placeholder slots up to 3 total slots
              if (totalItems <= 3) {
                const slots = [0, 1, 2];
                return (
                  <div className="space-y-2.5">
                    {slots.map((i) => {
                      const item = cartItems[i];

                      if (item) {
                        const discAmt = item.price * (item.discountPercent / 100);
                        const finalItemPrice = item.price - discAmt;

                        return (
                          <div
                            key={item.categoryKey}
                            className="h-[88px] p-2.5 bg-white border border-[#E5E5EA] rounded-xl flex flex-col justify-between shadow-2xs transition-all hover:border-[#0071E3]/40"
                          >
                            <div className="flex items-start justify-between gap-1.5">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center space-x-1.5 min-w-0">
                                  <span className="w-4 h-4 rounded-md bg-[#0071E3] text-white flex items-center justify-center font-extrabold text-[10px] shrink-0">
                                    {i + 1}
                                  </span>
                                  <h4 className="font-extrabold text-xs text-[#1D1D1F] truncate leading-tight min-w-0">{item.label}</h4>
                                  <span className="inline-flex items-center space-x-1 text-[9px] font-extrabold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-200 shrink-0">
                                    <ShieldCheck className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                                    <span>{item.warranty}</span>
                                  </span>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleToggleCartItem(item.categoryKey, item.label, item.price, item.warranty)}
                                className="text-[#86868B] hover:text-[#FF3B30] p-1 rounded transition-colors cursor-pointer shrink-0"
                                title="Remove item"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <div className="flex items-center justify-between bg-[#F5F5F7] px-2 py-1 rounded-lg text-xs">
                              <div className="flex items-center space-x-1">
                                <span className="text-[10px] font-extrabold text-[#86868B]">Discount:</span>
                                <select
                                  value={item.discountPercent}
                                  onChange={(e) => handleUpdateItemDiscount(item.categoryKey, Number(e.target.value))}
                                  className="bg-white border border-[#E5E5EA] rounded-md px-1 py-0.5 text-[10px] font-extrabold text-[#0071E3] outline-none cursor-pointer hover:border-[#0071E3]"
                                >
                                  <option value={0}>0% Off</option>
                                  <option value={5}>5% Off</option>
                                  <option value={10}>10% Off</option>
                                  <option value={15}>15% Off</option>
                                  <option value={20}>20% Off</option>
                                  <option value={25}>25% Off</option>
                                  <option value={30}>30% Off</option>
                                  <option value={40}>40% Off</option>
                                  <option value={50}>50% Off</option>
                                </select>
                              </div>

                              <div className="flex items-baseline space-x-1.5 shrink-0">
                                {item.discountPercent > 0 && (
                                  <span className="text-[9px] text-[#86868B] line-through font-mono">
                                    {formatPrice(item.price)}
                                  </span>
                                )}
                                <span className="font-extrabold font-mono text-xs text-[#1D1D1F]">
                                  {formatPrice(finalItemPrice)}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      // Render Placeholder Slot Card (subtle — clearly decorative)
                      return (
                        <div
                          key={`placeholder-slot-${i}`}
                          className="h-14 p-2 border-2 border-dashed border-[#E5E5EA]/80 bg-[#F5F5F7]/30 rounded-xl flex items-center gap-2.5 select-none"
                        >
                          <div className="w-6 h-6 rounded-lg bg-white border border-[#E5E5EA] flex items-center justify-center font-extrabold text-[10px] text-[#C7C7CC] shrink-0">
                            {i + 1}
                          </div>
                          <span className="text-[11px] font-bold text-[#A1A1A6] truncate">
                            {i === 0 ? 'Primary Service Slot' : `Add-on Service #${i + 1}`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                );
              }

              // If MORE than 3 items: render scrollable list of all selected items
              return (
                <div className="max-h-[280px] overflow-y-auto space-y-2.5 pr-1 no-scrollbar">
                  {cartItems.map((item, idx) => {
                    const discAmt = item.price * (item.discountPercent / 100);
                    const finalItemPrice = item.price - discAmt;

                    return (
                      <div
                        key={item.categoryKey}
                        className="h-[88px] p-2.5 bg-white border border-[#E5E5EA] rounded-xl flex flex-col justify-between shadow-2xs transition-all hover:border-[#0071E3]/40"
                      >
                        <div className="flex items-start justify-between gap-1.5">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center space-x-1.5 min-w-0">
                              <span className="w-4 h-4 rounded-md bg-[#0071E3] text-white flex items-center justify-center font-extrabold text-[10px] shrink-0">
                                {idx + 1}
                              </span>
                              <h4 className="font-extrabold text-xs text-[#1D1D1F] truncate leading-tight min-w-0">{item.label}</h4>
                              <span className="inline-flex items-center space-x-1 text-[9px] font-extrabold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-200 shrink-0">
                                <ShieldCheck className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                                <span>{item.warranty}</span>
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleToggleCartItem(item.categoryKey, item.label, item.price, item.warranty)}
                            className="text-[#86868B] hover:text-[#FF3B30] p-1 rounded transition-colors cursor-pointer shrink-0"
                            title="Remove item"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="flex items-center justify-between bg-[#F5F5F7] px-2 py-1 rounded-lg text-xs">
                          <div className="flex items-center space-x-1">
                            <span className="text-[10px] font-extrabold text-[#86868B]">Discount:</span>
                            <select
                              value={item.discountPercent}
                              onChange={(e) => handleUpdateItemDiscount(item.categoryKey, Number(e.target.value))}
                              className="bg-white border border-[#E5E5EA] rounded-md px-1 py-0.5 text-[10px] font-extrabold text-[#0071E3] outline-none cursor-pointer hover:border-[#0071E3]"
                            >
                              <option value={0}>0% Off</option>
                              <option value={5}>5% Off</option>
                              <option value={10}>10% Off</option>
                              <option value={15}>15% Off</option>
                              <option value={20}>20% Off</option>
                              <option value={25}>25% Off</option>
                              <option value={30}>30% Off</option>
                              <option value={40}>40% Off</option>
                              <option value={50}>50% Off</option>
                            </select>
                          </div>

                          <div className="flex items-baseline space-x-1.5 shrink-0">
                            {item.discountPercent > 0 && (
                              <span className="text-[9px] text-[#86868B] line-through font-mono">
                                {formatPrice(item.price)}
                              </span>
                            )}
                            <span className="font-extrabold font-mono text-xs text-[#1D1D1F]">
                              {formatPrice(finalItemPrice)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
  );

  const renderCartTotals = () => (
    <div className="shrink-0 bg-white border-t border-[#E5E5EA] px-3.5 pt-3 pb-[calc(0.875rem+env(safe-area-inset-bottom))] space-y-2.5">
      <div className="space-y-1.5 text-xs">
        <div className="flex justify-between items-center">
          <span className="text-[#86868B]">Subtotal</span>
          <span className="font-mono font-bold text-[#1D1D1F]">{formatPrice(cartSummary.subtotal)}</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-[#86868B]">Discount Applied</span>
          {cartSummary.totalDiscountAmount > 0 ? (
            <span className="font-mono font-bold text-[#34C759]">
              -{formatPrice(cartSummary.totalDiscountAmount)}
            </span>
          ) : (
            <span className="font-mono text-[#C7C7CC]">0 MMK</span>
          )}
        </div>

        {cartSummary.totalDiscountAmount > 0 && (
          <div className="flex items-center gap-1.5 rounded-lg bg-[#34C759]/10 border border-[#34C759]/20 px-2 py-1.5 text-[11px] font-extrabold text-[#34C759]">
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">You save {formatPrice(cartSummary.totalDiscountAmount)} on this repair</span>
          </div>
        )}

        <div className="flex justify-between items-baseline pt-2 border-t border-[#E5E5EA]">
          <div className="min-w-0">
            <span className="text-xs font-extrabold uppercase tracking-wider text-[#1D1D1F] block">
              Total Estimated
            </span>
            <span className="text-[10px] text-[#86868B]">{cartSummary.count} {cartSummary.count === 1 ? 'Service' : 'Services'} Selected</span>
          </div>
          <span className="text-xl font-extrabold font-mono text-[#0071E3] shrink-0">
            {formatPrice(cartSummary.totalDue)}
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-2">
        <Button
          type="button"
          onClick={handleCreateWorkOrderFromCart}
          disabled={cart.size === 0}
          className="w-full bg-[#0071E3] hover:bg-[#0071E3]/90 disabled:opacity-50 text-white"
        >
          <FileText className="w-4 h-4 shrink-0" />
          <span>Create Intake Ticket</span>
        </Button>

        <Button
          type="button"
          onClick={handleCopyCustomerQuote}
          variant="outline"
          className="w-full"
        >
          {quoteCopied ? <Check className="w-4 h-4 text-[#34C759]" /> : <Copy className="w-4 h-4 text-[#0071E3]" />}
          <span>{quoteCopied ? 'Quote Copied!' : 'Copy Customer Quote'}</span>
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
      {/* Keep the chosen device visible while the catalog itself scrolls. */}
      <div className="z-20 shrink-0 bg-[#F5F5F7] pt-1 pb-1">
        {/* Mobile: compact device strip — sits at the top like a nav-bar element (lg:hidden) */}
        <div className="lg:hidden bg-white/95 backdrop-blur border border-[#E5E5EA] rounded-xl px-2.5 py-1.5 flex items-center gap-2 shadow-2xs">
          <div className="w-7 h-7 rounded-lg bg-[#0071E3] text-white flex items-center justify-center shrink-0">
            <Smartphone className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[8px] font-extrabold uppercase tracking-widest text-[#0071E3] leading-none">Active Device</p>
            <p className="text-[12px] font-black text-[#1D1D1F] truncate leading-tight mt-0.5">{selectedDevice}</p>
          </div>
          <span className="text-[9px] font-bold text-[#86868B] shrink-0 whitespace-nowrap">
            {availableRepairItems.filter((i) => i.price && i.price > 0).length} services
          </span>
          <button
            type="button"
            onClick={() => setDeviceModalOpen(true)}
            className="shrink-0 min-h-10 px-3 bg-[#F5F5F7] hover:bg-[#E5E5EA] text-[#0071E3] font-extrabold text-[11px] rounded-lg border border-[#E5E5EA] transition-all flex items-center space-x-1 cursor-pointer active:scale-95"
          >
            <Folder className="w-3 h-3" />
            <span>Switch</span>
          </button>
        </div>

        {/* Mobile: in-module full-width search (lg:hidden) — topbar search is desktop-only */}
        <div className="lg:hidden relative mt-1.5">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#86868B]" />
          <input
            type="text"
            value={queryToUse}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search services..."
            className="w-full bg-white border border-[#E5E5EA] text-xs text-[#1D1D1F] placeholder-[#86868B] pl-8 pr-8 py-2.5 rounded-xl focus:bg-white focus:outline-none focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 transition-all shadow-2xs"
          />
          {queryToUse && (
            <button
              type="button"
              onClick={() => handleSearchChange('')}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center text-[#86868B] hover:text-[#1D1D1F] rounded-full hover:bg-[#F5F5F7] transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Desktop: full device card (lg+) */}
        <div className="hidden lg:flex bg-white border border-[#E5E5EA] p-4 sm:p-5 rounded-3xl shadow-2xs flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#0071E3] text-white flex items-center justify-center font-black shrink-0">
              <Smartphone className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#0071E3] bg-[#0071E3]/10 px-2.5 py-0.5 rounded-full">
                  Active Device
                </span>
                <span className="text-xs font-bold text-[#86868B]">
                  {availableRepairItems.filter((i) => i.price && i.price > 0).length} Services Available
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-[#1D1D1F] tracking-tight mt-1">
                {selectedDevice}
              </h2>
            </div>
          </div>

          <Button
            type="button"
            onClick={() => setDeviceModalOpen(true)}
            variant="secondary"
            className="text-[#0071E3] rounded-2xl flex items-center space-x-2 shrink-0"
          >
            <Folder className="w-4 h-4" />
            <span>Switch Model</span>
          </Button>
        </div>
      </div>

      {/* POS Catalog & Cart Main Layout */}
      {/* Mobile: plain flex column so each child keeps its natural height and the
          container scrolls (CSS-grid auto rows + stretch were collapsing the catalog
          section to ~289px so cards overlapped the cart panel). Desktop (lg): grid
          8/4 split with internal scrolling, unchanged. */}
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto pb-16 lg:pb-0 lg:grid lg:grid-cols-12 lg:overflow-hidden [scrollbar-gutter:stable]">
        {/* Main POS Catalog & Grid Section (8 Cols on Desktop) - Dedicated Scroll Container */}
        <div className="shrink-0 space-y-4 overflow-visible p-2 sm:p-2.5 lg:min-h-0 lg:col-span-8 lg:overflow-y-auto scrollbar-thin [scrollbar-gutter:stable]">

          {/* Repair category quick-filter chips — mobile + desktop */}
          <div className="-mx-1 px-1 overflow-x-auto no-scrollbar flex items-center gap-1.5 pb-0.5">
            <button
              type="button"
              onClick={() => setCategoryFilter('ALL')}
              className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-extrabold border transition-all cursor-pointer active:scale-95 ${
                effectiveCategoryFilter === 'ALL'
                  ? 'bg-[#0071E3] text-white border-[#0071E3] shadow-2xs'
                  : 'bg-white text-[#1D1D1F] border-[#E5E5EA] hover:border-[#0071E3]/50'
              }`}
            >
              All ({availableRepairItems.length})
            </button>
            {chipGroups.map(([group, count]) => (
              <button
                key={group}
                type="button"
                onClick={() => setCategoryFilter(group)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-extrabold border transition-all cursor-pointer active:scale-95 ${
                  effectiveCategoryFilter === group
                    ? 'bg-[#0071E3] text-white border-[#0071E3] shadow-2xs'
                    : 'bg-white text-[#1D1D1F] border-[#E5E5EA] hover:border-[#0071E3]/50'
                }`}
              >
                {group} ({count})
              </button>
            ))}
          </div>

          {/* Service Grid - Fixed Height Non-shifting Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 3xl:grid-cols-4 4xl:grid-cols-5 gap-3.5 pb-8 pt-0.5 px-0.5">
            {filteredItems.length === 0 ? (
              <div className="col-span-full bg-white border border-[#E5E5EA] rounded-2xl p-10 text-center text-[#86868B]">
                <ListChecks className="w-8 h-8 mx-auto mb-2 opacity-40 text-[#0071E3]" />
                <p className="font-extrabold text-xs text-[#1D1D1F]">No services found for {selectedDevice}</p>
                <p className="text-[11px] text-[#86868B] mt-1">Try another category, search term, or choose a different model.</p>
              </div>
            ) : (
              filteredItems.map((item) => {
                const isSelected = cart.has(item.key);
                const cartItem = cart.get(item.key);
                const discountPct = cartItem?.discountPercent || 0;
                const finalPrice = item.price ? item.price - item.price * (discountPct / 100) : 0;
                const config = getCategoryConfig(item.key, item.group);
                const IconComp = config.icon;

                return (
                  <motion.div
                    key={item.key}
                    onClick={() => handleToggleCartItem(item.key, item.label, item.price!, item.warranty)}
                    role="button"
                    tabIndex={0}
                    aria-pressed={isSelected}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleToggleCartItem(item.key, item.label, item.price!, item.warranty);
                      }
                    }}
                    initial={false}
                    animate={{ scale: isSelected ? 1.015 : 1 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    className={`group relative bg-white border-2 rounded-2xl p-2.5 sm:p-4 cursor-pointer transition-colors duration-200 flex items-center gap-2.5 sm:flex-col sm:items-stretch sm:justify-between select-none shadow-2xs min-h-[64px] sm:min-h-0 sm:h-[152px] ${
                      isSelected
                        ? 'border-[#0071E3] bg-[#0071E3]/[0.03] shadow-md'
                        : 'border-[#E5E5EA] hover:border-[#0071E3]/50'
                    }`}
                  >
                    {/* Icon + service name + warranty (compact horizontal row on mobile) */}
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl border flex items-center justify-center shrink-0 ${config.bg}`}>
                        <IconComp className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${config.color}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <h3 className="font-extrabold text-xs sm:text-sm text-[#1D1D1F] truncate min-w-0" title={item.label}>
                            {item.label}
                          </h3>
                          {/* Warranty pill — small, beside the service name */}
                          <span className="inline-flex items-center space-x-0.5 text-[8px] font-extrabold text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded-full border border-emerald-200 shrink-0">
                            <ShieldCheck className="w-2 h-2 text-emerald-600 shrink-0" />
                            <span>{item.warranty}</span>
                          </span>
                        </div>
                        <span className="hidden sm:block text-[10px] font-extrabold text-[#86868B] uppercase tracking-wider mt-0.5">
                          {item.group}
                        </span>
                      </div>
                    </div>

                    {/* Price (right on mobile / bottom on desktop) + selection checkmark */}
                    <div className="flex items-center gap-2 shrink-0 sm:w-full sm:mt-2 sm:pt-2 sm:border-t sm:border-[#E5E5EA] sm:flex-col sm:items-start sm:gap-0.5">
                      <div className="text-right sm:text-left min-w-0">
                        <span className="hidden sm:block text-[9px] font-extrabold uppercase text-[#86868B] truncate">
                          {discountPct > 0 ? 'Discounted Price' : 'Standard Price'}
                        </span>
                        <div className="flex items-baseline space-x-1 sm:mt-0.5">
                          <span className="font-mono text-xs sm:text-sm font-extrabold text-[#1D1D1F]">
                            {formatPrice(finalPrice)}
                          </span>
                          {discountPct > 0 && (
                            <span className="text-[9px] sm:text-[10px] font-bold text-[#86868B] line-through font-mono">
                              {formatPrice(item.price)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Selection checkmark */}
                      <motion.div
                        animate={{ scale: isSelected ? 1 : 0.85 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                        className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border transition-all sm:absolute sm:top-3 sm:right-3 ${
                          isSelected
                            ? 'bg-[#0071E3] border-[#0071E3] text-white shadow-2xs'
                            : 'border-[#D1D1D6] bg-white text-transparent group-hover:border-[#0071E3]'
                        }`}
                      >
                        <Check className="w-3 h-3 stroke-[3]" />
                      </motion.div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side Cart & Invoice Summary Panel (4 Cols Desktop, lg+) — on mobile the cart opens as a bottom sheet */}
        <div className="hidden lg:flex flex-col overflow-hidden rounded-2xl border border-[#E5E5EA] bg-white shadow-2xs lg:col-span-4 lg:h-full lg:min-h-0">
          {/* Cart Header */}
          <div className="p-3.5 sm:p-4 border-b border-[#E5E5EA] flex items-center justify-between bg-[#F5F5F7]/80 h-[56px] shrink-0">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-[#0071E3]/10 text-[#0071E3] flex items-center justify-center shrink-0">
                <Receipt className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center space-x-1.5">
                  <h3 className="font-extrabold text-sm text-[#1D1D1F] truncate">Selected Cart</h3>
                  <span className="text-[10px] font-extrabold bg-[#0071E3] text-white px-2 py-0.5 rounded-full shrink-0 shadow-2xs">
                    {cartSummary.count} {cartSummary.count === 1 ? 'Service' : 'Services'}
                  </span>
                </div>
                <p className="text-[10px] font-bold text-[#86868B] uppercase truncate">{selectedDevice}</p>
              </div>
            </div>

            {cart.size > 0 && (
              <button
                type="button"
                onClick={handleClearCart}
                className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 bg-[#FF3B30]/10 hover:bg-[#FF3B30]/20 text-[#FF3B30] text-[11px] font-extrabold rounded-lg border border-[#FF3B30]/20 transition-all cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
                Clear All
              </button>
            )}
          </div>

            {/* Scrollable cart items — totals + actions pinned at the bottom */}
            <div className="lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
              {renderCartItems()}
            </div>
            {renderCartTotals()}
        </div>
      </div>

      {/* Mobile floating cart bar — always reachable while adding services (lg:hidden) */}
      {cart.size > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#E5E5EA] bg-white/95 backdrop-blur-sm px-4 pt-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom))] shadow-[0_-4px_12px_rgba(0,0,0,0.06)] lg:hidden">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 shrink-0">
              <p className="text-[10px] font-bold text-[#86868B] uppercase tracking-wide">Selected Services</p>
              <p className="font-mono font-black text-[#0071E3] text-base leading-tight">
                {cartSummary.count} <span className="text-[10px] font-normal text-[#86868B]">items · {formatPrice(cartSummary.totalDue)}</span>
              </p>
              {cartSummary.totalDiscountAmount > 0 && (
                <p className="text-[9px] font-extrabold text-[#34C759] leading-tight">
                  − {formatPrice(cartSummary.totalDiscountAmount)} saved
                </p>
              )}
            </div>
            <Button
              type="button"
              onClick={() => setIsCartSheetOpen(true)}
              className="flex-1 max-w-[180px] bg-[#0071E3] hover:bg-[#0071E3]/90 text-white"
            >
              <Receipt className="w-4 h-4 shrink-0" />
              <span className="truncate">View Cart</span>
            </Button>
          </div>
        </div>
      )}

      {/* Mobile cart bottom sheet — popup instead of scrolling down (lg:hidden) */}
      {isCartSheetOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 backdrop-blur-sm animate-fadeIn lg:hidden"
          onClick={() => setIsCartSheetOpen(false)}
        >
          <div
            className="w-full max-w-lg max-h-[88vh] flex flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl animate-i35-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag handle */}
            <div className="shrink-0 pt-2.5 pb-1 flex justify-center">
              <div className="w-10 h-1 rounded-full bg-[#E5E5EA]" />
            </div>

            {/* Sheet Header */}
            <div className="shrink-0 px-4 pb-3 pt-1.5 border-b border-[#E5E5EA] bg-white flex items-center justify-between gap-2">
              <div className="flex items-center space-x-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-[#0071E3]/10 text-[#0071E3] flex items-center justify-center shrink-0">
                  <Receipt className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center space-x-2">
                    <h3 className="font-extrabold text-sm text-[#1D1D1F] truncate">Review Cart</h3>
                    <span className="text-[10px] font-extrabold bg-[#0071E3]/10 text-[#0071E3] px-2 py-0.5 rounded-full shrink-0">
                      {cartSummary.count} {cartSummary.count === 1 ? 'Service' : 'Services'}
                    </span>
                  </div>
                  <p className="text-[10px] font-bold text-[#86868B] truncate">{selectedDevice}</p>
                </div>
              </div>
              <div className="flex items-center gap-0.5 shrink-0">
                {cart.size > 0 && (
                  <button
                    type="button"
                    onClick={handleClearCart}
                    className="px-2.5 py-2 text-[11px] font-extrabold text-[#FF3B30] hover:bg-[#FF3B30]/10 rounded-lg transition-colors cursor-pointer"
                  >
                    Clear All
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsCartSheetOpen(false)}
                  aria-label="Close cart"
                  className="w-10 h-10 flex items-center justify-center rounded-xl bg-[#F5F5F7] text-[#1D1D1F] hover:bg-[#E5E5EA] transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Scrollable body — items only; totals + actions are pinned below */}
            <div className="min-h-0 flex-1 overflow-y-auto">
              {renderCartItems(true)}
            </div>

            {/* Sticky totals + actions footer */}
            {renderCartTotals()}
          </div>
        </div>
      )}

      {/* Device Picker Modal */}
      <DeviceModelChooserModal
        isOpen={deviceModalOpen}
        onClose={() => setDeviceModalOpen(false)}
        selectedDevice={selectedDevice}
        onSelectDevice={(model) => setSelectedDevice(model)}
        onOpenSettings={() => setSettingsModalOpen(true)}
      />

      {/* Settings Modal */}
      <PriceSettingsModal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        catalog={catalog}
        updatePriceAndWarranty={updatePriceAndWarranty}
        importCatalogRows={importCatalogRows}
        addModel={addModel}
        renameModel={renameModel}
        deleteModel={deleteModel}
        resetToDefaults={resetToDefaults}
        currencySymbol={currencySymbol}
        setCurrencySymbol={setCurrencySymbol}
        folders={folders}
        toggleFolder={toggleFolder}
        setAllFoldersEnabled={setAllFoldersEnabled}
        addFolder={addFolder}
        renameFolder={renameFolder}
        categories={categories}
        updateCategoryLabel={updateCategoryLabel}
        addCategory={addCategory}
        deleteCategory={deleteCategory}
        applyGlobalPriceAdjustment={applyGlobalPriceAdjustment}
        applyGlobalWarranty={applyGlobalWarranty}
        formatPrice={formatPrice}
      />

      {/* Quick Price Calculator Modal */}
      <QuickPriceCalculatorModal
        isOpen={quickCalcOpen}
        onClose={() => setQuickCalcOpen(false)}
        catalog={catalog}
        folders={folders}
        currencySymbol={currencySymbol}
        initialDevice={selectedDevice}
        onSelectModelForCatalog={(model) => setSelectedDevice(model)}
        onCreateTicketWithQuote={(model, services) => {
          if (onOpenNewWorkOrder) {
            onOpenNewWorkOrder({
              model,
              service: services.map((s) => s.name).join(' + '),
              price: services.reduce((acc, curr) => acc + curr.price, 0),
            });
          }
        }}
      />
    </div>
  );
};
