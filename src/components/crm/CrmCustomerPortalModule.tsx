import React, { useEffect, useState } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  ExternalLink, 
  CheckCircle2, 
  Clock, 
  ShieldAlert, 
  Smartphone, 
  MessageSquare,
  Sparkles,
  X,
  ChevronDown,
  ChevronUp,
  History,
  Calendar,
  Tag,
  DollarSign,
  FileText,
  Printer,
  Trash2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Customer, WorkOrder, SystemSettings } from '../../types';
import { CustomerFacingWebPortal } from '../portal/CustomerFacingWebPortal';
import { PrintableInvoiceModal } from '../common/PrintableInvoiceModal';
import { CustomerRepairHistoryModal } from './CustomerRepairHistoryModal';
import { CustomerRepairTimeline } from './CustomerRepairTimeline';
import { DEFAULT_SYSTEM_SETTINGS } from '../../data/seedData';

interface CrmCustomerPortalModuleProps {
  customers: Customer[];
  workOrders: WorkOrder[];
  onAddCustomer: (cust: Customer) => void;
  onDeleteCustomer?: (customerId: string) => void;
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
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'In Progress':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'Pending':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'Receive':
      return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'Taken Out':
      return 'bg-slate-100 text-slate-700 border-slate-200';
    case 'Cant Repair':
      return 'bg-rose-50 text-rose-700 border-rose-200';
    case 'Customer Not Repair':
      return 'bg-orange-50 text-orange-700 border-orange-200';
    default:
      return 'bg-gray-50 text-gray-700 border-gray-200';
  }
};

