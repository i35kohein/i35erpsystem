import React, { useState, useMemo } from 'react';

import {Coins, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  TrendingUp, 
  Users,
  ChevronRight,
  BarChart3,
  Smartphone,
  Activity,
  Zap,
  ShieldCheck,
  ShieldAlert,
  Check,
  ArrowUpRight,
  Boxes,
  ClipboardList,
  Inbox,
  ListFilter,
  Copy,
  Search,
  RefreshCw,
  Printer,
  Kanban,
  Eye} from 'lucide-react';
import { WorkOrder, PartItem, RmaItem, Technician, WorkOrderStatus } from '../../types';
import { Button , Input } from '../ui';

import { DateFilterState, filterByDateRange} from '../common/DateFilterSelector';
import { timeAgoShort } from '../../utils/timeAgo';
import { TechnicianPerformanceTab } from './TechnicianPerformanceTab';
import { TechnicianLeaderboardView } from './TechnicianLeaderboardView';
import { TechnicianDetailModal } from './TechnicianDetailModal';
import { computeTechStats } from '../../utils/techAnalytics';
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
  onSettleInventoryFund?: (ids: string[]) => void;
}

const REPAIR_CATEGORIES_KEYWORDS = [
  'display', 'battery', 'logic board', 'chip', 'charging', 'port', 
  'back glass', 'camera', 'audio', 'flex', 'screen', 'touch', 'speaker'
];

/* Lightweight dependency-free SVG chart: revenue bars + completed-repairs
   line, each normalized to its own scale (dual-axis style). */
