import React, { useState } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Wrench, 
  PackageCheck, 
  AlertCircle, 
  Smartphone, 
  Printer, 
  Search, 
  Filter, 
  ArrowUpDown, 
  Calendar, 
  ShieldCheck, 
  Cpu, 
  FileText, 
  ChevronDown, 
  ChevronUp, 
  Tag, 
  DollarSign, 
  Activity,
  Check,
  AlertTriangle
} from 'lucide-react';
import { WorkOrder, SystemSettings } from '../../types';
import { DEFAULT_SYSTEM_SETTINGS } from '../../data/seedData';
import { WorkOrderStatusTimeline } from '../common/WorkOrderStatusTimeline';

interface CustomerRepairTimelineProps {
  workOrders: WorkOrder[];
  systemSettings?: SystemSettings;
  onPrintInvoice?: (wo: WorkOrder) => void;
  showFilters?: boolean;
  compact?: boolean;
}

const getOutcomeMeta = (status: string) => {
  switch (status) {
    case 'Finished':
      return {
        label: 'Resolved & Completed',
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        nodeBg: 'bg-emerald-500 text-white ring-4 ring-emerald-100',
        icon: CheckCircle2,
        bgGradient: 'from-emerald-50/50 to-transparent',
        borderLeft: 'border-l-4 border-l-emerald-500',
      };
    case 'In Progress':
      return {
        label: 'Under Active Repair',
        badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
        nodeBg: 'bg-[#0071E3] text-white ring-4 ring-blue-100',
        icon: Wrench,
        bgGradient: 'from-blue-50/50 to-transparent',
        borderLeft: 'border-l-4 border-l-[#0071E3]',
      };
    case 'Pending':
      return {
        label: 'Awaiting Parts / Approval',
        badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
        nodeBg: 'bg-amber-500 text-white ring-4 ring-amber-100',
        icon: Clock,
        bgGradient: 'from-amber-50/50 to-transparent',
        borderLeft: 'border-l-4 border-l-amber-500',
      };
    case 'Receive':
      return {
        label: 'Intaken & Diagnosing',
        badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
        nodeBg: 'bg-purple-600 text-white ring-4 ring-purple-100',
        icon: PackageCheck,
        bgGradient: 'from-purple-50/50 to-transparent',
        borderLeft: 'border-l-4 border-l-purple-600',
      };
    case 'Taken Out':
      return {
        label: 'Collected / Delivered',
        badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
        nodeBg: 'bg-slate-600 text-white ring-4 ring-slate-100',
        icon: CheckCircle2,
        bgGradient: 'from-slate-50/50 to-transparent',
        borderLeft: 'border-l-4 border-l-slate-600',
      };
    case 'Cant Repair':
      return {
        label: 'Unrepairable / No Fix',
        badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
        nodeBg: 'bg-rose-500 text-white ring-4 ring-rose-100',
        icon: XCircle,
        bgGradient: 'from-rose-50/50 to-transparent',
        borderLeft: 'border-l-4 border-l-rose-500',
      };
    case 'Customer Not Repair':
      return {
        label: 'Declined by Customer',
        badgeClass: 'bg-orange-50 text-orange-700 border-orange-200',
        nodeBg: 'bg-orange-500 text-white ring-4 ring-orange-100',
        icon: AlertCircle,
        bgGradient: 'from-orange-50/50 to-transparent',
        borderLeft: 'border-l-4 border-l-orange-500',
      };
    default:
      return {
        label: status,
        badgeClass: 'bg-gray-50 text-gray-700 border-gray-200',
        nodeBg: 'bg-gray-500 text-white ring-4 ring-gray-100',
        icon: Activity,
        bgGradient: 'from-gray-50/50 to-transparent',
        borderLeft: 'border-l-4 border-l-gray-400',
      };
  }
};

