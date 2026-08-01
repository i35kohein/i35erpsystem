import { useState, useEffect } from 'react';
import { ModelRepairPrice, PriceCatalogImportRow, REPAIR_CATEGORIES, RepairCategoryDef, FolderConfig, DEFAULT_DEVICE_FOLDERS, getModelFolderId } from '../types/priceCatalog';
import { INITIAL_REPAIR_PRICE_DATA } from '../data/repairPriceData';
import { subscribeToCollection, saveBatchDocuments, saveDocument, clearCollection } from '../lib/supabase';

export function usePriceCatalog(globalCurrencySymbol?: string, onUpdateGlobalCurrency?: (symbol: string) => void) {
  // Price List is live Supabase data only. Do not merge bundled sample models
  // or categories back into the inventory settings.
  const [catalog, setCatalog] = useState<ModelRepairPrice[]>([]);
  const [currencySymbol, setLocalCurrencySymbol] = useState<string>(globalCurrencySymbol || 'MMK');
  const [folders, setFolders] = useState<FolderConfig[]>([]);
  const [categories, setCategories] = useState<RepairCategoryDef[]>([]);

  // Sync with global currency symbol if provided
  useEffect(() => {
    if (globalCurrencySymbol) {
      setLocalCurrencySymbol(globalCurrencySymbol);
    }
  }, [globalCurrencySymbol]);

  // Subscribe to Supabase price catalog collections.
  useEffect(() => {
    const unsubCatalog = subscribeToCollection<ModelRepairPrice & { id: string; _deleted?: boolean }>(
      'priceCatalog',
      (data) => {
        setCatalog(data.filter((item) => !item._deleted));
      },
      []
    );

    const unsubFolders = subscribeToCollection<FolderConfig & { id: string; _deleted?: boolean }>(
      'priceFolders',
      (data) => {
        setFolders(data.filter((item) => !item._deleted));
      },
      []
    );

    const unsubCategories = subscribeToCollection<RepairCategoryDef & { id: string; _deleted?: boolean }>(
      'priceCategories',
      (data) => {
        setCategories(data.filter((item) => !item._deleted));
      },
      []
    );

    return () => {
      unsubCatalog();
      unsubFolders();
      unsubCategories();
    };
  }, []);

  const setCurrencySymbol = (symbol: string) => {
    setLocalCurrencySymbol(symbol);
    if (onUpdateGlobalCurrency) {
      onUpdateGlobalCurrency(symbol);
    } else {
      saveDocument('systemSettings', { id: 'global', currencySymbol: symbol }).catch(console.error);
    }
  };

  const toggleFolder = (folderId: string) => {
    setFolders((prev) => {
      const updated = prev.map((f) => (f.id === folderId ? { ...f, enabled: !f.enabled } : f));
      const targetFolder = updated.find((f) => f.id === folderId);
      if (targetFolder) {
        saveDocument('priceFolders', { ...targetFolder, id: targetFolder.id }).catch(console.error);
      }
      return updated;
    });
  };

  const setAllFoldersEnabled = (enabled: boolean) => {
    setFolders((prev) => {
      const updated = prev.map((f) => ({ ...f, enabled }));
      updated.forEach((f) => {
        saveDocument('priceFolders', { ...f, id: f.id }).catch(console.error);
      });
      return updated;
    });
  };

  const addFolder = (name: string, family: FolderConfig['family']) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const id = trimmed.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const newFolder: FolderConfig & { id: string } = {
      id,
      name: trimmed,
      family,
      enabled: true,
    };
    setFolders((prev) => {
      if (prev.some((f) => f.id === id)) return prev;
      saveDocument('priceFolders', newFolder).catch(console.error);
      return [...prev, newFolder];
    });
  };

  const renameFolder = (id: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setFolders((prev) => {
      const updated = prev.map((f) => (f.id === id ? { ...f, name: trimmed } : f));
      const target = updated.find((f) => f.id === id);
      if (target) {
        saveDocument('priceFolders', target).catch(console.error);
      }
      return updated;
    });
  };

  // Repair Category operations
  const updateCategoryLabel = (key: string, newLabel: string) => {
    const trimmed = newLabel.trim();
    if (!trimmed) return;
    setCategories((prev) => {
      const updated = prev.map((c) => (c.key === key ? { ...c, label: trimmed } : c));
      const target = updated.find((c) => c.key === key);
      if (target) {
        saveDocument('priceCategories', { ...target, id: key }).catch(console.error);
      }
      return updated;
    });
  };

  const addCategory = (key: string, label: string, group: RepairCategoryDef['group']) => {
    const cleanKey = key.trim().replace(/[^a-zA-Z0-9_]/g, '_');
    if (!cleanKey) return;

    const newCat: RepairCategoryDef & { id: string } = {
      id: cleanKey,
      key: cleanKey,
      label: label.trim() || cleanKey,
      group,
    };

    setCategories((prev) => {
      if (prev.some((c) => c.key === cleanKey)) return prev;
      saveDocument('priceCategories', newCat).catch(console.error);
      return [...prev, newCat];
    });

    // Also update all models in catalog to have this category
    setCatalog((prev) =>
      prev.map((item) => {
        const docId = (item as any).id || item.model.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
        const updated = {
          ...item,
          id: docId,
          prices: { ...item.prices, [cleanKey]: null },
          warranties: { ...item.warranties, [cleanKey]: '3 Month' },
        };
        saveDocument('priceCatalog', updated).catch(console.error);
        return updated;
      })
    );
  };

  const deleteCategory = (key: string) => {
    setCategories((prev) => {
      const updated = prev.filter((c) => c.key !== key);
      saveDocument('priceCategories', { id: key, _deleted: true }).catch(console.error);
      return updated;
    });
  };

  // Model operations
  const addModel = (modelName: string, folderId?: string, cloneFromModel?: string) => {
    const trimmed = modelName.trim();
    if (!trimmed) return;
    if (catalog.some((m) => m.model.toLowerCase() === trimmed.toLowerCase())) return;

    let basePrices: Record<string, number | null> = {};
    let baseWarranties: Record<string, string> = {};

    if (cloneFromModel) {
      const source = catalog.find((m) => m.model === cloneFromModel);
      if (source) {
        basePrices = { ...source.prices };
        baseWarranties = { ...source.warranties };
      }
    }

    if (Object.keys(basePrices).length === 0) {
      categories.forEach((cat) => {
        basePrices[cat.key] = null;
        baseWarranties[cat.key] = '3 Month';
      });
    }

    const docId = trimmed.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const newEntry: ModelRepairPrice & { id: string } = {
      id: docId,
      model: trimmed,
      prices: basePrices,
      warranties: baseWarranties,
    };

    setCatalog((prev) => [newEntry, ...prev]);
    saveDocument('priceCatalog', newEntry).catch(console.error);
  };

  const renameModel = (oldName: string, newName: string) => {
    const trimmedNew = newName.trim();
    if (!trimmedNew || oldName === trimmedNew) return;

    setCatalog((prev) =>
      prev.map((m) => {
        if (m.model === oldName) {
          const docId = trimmedNew.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
          const updated = {
            ...m,
            id: docId,
            model: trimmedNew,
          };
          const oldDocId = oldName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
          saveDocument('priceCatalog', { id: oldDocId, _deleted: true }).catch(console.error);
          saveDocument('priceCatalog', updated).catch(console.error);
          return updated;
        }
        return m;
      })
    );
  };

  const deleteModel = (modelName: string) => {
    setCatalog((prev) => {
      const updated = prev.filter((m) => m.model !== modelName);
      const docId = modelName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
      saveDocument('priceCatalog', { id: docId, _deleted: true }).catch(console.error);
      return updated;
    });
  };

  // Update a single price & warranty for a model and category
  const updatePriceAndWarranty = (
    modelName: string,
    categoryKey: string,
    newPrice: number | null,
    newWarranty: string
  ) => {
    setCatalog((prev) =>
      prev.map((item) => {
        if (item.model === modelName) {
          const updatedItem: ModelRepairPrice & { id: string } = {
            ...item,
            id: (item as any).id || item.model.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase(),
            prices: {
              ...item.prices,
              [categoryKey]: newPrice,
            },
            warranties: {
              ...item.warranties,
              [categoryKey]: newWarranty,
            },
          };
          saveDocument('priceCatalog', updatedItem).catch(console.error);
          return updatedItem;
        }
        return item;
      })
    );
  };

  // Import price lists in one update per model so a CSV restore does not create
  // hundreds of individual write requests. Price List categories are an
  // independent collection: this intentionally never touches inventory categories.
  const importCatalogRows = async (
    rows: PriceCatalogImportRow[],
    importedCategories: RepairCategoryDef[] = [],
    replaceCategories = false,
  ) => {
    const importByModel = new Map(rows.map((row) => [row.model.trim().toLowerCase(), row]));
    const updatedModels: Array<ModelRepairPrice & { id: string }> = [];
    const updatedCatalog = catalog.map((item) => {
      const imported = importByModel.get(item.model.trim().toLowerCase());
      if (!imported) return item;

      const updated: ModelRepairPrice & { id: string } = {
        ...item,
        id: (item as any).id || item.model.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase(),
        prices: { ...item.prices, ...imported.prices },
        warranties: { ...item.warranties, ...imported.warranties },
      };
      updatedModels.push(updated);
      return updated;
    });

    if (updatedModels.length) {
      setCatalog(updatedCatalog);
      await saveBatchDocuments('priceCatalog', updatedModels);
    }

    if (replaceCategories) {
      // The CSV is the source of truth for Price List services. Clearing this
      // collection does not affect System Management > Inventory Categories.
      setCategories(importedCategories);
      await clearCollection('priceCategories');
      await saveBatchDocuments(
        'priceCategories',
        importedCategories.map((category) => ({ ...category, id: category.key })),
      );
    } else if (importedCategories.length) {
      const existingCategoryKeys = new Set(categories.map((category) => category.key));
      const missingCategories = importedCategories.filter((category) => !existingCategoryKeys.has(category.key));
      if (missingCategories.length) {
        setCategories((prev) => [...prev, ...missingCategories]);
        await saveBatchDocuments('priceCategories', missingCategories.map((category) => ({ ...category, id: category.key })));
      }
    }

    return updatedModels.length;
  };

  // Global Bulk Price Adjustment (+X% or +Flat Amount)
  const applyGlobalPriceAdjustment = (
    folderId: string | 'ALL',
    categoryKey: string | 'ALL',
    percentChange: number,
    flatChange: number
  ) => {
    setCatalog((prev) =>
      prev.map((item) => {
        const itemFolder = getModelFolderId(item.model);
        if (folderId !== 'ALL' && itemFolder !== folderId) return item;

        const newPrices = { ...item.prices };
        Object.keys(newPrices).forEach((cKey) => {
          if (categoryKey !== 'ALL' && cKey !== categoryKey) return;
          const currentPrice = newPrices[cKey];
          if (currentPrice !== null && currentPrice !== undefined) {
            let adjusted = currentPrice * (1 + percentChange / 100) + flatChange;
            adjusted = Math.max(0, Math.round(adjusted));
            newPrices[cKey] = adjusted;
          }
        });

        const docId = (item as any).id || item.model.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
        const updated = {
          ...item,
          id: docId,
          prices: newPrices,
        };
        saveDocument('priceCatalog', updated).catch(console.error);
        return updated;
      })
    );
  };

  // Global Bulk Warranty Presets
  const applyGlobalWarranty = (
    folderId: string | 'ALL',
    categoryKey: string | 'ALL',
    warrantyTerm: string
  ) => {
    setCatalog((prev) =>
      prev.map((item) => {
        const itemFolder = getModelFolderId(item.model);
        if (folderId !== 'ALL' && itemFolder !== folderId) return item;

        const newWarranties = { ...item.warranties };
        categories.forEach((cat) => {
          if (categoryKey !== 'ALL' && cat.key !== categoryKey) return;
          newWarranties[cat.key] = warrantyTerm;
        });

        const docId = (item as any).id || item.model.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
        const updated = {
          ...item,
          id: docId,
          warranties: newWarranties,
        };
        saveDocument('priceCatalog', updated).catch(console.error);
        return updated;
      })
    );
  };

  // Reset to initial seed data in Firestore
  const resetToDefaults = async () => {
    if (import.meta.env.VITE_ENABLE_DEMO_SEED !== 'true') {
      console.warn('Demo seed reset is disabled for live ERP data.');
      return;
    }
    try {
      await clearCollection('priceCatalog');
      await clearCollection('priceFolders');
      await clearCollection('priceCategories');

      const seedDataWithIds = INITIAL_REPAIR_PRICE_DATA.map((item) => ({
        ...item,
        id: item.model.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase(),
      }));
      setCatalog(seedDataWithIds);
      for (const item of seedDataWithIds) {
        await saveDocument('priceCatalog', item);
      }

      setFolders(DEFAULT_DEVICE_FOLDERS);
      for (const f of DEFAULT_DEVICE_FOLDERS) {
        await saveDocument('priceFolders', { ...f, id: f.id });
      }

      setCategories(REPAIR_CATEGORIES);
      for (const c of REPAIR_CATEGORIES) {
        await saveDocument('priceCategories', { ...c, id: c.key });
      }
    } catch (e) {
      console.error('Failed to reset price catalog defaults in Firestore', e);
    }
  };

  // Helper formatting function
  const formatPrice = (amount: number | null | undefined): string => {
    if (amount === null || amount === undefined || isNaN(amount)) {
      return 'N/A';
    }
    return `${amount.toLocaleString('en-US')} ${currencySymbol}`;
  };

  return {
    catalog,
    setCatalog,
    currencySymbol,
    setCurrencySymbol,
    folders,
    setFolders,
    toggleFolder,
    setAllFoldersEnabled,
    addFolder,
    renameFolder,
    categories,
    updateCategoryLabel,
    addCategory,
    deleteCategory,
    updatePriceAndWarranty,
    importCatalogRows,
    addModel,
    renameModel,
    deleteModel,
    applyGlobalPriceAdjustment,
    applyGlobalWarranty,
    resetToDefaults,
    formatPrice,
  };
}
