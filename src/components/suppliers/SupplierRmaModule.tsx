import React, { useEffect, useState } from 'react';
import { 
  Truck, 
  RotateCcw, 
  FileText, 
  Plus, 
  CheckCircle2, 
  Clock, 
  DollarSign, 
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Edit2,
  Trash2,
  X,
  Phone,
  Mail,
  Grid,
  List
} from 'lucide-react';
import { Supplier, RmaItem, PurchaseOrder, PartItem, RmaStatus } from '../../types';

interface SupplierRmaModuleProps {
  suppliers: Supplier[];
  rmas: RmaItem[];
  purchaseOrders: PurchaseOrder[];
  parts: PartItem[];
  onAddRma: (rma: RmaItem) => void;
  onAddSupplier?: (supplier: Supplier) => void;
  onUpdateSupplier?: (supplier: Supplier) => void;
  onDeleteSupplier?: (supplierId: string) => void;
  onUpdateRmaStatus: (rmaId: string, status: RmaStatus, creditAmount?: number) => void;
  searchQuery?: string;
  setSearchQuery?: (q: string) => void;
  statusFilter?: string;
  setStatusFilter?: (s: string) => void;
  showNewRmaModal?: boolean;
  setShowNewRmaModal?: (s: boolean) => void;
}

export const SupplierRmaModule: React.FC<SupplierRmaModuleProps> = ({
  suppliers,
  rmas,
  purchaseOrders,
  parts,
  onAddRma,
  onAddSupplier,
  onUpdateSupplier,
  onDeleteSupplier,
  onUpdateRmaStatus,
  searchQuery = '',
  statusFilter = 'ALL',
  showNewRmaModal: propShowNewRmaModal,
  setShowNewRmaModal: propSetShowNewRmaModal,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'RMA' | 'PO' | 'SUPPLIERS'>('RMA');
  // Phones default to the RMA card grid — the table is unusable below md.
  const [rmaView, setRmaView] = useState<'table' | 'cards'>('table');
  const [localShowNewRmaModal, setLocalShowNewRmaModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);

  const [newSupplierForm, setNewSupplierForm] = useState({
    name: '',
    code: '',
    phone: '',
    contactEmail: '',
    website: '',
    avgRmaTurnaroundDays: 3,
  });

  const handleCreateSupplierSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupplierForm.name.trim()) return;
    const newSup: Supplier = {
      id: `sup-${Date.now()}`,
      name: newSupplierForm.name.trim(),
      code: newSupplierForm.code.trim().toUpperCase() || 'SUP',
      phone: newSupplierForm.phone.trim() || 'N/A',
      contactEmail: newSupplierForm.contactEmail.trim() || 'vendor@example.com',
      website: newSupplierForm.website.trim() || 'https://supplier.com',
      avgRmaTurnaroundDays: Number(newSupplierForm.avgRmaTurnaroundDays) || 3,
      rating: 5,
    };
    if (onAddSupplier) {
      onAddSupplier(newSup);
    }
    setNewSupplierForm({ name: '', code: '', phone: '', contactEmail: '', website: '', avgRmaTurnaroundDays: 3 });
    setShowAddSupplierModal(false);
  };

  const handleSaveEditSupplierSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSupplier || !editingSupplier.name.trim()) return;
    if (onUpdateSupplier) {
      onUpdateSupplier(editingSupplier);
    }
    setEditingSupplier(null);
  };

  const handleDeleteSupplierClick = (supId: string, supName: string) => {
    if (window.confirm(`Are you sure you want to delete supplier "${supName}"?`)) {
      if (onDeleteSupplier) {
        onDeleteSupplier(supId);
      }
    }
  };

  const showNewRmaModal = propShowNewRmaModal !== undefined ? propShowNewRmaModal : localShowNewRmaModal;
  const setShowNewRmaModal = propSetShowNewRmaModal || setLocalShowNewRmaModal;

  // Filter RMAs
  const filteredRmas = rmas.filter((r) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q ||
      r.rmaNumber.toLowerCase().includes(q) ||
      r.supplierName.toLowerCase().includes(q) ||
      r.partName.toLowerCase().includes(q);

    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // New RMA Form
  const [newRmaData, setNewRmaData] = useState<Partial<RmaItem>>({
    partId: parts[0]?.id || 'part-102',
    supplierId: suppliers[0]?.id || 'sup-1',
    quantity: 1,
    unitCost: 98.00,
    reason: 'Screen ghosting / touch unresponsiveness after 10 mins usage.',
    status: 'Shipped to Vendor',
    trackingNumber: '1Z9999990199887766',
  });

  const handleCreateRma = () => {
    const part = parts.find((p) => p.id === newRmaData.partId) || parts[0];    const supplier = suppliers.find((s) => s.id === newRmaData.supplierId) || suppliers[0];

    const rma: RmaItem = {
      id: `rma-${Date.now()}`,
      rmaNumber: `RMA-2026-${Math.floor(100 + Math.random() * 900)}`,
      partId: part.id,
      partName: part.name,
      partQuality: part.qualityTier,
      supplierId: supplier.id,
      supplierName: supplier.name,
      quantity: Number(newRmaData.quantity) || 1,
      unitCost: Number(newRmaData.unitCost) || part.costPrice,
      reason: newRmaData.reason || 'Defective part on installation',
      status: (newRmaData.status as RmaStatus) || 'Shipped to Vendor',
      trackingNumber: newRmaData.trackingNumber || '',
      createdAt: new Date().toISOString(),
    };

    onAddRma(rma);
    setShowNewRmaModal(false);
  };

  // Force the RMA card grid below md (phones); user toggle wins on desktop.
  useEffect(() => {
    const apply = () => {
      if (window.innerWidth < 768) setRmaView('cards');
    };
    apply();
    window.addEventListener('resize', apply);
    return () => window.removeEventListener('resize', apply);
  }, []);

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-[#E5E5EA] shadow-xs">
        <div className="module-subheader">
          <h1 className="text-lg font-bold text-[#1D1D1F] flex items-center space-x-2">
            <Truck className="w-5 h-5 text-[#0071E3]" />
            <span>Supplier Purchase Orders & Defective RMA Returns</span>
          </h1>
          <p className="text-xs text-[#86868B]">Track vendor shipments, defective part returns, and vendor credit authorizations</p>
        </div>

        {/* Subtab Toggle */}
        <div className="bg-[#F5F5F7] p-1.5 rounded-2xl border border-[#E5E5EA] flex items-center space-x-1.5 overflow-x-auto no-scrollbar text-xs shadow-2xs">
          <button
            type="button"
            onClick={() => setActiveSubTab('RMA')}
            className={`px-3.5 py-2 text-xs font-extrabold rounded-xl transition-all flex items-center space-x-2 shrink-0 cursor-pointer border select-none active:scale-95 ${
              activeSubTab === 'RMA'
                ? 'bg-[#0071E3] text-white border-[#0071E3] shadow-xs'
                : 'bg-white hover:bg-slate-100 text-[#6E6E73] hover:text-[#1D1D1F] border-[#E5E5EA]'
            }`}
          >
            <span>RMA Defective Returns</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                activeSubTab === 'RMA' ? 'bg-white/20 text-white' : 'bg-[#E5E5EA] text-[#1D1D1F]'
              }`}
            >
              {rmas.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('PO')}
            className={`px-3.5 py-2 text-xs font-extrabold rounded-xl transition-all flex items-center space-x-2 shrink-0 cursor-pointer border select-none active:scale-95 ${
              activeSubTab === 'PO'
                ? 'bg-[#0071E3] text-white border-[#0071E3] shadow-xs'
                : 'bg-white hover:bg-slate-100 text-[#6E6E73] hover:text-[#1D1D1F] border-[#E5E5EA]'
            }`}
          >
            <span>Purchase Orders</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                activeSubTab === 'PO' ? 'bg-white/20 text-white' : 'bg-[#E5E5EA] text-[#1D1D1F]'
              }`}
            >
              {purchaseOrders.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('SUPPLIERS')}
            className={`px-3.5 py-2 text-xs font-extrabold rounded-xl transition-all flex items-center space-x-2 shrink-0 cursor-pointer border select-none active:scale-95 ${
              activeSubTab === 'SUPPLIERS'
                ? 'bg-[#0071E3] text-white border-[#0071E3] shadow-xs'
                : 'bg-white hover:bg-slate-100 text-[#6E6E73] hover:text-[#1D1D1F] border-[#E5E5EA]'
            }`}
          >
            <span>Vendor Catalog</span>
          </button>
        </div>
      </div>

      {activeSubTab === 'RMA' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-[#1D1D1F] flex items-center space-x-2">
                <RotateCcw className="w-4 h-4 text-[#AF52DE]" />
                <span>Defective Return Merchandise Authorizations (RMA)</span>
              </h2>
              <p className="text-xs text-[#86868B]">Flag bad screens/batteries directly and monitor vendor credit refunds</p>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex shrink-0 items-center rounded-lg border border-[#E5E5EA] bg-white p-0.5 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setRmaView('table')}
                  title="Table view"
                  aria-label="RMA table view"
                  className={`inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors ${rmaView === 'table' ? 'bg-[#0071E3] text-white' : 'text-[#6E6E73] hover:bg-slate-100'}`}
                >
                  <List className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setRmaView('cards')}
                  title="Card view"
                  aria-label="RMA card view"
                  className={`inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors ${rmaView === 'cards' ? 'bg-[#0071E3] text-white' : 'text-[#6E6E73] hover:bg-slate-100'}`}
                >
                  <Grid className="h-3.5 w-3.5" />
                </button>
              </div>
              <button
                onClick={() => setShowNewRmaModal(true)}
                className="px-3.5 py-1.5 bg-[#AF52DE] hover:bg-purple-600 text-white font-bold text-xs rounded-xl flex items-center space-x-1.5 shadow-xs transition-all active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Flag Defective RMA</span>
              </button>
            </div>
          </div>

          {filteredRmas.length === 0 ? (
            <div className="flex min-h-[200px] flex-col items-center justify-center p-12 text-center space-y-3 bg-white border border-[#E5E5EA] rounded-2xl">
              <RotateCcw className="w-8 h-8 text-[#86868B] mx-auto" />
              <div className="space-y-1">
                <p className="text-sm font-bold text-[#1D1D1F]">No RMAs match your search or status filter</p>
                <p className="text-xs text-[#86868B]">Flag a defective part to start tracking vendor credit.</p>
              </div>
            </div>
          ) : rmaView === 'cards' ? (
            /* PHONE CARD GRID */
            <div className="grid grid-cols-1 gap-3">
              {filteredRmas.map((rma) => (
                <div key={rma.id} className="space-y-3 bg-white border border-[#E5E5EA] rounded-2xl p-4 text-xs shadow-xs">
                  <div className="flex items-start justify-between gap-2 border-b border-[#E5E5EA] pb-2">
                    <div>
                      <p className="font-mono font-bold text-[#0071E3]">{rma.rmaNumber}</p>
                      <p className="text-[10px] text-[#86868B]">{new Date(rma.createdAt).toLocaleDateString()}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 text-[10px] font-extrabold px-2.5 py-1 rounded-lg border shadow-2xs ${rma.status === 'Credit Approved' ? 'bg-[#EAF8ED] text-[#28A745] border-[#34C759]/30' : rma.status === 'Shipped to Vendor' ? 'bg-[#F0F6FF] text-[#0071E3] border-[#0071E3]/25' : 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                      <span>{rma.status}</span>
                    </span>
                  </div>

                  <div>
                    <p className="font-bold text-[#1D1D1F]">{rma.partName}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#F5F5F7] text-[#1D1D1F] border border-[#E5E5EA]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#0071E3]" />
                        <span>Tier: {rma.partQuality}</span>
                      </span>
                      <span className="font-bold text-[#AF52DE]">{rma.supplierName}</span>
                    </div>
                  </div>

                  {rma.reason && <p className="line-clamp-2 text-[#1D1D1F]">{rma.reason}</p>}

                  <div className="flex items-center justify-between gap-2 border-t border-[#E5E5EA] pt-2">
                    <span className="font-mono text-[10px] text-[#86868B]">{rma.trackingNumber || 'No tracking yet'}</span>
                    {rma.vendorCreditAmount ? (
                      <span className="text-[10px] text-[#28A745] font-extrabold">+{rma.vendorCreditAmount.toLocaleString()} MMK Credit</span>
                    ) : rma.status === 'Shipped to Vendor' ? (
                      <button
                        onClick={() => onUpdateRmaStatus(rma.id, 'Credit Approved', rma.unitCost * rma.quantity)}
                        className="px-2.5 py-1.5 bg-[#EAF8ED] hover:bg-emerald-100 text-[#28A745] border border-[#34C759]/20 text-[10px] font-bold rounded-lg cursor-pointer"
                      >
                        Approve Credit
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : (
          <div className="bg-white border border-[#E5E5EA] rounded-2xl overflow-hidden text-xs shadow-xs">
            <table className="w-full text-left">
              <thead className="bg-[#F5F5F7] text-[#86868B] text-[10px] uppercase font-mono border-b border-[#E5E5EA]">
                <tr>
                  <th className="p-3">RMA # & Date</th>
                  <th className="p-3">Defective Part & Tier</th>
                  <th className="p-3">Vendor</th>
                  <th className="p-3 hidden lg:table-cell">Defect Reason</th>
                  <th className="p-3 hidden xl:table-cell">Return Tracking</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E5EA]">
                {filteredRmas.map((rma) => (
                  <tr key={rma.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-mono">
                      <p className="font-bold text-[#0071E3]">{rma.rmaNumber}</p>
                      <p className="text-[10px] text-[#86868B]">{new Date(rma.createdAt).toLocaleDateString()}</p>
                    </td>

                    <td className="p-3.5">
                      <p className="font-bold text-[#1D1D1F]">{rma.partName}</p>
                      <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#F5F5F7] text-[#1D1D1F] border border-[#E5E5EA]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#0071E3]" />
                        <span>Tier: {rma.partQuality}</span>
                      </span>
                    </td>

                    <td className="p-3.5 font-bold text-[#AF52DE]">{rma.supplierName}</td>

                    <td className="p-3.5 text-[#1D1D1F] max-w-xs text-xs hidden lg:table-cell">{rma.reason}</td>

                    <td className="p-3.5 font-mono text-[10px] text-[#86868B] hidden xl:table-cell">
                      {rma.trackingNumber || 'No tracking yet'}
                    </td>

                    <td className="p-3.5">
                      <span className={`inline-flex items-center gap-1.5 text-[10px] font-extrabold px-2.5 py-1 rounded-lg border shadow-2xs ${
                        rma.status === 'Credit Approved' ? 'bg-[#EAF8ED] text-[#28A745] border-[#34C759]/30' :
                        rma.status === 'Shipped to Vendor' ? 'bg-[#F0F6FF] text-[#0071E3] border-[#0071E3]/25' :
                        'bg-slate-100 text-slate-700 border-slate-200'
                      }`}>
                        <span>{rma.status}</span>
                      </span>
                      {rma.vendorCreditAmount && (
                        <p className="text-[10px] text-[#28A745] font-extrabold mt-1">+{rma.vendorCreditAmount.toLocaleString()} MMK Credit</p>
                      )}
                    </td>

                    <td className="p-3 text-right">
                      {rma.status === 'Shipped to Vendor' && (
                        <button
                          onClick={() => onUpdateRmaStatus(rma.id, 'Credit Approved', rma.unitCost * rma.quantity)}
                          className="px-2 py-1 bg-[#EAF8ED] hover:bg-emerald-100 text-[#28A745] border border-[#34C759]/20 text-[10px] font-bold rounded"
                        >
                          Approve Credit
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}
        </div>
      )}

      {activeSubTab === 'PO' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#1D1D1F] flex items-center space-x-2">
              <FileText className="w-4 h-4 text-[#0071E3]" />
              <span>Purchase Orders (POs)</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {purchaseOrders.map((po) => (
              <div key={po.id} className="p-4 bg-white border border-[#E5E5EA] rounded-2xl space-y-3 text-xs shadow-xs">
                <div className="flex items-center justify-between border-b border-[#E5E5EA] pb-2">
                  <div>
                    <span className="font-mono font-bold text-[#0071E3]">{po.poNumber}</span>
                    <p className="text-[#1D1D1F] font-semibold">{po.supplierName}</p>
                  </div>
                  <span className="bg-[#F0F6FF] text-[#0071E3] border border-[#0071E3]/20 px-2 py-0.5 rounded font-bold">{po.status}</span>
                </div>

                <div className="space-y-1">
                  {po.items.map((it, idx) => (
                    <div key={idx} className="flex justify-between text-[#1D1D1F]">
                      <span>{it.quantity}x {it.partName}</span>
                      <span className="font-mono">{(it.unitCost * it.quantity).toLocaleString()} MMK</span>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-[#E5E5EA] font-bold">
                  <span className="text-[#86868B]">Total PO Value:</span>
                  <span className="text-[#28A745] font-mono text-sm">{po.totalCost.toLocaleString()} MMK</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeSubTab === 'SUPPLIERS' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-[#1D1D1F] flex items-center space-x-2">
                <Truck className="w-4 h-4 text-[#0071E3]" />
                <span>Vendor Supplier Catalog ({suppliers.length})</span>
              </h2>
              <p className="text-xs text-[#86868B]">Manage part supplier profiles, codes, contact info, and RMA lead times</p>
            </div>
            <button
              onClick={() => setShowAddSupplierModal(true)}
              className="px-3.5 py-1.5 bg-[#0071E3] hover:bg-[#0051B3] text-white font-bold text-xs rounded-xl shadow-xs flex items-center space-x-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Register Supplier</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            {suppliers.map((sup) => {
              const countParts = parts.filter((p) => p.supplierId === sup.id || p.supplierName === sup.name).length;
              return (
                <div key={sup.id} className="p-4 bg-white border border-[#E5E5EA] rounded-2xl space-y-2.5 shadow-xs relative">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-extrabold text-[#1D1D1F] text-sm">{sup.name}</h3>
                      <span className="bg-[#F5F5F7] text-[#1D1D1F] border border-[#E5E5EA] px-2 py-0.5 rounded font-mono text-[10px] inline-block mt-0.5">{sup.code}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => setEditingSupplier(sup)}
                        title="Edit Supplier"
                        className="p-1.5 text-slate-500 hover:text-[#0071E3] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteSupplierClick(sup.id, sup.name)}
                        title="Delete Supplier"
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1 text-[#86868B]">
                    <p className="flex items-center space-x-1.5">
                      <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{sup.contactEmail}</span>
                    </p>
                    <p className="flex items-center space-x-1.5">
                      <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>{sup.phone}</span>
                    </p>
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-[#E5E5EA] text-[11px]">
                    <span className="text-[#86868B]">RMA Lead Time:</span>
                    <span className="text-[#0071E3] font-bold">{sup.avgRmaTurnaroundDays} Days</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* New RMA Modal */}
      {showNewRmaModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#E5E5EA] rounded-2xl max-w-lg w-full p-6 space-y-4 text-xs shadow-xl">
            <h3 className="text-sm font-bold text-[#1D1D1F] border-b border-[#E5E5EA] pb-2">
              Flag Defective Component for Vendor RMA
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-[#86868B] mb-1">Select Component from Inventory</label>
                <select
                  value={newRmaData.partId}
                  onChange={(e) => setNewRmaData({ ...newRmaData, partId: e.target.value })}
                  className="w-full bg-[#F5F5F7] border border-[#E5E5EA] rounded-lg p-2 text-[#1D1D1F] focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20"
                >
                  {parts.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.qualityTier}) - {p.costPrice.toLocaleString()} MMK</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[#86868B] mb-1">Vendor / Supplier</label>
                <select
                  value={newRmaData.supplierId}
                  onChange={(e) => setNewRmaData({ ...newRmaData, supplierId: e.target.value })}
                  className="w-full bg-[#F5F5F7] border border-[#E5E5EA] rounded-lg p-2 text-[#1D1D1F] focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20"
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[#86868B] mb-1">Defect Description / Testing Notes</label>
                <textarea
                  rows={3}
                  value={newRmaData.reason || ''}
                  onChange={(e) => setNewRmaData({ ...newRmaData, reason: e.target.value })}
                  placeholder="e.g. Screen lines, battery non-genuine warning loop..."
                  className="w-full bg-[#F5F5F7] border border-[#E5E5EA] rounded-lg p-2 text-[#1D1D1F] focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20"
                />
              </div>

              <div>
                <label className="block text-[#86868B] mb-1">Return Shipment Tracking #</label>
                <input
                  type="text"
                  value={newRmaData.trackingNumber || ''}
                  onChange={(e) => setNewRmaData({ ...newRmaData, trackingNumber: e.target.value })}
                  placeholder="e.g. 1Z9999990199887766"
                  className="w-full bg-[#F5F5F7] border border-[#E5E5EA] rounded-lg p-2 text-[#1D1D1F] font-mono focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-3">
              <button
                onClick={() => setShowNewRmaModal(false)}
                className="px-4 py-2 bg-white border border-[#E5E5EA] text-[#1D1D1F] font-semibold rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateRma}
                className="px-5 py-2 bg-[#AF52DE] hover:bg-purple-600 text-white font-bold rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                Submit Defective RMA
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Register Supplier Modal */}
      {showAddSupplierModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <form onSubmit={handleCreateSupplierSubmit} className="bg-white border border-[#E5E5EA] rounded-2xl max-w-md w-full p-5 space-y-4 text-xs shadow-2xl">
            <div className="flex justify-between items-center border-b border-[#E5E5EA] pb-2">
              <h4 className="font-extrabold text-[#1D1D1F] text-sm flex items-center space-x-1.5">
                <Truck className="w-4 h-4 text-[#0071E3]" />
                <span>Register New Supplier Vendor</span>
              </h4>
              <button
                type="button"
                onClick={() => setShowAddSupplierModal(false)}
                className="text-[#86868B] hover:text-[#1D1D1F] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block font-bold text-[#1D1D1F] mb-1">Supplier Vendor Name *</label>
                <input
                  type="text"
                  required
                  value={newSupplierForm.name}
                  onChange={(e) => setNewSupplierForm({ ...newSupplierForm, name: e.target.value })}
                  placeholder="e.g. MobileSentrix USA"
                  className="w-full bg-[#F5F5F7] border border-[#E5E5EA] rounded-xl p-2 text-xs font-bold text-[#1D1D1F]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-[#1D1D1F] mb-1">Short Code *</label>
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
                  <label className="block font-bold text-[#1D1D1F] mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={newSupplierForm.phone}
                    onChange={(e) => setNewSupplierForm({ ...newSupplierForm, phone: e.target.value })}
                    placeholder="+1 (800) 555-0199"
                    className="w-full bg-[#F5F5F7] border border-[#E5E5EA] rounded-xl p-2 text-xs text-[#1D1D1F]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#1D1D1F] mb-1">Contact Email</label>
                <input
                  type="email"
                  value={newSupplierForm.contactEmail}
                  onChange={(e) => setNewSupplierForm({ ...newSupplierForm, contactEmail: e.target.value })}
                  placeholder="rma@mobilesentrix.com"
                  className="w-full bg-[#F5F5F7] border border-[#E5E5EA] rounded-xl p-2 text-xs text-[#1D1D1F]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#1D1D1F] mb-1">Avg RMA Lead Time (Days)</label>
                <input
                  type="number"
                  value={newSupplierForm.avgRmaTurnaroundDays}
                  onChange={(e) => setNewSupplierForm({ ...newSupplierForm, avgRmaTurnaroundDays: Number(e.target.value) })}
                  className="w-full bg-[#F5F5F7] border border-[#E5E5EA] rounded-xl p-2 text-xs text-[#1D1D1F]"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-[#E5E5EA]">
              <button
                type="button"
                onClick={() => setShowAddSupplierModal(false)}
                className="px-3 py-2 bg-white border border-[#E5E5EA] text-[#1D1D1F] font-bold rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-[#0071E3] hover:bg-[#0051B3] text-white font-extrabold rounded-xl shadow-xs cursor-pointer"
              >
                Save Supplier
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Supplier Modal */}
      {editingSupplier && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSaveEditSupplierSubmit} className="bg-white border border-[#E5E5EA] rounded-2xl max-w-md w-full p-5 space-y-4 text-xs shadow-2xl">
            <div className="flex justify-between items-center border-b border-[#E5E5EA] pb-2">
              <h4 className="font-extrabold text-[#1D1D1F] text-sm flex items-center space-x-1.5">
                <Truck className="w-4 h-4 text-[#0071E3]" />
                <span>Edit Supplier Vendor Profile</span>
              </h4>
              <button
                type="button"
                onClick={() => setEditingSupplier(null)}
                className="text-[#86868B] hover:text-[#1D1D1F] cursor-pointer"
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
                <label className="block font-bold text-[#1D1D1F] mb-1">Avg RMA Lead Time (Days)</label>
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
    </div>
  );

};
