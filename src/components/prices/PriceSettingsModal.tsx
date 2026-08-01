import React, { useRef, useState } from 'react';
import { 
  X, 
  Save, 
  RotateCcw, 
  Plus, 
  DollarSign, 
  ShieldCheck, 
  Smartphone, 
  Check, 
  SlidersHorizontal,
  Download,
  FileUp,
  AlertCircle,
  Folder,
  FolderCheck,
  Eye,
  EyeOff,
  Tablet,
  Watch,
  Laptop,
  Layers,
  Edit3,
  Trash2,
  Tag,
  FolderPlus,
  Percent,
  Copy,
  TrendingUp,
  Globe
} from 'lucide-react';
import { ModelRepairPrice, PriceCatalogImportRow, REPAIR_CATEGORIES, RepairCategoryDef, FolderConfig, getModelFolderId } from '../../types/priceCatalog';

const normalizeCsvHeader = (value: string) => value.replace(/^\uFEFF/, '').trim().toLowerCase().replace(/\s+/g, ' ');

const parseCsvRows = (source: string): string[][] => {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (char === '"') {
      if (quoted && source[index + 1] === '"') {
        field += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === ',' && !quoted) {
      row.push(field);
      field = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && source[index + 1] === '\n') index += 1;
      row.push(field);
      if (row.some((cell) => cell.trim())) rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }

  row.push(field);
  if (row.some((cell) => cell.trim())) rows.push(row);
  return rows;
};

interface PriceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
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
  folders: FolderConfig[];
  toggleFolder: (folderId: string) => void;
  setAllFoldersEnabled: (enabled: boolean) => void;
  addFolder?: (name: string, family: FolderConfig['family']) => void;
  renameFolder?: (id: string, newName: string) => void;
  categories?: RepairCategoryDef[];
  updateCategoryLabel?: (key: string, newLabel: string) => void;
  addCategory?: (key: string, label: string, group: RepairCategoryDef['group']) => void;
  deleteCategory?: (key: string) => void;
  applyGlobalPriceAdjustment?: (folderId: string | 'ALL', categoryKey: string | 'ALL', percentChange: number, flatChange: number) => void;
  applyGlobalWarranty?: (folderId: string | 'ALL', categoryKey: string | 'ALL', warrantyTerm: string) => void;
  formatPrice: (amount: number | null | undefined) => string;
}

