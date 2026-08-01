import React, { useState, useMemo } from 'react';
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
  ChevronRight
} from 'lucide-react';
import { PartItem, PartQualityTier, Supplier, SystemSettings, RmaItem } from '../../types';
import { CustomDropdownMenu } from '../common/CustomDropdownMenu';

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

// Popular Apple Models for Matrix Grid mapping
const POPULAR_APPLE_MODELS = [
  'iPhone 15 Pro Max',
  'iPhone 15 Pro',
  'iPhone 15',
  'iPhone 14 Pro Max',
  'iPhone 14 Pro',
  'iPhone 14',
  'iPhone 13 Pro Max',
  'iPhone 13',
  'iPad Pro 12.9"',
  'MacBook Pro 16"'
];

// Key Component Categories for Matrix
const MATRIX_CATEGORIES = [
  'Display',
  'Battery',
  'Charging Port',
  'Camera',
  'Back Glass',
  'Logic Board'
];

export const InventoryManagementModule: React.FC<InventoryManagementModuleProps> = ({
  parts,
  suppliers,
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
  const [viewMode, setViewMode] = useState<'catalog' | 'matrix'>('catalog');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  // Supplier & Quality Tier Edit States
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [editingQualityTier, setEditingQualityTier] = useState<{ oldName: string; newName: string } | null>(null);

  // Quality Tiers State (default + custom user-added with localStorage persistence)
  const [customQualityTiers, setCustomQualityTiers] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('custom_quality_tiers');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (err) {
      console.error(err);
    }
    return [
      'OEM Original Pulled',
      'Refurbished Grade A',
      'Premium Aftermarket',
      'Standard Aftermarket',
      'Original Genuine Service Pack',
      'Soft OLED High Copy',
      'Refurbished Grade S+',
    ];
  });

  // Inventory Tab Settings Modal State
  const [showInventorySettingsModal, setShowInventorySettingsModal] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'SUPPLIERS' | 'QUALITY_TIERS'>('SUPPLIERS');

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
    return deviceModels && deviceModels.length > 0 ? deviceModels : POPULAR_APPLE_MODELS;
  }, [deviceModels]);

  // Edit Part Modal state
  const [editingPart, setEditingPart] = useState<PartItem | null>(null);

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
    category: inventoryCategories[0] || 'Display',
    deviceCompatibility: activeDeviceModels[0] ? [activeDeviceModels[0]] : ['iPhone 15 Pro'],
    qualityTier: 'OEM Original Pulled',
    quantityInStock: 10,
    reservedQuantity: 0,
    reorderPoint: 4,
    costPrice: 85000,
    sellingPrice: 165000,
    supplierId: suppliers[0]?.id || 'sup-1',
    supplierName: suppliers[0]?.name || 'MobileSentrix OEM',
    locationBin: 'BIN-A01',
    isSerialized: false,
  });

  const categories = useMemo(() => {
    const set = new Set([...inventoryCategories, ...parts.map((p) => p.category)]);
    return Array.from(set);
  }, [inventoryCategories, parts]);

  // Analytics Metrics
  const metrics = useMemo(() => {
    const totalCount = parts.length;
    let totalCostValuation = 0;
    let totalRetailValuation = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    const qualityCounts = {
      'OEM Original Pulled': 0,
      'Refurbished Grade A': 0,
      'Premium Aftermarket': 0,
      'Standard Aftermarket': 0,
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
          (d) => d.toLowerCase().includes(selectedModelFilter.toLowerCase()) || selectedModelFilter.toLowerCase().includes(d.toLowerCase())
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
    if (!newPartData.name || !newPartData.sku) {
      alert('Please enter Part Name and SKU.');
      return;
    }

    const part: PartItem = {
      id: `part-${Date.now()}`,
      sku: newPartData.sku || `SKU-${Date.now()}`,
      name: newPartData.name,
      applePartNumber: newPartData.applePartNumber || '',
      category: newPartData.category || 'Display',
      deviceCompatibility: newPartData.deviceCompatibility && newPartData.deviceCompatibility.length > 0
        ? newPartData.deviceCompatibility
        : ['iPhone 15 Pro'],
      qualityTier: (newPartData.qualityTier as PartQualityTier) || 'OEM Original Pulled',
      quantityInStock: Number(newPartData.quantityInStock) || 0,
      reservedQuantity: 0,
      reorderPoint: Number(newPartData.reorderPoint) || 3,
      costPrice: Number(newPartData.costPrice) || 0,
      sellingPrice: Number(newPartData.sellingPrice) || 0,
      supplierId: newPartData.supplierId || suppliers[0]?.id || 'sup-1',
      supplierName: newPartData.supplierName || suppliers[0]?.name || 'MobileSentrix OEM',
      locationBin: newPartData.locationBin || 'BIN-A01',
      isSerialized: newPartData.isSerialized || false,
    };

    onAddPart(part);
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
              <h1 className="text-base font-black text-[#1D1D1F] tracking-tight">Parts Inventory & Stock Matrix</h1>
            </div>
          </div>
        </div>

        {/* Action Controls & View Switcher */}
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Dual View Switcher */}
          <div className="bg-[#F5F5F7] p-1 rounded-xl border border-[#E5E5EA] flex items-center space-x-1">
            <button
              type="button"
              onClick={() => setViewMode('catalog')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                viewMode === 'catalog'
                  ? 'bg-white text-[#0071E3] shadow-xs border border-[#0071E3]/20'
                  : 'text-[#86868B] hover:text-[#1D1D1F]'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Catalog</span>
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
              <span className="hidden lg:inline">Matrix</span>
            </button>
          </div>

          {/* Inventory Settings Button */}
          <button
            type="button"
            onClick={() => setShowInventorySettingsModal(true)}
            aria-label="Inventory settings"
            className="w-8 h-8 bg-white hover:bg-[#F5F5F7] text-[#1D1D1F] border border-[#E5E5EA] font-extrabold text-xs rounded-lg transition-all shadow-2xs flex items-center justify-center cursor-pointer active:scale-95"
            title="Manage Supplier Name Data & Quality Tiers"
          >
            <Settings className="w-4 h-4 text-[#0071E3]" />
          </button>

          {/* Add Part Button */}
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-3 py-2 bg-[#0071E3] hover:bg-[#0051B3] text-white font-extrabold text-xs rounded-lg transition-all shadow-2xs flex items-center space-x-1.5 cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add Part</span>
          </button>
        </div>
      </div>

      {/* Analytics Summary Banner */}
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

      {/* Filter Toolbar */}
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
                  { value: 'ALL', label: 'All Models', badge: activeDeviceModels.length },
                  ...activeDeviceModels.map((model) => ({
                    value: model,
                    label: model,
                    badge: parts.filter((part) =>
                      part.deviceCompatibility.some(
                        (device) =>
                          device.toLowerCase().includes(model.toLowerCase()) ||
                          model.toLowerCase().includes(device.toLowerCase()),
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

      {/* VIEW MODE 1: CATALOG TABLE */}
      {viewMode === 'catalog' && (
        <div className="bg-white border border-[#E5E5EA] rounded-2xl overflow-hidden text-xs shadow-xs">
          <div className="overflow-x-auto min-h-[440px] max-h-[calc(100vh-240px)] overflow-y-auto rounded-xl">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-20 bg-[#F5F5F7] text-[#86868B] text-[10px] uppercase font-mono border-b border-[#E5E5EA] shadow-2xs">
                <tr>
                  <th className="p-3.5 bg-[#F5F5F7]">Part Name & SKU / Apple PN</th>
                  <th className="p-3.5 bg-[#F5F5F7]">Quality Tier</th>
                  <th className="p-3.5 bg-[#F5F5F7]">Supplier Name</th>
                  <th className="p-3.5 bg-[#F5F5F7]">Device Compatibility</th>
                  <th className="p-3.5 bg-[#F5F5F7]">Stock Level & Bar</th>
                  <th className="p-3.5 bg-[#F5F5F7]">Cost & Retail Selling (MMK)</th>
                  <th className="p-3.5 bg-[#F5F5F7]">Bin Location</th>
                  <th className="p-3.5 text-right bg-[#F5F5F7]">Stock Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E5EA]">
                {filteredParts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-12 text-center space-y-2">
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
                    const unitProfit = part.sellingPrice - part.costPrice;
                    const marginPercent = part.sellingPrice > 0 ? Math.round((unitProfit / part.sellingPrice) * 100) : 0;

                    return (
                      <tr key={part.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* Part Name & SKU */}
                        <td className="p-3.5 space-y-1.5">
                          <div className="flex items-start space-x-2">
                            <div className="p-1.5 rounded-lg bg-[#0071E3]/10 text-[#0071E3] shrink-0 mt-0.5">
                              <Cpu className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <p className="font-extrabold text-[#1D1D1F] text-xs leading-snug flex items-center space-x-1.5 flex-wrap gap-1">
                                <span className="hover:text-[#0071E3] transition-colors">{part.name}</span>
                                {part.category && (
                                  <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-1.5 py-0.5 rounded border border-slate-200">
                                    {part.category}
                                  </span>
                                )}
                                {part.isSerialized && (
                                  <span className="bg-indigo-50 text-indigo-700 text-[9px] font-black px-1.5 py-0.2 rounded border border-indigo-200">
                                    SERIALIZED
                                  </span>
                                )}
                              </p>
                              <div className="flex items-center space-x-2 mt-1">
                                <span className="font-mono text-[10px] font-extrabold text-[#0071E3] bg-[#0071E3]/10 px-2 py-0.5 rounded-md border border-[#0071E3]/20 shadow-2xs">
                                  SKU: {part.sku}
                                </span>
                                {part.applePartNumber && (
                                  <span className="text-[10px] text-slate-700 font-mono bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 font-bold flex items-center space-x-1">
                                    <span>PN: {part.applePartNumber}</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Quality Tier */}
                        <td className="p-3.5">
                          {part.qualityTier === 'OEM Original Pulled' || part.qualityTier.includes('Original') ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-1 rounded-lg bg-blue-50 text-blue-800 border border-blue-200 shadow-2xs">
                              <ShieldCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                              <span>{part.qualityTier}</span>
                            </span>
                          ) : part.qualityTier === 'Refurbished Grade A' || part.qualityTier.includes('Grade A') || part.qualityTier.includes('Grade S') ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">
                              <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>{part.qualityTier}</span>
                            </span>
                          ) : part.qualityTier === 'Premium Aftermarket' || part.qualityTier.includes('Soft OLED') || part.qualityTier.includes('Premium') ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-1 rounded-lg bg-purple-50 text-purple-800 border border-purple-200 shadow-2xs">
                              <Cpu className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                              <span>{part.qualityTier}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 border border-slate-300 shadow-2xs">
                              <Tag className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                              <span>{part.qualityTier}</span>
                            </span>
                          )}
                        </td>

                        {/* Supplier Name */}
                        <td className="p-3.5">
                          <div className="flex items-center space-x-1.5 font-bold text-[#1D1D1F]">
                            <Truck className="w-3.5 h-3.5 text-[#0071E3] shrink-0" />
                            <span className="truncate max-w-[130px] font-semibold text-xs" title={part.supplierName || 'Default Vendor'}>
                              {part.supplierName || 'Default Vendor'}
                            </span>
                          </div>
                        </td>

                        {/* Device Compatibility */}
                        <td className="p-3.5">
                          <div className="flex flex-wrap gap-1 max-w-[220px]">
                            {part.deviceCompatibility.map((dev) => (
                              <span key={dev} className="bg-[#F5F5F7] text-[#1D1D1F] text-[10px] font-extrabold px-2 py-0.5 rounded-md border border-[#E5E5EA]">
                                {dev}
                              </span>
                            ))}
                          </div>
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

                        {/* Cost & Retail Selling Pricing */}
                        <td className="p-3.5 font-mono">
                          <div className="space-y-1 min-w-[160px]">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-[10px] text-[#86868B] font-bold uppercase">Cost:</span>
                              <span className="text-[#6E6E73] font-semibold">
                                {part.costPrice.toLocaleString()} MMK
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-[10px] text-[#16A34A] font-bold uppercase">Sell:</span>
                              <span className="text-[#16A34A] font-black">
                                {part.sellingPrice.toLocaleString()} MMK
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[10px] pt-0.5 border-t border-[#F5F5F7]">
                              <span className="text-[#0071E3] font-extrabold">Profit:</span>
                              <span className="font-extrabold text-[#0071E3]">
                                +{unitProfit.toLocaleString()} MMK ({marginPercent}%)
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Location Bin */}
                        <td className="p-3.5">
                          <span className="inline-flex items-center space-x-1 font-mono text-[#1D1D1F] font-bold bg-[#F5F5F7] px-2.5 py-1 rounded-lg text-[11px] border border-[#E5E5EA]">
                            <MapPin className="w-3 h-3 text-[#0071E3]" />
                            <span>{part.locationBin}</span>
                          </span>
                        </td>

                        {/* Stock Quick Adjustment Buttons */}
                        <td className="p-3.5 text-right space-x-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => onUpdatePartStock(part.id, Math.max(0, part.quantityInStock - 1))}
                            className="w-7 h-7 bg-[#F5F5F7] hover:bg-red-50 hover:text-red-600 hover:border-red-300 border border-[#E5E5EA] text-[#1D1D1F] rounded-lg font-mono font-black text-xs transition-colors cursor-pointer"
                            title="Subtract 1 Stock"
                          >
                            -
                          </button>
                          <button
                            type="button"
                            onClick={() => onUpdatePartStock(part.id, part.quantityInStock + 1)}
                            className="w-7 h-7 bg-[#F5F5F7] hover:bg-emerald-50 hover:text-[#16A34A] hover:border-emerald-300 border border-[#E5E5EA] text-[#0071E3] rounded-lg font-mono font-black text-xs transition-colors cursor-pointer"
                            title="Add 1 Stock"
                          >
                            +
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenWarrantyModal(part)}
                            className="p-1.5 bg-amber-50 hover:bg-amber-600 hover:text-white border border-amber-200 text-amber-700 rounded-lg transition-colors cursor-pointer"
                            title="File Parts Warranty Claim (RMA) with Supplier"
                          >
                            <ShieldAlert className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingPart(part)}
                            className="p-1.5 bg-[#F5F5F7] hover:bg-[#0071E3] hover:text-white border border-[#E5E5EA] text-[#1D1D1F] rounded-lg transition-colors cursor-pointer"
                            title="Edit Part Details"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Are you sure you want to delete part "${part.name}" (${part.sku})?`)) {
                                if (onDeletePart) onDeletePart(part.id);
                              }
                            }}
                            className="p-1.5 bg-rose-50 hover:bg-rose-600 hover:text-white border border-rose-200 text-rose-600 rounded-lg transition-colors cursor-pointer"
                            title="Delete Part SKU"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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
            <div className="p-3.5 bg-white border-t border-[#E5E5EA] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#86868B]">
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

      {/* VIEW MODE 2: INTERACTIVE STOCK MATRIX GRID */}
      {viewMode === 'matrix' && (
        <div className="bg-white border border-[#E5E5EA] rounded-2xl p-5 space-y-4 shadow-xs">
          <div className="flex justify-between items-center pb-3 border-b border-[#E5E5EA]">
            <div>
              <h3 className="font-black text-base text-[#1D1D1F] flex items-center space-x-2">
                <Grid className="w-5 h-5 text-[#0071E3]" />
                <span>Apple Device Model x Component Stock Matrix</span>
              </h3>
              <p className="text-xs text-[#86868B] mt-0.5">
                Visual matrix overview showing available hardware components across key Apple device lines
              </p>
            </div>
            <div className="flex items-center space-x-3 text-xs font-bold">
              <span className="flex items-center space-x-1 text-[#16A34A]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A]" />
                <span>In Stock (&gt;3)</span>
              </span>
              <span className="flex items-center space-x-1 text-amber-600">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span>Low Stock (1-3)</span>
              </span>
              <span className="flex items-center space-x-1 text-red-600">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600" />
                <span>Out of Stock (0)</span>
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-[#F5F5F7] text-[#86868B] text-[11px] uppercase font-mono border-b border-[#E5E5EA]">
                  <th className="p-3 font-bold">Apple Device Model</th>
                  {MATRIX_CATEGORIES.map((cat) => (
                    <th key={cat} className="p-3 font-bold text-center">{cat}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E5EA]">
                {activeDeviceModels.map((model) => (
                  <tr key={model} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-extrabold text-[#1D1D1F] text-xs bg-[#F8F9FA] border-r border-[#E5E5EA]">
                      <div className="flex items-center space-x-2">
                        <Smartphone className="w-4 h-4 text-[#0071E3] shrink-0" />
                        <span>{model}</span>
                      </div>
                    </td>

                    {MATRIX_CATEGORIES.map((category) => {
                      // Find parts matching model and category
                      const matchingParts = parts.filter(
                        (p) =>
                          p.category.toLowerCase().includes(category.toLowerCase()) &&
                          p.deviceCompatibility.some((d) => d.toLowerCase().includes(model.toLowerCase()))
                      );

                      const totalQty = matchingParts.reduce((acc, p) => acc + p.quantityInStock, 0);

                      return (
                        <td key={category} className="p-2 text-center align-middle">
                          {matchingParts.length === 0 ? (
                            <span className="text-[10px] text-[#C7C7CC] font-mono">--</span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setViewMode('catalog');
                                setSearchQuery(model);
                                setSelectedCategory(category);
                              }}
                              className={`w-full py-2 px-1 rounded-xl text-xs font-black font-mono transition-all flex flex-col items-center justify-center cursor-pointer shadow-2xs hover:scale-105 ${
                                totalQty === 0
                                  ? 'bg-red-50 text-red-700 border border-red-200'
                                  : totalQty <= 3
                                  ? 'bg-amber-50 text-amber-900 border border-amber-300'
                                  : 'bg-emerald-50 text-[#16A34A] border border-emerald-300'
                              }`}
                              title={`Click to view ${matchingParts.length} parts for ${model} ${category}`}
                            >
                              <span>{totalQty} in stock</span>
                              <span className="text-[9px] font-normal opacity-80">
                                ({matchingParts.length} SKUs)
                              </span>
                            </button>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: ADD NEW PART */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5E5EA] rounded-2xl max-w-2xl w-full p-6 space-y-5 text-xs shadow-2xl">
            <div className="flex justify-between items-center border-b border-[#E5E5EA] pb-3">
              <h3 className="text-base font-extrabold text-[#1D1D1F] flex items-center space-x-2">
                <Plus className="w-5 h-5 text-[#0071E3]" />
                <span>Register New Hardware Component</span>
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-[#86868B] hover:text-[#1D1D1F] p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 space-y-2">
                <label className="block font-bold text-[#1D1D1F]">Part Name *</label>
                <input
                  type="text"
                  value={newPartData.name || ''}
                  onChange={(e) => setNewPartData({ ...newPartData, name: e.target.value })}
                  placeholder="e.g. iPhone 15 Pro Max - OLED Display Assembly (OEM Pulled)"
                  className="w-full bg-[#F5F5F7] border border-[#E5E5EA] rounded-xl p-2.5 text-xs font-bold text-[#1D1D1F] focus:bg-white focus:border-[#0071E3] focus:outline-none"
                />

                {/* Quick Name Presets & Styling Assistant */}
                <div className="p-2.5 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-extrabold text-[#0071E3]">
                    <span className="flex items-center space-x-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Part Name Style Generator & Presets</span>
                    </span>
                    <span className="text-[10px] text-[#86868B] font-medium">Click to auto-format name</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {[
                      { label: 'OLED Display', cat: 'Display' },
                      { label: 'High Capacity Battery', cat: 'Battery' },
                      { label: 'USB-C Charging Flex', cat: 'Charging Port' },
                      { label: 'Rear Camera Module', cat: 'Camera' },
                      { label: 'Back Glass Cover', cat: 'Back Glass' },
                      { label: 'PMIC Power IC Chip', cat: 'Logic Board' },
                    ].map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => {
                          const model = newPartData.deviceCompatibility?.[0] || 'iPhone 15 Pro';
                          const tier = newPartData.qualityTier || customQualityTiers[0] || 'OEM Original Pulled';
                          setNewPartData({
                            ...newPartData,
                            name: `${model} - ${preset.label} (${tier})`,
                            category: preset.cat,
                          });
                        }}
                        className="px-2 py-0.5 bg-white hover:bg-[#0071E3] hover:text-white text-[#1D1D1F] text-[10px] font-bold rounded-md border border-blue-200 transition-all cursor-pointer shadow-2xs"
                      >
                        + {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#1D1D1F] mb-1">SKU / Code *</label>
                <input
                  type="text"
                  value={newPartData.sku || ''}
                  onChange={(e) => setNewPartData({ ...newPartData, sku: e.target.value })}
                  placeholder="e.g. DISP-iP15P-OEM"
                  className="w-full bg-[#F5F5F7] border border-[#E5E5EA] rounded-xl p-2.5 text-xs font-mono text-[#1D1D1F] focus:bg-white focus:border-[#0071E3] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-[#1D1D1F] mb-1">Apple Part Number (Optional)</label>
                <input
                  type="text"
                  value={newPartData.applePartNumber || ''}
                  onChange={(e) => setNewPartData({ ...newPartData, applePartNumber: e.target.value })}
                  placeholder="e.g. 661-02381"
                  className="w-full bg-[#F5F5F7] border border-[#E5E5EA] rounded-xl p-2.5 text-xs font-mono text-[#1D1D1F] focus:bg-white focus:border-[#0071E3] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-[#1D1D1F] mb-1">Category</label>
                <CustomDropdownMenu
                  value={newPartData.category}
                  onChange={(category) => setNewPartData({ ...newPartData, category })}
                  options={categories.map((category) => ({ value: category, label: category }))}
                  className="w-full"
                  buttonClassName="!h-10 !w-full !rounded-xl !border-[#E5E5EA] !bg-[#F5F5F7] !px-2.5"
                  menuAlign="left"
                  size="md"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block font-bold text-[#1D1D1F]">Quality Tier</label>
                  <button
                    type="button"
                    onClick={() => setShowAddQualityMiniModal(true)}
                    className="text-[10px] text-purple-700 font-extrabold hover:underline flex items-center space-x-0.5 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Tier</span>
                  </button>
                </div>
                <select
                  value={newPartData.qualityTier}
                  onChange={(e) => setNewPartData({ ...newPartData, qualityTier: e.target.value as any })}
                  className="w-full bg-[#F5F5F7] border border-[#E5E5EA] rounded-xl p-2.5 text-xs font-bold text-[#1D1D1F] focus:bg-white focus:border-[#0071E3] focus:outline-none"
                >
                  {customQualityTiers.map((tier) => (
                    <option key={tier} value={tier}>
                      {tier}
                    </option>
                  ))}
                </select>
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
                <select
                  value={newPartData.supplierId || suppliers[0]?.id || ''}
                  onChange={(e) => {
                    const selectedSup = suppliers.find((s) => s.id === e.target.value);
                    setNewPartData({
                      ...newPartData,
                      supplierId: e.target.value,
                      supplierName: selectedSup?.name || e.target.value,
                    });
                  }}
                  className="w-full bg-[#F5F5F7] border border-[#E5E5EA] rounded-xl p-2.5 text-xs font-bold text-[#1D1D1F] focus:bg-white focus:border-[#0071E3] focus:outline-none"
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code}) - Avg RMA: {s.avgRmaTurnaroundDays} days
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-[#1D1D1F] mb-1">Cost Price (MMK)</label>
                <input
                  type="number"
                  value={newPartData.costPrice || ''}
                  onChange={(e) => setNewPartData({ ...newPartData, costPrice: Number(e.target.value) })}
                  className="w-full bg-[#F5F5F7] border border-[#E5E5EA] rounded-xl p-2.5 text-xs font-mono font-bold text-[#1D1D1F] focus:bg-white focus:border-[#0071E3] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-[#1D1D1F] mb-1">Selling Price (MMK)</label>
                <input
                  type="number"
                  value={newPartData.sellingPrice || ''}
                  onChange={(e) => setNewPartData({ ...newPartData, sellingPrice: Number(e.target.value) })}
                  className="w-full bg-[#F5F5F7] border border-[#E5E5EA] rounded-xl p-2.5 text-xs font-mono font-bold text-[#16A34A] focus:bg-white focus:border-[#0071E3] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-[#1D1D1F] mb-1">Initial Stock Qty</label>
                <input
                  type="number"
                  value={newPartData.quantityInStock || ''}
                  onChange={(e) => setNewPartData({ ...newPartData, quantityInStock: Number(e.target.value) })}
                  className="w-full bg-[#F5F5F7] border border-[#E5E5EA] rounded-xl p-2.5 text-xs font-mono text-[#1D1D1F] focus:bg-white focus:border-[#0071E3] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-[#1D1D1F] mb-1">Storage Location Bin</label>
                <input
                  type="text"
                  value={newPartData.locationBin || ''}
                  onChange={(e) => setNewPartData({ ...newPartData, locationBin: e.target.value })}
                  placeholder="e.g. BIN-A01"
                  className="w-full bg-[#F5F5F7] border border-[#E5E5EA] rounded-xl p-2.5 text-xs font-mono text-[#1D1D1F] focus:bg-white focus:border-[#0071E3] focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-[#1D1D1F] mb-1">
                  Device Compatibility (From Price Catalog)
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2.5 bg-[#F5F5F7] border border-[#E5E5EA] rounded-xl">
                  {activeDeviceModels.map((m) => {
                    const isSelected = newPartData.deviceCompatibility?.includes(m);
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => {
                          const current = newPartData.deviceCompatibility || [];
                          const next = isSelected
                            ? current.filter((item) => item !== m)
                            : [...current, m];
                          setNewPartData({ ...newPartData, deviceCompatibility: next });
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#0071E3] text-white shadow-xs'
                            : 'bg-white text-[#1D1D1F] border border-[#E5E5EA] hover:bg-[#E5E5EA]'
                        }`}
                      >
                        {m}
                      </button>
                    );
                  })}
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

            <div className="flex justify-end space-x-2 pt-2 border-t border-[#E5E5EA]">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2.5 bg-white border border-[#E5E5EA] text-[#1D1D1F] font-bold rounded-xl hover:bg-[#F5F5F7]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveNewPart}
                className="px-5 py-2.5 bg-[#0071E3] hover:bg-[#0051B3] text-white font-extrabold rounded-xl shadow-xs transition-all active:scale-95"
              >
                Save Hardware Component
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDIT PART DETAILS */}
      {editingPart && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5E5EA] rounded-2xl max-w-lg w-full p-6 space-y-4 text-xs shadow-2xl">
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

            <div className="space-y-3">
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
                <label className="block font-bold text-[#1D1D1F] mb-1">Storage Location Bin</label>
                <input
                  type="text"
                  value={editingPart.locationBin}
                  onChange={(e) => setEditingPart({ ...editingPart, locationBin: e.target.value })}
                  className="w-full bg-[#F5F5F7] border border-[#E5E5EA] rounded-xl p-2.5 text-xs font-mono text-[#1D1D1F]"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block font-bold text-[#1D1D1F]">Quality Tier</label>
                  <button
                    type="button"
                    onClick={() => setShowAddQualityMiniModal(true)}
                    className="text-[10px] text-purple-700 font-extrabold hover:underline flex items-center space-x-0.5 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Tier</span>
                  </button>
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

              <div>
                <label className="block font-bold text-[#1D1D1F] mb-1">
                  Device Compatibility (From Price Catalog)
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2.5 bg-[#F5F5F7] border border-[#E5E5EA] rounded-xl">
                  {activeDeviceModels.map((m) => {
                    const isSelected = editingPart.deviceCompatibility?.includes(m);
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => {
                          const current = editingPart.deviceCompatibility || [];
                          const next = isSelected
                            ? current.filter((item) => item !== m)
                            : [...current, m];
                          setEditingPart({ ...editingPart, deviceCompatibility: next });
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#0071E3] text-white shadow-xs'
                            : 'bg-white text-[#1D1D1F] border border-[#E5E5EA] hover:bg-[#E5E5EA]'
                        }`}
                      >
                        {m}
                      </button>
                    );
                  })}
                </div>
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

      {/* MODAL: INVENTORY TAB SETTINGS */}
      {showInventorySettingsModal && (
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
                      placeholder="e.g. Genuine Service Pack / Soft OLED High Copy / Refurbished Grade S+"
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
                placeholder="e.g. Original Genuine Service Pack / Soft OLED"
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
