import React, { useState } from 'react';
import { DateFilterState, filterByDateRange } from '../common/DateFilterSelector';
import { CustomDropdownMenu } from '../common/CustomDropdownMenu';
import { StatusBadge } from '../common/StatusBadge';
import { PriorityBadge } from '../common/PriorityBadge';
import { DeviceModelChooserModal } from '../devices/DeviceModelChooserModal';
import { CameraQrScannerModal } from '../common/CameraQrScannerModal';
import { ConfirmDeleteModal } from '../common/ConfirmDeleteModal';
import { TicketDetailInspectorModal } from '../common/TicketDetailInspectorModal';
import { 
  ClipboardList, 
  Search, 
  Plus, 
  Check, 
  X, 
  Sparkles, 
  Smartphone, 
  CircleDot, 
  Cpu,
  Printer, 
  CheckCircle2, 
  Camera, 
  CheckSquare, 
  ShieldCheck, 
  MapPin,
  Monitor, 
  Hand, 
  Scan, 
  Video, 
  Zap, 
  Volume2, 
  Activity, 
  Sun, 
  CreditCard, 
  Mic, 
  Battery, 
  Wifi, 
  Bluetooth, 
  Square, 
  Key,
  Lock, 
  Eye, 
  Compass, 
  RotateCcw, 
  AlertTriangle, 
  HelpCircle,
  ClipboardCheck,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Inbox,
  Ticket,
  SlidersHorizontal,
  LayoutGrid,
  Table as TableIcon,
  Maximize2,
  Calendar,
  User,
  Phone,
  Tag,
  Hash,
  ExternalLink
} from 'lucide-react';
import { 
  WorkOrder, 
  PartItem, 
  Customer, 
  Technician, 
  DiagnosticItemResult,
  SelectedRepairItem,
  AppUser
} from '../../types';
import { get21Diagnostics, get21AfterDiagnostics } from '../../utils/diagnosticUtils';
import { generate10TestTickets, seedSampleTickets } from '../../utils/seedTickets';
import { 
  APPLE_MODEL_SERIES, 
  getAvailableColorsForModel, 
  WARRANTY_OPTIONS, 
  AVAILABLE_REPAIRS, 
  DIAGNOSTIC_NAMES,
  getRealisticColorStyle
} from './deviceData';

export { APPLE_MODEL_SERIES, WARRANTY_OPTIONS, AVAILABLE_REPAIRS, DIAGNOSTIC_NAMES, getAvailableColorsForModel };

interface IntakeWorkOrderModuleProps {
  workOrders: WorkOrder[];
  parts: PartItem[];
  customers: Customer[];
  technicians: Technician[];
  currentUser?: AppUser;
  onSaveWorkOrder: (wo: WorkOrder) => void;
  onSaveBatchWorkOrders?: (workOrders: WorkOrder[]) => void;
  onSelectPrintTag: (wo: WorkOrder) => void;
  onOpenAiAssistant: () => void;
  onDeleteWorkOrder?: (id: string) => void;
  onClearAllWorkOrders?: () => void;
  searchQuery: string;
  setSearchQuery?: (q: string) => void;
  filterStatus?: string;
  setFilterStatus?: (s: string) => void;
  dateFilter?: DateFilterState;
  setDateFilter?: (d: DateFilterState) => void;
  onNavigateToCreateTicket?: () => void;
}

const getDiagnosticIcon = (name: string) => {
  switch (name) {
    case 'Display': return Monitor;
    case 'Touch': return Hand;
    case 'Face ID': return Scan;
    case 'Main Camera': return Camera;
    case 'Front Camera': return Video;
    case 'Charger': return Zap;
    case 'Sound': return Volume2;
    case 'Vibrate': return Activity;
    case 'Flash Light': return Sun;
    case 'SIM': return CreditCard;
    case 'Microphone': return Mic;
    case 'Battery Health': return Battery;
    case 'WiFi': return Wifi;
    case 'Bluetooth': return Bluetooth;
    case 'Backglass': return Square;
    case 'Key': return Key;
    case 'Proximity': return Eye;
    case 'Compass': return Compass;
    case 'Gyroscope': return RotateCcw;
    case 'Panic Full Log': return AlertTriangle;
    case 'Other': default: return HelpCircle;
  }
};

