import React, { useRef, useState } from 'react';
import {ChevronsRight,
  Eye,
  EyeOff, 
  Clock, 
  Timer,
  AlertCircle,
  AlertTriangle,
  X,
  Plus,
  DollarSign,
  Coins,
  UserCheck,
  ShieldCheck,
  ClipboardCheck,
  Trash2,
  BellRing,
  Stethoscope,
  GitBranch,
  MoreHorizontal} from 'lucide-react';
import {WorkOrder, 
  WorkOrderStatus, 
  Technician, 
  RepairLogEntry, 
  DiagnosticItemResult,
  SystemSettings,
  AppUser} from '../../types';
import { Button , Input } from '../ui';
import { ActiveFilterChips } from '../common/ActiveFilterChips';
import {get21Diagnostics,
  checkIsBeforeDiagnosticNeeded,
  checkIsAfterDiagnosticNeeded,
  checkIsBeforeDiagnosticCompleted,
  checkIsAfterDiagnosticCompleted} from '../../utils/diagnosticUtils';
import { getActivePaymentMethods } from '../../data/seedData';
import { CustomDropdownMenu } from '../common/CustomDropdownMenu';
import {DateFilterState, isDateMatchingFilter} from '../common/DateFilterSelector';

import { PriorityBadge } from '../common/PriorityBadge';

import { useLanguage } from '../../context/LanguageContext';
import { CustomerNotificationModal } from '../common/CustomerNotificationModal';
import { TicketDetailInspectorModal } from '../common/TicketDetailInspectorModal';
import { useIsIpad } from '../../hooks/useIsIpad';
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
  { id: 'Receive', title: 'Receive', subtitle: 'New Intake', color: 'border-brand/30 bg-brand-soft/40', badgeColor: 'bg-brand text-white font-extrabold tracking-wide' },
  { id: 'In Progress', title: 'In Progress', subtitle: 'Repair Active', color: 'border-purple/30 bg-purple/10', badgeColor: 'bg-purple text-white font-extrabold tracking-wide' },
  { id: 'Pending', title: 'Pending', subtitle: 'Waiting Parts/Client', color: 'border-warning/30 bg-warning/10', badgeColor: 'bg-warning text-white font-extrabold' },
  { id: 'Finished', title: 'Finished', subtitle: 'QA Passed / Ready', color: 'border-success/30 bg-success/10', badgeColor: 'bg-success text-white font-extrabold' },
  { id: 'Taken Out', title: 'Taken Out', subtitle: 'Paid & Returned', color: 'border-line bg-surface/50', badgeColor: 'bg-ink/80 text-white font-extrabold' },
  { id: 'Cant Repair', title: 'Cant Repair', subtitle: 'Declined / Unfixable', color: 'border-danger/30 bg-danger/10', badgeColor: 'bg-danger text-white font-extrabold' },
  { id: 'Customer Not Repair', title: 'Customer Not Repair', subtitle: 'Cancelled by Client', color: 'border-warning/30 bg-warning/10', badgeColor: 'bg-warning text-white font-extrabold' },
];

