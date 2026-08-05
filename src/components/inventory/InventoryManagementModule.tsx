import React, { useEffect, useState, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  Boxes, 
  Plus, 
  AlertTriangle, 
  Layers, 
  Tag, 
  ShieldCheck, 
  ShieldAlert,
  Truck,
  RotateCcw,
  FileText,
  Cpu, 
  MapPin, 
  Smartphone, 
  RefreshCw,
  Grid,
  LayoutGrid,
  List,
  DollarSign,
  TrendingUp,
  PackageCheck,
  PackageX,
  Filter,
  Check,
  Building2,
  Sparkles,
  ArrowRight,
  Edit2,
  Eye,
  Trash2,
  X,
  Settings,
  Globe,
  Phone,
  Mail,
  Star,
  PlusCircle,
  Palette,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Printer,
  ScanLine
} from 'lucide-react';
import { PartItem, PartQualityTier, Supplier, SystemSettings, RmaItem } from '../../types';
import { CustomDropdownMenu } from '../common/CustomDropdownMenu';
import { DeviceModelChooserModal } from '../devices/DeviceModelChooserModal';
import { getAvailableColorsForModel, getRealisticColorStyle } from '../intake/deviceData';
import { toast } from '../../lib/toast';
import { sortModelsNewestFirst, compareModelsNewestFirst } from '../../utils/modelSort';
import JsBarcode from 'jsbarcode';

const isSameDeviceModel = (left: string, right: string) =>
  left.trim().toLocaleLowerCase() === right.trim().toLocaleLowerCase();

// Small sort-direction indicator for sortable table headers
const SortArrow: React.FC<{ dir: 'asc' | 'desc' }> = ({ dir }) => (
  <svg
    className={`w-3 h-3 shrink-0 ${dir === 'asc' ? 'text-[#0071E3]' : 'text-[#0071E3] rotate-180'}`}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M6 9l6-6 6 6" />
  </svg>
);

const DEFAULT_QUALITY_TIERS = [
  'Original',
  'OEM',
  'Genuine',
];

type InlineDraft = {
  quantityInStock?: string;
  reorderPoint?: string;
  costPrice?: string;
  sellingPrice?: string;
  locationBin?: string;
  supplierId?: string;
};

interface InventoryManagementModuleProps {
  parts: PartItem[];
  suppliers: Supplier[];
  systemSettings?: SystemSettings;
  deviceModels?: string[];
  inventoryCategories?: string[];
  onAddPart: (part: PartItem) => void;
  onUpdatePart?: (part: PartItem) => void;
  onAddRma?: (rma: RmaItem) => void;
  onAddSupplier?: (supplier: Supplier) => void;
  onUpdateSupplier?: (supplier: Supplier) => void;
  onDeleteSupplier?: (supplierId: string) => void;
  onDeletePart?: (partId: string) => void;
  onUpdatePartStock: (partId: string, newStock: number) => void;
  searchQuery: string;
  setSearchQuery?: (q: string) => void;
  selectedCategory?: string;
  setSelectedCategory?: (c: string) => void;
  selectedQuality?: string;
  setSelectedQuality?: (q: string) => void;
  showAddModal?: boolean;
  setShowAddModal?: (s: boolean) => void;
}

/** Renders a scannable CODE128 barcode for a part (SKU fallback id). */
const PartBarcode: React.FC<{ value: string; height?: number }> = ({ value, height = 22 }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  useEffect(() => {
    if (!svgRef.current || !value) return;
    try {
      JsBarcode(svgRef.current, value, {
        format: 'CODE128',
        width: 1,
        height,
        displayValue: false,
        margin: 0,
        background: '#ffffff',
        lineColor: '#000000',
      });
    } catch {
      // Invalid barcode value — leave blank
    }
  }, [value, height]);
  return <svg ref={svgRef} className="h-full w-full" preserveAspectRatio="xMidYMid meet" />;
};

/** Split parts into A4 pages of at most 18 tags (3 cols x 6 rows). */
function paginateTags(parts: PartItem[], perPage = 18): PartItem[][] {
  const pages: PartItem[][] = [];
  for (let i = 0; i < parts.length; i += perPage) {
    pages.push(parts.slice(i, i + perPage));
  }
  return pages;
}