export const IntakeWorkOrderModule: React.FC<IntakeWorkOrderModuleProps> = ({
  workOrders,
  customers,
  technicians,
  currentUser,
  onSaveWorkOrder,
  onSaveBatchWorkOrders,
  onSelectPrintTag,
  onOpenAiAssistant,
  onDeleteWorkOrder,
  onClearAllWorkOrders,
  searchQuery,
  setSearchQuery,
  filterStatus: propFilterStatus,
  setFilterStatus: propSetFilterStatus,
  dateFilter: propDateFilter,
  setDateFilter: propSetDateFilter,
  onNavigateToCreateTicket,
}) => {
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrder | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState<boolean>(false);
  const [ticketToDelete, setTicketToDelete] = useState<WorkOrder | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [localFilterStatus, setLocalFilterStatus] = useState<string>('ALL');
  const [localDateFilter, setLocalDateFilter] = useState<DateFilterState>({ preset: 'all' });

  const filterStatus = propFilterStatus !== undefined ? propFilterStatus : localFilterStatus;
  const setFilterStatus = propSetFilterStatus || setLocalFilterStatus;

  const dateFilter = propDateFilter !== undefined ? propDateFilter : localDateFilter;
  const setDateFilter = propSetDateFilter || setLocalDateFilter;

  // Pagination State for Repair Tickets Roster
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(5);
  const [sortByPriority, setSortByPriority] = useState<boolean>(false);

  // Auto-reset pagination to page 1 whenever search, filter, or page size changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, searchQuery, dateFilter, pageSize, sortByPriority]);

  const handleSeed10TestTickets = async () => {
    // Reset filters and search so all generated tickets are visible
    setFilterStatus('ALL');
    setDateFilter({ preset: 'all' });
    if (setSearchQuery) setSearchQuery('');
    setPageSize(5);
    setCurrentPage(1);

    const testTickets = generate10TestTickets();
    if (onSaveBatchWorkOrders) {
      onSaveBatchWorkOrders(testTickets);
    } else {
      testTickets.forEach((wo) => onSaveWorkOrder(wo));
    }
    await seedSampleTickets();
    alert('✨ 10 Workflow Test Tickets generated successfully!\n\nWorkflow Test Cases:\n1. WO-2026-0001: Receive (Pre-Diag Pending ! Alert Icon)\n2. WO-2026-0002: Receive (Pre-Diag Passed - Ready for In Progress)\n3. WO-2026-0003: In Progress (Active Micro-Soldering)\n4. WO-2026-0004: Pending (Waiting for Supplier Part)\n5. WO-2026-0005: In Progress (Post-Repair QA Pending Alert)\n6. WO-2026-0006: Finished (Post-Repair QA Passed)\n7. WO-2026-0007: Finished (Ready for POS Cashout)\n8. WO-2026-0008: Taken Out (Paid & Delivered)\n9. WO-2026-0009: Customer Not Repair (Declined Quote)\n10. WO-2026-0010: Cant Repair (BER Unfixable Board Damage)');
  };

  const getPriorityWeight = (priority: string) => {
    switch (priority) {
      case 'Urgent':
      case 'Rush': return 4;
      case 'Warranty Redo': return 3;
      case 'B2B Priority': return 2;
      default: return 1;
    }
  };

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'Urgent':
      case 'Rush': return 'border-rose-300 bg-rose-50/40 hover:border-rose-400';
      case 'Warranty Redo': return 'border-purple-300 bg-purple-50/40 hover:border-purple-400';
      case 'B2B Priority': return 'border-amber-300 bg-amber-50/40 hover:border-amber-400';
      default: return 'border-[#E5E5EA] bg-white hover:border-slate-300';
    }
  };

  // Filter list by status, search query, and date range
  const dateFilteredOrders = filterByDateRange<WorkOrder>(workOrders, dateFilter);
  const filteredOrders = dateFilteredOrders.filter((wo) => {
    if (currentUser?.role === 'Technician') {
      const techName = currentUser.technicianName || currentUser.name || '';
      const techId = currentUser.technicianId || '';
      const isAssignedToMe =
        (techId && wo.assignedTechId === techId) ||
        (techName && wo.assignedTechName?.toLowerCase() === techName.toLowerCase()) ||
        (techName && (wo as any).assignedTechnician?.toLowerCase() === techName.toLowerCase());
      if (!isAssignedToMe) return false;
    }
    const matchesFilter = filterStatus === 'ALL' || wo.status === filterStatus;
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      !query ||
      wo.orderNumber.toLowerCase().includes(query) ||
      wo.customerName.toLowerCase().includes(query) ||
      wo.deviceModel.toLowerCase().includes(query) ||
      wo.serialNumber.toLowerCase().includes(query) ||
      (wo.imei && wo.imei.toLowerCase().includes(query));
    return matchesFilter && matchesSearch;
  }).sort((a, b) => {
    if (sortByPriority) {
      const weightDiff = getPriorityWeight(b.priority) - getPriorityWeight(a.priority);
      if (weightDiff !== 0) return weightDiff;
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  // Summary Counts for Stats Bar
  const counts = {
    total: dateFilteredOrders.length,
    receive: dateFilteredOrders.filter(w => w.status === 'Receive').length,
    inProgress: dateFilteredOrders.filter(w => w.status === 'In Progress').length,
    pending: dateFilteredOrders.filter(w => w.status === 'Pending').length,
    finished: dateFilteredOrders.filter(w => w.status === 'Finished').length,
    rush: dateFilteredOrders.filter(w => w.priority === 'Urgent' || w.priority === 'Warranty Redo').length,
  };

  // Pagination Calculations
  const totalPages = Math.ceil(filteredOrders.length / pageSize) || 1;
  const safeCurrentPage = Math.min(Math.max(currentPage, 1), totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredOrders.length);
  const paginatedOrders = filteredOrders.slice(startIndex, endIndex);

  const handleOpenTicketDetail = (wo: WorkOrder) => {
    setSelectedWorkOrder(wo);
    setIsDetailModalOpen(true);
  };

  return (
    <div className="space-y-3 max-w-7xl mx-auto">
      {/* Top Header Banner & Actions */}
      <div className="bg-white border border-[#E5E5EA] rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#E5E5EA]">
          <div className="module-subheader space-y-1">
            <div className="flex items-center space-x-2.5">
              <span className="p-2.5 bg-[#136F9A]/10 text-[#136F9A] rounded-xl">
                <ClipboardList className="w-5 h-5" />
              </span>
              <div>
                <h1 className="text-lg font-black text-[#2C3E50]">
                  Work Intake & Active Tickets
                </h1>
                <p className="text-xs text-[#7F7F7F]">
                  Spacious full-width roster for device intake, hardware diagnostics, and repair progress tracking
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {/* View Mode Switcher */}
            <div className="bg-[#F8FBFD] p-1 rounded-xl border border-[#D8E5ED] flex items-center space-x-1">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-extrabold transition-all flex items-center space-x-1.5 cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-[#136F9A] text-white shadow-2xs'
                    : 'text-[#7F7F7F] hover:text-[#2C3E50]'
                }`}
                title="Table View"
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span>Table</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-extrabold transition-all flex items-center space-x-1.5 cursor-pointer ${
                  viewMode === 'cards'
                    ? 'bg-[#136F9A] text-white shadow-2xs'
                    : 'text-[#7F7F7F] hover:text-[#2C3E50]'
                }`}
                title="Cards Grid View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Grid Cards</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsCameraScannerOpen(true)}
              className="px-3.5 py-2.5 bg-[#1D1D1F] hover:bg-black text-white font-extrabold text-xs rounded-xl shadow-2xs transition-all flex items-center space-x-2 cursor-pointer active:scale-95"
              title="Scan Device Barcode or QR Code"
            >
              <Camera className="w-4 h-4 text-[#0071E3]" />
              <span>Scan Barcode / QR</span>
            </button>
          </div>
        </div>

        {/* Quick Stats Filter Chips */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          {[
            { id: 'ALL', label: 'All Active Tickets', count: counts.total, color: 'text-[#136F9A]', bg: 'bg-blue-50/60', border: 'border-blue-200' },
            { id: 'Receive', label: 'Intake (Receive)', count: counts.receive, color: 'text-[#136F9A]', bg: 'bg-blue-50/60', border: 'border-blue-200' },
            { id: 'In Progress', label: 'In Progress', count: counts.inProgress, color: 'text-[#27B1AE]', bg: 'bg-teal-50/60', border: 'border-teal-200' },
            { id: 'Pending', label: 'Pending Approval', count: counts.pending, color: 'text-[#ED7132]', bg: 'bg-orange-50/60', border: 'border-orange-200' },
            { id: 'Finished', label: 'Ready (Finished)', count: counts.finished, color: 'text-emerald-700', bg: 'bg-emerald-50/60', border: 'border-emerald-200' },
            { id: 'RUSH', label: 'Urgent Priority', count: counts.rush, color: 'text-rose-600', bg: 'bg-rose-50/60', border: 'border-rose-200' },
          ].map((st) => {
            const isSelected = st.id === 'RUSH' ? sortByPriority : filterStatus === st.id;
            return (
              <button
                key={st.id}
                type="button"
                onClick={() => {
                  if (st.id === 'RUSH') {
                    setSortByPriority(!sortByPriority);
                  } else {
                    setFilterStatus(st.id);
                  }
                }}
                className={`min-h-[84px] px-4 py-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? `${st.bg} ${st.border} ring-1 ring-[#136F9A]/20`
                    : `${st.bg} ${st.border} hover:border-[#136F9A]/45`
                }`}
              >
                <span className="text-[10px] font-bold text-[#526375] uppercase tracking-[0.06em] block leading-4">
                  {st.label}
                </span>
                <span className={`text-xl font-extrabold mt-2 leading-none ${st.color}`}>
                  {st.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Full-Width Section: Controls Bar & Ticket List */}
      <div className="bg-white border border-[#E5E5EA] rounded-2xl p-5 space-y-4 shadow-xs flex flex-col justify-between">
        {/* Controls Bar: Items Count, Filters, Clear All, Sort */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[#E5E5EA]">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 font-extrabold text-[#2C3E50] text-sm">
              <Ticket className="w-4 h-4 text-[#136F9A]" />
              <span>Repair Ticket Roster</span>
              <span className="px-2.5 py-0.5 bg-[#136F9A]/10 text-[#136F9A] rounded-full text-xs font-mono font-bold">
                {filteredOrders.length}
              </span>
            </div>

            {filterStatus !== 'ALL' && (
              <div className="flex items-center space-x-1.5 text-xs bg-[#F0F7FB] text-[#136F9A] px-3 py-1 rounded-lg border border-[#136F9A]/20">
                <span>Filter: <strong>{filterStatus}</strong></span>
                <button
                  type="button"
                  onClick={() => setFilterStatus('ALL')}
                  className="text-[10px] font-bold underline hover:opacity-80 cursor-pointer ml-1"
                >
                  Clear
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2 flex-wrap">
            <button
              type="button"
              onClick={handleSeed10TestTickets}
              className="h-8 px-3 bg-[#0071E3]/10 hover:bg-[#0071E3]/20 text-[#0071E3] border border-[#0071E3]/30 text-xs font-bold rounded-lg transition-all inline-flex items-center space-x-1.5 cursor-pointer active:scale-95"
              title="Quickly generate 10 test tickets for testing"
            >
              <Plus className="w-3.5 h-3.5 shrink-0" />
              <span>+ 10 Test Tickets</span>
            </button>

            {workOrders.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`Are you sure you want to remove all ${workOrders.length} tickets?`)) {
                    onClearAllWorkOrders?.();
                    setSelectedWorkOrder(null);
                  }
                }}
                className="h-8 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-lg transition-all inline-flex items-center space-x-1.5 cursor-pointer shadow-2xs"
                title="Remove all tickets"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                <span>Clear All ({workOrders.length})</span>
              </button>
            )}

            {/* Page Size Selector */}
            <div className="h-8 inline-flex items-center space-x-1.5 text-xs text-[#7F7F7F] font-bold">
              <span>Show:</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="h-8 bg-[#F8FBFD] text-[#2C3E50] border border-[#D8E5ED] rounded-lg px-2.5 text-xs focus:outline-none font-bold cursor-pointer"
              >
                <option value={5}>5 per page</option>
                <option value={10}>10 per page</option>
                <option value={15}>15 per page</option>
                <option value={25}>25 per page</option>
              </select>
            </div>

            {/* Sort By Urgency Toggle */}
            <button
              type="button"
              onClick={() => setSortByPriority(!sortByPriority)}
              className={`h-8 px-3 border text-xs font-bold rounded-lg transition-all inline-flex items-center space-x-1.5 cursor-pointer ${
                sortByPriority 
                  ? 'bg-[#136F9A] text-white border-[#136F9A] shadow-2xs' 
                  : 'bg-[#F8FBFD] text-[#2C3E50] border-[#D8E5ED] hover:bg-slate-100'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" />
              <span>Priority First</span>
            </button>
          </div>
        </div>

        {/* View Content: Table or Grid Cards */}
        {filteredOrders.length === 0 ? (
          <div className="p-12 text-center text-xs space-y-4 bg-[#F8FBFD] rounded-2xl border border-dashed border-[#D8E5ED] my-4">
            <div className="w-14 h-14 bg-[#136F9A]/10 text-[#136F9A] rounded-2xl flex items-center justify-center mx-auto shadow-2xs">
              <Inbox className="w-7 h-7" />
            </div>
            <div className="space-y-1 max-w-sm mx-auto">
              <p className="font-extrabold text-base text-[#2C3E50]">No Repair Tickets Found</p>
              <p className="text-xs text-[#7F7F7F]">
                {workOrders.length === 0 
                  ? "There are currently no active repair tickets in the database."
                  : "No tickets match your active status filter or search query."}
              </p>
            </div>
            {workOrders.length === 0 && (
              <div className="pt-2">
                <button
                  onClick={async () => {
                    const { seedSampleTickets } = await import('../../utils/seedTickets');
                    await seedSampleTickets();
                    alert('Sample tickets added!');
                  }}
                  className="px-5 py-2.5 bg-[#136F9A] text-white font-extrabold rounded-xl shadow-xs hover:bg-[#136F9A]/90 transition-all text-xs cursor-pointer"
                >
                  Seed Sample Tickets
                </button>
              </div>
            )}
          </div>
        ) : viewMode === 'table' ? (
          /* TABLE VIEW */
          <div className="overflow-x-auto min-h-[380px] max-h-[calc(100vh-220px)] overflow-y-auto rounded-xl">
            <table className="w-full min-w-[1120px] text-left border-collapse">
              <thead className="sticky top-0 z-20 bg-[#F8FBFD] shadow-2xs">
                <tr className="border-b border-[#E5E5EA] bg-[#F8FBFD] text-[11px] font-black uppercase text-[#7F7F7F] tracking-wider">
                  <th className="py-3 px-4 rounded-tl-xl bg-[#F8FBFD]">Ticket # & Date</th>
                  <th className="py-3 px-4 bg-[#F8FBFD]">Customer & Contact</th>
                  <th className="py-3 px-4 bg-[#F8FBFD]">Device & Serial/IMEI</th>
                  <th className="py-3 px-4 bg-[#F8FBFD]">Symptoms / Service</th>
                  <th className="py-3 px-4 bg-[#F8FBFD]">Assigned Tech</th>
                  <th className="py-3 px-4 bg-[#F8FBFD]">Priority</th>
                  <th className="py-3 px-4 bg-[#F8FBFD]">Stage & Status</th>
                  <th className="py-3 px-4 bg-[#F8FBFD]">Amount</th>
                  <th className="py-3 px-4 text-center rounded-tr-xl bg-[#F8FBFD]">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E5EA] text-xs">
                {paginatedOrders.map((wo) => {
                  const createdDate = new Date(wo.createdAt || Date.now()).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  });
                  const totalAmount = wo.totalAmount || wo.subtotal || 0;

                  return (
                    <tr
                      key={wo.id}
                      onClick={() => handleOpenTicketDetail(wo)}
                      className="hover:bg-[#F8FBFD] transition-colors cursor-pointer group"
                    >
                      {/* Ticket # & Date */}
                      <td className="py-3.5 px-4 font-mono font-black text-[#136F9A]">
                        <p>{wo.orderNumber || wo.id}</p>
                        <span className="text-[10px] font-medium text-[#7F7F7F]">{createdDate}</span>
                      </td>

                      {/* Customer & Contact */}
                      <td className="py-3.5 px-4 text-[#2C3E50]">
                        <div className="space-y-0.5">
                          <span className="block max-w-[140px] truncate font-bold">{wo.customerName}</span>
                          <span className="block font-mono text-[10px] text-[#7F7F7F]">{wo.customerPhone}</span>
                        </div>
                      </td>

                      {/* Device & Serial */}
                      <td className="py-3.5 px-4 text-[#2C3E50]">
                        <div className="space-y-0.5">
                          <span className="block max-w-[150px] truncate font-semibold">{wo.deviceModel}</span>
                          <span className="block max-w-[150px] truncate font-mono text-[10px] text-[#7F7F7F]">
                            {wo.serialNumber || wo.imei ? `SN: ${wo.serialNumber || wo.imei}` : 'No Serial'}
                          </span>
                        </div>
                      </td>

                      {/* Symptoms / Service */}
                      <td className="py-3.5 px-4 text-[#2C3E50]">
                        <p className="line-clamp-1 max-w-[180px]" title={wo.symptomsReported || wo.serviceType}>
                          {wo.symptomsReported || wo.serviceType || 'General Repair'}
                        </p>
                      </td>

                      {/* Assigned Tech */}
                      <td className="py-3.5 px-4 text-[#2C3E50]">
                        <div className="flex items-center space-x-1.5">
                          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-700">
                            {(wo.assignedTechName || 'U').charAt(0)}
                          </div>
                          <span className="max-w-[100px] truncate font-medium">{wo.assignedTechName || 'Unassigned'}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <PriorityBadge priority={wo.priority} size="xs" />
                      </td>

                      <td className="py-3.5 px-4">
                        <StatusBadge status={wo.status} size="xs" />
                      </td>

                      {/* Amount & payment */}
                      <td className="py-3.5 px-4">
                        <p className="font-mono font-black text-[#2C3E50]">{totalAmount.toLocaleString()} MMK</p>
                        <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${
                          wo.isPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {wo.isPaid ? 'Paid' : 'Unpaid'}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center space-x-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => handleOpenTicketDetail(wo)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--blue-tint)] text-[var(--primary)] transition-colors hover:bg-[var(--primary)] hover:text-white"
                            title="View Ticket Status"
                            aria-label={`View status for ${wo.orderNumber || wo.id}`}
                          >
                            <Maximize2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* GRID CARDS VIEW */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 min-h-[380px] content-start">
            {paginatedOrders.map((wo) => {
              const woColorStyle = getRealisticColorStyle(wo.deviceColor);
              const diag21 = get21Diagnostics(wo.beforeDiagnostics, wo.symptomsReported, wo.intakeChecklist);
              const passCount = diag21.filter((d) => d.status === 'Pass').length;
              const failCount = diag21.filter((d) => d.status === 'Fail').length;

              return (
                <div
                  key={wo.id}
                  onClick={() => handleOpenTicketDetail(wo)}
                  className={`p-4 rounded-2xl border text-xs cursor-pointer transition-all space-y-3 hover:shadow-md ${getPriorityStyle(wo.priority)}`}
                >
                  <div className="flex justify-between items-center pb-2 border-b border-[#E5E5EA]">
                    <span className="font-mono font-black text-[#136F9A] bg-[#136F9A]/10 px-2.5 py-1 rounded-md text-xs">
                      {wo.orderNumber}
                    </span>

                    <div className="flex items-center space-x-1.5">
                      <PriorityBadge priority={wo.priority} size="xs" />
                      <StatusBadge status={wo.status} size="xs" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between items-center font-extrabold text-sm text-[#2C3E50]">
                      <span>{wo.deviceModel}</span>
                      <div className="flex items-center space-x-1.5">
                        <span className="text-xs text-[#7F7F7F] font-medium">{wo.deviceColor || 'Standard'}</span>
                        <span 
                          className={`w-3.5 h-3.5 rounded-full border border-white shadow-2xs ${woColorStyle.border}`}
                          style={{ background: woColorStyle.gradient }}
                        />
                      </div>
                    </div>
                    <p className="text-xs text-[#7F7F7F]">
                      Customer: <strong className="text-[#2C3E50]">{wo.customerName}</strong> ({wo.customerPhone})
                    </p>
                  </div>

                  <div className="p-2.5 bg-[#F8FBFD] border border-[#D8E5ED] rounded-xl flex items-center justify-between text-xs">
                    <span className="font-bold text-[#2C3E50] flex items-center space-x-1.5">
                      <User className="w-4 h-4 text-[#136F9A]" />
                      <span>Assigned Tech</span>
                    </span>
                    <span className="font-bold text-xs text-[#2C3E50] bg-white border border-[#D8E5ED] px-2.5 py-0.5 rounded-lg shadow-2xs">
                      {wo.assignedTechName || 'Unassigned'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-[#E5E5EA]">
                    <div>
                      <span className="block text-[10px] text-[#7F7F7F] uppercase font-bold">Total Estimate</span>
                      <span className="font-mono font-black text-sm text-[#136F9A]">
                        {(wo.totalAmount || wo.subtotal || 0).toLocaleString()} MMK
                      </span>
                    </div>

                    <div className="flex items-center space-x-1.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => handleOpenTicketDetail(wo)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--blue-tint)] text-[var(--primary)] transition-colors hover:bg-[var(--primary)] hover:text-white"
                        title="View Ticket Status"
                        aria-label={`View status for ${wo.orderNumber || wo.id}`}
                      >
                        <Maximize2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination Bar */}
        {filteredOrders.length > 0 && (
          <div className="pt-4 border-t border-[#E5E5EA] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#7F7F7F]">
            <span className="font-bold">
              Showing <strong className="text-[#2C3E50]">{startIndex + 1}-{endIndex}</strong> of <strong className="text-[#2C3E50]">{filteredOrders.length}</strong> repair tickets
            </span>

            <div className="flex items-center space-x-1.5">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={safeCurrentPage === 1}
                className="p-2 rounded-xl border border-[#E5E5EA] hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent text-[#2C3E50] transition-all cursor-pointer"
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
                        {showEllipsis && <span className="text-xs text-[#7F7F7F] px-1">...</span>}
                        <button
                          type="button"
                          onClick={() => setCurrentPage(p)}
                          className={`w-8 h-8 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                            safeCurrentPage === p
                              ? 'bg-[#136F9A] text-white shadow-2xs'
                              : 'text-[#2C3E50] hover:bg-slate-100 border border-[#E5E5EA]'
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
                className="p-2 rounded-xl border border-[#E5E5EA] hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent text-[#2C3E50] transition-all cursor-pointer"
                title="Next Page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* FULL-SCREEN TICKET DETAIL INSPECTOR MODAL */}
      {isDetailModalOpen && selectedWorkOrder && (
        <div className="hidden fixed inset-0 bg-black/45 z-50 items-center justify-center p-3 sm:p-5 animate-fadeIn">
          <div className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-xl overflow-hidden">
            {/* Modal Header */}
            <div className="px-4 sm:px-5 py-3 border-b border-[var(--border)] bg-[var(--card-bg)] flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <h2 className="text-sm font-black text-[var(--text-main)]">Ticket details</h2>
                <span className="font-mono text-[11px] font-bold text-[var(--text-muted)] whitespace-nowrap">
                  {selectedWorkOrder.orderNumber}
                </span>
              </div>

              <div className="flex items-center gap-1 shrink-0 sm:justify-end">
                <button
                  type="button"
                  onClick={() => onSelectPrintTag(selectedWorkOrder)}
                  aria-label="Print ticket sticker"
                  title="Print sticker"
                  className="group relative flex h-9 w-9 items-center justify-center rounded-lg border border-transparent text-[var(--text-muted)] transition-colors hover:border-[var(--border)] hover:bg-[var(--bg)] hover:text-[var(--primary)] cursor-pointer"
                >
                  <Printer className="h-4 w-4" />
                  <span className="pointer-events-none absolute right-0 top-full z-20 mt-2 hidden whitespace-nowrap rounded-md bg-[var(--text-main)] px-2 py-1 text-[10px] font-bold text-[var(--card-bg)] shadow-md group-hover:block">
                    Print sticker
                  </span>
                </button>

                {currentUser?.role === 'Admin' ? (
                  <button
                    type="button"
                    aria-label="Delete ticket"
                    title="Delete ticket"
                    onClick={() => {
                      if (window.confirm(`Are you sure you want to delete ticket ${selectedWorkOrder.orderNumber || selectedWorkOrder.id}?`)) {
                        onDeleteWorkOrder?.(selectedWorkOrder.id);
                        setIsDetailModalOpen(false);
                        setSelectedWorkOrder(null);
                      }
                    }}
                    className="group relative flex h-9 w-9 items-center justify-center rounded-lg border border-transparent text-[var(--text-muted)] transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="pointer-events-none absolute right-0 top-full z-20 mt-2 hidden whitespace-nowrap rounded-md bg-[var(--text-main)] px-2 py-1 text-[10px] font-bold text-[var(--card-bg)] shadow-md group-hover:block">
                      Delete ticket
                    </span>
                  </button>
                ) : (
                  <span
                    aria-label="Delete locked"
                    title="Delete locked"
                    className="group relative flex h-9 w-9 items-center justify-center rounded-lg text-[var(--text-muted)] opacity-50 cursor-not-allowed"
                  >
                    <Lock className="h-4 w-4" />
                    <span className="pointer-events-none absolute right-0 top-full z-20 mt-2 hidden whitespace-nowrap rounded-md bg-[var(--text-main)] px-2 py-1 text-[10px] font-bold text-[var(--card-bg)] shadow-md group-hover:block">
                      Delete locked
                    </span>
                  </span>
                )}

                <button
                  type="button"
                  aria-label="Close ticket details"
                  title="Close"
                  onClick={() => setIsDetailModalOpen(false)}
                  className="ml-1 flex h-9 w-9 items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--bg)] hover:text-[var(--text-main)] cursor-pointer"
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="grid flex-1 grid-cols-1 overflow-y-auto md:grid-cols-[250px_minmax(0,1fr)]">
              <aside className="border-b border-[var(--border)] bg-[var(--bg)] p-4 md:border-b-0 md:border-r md:p-5">
                <div className="space-y-5">
                  <div>
                    <div className="mb-2 flex flex-wrap items-center gap-1.5">
                      {selectedWorkOrder.priority === 'Urgent' && (
                        <span className="inline-flex h-5 items-center gap-1.5 rounded-md border border-rose-200 bg-rose-50 px-2 text-[9px] font-extrabold uppercase tracking-[0.08em] text-rose-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                          Urgent
                        </span>
                      )}
                      <span className="inline-flex h-5 items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--card-bg)] px-2 text-[9px] font-extrabold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                        <span className="h-1.5 w-1.5 rounded-full bg-[var(--primary)]" />
                        {selectedWorkOrder.status}
                      </span>
                    </div>
                    <h3 className="text-lg font-black leading-6 text-[var(--text-main)]">{selectedWorkOrder.deviceModel}</h3>
                    <p className="mt-1 text-xs font-bold text-[var(--text-main)]">{selectedWorkOrder.customerName}</p>
                    {selectedWorkOrder.customerAddress && (
                      <p className="mt-0.5 text-[11px] leading-4 text-[var(--text-muted)]">{selectedWorkOrder.customerAddress}</p>
                    )}
                  </div>

              {/* Spec Matrix Grid */}
              <dl className="divide-y divide-[var(--border)] border-y border-[var(--border)] text-xs">
                <div className="py-2.5">
                  <span className="block text-[10px] font-extrabold text-[var(--text-muted)] uppercase tracking-wider">Contact</span>
                  <span className="font-bold text-[var(--primary)] block mt-1 truncate">
                    {selectedWorkOrder.customerPhone || 'No phone'}
                  </span>
                </div>
                <div className="py-2.5">
                  <span className="block text-[10px] font-extrabold text-[var(--text-muted)] uppercase tracking-wider">Serial / IMEI</span>
                  <span className="font-mono text-xs font-bold text-[var(--text-main)] block mt-1 truncate">
                    {selectedWorkOrder.serialNumber || selectedWorkOrder.imei || 'N/A'}
                  </span>
                </div>
                <div className="py-2.5">
                  <span className="block text-[10px] font-extrabold text-[var(--text-muted)] uppercase tracking-wider">Technician</span>
                  <span className="font-bold text-[var(--text-main)] block mt-1 truncate">
                    {selectedWorkOrder.assignedTechName || 'Unassigned'}
                  </span>
                </div>
                <div className="py-2.5">
                  <span className="block text-[10px] font-extrabold text-[var(--text-muted)] uppercase tracking-wider">Intake Date</span>
                  <span className="font-bold text-[var(--text-main)] block mt-1 truncate">
                    {new Date(selectedWorkOrder.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="py-2.5">
                  <span className="block text-[10px] font-extrabold text-[var(--text-muted)] uppercase tracking-wider">Total Estimate</span>
                  <span className="font-mono font-black text-base text-[var(--primary)] block mt-0.5">
                    {(selectedWorkOrder.totalAmount || selectedWorkOrder.subtotal || 0).toLocaleString()} MMK
                  </span>
                </div>
              </dl>
                </div>
              </aside>

              <div className="min-w-0 space-y-4 p-4 sm:p-5">

              {/* Reported Symptoms (Filtered to exclude duplicate repair summaries) */}
              {(() => {
                const rawNotes = selectedWorkOrder.symptomsReported || '';
                const cleanNotes = rawNotes
                  .split('\n')
                  .filter(line => {
                    const t = line.trim();
                    if (!t) return false;
                    if (t.startsWith('Requested Repairs:')) return false;
                    if (t.toLowerCase().startsWith('town / city:')) return false;
                    if (t.toLowerCase().startsWith('town/city:')) return false;
                    return true;
                  })
                  .map(line => line.replace(/^Notes:\s*/i, '').trim())
                  .filter(Boolean)
                  .join('\n')
                  .trim();

                if (!cleanNotes) return null;

                return (
                  <div className="p-3 bg-[var(--bg)] border border-[var(--border)] rounded-lg space-y-1 text-xs">
                    <span className="font-black text-[var(--text-main)] block text-sm">Reported issue</span>
                    <p className="text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed font-medium">{cleanNotes}</p>
                  </div>
                );
              })()}

              {/* PRIORITY DIAGNOSTIC SUMMARY */}
              {(() => {
                  const beforeList = get21Diagnostics(selectedWorkOrder.beforeDiagnostics, selectedWorkOrder.symptomsReported, selectedWorkOrder.intakeChecklist);
                  const afterList = get21AfterDiagnostics(selectedWorkOrder.afterDiagnostics, selectedWorkOrder.beforeDiagnostics, selectedWorkOrder.symptomsReported, selectedWorkOrder.intakeChecklist);
                  const diagnosticRows = beforeList.map((beforeItem, index) => ({
                    beforeItem,
                    afterItem: afterList[index] || beforeItem,
                  }));
                  const statusClass = (status: string) => {
                    if (status === 'Pass') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
                    if (status === 'Fail') return 'border-rose-200 bg-rose-50 text-rose-700';
                    return 'border-[var(--border)] bg-[var(--bg)] text-[var(--text-muted)]';
                  };

                  return (
                    <section className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-3">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] pb-2.5">
                        <span className="text-xs font-black text-[var(--text-main)]">
                          21-Point Hardware Diagnostic Comparison
                        </span>
                        <div className="flex items-center gap-3 text-[9px] font-bold text-[var(--text-muted)]">
                          <span className="flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-[var(--primary)]" />
                            Before intake
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
                            After QA
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {diagnosticRows.map(({ beforeItem, afterItem }, index) => (
                          <div
                            key={beforeItem.id || beforeItem.name}
                            className={`flex min-h-12 items-center justify-between gap-2 rounded-lg border px-2.5 py-2 ${
                              beforeItem.status === 'Fail' || afterItem.status === 'Fail'
                                ? 'border-rose-200 bg-rose-50/70'
                                : 'border-[var(--border)] bg-[var(--card-bg)]'
                            }`}
                          >
                            <div className="min-w-0">
                              <p className="truncate text-xs font-extrabold text-[var(--text-main)]">
                                <span className="mr-2 font-mono text-[10px] text-[var(--text-muted)]">
                                  {index + 1}.
                                </span>
                                {beforeItem.name}
                              </p>
                              {(afterItem.note || beforeItem.note) && (
                                <p className="mt-0.5 max-w-32 truncate pl-5 text-[9px] italic text-[var(--text-muted)]">
                                  {afterItem.note || beforeItem.note}
                                </p>
                              )}
                            </div>
                            <div className="flex shrink-0 items-center gap-1">
                              <span className={`inline-flex min-w-14 justify-center rounded-md border px-2 py-1 text-[9px] font-extrabold uppercase ${statusClass(beforeItem.status)}`}>
                                {beforeItem.status}
                              </span>
                              <span className="text-[9px] font-bold text-[var(--text-muted)]">→</span>
                              <span className={`inline-flex min-w-14 justify-center rounded-md border px-2 py-1 text-[9px] font-extrabold uppercase ${statusClass(afterItem.status)}`}>
                                {afterItem.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  );
                })()}
            </div>
            </div>

            {/* Modal Footer */}
            <div className="px-4 sm:px-5 py-3 border-t border-[var(--border)] bg-[var(--card-bg)] flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--text-muted)]">
                Repair ticket record
              </span>
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="px-4 py-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-extrabold text-xs rounded-lg transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {isDetailModalOpen && selectedWorkOrder && (
        <TicketDetailInspectorModal
          workOrder={selectedWorkOrder}
          currentUser={currentUser}
          onClose={() => setIsDetailModalOpen(false)}
          onPrint={onSelectPrintTag}
          onDelete={onDeleteWorkOrder}
        />
      )}
      {/* Confirm Delete Modal */}
      <ConfirmDeleteModal
        isOpen={!!ticketToDelete}
        title="Move Ticket to Recycle Bin?"
        itemName={ticketToDelete ? `${ticketToDelete.orderNumber || ticketToDelete.id} - ${ticketToDelete.customerName} (${ticketToDelete.deviceModel})` : ''}
        description="This ticket will be removed from the active repair intake roster and moved to the Recycle Bin. You can restore it anytime from the Recycle Bin."
        confirmLabel="Move to Recycle Bin"
        onConfirm={() => {
          if (ticketToDelete && onDeleteWorkOrder) {
            onDeleteWorkOrder(ticketToDelete.id);
          }
        }}
        onClose={() => setTicketToDelete(null)}
      />

      {/* Camera QR & Barcode Scanner Modal */}
      <CameraQrScannerModal
        isOpen={isCameraScannerOpen}
        onClose={() => setIsCameraScannerOpen(false)}
        onScanSuccess={(scannedText) => {
          if (onNavigateToCreateTicket) {
            onNavigateToCreateTicket();
          }
        }}
      />
    </div>
  );
};
