import React, { useState } from 'react';
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
  Wrench,
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

  const [currentPage, setCurrentPage] = useState<number>(1);
  const ITEMS_PER_PAGE = 5;
  const totalPages = Math.ceil(filteredCustomers.length / ITEMS_PER_PAGE) || 1;
  const safeCurrentPage = Math.min(Math.max(currentPage, 1), totalPages);
  const paginatedCustomers = filteredCustomers.slice((safeCurrentPage - 1) * ITEMS_PER_PAGE, safeCurrentPage * ITEMS_PER_PAGE);

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(filteredCustomers[0] || customers[0] || null);

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
    <div className="space-y-6 text-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-[#E5E5EA] shadow-xs">
        <div>
          <h1 className="text-lg font-bold text-[#1D1D1F] flex items-center space-x-2">
            <Users className="w-5 h-5 text-[#0071E3]" />
            <span>Customer Relationship Management & Self-Service Portal</span>
          </h1>
          <p className="text-xs text-[#86868B]">Classify accounts (Retail, B2B, Wholesale) and simulate customer tracking portal</p>
        </div>

        <div className="bg-[#F5F5F7] p-1.5 rounded-2xl border border-[#E5E5EA] flex items-center space-x-1.5 overflow-x-auto no-scrollbar text-xs shadow-2xs">
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
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Customer Directory List */}
          <div className="md:col-span-5 bg-white border border-[#E5E5EA] rounded-2xl p-4 space-y-3 shadow-xs">
            <div className="flex justify-between items-center border-b border-[#E5E5EA] pb-2">
              <h2 className="font-bold text-[#1D1D1F] text-xs">Customer Account Roster</h2>
              <span className="text-[10px] font-semibold text-[#86868B]">{filteredCustomers.length} accounts</span>
            </div>

            <div className="space-y-2 min-h-[360px]">
              {paginatedCustomers.map((cust) => {
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
                            <Wrench className="w-3 h-3 text-[#0071E3]" />
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

            {/* Pagination Bar */}
            {filteredCustomers.length > 0 && (
              <div className="pt-3 border-t border-[#E5E5EA] flex items-center justify-between text-xs text-[#86868B]">
                <span className="font-semibold text-[11px]">
                  {(safeCurrentPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(safeCurrentPage * ITEMS_PER_PAGE, filteredCustomers.length)} of {filteredCustomers.length}
                </span>

                <div className="flex items-center space-x-1">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                    disabled={safeCurrentPage === 1}
                    className="p-1 rounded-lg border border-[#E5E5EA] hover:bg-slate-100 disabled:opacity-40 text-[#1D1D1F] transition-all cursor-pointer"
                    title="Previous Page"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>

                  <div className="flex items-center space-x-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter((p) => p === 1 || p === totalPages || Math.abs(p - safeCurrentPage) <= 1)
                      .map((p, idx, arr) => {
                        const prev = arr[idx - 1];
                        const showEllipsis = prev && p - prev > 1;
                        return (
                          <React.Fragment key={p}>
                            {showEllipsis && <span className="text-[10px] text-[#86868B]">..</span>}
                            <button
                              type="button"
                              onClick={() => setCurrentPage(p)}
                              className={`w-6 h-6 rounded-lg text-[11px] font-extrabold transition-all cursor-pointer ${
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
                    className="p-1 rounded-lg border border-[#E5E5EA] hover:bg-slate-100 disabled:opacity-40 text-[#1D1D1F] transition-all cursor-pointer"
                    title="Next Page"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Customer Details & History */}
          <div className="md:col-span-7 bg-white border border-[#E5E5EA] rounded-2xl p-5 space-y-5 shadow-xs">
            {selectedCustomer ? (
              <div className="space-y-5">
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
                <div className="space-y-3 pt-2 border-t border-[#E5E5EA]">
                  <div className="flex items-center justify-between pb-1">
                    <h3 className="font-black text-[#1D1D1F] text-xs flex items-center space-x-1.5">
                      <Wrench className="w-4 h-4 text-[#0071E3]" />
                      <span>Chronological Repair History & Outcomes ({selectedCustomerOrders.length})</span>
                    </h3>
                  </div>

                  <CustomerRepairTimeline
                    workOrders={selectedCustomerOrders}
                    systemSettings={systemSettings}
                    onPrintInvoice={(wo) => {
                      setSelectedInvoiceWo(wo);
                      setIsInvoiceModalOpen(true);
                    }}
                    showFilters={true}
                  />
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-[#86868B]">Select a customer to view details.</div>
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