export const InventoryManagementModule: React.FC<InventoryManagementModuleProps> = ({
  parts,
  suppliers,
  systemSettings,
  deviceModels,
  inventoryCategories = [],
  onAddPart,
  onUpdatePart,
  onAddRma,
  onAddSupplier,
  onUpdateSupplier,
  onDeleteSupplier,
  onDeletePart,
  onUpdatePartStock,
  searchQuery,
  setSearchQuery: propSetSearchQuery,
  selectedCategory: propSelectedCategory,
  setSelectedCategory: propSetSelectedCategory,
  selectedQuality: propSelectedQuality,
  setSelectedQuality: propSetSelectedQuality,
  showAddModal: propShowAddModal,
  setShowAddModal: propSetShowAddModal,
}) => {
  const [localQuality, setLocalQuality] = useState<string>('ALL');
  const [localCategory, setLocalCategory] = useState<string>('ALL');
  const [selectedModelFilter, setSelectedModelFilter] = useState<string>('ALL');
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
  const [viewMode, setViewMode] = useState<'stock' | 'profit' | 'matrix'>('stock');
  const [isMatrixPrintOpen, setIsMatrixPrintOpen] = useState(false);
  const [isTagsPrintOpen, setIsTagsPrintOpen] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set());
  const [inlineEditMode, setInlineEditMode] = useState(false);
  // Phones default to the card grid — the stock table is unusable below md.
  const [stockView, setStockView] = useState<'table' | 'cards'>('table');
  const [inlineDrafts, setInlineDrafts] = useState<Record<string, InlineDraft>>({});
  const [showInlineSaveConfirm, setShowInlineSaveConfirm] = useState(false);
  const [isInlineSaving, setIsInlineSaving] = useState(false);
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  // Supplier & Quality Tier Edit States
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [editingQualityTier, setEditingQualityTier] = useState<{ oldName: string; newName: string } | null>(null);

  // Tiers are managed centrally in System Management and synchronised with Supabase.
  const customQualityTiers = DEFAULT_QUALITY_TIERS;
  // Legacy modal handlers remain mounted only while the inventory page is open;
  // management now lives in System Management and is intentionally read-only here.
  const setCustomQualityTiers = (_tiers: string[]) => undefined;

  // Mini modals for quick-add inside Part Add/Edit forms
  const [showAddSupplierMiniModal, setShowAddSupplierMiniModal] = useState(false);
  const [showAddQualityMiniModal, setShowAddQualityMiniModal] = useState(false);

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
  const [newQualityForm, setNewQualityForm] = useState({
    name: '',
  });

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

  const handleCreateQualityTier = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const name = newQualityForm.name.trim();
    if (!name) return;
    if (customQualityTiers.some((t) => t.toLowerCase() === name.toLowerCase())) {
      return;
    }
    const updated = [...customQualityTiers, name];
    setCustomQualityTiers(updated);
    try {
      localStorage.setItem('custom_quality_tiers', JSON.stringify(updated));
    } catch (err) {
      console.error(err);
    }
    setNewQualityForm({ name: '' });
    setShowAddQualityMiniModal(false);
  };

  const handleSaveEditSupplier = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editingSupplier || !editingSupplier.name.trim()) return;
    if (onUpdateSupplier) {
      onUpdateSupplier(editingSupplier);
    }
    setEditingSupplier(null);
  };

  const handleDeleteSupplierClick = (supplierId: string, _supplierName: string) => {
    if (onDeleteSupplier) {
      onDeleteSupplier(supplierId);
    }
  };

  const handleSaveEditQualityTier = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!editingQualityTier) return;
    const oldName = editingQualityTier.oldName;
    const newName = editingQualityTier.newName.trim();
    if (!newName) return;
    if (oldName !== newName && customQualityTiers.some((t) => t.toLowerCase() === newName.toLowerCase())) {
      return;
    }
    const updated = customQualityTiers.map((t) => (t === oldName ? newName : t));
    setCustomQualityTiers(updated);
    try {
      localStorage.setItem('custom_quality_tiers', JSON.stringify(updated));
    } catch (err) {
      console.error(err);
    }
    if (onUpdatePart) {
      parts.forEach((p) => {
        if (p.qualityTier === oldName) {
          onUpdatePart({ ...p, qualityTier: newName as PartQualityTier });
        }
      });
    }
    setEditingQualityTier(null);
  };

  const handleDeleteQualityTierClick = (tierName: string) => {
    const updated = customQualityTiers.filter((t) => t !== tierName);
    setCustomQualityTiers(updated);
    try {
      localStorage.setItem('custom_quality_tiers', JSON.stringify(updated));
    } catch (err) {
      console.error(err);
    }
    if (onUpdatePart && updated.length > 0) {
      const fallbackTier = updated[0];
      parts.forEach((p) => {
        if (p.qualityTier === tierName) {
          onUpdatePart({ ...p, qualityTier: fallbackTier as PartQualityTier });
        }
      });
    }
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
  const [scanQuery, setScanQuery] = useState('');
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
      ['Part Name', 'SKU', 'Category', 'Quality', 'Stock', 'Reorder Point', 'Cost (MMK)', 'Selling (MMK)', 'Bin'],
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
    const input = window.prompt(`Set reorder point for ${selectedParts.length} selected part(s) to:`);
    const value = Number(input);
    if (input === null || Number.isNaN(value) || value < 0) return;
    selectedParts.forEach((p) => {
      onUpdatePart?.({ ...p, reorderPoint: value });
    });
    toast.success(`Reorder point set to ${value} for ${selectedParts.length} part(s)`, 'Bulk Update');
    clearSelection();
  };
  const bulkDelete = () => {
    if (!window.confirm(`Delete ${selectedParts.length} selected part(s)? This cannot be undone.`)) return;
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
      toast.success(`Scanned: ${match.name}`, 'Part Found');
    } else {
      toast.error(`No part with SKU "${scanQuery.trim()}"`, 'Scan Not Found');
    }
    setScanQuery('');
    // Keep focus so the next scan lands in the same box.
    requestAnimationFrame(() => scanInputRef.current?.focus());
  };
  const [isDeviceModelChooserOpen, setIsDeviceModelChooserOpen] = useState(false);
  const [isLocationBinMenuOpen, setIsLocationBinMenuOpen] = useState(false);
  const [isEditLocationBinMenuOpen, setIsEditLocationBinMenuOpen] = useState(false);

  // Warranty Claim Modal state
  const [claimingWarrantyPart, setClaimingWarrantyPart] = useState<PartItem | null>(null);
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

  const handleOpenWarrantyModal = (part: PartItem) => {
    setClaimingWarrantyPart(part);
    const matchedSup = suppliers.find((s) => s.id === part.supplierId) || suppliers[0];
    setWarrantyForm({
      supplierId: matchedSup?.id || part.supplierId || 'sup-1',
      supplierName: matchedSup?.name || part.supplierName || 'MobileSentrix OEM',
      quantity: 1,
      reason: 'Screen touch unresponsive / defect after installation',
      trackingNumber: `RMA-${Date.now().toString().slice(-6)}`,
      unitCost: part.costPrice || 0,
    });
  };

  const handleSubmitWarrantyClaim = () => {
    if (!claimingWarrantyPart) return;
    const selectedSup = suppliers.find((s) => s.id === warrantyForm.supplierId);
    const resolvedSupName = selectedSup?.name || warrantyForm.supplierName || 'Supplier Vendor';

    const rmaRecord: RmaItem = {
      id: `rma-${Date.now()}`,
      rmaNumber: `RMA-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      partId: claimingWarrantyPart.id,
      partName: claimingWarrantyPart.name,
      partQuality: claimingWarrantyPart.qualityTier,
      supplierId: warrantyForm.supplierId || selectedSup?.id || 'sup-1',
      supplierName: resolvedSupName,
      quantity: Number(warrantyForm.quantity) || 1,
      unitCost: Number(warrantyForm.unitCost) || claimingWarrantyPart.costPrice,
      reason: warrantyForm.reason || 'Parts Warranty Claim',
      status: 'Shipped to Vendor',
      trackingNumber: warrantyForm.trackingNumber || '',
      createdAt: new Date().toISOString(),
    };

    if (onAddRma) {
      onAddRma(rmaRecord);
    }

    if (onUpdatePart && (claimingWarrantyPart.supplierId !== warrantyForm.supplierId || claimingWarrantyPart.supplierName !== resolvedSupName)) {
      onUpdatePart({
        ...claimingWarrantyPart,
        supplierId: warrantyForm.supplierId,
        supplierName: resolvedSupName,
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
  });

  const categories = useMemo(() => {
    return [...new Set(inventoryCategories.filter(Boolean))];
  }, [inventoryCategories]);

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
    const model = part.deviceCompatibility?.[0]?.trim();
    const category = part.category?.trim();
    const quality = part.qualityTier?.trim();
    const isBackGlass = Boolean(category && /back\s*glass/i.test(category));
    const color = isBackGlass ? part.backGlassColor?.trim() : '';
    return model && category && quality ? [model, category, color, quality].filter(Boolean).join(' - ') : '';
  };

  const generatePartSku = (part: Partial<PartItem>) => {
    const model = part.deviceCompatibility?.[0]?.trim();
    const category = part.category?.trim();
    const quality = part.qualityTier?.trim();
    const isBackGlass = Boolean(category && /back\s*glass/i.test(category));
    const color = isBackGlass ? part.backGlassColor?.trim() : '';
    if (!model || !category || !quality || (isBackGlass && !color)) return '';

    const toSkuCode = (value: string) => value
      .replace(/iPhone/gi, 'IP')
      .replace(/Apple Watch/gi, 'AW')
      .replace(/MacBook/gi, 'MB')
      .replace(/iPad/gi, 'IPAD')
      .replace(/[^a-z0-9]+/gi, '')
      .toUpperCase();

    return [model, category, color, quality].filter(Boolean).map(toSkuCode).join('-');
  };

  const applyPartSpecification = (changes: Partial<PartItem>) => {
    setNewPartData((current) => {
      const next = { ...current, ...changes };
      if (changes.category !== undefined && !/back\s*glass/i.test(changes.category)) {
        next.backGlassColor = undefined;
      }
      if (changes.deviceCompatibility !== undefined && /back\s*glass/i.test(next.category || '')) {
        next.backGlassColor = undefined;
      }
      return {
        ...next,
        name: generatePartName(next) || current.name || '',
        sku: generatePartSku(next) || current.sku || '',
      };
    });
  };

  const isBackGlassCategory = /back\s*glass/i.test(newPartData.category || '');
  const selectedPartModel = newPartData.deviceCompatibility?.[0] || '';
  const availableBackGlassColors = selectedPartModel ? getAvailableColorsForModel(selectedPartModel) : [];
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
      totals[category] = parts
        .filter((p) => p.category === category)
        .reduce((sum, p) => sum + Number(p.quantityInStock || 0), 0);
    });
    return totals;
  }, [matrixCategories, parts]);

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
      const currentModel = current.deviceCompatibility?.[0] || '';
      const deviceCompatibility = activeDeviceModels.includes(currentModel)
        ? current.deviceCompatibility
        : [];
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
    const apply = () => {
      if (window.innerWidth < 768) setStockView('cards');
    };
    apply();
    window.addEventListener('resize', apply);
    return () => window.removeEventListener('resize', apply);
  }, []);

  // Analytics Metrics
  const metrics = useMemo(() => {
    const totalCount = parts.length;
    let totalCostValuation = 0;
    let totalRetailValuation = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    const qualityCounts = {
      'Original': 0,
      'OEM': 0,
      'Genuine': 0,
    };

    parts.forEach((p) => {
      totalCostValuation += p.costPrice * p.quantityInStock;
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
    };
  }, [parts]);

  const [currentPage, setCurrentPage] = useState<number>(1);

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
      const matchesLowStock = !showLowStockOnly || part.quantityInStock <= part.reorderPoint;
      
      const query = activeSearchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        part.name.toLowerCase().includes(query) ||
        part.sku.toLowerCase().includes(query) ||
        (part.applePartNumber && part.applePartNumber.toLowerCase().includes(query)) ||
        part.locationBin.toLowerCase().includes(query) ||
        part.deviceCompatibility.some((d) => d.toLowerCase().includes(query));

      return matchesQuality && matchesCategory && matchesModel && matchesLowStock && matchesSearch;
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
  }, [parts, selectedQuality, selectedCategory, selectedModelFilter, showLowStockOnly, activeSearchQuery, sortKey, sortDir]);

  const totalPages = 1;
  const safeCurrentPage = 1;
  const paginatedParts = filteredParts;

  // Table pagination (stock table only — cards/profit/matrix stay full list)
  const TABLE_PAGE_SIZE = 50;
  const [tablePage, setTablePage] = useState(1);
  useEffect(() => {
    setTablePage(1); // reset to first page whenever the filtered/sorted list changes
  }, [filteredParts, sortKey, sortDir]);
  const tableTotalPages = Math.max(1, Math.ceil(paginatedParts.length / TABLE_PAGE_SIZE));
  const tablePageSafe = Math.min(tablePage, tableTotalPages);
  const tablePageParts = paginatedParts.slice((tablePageSafe - 1) * TABLE_PAGE_SIZE, tablePageSafe * TABLE_PAGE_SIZE);

  const handleSaveNewPart = () => {
    if (!newPartData.name || !newPartData.sku || !newPartData.category || !newPartData.qualityTier || !newPartData.supplierId || !newPartData.deviceCompatibility?.[0] || (isBackGlassCategory && !newPartData.backGlassColor)) {
      toast.error('Choose a device model, category, quality tier, and supplier. Back Glass parts also need a color. Then enter the part name and SKU.', 'Incomplete Part Details');
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
      quantityInStock: Number(newPartData.quantityInStock) || 0,
      reservedQuantity: 0,
      reorderPoint: Number(newPartData.reorderPoint) || 3,
      costPrice: Number(newPartData.costPrice) || 0,
      sellingPrice: Number(newPartData.sellingPrice) || 0,
      supplierId: newPartData.supplierId,
      supplierName: newPartData.supplierName || '',
      locationBin: newPartData.locationBin || '',
      isSerialized: newPartData.isSerialized || false,
    };

    onAddPart(part);
    resetNewPartData();
    setShowAddModal(false);
  };

  const handleSaveEditPart = () => {
    if (!editingPart) return;
    if (onUpdatePart) {
      onUpdatePart(editingPart);
    } else {
      onUpdatePartStock(editingPart.id, editingPart.quantityInStock);
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

  const saveInlineEdit = (part: PartItem) => {
    const draft = inlineDrafts[part.id];
    if (!draft || !onUpdatePart) return;
    const parsedQuantity = draft.quantityInStock?.trim() ? Number(draft.quantityInStock) : part.quantityInStock;
    const parsedReorder = draft.reorderPoint?.trim() ? Number(draft.reorderPoint) : part.reorderPoint;
    const parsedCost = draft.costPrice?.trim() ? Number(draft.costPrice) : part.costPrice;
    const parsedSelling = draft.sellingPrice?.trim() ? Number(draft.sellingPrice) : part.sellingPrice;
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
    setInlineDrafts((current) => { const next = { ...current }; delete next[part.id]; return next; });
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

    setIsInlineSaving(true);
    try {
      inlineSaveReview.forEach(({ part, changes }) => {
        const draft = inlineDrafts[part.id];
        if (!draft) return;
        const parsedQuantity = draft.quantityInStock?.trim() ? Number(draft.quantityInStock) : part.quantityInStock;
        const parsedReorder = draft.reorderPoint?.trim() ? Number(draft.reorderPoint) : part.reorderPoint;
        const parsedCost = draft.costPrice?.trim() ? Number(draft.costPrice) : part.costPrice;
        const parsedSelling = draft.sellingPrice?.trim() ? Number(draft.sellingPrice) : part.sellingPrice;
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
    <div className="space-y-3">
      {/* Module Title Header Bar — one line on lg: title | switcher | filters | actions */}
      <div className="module-toolbar overflow-visible bg-white p-3 rounded-xl border border-[#E5E5EA] shadow-xs flex flex-col lg:flex-row lg:items-center gap-2">
        <div className="module-subheader lg:shrink-0">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-[#0071E3] text-white flex items-center justify-center font-bold shadow-2xs">
              <Boxes className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-base font-black text-[#1D1D1F] tracking-tight">Parts Inventory</h1>
            </div>
          </div>
        </div>

        {/* Right cluster — one line on md+ */}
        <div className="flex flex-col md:flex-row md:items-center gap-2 w-full lg:w-auto lg:ml-auto min-w-0">
          {/* Dual View Switcher — full-width equal segmented on mobile */}
          <div className="bg-[#F5F5F7] rounded-xl border border-[#E5E5EA] flex items-center p-1 w-full md:w-auto md:shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('stock')}
              className={`flex-1 md:flex-none h-9 lg:h-8 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                viewMode === 'stock'
                  ? 'bg-white text-[#0071E3] shadow-xs border border-[#0071E3]/20'
                  : 'text-[#86868B] hover:text-[#1D1D1F]'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Stock</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('profit')}
              className={`flex-1 md:flex-none h-9 lg:h-8 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                viewMode === 'profit'
                  ? 'bg-white text-[#0071E3] shadow-xs border border-[#0071E3]/20'
                  : 'text-[#86868B] hover:text-[#1D1D1F]'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Profit</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('matrix')}
              className={`flex-1 md:flex-none h-9 lg:h-8 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                viewMode === 'matrix'
                  ? 'bg-white text-[#0071E3] shadow-xs border border-[#0071E3]/20'
                  : 'text-[#86868B] hover:text-[#1D1D1F]'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Matrix</span>
            </button>
          </div>

          {/* Filters — mobile: compact one-line pills (popup modal) · desktop: dropdown menus */}
          <div className="flex w-full md:w-auto items-stretch md:items-center gap-1.5 md:shrink-0">
            <div className="flex h-9 lg:h-8 items-center gap-1 rounded-lg bg-[#F5F5F7] p-1 flex-1 min-w-0 md:flex-none">
              {/* Mobile: inline pill → popup modal */}
              <button
                type="button"
                onClick={() => setFilterModal('model')}
                className="flex items-center justify-center gap-1 rounded-lg bg-transparent p-0 h-full w-full hover:bg-[#ECF0F3] transition-colors cursor-pointer min-w-0 md:hidden"
                title="Filter by device model"
              >
                <Smartphone className="w-3.5 h-3.5 shrink-0 text-[#0071E3]" />
                <span className="truncate min-w-0 font-bold text-[#1D1D1F] text-xs">
                  {selectedModelFilter === 'ALL' ? 'All Models' : selectedModelFilter}
                </span>
              </button>
              {/* Desktop: dropdown menu */}
              <div className="hidden md:flex items-center gap-1 w-full">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-white text-[#0071E3]">
                  <Smartphone className="h-3 w-3" />
                </span>
                <CustomDropdownMenu
                  value={selectedModelFilter}
                  onChange={setSelectedModelFilter}
                  options={modelFilterOptions}
                  className="min-w-0"
                  buttonClassName="min-w-[110px] lg:min-w-[130px] border-0 bg-transparent hover:bg-white"
                  size="sm"
                  menuAlign="group-left"
                />
              </div>
            </div>

            <div className="flex h-9 lg:h-8 items-center gap-1 rounded-lg bg-[#F5F5F7] p-1 flex-1 min-w-0 md:flex-none">
              {/* Mobile: inline pill → popup modal */}
              <button
                type="button"
                onClick={() => setFilterModal('category')}
                className="flex items-center justify-center gap-1 rounded-lg bg-transparent p-0 h-full w-full hover:bg-[#ECF0F3] transition-colors cursor-pointer min-w-0 md:hidden"
                title="Filter by category"
              >
                <Layers className="w-3.5 h-3.5 shrink-0 text-[#0071E3]" />
                <span className="truncate min-w-0 font-bold text-[#1D1D1F] text-xs">
                  {selectedCategory === 'ALL' ? 'All Categories' : selectedCategory}
                </span>
              </button>
              {/* Desktop: dropdown menu */}
              <div className="hidden md:flex items-center gap-1 w-full">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-white text-[#0071E3]">
                  <Layers className="h-3 w-3" />
                </span>
                <CustomDropdownMenu
                  value={selectedCategory}
                  onChange={setSelectedCategory}
                  options={categoryFilterOptions}
                  className="min-w-0"
                  buttonClassName="min-w-[110px] lg:min-w-[130px] border-0 bg-transparent hover:bg-white"
                  size="sm"
                  menuAlign="group-left"
                />
              </div>
            </div>

            <div className="flex h-9 lg:h-8 items-center gap-1 rounded-lg bg-[#F5F5F7] p-1 flex-1 min-w-0 md:flex-none">
              {/* Mobile: inline pill → popup modal */}
              <button
                type="button"
                onClick={() => setFilterModal('tier')}
                className="flex items-center justify-center gap-1 rounded-lg bg-transparent p-0 h-full w-full hover:bg-[#ECF0F3] transition-colors cursor-pointer min-w-0 md:hidden"
                title="Filter by quality tier"
              >
                <Filter className="w-3.5 h-3.5 shrink-0 text-[#0071E3]" />
                <span className="truncate min-w-0 font-bold text-[#1D1D1F] text-xs">
                  {selectedQuality === 'ALL' ? 'All Tiers' : selectedQuality}
                </span>
              </button>
              {/* Desktop: dropdown menu */}
              <div className="hidden md:flex items-center gap-1 w-full">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-white text-[#0071E3]">
                  <Filter className="h-3 w-3" />
                </span>
                <CustomDropdownMenu
                  value={selectedQuality}
                  onChange={setSelectedQuality}
                  options={tierFilterOptions}
                  className="min-w-0"
                  buttonClassName="min-w-[110px] lg:min-w-[120px] border-0 bg-transparent hover:bg-white"
                  size="sm"
                  menuAlign="group-left"
                />
              </div>
            </div>
          </div>

          {viewMode === 'stock' && (
            <div className={`grid items-center gap-1 w-full md:flex md:w-auto md:ml-auto md:shrink-0 md:pl-1 ${inlineEditMode ? 'grid-cols-3' : 'grid-cols-5'}`}>
              {/* Quick Add Part — opens the add-part modal directly */}
              {!inlineEditMode && (
                <button
                  type="button"
                  onClick={() => setShowAddModal(true)}
                  className="toolbar-compact-btn flex-1 md:flex-none inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#0071E3] px-2.5 py-1.5 text-[11px] font-bold text-white shadow-xs transition-colors hover:bg-[#0051B3] active:scale-95 cursor-pointer"
                  title="Add a new part"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Add Part</span>
                </button>
              )}

              {/* Table view — left, joined pair with Card */}
              {!inlineEditMode && (
                <button
                  type="button"
                  onClick={() => setStockView('table')}
                  title="Table view"
                  aria-label="Stock table view"
                  className={`toolbar-compact-btn flex-1 min-w-0 inline-flex items-center justify-center rounded-l-lg border transition-colors ${
                    stockView === 'table'
                      ? 'bg-[#0071E3] text-white border-[#0071E3]'
                      : 'bg-white text-[#6E6E73] border-[#D2D2D7] hover:bg-slate-100'
                  }`}
                >
                  <List className="h-3.5 w-3.5" />
                </button>
              )}
              {/* Card view — joined pair with Table */}
              {!inlineEditMode && (
                <button
                  type="button"
                  onClick={() => setStockView('cards')}
                  title="Card view"
                  aria-label="Stock card view"
                  className={`toolbar-compact-btn flex-1 min-w-0 inline-flex items-center justify-center rounded-r-lg border transition-colors ${
                    stockView === 'cards'
                      ? 'bg-[#0071E3] text-white border-[#0071E3]'
                      : 'bg-white text-[#6E6E73] border-[#D2D2D7] hover:bg-slate-100'
                  }`}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                </button>
              )}

              <button
                type="button"
                onClick={() => { setIsTagsPrintOpen(true); setSelectedTagIds(new Set()); }}
                className="toolbar-compact-btn flex-1 md:flex-none inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#E5E5EA] bg-white px-2 py-1.5 text-[11px] font-bold text-[#1D1D1F] transition-colors hover:border-[#0071E3] hover:text-[#0071E3]"
                title="Print spare parts tags (A4)"
              >
                <Printer className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Print Tags</span>
              </button>

              {/* Edit / Done toggle */}
              <button
                type="button"
                onClick={() => {
                  if (inlineEditMode && inlineSaveReview.length) {
                    setShowInlineSaveConfirm(true);
                    return;
                  }
                  setInlineEditMode((value) => !value);
                  setInlineDrafts({});
                }}
                className={`toolbar-compact-btn flex-1 md:flex-none inline-flex items-center justify-center gap-1.5 rounded-lg border px-2 py-1.5 text-[11px] font-bold transition-colors ${
                  inlineEditMode
                    ? 'border-amber-300 bg-amber-50 text-amber-700 hover:border-amber-400'
                    : 'border-amber-200 bg-amber-50 text-amber-700 hover:border-amber-400 hover:bg-amber-100'
                }`}
                title={inlineEditMode ? 'Cancel inline edit mode' : 'Edit stock rows'}
              >
                <Edit2 className="h-3.5 w-3.5" />
                <span>{inlineEditMode ? 'Done' : 'Edit'}</span>
              </button>

              {/* Save — far right end, only while editing */}
              {inlineEditMode && (
                <button
                  type="button"
                  onClick={() => {
                    // Nothing changed → skip the confirm modal, just exit edit mode.
                    if (!inlineSaveReview.length) {
                      setInlineEditMode(false);
                      setInlineDrafts({});
                      toast.info('No changes to save', 'Nothing Changed');
                      return;
                    }
                    setShowInlineSaveConfirm(true);
                  }}
                  className="toolbar-compact-btn flex-1 md:flex-none inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#0071E3] bg-[#0071E3] px-3 py-1.5 text-[11px] font-bold text-white shadow-xs transition-colors hover:bg-blue-700"
                  title="Save all inline edits"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Save</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Financial summary belongs to the Profit view, leaving Stock and Matrix full-height. */}
      {viewMode === 'profit' && (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Total Stock Items Card */}
        <div className="bg-white p-4 rounded-2xl border border-[#E5E5EA] shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-[#86868B]">
            <span className="text-xs font-bold uppercase tracking-wider">Total Active SKUs</span>
            <PackageCheck className="w-4 h-4 text-[#0071E3]" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-[#1D1D1F] font-mono">{metrics.totalCount}</span>
            <span className="text-[11px] font-bold text-[#0071E3] bg-[#0071E3]/10 px-2 py-0.5 rounded-full">
              {categories.length} Categories
            </span>
          </div>
          <p className="text-[10px] text-[#86868B]">Unique Apple hardware part SKUs registered</p>
        </div>

        {/* Total Inventory Stock Valuation */}
        <div className="bg-white p-4 rounded-2xl border border-[#E5E5EA] shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-[#86868B]">
            <span className="text-xs font-bold uppercase tracking-wider">Inventory Valuation</span>
            <DollarSign className="w-4 h-4 text-[#34C759]" />
          </div>
          <div className="space-y-0.5">
            <div className="flex justify-between text-xs">
              <span className="text-[#86868B] font-medium">Cost Asset:</span>
              <span className="font-mono font-bold text-[#1D1D1F]">
                {metrics.totalCostValuation.toLocaleString()} MMK
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-[#34C759] font-bold">Retail Yield:</span>
              <span className="font-mono font-black text-[#34C759]">
                {metrics.totalRetailValuation.toLocaleString()} MMK
              </span>
            </div>
          </div>
          <div className="text-[10px] text-[#0071E3] font-extrabold text-right pt-1 border-t border-[#F5F5F7]">
            Projected Margin: +{metrics.totalPotentialProfit.toLocaleString()} MMK
          </div>
        </div>

        {/* Low Stock Warning Card (Clickable Filter) */}
        <button
          type="button"
          onClick={() => setShowLowStockOnly(!showLowStockOnly)}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer shadow-2xs ${
            showLowStockOnly
              ? 'bg-amber-500 text-white border-amber-600 ring-2 ring-amber-400'
              : metrics.lowStockCount > 0
              ? 'bg-amber-50 hover:bg-amber-100/80 text-amber-900 border-amber-200'
              : 'bg-white text-[#1D1D1F] border-[#E5E5EA]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider">Low Stock Reorders</span>
            <AlertTriangle className={`w-4 h-4 ${showLowStockOnly ? 'text-white' : 'text-amber-600'}`} />
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black font-mono">
              {metrics.lowStockCount} <span className="text-xs font-bold">SKUs</span>
            </span>
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
              showLowStockOnly ? 'bg-white text-amber-800' : 'bg-amber-200/80 text-amber-900'
            }`}>
              {showLowStockOnly ? 'Filter Active' : 'Click to Audit'}
            </span>
          </div>
          <p className="text-[10px] mt-1 opacity-80">
            {metrics.outOfStockCount > 0 ? `${metrics.outOfStockCount} completely out of stock` : 'Items at or below reorder threshold'}
          </p>
        </button>

      </div>
      )}



      {/* VIEW MODE 1: STOCK TABLE */}
      {viewMode === 'stock' && (
        <>
        {/* Scan + search bar — barcode scanners type SKU + Enter (exact lookup);
            typing also live-filters the list (search by name/SKU/category) */}
        <div className="flex items-center gap-2 rounded-xl border border-[#0071E3]/25 bg-blue-50/50 px-3 py-2">
          <ScanLine className="h-4 w-4 shrink-0 text-[#0071E3]" />
          <input
            ref={scanInputRef}
            value={scanQuery}
            onChange={(e) => {
              setScanQuery(e.target.value);
              setSearchQuery(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); handleScanSubmit(); }
            }}
            placeholder="Scan barcode or search part..."
            autoComplete="off"
            autoFocus
            className="min-w-0 flex-1 basis-[140px] rounded-lg border border-[#D2D2D7] bg-white px-3 py-1.5 font-mono text-xs font-semibold text-[#1D1D1F] outline-none transition focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20"
          />
          {scanQuery && (
            <button
              type="button"
              onClick={() => {
                setScanQuery('');
                setSearchQuery('');
                scanInputRef.current?.focus();
              }}
              aria-label="Clear search"
              className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full text-[#86868B] hover:bg-blue-100 hover:text-[#1D1D1F] transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={handleScanSubmit}
            className="shrink-0 rounded-lg bg-[#0071E3] px-3 py-1.5 text-[11px] font-extrabold text-white transition hover:bg-[#0051B3]"
          >
            Lookup
          </button>
        </div>

        {/* Bulk actions bar — appears when parts are selected (stock table only) */}
        {selectedPartIds.size > 0 && !inlineEditMode && (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[#0071E3]/30 bg-[#F0F6FF] px-3 py-2">
            <span className="text-xs font-extrabold text-[#0071E3]">{selectedPartIds.size} selected</span>
            <div className="ml-auto flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={exportSelectedCsv}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#0071E3] bg-white px-2.5 py-1.5 text-[11px] font-bold text-[#0071E3] hover:bg-[#0071E3] hover:text-white transition-colors cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                Export CSV
              </button>
              <button
                type="button"
                onClick={bulkSetReorder}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#E5E5EA] bg-white px-2.5 py-1.5 text-[11px] font-bold text-[#1D1D1F] hover:border-[#0071E3] hover:text-[#0071E3] transition-colors cursor-pointer"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                Set Reorder Point
              </button>
              <button
                type="button"
                onClick={bulkDelete}
                className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-[11px] font-bold text-rose-600 hover:bg-rose-100 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
              <button
                type="button"
                onClick={clearSelection}
                className="inline-flex items-center rounded-lg px-2 py-1.5 text-[11px] font-bold text-[#86868B] hover:text-[#1D1D1F] transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                Clear
              </button>
            </div>
          </div>
        )}

        {/* Low-stock quick audit banner — visible in Stock view too (not just Profit) */}
        {metrics.lowStockCount > 0 && (
          <button
            type="button"
            onClick={() => setShowLowStockOnly(!showLowStockOnly)}
            className={`w-full flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-xs transition-all cursor-pointer active:scale-[0.99] ${
              showLowStockOnly
                ? 'bg-amber-500 border-amber-600 text-white'
                : 'bg-amber-50 hover:bg-amber-100/80 border-amber-200 text-amber-900'
            }`}
          >
            <span className="flex items-center gap-2 min-w-0">
              <AlertTriangle className={`w-4 h-4 shrink-0 ${showLowStockOnly ? 'text-white' : 'text-amber-600'}`} />
              <span className="truncate">
                <strong className="font-mono">{metrics.lowStockCount}</strong> SKUs at or below reorder point
                {metrics.outOfStockCount > 0 && <span className="opacity-80"> · {metrics.outOfStockCount} out of stock</span>}
              </span>
            </span>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black ${showLowStockOnly ? 'bg-white text-amber-800' : 'bg-amber-200/80 text-amber-900'}`}>
              {showLowStockOnly ? 'Filter Active ✓' : 'Tap to Filter'}
            </span>
          </button>
        )}

        <div className="workspace-panel workspace-panel--standard rounded-2xl border border-[#E5E5EA] bg-white text-xs shadow-xs">
          {filteredParts.length === 0 ? (
            <div className="flex min-h-[280px] flex-col items-center justify-center p-12 text-center space-y-4">
              <PackageX className="w-8 h-8 text-[#86868B] mx-auto" />
              <div className="space-y-1">
                <p className="text-sm font-bold text-[#1D1D1F]">No inventory components found matching your filter</p>
                <p className="text-xs text-[#86868B]">Try resetting the search query or quality tier selection.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedQuality('ALL');
                  setSelectedCategory('ALL');
                  setShowLowStockOnly(false);
                  setSearchQuery('');
                }}
                className="mt-2 px-3 py-1.5 bg-[#0071E3] text-white font-bold rounded-xl text-xs"
              >
                Reset All Filters
              </button>
            </div>
          ) : stockView === 'cards' ? (
            /* PHONE CARD GRID — read-only; in edit mode cards switch to instant −/+ steppers */
            <div className="workspace-panel__scroll rounded-xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 p-3 content-start">
              {paginatedParts.map((part) => {
                const isLow = part.quantityInStock <= part.reorderPoint;
                const isOut = part.quantityInStock === 0;
                const qualityBadge =
                  part.qualityTier === 'Original' || part.qualityTier.includes('Original') ? (
                    <span className="inline-flex max-w-[130px] items-center gap-1 truncate rounded-md border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[10px] font-extrabold text-blue-800">
                      <ShieldCheck className="h-3 w-3 shrink-0 text-blue-600" />
                      <span>{part.qualityTier}</span>
                    </span>
                  ) : part.qualityTier === 'OEM' ? (
                    <span className="inline-flex max-w-[130px] items-center gap-1 truncate rounded-md border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-extrabold text-emerald-800">
                      <Sparkles className="h-3 w-3 shrink-0 text-emerald-600" />
                      <span>{part.qualityTier}</span>
                    </span>
                  ) : part.qualityTier === 'Genuine' ? (
                    <span className="inline-flex max-w-[130px] items-center gap-1 truncate rounded-md border border-purple-200 bg-purple-50 px-1.5 py-0.5 text-[10px] font-extrabold text-purple-800">
                      <Cpu className="h-3 w-3 shrink-0 text-purple-600" />
                      <span>{part.qualityTier}</span>
                    </span>
                  ) : (
                    <span className="inline-flex max-w-[130px] items-center gap-1 truncate rounded-md border border-slate-300 bg-slate-100 px-1.5 py-0.5 text-[10px] font-extrabold text-slate-800">
                      <Tag className="h-3 w-3 shrink-0 text-slate-600" />
                      <span>{part.qualityTier}</span>
                    </span>
                  );

                return (
                  <div key={part.id} className="space-y-3 rounded-2xl border border-[#E5E5EA] bg-white p-4 text-xs shadow-xs">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 items-start space-x-2">
                        <div className="mt-0.5 shrink-0 rounded-md bg-[#0071E3]/10 p-1.5 text-[#0071E3]">
                          <Cpu className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[13px] font-extrabold leading-snug text-[#1D1D1F]">{part.name}</p>
                          <p className="mt-0.5 font-mono text-[10px] font-medium text-[#86868B]">SKU {part.sku}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedPartForDetails(part)}
                        aria-label={`View ${part.name} details`}
                        title="View part details"
                        className="inline-flex h-10 w-10 lg:h-8 lg:w-8 shrink-0 items-center justify-center rounded-lg border border-[#E5E5EA] bg-[#F5F5F7] text-[#1D1D1F] transition-colors hover:border-[#0071E3] hover:bg-blue-50 hover:text-[#0071E3]"
                      >
                        <FileText className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {qualityBadge}
                      {part.locationBin && (
                        <span className="inline-flex items-center gap-1 rounded-md border border-[#E5E5EA] bg-[#F5F5F7] px-1.5 py-0.5 text-[10px] font-extrabold text-[#0071E3]">
                          <MapPin className="h-2.5 w-2.5 shrink-0" />
                          {part.locationBin}
                        </span>
                      )}
                    </div>

                    {inlineEditMode ? (
                      <div className="flex items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50/60 p-2.5">
                        <span className="text-[10px] font-extrabold uppercase tracking-wide text-amber-700">Adjust Stock</span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => { onUpdatePartStock(part.id, Math.max(0, part.quantityInStock - 1)); toast.info(`${part.name}: ${Math.max(0, part.quantityInStock - 1)} units`, 'Stock −1'); }}
                            aria-label={`Decrease stock for ${part.name}`}
                            title="Decrease stock"
                            className="flex h-10 w-10 lg:h-8 lg:w-8 items-center justify-center rounded-lg border border-amber-300 bg-white font-black text-rose-600 active:scale-95"
                          >−</button>
                          <span className="min-w-10 text-center font-mono text-base font-black text-[#1D1D1F]">{part.quantityInStock}</span>
                          <button
                            type="button"
                            onClick={() => { onUpdatePartStock(part.id, part.quantityInStock + 1); toast.success(`${part.name}: ${part.quantityInStock + 1} units`, 'Stock +1'); }}
                            aria-label={`Increase stock for ${part.name}`}
                            title="Increase stock"
                            className="flex h-10 w-10 lg:h-8 lg:w-8 items-center justify-center rounded-lg border border-amber-300 bg-white font-black text-[#0071E3] active:scale-95"
                          >+</button>
                        </div>
                      </div>
                    ) : (
                    <div className="space-y-1.5 rounded-xl border border-[#D8E5ED] bg-[#F8FBFD] p-2.5">
                      <div className="flex items-center justify-between">
                        <span className={`font-mono text-[15px] font-black tracking-wide ${isOut ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-[#1D1D1F]'}`}>
                          {part.quantityInStock} <span className="text-[10px] font-normal text-[#86868B]">units</span>
                        </span>
                        {isOut ? (
                          <span className="animate-pulse rounded bg-red-600 px-1.5 py-0.5 text-[8px] font-black uppercase leading-none tracking-[0.1em] text-white">OUT OF STOCK</span>
                        ) : isLow ? (
                          <span className="rounded bg-amber-500 px-1.5 py-0.5 text-[8px] font-black uppercase leading-none tracking-[0.1em] text-white">REORDER</span>
                        ) : (
                          <span className="text-[10px] font-bold text-[#86868B]">Min: {part.reorderPoint}</span>
                        )}
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#E5E5EA]">
                        <div
                          className={`h-full transition-all duration-300 ${isOut ? 'w-0 bg-red-600' : isLow ? 'bg-amber-500' : 'bg-[#34C759]'}`}
                          style={isOut ? undefined : { width: `${Math.min(100, Math.max(8, (part.quantityInStock / (part.reorderPoint * 3)) * 100))}%` }}
                        />
                      </div>
                    </div>
                    )}

                    {/* Selling price edit — mobile card edit mode (step 1,000 MMK, instant save) */}
                    {inlineEditMode && (
                      <div className="flex items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50/60 p-2.5">
                        <span className="text-[10px] font-extrabold uppercase tracking-wide text-emerald-700">Selling Price</span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onUpdatePart?.({ ...part, sellingPrice: Math.max(0, part.sellingPrice - 1000) })}
                            aria-label={`Decrease price for ${part.name}`}
                            title="Decrease price by 1,000 MMK"
                            className="flex h-10 w-10 lg:h-8 lg:w-8 items-center justify-center rounded-lg border border-emerald-300 bg-white font-black text-rose-600 active:scale-95"
                          >−</button>
                          <span className="min-w-[70px] text-center font-mono text-sm font-black text-[#1D1D1F]">{part.sellingPrice.toLocaleString()}</span>
                          <button
                            type="button"
                            onClick={() => onUpdatePart?.({ ...part, sellingPrice: part.sellingPrice + 1000 })}
                            aria-label={`Increase price for ${part.name}`}
                            title="Increase price by 1,000 MMK"
                            className="flex h-10 w-10 lg:h-8 lg:w-8 items-center justify-center rounded-lg border border-emerald-300 bg-white font-black text-[#0071E3] active:scale-95"
                          >+</button>
                        </div>
                      </div>
                    )}

                    <div className="flex items-end justify-between gap-2 border-t border-[#E5E5EA] pt-1">
                      <div>
                        <span className="block text-[10px] font-bold uppercase text-[#7F7F7F]">Selling Price</span>
                        <span className="font-mono text-sm font-black text-[#16A34A]">{part.sellingPrice.toLocaleString()} MMK</span>
                      </div>
                      {part.supplierName && (
                        <span className="max-w-[45%] truncate text-[10px] font-semibold text-[#86868B]">{part.supplierName}</span>
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
                <thead className="sticky top-0 z-20 bg-[#F5F5F7] text-[#86868B] text-[10px] uppercase font-mono border-b border-[#E5E5EA] shadow-2xs">
                  <tr>
                    {!inlineEditMode && (
                      <th className="w-[40px] px-2 py-2 bg-[#F5F5F7]">
                        <input
                          type="checkbox"
                          checked={paginatedParts.length > 0 && paginatedParts.every((p) => selectedPartIds.has(p.id))}
                          onChange={toggleSelectAllVisible}
                          aria-label="Select all visible parts"
                          className="accent-[#0071E3] w-3.5 h-3.5 cursor-pointer"
                        />
                      </th>
                    )}
                    <th className="w-[34%] px-2 py-2 bg-[#F5F5F7]">
                      <button type="button" onClick={() => toggleSort('name')} className="inline-flex items-center gap-1 hover:text-[#0071E3] transition-colors cursor-pointer uppercase font-mono text-[10px]" title="Sort by part name">
                        Part Name & SKU
                        {sortKey === 'name' && <SortArrow dir={sortDir} />}
                      </button>
                    </th>
                    <th className="w-[108px] px-2 py-2 bg-[#F5F5F7] hidden md:table-cell">Quality</th>
                    <th className="w-[96px] px-1.5 py-2 bg-[#F5F5F7]">
                      <button type="button" onClick={() => toggleSort('stock')} className="inline-flex items-center gap-1 hover:text-[#0071E3] transition-colors cursor-pointer uppercase font-mono text-[10px]" title="Sort by stock quantity">
                        Stock
                        {sortKey === 'stock' && <SortArrow dir={sortDir} />}
                      </button>
                    </th>
                    <th className="w-[104px] px-1.5 py-2 bg-[#F5F5F7]">
                      <button type="button" onClick={() => toggleSort('price')} className="inline-flex items-center gap-1 hover:text-[#0071E3] transition-colors cursor-pointer uppercase font-mono text-[10px]" title="Sort by selling price">
                        Selling Price
                        {sortKey === 'price' && <SortArrow dir={sortDir} />}
                      </button>
                    </th>
                    {inlineEditMode && <th className="w-[150px] px-1.5 py-2 bg-[#F5F5F7]">Supplier</th>}
                    <th className="px-2 py-2 bg-[#F5F5F7] hidden md:table-cell">Bin</th>
                    {!inlineEditMode && <th className="px-2 py-2 text-right bg-[#F5F5F7]">Detail</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E5EA]">
                  {tablePageParts.map((part) => {
                    const isLow = part.quantityInStock <= part.reorderPoint;
                    const isOut = part.quantityInStock === 0;
                    const draft = inlineDrafts[part.id] || {};
                    const editValue = (key: keyof PartItem, fallback: string | number) => draft[key] ?? fallback;

                    return (
                      <tr key={part.id} className={`transition-colors ${selectedPartIds.has(part.id) ? 'bg-[#F0F6FF]' : 'hover:bg-slate-50/80'}`}>
                        {/* Selection checkbox */}
                        {!inlineEditMode && (
                          <td className="px-2 py-2">
                            <input
                              type="checkbox"
                              checked={selectedPartIds.has(part.id)}
                              onChange={() => togglePartSelection(part.id)}
                              aria-label={`Select ${part.name}`}
                              className="accent-[#0071E3] w-3.5 h-3.5 cursor-pointer"
                            />
                          </td>
                        )}
                        {/* Part Name & SKU */}
                        <td className="px-2 py-2 space-y-1">
                          <div className="flex items-start space-x-2">
                            <div className="p-1 rounded-md bg-[#0071E3]/10 text-[#0071E3] shrink-0 mt-0.5">
                              <Cpu className="w-3 h-3" />
                            </div>
                            <div>
                              <p className="font-extrabold text-[#1D1D1F] text-[11px] leading-snug">
                                {part.name}
                              </p>
                              <p className="mt-0.5 font-mono text-[9px] font-medium text-[#86868B]">SKU {part.sku}</p>
                            </div>
                          </div>
                        </td>

                        {/* Quality Tier */}
                        <td className="w-[108px] px-2 py-2 hidden md:table-cell">
                          {part.qualityTier === 'Original' || part.qualityTier.includes('Original') ? (
                            <span className="inline-flex max-w-[112px] items-center gap-1 truncate rounded-md border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[10px] font-extrabold text-blue-800">
                              <ShieldCheck className="h-3 w-3 shrink-0 text-blue-600" />
                              <span>{part.qualityTier}</span>
                            </span>
                          ) : part.qualityTier === 'OEM' ? (
                            <span className="inline-flex max-w-[112px] items-center gap-1 truncate rounded-md border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-extrabold text-emerald-800">
                              <Sparkles className="h-3 w-3 shrink-0 text-emerald-600" />
                              <span>{part.qualityTier}</span>
                            </span>
                          ) : part.qualityTier === 'Genuine' ? (
                            <span className="inline-flex max-w-[112px] items-center gap-1 truncate rounded-md border border-purple-200 bg-purple-50 px-1.5 py-0.5 text-[10px] font-extrabold text-purple-800">
                              <Cpu className="h-3 w-3 shrink-0 text-purple-600" />
                              <span>{part.qualityTier}</span>
                            </span>
                          ) : (
                            <span className="inline-flex max-w-[112px] items-center gap-1 truncate rounded-md border border-slate-300 bg-slate-100 px-1.5 py-0.5 text-[10px] font-extrabold text-slate-800">
                              <Tag className="h-3 w-3 shrink-0 text-slate-600" />
                              <span>{part.qualityTier}</span>
                            </span>
                          )}
                        </td>

                        {/* Stock Level & Visual Bar */}
                        <td className="w-[96px] min-w-[96px] pr-2 py-2">
                          {inlineEditMode ? (
                            <div className="grid grid-cols-1 gap-1" onFocus={() => beginInlineEdit(part)}>
                              <label className="flex min-w-0 flex-col gap-0.5 text-[9px] font-bold uppercase tracking-wide text-[#86868B]">
                                <span>Stock</span>
                                <input aria-label={`Stock quantity for ${part.name}`} type="text" inputMode="numeric" value={inlineDrafts[part.id]?.quantityInStock ?? String(part.quantityInStock)} onWheel={(e) => e.currentTarget.blur()} onChange={(e) => setInlineDrafts((current) => ({ ...current, [part.id]: { ...current[part.id], quantityInStock: e.target.value } }))} className="w-full min-w-0 rounded-md border border-[#D2D2D7] bg-white px-2 py-1.5 text-[14px] font-semibold font-sans tabular-nums tracking-normal text-[#111111]" />
                              </label>
                            </div>
                          ) : null}
                          {!inlineEditMode && <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className={`font-black text-[13px] font-mono tracking-wide ${
                                isOut ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-[#1D1D1F]'
                              }`}>
                                {(inlineEditMode ? editValue('quantityInStock', part.quantityInStock) : part.quantityInStock)} <span className="text-[10px] font-normal text-[#86868B]">units</span>
                              </span>
                              {!inlineEditMode && isOut ? (
                                <span className="bg-red-600 text-white text-[7px] font-black px-1 py-0.5 rounded uppercase tracking-[0.1em] leading-none animate-pulse">
                                  OUT OF STOCK
                                </span>
                              ) : !inlineEditMode && isLow ? (
                                <span className="bg-amber-500 text-white text-[7px] font-black px-1 py-0.5 rounded uppercase tracking-[0.1em] leading-none">
                                  REORDER
                                </span>
                              ) : !inlineEditMode ? (
                                <span className="text-[9px] text-[#86868B] font-bold">
                                  Min: {part.reorderPoint}
                                </span>
                              ) : null}
                            </div>

                            {/* Stock Visual Bar */}
                            {!inlineEditMode && <div className="w-full h-1.5 bg-[#E5E5EA] rounded-full overflow-hidden">
                              <div
                                className={`h-full transition-all duration-300 ${
                                  isOut ? 'bg-red-600 w-0' : isLow ? 'bg-amber-500' : 'bg-[#34C759]'
                                }`}
                                style={{ width: `${Math.min(100, Math.max(8, (part.quantityInStock / (part.reorderPoint * 3)) * 100))}%` }}
                              />
                            </div>}
                          </div>}
                        </td>

                        {/* Selling price only — profit belongs in the Profit tab. */}
                        <td className="w-[176px] min-w-[176px] pl-3 pr-1.5 py-2 font-sans text-[14px] font-semibold text-[#16A34A] whitespace-nowrap">
                          {inlineEditMode ? (
                            <div className="grid grid-cols-2 gap-2">
                              <label className="flex min-w-0 flex-col gap-0.5 text-[9px] font-bold uppercase tracking-wide text-[#86868B]">
                                <span>Purchase</span>
                                <input aria-label={`Purchase price for ${part.name}`} type="text" inputMode="numeric" value={inlineDrafts[part.id]?.costPrice ?? String(part.costPrice)} onWheel={(e) => e.currentTarget.blur()} onFocus={() => beginInlineEdit(part)} onChange={(e) => setInlineDrafts((current) => ({ ...current, [part.id]: { ...current[part.id], costPrice: e.target.value } }))} className="w-full min-w-0 rounded-md border border-[#D2D2D7] bg-white px-2 py-1.5 text-[14px] font-semibold font-sans tabular-nums tracking-normal text-[#111111]" />
                              </label>
                              <label className="flex min-w-0 flex-col gap-0.5 text-[9px] font-bold uppercase tracking-wide text-[#86868B]">
                                <span>Selling</span>
                                <input aria-label={`Selling price for ${part.name}`} type="text" inputMode="numeric" value={inlineDrafts[part.id]?.sellingPrice ?? String(part.sellingPrice)} onWheel={(e) => e.currentTarget.blur()} onChange={(e) => setInlineDrafts((current) => ({ ...current, [part.id]: { ...current[part.id], sellingPrice: e.target.value } }))} className="w-full min-w-0 rounded-md border border-[#D2D2D7] bg-white px-2 py-1.5 text-[14px] font-semibold font-sans tabular-nums tracking-normal text-[#111111]" />
                              </label>
                            </div>
                          ) : `${part.sellingPrice.toLocaleString()} MMK`}
                        </td>

                        {inlineEditMode ? (
                          <td className="w-[108px] px-1.5 py-2 align-top">
                            <div className="flex min-w-0 flex-col gap-0.5 text-[9px] font-bold uppercase tracking-wide text-[#86868B]">
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
                                buttonClassName="w-full rounded-md bg-white px-2 py-1.5 text-left text-[14px] font-semibold text-[#1D1D1F]"
                                menuAlign="left"
                              />
                            </div>
                          </td>
                        ) : null}

                        {/* Location Bin */}
                        <td className="w-[104px] max-w-[104px] px-1.5 py-2 hidden md:table-cell">
                          {inlineEditMode ? (
                            <div className="flex min-w-0 flex-col gap-0.5 text-[9px] font-bold uppercase tracking-wide text-[#86868B]">
                              <span>Bin</span>
                              <select aria-label={`Bin for ${part.name}`} value={editValue('locationBin', part.locationBin) as string} onFocus={() => beginInlineEdit(part)} onChange={(e) => setInlineDrafts((current) => ({ ...current, [part.id]: { ...current[part.id], locationBin: e.target.value } }))} className="w-full min-w-0 rounded-md border border-[#D2D2D7] bg-white px-2 py-1.5 text-[14px] font-semibold font-sans tabular-nums tracking-normal text-[#111111]"><option value="">Choose bin</option>{existingLocationBins.map((bin) => <option key={bin} value={bin}>{bin}</option>)}</select>
                            </div>
                          ) : part.locationBin ? (
                            <div className="flex min-w-0 flex-col gap-0.5 text-[9px] font-bold uppercase tracking-wide text-[#86868B]">
                              <span>Bin</span>
                              <span className="inline-flex items-center gap-1 px-1 py-0.5 text-[10px] font-extrabold leading-none text-[#0071E3]">
                                <MapPin className="h-2.5 w-2.5 shrink-0 text-[#0071E3]" />
                                {part.locationBin}
                              </span>
                            </div>
                          ) : null}
                        </td>

                        {/* Detailed stock controls are kept inside the part detail modal. */}
                        {!inlineEditMode && <td className="w-[70px] px-1.5 py-2 text-right shrink-0">
                          <button
                            type="button"
                            onClick={() => setSelectedPartForDetails(part)}
                            aria-label={`View ${part.name} details`}
                            className="inline-flex h-10 w-10 lg:h-8 lg:w-8 items-center justify-center rounded-lg border border-[#E5E5EA] bg-[#F5F5F7] text-[#1D1D1F] transition-colors hover:border-[#0071E3] hover:bg-blue-50 hover:text-[#0071E3]"
                            title="View part details"
                          >
                            <FileText className="h-3.5 w-3.5" />
                          </button>
                        </td>}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {/* Table pagination controls */}
              {tableTotalPages > 1 && (
                <div className="sticky bottom-0 flex items-center justify-between gap-2 border-t border-[#E5E5EA] bg-white px-3 py-2">
                  <span className="text-[10px] font-mono font-bold text-[#86868B]">
                    {paginatedParts.length} parts · Page {tablePageSafe}/{tableTotalPages}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setTablePage((p) => Math.max(1, p - 1))}
                      disabled={tablePageSafe <= 1}
                      className="flex h-8 items-center gap-1 rounded-lg border border-[#E5E5EA] bg-white px-2.5 text-[11px] font-bold text-[#1D1D1F] hover:border-[#0071E3] hover:text-[#0071E3] disabled:opacity-40 disabled:hover:border-[#E5E5EA] disabled:hover:text-[#1D1D1F] transition-colors cursor-pointer"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      Prev
                    </button>
                    <button
                      type="button"
                      onClick={() => setTablePage((p) => Math.min(tableTotalPages, p + 1))}
                      disabled={tablePageSafe >= tableTotalPages}
                      className="flex h-8 items-center gap-1 rounded-lg border border-[#E5E5EA] bg-white px-2.5 text-[11px] font-bold text-[#1D1D1F] hover:border-[#0071E3] hover:text-[#0071E3] disabled:opacity-40 disabled:hover:border-[#E5E5EA] disabled:hover:text-[#1D1D1F] transition-colors cursor-pointer"
                    >
                      Next
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Full list footer */}
          {filteredParts.length > 0 && (
            <div className="workspace-panel__footer p-3.5 bg-white border-t border-[#E5E5EA] flex items-center justify-between text-xs text-[#86868B]">
              <span className="font-bold">
                Showing <strong className="text-[#1D1D1F]">1-{filteredParts.length}</strong> of <strong className="text-[#1D1D1F]">{filteredParts.length}</strong> parts
              </span>
              <span className="font-bold text-[#1D1D1F]">{filteredParts.length > 0 ? 'All rows visible' : ''}</span>
            </div>
          )}
        </div>
        </>
      )}

      {/* VIEW MODE 2: PROFIT TABLE */}
      {viewMode === 'profit' && (
        <div className="workspace-panel workspace-panel--with-summary rounded-2xl border border-[#E5E5EA] bg-white text-xs shadow-xs">
          <div className="flex items-center justify-between border-b border-[#E5E5EA] px-3 py-2.5">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-[#0071E3]" />
              <div>
                <h3 className="font-extrabold text-[#1D1D1F]">Profit Analysis</h3>
                <p className="text-[10px] text-[#86868B]">Cost, selling price, and expected margin per unit</p>
              </div>
            </div>
            <span className="font-mono text-[11px] font-black text-[#0071E3]">+{metrics.totalPotentialProfit.toLocaleString()} MMK</span>
          </div>
          <div className="workspace-panel__scroll">
            <table className="w-full text-left">
              <thead className="sticky top-0 z-20 border-b border-[#E5E5EA] bg-[#F5F5F7] font-mono text-[10px] uppercase text-[#86868B]">
                <tr>
                  <th className="p-2.5">Part</th>
                  <th className="p-2.5 hidden md:table-cell">Cost</th>
                  <th className="p-2.5">Selling</th>
                  <th className="p-2.5">Profit / Unit</th>
                  <th className="p-2.5 hidden sm:table-cell">Margin</th>
                  <th className="p-2.5 text-right">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E5EA]">
                {paginatedParts.map((part) => {
                  const profit = part.sellingPrice - part.costPrice;
                  const margin = part.sellingPrice ? Math.round((profit / part.sellingPrice) * 100) : 0;
                  // Margin heat map: >=40% green, 20-39% lime/emerald, 0-19% amber, negative red
                  const heat =
                    margin >= 40 ? 'bg-emerald-100 text-emerald-800' :
                    margin >= 20 ? 'bg-lime-100 text-lime-800' :
                    margin >= 0 ? 'bg-amber-100 text-amber-800' :
                    'bg-rose-100 text-rose-700';
                  return (
                    <tr key={part.id} className="hover:bg-slate-50/80">
                      <td className="p-2.5"><p className="max-w-[260px] truncate font-bold text-[#1D1D1F]">{part.name}</p><p className="mt-0.5 font-mono text-[10px] text-[#86868B]">{part.sku}</p></td>
                      <td className="p-2.5 font-mono text-[#6E6E73] whitespace-nowrap hidden md:table-cell">{part.costPrice.toLocaleString()} MMK</td>
                      <td className="p-2.5 font-mono font-bold text-[#16A34A] whitespace-nowrap">{part.sellingPrice.toLocaleString()} MMK</td>
                      <td className={`p-2.5 font-mono font-black whitespace-nowrap ${profit >= 0 ? 'text-[#0071E3]' : 'text-rose-600'}`}>{profit >= 0 ? '+' : ''}{profit.toLocaleString()} MMK<span className={`mt-0.5 block w-max rounded-md px-1.5 py-0.5 font-mono text-[9px] font-black sm:hidden ${heat}`}>{margin}%</span></td>
                      <td className="p-2.5 hidden sm:table-cell"><span className={`rounded-md px-1.5 py-0.5 font-mono text-[10px] font-black ${heat}`} title={margin >= 40 ? 'High margin' : margin >= 20 ? 'Good margin' : margin >= 0 ? 'Low margin' : 'Loss'}>{margin}%</span></td>
                      <td className="p-2.5 text-right"><button type="button" aria-label={`View ${part.name} details`} title="View part details" onClick={() => setSelectedPartForDetails(part)} className="inline-flex h-10 w-10 lg:h-7 lg:w-7 items-center justify-center rounded-lg border border-[#E5E5EA] bg-white text-[#1D1D1F] hover:border-[#0071E3] hover:text-[#0071E3]"><Eye className="h-3 w-3" /></button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW MODE 3: LIVE STOCK MATRIX — derived only from saved inventory rows. */}
      {viewMode === 'matrix' && (
        <div className="workspace-panel workspace-panel--with-summary rounded-2xl border border-[#E5E5EA] bg-white text-xs shadow-xs">
          <div className="flex items-center justify-between border-b border-[#E5E5EA] px-3 py-2.5">
            <div className="flex items-center gap-2">
              <Grid className="h-4 w-4 text-[#0071E3]" />
              <div>
                <h3 className="font-extrabold text-[#1D1D1F]">
                  <span className="hidden sm:inline">Apple Device Model × Component Stock Matrix</span>
                  <span className="sm:hidden">Device × Component Matrix</span>
                </h3>
                <p className="text-[10px] text-[#86868B]">Live totals from saved inventory components</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-[#86868B]">{matrixModels.length} models · {matrixCategories.length} categories</span>
              <button
                type="button"
                onClick={() => setIsMatrixPrintOpen(true)}
                className="flex items-center gap-1.5 rounded-lg border border-[#E5E5EA] bg-[#F5F5F7] px-2.5 py-1.5 text-[11px] font-bold text-[#1D1D1F] transition hover:border-[#0071E3] hover:text-[#0071E3]"
                title="Print ground stock checking sheet"
              >
                <Printer className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Print Stock Sheet</span>
              </button>
            </div>
          </div>

          {matrixModels.length && matrixCategories.length ? (
            <div className="workspace-panel__scroll overscroll-x-contain">
              <table className="min-w-max w-full text-left">
                <thead className="sticky top-0 z-20 border-b border-[#E5E5EA] bg-[#F5F5F7] font-mono text-[10px] uppercase text-[#86868B]">
                  <tr>
                    <th className="sticky left-0 z-30 min-w-44 bg-[#F5F5F7] p-2.5">Device Model</th>
                    {matrixCategories.map((category) => <th key={category} className="min-w-28 p-2.5 text-center">{category}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E5EA]">
                  {matrixModels.map((model) => (
                    <tr key={model} className="hover:bg-slate-50/80">
                      <td className="sticky left-0 z-10 bg-white p-2.5 font-bold text-[#1D1D1F]">{model}</td>
                      {matrixCategories.map((category) => {
                        const merge = matrixMergeGroups[category]?.[model];
                        // Cell is consumed by the rowSpan of the row above it.
                        if (merge && !merge.isFirst) return null;
                        const matchingParts = parts.filter((part) =>
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
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedModelFilter(model);
                                  setSelectedCategory(category);
                                  setViewMode('stock');
                                }}
                                className={`min-w-14 min-h-9 md:min-h-8 rounded-lg border px-2 py-1 font-mono text-xs font-black ${
                                  quantity === 0 ? 'border-rose-200 bg-rose-50 text-rose-600' : isLow ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                }`}
                                title={`${matchingParts.length} SKU${matchingParts.length === 1 ? '' : 's'} · ${quantity} units · Cost ${costValue.toLocaleString()} MMK · Retail ${retailValue.toLocaleString()} MMK${sharedLabel}`}
                              >
                                {quantity}
                              </button>
                            ) : <span className="text-[#C7C7CC]">—</span>}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-[#1D1D1F] bg-[#F5F5F7]">
                    <td className="sticky left-0 z-10 bg-[#F5F5F7] p-2.5 font-black text-[#1D1D1F]">
                      Total ({matrixGrandTotal.toLocaleString()})
                    </td>
                    {matrixCategories.map((category) => (
                      <td key={category} className="p-2 text-center font-mono text-xs font-black text-[#1D1D1F]">
                        {matrixCategoryTotals[category]?.toLocaleString() ?? 0}
                      </td>
                    ))}
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 text-center">
              <Boxes className="h-8 w-8 text-[#86868B]" />
              <p className="font-bold text-[#1D1D1F]">No saved inventory data yet</p>
              <p className="text-[11px] text-[#86868B]">Add components with a device model and category to populate the matrix.</p>
            </div>
          )}
        </div>
      )}

      {/* MODAL: ADD NEW PART */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="flex h-[82vh] max-h-[82vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-[#E5E5EA] bg-white text-xs shadow-2xl">
            <div className={isDeviceModelChooserOpen ? 'hidden' : 'contents'}>
            <div className="flex shrink-0 items-center justify-between border-b border-[#E5E5EA] px-4 py-3">
              <h3 className="flex items-center space-x-2 text-sm font-extrabold text-[#1D1D1F]">
                <Plus className="h-4 w-4 text-[#0071E3]" />
                <span>Register New Hardware Component</span>
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-[#86868B] hover:text-[#1D1D1F] p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3 [scrollbar-gutter:stable]">
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <label className="block font-bold text-[#1D1D1F]">Device Model</label>
                <span className="font-medium text-[10px] text-[#86868B]">Price List · {activeDeviceModels.length} models</span>
              </div>
              <button
                type="button"
                onClick={() => setIsDeviceModelChooserOpen(true)}
                aria-haspopup="dialog"
                className="flex h-24 w-full items-center justify-between rounded-xl border border-[#0071E3]/30 bg-blue-50/60 px-4 text-left transition-colors hover:border-[#0071E3] hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-[#0071E3]/20"
                title="Choose a model from the Price List"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <Smartphone className="h-6 w-6 shrink-0 text-[#0071E3]" />
                  <span className="min-w-0">
                    <span className="block text-sm font-extrabold text-[#0071E3]">Select Device Model</span>
                    <span className={`mt-1 block truncate text-xs font-medium ${newPartData.deviceCompatibility?.[0] ? 'text-[#1D1D1F]' : 'text-[#86868B]'}`}>
                      {newPartData.deviceCompatibility?.[0] || (activeDeviceModels.length ? 'Choose from Price List' : 'No models in Price List')}
                    </span>
                  </span>
                </span>
                <ArrowRight className="h-5 w-5 shrink-0 text-[#0071E3]" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <div className="mb-1 flex h-4 items-center">
                  <label className="block font-bold text-[#1D1D1F]">Category</label>
                </div>
                <CustomDropdownMenu
                  value={newPartData.category}
                  onChange={(category) => applyPartSpecification({ category })}
                  options={categories.map((category) => ({ value: category, label: category }))}
                  placeholder={categories.length ? 'Choose category' : 'Add a category in Settings first'}
                  className="w-full"
                  buttonClassName="!h-9 !w-full !rounded-lg !border-[#E5E5EA] !bg-[#F5F5F7] !px-2.5"
                  menuAlign="left"
                  size="md"
                />
              </div>

              <div>
                <div className="mb-1 flex h-4 items-center">
                  <label className="block font-bold text-[#1D1D1F]">Quality Tier</label>
                </div>
                <CustomDropdownMenu
                  value={newPartData.qualityTier || ''}
                  onChange={(qualityTier) => applyPartSpecification({ qualityTier: qualityTier as PartQualityTier })}
                  options={customQualityTiers.map((tier) => ({ value: tier, label: tier }))}
                  placeholder="Choose quality tier"
                  className="w-full"
                  buttonClassName="!h-9 !w-full !rounded-lg !border-[#E5E5EA] !bg-[#F5F5F7] !px-2.5"
                  menuAlign="left"
                  size="md"
                />
              </div>
            </div>

            {isBackGlassCategory && (
              <div className="rounded-xl border border-[#0071E3]/20 bg-blue-50/40 p-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Palette className="h-4 w-4 text-[#0071E3]" />
                    <div>
                      <p className="text-xs font-extrabold text-[#1D1D1F]">Back Glass Color</p>
                      <p className="text-[10px] text-[#86868B]">Match the original device color</p>
                    </div>
                  </div>
                  {newPartData.backGlassColor && (
                    <span className="text-[10px] font-bold text-[#0071E3]">{newPartData.backGlassColor}</span>
                  )}
                </div>

                {availableBackGlassColors.length ? (
                  <div className="flex flex-wrap gap-2">
                    {availableBackGlassColors.map((colorName) => {
                      const colorStyle = getRealisticColorStyle(colorName);
                      const isSelected = newPartData.backGlassColor === colorName;
                      return (
                        <button
                          key={colorName}
                          type="button"
                          onClick={() => applyPartSpecification({ backGlassColor: colorName })}
                          className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-2 text-[10px] font-bold transition-colors ${
                            isSelected
                              ? 'border-[#0071E3] bg-white text-[#0071E3] shadow-xs'
                              : 'border-[#E5E5EA] bg-white text-[#1D1D1F] hover:border-[#0071E3]/50'
                          }`}
                        >
                          <span
                            className={`h-3.5 w-3.5 rounded-full border border-white shadow-sm ${colorStyle.border}`}
                            style={{ background: colorStyle.gradient }}
                          />
                          <span>{colorName}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-[11px] font-medium text-[#86868B]">Select a device model first to choose the correct back glass color.</p>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <div className="mb-1 flex items-center justify-between gap-3">
                  <label className="block font-bold text-[#1D1D1F]">Part Name *</label>
                  <button
                    type="button"
                    onClick={() => setNewPartData((current) => ({ ...current, name: generatePartName(current) || current.name || '' }))}
                    className="inline-flex shrink-0 items-center gap-1 text-[10px] font-extrabold text-[#0071E3] hover:underline"
                    title="Generate from model, category, and quality tier"
                  >
                    <Sparkles className="h-3 w-3" /> Auto-generate
                  </button>
                </div>
                <input
                  type="text"
                  value={newPartData.name || ''}
                  onChange={(e) => setNewPartData({ ...newPartData, name: e.target.value })}
                  placeholder="Select model, category, and quality tier to generate"
                  className="w-full rounded-lg border border-[#E5E5EA] bg-[#F5F5F7] p-2 text-xs font-bold text-[#1D1D1F] focus:border-[#0071E3] focus:bg-white focus:outline-none"
                />
                <p className="mt-1 text-[10px] text-[#86868B]">Model → Category → Quality Tier</p>
              </div>

              <div className="sm:col-span-2">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <label className="block font-bold text-[#1D1D1F]">SKU / Code *</label>
                  <button
                    type="button"
                    onClick={() => setNewPartData((current) => ({ ...current, sku: generatePartSku(current) || current.sku || '' }))}
                    className="inline-flex items-center gap-1 text-[10px] font-extrabold text-[#0071E3] hover:underline"
                    title="Generate from model, category, color, and quality tier"
                  >
                    <Sparkles className="h-3 w-3" /> Auto-generate
                  </button>
                </div>
                <input
                  type="text"
                  value={newPartData.sku || ''}
                  onChange={(e) => setNewPartData({ ...newPartData, sku: e.target.value })}
                  placeholder="Generated after specifications are selected"
                  className="w-full rounded-lg border border-[#E5E5EA] bg-[#F5F5F7] p-2 text-xs font-mono text-[#1D1D1F] focus:border-[#0071E3] focus:bg-white focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <div className="flex justify-between items-center mb-1">
                  <label className="block font-bold text-[#1D1D1F]">Supplier Name *</label>
                  <button
                    type="button"
                    onClick={() => setShowAddSupplierMiniModal(true)}
                    className="text-[10px] text-[#0071E3] font-extrabold hover:underline flex items-center space-x-0.5 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Supplier Data</span>
                  </button>
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
                  buttonClassName="!h-9 !w-full !rounded-lg !border-[#E5E5EA] !bg-[#F5F5F7] !px-2.5"
                  menuAlign="left"
                  size="md"
                />
              </div>

              <div>
                <label className="block font-bold text-[#1D1D1F] mb-1">Cost Price (MMK)</label>
                <input
                  type="number"
                  value={newPartData.costPrice || ''}
                  onChange={(e) => setNewPartData({ ...newPartData, costPrice: Number(e.target.value) })}
                  className="w-full rounded-lg border border-[#E5E5EA] bg-[#F5F5F7] p-2 text-xs font-mono font-bold text-[#1D1D1F] focus:border-[#0071E3] focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-[#1D1D1F] mb-1">Selling Price (MMK)</label>
                <input
                  type="number"
                  value={newPartData.sellingPrice || ''}
                  onChange={(e) => setNewPartData({ ...newPartData, sellingPrice: Number(e.target.value) })}
                  className="w-full rounded-lg border border-[#E5E5EA] bg-[#F5F5F7] p-2 text-xs font-mono font-bold text-[#16A34A] focus:border-[#0071E3] focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-[#1D1D1F] mb-1">Initial Stock Qty</label>
                <input
                  type="number"
                  value={newPartData.quantityInStock || ''}
                  onChange={(e) => setNewPartData({ ...newPartData, quantityInStock: Number(e.target.value) })}
                  className="w-full rounded-lg border border-[#E5E5EA] bg-[#F5F5F7] p-2 text-xs font-mono text-[#1D1D1F] focus:border-[#0071E3] focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <label className="block font-bold text-[#1D1D1F]">Storage Location Bin</label>
                  {existingLocationBins.length > 0 && (
                    <span className="text-[10px] font-medium text-[#86868B]">{existingLocationBins.length} saved</span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={newPartData.locationBin || ''}
                    onFocus={() => setIsLocationBinMenuOpen(true)}
                    onChange={(e) => {
                      setNewPartData({ ...newPartData, locationBin: e.target.value });
                      setIsLocationBinMenuOpen(true);
                    }}
                    placeholder="Choose saved bin or type a new bin"
                    className="w-full rounded-lg border border-[#E5E5EA] bg-[#F5F5F7] p-2 pr-8 text-xs font-mono text-[#1D1D1F] focus:border-[#0071E3] focus:bg-white focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setIsLocationBinMenuOpen((open) => !open)}
                    className="absolute right-1 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-[#86868B] hover:bg-white hover:text-[#0071E3]"
                    title="Choose a saved bin"
                  >
                    <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isLocationBinMenuOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isLocationBinMenuOpen && (
                    <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-lg border border-[#E5E5EA] bg-white p-1 shadow-lg">
                      {existingLocationBins.length ? (
                        <div className="max-h-32 overflow-y-auto">
                          {existingLocationBins.map((bin) => (
                            <button
                              key={bin}
                              type="button"
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={() => {
                                setNewPartData({ ...newPartData, locationBin: bin });
                                setIsLocationBinMenuOpen(false);
                              }}
                              className="flex w-full items-center rounded-md px-2 py-1.5 text-left font-mono text-[11px] font-bold text-[#1D1D1F] hover:bg-blue-50 hover:text-[#0071E3]"
                            >
                              {bin}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="px-2 py-2 text-[11px] text-[#86868B]">No saved bins yet — type a new bin above.</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Projected Margin Card */}
            {Boolean(newPartData.costPrice && newPartData.sellingPrice) && (
              <div className="p-3 bg-[#EAF8ED] border border-[#34C759]/30 rounded-xl flex items-center justify-between text-xs font-bold text-[#1E7E34]">
                <span>Projected Profit Margin per Unit:</span>
                <span className="font-mono text-sm">
                  +{(Number(newPartData.sellingPrice) - Number(newPartData.costPrice)).toLocaleString()} MMK
                </span>
              </div>
            )}
            </div>

            <div className="flex shrink-0 justify-end space-x-2 border-t border-[#E5E5EA] bg-white px-4 py-2.5">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="rounded-lg border border-[#E5E5EA] bg-white px-3 py-2 text-xs font-bold text-[#1D1D1F] hover:bg-[#F5F5F7]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveNewPart}
                className="rounded-lg bg-[#0071E3] px-4 py-2 text-xs font-extrabold text-white shadow-xs transition-all hover:bg-[#0051B3] active:scale-95"
              >
                Save Hardware Component
              </button>
            </div>
            </div>

            {isDeviceModelChooserOpen && (
              <DeviceModelChooserModal
                embedded
                isOpen
                onClose={() => setIsDeviceModelChooserOpen(false)}
                selectedDevice={newPartData.deviceCompatibility?.[0] || ''}
                onSelectDevice={(model) => applyPartSpecification({ deviceCompatibility: [model] })}
              />
            )}
          </div>
        </div>
      )}

      {/* MODAL: PART DETAILS */}
      {selectedPartForDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg space-y-4 rounded-2xl border border-[#E5E5EA] bg-white p-5 text-xs shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-[#E5E5EA] pb-3">
              <div className="min-w-0">
                <p className="font-mono text-[10px] font-extrabold text-[#0071E3]">{selectedPartForDetails.sku}</p>
                <h3 className="mt-1 truncate text-sm font-extrabold text-[#1D1D1F]">{selectedPartForDetails.name}</h3>
                <p className="mt-1 text-[11px] text-[#86868B]">{selectedPartForDetails.category} · {selectedPartForDetails.qualityTier}</p>
              </div>
              <button type="button" onClick={() => setSelectedPartForDetails(null)} aria-label="Close part details" title="Close details" className="rounded-lg p-1 text-[#86868B] hover:bg-[#F5F5F7] hover:text-[#1D1D1F]">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-[#E5E5EA] bg-[#F8F9FA] p-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-[#86868B]">In Stock</p>
                <p className="mt-1 font-mono text-xl font-black text-[#1D1D1F]">{selectedPartForDetails.quantityInStock}</p>
                <div className="mt-2 flex gap-1.5">
                  <button type="button" onClick={() => { onUpdatePartStock(selectedPartForDetails.id, Math.max(0, selectedPartForDetails.quantityInStock - 1)); setSelectedPartForDetails({ ...selectedPartForDetails, quantityInStock: Math.max(0, selectedPartForDetails.quantityInStock - 1) }); }} aria-label="Subtract one from stock" title="Subtract one" className="flex h-10 w-10 lg:h-7 lg:w-7 items-center justify-center rounded-lg border border-[#E5E5EA] bg-white font-black hover:bg-rose-50 hover:text-rose-600">−</button>
                  <button type="button" onClick={() => { onUpdatePartStock(selectedPartForDetails.id, selectedPartForDetails.quantityInStock + 1); setSelectedPartForDetails({ ...selectedPartForDetails, quantityInStock: selectedPartForDetails.quantityInStock + 1 }); }} aria-label="Add one to stock" title="Add one" className="flex h-10 w-10 lg:h-7 lg:w-7 items-center justify-center rounded-lg border border-[#E5E5EA] bg-white font-black text-[#0071E3] hover:bg-emerald-50 hover:text-emerald-600">+</button>
                  <span className="self-center text-[10px] font-bold text-[#86868B]">Min: {selectedPartForDetails.reorderPoint}</span>
                </div>
              </div>
              <div className="rounded-xl border border-[#E5E5EA] bg-[#F8F9FA] p-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-[#86868B]">Price & Location</p>
                <p className="mt-1 font-mono text-[11px] font-bold text-[#1D1D1F]">Cost {selectedPartForDetails.costPrice.toLocaleString()} MMK</p>
                <p className="font-mono text-[11px] font-black text-[#16A34A]">Sell {selectedPartForDetails.sellingPrice.toLocaleString()} MMK</p>
                <p className="mt-2 text-[10px] font-semibold text-[#86868B]">Bin: {selectedPartForDetails.locationBin || '—'}</p>
              </div>
            </div>

            <div className="rounded-xl border border-[#E5E5EA] bg-[#F8F9FA] p-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-[#86868B]">Supplier</p>
              <p className="mt-1 font-semibold text-[#1D1D1F]">{selectedPartForDetails.supplierName || 'No supplier assigned'}</p>
            </div>

            <div className="flex flex-wrap justify-end gap-2 border-t border-[#E5E5EA] pt-3">
              <button type="button" onClick={() => { setClaimingWarrantyPart(selectedPartForDetails); setSelectedPartForDetails(null); }} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 font-extrabold text-amber-700 hover:bg-amber-100"><ShieldAlert className="h-3.5 w-3.5" /> Warranty</button>
              <button type="button" onClick={() => { setEditingPart(selectedPartForDetails); setSelectedPartForDetails(null); }} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#E5E5EA] bg-[#F5F5F7] px-2.5 font-extrabold text-[#1D1D1F] hover:bg-[#E5E5EA]"><Edit2 className="h-3.5 w-3.5" /> Edit</button>
              <button type="button" onClick={() => { if (window.confirm(`Delete part “${selectedPartForDetails.name}” (${selectedPartForDetails.sku})?`)) { onDeletePart?.(selectedPartForDetails.id); setSelectedPartForDetails(null); } }} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-2.5 font-extrabold text-rose-600 hover:bg-rose-100"><Trash2 className="h-3.5 w-3.5" /> Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDIT PART DETAILS */}
      {editingPart && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5E5EA] rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-5 space-y-3 text-xs shadow-2xl">
            <div className="flex justify-between items-center border-b border-[#E5E5EA] pb-3">
              <h3 className="text-sm font-extrabold text-[#1D1D1F] flex items-center space-x-2">
                <Edit2 className="w-4 h-4 text-[#0071E3]" />
                <span>Edit Component: {editingPart.name}</span>
              </h3>
              <button
                onClick={() => setEditingPart(null)}
                className="text-[#86868B] hover:text-[#1D1D1F]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5">
              <div>
                <label className="block font-bold text-[#1D1D1F] mb-1">Part Name</label>
                <input
                  type="text"
                  value={editingPart.name}
                  onChange={(e) => setEditingPart({ ...editingPart, name: e.target.value })}
                  className="w-full bg-[#F5F5F7] border border-[#E5E5EA] rounded-xl p-2.5 text-xs font-bold text-[#1D1D1F]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#1D1D1F] mb-1">Current Stock Qty</label>
                  <input
                    type="number"
                    value={editingPart.quantityInStock}
                    onChange={(e) => setEditingPart({ ...editingPart, quantityInStock: Number(e.target.value) })}
                    className="w-full bg-[#F5F5F7] border border-[#E5E5EA] rounded-xl p-2.5 text-xs font-mono font-bold text-[#1D1D1F]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#1D1D1F] mb-1">Reorder Point Threshold</label>
                  <input
                    type="number"
                    value={editingPart.reorderPoint}
                    onChange={(e) => setEditingPart({ ...editingPart, reorderPoint: Number(e.target.value) })}
                    className="w-full bg-[#F5F5F7] border border-[#E5E5EA] rounded-xl p-2.5 text-xs font-mono text-[#1D1D1F]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#1D1D1F] mb-1">Cost Price (MMK)</label>
                  <input
                    type="number"
                    value={editingPart.costPrice}
                    onChange={(e) => setEditingPart({ ...editingPart, costPrice: Number(e.target.value) })}
                    className="w-full bg-[#F5F5F7] border border-[#E5E5EA] rounded-xl p-2.5 text-xs font-mono text-[#1D1D1F]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#1D1D1F] mb-1">Selling Price (MMK)</label>
                  <input
                    type="number"
                    value={editingPart.sellingPrice}
                    onChange={(e) => setEditingPart({ ...editingPart, sellingPrice: Number(e.target.value) })}
                    className="w-full bg-[#F5F5F7] border border-[#E5E5EA] rounded-xl p-2.5 text-xs font-mono text-[#16A34A] font-bold"
                  />
                </div>
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <label className="block font-bold text-[#1D1D1F]">Storage Location Bin</label>
                  {existingLocationBins.length > 0 && (
                    <span className="text-[10px] font-medium text-[#86868B]">{existingLocationBins.length} saved</span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={editingPart.locationBin}
                    onFocus={() => setIsEditLocationBinMenuOpen(true)}
                    onChange={(e) => {
                      setEditingPart({ ...editingPart, locationBin: e.target.value });
                      setIsEditLocationBinMenuOpen(true);
                    }}
                    placeholder="Choose saved bin or type a new bin"
                    className="w-full bg-[#F5F5F7] border border-[#E5E5EA] rounded-xl p-2.5 pr-9 text-xs font-mono text-[#1D1D1F] focus:border-[#0071E3] focus:bg-white focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setIsEditLocationBinMenuOpen((open) => !open)}
                    className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-[#86868B] hover:bg-white hover:text-[#0071E3]"
                    title="Choose a saved bin"
                  >
                    <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isEditLocationBinMenuOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isEditLocationBinMenuOpen && (
                    <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-lg border border-[#E5E5EA] bg-white p-1 shadow-lg">
                      {existingLocationBins.length ? (
                        <div className="max-h-32 overflow-y-auto">
                          {existingLocationBins.map((bin) => (
                            <button
                              key={bin}
                              type="button"
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={() => {
                                setEditingPart({ ...editingPart, locationBin: bin });
                                setIsEditLocationBinMenuOpen(false);
                              }}
                              className="flex w-full items-center rounded-md px-2 py-1.5 text-left font-mono text-[11px] font-bold text-[#1D1D1F] hover:bg-blue-50 hover:text-[#0071E3]"
                            >
                              {bin}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="px-2 py-2 text-[11px] text-[#86868B]">No saved bins yet — type a new bin above.</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <div className="mb-1 flex items-center">
                  <label className="block font-bold text-[#1D1D1F]">Quality Tier</label>
                </div>
                <select
                  value={editingPart.qualityTier}
                  onChange={(e) => setEditingPart({ ...editingPart, qualityTier: e.target.value as any })}
                  className="w-full bg-[#F5F5F7] border border-[#E5E5EA] rounded-xl p-2.5 text-xs font-bold text-[#1D1D1F]"
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
                  <label className="block font-bold text-[#1D1D1F]">Supplier Name (For Warranty / RMA Claim) *</label>
                  <button
                    type="button"
                    onClick={() => setShowAddSupplierMiniModal(true)}
                    className="text-[10px] text-[#0071E3] font-extrabold hover:underline flex items-center space-x-0.5 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Supplier Data</span>
                  </button>
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
                  buttonClassName="w-full rounded-xl bg-[#F5F5F7] px-3 py-2.5 text-left text-xs font-bold text-[#1D1D1F]"
                  menuAlign="left"
                />
              </div>

            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-[#E5E5EA]">
              <button
                type="button"
                onClick={() => setEditingPart(null)}
                className="px-4 py-2 bg-white border border-[#E5E5EA] text-[#1D1D1F] font-bold rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEditPart}
                className="px-5 py-2 bg-[#0071E3] hover:bg-[#0051B3] text-white font-extrabold rounded-xl shadow-xs"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: FILE PARTS WARRANTY CLAIM */}
      {claimingWarrantyPart && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5E5EA] rounded-2xl max-w-lg w-full p-6 space-y-4 text-xs shadow-2xl">
            <div className="flex justify-between items-center border-b border-[#E5E5EA] pb-3">
              <h3 className="text-base font-extrabold text-[#1D1D1F] flex items-center space-x-2">
                <ShieldAlert className="w-5 h-5 text-amber-600" />
                <span>File Parts Warranty Claim (RMA)</span>
              </h3>
              <button
                onClick={() => setClaimingWarrantyPart(null)}
                className="text-[#86868B] hover:text-[#1D1D1F] p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Part Details Summary Banner */}
            <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl space-y-1">
              <p className="font-extrabold text-amber-900 text-xs">
                Component: {claimingWarrantyPart.name}
              </p>
              <p className="text-[11px] text-amber-800 font-mono">
                SKU: {claimingWarrantyPart.sku} | Quality: {claimingWarrantyPart.qualityTier} | Stock: {claimingWarrantyPart.quantityInStock} units
              </p>
            </div>

            <div className="space-y-3">
              {/* Supplier Selection for Warranty Claim */}
              <div>
                <label className="block font-bold text-[#1D1D1F] mb-1">Select Supplier Name for Claim *</label>
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
                  className="w-full bg-[#F5F5F7] border border-[#E5E5EA] rounded-xl p-2.5 text-xs font-bold text-[#1D1D1F] focus:bg-white focus:border-[#0071E3] focus:outline-none"
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code}) - Avg RMA: {s.avgRmaTurnaroundDays}d
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#1D1D1F] mb-1">Claim Quantity</label>
                  <input
                    type="number"
                    min={1}
                    max={claimingWarrantyPart.quantityInStock || 99}
                    value={warrantyForm.quantity}
                    onChange={(e) => setWarrantyForm({ ...warrantyForm, quantity: Number(e.target.value) })}
                    className="w-full bg-[#F5F5F7] border border-[#E5E5EA] rounded-xl p-2.5 text-xs font-mono font-bold text-[#1D1D1F]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#1D1D1F] mb-1">Unit Cost (MMK)</label>
                  <input
                    type="number"
                    value={warrantyForm.unitCost}
                    onChange={(e) => setWarrantyForm({ ...warrantyForm, unitCost: Number(e.target.value) })}
                    className="w-full bg-[#F5F5F7] border border-[#E5E5EA] rounded-xl p-2.5 text-xs font-mono font-bold text-[#1D1D1F]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#1D1D1F] mb-1">Defect / Warranty Reason *</label>
                <select
                  value={warrantyForm.reason}
                  onChange={(e) => setWarrantyForm({ ...warrantyForm, reason: e.target.value })}
                  className="w-full bg-[#F5F5F7] border border-[#E5E5EA] rounded-xl p-2.5 text-xs font-medium text-[#1D1D1F] mb-2"
                >
                  <option value="Screen touch unresponsive / ghost touching">Screen touch unresponsive / ghost touching</option>
                  <option value="Display flickering / dead pixels / lines">Display flickering / dead pixels / lines</option>
                  <option value="Battery swelling / rapid discharge / non-charging">Battery swelling / rapid discharge / non-charging</option>
                  <option value="FPC connector damaged / loose fit">FPC connector damaged / loose fit</option>
                  <option value="DOA (Dead On Arrival) / No power">DOA (Dead On Arrival) / No power</option>
                  <option value="Wrong part delivered / mislabeled">Wrong part delivered / mislabeled</option>
                </select>
                <input
                  type="text"
                  value={warrantyForm.reason}
                  onChange={(e) => setWarrantyForm({ ...warrantyForm, reason: e.target.value })}
                  placeholder="Or type custom warranty reason..."
                  className="w-full bg-[#F5F5F7] border border-[#E5E5EA] rounded-xl p-2 text-xs text-[#1D1D1F]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#1D1D1F] mb-1">Return Tracking / RMA Reference Number</label>
                <input
                  type="text"
                  value={warrantyForm.trackingNumber}
                  onChange={(e) => setWarrantyForm({ ...warrantyForm, trackingNumber: e.target.value })}
                  placeholder="e.g. 1Z9999990199887766 or RMA-8891"
                  className="w-full bg-[#F5F5F7] border border-[#E5E5EA] rounded-xl p-2.5 text-xs font-mono text-[#1D1D1F]"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-[#E5E5EA]">
              <button
                type="button"
                onClick={() => setClaimingWarrantyPart(null)}
                className="px-4 py-2 bg-white border border-[#E5E5EA] text-[#1D1D1F] font-bold rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitWarrantyClaim}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-extrabold rounded-xl shadow-xs flex items-center space-x-1.5 cursor-pointer"
              >
                <ShieldAlert className="w-4 h-4" />
                <span>File Warranty Claim</span>
              </button>
            </div>
          </div>
        </div>
      )}


      {/* MINI MODAL: QUICK ADD SUPPLIER */}
      {showAddSupplierMiniModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <form onSubmit={handleCreateSupplier} className="bg-white border border-[#E5E5EA] rounded-2xl max-w-md w-full p-5 space-y-4 text-xs shadow-2xl">
            <div className="flex justify-between items-center border-b border-[#E5E5EA] pb-2">
              <h4 className="font-extrabold text-[#1D1D1F] text-sm flex items-center space-x-1.5">
                <Truck className="w-4 h-4 text-[#0071E3]" />
                <span>Quick Register Supplier Vendor</span>
              </h4>
              <button
                type="button"
                onClick={() => setShowAddSupplierMiniModal(false)}
                className="text-[#86868B] hover:text-[#1D1D1F]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block font-bold text-[#1D1D1F] mb-1">Supplier Name *</label>
                <input
                  type="text"
                  required
                  value={newSupplierForm.name}
                  onChange={(e) => setNewSupplierForm({ ...newSupplierForm, name: e.target.value })}
                  placeholder="e.g. MobileSentrix USA"
                  className="w-full bg-[#F5F5F7] border border-[#E5E5EA] rounded-xl p-2 text-xs font-bold text-[#1D1D1F]"
                />
              </div>
              <div>
                <label className="block font-bold text-[#1D1D1F] mb-1">Supplier Short Code *</label>
                <input
                  type="text"
                  required
                  value={newSupplierForm.code}
                  onChange={(e) => setNewSupplierForm({ ...newSupplierForm, code: e.target.value })}
                  placeholder="e.g. MS-US"
                  className="w-full bg-[#F5F5F7] border border-[#E5E5EA] rounded-xl p-2 text-xs font-mono font-bold text-[#1D1D1F]"
                />
              </div>
              <div>
                <label className="block font-bold text-[#1D1D1F] mb-1">Avg RMA Turnaround (Days)</label>
                <input
                  type="number"
                  value={newSupplierForm.avgRmaTurnaroundDays}
                  onChange={(e) => setNewSupplierForm({ ...newSupplierForm, avgRmaTurnaroundDays: Number(e.target.value) })}
                  className="w-full bg-[#F5F5F7] border border-[#E5E5EA] rounded-xl p-2 text-xs font-mono text-[#1D1D1F]"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2 pt-2 border-t border-[#E5E5EA]">
              <button
                type="button"
                onClick={() => setShowAddSupplierMiniModal(false)}
                className="px-3 py-2 bg-white border border-[#E5E5EA] text-[#1D1D1F] font-bold rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-[#0071E3] text-white font-extrabold rounded-xl shadow-xs"
              >
                Save Supplier
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MINI MODAL: QUICK ADD QUALITY TIER */}
      {showAddQualityMiniModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <form onSubmit={handleCreateQualityTier} className="bg-white border border-[#E5E5EA] rounded-2xl max-w-md w-full p-5 space-y-4 text-xs shadow-2xl">
            <div className="flex justify-between items-center border-b border-[#E5E5EA] pb-2">
              <h4 className="font-extrabold text-[#1D1D1F] text-sm flex items-center space-x-1.5">
                <ShieldCheck className="w-4 h-4 text-purple-600" />
                <span>Create Quality Tier</span>
              </h4>
              <button
                type="button"
                onClick={() => setShowAddQualityMiniModal(false)}
                className="text-[#86868B] hover:text-[#1D1D1F]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div>
              <label className="block font-bold text-[#1D1D1F] mb-1">Quality Tier Name *</label>
              <input
                type="text"
                required
                value={newQualityForm.name}
                onChange={(e) => setNewQualityForm({ name: e.target.value })}
                placeholder="e.g. OEM / Original / Genuine"
                className="w-full bg-[#F5F5F7] border border-[#E5E5EA] rounded-xl p-2.5 text-xs font-bold text-[#1D1D1F]"
              />
            </div>
            <div className="flex justify-end space-x-2 pt-2 border-t border-[#E5E5EA]">
              <button
                type="button"
                onClick={() => setShowAddQualityMiniModal(false)}
                className="px-3 py-2 bg-white border border-[#E5E5EA] text-[#1D1D1F] font-bold rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-purple-600 text-white font-extrabold rounded-xl shadow-xs"
              >
                Create Tier
              </button>
            </div>
          </form>
        </div>
      )}

      {/* EDIT SUPPLIER MODAL */}
      {editingSupplier && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSaveEditSupplier} className="bg-white border border-[#E5E5EA] rounded-2xl max-w-md w-full p-5 space-y-4 text-xs shadow-2xl">
            <div className="flex justify-between items-center border-b border-[#E5E5EA] pb-2">
              <h4 className="font-extrabold text-[#1D1D1F] text-sm flex items-center space-x-1.5">
                <Truck className="w-4 h-4 text-[#0071E3]" />
                <span>Edit Supplier Vendor</span>
              </h4>
              <button
                type="button"
                onClick={() => setEditingSupplier(null)}
                className="text-[#86868B] hover:text-[#1D1D1F]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block font-bold text-[#1D1D1F] mb-1">Supplier Name *</label>
                <input
                  type="text"
                  required
                  value={editingSupplier.name}
                  onChange={(e) => setEditingSupplier({ ...editingSupplier, name: e.target.value })}
                  className="w-full bg-[#F5F5F7] border border-[#E5E5EA] rounded-xl p-2 text-xs font-bold text-[#1D1D1F]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-[#1D1D1F] mb-1">Short Code *</label>
                  <input
                    type="text"
                    required
                    value={editingSupplier.code}
                    onChange={(e) => setEditingSupplier({ ...editingSupplier, code: e.target.value })}
                    className="w-full bg-[#F5F5F7] border border-[#E5E5EA] rounded-xl p-2 text-xs font-mono font-bold text-[#1D1D1F]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#1D1D1F] mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={editingSupplier.phone}
                    onChange={(e) => setEditingSupplier({ ...editingSupplier, phone: e.target.value })}
                    className="w-full bg-[#F5F5F7] border border-[#E5E5EA] rounded-xl p-2 text-xs text-[#1D1D1F]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#1D1D1F] mb-1">Contact Email</label>
                <input
                  type="email"
                  value={editingSupplier.contactEmail}
                  onChange={(e) => setEditingSupplier({ ...editingSupplier, contactEmail: e.target.value })}
                  className="w-full bg-[#F5F5F7] border border-[#E5E5EA] rounded-xl p-2 text-xs text-[#1D1D1F]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#1D1D1F] mb-1">Avg RMA Turnaround (Days)</label>
                <input
                  type="number"
                  value={editingSupplier.avgRmaTurnaroundDays}
                  onChange={(e) => setEditingSupplier({ ...editingSupplier, avgRmaTurnaroundDays: Number(e.target.value) })}
                  className="w-full bg-[#F5F5F7] border border-[#E5E5EA] rounded-xl p-2 text-xs text-[#1D1D1F]"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-[#E5E5EA]">
              <button
                type="button"
                onClick={() => setEditingSupplier(null)}
                className="px-3 py-2 bg-white border border-[#E5E5EA] text-[#1D1D1F] font-bold rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-[#0071E3] hover:bg-[#0051B3] text-white font-extrabold rounded-xl shadow-xs cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}

      {/* EDIT QUALITY TIER MODAL */}
      {editingQualityTier && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSaveEditQualityTier} className="bg-white border border-[#E5E5EA] rounded-2xl max-w-md w-full p-5 space-y-4 text-xs shadow-2xl">
            <div className="flex justify-between items-center border-b border-[#E5E5EA] pb-2">
              <h4 className="font-extrabold text-[#1D1D1F] text-sm flex items-center space-x-1.5">
                <ShieldCheck className="w-4 h-4 text-purple-600" />
                <span>Rename Quality Tier</span>
              </h4>
              <button
                type="button"
                onClick={() => setEditingQualityTier(null)}
                className="text-[#86868B] hover:text-[#1D1D1F]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block font-bold text-[#1D1D1F] mb-1">Quality Tier Name *</label>
              <input
                type="text"
                required
                value={editingQualityTier.newName}
                onChange={(e) => setEditingQualityTier({ ...editingQualityTier, newName: e.target.value })}
                className="w-full bg-[#F5F5F7] border border-[#E5E5EA] rounded-xl p-2.5 text-xs font-bold text-[#1D1D1F]"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-[#E5E5EA]">
              <button
                type="button"
                onClick={() => setEditingQualityTier(null)}
                className="px-3 py-2 bg-white border border-[#E5E5EA] text-[#1D1D1F] font-bold rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-extrabold rounded-xl shadow-xs cursor-pointer"
              >
                Save Tier Name
              </button>
            </div>
          </form>
        </div>
      )}

      {showInlineSaveConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl space-y-4 rounded-2xl border border-[#D2D2D7] bg-white p-5 text-[11px] shadow-2xl">
            {(() => {
              const totalChangeCount = inlineSaveReview.reduce((count, item) => count + item.changes.length, 0);
              const categoryChangeCount = inlineSaveReview.reduce(
                (count, item) => count + item.changes.filter((change) => /category/i.test(change.label)).length,
                0,
              );
              return (
                <>
            <div className="flex items-start justify-between gap-2 border-b border-[#E5E5EA] pb-2">
              <div>
                <p className="text-[8px] font-extrabold uppercase tracking-[0.2em] text-[#0071E3]">Confirm stock changes</p>
                <h3 className="mt-0.5 text-sm font-black text-[#111111]">Review before saving</h3>
                <p className="mt-0.5 text-[10px] font-semibold text-[#111111]">Approve only when the list below looks right.</p>
              </div>
              <button type="button" onClick={() => setShowInlineSaveConfirm(false)} aria-label="Close inline save confirmation" title="Close" className="rounded-lg p-1 text-[#111111] hover:bg-[#F5F5F7] hover:text-[#0071E3]">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
              <div className="rounded-xl border border-[#E5E5EA] bg-[#FAFAFA] px-3 py-2">
                <p className="text-[8px] font-bold uppercase tracking-wide text-[#86868B]">Total changes</p>
                <p className="mt-0.5 text-sm font-black text-[#111111]">{totalChangeCount}</p>
              </div>
              <div className="rounded-xl border border-[#E5E5EA] bg-[#FAFAFA] px-3 py-2">
                <p className="text-[8px] font-bold uppercase tracking-wide text-[#86868B]">Category changes</p>
                <p className="mt-0.5 text-sm font-black text-[#111111]">{categoryChangeCount}</p>
              </div>
              <div className="rounded-xl border border-[#E5E5EA] bg-[#FAFAFA] px-3 py-2">
                <p className="text-[8px] font-bold uppercase tracking-wide text-[#86868B]">Rows affected</p>
                <p className="mt-0.5 text-sm font-black text-[#111111]">{inlineSaveReview.length}</p>
              </div>
            </div>

            <div className="max-h-[52vh] space-y-2.5 overflow-y-auto pr-1">
              {inlineSaveReview.length ? (
                inlineSaveReview.map(({ part, changes }) => (
                  <div key={part.id} className="rounded-xl border border-[#E5E5EA] bg-white p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-[11px] font-black text-[#111111]">{part.name}</p>
                        <p className="mt-0.5 font-mono text-[9px] font-bold text-[#111111]">{part.sku}</p>
                      </div>
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[9px] font-extrabold text-[#0071E3]">{changes.length} change{changes.length === 1 ? '' : 's'}</span>
                    </div>
                    <div className="mt-2 grid gap-1.5">
                      {changes.map((change) => (
                        <div key={`${part.id}-${change.label}`} className="flex items-center justify-between gap-2 rounded-lg bg-[#FAFAFA] px-2.5 py-1.5">
                          <span className="text-[9px] font-bold uppercase tracking-wide text-[#111111]">{change.label}</span>
                          <span className="font-mono text-[9px] font-black text-[#111111]">{change.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-[#D2D2D7] bg-white p-4 text-center">
                  <p className="text-[9px] font-bold text-[#111111]">No pending changes to save.</p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-[#E5E5EA] pt-3">
              <button
                type="button"
                onClick={() => setShowInlineSaveConfirm(false)}
                className="rounded-lg border border-[#E5E5EA] bg-white px-4 py-2 text-[11px] font-bold text-[#111111] hover:bg-[#F5F5F7]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmInlineSave}
                disabled={!inlineSaveReview.length || isInlineSaving}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#0071E3] px-5 py-2 text-[11px] font-extrabold text-white shadow-xs transition-all hover:bg-[#0051B3] disabled:cursor-not-allowed disabled:bg-[#A5A5AA]"
              >
                {isInlineSaving && <span className="h-3 w-3 rounded-full border-2 border-white/40 border-t-white animate-spin" />}
                {isInlineSaving ? 'Saving…' : 'Approve & Save'}
              </button>
            </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* PRINT: Ground Stock Checking Matrix Sheet */}
      {isMatrixPrintOpen && (
        <div className="printable-print-root fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 p-2 backdrop-blur-sm sm:p-4">
          <style>{`
            @media print {
              html, body, #root, #main-content-scroll, main, .basic-ui {
                background: #ffffff !important;
                color: #000000 !important;
                margin: 0 !important;
                padding: 0 !important;
                width: 100% !important;
                min-width: 0 !important;
                max-width: 100% !important;
                overflow: visible !important;
              }
              /* Hide the whole app shell, keep only the print overlay. */
              body:has(.printable-print-root) .basic-ui > *:not(:has(.printable-print-root)):not(.printable-print-root):not(.printable-print-root *),
              body:has(.printable-print-root) .basic-ui main *:not(:has(.printable-print-root)):not(.printable-print-root):not(.printable-print-root *) {
                display: none !important;
              }
              /* The overlay + sheet flow normally so multi-page paginates correctly. */
              .printable-print-root,
              #matrix-print-sheet {
                position: static !important;
                display: block !important;
                width: 100% !important;
                max-width: 100% !important;
                min-width: 0 !important;
                height: auto !important;
                max-height: none !important;
                margin: 0 !important;
                padding: 0 !important;
                border: none !important;
                box-shadow: none !important;
                background: #ffffff !important;
                color: #000000 !important;
                overflow: visible !important;
              }
              #matrix-print-sheet .matrix-print-no-print {
                display: none !important;
              }
              #matrix-print-sheet .overflow-x-auto {
                overflow: visible !important;
                width: 100% !important;
              }
              #matrix-print-sheet .printable-box {
                border: none !important;
                padding: 0 !important;
                border-radius: 0 !important;
              }
              #matrix-print-sheet table {
                width: 100% !important;
                table-layout: fixed !important;
                border-collapse: collapse !important;
                font-size: 8px !important;
                line-height: 1.25 !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              /* Model column wider; category columns share the rest */
              #matrix-print-sheet table th:first-child,
              #matrix-print-sheet table td:first-child {
                width: 21% !important;
              }
              #matrix-print-sheet table th:not(:first-child),
              #matrix-print-sheet table td:not(:first-child) {
                width: auto !important;
              }
              #matrix-print-sheet table th,
              #matrix-print-sheet table td {
                padding: 3px 4px !important;
                border: 1px solid #888 !important;
                overflow-wrap: break-word !important;
                word-break: break-word !important;
              }
              /* Keep merged (rowSpan) cells visually clear in B&W print */
              #matrix-print-sheet table td[rowspan] {
                border-top: 2px solid #555 !important;
                border-bottom: 2px solid #555 !important;
              }
              #matrix-print-sheet table th {
                font-size: 7px !important;
                font-weight: 700 !important;
                background: #eee !important;
              }
              #matrix-print-sheet h1 {
                font-size: 14px !important;
              }
              #matrix-print-sheet thead {
                display: table-header-group !important;
              }
              #matrix-print-sheet tr {
                break-inside: avoid !important;
              }
              @page { size: A4 landscape; margin: 6mm; }
            }
          `}</style>

          <div id="matrix-print-sheet" className="matrix-print-sheet mx-auto my-4 w-full max-w-6xl rounded-2xl border border-[#E5E5EA] bg-white p-4 shadow-xl">
            {/* Screen-only header with close/print actions */}
            <div className="matrix-print-no-print mb-4 flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-[#1D1D1F]">Ground Stock Checking Sheet</h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 rounded-lg bg-[#0071E3] px-3 py-2 text-[11px] font-extrabold text-white transition hover:bg-[#0051B3]"
                >
                  <Printer className="h-3.5 w-3.5" /> Print
                </button>
                <button
                  type="button"
                  onClick={() => setIsMatrixPrintOpen(false)}
                  className="rounded-lg border border-[#E5E5EA] bg-[#F5F5F7] px-3 py-2 text-[11px] font-bold text-[#1D1D1F] transition hover:bg-[#E5E5EA]"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Printable sheet */}
            <div className="printable-box rounded-xl border border-[#E5E5EA] p-4">
              <div className="mb-3 flex items-start justify-between border-b border-[#E5E5EA] pb-3">
                <div>
                  <h1 className="text-base font-black text-[#1D1D1F]">i35 Apple Service — Ground Stock Checking</h1>
                  <p className="text-[10px] text-[#86868B]">Device Model × Component Stock Matrix</p>
                </div>
                <div className="text-right text-[10px] text-[#86868B]">
                  <p>Date: <span className="font-bold text-[#1D1D1F]">{new Date().toLocaleDateString()}</span></p>
                  <p>Time: <span className="font-bold text-[#1D1D1F]">{new Date().toLocaleTimeString()}</span></p>
                  <p className="mt-1">Checker: ______________________</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-[10px]">
                  <thead>
                    <tr className="border-b-2 border-[#1D1D1F]">
                      <th className="border border-[#D2D2D7] bg-[#F5F5F7] p-1.5 text-left font-black">Device Model</th>
                      {matrixCategories.map((category) => (
                        <th key={category} className="border border-[#D2D2D7] bg-[#F5F5F7] p-1.5 text-center font-black">{category}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {matrixModels.map((model) => (
                      <tr key={model} className="break-inside-avoid">
                        <td className="border border-[#D2D2D7] p-1.5 font-bold text-[#1D1D1F]">{model}</td>
                        {matrixCategories.map((category) => {
                          const merge = matrixMergeGroups[category]?.[model];
                          // Cell is consumed by the rowSpan of the row above it.
                          if (merge && !merge.isFirst) return null;
                          const matchingParts = parts.filter((part) =>
                            part.category === category && part.deviceCompatibility.some((device) => device.toLowerCase() === model.toLowerCase())
                          );
                          const quantity = matchingParts.reduce((total, part) => total + part.quantityInStock, 0);
                          return (
                            <td key={category} rowSpan={merge?.rowSpan ?? 1} className="border border-[#D2D2D7] p-1 text-center font-mono align-middle">
                              {matchingParts.length ? (
                                <span className={quantity === 0 ? 'font-black text-[#C7C7CC]' : 'font-black'}>{quantity}</span>
                              ) : (
                                <span className="text-[#C7C7CC]">—</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-[#1D1D1F]">
                      <td className="border border-[#D2D2D7] bg-[#F5F5F7] p-1.5 font-black text-[#1D1D1F]">
                        Total ({matrixGrandTotal.toLocaleString()})
                      </td>
                      {matrixCategories.map((category) => (
                        <td key={category} className="border border-[#D2D2D7] bg-[#F5F5F7] p-1 text-center font-mono font-black">
                          {matrixCategoryTotals[category]?.toLocaleString() ?? 0}
                        </td>
                      ))}
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="mt-3 flex justify-between text-[9px] text-[#86868B]">
                <span>i35 Apple Service · No 1031, Pyi Htaung Su Main Rd, North Dagon, Yangon</span>
                <span>Sheet generated {new Date().toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PRINT: A4 Spare Parts Tags */}
      {isTagsPrintOpen && (
        <div className="printable-print-root fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 p-2 backdrop-blur-sm sm:p-4">
          <style>{`
            @media print {
              html, body, #root, #main-content-scroll, main, .basic-ui {
                background: #ffffff !important;
                color: #000000 !important;
                margin: 0 !important;
                padding: 0 !important;
                width: 100% !important;
                min-width: 0 !important;
                max-width: 100% !important;
                overflow: visible !important;
              }
              body:has(.printable-print-root) .basic-ui > *:not(:has(.printable-print-root)):not(.printable-print-root):not(.printable-print-root *),
              body:has(.printable-print-root) .basic-ui main *:not(:has(.printable-print-root)):not(.printable-print-root):not(.printable-print-root *) {
                display: none !important;
              }
              .printable-print-root,
              #spare-tags-sheet {
                position: static !important;
                display: block !important;
                width: 100% !important;
                max-width: 100% !important;
                min-width: 0 !important;
                height: auto !important;
                max-height: none !important;
                margin: 0 !important;
                padding: 0 !important;
                border: none !important;
                box-shadow: none !important;
                background: #ffffff !important;
                color: #000000 !important;
                overflow: visible !important;
              }
              #spare-tags-sheet .tags-no-print { display: none !important; }
              /* One A4 page per chunk of 18 tags */
              #spare-tags-sheet .tags-page {
                display: grid !important;
                grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
                grid-template-rows: repeat(6, auto) !important;
                gap: 4mm !important;
                width: 100% !important;
                page-break-after: always !important;
                break-after: page !important;
              }
              #spare-tags-sheet .tags-page:last-child {
                page-break-after: auto !important;
                break-after: auto !important;
              }
              #spare-tags-sheet .tag-card {
                break-inside: avoid !important;
                border: 1.5px solid #000 !important;
                border-radius: 2mm !important;
                padding: 3mm !important;
                background: #fff !important;
                min-width: 0 !important;
                max-width: 100% !important;
                overflow-wrap: break-word !important;
                word-break: break-word !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              /* Barcode area keeps scan size even if tag is small */
              #spare-tags-sheet .tag-barcode {
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                min-height: 6mm !important;
                padding: 0.5mm 0 !important;
              }
              /* Compact tag typography so 6 rows (18 tags) fit one A4 page */
              #spare-tags-sheet .tag-card {
                font-size: 7px !important;
                padding: 2mm !important;
              }
              #spare-tags-sheet .tag-card > p {
                margin: 0.5mm 0 !important;
                font-size: 7px !important;
              }
              #spare-tags-sheet .tag-card .tag-barcode svg {
                max-height: 6mm !important;
              }
              #spare-tags-sheet .tag-card [class*='font-black'] {
                font-size: 7px !important;
              }
              #spare-tags-sheet .tag-card [class*='font-mono'] {
                font-size: 6px !important;
              }
              /* Selected-only mode: hide unselected cards when printing */
              #spare-tags-sheet.print-selected-only .tag-card:not(.tag-selected) {
                display: none !important;
              }
              #spare-tags-sheet .tag-card .tag-selector {
                display: none !important;
              }
              @page { size: A4 portrait; margin: 6mm; }
            }
          `}</style>

          <div id="spare-tags-sheet" className="mx-auto my-4 w-full max-w-3xl rounded-2xl border border-[#E5E5EA] bg-white p-5 shadow-xl">
            <div className="tags-no-print mb-4 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-extrabold text-[#1D1D1F]">
                  Spare Parts Tags — A4 ({filteredParts.length} parts)
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="flex items-center gap-1.5 rounded-lg bg-[#0071E3] px-3 py-2 text-[11px] font-extrabold text-white transition hover:bg-[#0051B3]"
                  >
                    <Printer className="h-3.5 w-3.5" /> Print All
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const sheet = document.getElementById('spare-tags-sheet');
                      if (sheet) sheet.classList.add('print-selected-only');
                      window.print();
                    }}
                    disabled={selectedTagIds.size === 0}
                    className="flex items-center gap-1.5 rounded-lg bg-[#1D1D1F] px-3 py-2 text-[11px] font-extrabold text-white transition hover:bg-[#2C3E50] disabled:cursor-not-allowed disabled:bg-[#A5A5AA]"
                  >
                    <Check className="h-3.5 w-3.5" /> Print Selected ({selectedTagIds.size})
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsTagsPrintOpen(false)}
                    className="rounded-lg border border-[#E5E5EA] bg-[#F5F5F7] px-3 py-2 text-[11px] font-bold text-[#1D1D1F] transition hover:bg-[#E5E5EA]"
                  >
                    Close
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-bold text-[#86868B]">
                <label className="flex cursor-pointer items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={selectedTagIds.size === filteredParts.length && filteredParts.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedTagIds(new Set(filteredParts.map((p) => p.id)));
                      else setSelectedTagIds(new Set());
                    }}
                    className="h-3.5 w-3.5 accent-[#0071E3]"
                  />
                  Select All
                </label>
                <span>·</span>
                <span>Click a card to toggle its tag for selected printing</span>
              </div>
            </div>

            <div className="rounded-xl border border-[#E5E5EA] p-3">
              <div className="mb-3 flex items-start justify-between border-b border-[#E5E5EA] pb-2">
                <div>
                  <h1 className="text-sm font-black text-[#1D1D1F]">i35 Apple Service — Spare Parts Tags</h1>
                  <p className="text-[10px] text-[#86868B]">{new Date().toLocaleDateString()}</p>
                </div>
                <span className="text-[10px] font-bold text-[#86868B]">{filteredParts.length} parts</span>
              </div>

              {paginateTags(filteredParts, 18).map((pageParts, pageIdx) => (
                <div key={pageIdx} className="tags-page mb-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                  {pageParts.map((part) => {
                    const isSelected = selectedTagIds.has(part.id);
                    const toggleSelect = () => {
                      setSelectedTagIds((prev) => {
                        const next = new Set(prev);
                        if (next.has(part.id)) next.delete(part.id);
                        else next.add(part.id);
                        return next;
                      });
                    };
                    return (
                    <div
                      key={part.id}
                      onClick={toggleSelect}
                      className={`tag-card relative flex cursor-pointer flex-col rounded-lg border bg-white p-2.5 transition-colors ${
                        isSelected ? 'tag-selected border-[#0071E3] ring-2 ring-[#0071E3]/30' : 'border-[#1D1D1F] hover:border-[#0071E3]'
                      }`}
                    >
                      <div className="tag-selector absolute right-1 top-1 z-10 flex h-5 w-5 items-center justify-center rounded-full border bg-white shadow-xs">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={toggleSelect}
                          onClick={(e) => e.stopPropagation()}
                          className="h-3.5 w-3.5 accent-[#0071E3]"
                        />
                      </div>
                      <div className="flex items-center justify-between border-b border-dashed border-[#C7C7CC] pb-1.5">
                        <span className="pr-1 text-[9px] font-black uppercase leading-tight text-[#1D1D1F]">{part.category}</span>
                        <span className="ml-1 shrink-0 rounded bg-[#1D1D1F] px-1.5 py-0.5 text-[8px] font-black uppercase text-white">{part.qualityTier}</span>
                      </div>
                      <p className="mt-1.5 text-[11px] font-extrabold leading-snug text-[#1D1D1F]">{part.name}</p>
                      <p className="mt-0.5 truncate font-mono text-[8px] text-[#86868B]" title={part.sku}>SKU: {part.sku}</p>
                      <div className="mt-1.5 flex items-center justify-between gap-1">
                        <div className="min-w-0 text-[9px] leading-tight text-[#86868B]">
                          <p>Bin: <span className="font-bold text-[#1D1D1F]">{part.locationBin || '—'}</span></p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-[8px] font-bold text-[#86868B]">Price</p>
                          <p className="font-mono text-[16px] font-black leading-none text-[#1D1D1F]">{Number(part.sellingPrice || 0).toLocaleString()} MMK</p>
                        </div>
                      </div>
                      <div className="tag-barcode mt-1.5 border-t border-dashed border-[#C7C7CC] pt-1.5">
                        <PartBarcode value={part.sku || part.id} />
                      </div>
                    </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Filter picker popup modal — options open here instead of dropdown menus */}
      {filterModal &&
        createPortal(
          <div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 backdrop-blur-sm animate-fadeIn"
            onClick={() => setFilterModal(null)}
          >
            <div
              className="w-72 max-h-[70vh] flex flex-col rounded-2xl border border-[#E5E5EA] bg-white p-3 shadow-2xl animate-i35-slide-up"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-1 pb-2 border-b border-[#F0F0F2]">
                <div className="flex items-center gap-2 min-w-0">
                  <p className="text-xs font-extrabold text-[#1D1D1F] truncate">
                    {filterModal === 'model' ? 'Select Device Model' : filterModal === 'category' ? 'Select Category' : 'Select Quality Tier'}
                  </p>
                  <span className="shrink-0 rounded-full bg-[#F0F6FF] text-[#0071E3] px-2 py-0.5 text-[10px] font-mono font-bold">
                    {filterModal === 'model'
                      ? `${inventoryDeviceModels.length + 1} options`
                      : filterModal === 'category'
                        ? `${categories.length + 1} options`
                        : `${customQualityTiers.length + 1} options`}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setFilterModal(null)}
                  aria-label="Close filter picker"
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-[#86868B] hover:bg-[#F5F5F7] hover:text-[#1D1D1F] transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto py-2 space-y-1 custom-scrollbar">
                {filterModal === 'model' &&
                  modelFilterOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setSelectedModelFilter(opt.value);
                        setFilterModal(null);
                      }}
                      className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-xs font-bold transition-colors cursor-pointer text-left ${
                        selectedModelFilter === opt.value
                          ? 'bg-[#0071E3] text-white'
                          : 'hover:bg-[#F5F5F7] text-[#1D1D1F]'
                      }`}
                    >
                      <span className="truncate">{opt.label}</span>
                      <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-mono font-bold ${selectedModelFilter === opt.value ? 'bg-white/20 text-white' : 'bg-[#E5E5EA] text-[#1D1D1F]'}`}>
                        {opt.badge}
                      </span>
                    </button>
                  ))}

                {filterModal === 'category' &&
                  categoryFilterOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setSelectedCategory(opt.value);
                        setFilterModal(null);
                      }}
                      className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-xs font-bold transition-colors cursor-pointer text-left ${
                        selectedCategory === opt.value
                          ? 'bg-[#0071E3] text-white'
                          : 'hover:bg-[#F5F5F7] text-[#1D1D1F]'
                      }`}
                    >
                      <span className="truncate">{opt.label}</span>
                      <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-mono font-bold ${selectedCategory === opt.value ? 'bg-white/20 text-white' : 'bg-[#E5E5EA] text-[#1D1D1F]'}`}>
                        {opt.badge}
                      </span>
                    </button>
                  ))}

                {filterModal === 'tier' &&
                  tierFilterOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setSelectedQuality(opt.value);
                        setFilterModal(null);
                      }}
                      className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-xs font-bold transition-colors cursor-pointer text-left ${
                        selectedQuality === opt.value
                          ? 'bg-[#0071E3] text-white'
                          : 'hover:bg-[#F5F5F7] text-[#1D1D1F]'
                      }`}
                    >
                      <span className="truncate">{opt.label}</span>
                      {selectedQuality === opt.value && <Check className="w-4 h-4 shrink-0" />}
                    </button>
                  ))}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
};
