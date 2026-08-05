import React, { useState } from 'react';
import {
  ChevronsRight,
  Eye,
  EyeOff, 
  ChevronRight, 
  ChevronLeft, 
  MessageSquare, 
  Sparkles, 
  User, 
  Clock, 
  Timer,
  AlertCircle,
  AlertTriangle,
  X,
  Plus,
  Printer,
  CheckCircle2,
  FileText,
  DollarSign,
  Coins,
  Search,
  Filter,
  UserCheck,
  ShieldCheck,
  Camera,
  Layers,
  Phone,
  ClipboardCheck,
  Trash2,
  BellRing,
  Stethoscope,
  Key,
  Lock,
  Barcode,
  Palette,
  Minus,
  XCircle,
  MapPin
} from 'lucide-react';
import { 
  WorkOrder, 
  WorkOrderStatus, 
  Technician, 
  RepairLogEntry, 
  DiagnosticItemResult,
  DiagnosticStatus,
  SystemSettings,
  AppUser
} from '../../types';
import { Button } from '../ui';
import { ActiveFilterChips } from '../common/ActiveFilterChips';
import { 
  get21Diagnostics, 
  get21AfterDiagnostics, 
  checkIsDiagnosticCompleted,
  checkIsBeforeDiagnosticNeeded,
  checkIsAfterDiagnosticNeeded,
  checkIsBeforeDiagnosticCompleted,
  checkIsAfterDiagnosticCompleted
} from '../../utils/diagnosticUtils';
import { getActivePaymentMethods } from '../../data/seedData';
import { CustomDropdownMenu } from '../common/CustomDropdownMenu';
import { DateFilterState, filterByDateRange, isDateMatchingFilter } from '../common/DateFilterSelector';
import { StatusBadge } from '../common/StatusBadge';
import { PriorityBadge } from '../common/PriorityBadge';
import { WorkOrderStatusTimeline } from '../common/WorkOrderStatusTimeline';
import { useLanguage } from '../../context/LanguageContext';
import { CustomerNotificationModal } from '../common/CustomerNotificationModal';
import { TicketDetailInspectorModal } from '../common/TicketDetailInspectorModal';
import { toast } from '../../lib/toast';

interface StatusPipelineViewProps {
  workOrders: WorkOrder[];
  technicians: Technician[];
  systemSettings?: SystemSettings;
  currentUser?: AppUser;
  onUpdateWorkOrderStatus: (workOrderId: string, newStatus: WorkOrderStatus) => void;
  onSaveWorkOrder?: (wo: WorkOrder) => void;
  onDeleteWorkOrder?: (id: string) => void;
  onClearAllWorkOrders?: () => void;
  searchQuery?: string;
  setSearchQuery?: (q: string) => void;
  statusFilter?: string;
  setStatusFilter?: (s: string) => void;
  techFilter?: string;
  setTechFilter?: (t: string) => void;
  dateFilter?: DateFilterState;
  setDateFilter?: (d: DateFilterState) => void;
  showBottlenecksOnly?: boolean;
  setShowBottlenecksOnly?: (b: boolean) => void;
  showAllStages?: boolean;
  setShowAllStages?: (v: boolean) => void;
  showBeforeNeedsDiagOnly?: boolean;
  setShowBeforeNeedsDiagOnly?: (v: boolean) => void;
  showNeedsDiagOnly?: boolean;
  setShowNeedsDiagOnly?: (v: boolean) => void;
  onSelectPrintTag?: (wo: WorkOrder) => void;
  onOpenNewWorkOrder?: (prefill?: any) => void;
}

export const KANBAN_STAGES: { id: WorkOrderStatus; title: string; subtitle: string; color: string; badgeColor: string }[] = [
  { id: 'Receive', title: 'Receive', subtitle: 'New Intake', color: 'border-blue-200 bg-blue-50/40', badgeColor: 'bg-brand text-white font-extrabold tracking-wide' },
  { id: 'In Progress', title: 'In Progress', subtitle: 'Repair Active', color: 'border-purple-200 bg-purple-50/40', badgeColor: 'bg-purple-700 text-white font-extrabold tracking-wide' },
  { id: 'Pending', title: 'Pending', subtitle: 'Waiting Parts/Client', color: 'border-amber-200 bg-amber-50/40', badgeColor: 'bg-amber-600 text-white font-extrabold' },
  { id: 'Finished', title: 'Finished', subtitle: 'QA Passed / Ready', color: 'border-emerald-200 bg-emerald-50/40', badgeColor: 'bg-emerald-600 text-white font-extrabold' },
  { id: 'Taken Out', title: 'Taken Out', subtitle: 'Paid & Returned', color: 'border-slate-200 bg-slate-100/50', badgeColor: 'bg-slate-700 text-white font-extrabold' },
  { id: 'Cant Repair', title: 'Cant Repair', subtitle: 'Declined / Unfixable', color: 'border-rose-200 bg-rose-50/40', badgeColor: 'bg-rose-600 text-white font-extrabold' },
  { id: 'Customer Not Repair', title: 'Customer Not Repair', subtitle: 'Cancelled by Client', color: 'border-orange-200 bg-orange-50/40', badgeColor: 'bg-orange-600 text-white font-extrabold' },
];

