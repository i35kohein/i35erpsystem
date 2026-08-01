import React, { useEffect, useState, useMemo } from 'react';
import { 
  Boxes, 
  Search, 
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
  ChevronDown
} from 'lucide-react';
import { PartItem, PartQualityTier, Supplier, SystemSettings, RmaItem } from '../../types';
import { CustomDropdownMenu } from '../common/CustomDropdownMenu';
import { DeviceModelChooserModal } from '../devices/DeviceModelChooserModal';
import { getAvailableColorsForModel, getRealisticColorStyle } from '../intake/deviceData';

const isSameDeviceModel = (left: string, right: string) =>
  left.trim().toLocaleLowerCase() === right.trim().toLocaleLowerCase();

const DEFAULT_QUALITY_TIERS = [
  'Original',
  'OEM',
  'Genuine',
];

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
  const [localSearchQuery, setLocalSearchQuery] = useState<string>('');
  const [localShowAddModal, setLocalShowAddModal] = useState(false);
  const [viewMode, setViewMode] = useState<'stock' | 'profit' | 'matrix'>('stock');
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
    alert(`Supplier Vendor "${createdSup.name}" registered successfully!`);
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
          onUpdatePart({ ...p, qualityTier: newName });
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
          onUpdatePart({ ...p, qualityTier: fallbackTier });
        }
      });
    }
  };

  const activeDeviceModels = useMemo(() => {
    return [...new Set(deviceModels?.filter(Boolean) || [])].sort((a, b) => a.localeCompare(b));
  }, [deviceModels]);

  // Inventory filters should only list models with an actual saved stock row.
  const inventoryDeviceModels = useMemo(() => {
    return [...new Set(parts.flatMap((part) => part.deviceCompatibility || []).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b));
  }, [parts]);

  // Edit Part Modal state
  const [editingPart, setEditingPart] = useState<PartItem | null>(null);
  const [selectedPartForDetails, setSelectedPartForDetails] = useState<PartItem | null>(null);
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

    alert(`Parts warranty claim submitted to ${resolvedSupName}! Tracking RMA #: ${rmaRecord.rmaNumber}`);
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
    () => [...new Set(parts.map((part) => part.locationBin?.trim()).filter((bin): bin is string => Boolean(bin)))].sort((a, b) => a.localeCompare(b)),
    [parts]
  );
  const matrixModels = useMemo(
    () => [...new Set(parts.flatMap((part) => part.deviceCompatibility.filter(Boolean)))].sort((a, b) => a.localeCompare(b)),
    [parts]
  );
  const matrixCategories = useMemo(
    () => [...new Set(parts.map((part) => part.category).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [parts]
  );

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
  const ITEMS_PER_PAGE = 8;

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
    });
  }, [parts, selectedQuality, selectedCategory, selectedModelFilter, showLowStockOnly, activeSearchQuery]);

  const totalPages = Math.ceil(filteredParts.length / ITEMS_PER_PAGE) || 1;
  const safeCurrentPage = Math.min(Math.max(currentPage, 1), totalPages);

  const paginatedParts = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * ITEMS_PER_PAGE;
    return filteredParts.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredParts, safeCurrentPage]);

  const handleSaveNewPart = () => {
    if (!newPartData.name || !newPartData.sku || !newPartData.category || !newPartData.qualityTier || !newPartData.supplierId || !newPartData.deviceCompatibility?.[0] || (isBackGlassCategory && !newPartData.backGlassColor)) {
      alert('Choose a device model, category, quality tier, and supplier. Back Glass parts also need a color. Then enter the part name and SKU.');
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

  return (
    <div className="space-y-3">
      {/* Module Title Header Bar */}
      <div className="module-toolbar flex flex-col md:flex-row md:items-center justify-between gap-2 bg-white p-3 rounded-xl border border-[#E5E5EA] shadow-xs">
        <div className="module-subheader">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-[#0071E3] text-white flex items-center justify-center font-bold shadow-2xs">
              <Boxes className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-base font-black text-[#1D1D1F] tracking-tight">Parts Inventory</h1>
            </div>
          </div>
        </div>

        {/* Action Controls & View Switcher */}
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Dual View Switcher */}
          <div className="bg-[#F5F5F7] p-1 rounded-xl border border-[#E5E5EA] flex items-center space-x-1">
            <button
              type="button"
              onClick={() => setViewMode('stock')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
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
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
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
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                viewMode === 'matrix'
                  ? 'bg-white text-[#0071E3] shadow-xs border border-[#0071E3]/20'
                  : 'text-[#86868B] hover:text-[#1D1D1F]'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Matrix</span>
            </button>
          </div>

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

      {/* Filter Toolbar */}
      {viewMode !== 'matrix' && (
      <div className="space-y-2 rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-2.5">
        <div className="flex flex-wrap items-center justify-start gap-1.5 text-xs">
          {/* Model → Category → Tier */}
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <div className="flex items-center gap-1 rounded-lg bg-[var(--border-subtle)] p-1">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[var(--card-bg)] text-[var(--primary)]">
                <Smartphone className="h-3.5 w-3.5" />
              </span>
              <CustomDropdownMenu
                value={selectedModelFilter}
                onChange={setSelectedModelFilter}
                options={[
                  { value: 'ALL', label: 'All Models', badge: inventoryDeviceModels.length },
                  ...inventoryDeviceModels.map((model) => ({
                    value: model,
                    label: model,
                    badge: parts.filter((part) =>
                      part.deviceCompatibility.some(
                        (device) => isSameDeviceModel(device, model),
                      ),
                    ).length,
                  })),
                ]}
                className="min-w-0"
                buttonClassName="min-w-[150px] border-0 bg-transparent hover:bg-[var(--card-bg)]"
                size="sm"
                menuAlign="group-left"
              />
            </div>

            <div className="flex items-center gap-1 rounded-lg bg-[var(--border-subtle)] p-1">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[var(--card-bg)] text-[var(--primary)]">
                <Layers className="h-3.5 w-3.5" />
              </span>
              <CustomDropdownMenu
                value={selectedCategory}
                onChange={setSelectedCategory}
                options={[
                  { value: 'ALL', label: 'All Categories', badge: categories.length },
                  ...categories.map((category) => ({
                    value: category,
                    label: category,
                    badge: parts.filter((part) => part.category === category).length,
                  })),
                ]}
                className="min-w-0"
                buttonClassName="min-w-[150px] border-0 bg-transparent hover:bg-[var(--card-bg)]"
                size="sm"
                menuAlign="group-left"
              />
            </div>

            <div className="flex items-center gap-1 rounded-lg bg-[var(--border-subtle)] p-1">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[var(--card-bg)] text-[var(--primary)]">
                <Filter className="h-3.5 w-3.5" />
              </span>
              <CustomDropdownMenu
                value={selectedQuality}
                onChange={setSelectedQuality}
                options={[
                  { value: 'ALL', label: 'All Tiers' },
                  ...customQualityTiers.map((tier) => ({ value: tier, label: tier })),
                ]}
                className="min-w-0"
                buttonClassName="min-w-[142px] border-0 bg-transparent hover:bg-[var(--card-bg)]"
                size="sm"
                menuAlign="group-left"
              />
            </div>

          </div>
        </div>
      </div>
      )}

      {/* VIEW MODE 1: STOCK TABLE */}
      {viewMode === 'stock' && (
        <div className="workspace-panel workspace-panel--standard rounded-2xl border border-[#E5E5EA] bg-white text-xs shadow-xs">
          <div className="workspace-panel__scroll rounded-xl">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-20 bg-[#F5F5F7] text-[#86868B] text-[10px] uppercase font-mono border-b border-[#E5E5EA] shadow-2xs">
                <tr>
                  <th className="p-2.5 bg-[#F5F5F7]">Part Name & SKU</th>
                  <th className="p-2.5 bg-[#F5F5F7]">Quality</th>
                  <th className="p-2.5 bg-[#F5F5F7]">Stock</th>
                  <th className="p-2.5 bg-[#F5F5F7]">Selling Price</th>
                  <th className="p-2.5 bg-[#F5F5F7]">Bin</th>
                  <th className="p-2.5 text-right bg-[#F5F5F7]">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E5EA]">
                {filteredParts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center space-y-2">
                      <PackageX className="w-8 h-8 text-[#86868B] mx-auto" />
                      <p className="text-sm font-bold text-[#1D1D1F]">No inventory components found matching your filter</p>
                      <p className="text-xs text-[#86868B]">Try resetting the search query or quality tier selection.</p>
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
                    </td>
                  </tr>
                ) : (
                  paginatedParts.map((part) => {
                    const isLow = part.quantityInStock <= part.reorderPoint;
                    const isOut = part.quantityInStock === 0;

                    return (
                      <tr key={part.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* Part Name & SKU */}
                        <td className="p-3.5 space-y-1.5">
                          <div className="flex items-start space-x-2">
                            <div className="p-1.5 rounded-lg bg-[#0071E3]/10 text-[#0071E3] shrink-0 mt-0.5">
                              <Cpu className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <p className="font-extrabold text-[#1D1D1F] text-xs leading-snug">
                                {part.name}
                              </p>
                              <p className="mt-1 font-mono text-[9px] font-medium text-[#86868B]">SKU {part.sku}</p>
                            </div>
                          </div>
                        </td>

                        {/* Quality Tier */}
                        <td className="p-3.5">
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
                        <td className="p-3.5 min-w-[140px]">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className={`font-black text-sm font-mono ${
                                isOut ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-[#1D1D1F]'
                              }`}>
                                {part.quantityInStock} <span className="text-[10px] font-normal text-[#86868B]">units</span>
                              </span>
                              {isOut ? (
                                <span className="bg-red-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider animate-pulse">
                                  OUT OF STOCK
                                </span>
                              ) : isLow ? (
                                <span className="bg-amber-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">
                                  REORDER
                                </span>
                              ) : (
                                <span className="text-[10px] text-[#86868B] font-bold">
                                  Min: {part.reorderPoint}
                                </span>
                              )}
                            </div>

                            {/* Stock Visual Bar */}
                            <div className="w-full h-1.5 bg-[#E5E5EA] rounded-full overflow-hidden">
                              <div
                                className={`h-full transition-all duration-300 ${
                                  isOut ? 'bg-red-600 w-0' : isLow ? 'bg-amber-500' : 'bg-[#34C759]'
                                }`}
                                style={{ width: `${Math.min(100, Math.max(8, (part.quantityInStock / (part.reorderPoint * 3)) * 100))}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* Selling price only — profit belongs in the Profit tab. */}
                        <td className="p-2.5 font-mono text-xs font-black text-[#16A34A] whitespace-nowrap">
                          {part.sellingPrice.toLocaleString()} MMK
                        </td>

                        {/* Location Bin */}
                        <td className="p-3.5">
                          <span className="inline-flex items-center space-x-1 font-mono text-[#1D1D1F] font-bold bg-[#F5F5F7] px-2.5 py-1 rounded-lg text-[11px] border border-[#E5E5EA]">
                            <MapPin className="w-3 h-3 text-[#0071E3]" />
                            <span>{part.locationBin}</span>
                          </span>
                        </td>

                        {/* Detailed stock controls are kept inside the part detail modal. */}
                        <td className="p-3.5 text-right shrink-0">
                          <button
                            type="button"
                            onClick={() => setSelectedPartForDetails(part)}
                            aria-label={`View ${part.name} details`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#E5E5EA] bg-[#F5F5F7] text-[#1D1D1F] transition-colors hover:border-[#0071E3] hover:bg-blue-50 hover:text-[#0071E3]"
                            title="View part details"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Bar */}
          {filteredParts.length > 0 && (
            <div className="workspace-panel__footer p-3.5 bg-white border-t border-[#E5E5EA] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#86868B]">
              <span className="font-bold">
                Showing <strong className="text-[#1D1D1F]">{(safeCurrentPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(safeCurrentPage * ITEMS_PER_PAGE, filteredParts.length)}</strong> of <strong className="text-[#1D1D1F]">{filteredParts.length}</strong> parts
              </span>

              <div className="flex items-center space-x-1.5">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={safeCurrentPage === 1}
                  className="p-1.5 rounded-xl border border-[#E5E5EA] hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent text-[#1D1D1F] transition-all cursor-pointer"
                  title="Previous Page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="flex items-center space-x-1 px-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === totalPages || Math.abs(p - safeCurrentPage) <= 1)
                    .map((p, idx, arr) => {
                      const prev = arr[idx - 1];
                      const showEllipsis = prev && p - prev > 1;
                      return (
                        <React.Fragment key={p}>
                          {showEllipsis && <span className="text-xs text-[#86868B] px-1">...</span>}
                          <button
                            type="button"
                            onClick={() => setCurrentPage(p)}
                            className={`w-7 h-7 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                              safeCurrentPage === p
                                ? 'bg-[#0071E3] text-white shadow-2xs'
                                : 'text-[#1D1D1F] hover:bg-slate-100 border border-[#E5E5EA]'
                            }`}
                          >
                            {p}
                          </button>
                        </React.Fragment>
                      );
                    })}
                </div>

                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  disabled={safeCurrentPage === totalPages}
                  className="p-1.5 rounded-xl border border-[#E5E5EA] hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent text-[#1D1D1F] transition-all cursor-pointer"
                  title="Next Page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
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
                  <th className="p-2.5">Cost</th>
                  <th className="p-2.5">Selling</th>
                  <th className="p-2.5">Profit / Unit</th>
                  <th className="p-2.5">Margin</th>
                  <th className="p-2.5 text-right">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E5EA]">
                {paginatedParts.map((part) => {
                  const profit = part.sellingPrice - part.costPrice;
                  const margin = part.sellingPrice ? Math.round((profit / part.sellingPrice) * 100) : 0;
                  return (
                    <tr key={part.id} className="hover:bg-slate-50/80">
                      <td className="p-2.5"><p className="max-w-[260px] truncate font-bold text-[#1D1D1F]">{part.name}</p><p className="mt-0.5 font-mono text-[10px] text-[#86868B]">{part.sku}</p></td>
                      <td className="p-2.5 font-mono text-[#6E6E73] whitespace-nowrap">{part.costPrice.toLocaleString()} MMK</td>
                      <td className="p-2.5 font-mono font-bold text-[#16A34A] whitespace-nowrap">{part.sellingPrice.toLocaleString()} MMK</td>
                      <td className={`p-2.5 font-mono font-black whitespace-nowrap ${profit >= 0 ? 'text-[#0071E3]' : 'text-rose-600'}`}>{profit >= 0 ? '+' : ''}{profit.toLocaleString()} MMK</td>
                      <td className="p-2.5"><span className={`rounded-md px-1.5 py-0.5 font-mono text-[10px] font-black ${margin >= 0 ? 'bg-blue-50 text-[#0071E3]' : 'bg-rose-50 text-rose-600'}`}>{margin}%</span></td>
                      <td className="p-2.5 text-right"><button type="button" aria-label={`View ${part.name} details`} title="View part details" onClick={() => setSelectedPartForDetails(part)} className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-[#E5E5EA] bg-white text-[#1D1D1F] hover:border-[#0071E3] hover:text-[#0071E3]"><Eye className="h-3 w-3" /></button></td>
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
                <h3 className="font-extrabold text-[#1D1D1F]">Apple Device Model × Component Stock Matrix</h3>
                <p className="text-[10px] text-[#86868B]">Live totals from saved inventory components</p>
              </div>
            </div>
            <span className="text-[10px] font-bold text-[#86868B]">{matrixModels.length} models · {matrixCategories.length} categories</span>
          </div>

          {matrixModels.length && matrixCategories.length ? (
            <div className="workspace-panel__scroll">
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
                        const matchingParts = parts.filter((part) =>
                          part.category === category && part.deviceCompatibility.some((device) => device.toLowerCase() === model.toLowerCase())
                        );
                        const quantity = matchingParts.reduce((total, part) => total + part.quantityInStock, 0);
                        const reorderPoint = matchingParts.reduce((total, part) => total + part.reorderPoint, 0);
                        const isLow = matchingParts.length > 0 && quantity <= reorderPoint;
                        return (
                          <td key={category} className="p-1.5 text-center">
                            {matchingParts.length ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedModelFilter(model);
                                  setSelectedCategory(category);
                                  setViewMode('stock');
                                }}
                                className={`min-w-14 rounded-lg border px-2 py-1 font-mono text-xs font-black ${
                                  quantity === 0 ? 'border-rose-200 bg-rose-50 text-rose-600' : isLow ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                }`}
                                title={`${matchingParts.length} SKU${matchingParts.length === 1 ? '' : 's'} · ${quantity} units`}
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
              <button type="button" onClick={() => setSelectedPartForDetails(null)} className="rounded-lg p-1 text-[#86868B] hover:bg-[#F5F5F7] hover:text-[#1D1D1F]" title="Close details">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-[#E5E5EA] bg-[#F8F9FA] p-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-[#86868B]">In Stock</p>
                <p className="mt-1 font-mono text-xl font-black text-[#1D1D1F]">{selectedPartForDetails.quantityInStock}</p>
                <div className="mt-2 flex gap-1.5">
                  <button type="button" onClick={() => { onUpdatePartStock(selectedPartForDetails.id, Math.max(0, selectedPartForDetails.quantityInStock - 1)); setSelectedPartForDetails({ ...selectedPartForDetails, quantityInStock: Math.max(0, selectedPartForDetails.quantityInStock - 1) }); }} className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#E5E5EA] bg-white font-black hover:bg-rose-50 hover:text-rose-600" title="Subtract one">−</button>
                  <button type="button" onClick={() => { onUpdatePartStock(selectedPartForDetails.id, selectedPartForDetails.quantityInStock + 1); setSelectedPartForDetails({ ...selectedPartForDetails, quantityInStock: selectedPartForDetails.quantityInStock + 1 }); }} className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#E5E5EA] bg-white font-black text-[#0071E3] hover:bg-emerald-50 hover:text-emerald-600" title="Add one">+</button>
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
                <select
                  value={editingPart.supplierId || suppliers[0]?.id || ''}
                  onChange={(e) => {
                    const selectedSup = suppliers.find((s) => s.id === e.target.value);
                    setEditingPart({
                      ...editingPart,
                      supplierId: e.target.value,
                      supplierName: selectedSup?.name || editingPart.supplierName,
                    });
                  }}
                  className="w-full bg-[#F5F5F7] border border-[#E5E5EA] rounded-xl p-2.5 text-xs font-bold text-[#1D1D1F]"
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code}) - Avg RMA: {s.avgRmaTurnaroundDays} days
                    </option>
                  ))}
                </select>
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

      {/* Legacy settings content is intentionally disabled: management lives in System Management. */}
      {false && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5E5EA] rounded-2xl max-w-3xl w-full p-6 space-y-5 text-xs shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-[#E5E5EA] pb-3">
              <h3 className="text-base font-extrabold text-[#1D1D1F] flex items-center space-x-2">
                <Settings className="w-5 h-5 text-[#0071E3]" />
                <span>Inventory System Data & Quality Settings</span>
              </h3>
              <button
                onClick={() => setShowInventorySettingsModal(false)}
                className="text-[#86868B] hover:text-[#1D1D1F] p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tab Switcher */}
            <div className="flex items-center space-x-2 border-b border-[#E5E5EA] pb-2">
              <button
                type="button"
                onClick={() => setSettingsTab('SUPPLIERS')}
                className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center space-x-1.5 transition-all cursor-pointer ${
                  settingsTab === 'SUPPLIERS'
                    ? 'bg-[#0071E3] text-white shadow-xs'
                    : 'bg-[#F5F5F7] text-[#1D1D1F] hover:bg-[#E5E5EA]'
                }`}
              >
                <Truck className="w-4 h-4" />
                <span>Supplier Name Data ({suppliers.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setSettingsTab('QUALITY_TIERS')}
                className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center space-x-1.5 transition-all cursor-pointer ${
                  settingsTab === 'QUALITY_TIERS'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-[#F5F5F7] text-[#1D1D1F] hover:bg-[#E5E5EA]'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Quality Tiers ({customQualityTiers.length})</span>
              </button>
            </div>

            {/* TAB 1: SUPPLIER NAME DATA */}
            {settingsTab === 'SUPPLIERS' && (
              <div className="space-y-5">
                {/* Add New Supplier Form */}
                <form onSubmit={handleCreateSupplier} className="p-4 bg-[#F5F5F7] border border-[#E5E5EA] rounded-2xl space-y-3">
                  <h4 className="font-extrabold text-[#1D1D1F] text-xs flex items-center space-x-1.5">
                    <PlusCircle className="w-4 h-4 text-[#0071E3]" />
                    <span>Register New Hardware Component Supplier Vendor</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-bold text-[#1D1D1F] mb-1">Supplier Name *</label>
                      <input
                        type="text"
                        required
                        value={newSupplierForm.name}
                        onChange={(e) => setNewSupplierForm({ ...newSupplierForm, name: e.target.value })}
                        placeholder="e.g. MobileSentrix / InjuredGadgets"
                        className="w-full bg-white border border-[#E5E5EA] rounded-xl p-2 text-xs font-bold text-[#1D1D1F]"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-[#1D1D1F] mb-1">Supplier Code *</label>
                      <input
                        type="text"
                        required
                        value={newSupplierForm.code}
                        onChange={(e) => setNewSupplierForm({ ...newSupplierForm, code: e.target.value })}
                        placeholder="e.g. MS-US / IG-HK"
                        className="w-full bg-white border border-[#E5E5EA] rounded-xl p-2 text-xs font-mono font-bold text-[#1D1D1F]"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-[#1D1D1F] mb-1">Avg RMA Turnaround (Days)</label>
                      <input
                        type="number"
                        value={newSupplierForm.avgRmaTurnaroundDays}
                        onChange={(e) => setNewSupplierForm({ ...newSupplierForm, avgRmaTurnaroundDays: Number(e.target.value) })}
                        className="w-full bg-white border border-[#E5E5EA] rounded-xl p-2 text-xs font-mono text-[#1D1D1F]"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-[#1D1D1F] mb-1">Contact Phone</label>
                      <input
                        type="text"
                        value={newSupplierForm.phone}
                        onChange={(e) => setNewSupplierForm({ ...newSupplierForm, phone: e.target.value })}
                        placeholder="+1 800 555 0199"
                        className="w-full bg-white border border-[#E5E5EA] rounded-xl p-2 text-xs text-[#1D1D1F]"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-[#1D1D1F] mb-1">Contact Email</label>
                      <input
                        type="email"
                        value={newSupplierForm.contactEmail}
                        onChange={(e) => setNewSupplierForm({ ...newSupplierForm, contactEmail: e.target.value })}
                        placeholder="rma@mobilesentrix.com"
                        className="w-full bg-white border border-[#E5E5EA] rounded-xl p-2 text-xs text-[#1D1D1F]"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-[#1D1D1F] mb-1">Website URL</label>
                      <input
                        type="text"
                        value={newSupplierForm.website}
                        onChange={(e) => setNewSupplierForm({ ...newSupplierForm, website: e.target.value })}
                        placeholder="https://www.supplier.com"
                        className="w-full bg-white border border-[#E5E5EA] rounded-xl p-2 text-xs text-[#1D1D1F]"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-[#0071E3] hover:bg-[#0051B3] text-white font-extrabold rounded-xl shadow-xs flex items-center space-x-1.5 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Save Supplier Vendor Data</span>
                    </button>
                  </div>
                </form>

                {/* Suppliers List */}
                <div className="space-y-2">
                  <h4 className="font-extrabold text-[#1D1D1F]">Active Supplier Vendors Database</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {suppliers.map((sup) => {
                      const countParts = parts.filter((p) => p.supplierId === sup.id || p.supplierName === sup.name).length;
                      return (
                        <div key={sup.id} className="p-3.5 bg-white border border-[#E5E5EA] rounded-2xl space-y-2 shadow-2xs">
                          <div className="flex justify-between items-start">
                            <div>
                              <h5 className="font-black text-xs text-[#1D1D1F] flex items-center space-x-1.5">
                                <Truck className="w-4 h-4 text-[#0071E3]" />
                                <span>{sup.name}</span>
                              </h5>
                              <span className="font-mono text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-bold">
                                CODE: {sup.code}
                              </span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <span className="bg-[#0071E3]/10 text-[#0071E3] text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                                {countParts} Parts
                              </span>
                              <button
                                type="button"
                                onClick={() => setEditingSupplier(sup)}
                                title="Edit Supplier"
                                className="p-1.5 text-slate-500 hover:text-[#0071E3] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteSupplierClick(sup.id, sup.name)}
                                title="Delete Supplier"
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                          <div className="text-[11px] text-[#86868B] space-y-1 pt-1 border-t border-[#F5F5F7]">
                            <p className="flex items-center space-x-1">
                              <Phone className="w-3 h-3 text-slate-400" />
                              <span>{sup.phone}</span>
                            </p>
                            <p className="flex items-center space-x-1">
                              <Mail className="w-3 h-3 text-slate-400" />
                              <span>{sup.contactEmail}</span>
                            </p>
                            <p className="flex items-center space-x-1">
                              <RotateCcw className="w-3 h-3 text-amber-500" />
                              <span>Avg RMA Turnaround: {sup.avgRmaTurnaroundDays} Days</span>
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: QUALITY TIERS DATA */}
            {settingsTab === 'QUALITY_TIERS' && (
              <div className="space-y-5">
                {/* Create Custom Quality Tier */}
                <form onSubmit={handleCreateQualityTier} className="p-4 bg-purple-50/60 border border-purple-200 rounded-2xl space-y-3">
                  <h4 className="font-extrabold text-purple-900 text-xs flex items-center space-x-1.5">
                    <PlusCircle className="w-4 h-4 text-purple-600" />
                    <span>Create Custom Hardware Quality Tier</span>
                  </h4>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      required
                      value={newQualityForm.name}
                      onChange={(e) => setNewQualityForm({ name: e.target.value })}
                      placeholder="e.g. OEM / Original / Genuine"
                      className="flex-1 bg-white border border-purple-200 rounded-xl p-2 text-xs font-bold text-[#1D1D1F]"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-extrabold rounded-xl shadow-xs flex items-center space-x-1 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Tier</span>
                    </button>
                  </div>
                </form>

                {/* Quality Tier List */}
                <div className="space-y-2">
                  <h4 className="font-extrabold text-[#1D1D1F]">Configured Quality Tiers in System</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {customQualityTiers.map((tier) => {
                      const countParts = parts.filter((p) => p.qualityTier === tier).length;
                      return (
                        <div key={tier} className="p-3 bg-white border border-[#E5E5EA] rounded-xl flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <ShieldCheck className="w-4 h-4 text-purple-600 shrink-0" />
                            <span className="font-extrabold text-xs text-[#1D1D1F]">{tier}</span>
                          </div>
                          <div className="flex items-center space-x-1.5">
                            <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-slate-200">
                              {countParts} in stock
                            </span>
                            <button
                              type="button"
                              onClick={() => setEditingQualityTier({ oldName: tier, newName: tier })}
                              title="Edit Tier Name"
                              className="p-1 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteQualityTierClick(tier)}
                              title="Delete Tier"
                              className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-[#E5E5EA]">
              <button
                type="button"
                onClick={() => setShowInventorySettingsModal(false)}
                className="px-5 py-2 bg-[#0071E3] hover:bg-[#0051B3] text-white font-extrabold rounded-xl cursor-pointer"
              >
                Done
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
    </div>
  );
};
