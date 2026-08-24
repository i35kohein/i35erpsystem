import React, { useEffect, useState, useMemo, useRef } from 'react';

import {Boxes, 
  Plus, 
  AlertTriangle, 
  Tag, 
  ShieldCheck, 
  ShieldAlert,
  Truck,
  FileText,
  Cpu, 
  MapPin, 
  Smartphone,
  Filter,
  Grid,
  DollarSign,
  TrendingUp,
  PackageCheck,
  PackageX,
  Check,
  Sparkles,
  Edit2,
  Eye,
  Trash2,
  X,
  Palette,
  ChevronDown,
  Printer} from 'lucide-react';
import { PartItem, PartOwner, PartQualityTier, Supplier, SystemSettings, RmaItem, PurchaseOrder } from '../../types';
import { ModelRepairPrice } from '../../types/priceCatalog';

import { CustomDropdownMenu } from '../common/CustomDropdownMenu';
import { confirmDialog } from '../common/ConfirmDialog';
import { DeviceModelChooserModal } from '../devices/DeviceModelChooserModal';
import { getAvailableColorsForModel, getRealisticColorStyle } from '../intake/deviceData';
import { Button, Input } from '../ui';
import { toast } from '../../lib/toast';
import { sortModelsNewestFirst, compareModelsNewestFirst } from '../../utils/modelSort';
import {
  isSameDeviceModel,
  SortArrow,
  DEFAULT_QUALITY_TIERS,
  sanitizeNonNegativeNumber,
  stockBarWidthPercent,
  generateRmaNumber,
  InlineDraft,
} from './inventoryUtils';
import { PartDetailsModal, MatrixPrintSheet, TagsPrintSheet } from './InventoryModals';

interface InventoryManagementModuleProps {
  parts: PartItem[];
  suppliers: Supplier[];
  systemSettings?: SystemSettings;
  deviceModels?: string[];
  priceCatalog?: ModelRepairPrice[];
  inventoryCategories?: string[];
  onAddPart: (part: PartItem) => void;
  onUpdatePart?: (part: PartItem) => void;
  onAddRma?: (rma: RmaItem) => void;
  onAddSupplier?: (supplier: Supplier) => void;
  onUpdateSupplier?: (supplier: Supplier) => void;
  onDeleteSupplier?: (supplierId: string) => void;
  onDeletePart?: (partId: string) => void;
  onUpdatePartStock: (partId: string, newStock: number) => void;
  /** Navigate to another tab (used by the purchase-order CTA). */
  onNavigateToTab?: (tab: string) => void;
  /** Existing POs — used for the duplicate-PO warning in the reorder draft (Ko Hein 2026-08-24). */
  purchaseOrders?: PurchaseOrder[];
  searchQuery: string;
  setSearchQuery?: (q: string) => void;
  selectedCategory?: string;
  setSelectedCategory?: (c: string) => void;
  selectedQuality?: string;
  setSelectedQuality?: (q: string) => void;
  selectedModelFilter?: string;
  setSelectedModelFilter?: (m: string) => void;
  /** Controlled low-stock filter (App filter drawer). Falls back to local state. */
  showLowStockOnly?: boolean;
  onSetLowStockOnly?: (v: boolean) => void;
  viewMode?: 'stock' | 'profit' | 'matrix';
  setViewMode?: (v: 'stock' | 'profit' | 'matrix') => void;
  inlineEditMode?: boolean;
  setInlineEditMode?: (v: boolean | ((prev: boolean) => boolean)) => void;
  stockView?: 'table' | 'cards';
  setStockView?: (v: 'table' | 'cards') => void;
  isTagsPrintOpen?: boolean;
  setIsTagsPrintOpen?: (v: boolean) => void;
  scanQuery?: string;
  setScanQuery?: (q: string) => void;
  /** iPad: the barcode input lives in the navbar — module registers its submit handler here. */
  onRegisterScanHandler?: (fn: () => void) => void;
  showAddModal?: boolean;
  setShowAddModal?: (s: boolean) => void;
}

