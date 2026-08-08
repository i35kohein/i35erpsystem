const FOCUS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2';

import React, { useEffect, useState } from 'react';
import {Users, 
  Plus, 
  ExternalLink,
  X,
  ChevronDown,
  ChevronUp,
  History,
  FileText,
  Printer,
  Trash2,
  Edit2} from 'lucide-react';
import { Customer, CustomerType, WorkOrder, SystemSettings } from '../../types';
import { Button , Input } from '../ui';
import { CustomerFacingWebPortal } from '../portal/CustomerFacingWebPortal';
import { PrintableInvoiceModal } from '../common/PrintableInvoiceModal';
import { CustomerRepairHistoryModal } from './CustomerRepairHistoryModal';
import { CustomerRepairTimeline } from './CustomerRepairTimeline';
import { DEFAULT_SYSTEM_SETTINGS } from '../../data/seedData';

interface CrmCustomerPortalModuleProps {
  customers: Customer[];
  workOrders: WorkOrder[];
  onAddCustomer: (cust: Customer) => void;
  onUpdateCustomer?: (cust: Customer) => void;
  onDeleteCustomer?: (customerId: string) => void;
  /** Ids of standalone Supabase customer accounts. Roster rows NOT in this set are
   * derived from tickets — they have no account record to delete. */
  cloudCustomerIds?: Set<string>;
  systemSettings?: SystemSettings;
  onSaveWorkOrder?: (wo: WorkOrder) => void;
  searchQuery?: string;
  setSearchQuery?: (q: string) => void;
  customerTypeFilter?: string;
  setCustomerTypeFilter?: (t: string) => void;
}

const getStatusBadgeStyle = (status: string) => {
  switch (status) {
    case 'Finished':
      return 'bg-success/10 text-success-deep border-success/30';
    case 'In Progress':
      return 'bg-brand-soft text-brand border-brand/30';
    case 'Pending':
      return 'bg-warning/10 text-warning border-warning/30';
    case 'Receive':
      return 'bg-purple/10 text-purple border-purple/30';
    case 'Taken Out':
      return 'bg-surface text-muted border-line';
    case 'Cant Repair':
      return 'bg-danger/10 text-danger border-danger/30';
    case 'Customer Not Repair':
      return 'bg-warning/10 text-warning border-warning/30';
    default:
      return 'bg-gray-50 text-gray-700 border-gray-200';
  }
};

