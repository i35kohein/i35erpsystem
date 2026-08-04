import React, { useState, useMemo, useCallback, useEffect } from 'react';
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
  Calculator
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
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

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
  };

  const handleClearCart = () => {
    setCart(new Map());
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

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
      {/* Keep the chosen device visible while the catalog itself scrolls. */}
      <div className="z-20 shrink-0 bg-[#F5F5F7] pt-1 pb-1">
        <div className="bg-white border border-[#E5E5EA] p-4 sm:p-5 rounded-3xl shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
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

          <button
            type="button"
            onClick={() => setDeviceModalOpen(true)}
            className="px-4 py-2.5 bg-[#F5F5F7] hover:bg-[#E5E5EA] text-[#0071E3] font-extrabold text-xs rounded-2xl border border-[#E5E5EA] transition-all flex items-center space-x-2 shadow-2xs cursor-pointer active:scale-95 shrink-0"
          >
            <Folder className="w-4 h-4" />
            <span>Switch Model</span>
          </button>
        </div>
      </div>

      {/* POS Catalog & Cart Main Layout */}
      <div className="grid min-h-0 flex-1 grid-cols-1 items-stretch gap-5 overflow-y-auto lg:grid-cols-12 lg:overflow-hidden [scrollbar-gutter:stable]">
        {/* Main POS Catalog & Grid Section (8 Cols on Desktop) - Dedicated Scroll Container */}
        <div className="min-h-0 space-y-4 overflow-visible p-2 sm:p-2.5 lg:col-span-8 lg:overflow-y-auto scrollbar-thin [scrollbar-gutter:stable]">

          {/* Service Grid - Fixed Height Non-shifting Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 3xl:grid-cols-4 4xl:grid-cols-5 gap-3.5 pb-8 pt-0.5 px-0.5">
            {availableRepairItems.length === 0 ? (
              <div className="col-span-full bg-white border border-[#E5E5EA] rounded-2xl p-10 text-center text-[#86868B]">
                <ListChecks className="w-8 h-8 mx-auto mb-2 opacity-40 text-[#0071E3]" />
                <p className="font-extrabold text-xs text-[#1D1D1F]">No services found for {selectedDevice}</p>
                <p className="text-[11px] text-[#86868B] mt-1">Try searching another term or choose a different model.</p>
              </div>
            ) : (
              availableRepairItems.map((item) => {
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
                    initial={false}
                    animate={{ scale: isSelected ? 1.015 : 1 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    className={`group relative bg-white border-2 rounded-2xl p-3.5 sm:p-4 cursor-pointer transition-colors duration-200 flex flex-col justify-between select-none shadow-2xs h-[152px] ${
                      isSelected
                        ? 'border-[#0071E3] bg-[#0071E3]/[0.03] shadow-md'
                        : 'border-[#E5E5EA] hover:border-[#0071E3]/50'
                    }`}
                  >
                    {/* Top Row: Icon + Category Info + Checkbox */}
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                          <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${config.bg}`}>
                            <IconComp className={`w-4 h-4 ${config.color}`} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-extrabold text-xs sm:text-sm text-[#1D1D1F] truncate block" title={item.label}>
                              {item.label}
                            </h3>
                            <div className="flex items-center space-x-1.5 mt-0.5 flex-wrap gap-y-1">
                              <span className="text-[10px] font-extrabold text-[#86868B] uppercase tracking-wider">
                                {item.group}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Selection checkmark */}
                        <motion.div
                          animate={{ scale: isSelected ? 1 : 0.85 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                          className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border transition-all ${
                            isSelected
                              ? 'bg-[#0071E3] border-[#0071E3] text-white shadow-2xs'
                              : 'border-[#D1D1D6] bg-white text-transparent group-hover:border-[#0071E3]'
                          }`}
                        >
                          <Check className="w-3 h-3 stroke-[3]" />
                        </motion.div>
                      </div>

                      {/* Warranty Badge Pill */}
                      <div className="mt-2.5 flex items-center space-x-2">
                        <span className="inline-flex items-center space-x-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                          <ShieldCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span>{item.warranty}</span>
                        </span>
                      </div>
                    </div>

                    {/* Bottom Section: Clean Price Display */}
                    <div className="mt-2 pt-2 border-t border-[#E5E5EA]">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <span className="text-[9px] font-extrabold uppercase text-[#86868B] block truncate">
                            {discountPct > 0 ? 'Discounted Price' : 'Standard Price'}
                          </span>
                          <div className="flex items-baseline space-x-1.5 mt-0.5">
                            <span className="text-xs sm:text-sm font-extrabold text-[#1D1D1F] font-mono">
                              {formatPrice(finalPrice)}
                            </span>
                            {discountPct > 0 && (
                              <span className="text-[10px] font-bold text-[#86868B] line-through font-mono">
                                {formatPrice(item.price)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side Cart & Invoice Summary Panel (4 Cols Desktop) */}
        <div className="flex flex-col overflow-hidden rounded-2xl border border-[#E5E5EA] bg-white shadow-2xs lg:col-span-4 lg:h-full lg:min-h-0 lg:overflow-y-auto">
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

            <div className="w-20 flex justify-end shrink-0">
              {cart.size > 0 && (
                <button
                  type="button"
                  onClick={handleClearCart}
                  className="px-2 py-1 bg-[#FF3B30]/10 hover:bg-[#FF3B30]/20 text-[#FF3B30] text-[11px] font-extrabold rounded-lg transition-all cursor-pointer"
                >
                  Clear All
                </button>
              )}
            </div>
          </div>

          {/* Cart Items List with Placeholder Slots */}
          <div className="p-3.5 space-y-2.5">
            {(() => {
              const cartItems = Array.from(cart.values()) as CartItem[];
              const totalItems = cartItems.length;

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

                      // Render Placeholder Slot Card
                      return (
                        <div
                          key={`placeholder-slot-${i}`}
                          className="h-[88px] p-2.5 border-2 border-dashed border-[#E5E5EA] bg-[#F5F5F7]/40 rounded-xl flex items-center justify-between select-none"
                        >
                          <div className="flex items-center space-x-2.5">
                            <div className="w-6 h-6 rounded-lg bg-white border border-[#E5E5EA] flex items-center justify-center font-extrabold text-[11px] text-[#86868B] shrink-0">
                              {i + 1}
                            </div>
                            <div>
                              <span className="text-xs font-bold text-[#86868B] block">
                                {i === 0 ? 'Primary Service Slot' : `Add-on Service #${i + 1}`}
                              </span>
                              <span className="text-[10px] text-[#A1A1A6]">Select card from catalog</span>
                            </div>
                          </div>
                          <span className="text-[10px] font-extrabold text-[#0071E3] bg-[#0071E3]/10 px-2 py-0.5 rounded-md shrink-0">
                            Empty
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

          {/* Totals & Action Section */}
          <div className="p-4 border-t border-[#E5E5EA] bg-[#F5F5F7]/40 space-y-3">
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center text-[#86868B]">
                <span>Subtotal</span>
                <span className="font-mono font-bold text-[#1D1D1F]">{formatPrice(cartSummary.subtotal)}</span>
              </div>

              <div className="flex justify-between items-center text-xs min-h-[22px]">
                <span className="text-[#86868B]">Discount Applied:</span>
                {cartSummary.totalDiscountAmount > 0 ? (
                  <span className="font-mono font-bold text-[#34C759] bg-[#34C759]/10 px-2 py-0.5 rounded-md border border-[#34C759]/20">
                    -{formatPrice(cartSummary.totalDiscountAmount)}
                  </span>
                ) : (
                  <span className="font-mono text-[#86868B] text-[11px]">0 MMK</span>
                )}
              </div>

              <div className="flex justify-between items-baseline pt-2 border-t border-[#E5E5EA]">
                <div>
                  <span className="text-xs font-extrabold uppercase tracking-wider text-[#1D1D1F] block">
                    Total Estimated
                  </span>
                  <span className="text-[10px] text-[#86868B]">{cartSummary.count} {cartSummary.count === 1 ? 'Service' : 'Services'} Selected</span>
                </div>
                <span className="text-xl font-extrabold font-mono text-[#0071E3]">
                  {formatPrice(cartSummary.totalDue)}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={handleCreateWorkOrderFromCart}
                disabled={cart.size === 0}
                className="w-full py-2.5 bg-[#0071E3] hover:bg-[#0071E3]/90 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl transition-all shadow-2xs flex items-center justify-center space-x-2 cursor-pointer disabled:cursor-not-allowed active:scale-98"
              >
                <FileText className="w-4 h-4" />
                <span>Create Intake Ticket</span>
              </button>

              <button
                type="button"
                onClick={handleCopyCustomerQuote}
                className="w-full py-2 bg-white hover:bg-[#F5F5F7] text-[#1D1D1F] border border-[#E5E5EA] font-extrabold text-xs rounded-xl transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-2xs"
              >
                {quoteCopied ? <Check className="w-4 h-4 text-[#34C759]" /> : <Copy className="w-4 h-4 text-[#0071E3]" />}
                <span>{quoteCopied ? 'Quote Copied!' : 'Copy Customer Quote'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

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