export const PriceSettingsModal: React.FC<PriceSettingsModalProps> = ({
  isOpen,
  onClose,
  catalog,
  updatePriceAndWarranty,
  importCatalogRows,
  addModel,
  renameModel,
  deleteModel,
  resetToDefaults,
  currencySymbol,
  setCurrencySymbol,
  folders,
  toggleFolder,
  setAllFoldersEnabled,
  addFolder,
  renameFolder,
  categories = REPAIR_CATEGORIES,
  updateCategoryLabel,
  addCategory,
  deleteCategory,
  applyGlobalPriceAdjustment,
  applyGlobalWarranty,
  formatPrice,
}) => {
  const [selectedModel, setSelectedModel] = useState<string>(catalog[0]?.model || 'iPhone 15 Pro Max');
  const [newModelInput, setNewModelInput] = useState('');
  const [cloneModelSource, setCloneModelSource] = useState<string>('');
  const [isRenamingModel, setIsRenamingModel] = useState(false);
  const [renameModelInput, setRenameModelInput] = useState('');

  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveMsg, setSaveMsg] = useState('Settings updated & saved successfully.');
  const [activeSubTab, setActiveSubTab] = useState<'model-editor' | 'categories-editor' | 'folder-visibility' | 'global-settings'>('model-editor');

  // Category Editor State
  const [editingCategoryKey, setEditingCategoryKey] = useState<string | null>(null);
  const [editingCategoryLabel, setEditingCategoryLabel] = useState<string>('');
  const [newCategoryKey, setNewCategoryKey] = useState<string>('');
  const [newCategoryLabel, setNewCategoryLabel] = useState<string>('');
  const [newCategoryGroup, setNewCategoryGroup] = useState<RepairCategoryDef['group']>('Display');

  // Folder Editor State
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState<string>('');
  const [newFolderName, setNewFolderName] = useState<string>('');
  const [newFolderFamily, setNewFolderFamily] = useState<FolderConfig['family']>('iPhone');

  // Global Price Adjustment State
  const [globalAdjFolder, setGlobalAdjFolder] = useState<string>('ALL');
  const [globalAdjCategory, setGlobalAdjCategory] = useState<string>('ALL');
  const [globalAdjPercent, setGlobalAdjPercent] = useState<number>(0);
  const [globalAdjFlat, setGlobalAdjFlat] = useState<number>(0);

  // Global Warranty Presets State
  const [globalWarrantyFolder, setGlobalWarrantyFolder] = useState<string>('ALL');
  const [globalWarrantyCategory, setGlobalWarrantyCategory] = useState<string>('ALL');
  const [globalWarrantyTerm, setGlobalWarrantyTerm] = useState<string>('3 Month');
  const importInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const currentModelData = catalog.find((m) => m.model === selectedModel) || catalog[0];

  const triggerToast = (msg: string) => {
    setSaveMsg(msg);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  // Calculate model counts per folder
  const modelCountPerFolder = folders.reduce((acc, f) => {
    acc[f.id] = catalog.filter((m) => getModelFolderId(m.model) === f.id).length;
    return acc;
  }, {} as Record<string, number>);

  const handlePriceChange = (categoryKey: string, val: string) => {
    const num = val.trim() === '' ? null : parseFloat(val.replace(/[^0-9.]/g, ''));
    const currentWarranty = currentModelData?.warranties[categoryKey] || '3 Month';
    updatePriceAndWarranty(selectedModel, categoryKey, isNaN(num as number) ? null : num, currentWarranty);
  };

  const handleWarrantyChange = (categoryKey: string, warranty: string) => {
    const currentPrice = currentModelData?.prices[categoryKey] ?? null;
    updatePriceAndWarranty(selectedModel, categoryKey, currentPrice, warranty);
  };

  const handleAddNewModel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newModelInput.trim()) return;
    addModel(newModelInput.trim(), undefined, cloneModelSource || undefined);
    setSelectedModel(newModelInput.trim());
    triggerToast(`Added new model "${newModelInput.trim()}" to catalog.`);
    setNewModelInput('');
    setCloneModelSource('');
  };

  const handleRenameModelSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameModelInput.trim() || !renameModel) return;
    renameModel(selectedModel, renameModelInput.trim());
    triggerToast(`Renamed model to "${renameModelInput.trim()}".`);
    setSelectedModel(renameModelInput.trim());
    setIsRenamingModel(false);
  };

  const handleDeleteModelClick = () => {
    if (!deleteModel) return;
    if (window.confirm(`Are you sure you want to delete model "${selectedModel}" from catalog?`)) {
      deleteModel(selectedModel);
      triggerToast(`Deleted model "${selectedModel}".`);
      const remaining = catalog.filter((m) => m.model !== selectedModel);
      if (remaining.length > 0) {
        setSelectedModel(remaining[0].model);
      }
    }
  };

  const handleApplyBatchWarranty = (warrantyTerm: string) => {
    if (!currentModelData) return;
    categories.forEach((cat) => {
      const price = currentModelData.prices[cat.key] ?? null;
      updatePriceAndWarranty(selectedModel, cat.key, price, warrantyTerm);
    });
    triggerToast(`Applied "${warrantyTerm}" warranty to all services on ${selectedModel}.`);
  };

  // Category Actions
  const handleStartEditingCategory = (cat: RepairCategoryDef) => {
    setEditingCategoryKey(cat.key);
    setEditingCategoryLabel(cat.label);
  };

  const handleSaveCategoryLabel = (key: string) => {
    if (updateCategoryLabel && editingCategoryLabel.trim()) {
      updateCategoryLabel(key, editingCategoryLabel.trim());
      triggerToast(`Updated repair category name to "${editingCategoryLabel.trim()}".`);
    }
    setEditingCategoryKey(null);
  };

  const handleAddCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryKey.trim() || !addCategory) return;
    addCategory(newCategoryKey.trim(), newCategoryLabel.trim() || newCategoryKey.trim(), newCategoryGroup);
    triggerToast(`Added new repair category "${newCategoryLabel.trim() || newCategoryKey.trim()}".`);
    setNewCategoryKey('');
    setNewCategoryLabel('');
  };

  const handleDeleteCategoryClick = (key: string, label: string) => {
    if (!deleteCategory) return;
    if (window.confirm(`Delete repair category "${label}"? Existing model prices for this key will be hidden.`)) {
      deleteCategory(key);
      triggerToast(`Deleted repair category "${label}".`);
    }
  };

  // Folder Actions
  const handleStartEditingFolder = (folder: FolderConfig) => {
    setEditingFolderId(folder.id);
    setEditingFolderName(folder.name);
  };

  const handleSaveFolderName = (id: string) => {
    if (renameFolder && editingFolderName.trim()) {
      renameFolder(id, editingFolderName.trim());
      triggerToast(`Renamed device folder to "${editingFolderName.trim()}".`);
    }
    setEditingFolderId(null);
  };

  const handleAddFolderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim() || !addFolder) return;
    addFolder(newFolderName.trim(), newFolderFamily);
    triggerToast(`Created device folder "${newFolderName.trim()}".`);
    setNewFolderName('');
  };

  // Global Adjustments
  const handleApplyGlobalAdjustment = () => {
    if (!applyGlobalPriceAdjustment) return;
    if (globalAdjPercent === 0 && globalAdjFlat === 0) {
      alert('Please enter a percentage or flat adjustment amount.');
      return;
    }
    applyGlobalPriceAdjustment(globalAdjFolder, globalAdjCategory, globalAdjPercent, globalAdjFlat);
    triggerToast('Global price adjustment applied successfully across catalog.');
    setGlobalAdjPercent(0);
    setGlobalAdjFlat(0);
  };

  const handleApplyGlobalWarrantySubmit = () => {
    if (!applyGlobalWarranty) return;
    applyGlobalWarranty(globalWarrantyFolder, globalWarrantyCategory, globalWarrantyTerm);
    triggerToast(`Global warranty set to "${globalWarrantyTerm}" across target models.`);
  };

  const handleExportJson = () => {
    const exportData = {
      catalog,
      folders,
      categories,
      currencySymbol,
      exportedAt: new Date().toISOString()
    };
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `applerepair_price_catalog_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportCsv = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !importCatalogRows) return;

    try {
      const rows = parseCsvRows(await file.text());
      const headers = rows.shift();
      if (!headers?.length) throw new Error('This CSV file has no header row.');

      const modelIndex = headers.findIndex((header) => normalizeCsvHeader(header) === 'model');
      if (modelIndex < 0) throw new Error('The CSV needs a "Model" column.');

      const columns = new Map<number, { key: string; type: 'price' | 'warranty' }>();
      const categoryLookup = new Map<string, { key: string; type: 'price' | 'warranty' }>();
      const csvCategoryKeys = new Set<string>();
      const importCategories = [
        ...categories,
        ...REPAIR_CATEGORIES.filter((defaultCategory) => !categories.some((category) => category.key === defaultCategory.key)),
      ];
      importCategories.forEach((category) => {
        categoryLookup.set(normalizeCsvHeader(`${category.label} Price`), { key: category.key, type: 'price' });
        categoryLookup.set(normalizeCsvHeader(`${category.label} Warranty`), { key: category.key, type: 'warranty' });
      });
      REPAIR_CATEGORIES.forEach((category) => {
        categoryLookup.set(normalizeCsvHeader(`${category.label} Price`), { key: category.key, type: 'price' });
        categoryLookup.set(normalizeCsvHeader(`${category.label} Warranty`), { key: category.key, type: 'warranty' });
      });
      headers.forEach((header, index) => {
        const column = categoryLookup.get(normalizeCsvHeader(header));
        if (column) {
          columns.set(index, column);
          csvCategoryKeys.add(column.key);
        }
      });
      if (columns.size === 0) throw new Error('No matching Price List service columns were found.');

      const knownModels = new Set(catalog.map((item) => item.model.trim().toLowerCase()));
      const parsedRows: PriceCatalogImportRow[] = [];
      let skippedModels = 0;
      rows.forEach((row) => {
        const model = row[modelIndex]?.trim();
        if (!model) return;
        if (!knownModels.has(model.toLowerCase())) {
          skippedModels += 1;
          return;
        }

        const prices: Record<string, number | null> = {};
        const warranties: Record<string, string> = {};
        columns.forEach((column, index) => {
          const value = (row[index] || '').trim();
          if (column.type === 'warranty') {
            warranties[column.key] = value;
            return;
          }
          const numeric = Number(value.replace(/,/g, ''));
          prices[column.key] = value === '' || !Number.isFinite(numeric) ? null : numeric;
        });
        parsedRows.push({ model, prices, warranties });
      });

      if (parsedRows.length === 0) throw new Error('No existing Price List models matched this file.');
      const csvCategories = REPAIR_CATEGORIES.filter((category) => csvCategoryKeys.has(category.key));
      if (!window.confirm(`Replace the Price List repair categories with the ${csvCategories.length} services in this CSV and import prices for ${parsedRows.length} existing model(s)? Inventory Categories will not change.`)) return;

      const imported = await importCatalogRows(
        parsedRows,
        csvCategories,
        true,
      );
      const skippedNote = skippedModels ? ` ${skippedModels} unknown model(s) skipped.` : '';
      triggerToast(`Replaced Price List categories with ${csvCategories.length} CSV services and imported ${imported} model(s).${skippedNote}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not read this CSV file.';
      alert(message);
    }
  };

  const getFamilyIcon = (family: string) => {
    switch (family) {
      case 'iPhone':
        return <Smartphone className="w-4 h-4 text-[#0071E3]" />;
      case 'iPad':
        return <Tablet className="w-4 h-4 text-[#34C759]" />;
      case 'Apple Watch':
        return <Watch className="w-4 h-4 text-[#FF9500]" />;
      case 'Mac':
        return <Laptop className="w-4 h-4 text-[#AF52DE]" />;
      default:
        return <Layers className="w-4 h-4 text-[#86868B]" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-2xl border border-[#E5E5EA] shadow-2xl w-full max-w-5xl my-auto overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-[#F5F5F7] border-b border-[#E5E5EA] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#0071E3] flex items-center justify-center text-white shadow-2xs">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-[#1D1D1F]">
                Price Catalog & Global Preferences
              </h2>
              <p className="text-xs text-[#86868B]">
                Manage device models, repair categories, folder organization, and global price rules
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white hover:bg-[#E5E5EA] flex items-center justify-center text-[#86868B] hover:text-[#1D1D1F] transition-all cursor-pointer border border-[#E5E5EA]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Sub-Tabs Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-2.5 bg-[#F5F5F7] border-b border-[#E5E5EA] text-xs">
          <div className="flex items-center space-x-1.5 flex-wrap gap-y-1 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setActiveSubTab('model-editor')}
              className={`px-3.5 py-2 text-xs font-extrabold rounded-xl transition-all flex items-center space-x-2 shrink-0 cursor-pointer border select-none active:scale-95 ${
                activeSubTab === 'model-editor'
                  ? 'bg-[#0071E3] text-white border-[#0071E3] shadow-xs'
                  : 'bg-white hover:bg-slate-100 text-[#6E6E73] hover:text-[#1D1D1F] border-[#E5E5EA]'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              <span>Models & Prices ({catalog.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('categories-editor')}
              className={`px-3.5 py-2 text-xs font-extrabold rounded-xl transition-all flex items-center space-x-2 shrink-0 cursor-pointer border select-none active:scale-95 ${
                activeSubTab === 'categories-editor'
                  ? 'bg-[#0071E3] text-white border-[#0071E3] shadow-xs'
                  : 'bg-white hover:bg-slate-100 text-[#6E6E73] hover:text-[#1D1D1F] border-[#E5E5EA]'
              }`}
            >
              <Tag className="w-4 h-4" />
              <span>Repair Categories ({categories.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('folder-visibility')}
              className={`px-3.5 py-2 text-xs font-extrabold rounded-xl transition-all flex items-center space-x-2 shrink-0 cursor-pointer border select-none active:scale-95 ${
                activeSubTab === 'folder-visibility'
                  ? 'bg-[#0071E3] text-white border-[#0071E3] shadow-xs'
                  : 'bg-white hover:bg-slate-100 text-[#6E6E73] hover:text-[#1D1D1F] border-[#E5E5EA]'
              }`}
            >
              <Folder className="w-4 h-4" />
              <span>Folders ({folders.filter((f) => f.enabled).length}/{folders.length} Visible)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('global-settings')}
              className={`px-3.5 py-2 text-xs font-extrabold rounded-xl transition-all flex items-center space-x-2 shrink-0 cursor-pointer border select-none active:scale-95 ${
                activeSubTab === 'global-settings'
                  ? 'bg-[#0071E3] text-white border-[#0071E3] shadow-xs'
                  : 'bg-white hover:bg-slate-100 text-[#6E6E73] hover:text-[#1D1D1F] border-[#E5E5EA]'
              }`}
            >
              <Globe className="w-4 h-4" />
              <span>Global Markup & Currency</span>
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <input
              ref={importInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={handleImportCsv}
            />
            <button
              type="button"
              onClick={() => importInputRef.current?.click()}
              className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#0071E3] font-bold text-xs transition-all flex items-center space-x-1.5 border border-blue-200 cursor-pointer"
              title="Import a Price List CSV exported from this ERP"
            >
              <FileUp className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Import CSV</span>
            </button>
            <button
              onClick={handleExportJson}
              className="px-3 py-1.5 rounded-lg bg-[#F5F5F7] hover:bg-[#E5E5EA] text-[#1D1D1F] font-bold text-xs transition-all flex items-center space-x-1.5 border border-[#E5E5EA] cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[#0071E3]" />
              <span className="hidden sm:inline">Export JSON</span>
            </button>
            <button
              onClick={() => {
                if (window.confirm('Reset all price tables, folder settings, and categories back to factory defaults?')) {
                  resetToDefaults();
                  setAllFoldersEnabled(true);
                  triggerToast('Price catalog and preferences reset to factory defaults.');
                }
              }}
              className="px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs transition-all flex items-center space-x-1.5 border border-red-200 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset Defaults</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {saveSuccess && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-xs font-bold flex items-center space-x-2 animate-fadeIn">
              <Check className="w-4 h-4 text-green-600 shrink-0" />
              <span>{saveMsg}</span>
            </div>
          )}

          {/* TAB 1: MODEL EDITOR & ADD/RENAME MODEL */}
          {activeSubTab === 'model-editor' && (
            <div className="space-y-6">
              {/* Model Picker & Controls Card */}
              <div className="bg-[#F5F5F7] p-4 rounded-2xl border border-[#E5E5EA] space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  {/* Select Model Dropdown */}
                  <div className="md:col-span-2 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-extrabold text-[#1D1D1F] flex items-center space-x-1.5">
                        <Smartphone className="w-3.5 h-3.5 text-[#0071E3]" />
                        <span>Select Hardware Model to Edit</span>
                      </label>
                      <div className="flex items-center space-x-2">
                        {renameModel && !isRenamingModel && (
                          <button
                            type="button"
                            onClick={() => {
                              setIsRenamingModel(true);
                              setRenameModelInput(selectedModel);
                            }}
                            className="text-[11px] font-bold text-[#0071E3] hover:underline flex items-center space-x-1"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Rename Model</span>
                          </button>
                        )}
                        {deleteModel && catalog.length > 1 && (
                          <button
                            type="button"
                            onClick={handleDeleteModelClick}
                            className="text-[11px] font-bold text-red-600 hover:underline flex items-center space-x-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Delete</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {isRenamingModel ? (
                      <form onSubmit={handleRenameModelSubmit} className="flex space-x-2">
                        <input
                          type="text"
                          value={renameModelInput}
                          onChange={(e) => setRenameModelInput(e.target.value)}
                          className="flex-1 px-3 py-2 bg-white border border-[#0071E3] rounded-lg text-xs font-bold text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-[#0071E3]"
                          placeholder="New Model Name"
                        />
                        <button
                          type="submit"
                          className="px-3 py-2 bg-[#0071E3] text-white text-xs font-bold rounded-lg hover:bg-[#0071E3]/90 cursor-pointer"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsRenamingModel(false)}
                          className="px-3 py-2 bg-[#E5E5EA] text-[#1D1D1F] text-xs font-bold rounded-lg hover:bg-[#D1D1D6] cursor-pointer"
                        >
                          Cancel
                        </button>
                      </form>
                    ) : (
                      <select
                        value={selectedModel}
                        onChange={(e) => setSelectedModel(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-[#E5E5EA] rounded-xl text-xs font-extrabold text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-[#0071E3]"
                      >
                        {catalog.map((m) => (
                          <option key={m.model} value={m.model}>
                            {m.model} ({Object.values(m.prices).filter((p) => p !== null).length} Active Services)
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Add Model Button / Quick Switch */}
                  <div className="text-right">
                    <span className="text-[11px] font-bold text-[#86868B] block mb-1">
                      Current Folder: <span className="text-[#1D1D1F] font-extrabold">{folders.find((f) => f.id === getModelFolderId(selectedModel))?.name || 'General'}</span>
                    </span>
                  </div>
                </div>

                {/* Add New Model Form with Clone Option */}
                <div className="pt-3 border-t border-[#E5E5EA]">
                  <form onSubmit={handleAddNewModel} className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-end">
                    <div>
                      <label className="text-[11px] font-extrabold text-[#1D1D1F] block mb-1">New Model Name</label>
                      <input
                        type="text"
                        placeholder="e.g. iPhone 16 Pro, iPad Air 6"
                        value={newModelInput}
                        onChange={(e) => setNewModelInput(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-[#E5E5EA] rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#0071E3] text-[#1D1D1F]"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-extrabold text-[#1D1D1F] block mb-1">Copy Prices From (Optional)</label>
                      <select
                        value={cloneModelSource}
                        onChange={(e) => setCloneModelSource(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-[#E5E5EA] rounded-lg text-xs font-medium text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-[#0071E3]"
                      >
                        <option value="">Start Empty (N/A)</option>
                        {catalog.map((m) => (
                          <option key={m.model} value={m.model}>
                            Copy from {m.model}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <button
                        type="submit"
                        disabled={!newModelInput.trim()}
                        className="w-full px-3 py-1.5 bg-[#0071E3] hover:bg-[#0071E3]/90 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer shadow-2xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Model to Catalog</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              {/* Price & Warranty Table */}
              <div className="border border-[#E5E5EA] rounded-xl overflow-hidden bg-white shadow-2xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#F5F5F7] border-b border-[#E5E5EA] text-[11px] font-extrabold text-[#86868B] uppercase tracking-wider">
                      <th className="py-3 px-4 w-1/3">Repair Category / Component</th>
                      <th className="py-3 px-4 w-1/3">Price ({currencySymbol})</th>
                      <th className="py-3 px-4 w-1/3">Warranty Term</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E5EA] text-xs">
                    {categories.map((cat) => {
                      const currentPrice = currentModelData?.prices[cat.key];
                      const currentWarranty = currentModelData?.warranties[cat.key] || '';

                      return (
                        <tr key={cat.key} className="hover:bg-[#F5F5F7]/50 transition-colors">
                          <td className="py-2.5 px-4 font-extrabold text-[#1D1D1F]">
                            <div className="flex items-center space-x-2">
                              <span className="w-2 h-2 rounded-full bg-[#0071E3]" />
                              <span>{cat.label}</span>
                            </div>
                            <span className="text-[10px] text-[#86868B] font-mono block pl-4">
                              {cat.group} • Key: {cat.key}
                            </span>
                          </td>
                          <td className="py-2.5 px-4">
                            <div className="flex items-center rounded-lg border border-[#E5E5EA] bg-[#F5F5F7] focus-within:bg-white focus-within:border-[#0071E3] focus-within:ring-2 focus-within:ring-[#0071E3]/20 overflow-hidden transition-all">
                              <span className="px-2.5 py-1.5 bg-[#E5E5EA]/60 border-r border-[#E5E5EA] text-xs font-bold text-[#86868B] select-none shrink-0 font-mono">
                                {currencySymbol}
                              </span>
                              <input
                                type="text"
                                placeholder="e.g. 120000 or empty if N/A"
                                value={currentPrice === null || currentPrice === undefined ? '' : currentPrice}
                                onChange={(e) => handlePriceChange(cat.key, e.target.value)}
                                className="w-full px-3 py-1.5 bg-transparent border-none text-xs font-mono font-bold text-[#1D1D1F] focus:outline-none"
                              />
                            </div>
                          </td>
                          <td className="py-2.5 px-4">
                            <input
                              type="text"
                              placeholder="e.g. 3 Month, 12 Month"
                              value={currentWarranty}
                              onChange={(e) => handleWarrantyChange(cat.key, e.target.value)}
                              className="w-full px-3 py-1.5 bg-[#F5F5F7] border border-[#E5E5EA] focus:bg-white focus:border-[#0071E3] rounded-lg text-xs font-semibold text-[#1D1D1F] transition-all"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: REPAIR CATEGORIES EDITOR & CUSTOM SERVICE CREATOR */}
          {activeSubTab === 'categories-editor' && (
            <div className="space-y-6">
              <div className="bg-[#F5F5F7] p-4 rounded-2xl border border-[#E5E5EA] space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-extrabold text-[#1D1D1F] flex items-center space-x-2">
                      <Tag className="w-4 h-4 text-[#0071E3]" />
                      <span>Global Repair Service Category Customizer</span>
                    </h3>
                    <p className="text-xs text-[#86868B] mt-0.5">
                      Rename repair category labels or add new custom repair service definitions globally across all device price lists.
                    </p>
                  </div>
                </div>

                {/* Add New Custom Category Form */}
                <form onSubmit={handleAddCategorySubmit} className="pt-3 border-t border-[#E5E5EA] grid grid-cols-1 sm:grid-cols-4 gap-2.5 items-end">
                  <div>
                    <label className="text-[11px] font-extrabold text-[#1D1D1F] block mb-1">Category Key (ID)</label>
                    <input
                      type="text"
                      placeholder="e.g. Camera_Lens_Glass"
                      value={newCategoryKey}
                      onChange={(e) => setNewCategoryKey(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-[#E5E5EA] rounded-lg text-xs font-mono font-medium focus:outline-none focus:ring-2 focus:ring-[#0071E3] text-[#1D1D1F]"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-extrabold text-[#1D1D1F] block mb-1">Display Name / Label</label>
                    <input
                      type="text"
                      placeholder="e.g. Rear Camera Lens Glass"
                      value={newCategoryLabel}
                      onChange={(e) => setNewCategoryLabel(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-[#E5E5EA] rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#0071E3] text-[#1D1D1F]"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-extrabold text-[#1D1D1F] block mb-1">Group</label>
                    <select
                      value={newCategoryGroup}
                      onChange={(e) => setNewCategoryGroup(e.target.value as any)}
                      className="w-full px-3 py-1.5 bg-white border border-[#E5E5EA] rounded-lg text-xs font-medium text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-[#0071E3]"
                    >
                      {['Battery', 'Display', 'Housing', 'Charging', 'Audio', 'Logic Board', 'Network', 'Sensors & Keys'].map((g) => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <button
                      type="submit"
                      disabled={!newCategoryKey.trim()}
                      className="w-full px-3 py-1.5 bg-[#0071E3] hover:bg-[#0071E3]/90 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1 cursor-pointer shadow-2xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Category</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Category List with Inline Name Editing */}
              <div className="border border-[#E5E5EA] rounded-xl overflow-hidden bg-white shadow-2xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#F5F5F7] border-b border-[#E5E5EA] text-[11px] font-extrabold text-[#86868B] uppercase tracking-wider">
                      <th className="py-3 px-4 w-1/4">Internal Key</th>
                      <th className="py-3 px-4 w-2/5">Global Display Label (Name)</th>
                      <th className="py-3 px-4 w-1/5">Group</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E5EA] text-xs">
                    {categories.map((cat) => {
                      const isEditing = editingCategoryKey === cat.key;

                      return (
                        <tr key={cat.key} className="hover:bg-[#F5F5F7]/50 transition-colors">
                          <td className="py-2.5 px-4 font-mono font-bold text-[#86868B]">
                            {cat.key}
                          </td>
                          <td className="py-2.5 px-4 font-extrabold text-[#1D1D1F]">
                            {isEditing ? (
                              <div className="flex items-center space-x-2">
                                <input
                                  type="text"
                                  value={editingCategoryLabel}
                                  onChange={(e) => setEditingCategoryLabel(e.target.value)}
                                  className="flex-1 px-2.5 py-1 bg-white border border-[#0071E3] rounded-md text-xs font-extrabold text-[#1D1D1F] focus:outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSaveCategoryLabel(cat.key)}
                                  className="px-2.5 py-1 bg-[#0071E3] text-white rounded-md text-xs font-bold cursor-pointer"
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingCategoryKey(null)}
                                  className="px-2.5 py-1 bg-[#E5E5EA] text-[#1D1D1F] rounded-md text-xs font-bold cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <span>{cat.label}</span>
                            )}
                          </td>
                          <td className="py-2.5 px-4">
                            <span className="px-2 py-0.5 rounded-full bg-[#F5F5F7] text-[#86868B] border border-[#E5E5EA] font-semibold text-[10px]">
                              {cat.group}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-right">
                            {!isEditing && (
                              <div className="flex items-center justify-end space-x-2">
                                <button
                                  type="button"
                                  onClick={() => handleStartEditingCategory(cat)}
                                  className="p-1.5 hover:bg-[#E5E5EA] text-[#0071E3] rounded-lg transition-all cursor-pointer"
                                  title="Change Category Name"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                {deleteCategory && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteCategoryClick(cat.key, cat.label)}
                                    className="p-1.5 hover:bg-red-50 text-red-600 rounded-lg transition-all cursor-pointer"
                                    title="Delete Category"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: FOLDER VISIBILITY & CREATOR */}
          {activeSubTab === 'folder-visibility' && (
            <div className="space-y-6">
              <div className="bg-[#F5F5F7] p-4 rounded-2xl border border-[#E5E5EA] space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-extrabold text-[#1D1D1F] flex items-center space-x-2">
                      <FolderCheck className="w-4 h-4 text-[#0071E3]" />
                      <span>Device Model Folders & Show/Hide Controls</span>
                    </h3>
                    <p className="text-xs text-[#86868B] mt-0.5">
                      Toggle device folders ON/OFF or rename folders to customize what appears in the Device Model Chooser.
                    </p>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setAllFoldersEnabled(true)}
                      className="px-3 py-1.5 bg-white hover:bg-[#0071E3] hover:text-white border border-[#E5E5EA] text-[#0071E3] font-extrabold rounded-xl text-xs transition-all cursor-pointer shadow-2xs"
                    >
                      Show All
                    </button>
                    <button
                      type="button"
                      onClick={() => setAllFoldersEnabled(false)}
                      className="px-3 py-1.5 bg-white hover:bg-red-500 hover:text-white border border-[#E5E5EA] text-[#86868B] font-extrabold rounded-xl text-xs transition-all cursor-pointer shadow-2xs"
                    >
                      Hide All
                    </button>
                  </div>
                </div>

                {/* Add New Custom Folder Form */}
                {addFolder && (
                  <form onSubmit={handleAddFolderSubmit} className="pt-3 border-t border-[#E5E5EA] grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-end">
                    <div>
                      <label className="text-[11px] font-extrabold text-[#1D1D1F] block mb-1">New Folder Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Google Pixel Series, Samsung Galaxy"
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-[#E5E5EA] rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#0071E3] text-[#1D1D1F]"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-extrabold text-[#1D1D1F] block mb-1">Device Family</label>
                      <select
                        value={newFolderFamily}
                        onChange={(e) => setNewFolderFamily(e.target.value as any)}
                        className="w-full px-3 py-1.5 bg-white border border-[#E5E5EA] rounded-lg text-xs font-medium text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-[#0071E3]"
                      >
                        {['iPhone', 'iPad', 'Apple Watch', 'Mac', 'Other'].map((f) => (
                          <option key={f} value={f}>{f}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <button
                        type="submit"
                        disabled={!newFolderName.trim()}
                        className="w-full px-3 py-1.5 bg-[#0071E3] hover:bg-[#0071E3]/90 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer shadow-2xs"
                      >
                        <FolderPlus className="w-3.5 h-3.5" />
                        <span>Create Folder</span>
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* Folders List Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {folders.map((folder) => {
                  const modelCount = modelCountPerFolder[folder.id] || 0;
                  const isEditing = editingFolderId === folder.id;

                  return (
                    <div
                      key={folder.id}
                      className={`p-4 rounded-2xl border transition-all flex items-center justify-between select-none ${
                        folder.enabled
                          ? 'bg-white border-[#0071E3] ring-1 ring-[#0071E3]/20 shadow-xs'
                          : 'bg-[#F5F5F7]/70 border-[#E5E5EA] opacity-60'
                      }`}
                    >
                      <div className="flex items-center space-x-3.5 min-w-0 flex-1">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                            folder.enabled
                              ? 'bg-[#0071E3]/10 border-[#0071E3]/20'
                              : 'bg-[#E5E5EA] border-transparent'
                          }`}
                        >
                          {getFamilyIcon(folder.family)}
                        </div>

                        <div className="min-w-0 flex-1 pr-2">
                          {isEditing ? (
                            <div className="flex items-center space-x-1.5">
                              <input
                                type="text"
                                value={editingFolderName}
                                onChange={(e) => setEditingFolderName(e.target.value)}
                                className="w-full px-2 py-1 border border-[#0071E3] bg-white rounded-lg text-xs font-bold text-[#1D1D1F]"
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveFolderName(folder.id)}
                                className="px-2 py-1 bg-[#0071E3] text-white text-xs font-bold rounded-lg cursor-pointer"
                              >
                                Save
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-2">
                              <h4 className="font-extrabold text-sm text-[#1D1D1F] truncate">
                                {folder.name}
                              </h4>
                              {renameFolder && (
                                <button
                                  type="button"
                                  onClick={() => handleStartEditingFolder(folder)}
                                  className="text-[#0071E3] hover:text-[#0071E3]/80 p-0.5 cursor-pointer"
                                  title="Rename folder"
                                >
                                  <Edit3 className="w-3 h-3" />
                                </button>
                              )}
                              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#F5F5F7] text-[#86868B] border border-[#E5E5EA]">
                                {modelCount} models
                              </span>
                            </div>
                          )}
                          <span className="text-[10px] font-bold text-[#86868B] uppercase block mt-0.5">
                            Category: {folder.family}
                          </span>
                        </div>
                      </div>

                      {/* Folder Show/Hide Toggle */}
                      <div
                        onClick={() => toggleFolder(folder.id)}
                        className="flex items-center space-x-2 shrink-0 ml-2 cursor-pointer"
                      >
                        <span className={`text-xs font-extrabold ${folder.enabled ? 'text-[#0071E3]' : 'text-[#86868B]'}`}>
                          {folder.enabled ? 'VISIBLE' : 'HIDDEN'}
                        </span>
                        <div
                          className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-200 flex items-center ${
                            folder.enabled ? 'bg-[#0071E3] justify-end' : 'bg-[#E5E5EA] justify-start'
                          }`}
                        >
                          <div className="w-5 h-5 rounded-full bg-white shadow-md flex items-center justify-center">
                            {folder.enabled ? (
                              <Eye className="w-3 h-3 text-[#0071E3]" />
                            ) : (
                              <EyeOff className="w-3 h-3 text-[#86868B]" />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: GLOBAL BULK MARKUP & CURRENCY PREFERENCES */}
          {activeSubTab === 'global-settings' && (
            <div className="space-y-6 max-w-3xl mx-auto">
              {/* Global Price Adjustment / Markup Engine */}
              <div className="bg-white p-5 rounded-2xl border border-[#E5E5EA] space-y-4 shadow-2xs">
                <div className="flex items-center justify-between border-b border-[#E5E5EA] pb-3">
                  <h3 className="text-sm font-extrabold text-[#1D1D1F] flex items-center space-x-2">
                    <TrendingUp className="w-4 h-4 text-[#0071E3]" />
                    <span>Global Bulk Price Markup & Adjustment Tool</span>
                  </h3>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-[#0071E3] border border-blue-200">
                    Apply to All or Selected Folder
                  </span>
                </div>
                <p className="text-xs text-[#86868B]">
                  Batch adjust service prices across device folders or specific categories by percentage (e.g. +10%) or flat amount (e.g. +10,000 {currencySymbol}).
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="text-xs font-extrabold text-[#1D1D1F] block mb-1">Target Device Folder</label>
                    <select
                      value={globalAdjFolder}
                      onChange={(e) => setGlobalAdjFolder(e.target.value)}
                      className="w-full px-3 py-2 bg-[#F5F5F7] border border-[#E5E5EA] rounded-xl text-xs font-bold text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-[#0071E3]"
                    >
                      <option value="ALL">All Device Folders ({catalog.length} models)</option>
                      {folders.map((f) => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-extrabold text-[#1D1D1F] block mb-1">Target Service Category</label>
                    <select
                      value={globalAdjCategory}
                      onChange={(e) => setGlobalAdjCategory(e.target.value)}
                      className="w-full px-3 py-2 bg-[#F5F5F7] border border-[#E5E5EA] rounded-xl text-xs font-bold text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-[#0071E3]"
                    >
                      <option value="ALL">All Service Categories ({categories.length} categories)</option>
                      {categories.map((c) => (
                        <option key={c.key} value={c.key}>{c.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-extrabold text-[#1D1D1F] block mb-1">Percentage Change (%)</label>
                    <input
                      type="number"
                      placeholder="e.g. 10 for +10% or -5 for -5%"
                      value={globalAdjPercent || ''}
                      onChange={(e) => setGlobalAdjPercent(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-[#F5F5F7] border border-[#E5E5EA] rounded-xl text-xs font-mono font-bold text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-[#0071E3]"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-extrabold text-[#1D1D1F] block mb-1">Flat Price Change ({currencySymbol})</label>
                    <input
                      type="number"
                      placeholder="e.g. 5000 or -2000"
                      value={globalAdjFlat || ''}
                      onChange={(e) => setGlobalAdjFlat(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-[#F5F5F7] border border-[#E5E5EA] rounded-xl text-xs font-mono font-bold text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-[#0071E3]"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={handleApplyGlobalAdjustment}
                    className="px-4 py-2 bg-[#0071E3] hover:bg-[#0071E3]/90 text-white rounded-xl text-xs font-extrabold transition-all flex items-center space-x-1.5 cursor-pointer shadow-2xs"
                  >
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>Apply Price Adjustment Globally</span>
                  </button>
                </div>
              </div>

              {/* Global Warranty Presets Tool */}
              <div className="bg-white p-5 rounded-2xl border border-[#E5E5EA] space-y-4 shadow-2xs">
                <div className="flex items-center justify-between border-b border-[#E5E5EA] pb-3">
                  <h3 className="text-sm font-extrabold text-[#1D1D1F] flex items-center space-x-2">
                    <ShieldCheck className="w-4 h-4 text-[#34C759]" />
                    <span>Global Warranty Bulk Preset Tool</span>
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 items-end">
                  <div>
                    <label className="text-xs font-extrabold text-[#1D1D1F] block mb-1">Target Folder</label>
                    <select
                      value={globalWarrantyFolder}
                      onChange={(e) => setGlobalWarrantyFolder(e.target.value)}
                      className="w-full px-3 py-2 bg-[#F5F5F7] border border-[#E5E5EA] rounded-xl text-xs font-bold text-[#1D1D1F] focus:outline-none"
                    >
                      <option value="ALL">All Device Folders</option>
                      {folders.map((f) => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-extrabold text-[#1D1D1F] block mb-1">Warranty Term</label>
                    <input
                      type="text"
                      value={globalWarrantyTerm}
                      onChange={(e) => setGlobalWarrantyTerm(e.target.value)}
                      placeholder="e.g. 6 Month, 12 Month"
                      className="w-full px-3 py-2 bg-[#F5F5F7] border border-[#E5E5EA] rounded-xl text-xs font-extrabold text-[#1D1D1F] focus:outline-none"
                    />
                  </div>

                  <div>
                    <button
                      type="button"
                      onClick={handleApplyGlobalWarrantySubmit}
                      className="w-full px-4 py-2 bg-[#34C759] hover:bg-[#34C759]/90 text-white rounded-xl text-xs font-extrabold transition-all flex items-center justify-center space-x-1.5 cursor-pointer shadow-2xs"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Set Warranty Globally</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Currency Display Preferences */}
              <div className="bg-white p-5 rounded-2xl border border-[#E5E5EA] space-y-4 shadow-2xs">
                <h3 className="text-sm font-extrabold text-[#1D1D1F] flex items-center space-x-2">
                  <DollarSign className="w-4 h-4 text-[#0071E3]" />
                  <span>Currency Display Preferences</span>
                </h3>
                <p className="text-xs text-[#86868B]">
                  Choose the currency unit prefix displayed across all repair price tags, quotes, and customer estimates.
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Myanmar Kyat (MMK)', sym: 'MMK' },
                    { label: 'US Dollar ($)', sym: '$' },
                    { label: 'Thai Baht (฿)', sym: '฿' },
                    { label: 'Euro (€)', sym: '€' },
                  ].map((curr) => (
                    <button
                      key={curr.sym}
                      type="button"
                      onClick={() => setCurrencySymbol(curr.sym)}
                      className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                        currencySymbol === curr.sym
                          ? 'border-[#0071E3] bg-blue-50/60 text-[#0071E3] font-extrabold shadow-2xs'
                          : 'border-[#E5E5EA] hover:border-[#86868B] text-[#1D1D1F] font-semibold'
                      }`}
                    >
                      <div className="text-base font-black font-mono">{curr.sym}</div>
                      <div className="text-[11px]">{curr.label}</div>
                    </button>
                  ))}
                </div>

                <div className="pt-3 border-t border-[#E5E5EA]">
                  <label className="text-xs font-bold text-[#1D1D1F] block mb-1">Custom Currency Symbol</label>
                  <input
                    type="text"
                    value={currencySymbol}
                    onChange={(e) => setCurrencySymbol(e.target.value)}
                    className="w-full max-w-xs px-3 py-2 border border-[#E5E5EA] bg-white rounded-lg text-xs font-bold text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-[#0071E3]"
                    placeholder="Custom symbol e.g. RM, SGD, AUD"
                  />
                </div>
              </div>

              {/* Cloud Sync Notice */}
              <div className="bg-white p-5 rounded-2xl border border-[#E5E5EA] space-y-3 shadow-2xs">
                <h3 className="text-sm font-extrabold text-[#1D1D1F] flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-[#FF9500]" />
                  <span>Price Storage & Sync Notice</span>
                </h3>
                <p className="text-xs text-[#86868B] leading-relaxed">
                  All price modifications, custom models, category names, folder visibility choices, and global rules updated here are saved live to your real-time Firestore database. All team members see updates instantly across devices.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-[#F5F5F7] border-t border-[#E5E5EA] flex items-center justify-between">
          <span className="text-xs font-semibold text-[#86868B]">
            Catalog contains {catalog.length} device models across {folders.filter((f) => f.enabled).length} active folders & {categories.length} repair categories
          </span>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                triggerToast('All changes saved.');
                setTimeout(() => {
                  onClose();
                }, 400);
              }}
              className="px-5 py-2 bg-[#0071E3] hover:bg-[#0071E3]/90 text-white rounded-xl text-xs font-extrabold transition-all flex items-center space-x-2 shadow-2xs cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Save & Close</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
