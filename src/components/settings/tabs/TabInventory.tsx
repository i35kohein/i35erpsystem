import React from 'react';
import { AlertCircle, Boxes, ChevronDown, MapPin, Phone, Plus, Save, ShieldCheck, Truck } from 'lucide-react';
import type { Supplier } from '../../../types';
import type { SystemSettings } from '../../../types';
import type { PartItem } from '../../../types';

interface InventoryTabProps {
  formData: SystemSettings;
  setFormData: React.Dispatch<React.SetStateAction<SystemSettings>>;
  parts: PartItem[];
  suppliers?: Supplier[];
  inventoryCategories?: string[];
  settings: SystemSettings;
  isSavedBanner: boolean;
  onUpdateInventoryCategories?: (categories: string[]) => void;
  onUpdateSupplier?: (supplier: Supplier) => void;
  onDeleteSupplier?: (id: string) => void;
  onUpdatePart?: (part: PartItem) => void;
  onUpdateSettings: (newSettings: SystemSettings) => void;
  setActiveSubTab: (t: any) => void;
  isSectionOpen: (key: string) => boolean;
  toggleSection: (key: string) => void;
  inventoryDataTab: 'categories' | 'suppliers' | 'tiers' | 'bins' | 'rules';
  setInventoryDataTab: React.Dispatch<React.SetStateAction<any>>;
  categoryDraft: string;
  setCategoryDraft: React.Dispatch<React.SetStateAction<string>>;
  editingCategoryKey: string | null;
  setEditingCategoryKey: React.Dispatch<React.SetStateAction<string | null>>;
  editingCategoryLabel: string;
  setEditingCategoryLabel: React.Dispatch<React.SetStateAction<string>>;
  supplierDraft: any;
  setSupplierDraft: React.Dispatch<React.SetStateAction<any>>;
  editingInventorySupplier: Supplier | null;
  setEditingInventorySupplier: React.Dispatch<React.SetStateAction<Supplier | null>>;
  qualityTierDraft: string;
  setQualityTierDraft: React.Dispatch<React.SetStateAction<string>>;
  editingQualityTier: string | null;
  setEditingQualityTier: React.Dispatch<React.SetStateAction<string | null>>;
  editingQualityTierLabel: string;
  setEditingQualityTierLabel: React.Dispatch<React.SetStateAction<string>>;
  binDraft: string;
  setBinDraft: React.Dispatch<React.SetStateAction<string>>;
  expandedBinName: string | null;
  setExpandedBinName: React.Dispatch<React.SetStateAction<string | null>>;
  inventoryQualityTiers: string[];
  inventoryBinNames: string[];
  partsByBin: Map<string, PartItem[]>;
  handleAddInventoryCategory: () => void;
  handleSaveInventoryCategory: (c: string) => void;
  handleAddInventorySupplier: (e: React.FormEvent) => void;
  handleAddInventoryQualityTier: () => void;
  handleSaveInventoryQualityTier: (t: string) => void;
  handleDeleteInventoryQualityTier: (t: string) => void;
  handleAddInventoryBin: () => void;
}

