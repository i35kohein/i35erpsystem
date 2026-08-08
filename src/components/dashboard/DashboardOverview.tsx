import React, { useState, useMemo } from 'react';

import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Plus,
  Kanban,
  CreditCard,
  Coins,
  Boxes,
  Clock,
  ShieldAlert,
  ClipboardList,
  ArrowRight,
} from 'lucide-react';
import { WorkOrder, PartItem, RmaItem, Technician, WorkOrderStatus } from '../../types';
import { Button } from '../ui';

import { DateFilterState, filterByDateRange } from '../common/DateFilterSelector';
import { timeAgoShort } from '../../utils/timeAgo';
import { StatusBadge } from '../common/StatusBadge';
import { PriorityBadge } from '../common/PriorityBadge';
import { TicketDetailInspectorModal } from '../common/TicketDetailInspectorModal';

interface DashboardOverviewProps {
  workOrders: WorkOrder[];
  parts: PartItem[];
  rmas: RmaItem[];
  technicians: Technician[];
  onNavigateToTab: (tab: string) => void;
  onOpenNewWorkOrder: (prefill?: any) => void;
  onOpenAiAssistant: () => void;
  onDeleteWorkOrder?: (id: string) => void;
  onUpdateWorkOrderStatus?: (id: string, status: WorkOrderStatus) => void;
  onSelectPrintTag?: (wo: WorkOrder) => void;
  dateFilter?: DateFilterState;
  setDateFilter?: (filter: DateFilterState) => void;
  currencySymbol?: string;
  onSettleInventoryFund?: (ids: string[]) => void;
}

const REPAIR_CATEGORIES_KEYWORDS = [
  'display', 'battery', 'logic board', 'chip', 'charging', 'port',
  'back glass', 'camera', 'audio', 'flex', 'screen', 'touch', 'speaker',
];

/** Operational statuses — anything that still needs work / a customer touch. */
const OPEN_STATUSES = ['Receive', 'In Progress', 'Pending'];