export const StatusPipelineView: React.FC<StatusPipelineViewProps> = ({
  workOrders,
  technicians,
  systemSettings,
  currentUser,
  onUpdateWorkOrderStatus,
  onSaveWorkOrder,
  onDeleteWorkOrder,
  onClearAllWorkOrders,
  searchQuery: propSearchQuery,
  setSearchQuery: propSetSearchQuery,
  statusFilter: propStatusFilter,
  setStatusFilter: propSetStatusFilter,
  techFilter: propTechFilter,
  setTechFilter: propSetTechFilter,
  dateFilter: propDateFilter,
  setDateFilter: propSetDateFilter,
  showBottlenecksOnly: propShowBottlenecksOnly,
  setShowBottlenecksOnly: propSetShowBottlenecksOnly,
  showAllStages: propShowAllStages,
  setShowAllStages: propSetShowAllStages,
  showBeforeNeedsDiagOnly: propShowBeforeNeedsDiagOnly,
  setShowBeforeNeedsDiagOnly: propSetShowBeforeNeedsDiagOnly,
  showNeedsDiagOnly: propShowNeedsDiagOnly,
  setShowNeedsDiagOnly: propSetShowNeedsDiagOnly,
  onSelectPrintTag,
  onOpenNewWorkOrder,
}) => {
  const { t } = useLanguage();
  const activePaymentMethods = getActivePaymentMethods(systemSettings).filter((m) => m.enabled);
  // Search & Filter State (Controlled or Local)
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const [localStatusFilter, setLocalStatusFilter] = useState<string>('ALL');
  const [localTechFilter, setLocalTechFilter] = useState<string>('ALL');
  // Mobile kanban horizontal-scroll affordance (Cant Repair / Customer Not Repair live at the far right)
  const [kanbanAtEnd, setKanbanAtEnd] = useState(false);
  // Hide the exception columns (Cant Repair / Customer Not Repair) by default — Show All reveals them
  const [localDateFilter, setLocalDateFilter] = useState<DateFilterState>({ preset: 'all' });
  const [localShowBottlenecksOnly, setLocalShowBottlenecksOnly] = useState<boolean>(false);
  const [localShowAllStages, setLocalShowAllStages] = useState(false);
  const [localShowBeforeNeedsDiagOnly, setLocalShowBeforeNeedsDiagOnly] = useState(false);
  const [localShowNeedsDiagOnly, setLocalShowNeedsDiagOnly] = useState(false);

  const searchQuery = propSearchQuery !== undefined ? propSearchQuery : localSearchQuery;
  const setSearchQuery = propSetSearchQuery || setLocalSearchQuery;

  const statusFilter = propStatusFilter !== undefined ? propStatusFilter : localStatusFilter;
  const setStatusFilter = propSetStatusFilter || setLocalStatusFilter;

  const techFilter = propTechFilter !== undefined ? propTechFilter : localTechFilter;
  const setTechFilter = propSetTechFilter || setLocalTechFilter;

  const dateFilter = propDateFilter !== undefined ? propDateFilter : localDateFilter;
  const setDateFilter = propSetDateFilter || setLocalDateFilter;

  const showBottlenecksOnly = propShowBottlenecksOnly !== undefined ? propShowBottlenecksOnly : localShowBottlenecksOnly;
  const setShowBottlenecksOnly = propSetShowBottlenecksOnly || setLocalShowBottlenecksOnly;

  const showAllStages = propShowAllStages !== undefined ? propShowAllStages : localShowAllStages;
  const setShowAllStages = propSetShowAllStages || setLocalShowAllStages;
  const showBeforeNeedsDiagOnly = propShowBeforeNeedsDiagOnly !== undefined ? propShowBeforeNeedsDiagOnly : localShowBeforeNeedsDiagOnly;
  const setShowBeforeNeedsDiagOnly = propSetShowBeforeNeedsDiagOnly || setLocalShowBeforeNeedsDiagOnly;
  const showNeedsDiagOnly = propShowNeedsDiagOnly !== undefined ? propShowNeedsDiagOnly : localShowNeedsDiagOnly;
  const setShowNeedsDiagOnly = propSetShowNeedsDiagOnly || setLocalShowNeedsDiagOnly;

  // Modals
  const [detailModalWo, setDetailModalWo] = useState<WorkOrder | null>(null);
  const [addLogModalWo, setAddLogModalWo] = useState<WorkOrder | null>(null);
  const [assignTechModalWo, setAssignTechModalWo] = useState<WorkOrder | null>(null);
  const [checkoutModalWo, setCheckoutModalWo] = useState<WorkOrder | null>(null);
  const [afterDiagModalWo, setAfterDiagModalWo] = useState<WorkOrder | null>(null);
  const [isNotifModalOpen, setIsNotifModalOpen] = useState(false);
  const [notifWo, setNotifWo] = useState<WorkOrder | null>(null);

  // Manual Repair Log Form State
  const [logText, setLogText] = useState('');

  // Checkout Payment Form State
  const [paidAmountInput, setPaidAmountInput] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Credit Card' | 'Cash' | 'Apple Pay' | 'Split Payment'>('Credit Card');

  // After-Repair Diagnostic Form State
  const [afterDiagnostics, setAfterDiagnostics] = useState<DiagnosticItemResult[]>([]);
  const [afterSummaryNote, setAfterSummaryNote] = useState('');

  // Reception Soft Alert Modal State
  const [pendingDiagAlertWo, setPendingDiagAlertWo] = useState<{ wo: WorkOrder; newStatus: WorkOrderStatus } | null>(null);
  const [pendingBeforeDiagAlertWo, setPendingBeforeDiagAlertWo] = useState<{ wo: WorkOrder; newStatus: WorkOrderStatus } | null>(null);

  // Drag & Drop State
  const [draggedWoId, setDraggedWoId] = useState<string | null>(null);

  // Bottleneck Helper Functions
  const getHoursInStatus = (wo: WorkOrder) => {
    const refTime = Math.max(Date.now(), new Date('2026-07-22T08:46:00Z').getTime());
    const updatedTime = new Date(wo.updatedAt || wo.createdAt).getTime();
    if (isNaN(updatedTime)) return 0;
    return Math.max(0, Math.floor((refTime - updatedTime) / (1000 * 60 * 60)));
  };

  const getIsStagnant = (wo: WorkOrder) => {
    if (wo.status === 'Taken Out' || wo.status === 'Finished' || wo.status === 'Cant Repair' || wo.status === 'Customer Not Repair') return false;
    return getHoursInStatus(wo) >= 48;
  };

  const getRepairSummary = (wo: WorkOrder) => {
    if (wo.selectedRepairs && wo.selectedRepairs.length > 0) {
      return wo.selectedRepairs.map((r) => r.name).join(', ');
    }
    if (wo.lineItems && wo.lineItems.length > 0) {
      const items = wo.lineItems.map((l) => l.description || l.partName).filter(Boolean);
      if (items.length > 0) return items.join(', ');
    }
    return wo.symptomsReported || 'General Device Repair & Inspection';
  };

  const totalStagnantCount = workOrders.filter((w) => getIsStagnant(w)).length;

  const getCardStyle = (status: WorkOrderStatus, isStagnant: boolean) => {
    if (isStagnant) {
      return 'bg-amber-50/50 border border-amber-300 shadow-2xs hover:border-amber-500 hover:ring-2 hover:ring-amber-400/30 transition-all duration-200';
    }
    switch (status) {
      case 'Receive':
        return 'bg-white border border-line shadow-2xs hover:border-brand hover:ring-2 hover:ring-brand/20 transition-all duration-200';
      case 'In Progress':
        return 'bg-white border border-line shadow-2xs hover:border-[#AF52DE] hover:ring-2 hover:ring-[#AF52DE]/20 transition-all duration-200';
      case 'Pending':
        return 'bg-white border border-line shadow-2xs hover:border-amber-500 hover:ring-2 hover:ring-amber-500/20 transition-all duration-200';
      case 'Finished':
        return 'bg-white border border-line shadow-2xs hover:border-success hover:ring-2 hover:ring-success/20 transition-all duration-200';
      case 'Cant Repair':
        return 'bg-white border border-line shadow-2xs hover:border-rose-400 hover:ring-2 hover:ring-rose-400/20 transition-all duration-200';
      case 'Customer Not Repair':
        return 'bg-white border border-line shadow-2xs hover:border-orange-400 hover:ring-2 hover:ring-orange-400/20 transition-all duration-200';
      default:
        return 'bg-white border border-line shadow-2xs hover:border-slate-400 hover:ring-2 hover:ring-slate-400/20 transition-all duration-200';
    }
  };

  // Handlers
  const handleAddRepairLog = () => {
    if (!addLogModalWo || !logText.trim()) return;
    const formattedDate = new Date().toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true
    });

    const newLog: RepairLogEntry = {
      id: `log-${Date.now()}`,
      timestamp: formattedDate,
      author: 'Technician Update',
      note: logText,
      statusChange: addLogModalWo.status
    };

    const updatedWo: WorkOrder = {
      ...addLogModalWo,
      repairLogs: [newLog, ...(addLogModalWo.repairLogs || [])],
      updatedAt: new Date().toISOString()
    };

    if (onSaveWorkOrder) onSaveWorkOrder(updatedWo);
    setAddLogModalWo(null);
    setLogText('');
    toast.success('Repair log entry saved to ticket.', 'Log Saved');
  };

  const handleAssignTechnician = (techId: string) => {
    if (!assignTechModalWo) return;
    const tech = technicians.find(t => t.id === techId);
    const formattedDate = new Date().toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true
    });

    const newLog: RepairLogEntry = {
      id: `log-${Date.now()}`,
      timestamp: formattedDate,
      author: 'System Assignment',
      note: `Assigned technician updated to ${tech?.name || 'Unassigned'}.`,
    };

    const updatedWo: WorkOrder = {
      ...assignTechModalWo,
      assignedTechId: techId,
      assignedTechName: tech?.name,
      repairLogs: [newLog, ...(assignTechModalWo.repairLogs || [])],
      updatedAt: new Date().toISOString()
    };

    if (onSaveWorkOrder) onSaveWorkOrder(updatedWo);
    setAssignTechModalWo(null);
  };

  const handleConfirmCheckout = () => {
    if (!checkoutModalWo) return;
    const amount = Number(paidAmountInput) || checkoutModalWo.totalAmount;
    const formattedDate = new Date().toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true
    });

    const newLog: RepairLogEntry = {
      id: `log-${Date.now()}`,
      timestamp: formattedDate,
      author: 'POS Checkout',
      note: `Customer completed payment of ${amount.toLocaleString()} MMK via ${paymentMethod}. Ticket closed and device returned.`,
      statusChange: 'Taken Out'
    };

    const updatedWo: WorkOrder = {
      ...checkoutModalWo,
      status: 'Taken Out',
      isPaid: true,
      paidAmount: amount,
      paymentMethod,
      repairLogs: [newLog, ...(checkoutModalWo.repairLogs || [])],
      updatedAt: new Date().toISOString()
    };

    if (onSaveWorkOrder) onSaveWorkOrder(updatedWo);
    onUpdateWorkOrderStatus(checkoutModalWo.id, 'Taken Out');
    setCheckoutModalWo(null);
    toast.success(`Payment of ${amount.toLocaleString()} MMK confirmed. Ticket moved to Taken Out.`, 'Payment Confirmed');
  };

  const handleSaveAfterDiagnostic = () => {
    if (!afterDiagModalWo) return;
    const formattedDate = new Date().toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true
    });

    const newLog: RepairLogEntry = {
      id: `log-${Date.now()}`,
      timestamp: formattedDate,
      author: 'QA Inspector',
      note: `After-repair diagnostic inspection recorded. Summary: ${afterSummaryNote || 'All post-check items verified.'}`,
    };

    const updatedWo: WorkOrder = {
      ...afterDiagModalWo,
      afterDiagnostics,
      afterRepairSummary: afterSummaryNote,
      repairLogs: [newLog, ...(afterDiagModalWo.repairLogs || [])],
      updatedAt: new Date().toISOString()
    };

    if (onSaveWorkOrder) onSaveWorkOrder(updatedWo);
    setAfterDiagModalWo(null);
    toast.success('After-repair diagnostic inspection saved.', 'Inspection Saved');
  };

  // Check if active filters exist
  const hasActiveFilters =
    statusFilter !== 'ALL' ||
    techFilter !== 'ALL' ||
    (dateFilter && dateFilter.preset !== 'all') ||
    !!searchQuery ||
    showBottlenecksOnly;

  const handleResetFilters = () => {
    setStatusFilter('ALL');
    setTechFilter('ALL');
    if (setDateFilter) setDateFilter({ preset: 'all' });
    setSearchQuery('');
    setShowBottlenecksOnly(false);
  };

  const isTechnicianUser = currentUser?.role === 'Technician';
  const myTechName = currentUser?.technicianName || currentUser?.name || '';
  const myTechId = currentUser?.technicianId || '';

  // Filter Work Orders
  const beforeNeedsDiagTotalCount = workOrders.filter((wo) => checkIsBeforeDiagnosticNeeded(wo)).length;
  const afterNeedsDiagTotalCount = workOrders.filter((wo) => checkIsAfterDiagnosticNeeded(wo)).length;

  const filteredWorkOrders = workOrders.filter(wo => {
    // If active user is a Technician, restrict to assigned repair tasks only
    if (isTechnicianUser) {
      const isAssignedToMe =
        (myTechId && wo.assignedTechId === myTechId) ||
        (myTechName && wo.assignedTechName?.toLowerCase() === myTechName.toLowerCase()) ||
        (myTechName && (wo as any).assignedTechnician?.toLowerCase() === myTechName.toLowerCase());
      if (!isAssignedToMe) return false;
    }

    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q ||
      (wo.orderNumber && wo.orderNumber.toLowerCase().includes(q)) ||
      (wo.customerName && wo.customerName.toLowerCase().includes(q)) ||
      (wo.customerPhone && wo.customerPhone.toLowerCase().includes(q)) ||
      (wo.customerEmail && wo.customerEmail.toLowerCase().includes(q)) ||
      (wo.deviceModel && wo.deviceModel.toLowerCase().includes(q)) ||
      (wo.serialNumber && wo.serialNumber.toLowerCase().includes(q)) ||
      (wo.imei && wo.imei.toLowerCase().includes(q)) ||
      (wo.symptomsReported && wo.symptomsReported.toLowerCase().includes(q)) ||
      (wo.assignedTechName && wo.assignedTechName.toLowerCase().includes(q));

    const matchesStatus = statusFilter === 'ALL' || wo.status === statusFilter;
    
    const matchesTech =
      techFilter === 'ALL' ||
      (techFilter === 'unassigned'
        ? !wo.assignedTechId || wo.assignedTechId === 'unassigned' || wo.assignedTechId === ''
        : wo.assignedTechId === techFilter || wo.assignedTechName?.toLowerCase() === techFilter.toLowerCase());

    const matchesBottleneck = !showBottlenecksOnly || getIsStagnant(wo);
    const matchesDate = isDateMatchingFilter(wo.createdAt, dateFilter);

    const matchesNeedsDiag =
      (!showNeedsDiagOnly || checkIsAfterDiagnosticNeeded(wo)) &&
      (!showBeforeNeedsDiagOnly || checkIsBeforeDiagnosticNeeded(wo));

    return matchesSearch && matchesStatus && matchesTech && matchesBottleneck && matchesDate && matchesNeedsDiag;
  });

  // Exception-column counts for the Show All toggle (Cant Repair / Customer Not Repair)
  const hiddenStageCounts = (['Cant Repair', 'Customer Not Repair'] as const).map((id) => ({
    id,
    count: filteredWorkOrders.filter((w) => w.status === id).length,
  }));

  // Active-filter summary chips (desktop) — one-tap clear per filter
  const activeFilterChips = [
    statusFilter !== 'ALL' ? { key: 'stage', label: `Stage: ${statusFilter}`, onClear: () => setStatusFilter('ALL') } : null,
    techFilter !== 'ALL' ? { key: 'tech', label: `Tech: ${techFilter === 'unassigned' ? 'Unassigned' : techFilter}`, onClear: () => setTechFilter('ALL') } : null,
    dateFilter.preset !== 'all' ? { key: 'date', label: 'Date', onClear: () => setDateFilter({ preset: 'all' }) } : null,
    searchQuery ? { key: 'q', label: `"${searchQuery}"`, onClear: () => setSearchQuery('') } : null,
    showBottlenecksOnly ? { key: 'btl', label: '>48h', onClear: () => setShowBottlenecksOnly(false) } : null,
    showAllStages ? { key: 'all', label: 'Show All', onClear: () => setShowAllStages(false) } : null,
    showBeforeNeedsDiagOnly ? { key: 'bdiag', label: 'Before Diag', onClear: () => setShowBeforeNeedsDiagOnly(false) } : null,
    showNeedsDiagOnly ? { key: 'ndiag', label: 'Needs Diag', onClear: () => setShowNeedsDiagOnly(false) } : null,
  ].filter(Boolean) as Array<{ key: string; label: string; onClear: () => void }>;

  return (
    <div className="space-y-3">
      {/* Top Controls Bar (Kanban Pipeline Specific Actions) */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line-strong bg-white px-2.5 py-2 text-[11px] shadow-2xs">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="whitespace-nowrap font-extrabold text-ink">Active Pipeline Overview</span>
          <span className="truncate text-[10px] font-medium text-muted">({filteredWorkOrders.length} tickets matching filters)</span>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => {
                handleResetFilters();
                setShowNeedsDiagOnly(false);
                setShowBeforeNeedsDiagOnly(false);
              }}
              className="px-2 py-0.5 text-[10px] bg-slate-100 hover:bg-slate-200 text-brand font-bold rounded-lg transition-all cursor-pointer border border-slate-200"
            >
              Reset Filters ↺
            </button>
          )}
        </div>

        <div className="hidden lg:grid lg:grid-cols-2 xl:flex xl:flex-wrap xl:items-center xl:justify-end gap-1.5">
          <button
            type="button"
            onClick={() => setShowAllStages((v) => !v)}
            className={`inline-flex w-full sm:w-auto h-8 sm:h-7 items-center justify-center gap-1 rounded-md border px-2 text-[10px] font-bold transition-colors cursor-pointer ${
              showAllStages
                ? 'bg-ink text-white border-ink shadow-2xs'
                : 'bg-white text-ink border-line hover:bg-slate-100'
            }`}
            title={showAllStages ? 'Hide the exception columns again' : 'Show Cant Repair and Customer Not Repair columns'}
          >
            {showAllStages ? (
              <><EyeOff className="w-3 h-3 shrink-0" /><span>Hide Exceptions</span></>
            ) : (
              <><Eye className="w-3 h-3 shrink-0" /><span>Show All{hiddenStageCounts.some((h) => h.count > 0) ? ` (${hiddenStageCounts.filter((h) => h.count > 0).map((h) => `${h.id.split(' ')[0]}:${h.count}`).join(' ')})` : ''}</span></>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setShowBeforeNeedsDiagOnly(!showBeforeNeedsDiagOnly);
              setShowNeedsDiagOnly(false);
            }}
                className={`inline-flex w-full sm:w-auto h-8 sm:h-7 items-center justify-center gap-1 rounded-md border px-2 text-[10px] font-bold transition-colors cursor-pointer ${
                  showBeforeNeedsDiagOnly
                    ? 'bg-blue-600 text-white border-blue-700 shadow-2xs'
                    : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                }`}
          >
            <Stethoscope className="h-3 w-3 shrink-0" />
            <span>Before Diag Pending ({beforeNeedsDiagTotalCount})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setShowNeedsDiagOnly(!showNeedsDiagOnly);
              setShowBeforeNeedsDiagOnly(false);
            }}
              className={`inline-flex w-full sm:w-auto h-8 sm:h-7 items-center justify-center gap-1 rounded-md border px-2 text-[10px] font-bold transition-colors cursor-pointer ${
                showNeedsDiagOnly
                  ? 'bg-purple-600 text-white border-purple-700 shadow-2xs'
                  : 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
              }`}
          >
            <ShieldCheck className="h-3 w-3 shrink-0" />
            <span>Finished Needs Diag ({afterNeedsDiagTotalCount})</span>
          </button>

          {showBottlenecksOnly && (
            <span className="inline-flex h-7 items-center gap-1 rounded-md border border-red-600 bg-red-500 px-2 text-[10px] font-bold text-white shadow-2xs">
              <Timer className="h-3 w-3 shrink-0" />
              <span>Filtering Bottlenecks (&gt;48h)</span>
            </span>
          )}

          {onClearAllWorkOrders && workOrders.length > 0 && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm(`Are you sure you want to clear all ${workOrders.length} tickets from the system?`)) {
                  onClearAllWorkOrders();
                }
              }}
              className="inline-flex h-7 items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2 text-[10px] font-bold text-rose-700 shadow-2xs transition-colors hover:bg-rose-100"
              title="Clear all tickets to reset workflow testing state"
            >
              <Trash2 className="h-3 w-3 shrink-0 text-rose-600" />
              <span>Clear All ({workOrders.length})</span>
            </button>
          )}

        </div>
      </div>

      {/* Mobile stage toggles (lg:hidden) — Show All lives in the drawer too, but the
          exception columns are the workflow's far-right stages, so a one-tap inline
          toggle keeps them reachable without hunting the filter drawer. */}
      <div className="lg:hidden flex items-center gap-1.5 overflow-x-auto no-scrollbar -mx-0.5 px-0.5">
        <button
          type="button"
          onClick={() => setShowAllStages((v) => !v)}
          className={`inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl border px-3 text-[11px] font-bold transition-colors cursor-pointer active:scale-95 ${
            showAllStages
              ? 'bg-ink text-white border-ink shadow-2xs'
              : 'bg-white text-ink border-line-strong hover:bg-slate-100'
          }`}
          aria-pressed={showAllStages}
        >
          {showAllStages ? <EyeOff className="w-3.5 h-3.5 shrink-0" /> : <Eye className="w-3.5 h-3.5 shrink-0 text-brand" />}
          <span>{showAllStages ? 'Hide Exception Stages' : 'Show Exception Stages'}</span>
          {hiddenStageCounts.some((h) => h.count > 0) && (
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-black ${showAllStages ? 'bg-white/20 text-white' : 'bg-rose-100 text-rose-700'}`}>
              {hiddenStageCounts.filter((h) => h.count > 0).reduce((acc, h) => acc + h.count, 0)}
            </span>
          )}
        </button>
        {!showAllStages && (
          <p className="shrink-0 text-[10px] font-medium text-muted">Cant Repair · Customer Not Repair</p>
        )}
      </div>

      {/* Active filter summary chips (desktop) */}
      <div className="hidden lg:block">
        <ActiveFilterChips chips={activeFilterChips} />
      </div>

      {/* Horizontal Scrollable 6 Kanban Columns */}
      <div
        className="kanban-scroll flex min-h-[calc(100dvh-14rem)] space-x-3 overflow-x-auto pb-4 pt-1 snap-x touch-pan-x no-scrollbar md:grid md:grid-cols-3 md:gap-3 md:space-x-0 md:overflow-visible md:snap-none lg:flex lg:space-x-3 lg:overflow-x-auto lg:snap-x lg:grid-cols-none"
        onScroll={(e) => {
          const el = e.currentTarget;
          setKanbanAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 12);
        }}
      >
        {KANBAN_STAGES.filter((stage) => (showAllStages || (stage.id !== 'Cant Repair' && stage.id !== 'Customer Not Repair')) && (statusFilter === 'ALL' || stage.id === statusFilter)).map((stage) => {
          const stageOrders = filteredWorkOrders.filter((w) => w.status === stage.id);
          const stageStagnantOrders = stageOrders.filter((w) => getIsStagnant(w));

          return (
            <div
              key={stage.id}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (draggedWoId) {
                  const targetWo = workOrders.find((w) => w.id === draggedWoId);
                  if (stage.id === 'Taken Out' && targetWo) {
                    setCheckoutModalWo(targetWo);
                    setPaidAmountInput(targetWo.totalAmount ? String(targetWo.totalAmount) : '0');
                    setDraggedWoId(null);
                    return;
                  }
                  if (stage.id === 'Finished' && targetWo && !checkIsAfterDiagnosticCompleted(targetWo)) {
                    setPendingDiagAlertWo({ wo: targetWo, newStatus: 'Finished' });
                    setDraggedWoId(null);
                    return;
                  }
                  if ((stage.id === 'In Progress' || stage.id === 'Pending') && targetWo && !checkIsBeforeDiagnosticCompleted(targetWo)) {
                    setPendingBeforeDiagAlertWo({ wo: targetWo, newStatus: stage.id });
                    setDraggedWoId(null);
                    return;
                  }
                  onUpdateWorkOrderStatus(draggedWoId, stage.id);
                  setDraggedWoId(null);
                }
              }}
              className={`rounded-2xl border ${stage.color} bg-white/50 backdrop-blur-xs p-3 flex flex-col min-w-[260px] md:min-w-0 flex-1 max-w-none shadow-2xs snap-start transition-all`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-line">
                <div>
                  <h3 className="text-xs font-extrabold text-ink tracking-tight">
                    {stage.id === 'Receive' ? t('statusReceive') :
                     stage.id === 'In Progress' ? t('statusInProgress') :
                     stage.id === 'Pending' ? t('statusPending') :
                     stage.id === 'Finished' ? t('statusFinished') :
                     stage.id === 'Taken Out' ? t('statusTakenOut') :
                     stage.id === 'Cant Repair' ? t('statusCantRepair') :
                     stage.id === 'Customer Not Repair' ? t('statusCustomerNotRepair') : stage.title}
                  </h3>
                  <p className="text-[10px] text-muted font-medium">{stage.subtitle}</p>
                </div>
                <div className="flex items-center space-x-1">
                  {stageStagnantOrders.length > 0 && (
                    <span
                      className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300/80 flex items-center space-x-0.5"
                      title={`${stageStagnantOrders.length} ticket(s) stationary >48h in this stage`}
                    >
                      <AlertTriangle className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                      <span>{stageStagnantOrders.length}</span>
                    </span>
                  )}
                  <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full shadow-2xs ${stage.badgeColor}`}>
                    {stageOrders.length}
                  </span>
                </div>
              </div>

              {/* Cards Container */}
              <div className="flex-1 space-y-3 overflow-y-auto pr-0.5 max-h-[680px]">
                {stageOrders.length === 0 ? (
                  <div className="text-[11px] text-muted font-medium text-center py-12 border-2 border-dashed border-line rounded-xl bg-white/40">
                    No tickets in {stage.title}
                  </div>
                ) : (
                  stageOrders.map((wo) => {
                    const tech = technicians.find((t) => t.id === wo.assignedTechId);
                    const currentIdx = KANBAN_STAGES.findIndex((s) => s.id === wo.status);
                    const diag21 = get21Diagnostics(wo.beforeDiagnostics, wo.symptomsReported, wo.intakeChecklist);
                    const passCount = diag21.filter((d) => d.status === 'Pass').length;
                    const failCount = diag21.filter((d) => d.status === 'Fail').length;
                    const hoursInStatus = getHoursInStatus(wo);
                    const isStagnant = getIsStagnant(wo);

                    const isBeforeDiagNeeded = checkIsBeforeDiagnosticNeeded(wo);
                    const isAfterDiagNeeded = checkIsAfterDiagnosticNeeded(wo);

                    return (
                      <div
                        key={wo.id}
                        draggable
                        onDragStart={() => setDraggedWoId(wo.id)}
                        className={`p-3 rounded-xl shadow-xs hover:shadow-md space-y-2 text-xs transition-shadow duration-150 ease-out cursor-grab active:cursor-grabbing group ${
                          isBeforeDiagNeeded 
                            ? 'border-l-4 border-l-amber-500 bg-amber-50/20' 
                            : isAfterDiagNeeded 
                            ? 'border-l-4 border-l-purple-600 bg-purple-50/20' 
                            : ''
                        } ${getCardStyle(
                          wo.status,
                          isStagnant
                        )}`}
                      >
                        {/* Header: Order Number & Priority Badge */}
                        <div className="flex items-center justify-between gap-1.5">
                          <div className="flex items-center space-x-1.5 min-w-0">
                            <span className="h-[20px] font-mono text-[9px] font-extrabold text-brand bg-brand-soft px-2 rounded-md border border-brand/20 inline-flex items-center justify-center shrink-0 leading-none">{wo.orderNumber}</span>
                            <PriorityBadge priority={wo.priority} size="xs" />
                          </div>
                          <div className="flex items-center space-x-1 shrink-0">
                            {isBeforeDiagNeeded && (
                              <span
                                className="w-5 h-5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center shrink-0 shadow-2xs"
                                title="Initial 21-Point Diagnostic Pending"
                              >
                                <Stethoscope className="w-3 h-3 text-blue-600 shrink-0" />
                              </span>
                            )}
                            {isAfterDiagNeeded && (
                              <span
                                className="w-5 h-5 rounded-full bg-purple-100 text-purple-900 border border-purple-300 flex items-center justify-center shrink-0 shadow-2xs"
                                title="Post-Repair Diagnostic Quality Check Pending"
                              >
                                <ShieldCheck className="w-3 h-3 text-purple-700 shrink-0" />
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Stagnant Bottleneck Alert Banner / Age Chip */}
                        {isStagnant ? (
                          <div className="flex items-center justify-between px-2 py-1 rounded-lg bg-red-50 border border-red-200 text-red-800 text-[10px] font-extrabold">
                            <span className="flex items-center space-x-1">
                              <Timer className="w-3.5 h-3.5 text-red-600 animate-pulse shrink-0" />
                              <span>Bottleneck (&gt;48h)</span>
                            </span>
                            <span className="font-mono bg-red-100 px-1.5 py-0.5 rounded text-red-800">{hoursInStatus}h</span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-1 text-[10px] text-muted">
                            <Clock className="w-3 h-3 text-brand shrink-0" />
                            <span>In stage: <strong className="text-ink">{hoursInStatus < 1 ? '&lt; 1h' : `${hoursInStatus}h`}</strong></span>
                          </div>
                        )}

                        {/* Model & Customer & Repair Issue */}
                        <div role="button" tabIndex={0} aria-label={`Open detail for ${wo.deviceModel || wo.orderNumber || wo.id}`} className="cursor-pointer space-y-1" onClick={() => setDetailModalWo(wo)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setDetailModalWo(wo); } }}>
                          <p className="font-extrabold text-ink text-xs line-clamp-1 hover:text-brand transition-colors">{wo.deviceModel}</p>
                          <p className="text-[10px] text-muted truncate">{wo.customerName} • {wo.customerPhone}</p>
                          
                          {/* What to repair under Customer info */}
                          <div className="flex items-start space-x-1.5 pt-1 mt-1 border-t border-slate-100 text-[11px] text-ink">
                            <ClipboardCheck className="w-3.5 h-3.5 text-brand shrink-0 mt-0.5" />
                            <span className="font-semibold text-slate-700 line-clamp-2 leading-tight">
                              {getRepairSummary(wo)}
                            </span>
                          </div>
                        </div>

                        {/* Tech Tag */}
                        <div className="flex items-center justify-between text-[10px] pt-1 border-t border-slate-100 text-muted">
                          <span>Tech: <strong className="text-ink">{tech?.name?.split(' ')[0] || 'Unassigned'}</strong></span>
                          <button
                            type="button"
                            onClick={() => setAssignTechModalWo(wo)}
                            className="text-brand hover:underline flex items-center space-x-0.5 font-semibold"
                          >
                            <UserCheck className="w-3 h-3" />
                            <span>Assign</span>
                          </button>
                        </div>

                        {/* Primary Card Actions */}
                        <div className="grid grid-cols-3 gap-1 pt-1 border-t border-slate-100 text-[10px]">
                          <button
                            type="button"
                            onClick={() => setDetailModalWo(wo)}
                            className="py-1 px-1 bg-surface hover:bg-slate-100 text-ink font-semibold rounded-lg border border-line text-center flex items-center justify-center space-x-0.5 truncate"
                          >
                            <Eye className="w-3 h-3 text-ink shrink-0" />
                            <span>Detail</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setAddLogModalWo(wo)}
                            className="py-1 px-1 bg-surface hover:bg-slate-100 text-brand font-semibold rounded-lg border border-line text-center flex items-center justify-center space-x-0.5 truncate"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Log</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setNotifWo(wo);
                              setIsNotifModalOpen(true);
                            }}
                            className="py-1 px-1 bg-[#7360F2]/10 hover:bg-[#7360F2]/20 text-[#7360F2] font-extrabold rounded-lg border border-[#7360F2]/20 text-center flex items-center justify-center space-x-0.5 truncate"
                            title="Alert Customer SMS/Viber/Telegram"
                          >
                            <BellRing className="w-3 h-3 text-[#7360F2]" />
                            <span>Notify</span>
                          </button>
                        </div>

                        {/* Special Stage Action Buttons (Checkout & After Diag on Finished stage only) */}
                        {stage.id === 'Finished' && (
                          <div className="grid grid-cols-2 gap-1.5 pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                setCheckoutModalWo(wo);
                                setPaidAmountInput(wo.totalAmount.toString());
                              }}
                              className="w-full py-1.5 bg-success hover:bg-success/90 text-white font-extrabold rounded-lg text-[10px] flex items-center justify-center space-x-1 shadow-xs"
                            >
                              <DollarSign className="w-3 h-3" />
                              <span>Checkout</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setAfterDiagModalWo(wo);
                                setAfterSummaryNote(wo.afterRepairSummary || '');
                                if (wo.afterDiagnostics && wo.afterDiagnostics.length > 0) {
                                  setAfterDiagnostics(JSON.parse(JSON.stringify(wo.afterDiagnostics)));
                                } else {
                                  const base21 = get21Diagnostics(wo.beforeDiagnostics, wo.symptomsReported, wo.intakeChecklist);
                                  setAfterDiagnostics(
                                    base21.map((d, i) => ({
                                      id: d.id || `after-diag-${i}`,
                                      name: d.name,
                                      status: 'Pass' as const,
                                      note: d.status === 'Fail' ? 'Repaired & Verified' : d.note || '',
                                    }))
                                  );
                                }
                              }}
                              className="w-full py-1.5 bg-purple-50 text-[#AF52DE] border border-purple-200 hover:bg-purple-100 font-bold rounded-lg text-[10px] flex items-center justify-center space-x-1"
                            >
                              <ShieldCheck className="w-3 h-3" />
                              <span>After Diag</span>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL 1: Full Ticket Detail View Modal */}
      {detailModalWo && (
        <div className="hidden fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 items-center justify-center p-3 sm:p-6">
          <div className="bg-white border border-line-strong rounded-2xl max-w-5xl w-full p-6 space-y-4 text-xs shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setDetailModalWo(null)} aria-label="Close ticket detail" className="absolute right-4 top-4 text-muted hover:text-ink cursor-pointer">
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="border-b border-line pb-3 flex flex-wrap justify-between items-center gap-3 pr-8">
              <div className="flex items-center space-x-3">
                <span className="font-mono text-xs font-black text-brand bg-brand/10 px-2.5 py-1 rounded-lg border border-brand/20">
                  {detailModalWo.orderNumber}
                </span>
                <div>
                  <h2 className="text-lg font-black text-ink tracking-tight">{detailModalWo.deviceModel}</h2>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {onSelectPrintTag && (
                  <button
                    type="button"
                    onClick={() => {
                      onSelectPrintTag(detailModalWo);
                      setDetailModalWo(null);
                    }}
                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-brand font-bold text-[11px] rounded-lg transition-colors flex items-center space-x-1 border border-slate-200 cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Tag/Voucher</span>
                  </button>
                )}
                {currentUser?.role === 'Admin' ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`Are you sure you want to delete ticket ${detailModalWo.orderNumber || detailModalWo.id}?`)) {
                        onDeleteWorkOrder?.(detailModalWo.id);
                        setDetailModalWo(null);
                      }
                    }}
                    className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[11px] rounded-lg transition-colors flex items-center space-x-1 border border-rose-200 cursor-pointer"
                    title="Delete Ticket (Admin Only)"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                    <span>Delete</span>
                  </button>
                ) : (
                  <span className="px-2.5 py-1.5 bg-slate-100 text-slate-500 font-bold text-[10px] rounded-lg border border-slate-200 flex items-center space-x-1 cursor-not-allowed" title="Only Admin users can delete repair tickets">
                    <Lock className="w-3 h-3 text-slate-400 shrink-0" />
                    <span>Delete Locked</span>
                  </span>
                )}
                <PriorityBadge priority={detailModalWo.priority} size="md" />
                <StatusBadge status={detailModalWo.status} size="md" />
              </div>
            </div>

            {/* Customer & Hardware Specifications Banner (Clean, Non-Redundant Layout) */}
            <div className="bg-surface border border-line rounded-xl p-4 text-xs space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div className="space-y-1 bg-white p-3 rounded-lg border border-line">
                  <span className="text-[10px] font-extrabold text-muted uppercase tracking-wider flex items-center space-x-1">
                    <User className="w-3 h-3 text-brand" />
                    <span>Customer Contact</span>
                  </span>
                  <div className="font-extrabold text-ink text-xs truncate">{detailModalWo.customerName}</div>
                  <div className="text-[11px] text-brand font-bold flex items-center space-x-1">
                    <Phone className="w-3 h-3 text-brand" />
                    <span>{detailModalWo.customerPhone}</span>
                  </div>
                </div>

                <div className="space-y-1 bg-white p-3 rounded-lg border border-line">
                  <span className="text-[10px] font-extrabold text-muted uppercase tracking-wider flex items-center space-x-1">
                    <MapPin className="w-3 h-3 text-brand" />
                    <span>Town / City</span>
                  </span>
                  <div className="font-bold text-ink text-xs truncate">
                    {detailModalWo.customerAddress || '—'}
                  </div>
                  <div className="text-[11px] text-muted font-medium">Account: {detailModalWo.customerType || 'Retail'}</div>
                </div>

                <div className="space-y-1 bg-white p-3 rounded-lg border border-line">
                  <span className="text-[10px] font-extrabold text-muted uppercase tracking-wider flex items-center space-x-1">
                    <Barcode className="w-3 h-3 text-brand" />
                    <span>Hardware Info</span>
                  </span>
                  <div className="font-mono font-bold text-ink text-xs truncate">
                    IMEI: {detailModalWo.serialNumber || detailModalWo.imei || 'N/A'}
                  </div>
                  <div className="text-[11px] text-ink font-bold flex items-center space-x-1 truncate">
                    <Key className="w-3 h-3 text-amber-600 shrink-0" />
                    <span>{detailModalWo.passcode || 'No Passcode'}</span>
                    <span className="text-line-strong">•</span>
                    <Palette className="w-3 h-3 text-slate-500 shrink-0" />
                    <span>{detailModalWo.deviceColor || 'Standard'}</span>
                  </div>
                </div>

                <div className="space-y-1 bg-white p-3 rounded-lg border border-line">
                  <span className="text-[10px] font-extrabold text-muted uppercase tracking-wider flex items-center space-x-1">
                    <UserCheck className="w-3 h-3 text-brand" />
                    <span>Technician & Cost</span>
                  </span>
                  <div className="font-bold text-ink text-xs flex items-center space-x-1 truncate">
                    <ClipboardCheck className="w-3 h-3 text-brand" />
                    <span>Tech: {detailModalWo.assignedTechName || 'Unassigned'}</span>
                  </div>
                  <div className="font-mono font-black text-brand text-xs flex items-center space-x-1">
                    <Coins className="w-3.5 h-3.5 text-amber-500" />
                    <span>{(detailModalWo.totalAmount || 0).toLocaleString()} MMK</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Customer Reported Symptoms / Intake Issue Box (Filtered to prevent duplicate text) */}
            {(() => {
              const rawNotes = detailModalWo.symptomsReported || '';
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
                <div className="p-3.5 bg-amber-50/80 border border-amber-200/80 rounded-xl text-xs space-y-1">
                  <span className="font-extrabold text-amber-900 text-[11px] flex items-center space-x-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>Intake Issue Notes:</span>
                  </span>
                  <p className="text-amber-950 font-medium leading-relaxed whitespace-pre-wrap">{cleanNotes}</p>
                </div>
              );
            })()}

            {/* Selected Repairs */}
            {detailModalWo.selectedRepairs && detailModalWo.selectedRepairs.length > 0 && (
              <div className="p-3.5 bg-[#E5F1FF]/50 border border-brand/20 rounded-xl space-y-2">
                <div className="flex justify-between items-center border-b border-brand/10 pb-1.5">
                  <span className="font-bold text-brand flex items-center space-x-1.5 text-xs">
                    <ClipboardCheck className="w-3.5 h-3.5 text-brand shrink-0" />
                    <span>Selected Services & Repairs:</span>
                  </span>
                  <span className="font-mono font-extrabold text-brand text-xs">
                    Total: {(detailModalWo.totalAmount || 0).toLocaleString()} MMK
                  </span>
                </div>
                <div className="space-y-1">
                  {detailModalWo.selectedRepairs.map(r => (
                    <div key={r.id} className="flex justify-between items-center text-xs">
                      <span className="flex items-center space-x-1.5 font-medium text-ink">
                        <CheckCircle2 className="w-3.5 h-3.5 text-brand shrink-0" />
                        <span>{r.name} {r.discountPercent > 0 ? `(${r.discountPercent}% OFF)` : ''}</span>
                      </span>
                      <span className="font-bold font-mono text-ink">{r.finalPrice.toLocaleString()} MMK</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Diagnostics Comparison Master Grid (All 21 Items Visible without Scrolling) */}
            <div className="p-4 bg-slate-50/80 border border-line-strong rounded-2xl space-y-3">
              <div className="flex flex-wrap justify-between items-center pb-2 border-b border-slate-200 gap-2">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-5 h-5 text-brand" />
                  <span className="font-extrabold text-sm text-ink">21-Point Hardware Diagnostic Comparison</span>
                </div>
                <div className="flex items-center space-x-3 text-[11px] font-bold">
                  <span className="flex items-center space-x-1 text-ink">
                    <span className="w-2.5 h-2.5 rounded-full bg-brand inline-block" />
                    <span>Left: Before Intake</span>
                  </span>
                  <span className="flex items-center space-x-1 text-ink">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#AF52DE] inline-block" />
                    <span>Right: After QA</span>
                  </span>
                </div>
              </div>

              {/* 3-Column Compact Grid (7 items per col = 21 items total, NO SCROLLBAR) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {(() => {
                  const beforeList = get21Diagnostics(detailModalWo.beforeDiagnostics, detailModalWo.symptomsReported, detailModalWo.intakeChecklist);
                  const afterList = get21AfterDiagnostics(detailModalWo.afterDiagnostics, detailModalWo.beforeDiagnostics, detailModalWo.symptomsReported, detailModalWo.intakeChecklist);

                  return beforeList.map((beforeItem, idx) => {
                    const afterItem = afterList[idx] || beforeItem;

                    const renderBadge = (status: string) => {
                      if (status === 'Pass') {
                        return (
                          <span className="bg-[#16A34A] text-white font-black text-[10px] px-1.5 py-0.5 rounded shadow-2xs tracking-wider uppercase inline-flex items-center space-x-0.5">
                            <CheckCircle2 className="w-3 h-3 shrink-0" />
                            <span>PASS</span>
                          </span>
                        );
                      }
                      if (status === 'Fail') {
                        return (
                          <span className="bg-[#DC2626] text-white font-black text-[10px] px-1.5 py-0.5 rounded shadow-2xs tracking-wider uppercase inline-flex items-center space-x-0.5 animate-pulse">
                            <XCircle className="w-3 h-3 shrink-0" />
                            <span>FAIL</span>
                          </span>
                        );
                      }
                      return (
                        <span className="bg-[#475569] text-white font-bold text-[10px] px-1.5 py-0.5 rounded uppercase inline-flex items-center space-x-0.5">
                          <Minus className="w-3 h-3 shrink-0" />
                          <span>N/A</span>
                        </span>
                      );
                    };

                    return (
                      <div
                        key={beforeItem.id || beforeItem.name}
                        className={`p-2 rounded-xl border transition-all flex items-center justify-between text-xs shadow-2xs ${
                          beforeItem.status === 'Fail' || afterItem.status === 'Fail'
                            ? 'bg-red-50/60 border-red-200'
                            : 'bg-white border-line'
                        }`}
                      >
                        <div className="min-w-0 pr-1 space-y-0.5">
                          <div className="font-extrabold text-ink text-[11px] truncate flex items-center space-x-1">
                            <span className="text-muted font-mono font-bold text-[10px] shrink-0">{idx + 1}.</span>
                            <span className="truncate">{beforeItem.name}</span>
                          </div>
                          {(beforeItem.note || afterItem.note) && (
                            <p className="text-[9px] text-[#7F7F7F] truncate italic max-w-[130px]">
                              {afterItem.note || beforeItem.note}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center space-x-1 shrink-0">
                          {/* Before Badge */}
                          <div title="Before Repair Intake Status">
                            {renderBadge(beforeItem.status)}
                          </div>
                          <span className="text-muted text-[10px] font-bold">→</span>
                          {/* After Badge */}
                          <div title="After QA Final Status">
                            {renderBadge(afterItem.status)}
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            {/* Interactive Work Order Status Transition & Audit Timeline */}
            <div className="pt-2 border-t border-line">
              <WorkOrderStatusTimeline
                workOrder={detailModalWo}
                onSaveWorkOrder={(updatedWo) => {
                  setDetailModalWo(updatedWo);
                  if (onSaveWorkOrder) onSaveWorkOrder(updatedWo);
                }}
                onUpdateStatus={(woId, newStatus) => {
                  const wo = workOrders.find((w) => w.id === woId);
                  if (newStatus === 'Taken Out' && wo) {
                    setCheckoutModalWo(wo);
                    setPaidAmountInput(wo.totalAmount ? String(wo.totalAmount) : '0');
                    setDetailModalWo(null);
                    return;
                  }
                  if (newStatus === 'Finished' && wo && !checkIsAfterDiagnosticCompleted(wo)) {
                    setPendingDiagAlertWo({ wo, newStatus: 'Finished' });
                    return;
                  }
                  if ((newStatus === 'In Progress' || newStatus === 'Pending') && wo && !checkIsBeforeDiagnosticCompleted(wo)) {
                    setPendingBeforeDiagAlertWo({ wo, newStatus });
                    return;
                  }
                  onUpdateWorkOrderStatus(woId, newStatus);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {detailModalWo && (
        <TicketDetailInspectorModal
          workOrder={detailModalWo}
          currentUser={currentUser}
          onClose={() => setDetailModalWo(null)}
          onPrint={onSelectPrintTag}
          onEdit={onOpenNewWorkOrder ? (wo) => onOpenNewWorkOrder({ editWorkOrder: wo }) : undefined}
          onDelete={onDeleteWorkOrder}
        />
      )}

      {/* MODAL 2: Add Manual Repair Log */}
      {addLogModalWo && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-line-strong rounded-2xl max-w-md w-full p-6 space-y-4 text-xs shadow-2xl relative">
            <button onClick={() => setAddLogModalWo(null)} aria-label="Close repair log" className="absolute right-4 top-4 text-muted hover:text-ink">
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-sm font-bold text-ink border-b border-line-strong pb-2 flex items-center space-x-2">
              <Plus className="w-4 h-4 text-brand" />
              <span>Add Repair Log Entry ({addLogModalWo.orderNumber})</span>
            </h3>

            <div>
              <label className="block text-muted mb-1 font-medium">Repair Update Note *</label>
              <textarea
                rows={4}
                value={logText}
                onChange={(e) => setLogText(e.target.value)}
                placeholder="e.g. Jul 22, 2026 5:57 PM - No Power fixed. Speaker still not working."
                className="w-full bg-[#F8F9FA] border border-line-strong rounded-xl p-3 text-xs text-ink focus:border-brand"
              />
            </div>

            <Button
              type="button"
              onClick={handleAddRepairLog}
              className="w-full bg-brand text-white hover:bg-[#0077ED]"
            >
              Save Repair Log
            </Button>
          </div>
        </div>
      )}

      {/* MODAL 3: Assign Technician */}
      {assignTechModalWo && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-line-strong rounded-2xl max-w-sm w-full p-6 space-y-4 text-xs shadow-2xl relative">
            <button onClick={() => setAssignTechModalWo(null)} aria-label="Close technician assignment" className="absolute right-4 top-4 text-muted hover:text-ink">
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-sm font-bold text-ink border-b border-line-strong pb-2 flex items-center space-x-2">
              <UserCheck className="w-4 h-4 text-brand" />
              <span>Assign Technician ({assignTechModalWo.orderNumber})</span>
            </h3>

            <div className="space-y-2">
              {technicians.map(t => (
                <button
                  key={t.id}
                  onClick={() => handleAssignTechnician(t.id)}
                  className={`w-full p-3 rounded-xl border text-left flex justify-between items-center transition-all ${
                    assignTechModalWo.assignedTechId === t.id
                      ? 'border-brand bg-[#E5F1FF] text-brand font-bold'
                      : 'border-line-strong bg-white text-ink hover:bg-slate-50'
                  }`}
                >
                  <div>
                    <p className="font-bold text-xs">{t.name}</p>
                    <p className="text-[10px] opacity-70">{t.level}</p>
                  </div>
                  <span className="text-[10px] bg-slate-100 text-ink px-2 py-0.5 rounded-full font-bold">
                    {t.activeJobsCount} Active Jobs
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Mobile scroll hint — honest about what is actually rendered. When the exception
          stages are hidden the pill becomes a one-tap Show All action (previously it
          promised columns that could never render). When they're shown, it's a scroll
          cue until the far-right columns are reached. */}
      {!showAllStages ? (
        <div className="md:hidden">
          <button
            type="button"
            onClick={() => setShowAllStages(true)}
            className="flex w-full items-center justify-center gap-1.5 rounded-full border border-dashed border-rose-300 bg-rose-50 px-3 py-2.5 text-[11px] font-extrabold text-rose-700 transition-colors cursor-pointer active:scale-[0.99]"
          >
            <Eye className="w-3.5 h-3.5 text-rose-600 shrink-0" />
            <span>
              Show Cant Repair{hiddenStageCounts[0].count > 0 ? ` (${hiddenStageCounts[0].count})` : ''} & Customer Not Repair{hiddenStageCounts[1].count > 0 ? ` (${hiddenStageCounts[1].count})` : ''}
            </span>
          </button>
        </div>
      ) : !kanbanAtEnd ? (
        <div className="flex items-center justify-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-[10px] font-extrabold text-muted md:hidden animate-fade-in">
          <ChevronsRight className="w-3.5 h-3.5 text-brand" />
          <span>Scroll for Cant Repair / Customer Not Repair</span>
          <ChevronsRight className="w-3.5 h-3.5 text-brand" />
        </div>
      ) : null}

      {/* MODAL 4: Checkout Payment */}
      {checkoutModalWo && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-line-strong rounded-2xl max-w-md w-full p-6 space-y-4 text-xs shadow-2xl relative">
            <button onClick={() => setCheckoutModalWo(null)} aria-label="Close checkout" className="absolute right-4 top-4 text-muted hover:text-ink">
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-sm font-bold text-ink border-b border-line-strong pb-2 flex items-center space-x-2">
              <Coins className="w-4 h-4 text-success" />
              <span>Checkout Payment ({checkoutModalWo.orderNumber})</span>
            </h3>

            <div className="bg-[#E8F8EE] p-3 rounded-xl border border-success/30 text-xs text-[#1E7E34] font-bold flex justify-between">
              <span>Total Invoice Due:</span>
              <span className="text-sm font-mono">{checkoutModalWo.totalAmount.toLocaleString()} MMK</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-muted mb-1 font-medium">Paid Amount (MMK) *</label>
                <input
                  type="number"
                  value={paidAmountInput}
                  onChange={(e) => setPaidAmountInput(e.target.value)}
                  className="w-full bg-[#F8F9FA] border border-line-strong rounded-xl px-3 py-2 text-sm font-mono font-bold text-ink"
                />
              </div>

              <div>
                <label className="block text-muted mb-1 font-medium">Payment Method *</label>
                <CustomDropdownMenu
                  value={paymentMethod}
                  onChange={(val) => setPaymentMethod(val as any)}
                  className="w-full"
                  size="md"
                  options={activePaymentMethods.map((m) => ({
                    value: m.name,
                    label: `${m.name} (${m.category})`,
                  }))}
                />
              </div>
            </div>

            <Button
              type="button"
              onClick={handleConfirmCheckout}
              className="w-full max-w-md mx-auto bg-success hover:bg-success/90 text-white"
            >
              <span className="truncate">Confirm Checkout & Move to Taken Out</span>
            </Button>
          </div>
        </div>
      )}

      {/* MODAL 5: After-Repair Diagnostic */}
      {afterDiagModalWo && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-line-strong rounded-2xl max-w-xl w-full p-6 space-y-4 text-xs shadow-2xl relative max-h-[88vh] overflow-y-auto">
            <button onClick={() => setAfterDiagModalWo(null)} aria-label="Close post-diagnosis" className="absolute right-4 top-4 text-muted hover:text-ink">
              <X className="w-5 h-5" />
            </button>

            <div className="border-b border-line-strong pb-3 space-y-1">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-[#AF52DE]" />
                <h3 className="text-sm font-bold text-ink">
                  After-Repair 21-Point QA Inspection
                </h3>
              </div>
              <p className="text-xs text-muted">
                Ticket <strong className="text-brand font-mono">{afterDiagModalWo.orderNumber}</strong> • {afterDiagModalWo.deviceModel}
              </p>
            </div>

            {/* Quick Actions & Pass/Fail Counts */}
            <div className="flex items-center justify-between p-2.5 bg-purple-50/60 rounded-xl border border-purple-200 text-xs">
              <div className="flex items-center space-x-2 font-bold text-ink">
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[11px]">
                  Pass: {afterDiagnostics.filter(d => d.status === 'Pass').length}
                </span>
                <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 text-[11px]">
                  Fail: {afterDiagnostics.filter(d => d.status === 'Fail').length}
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 text-[11px]">
                  N/A: {afterDiagnostics.filter(d => d.status === 'N/A').length}
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setAfterDiagnostics(afterDiagnostics.map(d => ({ ...d, status: 'Pass', note: d.note || 'QA Passed' })));
                  }}
                  className="px-2.5 py-1 bg-success text-white font-extrabold rounded-lg text-[10px] hover:bg-success/90 shadow-2xs"
                >
                  Mark All Pass
                </button>
              </div>
            </div>

            {/* 21-Point Diagnostic Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
              {afterDiagnostics.map((item, idx) => (
                <div key={item.id || item.name} className="p-2 bg-[#F8F9FA] border border-line rounded-xl space-y-1.5">
                  <div className="flex justify-between items-center text-[11px] font-bold text-ink">
                    <span className="truncate pr-1">{idx + 1}. {item.name}</span>
                    <span className={`text-[10px] font-extrabold px-1.5 py-0.2 rounded ${
                      item.status === 'Pass' ? 'bg-emerald-100 text-emerald-800' :
                      item.status === 'Fail' ? 'bg-rose-100 text-rose-800' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {item.status}
                    </span>
                  </div>

                  <div className="flex space-x-1 text-[10px]">
                    <button
                      type="button"
                      onClick={() => {
                        const copy = [...afterDiagnostics];
                        copy[idx].status = 'Pass';
                        setAfterDiagnostics(copy);
                      }}
                      className={`flex-1 py-1 rounded-md font-extrabold transition-all ${item.status === 'Pass' ? 'bg-success text-white shadow-2xs' : 'bg-slate-200 text-ink hover:bg-slate-300'}`}
                    >
                      Pass
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const copy = [...afterDiagnostics];
                        copy[idx].status = 'Fail';
                        setAfterDiagnostics(copy);
                      }}
                      className={`flex-1 py-1 rounded-md font-extrabold transition-all ${item.status === 'Fail' ? 'bg-rose-600 text-white shadow-2xs' : 'bg-slate-200 text-ink hover:bg-slate-300'}`}
                    >
                      Fail
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const copy = [...afterDiagnostics];
                        copy[idx].status = 'N/A';
                        setAfterDiagnostics(copy);
                      }}
                      className={`flex-1 py-1 rounded-md font-extrabold transition-all ${item.status === 'N/A' ? 'bg-slate-600 text-white shadow-2xs' : 'bg-slate-200 text-ink hover:bg-slate-300'}`}
                    >
                      N/A
                    </button>
                  </div>

                  <input
                    type="text"
                    value={item.note || ''}
                    onChange={(e) => {
                      const copy = [...afterDiagnostics];
                      copy[idx].note = e.target.value;
                      setAfterDiagnostics(copy);
                    }}
                    placeholder="Note e.g. TrueTone OK"
                    className="w-full bg-white border border-line rounded-md px-2 py-0.5 text-[10px] text-ink"
                  />
                </div>
              ))}
            </div>

            <div>
              <label className="block text-muted mb-1 font-semibold">QA Inspection Summary Note</label>
              <textarea
                rows={2}
                value={afterSummaryNote}
                onChange={(e) => setAfterSummaryNote(e.target.value)}
                placeholder="e.g. All functions tested pass. TrueTone transferred, battery charging test pass."
                className="w-full bg-[#F8F9FA] border border-line-strong rounded-xl p-2.5 text-xs text-ink"
              />
            </div>

            <Button
              type="button"
              onClick={handleSaveAfterDiagnostic}
              className="w-full max-w-md mx-auto bg-brand hover:bg-[#0077ED] text-white"
            >
              <span className="truncate">Save After-Repair Diagnostic & Update Ticket</span>
            </Button>
          </div>
        </div>
      )}

      {/* Customer Notification Alert Trigger Modal */}
      {notifWo && (
        <CustomerNotificationModal
          isOpen={isNotifModalOpen}
          onClose={() => setIsNotifModalOpen(false)}
          workOrder={notifWo}
          settings={systemSettings}
        />
      )}

      {/* MODAL: Initial Device Diagnostic Soft Notification Alert */}
      {pendingBeforeDiagAlertWo && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-amber-200 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative">
            <button 
              type="button" 
              onClick={() => setPendingBeforeDiagAlertWo(null)} 
              className="absolute right-4 top-4 text-muted hover:text-ink p-1 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 text-amber-900 bg-amber-50 p-3.5 rounded-xl border border-amber-200">
              <div className="p-2.5 bg-amber-500 text-white rounded-xl shadow-xs shrink-0">
                <AlertTriangle className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="font-black text-sm text-amber-950 uppercase tracking-tight">Initial Diagnostic Alert</h3>
                <p className="text-[11px] text-amber-800 font-bold">Mandatory Intake Inspection Pending</p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-ink">
              <p className="leading-relaxed">
                You are attempting to move Ticket{' '}
                <strong className="font-mono text-brand font-black bg-brand-soft px-2 py-0.5 rounded border border-brand/20">
                  {pendingBeforeDiagAlertWo.wo.orderNumber}
                </strong>{' '}
                ({pendingBeforeDiagAlertWo.wo.deviceModel}) to <strong className="text-amber-800 font-bold">"{pendingBeforeDiagAlertWo.newStatus}"</strong>.
              </p>

              <div className="p-3.5 bg-amber-50/90 border border-amber-300 rounded-xl text-amber-950 text-[11px] space-y-1.5">
                <span className="font-black flex items-center space-x-1.5 text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Intake Inspection Notice:</span>
                </span>
                <p className="leading-relaxed text-amber-900">
                  Initial 21-point diagnostic inspection has not been recorded for this device. Completing initial diagnostics before starting repair ensures hardware state is documented.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  const woToInspect = pendingBeforeDiagAlertWo.wo;
                  setPendingBeforeDiagAlertWo(null);
                  setDetailModalWo(woToInspect);
                }}
                className="w-full sm:w-auto flex-1 py-2.5 px-4 bg-brand hover:bg-[#0077ED] text-white font-extrabold rounded-xl text-xs flex items-center justify-center space-x-2 transition-all shadow-md active:scale-95 cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Complete Intake Diagnostic First</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const targetWo = pendingBeforeDiagAlertWo.wo;
                  const targetStatus = pendingBeforeDiagAlertWo.newStatus;
                  setPendingBeforeDiagAlertWo(null);

                  const formattedDate = new Date().toLocaleString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true
                  });
                  const newLog: RepairLogEntry = {
                    id: `log-${Date.now()}`,
                    timestamp: formattedDate,
                    author: currentUser?.name || 'Staff',
                    note: `⚠️ Initial Diagnostic Notice: Moved to "${targetStatus}" without recorded intake 21-point inspection.`,
                    statusChange: targetStatus
                  };
                  const updatedWo: WorkOrder = {
                    ...targetWo,
                    status: targetStatus,
                    repairLogs: [newLog, ...(targetWo.repairLogs || [])],
                    updatedAt: new Date().toISOString()
                  };

                  if (onSaveWorkOrder) onSaveWorkOrder(updatedWo);
                  onUpdateWorkOrderStatus(targetWo.id, targetStatus);
                }}
                className="w-full sm:w-auto py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-xl text-xs border border-slate-200 transition-all cursor-pointer"
              >
                Proceed (Soft Override)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Finished Device Diagnostic Soft Notification Alert */}
      {pendingDiagAlertWo && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-rose-200 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative">
            <button 
              type="button" 
              onClick={() => setPendingDiagAlertWo(null)} 
              className="absolute right-4 top-4 text-muted hover:text-ink p-1 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 text-rose-800 bg-rose-50 p-3.5 rounded-xl border border-rose-200">
              <div className="p-2.5 bg-rose-600 text-white rounded-xl shadow-xs shrink-0">
                <AlertCircle className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="font-black text-sm text-rose-950 uppercase tracking-tight">Finished Device Diagnostic Alert</h3>
                <p className="text-[11px] text-rose-700 font-bold">Mandatory Diagnostic Checklist Pending</p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-ink">
              <p className="leading-relaxed">
                You are attempting to move Ticket{' '}
                <strong className="font-mono text-brand font-black bg-brand-soft px-2 py-0.5 rounded border border-brand/20">
                  {pendingDiagAlertWo.wo.orderNumber}
                </strong>{' '}
                ({pendingDiagAlertWo.wo.deviceModel}) to <strong className="text-emerald-700 font-bold">"Finished"</strong>.
              </p>

              <div className="p-3.5 bg-rose-50/90 border border-rose-300 rounded-xl text-rose-950 text-[11px] space-y-1.5">
                <span className="font-black flex items-center space-x-1.5 text-rose-900">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Finished Device Protocol Notice:</span>
                </span>
                <p className="leading-relaxed text-rose-900">
                  This device is being marked as Finished, but the 21-point initial or post-repair diagnostic checklist has not been completed. Completing diagnostic checks ensures device functionality is fully verified before final customer delivery.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  const woToInspect = pendingDiagAlertWo.wo;
                  setPendingDiagAlertWo(null);
                  setDetailModalWo(woToInspect);
                }}
                className="w-full sm:w-auto flex-1 py-2.5 px-4 bg-brand hover:bg-[#0077ED] text-white font-extrabold rounded-xl text-xs flex items-center justify-center space-x-2 transition-all shadow-md active:scale-95 cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Complete Diagnostic First</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const targetWo = pendingDiagAlertWo.wo;
                  const targetStatus = pendingDiagAlertWo.newStatus;
                  setPendingDiagAlertWo(null);

                  const formattedDate = new Date().toLocaleString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true
                  });
                  const newLog: RepairLogEntry = {
                    id: `log-${Date.now()}`,
                    timestamp: formattedDate,
                    author: currentUser?.name || 'Staff',
                    note: '⚠️ Finished Device Notice: Marked as Finished without completed 21-point diagnostic inspection.',
                    statusChange: targetStatus
                  };
                  const updatedWo: WorkOrder = {
                    ...targetWo,
                    status: targetStatus,
                    repairLogs: [newLog, ...(targetWo.repairLogs || [])],
                    updatedAt: new Date().toISOString()
                  };

                  if (onSaveWorkOrder) onSaveWorkOrder(updatedWo);
                  onUpdateWorkOrderStatus(targetWo.id, targetStatus);
                }}
                className="w-full sm:w-auto py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-xl text-xs border border-slate-200 transition-all cursor-pointer"
              >
                Mark Finished (Soft Override)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