export const CustomerRepairTimeline: React.FC<CustomerRepairTimelineProps> = ({
  workOrders,
  systemSettings = DEFAULT_SYSTEM_SETTINGS,
  onPrintInvoice,
  showFilters = true,
  compact = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [deviceFilter, setDeviceFilter] = useState('ALL');
  const [sortOrder, setSortOrder] = useState<'NEWEST' | 'OLDEST'>('NEWEST');
  const [expandedLogWoIds, setExpandedLogWoIds] = useState<string[]>([]);

  const toggleExpandLogs = (id: string) => {
    setExpandedLogWoIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Get unique device categories from the customer's orders
  const availableCategories = Array.from(
    new Set(workOrders.map((wo) => wo.deviceCategory).filter(Boolean))
  );

  // Filter orders
  const filteredOrders = workOrders.filter((wo) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      !q ||
      (wo.orderNumber && wo.orderNumber.toLowerCase().includes(q)) ||
      (wo.deviceModel && wo.deviceModel.toLowerCase().includes(q)) ||
      (wo.serialNumber && wo.serialNumber.toLowerCase().includes(q)) ||
      (wo.imei && wo.imei.toLowerCase().includes(q)) ||
      (wo.symptomsReported && wo.symptomsReported.toLowerCase().includes(q)) ||
      (wo.afterRepairSummary && wo.afterRepairSummary.toLowerCase().includes(q)) ||
      (wo.assignedTechName && wo.assignedTechName.toLowerCase().includes(q));

    const matchesStatus = statusFilter === 'ALL' || wo.status === statusFilter;
    const matchesDevice = deviceFilter === 'ALL' || wo.deviceCategory === deviceFilter;

    return matchesSearch && matchesStatus && matchesDevice;
  });

  // Sort chronologically
  const sortedOrders = [...filteredOrders].sort((a, b) => {
    const dateA = new Date(a.createdAt).getTime();
    const dateB = new Date(b.createdAt).getTime();
    return sortOrder === 'NEWEST' ? dateB - dateA : dateA - dateB;
  });

  if (workOrders.length === 0) {
    return (
      <div className="p-8 text-center text-[#86868B] bg-[#F8F9FA] rounded-2xl border border-dashed border-[#E5E5EA]">
        <Clock className="w-8 h-8 text-[#86868B]/50 mx-auto mb-2" />
        <p className="font-semibold text-xs">No repair history recorded for this customer account.</p>
        <p className="text-[11px] text-[#86868B] mt-0.5">When work orders are intaken, they will appear chronologically here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 text-xs">
      {/* Filtering & Sorting Controls Bar */}
      {showFilters && (
        <div className="bg-[#F5F5F7] p-3 rounded-2xl border border-[#E5E5EA] space-y-2.5">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5">
            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-[#86868B] absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search ticket, model, serial, notes..."
                className="w-full bg-white border border-[#E5E5EA] rounded-xl pl-8 pr-3 py-1.5 text-xs font-semibold text-[#1D1D1F] focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 focus:outline-none"
              />
            </div>

            {/* Filter Controls */}
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <div className="flex items-center space-x-1 bg-white px-2.5 py-1 rounded-xl border border-[#E5E5EA]">
                <Filter className="w-3 h-3 text-[#86868B]" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-transparent text-[11px] font-bold text-[#1D1D1F] focus:outline-none cursor-pointer"
                >
                  <option value="ALL">All Outcomes ({workOrders.length})</option>
                  <option value="Finished">Finished</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Pending">Pending</option>
                  <option value="Receive">Receive</option>
                  <option value="Cant Repair">Can't Repair</option>
                  <option value="Customer Not Repair">Declined</option>
                </select>
              </div>

              {availableCategories.length > 1 && (
                <div className="flex items-center space-x-1 bg-white px-2.5 py-1 rounded-xl border border-[#E5E5EA]">
                  <Smartphone className="w-3 h-3 text-[#86868B]" />
                  <select
                    value={deviceFilter}
                    onChange={(e) => setDeviceFilter(e.target.value)}
                    className="bg-transparent text-[11px] font-bold text-[#1D1D1F] focus:outline-none cursor-pointer"
                  >
                    <option value="ALL">All Devices</option>
                    {availableCategories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Sort Order Toggle */}
              <button
                type="button"
                onClick={() => setSortOrder(prev => prev === 'NEWEST' ? 'OLDEST' : 'NEWEST')}
                className="px-2.5 py-1 bg-white border border-[#E5E5EA] hover:border-[#0071E3] text-[#1D1D1F] font-bold text-[11px] rounded-xl flex items-center space-x-1 cursor-pointer transition-all shadow-2xs"
                title="Toggle Chronological Order"
              >
                <ArrowUpDown className="w-3 h-3 text-[#0071E3]" />
                <span>{sortOrder === 'NEWEST' ? 'Newest First' : 'Oldest First'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chronological Timeline Container */}
      {sortedOrders.length > 0 ? (
        <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 sm:before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-gradient-to-b before:from-[#0071E3] before:via-[#E5E5EA] before:to-[#E5E5EA]">
          {sortedOrders.map((wo, index) => {
            const outcomeMeta = getOutcomeMeta(wo.status);
            const NodeIcon = outcomeMeta.icon;
            const isLogsExpanded = expandedLogWoIds.includes(wo.id);

            // Format date neatly
            const orderDate = new Date(wo.createdAt);
            const formattedDate = orderDate.toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            });
            const formattedTime = orderDate.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit'
            });

            // Calculate parts used list
            const lineItemsCount = wo.lineItems?.length || 0;
            const selectedRepairsCount = wo.selectedRepairs?.length || 0;

            return (
              <div key={wo.id} className="relative group">
                {/* Timeline Node Point on Left Line */}
                <div
                  className={`absolute -left-6 sm:-left-8 top-3.5 w-6 h-6 rounded-full flex items-center justify-center ${outcomeMeta.nodeBg} shadow-sm z-10 transition-transform group-hover:scale-110`}
                >
                  <NodeIcon className="w-3.5 h-3.5" />
                </div>

                {/* Timeline Ticket Card */}
                <div className={`bg-white border border-[#E5E5EA] hover:border-[#0071E3]/50 rounded-2xl p-4 space-y-3 shadow-xs transition-all ${outcomeMeta.borderLeft}`}>
                  {/* Top Header: Order #, Outcome Badge, Date */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E5E5EA]/80 pb-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-1 bg-[#1D1D1F] text-white font-mono font-bold text-xs rounded-xl shadow-2xs">
                        {wo.orderNumber || wo.id}
                      </span>

                      <span className={`px-2.5 py-0.5 text-[10px] font-extrabold rounded-full border ${outcomeMeta.badgeClass}`}>
                        {outcomeMeta.label}
                      </span>

                      {wo.serviceType && (
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-[#F5F5F7] text-[#1D1D1F] border border-[#E5E5EA] rounded-md">
                          {wo.serviceType}
                        </span>
                      )}

                      {wo.priority && wo.priority !== 'Normal' && (
                        <span className="px-2 py-0.5 text-[10px] font-extrabold bg-rose-100 text-rose-800 rounded-md">
                          ⚡ {wo.priority}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-2 text-[11px] text-[#86868B]">
                      <Calendar className="w-3.5 h-3.5 text-[#0071E3]" />
                      <span className="font-semibold text-[#1D1D1F]">{formattedDate}</span>
                      <span className="text-[#86868B]">at {formattedTime}</span>
                    </div>
                  </div>

                  {/* Device Specification & Serial Section */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#F9F9FB] p-3 rounded-xl border border-[#E5E5EA]/80">
                    <div>
                      <span className="text-[10px] font-bold text-[#86868B] uppercase tracking-wider block mb-0.5">
                        Device Specification
                      </span>
                      <div className="flex items-center space-x-1.5">
                        <Smartphone className="w-4 h-4 text-[#0071E3]" />
                        <span className="font-black text-[#1D1D1F] text-xs">
                          {wo.deviceCategory} {wo.deviceModel}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-[10px] text-[#86868B] mt-1">
                        {wo.deviceColor && (
                          <span className="px-1.5 py-0.5 bg-white rounded border border-[#E5E5EA] font-medium">
                            Color: {wo.deviceColor}
                          </span>
                        )}
                        {(wo.serialNumber || wo.imei) && (
                          <span className="px-1.5 py-0.5 bg-white rounded border border-[#E5E5EA] font-mono font-bold text-[#1D1D1F]">
                            S/N: {wo.serialNumber || wo.imei}
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-[#86868B] uppercase tracking-wider block mb-0.5">
                        Security & Passcode Status
                      </span>
                      <div className="flex items-center space-x-3 text-[11px] pt-0.5">
                        <div>
                          <span className="text-[#86868B]">Passcode: </span>
                          <span className="font-mono font-bold text-[#1D1D1F]">
                            {wo.passcode ? '•••• Provided' : 'None / Pattern'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[#86868B]">Find My: </span>
                          <span className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${
                            wo.findMyStatus === 'OFF' 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : wo.findMyStatus === 'ON' 
                              ? 'bg-amber-100 text-amber-800' 
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {wo.findMyStatus}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Outcome & Repair Details Box */}
                  <div className="space-y-2">
                    <div className="bg-[#F0F6FF] p-3 rounded-xl border border-[#0071E3]/20 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase text-[#0071E3] tracking-wider flex items-center space-x-1">
                          <Activity className="w-3 h-3 text-[#0071E3]" />
                          <span>Repair Outcome Summary & Diagnosis</span>
                        </span>
                        {wo.postRepairChecklist && (
                          <span className="text-[9px] font-extrabold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full flex items-center space-x-1">
                            <ShieldCheck className="w-3 h-3" />
                            <span>QA Checklist Passed</span>
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-[#1D1D1F] font-semibold leading-relaxed">
                        {wo.afterRepairSummary || wo.diagnosticResult || wo.symptomsReported || 'Standard intake diagnostics completed.'}
                      </p>

                      {/* Line Items / Selected Repairs List */}
                      {wo.selectedRepairs && wo.selectedRepairs.length > 0 && (
                        <div className="pt-1.5 border-t border-[#0071E3]/15 flex flex-wrap gap-1.5">
                          <span className="text-[10px] font-bold text-[#86868B] py-0.5">Services:</span>
                          {wo.selectedRepairs.map((item, i) => (
                            <span key={i} className="px-2 py-0.5 bg-white text-[#1D1D1F] border border-[#0071E3]/20 text-[10px] font-bold rounded-md">
                              {item.name} ({item.finalPrice?.toLocaleString()} {systemSettings.currencySymbol})
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Footer Stats: Tech, Financials, Warranty & Printable Invoice */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-[#E5E5EA] text-[11px]">
                    <div className="flex flex-wrap items-center gap-3 text-[#86868B]">
                      <span>
                        <strong>Assigned Tech:</strong>{' '}
                        <span className="text-[#1D1D1F] font-semibold">{wo.assignedTechName || 'Unassigned'}</span>
                      </span>
                      <span>
                        <strong>Warranty:</strong>{' '}
                        <span className="text-[#0071E3] font-bold">{wo.warrantyDays || 90} Days Protection</span>
                      </span>
                    </div>

                    <div className="flex items-center space-x-3">
                      <div className="text-right">
                        <span className="text-[10px] text-[#86868B] uppercase font-bold block leading-none">Total Cost</span>
                        <span className="text-sm font-extrabold text-[#28A745]">
                          {wo.totalAmount?.toLocaleString() || 0} {systemSettings.currencySymbol}
                        </span>
                      </div>

                      {/* Printable Invoice Action */}
                      {onPrintInvoice && (
                        <button
                          type="button"
                          onClick={() => onPrintInvoice(wo)}
                          className="px-3 py-1.5 bg-white hover:bg-blue-50 border border-[#D8E5ED] hover:border-[#0071E3] text-[#0071E3] font-bold text-xs rounded-xl transition-all flex items-center space-x-1.5 cursor-pointer shadow-2xs active:scale-95"
                          title="Print Customer Invoice"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Invoice</span>
                        </button>
                      )}

                      {/* Expand Repair Logs Button */}
                      {(wo.repairLogs?.length || 0) > 0 && (
                        <button
                          type="button"
                          onClick={() => toggleExpandLogs(wo.id)}
                          className="px-2.5 py-1.5 bg-[#F5F5F7] hover:bg-[#E5E5EA] text-[#1D1D1F] font-bold text-xs rounded-xl transition-all flex items-center space-x-1 cursor-pointer"
                        >
                          {isLogsExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          <span>Logs ({wo.repairLogs?.length})</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expandable Status Transition & Audit Timeline Drawer */}
                  {isLogsExpanded && (
                    <div className="mt-3 pt-3 border-t border-dashed border-[#E5E5EA]">
                      <WorkOrderStatusTimeline
                        workOrder={wo}
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-8 text-center text-[#86868B] bg-[#F8F9FA] rounded-2xl border border-dashed border-[#E5E5EA]">
          <Search className="w-6 h-6 text-[#86868B]/50 mx-auto mb-2" />
          <p className="font-semibold text-xs">No repair history matched your search filter.</p>
          <button
            type="button"
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('ALL');
              setDeviceFilter('ALL');
            }}
            className="mt-2 text-xs text-[#0071E3] font-bold hover:underline cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      )}
    </div>
  );
};