export const CrmCustomerPortalModule: React.FC<CrmCustomerPortalModuleProps> = ({
  customers,
  workOrders,
  onAddCustomer,
  onDeleteCustomer,
  systemSettings = DEFAULT_SYSTEM_SETTINGS,
  onSaveWorkOrder = () => {},
  searchQuery = '',
  customerTypeFilter = 'ALL',
}) => {
  const [activeTab, setActiveTab] = useState<'CRM' | 'PORTAL_SIMULATOR'>('CRM');
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

  // Keep detail panel stable when customers are added, removed, or filtered.
  // A deleted customer must not remain in the detail panel.
  useEffect(() => {
    setSelectedCustomer((selected) => {
      if (selected && customers.some((customer) => customer.id === selected.id)) return selected;
      return customers[0] || null;
    });
  }, [customers]);

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
      {/* Header */}
      <div className="module-toolbar flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white p-2 rounded-xl border border-[#E5E5EA] shadow-xs">
        <div className="module-subheader">
          <h1 className="text-lg font-bold text-[#1D1D1F] flex items-center space-x-2">
            <Users className="w-5 h-5 text-[#0071E3]" />
            <span>Customer Relationship Management & Self-Service Portal</span>
          </h1>
          <p className="text-xs text-[#86868B]">Classify accounts (Retail, B2B, Wholesale) and simulate customer tracking portal</p>
        </div>

        <div className="flex items-center gap-1 overflow-x-auto rounded-lg border border-[#E5E5EA] bg-[#F5F5F7] p-1 text-xs no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('CRM')}
            className={`px-3.5 py-2 text-xs font-extrabold rounded-xl transition-all flex items-center space-x-2 shrink-0 cursor-pointer border select-none active:scale-95 ${
              activeTab === 'CRM'
                ? 'bg-[#0071E3] text-white border-[#0071E3] shadow-xs'
                : 'bg-white hover:bg-slate-100 text-[#6E6E73] hover:text-[#1D1D1F] border-[#E5E5EA]'
            }`}
          >
            <span>Customer Database</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('PORTAL_SIMULATOR')}
            className={`px-3.5 py-2 text-xs font-extrabold rounded-xl transition-all flex items-center space-x-2 shrink-0 cursor-pointer border select-none active:scale-95 ${
              activeTab === 'PORTAL_SIMULATOR'
                ? 'bg-[#0071E3] text-white border-[#0071E3] shadow-xs'
                : 'bg-white hover:bg-slate-100 text-[#6E6E73] hover:text-[#1D1D1F] border-[#E5E5EA]'
            }`}
          >
            <span>Customer Portal View Simulator</span>
          </button>
        </div>
      </div>

      {activeTab === 'CRM' ? (
        <div className="workspace-grid grid grid-cols-1 gap-3 overflow-hidden md:grid-cols-12">
          {/* Customer Directory List */}
          <div className="flex min-h-0 h-full flex-col md:col-span-5 bg-white border border-[#E5E5EA] rounded-2xl p-4 shadow-xs">
            <div className="flex justify-between items-center border-b border-[#E5E5EA] pb-2">
              <h2 className="font-bold text-[#1D1D1F] text-xs">Customer Account Roster</h2>
              <span className="text-[10px] font-semibold text-[#86868B]">{filteredCustomers.length} accounts</span>
            </div>

            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto py-3 pr-1">
              {filteredCustomers.length === 0 && (
                <div className="flex h-full min-h-[260px] flex-col items-center justify-center rounded-xl border border-dashed border-[#E5E5EA] bg-[#F8F9FA] px-5 text-center text-[#86868B]">
                  <Users className="mb-2 h-7 w-7 text-[#86868B]/50" />
                  <p className="font-semibold">No customer accounts found</p>
                  <p className="mt-1 text-[11px]">Customers from new intake tickets will appear here.</p>
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
                    className={`p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#F0F6FF] border-[#0071E3] shadow-xs'
                        : 'bg-[#F5F5F7] border-[#E5E5EA] hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenHistoryModal(cust);
                        }}
                        className="font-bold text-[#1D1D1F] hover:text-[#0071E3] hover:underline cursor-pointer text-left flex items-center space-x-1 group"
                        title="Click to view full repair history modal"
                      >
                        <span>{cust.name}</span>
                        <ExternalLink className="w-3 h-3 text-[#0071E3] opacity-70 group-hover:opacity-100 transition-opacity" />
                      </button>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        cust.type === 'B2B Corporate' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                        cust.type === 'Wholesale Mail-In' ? 'bg-[#F0F6FF] text-[#0071E3] border-[#0071E3]/20' :
                        'bg-white text-[#1D1D1F] border-[#E5E5EA]'
                      }`}>
                        {cust.type}
                      </span>
                    </div>

                    {cust.company && <p className="text-[11px] text-[#86868B]">{cust.company}</p>}

                    <div className="flex justify-between items-center text-[11px] text-[#86868B] mt-2">
                      <span>{cust.phone}</span>
                      <span className="font-bold text-[#28A745]">{cust.totalSpent.toLocaleString()} {systemSettings.currencySymbol} Spent</span>
                    </div>

                    {/* Expandable Row Toggle Bar */}
                    <div className="flex justify-between items-center mt-2.5 pt-2 border-t border-[#E5E5EA]/70">
                      <button
                        type="button"
                        onClick={(e) => toggleExpandCustomer(cust.id, e)}
                        className="flex items-center space-x-1 text-[11px] font-bold text-[#0071E3] hover:text-[#0051B3] transition-colors py-0.5 px-1.5 rounded-md hover:bg-blue-100/50 cursor-pointer"
                      >
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        <span>
                          {custOrders.length} Repair{custOrders.length === 1 ? '' : 's'} {isExpanded ? 'History' : 'History'}
                        </span>
                      </button>

                      <div className="flex items-center space-x-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenHistoryModal(cust);
                          }}
                          className="px-2 py-0.5 bg-blue-50 text-[#0071E3] hover:bg-blue-100 font-bold text-[10px] rounded-md transition-colors flex items-center space-x-1 cursor-pointer"
                          title="Open Full Repair History Modal"
                        >
                          <FileText className="w-2.5 h-2.5" />
                          <span>Full History</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(`Are you sure you want to delete customer "${cust.name}"?`)) {
                              if (onDeleteCustomer) onDeleteCustomer(cust.id);
                            }
                          }}
                          className="p-1 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white font-bold text-[10px] rounded-md transition-colors cursor-pointer"
                          title="Delete Customer Account"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Expandable Inline Repair History */}
                    {isExpanded && (
                      <div className="mt-2.5 pt-2 border-t border-blue-100 bg-white p-2.5 rounded-xl border space-y-2 shadow-2xs">
                        <div className="flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wider text-[#1D1D1F]">
                          <span className="flex items-center space-x-1">
                            <History className="w-3 h-3 text-[#0071E3]" />
                            <span>Repair History ({custOrders.length})</span>
                          </span>
                        </div>

                        {custOrders.length > 0 ? (
                          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                            {custOrders.map((wo) => (
                              <div
                                key={wo.id}
                                className="p-2 rounded-lg bg-[#F8F9FA] border border-[#E5E5EA] hover:border-[#0071E3] transition-all text-[11px] space-y-1"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-mono font-bold text-[#1D1D1F]">{wo.orderNumber || wo.id}</span>
                                  <div className="flex items-center space-x-1.5">
                                    <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded-full border ${getStatusBadgeStyle(wo.status)}`}>
                                      {wo.status}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedInvoiceWo(wo);
                                        setIsInvoiceModalOpen(true);
                                      }}
                                      className="px-1.5 py-0.5 bg-white hover:bg-blue-50 border border-[#D2D2D7] hover:border-[#0071E3] text-[#0071E3] font-bold text-[9px] rounded flex items-center space-x-1 cursor-pointer transition-colors"
                                      title="Print Invoice"
                                    >
                                      <Printer className="w-2.5 h-2.5" />
                                      <span>Invoice</span>
                                    </button>
                                  </div>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="font-semibold text-[#1D1D1F] truncate max-w-[160px]">{wo.deviceModel}</span>
                                  <span className="font-bold text-[#28A745]">{wo.totalAmount?.toLocaleString() || 0} {systemSettings.currencySymbol}</span>
                                </div>
                                {wo.symptomsReported && (
                                  <p className="text-[10px] text-[#86868B] line-clamp-1 italic">
                                    "{wo.symptomsReported}"
                                  </p>
                                )}
                                <div className="flex justify-between items-center text-[9px] text-[#86868B] pt-0.5 border-t border-[#E5E5EA]/50">
                                  <span>{new Date(wo.createdAt).toLocaleDateString()}</span>
                                  {wo.serialNumber && <span>SN: {wo.serialNumber}</span>}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[11px] text-[#86868B] italic py-1 text-center">No repair history recorded for this customer.</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Customer Details & History */}
          <div className="flex min-h-0 h-full flex-col md:col-span-7 bg-white border border-[#E5E5EA] rounded-2xl p-5 shadow-xs">
            {selectedCustomer ? (
              <div className="flex min-h-0 flex-1 flex-col gap-5">
                <div className="border-b border-[#E5E5EA] pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <button
                        type="button"
                        onClick={() => handleOpenHistoryModal(selectedCustomer)}
                        className="text-base font-black text-[#1D1D1F] hover:text-[#0071E3] hover:underline flex items-center space-x-2 cursor-pointer text-left group"
                        title="Click to view full repair history modal"
                      >
                        <span>{selectedCustomer.name}</span>
                        <ExternalLink className="w-4 h-4 text-[#0071E3] opacity-80 group-hover:opacity-100 transition-opacity" />
                      </button>
                      {selectedCustomer.company && <p className="text-[#86868B] text-xs font-medium">{selectedCustomer.company}</p>}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenHistoryModal(selectedCustomer)}
                      className="px-3 py-1 bg-[#0071E3]/10 hover:bg-[#0071E3] text-[#0071E3] hover:text-white border border-[#0071E3]/30 font-bold text-xs rounded-xl transition-all flex items-center space-x-1.5 cursor-pointer shadow-2xs"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Full Repair History Modal</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 bg-[#F5F5F7] p-3 rounded-xl border border-[#E5E5EA] text-[#1D1D1F]">
                  <div>
                    <span className="text-[#86868B]">Email:</span>
                    <p className="font-semibold text-[#1D1D1F] truncate">{selectedCustomer.email}</p>
                  </div>
                  <div>
                    <span className="text-[#86868B]">Phone:</span>
                    <p className="font-mono text-[#1D1D1F]">{selectedCustomer.phone}</p>
                  </div>
                  <div>
                    <span className="text-[#86868B]">Total Orders:</span>
                    <p className="font-bold text-[#0071E3]">{selectedCustomerOrders.length} Repairs</p>
                  </div>
                  <div>
                    <span className="text-[#86868B]">Total Spent:</span>
                    <p className="font-bold text-[#28A745]">{selectedCustomer.totalSpent.toLocaleString()} {systemSettings.currencySymbol}</p>
                  </div>
                </div>

                {selectedCustomer.notes && (
                  <div className="p-3 bg-[#FFF4E5] border border-[#FF9F0A]/30 rounded-xl text-[#B26B00]">
                    <strong>Account Notes:</strong> {selectedCustomer.notes}
                  </div>
                )}

                {/* Selected Customer Detailed Repair History Timeline */}
                <div className="flex min-h-0 flex-1 flex-col space-y-3 pt-2 border-t border-[#E5E5EA]">
                  <div className="flex items-center justify-between pb-1">
                    <h3 className="font-black text-[#1D1D1F] text-xs flex items-center space-x-1.5">
                      <History className="w-4 h-4 text-[#0071E3]" />
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
              <div className="flex min-h-[360px] flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-[#E5E5EA] bg-[#F8F9FA] p-8 text-center text-[#86868B]">
                <Users className="mb-2 h-8 w-8 text-[#86868B]/50" />
                <p className="font-semibold">Select a customer to view details.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* PORTAL VIEW SIMULATOR */
        <div className="rounded-3xl overflow-hidden border border-[#E5E5EA] shadow-xs">
          <CustomerFacingWebPortal
            workOrders={workOrders}
            customers={customers}
            systemSettings={systemSettings}
            onUpdateWorkOrder={onSaveWorkOrder}
          />
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