export const InventoryManagementModule: React.FC<InventoryManagementModuleProps> = ({
  parts,
  suppliers,
  systemSettings,
  deviceModels,
  priceCatalog: _priceCatalog = [],
  inventoryCategories = [],
  onAddPart,
  onUpdatePart,
  onAddRma,
  onAddSupplier,
  onUpdateSupplier,
  // onDeleteSupplier removed (unused)
  onDeletePart,
  onUpdatePartStock,
  searchQuery,
  setSearchQuery: propSetSearchQuery,
  selectedCategory: propSelectedCategory,
  setSelectedCategory: propSetSelectedCategory,
  selectedQuality: propSelectedQuality,
  setSelectedQuality: propSetSelectedQuality,
  selectedModelFilter: propSelectedModelFilter,
  showLowStockOnly: propShowLowStockOnly,
  onSetLowStockOnly: propOnSetLowStockOnly,
  setSelectedModelFilter: propSetSelectedModelFilter,
  viewMode: propViewMode,
  setViewMode: propSetViewMode,
  inlineEditMode: propInlineEditMode,
  setInlineEditMode: propSetInlineEditMode,
  stockView: propStockView,
  setStockView: propSetStockView,
  isTagsPrintOpen: propIsTagsPrintOpen,
  setIsTagsPrintOpen: propSetIsTagsPrintOpen,
  scanQuery: propScanQuery,
  setScanQuery: propSetScanQuery,
  onRegisterScanHandler,
  onNavigateToTab,
  purchaseOrders = [],
  showAddModal: propShowAddModal,
  setShowAddModal: propSetShowAddModal,
}) => {
  const currency = systemSettings?.currencySymbol || 'MMK';
  const [localQuality, setLocalQuality] = useState<string>('ALL');
  const [localCategory, setLocalCategory] = useState<string>('ALL');
  const [localModelFilter, setLocalModelFilter] = useState<string>('ALL');
  // Controlled by App (filter drawer) when provided; falls back to local state.
  const selectedModelFilter = propSelectedModelFilter !== undefined ? propSelectedModelFilter : localModelFilter;
  const setSelectedModelFilter = propSetSelectedModelFilter || setLocalModelFilter;
  // Which filter opened the popup modal (model | category | tier) — popup instead of dropdown
  const [filterModal, setFilterModal] = useState<'model' | 'category' | 'tier' | null>(null);
  // ESC closes the filter modal
  useEffect(() => {
    if (!filterModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFilterModal(null);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [filterModal]);
  const [localSearchQuery, setLocalSearchQuery] = useState<string>('');
  const [localShowAddModal, setLocalShowAddModal] = useState(false);
  const [localViewMode, setLocalViewMode] = useState<'stock' | 'profit' | 'matrix'>('stock');
  // Controlled by App (iPad drawer) when provided; falls back to local state.
  const viewMode = propViewMode !== undefined ? propViewMode : localViewMode;
  const setViewMode = propSetViewMode || setLocalViewMode;
  const [isMatrixPrintOpen, setIsMatrixPrintOpen] = useState(false);
  const [localIsTagsPrintOpen, setIsTagsPrintOpenLocal] = useState(false);
  const isTagsPrintOpen = propIsTagsPrintOpen !== undefined ? propIsTagsPrintOpen : localIsTagsPrintOpen;
  const setIsTagsPrintOpen = propSetIsTagsPrintOpen || setIsTagsPrintOpenLocal;
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set());
  const [localInlineEditMode, setLocalInlineEditMode] = useState(false);
  const inlineEditMode = propInlineEditMode !== undefined ? propInlineEditMode : localInlineEditMode;
  const setInlineEditMode = propSetInlineEditMode || setLocalInlineEditMode;
  // Phones default to the card grid — the stock table is unusable below md.
  const stockView = propStockView !== undefined ? propStockView : ('table' as const);
  const [inlineDrafts, setInlineDrafts] = useState<Record<string, InlineDraft>>({});
  const [showInlineSaveConfirm, setShowInlineSaveConfirm] = useState(false);
  const [isInlineSaving, setIsInlineSaving] = useState(false);
  const [localLowStockOnly, setLocalLowStockOnly] = useState(false);
  const [ownerFilter, setOwnerFilter] = useState<'ALL' | PartOwner>('ALL');
  const [stockStatusFilter, setStockStatusFilter] = useState<'ALL' | 'LOW' | 'OUT'>('ALL');
  // Purchase-order draft (Ko Hein 2026-08-24): supplier-grouped reorder preview
  // before jumping to the Suppliers module. Scope defaults to OUT only — never
  // auto-selects the whole below-reorder set.
  const [poDraftOpen, setPoDraftOpen] = useState(false);
  const [poScope, setPoScope] = useState<'OUT' | 'LOW'>('OUT');
  const [poSelected, setPoSelected] = useState<Set<string>>(new Set());
  const [poQty, setPoQty] = useState<Record<string, number>>({});
  const suggestQty = (p: PartItem) => Math.max(1, (Number(p.reorderPoint) || 0) - (Number(p.quantityInStock) || 0));
  const openPoDraft = () => {
    const outIds = new Set(parts.filter((p) => Number(p.quantityInStock) === 0).map((p) => p.id));
    setPoScope('OUT');
    setPoSelected(outIds);
    setPoQty(Object.fromEntries(parts.map((p) => [p.id, suggestQty(p)])));
    setPoDraftOpen(true);
  };
  const poCandidates = useMemo(
    () => (poScope === 'OUT' ? parts.filter((p) => Number(p.quantityInStock) === 0) : parts.filter((p) => Number(p.quantityInStock) > 0 && Number(p.quantityInStock) <= Number(p.reorderPoint))),
    [parts, poScope]
  );
  const poSupplierGroups = useMemo(() => {
    const groups = new Map<string, PartItem[]>();
    poCandidates.forEach((p) => {
      const key = p.supplierName?.trim() || 'No supplier set';
      groups.set(key, [...(groups.get(key) || []), p]);
    });
    return Array.from(groups.entries());
  }, [poCandidates]);
  const poTotal = useMemo(
    () => poCandidates.reduce((sum, p) => sum + (poSelected.has(p.id) ? (poQty[p.id] || suggestQty(p)) * (Number(p.costPrice) || 0) : 0), 0),
    [poCandidates, poSelected, poQty]
  );
  // Duplicate-PO warning: same part already on a Draft/Sent PO.
  const poDuplicateSkus = useMemo(() => {
    const activeItems = purchaseOrders
      .filter((po) => po.status === 'Draft' || po.status === 'Sent')
      .flatMap((po) => po.items || []);
    const activePartIds = new Set(activeItems.map((i) => i.partId));
    return poCandidates.filter((p) => poSelected.has(p.id) && activePartIds.has(p.id)).map((p) => p.sku);
  }, [purchaseOrders, poCandidates, poSelected]);
  // Generation-first model filtering (Ko Hein 2026-08-24): quick chips like
  // 'iPhone 17' match any model whose name starts with that generation.
  const [modelGeneration, setModelGeneration] = useState<string>('ALL');
  const showLowStockOnly = propShowLowStockOnly !== undefined ? propShowLowStockOnly : localLowStockOnly;
  const setShowLowStockOnly = (v: boolean) => {
    if (propOnSetLowStockOnly) propOnSetLowStockOnly(v);
    else setLocalLowStockOnly(v);
  };
  const handleToggleLowStockOnly = () => setShowLowStockOnly(!showLowStockOnly);
  const [skuFilterOpen, setSkuFilterOpen] = useState(false);
  // Bulk "Set Reorder Point" uses a styled modal, not a native window.prompt (audit P2).
  const [bulkReorderOpen, setBulkReorderOpen] = useState(false);
  const [bulkReorderValue, setBulkReorderValue] = useState('');

  // Supplier & Quality Tier Edit States
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  // Tiers are managed centrally in System Management and synchronised with Supabase.
  const customQualityTiers = DEFAULT_QUALITY_TIERS;

  // Mini modals for quick-add inside Part Add/Edit forms
  const [showAddSupplierMiniModal, setShowAddSupplierMiniModal] = useState(false);

  // Form State for Adding Supplier
  const [newSupplierForm, setNewSupplierForm] = useState({
    name: '',
    code: '',
    phone: '',
    contactEmail: '',
    website: '',
    avgRmaTurnaroundDays: 3,
    rating: 5,
  });

  // Form State for Adding Quality Tier

  const handleCreateSupplier = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newSupplierForm.name.trim()) return;
    const createdSup: Supplier = {
      id: `sup-${Date.now()}`,
      name: newSupplierForm.name.trim(),
      code: newSupplierForm.code.trim().toUpperCase() || 'SUP',
      phone: newSupplierForm.phone.trim() || 'N/A',
      contactEmail: newSupplierForm.contactEmail.trim() || 'vendor@example.com',
      website: newSupplierForm.website.trim() || 'https://supplier.com',
      avgRmaTurnaroundDays: Number(newSupplierForm.avgRmaTurnaroundDays) || 3,
      rating: Number(newSupplierForm.rating) || 5,
    };

    // audit C-P3: block duplicate supplier codes — duplicates broke vendor reports.
    const normalizedCode = createdSup.code.toLowerCase();
    if (suppliers.some((s) => s.code.toLowerCase() === normalizedCode)) {
      toast.error(`A supplier with code "${createdSup.code}" already exists. Codes must be unique.`, 'Duplicate Supplier Code');
      return;
    }

    if (onAddSupplier) {
      onAddSupplier(createdSup);
    }
    toast.success(`Supplier vendor "${createdSup.name}" registered.`, 'Supplier Added');
    setNewSupplierForm({
      name: '',
      code: '',
      phone: '',
      contactEmail: '',
      website: '',
      avgRmaTurnaroundDays: 3,
      rating: 5,
    });
    setShowAddSupplierMiniModal(false);
  };

  const handleSaveEditSupplier = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editingSupplier || !editingSupplier.name.trim()) return;
    // audit C-P3: block duplicate supplier codes (case-insensitive) on edit too.
    const normalizedCode = editingSupplier.code.trim().toLowerCase();
    if (suppliers.some((s) => s.id !== editingSupplier.id && s.code.toLowerCase() === normalizedCode)) {
      toast.error(`A supplier with code "${editingSupplier.code}" already exists. Codes must be unique.`, 'Duplicate Supplier Code');
      return;
    }
    if (onUpdateSupplier) {
      onUpdateSupplier(editingSupplier);
    }
    setEditingSupplier(null);
  };

  

  

  const activeDeviceModels = useMemo(() => {
    return sortModelsNewestFirst([...new Set(deviceModels?.filter(Boolean) || [])]);
  }, [deviceModels]);

  // Inventory filters should only list models with an actual saved stock row.

  const inventoryDeviceModels = useMemo(() => {
    return sortModelsNewestFirst([...new Set(parts.flatMap((part) => part.deviceCompatibility || []).filter(Boolean))]);
  }, [parts]);
  // Edit Part Modal state
  const [editingPart, setEditingPart] = useState<PartItem | null>(null);
  const [selectedPartForDetails, setSelectedPartForDetails] = useState<PartItem | null>(null);
  const [localScanQuery, setScanQueryLocal] = useState('');
  const scanQuery = propScanQuery !== undefined ? propScanQuery : localScanQuery;
  const setScanQuery = propSetScanQuery || setScanQueryLocal;
  const scanInputRef = useRef<HTMLInputElement | null>(null);

  // Column sorting (stock table)
  const [sortKey, setSortKey] = useState<'name' | 'stock' | 'price' | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const toggleSort = (key: 'name' | 'stock' | 'price') => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  // Bulk selection (stock table)
  const [selectedPartIds, setSelectedPartIds] = useState<Set<string>>(new Set());
  const selectedParts = parts.filter((p) => selectedPartIds.has(p.id));
  const togglePartSelection = (id: string) => {
    setSelectedPartIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const toggleSelectAllVisible = () => {
    // Scope to the current page only — selecting across every filtered page
    // silently grabbed hundreds of off-screen parts (audit P2).
    const visibleIds = paginatedParts.map((p) => p.id);
    const allSelected = visibleIds.every((id) => selectedPartIds.has(id));
    setSelectedPartIds((prev) => {
      const next = new Set(prev);
      visibleIds.forEach((id) => (allSelected ? next.delete(id) : next.add(id)));
      return next;
    });
  };
  const clearSelection = () => setSelectedPartIds(new Set());
  const exportSelectedCsv = () => {
    const rows = [
      ['Part Name', 'SKU', 'Category', 'Quality', 'Stock', 'Reorder Point', `Cost (${currency})`, `Selling (${currency})`, 'Bin'],
      ...selectedParts.map((p) => [
        p.name, p.sku || '', p.category || '', p.qualityTier || '',
        String(p.quantityInStock), String(p.reorderPoint || 0),
        String(p.costPrice || 0), String(p.sellingPrice || 0), p.locationBin || '',
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory-selection-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${selectedParts.length} part(s) exported`, 'CSV Exported');
  };
  const bulkSetReorder = () => {
    setBulkReorderValue('');
    setBulkReorderOpen(true);
  };
  const confirmBulkSetReorder = () => {
    const value = Number(bulkReorderValue);
    if (Number.isNaN(value) || value < 0) {
      toast.error('Reorder point must be a non-negative number.', 'Bulk Update');
      return;
    }
    selectedParts.forEach((p) => {
      onUpdatePart?.({ ...p, reorderPoint: value });
    });
    toast.success(`Reorder point set to ${value} for ${selectedParts.length} part(s)`, 'Bulk Update');
    clearSelection();
    setBulkReorderOpen(false);
  };
  const bulkDelete = async () => {
    const ok = await confirmDialog({ title: 'Delete Parts', message: `Delete ${selectedParts.length} selected part(s)? This cannot be undone.`, confirmLabel: `Delete ${selectedParts.length} Parts`, danger: true });
    if (!ok) return;
    selectedParts.forEach((p) => onDeletePart?.(p.id));
    toast.success(`${selectedParts.length} part(s) deleted`, 'Bulk Delete');
    clearSelection();
  };

  // Barcode scanner = keyboard wedge: types SKU then Enter. Look up exact SKU
  // (case-insensitive) and open the part detail modal; beep/flash on miss.
  const handleScanSubmit = () => {
    const q = scanQuery.trim().toLowerCase();
    if (!q) return;
    const match = parts.find((p) => String(p.sku || '').trim().toLowerCase() === q)
      || parts.find((p) => String(p.id || '').toLowerCase() === q);
    if (match) {
      setSelectedPartForDetails(match);
      setSearchQuery(''); // don't keep the list filtered to the scanned SKU (audit P2)
      toast.success(`Scanned: ${match.name}`, 'Part Found');
    } else {
      toast.error(`No part with SKU "${scanQuery.trim()}"`, 'Scan Not Found');
    }
    setScanQuery('');
    // Keep focus so the next scan lands in the same box.
    requestAnimationFrame(() => scanInputRef.current?.focus());
  };

  // iPad: navbar owns the barcode input — keep the module's submit handler registered.
  useEffect(() => {
    onRegisterScanHandler?.(handleScanSubmit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onRegisterScanHandler]);
  const [isDeviceModelChooserOpen, setIsDeviceModelChooserOpen] = useState(false);
  const [isLocationBinMenuOpen, setIsLocationBinMenuOpen] = useState(false);
  const [isEditLocationBinMenuOpen, setIsEditLocationBinMenuOpen] = useState(false);
  const [isEditDeviceChooserOpen, setIsEditDeviceChooserOpen] = useState(false);
  // Fixed-position anchors for the bin menus — the modal body scroll container clips
  // absolutely-positioned dropdowns (Ko Hein 2026-08-10: "Storage Location Bin drawer menu cant see").
  const [binMenuAnchor, setBinMenuAnchor] = useState<{ top: number; left: number; width: number } | null>(null);
  const [editBinMenuAnchor, setEditBinMenuAnchor] = useState<{ top: number; left: number; width: number } | null>(null);
  // Bin menu placement: always open UPWARD (Ko Hein 2026-08-10: "drop အောက်မကျပဲ အပေါ်တက်အောင်လုပ်ပေး").
  const computeBinAnchor = (el: HTMLElement): { top: number; left: number; width: number } => {
    const r = el.getBoundingClientRect();
    const estH = Math.min(existingLocationBins.length || 1, 5) * 30 + 14;
    return {
      top: Math.max(8, r.top - estH - 4),
      left: r.left,
      width: r.width,
    };
  };

  // Warranty Claim Modal state
  const [claimingWarrantyPart, setClaimingWarrantyPart] = useState<PartItem | null>(null);
  // Preset warranty reasons — the modal's <select> shows the matching preset
  // when the free-text input holds one, else a placeholder (audit P2).
  const PRESET_WARRANTY_REASONS = [
    'Screen touch unresponsive / ghost touching',
    'Display flickering / dead pixels / lines',
    'Battery swelling / rapid discharge / non-charging',
    'FPC connector damaged / loose fit',
    'DOA (Dead On Arrival) / No power',
    'Wrong part delivered / mislabeled',
  ];

  const [warrantyForm, setWarrantyForm] = useState<{
    supplierId: string;
    supplierName: string;
    quantity: number;
    reason: string;
    trackingNumber: string;
    unitCost: number;
  }>({
    supplierId: '',
    supplierName: '',
    quantity: 1,
    reason: 'Screen touch unresponsive / defect after installation',
    trackingNumber: '',
    unitCost: 0,
  });

  // audit C-P2: pre-fill the claim's supplier from the part's existing supplier
  // when the modal opens — otherwise submitting without touching the supplier
  // select silently wiped the part's supplierId/supplierName ("Supplier Vendor").
  useEffect(() => {
    if (!claimingWarrantyPart) return;
    const existingSup = suppliers.find((s) => s.id === claimingWarrantyPart.supplierId);
    setWarrantyForm((form) => ({
      ...form,
      supplierId: claimingWarrantyPart.supplierId || form.supplierId,
      supplierName: existingSup?.name || claimingWarrantyPart.supplierName || form.supplierName,
      quantity: 1,
    }));
  }, [claimingWarrantyPart, suppliers]);

  

  const handleSubmitWarrantyClaim = () => {
    if (!claimingWarrantyPart) return;
    const selectedSup = suppliers.find((s) => s.id === warrantyForm.supplierId);
    const resolvedSupName = selectedSup?.name || warrantyForm.supplierName || claimingWarrantyPart.supplierName || 'Supplier Vendor';

    // audit C-P2: cap the claim at on-hand stock — an oversized claim would
    // otherwise inflate stock when "Replacement Received" adds it back later.
    const claimQty = Math.max(1, Math.floor(Number(warrantyForm.quantity) || 1));
    if (claimQty > (claimingWarrantyPart.quantityInStock || 0)) {
      toast.error(`Claim quantity (${claimQty}) exceeds stock on hand (${claimingWarrantyPart.quantityInStock || 0}) for ${claimingWarrantyPart.name}.`, 'Invalid Claim Quantity');
      return;
    }

    const rmaRecord: RmaItem = {
      id: `rma-${Date.now()}`,
      rmaNumber: generateRmaNumber(),
      partId: claimingWarrantyPart.id,
      partName: claimingWarrantyPart.name,
      partQuality: claimingWarrantyPart.qualityTier,
      supplierId: warrantyForm.supplierId || selectedSup?.id || claimingWarrantyPart.supplierId || 'sup-1',
      supplierName: resolvedSupName,
      quantity: claimQty,
      unitCost: Number.isFinite(Number(warrantyForm.unitCost)) ? Math.max(0, Number(warrantyForm.unitCost)) : (claimingWarrantyPart.costPrice || 0),
      reason: warrantyForm.reason || 'Parts Warranty Claim',
      status: 'Shipped to Vendor',
      trackingNumber: warrantyForm.trackingNumber || '',
      createdAt: new Date().toISOString(),
    };

    if (onAddRma) {
      onAddRma(rmaRecord);
    }

    // audit C-P2: 1) never wipe the part's supplier — only adopt a new one when
    // the user explicitly picked a different supplier; 2) defective units leave
    // the shelf at claim time (balanced by the "Replacement Received" increment).
    if (onUpdatePart) {
      const supplierChanged = Boolean(warrantyForm.supplierId && warrantyForm.supplierId !== claimingWarrantyPart.supplierId);
      onUpdatePart({
        ...claimingWarrantyPart,
        supplierId: supplierChanged ? warrantyForm.supplierId : claimingWarrantyPart.supplierId,
        supplierName: supplierChanged ? resolvedSupName : claimingWarrantyPart.supplierName,
        quantityInStock: Math.max(0, (claimingWarrantyPart.quantityInStock || 0) - claimQty),
      });
    }

    toast.success(`Warranty claim submitted to ${resolvedSupName}. RMA # ${rmaRecord.rmaNumber}`, 'RMA Submitted');
    setClaimingWarrantyPart(null);
  };

  const activeSearchQuery = propSetSearchQuery ? searchQuery : localSearchQuery;
  const setSearchQuery = propSetSearchQuery || setLocalSearchQuery;


  const selectedQuality = propSelectedQuality !== undefined ? propSelectedQuality : localQuality;
  const setSelectedQuality = propSetSelectedQuality || setLocalQuality;

  const selectedCategory = propSelectedCategory !== undefined ? propSelectedCategory : localCategory;
  const setSelectedCategory = propSetSelectedCategory || setLocalCategory;

  const showAddModal = propShowAddModal !== undefined ? propShowAddModal : localShowAddModal;
  const setShowAddModal = propSetShowAddModal || setLocalShowAddModal;

  // New Part Form State
  const [newPartData, setNewPartData] = useState<Partial<PartItem>>({
    sku: '',
    name: '',
    applePartNumber: '',
    category: '',
    deviceCompatibility: [],
    qualityTier: undefined,
    quantityInStock: 0,
    reservedQuantity: 0,
    reorderPoint: 4,
    costPrice: 0,
    sellingPrice: 0,
    supplierId: '',
    supplierName: '',
    locationBin: '',
    isSerialized: false,
    owner: 'APP' as const,
  });

  const categories = useMemo(() => {
    return [...new Set(inventoryCategories.filter(Boolean))];
  }, [inventoryCategories]);

  // Owner-filtered parts — drives chips across ALL views (Ko Hein 2026-08-24: KZH removed).
  const ownerParts = useMemo(
    () => (ownerFilter === 'ALL' ? parts : parts.filter((p) => (p.owner || 'APP') === ownerFilter)),
    [parts, ownerFilter]
  );

  // Profit breakdown by category (current stock valuation: cost × stock vs retail × stock)
  const profitByCategory = useMemo(() => {
    const map = new Map<string, { skus: number; cost: number; retail: number }>();
    ownerParts.forEach((p) => {
      const cat = p.category || 'Uncategorized';
      const e = map.get(cat) || { skus: 0, cost: 0, retail: 0 };
      e.skus += 1;
      e.cost += Number(p.costPrice || 0) * Number(p.quantityInStock || 0);
      e.retail += Number(p.sellingPrice || 0) * Number(p.quantityInStock || 0);
      map.set(cat, e);
    });
    return [...map.entries()]
      .map(([category, e]) => ({
        category,
        skus: e.skus,
        cost: e.cost,
        retail: e.retail,
        profit: e.retail - e.cost,
        margin: e.retail ? Math.round(((e.retail - e.cost) / e.retail) * 100) : 0,
      }))
      .sort((a, b) => b.profit - a.profit);
  }, [ownerParts]);

  // Memoized filter-option lists (badge counts are expensive — computed once per data change, not per tap/render)
  const modelFilterOptions = useMemo(
    () => [
      { value: 'ALL', label: 'All Models', badge: inventoryDeviceModels.length },
      ...inventoryDeviceModels.map((model) => ({
        value: model,
        label: model,
        badge: parts.filter((part) =>
          part.deviceCompatibility.some((device) => isSameDeviceModel(device, model)),
        ).length,
      })),
    ],
    [parts, inventoryDeviceModels],
  );
  // Generation-first model chips (Ko Hein 2026-08-24): 'iPhone 17' matches any
  // model whose name starts with that generation.
  const modelGenerations = useMemo(() => {
    const gens = new Set<string>();
    modelFilterOptions.forEach((o) => {
      if (o.value === 'ALL') return;
      const m = o.label.match(/^(iPhone\s+\d+)/i);
      if (m) gens.add(m[1]);
    });
    return [
      'ALL',
      ...Array.from(gens).sort((a, b) => {
        const na = parseInt(a.replace(/\D/g, ''), 10);
        const nb = parseInt(b.replace(/\D/g, ''), 10);
        return (isNaN(nb) ? -1 : nb) - (isNaN(na) ? -1 : na);
      }),
    ];
  }, [modelFilterOptions]);
  const categoryFilterOptions = useMemo(
    () => [
      { value: 'ALL', label: 'All Categories', badge: categories.length },
      ...categories.map((category) => ({
        value: category,
        label: category,
        badge: parts.filter((part) => part.category === category).length,
      })),
    ],
    [parts, categories],
  );
  const tierFilterOptions = useMemo(
    () => [{ value: 'ALL', label: 'All Tiers' }, ...customQualityTiers.map((tier) => ({ value: tier, label: tier }))],
    [customQualityTiers],
  );

  const generatePartName = (part: Partial<PartItem>) => {
    const devices = (part.deviceCompatibility || []).map((d) => d?.trim()).filter(Boolean);
    const category = part.category?.trim();
    const quality = part.qualityTier?.trim();
    const isBackGlass = Boolean(category && /back\s*glass/i.test(category));
    const color = isBackGlass ? part.backGlassColor?.trim() : '';
    if (!category || !quality) return '';

    // Single device: "iPhone 14 - Battery - Original"
    if (devices.length === 1) {
      return [devices[0], category, color, quality].filter(Boolean).join(' - ');
    }
    // Multi-device: "Battery - Original" (no device prefix — shown as chips)
    if (devices.length > 1) {
      return [category, color, quality].filter(Boolean).join(' - ');
    }
    return '';
  };

  const generatePartSku = (part: Partial<PartItem>) => {
    const devices = (part.deviceCompatibility || []).map((d) => d?.trim()).filter(Boolean);
    const category = part.category?.trim();
    const quality = part.qualityTier?.trim();
    const isBackGlass = Boolean(category && /back\s*glass/i.test(category));
    const color = isBackGlass ? part.backGlassColor?.trim() : '';
    if (!category || !quality || (isBackGlass && !color)) return '';

    const toSkuCode = (value: string) => value
      .replace(/iPhone/gi, 'IP')
      .replace(/Apple Watch/gi, 'AW')
      .replace(/MacBook/gi, 'MB')
      .replace(/iPad/gi, 'IPAD')
      .replace(/[^a-z0-9]+/gi, '')
      .toUpperCase();

    // Single device: "IP14-BATTERY-ORIGINAL"
    if (devices.length === 1) {
      return [devices[0], category, color, quality].filter(Boolean).map(toSkuCode).join('-');
    }
    // Multi-device: "MULTI-BATTERY-ORIGINAL"
    if (devices.length > 1) {
      return ['MULTI', category, color, quality].filter(Boolean).map(toSkuCode).join('-');
    }
    return '';
  };

  const applyPartSpecification = (changes: Partial<PartItem>) => {
    setNewPartData((current) => {
      const next = { ...current, ...changes };
      if (changes.category !== undefined && !/back\s*glass/i.test(changes.category)) {
        next.backGlassColor = undefined;
      }
      // Clear backGlassColor when switching devices or going multi-device
      if (changes.deviceCompatibility !== undefined) {
        const deviceCount = next.deviceCompatibility?.length || 0;
        if (deviceCount !== 1 || /back\s*glass/i.test(next.category || '')) {
          next.backGlassColor = undefined;
        }
      }
      return {
        ...next,
        name: generatePartName(next) || current.name || '',
        sku: generatePartSku(next) || current.sku || '',
      };
    });
  };

  const isBackGlassCategory = /back\s*glass/i.test(newPartData.category || '');
  const isMultiDevice = (newPartData.deviceCompatibility?.length || 0) > 1;
  const selectedPartModel = newPartData.deviceCompatibility?.[0] || '';
  // Back glass colors are model-specific — only show for single-device parts
  const availableBackGlassColors = (selectedPartModel && !isMultiDevice) ? getAvailableColorsForModel(selectedPartModel) : [];
  const existingLocationBins = useMemo(
    () => [...new Set([
      ...(systemSettings?.inventoryBinNames || []),
      ...parts.map((part) => part.locationBin?.trim()).filter((bin): bin is string => Boolean(bin)),
    ])].sort((a, b) => a.localeCompare(b)),
    [parts, systemSettings?.inventoryBinNames]
  );
  const matrixModels = useMemo(
    () => {
      const unique = new Map<string, string>();
      [...activeDeviceModels, ...parts.flatMap((part) => part.deviceCompatibility.filter(Boolean))]
        .forEach((model) => unique.set(model.trim().toLowerCase(), model.trim()));
      return sortModelsNewestFirst([...unique.values()]);
    },
    [activeDeviceModels, parts]
  );
  const matrixCategories = useMemo(
    () => [...new Set(parts.map((part) => part.category).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [parts]
  );

  // Column totals: sum stock per category directly from part records (not the
  // matrix cells) so vertically-shared parts (12 & 12 Pro) are NOT double counted.
  const matrixCategoryTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    matrixCategories.forEach((category) => {
      totals[category] = ownerParts
        .filter((p) => p.category === category)
        .reduce((sum, p) => sum + Number(p.quantityInStock || 0), 0);
    });
    return totals;
  }, [matrixCategories, ownerParts]);

  const matrixGrandTotal = useMemo(
    () => Object.values(matrixCategoryTotals).reduce((a, b) => a + b, 0),
    [matrixCategoryTotals]
  );

  // Merge vertically-shared cells (e.g. iPhone 12 & 12 Pro share the same
  // Battery / Display parts) so the matrix shows ONE number spanning both rows.
  const matrixMergeGroups = useMemo(() => {
    const result: Record<string, Record<string, { rowSpan: number; isFirst: boolean; models: string[] }>> = {};
    matrixCategories.forEach((category) => {
      const perModel: Record<string, string> = {};
      matrixModels.forEach((model) => {
        const ids = parts
          .filter((p) => p.category === category && p.deviceCompatibility.some((d) => d.toLowerCase() === model.toLowerCase()))
          .map((p) => p.id)
          .sort()
          .join(',');
        perModel[model] = ids;
      });
      const info: Record<string, { rowSpan: number; isFirst: boolean; models: string[] }> = {};
      let i = 0;
      while (i < matrixModels.length) {
        const model = matrixModels[i];
        const ids = perModel[model];
        let j = i + 1;
        while (j < matrixModels.length && perModel[matrixModels[j]] === ids && ids !== '') j++;
        const span = j - i;
        if (span > 1) {
          const models = matrixModels.slice(i, j);
          models.forEach((m, idx) => {
            info[m] = { rowSpan: span, isFirst: idx === 0, models };
          });
        }
        i = j;
      }
      result[category] = info;
    });
    return result;
  }, [matrixModels, matrixCategories, parts]);

  // Inventory category options are owned by System Management / Price List.
  // Old part records must not add obsolete values back into this selector.
  useEffect(() => {
    setNewPartData((current) => {
      const category = current.category && categories.includes(current.category) ? current.category : '';
      // Filter out devices no longer in the catalog (keeps valid multi-device selections)
      const deviceCompatibility = (current.deviceCompatibility || []).filter(
        (device) => activeDeviceModels.includes(device)
      );
      return { ...current, category, deviceCompatibility };
    });
  }, [activeDeviceModels, categories]);

  const resetNewPartData = () => {
    const freshPart: Partial<PartItem> = {
      sku: '',
      name: '',
      applePartNumber: '',
      category: '',
      deviceCompatibility: [],
      qualityTier: undefined,
      quantityInStock: 0,
      reservedQuantity: 0,
      reorderPoint: 3,
      costPrice: 0,
      sellingPrice: 0,
      supplierId: '',
      supplierName: '',
      locationBin: '',
      isSerialized: false,
    };
    setNewPartData({ ...freshPart, name: generatePartName(freshPart) });
  };

  useEffect(() => {
    if (showAddModal) resetNewPartData();
  }, [showAddModal]);

  // Scroll-shadow affordance (mobile UX): wide Stock/Matrix tables scroll
  // horizontally inside .workspace-panel__scroll; fade the right edge while
  // more content is hidden to the right, and remove the fade at the end.
  useEffect(() => {
    const containers = Array.from(document.querySelectorAll<HTMLElement>('.workspace-panel__scroll'));
    const update = (el: HTMLElement) => {
      const scrollable = el.scrollWidth - el.clientWidth > 4;
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
      el.classList.toggle('scroll-shadow-right', scrollable && !atEnd);
    };
    const onScroll = (e: Event) => update(e.currentTarget as HTMLElement);
    containers.forEach((el) => {
      update(el);
      el.addEventListener('scroll', onScroll, { passive: true });
    });
    const ro = new ResizeObserver(() => containers.forEach(update));
    containers.forEach((el) => ro.observe(el));
    return () => {
      containers.forEach((el) => el.removeEventListener('scroll', onScroll));
      ro.disconnect();
    };
  }, [viewMode]);

  // Force the stock card grid below md (phones); user toggle wins on desktop.
  useEffect(() => {
    // audit C-P3: this listener previously had an empty apply body — a no-op —
    // so rotating/resizing never switched table ↔ cards. Now driven by matchMedia
    // (cards below sm, table from sm up), mirroring the rest of the app's
    // responsive stock view.
    const mql = window.matchMedia('(max-width: 639px)');
    const apply = () => propSetStockView?.(mql.matches ? 'cards' : 'table');
    apply();
    mql.addEventListener('change', apply);
    window.addEventListener('resize', apply);
    return () => {
      mql.removeEventListener('change', apply);
      window.removeEventListener('resize', apply);
    };
  }, [propSetStockView]);

  // Analytics Metrics
  const metrics = useMemo(() => {
    const totalCount = ownerParts.length;
    let totalCostValuation = 0;
    let totalRetailValuation = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    const qualityCounts = {
      'Original': 0,
      'OEM': 0,
      'Genuine': 0,
    };

    const ownerCounts: Record<string, number> = { APP: 0 };
    const ownerValuation: Record<string, { cost: number; retail: number }> = {
      APP: { cost: 0, retail: 0 },
    };

    ownerParts.forEach((p) => {
      const owner = p.owner || 'APP';
      ownerCounts[owner] = (ownerCounts[owner] || 0) + 1;
      // audit C-P2: legacy/typo owners (e.g. "WHOLESALE") crashed the whole
      // metrics block — same ??= guard style as ownerCounts.
      ownerValuation[owner] ??= { cost: 0, retail: 0 };
      ownerValuation[owner].cost += Number(p.costPrice || 0) * Number(p.quantityInStock || 0);
      ownerValuation[owner].retail += (p.sellingPrice || 0) * Number(p.quantityInStock || 0);
      totalCostValuation += Number(p.costPrice || 0) * Number(p.quantityInStock || 0);
      totalRetailValuation += p.sellingPrice * p.quantityInStock;
      if (p.quantityInStock <= p.reorderPoint) {
        lowStockCount++;
      }
      if (p.quantityInStock === 0) {
        outOfStockCount++;
      }
      if (p.qualityTier in qualityCounts) {
        qualityCounts[p.qualityTier as keyof typeof qualityCounts]++;
      }
    });

    const totalPotentialProfit = totalRetailValuation - totalCostValuation;

    return {
      totalCount,
      totalCostValuation,
      totalRetailValuation,
      totalPotentialProfit,
      lowStockCount,
      outOfStockCount,
      qualityCounts,
      ownerCounts,
      ownerValuation,
    };
  }, [ownerParts]);


  // Filter Parts
  const filteredParts = useMemo(() => {
    return parts.filter((part) => {
      const matchesQuality = selectedQuality === 'ALL' || part.qualityTier === selectedQuality;
      const matchesCategory = selectedCategory === 'ALL' || part.category === selectedCategory;
      const matchesModel =
        selectedModelFilter === 'ALL' ||
        part.deviceCompatibility.some(
          (device) => isSameDeviceModel(device, selectedModelFilter)
        );
      // Generation-first filter (Ko Hein 2026-08-24): 'iPhone 17' chip matches
      // any model name starting with that generation.
      const matchesGeneration =
        modelGeneration === 'ALL' ||
        part.deviceCompatibility.some((device) =>
          device.toLowerCase().startsWith(modelGeneration.toLowerCase())
        );
      const matchesLowStock = !showLowStockOnly || part.quantityInStock <= part.reorderPoint;
      const matchesStockStatus =
        stockStatusFilter === 'ALL' ? true :
        stockStatusFilter === 'OUT' ? part.quantityInStock === 0 :
        part.quantityInStock > 0 && part.quantityInStock <= part.reorderPoint;
      const matchesOwner = ownerFilter === 'ALL' || (part.owner || 'APP') === ownerFilter;
      
      const query = activeSearchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        part.name.toLowerCase().includes(query) ||
        part.sku.toLowerCase().includes(query) ||
        (part.applePartNumber && part.applePartNumber.toLowerCase().includes(query)) ||
        part.locationBin.toLowerCase().includes(query) ||
        part.deviceCompatibility.some((d) => d.toLowerCase().includes(query));

      return matchesQuality && matchesCategory && matchesModel && matchesGeneration && matchesLowStock && matchesStockStatus && matchesSearch && matchesOwner;
    }).sort((a, b) => {
      if (sortKey === 'stock') {
        const diff = a.quantityInStock - b.quantityInStock;
        return sortDir === 'asc' ? diff : -diff;
      }
      if (sortKey === 'price') {
        const diff = a.sellingPrice - b.sellingPrice;
        return sortDir === 'asc' ? diff : -diff;
      }
      if (sortKey === 'name') {
        const byName = (a.name || '').localeCompare(b.name || '', undefined, { numeric: true, sensitivity: 'base' });
        return sortDir === 'asc' ? byName : -byName;
      }
      // Default: group by device model (newest iPhone first), then category, then name.
      const modelOf = (p: PartItem) => (p.deviceCompatibility && p.deviceCompatibility[0]) || '';
      const byModel = compareModelsNewestFirst(modelOf(a), modelOf(b));
      if (byModel !== 0) return byModel;
      const byCategory = (a.category || '').localeCompare(b.category || '');
      if (byCategory !== 0) return byCategory;
      return (a.name || '').localeCompare(b.name || '', undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [parts, selectedQuality, selectedCategory, selectedModelFilter, modelGeneration, showLowStockOnly, stockStatusFilter, activeSearchQuery, sortKey, sortDir, ownerFilter]);

  const paginatedParts = filteredParts;

  const handleSaveNewPart = () => {
    const needsColor = isBackGlassCategory && !isMultiDevice;
    if (!newPartData.name || !newPartData.sku || !newPartData.category || !newPartData.qualityTier || !newPartData.supplierId || !newPartData.deviceCompatibility?.[0] || (needsColor && !newPartData.backGlassColor)) {
      toast.error('Add at least one device model, category, quality tier, and supplier. Single-device Back Glass parts also need a color. Then enter the part name and SKU.', 'Incomplete Part Details');
      return;
    }

    // audit C-P3: block duplicate SKUs — barcode scan silently returned the
    // first match when two parts shared a SKU.
    const normalizedSku = (newPartData.sku || '').trim().toLowerCase();
    if (parts.some((p) => p.sku.toLowerCase() === normalizedSku)) {
      toast.error(`A part with SKU "${newPartData.sku}" already exists. SKUs must be unique.`, 'Duplicate SKU');
      return;
    }

    const part: PartItem = {
      id: `part-${Date.now()}`,
      sku: newPartData.sku || `SKU-${Date.now()}`,
      name: newPartData.name,
      applePartNumber: newPartData.applePartNumber || '',
      category: newPartData.category || '',
      deviceCompatibility: newPartData.deviceCompatibility || [],
      backGlassColor: newPartData.backGlassColor || undefined,
      qualityTier: (newPartData.qualityTier as PartQualityTier) || 'OEM',
      // audit C-P2: sanitize instead of `Number(x) || 0` (which allowed -5 and
      // turned NaN into 0 silently).
      quantityInStock: sanitizeNonNegativeNumber(newPartData.quantityInStock, 0),
      reservedQuantity: 0,
      reorderPoint: sanitizeNonNegativeNumber(newPartData.reorderPoint, 3),
      costPrice: sanitizeNonNegativeNumber(newPartData.costPrice, 0),
      sellingPrice: sanitizeNonNegativeNumber(newPartData.sellingPrice, 0),
      supplierId: newPartData.supplierId,
      supplierName: newPartData.supplierName || '',
      locationBin: newPartData.locationBin || '',
      isSerialized: newPartData.isSerialized || false,
      owner: (newPartData.owner as PartOwner) || 'APP',
    };

    onAddPart(part);
    resetNewPartData();
    setShowAddModal(false);
  };

  const handleSaveEditPart = () => {
    if (!editingPart) return;
    // audit C-P2: the edit modal stores raw Number(e.target.value) into state —
    // NaN/negative values must not persist. Clamp on save.
    const sanitized: PartItem = {
      ...editingPart,
      quantityInStock: sanitizeNonNegativeNumber(editingPart.quantityInStock, 0),
      reorderPoint: sanitizeNonNegativeNumber(editingPart.reorderPoint, 0),
      costPrice: sanitizeNonNegativeNumber(editingPart.costPrice, 0),
      sellingPrice: sanitizeNonNegativeNumber(editingPart.sellingPrice, 0),
    };
    if (onUpdatePart) {
      onUpdatePart(sanitized);
    } else {
      onUpdatePartStock(sanitized.id, sanitized.quantityInStock);
    }
    setEditingPart(null);
  };

  const beginInlineEdit = (part: PartItem) => {
    setInlineDrafts((current) => current[part.id] ? current : {
      ...current,
      [part.id]: {
        quantityInStock: String(part.quantityInStock),
        reorderPoint: String(part.reorderPoint),
        costPrice: String(part.costPrice),
        sellingPrice: String(part.sellingPrice),
        locationBin: part.locationBin || '',
        supplierId: part.supplierId || '',
      },
    });
  };

  

  const inlineSaveReview = useMemo(() => {
    return Object.entries(inlineDrafts)
      .map(([partId, draft]) => {
        const part = parts.find((item) => item.id === partId);
        if (!part) return null;
        const changes: Array<{ label: string; value: string }> = [];

        if (draft.quantityInStock?.trim() && Number(draft.quantityInStock) !== part.quantityInStock) {
          changes.push({ label: 'Stock', value: `${part.quantityInStock} → ${Number(draft.quantityInStock)}` });
        }
        if (draft.reorderPoint?.trim() && Number(draft.reorderPoint) !== part.reorderPoint) {
          changes.push({ label: 'Reorder point', value: `${part.reorderPoint} → ${Number(draft.reorderPoint)}` });
        }
        if (draft.costPrice?.trim() && Number(draft.costPrice) !== part.costPrice) {
          changes.push({ label: 'Purchase price', value: `${part.costPrice.toLocaleString()} → ${Number(draft.costPrice).toLocaleString()}` });
        }
        if (draft.sellingPrice?.trim() && Number(draft.sellingPrice) !== part.sellingPrice) {
          changes.push({ label: 'Selling price', value: `${part.sellingPrice.toLocaleString()} → ${Number(draft.sellingPrice).toLocaleString()}` });
        }
        if (draft.supplierId !== undefined && draft.supplierId !== part.supplierId) {
          const selectedSup = suppliers.find((supplier) => supplier.id === draft.supplierId);
          changes.push({ label: 'Supplier', value: `${part.supplierName || '—'} → ${selectedSup?.name || '—'}` });
        }
        if (draft.locationBin !== undefined && draft.locationBin !== part.locationBin) {
          changes.push({ label: 'Bin', value: `${part.locationBin || '—'} → ${draft.locationBin || '—'}` });
        }

        if (!changes.length) return null;

        return {
          part,
          changes,
        };
      })
      .filter(Boolean) as Array<{
        part: PartItem;
        changes: Array<{ label: string; value: string }>;
      }>;
  }, [inlineDrafts, parts, suppliers]);

  const confirmInlineSave = () => {
    if (!inlineSaveReview.length || !onUpdatePart || isInlineSaving) {
      if (!isInlineSaving) setShowInlineSaveConfirm(false);
      return;
    }

    // audit C-P2: reject non-numeric / negative numeric edits up-front instead
    // of saving NaN (→ null in Supabase → reloads as 0) or negative stock.
    for (const { part } of inlineSaveReview) {
      const draft = inlineDrafts[part.id];
      if (!draft) continue;
      const numericFields: Array<[string | undefined, string]> = [
        [draft.quantityInStock, 'Stock'],
        [draft.reorderPoint, 'Reorder point'],
        [draft.costPrice, 'Purchase price'],
        [draft.sellingPrice, 'Selling price'],
      ];
      for (const [raw, label] of numericFields) {
        if (raw === undefined || raw.trim() === '') continue;
        const n = Number(raw);
        if (!Number.isFinite(n) || n < 0) {
          toast.error(`${label} for "${part.name}" must be a non-negative number.`, 'Invalid Inline Edit');
          return;
        }
      }
    }

    setIsInlineSaving(true);
    try {
      inlineSaveReview.forEach(({ part }) => {
        const draft = inlineDrafts[part.id];
        if (!draft) return;
        const parsedQuantity = draft.quantityInStock?.trim() ? sanitizeNonNegativeNumber(draft.quantityInStock, part.quantityInStock) : part.quantityInStock;
        const parsedReorder = draft.reorderPoint?.trim() ? sanitizeNonNegativeNumber(draft.reorderPoint, part.reorderPoint) : part.reorderPoint;
        const parsedCost = draft.costPrice?.trim() ? sanitizeNonNegativeNumber(draft.costPrice, part.costPrice) : part.costPrice;
        const parsedSelling = draft.sellingPrice?.trim() ? sanitizeNonNegativeNumber(draft.sellingPrice, part.sellingPrice) : part.sellingPrice;
        const selectedSup = suppliers.find((supplier) => supplier.id === draft.supplierId);
        onUpdatePart({
          ...part,
          ...draft,
          quantityInStock: parsedQuantity,
          reorderPoint: parsedReorder,
          costPrice: parsedCost,
          sellingPrice: parsedSelling,
          supplierId: draft.supplierId || part.supplierId,
          supplierName: selectedSup?.name || part.supplierName,
        });
      });

    setInlineDrafts({});
    setInlineEditMode(false);
    setShowInlineSaveConfirm(false);
    } finally {
      window.setTimeout(() => setIsInlineSaving(false), 800);
    }
  };

  return (
    <div className="space-y-3 flex min-h-0 flex-1 flex-col">
      {/* Module Toolbar — iPad: title hidden (topbar covers it) + filters in drawer.
          Desktop: original layout (title + inline filter dropdowns).
      {/* Inline-edit save bar — appears only while editing rows */}
      {inlineEditMode && (
        <div className="bg-white p-2.5 rounded-xl border border-line shadow-xs flex items-center justify-between gap-2">
          <span className="text-xs font-extrabold text-ink truncate">
            Editing {Object.keys(inlineDrafts).length} row{Object.keys(inlineDrafts).length === 1 ? '' : 's'}…
          </span>
          {/* Save edits */}
          {inlineEditMode && (
          <Button
          type="button"
          onClick={() => {
          if (!inlineSaveReview.length) {
          setInlineEditMode(false);
          setInlineDrafts({});
          toast.info('No changes to save', 'Nothing Changed');
          return;
          }
          setShowInlineSaveConfirm(true);
          }}
          disabled={!inlineSaveReview.length}
          className="flex-1 sm:flex-none inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-brand bg-brand px-4 text-xs font-extrabold text-white shadow-xs transition-all hover:bg-brand-deep active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          title="Save all inline edits"
          >
          <Check className="h-4 w-4" />
          <span>Save {inlineSaveReview.length} Edits</span>
          </Button>
          )}
        </div>
      )}

      {/* Financial summary belongs to the Profit view, leaving Stock and Matrix full-height. */}
      {viewMode === 'profit' && (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
        {/* Total Stock Items Card */}
        <div className="relative bg-white p-3 sm:p-4 rounded-2xl border border-line shadow-2xs space-y-1.5 sm:space-y-2">
          <div className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-brand/10 text-brand flex items-center justify-center">
            <PackageCheck className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="pr-14">
            <span className="text-xs font-bold uppercase tracking-wider text-muted">Total Active SKUs</span>
            <div className="flex items-baseline justify-between mt-1 sm:mt-2">
              <span className="text-xl sm:text-2xl font-black text-ink font-mono">{metrics.totalCount}</span>
              <span className="text-xs font-bold text-brand-deep bg-brand/10 px-2 py-0.5 rounded-full">
                {categories.length} Categories
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="rounded bg-brand/10 px-2 py-1 text-[11px] font-black text-brand">APP {metrics.ownerCounts.APP || 0}</span>
            </div>
          </div>
        </div>

        {/* Total Inventory Stock Valuation */}
        <div className="relative bg-white p-3 sm:p-4 rounded-2xl border border-line shadow-2xs space-y-1.5 sm:space-y-2">
          <div className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-success/10 text-success flex items-center justify-center">
            <DollarSign className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="pr-14">
            <span className="text-xs font-bold uppercase tracking-wider text-muted">Inventory Valuation</span>
            <div className="space-y-0.5 mt-1 sm:mt-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted font-medium">Cost Asset:</span>
                <span className="font-mono font-bold text-ink">
                  {metrics.totalCostValuation.toLocaleString()} {currency}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-success-deep font-bold">Retail Yield:</span>
                <span className="font-mono font-black text-success">
                  {metrics.totalRetailValuation.toLocaleString()} {currency}
                </span>
              </div>
              <div className="flex justify-between text-xs border-t border-surface pt-1 mt-1">
                <span className="text-muted font-medium">APP Cost:</span>
                <span className="font-mono font-bold text-ink">{metrics.ownerValuation.APP.cost.toLocaleString()}</span>
              </div>
            </div>
            <div className="text-xs text-brand font-extrabold text-right pt-1 border-t border-surface mt-1">
              Margin: +{metrics.totalPotentialProfit.toLocaleString()} {currency}
            </div>
          </div>
        </div>

        {/* Low Stock Warning Card (Clickable Filter) — native button: <Button> base h-10 collapsed this card */}
        <Button
          type="button"
          onClick={() => handleToggleLowStockOnly()}
          className={`relative w-full !h-auto p-3 sm:p-4 rounded-2xl border text-left transition-all cursor-pointer shadow-2xs focus:outline-none ${
            showLowStockOnly
              ? 'bg-warning text-white border-amber-600 ring-2 ring-amber-400'
              : metrics.lowStockCount > 0
              ? 'bg-warning/10 hover:bg-warning/15 text-warning border-warning/30'
              : 'bg-white text-ink border-line'
          }`}
        >
          <div className={`absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center ${
            showLowStockOnly ? 'bg-white text-warning' : 'bg-warning/15 text-warning'
          }`}>
            <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="pr-14">
            <span className="text-xs font-bold uppercase tracking-wider">Low Stock Reorders</span>
            <div className="flex items-baseline justify-between mt-1 sm:mt-2">
              <span className="text-xl sm:text-2xl font-black font-mono">
                {metrics.lowStockCount} <span className="text-xs font-bold">SKUs</span>
              </span>
              <span className={`text-xs font-black px-2 py-0.5 rounded-full ${
                showLowStockOnly ? 'bg-white text-warning' : 'bg-warning/25 text-warning'
              }`}>
                {showLowStockOnly ? 'Filter Active' : 'Audit'}
              </span>
            </div>
          </div>
        </Button>
      </div>
      )}



      {/* VIEW MODE 1: STOCK TABLE */}
      {viewMode === 'stock' && (
        <>


        {/* Bulk actions bar — appears when parts are selected (stock table only) */}
        {selectedPartIds.size > 0 && !inlineEditMode && (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-brand/30 bg-brand-soft px-3 py-2">
            <span className="text-xs font-extrabold text-brand">{selectedPartIds.size} selected</span>
            <div className="ml-auto flex flex-wrap items-center gap-1.5">
              <Button variant="ghost"
                type="button"
                onClick={exportSelectedCsv}
                className="inline-flex items-center gap-1.5 rounded-lg border border-brand bg-white px-2.5 py-1.5 text-xs font-bold text-brand hover:bg-brand hover:text-white transition-colors cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                Export CSV
              </Button>
              <Button variant="ghost"
                type="button"
                onClick={bulkSetReorder}
                className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 py-1.5 text-xs font-bold text-ink hover:border-brand hover:text-brand transition-colors cursor-pointer"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                Set Reorder Point
              </Button>
              <Button variant="ghost"
                type="button"
                onClick={bulkDelete}
                className="inline-flex items-center gap-1.5 rounded-lg border border-danger/30 bg-danger/10 px-2.5 py-1.5 text-xs font-bold text-danger hover:bg-danger/15 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </Button>
              <Button variant="ghost"
                type="button"
                onClick={clearSelection}
                className="inline-flex items-center rounded-lg px-2 py-1.5 text-xs font-bold text-muted hover:text-ink transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                Clear
              </Button>
            </div>
          </div>
        )}

        {/* Low-stock quick audit banner — action-oriented (Ko Hein 2026-08-24) */}
        {metrics.lowStockCount > 0 && (
          <div className="w-full rounded-xl border border-warning/30 bg-warning/10 p-2.5 text-xs space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <AlertTriangle className="w-4 h-4 shrink-0 text-warning" />
                <span className="font-black text-warning">Stock Alert</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`rounded-full px-2 py-0.5 font-black border transition-colors ${
                  stockStatusFilter === 'OUT'
                    ? 'bg-danger text-white border-danger'
                    : 'bg-danger/15 text-danger border-danger/30'
                }`}>
                  {metrics.outOfStockCount} out of stock
                </span>
                <span className={`rounded-full px-2 py-0.5 font-black border transition-colors ${
                  stockStatusFilter === 'LOW'
                    ? 'bg-warning text-white border-warning'
                    : 'bg-warning/20 text-warning border-warning/30'
                }`}>
                  {Math.max(0, metrics.lowStockCount - metrics.outOfStockCount)} low stock
                </span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                onClick={() => { setStockStatusFilter('OUT'); setShowLowStockOnly(false); }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-danger px-2.5 py-1.5 text-xs font-black text-white transition-all cursor-pointer hover:bg-danger/90 active:scale-95"
              >
                <PackageX className="w-3.5 h-3.5" />
                Review {metrics.outOfStockCount} out-of-stock items
              </Button>
              <Button
                type="button"
                onClick={openPoDraft}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-2.5 py-1.5 text-xs font-black text-white transition-all cursor-pointer hover:bg-brand-deep active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                Create purchase order
              </Button>
              <Button
                type="button"
                onClick={() => handleToggleLowStockOnly()}
                variant="outline"
                size="sm"
                className="rounded-lg px-2.5 py-1.5 text-xs font-bold cursor-pointer"
              >
                {showLowStockOnly ? 'Filter Active ✓' : 'View low stock'}
              </Button>
              {stockStatusFilter !== 'ALL' && (
                <Button
                  type="button"
                  onClick={() => setStockStatusFilter('ALL')}
                  variant="ghost"
                  size="sm"
                  className="rounded-lg px-2 py-1.5 text-xs font-bold text-muted cursor-pointer hover:text-ink"
                >
                  <X className="w-3 h-3 mr-1 inline" /> Clear
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Top filters — Model / Part type / Quality / Stock status (Ko Hein 2026-08-24) */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-extrabold uppercase tracking-wide text-muted mr-0.5">Filter:</span>
          {/* Generation chips (Ko Hein 2026-08-24): quick iPhone generation filter */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar max-w-full py-0.5">
            {modelGenerations.map((gen) => (
              <button
                key={gen}
                type="button"
                onClick={() => setModelGeneration(modelGeneration === gen ? 'ALL' : gen)}
                className={`rounded-lg px-2 py-1 text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  modelGeneration === gen ? 'bg-brand text-white shadow-2xs' : 'bg-surface text-muted hover:bg-line hover:text-ink'
                }`}
              >
                {gen === 'ALL' ? 'All models' : gen}
              </button>
            ))}
          </div>
          <select
            aria-label="Filter by model"
            value={selectedModelFilter}
            onChange={(e) => setSelectedModelFilter(e.target.value)}
            className="rounded-lg border border-line bg-white px-2 py-1.5 text-xs font-semibold text-ink outline-none max-w-[150px]"
          >
            {modelFilterOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <select
            aria-label="Filter by part type"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="rounded-lg border border-line bg-white px-2 py-1.5 text-xs font-semibold text-ink outline-none max-w-[150px]"
          >
            {categoryFilterOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <select
            aria-label="Filter by quality tier"
            value={selectedQuality}
            onChange={(e) => setSelectedQuality(e.target.value)}
            className="rounded-lg border border-line bg-white px-2 py-1.5 text-xs font-semibold text-ink outline-none max-w-[140px]"
          >
            {tierFilterOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          {(['ALL', 'LOW', 'OUT'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStockStatusFilter(s)}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                stockStatusFilter === s
                  ? s === 'OUT'
                    ? 'bg-danger text-white shadow-2xs'
                    : s === 'LOW'
                    ? 'bg-warning text-white shadow-2xs'
                    : 'bg-brand text-white shadow-2xs'
                  : 'bg-surface text-muted hover:bg-line hover:text-ink'
              }`}
              title={s === 'LOW' ? 'Quantity above zero but at or below the reorder point' : s === 'OUT' ? 'Quantity is zero' : 'Show all parts'}
            >
              {s === 'ALL' ? 'All' : s === 'LOW' ? `Below reorder (${Math.max(0, metrics.lowStockCount - metrics.outOfStockCount)})` : `Out of stock (${metrics.outOfStockCount})`}
            </button>
          ))}
        </div>

        <div className="workspace-panel workspace-panel--standard !h-auto !max-h-none flex-1 min-h-0 rounded-2xl border border-line bg-white text-xs shadow-xs">
          {filteredParts.length === 0 ? (
            <div className="flex min-h-[280px] flex-col items-center justify-center p-12 text-center space-y-4">
              <PackageX className="w-8 h-8 text-muted mx-auto" />
              <div className="space-y-1">
                <p className="text-sm font-bold text-ink">No inventory components found matching your filter</p>
                <p className="text-xs text-muted">Try resetting the search query or quality tier selection.</p>
              </div>
              <Button
                type="button"
                onClick={() => {
                  setSelectedQuality('ALL');
                  setSelectedCategory('ALL');
                  setShowLowStockOnly(false);
                  setSearchQuery('');
                  setSelectedModelFilter('ALL');
                  setOwnerFilter('ALL');
                }}
                className="mt-2 px-3 py-1.5 bg-brand text-white font-bold rounded-xl text-xs"
              >
                Reset All Filters
              </Button>
            </div>
          ) : stockView === 'cards' ? (
            /* PHONE CARD GRID — read-only; in edit mode cards switch to instant −/+ steppers */
            <div className="workspace-panel__scroll rounded-xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2 sm:gap-3 p-2.5 sm:p-3 content-start">
              {paginatedParts.map((part) => {
                const threshold = part.reorderPoint > 0 ? part.reorderPoint : (systemSettings?.lowStockThreshold ?? 5);
                const isLow = part.quantityInStock <= threshold;
                const isOut = part.quantityInStock === 0;
                const qualityBadge =
                  part.qualityTier === 'Original' || part.qualityTier?.includes('Original') ? (
                    <span className="inline-flex max-w-[130px] items-center gap-1 truncate rounded-md border border-brand/30 bg-brand-soft px-1.5 py-0.5 text-xs font-extrabold text-brand-deep">
                      <ShieldCheck className="h-3 w-3 shrink-0 text-brand" />
                      <span>{part.qualityTier}</span>
                    </span>
                  ) : part.qualityTier === 'OEM' ? (
                    <span className="inline-flex max-w-[130px] items-center gap-1 truncate rounded-md border border-success/30 bg-success/10 px-1.5 py-0.5 text-xs font-extrabold text-success-deep">
                      <Sparkles className="h-3 w-3 shrink-0 text-success" />
                      <span>{part.qualityTier}</span>
                    </span>
                  ) : part.qualityTier === 'Genuine' ? (
                    <span className="inline-flex max-w-[130px] items-center gap-1 truncate rounded-md border border-purple/30 bg-purple/10 px-1.5 py-0.5 text-xs font-extrabold text-purple">
                      <Cpu className="h-3 w-3 shrink-0 text-purple" />
                      <span>{part.qualityTier}</span>
                    </span>
                  ) : (
                    <span className="inline-flex max-w-[130px] items-center gap-1 truncate rounded-md border border-line bg-surface px-1.5 py-0.5 text-xs font-extrabold text-ink">
                      <Tag className="h-3 w-3 shrink-0 text-muted" />
                      <span>{part.qualityTier}</span>
                    </span>
                  );

                return (
                  <div key={part.id} className="space-y-2 sm:space-y-3 rounded-xl sm:rounded-2xl border border-line bg-white p-3 sm:p-4 text-xs shadow-xs">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 items-start space-x-2">
                        <div className="mt-0.5 shrink-0 rounded-md bg-brand/10 p-1.5 text-brand-deep">
                          <Cpu className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-extrabold leading-snug text-ink">{part.name}</p>
                          <p className="mt-0.5 font-mono text-xs font-medium text-muted">SKU {part.sku}</p>
                        </div>
                      </div>
                      <Button variant="ghost"
                        type="button"
                        onClick={() => setSelectedPartForDetails(part)}
                        aria-label={`View ${part.name} details`}
                        title="View part details"
                        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-line bg-surface text-ink transition-colors hover:border-brand hover:bg-brand-soft hover:text-brand"
                      >
                        <FileText className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {qualityBadge}
                      {part.locationBin && (
                        <span className="inline-flex items-center gap-1 rounded-md border border-line bg-surface px-1.5 py-0.5 text-xs font-extrabold text-brand">
                          <MapPin className="h-2.5 w-2.5 shrink-0" />
                          {part.locationBin}
                        </span>
                      )}
                    </div>
                    {part.deviceCompatibility && part.deviceCompatibility.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {part.deviceCompatibility.map((device) => (
                          <span key={device} className="inline-flex items-center gap-0.5 rounded-full bg-brand-soft px-1.5 py-px text-[10px] font-bold text-brand-deep" title={device}>
                            <Smartphone className="h-2.5 w-2.5" />
                            {device}
                          </span>
                        ))}
                      </div>
                    )}

                    {inlineEditMode ? (
                      <div className="flex items-center justify-between gap-2 rounded-xl border border-warning/30 bg-warning/10 p-2 sm:p-2.5">
                        <span className="text-xs font-extrabold uppercase tracking-wide text-warning">Adjust Stock</span>
                        <div className="flex items-center gap-1.5">
                          <Button variant="ghost"
                            type="button"
                            onClick={() => { onUpdatePartStock(part.id, Math.max(0, part.quantityInStock - 1)); }}
                            aria-label={`Decrease stock for ${part.name}`}
                            title="Decrease stock"
                            className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg border border-warning/30 bg-white font-black text-danger active:scale-95"
                          >−</Button>
                          <span className="min-w-10 text-center font-mono text-base font-black text-ink">{part.quantityInStock}</span>
                          <Button variant="ghost"
                            type="button"
                            onClick={() => { onUpdatePartStock(part.id, part.quantityInStock + 1); }}
                            aria-label={`Increase stock for ${part.name}`}
                            title="Increase stock"
                            className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg border border-warning/30 bg-white font-black text-brand active:scale-95"
                          >+</Button>
                        </div>
                      </div>
                    ) : (
                    <div className="space-y-1.5 sm:rounded-xl sm:border sm:border-line sm:bg-surface sm:p-2.5">
                      <div className="flex items-center justify-between">
                        <span className={`font-mono text-base font-black tracking-wide ${isOut ? 'text-danger' : isLow ? 'text-warning' : 'text-ink'}`}>
                          {part.quantityInStock} <span className="text-xs font-normal text-muted">units</span>
                        </span>
                        {isOut ? (
                          <span className="animate-pulse rounded bg-danger px-1.5 py-0.5 text-xs font-black uppercase leading-none tracking-[0.1em] text-white">OUT OF STOCK</span>
                        ) : isLow ? (
                          <span className="rounded bg-warning px-1.5 py-0.5 text-xs font-black uppercase leading-none tracking-[0.1em] text-white">REORDER</span>
                        ) : (
                          <span className="text-xs font-bold text-muted">Min: {part.reorderPoint}</span>
                        )}
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-line">
                        <div
                          className={`h-full transition-all duration-300 ${isOut ? 'w-0 bg-danger' : isLow ? 'bg-warning' : 'bg-success'}`}
                          style={isOut ? undefined : { width: `${stockBarWidthPercent(part)}%` }}
                        />
                      </div>
                    </div>
                    )}

                    {/* Selling price edit — mobile card edit mode (step 1,000 MMK, instant save) */}
                    {inlineEditMode && (
                      <div className="flex items-center justify-between gap-2 rounded-xl border border-success/30 bg-success/10 p-2 sm:p-2.5">
                        <span className="text-xs font-extrabold uppercase tracking-wide text-success-deep">Selling Price</span>
                        <div className="flex items-center gap-1.5">
                          <Button variant="ghost"
                            type="button"
                            onClick={() => onUpdatePart?.({ ...part, sellingPrice: Math.max(0, part.sellingPrice - 1000) })}
                            aria-label={`Decrease price for ${part.name}`}
                            title={`Decrease price by 1,000 `}
                            className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg border border-success/30 bg-white font-black text-danger active:scale-95"
                          >−</Button>
                          <span className="min-w-[70px] text-center font-mono text-sm font-black text-ink">{part.sellingPrice.toLocaleString()}</span>
                          <Button variant="ghost"
                            type="button"
                            onClick={() => onUpdatePart?.({ ...part, sellingPrice: part.sellingPrice + 1000 })}
                            aria-label={`Increase price for ${part.name}`}
                            title={`Increase price by 1,000 `}
                            className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg border border-success/30 bg-white font-black text-brand active:scale-95"
                          >+</Button>
                        </div>
                      </div>
                    )}

                    <div className="flex items-end justify-between gap-2 sm:border-t sm:border-line pt-1">
                      <div>
                        <span className="block text-[10px] sm:text-xs font-bold uppercase text-muted">Selling Price</span>
                        <span className="font-mono text-sm font-black text-success-deep">{part.sellingPrice.toLocaleString()} {currency}</span>
                      </div>
                      {part.supplierName && (
                        <span className="max-w-[45%] truncate text-xs font-semibold text-muted" title={part.supplierName}>{part.supplierName}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            </div>
          ) : (
            <div className="workspace-panel__scroll rounded-xl">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 z-20 bg-surface text-muted text-xs uppercase font-mono border-b border-line shadow-2xs">
                  <tr>
                    {!inlineEditMode && (
                      <th className="w-[40px] px-2.5 py-2 bg-surface">
                        <Input
                          type="checkbox"
                          checked={paginatedParts.length > 0 && paginatedParts.every((p) => selectedPartIds.has(p.id))}
                          onChange={toggleSelectAllVisible}
                          aria-label="Select all visible parts"
                          className="accent-brand w-3.5 h-3.5 cursor-pointer"
                        />
                      </th>
                    )}
                    <th className="w-[28%] min-w-[220px] px-2.5 py-2 bg-surface">
                      <div className="flex items-center gap-1">
                        <Button type="button" onClick={() => toggleSort('name')} className="inline-flex items-center gap-1 hover:text-brand transition-colors cursor-pointer uppercase font-mono text-xs focus:outline-none" title="Sort by part name">
                          Part Name & SKU
                          {sortKey === 'name' && <SortArrow dir={sortDir} />}
                        </Button>
                        <div className="relative">
                          <Button
                            type="button"
                            onClick={() => setSkuFilterOpen(!skuFilterOpen)}
                            className={`p-1 rounded-md transition-colors cursor-pointer focus:outline-none ${(selectedModelFilter !== 'ALL' || selectedCategory !== 'ALL' || showLowStockOnly) ? 'text-brand' : 'text-muted hover:text-brand'}`}
                            title="Filter by model / category"
                            aria-label="Filter parts"
                          >
                            <Filter className="w-3 h-3" />
                            {(selectedModelFilter !== 'ALL' || selectedCategory !== 'ALL' || showLowStockOnly) && (
                              <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-brand" />
                            )}
                          </Button>
                          {skuFilterOpen && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={() => setSkuFilterOpen(false)} role="presentation" aria-hidden="true" />
                              <div className="absolute left-0 top-full mt-1 z-50 w-56 rounded-xl border border-line bg-white p-2 space-y-2 shadow-xl">
                                <div>
                                  <p className="text-[10px] font-extrabold uppercase tracking-wide text-muted mb-1">Model</p>
                                  <select
                                    aria-label="Filter by model"
                                    value={selectedModelFilter}
                                    onChange={(e) => setSelectedModelFilter(e.target.value)}
                                    className="w-full rounded-lg border border-line bg-white px-2 py-1.5 text-xs font-semibold text-ink outline-none "
                                  >
                                    {modelFilterOptions.map((opt) => (
                                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <p className="text-[10px] font-extrabold uppercase tracking-wide text-muted mb-1">Category</p>
                                  <select
                                    aria-label="Filter by category"
                                    value={selectedCategory}
                                    onChange={(e) => setSelectedCategory(e.target.value)}
                                    className="w-full rounded-lg border border-line bg-white px-2 py-1.5 text-xs font-semibold text-ink outline-none "
                                  >
                                    {categoryFilterOptions.map((opt) => (
                                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                  </select>
                                </div>
                                <label className="flex items-center gap-1.5 text-xs font-bold text-ink cursor-pointer pt-1.5 mt-1 border-t border-line">
                                  <Input
                                    type="checkbox"
                                    checked={showLowStockOnly}
                                    onChange={() => handleToggleLowStockOnly()}
                                    className="accent-brand w-3.5 h-3.5 cursor-pointer"
                                  />
                                  Low stock only
                                </label>
                                <div className="pt-1.5 mt-1 border-t border-line">
                                  <Button
                                    type="button"
                                    onClick={() => setSkuFilterOpen(false)}
                                    className="w-full rounded-lg bg-brand px-2 py-1.5 text-xs font-extrabold text-white shadow-xs transition-all hover:bg-brand-deep active:scale-95"
                                  >
                                    Done
                                  </Button>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </th>
                    <th className="w-[12%] min-w-[110px] px-2.5 py-2 bg-surface hidden md:table-cell">
                      <CustomDropdownMenu
                        value={selectedQuality}
                        onChange={setSelectedQuality}
                        options={tierFilterOptions}
                        size="sm"
                        buttonClassName="uppercase font-mono text-xs text-muted hover:text-brand transition-colors gap-1 bg-transparent border-0 p-0 rounded-none min-h-0 min-w-0 h-auto hover:bg-transparent "
                        menuAlign="group-left"
                      />
                    </th>
                    <th className="w-[10%] min-w-[88px] px-1.5 py-2 bg-surface">
                      <Button type="button" onClick={() => toggleSort('stock')} className="inline-flex items-center gap-1 hover:text-brand transition-colors cursor-pointer uppercase font-mono text-xs focus:outline-none" title="Sort by stock quantity">
                        Stock
                        {sortKey === 'stock' && <SortArrow dir={sortDir} />}
                      </Button>
                    </th>
                    <th className="w-[13%] min-w-[110px] px-1.5 py-2 bg-surface">
                      <Button type="button" onClick={() => toggleSort('price')} className="inline-flex items-center gap-1 hover:text-brand transition-colors cursor-pointer uppercase font-mono text-xs focus:outline-none" title="Sort by selling price">
                        Selling Price
                        {sortKey === 'price' && <SortArrow dir={sortDir} />}
                      </Button>
                    </th>
                    {inlineEditMode && <th className="w-[13%] min-w-[110px] px-1.5 py-2 bg-surface">Supplier</th>}
                    <th className="w-[10%] min-w-[96px] px-2.5 py-2 bg-surface hidden md:table-cell">{stockStatusFilter === 'ALL' ? 'Bin' : 'Supplier'}</th>
                    {!inlineEditMode && <th className="w-[12%] min-w-[80px] px-2.5 py-2 text-right bg-surface">Detail</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {paginatedParts.map((part) => {
                    const threshold = part.reorderPoint > 0 ? part.reorderPoint : (systemSettings?.lowStockThreshold ?? 5);
                    const isLow = part.quantityInStock <= threshold;
                    const isOut = part.quantityInStock === 0;
                    const draft = inlineDrafts[part.id] || {};
                    const editValue = (key: keyof PartItem, fallback: string | number) => draft[key] ?? fallback;

                    return (
                      <tr key={part.id} className={`transition-colors ${selectedPartIds.has(part.id) ? 'bg-brand-soft' : ''}`}>
                        {/* Selection checkbox */}
                        {!inlineEditMode && (
                          <td className="px-2.5 py-2">
                            <Input
                              type="checkbox"
                              checked={selectedPartIds.has(part.id)}
                              onChange={() => togglePartSelection(part.id)}
                              aria-label={`Select ${part.name}`}
                              className="accent-brand w-3.5 h-3.5 cursor-pointer"
                            />
                          </td>
                        )}
                        {/* Part Name & SKU */}
                        <td className="w-[28%] min-w-[220px] px-2.5 py-2 space-y-1">
                          <div className="flex items-start space-x-2">
                            <div className="p-1 rounded-md bg-brand/10 text-brand-deep shrink-0 mt-0.5">
                              <Cpu className="w-3 h-3" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-extrabold text-ink text-xs leading-snug">
                                {part.name}
                              </p>
                              <p className="mt-0.5 font-mono text-xs font-medium text-muted truncate max-w-[160px]" title={`SKU ${part.sku}`}>SKU {part.sku}</p>
                              {part.deviceCompatibility && part.deviceCompatibility.length > 0 && (
                                <div className="mt-1 flex flex-wrap gap-1">
                                  {part.deviceCompatibility.map((device) => (
                                    <span key={device} className="inline-flex items-center gap-0.5 rounded-full bg-brand-soft px-1.5 py-px text-[10px] font-bold text-brand-deep" title={device}>
                                      {device}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Quality Tier */}
                        <td className="w-[12%] min-w-[110px] px-2.5 py-2 hidden md:table-cell">
                          {part.qualityTier === 'Original' || part.qualityTier?.includes('Original') ? (
                            <span className="inline-flex max-w-[112px] items-center gap-1 truncate rounded-md border border-brand/30 bg-brand-soft px-1.5 py-0.5 text-xs font-extrabold text-brand-deep">
                              <ShieldCheck className="h-3 w-3 shrink-0 text-brand" />
                              <span>{part.qualityTier}</span>
                            </span>
                          ) : part.qualityTier === 'OEM' ? (
                            <span className="inline-flex max-w-[112px] items-center gap-1 truncate rounded-md border border-success/30 bg-success/10 px-1.5 py-0.5 text-xs font-extrabold text-success-deep">
                              <Sparkles className="h-3 w-3 shrink-0 text-success" />
                              <span>{part.qualityTier}</span>
                            </span>
                          ) : part.qualityTier === 'Genuine' ? (
                            <span className="inline-flex max-w-[112px] items-center gap-1 truncate rounded-md border border-purple/30 bg-purple/10 px-1.5 py-0.5 text-xs font-extrabold text-purple">
                              <Cpu className="h-3 w-3 shrink-0 text-purple" />
                              <span>{part.qualityTier}</span>
                            </span>
                          ) : (
                            <span className="inline-flex max-w-[112px] items-center gap-1 truncate rounded-md border border-line bg-surface px-1.5 py-0.5 text-xs font-extrabold text-ink">
                              <Tag className="h-3 w-3 shrink-0 text-muted" />
                              <span>{part.qualityTier}</span>
                            </span>
                          )}
                        </td>

                        {/* Stock Level & Visual Bar */}
                        <td className={`w-[10%] min-w-[88px] pr-2 py-2 ${inlineEditMode ? '!w-[110px]' : ''}`}>
                          {inlineEditMode ? (
                            <div className="grid grid-cols-1 gap-1" onFocus={() => beginInlineEdit(part)}>
                              <label className="flex min-w-0 flex-col gap-0.5 text-xs font-bold uppercase tracking-wide text-muted">
                                <span>Stock</span>
                                <Input aria-label={`Stock quantity for ${part.name}`} type="text" inputMode="numeric" value={inlineDrafts[part.id]?.quantityInStock ?? String(part.quantityInStock)} onWheel={(e) => e.currentTarget.blur()} onChange={(e) => setInlineDrafts((current) => ({ ...current, [part.id]: { ...current[part.id], quantityInStock: e.target.value } }))} className="w-full min-w-0 rounded-md border border-line-strong bg-white px-2 py-1.5 text-sm font-semibold font-sans tabular-nums tracking-normal text-ink" />
                              </label>
                            </div>
                          ) : null}
                          {!inlineEditMode && <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className={`font-black text-sm font-mono tracking-wide ${
                                isOut ? 'text-danger' : isLow ? 'text-warning' : 'text-ink'
                              }`}>
                                {(inlineEditMode ? editValue('quantityInStock', part.quantityInStock) : part.quantityInStock)} <span className="text-xs font-normal text-muted">units</span>
                              </span>
                              {!inlineEditMode && isOut ? (
                                <span className="bg-danger text-white text-xs font-black px-1 py-0.5 rounded uppercase tracking-[0.1em] leading-none animate-pulse">
                                  OUT OF STOCK
                                </span>
                              ) : !inlineEditMode && isLow ? (
                                <span className="bg-warning text-white text-xs font-black px-1 py-0.5 rounded uppercase tracking-[0.1em] leading-none">
                                  REORDER
                                </span>
                              ) : !inlineEditMode ? (
                                <span className="text-xs text-muted font-bold">
                                  Min: {part.reorderPoint}
                                </span>
                              ) : null}
                            </div>

                            {/* Stock Visual Bar */}
                            {!inlineEditMode && <div className="w-full h-1.5 bg-line rounded-full overflow-hidden">
                              <div
                                className={`h-full transition-all duration-300 ${
                                  isOut ? 'bg-danger w-0' : isLow ? 'bg-warning' : 'bg-success'
                                }`}
                                style={{ width: `${stockBarWidthPercent(part)}%` }}
                              />
                            </div>}
                          </div>}
                        </td>

                        {/* Selling price only — profit belongs in the Profit tab. */}
                        <td className={`w-[13%] min-w-[110px] pl-3 pr-1.5 py-2 font-sans text-sm font-semibold tabular-nums text-success-deep whitespace-nowrap ${inlineEditMode ? '!w-[176px]' : ''}`}>
                          {inlineEditMode ? (
                            <div className="grid grid-cols-2 gap-2">
                              <label className="flex min-w-0 flex-col gap-0.5 text-xs font-bold uppercase tracking-wide text-muted">
                                <span>Purchase</span>
                                <Input aria-label={`Purchase price for ${part.name}`} type="text" inputMode="numeric" value={inlineDrafts[part.id]?.costPrice ?? String(part.costPrice)} onWheel={(e) => e.currentTarget.blur()} onFocus={() => beginInlineEdit(part)} onChange={(e) => setInlineDrafts((current) => ({ ...current, [part.id]: { ...current[part.id], costPrice: e.target.value } }))} className="w-full min-w-0 rounded-md border border-line-strong bg-white px-2 py-1.5 text-sm font-semibold font-sans tabular-nums tracking-normal text-ink" />
                              </label>
                              <label className="flex min-w-0 flex-col gap-0.5 text-xs font-bold uppercase tracking-wide text-muted">
                                <span>Selling</span>
                                <Input aria-label={`Selling price for ${part.name}`} type="text" inputMode="numeric" value={inlineDrafts[part.id]?.sellingPrice ?? String(part.sellingPrice)} onWheel={(e) => e.currentTarget.blur()} onChange={(e) => setInlineDrafts((current) => ({ ...current, [part.id]: { ...current[part.id], sellingPrice: e.target.value } }))} className="w-full min-w-0 rounded-md border border-line-strong bg-white px-2 py-1.5 text-sm font-semibold font-sans tabular-nums tracking-normal text-ink" />
                              </label>
                            </div>
                          ) : <>{part.sellingPrice.toLocaleString()} {currency}</>}
                        </td>

                        {inlineEditMode ? (
                          <td className="w-[13%] min-w-[110px] px-1.5 py-2 align-top">
                            <div className="flex min-w-0 flex-col gap-0.5 text-xs font-bold uppercase tracking-wide text-muted">
                              <span>Supplier</span>
                              <CustomDropdownMenu
                                value={inlineDrafts[part.id]?.supplierId ?? part.supplierId ?? ''}
                                onChange={(supplierId) => {
                                  const selectedSup = suppliers.find((supplier) => supplier.id === supplierId);
                                  beginInlineEdit(part);
                                  setInlineDrafts((current) => ({
                                    ...current,
                                    [part.id]: {
                                      ...current[part.id],
                                      supplierId,
                                    },
                                  }));
                                  if (selectedSup) {
                                    // keep name in sync immediately for downstream save review
                                    setInlineDrafts((current) => ({
                                      ...current,
                                      [part.id]: {
                                        ...current[part.id],
                                        supplierId,
                                      },
                                    }));
                                  }
                                }}
                                placeholder={suppliers.length ? 'Choose supplier' : 'No supplier'}
                                options={suppliers.map((supplier) => ({
                                  value: supplier.id,
                                  label: `${supplier.name} (${supplier.code})`,
                                  badge: `${supplier.avgRmaTurnaroundDays}d`,
                                }))}
                                className="w-full"
                                buttonClassName="w-full rounded-md bg-white px-2 py-1.5 text-left text-sm font-semibold text-ink"
                                menuAlign="left"
                              />
                            </div>
                          </td>
                        ) : null}

                        {/* Location Bin */}
                        <td className="w-[10%] min-w-[96px] px-1.5 py-2 hidden md:table-cell">
                          {inlineEditMode ? (
                            <div className="flex min-w-0 flex-col gap-0.5 text-xs font-bold uppercase tracking-wide text-muted">
                              <span>Bin</span>
                              <select aria-label={`Bin for ${part.name}`} value={editValue('locationBin', part.locationBin) as string} onFocus={() => beginInlineEdit(part)} onChange={(e) => setInlineDrafts((current) => ({ ...current, [part.id]: { ...current[part.id], locationBin: e.target.value } }))} className="w-full min-w-0 rounded-md border border-line-strong bg-white px-2 py-1.5 text-sm font-semibold font-sans tabular-nums tracking-normal text-ink"><option value="">Choose bin</option>{existingLocationBins.map((bin) => <option key={bin} value={bin}>{bin}</option>)}</select>
                            </div>
                          ) : stockStatusFilter !== 'ALL' ? (
                            <div className="flex min-w-0 flex-col gap-0.5 text-xs font-bold uppercase tracking-wide text-muted">
                              <span>Supplier</span>
                              <span className="inline-flex items-center gap-1 px-1 py-0.5 text-xs font-extrabold leading-none text-ink truncate max-w-[120px]" title={part.supplierName}>
                                {part.supplierName || '—'}
                              </span>
                              <span className="text-[10px] font-semibold text-muted">Reorder: {part.reorderPoint}</span>
                            </div>
                          ) : part.locationBin ? (
                            <div className="flex min-w-0 flex-col gap-0.5 text-xs font-bold uppercase tracking-wide text-muted">
                              <span>Bin</span>
                              <span className="inline-flex items-center gap-1 px-1 py-0.5 text-xs font-extrabold leading-none text-brand">
                                <MapPin className="h-2.5 w-2.5 shrink-0 text-brand" />
                                {part.locationBin}
                              </span>
                            </div>
                          ) : null}
                        </td>

                        {/* Detailed stock controls are kept inside the part detail modal. */}
                        {!inlineEditMode && <td className="w-[12%] min-w-[80px] px-1.5 py-2 text-right shrink-0">
                          <Button variant="ghost"
                            type="button"
                            onClick={() => setSelectedPartForDetails(part)}
                            aria-label={`View ${part.name} details`}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-surface text-ink transition-colors hover:border-brand hover:bg-brand-soft hover:text-brand"
                            title="View part details"
                          >
                            <FileText className="h-3.5 w-3.5" />
                          </Button>
                        </td>}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Full list footer — always visible with full count */}
          {filteredParts.length > 0 && (
            <div className="workspace-panel__footer p-3.5 bg-white border-t border-line flex items-center justify-between text-xs text-muted">
              <span className="font-bold">
                Showing all <strong className="text-ink">{filteredParts.length}</strong> parts
              </span>
              {selectedPartIds.size > 0 && (
                <span className="font-bold text-ink">{selectedPartIds.size} selected</span>
              )}
            </div>
          )}
        </div>
        </>
      )}

      {/* VIEW MODE 2: PROFIT TABLE */}
      {viewMode === 'profit' && (
        <div className="workspace-panel workspace-panel--with-summary !h-auto !max-h-none flex-1 min-h-0 rounded-2xl border border-line bg-white text-xs shadow-xs">
          <div className="flex items-center justify-between border-b border-line px-3 py-2.5">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-brand" />
              <div>
                <h3 className="font-extrabold text-ink">Profit Analysis</h3>
                <p className="text-xs text-muted">Cost, selling price, and expected margin per unit</p>
              </div>
            </div>
            <span className="font-mono text-xs font-black text-brand">+{metrics.totalPotentialProfit.toLocaleString()} {currency}</span>
          </div>

          {/* Profit by Category — how much the current stock would make, per category */}
          <div className="overflow-x-auto border-b border-line">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface font-mono text-[10px] uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-3 py-2">Category</th>
                  <th className="px-3 py-2 text-right">SKUs</th>
                  <th className="px-3 py-2 text-right">Cost Asset</th>
                  <th className="px-3 py-2 text-right">Retail Yield</th>
                  <th className="px-3 py-2 text-right">Est. Profit</th>
                  <th className="px-3 py-2 text-right">Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {profitByCategory.map((row) => (
                  <tr key={row.category} className="hover:bg-surface/60">
                    <td className="px-3 py-1.5 font-bold text-ink">{row.category}</td>
                    <td className="px-3 py-1.5 text-right font-mono text-muted">{row.skus}</td>
                    <td className="px-3 py-1.5 text-right font-mono text-muted">{row.cost.toLocaleString()} {currency}</td>
                    <td className="px-3 py-1.5 text-right font-mono">{row.retail.toLocaleString()} {currency}</td>
                    <td className={`px-3 py-1.5 text-right font-mono font-black ${row.profit >= 0 ? 'text-success-deep' : 'text-danger'}`}>
                      {row.profit >= 0 ? '+' : ''}{row.profit.toLocaleString()} {currency}
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      <span className={`rounded-md px-1.5 py-0.5 font-mono text-[10px] font-black ${
                        row.margin >= 40 ? 'bg-success/15 text-success-deep' : row.margin >= 20 ? 'bg-success/15 text-success-deep' : row.margin >= 0 ? 'bg-warning/15 text-warning' : 'bg-danger/15 text-danger'
                      }`}>{row.margin}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-ink bg-surface font-black">
                  <td className="px-3 py-2 text-ink">Total</td>
                  <td className="px-3 py-2 text-right font-mono text-ink">{parts.length}</td>
                  <td className="px-3 py-2 text-right font-mono text-ink">{metrics.totalCostValuation.toLocaleString()} {currency}</td>
                  <td className="px-3 py-2 text-right font-mono text-ink">{metrics.totalRetailValuation.toLocaleString()} {currency}</td>
                  <td className={`px-3 py-2 text-right font-mono text-success-deep`}>
                    +{metrics.totalPotentialProfit.toLocaleString()} {currency}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <span className="rounded-md bg-success/15 px-1.5 py-0.5 font-mono text-[10px] font-black text-success-deep">
                      {metrics.totalRetailValuation ? Math.round((metrics.totalPotentialProfit / metrics.totalRetailValuation) * 100) : 0}%
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="workspace-panel__scroll">
            {/* PHONE CARD GRID (<sm) — profit view had no card fallback, so the
                nowrap MMK prices crushed part names on phones (audit P1-B). */}
            <div className="grid grid-cols-1 gap-2 p-2.5 content-start sm:hidden">
              {paginatedParts.map((part) => {
                const profit = part.sellingPrice - part.costPrice;
                const margin = part.sellingPrice ? Math.round((profit / part.sellingPrice) * 100) : 0;
                const heat =
                  margin >= 40 ? 'bg-success/15 text-success-deep' :
                  margin >= 20 ? 'bg-success/15 text-success-deep' :
                  margin >= 0 ? 'bg-warning/15 text-warning' :
                  'bg-danger/15 text-danger';
                return (
                  <div key={part.id} className="space-y-2 rounded-xl sm:rounded-2xl border border-line bg-white p-3 sm:p-4 text-xs shadow-xs">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-extrabold leading-snug text-ink">{part.name}</p>
                        <p className="mt-0.5 font-mono text-xs font-medium text-muted">SKU {part.sku}</p>
                      </div>
                      <Button variant="ghost"
                        type="button"
                        onClick={() => setSelectedPartForDetails(part)}
                        aria-label={`View ${part.name} details`}
                        title="View part details"
                        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-line bg-surface text-ink transition-colors hover:border-brand hover:bg-brand-soft hover:text-brand"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 sm:gap-2 rounded-lg sm:rounded-xl border border-line bg-surface p-2 sm:p-3">
                      <div>
                        <p className="text-[10px] sm:text-xs font-extrabold uppercase tracking-wider text-muted">Cost</p>
                        <p className="mt-0.5 font-mono text-xs font-bold text-faint break-words">{part.costPrice.toLocaleString()} {currency}</p>
                      </div>
                      <div>
                        <p className="text-[10px] sm:text-xs font-extrabold uppercase tracking-wider text-muted">Selling</p>
                        <p className="mt-0.5 font-mono text-xs font-bold text-success-deep break-words">{part.sellingPrice.toLocaleString()} {currency}</p>
                      </div>
                      <div>
                        <p className="text-[10px] sm:text-xs font-extrabold uppercase tracking-wider text-muted">Profit</p>
                        <p className={`mt-0.5 font-mono text-xs font-black break-words ${profit >= 0 ? 'text-brand' : 'text-danger'}`}>{profit >= 0 ? '+' : ''}{profit.toLocaleString()} {currency}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-muted">Margin / unit</span>
                      <span className={`rounded-md px-2 py-0.5 sm:py-1 font-mono text-xs font-black ${heat}`}>{margin}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
            {/* TABLE (sm+) */}
            <table className="w-full text-left hidden sm:table">
              <thead className="sticky top-0 z-20 border-b border-line bg-surface font-mono text-xs uppercase text-muted">
                <tr>
                  <th className="px-2.5 py-2">Part</th>
                  <th className="px-2.5 py-2 hidden md:table-cell">Cost</th>
                  <th className="px-2.5 py-2">Selling</th>
                  <th className="px-2.5 py-2">Profit / Unit</th>
                  <th className="px-2.5 py-2 hidden sm:table-cell">Margin</th>
                  <th className="px-2.5 py-2 text-right">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {paginatedParts.map((part) => {
                  const profit = part.sellingPrice - part.costPrice;
                  const margin = part.sellingPrice ? Math.round((profit / part.sellingPrice) * 100) : 0;
                  // Margin heat map: >=40% green, 20-39% lime/emerald, 0-19% amber, negative red
                  const heat =
                    margin >= 40 ? 'bg-success/15 text-success-deep' :
                    margin >= 20 ? 'bg-success/15 text-success-deep' :
                    margin >= 0 ? 'bg-warning/15 text-warning' :
                    'bg-danger/15 text-danger';
                  return (
                    <tr key={part.id} className="">
                      <td className="px-2.5 py-2"><p className="max-w-[260px] truncate font-bold text-ink">{part.name}</p><p className="mt-0.5 font-mono text-xs text-muted">{part.sku}</p></td>
                      <td className="px-2.5 py-2 font-mono text-faint whitespace-nowrap hidden md:table-cell">{part.costPrice.toLocaleString()} {currency}</td>
                      <td className="px-2.5 py-2 font-mono font-bold text-success-deep whitespace-nowrap">{part.sellingPrice.toLocaleString()} {currency}</td>
                      <td className={`px-2.5 py-2 font-mono font-black whitespace-nowrap ${profit >= 0 ? 'text-brand' : 'text-danger'}`}>{profit >= 0 ? '+' : ''}{profit.toLocaleString()} {currency}<span className={`mt-0.5 block w-max rounded-md px-1.5 py-0.5 font-mono text-xs font-black sm:hidden ${heat}`}>{margin}%</span></td>
                      <td className="px-2.5 py-2 hidden sm:table-cell"><span className={`rounded-md px-1.5 py-0.5 font-mono text-xs font-black ${heat}`} title={margin >= 40 ? 'High margin' : margin >= 20 ? 'Good margin' : margin >= 0 ? 'Low margin' : 'Loss'}>{margin}%</span></td>
                      <td className="px-2.5 py-2 text-right"><Button variant="ghost" type="button" aria-label={`View ${part.name} details`} title="View part details" onClick={() => setSelectedPartForDetails(part)} className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-white text-ink hover:border-brand hover:text-brand"><Eye className="h-3 w-3" /></Button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {paginatedParts.length === 0 && (
              <div className="p-8 text-center text-xs text-muted space-y-1">
                <TrendingUp className="w-6 h-6 mx-auto opacity-50" />
                <p className="font-extrabold text-sm text-ink">No parts match the current filters</p>
                <p>Adjust the quality, category, or search filters to see profit analysis.</p>
              </div>
            )}
          </div>
          {filteredParts.length > 0 && (
            <div className="workspace-panel__footer p-3.5 bg-white border-t border-line flex items-center justify-between text-xs text-muted">
              <span className="font-bold">
                Showing all <strong className="text-ink">{filteredParts.length}</strong> parts
              </span>
              {selectedPartIds.size > 0 && (
                <span className="font-bold text-ink">{selectedPartIds.size} selected</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* VIEW MODE 3: LIVE STOCK MATRIX — derived only from saved inventory rows. */}
      {viewMode === 'matrix' && (
        <div className="workspace-panel workspace-panel--with-summary !h-auto !max-h-none flex-1 min-h-0 rounded-2xl border border-line bg-white text-xs shadow-xs">
          <div className="flex items-center justify-between border-b border-line px-3 py-2.5">
            <div className="flex items-center gap-2">
              <Grid className="h-4 w-4 text-brand" />
              <div>
                <h3 className="font-extrabold text-ink">
                  <span className="hidden sm:inline">Apple Device Model × Component Stock Matrix</span>
                  <span className="sm:hidden">Device × Component Matrix</span>
                </h3>
                <p className="text-xs text-muted">Live totals from saved inventory components</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-muted">{matrixModels.length} models · {matrixCategories.length} categories</span>
              <Button variant="ghost"
                type="button"
                onClick={() => setIsMatrixPrintOpen(true)}
                className="flex items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs font-bold text-ink transition hover:border-brand hover:text-brand"
                title="Print ground stock checking sheet"
              >
                <Printer className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Print Stock Sheet</span>
              </Button>
            </div>
          </div>

          {matrixModels.length && matrixCategories.length ? (
            <div className="workspace-panel__scroll overscroll-x-contain">
              <table className="min-w-max w-full text-left">
                <thead className="sticky top-0 z-20 border-b border-line bg-surface font-mono text-xs uppercase text-muted">
                  <tr>
                    <th className="sticky left-0 z-30 min-w-44 bg-surface p-2.5 border-r border-line">Device Model</th>
                    {matrixCategories.map((category) => <th key={category} className="min-w-28 p-2.5 text-center">{category}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {matrixModels.map((model) => (
                    <tr key={model} className="hover:bg-surface/80">
                      <td className="sticky left-0 z-10 bg-surface p-2.5 font-bold text-ink border-r border-line">{model}</td>
                      {matrixCategories.map((category) => {
                        const merge = matrixMergeGroups[category]?.[model];
                        // Cell is consumed by the rowSpan of the row above it.
                        if (merge && !merge.isFirst) return null;
                        const matchingParts = ownerParts.filter((part) =>
                          part.category === category && part.deviceCompatibility.some((device) => device.toLowerCase() === model.toLowerCase())
                        );
                        const quantity = matchingParts.reduce((total, part) => total + part.quantityInStock, 0);
                        const reorderPoint = matchingParts.reduce((total, part) => total + part.reorderPoint, 0);
                        const costValue = matchingParts.reduce((total, part) => total + (part.costPrice || 0) * part.quantityInStock, 0);
                        const retailValue = matchingParts.reduce((total, part) => total + (part.sellingPrice || 0) * part.quantityInStock, 0);
                        const isLow = matchingParts.length > 0 && quantity <= reorderPoint;
                        const sharedLabel = merge && merge.models.length > 1 ? ` · Shared: ${merge.models.join(' + ')}` : '';
                        return (
                          <td key={category} rowSpan={merge?.rowSpan ?? 1} className="p-1.5 md:p-2 text-center align-middle">
                            {matchingParts.length ? (
                              <Button
                                type="button"
                                onClick={() => {
                                  setSelectedModelFilter(model);
                                  setSelectedCategory(category);
                                  setViewMode('stock');
                                }}
                                className={`min-w-12 min-h-8 sm:min-w-14 md:min-h-8 rounded-lg border px-2 py-1 font-mono text-xs font-black ${
                                  quantity === 0 ? 'border-danger/30 bg-danger/10 text-danger' : isLow ? 'border-warning/30 bg-warning/10 text-warning' : 'border-success/30 bg-success/10 text-success-deep'
                                }`}
                                title={`${matchingParts.length} SKU${matchingParts.length === 1 ? '' : 's'} · ${quantity} units · Cost ${costValue.toLocaleString()} ${currency} · Retail ${retailValue.toLocaleString()} ${currency}${sharedLabel}`}
                              >
                                {quantity}
                                {/* Touch fallback for the title= tooltip (invisible on
                                    phones): SKU count + stock value under the number. */}
                                <span className="block text-xs font-bold leading-none opacity-80 mt-0.5 sm:hidden">
                                  {matchingParts.length} SKU · {costValue.toLocaleString()}
                                </span>
                              </Button>
                            ) : <span className="text-muted">—</span>}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
                <tfoot className="sticky bottom-0 z-20">
                  <tr className="border-t-2 border-ink bg-surface shadow-[0_-4px_8px_-6px_rgba(0,0,0,0.25)]">
                    <td className="sticky left-0 z-30 bg-surface p-2.5 font-black text-ink border-r border-line">
                      Total ({matrixGrandTotal.toLocaleString()})
                    </td>
                    {matrixCategories.map((category) => (
                      <td key={category} className="p-2 text-center font-mono text-xs font-black text-ink">
                        {matrixCategoryTotals[category]?.toLocaleString() ?? 0}
                      </td>
                    ))}
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 text-center">
              <Boxes className="h-8 w-8 text-muted" />
              <p className="font-bold text-ink">No saved inventory data yet</p>
              <p className="text-xs text-muted">Add components with a device model and category to populate the matrix.</p>
            </div>
          )}
        </div>
      )}

      {/* MODAL: BULK SET REORDER POINT — styled replacement for the old native prompt (audit P2) */}
      {bulkReorderOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm space-y-4 rounded-2xl border border-line-strong bg-white p-5 text-xs shadow-2xl">
            <div className="flex items-start justify-between gap-2 border-b border-line pb-2">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-brand">Bulk update</p>
                <h3 className="mt-0.5 text-sm font-black text-ink">Set reorder point</h3>
                <p className="mt-0.5 text-xs font-semibold text-ink">{selectedParts.length} selected part(s)</p>
              </div>
              <Button variant="ghost" type="button" onClick={() => setBulkReorderOpen(false)} aria-label="Close" title="Close" className="rounded-lg p-1 text-ink hover:bg-surface hover:text-brand">
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
            <Input
              type="number"
              min={0}
              autoFocus
              value={bulkReorderValue}
              onChange={(e) => setBulkReorderValue(e.target.value)}
              placeholder="e.g. 5"
              aria-label="Reorder point value"
              className="w-full rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs font-mono font-bold text-ink focus:bg-white focus:outline-none"
            />
            <div className="flex justify-end gap-2 border-t border-line pt-3">
              <Button variant="ghost" type="button" onClick={() => setBulkReorderOpen(false)} className="rounded-lg border border-line bg-white px-4 py-2 text-xs font-bold text-ink hover:bg-surface">
                Cancel
              </Button>
              <Button type="button" onClick={confirmBulkSetReorder} className="rounded-lg bg-brand px-4 py-2 text-xs font-extrabold text-white shadow-xs transition-all hover:bg-brand-deep active:scale-95">
                Apply to {selectedParts.length} Part(s)
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD NEW PART */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="flex max-h-[85vh] min-h-0 w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-line bg-white text-xs shadow-2xl">
            <div className={isDeviceModelChooserOpen ? 'hidden' : 'contents'}>
            <div className="flex shrink-0 items-center justify-between border-b border-line px-4 py-2.5">
              <h3 className="flex items-center space-x-2 text-sm font-extrabold text-ink">
                <Plus className="h-4 w-4 text-brand" />
                <span>Register New Hardware Component</span>
              </h3>
              <Button
                onClick={() => setShowAddModal(false)}
                variant="iconGhost"
                className="p-1"
                aria-label="Close"
                title="Close"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-4 py-2.5 [scrollbar-gutter:stable]">
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <label className="block font-bold text-ink">Compatible Devices</label>
                <span className="font-medium text-xs text-muted">{newPartData.deviceCompatibility?.length || 0} selected</span>
              </div>
              {/* Selected devices as removable chips */}
              {newPartData.deviceCompatibility && newPartData.deviceCompatibility.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {newPartData.deviceCompatibility.map((device, idx) => (
                    <span key={device} className="inline-flex items-center gap-1 rounded-full border border-brand/30 bg-brand-soft px-2 py-0.5 text-xs font-bold text-brand-deep">
                      <Smartphone className="h-3 w-3 shrink-0" />
                      <span className="truncate max-w-[140px]">{device}</span>
                      <Button
                        type="button"
                        onClick={() => applyPartSpecification({ deviceCompatibility: newPartData.deviceCompatibility.filter((_, i) => i !== idx) })}
                        className="ml-0.5 rounded-full p-0.5 hover:bg-brand/20 transition-colors"
                        title={`Remove ${device}`}
                        aria-label={`Remove ${device}`}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </span>
                  ))}
                </div>
              )}
              {/* Add Device button */}
              <Button
                type="button"
                onClick={() => setIsDeviceModelChooserOpen(true)}
                className="flex w-full cursor-pointer items-center gap-2 rounded-lg border border-dashed border-line bg-surface px-2.5 py-1.5 text-xs font-bold text-muted transition-colors hover:border-brand/40 hover:text-brand"
              >
                <Plus className="h-4 w-4" />
                Add Device Model
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <div>
                <label className="mb-1 block font-bold text-ink">Category</label>
                <CustomDropdownMenu
                  value={newPartData.category}
                  onChange={(category) => applyPartSpecification({ category })}
                  options={categories.map((category) => ({ value: category, label: category }))}
                  placeholder={categories.length ? 'Choose category' : 'Add a category in Settings first'}
                  className="w-full"
                  buttonClassName="!h-9 !w-full !rounded-lg !border-line !bg-surface !px-2.5"
                  menuAlign="left"
                  size="md"
                />
              </div>

              <div>
                <label className="mb-1 block font-bold text-ink">Quality Tier</label>
                <CustomDropdownMenu
                  value={newPartData.qualityTier || ''}
                  onChange={(qualityTier) => applyPartSpecification({ qualityTier: qualityTier as PartQualityTier })}
                  options={customQualityTiers.map((tier) => ({ value: tier, label: tier }))}
                  placeholder="Choose quality tier"
                  className="w-full"
                  buttonClassName="!h-9 !w-full !rounded-lg !border-line !bg-surface !px-2.5"
                  menuAlign="left"
                  size="md"
                />
              </div>
            </div>

            {isBackGlassCategory && (
              <div className="rounded-xl border border-brand/20 bg-brand-soft p-2">
                <div className="mb-1.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Palette className="h-4 w-4 text-brand" />
                    <div>
                      <p className="text-xs font-extrabold text-ink">Back Glass Color</p>
                      <p className="text-[11px] text-muted">Match the original device color</p>
                    </div>
                  </div>
                  {newPartData.backGlassColor && (
                    <span className="text-xs font-bold text-brand">{newPartData.backGlassColor}</span>
                  )}
                </div>

                {availableBackGlassColors.length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {availableBackGlassColors.map((colorName) => {
                      const colorStyle = getRealisticColorStyle(colorName);
                      const isSelected = newPartData.backGlassColor === colorName;
                      return (
                        <Button
                          key={colorName}
                          type="button"
                          onClick={() => applyPartSpecification({ backGlassColor: colorName })}
                          className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-2 text-xs font-bold transition-colors ${
                            isSelected
                              ? 'border-brand bg-white text-brand shadow-xs'
                              : 'border-line bg-white text-ink hover:border-brand/50'
                          }`}
                        >
                          <span
                            className={`h-3.5 w-3.5 rounded-full border border-white shadow-sm ${colorStyle.border}`}
                            style={{ background: colorStyle.gradient }}
                          />
                          <span>{colorName}</span>
                        </Button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs font-medium text-muted">
                    {isMultiDevice
                      ? 'Back glass colors are model-specific. Select a single device to choose a color.'
                      : 'Select a device model first to choose the correct back glass color.'}
                  </p>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <div>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <label className="block font-bold text-ink">Part Name *</label>
                  <Button
                    type="button"
                    onClick={() => setNewPartData((current) => ({ ...current, name: generatePartName(current) || current.name || '' }))}
                    variant="ghost"
                    className="inline-flex shrink-0 items-center gap-1 text-[11px] font-extrabold text-brand hover:underline"
                    title="Generate from model, category, and quality tier"
                  >
                    <Sparkles className="h-3 w-3" /> Auto
                  </Button>
                </div>
                <Input
                  type="text"
                  value={newPartData.name || ''}
                  onChange={(e) => setNewPartData({ ...newPartData, name: e.target.value })}
                  placeholder="Part name"
                  className="w-full rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs font-bold text-ink focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <label className="block font-bold text-ink">SKU / Code *</label>
                  <Button
                    type="button"
                    onClick={() => setNewPartData((current) => ({ ...current, sku: generatePartSku(current) || current.sku || '' }))}
                    variant="ghost"
                    className="inline-flex items-center gap-1 text-[11px] font-extrabold text-brand hover:underline"
                    title="Generate from model, category, color, and quality tier"
                  >
                    <Sparkles className="h-3 w-3" /> Auto
                  </Button>
                </div>
                <Input
                  type="text"
                  value={newPartData.sku || ''}
                  onChange={(e) => setNewPartData({ ...newPartData, sku: e.target.value })}
                  placeholder="Auto-generated"
                  className="w-full rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs font-mono text-ink focus:bg-white focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <div className="flex justify-between items-center mb-1">
                  <label className="block font-bold text-ink">Supplier Name *</label>
                  <Button
                    type="button"
                    onClick={() => setShowAddSupplierMiniModal(true)}
                    variant="ghost"
                    className="text-xs text-brand font-extrabold hover:underline flex items-center space-x-0.5 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Supplier Data</span>
                  </Button>
                </div>
                <CustomDropdownMenu
                  value={newPartData.supplierId || ''}
                  onChange={(supplierId) => {
                    const selectedSup = suppliers.find((supplier) => supplier.id === supplierId);
                    setNewPartData({
                      ...newPartData,
                      supplierId,
                      supplierName: selectedSup?.name || '',
                    });
                  }}
                  options={suppliers.map((supplier) => ({ value: supplier.id, label: supplier.name }))}
                  placeholder={suppliers.length ? 'Choose supplier name' : 'Add a supplier first'}
                  className="w-full"
                  buttonClassName="!h-8 !w-full !rounded-lg !border-line !bg-surface !px-2.5"
                  menuAlign="left"
                  size="md"
                />
              </div>

              <div>
                <label className="block font-bold text-ink mb-1">Cost Price ({currency})</label>
                <Input
                  type="number"
                  value={newPartData.costPrice || ''}
                  onChange={(e) => setNewPartData({ ...newPartData, costPrice: Number(e.target.value) })}
                  className="w-full rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs font-mono font-bold text-ink focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-ink mb-1">Selling Price ({currency})</label>
                <Input
                  type="number"
                  value={newPartData.sellingPrice || ''}
                  onChange={(e) => setNewPartData({ ...newPartData, sellingPrice: Number(e.target.value) })}
                  className="w-full rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs font-mono font-bold text-success-deep focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-ink mb-1">Initial Stock Qty</label>
                <Input
                  type="number"
                  value={newPartData.quantityInStock || ''}
                  onChange={(e) => setNewPartData({ ...newPartData, quantityInStock: Number(e.target.value) })}
                  className="w-full rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs font-mono text-ink focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <label className="block font-bold text-ink">Storage Location Bin</label>
                  {existingLocationBins.length > 0 && (
                    <span className="text-xs font-medium text-muted">{existingLocationBins.length} saved</span>
                  )}
                </div>
                <div className="relative">
                  <Input
                    type="text"
                    value={newPartData.locationBin || ''}
                    onFocus={(e) => {
                      setBinMenuAnchor(computeBinAnchor(e.currentTarget));
                      setIsLocationBinMenuOpen(true);
                    }}
                    onChange={(e) => {
                      setBinMenuAnchor(computeBinAnchor(e.currentTarget));
                      setNewPartData({ ...newPartData, locationBin: e.target.value });
                      setIsLocationBinMenuOpen(true);
                    }}
                    placeholder="Choose saved bin or type a new bin"
                    className="w-full rounded-lg border border-line bg-surface px-2.5 py-1.5 pr-8 text-xs font-mono text-ink focus:bg-white focus:outline-none"
                  />
                  <Button
                    type="button"
                    onClick={(e) => {
                      const wrap = e.currentTarget.closest('div.relative') as HTMLElement | null;
                      setBinMenuAnchor(computeBinAnchor(wrap || e.currentTarget));
                      setIsLocationBinMenuOpen((open) => !open);
                    }}
                    variant="ghost"
                    className="absolute right-1 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-muted hover:bg-white hover:text-brand"
                    title="Choose a saved bin"
                  >
                    <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isLocationBinMenuOpen ? 'rotate-180' : ''}`} />
                  </Button>
                  {isLocationBinMenuOpen && binMenuAnchor && (
                    <>
                      <div className="fixed inset-0 z-[70]" onClick={() => setIsLocationBinMenuOpen(false)} role="presentation" aria-hidden="true" />
                      <div
                        className="fixed z-[80] overflow-hidden rounded-lg border border-line bg-white p-1 shadow-lg"
                        style={{ top: binMenuAnchor.top, left: binMenuAnchor.left, width: binMenuAnchor.width }}
                      >
                      {existingLocationBins.length ? (
                        <div className="max-h-32 overflow-y-auto">
                          {existingLocationBins.map((bin) => (
                            <Button variant="ghost"
                              key={bin}
                              type="button"
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={() => {
                                setNewPartData({ ...newPartData, locationBin: bin });
                                setIsLocationBinMenuOpen(false);
                              }}
                              className="flex w-full items-center rounded-md px-2 py-1.5 text-left font-mono text-xs font-bold text-ink hover:bg-brand-soft hover:text-brand"
                            >
                              {bin}
                            </Button>
                          ))}
                        </div>
                      ) : (
                        <p className="px-2 py-2 text-xs text-muted">No saved bins yet — type a new bin above.</p>
                      )}
                    </div>
                    </>
                  )}
                </div>
              </div>

            </div>

            {/* Projected Margin Card */}
            {Boolean(newPartData.costPrice && newPartData.sellingPrice) && (
              <div className="p-2 bg-success/10 border border-success/30 rounded-xl flex items-center justify-between text-xs font-bold text-success-deep">
                <span>Projected Profit Margin per Unit:</span>
                <span className="font-mono text-sm">
                  +{(Number(newPartData.sellingPrice) - Number(newPartData.costPrice)).toLocaleString()} {currency}
                </span>
              </div>
            )}
            </div>

            <div className="flex shrink-0 justify-end space-x-2 border-t border-line bg-white px-4 py-2">
              <Button variant="ghost"
                type="button"
                onClick={() => setShowAddModal(false)}
                className="rounded-lg border border-line bg-white px-4 py-2 text-xs font-bold text-ink hover:bg-surface"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSaveNewPart}
                className="rounded-lg bg-brand px-4 py-2 text-xs font-extrabold text-white shadow-xs transition-all hover:bg-brand-deep active:scale-95"
              >
                Save Hardware Component
              </Button>
            </div>
            </div>

            {isDeviceModelChooserOpen && (
              <DeviceModelChooserModal
                embedded
                isOpen
                onClose={() => setIsDeviceModelChooserOpen(false)}
                selectedDevice={newPartData.deviceCompatibility?.[0] || ''}
                onSelectDevice={(model) => {
                  const existing = newPartData.deviceCompatibility || [];
                  if (existing.some((d) => d.toLowerCase() === model.toLowerCase())) {
                    setIsDeviceModelChooserOpen(false);
                    return;
                  }
                  applyPartSpecification({ deviceCompatibility: [...existing, model] });
                  setIsDeviceModelChooserOpen(false);
                }}
              />
            )}
          </div>
        </div>
      )}

      {/* MODAL: PART DETAILS */}
      <PartDetailsModal
        part={selectedPartForDetails}
        currency={currency}
        onUpdatePartStock={(partId, newStock) => {
          onUpdatePartStock(partId, newStock);
          setSelectedPartForDetails((prev) => (prev && prev.id === partId ? { ...prev, quantityInStock: Math.max(0, newStock) } : prev));
        }}
        onEdit={(part) => { setEditingPart(part); setSelectedPartForDetails(null); }}
        onWarranty={(part) => { setClaimingWarrantyPart(part); setSelectedPartForDetails(null); }}
        onDelete={(partId) => { onDeletePart?.(partId); setSelectedPartForDetails(null); }}
        onClose={() => setSelectedPartForDetails(null)}
      />

      {/* MODAL: EDIT PART DETAILS */}
      {editingPart && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-line rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-5 space-y-3 text-xs shadow-2xl">
            <div className="flex justify-between items-center border-b border-line pb-3">
              <h3 className="text-sm font-extrabold text-ink flex items-center space-x-2">
                <Edit2 className="w-4 h-4 text-brand" />
                <span>Edit Component: {editingPart.name}</span>
              </h3>
              <Button variant="ghost"
                onClick={() => setEditingPart(null)}
                className="text-muted hover:text-ink"
                aria-label="Close"
                title="Close"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-2.5">
              <div>
                <label className="block font-bold text-ink mb-1">Part Name</label>
                <Input
                  type="text"
                  value={editingPart.name}
                  onChange={(e) => setEditingPart({ ...editingPart, name: e.target.value })}
                  className="w-full bg-surface border border-line rounded-xl p-2.5 text-xs font-bold text-ink focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-ink mb-1">Compatible Devices</label>
                {editingPart.deviceCompatibility && editingPart.deviceCompatibility.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {editingPart.deviceCompatibility.map((device, idx) => (
                      <span key={device} className="inline-flex items-center gap-1 rounded-full border border-brand/30 bg-brand-soft px-2 py-0.5 text-xs font-bold text-brand-deep">
                        <Smartphone className="h-3 w-3 shrink-0" />
                        <span className="truncate max-w-[120px]">{device}</span>
                        <Button
                          type="button"
                          onClick={() => setEditingPart({ ...editingPart, deviceCompatibility: editingPart.deviceCompatibility.filter((_, i) => i !== idx) })}
                          className="ml-0.5 rounded-full p-0.5 hover:bg-brand/20 transition-colors"
                          title={`Remove ${device}`}
                          aria-label={`Remove ${device}`}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </span>
                    ))}
                  </div>
                )}
                <Button
                  type="button"
                  onClick={() => setIsEditDeviceChooserOpen(true)}
                  className="flex w-full cursor-pointer items-center gap-2 rounded-lg border border-dashed border-line bg-surface px-2.5 py-1.5 text-xs font-bold text-muted transition-colors hover:border-brand/40 hover:text-brand"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Device Model
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-ink mb-1">Current Stock Qty</label>
                  <Input
                    type="number"
                    value={editingPart.quantityInStock}
                    onChange={(e) => setEditingPart({ ...editingPart, quantityInStock: Number(e.target.value) })}
                    className="w-full bg-surface border border-line rounded-xl p-2.5 text-xs font-mono font-bold text-ink focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-ink mb-1">Reorder Point Threshold</label>
                  <Input
                    type="number"
                    value={editingPart.reorderPoint}
                    onChange={(e) => setEditingPart({ ...editingPart, reorderPoint: Number(e.target.value) })}
                    className="w-full bg-surface border border-line rounded-xl p-2.5 text-xs font-mono text-ink focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-ink mb-1">Cost Price ({currency})</label>
                  <Input
                    type="number"
                    value={editingPart.costPrice}
                    onChange={(e) => setEditingPart({ ...editingPart, costPrice: Number(e.target.value) })}
                    className="w-full bg-surface border border-line rounded-xl p-2.5 text-xs font-mono text-ink focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-ink mb-1">Selling Price ({currency})</label>
                  <Input
                    type="number"
                    value={editingPart.sellingPrice}
                    onChange={(e) => setEditingPart({ ...editingPart, sellingPrice: Number(e.target.value) })}
                    className="w-full bg-surface border border-line rounded-xl p-2.5 text-xs font-mono text-success-deep font-bold focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <label className="block font-bold text-ink">Storage Location Bin</label>
                  {existingLocationBins.length > 0 && (
                    <span className="text-xs font-medium text-muted">{existingLocationBins.length} saved</span>
                  )}
                </div>
                <div className="relative">
                  <Input
                    type="text"
                    value={editingPart.locationBin}
                    onFocus={(e) => {
                      setEditBinMenuAnchor(computeBinAnchor(e.currentTarget));
                      setIsEditLocationBinMenuOpen(true);
                    }}
                    onChange={(e) => {
                      setEditBinMenuAnchor(computeBinAnchor(e.currentTarget));
                      setEditingPart({ ...editingPart, locationBin: e.target.value });
                      setIsEditLocationBinMenuOpen(true);
                    }}
                    placeholder="Choose saved bin or type a new bin"
                    className="w-full bg-surface border border-line rounded-xl p-2.5 pr-9 text-xs font-mono text-ink focus:bg-white focus:outline-none"
                  />
                  <Button variant="ghost"
                    type="button"
                    onClick={(e) => {
                      const wrap = e.currentTarget.closest('div.relative') as HTMLElement | null;
                      setEditBinMenuAnchor(computeBinAnchor(wrap || e.currentTarget));
                      setIsEditLocationBinMenuOpen((open) => !open);
                    }}
                    className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-muted hover:bg-white hover:text-brand"
                    title="Choose a saved bin"
                  >
                    <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isEditLocationBinMenuOpen ? 'rotate-180' : ''}`} />
                  </Button>
                  {isEditLocationBinMenuOpen && editBinMenuAnchor && (
                    <>
                      <div className="fixed inset-0 z-[70]" onClick={() => setIsEditLocationBinMenuOpen(false)} role="presentation" aria-hidden="true" />
                      <div
                        className="fixed z-[80] overflow-hidden rounded-lg border border-line bg-white p-1 shadow-lg"
                        style={{ top: editBinMenuAnchor.top, left: editBinMenuAnchor.left, width: editBinMenuAnchor.width }}
                      >
                      {existingLocationBins.length ? (
                        <div className="max-h-32 overflow-y-auto">
                          {existingLocationBins.map((bin) => (
                            <Button variant="ghost"
                              key={bin}
                              type="button"
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={() => {
                                setEditingPart({ ...editingPart, locationBin: bin });
                                setIsEditLocationBinMenuOpen(false);
                              }}
                              className="flex w-full items-center rounded-md px-2 py-1.5 text-left font-mono text-xs font-bold text-ink hover:bg-brand-soft hover:text-brand"
                            >
                              {bin}
                            </Button>
                          ))}
                        </div>
                      ) : (
                        <p className="px-2 py-2 text-xs text-muted">No saved bins yet — type a new bin above.</p>
                      )}
                    </div>
                    </>
                  )}
                </div>
              </div>

              <div>
                <div className="mb-1 flex items-center">
                  <label className="block font-bold text-ink">Quality Tier</label>
                </div>
                <select
                  value={editingPart.qualityTier}
                  onChange={(e) => setEditingPart({ ...editingPart, qualityTier: e.target.value as any })}
                  className="w-full bg-surface border border-line rounded-xl p-2.5 text-xs font-bold text-ink focus:bg-white focus:outline-none"
                >
                  {customQualityTiers.map((tier) => (
                    <option key={tier} value={tier}>
                      {tier}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block font-bold text-ink">Supplier Name (For Warranty / RMA Claim) *</label>
                  <Button variant="ghost"
                    type="button"
                    onClick={() => setShowAddSupplierMiniModal(true)}
                    className="text-xs text-brand font-extrabold hover:underline flex items-center space-x-0.5 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Supplier Data</span>
                  </Button>
                </div>
                <CustomDropdownMenu
                  value={editingPart.supplierId || ''}
                  onChange={(supplierId) => {
                    const selectedSup = suppliers.find((s) => s.id === supplierId);
                    setEditingPart({
                      ...editingPart,
                      supplierId,
                      supplierName: selectedSup?.name || editingPart.supplierName,
                    });
                  }}
                  placeholder={suppliers.length ? 'Choose supplier name' : 'Add a supplier first'}
                  options={suppliers.map((s) => ({
                    value: s.id,
                    label: `${s.name} (${s.code})`,
                    badge: `${s.avgRmaTurnaroundDays}d`,
                  }))}
                  className="w-full"
                  buttonClassName="w-full rounded-xl bg-surface px-3 py-2.5 text-left text-xs font-bold text-ink"
                  menuAlign="left"
                />
              </div>

            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-line">
              <Button variant="ghost"
                type="button"
                onClick={() => setEditingPart(null)}
                className="px-4 py-2 bg-white border border-line text-ink font-bold rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSaveEditPart}
                className="px-4 py-2 bg-brand hover:bg-brand-deep text-white font-extrabold rounded-xl shadow-xs"
              >
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Device Model Chooser for Edit Part modal */}
      {isEditDeviceChooserOpen && editingPart && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <DeviceModelChooserModal
            isOpen
            onClose={() => setIsEditDeviceChooserOpen(false)}
            selectedDevice={editingPart.deviceCompatibility?.[0] || ''}
            onSelectDevice={(model) => {
              const existing = editingPart.deviceCompatibility || [];
              if (existing.some((d) => d.toLowerCase() === model.toLowerCase())) {
                setIsEditDeviceChooserOpen(false);
                return;
              }
              setEditingPart({ ...editingPart, deviceCompatibility: [...existing, model] });
              setIsEditDeviceChooserOpen(false);
            }}
          />
        </div>
      )}

      {/* MODAL: FILE PARTS WARRANTY CLAIM */}
      {claimingWarrantyPart && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-line rounded-2xl max-w-lg w-full p-5 space-y-4 text-xs shadow-2xl">
            <div className="flex justify-between items-center border-b border-line pb-3">
              <h3 className="text-base font-extrabold text-ink flex items-center space-x-2">
                <ShieldAlert className="w-5 h-5 text-warning" />
                <span>File Parts Warranty Claim (RMA)</span>
              </h3>
              <Button variant="ghost"
                onClick={() => setClaimingWarrantyPart(null)}
                className="text-muted hover:text-ink p-1 rounded-lg"
                aria-label="Close"
                title="Close"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Part Details Summary Banner */}
            <div className="p-3 bg-warning/10 border border-warning/30 rounded-xl space-y-1">
              <p className="font-extrabold text-warning text-xs">
                Component: {claimingWarrantyPart.name}
              </p>
              <p className="text-xs text-warning font-mono">
                SKU: {claimingWarrantyPart.sku} | Quality: {claimingWarrantyPart.qualityTier} | Stock: {claimingWarrantyPart.quantityInStock} units
              </p>
            </div>

            <div className="space-y-3">
              {/* Supplier Selection for Warranty Claim */}
              <div>
                <label className="block font-bold text-ink mb-1">Select Supplier Name for Claim *</label>
                <select
                  value={warrantyForm.supplierId}
                  onChange={(e) => {
                    const selectedSup = suppliers.find((s) => s.id === e.target.value);
                    setWarrantyForm({
                      ...warrantyForm,
                      supplierId: e.target.value,
                      supplierName: selectedSup?.name || e.target.value,
                    });
                  }}
                  className="w-full bg-surface border border-line rounded-xl p-2.5 text-xs font-bold text-ink focus:bg-white focus:outline-none"
                >
                  {/* audit C-P2: "keep current" placeholder — submitting without
                      changing the select must NOT wipe the part's supplier. */}
                  <option value="">
                    {claimingWarrantyPart.supplierId ? `Keep current supplier (${claimingWarrantyPart.supplierName || claimingWarrantyPart.supplierId})` : 'No supplier on this part — pick one…'}
                  </option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code}) - Avg RMA: {s.avgRmaTurnaroundDays}d
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-ink mb-1">Claim Quantity</label>
                  <Input
                    type="number"
                    min={1}
                    max={claimingWarrantyPart.quantityInStock || 99}
                    value={warrantyForm.quantity}
                    onChange={(e) => setWarrantyForm({ ...warrantyForm, quantity: Number(e.target.value) })}
                    className="w-full bg-surface border border-line rounded-xl p-2.5 text-xs font-mono font-bold text-ink"
                  />
                </div>

                <div>
                  <label className="block font-bold text-ink mb-1">Unit Cost ({currency})</label>
                  <Input
                    type="number"
                    value={warrantyForm.unitCost}
                    onChange={(e) => setWarrantyForm({ ...warrantyForm, unitCost: Number(e.target.value) })}
                    className="w-full bg-surface border border-line rounded-xl p-2.5 text-xs font-mono font-bold text-ink"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-ink mb-1">Defect / Warranty Reason *</label>
                <select
                  value={PRESET_WARRANTY_REASONS.includes(warrantyForm.reason) ? warrantyForm.reason : ''}
                  onChange={(e) => {
                    if (e.target.value) setWarrantyForm({ ...warrantyForm, reason: e.target.value });
                  }}
                  className="w-full bg-surface border border-line rounded-xl p-2.5 text-xs font-medium text-ink mb-2"
                >
                  <option value="" disabled>Choose a preset reason or type one below…</option>
                  <option value="Screen touch unresponsive / ghost touching">Screen touch unresponsive / ghost touching</option>
                  <option value="Display flickering / dead pixels / lines">Display flickering / dead pixels / lines</option>
                  <option value="Battery swelling / rapid discharge / non-charging">Battery swelling / rapid discharge / non-charging</option>
                  <option value="FPC connector damaged / loose fit">FPC connector damaged / loose fit</option>
                  <option value="DOA (Dead On Arrival) / No power">DOA (Dead On Arrival) / No power</option>
                  <option value="Wrong part delivered / mislabeled">Wrong part delivered / mislabeled</option>
                </select>
                <Input
                  type="text"
                  value={warrantyForm.reason}
                  onChange={(e) => setWarrantyForm({ ...warrantyForm, reason: e.target.value })}
                  placeholder="Or type custom warranty reason..."
                  className="w-full bg-surface border border-line rounded-xl p-2 text-xs text-ink"
                />
              </div>

              <div>
                <label className="block font-bold text-ink mb-1">Return Tracking / RMA Reference Number</label>
                <Input
                  type="text"
                  value={warrantyForm.trackingNumber}
                  onChange={(e) => setWarrantyForm({ ...warrantyForm, trackingNumber: e.target.value })}
                  placeholder="e.g. 1Z9999990199887766 or RMA-8891"
                  className="w-full bg-surface border border-line rounded-xl p-2.5 text-xs font-mono text-ink"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-line">
              <Button variant="ghost"
                type="button"
                onClick={() => setClaimingWarrantyPart(null)}
                className="px-4 py-2 bg-white border border-line text-ink font-bold rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSubmitWarrantyClaim}
                className="px-4 py-2 bg-warning hover:brightness-95 text-white font-extrabold rounded-xl shadow-xs flex items-center space-x-1.5 cursor-pointer"
              >
                <ShieldAlert className="w-4 h-4" />
                <span>File Warranty Claim</span>
              </Button>
            </div>
          </div>
        </div>
      )}


      {/* MINI MODAL: QUICK ADD SUPPLIER */}
      {showAddSupplierMiniModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <form onSubmit={handleCreateSupplier} className="bg-white border border-line rounded-2xl max-w-md w-full p-5 space-y-4 text-xs shadow-2xl">
            <div className="flex justify-between items-center border-b border-line pb-2">
              <h4 className="font-extrabold text-ink text-sm flex items-center space-x-1.5">
                <Truck className="w-4 h-4 text-brand" />
                <span>Quick Register Supplier Vendor</span>
              </h4>
              <Button variant="ghost"
                type="button"
                onClick={() => setShowAddSupplierMiniModal(false)}
                className="text-muted hover:text-ink"
                aria-label="Close"
                title="Close"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block font-bold text-ink mb-1">Supplier Name *</label>
                <Input
                  type="text"
                  required
                  value={newSupplierForm.name}
                  onChange={(e) => setNewSupplierForm({ ...newSupplierForm, name: e.target.value })}
                  placeholder="e.g. MobileSentrix USA"
                  className="w-full bg-surface border border-line rounded-xl p-2 text-xs font-bold text-ink"
                />
              </div>
              <div>
                <label className="block font-bold text-ink mb-1">Supplier Short Code *</label>
                <Input
                  type="text"
                  required
                  value={newSupplierForm.code}
                  onChange={(e) => setNewSupplierForm({ ...newSupplierForm, code: e.target.value })}
                  placeholder="e.g. MS-US"
                  className="w-full bg-surface border border-line rounded-xl p-2 text-xs font-mono font-bold text-ink"
                />
              </div>
              <div>
                <label className="block font-bold text-ink mb-1">Avg RMA Turnaround (Days)</label>
                <Input
                  type="number"
                  value={newSupplierForm.avgRmaTurnaroundDays}
                  onChange={(e) => setNewSupplierForm({ ...newSupplierForm, avgRmaTurnaroundDays: Number(e.target.value) })}
                  className="w-full bg-surface border border-line rounded-xl p-2 text-xs font-mono text-ink"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2 pt-2 border-t border-line">
              <Button variant="ghost"
                type="button"
                onClick={() => setShowAddSupplierMiniModal(false)}
                className="px-3 py-2 bg-white border border-line text-ink font-bold rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="px-4 py-2 bg-brand text-white font-extrabold rounded-xl shadow-xs"
              >
                Save Supplier
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* MINI MODAL: QUICK ADD QUALITY TIER */}


      {/* EDIT SUPPLIER MODAL */}
      {editingSupplier && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <form onSubmit={handleSaveEditSupplier} className="bg-white border border-line rounded-2xl max-w-md w-full p-5 space-y-4 text-xs shadow-2xl">
            <div className="flex justify-between items-center border-b border-line pb-2">
              <h4 className="font-extrabold text-ink text-sm flex items-center space-x-1.5">
                <Truck className="w-4 h-4 text-brand" />
                <span>Edit Supplier Vendor</span>
              </h4>
              <Button variant="ghost"
                type="button"
                onClick={() => setEditingSupplier(null)}
                className="text-muted hover:text-ink"
                aria-label="Close"
                title="Close"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block font-bold text-ink mb-1">Supplier Name *</label>
                <Input
                  type="text"
                  required
                  value={editingSupplier.name}
                  onChange={(e) => setEditingSupplier({ ...editingSupplier, name: e.target.value })}
                  className="w-full bg-surface border border-line rounded-xl p-2 text-xs font-bold text-ink"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-ink mb-1">Short Code *</label>
                  <Input
                    type="text"
                    required
                    value={editingSupplier.code}
                    onChange={(e) => setEditingSupplier({ ...editingSupplier, code: e.target.value })}
                    className="w-full bg-surface border border-line rounded-xl p-2 text-xs font-mono font-bold text-ink"
                  />
                </div>
                <div>
                  <label className="block font-bold text-ink mb-1">Phone Number</label>
                  <Input
                    type="text"
                    value={editingSupplier.phone}
                    onChange={(e) => setEditingSupplier({ ...editingSupplier, phone: e.target.value })}
                    className="w-full bg-surface border border-line rounded-xl p-2 text-xs text-ink"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-ink mb-1">Contact Email</label>
                <Input
                  type="email"
                  value={editingSupplier.contactEmail}
                  onChange={(e) => setEditingSupplier({ ...editingSupplier, contactEmail: e.target.value })}
                  className="w-full bg-surface border border-line rounded-xl p-2 text-xs text-ink"
                />
              </div>

              <div>
                <label className="block font-bold text-ink mb-1">Avg RMA Turnaround (Days)</label>
                <Input
                  type="number"
                  value={editingSupplier.avgRmaTurnaroundDays}
                  onChange={(e) => setEditingSupplier({ ...editingSupplier, avgRmaTurnaroundDays: Number(e.target.value) })}
                  className="w-full bg-surface border border-line rounded-xl p-2 text-xs text-ink"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-line">
              <Button variant="ghost"
                type="button"
                onClick={() => setEditingSupplier(null)}
                className="px-3 py-2 bg-white border border-line text-ink font-bold rounded-xl cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="px-4 py-2 bg-brand hover:bg-brand-deep text-white font-extrabold rounded-xl shadow-xs cursor-pointer"
              >
                Save Changes
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* EDIT QUALITY TIER MODAL */}


      {showInlineSaveConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-3xl space-y-4 rounded-2xl border border-line-strong bg-white p-5 text-xs shadow-2xl">
            {(() => {
              const totalChangeCount = inlineSaveReview.reduce((count, item) => count + item.changes.length, 0);
              return (
                <>
            <div className="flex items-start justify-between gap-2 border-b border-line pb-2">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-brand">Confirm stock changes</p>
                <h3 className="mt-0.5 text-sm font-black text-ink">Review before saving</h3>
                <p className="mt-0.5 text-xs font-semibold text-ink">Approve only when the list below looks right.</p>
              </div>
              <Button variant="ghost" type="button" onClick={() => setShowInlineSaveConfirm(false)} aria-label="Close inline save confirmation" title="Close" className="rounded-lg p-1 text-ink hover:bg-surface hover:text-brand">
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-line bg-surface px-3 py-2">
                <p className="text-xs font-bold uppercase tracking-wide text-muted">Total changes</p>
                <p className="mt-0.5 text-sm font-black text-ink">{totalChangeCount}</p>
              </div>
              <div className="rounded-xl border border-line bg-surface px-3 py-2">
                <p className="text-xs font-bold uppercase tracking-wide text-muted">Rows affected</p>
                <p className="mt-0.5 text-sm font-black text-ink">{inlineSaveReview.length}</p>
              </div>
            </div>

            <div className="max-h-[52vh] space-y-2.5 overflow-y-auto pr-1">
              {inlineSaveReview.length ? (
                inlineSaveReview.map(({ part, changes }) => (
                  <div key={part.id} className="rounded-xl border border-line bg-white p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-black text-ink">{part.name}</p>
                        <p className="mt-0.5 font-mono text-xs font-bold text-ink">{part.sku}</p>
                      </div>
                      <span className="rounded-full bg-brand-soft px-2 py-0.5 text-xs font-extrabold text-brand">{changes.length} change{changes.length === 1 ? '' : 's'}</span>
                    </div>
                    <div className="mt-2 grid gap-1.5">
                      {changes.map((change) => (
                        <div key={`${part.id}-${change.label}`} className="flex items-center justify-between gap-2 rounded-lg bg-surface px-2.5 py-1.5">
                          <span className="text-xs font-bold uppercase tracking-wide text-ink">{change.label}</span>
                          <span className="font-mono text-xs font-black text-ink">{change.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-line-strong bg-white p-4 text-center">
                  <p className="text-xs font-bold text-ink">No pending changes to save.</p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-line pt-3">
              <Button variant="ghost"
                type="button"
                onClick={() => setShowInlineSaveConfirm(false)}
                className="rounded-lg border border-line bg-white px-4 py-2 text-xs font-bold text-ink hover:bg-surface"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={confirmInlineSave}
                disabled={!inlineSaveReview.length || isInlineSaving}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-5 py-2 text-xs font-extrabold text-white shadow-xs transition-all hover:bg-brand-deep disabled:cursor-not-allowed disabled:bg-faint"
              >
                {isInlineSaving && <span className="h-3 w-3 rounded-full border-2 border-white/40 border-t-white animate-spin" />}
                {isInlineSaving ? 'Saving…' : 'Approve & Save'}
              </Button>
            </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* PRINT: Ground Stock Checking Matrix Sheet */}
      {/* PRINT: Ground Stock Matrix */}
      <MatrixPrintSheet
        isOpen={isMatrixPrintOpen}
        ownerParts={ownerParts}
        matrixModels={matrixModels}
        matrixCategories={matrixCategories}
        matrixMergeGroups={matrixMergeGroups}
        matrixGrandTotal={matrixGrandTotal}
        matrixCategoryTotals={matrixCategoryTotals}
        onClose={() => setIsMatrixPrintOpen(false)}
      />

      {/* PRINT: A4 Spare Parts Tags */}
      <TagsPrintSheet
        isOpen={isTagsPrintOpen}
        parts={filteredParts}
        currency={currency}
        selectedTagIds={selectedTagIds}
        setSelectedTagIds={setSelectedTagIds}
        onClose={() => setIsTagsPrintOpen(false)}
      />

      {/* Purchase-order draft preview (Ko Hein 2026-08-24): supplier-grouped
          reorder review BEFORE jumping to Suppliers — no blind select-all. */}
      {poDraftOpen && (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-sm p-0 sm:p-4" role="dialog" aria-modal="true" aria-label="Purchase order draft">
          <div className="flex max-h-[92dvh] w-full flex-col rounded-t-3xl sm:rounded-2xl bg-white shadow-2xl sm:max-w-2xl overflow-hidden">
            <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3 shrink-0">
              <div className="min-w-0">
                <h3 className="text-sm font-extrabold text-ink">Purchase Order Draft</h3>
                <p className="text-xs text-muted truncate">Review what to reorder, grouped by supplier</p>
              </div>
              <Button type="button" variant="iconGhost" onClick={() => setPoDraftOpen(false)} aria-label="Close" className="p-1.5 text-muted hover:text-ink rounded-lg cursor-pointer">
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {/* Scope toggle — never auto-selects everything (Ko Hein 2026-08-24) */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-extrabold uppercase tracking-wide text-muted">Scope:</span>
                {(['OUT', 'LOW'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      setPoScope(s);
                      const ids = new Set(
                        (s === 'OUT'
                          ? parts.filter((p) => Number(p.quantityInStock) === 0)
                          : parts.filter((p) => Number(p.quantityInStock) > 0 && Number(p.quantityInStock) <= Number(p.reorderPoint))
                        ).map((p) => p.id)
                      );
                      setPoSelected(ids);
                    }}
                    className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                      poScope === s ? (s === 'OUT' ? 'bg-danger text-white shadow-2xs' : 'bg-warning text-white shadow-2xs') : 'bg-surface text-muted hover:bg-line hover:text-ink'
                    }`}
                  >
                    {s === 'OUT' ? `Out of stock (${parts.filter((p) => Number(p.quantityInStock) === 0).length})` : `Below reorder (${parts.filter((p) => Number(p.quantityInStock) > 0 && Number(p.quantityInStock) <= Number(p.reorderPoint)).length})`}
                  </button>
                ))}
                <span className="ml-auto text-[10px] font-bold text-muted">{poSelected.size} selected</span>
              </div>

              {/* Duplicate-PO warning */}
              {poDuplicateSkus.length > 0 && (
                <div className="flex items-start gap-2 rounded-xl border border-warning/40 bg-warning/10 px-3 py-2 text-xs">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-warning mt-0.5" />
                  <p className="text-warning font-bold">
                    {poDuplicateSkus.length} part{poDuplicateSkus.length > 1 ? 's' : ''} already on a Draft/Sent purchase order:{' '}
                    <span className="font-mono">{poDuplicateSkus.slice(0, 4).join(', ')}{poDuplicateSkus.length > 4 ? ` +${poDuplicateSkus.length - 4}` : ''}</span>
                  </p>
                </div>
              )}

              {/* Supplier-grouped list */}
              {poSupplierGroups.length === 0 ? (
                <p className="text-center text-xs font-bold text-muted py-6">No parts in this scope.</p>
              ) : (
                poSupplierGroups.map(([supplier, items]) => {
                  const subTotal = items.reduce((sum, p) => sum + (poSelected.has(p.id) ? (poQty[p.id] || suggestQty(p)) * (Number(p.costPrice) || 0) : 0), 0);
                  return (
                    <div key={supplier} className="rounded-xl border border-line bg-surface/60 overflow-hidden">
                      <div className="flex items-center justify-between gap-2 border-b border-line bg-white px-3 py-2">
                        <span className="text-xs font-extrabold text-ink truncate">{supplier}</span>
                        <span className="text-xs font-mono font-black text-ink shrink-0">{subTotal.toLocaleString()} {currency}</span>
                      </div>
                      <div className="divide-y divide-line">
                        {items.map((p) => {
                          const checked = poSelected.has(p.id);
                          const qty = poQty[p.id] || suggestQty(p);
                          return (
                            <div key={p.id} className="flex items-center gap-2 px-3 py-2">
                              <Input
                                type="checkbox"
                                checked={checked}
                                onChange={() => setPoSelected((prev) => { const next = new Set(prev); if (next.has(p.id)) next.delete(p.id); else next.add(p.id); return next; })}
                                aria-label={`Include ${p.name}`}
                                className="accent-brand w-3.5 h-3.5 shrink-0 cursor-pointer"
                              />
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-bold text-ink">{p.name}</p>
                                <p className="truncate font-mono text-[10px] text-muted">SKU {p.sku} · stock {p.quantityInStock} · reorder {p.reorderPoint}</p>
                              </div>
                              <label className="flex items-center gap-1 text-[10px] font-bold text-muted shrink-0">
                                Qty
                                <Input
                                  type="number"
                                  min={1}
                                  value={qty}
                                  onChange={(e) => setPoQty((prev) => ({ ...prev, [p.id]: Math.max(1, Number(e.target.value) || 1) }))}
                                  className="w-14 rounded-md border border-line bg-white px-1.5 py-1 text-xs font-mono font-bold text-ink"
                                  aria-label={`Quantity for ${p.name}`}
                                />
                              </label>
                              <span className="w-20 text-right font-mono text-[11px] font-bold text-ink shrink-0">{(checked ? qty * (Number(p.costPrice) || 0) : 0).toLocaleString()} {currency}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="shrink-0 border-t border-line bg-white px-4 py-3 flex items-center justify-between gap-3">
              <div className="text-xs">
                <span className="text-muted font-bold">Estimated cost: </span>
                <span className="font-mono font-black text-ink">{poTotal.toLocaleString()} {currency}</span>
                <span className="block text-[10px] text-muted">{poSelected.size} part{poSelected.size !== 1 ? 's' : ''} · group by supplier on review</span>
              </div>
              <Button
                type="button"
                onClick={() => { setPoDraftOpen(false); onNavigateToTab?.('suppliers'); }}
                className="bg-brand hover:bg-brand-deep text-white text-xs font-extrabold rounded-xl px-3.5 py-2"
              >
                Review in Suppliers
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