const TrendChart: React.FC<{
  buckets: { label: string }[];
  revenue: number[];
  repairs: number[];
  maxRevenue: number;
  maxRepairs: number;
}> = ({ buckets, revenue, repairs, maxRevenue, maxRepairs }) => {
  const W = 640;
  const H = 170;
  const TOP = 12;
  const BOTTOM = 26;
  const plotH = H - TOP - BOTTOM;
  const n = Math.max(buckets.length, 1);
  const slot = W / n;
  const barW = Math.max(3, slot * 0.55);
  const yFor = (v: number, max: number) => TOP + plotH - (max > 0 ? (v / max) * plotH : 0);
  const linePoints = repairs
    .map((v, i) => `${(slot * i + slot / 2).toFixed(1)},${yFor(v, maxRepairs).toFixed(1)}`)
    .join(' ');
  const labelStep = Math.max(1, Math.ceil(n / 6));
  const hasAny = revenue.some((v) => v > 0) || repairs.some((v) => v > 0);

  if (!hasAny) return null;

  return (
    <div>
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="block w-full min-w-[460px]"
          role="img"
          aria-label="Revenue bars and completed repairs line over the selected period"
        >
          {[0, 0.25, 0.5, 0.75, 1].map((f) => (
            <line
              key={f}
              x1={0}
              x2={W}
              y1={TOP + plotH * f}
              y2={TOP + plotH * f}
              stroke="var(--color-line)"
              strokeWidth={1}
              strokeDasharray={f === 1 ? undefined : '3 3'}
            />
          ))}
          {revenue.map((v, i) => (
            <rect
              key={i}
              x={slot * i + (slot - barW) / 2}
              y={yFor(v, maxRevenue)}
              width={barW}
              height={Math.max(0, TOP + plotH - yFor(v, maxRevenue))}
              rx={2}
              fill={v > 0 ? 'var(--color-brand)' : 'var(--color-line)'}
              opacity={v > 0 ? 0.85 : 0.35}
            />
          ))}
          {repairs.some((v) => v > 0) && (
            <polyline points={linePoints} fill="none" stroke="var(--color-success)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          )}
          {repairs.map((v, i) =>
            v > 0 ? (
              <circle key={i} cx={slot * i + slot / 2} cy={yFor(v, maxRepairs)} r={3} fill="var(--color-success)" />
            ) : null
          )}
          {buckets.map((b, i) =>
            i % labelStep === 0 || i === n - 1 ? (
              <text key={i} x={slot * i + slot / 2} y={H - 8} textAnchor="middle" fontSize={10} fill="var(--color-muted)">
                {b.label}
              </text>
            ) : null
          )}
        </svg>
      </div>
      <div className="flex items-center space-x-4 pt-2 text-xs font-bold text-muted">
        <span className="flex items-center space-x-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-brand/85" />
          Revenue (MMK)
        </span>
        <span className="flex items-center space-x-1.5">
          <span className="inline-block h-0.5 w-3 rounded-full bg-success" />
          Completed repairs
        </span>
      </div>
    </div>
  );
};

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  workOrders,
  parts,
  rmas,
  technicians,
  onNavigateToTab,
  onOpenNewWorkOrder,
  onSelectPrintTag,
  dateFilter: externalDateFilter,
  onSettleInventoryFund,
}) => {
  const [internalDateFilter] = useState<DateFilterState>({ preset: 'all' });
  const dateFilter = externalDateFilter || internalDateFilter;

  const [activeDashboardSubTab, setActiveDashboardSubTab] = useState<'status-queue' | 'repair-data' | 'tech-kpi' | 'inventory' | 'finance' | 'warranty-watch'>('status-queue');

  // Technician drill-down modal (tech-kpi tab)
  const [detailTechId, setDetailTechId] = useState<string | null>(null);
  const detailTech = detailTechId ? technicians.find((t) => t.id === detailTechId) || null : null;

  const [statusQueueFilter, setStatusQueueFilter] = useState<string>('ALL');
  const [queueSearchQuery, setQueueSearchQuery] = useState<string>('');
  const [queueTechFilter, setQueueTechFilter] = useState<string>('ALL');
  const [queuePriorityFilter, setQueuePriorityFilter] = useState<string>('ALL');

  const pipelineStatuses = useMemo(() => ['Receive', 'In Progress', 'Pending', 'Finished'], []);

  // Warranty Watch Subtab Controls
  const [warrantySearchQuery, setWarrantySearchQuery] = useState<string>('');
  const [warrantyFilterTab, setWarrantyFilterTab] = useState<'ALL_EXPIRING' | 'CRITICAL' | 'WARNING' | 'EXPIRED' | 'ALL'>('ALL_EXPIRING');
  const [copiedNoticeId, setCopiedNoticeId] = useState<string | null>(null);
  const [rosterTicket, setRosterTicket] = useState<WorkOrder | null>(null);

  // Background Warranty Telemetry & Expiry Check (Flags work orders nearing end of 90-day warranty)
  const warrantyCheckData = useMemo(() => {
    const now = Date.now();
    const ONE_DAY_MS = 1000 * 60 * 60 * 24;

    return workOrders
      .filter((wo) => wo.status === 'Finished' || wo.status === 'Taken Out')
      .map((wo) => {
      const warrantyDays = wo.warrantyDays ?? 90;
      if (warrantyDays <= 0) return null;

      // Completion Date or Intake Reference Date
      // Warranty clock anchors to when the repair actually completed
      // (completedAt, stamped on Finished/Taken Out) — never to updatedAt,
      // which moves on every edit and would reset the clock.
      const startDateMs = new Date(wo.completedAt || wo.createdAt).getTime();
      if (isNaN(startDateMs)) return null;

      const expiryDateMs = startDateMs + (warrantyDays * ONE_DAY_MS);
      const remainingDays = Math.ceil((expiryDateMs - now) / ONE_DAY_MS);
      const daysElapsed = Math.floor((now - startDateMs) / ONE_DAY_MS);
      const percentElapsed = Math.min(100, Math.max(0, Math.round((daysElapsed / warrantyDays) * 100)));

      // Flags for nearing end of warranty period (e.g. 1 to 14 days remaining before 90-day expiry)
      const isExpiringSoon = remainingDays >= 0 && remainingDays <= 14;
      const isCritical = remainingDays >= 0 && remainingDays <= 7;
      const isWarning = remainingDays > 7 && remainingDays <= 14;
      const isExpired = remainingDays < 0;
      const isActive = remainingDays > 14;

      return {
        wo,
        warrantyDays,
        startDateFormatted: new Date(startDateMs).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        expiryDateFormatted: new Date(expiryDateMs).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        remainingDays,
        daysElapsed,
        percentElapsed,
        isExpiringSoon,
        isCritical,
        isWarning,
        isExpired,
        isActive,
      };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }, [workOrders]);

  const expiringSoonWorkOrders = useMemo(() => {
    return warrantyCheckData
      .filter((item) => item.isExpiringSoon)
      .sort((a, b) => a.remainingDays - b.remainingDays);
  }, [warrantyCheckData]);

  const criticalWarrantyCount = useMemo(() => {
    return warrantyCheckData.filter((item) => item.isCritical).length;
  }, [warrantyCheckData]);

  const warningWarrantyCount = useMemo(() => {
    return warrantyCheckData.filter((item) => item.isWarning).length;
  }, [warrantyCheckData]);

  const expiredWarrantyCount = useMemo(() => {
    return warrantyCheckData.filter((item) => item.isExpired).length;
  }, [warrantyCheckData]);

  const activeWarrantyCount = useMemo(() => {
    return warrantyCheckData.filter((item) => item.isActive).length;
  }, [warrantyCheckData]);

  const handleCopyWarrantyCourtesyMessage = (item: typeof warrantyCheckData[0]) => {
    const msg = `Dear ${item.wo.customerName}, your ${item.warrantyDays}-day warranty for ${item.wo.deviceModel} (Ticket ${item.wo.orderNumber}) at AppleRepair Pro Lab expires on ${item.expiryDateFormatted} (${item.remainingDays} day${item.remainingDays === 1 ? '' : 's'} remaining). If you experience any issues, please visit us or contact ${item.wo.customerPhone}. Thank you!`;
    navigator.clipboard.writeText(msg);
    setCopiedNoticeId(item.wo.id);
    setTimeout(() => setCopiedNoticeId(null), 3000);
  };

  // Filter work orders based on date filter selection
  const filteredWorkOrders = useMemo(() => {
    return filterByDateRange<WorkOrder>(workOrders, dateFilter);
  }, [workOrders, dateFilter]);

  // Inventory Fund reminder: parts taken from stock that haven't been settled
  // (money set aside / restocked). Stays visible until settled.
  const pendingFundTickets = filteredWorkOrders.filter(
    (wo) => wo.inventoryConsumptionAmount && wo.inventorySettlementStatus !== 'settled'
  );
  const pendingFundTotal = pendingFundTickets.reduce((sum, wo) => sum + (wo.inventoryConsumptionAmount || 0), 0);
  const statusQueueWorkOrders = useMemo(() => {
    return filteredWorkOrders.filter((wo) => {
      // 1. Filter by Status Chip / Mode
      if (statusQueueFilter === 'PIPELINE') {
        if (!pipelineStatuses.includes(wo.status)) return false;
      } else if (statusQueueFilter !== 'ALL') {
        if (wo.status !== statusQueueFilter) return false;
      }

      // 2. Filter by Technician
      if (queueTechFilter !== 'ALL') {
        if (queueTechFilter === 'unassigned' && wo.assignedTechId) return false;
        if (queueTechFilter !== 'unassigned' && wo.assignedTechId !== queueTechFilter) return false;
      }

      // 3. Filter by Priority
      if (queuePriorityFilter !== 'ALL') {
        if (queuePriorityFilter === 'Urgent') {
          if (wo.priority !== 'Urgent' && wo.priority !== 'Rush') return false;
        } else if (wo.priority !== queuePriorityFilter) {
          return false;
        }
      }

      // 4. Filter by Search Query
      if (queueSearchQuery.trim()) {
        const q = queueSearchQuery.toLowerCase();
        const matchOrder = (wo.orderNumber || wo.id).toLowerCase().includes(q);
        const matchCust = (wo.customerName || '').toLowerCase().includes(q) || (wo.customerPhone || '').toLowerCase().includes(q);
        const matchDevice = (wo.deviceModel || '').toLowerCase().includes(q) || (wo.serialNumber || '').toLowerCase().includes(q) || (wo.imei || '').toLowerCase().includes(q);
        const matchIssue = (wo.symptomsReported || '').toLowerCase().includes(q) || (wo.serviceType || '').toLowerCase().includes(q);
        if (!matchOrder && !matchCust && !matchDevice && !matchIssue) return false;
      }

      return true;
    });
  }, [filteredWorkOrders, statusQueueFilter, queueTechFilter, queuePriorityFilter, queueSearchQuery, pipelineStatuses]);

  // Revenue-eligible statuses only: quoted subtotals on tickets that were
  // never repaired (Cant Repair / Customer Not Repair) are NOT revenue, and
  // unpaid-but-finished work is still billed revenue (collected is tracked
  // separately in the Finance tab).
  const REVENUE_STATUSES: WorkOrderStatus[] = ['Finished', 'Taken Out'];
  const revenueWorkOrders = useMemo(
    () => filteredWorkOrders.filter((w) => REVENUE_STATUSES.includes(w.status)),
    [filteredWorkOrders]
  );

  // Financial calculations
  const totalRevenue = useMemo(() => {
    return revenueWorkOrders.reduce((sum, wo) => sum + (wo.subtotal || 0), 0);
  }, [revenueWorkOrders]);

  const totalPartsCost = useMemo(() => {
    // Match revenue timing: COGS only for revenue-eligible tickets (Finished / Taken Out).
    // Counting line-item estimates of still-open quotes (Receive / In Progress / Pending)
    // against completed revenue produced a misleading negative margin.
    return revenueWorkOrders.reduce((sum, wo) => {
      const lineItems = wo.lineItems || [];
      return sum + lineItems.reduce((c, li) => c + (li.unitCost || 0) * (li.quantity || 1), 0);
    }, 0);
  }, [revenueWorkOrders]);

  const totalMargin = totalRevenue - totalPartsCost;
  const marginPercent = totalRevenue > 0 ? Math.round((totalMargin / totalRevenue) * 100) : 0;
  const avgTicketValue = revenueWorkOrders.length > 0 ? Math.round(totalRevenue / revenueWorkOrders.length) : 0;

  // Monthly Repairs & Turnaround Metrics

  // Average turnaround over COMPLETED tickets only (Finished / Taken Out).
  // Open tickets are excluded — mixing them in with Date.now() inflated the
  // average over time.
  const completedWorkOrders = filteredWorkOrders.filter((w) => w.status === 'Finished' || w.status === 'Taken Out');
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

  // Filter ONLY Repair-Related Low Stock Parts
  const repairLowStockParts = useMemo(() => {
    return parts.filter((p) => {
      const isLow = p.quantityInStock <= p.reorderPoint;
      const isRepairPart = REPAIR_CATEGORIES_KEYWORDS.some((cat) => 
        p.category.toLowerCase().includes(cat) ||
        p.name.toLowerCase().includes(cat) ||
        (p.deviceCompatibility && p.deviceCompatibility.length > 0)
      );
      return isLow && isRepairPart;
    });
  }, [parts]);

  const activeRepairs = filteredWorkOrders.filter((w) => w.status !== 'Taken Out' && w.status !== 'Finished' && w.status !== 'Cant Repair' && w.status !== 'Customer Not Repair');
  // "Ready for Pickup" = Finished only. Taken Out tickets have already been
  // collected — counting them inflated the card.
  const readyForPickup = filteredWorkOrders.filter((w) => w.status === 'Finished');

  const inRepair = filteredWorkOrders.filter((w) => w.status === 'In Progress' || w.status === 'Receive');
  const pendingRmas = rmas.filter((r) => r.status === 'Shipped to Vendor' || r.status === 'Draft');

    // Technician load imbalance — drives the amber suggestion banner (single source: computeTechStats)
  const techLoadData = useMemo(() => {
    return technicians.map((tech) => {
      const stats = computeTechStats(filteredWorkOrders, tech);
      return { tech, activeCount: stats.activeCount };
    });
  }, [technicians, filteredWorkOrders]);

  const maxTechLoad = Math.max(...techLoadData.map((t) => t.activeCount), 0);
  const minTechLoad = Math.min(...techLoadData.map((t) => t.activeCount), 0);
  const totalActiveTechJobs = techLoadData.reduce((sum, item) => sum + item.activeCount, 0);
  const isQueueImbalanced = totalActiveTechJobs >= 2 && (maxTechLoad - minTechLoad) >= 3;
  const maxLoadTechs = techLoadData.filter((t) => t.activeCount === maxTechLoad);
  const minLoadTechs = techLoadData.filter((t) => t.activeCount === minTechLoad && t.activeCount < maxTechLoad);

  // Status Queue Breakdown Analytics
  const statusQueueCounts = useMemo(() => {
    const counts = {
      Receive: 0,
      'In Progress': 0,
      Pending: 0,
      Finished: 0,
      'Taken Out': 0,
      'Cant Repair': 0,
      'Customer Not Repair': 0,
    };
    filteredWorkOrders.forEach((wo) => {
      if (counts[wo.status] !== undefined) {
        counts[wo.status] += 1;
      }
    });
    return counts;
  }, [filteredWorkOrders]);

  // Top Repair Devices — most-repaired models by ticket count + revenue
  const topRepairDevices = useMemo(() => {
    const byModel = new Map<string, { count: number; revenue: number }>();
    filteredWorkOrders.forEach((wo) => {
      const model = (wo.deviceModel || 'Unknown Device').trim() || 'Unknown Device';
      const entry = byModel.get(model) || { count: 0, revenue: 0 };
      entry.count += 1;
      entry.revenue += wo.subtotal || 0;
      byModel.set(model, entry);
    });
    return Array.from(byModel.entries())
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.count - a.count || b.revenue - a.revenue)
      .slice(0, 8);
  }, [filteredWorkOrders]);

  // Top Repair Categories with income — ticket + revenue per repair category
  const topRepairCategories = useMemo(() => {
    const totalRevenue = filteredWorkOrders.reduce((sum, wo) => sum + (wo.subtotal || 0), 0);
    const stats = [
      { id: 'screen', label: 'Screen & Display OLED', icon: Smartphone, color: 'bg-brand', textCol: 'text-brand', bgLight: 'bg-brand-soft', count: 0, revenue: 0 },
      { id: 'battery', label: 'Battery & Charging System', icon: Zap, color: 'bg-success', textCol: 'text-success', bgLight: 'bg-success/10', count: 0, revenue: 0 },
      { id: 'board', label: 'Logic Board & Micro-Soldering', icon: Activity, color: 'bg-purple', textCol: 'text-purple', bgLight: 'bg-purple/10', count: 0, revenue: 0 },
      { id: 'housing', label: 'Glass, Port, Camera & Housing', icon: Smartphone, color: 'bg-warning', textCol: 'text-warning', bgLight: 'bg-warning/10', count: 0, revenue: 0 },
    ];

    filteredWorkOrders.forEach((wo) => {
      const s = (wo.serviceType || '').toLowerCase();
      const desc = (wo.symptomsReported || '').toLowerCase();
      const rev = wo.subtotal || 0;

      if (s.includes('screen') || s.includes('display') || s.includes('oled') || desc.includes('screen') || desc.includes('cracked') || desc.includes('glass')) {
        stats[0].count += 1;
        stats[0].revenue += rev;
      } else if (s.includes('battery') || s.includes('charging') || s.includes('power') || desc.includes('battery') || desc.includes('charge')) {
        stats[1].count += 1;
        stats[1].revenue += rev;
      } else if (s.includes('soldering') || s.includes('board') || s.includes('ic') || s.includes('micro') || desc.includes('short')) {
        stats[2].count += 1;
        stats[2].revenue += rev;
      } else {
        stats[3].count += 1;
        stats[3].revenue += rev;
      }
    });

    return stats
      .map((st) => ({
        ...st,
        percentage: totalRevenue > 0 ? Math.round((st.revenue / totalRevenue) * 100) : 0,
      }))
      .filter((st) => st.count > 0)
      .sort((a, b) => b.revenue - a.revenue);
  }, [filteredWorkOrders]);

  const stagnantWorkOrders = useMemo(() => {
    const now = Date.now();
    return filteredWorkOrders.filter((wo) => {
      if (wo.status === 'Taken Out' || wo.status === 'Finished' || wo.status === 'Cant Repair' || wo.status === 'Customer Not Repair') return false;
      const created = new Date(wo.createdAt).getTime();
      const ageHours = (now - created) / (1000 * 60 * 60);
      return ageHours >= 48;
    });
  }, [filteredWorkOrders]);

  // Diagnostic 21-Point Analytics
  const financialAnalytics = useMemo(() => {
    let totalCollected = 0;
    let totalUnpaidBalance = 0;
    let paidCount = 0;
    let unpaidCount = 0;

    filteredWorkOrders.forEach((wo) => {
      const total = wo.subtotal || wo.totalAmount || 0;
      // Single source of truth with the Paid/Unpaid badge: a fully-paid
      // ticket (isPaid) counts the whole amount; otherwise what was actually
      // collected (paidAmount at checkout, else the intake deposit).
      const paid = wo.isPaid ? total : (wo.paidAmount || wo.depositAmount || 0);
      const balance = Math.max(0, total - paid);

      totalCollected += paid;
      totalUnpaidBalance += balance;
      if (balance === 0) {
        paidCount += 1;
      } else {
        unpaidCount += 1;
      }
    });

    return { totalCollected, totalUnpaidBalance, paidCount, unpaidCount };
  }, [filteredWorkOrders]);

  // Inventory & RMA Analytics
  const inventoryAnalytics = useMemo(() => {
    const totalValuation = parts.reduce((sum, p) => sum + (p.costPrice || (p.sellingPrice * 0.6)) * p.quantityInStock, 0);
    const totalItems = parts.reduce((sum, p) => sum + p.quantityInStock, 0);
    const lowStockCount = parts.filter((p) => p.quantityInStock <= p.reorderPoint).length;

    return { totalValuation, totalItems, lowStockCount };
  }, [parts]);

  // ===== Revenue & Repairs Trend (previous-period comparison) =====
  const DASHBOARD_TAB_IDS = ['status-queue', 'repair-data', 'tech-kpi', 'inventory', 'finance', 'warranty-watch'];

  const handleDashboardTabKeyDown = (e: React.KeyboardEvent, currentTab: string) => {
    const idx = DASHBOARD_TAB_IDS.indexOf(currentTab);
    if (idx === -1) return;
    let next: string | null = null;
    if (e.key === 'ArrowRight') next = DASHBOARD_TAB_IDS[(idx + 1) % DASHBOARD_TAB_IDS.length];
    else if (e.key === 'ArrowLeft') next = DASHBOARD_TAB_IDS[(idx - 1 + DASHBOARD_TAB_IDS.length) % DASHBOARD_TAB_IDS.length];
    else if (e.key === 'Home') next = DASHBOARD_TAB_IDS[0];
    else if (e.key === 'End') next = DASHBOARD_TAB_IDS[DASHBOARD_TAB_IDS.length - 1];
    if (next) {
      e.preventDefault();
      setActiveDashboardSubTab(next as typeof activeDashboardSubTab);
      document.getElementById(`dash-tab-${next}`)?.focus();
    }
  };

  const DAY_MS = 1000 * 60 * 60 * 24;
  const trendSeries = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayStartMs = todayStart.getTime();
    const endOfTodayMs = todayStartMs + DAY_MS - 1;

    // Window mirrors the header date filter (all = trailing 30 days).
    let windowStartMs: number;
    if (!dateFilter || dateFilter.preset === 'all') windowStartMs = todayStartMs - 29 * DAY_MS;
    else if (dateFilter.preset === 'today') windowStartMs = todayStartMs;
    else if (dateFilter.preset === '7days') windowStartMs = todayStartMs - 6 * DAY_MS;
    else if (dateFilter.preset === '30days') windowStartMs = todayStartMs - 29 * DAY_MS;
    else if (dateFilter.preset === '60days') windowStartMs = todayStartMs - 59 * DAY_MS;
    else {
      const s = dateFilter.startDate ? new Date(dateFilter.startDate + 'T00:00:00').getTime() : todayStartMs - 29 * DAY_MS;
      const e = dateFilter.endDate ? new Date(dateFilter.endDate + 'T23:59:59').getTime() : endOfTodayMs;
      windowStartMs = Math.min(s, e);
    }
    const windowEndMs =
      dateFilter?.preset === 'custom' && dateFilter.endDate
        ? Math.max(windowStartMs, new Date(dateFilter.endDate + 'T23:59:59').getTime())
        : endOfTodayMs;
    const windowEnd = Math.max(windowEndMs, windowStartMs);

    const spanMs = windowEnd - windowStartMs + 1;
    const bucketDays = spanMs / DAY_MS > 90 ? 7 : 1;
    const bucketCount = Math.max(1, Math.ceil(spanMs / (bucketDays * DAY_MS)));

    const buckets = Array.from({ length: bucketCount }, (_, i) => {
      const bStart = windowStartMs + i * bucketDays * DAY_MS;
      return {
        startMs: bStart,
        endMs: Math.min(windowEnd, bStart + bucketDays * DAY_MS - 1),
        label: new Date(bStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      };
    });

    const isRevenueStatus = (s: string) => s === 'Finished' || s === 'Taken Out';
    const currentRevenue = buckets.map(() => 0);
    const currentRepairs = buckets.map(() => 0);
    let curRev = 0, curRep = 0, prevRev = 0, prevRep = 0;
    const prevStartMs = windowStartMs - spanMs;
    const prevEndMs = windowStartMs - 1;

    workOrders.forEach((wo) => {
      const t = new Date(wo.createdAt || Date.now()).getTime();
      if (isNaN(t)) return;
      const rev = isRevenueStatus(wo.status) ? wo.subtotal || 0 : 0;
      const rep = isRevenueStatus(wo.status) ? 1 : 0;
      if (t >= prevStartMs && t <= prevEndMs) {
        prevRev += rev;
        prevRep += rep;
        return;
      }
      if (t < windowStartMs || t > windowEnd) return;
      const idx = Math.min(bucketCount - 1, Math.floor((t - windowStartMs) / (bucketDays * DAY_MS)));
      currentRevenue[idx] += rev;
      currentRepairs[idx] += rep;
      curRev += rev;
      curRep += rep;
    });

    return {
      buckets,
      currentRevenue,
      currentRepairs,
      curRev,
      curRep,
      prevRev,
      prevRep,
      maxRevenue: Math.max(...currentRevenue, 1),
      maxRepairs: Math.max(...currentRepairs, 1),
      windowLabel: `${new Date(windowStartMs).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${new Date(windowEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
      bucketDays,
      revenueDeltaPct: prevRev > 0 ? Math.round(((curRev - prevRev) / prevRev) * 100) : null,
      repairsDeltaPct: prevRep > 0 ? Math.round(((curRep - prevRep) / prevRep) * 100) : null,
    };
  }, [workOrders, dateFilter]);

  return (
    <div className="space-y-3">
      {/* Inventory Fund reminder — parts used from stock, not settled yet */}
      {pendingFundTickets.length > 0 && (
        <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-warning/10 border border-warning/30 rounded-2xl text-xs shadow-2xs">
          <div className="flex items-center gap-2 min-w-0">
            <Coins className="w-4 h-4 text-warning shrink-0" />
            <span className="font-bold text-warning min-w-0">
              Inventory fund reminder — {pendingFundTickets.length} ticket{pendingFundTickets.length > 1 ? 's' : ''} used parts worth{' '}
              <span className="font-black">{pendingFundTotal.toLocaleString()} MMK</span> from stock, not settled yet
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              onClick={() => onNavigateToTab('finance')}
              variant="outline"
              size="sm"
              className="text-warning border-warning/30 hover:bg-surface"
            >
              View Details
            </Button>
            <Button
              type="button"
              onClick={() => onSettleInventoryFund?.(pendingFundTickets.map((wo) => wo.id))}
              size="sm"
              className="bg-warning hover:bg-warning text-white"
            >
              Mark All Settled
            </Button>
          </div>
        </div>
      )}

      {/* Headline summary cards — always visible above the subtab tabs. */}
      {/* 4 KPI cards stay 4-up on every large screen (no 6/8-col squeeze with only 4 cards) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Active In-Shop Repairs */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            setActiveDashboardSubTab('status-queue');
            setStatusQueueFilter('ALL');
          }}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActiveDashboardSubTab('status-queue'); setStatusQueueFilter('ALL'); } }}
          aria-label="View active repairs queue"
          className="group relative bg-white p-4 rounded-2xl border border-line shadow-2xs hover:shadow-md hover:border-brand/50 transition-all cursor-pointer overflow-hidden select-none"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-muted">
              Active Repairs
            </span>
            <div className="w-8 h-8 rounded-xl bg-brand-soft text-brand flex items-center justify-center group-hover:scale-110 transition-transform">
              <ClipboardList className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-ink tracking-tight">
              {activeRepairs.length}
            </span>
            <span className="text-xs font-bold text-brand bg-brand-soft px-2 py-0.5 rounded-full border border-brand/20">
              {inRepair.length} In Progress / Received
            </span>
          </div>
          <div className="mt-3 pt-2.5 border-t border-surface flex items-center justify-between text-xs text-muted">
            <span>In-shop workload</span>
            <span className="font-bold text-brand group-hover:underline flex items-center space-x-0.5">
              <span>View Queue</span>
              <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Card 2: Ready for Pickup */}
        <div 
          role="button"
          tabIndex={0}
          onClick={() => {
            setActiveDashboardSubTab('status-queue');
            setStatusQueueFilter('Finished');
          }}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActiveDashboardSubTab('status-queue'); setStatusQueueFilter('Finished'); } }}
          aria-label="View ready for pickup"
          className="group relative bg-white p-4 rounded-2xl border border-line shadow-2xs hover:shadow-md hover:border-emerald-500/50 transition-all cursor-pointer overflow-hidden select-none"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-muted">
              Ready for Pickup
            </span>
            <div className="w-8 h-8 rounded-xl bg-success/10 text-success flex items-center justify-center group-hover:scale-110 transition-transform">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-ink tracking-tight">
              {readyForPickup.length}
            </span>
            <span className="text-xs font-bold text-success-deep bg-success/10 px-2 py-0.5 rounded-full border border-success/30">
              Completed
            </span>
          </div>
          <div className="mt-3 pt-2.5 border-t border-surface flex items-center justify-between text-xs text-muted">
            <span>Awaiting customer</span>
            <span className="font-bold text-success-deep group-hover:underline flex items-center space-x-0.5">
              <span>View Finished</span>
              <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Card 3: Total Revenue */}
        <div 
          role="button"
          tabIndex={0}
          onClick={() => setActiveDashboardSubTab('finance')}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActiveDashboardSubTab('finance'); } }}
          aria-label="View finance overview"
          className="group relative bg-white p-4 rounded-2xl border border-line shadow-2xs hover:shadow-md hover:border-indigo-500/50 transition-all cursor-pointer overflow-hidden select-none"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-muted">
              Total Revenue
            </span>
            <div className="w-8 h-8 rounded-xl bg-brand-soft text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-black text-ink tracking-tight truncate">
              {totalRevenue.toLocaleString()} <span className="text-xs font-bold text-muted">MMK</span>
            </span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full border shrink-0 ml-1 inline-flex items-center space-x-0.5 ${marginPercent < 0 ? 'bg-danger/10 text-danger border-danger/30' : 'bg-brand-soft text-brand-deep border-indigo-200'}`}
              title={marginPercent < 0 ? '⚠️ Negative margin — average costs exceed revenue' : 'Gross margin %'}>
              {marginPercent < 0 && <AlertTriangle className="w-2.5 h-2.5 shrink-0" />}
              <span>{marginPercent}% Margin</span>
            </span>
          </div>
          <div className="mt-3 pt-2.5 border-t border-surface flex items-center justify-between text-xs text-muted">
            <span>Avg: {avgTicketValue.toLocaleString()} MMK</span>
            <span className="font-bold text-indigo-600 group-hover:underline flex items-center space-x-0.5">
              <span>Finance</span>
              <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Card 4: Average Turnaround Time (completed tickets only) */}
        <div 
          role="button"
          tabIndex={0}
          onClick={() => setActiveDashboardSubTab('tech-kpi')}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActiveDashboardSubTab('tech-kpi'); } }}
          aria-label="View technician KPI"
          className="group relative bg-white p-4 rounded-2xl border border-line shadow-2xs hover:shadow-md hover:border-teal-500/50 transition-all cursor-pointer overflow-hidden select-none"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-muted">
              Avg Turnaround
            </span>
            <div className="w-8 h-8 rounded-xl bg-teal/10 text-teal-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-ink tracking-tight">
              {avgTurnaroundHours > 0
                ? avgTurnaroundHours >= 24
                  ? `${(avgTurnaroundHours / 24).toFixed(1)}d`
                  : `${avgTurnaroundHours}h`
                : '—'}
            </span>
            <span className="text-xs font-bold text-teal-700 bg-teal/10 px-2 py-0.5 rounded-full border border-teal-200">
              Intake → Ready
            </span>
          </div>
          <div className="mt-3 pt-2.5 border-t border-surface flex items-center justify-between text-xs text-muted">
            <span>{completedWorkOrders.length} completed tickets</span>
            <span className="font-bold text-teal-600 group-hover:underline flex items-center space-x-0.5">
              <span>Tech KPIs</span>
              <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </div>
      </div>

