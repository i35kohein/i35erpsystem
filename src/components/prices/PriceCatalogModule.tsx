import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useIsIpad } from '../../hooks/useIsIpad';
import { motion } from 'motion/react';
import { 
  ShieldCheck, 
  Smartphone, 
  ListChecks, 
  Check, 
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
  FileText, 
  Folder,
  BadgePercent,
  Trash2
} from 'lucide-react';
import { 
  ModelRepairPrice, 
  PriceCatalogImportRow,
  REPAIR_CATEGORIES, 
  RepairCategoryDef, 
  FolderConfig, 
  DEFAULT_DEVICE_FOLDERS} from '../../types/priceCatalog';
import { PriceSettingsModal } from './PriceSettingsModal';
import { SystemSettings } from '../../types';
import { DeviceModelChooserModal } from '../devices/DeviceModelChooserModal';
import { Button } from '../ui';
import { toast } from '../../lib/toast';

interface PriceCatalogModuleProps {
  catalog: ModelRepairPrice[];
  systemSettings?: SystemSettings;
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

/** Shared warranty pill (extracted 2026-08-08 — was duplicated 4× verbatim) */
const DISCOUNT_OPTIONS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50];

/** Compact warranty label: "3 Month" → "3M", "3 M ( Touch )" → "3M ( Touch )" (Ko Hein) */
function shortWarranty(warranty: string): string {
  return warranty.replace(/(\d+)\s*(?:Months?|M)\b/gi, '$1M');
}

/** Mobile swipe-to-remove row — swipe LEFT reveals a theme Remove button; tap it to delete (Ko Hein). */
function SwipeToRemoveRow({ onRemove, children }: { onRemove: () => void; children: React.ReactNode }) {
  const offsetRef = useRef(0);
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const base = useRef(0);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const THRESHOLD = 60;
  const OPEN_OFFSET = -96; // w-24 reveal width

  const applyOffset = (next: number, transition = true) => {
    offsetRef.current = next;
    if (contentRef.current) {
      contentRef.current.style.transition = transition ? 'transform 200ms' : 'none';
      contentRef.current.style.transform = `translateX(${next}px)`;
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    base.current = offsetRef.current;
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (startX.current === null || startY.current === null) return;
    const dx = e.touches[0].clientX - startX.current;
    const dy = e.touches[0].clientY - startY.current;
    // Vertical scroll or plain tap — don't hijack.
    if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(dy)) return;
    // Swiping right closes an open row; swiping left opens (clamped to reveal width).
    const next = base.current + dx;
    applyOffset(next > 0 ? 0 : Math.max(next, OPEN_OFFSET), false);
  };
  const handleTouchEnd = () => {
    if (offsetRef.current < -THRESHOLD) {
      applyOffset(OPEN_OFFSET); // stay open — manual tap on Remove to delete
    } else {
      applyOffset(0);
    }
    startX.current = null;
    startY.current = null;
  };

  return (
    <div
      className="relative overflow-hidden"
      style={{ touchAction: 'pan-y' }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Reveal button — theme danger, tap to delete */}
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove item"
        className="absolute inset-y-0 right-0 w-24 bg-danger hover:bg-danger/90 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 rounded-l-xl focus:outline-none"
      >
        <Trash2 className="w-4 h-4" />
        <span>Remove</span>
      </button>
      {/* Foreground content — tapping it closes the reveal */}
      <div
        ref={contentRef}
        className="relative bg-white"
        style={{ transition: 'transform 200ms' }}
        onClick={() => {
          if (offsetRef.current < 0) applyOffset(0);
        }}
      >
        {children}
      </div>
    </div>
  );
}

function WarrantyPill({ warranty, size = 'sm' }: { warranty: string; size?: 'sm' | 'md' }) {
  const icon = size === 'md' ? 'w-2.5 h-2.5' : 'w-1.5 h-1.5 sm:w-2 sm:h-2';
  const pad = size === 'md' ? 'px-1.5 py-0.5' : 'px-1 py-px sm:py-0.5';
  return (
    <span className={`inline-flex items-center space-x-0.5 text-[10px] sm:text-xs font-extrabold text-success-deep bg-success/10 ${pad} rounded-full border border-success/30 shrink-0`}>
      <ShieldCheck className={`${icon} text-success shrink-0`} />
      <span>{shortWarranty(warranty)}</span>
    </span>
  );
}