const PRIORITY_RANK: Record<string, number> = {
  Urgent: 0,
  Rush: 0,
  'B2B Priority': 1,
  'Warranty Redo': 2,
  Normal: 3,
};

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  workOrders,
  parts,
  technicians,
  onNavigateToTab,
  onOpenNewWorkOrder,
  onSelectPrintTag,
  onSettleInventoryFund,
  currencySymbol = 'MMK',
  dateFilter: externalDateFilter,
}) => {
  const [internalDateFilter] = useState<DateFilterState>({ preset: 'all' });
  const dateFilter = externalDateFilter || internalDateFilter;

  // Row-click inspector
  const [rosterTicket, setRosterTicket] = useState<WorkOrder | null>(null);

  // ----- Operational data (ALWAYS current — never hidden by the date filter) -----
  const activeRepairs = workOrders.filter(
    (w) => !['Taken Out', 'Finished', 'Cant Repair', 'Customer Not Repair'].includes(w.status)
  );
  const readyForPickup = workOrders.filter((w) => w.status === 'Finished');

  // Bottlenecked: open tickets sitting >48h
  const stagnantWorkOrders = useMemo(() => {
    const now = Date.now();
    return workOrders.filter((wo) => {
      if (['Taken Out', 'Finished', 'Cant Repair', 'Customer Not Repair'].includes(wo.status)) return false;
      const created = new Date(wo.createdAt).getTime();
      if (isNaN(created)) return false;
      return (now - created) / (1000 * 60 * 60) >= 48;
    });
  }, [workOrders]);

  // Overdue: open tickets past their estimated completion
  const overdueWorkOrders = useMemo(() => {
    const now = Date.now();
    return workOrders.filter((wo) => {
      if (!OPEN_STATUSES.includes(wo.status)) return false;
      if (!wo.estimatedCompletion) return false;
      const due = new Date(wo.estimatedCompletion).getTime();
      return !isNaN(due) && due < now;
    });
  }, [workOrders]);

  // Today's queue: top 5 actionable open tickets
  const todayQueue = useMemo(() => {
    return workOrders
      .filter((wo) => OPEN_STATUSES.includes(wo.status))
      .sort((a, b) => {
        const rankDiff = (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9);
        if (rankDiff !== 0) return rankDiff;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      })
      .slice(0, 5);
  }, [workOrders]);

  // Warranty telemetry — critical (≤7d remaining) surfaces as attention
  const criticalWarrantyCount = useMemo(() => {
    const now = Date.now();
    const ONE_DAY_MS = 1000 * 60 * 60 * 24;
    return workOrders.filter((wo) => {
      if (wo.status !== 'Finished' && wo.status !== 'Taken Out') return false;
      const warrantyDays = wo.warrantyDays ?? 90;
      if (warrantyDays <= 0) return false;
      const startMs = new Date(wo.completedAt || wo.createdAt).getTime();
      if (isNaN(startMs)) return false;
      const remainingDays = Math.ceil((startMs + warrantyDays * ONE_DAY_MS - now) / ONE_DAY_MS);
      return remainingDays >= 0 && remainingDays <= 7;
    }).length;
  }, [workOrders]);

  // Repair-related low stock (parts at/below reorder point)
  const repairLowStockParts = useMemo(() => {
    return parts.filter((p) => {
      const isLow = p.quantityInStock <= p.reorderPoint;
      const isRepairPart = REPAIR_CATEGORIES_KEYWORDS.some(
        (cat) =>
          p.category.toLowerCase().includes(cat) ||
          p.name.toLowerCase().includes(cat) ||
          (p.deviceCompatibility && p.deviceCompatibility.length > 0)
      );
      return isLow && isRepairPart;
    });
  }, [parts]);

  // Inventory fund: parts used from stock, not settled
  const pendingFundTickets = workOrders.filter(
    (wo) => wo.inventoryConsumptionAmount && wo.inventorySettlementStatus !== 'settled'
  );
  const pendingFundTotal = pendingFundTickets.reduce(
    (sum, wo) => sum + (wo.inventoryConsumptionAmount || 0),
    0
  );

  // ----- Secondary metrics (respect the header date filter) -----
  const filteredWorkOrders = useMemo(
    () => filterByDateRange<WorkOrder>(workOrders, dateFilter),
    [workOrders, dateFilter]
  );

  const revenueWorkOrders = filteredWorkOrders.filter(
    (w) => w.status === 'Finished' || w.status === 'Taken Out'
  );
  const totalRevenue = revenueWorkOrders.reduce((sum, wo) => sum + (wo.subtotal || 0), 0);

  const totalPartsCost = revenueWorkOrders.reduce((sum, wo) => {
    const lineItems = wo.lineItems || [];
    return sum + lineItems.reduce((c, li) => c + (li.unitCost || 0) * (li.quantity || 1), 0);
  }, 0);
  const totalMargin = totalRevenue - totalPartsCost;
  const marginPercent = totalRevenue > 0 ? Math.round((totalMargin / totalRevenue) * 100) : 0;

  const completedWorkOrders = filteredWorkOrders.filter(
    (w) => w.status === 'Finished' || w.status === 'Taken Out'
  );
  let avgTurnaroundHours = 0;
  if (completedWorkOrders.length > 0) {
    const totalHours = completedWorkOrders.reduce((acc, wo) => {
      const created = new Date(wo.createdAt).getTime();
      const endTime = new Date(wo.completedAt || wo.updatedAt || wo.createdAt).getTime();
      const diffHours = Math.max(0, (endTime - created) / (1000 * 60 * 60));
      return acc + diffHours;
    }, 0);
    avgTurnaroundHours = Number((totalHours / completedWorkOrders.length).toFixed(1));
  }

  // ----- Needs Attention (P1 → P3, only non-zero items) -----
  const attentionItems = useMemo(() => {
    const items: {
      id: string;
      severity: 'P1' | 'P2' | 'P3';
      icon: React.ReactNode;
      title: string;
      subtitle: string;
      actionLabel: string;
      onAction: () => void;
    }[] = [];

    if (overdueWorkOrders.length > 0) {
      items.push({
        id: 'overdue',
        severity: 'P1',
        icon: <Clock className="w-4 h-4" />,
        title: `${overdueWorkOrders.length} ticket${overdueWorkOrders.length > 1 ? 's' : ''} overdue`,
        subtitle: 'Past estimated completion — update or chase now',
        actionLabel: 'Open Pipeline',
        onAction: () => onNavigateToTab('pipeline'),
      });
    }

    if (stagnantWorkOrders.length > 0) {
      items.push({
        id: 'bottleneck',
        severity: 'P1',
        icon: <AlertTriangle className="w-4 h-4" />,
        title: `${stagnantWorkOrders.length} bottlenecked (>48h)`,
        subtitle: 'Stuck in queue — reassign or update status',
        actionLabel: 'Inspect',
        onAction: () => onNavigateToTab('pipeline'),
      });
    }

    if (readyForPickup.length > 0) {
      items.push({
        id: 'pickup',
        severity: 'P1',
        icon: <CheckCircle2 className="w-4 h-4" />,
        title: `${readyForPickup.length} ready for pickup`,
        subtitle: 'Repair finished — awaiting customer',
        actionLabel: 'View',
        onAction: () => onNavigateToTab('pipeline'),
      });
    }

    if (pendingFundTickets.length > 0) {
      items.push({
        id: 'fund',
        severity: 'P2',
        icon: <Coins className="w-4 h-4" />,
        title: `${pendingFundTickets.length} ticket${pendingFundTickets.length > 1 ? 's' : ''} — inventory fund unsettled`,
        subtitle: `${pendingFundTotal.toLocaleString()} ${currencySymbol} in parts used from stock`,
        actionLabel: 'Mark Settled',
        onAction: () => onSettleInventoryFund?.(pendingFundTickets.map((wo) => wo.id)),
      });
    }

    if (criticalWarrantyCount > 0) {
      items.push({
        id: 'warranty',
        severity: 'P2',
        icon: <ShieldAlert className="w-4 h-4" />,
        title: `${criticalWarrantyCount} warranty${criticalWarrantyCount > 1 ? 'ies' : ''} expiring ≤7 days`,
        subtitle: 'Contact customer before warranty ends',
        actionLabel: 'Follow Ups',
        onAction: () => onNavigateToTab('follow-up'),
      });
    }

    if (repairLowStockParts.length > 0) {
      items.push({
        id: 'stock',
        severity: 'P3',
        icon: <Boxes className="w-4 h-4" />,
        title: `${repairLowStockParts.length} repair part${repairLowStockParts.length > 1 ? 's' : ''} low on stock`,
        subtitle: 'At or below reorder point',
        actionLabel: 'Inventory',
        onAction: () => onNavigateToTab('inventory'),
      });
    }

    return items;
  }, [overdueWorkOrders, stagnantWorkOrders, readyForPickup, pendingFundTickets, pendingFundTotal, criticalWarrantyCount, repairLowStockParts, currencySymbol, onNavigateToTab, onSettleInventoryFund]);

  const severityStyle: Record<string, { badge: string; ring: string; action: string }> = {
    P1: {
      badge: 'bg-danger/10 text-danger border-danger/30',
      ring: 'hover:border-danger/50',
      action: 'bg-danger/10 text-danger border-danger/30 hover:bg-danger/20',
    },
    P2: {
      badge: 'bg-warning/10 text-warning border-warning/30',
      ring: 'hover:border-warning/50',
      action: 'bg-warning/10 text-warning border-warning/30 hover:bg-warning/20',
    },
    P3: {
      badge: 'bg-brand-soft text-brand border-brand/30',
      ring: 'hover:border-brand/50',
      action: 'bg-brand-soft text-brand border-brand/30 hover:bg-brand/15',
    },
  };

  const dueInfo = (wo: WorkOrder) => {
    if (!wo.estimatedCompletion) return null;
    const due = new Date(wo.estimatedCompletion).getTime();
    if (isNaN(due)) return null;
    const diffMs = due - Date.now();
    const hours = Math.round(diffMs / (1000 * 60 * 60));
    if (diffMs < 0) {
      return { text: `Overdue ${timeAgoShort(new Date(due).toISOString())}`, overdue: true };
    }
    if (hours < 24) return { text: `Due in ${Math.max(1, hours)}h`, overdue: false };
    return {
      text: `Due ${new Date(due).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
      overdue: false,
    };
  };

  const technicianName = (wo: WorkOrder) => {
    if (wo.assignedTechName) return wo.assignedTechName;
    const tech = technicians.find((t) => t.id === wo.assignedTechId);
    return tech?.name || 'Unassigned';
  };

  return (
    <div className="space-y-4 pb-20 lg:pb-0">
      {/* ============ 1. NEEDS ATTENTION ============ */}
      <section aria-label="Needs attention" className="bg-white border border-line rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="relative flex w-2.5 h-2.5">
              {attentionItems.length > 0 && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-danger opacity-60" />
              )}
              <span className={`relative inline-flex rounded-full w-2.5 h-2.5 ${attentionItems.length > 0 ? 'bg-danger' : 'bg-success-deep'}`} />
            </span>
            <h2 className="text-sm font-extrabold text-ink tracking-tight">Needs Attention</h2>
            {attentionItems.length > 0 && (
              <span className="px-2 py-0.5 bg-danger/10 text-danger rounded-full text-xs font-mono font-bold">
                {attentionItems.length}
              </span>
            )}
          </div>
          {attentionItems.length > 0 && (
            <span className="text-xs font-bold text-muted hidden sm:block">
              {attentionItems.filter((i) => i.severity === 'P1').length > 0
                ? `${attentionItems.filter((i) => i.severity === 'P1').length} critical`
                : 'No critical items'}
            </span>
          )}
        </div>

        {attentionItems.length === 0 ? (
          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-success/5 border border-success/20 text-xs">
            <CheckCircle2 className="w-5 h-5 text-success-deep shrink-0" />
            <p className="text-success-deep font-bold">All clear — no tickets need attention right now.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {attentionItems.map((item) => {
              const s = severityStyle[item.severity];
              return (
                <li
                  key={item.id}
                  className={`group flex items-center gap-3 p-3 rounded-xl border border-line/80 bg-surface/40 transition-all ${s.ring}`}
                >
                  <span className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${s.badge}`}>
                    {item.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-extrabold px-1.5 py-0.5 rounded border ${s.badge}`}>{item.severity}</span>
                      <p className="text-xs font-extrabold text-ink truncate">{item.title}</p>
                    </div>
                    <p className="text-xs text-muted truncate mt-0.5">{item.subtitle}</p>
                  </div>
                  <Button
                    type="button"
                    onClick={item.onAction}
                    size="sm"
                    className={`shrink-0 border text-xs font-bold min-h-9 ${s.action}`}
                  >
                    {item.actionLabel}
                    <ChevronRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* ============ 2. TODAY'S QUEUE (top 5) ============ */}
      <section aria-label="Today's repair queue" className="bg-white border border-line rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center space-x-2 min-w-0">
            <ClipboardList className="w-4 h-4 text-brand shrink-0" />
            <h2 className="text-sm font-extrabold text-ink tracking-tight truncate">Today's Queue</h2>
            <span className="px-2 py-0.5 bg-brand/10 text-brand-deep rounded-full text-xs font-mono font-bold whitespace-nowrap">
              {activeRepairs.length} active
            </span>
          </div>
          <Button
            type="button"
            onClick={() => onNavigateToTab('pipeline')}
            variant="outline"
            size="sm"
            className="shrink-0 min-h-9 text-xs font-bold"
          >
            Full Queue
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>

        {todayQueue.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
            <div className="w-12 h-12 rounded-2xl bg-brand-soft text-brand flex items-center justify-center">
              <ClipboardList className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-extrabold text-ink">No active repairs</p>
              <p className="text-xs text-muted mt-0.5">Start a new intake ticket to get going.</p>
            </div>
            <Button type="button" onClick={() => onOpenNewWorkOrder()} size="sm" className="min-h-9 text-xs font-bold">
              <Plus className="w-4 h-4 mr-1" />
              New Intake
            </Button>
          </div>
        ) : (
          <ul className="divide-y divide-line/70">
            {todayQueue.map((wo) => {
              const due = dueInfo(wo);
              return (
                <li key={wo.id}>
                  <button
                    type="button"
                    onClick={() => setRosterTicket(wo)}
                    className="w-full flex items-center gap-3 py-2.5 text-left hover:bg-surface/60 rounded-lg px-1.5 transition-colors group"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono text-xs font-black text-brand-deep shrink-0">{wo.orderNumber || wo.id.slice(0, 8)}</span>
                        <PriorityBadge priority={wo.priority} size="xs" />
                        <StatusBadge status={wo.status} size="xs" />
                      </div>
                      <div className="flex items-center gap-2 mt-1 min-w-0">
                        <span className="text-xs font-bold text-ink truncate">{wo.customerName}</span>
                        <span className="text-xs text-muted truncate hidden sm:inline">{wo.deviceModel}</span>
                        {due && (
                          <span className={`text-xs font-bold shrink-0 ${due.overdue ? 'text-danger' : 'text-muted'}`}>
                            {due.text}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs font-semibold text-muted hidden md:inline max-w-[110px] truncate">
                        {technicianName(wo)}
                      </span>
                      <ChevronRight className="w-4 h-4 text-muted group-hover:text-brand transition-colors" />
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* ============ 3. QUICK ACTIONS ============ */}
      <section aria-label="Quick actions" className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Button
          type="button"
          onClick={() => onOpenNewWorkOrder()}
          className="min-h-14 bg-brand hover:bg-brand-deep text-white shadow-xs font-bold text-sm rounded-2xl"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Intake Ticket
        </Button>
        <Button
          type="button"
          onClick={() => onNavigateToTab('pipeline')}
          variant="outline"
          className="min-h-14 bg-white border-line hover:border-brand/50 hover:bg-brand-soft/40 text-ink font-bold text-sm rounded-2xl"
        >
          <Kanban className="w-4 h-4 mr-2 text-brand" />
          Open Pipeline
        </Button>
        <Button
          type="button"
          onClick={() => onNavigateToTab('pos')}
          variant="outline"
          className="min-h-14 bg-white border-line hover:border-brand/50 hover:bg-brand-soft/40 text-ink font-bold text-sm rounded-2xl"
        >
          <CreditCard className="w-4 h-4 mr-2 text-success-deep" />
          Create Invoice
        </Button>
      </section>

      {/* ============ 4. SECONDARY METRICS (compact strip) ============ */}
      <section
        aria-label="Secondary metrics"
        className="bg-white border border-line rounded-2xl p-3 sm:p-4 shadow-xs grid grid-cols-2 lg:grid-cols-4 gap-y-3 divide-x-0 lg:divide-x lg:divide-line/70"
      >
        {[
          {
            label: 'Revenue',
            value: `${(totalRevenue / 1000).toFixed(totalRevenue >= 100000 ? 0 : 1)}k`,
            unit: currencySymbol,
            note: `${revenueWorkOrders.length} completed`,
          },
          {
            label: 'Margin',
            value: `${marginPercent}%`,
            unit: '',
            note: marginPercent < 0 ? 'Negative — check costs' : 'Gross margin',
            alert: marginPercent < 0,
          },
          {
            label: 'Avg Turnaround',
            value: avgTurnaroundHours > 0
              ? avgTurnaroundHours >= 24
                ? `${(avgTurnaroundHours / 24).toFixed(1)}d`
                : `${avgTurnaroundHours}h`
              : '—',
            unit: '',
            note: 'Intake → ready',
          },
          {
            label: 'Low Stock',
            value: `${repairLowStockParts.length}`,
            unit: 'parts',
            note: repairLowStockParts.length > 0 ? 'Order soon' : 'All good',
            alert: repairLowStockParts.length > 0,
          },
        ].map((m) => (
          <div key={m.label} className="px-2 py-1 lg:px-4 first:pl-1 last:pr-1">
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-muted">{m.label}</p>
            <p className={`mt-1 text-lg sm:text-xl font-black tracking-tight ${m.alert ? 'text-danger' : 'text-ink'}`}>
              {m.value} <span className="text-xs font-bold text-muted">{m.unit}</span>
            </p>
            <p className="text-[11px] text-muted font-medium truncate">{m.note}</p>
          </div>
        ))}
      </section>

      {/* ============ Ticket inspector (row click) ============ */}
      {rosterTicket && (
        <TicketDetailInspectorModal
          workOrder={rosterTicket}
          onClose={() => setRosterTicket(null)}
          onPrint={onSelectPrintTag}
          onDelete={undefined}
        />
      )}

      {/* ============ Mobile floating New Intake ============ */}
      <div className="fixed bottom-5 right-5 z-40 lg:hidden">
        <button
          type="button"
          onClick={() => onOpenNewWorkOrder()}
          aria-label="New Intake Ticket"
          className="w-14 h-14 rounded-full bg-brand hover:bg-brand-deep text-white shadow-xl shadow-brand/30 flex items-center justify-center active:scale-95 transition-transform"
        >
          <Plus className="w-7 h-7" />
        </button>
      </div>
    </div>
  );
};