/** Shared soft-notification alert for diagnostic-gated status moves (was ~87-line verbatim copy ×2, P2 audit 2026-08-08) */
function DiagnosticSoftAlert({ tone, title, subtitle, body, noticeLabel, noticeBody, inspectLabel, overrideLabel, onClose, onInspect, onOverride }: {
  tone: 'warning' | 'danger';
  title: string;
  subtitle: string;
  body: React.ReactNode;
  noticeLabel: string;
  noticeBody: string;
  inspectLabel: string;
  overrideLabel: string;
  onClose: () => void;
  onInspect: () => void;
  onOverride: () => void;
}) {
  const isWarn = tone === 'warning';
  const Icon = isWarn ? AlertTriangle : AlertCircle;
  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className={`bg-white border ${isWarn ? 'border-warning/30' : 'border-danger/30'} rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative`}>
        <Button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-muted hover:text-ink p-1 rounded-lg hover:bg-surface transition-colors"
        >
          <X className="w-5 h-5" />
        </Button>

        <div className={`flex items-center space-x-3 ${isWarn ? 'text-warning bg-warning/10 border-warning/30' : 'text-danger bg-danger/10 border-danger/30'} p-3.5 rounded-xl border`}>
          <div className={`p-2.5 ${isWarn ? 'bg-warning' : 'bg-danger'} text-white rounded-xl shadow-xs shrink-0`}>
            <Icon className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h3 className={`font-black text-sm ${isWarn ? 'text-warning' : 'text-danger'} uppercase tracking-tight`}>{title}</h3>
            <p className={`text-xs ${isWarn ? 'text-warning' : 'text-danger'} font-bold`}>{subtitle}</p>
          </div>
        </div>

        <div className="space-y-3 text-xs text-ink">
          {body}

          <div className={`p-3.5 ${isWarn ? 'bg-warning/10 border-warning/30' : 'bg-danger/10 border-danger/30'} rounded-xl ${isWarn ? 'text-warning' : 'text-danger'} text-xs space-y-1.5`}>
            <span className={`font-black flex items-center space-x-1.5 ${isWarn ? 'text-warning' : 'text-danger'}`}>
              <AlertTriangle className={`w-4 h-4 ${isWarn ? 'text-warning' : 'text-danger'} shrink-0`} />
              <span>{noticeLabel}</span>
            </span>
            <p className={`leading-relaxed ${isWarn ? 'text-warning' : 'text-danger'}`}>{noticeBody}</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2 pt-3 border-t border-line">
          <Button
            type="button"
            onClick={onInspect}
            className="w-full sm:w-auto flex-1 py-2.5 px-4 bg-brand hover:bg-brand-deep text-white font-extrabold rounded-xl text-xs flex items-center justify-center space-x-2 transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{inspectLabel}</span>
          </Button>

          <Button
            type="button"
            onClick={onOverride}
            className="w-full sm:w-auto py-2.5 px-3 bg-surface hover:bg-line text-muted font-extrabold rounded-xl text-xs border border-line transition-all cursor-pointer"
          >
            {overrideLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

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
  const isIpad = useIsIpad();
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
  const [moveStageModalWo, setMoveStageModalWo] = useState<WorkOrder | null>(null);
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
  // Kanban board container ref — used by the mobile stage-jump strip to scroll to a column
  const boardRef = useRef<HTMLDivElement | null>(null);

  // Bottleneck Helper Functions
  const getHoursInStatus = (wo: WorkOrder) => {
    const refTime = Date.now();
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


  const getCardStyle = (status: WorkOrderStatus, isStagnant: boolean) => {
    if (isStagnant) {
      return 'bg-warning/50 border border-warning/30 shadow-2xs hover:border-amber-500 hover:ring-2 hover:ring-amber-400/30 transition-all duration-200';
    }
    switch (status) {
      case 'Receive':
        return 'bg-white border border-line shadow-2xs hover:border-brand hover:ring-2 hover:ring-brand/20 transition-all duration-200';
      case 'In Progress':
        return 'bg-white border border-line shadow-2xs hover:border-purple hover:ring-2 hover:ring-purple/20 transition-all duration-200';
      case 'Pending':
        return 'bg-white border border-line shadow-2xs hover:border-amber-500 hover:ring-2 hover:ring-amber-500/20 transition-all duration-200';
      case 'Finished':
        return 'bg-white border border-line shadow-2xs hover:border-success hover:ring-2 hover:ring-success/20 transition-all duration-200';
      case 'Cant Repair':
        return 'bg-white border border-line shadow-2xs hover:border-rose-400 hover:ring-2 hover:ring-rose-400/20 transition-all duration-200';
      case 'Customer Not Repair':
        return 'bg-white border border-line shadow-2xs hover:border-orange-400 hover:ring-2 hover:ring-orange-400/20 transition-all duration-200';
      default:
        return 'bg-white border border-line shadow-2xs hover:border-line-strong hover:ring-2 hover:ring-slate-400/20 transition-all duration-200';
    }
  };

  // Quick-assign: one-tap from the card (dropdown for managers, self-assign for techs)
  const handleQuickAssign = (wo: WorkOrder, techId: string) => {
    const normalizedId = techId === 'unassigned' ? '' : techId;
    const tech = technicians.find((t) => t.id === normalizedId);
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
      ...wo,
      assignedTechId: normalizedId,
      assignedTechName: tech?.name,
      repairLogs: [newLog, ...(wo.repairLogs || [])],
      updatedAt: new Date().toISOString()
    };
    if (onSaveWorkOrder) onSaveWorkOrder(updatedWo);
    toast.success(tech ? `Ticket assigned to ${tech.name}.` : 'Ticket marked Unassigned.', 'Technician Updated');
  };

  const openCheckoutModal = (wo: WorkOrder) => {
    setCheckoutModalWo(wo);
    setPaidAmountInput(wo.totalAmount ? String(wo.totalAmount) : '0');
  };

  const openAfterDiagModal = (wo: WorkOrder) => {
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
  };

  // Card "⋯ More" menu actions (Detail / Log / Notify / After Diag)
  const handleCardMenuAction = (action: string, wo: WorkOrder) => {
    if (action === 'detail') setDetailModalWo(wo);
    else if (action === 'log') setAddLogModalWo(wo);
    else if (action === 'notify') {
      setNotifWo(wo);
      setIsNotifModalOpen(true);
    } else if (action === 'after-diag') openAfterDiagModal(wo);
    else if (action === 'move-stage') setMoveStageModalWo(wo);
  };

  const handleMoveToStage = (targetWo: WorkOrder, newStatus: WorkOrderStatus) => {
    setMoveStageModalWo(null);
    if (!targetWo || newStatus === targetWo.status) return;
    // Mirror the onDrop guard chain so keyboard moves obey the same rules as drag-and-drop.
    if (newStatus === 'Taken Out') {
      setCheckoutModalWo(targetWo);
      setPaidAmountInput(targetWo.totalAmount ? String(targetWo.totalAmount) : '0');
      return;
    }
    if (newStatus === 'Finished' && !checkIsAfterDiagnosticCompleted(targetWo)) {
      setPendingDiagAlertWo({ wo: targetWo, newStatus: 'Finished' });
      return;
    }
    if ((newStatus === 'In Progress' || newStatus === 'Pending') && !checkIsBeforeDiagnosticCompleted(targetWo)) {
      setPendingBeforeDiagAlertWo({ wo: targetWo, newStatus });
      return;
    }
    onUpdateWorkOrderStatus(targetWo.id, newStatus);
  };

  const scrollToStage = (stageId: string) => {
    const col = boardRef.current?.querySelector(`[data-stage-id="${stageId}"]`);
    col?.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
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

  // Check if active filters exist (used for UX hints elsewhere)
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
      {/* Top Controls Bar — DESKTOP original layout (inline toggles, reset, delete-all).
          iPad uses the clean layout: everything lives in the filter drawer instead. */}
      {!isIpad && (
        <>
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line-strong bg-white px-2.5 py-2 text-xs shadow-2xs">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="whitespace-nowrap font-extrabold text-ink">Active Pipeline Overview</span>
          <span className="truncate text-xs font-medium text-muted">({filteredWorkOrders.length} tickets matching filters)</span>
        </div>

        <div className="hidden lg:grid lg:grid-cols-2 xl:flex xl:flex-wrap xl:items-center xl:justify-end gap-1.5">
          <Button
            type="button"
            onClick={() => setShowAllStages((v) => !v)}
            className={`inline-flex w-full sm:w-auto h-8 sm:h-7 items-center justify-center gap-1 rounded-md border px-2 text-xs font-bold transition-colors cursor-pointer ${
              showAllStages
                ? 'bg-ink text-white border-ink shadow-2xs'
                : 'bg-white text-ink border-line hover:bg-surface'
            }`}
            title={showAllStages ? 'Hide the exception columns again' : 'Show Cant Repair and Customer Not Repair columns'}
          >
            {showAllStages ? (
              <><EyeOff className="w-3 h-3 shrink-0" /><span>Hide Exceptions</span></>
            ) : (
              <><Eye className="w-3 h-3 shrink-0" /><span>Show All{hiddenStageCounts.some((h) => h.count > 0) ? ` (${hiddenStageCounts.filter((h) => h.count > 0).map((h) => `${h.id.split(' ')[0]}:${h.count}`).join(' ')})` : ''}</span></>
            )}
          </Button>

          <Button
            type="button"
            onClick={() => {
              setShowBeforeNeedsDiagOnly(!showBeforeNeedsDiagOnly);
              setShowNeedsDiagOnly(false);
            }}
                className={`inline-flex w-full sm:w-auto h-8 sm:h-7 items-center justify-center gap-1 rounded-md border px-2 text-xs font-bold transition-colors cursor-pointer ${
                  showBeforeNeedsDiagOnly
                    ? 'bg-brand text-white border-blue-700 shadow-2xs'
                    : 'bg-brand-soft text-brand border-brand/30 hover:bg-brand/15'
                }`}
          >
            <Stethoscope className="h-3 w-3 shrink-0" />
            <span>Before-Diag Pending ({beforeNeedsDiagTotalCount})</span>
          </Button>

          <Button
            type="button"
            onClick={() => {
              setShowNeedsDiagOnly(!showNeedsDiagOnly);
              setShowBeforeNeedsDiagOnly(false);
            }}
              className={`inline-flex w-full sm:w-auto h-8 sm:h-7 items-center justify-center gap-1 rounded-md border px-2 text-xs font-bold transition-colors cursor-pointer ${
                showNeedsDiagOnly
                  ? 'bg-purple text-white border-purple-700 shadow-2xs'
                  : 'bg-purple/10 text-purple border-purple/30 hover:bg-purple/15'
              }`}
          >
            <ShieldCheck className="h-3 w-3 shrink-0" />
            <span>After-Diag Pending ({afterNeedsDiagTotalCount})</span>
          </Button>

          {showBottlenecksOnly && (
            <span className="inline-flex h-7 items-center gap-1 rounded-md border border-red-600 bg-danger/100 px-2 text-xs font-bold text-white shadow-2xs">
              <Timer className="h-3 w-3 shrink-0" />
              <span>Filtering Bottlenecks (&gt;48h)</span>
            </span>
          )}

          {onClearAllWorkOrders && workOrders.length > 0 && (
            <Button
              type="button"
              onClick={() => {
                if (window.confirm(`Are you sure you want to clear all ${workOrders.length} tickets from the system?`)) {
                  onClearAllWorkOrders();
                }
              }}
              className="inline-flex h-7 items-center gap-1 rounded-md border border-danger/30 bg-danger/10 px-2 text-xs font-bold text-danger shadow-2xs transition-colors hover:bg-danger/15"
              title="⚠️ Permanently delete ALL tickets from the system (Admin only)"
            >
              <Trash2 className="h-3 w-3 shrink-0 text-danger" />
              <span>Delete All Tickets ({workOrders.length})</span>
            </Button>
          )}
        </div>
      </div>

      {/* Mobile stage toggles — phones only (drawer covers iPad) */}
      <div className="lg:hidden flex items-center gap-1.5 overflow-x-auto no-scrollbar -mx-0.5 px-0.5">
        <Button
          type="button"
          onClick={() => setShowAllStages((v) => !v)}
          className={`inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl border px-3 text-xs font-bold transition-colors cursor-pointer active:scale-95 ${
            showAllStages
              ? 'bg-ink text-white border-ink shadow-2xs'
              : 'bg-white text-ink border-line-strong hover:bg-surface'
          }`}
          aria-pressed={showAllStages}
        >
          {showAllStages ? <EyeOff className="w-3.5 h-3.5 shrink-0" /> : <Eye className="w-3.5 h-3.5 shrink-0 text-brand" />}
          <span>{showAllStages ? 'Hide Exception Stages' : 'Show Exception Stages'}</span>
          {hiddenStageCounts.some((h) => h.count > 0) && (
            <span className={`rounded-full px-1.5 py-0.5 text-xs font-black ${showAllStages ? 'bg-black/25 text-white' : 'bg-danger/15 text-danger'}`}>
              {hiddenStageCounts.filter((h) => h.count > 0).reduce((acc, h) => acc + h.count, 0)}
            </span>
          )}
        </Button>
        {!showAllStages && (
          <p className="shrink-0 text-xs font-medium text-muted">Cant Repair · Customer Not Repair</p>
        )}
      </div>
        </>
      )}

      {/* Active filter summary chips — one-tap clear (all viewports; wraps on mobile) */}
      <div className="block">
        <ActiveFilterChips chips={activeFilterChips} />
      </div>

      {/* Horizontal Scrollable Kanban Columns (scrolls below xl; fits on desktop) */}
      <div className="relative">
      <div
        ref={boardRef}
        role="group"
        aria-label="Active pipeline kanban board — scroll horizontally to see all stages"
        className={`kanban-scroll flex min-h-[calc(100dvh-14rem)] gap-3 overflow-x-auto pb-4 pt-1 ${isIpad ? 'snap-none' : 'snap-x snap-mandatory'} touch-pan-x no-scrollbar xl:snap-none`}
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
              data-stage-id={stage.id}
              aria-label={`${stage.title} column — ${stageOrders.length} tickets`}
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
              className={`rounded-2xl border ${stage.color} bg-white/50 backdrop-blur-xs p-3 flex flex-col shadow-2xs transition-all snap-start ${
                stageOrders.length === 0
                  ? 'w-[52px] min-w-[52px] items-center xl:w-[64px] xl:min-w-[64px]'
                  : isIpad
                    ? 'flex-1 min-w-[200px] xl:flex-1 xl:min-w-[240px] xl:max-w-none'
                    : 'w-[260px] min-w-[260px] xl:w-auto xl:min-w-[240px] xl:flex-1 xl:max-w-none'
              }`}
            >
              {/* Column Header — slim vertical strip when empty, full header otherwise */}
              {stageOrders.length === 0 ? (
                <div
                  className="flex flex-col items-center justify-center gap-2 py-3"
                  title={`${stage.title} — no tickets. Drag a ticket here to move it.`}
                >
                  <div className="[writing-mode:vertical-rl] rotate-180 text-xs font-extrabold text-muted tracking-wide whitespace-nowrap">
                    {stage.id === 'Receive' ? t('statusReceive') :
                     stage.id === 'In Progress' ? t('statusInProgress') :
                     stage.id === 'Pending' ? t('statusPending') :
                     stage.id === 'Finished' ? t('statusFinished') :
                     stage.id === 'Taken Out' ? t('statusTakenOut') :
                     stage.id === 'Cant Repair' ? t('statusCantRepair') :
                     stage.id === 'Customer Not Repair' ? t('statusCustomerNotRepair') : stage.title}
                  </div>
                  <span className={`text-[11px] font-extrabold px-1.5 py-px rounded-full shadow-2xs ${stage.badgeColor}`}>0</span>
                </div>
              ) : (
                <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-line">
                  <div>
                    <div className="text-xs font-extrabold text-ink tracking-tight">
                      {stage.id === 'Receive' ? t('statusReceive') :
                       stage.id === 'In Progress' ? t('statusInProgress') :
                       stage.id === 'Pending' ? t('statusPending') :
                       stage.id === 'Finished' ? t('statusFinished') :
                       stage.id === 'Taken Out' ? t('statusTakenOut') :
                       stage.id === 'Cant Repair' ? t('statusCantRepair') :
                       stage.id === 'Customer Not Repair' ? t('statusCustomerNotRepair') : stage.title}
                    </div>
                    <p className="text-xs text-muted font-medium">{stage.subtitle}</p>
                  </div>
                  <div className="flex items-center space-x-1">
                    {stageStagnantOrders.length > 0 && (
                      <span
                        className="text-[11px] font-extrabold px-1.5 py-px rounded-full bg-warning/15 text-warning border border-warning/30 flex items-center space-x-0.5"
                        title={`${stageStagnantOrders.length} ticket(s) stationary >48h in this stage`}
                      >
                        <AlertTriangle className="w-2 h-2 text-warning shrink-0" />
                        <span>{stageStagnantOrders.length}</span>
                      </span>
                    )}
                    <span className={`text-[11px] font-extrabold px-1.5 py-px rounded-full shadow-2xs ${stage.badgeColor}`}>
                      {stageOrders.length}
                    </span>
                  </div>
                </div>
              )}

              {/* Cards Container */}
              <div className={`flex-1 ${stageOrders.length === 0 ? 'min-h-[90px]' : 'space-y-3 overflow-y-auto pr-0.5 max-h-[680px]'}`}>
                {stageOrders.length === 0 ? null : (
                  stageOrders.map((wo) => {
                    const tech = technicians.find((t) => t.id === wo.assignedTechId);
                    const hoursInStatus = getHoursInStatus(wo);
                    const isStagnant = getIsStagnant(wo);
                    // Age chip: neutral <24h · amber 24–48h · red ≥48h (red only matters for
                    // terminal stages — active stages already get the red Bottleneck banner)
                    const ageChipClass = hoursInStatus >= 48
                      ? 'text-danger bg-danger/10 border border-danger/30 rounded-md px-1.5 py-0.5'
                      : hoursInStatus >= 24
                      ? 'text-warning bg-warning/10 border border-warning/30 rounded-md px-1.5 py-0.5'
                      : 'text-muted';
                    const ageChipIconClass = hoursInStatus >= 24 ? 'text-warning' : 'text-brand';

                    const isBeforeDiagNeeded = checkIsBeforeDiagnosticNeeded(wo);
                    const isAfterDiagNeeded = checkIsAfterDiagnosticNeeded(wo);

                    return (
                      <div
                        key={wo.id}
                        draggable
                        onDragStart={() => setDraggedWoId(wo.id)}
                        onClick={() => setDetailModalWo(wo)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setDetailModalWo(wo); }
                        }}
                        className={`p-3 rounded-xl shadow-xs hover:shadow-md space-y-2 text-xs min-h-[200px] transition-shadow duration-150 ease-out cursor-pointer active:cursor-grabbing group ${
                          isBeforeDiagNeeded 
                            ? 'border-l-4 border-l-amber-500 bg-warning/10/20' 
                            : isAfterDiagNeeded 
                            ? 'border-l-4 border-l-purple-600 bg-purple/10/20' 
                            : ''
                        } ${getCardStyle(
                          wo.status,
                          isStagnant
                        )}`}
                      >
                        {/* Header: Order Number & Priority Badge */}
                        <div className="flex items-center justify-between gap-1.5">
                          <div className="flex items-center space-x-1.5 min-w-0">
                            <span className="h-[20px] font-mono text-xs font-extrabold text-brand bg-brand-soft px-2 rounded-md border border-brand/20 inline-flex items-center justify-center shrink-0 leading-none">{wo.orderNumber}</span>
                            <PriorityBadge priority={wo.priority} size="xs" />
                          </div>
                          <div className="flex items-center space-x-1 shrink-0">
                            {isBeforeDiagNeeded && (
                              <span
                                className="w-5 h-5 rounded-full bg-brand-soft text-brand border border-brand/30 flex items-center justify-center shrink-0 shadow-2xs"
                                title="Initial 21-Point Diagnostic Pending"
                              >
                                <Stethoscope className="w-3 h-3 text-brand shrink-0" />
                              </span>
                            )}
                            {isAfterDiagNeeded && (
                              <span
                                className="w-5 h-5 rounded-full bg-purple/15 text-purple border border-purple/30 flex items-center justify-center shrink-0 shadow-2xs"
                                title="Post-Repair Diagnostic Quality Check Pending"
                              >
                                <ShieldCheck className="w-3 h-3 text-purple shrink-0" />
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Stagnant Bottleneck Alert Banner / Age Chip (amber ≥24h, red ≥48h) */}
                        {isStagnant ? (
                          <div className="flex items-center justify-between px-2 py-1 rounded-lg bg-danger/10 border border-danger/30 text-danger text-xs font-extrabold">
                            <span className="flex items-center space-x-1">
                              <Timer className="w-3.5 h-3.5 text-danger animate-pulse shrink-0" />
                              <span>Bottleneck (&gt;48h)</span>
                            </span>
                            <span className="font-mono bg-danger/15 px-1.5 py-0.5 rounded text-danger">{hoursInStatus}h</span>
                          </div>
                        ) : (
                          <div className={`flex items-center space-x-1 text-xs ${ageChipClass}`}>
                            <Clock className={`w-3 h-3 shrink-0 ${ageChipIconClass}`} />
                            <span><strong className="text-ink">{hoursInStatus < 1 ? '< 1h' : `${hoursInStatus}h`}</strong></span>
                          </div>
                        )}

                        {/* Model & Customer & Repair Issue */}
                        <div className="cursor-pointer space-y-1" title={`Open detail — ${wo.deviceModel || wo.orderNumber || wo.id}`}>
                          <p className="font-extrabold text-ink text-xs line-clamp-1 hover:text-brand transition-colors">{wo.deviceModel}</p>
                          <p className="text-xs text-muted truncate" title={`${wo.customerName} • ${wo.customerPhone}`}>{wo.customerName} • {wo.customerPhone}</p>
                          
                          {/* What to repair under Customer info */}
                          <div className="flex items-start space-x-1.5 pt-1 mt-1 border-t border-line text-xs text-ink">
                            <ClipboardCheck className="w-3.5 h-3.5 text-brand shrink-0 mt-0.5" />
                            <span className="font-semibold text-muted line-clamp-2 leading-tight">
                              {getRepairSummary(wo)}
                            </span>
                          </div>
                        </div>

                        {/* Tech — one-tap quick assign (dropdown for managers, self-assign for techs) */}
                        <div className="flex items-center justify-between text-xs pt-1 border-t border-line text-muted" onClick={(e) => e.stopPropagation()}>
                          <span className="font-bold text-ink flex items-center space-x-1">
                            <UserCheck className="w-3.5 h-3.5 text-brand shrink-0" />
                            {tech?.name?.split(' ')[0] || 'Unassigned'}
                          </span>
                          {isTechnicianUser && myTechId ? (
                            <Button
                              type="button"
                              onClick={() => handleQuickAssign(wo, myTechId)}
                              className="text-brand hover:underline flex items-center space-x-0.5 font-semibold cursor-pointer min-h-8"
                              title="Assign this ticket to yourself"
                            >
                              <UserCheck className="w-3 h-3" />
                              <span>Assign Me</span>
                            </Button>
                          ) : (
                            <CustomDropdownMenu
                              value={wo.assignedTechId || ''}
                              onChange={(techId) => handleQuickAssign(wo, techId)}
                              ariaLabel={`Assign technician for ${wo.orderNumber}`}
                              placeholder="Assign"
                              menuAlign="right"
                              buttonClassName="!h-8 !min-w-0 !px-2 !border-0 !bg-transparent text-brand hover:!bg-transparent !shadow-none !text-xs"
                              options={[
                                { value: 'unassigned', label: 'Unassigned' },
                                ...technicians.map((t) => ({
                                  value: t.id,
                                  label: t.name,
                                  badge: t.activeJobsCount,
                                  badgeColor: t.activeJobsCount > 0 ? 'bg-warning/15 text-warning' : 'bg-surface text-muted',
                                })),
                              ]}
                            />
                          )}
                        </div>

                        {/* Primary Card Action + ⋯ More menu (Detail/Log/Notify stay one tap away) */}
                        <div className="flex items-stretch gap-1 pt-1 border-t border-line text-xs" onClick={(e) => e.stopPropagation()}>
                          {stage.id === 'Finished' ? (
                            <Button
                              type="button"
                              onClick={() => openCheckoutModal(wo)}
                              className="flex-1 py-1.5 px-1 bg-success hover:bg-success/90 text-white font-extrabold rounded-lg border border-success text-center flex items-center justify-center space-x-0.5 truncate shadow-xs min-h-10"
                            >
                              <DollarSign className="w-3 h-3 shrink-0" />
                              <span>Checkout</span>
                            </Button>
                          ) : stage.id === 'Pending' ? (
                            <Button
                              type="button"
                              onClick={() => {
                                setNotifWo(wo);
                                setIsNotifModalOpen(true);
                              }}
                              className="flex-1 py-1.5 px-1 bg-purple/10 hover:bg-purple/20 text-purple font-extrabold rounded-lg border border-purple/20 text-center flex items-center justify-center space-x-0.5 truncate min-h-10"
                              title="Alert Customer SMS/Viber/Telegram"
                            >
                              <BellRing className="w-3 h-3 shrink-0" />
                              <span>Notify</span>
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              onClick={() => setAddLogModalWo(wo)}
                              className="flex-1 py-1.5 px-1 bg-brand/10 hover:bg-brand/15 text-brand-deep font-extrabold rounded-lg border border-brand/20 text-center flex items-center justify-center space-x-0.5 truncate min-h-10"
                            >
                              <Plus className="w-3 h-3 shrink-0" />
                              <span>Log</span>
                            </Button>
                          )}
                          <CustomDropdownMenu
                            value=""
                            onChange={(action) => handleCardMenuAction(action, wo)}
                            ariaLabel={`More actions for ${wo.orderNumber}`}
                            iconOnly
                            triggerIcon={<MoreHorizontal className="w-4 h-4" />}
                            buttonClassName="!h-10 !w-10 shrink-0"
                            menuAlign="right"
                            options={[
                              { value: 'detail', label: 'Detail' },
                              // Primary button already covers Log (Receive/In Progress/…) and
                              // Notify (Pending) — don't duplicate them in the ⋯ menu.
                              ...(stage.id === 'Finished' || stage.id === 'Pending' ? [{ value: 'log', label: 'Log' }] : []),
                              ...(stage.id === 'Pending' ? [] : [{ value: 'notify', label: 'Notify' }]),
                              ...(wo.status === 'Finished' ? [{ value: 'after-diag', label: 'After Diag' }] : []),
                              { value: 'move-stage', label: 'Move to Stage…' },
                            ]}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
      {/* Right-edge scroll fade (mobile/tablet) — hints there are more stages off-screen */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 w-10 rounded-r-2xl bg-gradient-to-l from-white/70 to-transparent xl:hidden" />
      </div>

      {/* Stage-jump strip (below xl) — tap a stage chip to scroll the board to it */}
      {(() => {
        const visibleStages = KANBAN_STAGES.filter(
          (s) => (showAllStages || (s.id !== 'Cant Repair' && s.id !== 'Customer Not Repair')) && (statusFilter === 'ALL' || s.id === statusFilter)
        );
        if (visibleStages.length <= 1 || filteredWorkOrders.length === 0) return null;
        return (
          <div className="xl:hidden flex items-center gap-1.5 overflow-x-auto no-scrollbar -mx-0.5 px-0.5" aria-label="Jump to pipeline stage">
            {visibleStages.map((s) => {
              const count = filteredWorkOrders.filter((w) => w.status === s.id).length;
              return (
                <Button
                  key={s.id}
                  type="button"
                  onClick={() => scrollToStage(s.id)}
                  className={`inline-flex !h-7 !min-h-7 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-extrabold transition-colors cursor-pointer active:scale-95 ${
                    count > 0 ? 'bg-white text-ink border-line-strong hover:bg-surface' : 'bg-transparent text-muted border-dashed border-line'
                  }`}
                  title={`Scroll to ${s.title} column`}
                >
                  <span>{s.id}</span>
                  <span className={`rounded-full px-1.5 py-px text-[11px] font-black ${count > 0 ? 'bg-brand text-white' : 'bg-surface text-muted'}`}>{count}</span>
                </Button>
              );
            })}
          </div>
        );
      })()}

      {/* Ticket Detail Inspector (active modal — legacy hidden modal removed 2026-08-06) */}
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
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-line-strong rounded-2xl max-w-md w-full p-6 space-y-4 text-xs shadow-2xl relative">
            <Button onClick={() => setAddLogModalWo(null)} aria-label="Close repair log" className="absolute right-4 top-4 text-muted hover:text-ink">
              <X className="w-5 h-5" />
            </Button>

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
                className="w-full bg-surface border border-line-strong rounded-xl p-3 text-xs text-ink focus:border-brand"
              />
            </div>

            <Button
              type="button"
              onClick={handleAddRepairLog}
              className="w-full bg-brand text-white hover:bg-brand-deep"
            >
              Save Repair Log
            </Button>
          </div>
        </div>
      )}

      {/* MODAL 3: Assign Technician */}
      {assignTechModalWo && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-line-strong rounded-2xl max-w-sm w-full p-6 space-y-4 text-xs shadow-2xl relative">
            <Button onClick={() => setAssignTechModalWo(null)} aria-label="Close technician assignment" className="absolute right-4 top-4 text-muted hover:text-ink">
              <X className="w-5 h-5" />
            </Button>

            <h3 className="text-sm font-bold text-ink border-b border-line-strong pb-2 flex items-center space-x-2">
              <UserCheck className="w-4 h-4 text-brand" />
              <span>Assign Technician ({assignTechModalWo.orderNumber})</span>
            </h3>

            <div className="space-y-2">
              {technicians.map(t => (
                <Button
                  key={t.id}
                  onClick={() => handleAssignTechnician(t.id)}
                  className={`w-full p-3 rounded-xl border text-left flex justify-between items-center transition-all ${
                    assignTechModalWo.assignedTechId === t.id
                      ? 'border-brand bg-brand-soft text-brand font-bold'
                      : 'border-line-strong bg-white text-ink hover:bg-surface'
                  }`}
                >
                  <div>
                    <p className="font-bold text-xs">{t.name}</p>
                    <p className="text-xs opacity-70">{t.level}</p>
                  </div>
                  <span className="text-xs bg-surface text-ink px-2 py-0.5 rounded-full font-bold">
                    {t.activeJobsCount} Active Jobs
                  </span>
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3b: Move to Stage — keyboard-accessible status change (mirrors drag-and-drop) */}
      {moveStageModalWo && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-line-strong rounded-2xl max-w-sm w-full p-6 space-y-4 text-xs shadow-2xl relative">
            <Button onClick={() => setMoveStageModalWo(null)} aria-label="Close move to stage" className="absolute right-4 top-4 text-muted hover:text-ink">
              <X className="w-5 h-5" />
            </Button>

            <h3 className="text-sm font-bold text-ink border-b border-line-strong pb-2 flex items-center space-x-2">
              <GitBranch className="w-4 h-4 text-brand" />
              <span>Move to Stage ({moveStageModalWo.orderNumber})</span>
            </h3>

            <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
              {KANBAN_STAGES.map((s) => {
                const isCurrent = moveStageModalWo.status === s.id;
                const count = workOrders.filter((w) => w.status === s.id).length;
                return (
                  <Button
                    key={s.id}
                    type="button"
                    disabled={isCurrent}
                    onClick={() => handleMoveToStage(moveStageModalWo, s.id)}
                    className={`w-full p-3 rounded-xl border text-left flex justify-between items-center transition-all ${
                      isCurrent
                        ? 'border-line bg-surface text-muted cursor-not-allowed'
                        : 'border-line-strong bg-white text-ink hover:bg-brand-soft hover:border-brand/40'
                    }`}
                  >
                    <div>
                      <p className="font-bold text-xs">{s.title}</p>
                      <p className="text-xs opacity-70">{s.subtitle}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${isCurrent ? 'bg-surface text-muted' : 'bg-surface text-ink'}`}>
                      {isCurrent ? 'Current' : `${count} tickets`}
                    </span>
                  </Button>
                );
              })}
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
          <Button
            type="button"
            onClick={() => setShowAllStages(true)}
            className="flex w-full items-center justify-center gap-1.5 rounded-full border border-dashed border-danger/30 bg-danger/10 px-3 py-2.5 text-xs font-extrabold text-danger transition-colors cursor-pointer active:scale-[0.99]"
          >
            <Eye className="w-3.5 h-3.5 text-danger shrink-0" />
            <span>
              Show Cant Repair{hiddenStageCounts[0].count > 0 ? ` (${hiddenStageCounts[0].count})` : ''} & Customer Not Repair{hiddenStageCounts[1].count > 0 ? ` (${hiddenStageCounts[1].count})` : ''}
            </span>
          </Button>
        </div>
      ) : !kanbanAtEnd ? (
        <div className="flex items-center justify-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-extrabold text-muted md:hidden animate-fadeIn">
          <ChevronsRight className="w-3.5 h-3.5 text-brand" />
          <span>Scroll for Cant Repair / Customer Not Repair</span>
          <ChevronsRight className="w-3.5 h-3.5 text-brand" />
        </div>
      ) : null}

      {/* MODAL 4: Checkout Payment */}
      {checkoutModalWo && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-line-strong rounded-2xl max-w-md w-full p-6 space-y-4 text-xs shadow-2xl relative">
            <Button onClick={() => setCheckoutModalWo(null)} aria-label="Close checkout" className="absolute right-4 top-4 text-muted hover:text-ink">
              <X className="w-5 h-5" />
            </Button>

            <h3 className="text-sm font-bold text-ink border-b border-line-strong pb-2 flex items-center space-x-2">
              <Coins className="w-4 h-4 text-success" />
              <span>Checkout Payment ({checkoutModalWo.orderNumber})</span>
            </h3>

            <div className="bg-success/10 p-3 rounded-xl border border-success/30 text-xs text-success-deep font-bold flex justify-between">
              <span>Total Invoice Due:</span>
              <span className="text-sm font-mono">{checkoutModalWo.totalAmount.toLocaleString()} MMK</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-muted mb-1 font-medium">Paid Amount (MMK) *</label>
                <Input
                  type="number"
                  value={paidAmountInput}
                  onChange={(e) => setPaidAmountInput(e.target.value)}
                  className="w-full bg-surface border border-line-strong rounded-xl px-3 py-2 text-sm font-mono font-bold text-ink"
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
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-line-strong rounded-2xl max-w-xl w-full p-6 space-y-4 text-xs shadow-2xl relative max-h-[88vh] overflow-y-auto">
            <Button onClick={() => setAfterDiagModalWo(null)} aria-label="Close post-diagnosis" className="absolute right-4 top-4 text-muted hover:text-ink">
              <X className="w-5 h-5" />
            </Button>

            <div className="border-b border-line-strong pb-3 space-y-1">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-purple" />
                <h3 className="text-sm font-bold text-ink">
                  After-Repair 21-Point QA Inspection
                </h3>
              </div>
              <p className="text-xs text-muted">
                Ticket <strong className="text-brand font-mono">{afterDiagModalWo.orderNumber}</strong> • {afterDiagModalWo.deviceModel}
              </p>
            </div>

            {/* Quick Actions & Pass/Fail Counts */}
            <div className="flex items-center justify-between p-2.5 bg-purple/10 rounded-xl border border-purple/30 text-xs">
              <div className="flex items-center space-x-2 font-bold text-ink">
                <span className="px-2 py-0.5 rounded bg-success/15 text-success-deep text-xs">
                  Pass: {afterDiagnostics.filter(d => d.status === 'Pass').length}
                </span>
                <span className="px-2 py-0.5 rounded bg-danger/15 text-danger text-xs">
                  Fail: {afterDiagnostics.filter(d => d.status === 'Fail').length}
                </span>
                <span className="px-2 py-0.5 rounded bg-line text-muted text-xs">
                  N/A: {afterDiagnostics.filter(d => d.status === 'N/A').length}
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <Button
                  type="button"
                  onClick={() => {
                    setAfterDiagnostics(afterDiagnostics.map(d => ({ ...d, status: 'Pass', note: d.note || 'QA Passed' })));
                  }}
                  className="px-2.5 min-h-10 bg-success text-white font-extrabold rounded-lg text-xs hover:bg-success/90 shadow-2xs flex items-center"
                >
                  Mark All Pass
                </Button>
              </div>
            </div>

            {/* 21-Point Diagnostic Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
              {afterDiagnostics.map((item, idx) => (
                <div key={item.id || item.name} className="p-2 bg-surface border border-line rounded-xl space-y-1.5">
                  <div className="flex justify-between items-center text-xs font-bold text-ink">
                    <span className="truncate pr-1">{idx + 1}. {item.name}</span>
                    <span className={`text-xs font-extrabold px-1.5 py-0.5 rounded ${
                      item.status === 'Pass' ? 'bg-success/15 text-success-deep' :
                      item.status === 'Fail' ? 'bg-danger/15 text-danger' : 'bg-line text-muted'
                    }`}>
                      {item.status}
                    </span>
                  </div>

                  <div className="flex space-x-1 text-xs">
                    <Button
                      type="button"
                      onClick={() => {
                        const copy = [...afterDiagnostics];
                        copy[idx].status = 'Pass';
                        setAfterDiagnostics(copy);
                      }}
                      className={`flex-1 min-h-10 py-1 rounded-md font-extrabold transition-all ${item.status === 'Pass' ? 'bg-success text-white shadow-2xs' : 'bg-line text-ink hover:bg-line'}`}
                    >
                      Pass
                    </Button>
                    <Button
                      type="button"
                      onClick={() => {
                        const copy = [...afterDiagnostics];
                        copy[idx].status = 'Fail';
                        setAfterDiagnostics(copy);
                      }}
                      className={`flex-1 min-h-10 py-1 rounded-md font-extrabold transition-all ${item.status === 'Fail' ? 'bg-danger text-white shadow-2xs' : 'bg-line text-ink hover:bg-line'}`}
                    >
                      Fail
                    </Button>
                    <Button
                      type="button"
                      onClick={() => {
                        const copy = [...afterDiagnostics];
                        copy[idx].status = 'N/A';
                        setAfterDiagnostics(copy);
                      }}
                      className={`flex-1 min-h-10 py-1 rounded-md font-extrabold transition-all ${item.status === 'N/A' ? 'bg-slate-600 text-white shadow-2xs' : 'bg-line text-ink hover:bg-line'}`}
                    >
                      N/A
                    </Button>
                  </div>

                  <Input
                    type="text"
                    value={item.note || ''}
                    onChange={(e) => {
                      const copy = [...afterDiagnostics];
                      copy[idx].note = e.target.value;
                      setAfterDiagnostics(copy);
                    }}
                    placeholder="Note e.g. TrueTone OK"
                    className="w-full bg-white border border-line rounded-md px-2 py-0.5 text-xs text-ink"
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
                className="w-full bg-surface border border-line-strong rounded-xl p-2.5 text-xs text-ink"
              />
            </div>

            <Button
              type="button"
              onClick={handleSaveAfterDiagnostic}
              className="w-full max-w-md mx-auto bg-brand hover:bg-brand-deep text-white"
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

      
      {pendingBeforeDiagAlertWo && (
        <DiagnosticSoftAlert
          tone="warning"
          title="Initial Diagnostic Alert"
          subtitle="Mandatory Intake Inspection Pending"
          body={(
            <p className="leading-relaxed">
              You are attempting to move Ticket{' '}
              <strong className="font-mono text-brand font-black bg-brand-soft px-2 py-0.5 rounded border border-brand/20">
                {pendingBeforeDiagAlertWo.wo.orderNumber}
              </strong>{' '}
              ({pendingBeforeDiagAlertWo.wo.deviceModel}) to <strong className="text-warning font-bold">"{pendingBeforeDiagAlertWo.newStatus}"</strong>.
            </p>
          )}
          noticeLabel="Intake Inspection Notice:"
          noticeBody="Initial 21-point diagnostic not recorded yet."
          inspectLabel="Complete Intake Diagnostic First"
          overrideLabel="Proceed (Soft Override)"
          onClose={() => setPendingBeforeDiagAlertWo(null)}
          onInspect={() => {
            const woToInspect = pendingBeforeDiagAlertWo.wo;
            setPendingBeforeDiagAlertWo(null);
            setDetailModalWo(woToInspect);
          }}
          onOverride={() => {
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
        />
      )}

      {pendingDiagAlertWo && (
        <DiagnosticSoftAlert
          tone="danger"
          title="Finished Device Diagnostic Alert"
          subtitle="Mandatory Diagnostic Checklist Pending"
          body={(
            <p className="leading-relaxed">
              You are attempting to move Ticket{' '}
              <strong className="font-mono text-brand font-black bg-brand-soft px-2 py-0.5 rounded border border-brand/20">
                {pendingDiagAlertWo.wo.orderNumber}
              </strong>{' '}
              ({pendingDiagAlertWo.wo.deviceModel}) to <strong className="text-success-deep font-bold">"Finished"</strong>.
            </p>
          )}
          noticeLabel="Finished Device Protocol Notice:"
          noticeBody="Marking Finished without a completed 21-point diagnostic."
          inspectLabel="Complete Diagnostic First"
          overrideLabel="Mark Finished (Soft Override)"
          onClose={() => setPendingDiagAlertWo(null)}
          onInspect={() => {
            const woToInspect = pendingDiagAlertWo.wo;
            setPendingDiagAlertWo(null);
            setDetailModalWo(woToInspect);
          }}
          onOverride={() => {
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
        />
      )}
    </div>
  );
};
