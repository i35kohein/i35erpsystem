import React, { useState, useMemo, forwardRef, useImperativeHandle } from 'react';

import {Coins, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  TrendingUp, 
  Users,
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
  ListFilter,
  Copy,
  Search,
  RefreshCw} from 'lucide-react';
import { WorkOrder, PartItem, RmaItem, Technician, WorkOrderStatus } from '../../types';
import { Button , Input } from '../ui';

import { DateFilterState, filterByDateRange} from '../common/DateFilterSelector';
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { TechnicianPerformanceTab } from './TechnicianPerformanceTab';
import { TechnicianLeaderboardView } from './TechnicianLeaderboardView';
import { TechnicianDetailModal } from './TechnicianDetailModal';
import { computeTechStats } from '../../utils/techAnalytics';
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
  activeSubTab?: 'status-queue' | 'repair-data' | 'tech-kpi' | 'inventory' | 'finance' | 'warranty-watch';
  onSubTabChange?: (tab: 'status-queue' | 'repair-data' | 'tech-kpi' | 'inventory' | 'finance' | 'warranty-watch') => void;
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
  currencySymbol?: string;
}> = ({ buckets, revenue, repairs, currencySymbol = 'MMK' }) => {
  const hasAny = revenue.some((v) => v > 0) || repairs.some((v) => v > 0);

  if (!hasAny) return null;

  const data = buckets.map((b, i) => ({
    name: b.label,
    revenue: revenue[i] || 0,
    repairs: repairs[i] || 0,
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-line rounded-lg shadow-lg p-3 text-sm">
          <p className="font-bold text-ink mb-2">{label}</p>
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-sm bg-brand" />
              <span className="text-muted">Revenue:</span>
              <span className="font-bold text-brand-deep">{payload[0].value.toLocaleString()} {currencySymbol}</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-success" />
              <span className="text-muted">Repairs:</span>
              <span className="font-bold text-success-deep">{payload[1].value}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-80 mt-4 -ml-4">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-line)" />
          <XAxis 
            dataKey="name" 
            tickLine={false} 
            axisLine={false} 
            tick={{ fontSize: 11, fill: 'var(--color-muted)' }} 
            dy={10} 
            interval="preserveStartEnd" 
            minTickGap={20}
          />
          <YAxis 
            yAxisId="left" 
            tickLine={false} 
            axisLine={false} 
            tick={{ fontSize: 11, fill: 'var(--color-muted)' }} 
            tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k` : value}
          />
          <YAxis 
            yAxisId="right" 
            orientation="right" 
            tickLine={false} 
            axisLine={false} 
            tick={{ fontSize: 11, fill: 'var(--color-muted)' }} 
          />
          <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: 'var(--color-surface)', opacity: 0.4 }} />
          <Legend 
            wrapperStyle={{ fontSize: '12px', paddingTop: '20px', paddingLeft: '16px' }} 
            iconType="circle"
          />
          <Bar yAxisId="left" dataKey="revenue" name={`Revenue (${currencySymbol})`} fill="var(--color-brand)" radius={[4, 4, 0, 0]} maxBarSize={40} opacity={0.85} />
          <Line yAxisId="right" type="monotone" dataKey="repairs" name="Completed Repairs" stroke="var(--color-success)" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: 'var(--color-surface)', stroke: 'var(--color-success)' }} activeDot={{ r: 6, fill: 'var(--color-success)', stroke: 'var(--color-surface)' }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export interface DashboardOverviewHandle {
  setSubTab: (tab: 'status-queue' | 'repair-data' | 'tech-kpi' | 'inventory' | 'finance' | 'warranty-watch') => void;
}

export const DashboardOverview = forwardRef<DashboardOverviewHandle, DashboardOverviewProps>(({
  workOrders,
  parts,
  rmas,
  technicians,
  onNavigateToTab,
  onOpenNewWorkOrder,
  onSelectPrintTag,
  currencySymbol,
  dateFilter: externalDateFilter,
  onSettleInventoryFund,
  activeSubTab,
  onSubTabChange,
}: DashboardOverviewProps, ref) => {
  const [internalDateFilter] = useState<DateFilterState>({ preset: 'all' });
  const dateFilter = externalDateFilter || internalDateFilter;

  const [internalSubTab, setInternalSubTab] = useState<'status-queue' | 'repair-data' | 'tech-kpi' | 'inventory' | 'finance' | 'warranty-watch'>('status-queue');
  // Controlled from App navbar when provided; falls back to internal state.
  const activeDashboardSubTab = activeSubTab || internalSubTab;
  const setActiveDashboardSubTab = (tab: typeof activeDashboardSubTab) => {
    if (onSubTabChange) {
      onSubTabChange(tab);
    } else {
      setInternalSubTab(tab);
    }
  };

  // Expose subtab switching to the navbar (App.tsx renders dashboard tab buttons)
  useImperativeHandle(ref, () => ({
    setSubTab: (tab) => setActiveDashboardSubTab(tab),
  }));

  // Technician drill-down modal (tech-kpi tab)
  const [detailTechId, setDetailTechId] = useState<string | null>(null);
  const detailTech = detailTechId ? technicians.find((t) => t.id === detailTechId) || null : null;

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
                <span className={`px-1.5 py-0.5 rounded font-extrabold text-xs ${
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

      {/* 4 KPI cards stay 4-up on every large screen — simplified: label + number + one action hint */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Active In-Shop Repairs */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setActiveDashboardSubTab('status-queue')}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActiveDashboardSubTab('status-queue'); } }}
          aria-label="View active repairs queue"
          className="group relative bg-white p-4 rounded-2xl border border-line shadow-2xs hover:shadow-md hover:border-brand/50 transition-all cursor-pointer overflow-hidden select-none"
        >
          <div className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-2xl bg-brand-soft text-brand flex items-center justify-center group-hover:scale-110 group-hover:bg-brand group-hover:text-white transition-all">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div className="pr-14">
            <span className="text-xs font-extrabold uppercase tracking-wider text-muted">
              Active Repairs
            </span>
            <div className="mt-2">
              <span className="text-2xl sm:text-3xl font-black text-ink tracking-tight">
                {activeRepairs.length}
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Ready for Pickup */}
        <div 
          role="button"
          tabIndex={0}
          onClick={() => setActiveDashboardSubTab('status-queue')}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActiveDashboardSubTab('status-queue'); } }}
          aria-label="View ready for pickup"
          className="group relative bg-white p-4 rounded-2xl border border-line shadow-2xs hover:shadow-md hover:border-emerald-500/50 transition-all cursor-pointer overflow-hidden select-none"
        >
          <div className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-2xl bg-success/10 text-success flex items-center justify-center group-hover:scale-110 group-hover:bg-success group-hover:text-white transition-all">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div className="pr-14">
            <span className="text-xs font-extrabold uppercase tracking-wider text-muted">
              Ready for Pickup
            </span>
            <div className="mt-2">
              <span className="text-2xl sm:text-3xl font-black text-ink tracking-tight">
                {readyForPickup.length}
              </span>
            </div>
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
          <div className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-2xl bg-brand-soft text-brand flex items-center justify-center group-hover:scale-110 group-hover:bg-brand group-hover:text-white transition-all">
            <Coins className="w-6 h-6" />
          </div>
          <div className="pr-14">
            <span className="text-xs font-extrabold uppercase tracking-wider text-muted">
              Total Revenue
            </span>
            <div className="mt-2">
              <span className="text-xl sm:text-2xl font-black text-ink tracking-tight truncate block">
                {totalRevenue.toLocaleString()} <span className="text-xs font-bold text-muted">MMK</span>
              </span>
            </div>
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
          <div className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-2xl bg-teal/10 text-teal flex items-center justify-center group-hover:scale-110 group-hover:bg-teal group-hover:text-white transition-all">
            <Clock className="w-6 h-6" />
          </div>
          <div className="pr-14">
            <span className="text-xs font-extrabold uppercase tracking-wider text-muted">
              Avg Turnaround
            </span>
            <div className="mt-2">
              <span className="text-2xl sm:text-3xl font-black text-ink tracking-tight">
                {avgTurnaroundHours > 0
                  ? avgTurnaroundHours >= 24
                    ? `${(avgTurnaroundHours / 24).toFixed(1)}d`
                    : `${avgTurnaroundHours}h`
                  : '—'}
              </span>
            </div>
          </div>
        </div>
      </div>

          {/* Analytics Grid — stage, devices, categories, finance, inventory, tech, warranty */}
          <div className="grid auto-rows-fr grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3.5">

            {/* Stage Distribution */}
            <div className="flex flex-col min-h-[210px] bg-white border border-line rounded-2xl p-4 shadow-2xs">
              <div className="flex items-center space-x-2 mb-3">
                <ListFilter className="w-4 h-4 text-brand" />
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-muted">Stage Distribution</h3>
              </div>
              <div className="space-y-2.5">
                {[
                  { label: 'Received', count: filteredWorkOrders.filter((w) => w.status === 'Receive').length, bar: 'bg-brand', text: 'text-brand' },
                  { label: 'In Progress', count: filteredWorkOrders.filter((w) => w.status === 'In Progress').length, bar: 'bg-purple', text: 'text-purple' },
                  { label: 'Pending', count: filteredWorkOrders.filter((w) => w.status === 'Pending').length, bar: 'bg-warning', text: 'text-warning' },
                  { label: 'Finished', count: filteredWorkOrders.filter((w) => w.status === 'Finished').length, bar: 'bg-success', text: 'text-success-deep' },
                  { label: 'Taken Out', count: filteredWorkOrders.filter((w) => w.status === 'Taken Out').length, bar: 'bg-slate-400', text: 'text-muted' },
                ].map((s) => {
                  const pct = filteredWorkOrders.length > 0 ? Math.round((s.count / filteredWorkOrders.length) * 100) : 0;
                  return (
                    <div key={s.label} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-ink">{s.label}</span>
                        <span className={`font-mono font-black ${s.text}`}>{s.count} · {pct}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-line rounded-full overflow-hidden">
                        <div className={`h-full ${s.bar} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top Repair Devices */}
            <div className="flex flex-col min-h-[210px] bg-white border border-line rounded-2xl p-4 shadow-2xs">
              <div className="flex items-center space-x-2 mb-3">
                <Smartphone className="w-4 h-4 text-purple" />
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-muted">Top Repair Devices</h3>
              </div>
              {topRepairDevices.length === 0 ? (
                <p className="text-xs text-muted text-center py-8">No tickets in range</p>
              ) : (
                <div className="space-y-2">
                  {topRepairDevices.slice(0, 5).map((dev, idx) => {
                    const maxCount = topRepairDevices[0]?.count || 1;
                    const barPct = Math.max(8, Math.round((dev.count / maxCount) * 100));
                    return (
                      <div key={dev.name} className="space-y-1">
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="font-bold text-ink truncate">{idx + 1}. {dev.name}</span>
                          <span className="font-mono font-black text-ink shrink-0">{dev.count} tickets</span>
                        </div>
                        <div className="w-full h-1.5 bg-line rounded-full overflow-hidden">
                          <div className="h-full bg-purple rounded-full" style={{ width: `${barPct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Repair Categories */}
            <div className="flex flex-col min-h-[210px] bg-white border border-line rounded-2xl p-4 shadow-2xs">
              <div className="flex items-center space-x-2 mb-3">
                <Activity className="w-4 h-4 text-brand" />
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-muted">Repair Categories</h3>
              </div>
              {topRepairCategories.length === 0 ? (
                <p className="text-xs text-muted text-center py-8">No data</p>
              ) : (
                <div className="space-y-2.5">
                  {topRepairCategories.slice(0, 4).map((cat) => (
                    <div key={cat.id} className="flex items-center justify-between gap-2">
                      <div className="flex items-center space-x-2 min-w-0">
                        <span className={`w-7 h-7 rounded-lg ${cat.bgLight} ${cat.textCol} flex items-center justify-center shrink-0`}>
                          <cat.icon className="w-3.5 h-3.5" />
                        </span>
                        <span className="text-xs font-bold text-ink truncate">{cat.label}</span>
                      </div>
                      <div className="flex items-center space-x-2 shrink-0">
                        <span className="font-mono text-xs font-black text-ink">{cat.count}</span>
                        <span className="text-[11px] font-bold text-muted w-11 text-right">{cat.percentage}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Financial Snapshot */}
            <div className="flex flex-col min-h-[210px] bg-white border border-line rounded-2xl p-4 shadow-2xs">
              <div className="flex items-center space-x-2 mb-3">
                <Coins className="w-4 h-4 text-success" />
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-muted">Financial Snapshot</h3>
              </div>
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted font-medium">Collected</span>
                  <span className="font-mono font-black text-success-deep">{financialAnalytics.totalCollected.toLocaleString()} MMK</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted font-medium">Unpaid Balance</span>
                  <span className="font-mono font-black text-danger">{financialAnalytics.totalUnpaidBalance.toLocaleString()} MMK</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted font-medium">Paid Tickets</span>
                  <span className="font-mono font-black text-ink">{financialAnalytics.paidCount}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted font-medium">Unpaid Tickets</span>
                  <span className="font-mono font-black text-ink">{financialAnalytics.unpaidCount}</span>
                </div>
                <div className="pt-2 border-t border-line">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted font-medium">Margin</span>
                    <span className={`font-mono font-black ${marginPercent < 0 ? 'text-danger' : 'text-success-deep'}`}>{marginPercent}%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Inventory Snapshot */}
            <div className="flex flex-col min-h-[210px] bg-white border border-line rounded-2xl p-4 shadow-2xs">
              <div className="flex items-center space-x-2 mb-3">
                <Boxes className="w-4 h-4 text-warning" />
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-muted">Inventory</h3>
              </div>
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted font-medium">Total Items</span>
                  <span className="font-mono font-black text-ink">{inventoryAnalytics.totalItems}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted font-medium">Stock Value</span>
                  <span className="font-mono font-black text-ink">{inventoryAnalytics.totalValuation.toLocaleString()} MMK</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted font-medium">Low Stock</span>
                  <span className={`font-mono font-black ${inventoryAnalytics.lowStockCount > 0 ? 'text-warning' : 'text-success-deep'}`}>
                    {inventoryAnalytics.lowStockCount} SKUs
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted font-medium">Repair Parts Low</span>
                  <span className={`font-mono font-black ${repairLowStockParts.length > 0 ? 'text-danger' : 'text-success-deep'}`}>
                    {repairLowStockParts.length}
                  </span>
                </div>
              </div>
            </div>

            {/* Technician Load */}
            <div className="flex flex-col min-h-[210px] bg-white border border-line rounded-2xl p-4 shadow-2xs">
              <div className="flex items-center space-x-2 mb-3">
                <Users className="w-4 h-4 text-brand" />
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-muted">Technician Load</h3>
              </div>
              {techLoadData.length === 0 ? (
                <p className="text-xs text-muted text-center py-8">No technicians</p>
              ) : (
                <div className="space-y-2.5">
                  {techLoadData.map(({ tech, activeCount }) => {
                    const maxLoad = Math.max(...techLoadData.map((t) => t.activeCount), 1);
                    const pct = Math.max(8, Math.round((activeCount / maxLoad) * 100));
                    return (
                      <div key={tech.id} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-ink truncate">{tech.name}</span>
                          <span className="font-mono font-black text-ink">{activeCount} jobs</span>
                        </div>
                        <div className="w-full h-1.5 bg-line rounded-full overflow-hidden">
                          <div className="h-full bg-brand rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Warranty Watch */}
            <div className="flex flex-col min-h-[210px] bg-white border border-line rounded-2xl p-4 shadow-2xs">
              <div className="flex items-center space-x-2 mb-3">
                <ShieldAlert className="w-4 h-4 text-purple" />
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-muted">Warranty Watch</h3>
              </div>
              {expiringSoonWorkOrders.length === 0 ? (
                <p className="text-xs text-muted text-center py-8">No warranties expiring soon</p>
              ) : (
                <div className="space-y-2">
                  {expiringSoonWorkOrders.slice(0, 4).map((item) => (
                    <div key={item.wo.id} className="flex items-center justify-between gap-2 text-xs">
                      <div className="min-w-0">
                        <p className="font-bold text-ink truncate">{item.wo.customerName}</p>
                        <p className="text-[11px] text-muted truncate">{item.wo.deviceModel}</p>
                      </div>
                      <span className={`font-mono font-black shrink-0 ${item.isCritical ? 'text-danger' : 'text-warning'}`}>
                        {item.remainingDays}d
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 2: REPAIR DATA */}
      {activeDashboardSubTab === 'repair-data' && (
        <div role="tabpanel" id="dash-panel-repair-data" aria-labelledby="dash-tab-repair-data" className="grid grid-cols-1 xl:grid-cols-2 gap-3.5">
          {/* Top Repair Devices */}
          <div className="bg-white border border-line rounded-2xl p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-line">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 bg-purple/10 text-purple rounded-lg border border-purple/20">
                  <Smartphone className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-extrabold text-ink">Top Repair Devices</h3>
              </div>
              <span className="text-xs font-extrabold bg-brand-soft text-brand px-2.5 py-0.5 rounded-full border border-brand/20 shrink-0">
                {topRepairDevices.length} Models
              </span>
            </div>

            <div className="space-y-2">
              {topRepairDevices.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted bg-surface rounded-xl border border-dashed border-line-strong">
                  No repair tickets in the selected date range.
                </div>
              ) : (
                topRepairDevices.map((dev, idx) => {
                  const maxCount = topRepairDevices[0]?.count || 1;
                  const barPct = Math.max(8, Math.round((dev.count / maxCount) * 100));
                  const medal = idx === 0 ? 'bg-warning/20 text-warning border-warning/50' : idx === 1 ? 'bg-surface text-muted border-line' : idx === 2 ? 'bg-warning/10 text-warning border-warning/30' : 'bg-surface text-muted border-line';
                  return (
                    <div key={dev.name} className="p-2.5 bg-surface border border-line rounded-xl space-y-1.5">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <div className="flex items-center space-x-2 min-w-0">
                          <span className={`w-5 h-5 rounded-full border flex items-center justify-center font-black text-xs shrink-0 ${medal}`}>
                            {idx + 1}
                          </span>
                          <span className="font-extrabold text-ink truncate">{dev.name}</span>
                        </div>
                        <div className="flex items-center space-x-2 shrink-0">
                          <span className="font-mono font-bold text-ink">{dev.count}</span>
                          <span className="font-mono font-bold text-brand">{dev.revenue.toLocaleString()} MMK</span>
                        </div>
                      </div>
                      <div className="w-full bg-line rounded-full h-1.5 overflow-hidden">
                        <div className="h-full rounded-full bg-purple" style={{ width: `${barPct}%` }} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Top Repair Categories with Income */}
          <div className="bg-white border border-line rounded-2xl p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-line">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 bg-brand/10 text-brand-deep rounded-lg border border-brand/20">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <h3 className="text-xs font-extrabold text-ink">Repair Categories</h3>
              </div>
            </div>

            <div className="space-y-2">
              {topRepairCategories.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted bg-surface rounded-xl border border-dashed border-line-strong">
                  No repair tickets in the selected date range.
                </div>
              ) : (
                topRepairCategories.map((cat) => {
                  const IconComp = cat.icon;
                  const maxRevenue = topRepairCategories[0]?.revenue || 1;
                  const barPct = Math.max(8, Math.round((cat.revenue / maxRevenue) * 100));
                  return (
                    <div key={cat.id} className="p-2.5 bg-surface border border-line rounded-xl space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-2">
                          <div className={`p-1.5 rounded-md ${cat.bgLight} ${cat.textCol}`}>
                            <IconComp className="w-3.5 h-3.5" />
                          </div>
                          <span className="font-extrabold text-ink truncate">{cat.label}</span>
                        </div>
                        <span className="text-xs font-bold text-muted bg-white border border-line px-2 py-0.5 rounded-full shrink-0">{cat.count} Tickets</span>
                      </div>
                      <div className="flex items-baseline justify-between">
                        <span className="font-mono font-black text-ink">{cat.revenue.toLocaleString()} MMK</span>
                        <span className={`font-bold text-xs ${cat.textCol}`}>{cat.percentage}%</span>
                      </div>
                      <div className="w-full bg-line rounded-full h-1.5 overflow-hidden">
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
                currencySymbol={currencySymbol}
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
                  <span className="px-2.5 py-0.5 bg-success/20 text-emerald-300 border border-emerald-500/30 font-mono text-xs font-bold rounded-full flex items-center space-x-1">
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

              <div className="p-3 bg-danger/20 border border-rose-500/40 rounded-xl space-y-0.5">
                <span className="text-xs text-rose-200 font-bold uppercase">Nearing Expiry (&le;14d)</span>
                <p className="text-xl font-black text-rose-300">{expiringSoonWorkOrders.length}</p>
                <p className="text-xs text-rose-200">Flagged by monitor</p>
              </div>

              <div className="p-3 bg-danger/30 border border-rose-500/50 rounded-xl space-y-0.5">
                <span className="text-xs text-rose-200 font-bold uppercase">Critical Window (&le;7d)</span>
                <p className="text-xl font-black text-rose-200">{criticalWarrantyCount}</p>
                <p className="text-xs text-rose-300">Requires attention</p>
              </div>

              <div className="p-3 bg-warning/20 border border-amber-500/40 rounded-xl space-y-0.5">
                <span className="text-xs text-amber-200 font-bold uppercase">Warning Window (8-14d)</span>
                <p className="text-xl font-black text-amber-300">{warningWarrantyCount}</p>
                <p className="text-xs text-amber-200">Nearing end period</p>
              </div>

              <div className="p-3 bg-success/20 border border-emerald-500/40 rounded-xl space-y-0.5 col-span-2 lg:col-span-1">
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
                                        ? 'bg-warning'
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
});