const InventoryTab: React.FC<InventoryTabProps> = ({ formData, setFormData, parts, suppliers, inventoryCategories, settings, isSavedBanner, onUpdateInventoryCategories, onUpdateSupplier, onDeleteSupplier, onUpdatePart, onUpdateSettings, setActiveSubTab, isSectionOpen, toggleSection, inventoryDataTab, setInventoryDataTab, categoryDraft, setCategoryDraft, editingCategoryKey, setEditingCategoryKey, editingCategoryLabel, setEditingCategoryLabel, supplierDraft, setSupplierDraft, editingInventorySupplier, setEditingInventorySupplier, qualityTierDraft, setQualityTierDraft, editingQualityTier, setEditingQualityTier, editingQualityTierLabel, setEditingQualityTierLabel, binDraft, setBinDraft, expandedBinName, setExpandedBinName, inventoryQualityTiers, inventoryBinNames, partsByBin, handleAddInventoryCategory, handleSaveInventoryCategory, handleAddInventorySupplier, handleAddInventoryQualityTier, handleSaveInventoryQualityTier, handleDeleteInventoryQualityTier, handleAddInventoryBin }) => {
  return (
        <div className="bg-white p-5 rounded-2xl border border-line-strong shadow-2xs space-y-6">
          <div>
            <h3 className="text-sm font-extrabold text-ink">Inventory System Data & Quality Settings</h3>
            <p className="text-xs text-muted">
              Create simple names for physical stock parts, then define stock alerts and vendor rules.
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5 border-b border-line pb-3">
            {([
              ['categories', 'Categories'],
              ['suppliers', 'Suppliers'],
              ['tiers', 'Quality Tiers'],
              ['bins', 'Storage Bins'],
              ['rules', 'Stock Rules'],
            ] as const).map(([id, label]) => (
              <button key={id} type="button" onClick={() => setInventoryDataTab(id)} className={`rounded-lg px-3 py-1.5 text-xs font-extrabold ${inventoryDataTab === id ? 'bg-brand text-white' : 'bg-surface text-faint hover:bg-line'}`}>
                {label}
              </button>
            ))}
          </div>

          <section className={`${inventoryDataTab === 'categories' ? 'space-y-3' : 'hidden'} border-y border-line py-4`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-extrabold text-ink">Inventory Categories</h4>
                <p className="text-[11px] text-muted">For stock parts only. Price List repair services stay separate.</p>
              </div>
              <span className="rounded-full bg-brand/10 px-2 py-0.5 font-mono text-[10px] font-bold text-brand">
                {inventoryCategories.length} categories
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              <input
                type="text"
                value={categoryDraft}
                onChange={(event) => setCategoryDraft(event.target.value)}
                onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); handleAddInventoryCategory(); } }}
                placeholder="New category, e.g. Camera"
                className="h-9 min-w-0 flex-1 rounded-xl border border-line-strong bg-surface px-3 text-xs font-medium text-ink outline-none focus:border-brand focus:bg-white"
              />
              <button
                type="button"
                onClick={handleAddInventoryCategory}
                disabled={!categoryDraft.trim()}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-brand px-3 text-xs font-extrabold text-white transition-colors hover:bg-brand-deep disabled:cursor-not-allowed disabled:opacity-45"
              >
                <Plus className="h-3.5 w-3.5" /> Add
              </button>
            </div>

            <div className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-[#F8F9FA]">
              {inventoryCategories.map((category) => (
                <div key={category} className="flex items-center gap-2 px-3 py-2">
                  {editingCategoryKey === category ? (
                    <input
                      autoFocus
                      value={editingCategoryLabel}
                      onChange={(event) => setEditingCategoryLabel(event.target.value)}
                      onKeyDown={(event) => { if (event.key === 'Enter') handleSaveInventoryCategory(category); if (event.key === 'Escape') setEditingCategoryKey(null); }}
                      className="h-7 min-w-0 flex-1 rounded-lg border border-brand bg-white px-2 text-xs font-semibold outline-none"
                    />
                  ) : (
                    <span className="min-w-0 flex-1 truncate text-xs font-semibold text-ink">{category}</span>
                  )}
                  {editingCategoryKey === category ? (
                    <button type="button" onClick={() => handleSaveInventoryCategory(category)} className="text-[11px] font-extrabold text-brand">Save</button>
                  ) : (
                    <button type="button" onClick={() => { setEditingCategoryKey(category); setEditingCategoryLabel(category); }} className="text-[11px] font-extrabold text-brand">Edit</button>
                  )}
                  <button
                    type="button"
                    onClick={() => { if (window.confirm(`Delete category “${category}”? It will no longer appear for new inventory parts.`)) { const nextCategories = inventoryCategories.filter((item) => item !== category); onUpdateInventoryCategories?.(nextCategories); setFormData((current) => ({ ...current, inventoryCategories: nextCategories })); } }}
                    className="text-[11px] font-extrabold text-rose-600"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className={`${inventoryDataTab === 'suppliers' ? 'space-y-3' : 'hidden'} border-b border-line pb-5`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-extrabold text-ink">Supplier Name Data</h4>
                <p className="text-[11px] text-muted">Supplier records used when registering stock parts and RMA claims.</p>
              </div>
              <span className="rounded-full bg-brand/10 px-2 py-0.5 font-mono text-[10px] font-bold text-brand">{suppliers.length} suppliers</span>
            </div>

            <form onSubmit={handleAddInventorySupplier} className="grid grid-cols-1 gap-2 rounded-xl border border-line bg-[#F8F9FA] p-3 sm:grid-cols-2 lg:grid-cols-5">
              <input required value={supplierDraft.name} onChange={(event) => setSupplierDraft({ ...supplierDraft, name: event.target.value })} placeholder="Supplier name" className="h-9 rounded-lg border border-line-strong bg-white px-2.5 text-xs font-semibold outline-none focus:border-brand" />
              <input required value={supplierDraft.code} onChange={(event) => setSupplierDraft({ ...supplierDraft, code: event.target.value })} placeholder="Code" className="h-9 rounded-lg border border-line-strong bg-white px-2.5 font-mono text-xs outline-none focus:border-brand" />
              <input value={supplierDraft.phone} onChange={(event) => setSupplierDraft({ ...supplierDraft, phone: event.target.value })} placeholder="Phone" className="h-9 rounded-lg border border-line-strong bg-white px-2.5 text-xs outline-none focus:border-brand" />
              <input type="number" min="1" value={supplierDraft.avgRmaTurnaroundDays} onChange={(event) => setSupplierDraft({ ...supplierDraft, avgRmaTurnaroundDays: Number(event.target.value) })} placeholder="RMA days" className="h-9 rounded-lg border border-line-strong bg-white px-2.5 text-xs outline-none focus:border-brand" />
              <button type="submit" className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-brand px-3 text-xs font-extrabold text-white hover:bg-brand-deep"><Plus className="h-3.5 w-3.5" /> Add supplier</button>
            </form>

            {editingInventorySupplier && (
              <form onSubmit={(event) => { event.preventDefault(); onUpdateSupplier?.(editingInventorySupplier); setEditingInventorySupplier(null); }} className="grid grid-cols-1 gap-2 rounded-xl border border-blue-200 bg-blue-50/60 p-3 sm:grid-cols-2 lg:grid-cols-5">
                <input required value={editingInventorySupplier.name} onChange={(event) => setEditingInventorySupplier({ ...editingInventorySupplier, name: event.target.value })} className="h-9 rounded-lg border border-blue-200 bg-white px-2.5 text-xs font-semibold outline-none focus:border-brand" />
                <input required value={editingInventorySupplier.code} onChange={(event) => setEditingInventorySupplier({ ...editingInventorySupplier, code: event.target.value })} className="h-9 rounded-lg border border-blue-200 bg-white px-2.5 font-mono text-xs outline-none focus:border-brand" />
                <input value={editingInventorySupplier.phone} onChange={(event) => setEditingInventorySupplier({ ...editingInventorySupplier, phone: event.target.value })} className="h-9 rounded-lg border border-blue-200 bg-white px-2.5 text-xs outline-none focus:border-brand" />
                <input type="number" min="1" value={editingInventorySupplier.avgRmaTurnaroundDays} onChange={(event) => setEditingInventorySupplier({ ...editingInventorySupplier, avgRmaTurnaroundDays: Number(event.target.value) })} className="h-9 rounded-lg border border-blue-200 bg-white px-2.5 text-xs outline-none focus:border-brand" />
                <div className="flex gap-2"><button type="submit" className="h-9 flex-1 rounded-lg bg-brand text-xs font-extrabold text-white">Save</button><button type="button" onClick={() => setEditingInventorySupplier(null)} className="h-9 rounded-lg border border-line-strong px-3 text-xs font-bold">Cancel</button></div>
              </form>
            )}

            <div className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-white">
              {suppliers.length ? suppliers.map((supplier) => (
                <div key={supplier.id} className="flex items-center gap-3 px-3 py-2.5 text-xs">
                  <Truck className="h-4 w-4 shrink-0 text-brand" />
                  <span className="min-w-0 flex-1 truncate font-extrabold text-ink">{supplier.name}</span>
                  <span className="font-mono text-[10px] text-muted">{supplier.code}</span>
                  <span className="hidden text-[10px] text-muted sm:inline">{supplier.avgRmaTurnaroundDays} days</span>
                  <button type="button" onClick={() => setEditingInventorySupplier(supplier)} className="text-[11px] font-extrabold text-brand">Edit</button>
                  <button type="button" onClick={() => { if (window.confirm(`Delete supplier “${supplier.name}”?`)) onDeleteSupplier?.(supplier.id); }} className="text-[11px] font-extrabold text-rose-600">Delete</button>
                </div>
              )) : <p className="px-3 py-4 text-center text-xs text-muted">No suppliers yet.</p>}
            </div>
          </section>

          <section className={`${inventoryDataTab === 'tiers' ? 'space-y-3' : 'hidden'} border-b border-line pb-5`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-extrabold text-ink">Quality Tiers</h4>
                <p className="text-[11px] text-muted">Shared quality options for every physical inventory part.</p>
              </div>
              <span className="rounded-full bg-purple-100 px-2 py-0.5 font-mono text-[10px] font-bold text-purple-700">{inventoryQualityTiers.length} tiers</span>
            </div>
            <div className="flex gap-2">
              <input value={qualityTierDraft} onChange={(event) => setQualityTierDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); handleAddInventoryQualityTier(); } }} placeholder="New quality tier" className="h-9 min-w-0 flex-1 rounded-lg border border-line-strong bg-surface px-3 text-xs font-medium outline-none focus:border-brand focus:bg-white" />
              <button type="button" onClick={handleAddInventoryQualityTier} disabled={!qualityTierDraft.trim()} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-purple-600 px-3 text-xs font-extrabold text-white hover:bg-purple-700 disabled:opacity-45"><Plus className="h-3.5 w-3.5" /> Add</button>
            </div>
            <div className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-[#F8F9FA]">
              {inventoryQualityTiers.map((tier) => (
                <div key={tier} className="flex items-center gap-2 px-3 py-2">
                  <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-purple-600" />
                  {editingQualityTier === tier ? <input autoFocus value={editingQualityTierLabel} onChange={(event) => setEditingQualityTierLabel(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') handleSaveInventoryQualityTier(tier); if (event.key === 'Escape') setEditingQualityTier(null); }} className="h-7 min-w-0 flex-1 rounded-lg border border-purple-300 bg-white px-2 text-xs font-semibold outline-none" /> : <span className="min-w-0 flex-1 truncate text-xs font-semibold text-ink">{tier}</span>}
                  <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-muted">{parts.filter((part) => part.qualityTier === tier).length} parts</span>
                  {editingQualityTier === tier ? <button type="button" onClick={() => handleSaveInventoryQualityTier(tier)} className="text-[11px] font-extrabold text-purple-700">Save</button> : <button type="button" onClick={() => { setEditingQualityTier(tier); setEditingQualityTierLabel(tier); }} className="text-[11px] font-extrabold text-brand">Edit</button>}
                  <button type="button" onClick={() => handleDeleteInventoryQualityTier(tier)} className="text-[11px] font-extrabold text-rose-600">Delete</button>
                </div>
              ))}
            </div>
          </section>

          <section className={`${inventoryDataTab === 'bins' ? 'space-y-3' : 'hidden'} border-b border-line pb-5`}>
            <div className="flex items-center justify-between gap-2">
              <div><h4 className="text-xs font-extrabold text-ink">Storage Bin Names</h4><p className="text-[11px] text-muted">Saved bin names appear when registering or editing inventory parts.</p></div>
              <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-bold text-brand">{inventoryBinNames.length} bins</span>
            </div>
            <div className="flex gap-2"><input value={binDraft} onChange={(event) => setBinDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); handleAddInventoryBin(); } }} placeholder="e.g. BIN-A01" className="h-9 min-w-0 flex-1 rounded-lg border border-line-strong bg-surface px-3 text-xs font-mono font-bold outline-none focus:border-brand focus:bg-white" /><button type="button" onClick={handleAddInventoryBin} disabled={!binDraft.trim()} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-brand px-3 text-xs font-extrabold text-white hover:bg-brand-deep disabled:opacity-45"><Plus className="h-3.5 w-3.5" /> Add bin</button></div>
            <div className="space-y-2 rounded-xl border border-line bg-[#F8F9FA] p-3">
              {inventoryBinNames.length ? inventoryBinNames.map((bin) => {
                const binParts = partsByBin.get(bin) || [];
                const isOpen = expandedBinName === bin;
                return (
                  <div key={bin} className="rounded-lg border border-line bg-white">
                    <div className="flex items-center justify-between gap-2 px-3 py-2">
                      <button
                        type="button"
                        onClick={() => setExpandedBinName((current) => current === bin ? null : bin)}
                        className="inline-flex min-w-0 flex-1 items-center gap-2 text-left"
                        aria-expanded={isOpen}
                        aria-label={`Show parts in ${bin}`}
                      >
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-brand" />
                        <span className="truncate font-mono text-xs font-bold text-ink">{bin}</span>
                        <span className="rounded-full bg-surface px-2 py-0.5 text-[10px] font-bold text-muted">{binParts.length} parts</span>
                      </button>
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => setExpandedBinName((current) => current === bin ? null : bin)} className="rounded-lg p-1 text-muted hover:bg-surface" aria-label={isOpen ? `Collapse ${bin}` : `Expand ${bin}`}>
                          <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180 text-brand' : ''}`} />
                        </button>
                        <button type="button" onClick={() => onUpdateSettings({ ...settings, inventoryBinNames: inventoryBinNames.filter((item) => item !== bin) })} className="text-rose-600" aria-label={`Delete ${bin}`}>×</button>
                      </div>
                    </div>
                    {isOpen && (
                      <div className="border-t border-line bg-[#FAFAFA] px-3 py-2">
                        {binParts.length ? (
                          <div className="space-y-1.5">
                            {binParts.map((part) => (
                              <div key={part.id} className="flex items-center justify-between gap-2 rounded-md bg-white px-2.5 py-1.5 text-[11px] text-ink shadow-sm">
                                <div className="min-w-0">
                                  <p className="truncate font-bold">{part.name}</p>
                                  <p className="truncate font-mono text-[10px] text-muted">{part.sku}</p>
                                </div>
                                <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-bold text-brand">{part.quantityInStock} stock</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[11px] text-muted">No parts are assigned to this bin yet.</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              }) : <p className="text-xs text-muted">No saved bins yet.</p>}
            </div>
          </section>

          <div className={`${inventoryDataTab === 'rules' ? 'grid' : 'hidden'} grid-cols-1 md:grid-cols-2 gap-5 text-xs`}>
            <div className="space-y-1.5">
              <label className="font-extrabold text-ink flex items-center space-x-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-[#FF9500]" />
                <span>Global Low Stock Warning Threshold</span>
              </label>
              <input
                type="number"
                value={formData.lowStockThreshold}
                onChange={(e) => setFormData({ ...formData, lowStockThreshold: Number(e.target.value) })}
                min="1"
                max="20"
                className="w-full bg-surface text-ink font-bold px-3 py-2 rounded-xl border border-line-strong focus:bg-white focus:outline-none focus:border-brand"
              />
              <p className="text-[11px] text-muted">
                Parts with quantity equal to or below this count will trigger amber warning badges across the inventory matrix.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="font-extrabold text-ink flex items-center space-x-1.5">
                <Boxes className="w-3.5 h-3.5 text-[#5856D6]" />
                <span>Default Vendor RMA Turnaround (Days)</span>
              </label>
              <input
                type="number"
                value={formData.defaultSupplierSlaDays}
                onChange={(e) => setFormData({ ...formData, defaultSupplierSlaDays: Number(e.target.value) })}
                min="1"
                max="30"
                className="w-full bg-surface text-ink font-bold px-3 py-2 rounded-xl border border-line-strong focus:bg-white focus:outline-none focus:border-brand"
              />
            </div>

            <div className="md:col-span-2 space-y-3 pt-3 border-t border-line">
              <label className="flex items-center space-x-3 cursor-pointer p-3 bg-[#F8F9FA] rounded-xl border border-line hover:border-brand transition-all">
                <input
                  type="checkbox"
                  checked={formData.autoReserveOnAssignment}
                  onChange={(e) => setFormData({ ...formData, autoReserveOnAssignment: e.target.checked })}
                  className="w-4 h-4 text-brand rounded focus:ring-0 cursor-pointer"
                />
                <div>
                  <span className="font-extrabold text-ink text-xs block">Auto-Reserve Parts on Ticket Assignment</span>
                  <span className="text-[11px] text-muted">Automatically increment reserved part quantities when added to active work orders.</span>
                </div>
              </label>
            </div>
          </div>
        </div>
  );
};

export default InventoryTab;