export const CrmCustomerPortalModule: React.FC<CrmCustomerPortalModuleProps> = ({
  customers,
  workOrders,
  onAddCustomer,
  onUpdateCustomer,
  onDeleteCustomer,
  cloudCustomerIds,
  systemSettings = DEFAULT_SYSTEM_SETTINGS,
  onSaveWorkOrder = () => {},
  searchQuery = '',
  customerTypeFilter = 'ALL',
}) => {
  const [activeTab, setActiveTab] = useState<'CRM' | 'PORTAL_SIMULATOR'>('CRM');
  const [isAddCustomerModalOpen, setIsAddCustomerModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [newCustomerForm, setNewCustomerForm] = useState({
    name: '',
    phone: '',
    email: '',
    company: '',
    type: 'Retail' as CustomerType,
    discountPercentage: 0,
    notes: '',
  });
  const [expandedCustomerIds, setExpandedCustomerIds] = useState<string[]>([]);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [selectedInvoiceWo, setSelectedInvoiceWo] = useState<WorkOrder | null>(null);

  // Customer Repair History Modal State
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyModalCustomer, setHistoryModalCustomer] = useState<Customer | null>(null);

  const handleOpenHistoryModal = (cust: Customer) => {
    setHistoryModalCustomer(cust);
    setIsHistoryModalOpen(true);
  };

  // Filter customers by searchQuery and type filter
  const filteredCustomers = customers.filter((cust) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q ||
      cust.name.toLowerCase().includes(q) ||
      cust.phone.toLowerCase().includes(q) ||
      (cust.email && cust.email.toLowerCase().includes(q)) ||
      (cust.company && cust.company.toLowerCase().includes(q));

    const matchesType = customerTypeFilter === 'ALL' || cust.type === customerTypeFilter;

    return matchesSearch && matchesType;
  });

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(filteredCustomers[0] || customers[0] || null);

  // Mobile master-detail: detail column becomes a bottom sheet; auto-open when the
  // user taps a different customer on phones (skips the initial auto-selection).
  const [isMobileDetailOpen, setIsMobileDetailOpen] = useState(false);
  const isFirstRenderRef = React.useRef(true);
  useEffect(() => {
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      return;
    }
    if (selectedCustomer && window.matchMedia('(max-width: 767px)').matches) {
      setIsMobileDetailOpen(true);
    }
  }, [selectedCustomer]);

  // Keyboard shortcuts: [ / ] cycle through customers (desktop convenience)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el?.isContentEditable) return;
      if (e.key !== '[' && e.key !== ']') return;
      if (!filteredCustomers.length) return;
      e.preventDefault();
      const idx = selectedCustomer ? filteredCustomers.findIndex((c) => c.id === selectedCustomer.id) : -1;
      const next = e.key === ']'
        ? filteredCustomers[(idx + 1) % filteredCustomers.length]
        : filteredCustomers[(idx - 1 + filteredCustomers.length) % filteredCustomers.length];
      setSelectedCustomer(next);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [filteredCustomers, selectedCustomer]);

  // Keep detail panel stable when customers are added, removed, or filtered.
  // A deleted customer must not remain in the detail panel.
  useEffect(() => {
    setSelectedCustomer((selected) => {
      if (selected && customers.some((customer) => customer.id === selected.id)) return selected;
      return customers[0] || null;
    });
  }, [customers]);

  

  const openEditCustomerModal = (cust: Customer) => {
    setEditingCustomer(cust);
    setNewCustomerForm({
      name: cust.name,
      phone: cust.phone,
      email: cust.email || '',
      company: cust.company || '',
      type: cust.type,
      discountPercentage: cust.discountPercentage || 0,
      notes: cust.notes || '',
    });
    setIsAddCustomerModalOpen(true);
  };

  const handleCreateCustomerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerForm.name.trim() || !newCustomerForm.phone.trim()) return;
    if (editingCustomer) {
      onUpdateCustomer?.({
        ...editingCustomer,
        name: newCustomerForm.name.trim(),
        phone: newCustomerForm.phone.trim(),
        email: newCustomerForm.email.trim(),
        company: newCustomerForm.company.trim() || undefined,
        type: newCustomerForm.type,
        discountPercentage: Number(newCustomerForm.discountPercentage) || 0,
        notes: newCustomerForm.notes.trim() || undefined,
      });
    } else {
      const cust: Customer = {
        id: `cust-${Date.now()}`,
        name: newCustomerForm.name.trim(),
        phone: newCustomerForm.phone.trim(),
        email: newCustomerForm.email.trim(),
        company: newCustomerForm.company.trim() || undefined,
        type: newCustomerForm.type,
        discountPercentage: Number(newCustomerForm.discountPercentage) || 0,
        totalOrdersCount: 0,
        totalSpent: 0,
        notes: newCustomerForm.notes.trim() || undefined,
        createdAt: new Date().toISOString(),
      };
      onAddCustomer(cust);
    }
    setNewCustomerForm({ name: '', phone: '', email: '', company: '', type: 'Retail', discountPercentage: 0, notes: '' });
    setEditingCustomer(null);
    setIsAddCustomerModalOpen(false);
  };

  const toggleExpandCustomer = (custId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedCustomerIds((prev) =>
      prev.includes(custId) ? prev.filter((id) => id !== custId) : [...prev, custId]
    );
  };

  const getCustomerWorkOrders = (cust: Customer) => {
    return workOrders.filter(
      (wo) =>
        wo.customerId === cust.id ||
        (cust.phone && wo.customerPhone === cust.phone) ||
        (cust.name && wo.customerName?.toLowerCase() === cust.name.toLowerCase())
    );
  };

  const selectedCustomerOrders = selectedCustomer ? getCustomerWorkOrders(selectedCustomer) : [];

  return (
    <div className="space-y-3 text-xs">
      {/* Header — compact on mobile: subtitle hidden, tabs slimmer */}
      <div className="module-toolbar flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2 bg-white p-1.5 sm:p-2 rounded-xl border border-line shadow-xs">
        <div className="module-subheader">
          <h1 className="text-base sm:text-lg font-bold text-ink flex items-center space-x-2">
            <Users className="w-4 h-4 sm:w-5 sm:h-5 text-brand" />
            <span className="hidden sm:inline">Customer Relationship Management & Self-Service Portal</span>
            <span className="sm:hidden truncate">Customer & Staff Portal</span>
          </h1>
          <p className="hidden sm:block text-xs text-muted">Classify accounts (Retail, B2B, Wholesale).</p>
        </div>

        <div className="flex items-center gap-1 overflow-x-auto rounded-lg border border-line bg-surface p-1 text-xs no-scrollbar">
          <Button
            type="button"
            onClick={() => setActiveTab('CRM')}
            className={`px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs font-extrabold rounded-xl transition-all flex items-center space-x-2 shrink-0 cursor-pointer border select-none active:scale-95 ${
              activeTab === 'CRM'
                ? 'bg-brand text-white border-brand shadow-xs'
                : 'bg-white hover:bg-surface text-faint hover:text-ink border-line'
            }`}
          >
            <span>Customer Database</span>
          </Button>
          <Button
            type="button"
            onClick={() => setActiveTab('PORTAL_SIMULATOR')}
            className={`px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs font-extrabold rounded-xl transition-all flex items-center space-x-2 shrink-0 cursor-pointer border select-none active:scale-95 ${
              activeTab === 'PORTAL_SIMULATOR'
                ? 'bg-brand text-white border-brand shadow-xs'
                : 'bg-white hover:bg-surface text-faint hover:text-ink border-line'
            }`}
          >
            <span>Portal Simulator</span>
          </Button>
        </div>
      </div>

      {activeTab === 'CRM' ? (
        <div className="workspace-grid grid grid-cols-1 gap-3 overflow-hidden md:grid-cols-12">
          {/* Customer Directory List */}
          <div className="flex min-h-0 h-full flex-col md:col-span-6 xl:col-span-5 bg-white border border-line rounded-2xl p-4 shadow-xs">
            <div className="flex flex-wrap justify-between items-center border-b border-line pb-2 gap-x-2 gap-y-1">
              <h2 className="font-bold text-ink text-xs">Customer Account Roster</h2>
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-semibold text-muted shrink-0">{filteredCustomers.length} accounts</span>
                <Button
                  type="button"
                  onClick={() => setIsAddCustomerModalOpen(true)}
                  size="sm"
                  className="bg-brand hover:bg-brand/90 text-white shrink-0 flex items-center space-x-1 rounded-lg"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add Customer</span>
                </Button>
              </div>
            </div>

            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto py-3 pr-1">
              {filteredCustomers.length === 0 && (
                <div className="flex h-full min-h-[260px] flex-col items-center justify-center rounded-xl border border-dashed border-line bg-surface px-5 text-center text-muted">
                  <Users className="mb-2 h-7 w-7 text-muted/50" />
                  <p className="font-semibold">No customer accounts found</p>
                  <p className="mt-1 text-xs">Customers from new intake tickets will appear here.</p>
                </div>
              )}
              {filteredCustomers.map((cust) => {
                const custOrders = getCustomerWorkOrders(cust);
                const isExpanded = expandedCustomerIds.includes(cust.id);
                const isSelected = selectedCustomer?.id === cust.id;

                return (
                  <div
                    key={cust.id}
                    onClick={() => setSelectedCustomer(cust)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedCustomer(cust); }
                    }}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-brand-soft border-brand shadow-xs'
                        : 'bg-surface border-line hover:bg-surface'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <Button
                        variant="ghost"
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenHistoryModal(cust);
                        }}
                        className={`font-bold text-ink hover:text-brand hover:underline cursor-pointer text-left flex items-center space-x-1 group ${FOCUS}`}
                        title="Click to view full repair history modal"
                      >
                        <span>{cust.name}</span>
                        <ExternalLink className="w-3 h-3 text-brand opacity-70 group-hover:opacity-100 transition-opacity" />
                      </Button>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                        cust.type === 'B2B Corporate' ? 'bg-purple/10 text-purple border-purple/30' :
                        cust.type === 'Wholesale Mail-In' ? 'bg-brand-soft text-brand border-brand/20' :
                        'bg-white text-ink border-line'
                      }`}>
                        {cust.type}
                      </span>
                    </div>

                    {cust.company && <p className="text-xs text-muted">{cust.company}</p>}

                    <div className="flex justify-between items-center text-xs text-muted mt-1.5">
                      <span>{cust.phone}</span>
                      <span className="font-bold text-success-deep">{cust.totalSpent.toLocaleString()} {systemSettings.currencySymbol} Spent</span>
                    </div>

                    {/* Expandable Row Toggle Bar */}
                    <div className="flex justify-between items-center mt-1.5 pt-1.5 border-t border-line/70">
                      <Button
                        variant="ghost"
                        type="button"
                        onClick={(e) => toggleExpandCustomer(cust.id, e)}
                        className={`flex items-center space-x-1 text-xs font-bold text-brand hover:text-brand-deep transition-colors py-0.5 px-1.5 rounded-md hover:bg-brand/50 cursor-pointer ${FOCUS}`}
                      >
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        <span>
                          {custOrders.length} Repair{custOrders.length === 1 ? '' : 's'}
                        </span>
                      </Button>

                      <div className="flex items-center space-x-1.5">
                        <Button
                          variant="ghost"
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenHistoryModal(cust);
                          }}
                          className={`px-2 py-0.5 bg-brand-soft text-brand hover:bg-brand/15 font-bold text-xs rounded-md transition-colors flex items-center space-x-1 cursor-pointer ${FOCUS}`}
                          title="Open Full Repair History Modal"
                        >
                          <FileText className="w-2.5 h-2.5" />
                          <span>Full History</span>
                        </Button>

                        {(cloudCustomerIds?.has(cust.id) ?? true) && (
                          <Button
                            variant="ghost"
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditCustomerModal(cust);
                            }}
                            className="p-1 bg-brand-soft text-brand hover:bg-brand/15 font-bold text-xs rounded-md transition-colors cursor-pointer"
                            title="Edit Customer Account"
                          >
                            <Edit2 className="w-3 h-3" />
                          </Button>
                        )}
                        {(cloudCustomerIds?.has(cust.id) ?? true) ? (
                        <Button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(`Are you sure you want to delete customer "${cust.name}"?`)) {
                              if (onDeleteCustomer) onDeleteCustomer(cust.id);
                            }
                          }}
                          className="p-1 bg-danger/10 text-danger hover:bg-danger hover:text-white font-bold text-xs rounded-md transition-colors cursor-pointer"
                          title="Delete Customer Account"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      ) : (
                        <span
                          className="px-1.5 py-0.5 text-xs font-bold text-muted bg-white border border-line rounded-md"
                          title="Ticket-derived customer — no standalone account to delete"
                        >
                          Derived
                        </span>
                      )}
                      </div>
                    </div>

                    {/* Expandable Inline Repair History */}
                    {isExpanded && (
                      <div className="mt-2.5 pt-2 border-t border-brand/20 bg-white p-2.5 rounded-xl border space-y-2 shadow-2xs">
                        <div className="flex items-center justify-between text-xs font-extrabold uppercase tracking-wider text-ink">
                          <span className="flex items-center space-x-1">
                            <History className="w-3 h-3 text-brand" />
                            <span>Repair History ({custOrders.length})</span>
                          </span>
                        </div>

                        {custOrders.length > 0 ? (
                          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                            {custOrders.map((wo) => (
                              <div
                                key={wo.id}
                                className="p-2 rounded-lg bg-surface border border-line hover:border-brand transition-all text-xs space-y-1"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-mono font-bold text-ink">{wo.orderNumber || wo.id}</span>
                                  <div className="flex items-center space-x-1.5">
                                    <span className={`px-1.5 py-0.5 text-xs font-bold rounded-full border ${getStatusBadgeStyle(wo.status)}`}>
                                      {wo.status}
                                    </span>
                                    <Button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedInvoiceWo(wo);
                                        setIsInvoiceModalOpen(true);
                                      }}
                                      className="px-1.5 py-0.5 bg-white hover:bg-brand-soft border border-line-strong hover:border-brand text-brand font-bold text-xs rounded flex items-center space-x-1 cursor-pointer transition-colors"
                                      title="Print Invoice"
                                    >
                                      <Printer className="w-2.5 h-2.5" />
                                      <span>Invoice</span>
                                    </Button>
                                  </div>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="font-semibold text-ink truncate max-w-[160px]">{wo.deviceModel}</span>
                                  <span className="font-bold text-success-deep">{wo.totalAmount?.toLocaleString() || 0} {systemSettings.currencySymbol}</span>
                                </div>
                                {wo.symptomsReported && (
                                  <p className="text-xs text-muted line-clamp-1 italic">
                                    "{wo.symptomsReported}"
                                  </p>
                                )}
                                <div className="flex justify-between items-center text-xs text-muted pt-0.5 border-t border-line/50">
                                  <span>{new Date(wo.createdAt).toLocaleDateString()}</span>
                                  {wo.serialNumber && <span>SN: {wo.serialNumber}</span>}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-muted italic py-1 text-center">No repair history recorded for this customer.</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Customer Details & History — bottom sheet on mobile (fixed), in-flow panel on md+ */}
          <div className={`fixed inset-x-0 bottom-0 z-[60] max-h-[85vh] overflow-y-auto rounded-t-3xl bg-white border-t border-line shadow-raised-top transition-transform duration-300 flex min-h-0 flex-col p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] md:static md:inset-auto md:z-auto md:max-h-none md:overflow-visible md:rounded-none md:border md:border-line md:shadow-xs md:transition-none md:translate-y-0 md:col-span-6 xl:col-span-7 ${isMobileDetailOpen ? 'translate-y-0' : 'translate-y-full'}`}>
            {/* Mobile sheet handle + close (md:hidden) */}
            <div className="flex items-center justify-between pb-2 md:hidden">
              <div className="flex items-center gap-2 min-w-0">
                <span className="h-1 w-8 shrink-0 rounded-full bg-line-strong" />
                <p className="truncate text-xs font-extrabold text-ink">{selectedCustomer?.name || 'Customer Details'}</p>
              </div>
              <Button
                variant="ghost"
                type="button"
                onClick={() => setIsMobileDetailOpen(false)}
                aria-label="Close customer details"
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-surface hover:text-ink transition-colors cursor-pointer ${FOCUS}`}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            {selectedCustomer ? (
              <div className="flex min-h-0 flex-1 flex-col gap-5">
                <div className="border-b border-line pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <Button
                        variant="ghost"
                        type="button"
                        onClick={() => handleOpenHistoryModal(selectedCustomer)}
                        className={`text-base font-black text-ink hover:text-brand hover:underline flex items-center space-x-2 cursor-pointer text-left group ${FOCUS}`}
                        title="Click to view full repair history modal"
                      >
                        <span>{selectedCustomer.name}</span>
                        <ExternalLink className="w-4 h-4 text-brand opacity-80 group-hover:opacity-100 transition-opacity" />
                      </Button>
                      {selectedCustomer.company && <p className="text-muted text-xs font-medium">{selectedCustomer.company}</p>}
                    </div>

                    <Button
                      type="button"
                      onClick={() => handleOpenHistoryModal(selectedCustomer)}
                      className={`bg-brand/10 hover:bg-brand text-brand-deep hover:text-white border border-brand/30 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer ${FOCUS}`}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Full History</span>
                      <span className="sm:hidden">History</span>
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 bg-surface p-2.5 rounded-xl border border-line text-ink">
                  <div>
                    <span className="text-muted">Email:</span>
                    <p className="font-semibold text-ink truncate">{selectedCustomer.email}</p>
                  </div>
                  <div>
                    <span className="text-muted">Phone:</span>
                    <p className="font-mono text-ink">{selectedCustomer.phone}</p>
                  </div>
                  <div>
                    <span className="text-muted">Total Orders:</span>
                    <p className="font-bold text-brand">{selectedCustomerOrders.length} Repairs</p>
                  </div>
                  <div>
                    <span className="text-muted">Total Spent:</span>
                    <p className="font-bold text-success-deep">{selectedCustomer.totalSpent.toLocaleString()} {systemSettings.currencySymbol}</p>
                  </div>
                </div>

                {selectedCustomer.notes && (
                  <div className="p-3 bg-warning/10 border border-warning/30 rounded-xl text-warning">
                    <strong>Account Notes:</strong> {selectedCustomer.notes}
                  </div>
                )}

                {/* Selected Customer Detailed Repair History Timeline */}
                <div className="flex min-h-0 flex-1 flex-col space-y-3 pt-2 border-t border-line">
                  <div className="flex items-center justify-between pb-1">
                    <h3 className="font-black text-ink text-xs flex items-center space-x-1.5">
                      <History className="w-4 h-4 text-brand" />
                      <span>Chronological Repair History & Outcomes ({selectedCustomerOrders.length})</span>
                    </h3>
                  </div>

                  <CustomerRepairTimeline
                    workOrders={selectedCustomerOrders}
                    systemSettings={systemSettings}
                    emptyClassName="flex-1"
                    onPrintInvoice={(wo) => {
                      setSelectedInvoiceWo(wo);
                      setIsInvoiceModalOpen(true);
                    }}
                    showFilters={true}
                  />
                </div>
              </div>
            ) : (
              <div className="flex min-h-[360px] flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-line bg-surface p-8 text-center text-muted">
                <Users className="mb-2 h-8 w-8 text-muted/50" />
                <p className="font-semibold">Select a customer to view details.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* PORTAL VIEW SIMULATOR */
        <div className="rounded-3xl overflow-hidden border border-line shadow-xs">
          <CustomerFacingWebPortal
            workOrders={workOrders}
            customers={customers}
            systemSettings={systemSettings}
            onUpdateWorkOrder={onSaveWorkOrder}
          />
        </div>
      )}

      {/* Add Customer Modal */}
      {isAddCustomerModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-[70] flex items-center justify-center p-4">
          <form onSubmit={handleCreateCustomerSubmit} className="bg-white border border-line rounded-2xl max-w-md w-full p-5 space-y-4 text-xs shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-line pb-2">
              <h4 className="font-extrabold text-ink text-sm flex items-center space-x-1.5">
                <Users className="w-4 h-4 text-brand" />
                <span>{editingCustomer ? 'Edit Customer Account' : 'Register New Customer Account'}</span>
              </h4>
              <Button
                type="button"
                onClick={() => setIsAddCustomerModalOpen(false)}
                aria-label="Close add customer"
                className="text-muted hover:text-ink cursor-pointer"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block font-bold text-ink mb-1">Customer Name *</label>
                <Input
                  type="text"
                  required
                  value={newCustomerForm.name}
                  onChange={(e) => setNewCustomerForm({ ...newCustomerForm, name: e.target.value })}
                  placeholder="e.g. U Kyaw Zin"
                  className="w-full bg-surface border border-line rounded-xl p-2 text-xs font-bold text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-ink mb-1">Phone Number *</label>
                  <Input
                    type="tel"
                    required
                    value={newCustomerForm.phone}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, phone: e.target.value })}
                    placeholder="09 123 456 789"
                    className="w-full bg-surface border border-line rounded-xl p-2 text-xs font-mono font-bold text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                  />
                </div>
                <div>
                  <label className="block font-bold text-ink mb-1">Account Type</label>
                  <select aria-label="Account Type" 
                    value={newCustomerForm.type}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, type: e.target.value as CustomerType })}
                    className="w-full bg-surface border border-line rounded-xl p-2 text-xs font-bold text-ink outline-none cursor-pointer focus:border-brand focus:ring-2 focus:ring-brand/20"
                  >
                    <option value="Retail">Retail</option>
                    <option value="B2B Corporate">B2B Corporate</option>
                    <option value="Wholesale Mail-In">Wholesale Mail-In</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-ink mb-1">Email Address</label>
                <Input
                  type="email"
                  value={newCustomerForm.email}
                  onChange={(e) => setNewCustomerForm({ ...newCustomerForm, email: e.target.value })}
                  placeholder="customer@example.com"
                  className="w-full bg-surface border border-line rounded-xl p-2 text-xs text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-ink mb-1">Company (B2B)</label>
                  <Input
                    type="text"
                    value={newCustomerForm.company}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, company: e.target.value })}
                    placeholder="e.g. i35 Apple Service"
                    className="w-full bg-surface border border-line rounded-xl p-2 text-xs text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                  />
                </div>
                <div>
                  <label className="block font-bold text-ink mb-1">Discount %</label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={newCustomerForm.discountPercentage}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, discountPercentage: Number(e.target.value) })}
                    className="w-full bg-surface border border-line rounded-xl p-2 text-xs font-mono font-bold text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-ink mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={newCustomerForm.notes}
                  onChange={(e) => setNewCustomerForm({ ...newCustomerForm, notes: e.target.value })}
                  placeholder="VIP customer, credit terms, preferred tech…"
                  className="w-full bg-surface border border-line rounded-xl p-2 text-xs text-ink outline-none resize-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-line">
              <Button
                type="button"
                onClick={() => setIsAddCustomerModalOpen(false)}
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-brand hover:bg-brand-deep text-white flex items-center space-x-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{editingCustomer ? 'Save Changes' : 'Save Customer'}</span>
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Printable Invoice Modal */}
      <PrintableInvoiceModal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        workOrder={selectedInvoiceWo}
        systemSettings={systemSettings}
      />

      {/* Full Customer Repair History Modal */}
      <CustomerRepairHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        customer={historyModalCustomer}
        workOrders={workOrders}
        systemSettings={systemSettings}
        onPrintInvoice={(wo) => {
          setSelectedInvoiceWo(wo);
          setIsInvoiceModalOpen(true);
        }}
      />
    </div>
  );
};