{/* Top Dashboard Navigation Subtabs Bar */}
      <div className="relative">
      <div role="tablist" aria-label="Dashboard sections" className="bg-surface p-1.5 rounded-2xl border border-line flex items-center space-x-1.5 overflow-x-auto no-scrollbar w-full text-xs shadow-2xs">
        {/* Subtab 1: Status Queue */}
        <Button
          type="button"
          role="tab"
          id="dash-tab-status-queue"
          aria-controls="dash-panel-status-queue"
          aria-selected={activeDashboardSubTab === 'status-queue'}
          onClick={() => setActiveDashboardSubTab('status-queue')}
          onKeyDown={(e) => handleDashboardTabKeyDown(e, 'status-queue')}
          className={`px-3.5 h-10 lg:h-10 rounded-xl text-xs font-extrabold transition-all flex items-center space-x-2 shrink-0 cursor-pointer border select-none active:scale-95 ${
            activeDashboardSubTab === 'status-queue'
              ? 'bg-brand text-white border-brand shadow-xs'
              : 'bg-white hover:bg-surface text-faint hover:text-ink border-line'
          }`}
        >
          <ListFilter className="w-4 h-4" />
          <span>Status Queue</span>
          <span className={`text-xs font-mono px-2 py-0.5 rounded-full font-bold ${
            activeDashboardSubTab === 'status-queue'
              ? 'bg-brand-deep text-white'
              : 'bg-line text-ink'
          }`}>
            {activeRepairs.length} Active
          </span>
        </Button>

        {/* Subtab 2: Repair Data */}
        <Button
          type="button"
          role="tab"
          id="dash-tab-repair-data"
          aria-controls="dash-panel-repair-data"
          aria-selected={activeDashboardSubTab === 'repair-data'}
          onClick={() => setActiveDashboardSubTab('repair-data')}
          onKeyDown={(e) => handleDashboardTabKeyDown(e, 'repair-data')}
          className={`px-3.5 h-10 lg:h-10 rounded-xl text-xs font-extrabold transition-all flex items-center space-x-2 shrink-0 cursor-pointer border select-none active:scale-95 ${
            activeDashboardSubTab === 'repair-data'
              ? 'bg-brand text-white border-brand shadow-xs'
              : 'bg-white hover:bg-surface text-faint hover:text-ink border-line'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Hardware Analytics</span>
          <span className={`text-xs font-mono px-2 py-0.5 rounded-full font-bold ${
            activeDashboardSubTab === 'repair-data'
              ? 'bg-brand-deep text-white'
              : 'bg-line text-ink'
          }`}>
            {filteredWorkOrders.length} Tickets
          </span>
        </Button>

        {/* Subtab 3: Technician KPI & Leaderboard (merged) */}
        <Button
          type="button"
          role="tab"
          id="dash-tab-tech-kpi"
          aria-controls="dash-panel-tech-kpi"
          aria-selected={activeDashboardSubTab === 'tech-kpi'}
          onClick={() => setActiveDashboardSubTab('tech-kpi')}
          onKeyDown={(e) => handleDashboardTabKeyDown(e, 'tech-kpi')}
          className={`px-3.5 h-10 lg:h-10 rounded-xl text-xs font-extrabold transition-all flex items-center space-x-2 shrink-0 cursor-pointer border select-none active:scale-95 ${
            activeDashboardSubTab === 'tech-kpi'
              ? 'bg-brand text-white border-brand shadow-xs'
              : 'bg-white hover:bg-surface text-faint hover:text-ink border-line'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Technicians</span>
          <span className={`text-xs font-mono px-2 py-0.5 rounded-full font-bold ${
            activeDashboardSubTab === 'tech-kpi'
              ? 'bg-brand-deep text-white'
              : 'bg-line text-ink'
          }`}>
            {technicians.length} Staff
          </span>
        </Button>

        {/* Subtab 4: Inventory */}
        <Button
          type="button"
          role="tab"
          id="dash-tab-inventory"
          aria-controls="dash-panel-inventory"
          aria-selected={activeDashboardSubTab === 'inventory'}
          onClick={() => setActiveDashboardSubTab('inventory')}
          onKeyDown={(e) => handleDashboardTabKeyDown(e, 'inventory')}
          className={`px-3.5 h-10 lg:h-10 rounded-xl text-xs font-extrabold transition-all flex items-center space-x-2 shrink-0 cursor-pointer border select-none active:scale-95 ${
            activeDashboardSubTab === 'inventory'
              ? 'bg-brand text-white border-brand shadow-xs'
              : 'bg-white hover:bg-surface text-faint hover:text-ink border-line'
          }`}
        >
          <Boxes className="w-4 h-4" />
          <span>Inventory</span>
          {repairLowStockParts.length > 0 ? (
            <span className={`text-xs font-mono px-2 py-0.5 rounded-full font-extrabold ${
              activeDashboardSubTab === 'inventory'
                ? 'bg-brand-deep text-white'
                : 'bg-warning/15 text-warning border border-warning/30'
            }`}>
              {repairLowStockParts.length} Low
            </span>
          ) : (
            <span className={`text-xs font-mono px-2 py-0.5 rounded-full font-bold ${
              activeDashboardSubTab === 'inventory'
                ? 'bg-brand-deep text-white'
                : 'bg-line text-ink'
            }`}>
              {parts.length} Parts
            </span>
          )}
        </Button>

        {/* Subtab 6: Finance */}
        <Button
          type="button"
          role="tab"
          id="dash-tab-finance"
          aria-controls="dash-panel-finance"
          aria-selected={activeDashboardSubTab === 'finance'}
          onClick={() => setActiveDashboardSubTab('finance')}
          onKeyDown={(e) => handleDashboardTabKeyDown(e, 'finance')}
          className={`px-3.5 h-10 lg:h-10 rounded-xl text-xs font-extrabold transition-all flex items-center space-x-2 shrink-0 cursor-pointer border select-none active:scale-95 ${
            activeDashboardSubTab === 'finance'
              ? 'bg-brand text-white border-brand shadow-xs'
              : 'bg-white hover:bg-surface text-faint hover:text-ink border-line'
          }`}
        >
          <Coins className="w-4 h-4" />
          <span>Finance</span>
          <span className={`text-xs font-mono px-2 py-0.5 rounded-full font-bold inline-flex items-center space-x-0.5 ${
            activeDashboardSubTab === 'finance'
              ? marginPercent < 0 ? 'bg-white/25 text-white' : 'bg-white/20 text-white'
              : marginPercent < 0 ? 'bg-danger/15 text-danger' : 'bg-line text-ink'
          }`}>
            {marginPercent < 0 && !(activeDashboardSubTab === 'finance') && <AlertTriangle className="w-2.5 h-2.5 shrink-0" />}
            <span>{marginPercent}% Margin</span>
          </span>
        </Button>

        {/* Subtab 7: Warranty Watch */}
        <Button
          type="button"
          role="tab"
          id="dash-tab-warranty-watch"
          aria-controls="dash-panel-warranty-watch"
          aria-selected={activeDashboardSubTab === 'warranty-watch'}
          onClick={() => setActiveDashboardSubTab('warranty-watch')}
          onKeyDown={(e) => handleDashboardTabKeyDown(e, 'warranty-watch')}
          className={`px-3.5 h-10 lg:h-10 rounded-xl text-xs font-extrabold transition-all flex items-center space-x-2 shrink-0 cursor-pointer border select-none active:scale-95 ${
            activeDashboardSubTab === 'warranty-watch'
              ? 'bg-brand text-white border-brand shadow-xs'
              : 'bg-white hover:bg-surface text-faint hover:text-ink border-line'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Warranty Watch</span>
          {expiringSoonWorkOrders.length > 0 ? (
            <span className={`text-xs font-mono px-2 py-0.5 rounded-full font-bold ${
              activeDashboardSubTab === 'warranty-watch'
                ? 'bg-brand-deep text-white'
                : 'bg-danger/15 text-danger border border-danger/30'
            }`}>
              {expiringSoonWorkOrders.length} Flagged
            </span>
          ) : (
            <span className={`text-xs font-mono px-2 py-0.5 rounded-full font-bold ${
              activeDashboardSubTab === 'warranty-watch'
                ? 'bg-brand-deep text-white'
                : 'bg-line text-ink'
            }`}>
              Clear
            </span>
          )}
        </Button>
      </div>
      {/* Right-edge fade on the scrollable subtab bar (below xl) */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 w-6 rounded-r-xl bg-gradient-to-l from-surface/80 to-transparent xl:hidden" />
      </div>

      {/* Background Warranty Check Alert Banner on Dashboard */}
      {expiringSoonWorkOrders.length > 0 && activeDashboardSubTab !== 'warranty-watch' && (
        <div className="p-4 bg-gradient-to-r from-rose-50 via-amber-50 to-orange-50 border border-danger/30 rounded-2xl shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-start sm:items-center space-x-3">
              <div className="p-2 bg-danger text-white rounded-xl shadow-2xs shrink-0">
                <ShieldAlert className="w-5 h-5 animate-pulse" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center space-x-2">
                  <span className="font-black text-danger text-sm">Background Warranty Monitor Flagged</span>
                  <span className="text-xs font-mono font-bold bg-danger/15 text-danger px-2 py-0.5 rounded-full border border-danger/30">
                    90-Day Standard Window
                  </span>
                </div>
                <p className="text-ink text-xs">
                  <strong className="text-danger font-extrabold">{expiringSoonWorkOrders.length} Work Order(s)</strong> are nearing the end of their 90-day warranty period ({criticalWarrantyCount} critical within 7 days).
                </p>
              </div>
            </div>

            <Button
              type="button"
              onClick={() => setActiveDashboardSubTab('warranty-watch')}
              className="bg-danger hover:bg-danger-deep text-white shrink-0 flex items-center space-x-1.5"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Inspect Flagged Tickets ({expiringSoonWorkOrders.length})</span>
            </Button>
          </div>

          {/* Quick Preview Chips of Top Expiring Tickets */}
          <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar pt-1 border-t border-danger/30">
            <span className="text-xs font-bold text-danger uppercase tracking-wider shrink-0">Expiring Soon:</span>
            {expiringSoonWorkOrders.slice(0, 4).map((item) => (
              <div
                key={item.wo.id}
                onClick={() => setActiveDashboardSubTab('warranty-watch')}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActiveDashboardSubTab('warranty-watch'); }
                }}
                className="bg-white/80 hover:bg-white border border-danger/30 px-2.5 py-1 rounded-lg text-xs flex items-center space-x-2 cursor-pointer shrink-0 shadow-2xs transition-all"
              >
                <span className="font-mono font-bold text-brand">{item.wo.orderNumber}</span>
                <span className="font-bold text-ink">{item.wo.customerName}</span>
                <span className="text-muted">({item.wo.deviceModel})</span>
                <span className={`px-1.5 py-0.2 rounded font-extrabold text-xs ${
                  item.remainingDays <= 3 ? 'bg-danger text-white' : 'bg-warning/15 text-warning'
                }`}>
                  ⏳ {item.remainingDays}d left
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBTAB 1: STATUS QUEUE */}
      {activeDashboardSubTab === 'status-queue' && (
        <div role="tabpanel" id="dash-panel-status-queue" aria-labelledby="dash-tab-status-queue" className="space-y-6">
          {/* Stagnant Bottlenecks Notice */}
          {stagnantWorkOrders.length > 0 && (
            <div className="p-4 bg-warning/10 border border-warning/30 rounded-2xl flex items-center justify-between gap-3 text-xs text-warning shadow-2xs">
              <div className="flex items-center space-x-2.5">
                <AlertTriangle className="w-5 h-5 text-warning shrink-0" />
                <div>
                  <p className="font-bold text-warning">{stagnantWorkOrders.length} Repair Ticket(s) Bottlenecked (&gt;48h in Queue)</p>
                  <p className="text-xs text-warning">Inactive over 48h — reassign or update status.</p>
                </div>
              </div>
              <Button
                type="button"
                onClick={() => onNavigateToTab('pipeline')}
                size="sm"
                className="min-h-10 bg-warning hover:bg-amber-800 text-white shrink-0"
              >
                Inspect Bottlenecks
              </Button>
            </div>
          )}

          {/* Clean Executive Stage Summary Card & Quick Pipeline Jump */}
          <div className="bg-white border border-line rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-line">
              <div className="space-y-0.5">
                <div className="flex items-center space-x-2.5">
                  <ListFilter className="w-4 h-4 text-brand" />
                  <h2 className="text-sm font-extrabold text-ink truncate">
                    <span className="hidden sm:inline">Status Queue & Stage Distribution</span>
                    <span className="sm:hidden">Stage Distribution</span>
                  </h2>
                  <span className="px-2.5 py-0.5 bg-brand/10 text-brand-deep rounded-full text-xs font-mono font-bold whitespace-nowrap">
                    {filteredWorkOrders.length} <span className="hidden md:inline">Total Work Orders</span><span className="md:hidden">Orders</span>
                  </span>
                </div>
                <p className="text-xs text-muted">Stage tracking, bottlenecks, active repairs</p>
              </div>

              <div className="flex items-center space-x-2">
                <Button
                  type="button"
                  onClick={() => onNavigateToTab('pipeline')}
                  className="min-h-10 bg-brand hover:bg-brand/90 text-white flex items-center space-x-2"
                >
                  <Kanban className="w-4 h-4" />
                  <span className="hidden sm:inline">Open Interactive Pipeline</span>
                  <span className="sm:hidden">Open Pipeline</span>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Visual Stage Progress Bars Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 3xl:grid-cols-6 4xl:grid-cols-8 gap-4 pt-1">
              {[
                { stage: 'Receive', title: 'Intake / Receive', count: statusQueueCounts['Receive'], color: 'bg-brand-soft0', bg: 'bg-brand-soft', text: 'text-brand' },
                { stage: 'In Progress', title: 'In Progress (Active)', count: statusQueueCounts['In Progress'], color: 'bg-success/100', bg: 'bg-success/10', text: 'text-success-deep' },
                { stage: 'Pending', title: 'Pending Approval / Parts', count: statusQueueCounts['Pending'], color: 'bg-warning/100', bg: 'bg-warning/10', text: 'text-warning' },
                { stage: 'Finished', title: 'Finished / Ready for Pickup', count: statusQueueCounts['Finished'], color: 'bg-teal/100', bg: 'bg-teal/10', text: 'text-teal-700' },
              ].map((item) => {
                const total = filteredWorkOrders.length || 1;
                const pct = Math.round((item.count / total) * 100);
                return (
                  <div key={item.stage} className={`p-4 rounded-xl border border-line/80 ${item.bg} space-y-2`}>
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold ${item.text}`}>{item.title}</span>
                      <span className="font-mono text-xs font-black text-slate-800">{item.count} <span className="hidden xl:inline">tickets</span></span>
                    </div>
                    <div className="w-full h-2.5 bg-line rounded-full overflow-hidden">
                      <div className={`h-full ${item.color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                    </div>
                    <div className="flex justify-between items-center text-xs text-muted">
                      <span>{pct}% of active queue</span>
                      <Button
  variant="link"
  
                        onClick={() => {
                          setStatusQueueFilter(item.stage);
                        }}
                        className="min-h-10 flex items-center space-x-0.5"
                      >
                        <span>Filter Queue Below</span>
                        <ChevronRight className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>          {/* Live Work Order Status Analytics Queue Roster Table */}
          <div className="bg-white border border-line rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-line">
              <div className="space-y-0.5">
                <div className="flex items-center space-x-2">
                  <ClipboardList className="w-4 h-4 text-brand" />
                  <h3 className="text-sm font-extrabold text-ink truncate">
                    <span className="hidden md:inline">Live Work Order Status Analytics Queue Roster</span>
                    <span className="md:hidden">Queue Roster</span>
                  </h3>
                  <span className="px-2.5 py-0.5 bg-brand/10 text-brand-deep rounded-full text-xs font-mono font-bold whitespace-nowrap">
                    {statusQueueWorkOrders.length} <span className="hidden md:inline">{statusQueueWorkOrders.length === 1 ? 'Ticket' : 'Tickets'}</span>
                  </span>
                  {statusQueueFilter !== 'ALL' && (
                    <span className="px-2.5 py-0.5 bg-indigo-100 text-indigo-800 rounded-full text-xs font-mono font-bold">
                      {statusQueueFilter === 'PIPELINE' ? 'Pipeline Data Only' : `Stage: ${statusQueueFilter}`}
                    </span>
                  )}
                </div>
                <p className="hidden sm:block text-xs text-muted">Analytic roster filtered by stage, tech, priority</p>
              </div>
            </div>

            {/* Queue Search & Quick Filter Controls */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-surface p-3 rounded-xl border border-line">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <Input
                  type="text"
                  value={queueSearchQuery}
                  onChange={(e) => setQueueSearchQuery(e.target.value)}
                  placeholder="Search analytics queue by order #, customer, model, serial..."
                  className="w-full h-10 bg-white text-sm text-ink placeholder-muted pl-8 pr-7 rounded-xl border border-line focus:outline-none focus:border-brand transition-all"
                />
                {queueSearchQuery && (
                  <Button
  variant="ghost" size="iconSm"
  
                    type="button"
                    onClick={() => setQueueSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted hover:text-ink"
                  >
                    ×
                  </Button>
                )}
              </div>

              <div className="flex items-center space-x-2 flex-wrap">
                {/* Tech Filter Select */}
                <select
                  aria-label="Filter by technician"
                  value={queueTechFilter}
                  onChange={(e) => setQueueTechFilter(e.target.value)}
                  className="min-h-10 bg-white text-xs text-ink font-semibold px-2.5 py-1.5 rounded-lg border border-line focus:outline-none focus:border-brand"
                >
                  <option value="ALL">All Technicians</option>
                  <option value="unassigned">Unassigned</option>
                  {technicians.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>

                {/* Priority Filter Select */}
                <select
                  aria-label="Filter by priority"
                  value={queuePriorityFilter}
                  onChange={(e) => setQueuePriorityFilter(e.target.value)}
                  className="min-h-10 bg-white text-xs text-ink font-semibold py-1.5 px-2.5 rounded-lg border border-line focus:outline-none focus:border-brand"
                >
                  <option value="ALL">All Priorities</option>
                  <option value="Urgent">Urgent</option>
                  <option value="B2B Priority">B2B Priority</option>
                  <option value="Normal">Normal</option>
                  <option value="Warranty Redo">Warranty Redo</option>
                </select>

                {(statusQueueFilter !== 'ALL' || queueTechFilter !== 'ALL' || queuePriorityFilter !== 'ALL' || queueSearchQuery) && (
                  <Button
                    type="button"
                    onClick={() => {
                      setStatusQueueFilter('ALL');
                      setQueueTechFilter('ALL');
                      setQueuePriorityFilter('ALL');
                      setQueueSearchQuery('');
                    }}
                    className="min-h-10 bg-line hover:bg-line text-muted text-xs font-bold rounded-lg transition-all cursor-pointer shrink-0 px-2.5"
                  >
                    Reset Filters
                  </Button>
                )}
              </div>
            </div>

            {/* Work Orders Queue Table */}
            {statusQueueWorkOrders.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted space-y-2 bg-surface rounded-xl border border-dashed border-line-strong">
                <Inbox className="w-8 h-8 text-muted mx-auto opacity-60" />
                <p className="font-extrabold text-sm text-ink">No Work Orders in Queue Matching Selection</p>
                <p className="text-xs">
                  {statusQueueFilter !== 'ALL'
                    ? `There are currently no tickets matching stage filter "${statusQueueFilter}".`
                    : 'Try adjusting your search query or reset status filters.'}
                </p>
                <div className="pt-2 flex items-center justify-center space-x-2">
                  {statusQueueFilter !== 'ALL' && (
                    <Button
  variant="default" size="sm"
  
                      type="button"
                      onClick={() => setStatusQueueFilter('ALL')}
                      className="px-3 py-1.5 bg-brand text-white text-xs font-bold rounded-lg hover:bg-brand-deep transition-all cursor-pointer"
                    >
                      Show All Stages
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="relative">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 z-10">
                    <tr className="border-b border-line text-muted font-bold text-xs uppercase tracking-wider bg-surface">
                      <th className="py-2.5 px-3">Ticket # & Date</th>
                      <th className="py-2.5 px-3">Customer & Contact</th>
                      <th className="py-2.5 px-3">Device & Serial/IMEI</th>
                      <th className="py-2.5 px-3 hidden lg:table-cell">Symptoms / Service</th>
                      <th className="py-2.5 px-3 hidden lg:table-cell">Assigned Tech</th>
                      <th className="py-2.5 px-3 hidden xl:table-cell">Priority</th>
                      <th className="py-2.5 px-3">Stage & Status</th>
                      <th className="py-2.5 px-3">Amount</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {statusQueueWorkOrders.map((wo) => {
                      const createdDate = timeAgoShort(wo.createdAt);
                      const createdDateFull = new Date(wo.createdAt || Date.now()).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      });
                      const totalAmt = wo.totalAmount || wo.subtotal || 0;

                      return (
                        <tr key={wo.id} className="hover:bg-surface transition-colors">
                          {/* Ticket # & Date */}
                          <td className="py-3 px-3">
                            <p className="font-mono font-black text-brand text-xs">{wo.orderNumber || wo.id}</p>
                            <span className="text-xs text-muted" title={createdDateFull}>{createdDate}</span>
                          </td>

                          {/* Customer */}
                          <td className="py-3 px-3">
                            <p className="font-bold text-ink truncate max-w-[140px]">{wo.customerName}</p>
                            <p className="text-xs text-muted font-mono">{wo.customerPhone}</p>
                          </td>

                          {/* Device & Serial */}
                          <td className="py-3 px-3">
                            <p className="font-semibold text-ink truncate max-w-[150px]">{wo.deviceModel}</p>
                            <p className="text-xs font-mono text-muted truncate max-w-[150px]">
                              {wo.serialNumber || wo.imei ? `SN: ${wo.serialNumber || wo.imei}` : 'No Serial'}
                            </p>
                          </td>

                          {/* Symptoms / Service */}
                          <td className="py-3 px-3 hidden lg:table-cell">
                            <p className="text-xs text-ink line-clamp-1 max-w-[180px]" title={wo.symptomsReported || wo.serviceType}>
                              {wo.symptomsReported || wo.serviceType || 'General Repair'}
                            </p>
                          </td>

                          {/* Assigned Tech */}
                          <td className="py-3 px-3 hidden lg:table-cell">
                            <div className="flex items-center space-x-1.5">
                              <div className="w-5 h-5 rounded-full bg-line text-muted font-bold text-xs flex items-center justify-center shrink-0">
                                {(wo.assignedTechName || 'U').charAt(0)}
                              </div>
                              <span className="text-xs text-ink font-medium truncate max-w-[100px]">
                                {wo.assignedTechName || 'Unassigned'}
                              </span>
                            </div>
                          </td>

                          {/* Priority */}
                          <td className="py-3 px-3 hidden xl:table-cell">
                            <PriorityBadge priority={wo.priority} />
                          </td>

                          {/* Stage & Status (Read-Only Badge) */}
                          <td className="py-3 px-3">
                            <StatusBadge status={wo.status} />
                          </td>

                          {/* Financial Amount */}
                          <td className="py-3 px-3">
                            <p className="font-mono font-extrabold text-xs text-ink">
                              {totalAmt.toLocaleString()} MMK
                            </p>
                            <span className={`text-xs font-bold px-1.5 py-0.2 rounded ${
                              wo.isPaid ? 'bg-success/15 text-success-deep' : 'bg-danger/15 text-danger'
                            }`}>
                              {wo.isPaid ? 'Paid' : 'Unpaid'}
                            </span>
                          </td>

                          {/* Ticket status inspector and label export */}
                          <td className="py-3 px-3 text-right">
                            <div className="inline-flex items-center justify-end gap-1.5">
                              <Button
  variant="secondary" size="sm"
  
                                type="button"
                                onClick={() => setRosterTicket(wo)}
                                className="border border-line bg-brand-soft px-2.5 text-brand hover:bg-white"
                                title="View Ticket Status"
                                aria-label={`View status for ${wo.orderNumber || wo.id}`}
                              >
                                <Eye className="h-3.5 w-3.5" />
                                <span>View</span>
                              </Button>
                              {onSelectPrintTag && (
                              <Button
  variant="secondary" size="sm"
  
                                type="button"
                                onClick={() => onSelectPrintTag(wo)}
                                className="px-2.5 hover:bg-line border border-line"
                                title="Print Device Label Tag"
                              >
                                <Printer className="w-3.5 h-3.5 text-brand" />
                                <span>Tag</span>
                              </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {/* Right-edge fade on scrollable roster (below xl) */}
              <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 w-6 rounded-r-xl bg-gradient-to-l from-surface/80 to-transparent xl:hidden" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUBTAB 2: REPAIR DATA */}
      {activeDashboardSubTab === 'repair-data' && (
        <div role="tabpanel" id="dash-panel-repair-data" aria-labelledby="dash-tab-repair-data" className="space-y-6">
          {/* Top Repair Devices */}
          <div className="bg-white border border-line rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-line">
              <div className="space-y-0.5">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-purple/10 text-purple rounded-xl border border-purple/20">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-extrabold text-ink">Top Repair Devices</h3>
                </div>
                <p className="text-xs text-muted">Most-repaired device models ranked by ticket volume</p>
              </div>
              <span className="text-xs font-extrabold bg-brand-soft text-brand px-3.5 py-1.5 rounded-full border border-brand/20 flex items-center space-x-1.5 shrink-0">
                <Smartphone className="w-4 h-4" />
                <span>{topRepairDevices.length} Models · {filteredWorkOrders.length} Tickets</span>
              </span>
            </div>

            <div className="space-y-2.5">
              {topRepairDevices.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted bg-surface rounded-xl border border-dashed border-line-strong">
                  No repair tickets in the selected date range.
                </div>
              ) : (
                topRepairDevices.map((dev, idx) => {
                  const maxCount = topRepairDevices[0]?.count || 1;
                  const barPct = Math.max(8, Math.round((dev.count / maxCount) * 100));
                  const medal = idx === 0 ? 'bg-warning/20 text-warning border-warning/50' : idx === 1 ? 'bg-surface text-muted border-line' : idx === 2 ? 'bg-warning/10 text-warning border-orange-200' : 'bg-surface text-muted border-line';
                  return (
                    <div key={dev.name} className="p-3 bg-surface border border-line rounded-xl space-y-2">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <div className="flex items-center space-x-2 min-w-0">
                          <span className={`w-6 h-6 rounded-full border flex items-center justify-center font-black text-xs shrink-0 ${medal}`}>
                            {idx + 1}
                          </span>
                          <span className="font-extrabold text-ink truncate">{dev.name}</span>
                        </div>
                        <div className="flex items-center space-x-3 shrink-0">
                          <span className="font-mono font-bold text-ink">{dev.count} Repairs</span>
                          <span className="font-mono font-bold text-brand">{dev.revenue.toLocaleString()} MMK</span>
                        </div>
                      </div>
                      <div className="w-full bg-line rounded-full h-2 overflow-hidden">
                        <div className="h-full rounded-full bg-purple" style={{ width: `${barPct}%` }} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Top Repair Categories with Income */}
          <div className="bg-white border border-line rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-line">
              <div className="space-y-0.5">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-brand/10 text-brand-deep rounded-xl border border-brand/20">
                    <BarChart3 className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-extrabold text-ink truncate">
                    <span className="hidden sm:inline">Top Repair Categories with Income</span>
                    <span className="sm:hidden">Top Categories (Income)</span>
                  </h3>
                </div>
                <p className="text-xs text-muted">Repair category breakdown by tickets and revenue</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {topRepairCategories.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted bg-surface rounded-xl border border-dashed border-line-strong md:col-span-2">
                  No repair tickets in the selected date range.
                </div>
              ) : (
                topRepairCategories.map((cat) => {
                  const IconComp = cat.icon;
                  const maxRevenue = topRepairCategories[0]?.revenue || 1;
                  const barPct = Math.max(8, Math.round((cat.revenue / maxRevenue) * 100));
                  return (
                    <div key={cat.id} className="p-3.5 bg-surface border border-line rounded-xl space-y-2.5">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-2">
                          <div className={`p-1.5 rounded-md ${cat.bgLight} ${cat.textCol}`}>
                            <IconComp className="w-3.5 h-3.5" />
                          </div>
                          <span className="font-extrabold text-ink">{cat.label}</span>
                        </div>
                        <span className="text-xs font-bold text-muted bg-white border border-line px-2 py-0.5 rounded-full">{cat.count} Tickets</span>
                      </div>
                      <div className="flex items-baseline justify-between">
                        <span className="font-mono font-black text-lg text-ink">{cat.revenue.toLocaleString()} MMK</span>
                        <span className={`font-bold text-xs ${cat.textCol}`}>{cat.percentage}% of income</span>
                      </div>
                      <div className="w-full bg-line rounded-full h-2 overflow-hidden">
                        <div className={`h-full rounded-full ${cat.color}`} style={{ width: `${barPct}%` }} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 3: ASSIGN TECHNICIAN KPI */}
      {activeDashboardSubTab === 'tech-kpi' && (
        <div role="tabpanel" id="dash-panel-tech-kpi" aria-labelledby="dash-tab-tech-kpi" className="space-y-6">
          {/* Queue imbalance suggestion — unique decision-support, kept at top */}
          {isQueueImbalanced && maxLoadTechs.length > 0 && minLoadTechs.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-warning/10 border border-warning/30 rounded-xl text-xs">
              <span className="font-bold text-warning flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-warning shrink-0" />
                Queue imbalanced — reassign 1–2 tickets from {maxLoadTechs.map((t) => t.tech.name).join(' / ')} ({maxTechLoad}) to {minLoadTechs.map((t) => t.tech.name).join(' / ')} ({minTechLoad})
              </span>
              <span className="text-warning/80 text-xs font-semibold shrink-0">Load gap: {maxTechLoad - minTechLoad} tickets</span>
            </div>
          )}

          {/* Full Technician Performance Tab Component */}
          <TechnicianPerformanceTab
            technicians={technicians}
            workOrders={filteredWorkOrders}
            onNavigateToTab={onNavigateToTab}
            onOpenTechDetail={(tech) => setDetailTechId(tech.id)}
          />

          {/* Technician Leaderboard (merged into this tab) */}
          <TechnicianLeaderboardView
            technicians={technicians}
            workOrders={filteredWorkOrders}
            onNavigateToTab={onNavigateToTab}
            onOpenTechDetail={(tech) => setDetailTechId(tech.id)}
            periodLabel={trendSeries.windowLabel}
          />
        </div>
      )}

      {/* SUBTAB 4: INVENTORY */}
      {activeDashboardSubTab === 'inventory' && (
        <div role="tabpanel" id="dash-panel-inventory" aria-labelledby="dash-tab-inventory" className="space-y-6">
          {/* Inventory Valuation & Parts Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-line rounded-2xl p-4 shadow-2xs space-y-1">
              <span className="text-xs font-bold text-muted uppercase">Total Parts Valuation</span>
              <p className="text-xl font-extrabold text-ink">{inventoryAnalytics.totalValuation.toLocaleString()} MMK</p>
              <p className="text-xs text-success font-semibold">{inventoryAnalytics.totalItems} Total Replacement Items</p>
            </div>

            <div className="bg-white border border-line rounded-2xl p-4 shadow-2xs space-y-1">
              <span className="text-xs font-bold text-muted uppercase">Low Stock Repair Items</span>
              <p className="text-xl font-extrabold text-warning">{repairLowStockParts.length} Repair Parts</p>
              <p className="text-xs text-warning font-semibold">Below reorder threshold</p>
            </div>

            <div className="bg-white border border-line rounded-2xl p-4 shadow-2xs space-y-1">
              <span className="text-xs font-bold text-muted uppercase">Pending Vendor RMAs</span>
              <p className="text-xl font-extrabold text-purple">{pendingRmas.length} Defective Returns</p>
              <p className="text-xs text-purple font-semibold">Awaiting supplier credits</p>
            </div>
          </div>

          {/* Low Stock Repair Triggers Card */}
          <div className="bg-white border border-line rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div>
                <h3 className="text-sm font-bold text-ink flex items-center space-x-2 truncate">
                  <AlertTriangle className="w-4 h-4 text-warning shrink-0" />
                  <span className="hidden sm:inline">Low Stock Repair Component Auto Triggers</span>
                  <span className="sm:hidden">Low Stock Alerts</span>
                </h3>
                <p className="text-xs text-muted">Replacement screens, batteries, and logic board ICs needing reorder</p>
              </div>

              <Button
                type="button"
                onClick={() => onNavigateToTab('inventory')}
                size="sm"
                className="bg-brand hover:bg-brand-deep text-white"
              >
                Open Parts Inventory
              </Button>
            </div>

            {/* Preview note — full module has stock/profit/matrix views */}
            <p className="text-xs text-muted -mt-1">Quick stock/profit glance — full views in Inventory.</p>

            {repairLowStockParts.length === 0 ? (
              <div className="p-8 text-center text-xs text-success bg-success/10 border border-success/20 rounded-xl space-y-1">
                <CheckCircle2 className="w-6 h-6 mx-auto" />
                <p className="font-extrabold text-sm text-ink">All Repair Components In Stock</p>
                <p className="text-muted">No parts currently low on stock.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {repairLowStockParts.map((part) => (
                  <div key={part.id} className="p-3.5 bg-warning/10 border border-warning/30 rounded-xl space-y-2 shadow-2xs">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-extrabold text-xs text-ink">{part.name}</p>
                        <p className="text-xs text-muted">{part.category} · {part.qualityTier}</p>
                      </div>
                      <span className="text-xs font-extrabold text-warning bg-warning/15 px-2 py-0.5 rounded-lg border border-warning/30 shrink-0">
                        {part.quantityInStock} Left
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs border-t border-warning/20 pt-2 text-muted">
                      <span>Supplier: <strong className="text-ink">{part.supplierName}</strong></span>
                      <span className="font-mono font-bold text-brand">{part.costPrice.toLocaleString()} MMK Cost</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUBTAB 5: FINANCE */}
      {activeDashboardSubTab === 'finance' && (
        <div role="tabpanel" id="dash-panel-finance" aria-labelledby="dash-tab-finance" className="space-y-6">
          {/* Financial Performance KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-line rounded-2xl p-4 shadow-2xs space-y-1">
              <span className="text-xs font-bold text-muted uppercase">Total Revenue</span>
              <p className="text-2xl font-extrabold text-ink">{totalRevenue.toLocaleString()} MMK</p>
              <p className={`text-xs font-semibold flex items-center space-x-1 ${marginPercent < 0 ? 'text-danger' : 'text-success-deep'}`}>
                {marginPercent < 0 && <AlertTriangle className="w-3 h-3 shrink-0" />}
                <span>{marginPercent}% Gross Profit Margin</span>
              </p>
            </div>

            <div className="bg-white border border-line rounded-2xl p-4 shadow-2xs space-y-1">
              <span className="text-xs font-bold text-muted uppercase">Gross Profit (Margin)</span>
              <p className="text-2xl font-extrabold text-success">{totalMargin.toLocaleString()} MMK</p>
              <p className="text-xs text-muted">Revenue minus parts cost</p>
            </div>

            <div className="bg-white border border-line rounded-2xl p-4 shadow-2xs space-y-1">
              <span className="text-xs font-bold text-muted uppercase">Total Collected (Paid)</span>
              <p className="text-2xl font-extrabold text-brand">{financialAnalytics.totalCollected.toLocaleString()} MMK</p>
              <p className="text-xs text-brand font-semibold">{financialAnalytics.paidCount} Tickets Fully Settled</p>
            </div>

            <div className="bg-white border border-line rounded-2xl p-4 shadow-2xs space-y-1">
              <span className="text-xs font-bold text-muted uppercase">Unpaid Pending Balance</span>
              <p className="text-2xl font-extrabold text-danger">{financialAnalytics.totalUnpaidBalance.toLocaleString()} MMK</p>
              <p className="text-xs text-danger font-semibold">{financialAnalytics.unpaidCount} Tickets Outstanding</p>
            </div>
          </div>

          {/* Revenue & Repairs Trend — with previous-period comparison */}
          <div className="bg-white border border-line rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-line">
              <div className="space-y-0.5">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-brand/10 text-brand-deep rounded-xl border border-brand/20">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-extrabold text-ink">Revenue & Repairs Trend</h3>
                </div>
                <p className="text-xs text-muted">{trendSeries.windowLabel} · {trendSeries.bucketDays === 7 ? 'weekly' : 'daily'} buckets · completed tickets only</p>
              </div>
              <div className="flex items-center space-x-2 flex-wrap gap-y-1.5">
                {trendSeries.revenueDeltaPct !== null && (
                  <span className={`px-2.5 py-1 rounded-full border flex items-center space-x-1 text-xs font-extrabold ${trendSeries.revenueDeltaPct >= 0 ? 'bg-success/10 text-success-deep border-success/30' : 'bg-danger/10 text-danger border-danger/30'}`}>
                    <ArrowUpRight className={`w-3 h-3 ${trendSeries.revenueDeltaPct >= 0 ? '' : 'rotate-90'}`} />
                    <span>Revenue {trendSeries.revenueDeltaPct >= 0 ? '+' : ''}{trendSeries.revenueDeltaPct}% vs prev period</span>
                  </span>
                )}
                {trendSeries.repairsDeltaPct !== null && (
                  <span className={`px-2.5 py-1 rounded-full border flex items-center space-x-1 text-xs font-extrabold ${trendSeries.repairsDeltaPct >= 0 ? 'bg-success/10 text-success-deep border-success/30' : 'bg-danger/10 text-danger border-danger/30'}`}>
                    <ArrowUpRight className={`w-3 h-3 ${trendSeries.repairsDeltaPct >= 0 ? '' : 'rotate-90'}`} />
                    <span>Repairs {trendSeries.repairsDeltaPct >= 0 ? '+' : ''}{trendSeries.repairsDeltaPct}% vs prev period</span>
                  </span>
                )}
                {trendSeries.revenueDeltaPct === null && (
                  <span className="px-2.5 py-1 rounded-full border border-line bg-surface text-muted text-xs font-bold">No previous-period data</span>
                )}
              </div>
            </div>

            {trendSeries.curRev === 0 && trendSeries.curRep === 0 ? (
              <div className="p-8 text-center text-xs text-muted bg-surface rounded-xl border border-dashed border-line-strong space-y-1">
                <TrendingUp className="w-6 h-6 mx-auto opacity-50" />
                <p className="font-extrabold text-sm text-ink">No completed repairs in this period</p>
                <p className="text-xs">Completed (Finished / Taken Out) tickets will appear here.</p>
              </div>
            ) : (
              <TrendChart
                buckets={trendSeries.buckets}
                revenue={trendSeries.currentRevenue}
                repairs={trendSeries.currentRepairs}
                maxRevenue={trendSeries.maxRevenue}
                maxRepairs={trendSeries.maxRepairs}
              />
            )}
          </div>

          {/* Revenue Breakdown by Service & Ticket Value */}
          <div className="bg-white border border-line rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div>
                <h3 className="text-sm font-extrabold text-ink flex items-center space-x-2 truncate">
                  <Coins className="w-4 h-4 text-success shrink-0" />
                  <span className="hidden sm:inline">Financial Revenue Intelligence</span>
                  <span className="sm:hidden">Financial Insights</span>
                </h3>
                <p className="text-xs text-muted">Average ticket value and margin metrics</p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  type="button"
                  onClick={() => onNavigateToTab('finance')}
                  size="sm"
                  className="bg-brand hover:bg-brand-deep text-white"
                >
                  Open Shop Finance
                </Button>
                <Button
                  type="button"
                  onClick={() => onNavigateToTab('pos')}
                  variant="secondary"
                  size="sm"
                >
                  POS Register
                </Button>
              </div>
            </div>

            {/* Preview note — full module has revenue/opex/commissions/parts asset */}
            <p className="text-xs text-muted -mt-2">
              Quick glance — full revenue, expenses, commissions & inventory fund details live in Shop Finance.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-surface border border-line rounded-xl space-y-1">
                <p className="text-xs font-bold text-muted uppercase">Average Ticket Value (ATV)</p>
                <p className="text-2xl font-extrabold text-ink">{avgTicketValue.toLocaleString()} MMK</p>
                <p className="text-xs text-muted">Per repair work order</p>
              </div>

              <div className="p-4 bg-surface border border-line rounded-xl space-y-1">
                <p className="text-xs font-bold text-muted uppercase">Total Parts Cost</p>
                <p className="text-2xl font-extrabold text-ink">{totalPartsCost.toLocaleString()} MMK</p>
                <p className="text-xs text-muted">Direct hardware component cost</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 6: WARRANTY WATCH (BACKGROUND MONITOR) */}
      {activeDashboardSubTab === 'warranty-watch' && (
        <div role="tabpanel" id="dash-panel-warranty-watch" aria-labelledby="dash-tab-warranty-watch" className="space-y-6">
          {/* Header & Live Scanner Banner */}
          <div className="p-5 bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 text-white rounded-2xl shadow-md space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 bg-danger text-white rounded-xl shadow-xs">
                    <ShieldAlert className="w-5 h-5 animate-pulse" />
                  </div>
                  <h2 className="text-lg font-black tracking-tight text-white flex items-center space-x-2">
                    <span>90-Day Warranty Background Telemetry</span>
                  </h2>
                  <span className="px-2.5 py-0.5 bg-success/100/20 text-emerald-300 border border-emerald-500/30 font-mono text-xs font-bold rounded-full flex items-center space-x-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block mr-1" />
                    <span>Background Scanner Active</span>
                  </span>
                </div>
                <p className="text-xs text-slate-300">Flags tickets within 14 days of 90-day warranty expiry.</p>
              </div>

              <div className="flex items-center space-x-2">
                <div
                  className="px-3.5 py-2 bg-white/10 text-white font-extrabold text-xs rounded-xl border border-white/20 flex items-center space-x-1.5"
                  title="Warranty data recomputes live from ticket data — no manual scan needed"
                >
                  <RefreshCw className="w-3.5 h-3.5 animate-spin [animation-duration:4s]" />
                  <span>Live monitor · {warrantyCheckData.length} tickets</span>
                </div>
              </div>
            </div>

            {/* 5 Telemetry Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 pt-2 border-t border-white/10 text-xs">
              <div className="p-3 bg-white/10 rounded-xl border border-white/10 space-y-0.5">
                <span className="text-xs text-slate-300 font-bold uppercase">Scanned Tickets</span>
                <p className="text-xl font-black text-white">{warrantyCheckData.length}</p>
                <p className="text-xs text-muted">Total with warranty</p>
              </div>

              <div className="p-3 bg-danger/100/20 border border-rose-500/40 rounded-xl space-y-0.5">
                <span className="text-xs text-rose-200 font-bold uppercase">Nearing Expiry (&le;14d)</span>
                <p className="text-xl font-black text-rose-300">{expiringSoonWorkOrders.length}</p>
                <p className="text-xs text-rose-200">Flagged by monitor</p>
              </div>

              <div className="p-3 bg-danger/30 border border-rose-500/50 rounded-xl space-y-0.5">
                <span className="text-xs text-rose-200 font-bold uppercase">Critical Window (&le;7d)</span>
                <p className="text-xl font-black text-rose-200">{criticalWarrantyCount}</p>
                <p className="text-xs text-rose-300">Requires attention</p>
              </div>

              <div className="p-3 bg-warning/100/20 border border-amber-500/40 rounded-xl space-y-0.5">
                <span className="text-xs text-amber-200 font-bold uppercase">Warning Window (8-14d)</span>
                <p className="text-xl font-black text-amber-300">{warningWarrantyCount}</p>
                <p className="text-xs text-amber-200">Nearing end period</p>
              </div>

              <div className="p-3 bg-success/100/20 border border-emerald-500/40 rounded-xl space-y-0.5 col-span-2 lg:col-span-1">
                <span className="text-xs text-emerald-200 font-bold uppercase">Active & Protected</span>
                <p className="text-xl font-black text-emerald-300">{activeWarrantyCount}</p>
                <p className="text-xs text-emerald-200">&gt;14 days remaining</p>
              </div>
            </div>
          </div>

          {/* Warranty Watch Roster Table Card */}
          <div className="bg-white border border-line rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-line">
              {/* Search input */}
              <div className="relative w-full md:w-80">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <Input
                  type="text"
                  value={warrantySearchQuery}
                  onChange={(e) => setWarrantySearchQuery(e.target.value)}
                  placeholder="Search ticket #, customer, device, serial..."
                  className="w-full bg-surface text-xs text-ink placeholder-muted pl-8 pr-8 py-1.5 rounded-xl border border-line focus:bg-white focus:outline-none focus:border-brand transition-all"
                />
                {warrantySearchQuery && (
                  <Button
  variant="ghost" size="iconSm"
  
                    type="button"
                    onClick={() => setWarrantySearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted hover:text-ink"
                  >
                    ×
                  </Button>
                )}
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center space-x-1 bg-surface p-1 rounded-xl border border-line overflow-x-auto no-scrollbar">
                <Button
  variant="ghost" size="sm"
  
                  type="button"
                  onClick={() => setWarrantyFilterTab('ALL_EXPIRING')}
                  className="px-3 py-1 shrink-0"
                >
                  Flagged Expiration ({expiringSoonWorkOrders.length})
                </Button>
                <Button
  variant="ghost" size="sm"
  
                  type="button"
                  onClick={() => setWarrantyFilterTab('CRITICAL')}
                  className="px-3 py-1 shrink-0"
                >
                  Critical &le;7d ({criticalWarrantyCount})
                </Button>
                <Button
  variant="ghost" size="sm"
  
                  type="button"
                  onClick={() => setWarrantyFilterTab('WARNING')}
                  className="px-3 py-1 shrink-0"
                >
                  Warning 8-14d ({warningWarrantyCount})
                </Button>
                <Button
  variant="ghost" size="sm"
  
                  type="button"
                  onClick={() => setWarrantyFilterTab('EXPIRED')}
                  className="px-3 py-1 shrink-0"
                >
                  Expired ({expiredWarrantyCount})
                </Button>
                <Button
  variant="ghost" size="sm"
  
                  type="button"
                  onClick={() => setWarrantyFilterTab('ALL')}
                  className="px-3 py-1 shrink-0"
                >
                  All Tickets ({warrantyCheckData.length})
                </Button>
              </div>
            </div>

            {/* Rendered Table */}
            {(() => {
              let displayList = warrantyCheckData;
              if (warrantyFilterTab === 'ALL_EXPIRING') {
                displayList = warrantyCheckData.filter((i) => i.isExpiringSoon);
              } else if (warrantyFilterTab === 'CRITICAL') {
                displayList = warrantyCheckData.filter((i) => i.isCritical);
              } else if (warrantyFilterTab === 'WARNING') {
                displayList = warrantyCheckData.filter((i) => i.isWarning);
              } else if (warrantyFilterTab === 'EXPIRED') {
                displayList = warrantyCheckData.filter((i) => i.isExpired);
              }

              if (warrantySearchQuery.trim()) {
                const q = warrantySearchQuery.toLowerCase();
                displayList = displayList.filter(
                  (i) =>
                    i.wo.orderNumber.toLowerCase().includes(q) ||
                    i.wo.customerName.toLowerCase().includes(q) ||
                    i.wo.deviceModel.toLowerCase().includes(q) ||
                    (i.wo.serialNumber && i.wo.serialNumber.toLowerCase().includes(q))
                );
              }

              displayList.sort((a, b) => a.remainingDays - b.remainingDays);

              if (displayList.length === 0) {
                return (
                  <div className="p-10 text-center text-xs text-muted space-y-2 bg-surface rounded-xl border border-dashed border-line-strong">
                    <ShieldCheck className="w-10 h-10 text-success mx-auto opacity-70" />
                    <p className="font-extrabold text-sm text-ink">No Work Orders Matching Warranty Criteria</p>
                    <p className="text-xs">
                      {warrantyFilterTab === 'ALL_EXPIRING'
                        ? 'No active work orders are currently nearing the end of their 90-day warranty window!'
                        : 'Try adjusting search keywords or selecting a different warranty filter tab.'}
                    </p>
                  </div>
                );
              }

              return (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-line text-muted font-bold text-xs uppercase tracking-wider">
                        <th className="py-2.5 px-3">Ticket #</th>
                        <th className="py-2.5 px-3">Customer & Contact</th>
                        <th className="py-2.5 px-3">Device & Serial</th>
                        <th className="py-2.5 px-3 hidden md:table-cell">Warranty Dates</th>
                        <th className="py-2.5 px-3">90-Day Elapsed</th>
                        <th className="py-2.5 px-3">Warranty Health Status</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {displayList.map((item) => {
                        const isCopied = copiedNoticeId === item.wo.id;
                        return (
                          <tr key={item.wo.id} className={`hover:bg-surface transition-colors ${item.isCritical ? 'bg-danger/10' : ''}`}>
                            <td className="py-3 px-3">
                              <p className="font-mono font-bold text-brand">{item.wo.orderNumber}</p>
                              <span className="text-xs text-muted">{item.wo.status}</span>
                            </td>

                            <td className="py-3 px-3">
                              <p className="font-bold text-ink">{item.wo.customerName}</p>
                              <p className="text-xs text-muted">{item.wo.customerPhone}</p>
                            </td>

                            <td className="py-3 px-3">
                              <p className="font-semibold text-ink">{item.wo.deviceModel}</p>
                              <p className="text-xs font-mono text-muted">SN: {item.wo.serialNumber || 'N/A'}</p>
                            </td>

                            <td className="py-3 px-3 text-xs hidden md:table-cell">
                              <p className="text-muted">Start: <strong className="text-ink">{item.startDateFormatted}</strong></p>
                              <p className="text-muted">Expires: <strong className="text-danger">{item.expiryDateFormatted}</strong></p>
                            </td>

                            <td className="py-3 px-3 w-36">
                              <div className="space-y-1">
                                <div className="flex justify-between text-xs text-muted">
                                  <span>{item.daysElapsed} days</span>
                                  <span>{item.percentElapsed}%</span>
                                </div>
                                <div className="w-full bg-line rounded-full h-1.5 overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${
                                      item.remainingDays <= 3
                                        ? 'bg-danger'
                                        : item.remainingDays <= 14
                                        ? 'bg-warning/100'
                                        : 'bg-success'
                                    }`}
                                    style={{ width: `${item.percentElapsed}%` }}
                                  />
                                </div>
                              </div>
                            </td>

                            <td className="py-3 px-3">
                              {item.isCritical && (
                                <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-danger text-white text-xs font-extrabold rounded-lg shadow-2xs">
                                  <Clock className="w-3 h-3" />
                                  <span>Critical: {item.remainingDays}d Left</span>
                                </span>
                              )}
                              {item.isWarning && (
                                <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-warning/15 text-warning border border-warning/30 text-xs font-bold rounded-lg">
                                  <Clock className="w-3 h-3 text-warning" />
                                  <span>Nearing Expiry: {item.remainingDays}d Left</span>
                                </span>
                              )}
                              {item.isExpired && (
                                <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-line text-muted text-xs font-bold rounded-lg">
                                  <span>Expired ({Math.abs(item.remainingDays)}d ago)</span>
                                </span>
                              )}
                              {item.isActive && (
                                <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-success/10 text-success-deep border border-success/30 text-xs font-bold rounded-lg">
                                  <ShieldCheck className="w-3 h-3 text-success" />
                                  <span>Protected ({item.remainingDays}d Left)</span>
                                </span>
                              )}
                            </td>

                            <td className="py-3 px-3 text-right">
                              <div className="flex items-center justify-end space-x-1.5">
                                <Button
  variant="secondary"
  
                                  type="button"
                                  onClick={() => handleCopyWarrantyCourtesyMessage(item)}
                                  className={`px-2.5 py-1.5 font-bold text-xs rounded-lg border transition-all flex items-center space-x-1 cursor-pointer active:scale-95 ${
                                    isCopied
                                      ? 'bg-success text-white border-emerald-600'
                                      : 'bg-surface hover:bg-line text-brand border-line'
                                  }`}
                                  title="Copy Customer Warranty Courtesy SMS/Notice"
                                >
                                  {isCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                  <span>{isCopied ? 'Copied Notice' : 'Copy Notice'}</span>
                                </Button>

                                <Button
  variant="iconGhost" size="iconSm"
  
                                  type="button"
                                  onClick={() => onNavigateToTab('crm')}
                                  className="bg-surface hover:bg-line border border-line"
                                  title="Open Customer Dossier in CRM"
                                >
                                  <Users className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {rosterTicket && (
        <TicketDetailInspectorModal
          workOrder={rosterTicket}
          onClose={() => setRosterTicket(null)}
          onPrint={onSelectPrintTag}
          onEdit={(wo) => onOpenNewWorkOrder({ editWorkOrder: wo })}
        />
      )}

      {detailTech && (
        <TechnicianDetailModal
          tech={detailTech}
          workOrders={filteredWorkOrders}
          periodLabel={trendSeries.windowLabel}
          onClose={() => setDetailTechId(null)}
          onNavigateToTab={onNavigateToTab}
        />
      )}
    </div>
  );
};
