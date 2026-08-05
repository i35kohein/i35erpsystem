import React, { useState } from 'react';
import { 
  PhoneCall, 
  MessageSquare, 
  Star, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  UserCheck, 
  Search, 
  Plus, 
  X, 
  Calendar, 
  Smartphone, 
  ChevronRight, 
  Send, 
  Phone, 
  Filter, 
  Sparkles,
  History,
  ShieldCheck,
  Check,
  FileText,
  DollarSign,
  Cpu
} from 'lucide-react';
import { WorkOrder, FollowUpStatus, FollowUpRecord, SystemSettings } from '../../types';
import { Button } from '../ui';
import { DateFilterState, isDateMatchingFilter } from '../common/DateFilterSelector';

interface CompletedDeviceFollowUpModuleProps {
  workOrders: WorkOrder[];
  onSaveWorkOrder: (updatedOrder: WorkOrder) => void;
  systemSettings: SystemSettings;
  searchQuery?: string;
  setSearchQuery?: (q: string) => void;
  dateFilter?: DateFilterState;
  setDateFilter?: (df: DateFilterState) => void;
}

export const CompletedDeviceFollowUpModule: React.FC<CompletedDeviceFollowUpModuleProps> = ({
  workOrders,
  onSaveWorkOrder,
  systemSettings,
  searchQuery: propSearchQuery,
  setSearchQuery: propSetSearchQuery,
  dateFilter: propDateFilter,
  setDateFilter: propSetDateFilter,
}) => {
  // Local or controlled filter states
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const [localDateFilter, setLocalDateFilter] = useState<DateFilterState>({ preset: 'all' });
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const searchQuery = propSearchQuery !== undefined ? propSearchQuery : localSearchQuery;
  const setSearchQuery = propSetSearchQuery || setLocalSearchQuery;

  const dateFilter = propDateFilter !== undefined ? propDateFilter : localDateFilter;
  const setDateFilter = propSetDateFilter || setLocalDateFilter;

  // Selected ticket for modal
  const [selectedWo, setSelectedWo] = useState<WorkOrder | null>(null);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [historyModalWo, setHistoryModalWo] = useState<WorkOrder | null>(null);

  // New Log Form State
  const [formStatus, setFormStatus] = useState<FollowUpStatus>('Satisfied');
  const [formRating, setFormRating] = useState<number>(5);
  const [formAuthor, setFormAuthor] = useState<string>('Service Advisor');
  const [formNotes, setFormNotes] = useState<string>('');
  const [formNextDate, setFormNextDate] = useState<string>('');

  // Helper to calculate days since repair completion / pickup.
  // completedAt is the stable anchor (stamped once at Finished/Taken Out and
  // never moved by later edits like follow-up logs) — fall back to updatedAt/createdAt.
  const getDaysSinceCompletion = (wo: WorkOrder): number => {
    const completedTime = new Date(wo.completedAt || wo.updatedAt || wo.createdAt).getTime();
    const now = new Date().getTime();
    const diffDays = Math.floor((now - completedTime) / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  // Filter completed devices (Taken Out strictly after customer delivery/pickup)
  const completedWorkOrders = workOrders.filter(
    (wo) => wo.status === 'Taken Out'
  );

  // Composed roster: tickets are listed here ONLY once the 7-day post-delivery
  // window is reached. Anything younger is not due for a follow-up call yet.
  const followUpEligible = completedWorkOrders.filter(
    (wo) => getDaysSinceCompletion(wo) >= 7
  );

  const filteredWorkOrders = followUpEligible.filter((wo) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      wo.orderNumber.toLowerCase().includes(q) ||
      wo.customerName.toLowerCase().includes(q) ||
      wo.customerPhone.includes(q) ||
      wo.deviceModel.toLowerCase().includes(q) ||
      (wo.serialNumber && wo.serialNumber.toLowerCase().includes(q)) ||
      (wo.imei && wo.imei.toLowerCase().includes(q));

    const currentFollowUpStatus = wo.followUpStatus || 'Pending Call';
    const daysElapsed = getDaysSinceCompletion(wo);

    let matchesStatus = true;
    if (statusFilter === '7_DAYS') {
      matchesStatus = daysElapsed >= 7;
    } else if (statusFilter === '1_MONTH') {
      matchesStatus = daysElapsed >= 30;
    } else if (statusFilter === '2_MONTHS') {
      matchesStatus = daysElapsed >= 60;
    } else if (statusFilter !== 'ALL') {
      matchesStatus = currentFollowUpStatus === statusFilter;
    }

    const matchesDate = isDateMatchingFilter(wo.updatedAt || wo.createdAt, dateFilter);

    return matchesSearch && matchesStatus && matchesDate;
  });

  // Calculate Metrics (all roster metrics are based on the 7+ day eligible pool)
  const totalCompleted = completedWorkOrders.length;
  const count7Days = followUpEligible.length;
  const count30Days = followUpEligible.filter((wo) => getDaysSinceCompletion(wo) >= 30).length;
  const count60Days = followUpEligible.filter((wo) => getDaysSinceCompletion(wo) >= 60).length;
  const pendingCallsCount = followUpEligible.filter(
    (wo) => !wo.followUpStatus || wo.followUpStatus === 'Pending Call'
  ).length;
  const satisfiedCount = followUpEligible.filter((wo) => wo.followUpStatus === 'Satisfied').length;
  const issueReportedCount = followUpEligible.filter(
    (wo) => wo.followUpStatus === 'Issue Reported'
  ).length;

  // Average Rating calculation
  const ratedOrders = followUpEligible.filter((wo) => {
    const lastRecord = wo.followUpRecords?.[wo.followUpRecords.length - 1];
    return lastRecord && lastRecord.satisfactionRating && lastRecord.satisfactionRating > 0;
  });
  const avgRating = ratedOrders.length > 0
    ? (ratedOrders.reduce((acc, wo) => {
        const r = wo.followUpRecords?.[wo.followUpRecords.length - 1]?.satisfactionRating || 5;
        return acc + r;
      }, 0) / ratedOrders.length).toFixed(1)
    : '5.0';

  const handleOpenLogModal = (wo: WorkOrder) => {
    setSelectedWo(wo);
    setFormStatus(wo.followUpStatus || 'Satisfied');
    setFormRating(5);
    setFormAuthor('Service Advisor');
    setFormNotes('');
    setFormNextDate('');
    setIsLogModalOpen(true);
  };

  const handleSaveFollowUpLog = () => {
    if (!selectedWo) return;

    const newRecord: FollowUpRecord = {
      id: `fu-${Date.now()}`,
      timestamp: new Date().toISOString(),
      author: formAuthor.trim() || 'Service Advisor',
      status: formStatus,
      satisfactionRating: formStatus === 'Satisfied' ? formRating : undefined,
      notes: formNotes.trim() || (formStatus === 'Satisfied' ? 'Customer confirmed device working perfectly.' : 'Follow-up log created.'),
      nextFollowUpDate: formNextDate ? formNextDate : undefined,
    };

    const existingRecords = selectedWo.followUpRecords || [];
    const updatedRecords = [...existingRecords, newRecord];

    // Create a repair log entry as well for global auditing
    const newRepairLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }),
      author: formAuthor.trim() || 'Service Advisor',
      note: `Follow-up call status: ${formStatus}${formNotes ? ` - ${formNotes}` : ''}`,
    };

    const updatedWo: WorkOrder = {
      ...selectedWo,
      followUpStatus: formStatus,
      followUpRecords: updatedRecords,
      lastFollowUpAt: new Date().toISOString(),
      repairLogs: [...(selectedWo.repairLogs || []), newRepairLog],
      updatedAt: new Date().toISOString(),
    };

    onSaveWorkOrder(updatedWo);
    setIsLogModalOpen(false);
    setSelectedWo(null);
  };

  const getStatusBadge = (status?: FollowUpStatus) => {
    switch (status) {
      case 'Satisfied':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center space-x-1 w-max">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>Satisfied Customer</span>
          </span>
        );
      case 'Issue Reported':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 flex items-center space-x-1 w-max">
            <AlertTriangle className="w-3 h-3 text-rose-600" />
            <span>Issue Reported</span>
          </span>
        );
      case 'No Answer':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center space-x-1 w-max">
            <PhoneCall className="w-3 h-3 text-amber-600" />
            <span>No Answer / Left Msg</span>
          </span>
        );
      case 'Callback Scheduled':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 flex items-center space-x-1 w-max">
            <Clock className="w-3 h-3 text-blue-600" />
            <span>Callback Scheduled</span>
          </span>
        );
      case 'Closed':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 flex items-center space-x-1 w-max">
            <Check className="w-3 h-3 text-slate-500" />
            <span>Follow-up Closed</span>
          </span>
        );
      case 'Pending Call':
      default:
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200 flex items-center space-x-1 w-max">
            <Clock className="w-3 h-3 text-sky-600" />
            <span>Pending Follow-up</span>
          </span>
        );
    }
  };

  const quickNotesTemplates = [
    'Customer confirmed screen display, touch & battery working great. Very satisfied.',
    'Customer picked up device, confirmed all features tested OK.',
    'Left voicemail message regarding post-repair satisfaction check.',
    'Customer reported minor query about battery charge cycle, explained normal operation.',
    'Customer requested warranty callback for micro-soldering check.',
  ];

  return (
    <div className="space-y-3 pb-4">
      {/* Top Banner / Dashboard Overview */}
      <div className="bg-white border border-line rounded-2xl p-5 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="module-subheader">
            <div className="flex items-center space-x-2">
              <span className="p-2 bg-[#E5F1FF] text-brand rounded-xl">
                <UserCheck className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-base font-extrabold text-ink tracking-tight">
                  <span className="hidden sm:inline">Completed Repairs & Post-Delivery Customer Follow-Ups</span>
                  <span className="sm:hidden">Completed Repairs & Follow-Ups</span>
                </h2>
                <p className="text-xs text-muted">
                  Conduct post-service quality calls for repaired & delivered devices. Tickets appear here starting <strong className="text-brand">7 days</strong> after delivery.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 w-full md:w-auto md:shrink-0">
            <div className="relative w-full md:w-auto">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search ticket, customer, device..."
                className="pl-8 pr-3 py-1.5 bg-surface border border-line rounded-xl text-xs focus:outline-none focus:border-brand focus:bg-white transition-all w-full md:w-64"
              />
            </div>
          </div>
        </div>

        {/* Analytics Key Cards */}
        <div className="grid grid-cols-2 md:grid-cols-6 3xl:grid-cols-8 4xl:grid-cols-10 gap-2.5 pt-2">
          <div className="bg-surface border border-line rounded-xl p-3 space-y-1">
            <span className="text-[11px] font-semibold text-muted">Total Completed</span>
            <div className="text-xl font-extrabold text-ink">{totalCompleted}</div>
            <p className="text-[10px] text-muted">Finished & Picked Up</p>
          </div>

          <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-3 space-y-1">
            <span className="text-[11px] font-bold text-indigo-900">7-Day Check</span>
            <div className="text-xl font-extrabold text-indigo-800">{count7Days}</div>
            <p className="text-[10px] text-indigo-700 font-medium">≥ 7 days post-repair</p>
          </div>

          <div className="bg-purple-50/70 border border-purple-200 rounded-xl p-3 space-y-1">
            <span className="text-[11px] font-bold text-purple-900">1-Month Check</span>
            <div className="text-xl font-extrabold text-purple-800">{count30Days}</div>
            <p className="text-[10px] text-purple-700 font-medium">≥ 30 days post-repair</p>
          </div>

          <div className="bg-violet-50/80 border border-violet-200 rounded-xl p-3 space-y-1">
            <span className="text-[11px] font-bold text-violet-900">2-Month Check</span>
            <div className="text-xl font-extrabold text-violet-800">{count60Days}</div>
            <p className="text-[10px] text-violet-700 font-medium">≥ 60 days post-repair</p>
          </div>

          <div className="bg-emerald-50/50 border border-emerald-200 rounded-xl p-3 space-y-1">
            <span className="text-[11px] font-semibold text-emerald-800">Satisfied</span>
            <div className="text-xl font-extrabold text-emerald-900">{satisfiedCount}</div>
            <p className="text-[10px] text-emerald-700">Positive feedback</p>
          </div>

          <div className="bg-amber-50/50 border border-amber-200 rounded-xl p-3 space-y-1 col-span-2 md:col-span-1">
            <span className="text-[11px] font-semibold text-amber-800">Avg Rating</span>
            <div className="flex items-center space-x-1.5">
              <span className="text-xl font-extrabold text-amber-900">{avgRating}</span>
              <div className="flex items-center text-amber-500">
                <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
              </div>
            </div>
            <p className="text-[10px] text-amber-700">Out of 5.0 rating</p>
          </div>
        </div>
      </div>

      {/* Filter Tabs Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white border border-line p-3 rounded-2xl shadow-2xs">
        <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
          {[
            { id: 'ALL', label: `All 7+ Day Due (${followUpEligible.length})` },
            { id: '1_MONTH', label: `1 Month (30 Days) (${count30Days})` },
            { id: '2_MONTHS', label: `2 Months (60 Days) (${count60Days})` },
            { id: 'Pending Call', label: `Pending Call (${pendingCallsCount})` },
            { id: 'Satisfied', label: `Satisfied (${satisfiedCount})` },
            { id: 'Issue Reported', label: `Issue Reported (${issueReportedCount})` },
            { id: 'No Answer', label: 'No Answer' },
            { id: 'Callback Scheduled', label: 'Callback Scheduled' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer shrink-0 ${
                statusFilter === tab.id
                  ? 'bg-brand text-white shadow-2xs'
                  : 'bg-surface text-ink hover:bg-line'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {statusFilter !== 'ALL' || searchQuery ? (
          <button
            type="button"
            onClick={() => {
              setStatusFilter('ALL');
              setSearchQuery('');
            }}
            className="text-xs text-brand font-bold hover:underline shrink-0 text-right sm:text-left"
          >
            Reset Filters
          </button>
        ) : null}
      </div>

      {/* Main Completed Tickets List */}
      <div className="bg-white border border-line rounded-2xl shadow-2xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-line flex items-center justify-between bg-[#FAFAFC]">
          <h3 className="text-xs font-extrabold text-ink uppercase tracking-wider">
            Devices Due for Follow-Up ({filteredWorkOrders.length})
          </h3>
          <span className="text-[11px] text-muted font-semibold">
            Click 'Log Follow-Up' to record customer status
          </span>
        </div>

        {filteredWorkOrders.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-surface flex items-center justify-center mx-auto text-muted">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-ink">No completed tickets found</p>
              <p className="text-xs text-muted">
                {searchQuery || statusFilter !== 'ALL'
                  ? 'Try adjusting your search query or status filter.'
                  : 'No follow-ups due yet. Tickets appear here automatically once 7 days have passed since delivery.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-line">
            {filteredWorkOrders.map((wo) => {
              const records = wo.followUpRecords || [];
              const lastRecord = records.length > 0 ? records[records.length - 1] : null;
              const daysElapsed = getDaysSinceCompletion(wo);

              return (
                <div
                  key={wo.id}
                  className="p-4 hover:bg-[#FAFAFC] transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  {/* Customer & Ticket Info */}
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-extrabold text-xs text-brand">
                        {wo.orderNumber}
                      </span>
                      <span className="text-xs font-extrabold text-ink">
                        {wo.customerName}
                      </span>
                      <span className="text-xs text-muted">
                        ({wo.customerPhone})
                      </span>
                      <div className="flex items-center space-x-1 ml-auto md:ml-0 flex-wrap gap-1">
                        {getStatusBadge(wo.followUpStatus)}
                        <span className="px-1.5 py-0.5 rounded-md text-[9px] font-extrabold bg-emerald-100 text-emerald-800">
                          Delivered / Taken Out
                        </span>

                        {daysElapsed >= 60 ? (
                          <span className="px-1.5 py-0.5 rounded-md text-[9px] font-extrabold bg-violet-100 text-violet-900 border border-violet-300">
                            2 Months Due ({daysElapsed}d)
                          </span>
                        ) : daysElapsed >= 30 ? (
                          <span className="px-1.5 py-0.5 rounded-md text-[9px] font-extrabold bg-purple-100 text-purple-900 border border-purple-300">
                            1 Month Due ({daysElapsed}d)
                          </span>
                        ) : daysElapsed >= 7 ? (
                          <span className="px-1.5 py-0.5 rounded-md text-[9px] font-extrabold bg-indigo-100 text-indigo-900 border border-indigo-300">
                            7 Days Due ({daysElapsed}d)
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded-md text-[9px] font-semibold bg-gray-100 text-gray-700">
                            {daysElapsed === 0 ? 'Completed Today' : `${daysElapsed}d Post Delivery`}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-muted">
                      <span className="flex items-center space-x-1 font-semibold text-ink">
                        <Smartphone className="w-3.5 h-3.5 text-brand" />
                        <span>{wo.deviceModel}</span>
                      </span>
                      {wo.serialNumber && (
                        <span>S/N: <span className="font-mono text-ink">{wo.serialNumber}</span></span>
                      )}
                      <span>
                        Completed:{' '}
                        <span className="font-medium text-ink">
                          {new Date(wo.updatedAt || wo.createdAt).toLocaleDateString()}
                        </span>
                      </span>
                      {wo.assignedTechName && (
                        <span>Tech: <span className="font-semibold text-ink">{wo.assignedTechName}</span></span>
                      )}
                      <span>Warranty: <span className="font-semibold text-ink">{wo.warrantyDays} Days</span></span>
                      <span>Total: <span className="font-extrabold text-emerald-600">{systemSettings.currencySymbol}{wo.totalAmount || 0}</span></span>
                    </div>

                    {/* What Was Repaired Banner */}
                    <div className="bg-[#F0F7FB] border border-[#D8E5ED] rounded-xl p-3 text-xs space-y-1.5 mt-2">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-[#136F9A] flex items-center space-x-1.5">
                          <History className="w-3.5 h-3.5 text-[#136F9A]" />
                          <span>Repaired Services & Replaced Components:</span>
                        </span>
                        <span className="text-[11px] font-extrabold text-[#136F9A] bg-[#E5F1FF] px-2 py-0.5 rounded-md border border-[#BCE0FD]">
                          {systemSettings.currencySymbol}{wo.totalAmount || 0}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {wo.selectedRepairs && wo.selectedRepairs.length > 0 ? (
                          wo.selectedRepairs.map((rep, idx) => (
                            <span key={idx} className="px-2.5 py-1 bg-white border border-[#D8E5ED] text-[#2C3E50] font-extrabold text-[11px] rounded-lg shadow-2xs flex items-center space-x-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>{rep.name}</span>
                            </span>
                          ))
                        ) : wo.lineItems && wo.lineItems.length > 0 ? (
                          wo.lineItems.map((item, idx) => (
                            <span key={idx} className="px-2.5 py-1 bg-white border border-[#D8E5ED] text-[#2C3E50] font-extrabold text-[11px] rounded-lg shadow-2xs flex items-center space-x-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>{item.description || item.partName}</span>
                            </span>
                          ))
                        ) : (
                          <span className="px-2.5 py-1 bg-white border border-[#D8E5ED] text-[#2C3E50] font-extrabold text-[11px] rounded-lg flex items-center space-x-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>{wo.symptomsReported || 'Standard Repair & Servicing'}</span>
                          </span>
                        )}

                        {wo.microSolderingLog?.icReplaced && wo.microSolderingLog.icReplaced.length > 0 && (
                          <span className="px-2.5 py-1 bg-purple-50 border border-purple-200 text-purple-900 font-extrabold text-[11px] rounded-lg flex items-center space-x-1">
                            <Cpu className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                            <span>IC Replaced: {wo.microSolderingLog.icReplaced.join(', ')}</span>
                          </span>
                        )}
                      </div>

                      {(wo.afterRepairSummary || wo.symptomsReported || wo.diagnosticResult) && (
                        <div className="text-[11px] text-[#526375] space-y-1 pt-1 border-t border-[#EBF3F8]">
                          {wo.afterRepairSummary && (
                            <p><strong className="text-[#2C3E50]">Tech Repair Notes:</strong> {wo.afterRepairSummary}</p>
                          )}
                          {wo.symptomsReported && (
                            <p><strong className="text-[#2C3E50]">Reported Symptom:</strong> {wo.symptomsReported}</p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Last Log preview */}
                    {lastRecord && (
                      <div className="bg-surface border border-line rounded-xl p-2.5 text-xs text-ink space-y-1 mt-1">
                        <div className="flex items-center justify-between text-[11px] text-muted">
                          <span className="font-bold text-ink flex items-center space-x-1">
                            <span>Last Logged by {lastRecord.author}</span>
                            {lastRecord.satisfactionRating && (
                              <span className="flex items-center text-amber-500 font-bold ml-2">
                                {'★'.repeat(lastRecord.satisfactionRating)}
                              </span>
                            )}
                          </span>
                          <span>{new Date(lastRecord.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                        </div>
                        <p className="text-xs text-ink">{lastRecord.notes}</p>
                      </div>
                    )}
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center space-x-2 shrink-0 border-t md:border-t-0 pt-2 md:pt-0 border-line">
                    {/* Direct Contact Buttons */}
                    <a
                      href={`tel:${wo.customerPhone}`}
                      className="p-2 rounded-xl bg-surface hover:bg-line text-ink border border-line transition-colors cursor-pointer"
                      title="Call Phone"
                    >
                      <Phone className="w-3.5 h-3.5 text-brand" />
                    </a>

                    {records.length > 0 && (
                      <Button
                        type="button"
                        onClick={() => setHistoryModalWo(wo)}
                        variant="secondary"
                        size="sm"
                        className="flex items-center space-x-1"
                      >
                        <History className="w-3.5 h-3.5 text-muted" />
                        <span>Logs ({records.length})</span>
                      </Button>
                    )}

                    <Button
                      type="button"
                      onClick={() => handleOpenLogModal(wo)}
                      size="sm"
                      className="bg-brand hover:bg-[#0077ED] text-white flex items-center space-x-1.5"
                    >
                      <PhoneCall className="w-3.5 h-3.5" />
                      <span>Log Follow-Up</span>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* LOG FOLLOW-UP MODAL */}
      {isLogModalOpen && selectedWo && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-line rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-[#E5F1FF] text-brand rounded-xl">
                  <PhoneCall className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-ink">
                    Record Follow-Up Call
                  </h3>
                  <p className="text-xs text-muted">
                    {selectedWo.orderNumber} • {selectedWo.customerName} ({selectedWo.deviceModel})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsLogModalOpen(false)}
                className="p-1 rounded-lg text-muted hover:bg-surface hover:text-ink transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Repaired Device Quick Reference Card */}
              <div className="bg-[#F0F7FB] border border-[#D8E5ED] rounded-xl p-3 space-y-2 text-xs">
                <div className="flex items-center justify-between border-b border-[#D8E5ED] pb-1.5">
                  <span className="font-extrabold text-[#136F9A] flex items-center space-x-1.5">
                    <History className="w-4 h-4 text-[#136F9A]" />
                    <span>Repaired Service Summary</span>
                  </span>
                  <span className="font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    Total: {systemSettings.currencySymbol}{selectedWo.totalAmount || 0}
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex flex-wrap gap-1">
                    {selectedWo.selectedRepairs && selectedWo.selectedRepairs.length > 0 ? (
                      selectedWo.selectedRepairs.map((rep, idx) => (
                        <span key={idx} className="px-2 py-0.5 bg-white border border-[#D8E5ED] text-[#2C3E50] font-bold text-[11px] rounded-md flex items-center space-x-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>{rep.name}</span>
                        </span>
                      ))
                    ) : selectedWo.lineItems && selectedWo.lineItems.length > 0 ? (
                      selectedWo.lineItems.map((item, idx) => (
                        <span key={idx} className="px-2 py-0.5 bg-white border border-[#D8E5ED] text-[#2C3E50] font-bold text-[11px] rounded-md flex items-center space-x-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>{item.description || item.partName}</span>
                        </span>
                      ))
                    ) : (
                      <span className="px-2 py-0.5 bg-white border border-[#D8E5ED] text-[#2C3E50] font-bold text-[11px] rounded-md flex items-center space-x-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>{selectedWo.symptomsReported || 'Standard Repair Service'}</span>
                      </span>
                    )}

                    {selectedWo.microSolderingLog?.icReplaced && selectedWo.microSolderingLog.icReplaced.length > 0 && (
                      <span className="px-2 py-0.5 bg-purple-50 border border-purple-200 text-purple-900 font-bold text-[11px] rounded-md flex items-center space-x-1">
                        <Cpu className="w-3 h-3 text-purple-600" />
                        <span>IC Replaced: {selectedWo.microSolderingLog.icReplaced.join(', ')}</span>
                      </span>
                    )}
                  </div>

                  {selectedWo.afterRepairSummary && (
                    <p className="text-[11px] text-[#526375] pt-0.5">
                      <strong className="text-[#2C3E50]">Tech Summary:</strong> {selectedWo.afterRepairSummary}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-[11px] text-[#526375] pt-1 border-t border-[#EBF3F8]">
                    <span>Assigned Tech: <strong className="text-[#2C3E50]">{selectedWo.assignedTechName || 'Shop Technician'}</strong></span>
                    <span>Warranty: <strong className="text-[#2C3E50]">{selectedWo.warrantyDays || 30} Days</strong></span>
                  </div>
                </div>
              </div>

              {/* Outcome / Status Selector */}
              <div className="space-y-1.5">
                <label className="font-bold text-ink">Follow-Up Outcome Status</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(
                    [
                      { id: 'Satisfied', label: 'Satisfied (5★)' },
                      { id: 'Issue Reported', label: 'Issue Reported' },
                      { id: 'No Answer', label: 'No Answer' },
                      { id: 'Callback Scheduled', label: 'Callback Scheduled' },
                      { id: 'Pending Call', label: 'Pending Call' },
                      { id: 'Closed', label: 'Closed' },
                    ] as { id: FollowUpStatus; label: string }[]
                  ).map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setFormStatus(s.id)}
                      className={`p-2 rounded-xl border font-bold text-center transition-all cursor-pointer ${
                        formStatus === s.id
                          ? 'border-brand bg-[#E5F1FF] text-brand'
                          : 'border-line bg-white text-ink hover:bg-surface'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Star Rating if Satisfied */}
              {formStatus === 'Satisfied' && (
                <div className="space-y-1 bg-amber-50/60 border border-amber-200 rounded-xl p-3">
                  <label className="font-bold text-amber-900 block">Customer Satisfaction Rating</label>
                  <div className="flex items-center space-x-2 pt-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setFormRating(star)}
                        className="p-1 text-amber-400 hover:scale-110 transition-transform cursor-pointer"
                      >
                        <Star
                          className={`w-6 h-6 ${
                            star <= formRating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
                          }`}
                        />
                      </button>
                    ))}
                    <span className="font-bold text-amber-900 ml-2">{formRating} / 5 Stars</span>
                  </div>
                </div>
              )}

              {/* Staff Author */}
              <div className="space-y-1">
                <label className="font-bold text-ink">Logged By (Staff / Advisor Name)</label>
                <input
                  type="text"
                  value={formAuthor}
                  onChange={(e) => setFormAuthor(e.target.value)}
                  placeholder="e.g. Service Advisor Alex"
                  className="w-full bg-surface border border-line rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-brand focus:bg-white transition-all"
                />
              </div>

              {/* Notes & Quick Templates */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-ink">Call Notes & Feedback Details</label>
                  <span className="text-[10px] text-muted">Quick click templates below</span>
                </div>

                <div className="flex flex-wrap gap-1.5 pb-1">
                  {quickNotesTemplates.map((tmpl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setFormNotes(tmpl)}
                      className="px-2 py-1 bg-surface hover:bg-line text-ink border border-line rounded-lg text-[10px] font-semibold transition-all text-left cursor-pointer"
                    >
                      + {tmpl.slice(0, 32)}...
                    </button>
                  ))}
                </div>

                <textarea
                  rows={3}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Enter details from customer follow-up call..."
                  className="w-full bg-surface border border-line rounded-xl p-3 text-xs focus:outline-none focus:border-brand focus:bg-white transition-all resize-none"
                />
              </div>

              {/* Next Follow-up Date */}
              <div className="space-y-1">
                <label className="font-bold text-ink">Next Follow-Up Date (Optional)</label>
                <input
                  type="date"
                  value={formNextDate}
                  onChange={(e) => setFormNextDate(e.target.value)}
                  className="w-full bg-surface border border-line rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-brand focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-line">
              <Button
                type="button"
                onClick={() => setIsLogModalOpen(false)}
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSaveFollowUpLog}
                className="bg-brand hover:bg-[#0077ED] text-white flex items-center space-x-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Save Follow-Up Log</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* HISTORY LOGS MODAL */}
      {historyModalWo && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-line rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center space-x-2">
                <History className="w-5 h-5 text-brand" />
                <div>
                  <h3 className="font-extrabold text-sm text-ink">
                    Follow-Up History Log
                  </h3>
                  <p className="text-xs text-muted">
                    {historyModalWo.orderNumber} • {historyModalWo.customerName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setHistoryModalWo(null)}
                className="p-1 rounded-lg text-muted hover:bg-surface hover:text-ink transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {/* Repaired Device Details */}
              <div className="bg-[#F0F7FB] border border-[#D8E5ED] rounded-xl p-3 text-xs space-y-1.5">
                <div className="flex items-center justify-between border-b border-[#D8E5ED] pb-1">
                  <span className="font-extrabold text-[#136F9A] flex items-center space-x-1">
                    <History className="w-3.5 h-3.5 text-[#136F9A]" />
                    <span>Repaired Services:</span>
                  </span>
                  <span className="font-bold text-emerald-700">{systemSettings.currencySymbol}{historyModalWo.totalAmount || 0}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {historyModalWo.selectedRepairs && historyModalWo.selectedRepairs.length > 0 ? (
                    historyModalWo.selectedRepairs.map((rep, idx) => (
                      <span key={idx} className="px-2 py-0.5 bg-white border border-[#D8E5ED] text-[#2C3E50] font-bold text-[10px] rounded">
                        ✓ {rep.name}
                      </span>
                    ))
                  ) : historyModalWo.lineItems && historyModalWo.lineItems.length > 0 ? (
                    historyModalWo.lineItems.map((item, idx) => (
                      <span key={idx} className="px-2 py-0.5 bg-white border border-[#D8E5ED] text-[#2C3E50] font-bold text-[10px] rounded">
                        ✓ {item.description || item.partName}
                      </span>
                    ))
                  ) : (
                    <span className="px-2 py-0.5 bg-white border border-[#D8E5ED] text-[#2C3E50] font-bold text-[10px] rounded">
                      ✓ {historyModalWo.symptomsReported || 'Standard Repair'}
                    </span>
                  )}
                </div>
              </div>

              {(historyModalWo.followUpRecords || []).map((rec) => (
                <div
                  key={rec.id}
                  className="p-3 bg-surface border border-line rounded-xl text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-ink">{rec.author}</span>
                    <span className="text-[10px] text-muted">
                      {new Date(rec.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusBadge(rec.status)}
                    {rec.satisfactionRating && (
                      <span className="text-amber-500 font-bold text-xs">
                        {'★'.repeat(rec.satisfactionRating)}
                      </span>
                    )}
                  </div>
                  <p className="text-ink">{rec.notes}</p>
                  {rec.nextFollowUpDate && (
                    <div className="text-[10px] text-brand font-semibold">
                      Next Callback: {rec.nextFollowUpDate}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="pt-2 text-right">
              <button
                type="button"
                onClick={() => setHistoryModalWo(null)}
                className="px-4 py-2 bg-surface border border-line text-ink font-bold rounded-xl text-xs hover:bg-line transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