export const PriceCatalogModule: React.FC<PriceCatalogModuleProps> = ({
  catalog,
  systemSettings,
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
  isDeviceModalOpen: externalDeviceModalOpen,
  setIsDeviceModalOpen: setExternalDeviceModalOpen,
  isSettingsModalOpen: externalSettingsModalOpen,
  setIsSettingsModalOpen: setExternalSettingsModalOpen,
  onRegisterExportHandler,
}) => {
  // State
  const [selectedDevice, setSelectedDevice] = useState<string>(catalog[0]?.model || '');
  const isIpad = useIsIpad();
  
  // Search query comes from the app topbar (desktop); mobile in-module search removed (Ko Hein)
  const queryToUse = externalSearchQuery || '';
  const [localDeviceModalOpen, setLocalDeviceModalOpen] = useState(false);
  const deviceModalOpen = externalDeviceModalOpen !== undefined ? externalDeviceModalOpen : localDeviceModalOpen;
  const setDeviceModalOpen = setExternalDeviceModalOpen || setLocalDeviceModalOpen;

  const [localSettingsModalOpen, setLocalSettingsModalOpen] = useState(false);
  const settingsModalOpen = externalSettingsModalOpen !== undefined ? externalSettingsModalOpen : localSettingsModalOpen;
  const setSettingsModalOpen = setExternalSettingsModalOpen || setLocalSettingsModalOpen;

  const [quoteCopied, setQuoteCopied] = useState(false);
  const [isCartSheetOpen, setIsCartSheetOpen] = useState(false);
  // Which cart item has its discount picker expanded (mobile sheet only).
  const [discountMenuOpenFor, setDiscountMenuOpenFor] = useState<string | null>(null);
  const [customDiscountInput, setCustomDiscountInput] = useState('');
  // Popup anchor computed at open time — avoids the 'sometimes top-left corner'
  // bug from measuring the trigger rect while the page is moving/scrolling.
  const [discountPopupAnchor, setDiscountPopupAnchor] = useState<{ top: number; left: number } | null>(null);

  // Close the discount popup when clicking/tapping outside it (Ko Hein).
  useEffect(() => {
    if (!discountMenuOpenFor) return;
    const onDocClick = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (target.closest('.discount-popup') || target.closest('.discount-trigger')) return;
      setDiscountMenuOpenFor(null);
      setDiscountPopupAnchor(null);
    };
    const onScroll = () => {
      setDiscountMenuOpenFor(null);
      setDiscountPopupAnchor(null);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('touchstart', onDocClick, { passive: true });
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('touchstart', onDocClick);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [discountMenuOpenFor]);

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
  

  

  // Category Icon & Color Configuration matching 21 diagnostic tests
  const getCategoryConfig = (key: string, _group: string) => {
    const k = key.toLowerCase();
    if (k.includes('battery')) {
      return {
        icon: Zap,
        color: 'text-warning',
        bg: 'bg-warning/10 border-warning/30',
      };
    }
    if (k.includes('display') || k.includes('touch') || k.includes('lcd')) {
      return {
        icon: Smartphone,
        color: 'text-brand',
        bg: 'bg-brand-soft border-brand/30',
      };
    }
    if (k.includes('backglass') || k.includes('housing')) {
      return {
        icon: Layers,
        color: 'text-danger',
        bg: 'bg-danger/10 border-danger/30',
      };
    }
    if (k.includes('charing') || k.includes('charging') || k.includes('flex')) {
      return {
        icon: Power,
        color: 'text-danger',
        bg: 'bg-danger/10 border-danger/30',
      };
    }
    if (k.includes('speaker') || k.includes('ear_') || k.includes('ring_')) {
      return {
        icon: Volume2,
        color: 'text-purple',
        bg: 'bg-purple/10 border-purple/30',
      };
    }
    if (k.includes('mic')) {
      return {
        icon: Mic,
        color: 'text-purple',
        bg: 'bg-purple/10 border-purple/30',
      };
    }
    if (k.includes('logic') || k.includes('rf_layer') || k.includes('no_power')) {
      return {
        icon: Cpu,
        color: 'text-brand',
        bg: 'bg-brand-soft border-brand/30',
      };
    }
    if (k.includes('network') || k.includes('wifi') || k.includes('pay') || k.includes('nfc')) {
      return {
        icon: Wifi,
        color: 'text-sky',
        bg: 'bg-sky/10 border-sky/30',
      };
    }
    if (k.includes('face_id') || k.includes('key') || k.includes('sensor')) {
      return {
        icon: Scan,
        color: 'text-success',
        bg: 'bg-success/10 border-success/30',
      };
    }
    return {
      icon: ListChecks,
      color: 'text-muted',
      bg: 'bg-surface border-line',
    };
  };

  // Group catalog devices by series for modal selection
  

  // Selected Active Device Data
  const activeDeviceData = useMemo(() => {
    return catalog.find((c) => c.model === selectedDevice) || catalog[0];
  }, [catalog, selectedDevice]);

  // If the selected model disappears from the catalog (import/reset) or the
  // catalog loads after mount, sync the selector to a real model — otherwise
  // quotes/headers show an empty device (audit P2 + quote fix).
  useEffect(() => {
    if (catalog.length === 0) return;
    if (!selectedDevice || !catalog.some((c) => c.model === selectedDevice)) {
      setSelectedDevice(catalog[0]?.model || '');
    }
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
  const [categoryFilterTouched, setCategoryFilterTouched] = useState(false);
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
  // Device change must never leave stale per-device prices in the cart — a
  // quote under the new model header would silently use the old model's prices
  // (selected-UIUX audit P1, verified live).
  const handleDeviceChange = (model: string) => {
    if (model !== selectedDevice && cart.size > 0) {
      setCart(new Map());
      toast.info('Cart cleared — services are priced per device model.', 'Device Changed');
    }
    setSelectedDevice(model);
  };

  const handleToggleCartItem = (categoryKey: string, label: string, price: number, warranty: string) => {
    setCart((prev) => {
      const next = new Map(prev);
      if (next.has(categoryKey)) {
        next.delete(categoryKey);
      } else {
        // Newest selection becomes the Primary Service Slot (move-to-front),
        // so the card you just tapped is always slot #1.
        return new Map([[categoryKey, { categoryKey, label, price, warranty, discountPercent: 0 }], ...next.entries()]);
      }
      return next;
    });
  };

  // Bottom-center discount notification (Ko Hein: show briefly at bottom-center)
  const [discountNotice, setDiscountNotice] = useState<string | null>(null);
  const discountNoticeTimer = useRef<number | null>(null);

  const handleUpdateItemDiscount = (categoryKey: string, discountPercent: number) => {
    const existing = cart.get(categoryKey) as CartItem | undefined;
    const savings = existing ? Math.round(existing.price * (discountPercent / 100)) : 0;
    setCart((prev) => {
      const next = new Map(prev);
      const cur = next.get(categoryKey) as CartItem | undefined;
      if (cur) {
        next.set(categoryKey, {
          categoryKey: cur.categoryKey,
          label: cur.label,
          price: cur.price,
          warranty: cur.warranty,
          discountPercent,
        });
      }
      return next;
    });
    if (discountPercent > 0) {
      toast.success(`${discountPercent}% discount applied`, 'Discount');
      setDiscountNotice(existing ? `${discountPercent}% Off — save ${formatPrice(savings)}` : `${discountPercent}% discount applied`);
    } else {
      toast.info('Discount removed', 'Discount');
      setDiscountNotice('Discount removed');
    }
    if (discountNoticeTimer.current) window.clearTimeout(discountNoticeTimer.current);
    discountNoticeTimer.current = window.setTimeout(() => setDiscountNotice(null), 2200);
  };

  const handleClearCart = () => {
    setCart(new Map());
    setDiscountMenuOpenFor(null);
    toast.info('Cart cleared', 'Cart');
  };

  

  const handleCopyCustomerQuote = () => {
    const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const shopName = systemSettings?.shopName?.trim() || 'i35 Apple Service';
    const slogan = systemSettings?.shopInfo?.trim() || '';
    if (cart.size === 0) {
      // Copy single estimated service or active device total
      const text = [
        `${shopName} — Repair Quote`,
        `Device: ${selectedDevice}`,
        `Date: ${dateStr}`,
        'Status: Available Today',
        ...(slogan ? [slogan] : []),
      ].join('\n');
      navigator.clipboard.writeText(text);
    } else {
      const lines: string[] = [
        `${shopName} — Repair Quote`,
        `Device: ${selectedDevice}`,
        `Date: ${dateStr}`,
        '',
      ];
      let idx = 1;
      cart.forEach((item: CartItem) => {
        const itemFinal = item.price - item.price * (item.discountPercent / 100);
        const disc =
          item.discountPercent > 0
            ? ` (was ${formatPrice(item.price)} · ${item.discountPercent}% Off)`
            : '';
        lines.push(`${idx}. ${item.label} — ${formatPrice(itemFinal)}${disc}`);
        lines.push(`   Warranty: ${shortWarranty(item.warranty)}`);
        idx += 1;
      });
      lines.push('');
      lines.push(`Total Estimated: ${formatPrice(cartSummary.totalDue)}`);
      if (slogan) lines.push(slogan);
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
    const headers = ['Model', ...categories.map((c) => `${c.label} Price`), ...categories.map((c) => `${c.label} Warranty`)];
    const rows = catalog.map((item) => {
      const priceVals = categories.map((c) => item.prices[c.key] ?? '');
      const warrantyVals = categories.map((c) => item.warranties[c.key] ?? '');
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

                return (
                  <div className="p-3 space-y-2.5">
                    {cartItems.length === 0 ? (
                      <div className="py-10 text-center space-y-2">
                        <div className="w-12 h-12 rounded-full bg-surface flex items-center justify-center mx-auto text-muted">
                          <Receipt className="w-5 h-5" />
                        </div>
                        <p className="text-sm font-bold text-ink">Your cart is empty</p>
                        <p className="text-xs text-muted">Tap services in the catalog to add them here.</p>
                      </div>
                    ) : (
                      <>
                      {/* Table header — text-based, clear columns */}
                      <div className="grid grid-cols-[14px_1fr_auto] gap-x-2.5 px-0 py-2 border-b border-line">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted">#</span>
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted">Service</span>
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted text-right">Price</span>
                      </div>
                      {cartItems.map((item, idx) => {
                        const discAmt = item.price * (item.discountPercent / 100);
                        const finalItemPrice = item.price - discAmt;

                        return (
                          <SwipeToRemoveRow key={item.categoryKey} onRemove={() => handleToggleCartItem(item.categoryKey, item.label, item.price, item.warranty)}>
                          <div className="py-2.5 border-b border-line last:border-0">
                            <div className="grid grid-cols-[14px_1fr_auto] items-center gap-x-2.5">
                              {/* # */}
                              <span className="text-[11px] font-extrabold text-muted tabular-nums">{idx + 1}</span>
                              {/* Service + warranty inline — compact (Ko Hein) */}
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-ink leading-snug">
                                  {item.label}
                                  <span className="ml-1 text-[11px] font-semibold text-muted whitespace-nowrap">({shortWarranty(item.warranty).replace(/[()]/g, '').replace(/\s+/g, ' ').trim()})</span>
                                </p>
                              </div>
                              {/* Price — TAP to set/change discount (Ko Hein) */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  const pw = 176;
                                  let l = rect.left;
                                  l = Math.max(8, Math.min(l, window.innerWidth - pw - 8));
                                  setDiscountPopupAnchor({ top: rect.bottom + 6, left: l });
                                  setDiscountMenuOpenFor(item.categoryKey);
                                }}
                                title={item.discountPercent > 0 ? `${item.discountPercent}% discount applied — tap to change` : 'Tap to add discount'}
                                className="text-right min-w-0 !min-h-0 rounded-lg px-1 -mx-1 py-0.5 transition-colors cursor-pointer focus:outline-none active:scale-[0.98] hover:bg-success/5"
                              >
                                <p className="font-mono text-xs font-black text-ink whitespace-nowrap tabular-nums">{formatPrice(finalItemPrice)}</p>
                                {item.discountPercent > 0 && (
                                  <p className="text-[10px] font-semibold text-muted whitespace-nowrap tabular-nums">
                                    <s className="font-mono">{formatPrice(item.price)}</s> · {item.discountPercent}%
                                  </p>
                                )}
                              </button>
                              {renderDiscountPopup(item)}
                            </div>
                          </div>
                          </SwipeToRemoveRow>
                        );
                      })}
                      </>
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
                            className="min-h-[88px] p-2.5 bg-white border border-line rounded-xl flex flex-col justify-between shadow-2xs transition-all hover:border-brand/40"
                          >
                            <div className="flex items-start justify-between gap-1.5">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center space-x-1.5 min-w-0">
                                  <span className="w-4 h-4 rounded-md bg-brand text-white flex items-center justify-center font-extrabold text-xs shrink-0">
                                    {i + 1}
                                  </span>
                                  <h4 className="font-extrabold text-xs text-ink truncate leading-tight min-w-0">{item.label}</h4>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <WarrantyPill warranty={item.warranty} size="md" />
                                <Button
                                  type="button"
                                  onClick={() => handleToggleCartItem(item.categoryKey, item.label, item.price, item.warranty)}
                                  className="bg-transparent text-muted hover:text-danger hover:bg-transparent p-1 rounded transition-colors cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-0"
                                  title="Remove item"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </div>

                            <div className="flex items-center justify-between bg-surface px-2 py-1 rounded-lg">
                              <div className="flex items-center space-x-1.5">
                                <div className="relative">
                                  <Button
                                    type="button"
                                    onClick={(e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pw = 176;
    let l = rect.left;
    l = Math.max(8, Math.min(l, window.innerWidth - pw - 8));
    setDiscountPopupAnchor({ top: rect.bottom + 6, left: l });
    setDiscountMenuOpenFor(item.categoryKey);
  }}
                                    title={item.discountPercent > 0 ? `${item.discountPercent}% discount applied` : 'Add discount'}
                                    className={`discount-trigger !w-7 !h-7 !min-h-7 rounded-full flex items-center justify-center transition-all cursor-pointer active:scale-95 ${
                                      item.discountPercent > 0
                                        ? 'bg-brand text-white border border-brand shadow-2xs'
                                        : 'bg-white text-muted border border-line hover:border-brand hover:text-brand'
                                    }`}
                                  >
                                    <BadgePercent className="w-4 h-4" />
                                  </Button>
                                  {renderDiscountPopup(item)}
                                </div>
                                {item.discountPercent > 0 && (
                                  <span className="text-[11px] font-extrabold text-success">{item.discountPercent}% Off</span>
                                )}
                              </div>

                              <div className="flex items-baseline space-x-1.5 shrink-0">
                                {item.discountPercent > 0 && (
                                  <span className="text-xs text-muted line-through font-mono">
                                    {formatPrice(item.price)}
                                  </span>
                                )}
                                <span className="font-black font-mono text-sm text-ink">
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
                          className="h-[88px] p-2.5 border-2 border-dashed border-line/80 bg-surface/30 rounded-xl flex items-center gap-2.5 select-none"
                        >
                          <div className="w-6 h-6 rounded-lg bg-white border border-line flex items-center justify-center font-extrabold text-xs text-muted shrink-0">
                            {i + 1}
                          </div>
                          <span className="text-xs font-bold text-muted truncate">
                            {i === 0 ? 'Empty — pick a service to add' : `Empty slot #${i + 1} — pick a service`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                );
              }

              // If MORE than 3 items: render scrollable list of all selected items
              return (
                <div className="overflow-y-auto space-y-2.5 pr-1 no-scrollbar">
                  {cartItems.map((item, idx) => {
                    const discAmt = item.price * (item.discountPercent / 100);
                    const finalItemPrice = item.price - discAmt;

                    return (
                      <div
                        key={item.categoryKey}
                        className="min-h-[88px] p-2.5 bg-white border border-line rounded-xl flex flex-col justify-between shadow-2xs transition-all hover:border-brand/40"
                      >
                        <div className="flex items-start justify-between gap-1.5">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center space-x-1.5 min-w-0">
                              <span className="w-4 h-4 rounded-md bg-brand text-white flex items-center justify-center font-extrabold text-xs shrink-0">
                                {idx + 1}
                              </span>
                              <h4 className="font-extrabold text-xs text-ink truncate leading-tight min-w-0">{item.label}</h4>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <WarrantyPill warranty={item.warranty} size="md" />
                            <Button
                              type="button"
                              onClick={() => handleToggleCartItem(item.categoryKey, item.label, item.price, item.warranty)}
                              className="bg-transparent text-muted hover:text-danger hover:bg-transparent p-1 rounded transition-colors cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-0"
                              title="Remove item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                          </div>
                        </div>

                        <div className="flex items-center justify-between bg-surface px-2 py-1 rounded-lg">
                          <div className="flex items-center space-x-1.5">
                            <div className="relative">
                              <Button
                                type="button"
                                onClick={(e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pw = 176;
    let l = rect.left;
    l = Math.max(8, Math.min(l, window.innerWidth - pw - 8));
    setDiscountPopupAnchor({ top: rect.bottom + 6, left: l });
    setDiscountMenuOpenFor(item.categoryKey);
  }}
                                title={item.discountPercent > 0 ? `${item.discountPercent}% discount applied` : 'Add discount'}
                                className={`discount-trigger !w-7 !h-7 !min-h-7 rounded-full flex items-center justify-center transition-all cursor-pointer active:scale-95 ${
                                  item.discountPercent > 0
                                    ? 'bg-brand text-white border border-brand shadow-2xs'
                                    : 'bg-white text-muted border border-line hover:border-brand hover:text-brand'
                                }`}
                              >
                                <BadgePercent className="w-4 h-4" />
                              </Button>
                              {renderDiscountPopup(item)}
                            </div>
                            {item.discountPercent > 0 && (
                              <span className="text-[11px] font-extrabold text-success">{item.discountPercent}% Off</span>
                            )}
                          </div>

                          <div className="flex items-baseline space-x-1.5 shrink-0">
                            {item.discountPercent > 0 && (
                              <span className="text-xs text-muted line-through font-mono">
                                {formatPrice(item.price)}
                              </span>
                            )}
                            <span className="font-black font-mono text-sm text-ink">
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

  // Discount popup — small box anchored right under the circle button, with
  // circular preset options + custom % (Ko Hein: no rightward expansion).
  const renderDiscountPopup = (item: CartItem) => {
    if (discountMenuOpenFor !== item.categoryKey || !discountPopupAnchor) return null;
    const { top, left } = discountPopupAnchor;
    return createPortal(
      <div
        className="discount-popup fixed z-[80] w-44 rounded-2xl border border-line bg-white p-2 shadow-xl"
        style={{ top, left }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-1 pb-2 gap-2">
          <p className="text-xs font-extrabold text-ink">Discount</p>
          <span className="text-xs font-bold text-muted truncate max-w-[120px]">{item.label}</span>
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {DISCOUNT_OPTIONS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => {
                handleUpdateItemDiscount(item.categoryKey, p);
                setDiscountMenuOpenFor(null);
              }}
              className={`!w-7 !h-7 !min-h-7 !min-w-7 rounded-full text-[10px] font-extrabold flex items-center justify-center transition-all cursor-pointer active:scale-90 focus-visible:outline-none focus-visible:bg-brand focus-visible:text-white focus-visible:border-brand ${
                item.discountPercent === p
                  ? 'bg-brand text-white border border-brand'
                  : 'bg-white text-ink border border-line hover:border-brand hover:text-brand'
              }`}
              title={p === 0 ? 'No discount' : `${p}% off`}
            >
              {p === 0 ? '0' : p}
            </button>
          ))}
        </div>
        <div className="mt-2 pt-2 border-t border-line">
          <input
            type="number"
            inputMode="numeric"
            placeholder="Custom %"
            value={customDiscountInput}
            onChange={(e) => setCustomDiscountInput(e.target.value)}
            onBlur={() => {
              const v = Number(customDiscountInput);
              if (v >= 1 && v <= 100) {
                handleUpdateItemDiscount(item.categoryKey, v);
                setCustomDiscountInput('');
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const v = Number(customDiscountInput);
                if (v >= 1 && v <= 100) {
                  handleUpdateItemDiscount(item.categoryKey, v);
                  setDiscountMenuOpenFor(null);
                  setCustomDiscountInput('');
                }
              }
            }}
            className="w-full !h-9 !min-h-9 rounded-full bg-surface border border-line px-3.5 text-xs font-bold text-ink/60 placeholder:text-muted/50 outline-none focus:border-brand transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            title="Custom discount % — type and press Enter"
          />
        </div>
      </div>,
      document.body
    );
  };

  const renderCartTotals = () => (
    <div className="shrink-0 bg-white border-t border-line px-3.5 pt-3 pb-[calc(0.875rem+env(safe-area-inset-bottom))] space-y-2.5">
      <div className="space-y-1.5 text-xs sm:text-sm">
        <div className="flex justify-between items-center">
          <span className="text-muted">Subtotal</span>
          <span className="font-mono font-bold text-ink sm:text-base">{formatPrice(cartSummary.subtotal)}</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-muted">Discount Applied</span>
          {cartSummary.totalDiscountAmount > 0 ? (
            <span className="font-mono font-bold text-success sm:text-base">
              -{formatPrice(cartSummary.totalDiscountAmount)}
            </span>
          ) : (
            <span className="font-mono text-muted sm:text-base">{formatPrice(0)}</span>
          )}
        </div>

        <div className="flex justify-between items-baseline pt-2 border-t border-line">
          <div className="min-w-0">
            <span className="text-xs font-extrabold uppercase tracking-wider text-ink block">
              Total Estimated
            </span>
            <span className="text-xs text-muted">{cartSummary.count} {cartSummary.count === 1 ? 'Service' : 'Services'} Selected</span>
          </div>
          <span className="text-xl font-extrabold font-mono text-brand shrink-0">
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
          className="w-full bg-brand hover:bg-brand/90 disabled:opacity-50 text-white"
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
          {quoteCopied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4 text-brand" />}
          <span>{quoteCopied ? 'Quote Copied!' : 'Copy Customer Quote'}</span>
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
      {/* POS Catalog & Cart Main Layout */}
      {/* Mobile: plain flex column so each child keeps its natural height and the
          container scrolls (CSS-grid auto rows + stretch were collapsing the catalog
          section to ~289px so cards overlapped the cart panel). Desktop (lg): grid
          8/4 split with internal scrolling, unchanged. */}
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pb-16 lg:pb-0 md:flex-row [scrollbar-gutter:stable]">
        {/* Main POS Catalog & Grid Section — left column */}
        <div className="min-w-0 flex-1 space-y-4 overflow-visible p-2 sm:p-2.5">
      {/* Active Device (left, above) + repair category chips (below, full width) (Ko Hein) */}
      <div className="flex flex-col gap-2.5">
        <div className="w-full bg-gradient-to-br from-brand/8 via-white to-white border border-line rounded-2xl px-4 sm:px-5 py-3.5 shadow-2xs flex items-center justify-between gap-3 min-w-0">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-2xl bg-brand text-white flex items-center justify-center shadow-md shrink-0">
              <Smartphone className="w-5 h-5 sm:w-7 sm:h-7" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-brand-deep bg-brand/10 px-2 py-0.5 rounded-full">
                  Active Device
                </span>
                <span className="text-[11px] font-bold text-muted">
                  {availableRepairItems.filter((i) => i.price && i.price > 0).length} Services
                </span>
                <span className="hidden sm:inline text-[11px] font-bold text-success/80">
                  {chipGroups.length} Categories
                </span>
              </div>
              <h2 className="text-lg sm:text-2xl font-black text-ink tracking-tight truncate mt-0.5">
                {selectedDevice}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setDeviceModalOpen(true)}
            className="shrink-0 min-h-10 px-3.5 sm:px-4 rounded-xl bg-brand hover:bg-brand-deep text-white font-extrabold text-xs border border-brand transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-2xs focus:outline-none"
          >
            <Folder className="w-3.5 h-3.5" />
            <span>Switch Model</span>
          </button>
        </div>

        {/* Repair category quick-filter chips — below the device card (Ko Hein) */}
          <div className="w-full -mx-1 px-1 overflow-x-auto no-scrollbar flex items-center gap-1.5 pb-0.5">
            <Button
              type="button"
              onClick={() => { setCategoryFilter('ALL'); setCategoryFilterTouched(true); }}
              className={`shrink-0 px-2.5 !h-7 !min-h-0 sm:!h-10 sm:!min-h-10 sm:px-3 rounded-full text-xs font-extrabold border transition-all cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:bg-brand focus-visible:text-white focus-visible:border-brand ${
                effectiveCategoryFilter === 'ALL' && categoryFilterTouched
                  ? 'bg-brand text-white border-brand shadow-2xs'
                  : 'bg-white text-ink border-line hover:border-brand/50'
              }`}
            >
              All ({availableRepairItems.length})
            </Button>
            {chipGroups.map(([group, count]) => (
              <Button
                key={group}
                type="button"
                onClick={() => { setCategoryFilter(group); setCategoryFilterTouched(true); }}
                className={`shrink-0 px-2.5 !h-7 !min-h-0 sm:!h-10 sm:!min-h-10 sm:px-3 rounded-full text-xs font-extrabold border transition-all cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:bg-brand focus-visible:text-white focus-visible:border-brand ${
                  effectiveCategoryFilter === group
                    ? 'bg-brand text-white border-brand shadow-2xs'
                    : 'bg-white text-ink border-line hover:border-brand/50'
                }`}
              >
                {group} ({count})
              </Button>
            ))}
          </div>
      </div>



          {/* Service Grid - Fixed Height Non-shifting Cards */}
          <div className={`grid gap-3.5 pb-8 pt-0.5 px-0.5 ${isIpad ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 3xl:grid-cols-4 4xl:grid-cols-5'}`}>
            {filteredItems.length === 0 ? (
              <div className="col-span-full bg-white border border-line rounded-2xl p-10 text-center text-muted">
                <ListChecks className="w-8 h-8 mx-auto mb-2 opacity-40 text-brand" />
                <p className="font-extrabold text-xs text-ink">No services found for {selectedDevice}</p>
                <p className="text-xs text-muted mt-1">Try another category, search term, or choose a different model.</p>
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
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    className={`group relative bg-white border-2 rounded-2xl p-2.5 sm:p-4 cursor-pointer transition-colors duration-200 flex flex-col gap-2 sm:gap-2.5 sm:items-stretch sm:justify-between select-none shadow-2xs min-h-[100px] sm:min-h-0 sm:h-[180px] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/60 focus-visible:border-brand ${
                      isSelected
                        ? 'border-brand bg-brand/5 shadow-md'
                        : 'border-line hover:border-brand/50'
                    }`}
                  >
                    {/* Row 1: icon + service name (left) + warranty (far right) */}
                    <div className="flex items-center justify-between gap-2 min-w-0">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl border flex items-center justify-center shrink-0 ${config.bg}`}>
                          <IconComp className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${config.color}`} />
                        </div>
                        <h3 className="font-extrabold text-xs sm:text-sm text-ink min-w-0 leading-snug" title={item.label}>
                          {item.label}
                        </h3>
                      </div>
                      <WarrantyPill warranty={item.warranty} />
                    </div>

                    {/* Row 2: Repair Category */}
                    <div className="flex items-center justify-between gap-2 min-w-0">
                      <span className="text-[10px] sm:text-xs font-extrabold text-muted uppercase tracking-wider truncate">
                        {item.group}
                      </span>
                    </div>

                    {/* Price (right on mobile / bottom on desktop) + selection checkmark */}
                    <div className="flex items-center gap-2 shrink-0 w-full mt-1 pt-2 border-t border-line justify-between sm:mt-2 sm:pt-2 sm:border-t sm:border-line sm:flex-col sm:items-start sm:gap-0.5">
                      <div className="text-right sm:text-left min-w-0">
                        <div className="flex items-baseline space-x-1.5 sm:mt-0.5 flex-wrap">
                          <span className="font-mono text-sm sm:text-sm font-black text-ink">
                            {formatPrice(finalPrice)}
                          </span>
                          {discountPct > 0 && (
                            <span className="text-sm sm:text-sm font-bold text-muted line-through font-mono">
                              {formatPrice(item.price)}
                            </span>
                          )}
                          {discountPct > 0 && (
                            <span className="text-[10px] sm:text-[11px] font-extrabold text-success whitespace-nowrap">
                              −{formatPrice(Math.round(item.price! - finalPrice))} · {discountPct}%
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Mobile: discount circle — replaces the selection checkmark on phones (Ko Hein) */}
                      <div className="relative sm:hidden shrink-0">
                        <Button
                          type="button"
                          onClick={(e) => {
                            // Don't let the click bubble to the card's toggle handler
                            // (it would add + immediately remove the item).
                            e.stopPropagation();
                            if (!cart.has(item.key)) {
                              handleToggleCartItem(item.key, item.label, item.price!, item.warranty);
                            }
                            const rect = e.currentTarget.getBoundingClientRect();
                            const pw = 176;
                            let l = rect.right - pw;
                            l = Math.max(8, Math.min(l, window.innerWidth - pw - 8));
                            setDiscountPopupAnchor({ top: rect.bottom + 6, left: l });
                            setDiscountMenuOpenFor(item.key);
                          }}
                          title={discountPct > 0 ? `${discountPct}% discount applied` : 'Add discount'}
                          className={`discount-trigger !w-7 !h-7 !min-h-7 rounded-full flex items-center justify-center transition-all cursor-pointer active:scale-95 ${
                            discountPct > 0
                              ? 'bg-brand text-white border border-brand'
                              : 'bg-white text-muted border border-line hover:border-brand hover:text-brand'
                          }`}
                        >
                          <BadgePercent className="w-4 h-4" />
                        </Button>
                        {renderDiscountPopup({
                          categoryKey: item.key,
                          label: item.label,
                          price: item.price!,
                          warranty: item.warranty,
                          discountPercent: discountPct,
                        })}
                      </div>

                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side Cart — Selected Cart, always visible 2nd column (Ko Hein) */}
        <div className="hidden md:flex shrink-0 w-[280px] md:w-[320px] lg:w-[380px] xl:w-[420px] flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-2xs min-h-0">
          {/* Cart Header */}
          <div className="p-3.5 sm:p-4 border-b border-line flex items-center justify-between bg-surface/80 h-[56px] shrink-0">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-brand/10 text-brand-deep flex items-center justify-center shrink-0">
                <Receipt className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center space-x-1.5">
                  <h3 className="font-extrabold text-sm text-ink truncate">Selected Cart</h3>
                  <span className="text-xs font-extrabold bg-brand text-white px-2 py-0.5 rounded-full shrink-0 shadow-2xs">
                    {cartSummary.count} {cartSummary.count === 1 ? 'Service' : 'Services'}
                  </span>
                </div>
                <p className="text-xs font-bold text-muted uppercase truncate">{selectedDevice}</p>
              </div>
            </div>

            {cart.size > 0 && (
              <Button
                type="button"
                onClick={handleClearCart}
                className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 bg-danger/10 hover:bg-danger/20 text-danger text-xs font-extrabold rounded-lg border border-danger/20 transition-all cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
                Clear All
              </Button>
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
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 backdrop-blur-sm px-4 pt-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom))] shadow-raised-top lg:hidden">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 shrink-0">
              <p className="text-xs font-bold text-muted uppercase tracking-wide">Selected Services</p>
              <p className="font-mono font-black text-brand text-base leading-tight">
                {cartSummary.count} <span className="text-xs font-normal text-muted">items · {formatPrice(cartSummary.totalDue)}</span>
              </p>
              {cartSummary.totalDiscountAmount > 0 && (
                <p className="text-xs font-extrabold text-success leading-tight">
                  − {formatPrice(cartSummary.totalDiscountAmount)} saved
                </p>
              )}
            </div>
            <Button
              type="button"
              onClick={() => setIsCartSheetOpen(true)}
              className="flex-1 max-w-[180px] bg-brand hover:bg-brand/90 text-white"
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
          className="fixed inset-0 z-50 flex flex-col bg-white animate-i35-slide-up lg:hidden pt-[env(safe-area-inset-top)]"
          role="presentation"
        >
          <div
            className="flex flex-col min-h-0 flex-1 w-full"
            onClick={(e) => e.stopPropagation()}
          >

            {/* Sheet Header */}
            <div className="shrink-0 px-4 pb-3 pt-1.5 border-b border-line bg-white flex items-center justify-between gap-2">
              <div className="flex items-center space-x-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-brand/10 text-brand-deep flex items-center justify-center shrink-0">
                  <Receipt className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-extrabold text-sm text-ink truncate">Review Cart</h3>
                  <p className="text-xs font-bold text-muted truncate">{selectedDevice}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsCartSheetOpen(false)}
                  aria-label="Close cart"
                  className="text-muted hover:text-ink transition-colors cursor-pointer p-1.5 focus:outline-none"
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
        onSelectDevice={handleDeviceChange}
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

      {/* Bottom-center discount notification (Ko Hein) */}
      {discountNotice && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[90] px-4 py-2 rounded-full bg-ink text-white text-xs font-bold shadow-xl animate-i35-slide-up whitespace-nowrap">
          {discountNotice}
        </div>
      )}
    </div>
  );
};
