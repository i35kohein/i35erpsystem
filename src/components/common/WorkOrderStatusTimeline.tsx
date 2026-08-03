import React, { useState, useMemo } from 'react';
import { 
  Clock, 
  CheckCircle2, 
  Cog, 
  PackageCheck, 
  XCircle, 
  AlertCircle, 
  AlertTriangle,
  ArrowRight, 
  User, 
  Plus, 
  Send, 
  Copy, 
  Check, 
  Filter, 
  Search, 
  FileText, 
  ShieldCheck, 
  DollarSign, 
  Activity, 
  ChevronDown, 
  ChevronUp, 
  Calendar,
  Sparkles,
  Layers,
  ArrowUpDown
} from 'lucide-react';
import { WorkOrder, WorkOrderStatus, RepairLogEntry } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { checkIsDiagnosticCompleted, checkIsBeforeDiagnosticCompleted, checkIsAfterDiagnosticCompleted } from '../../utils/diagnosticUtils';

interface WorkOrderStatusTimelineProps {
  workOrder: WorkOrder;
  onSaveWorkOrder?: (updatedWorkOrder: WorkOrder) => void;
  onUpdateStatus?: (workOrderId: string, newStatus: WorkOrderStatus) => void;
  compact?: boolean;
}

export const MAIN_STATUS_PIPELINE: { status: WorkOrderStatus; label: string; desc: string; icon: any; color: string; badge: string; bg: string }[] = [
  { status: 'Receive', label: 'Received', desc: 'Ticket Intake & Inspection', icon: PackageCheck, color: 'text-purple-600 border-purple-500 bg-purple-500', badge: 'bg-purple-100 text-purple-800 border-purple-200', bg: 'bg-purple-50' },
  { status: 'In Progress', label: 'In Progress', desc: 'Active Hardware Repair', icon: Cog, color: 'text-[#0071E3] border-[#0071E3] bg-[#0071E3]', badge: 'bg-blue-100 text-blue-800 border-blue-200', bg: 'bg-blue-50' },
  { status: 'Pending', label: 'Pending', desc: 'Awaiting Parts or Client Approval', icon: Clock, color: 'text-amber-600 border-amber-500 bg-amber-500', badge: 'bg-amber-100 text-amber-800 border-amber-200', bg: 'bg-amber-50' },
  { status: 'Finished', label: 'Finished', desc: 'QA Passed & Ready for Pickup', icon: CheckCircle2, color: 'text-emerald-600 border-emerald-500 bg-emerald-500', badge: 'bg-emerald-100 text-emerald-800 border-emerald-200', bg: 'bg-emerald-50' },
  { status: 'Taken Out', label: 'Taken Out', desc: 'Paid & Returned to Customer', icon: ShieldCheck, color: 'text-slate-700 border-slate-700 bg-slate-700', badge: 'bg-slate-200 text-slate-800 border-slate-300', bg: 'bg-slate-100' },
];

export interface FormattedAuditItem {
  id: string;
  rawTimestamp: string;
  formattedDate: string;
  formattedTime: string;
  timeDelta?: string;
  author: string;
  type: 'STATUS_TRANSITION' | 'TECH_NOTE' | 'ASSIGNMENT' | 'QA_CHECK' | 'PAYMENT' | 'INTAKE';
  fromStatus?: WorkOrderStatus;
  toStatus?: WorkOrderStatus;
  note: string;
  isInitialIntake?: boolean;
}

