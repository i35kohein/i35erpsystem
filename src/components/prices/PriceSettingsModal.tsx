import React, { useRef, useState, useEffect } from 'react';
import {X, 
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
  TrendingUp,
  Globe} from 'lucide-react';
import { ModelRepairPrice, PriceCatalogImportRow, REPAIR_CATEGORIES, RepairCategoryDef, FolderConfig, getModelFolderId } from '../../types/priceCatalog';
import { Button } from '../ui';
import { toast } from '../../lib/toast';

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

  // ESC closes the settings modal.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

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
  const [globalWarrantyCategory] = useState<string>('ALL');
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
      toast.error('Please enter a percentage or flat adjustment amount.', 'Invalid Adjustment');
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
      toast.info(message, 'Price Update');
    }
  };

  const getFamilyIcon = (family: string) => {
    switch (family) {
      case 'iPhone':
        return <Smartphone className="w-4 h-4 text-brand" />;
      case 'iPad':
        return <Tablet className="w-4 h-4 text-success" />;
      case 'Apple Watch':
        return <Watch className="w-4 h-4 text-[#FF9500]" />;
      case 'Mac':
        return <Laptop className="w-4 h-4 text-[#AF52DE]" />;
      default:
        return <Layers className="w-4 h-4 text-muted" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-2xl border border-line shadow-2xl w-full max-w-5xl my-auto overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-surface border-b border-line flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-brand flex items-center justify-center text-white shadow-2xs">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-ink">
                Price Catalog & Global Preferences
              </h2>
              <p className="text-xs text-muted">
                Manage device models, repair categories, folder organization, and global price rules
              </p>
            </div>
          </div>
          <Button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white hover:bg-line flex items-center justify-center text-muted hover:text-ink transition-all cursor-pointer border border-line"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Navigation Sub-Tabs Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-2.5 bg-surface border-b border-line text-xs">
          <div className="flex items-center space-x-1.5 flex-wrap gap-y-1 overflow-x-auto no-scrollbar">
            <Button
              type="button"
              onClick={() => setActiveSubTab('model-editor')}
              className={`px-3.5 py-2 text-xs font-extrabold rounded-xl transition-all flex items-center space-x-2 shrink-0 cursor-pointer border select-none active:scale-95 ${
                activeSubTab === 'model-editor'
                  ? 'bg-brand text-white border-brand shadow-xs'
                  : 'bg-white hover:bg-slate-100 text-faint hover:text-ink border-line'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              <span>Models & Prices ({catalog.length})</span>
            </Button>

            <Button
              type="button"
              onClick={() => setActiveSubTab('categories-editor')}
              className={`px-3.5 py-2 text-xs font-extrabold rounded-xl transition-all flex items-center space-x-2 shrink-0 cursor-pointer border select-none active:scale-95 ${
                activeSubTab === 'categories-editor'
                  ? 'bg-brand text-white border-brand shadow-xs'
                  : 'bg-white hover:bg-slate-100 text-faint hover:text-ink border-line'
              }`}
            >
              <Tag className="w-4 h-4" />
              <span>Repair Categories ({categories.length})</span>
            </Button>

            <Button
              type="button"
              onClick={() => setActiveSubTab('folder-visibility')}
              className={`px-3.5 py-2 text-xs font-extrabold rounded-xl transition-all flex items-center space-x-2 shrink-0 cursor-pointer border select-none active:scale-95 ${
                activeSubTab === 'folder-visibility'
                  ? 'bg-brand text-white border-brand shadow-xs'
                  : 'bg-white hover:bg-slate-100 text-faint hover:text-ink border-line'
              }`}
            >
              <Folder className="w-4 h-4" />
              <span>Folders ({folders.filter((f) => f.enabled).length}/{folders.length} Visible)</span>
            </Button>

            <Button
              type="button"
              onClick={() => setActiveSubTab('global-settings')}
              className={`px-3.5 py-2 text-xs font-extrabold rounded-xl transition-all flex items-center space-x-2 shrink-0 cursor-pointer border select-none active:scale-95 ${
                activeSubTab === 'global-settings'
                  ? 'bg-brand text-white border-brand shadow-xs'
                  : 'bg-white hover:bg-slate-100 text-faint hover:text-ink border-line'
              }`}
            >
              <Globe className="w-4 h-4" />
              <span>Global Markup & Currency</span>
            </Button>
          </div>

          <div className="flex items-center space-x-2">
            <input
              ref={importInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={handleImportCsv}
            />
            <Button
              type="button"
              onClick={() => importInputRef.current?.click()}
              className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-brand font-bold text-xs transition-all flex items-center space-x-1.5 border border-blue-200 cursor-pointer"
              title="Import a Price List CSV exported from this ERP"
            >
              <FileUp className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Import CSV</span>
            </Button>
            <Button
              onClick={handleExportJson}
              className="px-3 py-1.5 rounded-lg bg-surface hover:bg-line text-ink font-bold text-xs transition-all flex items-center space-x-1.5 border border-line cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-brand" />
              <span className="hidden sm:inline">Export JSON</span>
            </Button>
            <Button
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
            </Button>
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
              <div className="bg-surface p-4 rounded-2xl border border-line space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  {/* Select Model Dropdown */}
                  <div className="md:col-span-2 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-extrabold text-ink flex items-center space-x-1.5">
                        <Smartphone className="w-3.5 h-3.5 text-brand" />
                        <span>Select Hardware Model to Edit</span>
                      </label>
                      <div className="flex items-center space-x-2">
                        {renameModel && !isRenamingModel && (
                          <Button
                            type="button"
                            onClick={() => {
                              setIsRenamingModel(true);
                              setRenameModelInput(selectedModel);
                            }}
                            className="text-xs font-bold text-brand hover:underline flex items-center space-x-1"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Rename Model</span>
                          </Button>
                        )}
                        {deleteModel && catalog.length > 1 && (
                          <Button
                            type="button"
                            onClick={handleDeleteModelClick}
                            className="text-xs font-bold text-red-600 hover:underline flex items-center space-x-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Delete</span>
                          </Button>
                        )}
                      </div>
                    </div>

                    {isRenamingModel ? (
                      <form onSubmit={handleRenameModelSubmit} className="flex space-x-2">
                        <input
                          type="text"
                          value={renameModelInput}
                          onChange={(e) => setRenameModelInput(e.target.value)}
                          className="flex-1 px-3 py-2 bg-white border border-brand rounded-lg text-xs font-bold text-ink focus:outline-none focus:ring-2 focus:ring-brand"
                          placeholder="New Model Name"
                        />
                        <Button
                          type="submit"
                          size="sm"
                          className="bg-brand text-white hover:bg-brand/90 rounded-lg"
                        >
                          Save
                        </Button>
                        <Button
                          type="button"
                          onClick={() => setIsRenamingModel(false)}
                          variant="secondary"
                          size="sm"
                          className="rounded-lg"
                        >
                          Cancel
                        </Button>
                      </form>
                    ) : (
                      <select
                        value={selectedModel}
                        onChange={(e) => setSelectedModel(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-line rounded-xl text-xs font-extrabold text-ink focus:outline-none focus:ring-2 focus:ring-brand"
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
                    <span className="text-xs font-bold text-muted block mb-1">
                      Current Folder: <span className="text-ink font-extrabold">{folders.find((f) => f.id === getModelFolderId(selectedModel))?.name || 'General'}</span>
                    </span>
                  </div>
                </div>

                {/* Add New Model Form with Clone Option */}
                <div className="pt-3 border-t border-line">
                  <form onSubmit={handleAddNewModel} className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-end">
                    <div>
                      <label className="text-xs font-extrabold text-ink block mb-1">New Model Name</label>
                      <input
                        type="text"
                        placeholder="e.g. iPhone 16 Pro, iPad Air 6"
                        value={newModelInput}
                        onChange={(e) => setNewModelInput(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-line rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand text-ink"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-extrabold text-ink block mb-1">Copy Prices From (Optional)</label>
                      <select
                        value={cloneModelSource}
                        onChange={(e) => setCloneModelSource(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-line rounded-lg text-xs font-medium text-ink focus:outline-none focus:ring-2 focus:ring-brand"
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
                      <Button
                        type="submit"
                        disabled={!newModelInput.trim()}
                        className="w-full bg-brand hover:bg-brand/90 disabled:opacity-50 text-white rounded-lg"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Model to Catalog</span>
                      </Button>
                    </div>
                  </form>
                </div>
              </div>

              {/* Price & Warranty Table */}
              <div className="border border-line rounded-xl overflow-hidden bg-white shadow-2xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface border-b border-line text-xs font-extrabold text-muted uppercase tracking-wider">
                      <th className="py-3 px-4 w-1/3">Repair Category / Component</th>
                      <th className="py-3 px-4 w-1/3">Price ({currencySymbol})</th>
                      <th className="py-3 px-4 w-1/3">Warranty Term</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line text-xs">
                    {categories.map((cat) => {
                      const currentPrice = currentModelData?.prices[cat.key];
                      const currentWarranty = currentModelData?.warranties[cat.key] || '';

                      return (
                        <tr key={cat.key} className="hover:bg-surface/50 transition-colors">
                          <td className="py-2.5 px-4 font-extrabold text-ink">
                            <div className="flex items-center space-x-2">
                              <span className="w-2 h-2 rounded-full bg-brand" />
                              <span>{cat.label}</span>
                            </div>
                            <span className="text-xs text-muted font-mono block pl-4">
                              {cat.group} • Key: {cat.key}
                            </span>
                          </td>
                          <td className="py-2.5 px-4">
                            <div className="flex items-center rounded-lg border border-line bg-surface focus-within:bg-white focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20 overflow-hidden transition-all">
                              <span className="px-2.5 py-1.5 bg-line/60 border-r border-line text-xs font-bold text-muted select-none shrink-0 font-mono">
                                {currencySymbol}
                              </span>
                              <input
                                type="text"
                                placeholder="e.g. 120000 or empty if N/A"
                                value={currentPrice === null || currentPrice === undefined ? '' : currentPrice}
                                onChange={(e) => handlePriceChange(cat.key, e.target.value)}
                                className="w-full px-3 py-1.5 bg-transparent border-none text-xs font-mono font-bold text-ink focus:outline-none"
                              />
                            </div>
                          </td>
                          <td className="py-2.5 px-4">
                            <input
                              type="text"
                              placeholder="e.g. 3 Month, 12 Month"
                              value={currentWarranty}
                              onChange={(e) => handleWarrantyChange(cat.key, e.target.value)}
                              className="w-full px-3 py-1.5 bg-surface border border-line focus:bg-white focus:border-brand rounded-lg text-xs font-semibold text-ink transition-all"
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
              <div className="bg-surface p-4 rounded-2xl border border-line space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-extrabold text-ink flex items-center space-x-2">
                      <Tag className="w-4 h-4 text-brand" />
                      <span>Global Repair Service Category Customizer</span>
                    </h3>
                    <p className="text-xs text-muted mt-0.5">Rename categories or add custom repair services.</p>
                  </div>
                </div>

                {/* Add New Custom Category Form */}
                <form onSubmit={handleAddCategorySubmit} className="pt-3 border-t border-line grid grid-cols-1 sm:grid-cols-4 gap-2.5 items-end">
                  <div>
                    <label className="text-xs font-extrabold text-ink block mb-1">Category Key (ID)</label>
                    <input
                      type="text"
                      placeholder="e.g. Camera_Lens_Glass"
                      value={newCategoryKey}
                      onChange={(e) => setNewCategoryKey(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-line rounded-lg text-xs font-mono font-medium focus:outline-none focus:ring-2 focus:ring-brand text-ink"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-extrabold text-ink block mb-1">Display Name / Label</label>
                    <input
                      type="text"
                      placeholder="e.g. Rear Camera Lens Glass"
                      value={newCategoryLabel}
                      onChange={(e) => setNewCategoryLabel(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-line rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand text-ink"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-extrabold text-ink block mb-1">Group</label>
                    <select
                      value={newCategoryGroup}
                      onChange={(e) => setNewCategoryGroup(e.target.value as any)}
                      className="w-full px-3 py-1.5 bg-white border border-line rounded-lg text-xs font-medium text-ink focus:outline-none focus:ring-2 focus:ring-brand"
                    >
                      {['Battery', 'Display', 'Housing', 'Charging', 'Audio', 'Logic Board', 'Network', 'Sensors & Keys'].map((g) => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Button
                      type="submit"
                      disabled={!newCategoryKey.trim()}
                      className="w-full px-3 py-1.5 bg-brand hover:bg-brand/90 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1 cursor-pointer shadow-2xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Category</span>
                    </Button>
                  </div>
                </form>
              </div>

              {/* Category List with Inline Name Editing */}
              <div className="border border-line rounded-xl overflow-hidden bg-white shadow-2xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface border-b border-line text-xs font-extrabold text-muted uppercase tracking-wider">
                      <th className="py-3 px-4 w-1/4">Internal Key</th>
                      <th className="py-3 px-4 w-2/5">Global Display Label (Name)</th>
                      <th className="py-3 px-4 w-1/5">Group</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line text-xs">
                    {categories.map((cat) => {
                      const isEditing = editingCategoryKey === cat.key;

                      return (
                        <tr key={cat.key} className="hover:bg-surface/50 transition-colors">
                          <td className="py-2.5 px-4 font-mono font-bold text-muted">
                            {cat.key}
                          </td>
                          <td className="py-2.5 px-4 font-extrabold text-ink">
                            {isEditing ? (
                              <div className="flex items-center space-x-2">
                                <input
                                  type="text"
                                  value={editingCategoryLabel}
                                  onChange={(e) => setEditingCategoryLabel(e.target.value)}
                                  className="flex-1 px-2.5 py-1 bg-white border border-brand rounded-md text-xs font-extrabold text-ink focus:outline-none"
                                />
                                <Button
                                  type="button"
                                  onClick={() => handleSaveCategoryLabel(cat.key)}
                                  className="px-2.5 py-1 bg-brand text-white rounded-md text-xs font-bold cursor-pointer"
                                >
                                  Save
                                </Button>
                                <Button
                                  type="button"
                                  onClick={() => setEditingCategoryKey(null)}
                                  className="px-2.5 py-1 bg-line text-ink rounded-md text-xs font-bold cursor-pointer"
                                >
                                  Cancel
                                </Button>
                              </div>
                            ) : (
                              <span>{cat.label}</span>
                            )}
                          </td>
                          <td className="py-2.5 px-4">
                            <span className="px-2 py-0.5 rounded-full bg-surface text-muted border border-line font-semibold text-xs">
                              {cat.group}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-right">
                            {!isEditing && (
                              <div className="flex items-center justify-end space-x-2">
                                <Button
                                  type="button"
                                  onClick={() => handleStartEditingCategory(cat)}
                                  className="p-1.5 hover:bg-line text-brand rounded-lg transition-all cursor-pointer"
                                  title="Change Category Name"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </Button>
                                {deleteCategory && (
                                  <Button
                                    type="button"
                                    onClick={() => handleDeleteCategoryClick(cat.key, cat.label)}
                                    className="p-1.5 hover:bg-red-50 text-red-600 rounded-lg transition-all cursor-pointer"
                                    title="Delete Category"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
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
              <div className="bg-surface p-4 rounded-2xl border border-line space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-extrabold text-ink flex items-center space-x-2">
                      <FolderCheck className="w-4 h-4 text-brand" />
                      <span>Device Model Folders & Show/Hide Controls</span>
                    </h3>
                    <p className="text-xs text-muted mt-0.5">
                      Toggle device folders ON/OFF or rename folders to customize what appears in the Device Model Chooser.
                    </p>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <Button
                      type="button"
                      onClick={() => setAllFoldersEnabled(true)}
                      variant="outline"
                      size="sm"
                      className="text-brand hover:bg-brand hover:text-white"
                    >
                      Show All
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setAllFoldersEnabled(false)}
                      variant="outline"
                      size="sm"
                      className="text-muted hover:bg-red-500 hover:text-white hover:border-red-500"
                    >
                      Hide All
                    </Button>
                  </div>
                </div>

                {/* Add New Custom Folder Form */}
                {addFolder && (
                  <form onSubmit={handleAddFolderSubmit} className="pt-3 border-t border-line grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-end">
                    <div>
                      <label className="text-xs font-extrabold text-ink block mb-1">New Folder Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Google Pixel Series, Samsung Galaxy"
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-line rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand text-ink"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-extrabold text-ink block mb-1">Device Family</label>
                      <select
                        value={newFolderFamily}
                        onChange={(e) => setNewFolderFamily(e.target.value as any)}
                        className="w-full px-3 py-1.5 bg-white border border-line rounded-lg text-xs font-medium text-ink focus:outline-none focus:ring-2 focus:ring-brand"
                      >
                        {['iPhone', 'iPad', 'Apple Watch', 'Mac', 'Other'].map((f) => (
                          <option key={f} value={f}>{f}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Button
                        type="submit"
                        disabled={!newFolderName.trim()}
                        className="w-full px-3 py-1.5 bg-brand hover:bg-brand/90 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer shadow-2xs"
                      >
                        <FolderPlus className="w-3.5 h-3.5" />
                        <span>Create Folder</span>
                      </Button>
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
                          ? 'bg-white border-brand ring-1 ring-brand/20 shadow-xs'
                          : 'bg-surface/70 border-line opacity-60'
                      }`}
                    >
                      <div className="flex items-center space-x-3.5 min-w-0 flex-1">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                            folder.enabled
                              ? 'bg-brand/10 border-brand/20'
                              : 'bg-line border-transparent'
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
                                className="w-full px-2 py-1 border border-brand bg-white rounded-lg text-xs font-bold text-ink"
                              />
                              <Button
                                type="button"
                                onClick={() => handleSaveFolderName(folder.id)}
                                className="px-2 py-1 bg-brand text-white text-xs font-bold rounded-lg cursor-pointer"
                              >
                                Save
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-2">
                              <h4 className="font-extrabold text-sm text-ink truncate">
                                {folder.name}
                              </h4>
                              {renameFolder && (
                                <Button
                                  type="button"
                                  onClick={() => handleStartEditingFolder(folder)}
                                  className="text-brand hover:text-brand/80 p-0.5 cursor-pointer"
                                  title="Rename folder"
                                >
                                  <Edit3 className="w-3 h-3" />
                                </Button>
                              )}
                              <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-surface text-muted border border-line">
                                {modelCount} models
                              </span>
                            </div>
                          )}
                          <span className="text-xs font-bold text-muted uppercase block mt-0.5">
                            Category: {folder.family}
                          </span>
                        </div>
                      </div>

                      {/* Folder Show/Hide Toggle */}
                      <div
                        onClick={() => toggleFolder(folder.id)}
                        className="flex items-center space-x-2 shrink-0 ml-2 cursor-pointer"
                      >
                        <span className={`text-xs font-extrabold ${folder.enabled ? 'text-brand' : 'text-muted'}`}>
                          {folder.enabled ? 'VISIBLE' : 'HIDDEN'}
                        </span>
                        <div
                          className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-200 flex items-center ${
                            folder.enabled ? 'bg-brand justify-end' : 'bg-line justify-start'
                          }`}
                        >
                          <div className="w-5 h-5 rounded-full bg-white shadow-md flex items-center justify-center">
                            {folder.enabled ? (
                              <Eye className="w-3 h-3 text-brand" />
                            ) : (
                              <EyeOff className="w-3 h-3 text-muted" />
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
              <div className="bg-white p-5 rounded-2xl border border-line space-y-4 shadow-2xs">
                <div className="flex items-center justify-between border-b border-line pb-3">
                  <h3 className="text-sm font-extrabold text-ink flex items-center space-x-2">
                    <TrendingUp className="w-4 h-4 text-brand" />
                    <span>Global Bulk Price Markup & Adjustment Tool</span>
                  </h3>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-brand border border-blue-200">
                    Apply to All or Selected Folder
                  </span>
                </div>
                <p className="text-xs text-muted">
                  Batch adjust service prices across device folders or specific categories by percentage (e.g. +10%) or flat amount (e.g. +10,000 {currencySymbol}).
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="text-xs font-extrabold text-ink block mb-1">Target Device Folder</label>
                    <select
                      value={globalAdjFolder}
                      onChange={(e) => setGlobalAdjFolder(e.target.value)}
                      className="w-full px-3 py-2 bg-surface border border-line rounded-xl text-xs font-bold text-ink focus:outline-none focus:ring-2 focus:ring-brand"
                    >
                      <option value="ALL">All Device Folders ({catalog.length} models)</option>
                      {folders.map((f) => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-extrabold text-ink block mb-1">Target Service Category</label>
                    <select
                      value={globalAdjCategory}
                      onChange={(e) => setGlobalAdjCategory(e.target.value)}
                      className="w-full px-3 py-2 bg-surface border border-line rounded-xl text-xs font-bold text-ink focus:outline-none focus:ring-2 focus:ring-brand"
                    >
                      <option value="ALL">All Service Categories ({categories.length} categories)</option>
                      {categories.map((c) => (
                        <option key={c.key} value={c.key}>{c.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-extrabold text-ink block mb-1">Percentage Change (%)</label>
                    <input
                      type="number"
                      placeholder="e.g. 10 for +10% or -5 for -5%"
                      value={globalAdjPercent || ''}
                      onChange={(e) => setGlobalAdjPercent(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-surface border border-line rounded-xl text-xs font-mono font-bold text-ink focus:outline-none focus:ring-2 focus:ring-brand"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-extrabold text-ink block mb-1">Flat Price Change ({currencySymbol})</label>
                    <input
                      type="number"
                      placeholder="e.g. 5000 or -2000"
                      value={globalAdjFlat || ''}
                      onChange={(e) => setGlobalAdjFlat(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-surface border border-line rounded-xl text-xs font-mono font-bold text-ink focus:outline-none focus:ring-2 focus:ring-brand"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <Button
                    type="button"
                    onClick={handleApplyGlobalAdjustment}
                    className="bg-brand hover:bg-brand/90 text-white flex items-center space-x-1.5"
                  >
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>Apply Price Adjustment Globally</span>
                  </Button>
                </div>
              </div>

              {/* Global Warranty Presets Tool */}
              <div className="bg-white p-5 rounded-2xl border border-line space-y-4 shadow-2xs">
                <div className="flex items-center justify-between border-b border-line pb-3">
                  <h3 className="text-sm font-extrabold text-ink flex items-center space-x-2">
                    <ShieldCheck className="w-4 h-4 text-success" />
                    <span>Global Warranty Bulk Preset Tool</span>
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 items-end">
                  <div>
                    <label className="text-xs font-extrabold text-ink block mb-1">Target Folder</label>
                    <select
                      value={globalWarrantyFolder}
                      onChange={(e) => setGlobalWarrantyFolder(e.target.value)}
                      className="w-full px-3 py-2 bg-surface border border-line rounded-xl text-xs font-bold text-ink focus:outline-none"
                    >
                      <option value="ALL">All Device Folders</option>
                      {folders.map((f) => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-extrabold text-ink block mb-1">Warranty Term</label>
                    <input
                      type="text"
                      value={globalWarrantyTerm}
                      onChange={(e) => setGlobalWarrantyTerm(e.target.value)}
                      placeholder="e.g. 6 Month, 12 Month"
                      className="w-full px-3 py-2 bg-surface border border-line rounded-xl text-xs font-extrabold text-ink focus:outline-none"
                    />
                  </div>

                  <div>
                    <Button
                      type="button"
                      onClick={handleApplyGlobalWarrantySubmit}
                      className="w-full bg-success hover:bg-success/90 text-white"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Set Warranty Globally</span>
                    </Button>
                  </div>
                </div>
              </div>

              {/* Currency Display Preferences */}
              <div className="bg-white p-5 rounded-2xl border border-line space-y-4 shadow-2xs">
                <h3 className="text-sm font-extrabold text-ink flex items-center space-x-2">
                  <DollarSign className="w-4 h-4 text-brand" />
                  <span>Currency Display Preferences</span>
                </h3>
                <p className="text-xs text-muted">Currency prefix for all price tags and quotes.</p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Myanmar Kyat (MMK)', sym: 'MMK' },
                    { label: 'US Dollar ($)', sym: '$' },
                    { label: 'Thai Baht (฿)', sym: '฿' },
                    { label: 'Euro (€)', sym: '€' },
                  ].map((curr) => (
                    <Button
                      key={curr.sym}
                      type="button"
                      onClick={() => setCurrencySymbol(curr.sym)}
                      className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                        currencySymbol === curr.sym
                          ? 'border-brand bg-blue-50/60 text-brand font-extrabold shadow-2xs'
                          : 'border-line hover:border-muted text-ink font-semibold'
                      }`}
                    >
                      <div className="text-base font-black font-mono">{curr.sym}</div>
                      <div className="text-xs">{curr.label}</div>
                    </Button>
                  ))}
                </div>

                <div className="pt-3 border-t border-line">
                  <label className="text-xs font-bold text-ink block mb-1">Custom Currency Symbol</label>
                  <input
                    type="text"
                    value={currencySymbol}
                    onChange={(e) => setCurrencySymbol(e.target.value)}
                    className="w-full max-w-xs px-3 py-2 border border-line bg-white rounded-lg text-xs font-bold text-ink focus:outline-none focus:ring-2 focus:ring-brand"
                    placeholder="Custom symbol e.g. RM, SGD, AUD"
                  />
                </div>
              </div>

              {/* Cloud Sync Notice */}
              <div className="bg-white p-5 rounded-2xl border border-line space-y-3 shadow-2xs">
                <h3 className="text-sm font-extrabold text-ink flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-[#FF9500]" />
                  <span>Price Storage & Sync Notice</span>
                </h3>
                <p className="text-xs text-muted leading-relaxed">All price changes and rules update instantly.</p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-surface border-t border-line flex items-center justify-between">
          <span className="text-xs font-semibold text-muted">
            Catalog contains {catalog.length} device models across {folders.filter((f) => f.enabled).length} active folders & {categories.length} repair categories
          </span>

          <div className="flex items-center space-x-3">
            <Button
              onClick={() => {
                triggerToast('All changes saved.');
                setTimeout(() => {
                  onClose();
                }, 400);
              }}
              className="px-5 py-2 bg-brand hover:bg-brand/90 text-white rounded-xl text-xs font-extrabold transition-all flex items-center space-x-2 shadow-2xs cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Save & Close</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