export const WorkOrderStatusTimeline: React.FC<WorkOrderStatusTimelineProps> = ({
  workOrder,
  onSaveWorkOrder,
  onUpdateStatus,
  compact = false,
}) => {
  const { t } = useLanguage();
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedStageFilter, setSelectedStageFilter] = useState<WorkOrderStatus | 'ALL'>('ALL');
  
  // New Transition / Log Input State
  const [isAddingLog, setIsAddingLog] = useState<boolean>(false);
  const [newLogNote, setNewLogNote] = useState<string>('');
  const [newLogAuthor, setNewLogAuthor] = useState<string>(workOrder.assignedTechName || 'Technician');
  const [targetStatus, setTargetStatus] = useState<WorkOrderStatus>(workOrder.status);
  
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [expandedLogIds, setExpandedLogIds] = useState<string[]>([]);

  // Calculate status transition timeline data
  const { auditItems, stageDurationMap, currentStageIndex } = useMemo(() => {
    const rawLogs = workOrder.repairLogs || [];
    const items: FormattedAuditItem[] = [];

    // Helper to attempt parsing dates
    const parseDateMs = (str: string): number => {
      const d = new Date(str);
      return isNaN(d.getTime()) ? Date.now() : d.getTime();
    };

    // 1. Initial Intake Event
    const createdAtMs = parseDateMs(workOrder.createdAt);
    const initDate = new Date(createdAtMs);
    items.push({
      id: `intake-init-${workOrder.id}`,
      rawTimestamp: workOrder.createdAt,
      formattedDate: initDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      formattedTime: initDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
      author: workOrder.assignedTechName ? `Intake Tech: ${workOrder.assignedTechName}` : 'Intake System',
      type: 'INTAKE',
      toStatus: 'Receive',
      note: `Ticket created for ${workOrder.deviceCategory} ${workOrder.deviceModel}. Reported Issue: ${workOrder.symptomsReported || 'Standard intake checklist.'}`,
      isInitialIntake: true,
    });

    // 2. Process Repair Logs
    let previousStatus: WorkOrderStatus = 'Receive';

    rawLogs.forEach((log, idx) => {
      let eventType: FormattedAuditItem['type'] = 'TECH_NOTE';
      let fromS: WorkOrderStatus | undefined;
      let toS: WorkOrderStatus | undefined;

      const noteLower = log.note.toLowerCase();

      // Detect if this log is a status transition
      if (log.statusChange) {
        eventType = 'STATUS_TRANSITION';
        fromS = previousStatus;
        toS = log.statusChange as WorkOrderStatus;
        previousStatus = log.statusChange as WorkOrderStatus;
      } else if (noteLower.includes('status') || noteLower.includes('transition') || noteLower.includes('moved to') || noteLower.includes('changed to')) {
        eventType = 'STATUS_TRANSITION';
        fromS = previousStatus;
      } else if (noteLower.includes('assigned') || noteLower.includes('tech')) {
        eventType = 'ASSIGNMENT';
      } else if (noteLower.includes('qa') || noteLower.includes('diagnostic') || noteLower.includes('inspection')) {
        eventType = 'QA_CHECK';
      } else if (noteLower.includes('payment') || noteLower.includes('checkout') || noteLower.includes('paid') || noteLower.includes('invoice')) {
        eventType = 'PAYMENT';
      }

      const logDateMs = parseDateMs(log.timestamp);
      const logDate = new Date(logDateMs);

      items.push({
        id: log.id || `log-${idx}`,
        rawTimestamp: log.timestamp,
        formattedDate: logDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        formattedTime: logDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
        author: log.author || 'Technician',
        type: eventType,
        fromStatus: fromS,
        toStatus: toS || (log.statusChange as WorkOrderStatus),
        note: log.note,
      });
    });

    // Sort items chronologically (newest first for timeline view)
    items.sort((a, b) => parseDateMs(b.rawTimestamp) - parseDateMs(a.rawTimestamp));

    // Calculate time deltas between chronological steps
    for (let i = items.length - 1; i >= 0; i--) {
      if (i < items.length - 1) {
        const currentMs = parseDateMs(items[i].rawTimestamp);
        const prevMs = parseDateMs(items[i + 1].rawTimestamp);
        const diffMinutes = Math.max(0, Math.floor((currentMs - prevMs) / (1000 * 60)));

        if (diffMinutes < 60) {
          items[i].timeDelta = `${diffMinutes}m after previous step`;
        } else if (diffMinutes < 1440) {
          const hrs = (diffMinutes / 60).toFixed(1);
          items[i].timeDelta = `${hrs}h after previous step`;
        } else {
          const days = (diffMinutes / 1440).toFixed(1);
          items[i].timeDelta = `${days}d after previous step`;
        }
      }
    }

    // Determine current pipeline stage index
    const currentIdx = MAIN_STATUS_PIPELINE.findIndex((p) => p.status === workOrder.status);

    // Map duration or count of logs per stage
    const durationMap: Record<string, number> = {};
    items.forEach((item) => {
      const st = item.toStatus || item.fromStatus || workOrder.status;
      durationMap[st] = (durationMap[st] || 0) + 1;
    });

    return {
      auditItems: items,
      stageDurationMap: durationMap,
      currentStageIndex: currentIdx >= 0 ? currentIdx : 0,
    };
  }, [workOrder]);

  // Filter audit items by type, search query, or stage
  const filteredAuditItems = useMemo(() => {
    return auditItems.filter((item) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.note.toLowerCase().includes(q) ||
        item.author.toLowerCase().includes(q) ||
        (item.fromStatus && item.fromStatus.toLowerCase().includes(q)) ||
        (item.toStatus && item.toStatus.toLowerCase().includes(q));

      const matchesType =
        filterType === 'ALL' ||
        (filterType === 'TRANSITION' && (item.type === 'STATUS_TRANSITION' || item.type === 'INTAKE')) ||
        (filterType === 'NOTES' && item.type === 'TECH_NOTE') ||
        (filterType === 'QA' && item.type === 'QA_CHECK') ||
        (filterType === 'POS' && item.type === 'PAYMENT');

      const matchesStage =
        selectedStageFilter === 'ALL' ||
        item.toStatus === selectedStageFilter ||
        item.fromStatus === selectedStageFilter;

      return matchesSearch && matchesType && matchesStage;
    });
  }, [auditItems, searchQuery, filterType, selectedStageFilter]);

  // Toggle log expansion
  const toggleExpand = (id: string) => {
    setExpandedLogIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Handle adding new status transition or log entry
  const handleAddNewTransitionLog = () => {
    if (!newLogNote.trim()) return;

    const formattedDate = new Date().toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    const isStatusChanged = targetStatus !== workOrder.status;
    const noteText = isStatusChanged
      ? `Status transitioned from [${workOrder.status}] to [${targetStatus}]. ${newLogNote.trim()}`
      : newLogNote.trim();

    const newLog: RepairLogEntry = {
      id: `log-${Date.now()}`,
      timestamp: formattedDate,
      author: newLogAuthor.trim() || 'Technician',
      note: noteText,
      statusChange: isStatusChanged ? targetStatus : undefined,
    };

    const updatedWo: WorkOrder = {
      ...workOrder,
      status: targetStatus,
      repairLogs: [newLog, ...(workOrder.repairLogs || [])],
      updatedAt: new Date().toISOString(),
    };

    if (onSaveWorkOrder) {
      onSaveWorkOrder(updatedWo);
    }
    if (isStatusChanged && onUpdateStatus) {
      onUpdateStatus(workOrder.id, targetStatus);
    }

    setNewLogNote('');
    setIsAddingLog(false);
  };

  // Copy plain text summary of status transition audit trail
  const handleCopyAuditSummary = () => {
    let summaryText = `AUDIT TRAIL & STATUS TRANSITIONS REPORT\n`;
    summaryText += `Ticket: ${workOrder.orderNumber || workOrder.id} | Device: ${workOrder.deviceCategory} ${workOrder.deviceModel}\n`;
    summaryText += `Current Status: ${workOrder.status} | Technician: ${workOrder.assignedTechName || 'Unassigned'}\n`;
    summaryText += `--------------------------------------------------\n`;

    auditItems.forEach((item) => {
      summaryText += `[${item.formattedDate} ${item.formattedTime}] (${item.author}): `;
      if (item.fromStatus && item.toStatus) {
        summaryText += `TRANSITION: ${item.fromStatus} ➔ ${item.toStatus} -- `;
      }
      summaryText += `${item.note}\n`;
    });

    navigator.clipboard.writeText(summaryText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  return (
    <div className="space-y-5 text-xs">
      {/* SECTION 1: Interactive Status Progression Pipeline Header Bar */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center space-x-2">
              <span className="font-mono font-bold text-xs bg-[#0071E3] text-white px-2.5 py-0.5 rounded-lg">
                {workOrder.orderNumber || workOrder.id}
              </span>
              <h3 className="font-extrabold text-sm sm:text-base text-white tracking-tight">
                {t('timelineTitle')}
              </h3>
            </div>
            <p className="text-[11px] text-slate-300">
              {workOrder.deviceCategory} {workOrder.deviceModel} • {t('assignedTech')}:{' '}
              <strong className="text-white">{workOrder.assignedTechName || 'Unassigned'}</strong>
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleCopyAuditSummary}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl border border-white/20 transition-all flex items-center space-x-1.5 cursor-pointer shadow-2xs active:scale-95"
              title="Copy Complete Audit Trail Text"
            >
              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{isCopied ? t('copied') : t('copy')}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsAddingLog(!isAddingLog)}
              className="px-3 py-1.5 bg-[#0071E3] hover:bg-[#0077ED] text-white font-bold text-xs rounded-xl transition-all flex items-center space-x-1.5 cursor-pointer shadow-md active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t('logStatus')}</span>
            </button>
          </div>
        </div>

        {/* 5-Stage Interactive Status Pipeline Tracker */}
        <div className="pt-2 border-t border-white/10">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {MAIN_STATUS_PIPELINE.map((stage, idx) => {
              const StageIcon = stage.icon;
              const isCurrent = workOrder.status === stage.status;
              const isPassed = idx < currentStageIndex;
              const logCount = stageDurationMap[stage.status] || 0;
              const isTerminal = workOrder.status === 'Cant Repair' || workOrder.status === 'Customer Not Repair';

              return (
                <div
                  key={stage.status}
                  onClick={() => setSelectedStageFilter(selectedStageFilter === stage.status ? 'ALL' : stage.status)}
                  className={`p-2.5 rounded-xl border transition-all cursor-pointer relative overflow-hidden ${
                    selectedStageFilter === stage.status
                      ? 'ring-2 ring-white border-white bg-white/20'
                      : isCurrent
                      ? 'bg-white/15 border-white/40 shadow-inner'
                      : isPassed
                      ? 'bg-white/5 border-white/10 hover:bg-white/10'
                      : 'bg-black/20 border-white/5 opacity-60 hover:opacity-100'
                  }`}
                >
                  {/* Top line indicator */}
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center space-x-1.5">
                      <div className={`p-1 rounded-lg ${isCurrent ? stage.color : isPassed ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-700 text-slate-300'}`}>
                        <StageIcon className="w-3.5 h-3.5" />
                      </div>
                      <span className="font-extrabold text-xs text-white truncate">{stage.label}</span>
                    </div>

                    {isCurrent && (
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" title="Active Status" />
                    )}
                  </div>

                  <p className="text-[10px] text-slate-300 line-clamp-1 leading-tight">{stage.desc}</p>

                  <div className="flex justify-between items-center mt-2 pt-1 border-t border-white/10 text-[9px] text-slate-400">
                    <span>{isCurrent ? 'Current Stage' : isPassed ? 'Completed' : 'Upcoming'}</span>
                    {logCount > 0 && (
                      <span className="font-mono font-bold bg-white/20 text-white px-1.5 rounded">
                        {logCount} Event{logCount > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Special Terminal State Indicator if Cant Repair / Customer Cancelled */}
          {(workOrder.status === 'Cant Repair' || workOrder.status === 'Customer Not Repair') && (
            <div className="mt-2 p-2 bg-rose-500/20 border border-rose-500/40 rounded-xl flex items-center justify-between text-xs text-rose-200">
              <div className="flex items-center space-x-2 font-bold">
                <AlertCircle className="w-4 h-4 text-rose-400" />
                <span>Ticket Outcome: {workOrder.status === 'Cant Repair' ? "Unrepairable / Can't Repair" : 'Cancelled / Customer Not Repair'}</span>
              </div>
              <span className="text-[10px] font-mono bg-rose-900/60 text-rose-100 px-2 py-0.5 rounded-md">
                Terminal Exception Stage
              </span>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 2: Add New Transition / Log Panel (Drawer Modal) */}
      {isAddingLog && (
        <div className="p-4 bg-[#F5F5F7] border border-[#0071E3]/30 rounded-2xl shadow-xs space-y-3 animate-fadeIn">
          <div className="flex justify-between items-center pb-2 border-b border-[#E5E5EA]">
            <span className="font-black text-xs text-[#1D1D1F] flex items-center space-x-1.5">
              <Activity className="w-4 h-4 text-[#0071E3]" />
              <span>Record Status Transition or Technical Audit Entry</span>
            </span>
            <button
              type="button"
              onClick={() => setIsAddingLog(false)}
              className="text-xs text-[#86868B] hover:text-[#1D1D1F] font-bold"
            >
              Cancel ✕
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-bold text-[#1D1D1F] mb-1">Target Status Transition</label>
              <select
                value={targetStatus}
                onChange={(e) => setTargetStatus(e.target.value as WorkOrderStatus)}
                className="w-full bg-white border border-[#E5E5EA] rounded-xl px-3 py-1.5 text-xs font-bold text-[#1D1D1F] focus:border-[#0071E3] focus:outline-none"
              >
                <option value="Receive">Receive (Intake & Inspection)</option>
                <option value="In Progress">In Progress (Active Repair)</option>
                <option value="Pending">Pending (Waiting Parts / Client)</option>
                <option value="Finished">Finished (QA Passed / Ready)</option>
                <option value="Taken Out">Taken Out (Paid & Picked Up)</option>
                <option value="Cant Repair">Can't Repair (Unfixable)</option>
                <option value="Customer Not Repair">Customer Not Repair (Declined)</option>
              </select>
              {targetStatus !== workOrder.status && (
                <p className="text-[10px] text-[#0071E3] font-bold mt-1">
                  ⚡ Status will update from <span className="underline">{workOrder.status}</span> ➔ <span className="underline">{targetStatus}</span>
                </p>
              )}
              {['Receive', 'In Progress', 'Pending'].includes(targetStatus) && !checkIsBeforeDiagnosticCompleted(workOrder) && (
                <div className="p-2.5 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-[11px] space-y-1 mt-2">
                  <div className="flex items-center space-x-1.5 font-extrabold text-amber-950">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 animate-pulse" />
                    <span>Initial Diagnostic Alert:</span>
                  </div>
                  <p className="text-amber-900 leading-tight">
                    Initial 21-point diagnostic inspection has not been completed for this device.
                  </p>
                </div>
              )}
              {targetStatus === 'Finished' && !checkIsAfterDiagnosticCompleted(workOrder) && (
                <div className="p-2.5 bg-rose-50 border border-rose-300 rounded-xl text-rose-900 text-[11px] space-y-1 mt-2">
                  <div className="flex items-center space-x-1.5 font-extrabold text-rose-950">
                    <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0 animate-pulse" />
                    <span>Finished Device Diagnostic Alert:</span>
                  </div>
                  <p className="text-rose-900 leading-tight">
                    This ticket is being marked as Finished, but the post-repair diagnostic test has not been completed.
                  </p>
                </div>
              )}
              {targetStatus === 'Taken Out' && (
                <div className="p-2.5 bg-purple-50 border border-purple-300 rounded-xl text-purple-950 text-[11px] space-y-1 mt-2">
                  <div className="flex items-center space-x-1.5 font-extrabold text-purple-950">
                    <AlertCircle className="w-3.5 h-3.5 text-purple-600 shrink-0 animate-pulse" />
                    <span>POS Cashout Required for Taken Out:</span>
                  </div>
                  <p className="text-purple-900 leading-tight">
                    Manual transition to "Taken Out" is restricted. Submitting will launch the POS Cashout checkout module to collect payment and deliver the device.
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="block font-bold text-[#1D1D1F] mb-1">Technician / Author Name</label>
              <input
                type="text"
                value={newLogAuthor}
                onChange={(e) => setNewLogAuthor(e.target.value)}
                placeholder="e.g. Elena Rostova"
                className="w-full bg-white border border-[#E5E5EA] rounded-xl px-3 py-1.5 text-xs text-[#1D1D1F] focus:border-[#0071E3] focus:outline-none font-semibold"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-[#1D1D1F] mb-1">Audit Log Note & Repair Evidence *</label>
            <textarea
              rows={3}
              value={newLogNote}
              onChange={(e) => setNewLogNote(e.target.value)}
              placeholder="e.g. Replaced display panel and completed 21-point touch & TrueTone calibration. Moving to QA testing."
              className="w-full bg-white border border-[#E5E5EA] rounded-xl p-3 text-xs text-[#1D1D1F] focus:border-[#0071E3] focus:outline-none"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-1">
            <button
              type="button"
              onClick={() => setIsAddingLog(false)}
              className="px-3.5 py-1.5 bg-white border border-[#E5E5EA] hover:bg-slate-100 text-[#1D1D1F] font-bold text-xs rounded-xl transition-all cursor-pointer"
            >
              Discard
            </button>
            <button
              type="button"
              onClick={handleAddNewTransitionLog}
              className="px-4 py-1.5 bg-[#0071E3] hover:bg-[#0077ED] text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center space-x-1 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Save & Publish Transition Log</span>
            </button>
          </div>
        </div>
      )}

      {/* SECTION 3: Timeline Search & Filter Toolbar */}
      {!compact && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 bg-[#F5F5F7] p-2.5 rounded-2xl border border-[#E5E5EA]">
          {/* Search Bar */}
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-[#86868B] absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search transitions, notes, tech..."
              className="w-full bg-white border border-[#E5E5EA] rounded-xl pl-8 pr-3 py-1.5 text-xs text-[#1D1D1F] focus:border-[#0071E3] focus:outline-none font-medium"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center space-x-1 overflow-x-auto no-scrollbar w-full sm:w-auto">
            <span className="text-[10px] font-bold text-[#86868B] uppercase tracking-wider pr-1">Filter:</span>
            <button
              type="button"
              onClick={() => setFilterType('ALL')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                filterType === 'ALL' ? 'bg-[#0071E3] text-white' : 'bg-white text-[#1D1D1F] hover:bg-slate-200'
              }`}
            >
              All Events ({auditItems.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('TRANSITION')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                filterType === 'TRANSITION' ? 'bg-[#0071E3] text-white' : 'bg-white text-[#1D1D1F] hover:bg-slate-200'
              }`}
            >
              Transitions Only
            </button>
            <button
              type="button"
              onClick={() => setFilterType('NOTES')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                filterType === 'NOTES' ? 'bg-[#0071E3] text-white' : 'bg-white text-[#1D1D1F] hover:bg-slate-200'
              }`}
            >
              Tech Notes
            </button>
            <button
              type="button"
              onClick={() => setFilterType('QA')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                filterType === 'QA' ? 'bg-[#0071E3] text-white' : 'bg-white text-[#1D1D1F] hover:bg-slate-200'
              }`}
            >
              QA & Diagnostics
            </button>
          </div>
        </div>
      )}

      {/* SECTION 4: Interactive Chronological Audit Timeline */}
      {filteredAuditItems.length > 0 ? (
        <div className="relative pl-6 sm:pl-8 space-y-5 before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-gradient-to-b before:from-[#0071E3] before:via-[#AF52DE] before:to-emerald-500">
          {filteredAuditItems.map((item, index) => {
            const isExpanded = expandedLogIds.includes(item.id);

            // Determine Icon & Styling by Event Type
            let iconBg = 'bg-blue-600 text-white';
            let IconComponent = Activity;
            let categoryLabel = 'Repair Audit Log';
            let categoryBadge = 'bg-blue-50 text-blue-700 border-blue-200';

            if (item.type === 'INTAKE') {
              iconBg = 'bg-purple-600 text-white ring-4 ring-purple-100';
              IconComponent = PackageCheck;
              categoryLabel = 'Work Order Created & Intaken';
              categoryBadge = 'bg-purple-50 text-purple-800 border-purple-200';
            } else if (item.type === 'STATUS_TRANSITION') {
              iconBg = 'bg-[#0071E3] text-white ring-4 ring-blue-100';
              IconComponent = ArrowRight;
              categoryLabel = 'Status Transition Mapped';
              categoryBadge = 'bg-blue-50 text-[#0071E3] border-blue-200';
            } else if (item.type === 'QA_CHECK') {
              iconBg = 'bg-purple-600 text-white ring-4 ring-purple-100';
              IconComponent = ShieldCheck;
              categoryLabel = 'QA 21-Point Inspection';
              categoryBadge = 'bg-purple-50 text-purple-700 border-purple-200';
            } else if (item.type === 'PAYMENT') {
              iconBg = 'bg-emerald-600 text-white ring-4 ring-emerald-100';
              IconComponent = DollarSign;
              categoryLabel = 'POS Payment & Checkout';
              categoryBadge = 'bg-emerald-50 text-emerald-800 border-emerald-200';
            } else if (item.type === 'ASSIGNMENT') {
              iconBg = 'bg-amber-500 text-white ring-4 ring-amber-100';
              IconComponent = User;
              categoryLabel = 'Technician Assignment';
              categoryBadge = 'bg-amber-50 text-amber-800 border-amber-200';
            }

            return (
              <div key={item.id} className="relative group">
                {/* Node Point on Left Line */}
                <div className={`absolute -left-6 sm:-left-8 top-3 w-6 h-6 rounded-full flex items-center justify-center ${iconBg} shadow-sm z-10 transition-transform group-hover:scale-110`}>
                  <IconComponent className="w-3.5 h-3.5" />
                </div>

                {/* Timeline Card */}
                <div className="bg-white border border-[#E5E5EA] hover:border-[#0071E3]/60 rounded-2xl p-3.5 sm:p-4 space-y-2.5 shadow-2xs transition-all">
                  {/* Card Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-[#E5E5EA] pb-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded-full border ${categoryBadge}`}>
                        {categoryLabel}
                      </span>

                      {/* Display Status Transition Pair if present */}
                      {item.fromStatus && item.toStatus && (
                        <div className="flex items-center space-x-1.5 font-mono text-[11px] font-extrabold bg-[#F5F5F7] px-2.5 py-0.5 rounded-lg border border-[#E5E5EA]">
                          <span className="text-[#86868B]">{item.fromStatus}</span>
                          <ArrowRight className="w-3 h-3 text-[#0071E3]" />
                          <span className="text-[#0071E3] underline">{item.toStatus}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-2 text-[10px] text-[#86868B]">
                      {item.timeDelta && (
                        <span className="bg-slate-100 text-slate-700 font-mono font-bold px-1.5 py-0.5 rounded inline-flex items-center">
                          <Clock className="w-3 h-3 text-slate-500 shrink-0 mr-1" />
                          <span>{item.timeDelta}</span>
                        </span>
                      )}
                      <span className="font-semibold text-[#1D1D1F]">{item.formattedDate}</span>
                      <span>at {item.formattedTime}</span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="space-y-1">
                    <p className="text-xs text-[#1D1D1F] font-semibold leading-relaxed">
                      {item.note}
                    </p>

                    <div className="flex items-center justify-between pt-1 text-[10px] text-[#86868B]">
                      <span>
                        Logged by: <strong className="text-[#1D1D1F] font-bold">{item.author}</strong>
                      </span>

                      {item.isInitialIntake && (
                        <span className="text-[10px] font-mono font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                          Intake Baseline Timestamp
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-8 text-center text-[#86868B] bg-[#F8F9FA] rounded-2xl border border-dashed border-[#E5E5EA]">
          <Search className="w-8 h-8 text-[#86868B]/40 mx-auto mb-2" />
          <p className="font-extrabold text-xs text-[#1D1D1F]">No Status Transition Events Found</p>
          <p className="text-[11px] text-[#86868B] mt-0.5">
            Try adjusting search keywords or selecting a different filter option above.
          </p>
        </div>
      )}
    </div>
  );
};
