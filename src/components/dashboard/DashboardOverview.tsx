import React, { useState, useMemo } from 'react';
import { ConfirmDeleteModal } from '../common/ConfirmDeleteModal';
import { 
  Coins, 
  CircleDot, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  TrendingUp, 
  Users, 
  RotateCcw,
  Sparkles,
  ChevronRight,
  BarChart3,
  LayoutDashboard,
  Smartphone,
  Laptop,
  Tablet,
  PieChart,
  Activity,
  Zap,
  Target,
  DollarSign,
  ShieldCheck,
  ShieldAlert,
  Check,
  ArrowUpRight,
  Boxes,
  CreditCard,
  Wallet,
  ClipboardList,
  Inbox,
  ListFilter,
  Layers,
  FileCheck,
  AlertCircle,
  Crown,
  Trash2,
  Copy,
  Send,
  Search,
  RefreshCw,
  Printer,
  Kanban,
  Plus,
  Eye,
  X,
  Filter
} from 'lucide-react';
import { WorkOrder, PartItem, RmaItem, Technician, WorkOrderStatus } from '../../types';
import { useLanguage } from '../../context/LanguageContext';
import { DateFilterState, filterByDateRange, DateFilterSelector } from '../common/DateFilterSelector';
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
              stroke="#E5E5EA"
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
              fill={v > 0 ? '#0071E3' : '#E5E5EA'}
              opacity={v > 0 ? 0.85 : 0.35}
            />
          ))}
          {repairs.some((v) => v > 0) && (
            <polyline points={linePoints} fill="none" stroke="#34C759" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          )}
          {repairs.map((v, i) =>
            v > 0 ? (
              <circle key={i} cx={slot * i + slot / 2} cy={yFor(v, maxRepairs)} r={3} fill="#34C759" />
            ) : null
          )}
          {buckets.map((b, i) =>
            i % labelStep === 0 || i === n - 1 ? (
              <text key={i} x={slot * i + slot / 2} y={H - 8} textAnchor="middle" fontSize={10} fill="#86868B">
                {b.label}
              </text>
            ) : null
          )}
        </svg>
      </div>
      <div className="flex items-center space-x-4 pt-2 text-[10px] font-bold text-[#86868B]">
        <span className="flex items-center space-x-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[#0071E3]/85" />
          Revenue (MMK)
        </span>
        <span className="flex items-center space-x-1.5">
          <span className="inline-block h-0.5 w-3 rounded-full bg-[#34C759]" />
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
  onOpenAiAssistant,
  onDeleteWorkOrder,
  onUpdateWorkOrderStatus,
  onSelectPrintTag,
  dateFilter: externalDateFilter,
  setDateFilter: externalSetDateFilter,
  onSettleInventoryFund,
}) => {
  const { t } = useLanguage();
  const [internalDateFilter, setInternalDateFilter] = useState<DateFilterState>({ preset: 'all' });
  const dateFilter = externalDateFilter || internalDateFilter;
  const setDateFilter = externalSetDateFilter || setInternalDateFilter;

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
  const [ticketToDelete, setTicketToDelete] = useState<WorkOrder | null>(null);
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
    return filteredWorkOrders.reduce((sum, wo) => {
      const lineItems = wo.lineItems || [];
      return sum + lineItems.reduce((c, li) => c + (li.unitCost || 0) * (li.quantity || 1), 0);
    }, 0);
  }, [filteredWorkOrders]);

  const totalMargin = totalRevenue - totalPartsCost;
  const marginPercent = totalRevenue > 0 ? Math.round((totalMargin / totalRevenue) * 100) : 0;
  const avgTicketValue = revenueWorkOrders.length > 0 ? Math.round(totalRevenue / revenueWorkOrders.length) : 0;

  // Monthly Repairs & Turnaround Metrics
  const monthlyRepairsCount = technicians.reduce((sum, tech) => sum + tech.completedThisMonth, 0);

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
      { id: 'screen', label: 'Screen & Display OLED', icon: Smartphone, color: 'bg-[#0071E3]', textCol: 'text-[#0071E3]', bgLight: 'bg-[#F0F6FF]', count: 0, revenue: 0 },
      { id: 'battery', label: 'Battery & Charging System', icon: Zap, color: 'bg-[#34C759]', textCol: 'text-[#34C759]', bgLight: 'bg-[#EAF8ED]', count: 0, revenue: 0 },
      { id: 'board', label: 'Logic Board & Micro-Soldering', icon: Activity, color: 'bg-[#AF52DE]', textCol: 'text-[#AF52DE]', bgLight: 'bg-purple-50', count: 0, revenue: 0 },
      { id: 'housing', label: 'Glass, Port, Camera & Housing', icon: Smartphone, color: 'bg-[#FF9500]', textCol: 'text-[#FF9500]', bgLight: 'bg-[#FFF8ED]', count: 0, revenue: 0 },
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
        <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs shadow-2xs">
          <div className="flex items-center gap-2 min-w-0">
            <Coins className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="font-bold text-amber-800 min-w-0">
              Inventory fund reminder — {pendingFundTickets.length} ticket{pendingFundTickets.length > 1 ? 's' : ''} used parts worth{' '}
              <span className="font-black">{pendingFundTotal.toLocaleString()} MMK</span> from stock, not settled yet
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onNavigateToTab('finance')}
              className="px-3 py-1.5 bg-white hover:bg-[#F5F5F7] text-amber-800 font-bold rounded-xl border border-amber-300 transition-all cursor-pointer"
            >
              View Details
            </button>
            <button
              onClick={() => onSettleInventoryFund?.(pendingFundTickets.map((wo) => wo.id))}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-extrabold rounded-xl transition-all cursor-pointer"
            >
              Mark All Settled
            </button>
          </div>
        </div>
      )}

      {/* Headline summary cards — always visible above the subtab tabs. */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Active In-Shop Repairs */}
        <div 
          onClick={() => {
            setActiveDashboardSubTab('status-queue');
            setStatusQueueFilter('ALL');
          }}
          className="group relative bg-white p-4 rounded-2xl border border-[#E5E5EA] shadow-2xs hover:shadow-md hover:border-[#0071E3]/50 transition-all cursor-pointer overflow-hidden select-none"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#86868B]">
              Active Repairs
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#F0F6FF] text-[#0071E3] flex items-center justify-center group-hover:scale-110 transition-transform">
              <ClipboardList className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-[#1D1D1F] tracking-tight">
              {activeRepairs.length}
            </span>
            <span className="text-[10px] font-bold text-[#0071E3] bg-[#F0F6FF] px-2 py-0.5 rounded-full border border-[#0071E3]/20">
              {inRepair.length} In Progress / Received
            </span>
          </div>
          <div className="mt-3 pt-2.5 border-t border-[#F5F5F7] flex items-center justify-between text-[11px] text-[#86868B]">
            <span>In-shop workload</span>
            <span className="font-bold text-[#0071E3] group-hover:underline flex items-center space-x-0.5">
              <span>View Queue</span>
              <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Card 2: Ready for Pickup */}
        <div 
          onClick={() => {
            setActiveDashboardSubTab('status-queue');
            setStatusQueueFilter('Finished');
          }}
          className="group relative bg-white p-4 rounded-2xl border border-[#E5E5EA] shadow-2xs hover:shadow-md hover:border-emerald-500/50 transition-all cursor-pointer overflow-hidden select-none"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#86868B]">
              Ready for Pickup
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-[#1D1D1F] tracking-tight">
              {readyForPickup.length}
            </span>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              Completed
            </span>
          </div>
          <div className="mt-3 pt-2.5 border-t border-[#F5F5F7] flex items-center justify-between text-[11px] text-[#86868B]">
            <span>Awaiting customer</span>
            <span className="font-bold text-emerald-600 group-hover:underline flex items-center space-x-0.5">
              <span>View Finished</span>
              <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Card 3: Total Revenue */}
        <div 
          onClick={() => setActiveDashboardSubTab('finance')}
          className="group relative bg-white p-4 rounded-2xl border border-[#E5E5EA] shadow-2xs hover:shadow-md hover:border-indigo-500/50 transition-all cursor-pointer overflow-hidden select-none"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#86868B]">
              Total Revenue
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-black text-[#1D1D1F] tracking-tight truncate">
              {totalRevenue.toLocaleString()} <span className="text-xs font-bold text-[#86868B]">MMK</span>
            </span>
            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200 shrink-0 ml-1">
              {marginPercent}% Margin
            </span>
          </div>
          <div className="mt-3 pt-2.5 border-t border-[#F5F5F7] flex items-center justify-between text-[11px] text-[#86868B]">
            <span>Avg: {avgTicketValue.toLocaleString()} MMK</span>
            <span className="font-bold text-indigo-600 group-hover:underline flex items-center space-x-0.5">
              <span>Finance</span>
              <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Card 4: Average Turnaround Time (completed tickets only) */}
        <div 
          onClick={() => setActiveDashboardSubTab('tech-kpi')}
          className="group relative bg-white p-4 rounded-2xl border border-[#E5E5EA] shadow-2xs hover:shadow-md hover:border-teal-500/50 transition-all cursor-pointer overflow-hidden select-none"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#86868B]">
              Avg Turnaround
            </span>
            <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-[#1D1D1F] tracking-tight">
              {avgTurnaroundHours > 0
                ? avgTurnaroundHours >= 24
                  ? `${(avgTurnaroundHours / 24).toFixed(1)}d`
                  : `${avgTurnaroundHours}h`
                : '—'}
            </span>
            <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
              Intake → Ready
            </span>
          </div>
          <div className="mt-3 pt-2.5 border-t border-[#F5F5F7] flex items-center justify-between text-[11px] text-[#86868B]">
            <span>{completedWorkOrders.length} completed tickets</span>
            <span className="font-bold text-teal-600 group-hover:underline flex items-center space-x-0.5">
              <span>Tech KPIs</span>
              <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </div>
      </div>

{/* Top Dashboard Navigation Subtabs Bar */}
      <div role="tablist" aria-label="Dashboard sections" className="bg-[#F5F5F7] p-1.5 rounded-2xl border border-[#E5E5EA] flex items-center space-x-1.5 overflow-x-auto no-scrollbar w-full text-xs shadow-2xs">
        {/* Subtab 1: Status Queue */}
        <button
          type="button"
          role="tab"
          id="dash-tab-status-queue"
          aria-controls="dash-panel-status-queue"
          aria-selected={activeDashboardSubTab === 'status-queue'}
          onClick={() => setActiveDashboardSubTab('status-queue')}
          onKeyDown={(e) => handleDashboardTabKeyDown(e, 'status-queue')}
          className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center space-x-2 shrink-0 cursor-pointer border select-none active:scale-95 ${
            activeDashboardSubTab === 'status-queue'
              ? 'bg-[#0071E3] text-white border-[#0071E3] shadow-xs'
              : 'bg-white hover:bg-slate-100 text-[#6E6E73] hover:text-[#1D1D1F] border-[#E5E5EA]'
          }`}
        >
          <ListFilter className="w-4 h-4" />
          <span>Status Queue</span>
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
            activeDashboardSubTab === 'status-queue'
              ? 'bg-white/20 text-white'
              : 'bg-[#E5E5EA] text-[#1D1D1F]'
          }`}>
            {activeRepairs.length} Active
          </span>
        </button>

        {/* Subtab 2: Repair Data */}
        <button
          type="button"
          role="tab"
          id="dash-tab-repair-data"
          aria-controls="dash-panel-repair-data"
          aria-selected={activeDashboardSubTab === 'repair-data'}
          onClick={() => setActiveDashboardSubTab('repair-data')}
          onKeyDown={(e) => handleDashboardTabKeyDown(e, 'repair-data')}
          className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center space-x-2 shrink-0 cursor-pointer border select-none active:scale-95 ${
            activeDashboardSubTab === 'repair-data'
              ? 'bg-[#0071E3] text-white border-[#0071E3] shadow-xs'
              : 'bg-white hover:bg-slate-100 text-[#6E6E73] hover:text-[#1D1D1F] border-[#E5E5EA]'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Hardware Analytics</span>
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
            activeDashboardSubTab === 'repair-data'
              ? 'bg-white/20 text-white'
              : 'bg-[#E5E5EA] text-[#1D1D1F]'
          }`}>
            {filteredWorkOrders.length} Tickets
          </span>
        </button>

        {/* Subtab 3: Technician KPI & Leaderboard (merged) */}
        <button
          type="button"
          role="tab"
          id="dash-tab-tech-kpi"
          aria-controls="dash-panel-tech-kpi"
          aria-selected={activeDashboardSubTab === 'tech-kpi'}
          onClick={() => setActiveDashboardSubTab('tech-kpi')}
          onKeyDown={(e) => handleDashboardTabKeyDown(e, 'tech-kpi')}
          className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center space-x-2 shrink-0 cursor-pointer border select-none active:scale-95 ${
            activeDashboardSubTab === 'tech-kpi'
              ? 'bg-[#0071E3] text-white border-[#0071E3] shadow-xs'
              : 'bg-white hover:bg-slate-100 text-[#6E6E73] hover:text-[#1D1D1F] border-[#E5E5EA]'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Technicians</span>
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
            activeDashboardSubTab === 'tech-kpi'
              ? 'bg-white/20 text-white'
              : 'bg-[#E5E5EA] text-[#1D1D1F]'
          }`}>
            {technicians.length} Staff
          </span>
        </button>

        {/* Subtab 4: Inventory */}
        <button
          type="button"
          role="tab"
          id="dash-tab-inventory"
          aria-controls="dash-panel-inventory"
          aria-selected={activeDashboardSubTab === 'inventory'}
          onClick={() => setActiveDashboardSubTab('inventory')}
          onKeyDown={(e) => handleDashboardTabKeyDown(e, 'inventory')}
          className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center space-x-2 shrink-0 cursor-pointer border select-none active:scale-95 ${
            activeDashboardSubTab === 'inventory'
              ? 'bg-[#0071E3] text-white border-[#0071E3] shadow-xs'
              : 'bg-white hover:bg-slate-100 text-[#6E6E73] hover:text-[#1D1D1F] border-[#E5E5EA]'
          }`}
        >
          <Boxes className="w-4 h-4" />
          <span>Inventory</span>
          {repairLowStockParts.length > 0 ? (
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-extrabold ${
              activeDashboardSubTab === 'inventory'
                ? 'bg-white/20 text-white'
                : 'bg-amber-100 text-amber-800 border border-amber-200'
            }`}>
              {repairLowStockParts.length} Low
            </span>
          ) : (
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
              activeDashboardSubTab === 'inventory'
                ? 'bg-white/20 text-white'
                : 'bg-[#E5E5EA] text-[#1D1D1F]'
            }`}>
              {parts.length} Parts
            </span>
          )}
        </button>

        {/* Subtab 6: Finance */}
        <button
          type="button"
          role="tab"
          id="dash-tab-finance"
          aria-controls="dash-panel-finance"
          aria-selected={activeDashboardSubTab === 'finance'}
          onClick={() => setActiveDashboardSubTab('finance')}
          onKeyDown={(e) => handleDashboardTabKeyDown(e, 'finance')}
          className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center space-x-2 shrink-0 cursor-pointer border select-none active:scale-95 ${
            activeDashboardSubTab === 'finance'
              ? 'bg-[#0071E3] text-white border-[#0071E3] shadow-xs'
              : 'bg-white hover:bg-slate-100 text-[#6E6E73] hover:text-[#1D1D1F] border-[#E5E5EA]'
          }`}
        >
          <Coins className="w-4 h-4" />
          <span>Finance</span>
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
            activeDashboardSubTab === 'finance'
              ? 'bg-white/20 text-white'
              : 'bg-[#E5E5EA] text-[#1D1D1F]'
          }`}>
            {marginPercent}% Margin
          </span>
        </button>

        {/* Subtab 7: Warranty Watch */}
        <button
          type="button"
          role="tab"
          id="dash-tab-warranty-watch"
          aria-controls="dash-panel-warranty-watch"
          aria-selected={activeDashboardSubTab === 'warranty-watch'}
          onClick={() => setActiveDashboardSubTab('warranty-watch')}
          onKeyDown={(e) => handleDashboardTabKeyDown(e, 'warranty-watch')}
          className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center space-x-2 shrink-0 cursor-pointer border select-none active:scale-95 ${
            activeDashboardSubTab === 'warranty-watch'
              ? 'bg-[#0071E3] text-white border-[#0071E3] shadow-xs'
              : 'bg-white hover:bg-slate-100 text-[#6E6E73] hover:text-[#1D1D1F] border-[#E5E5EA]'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Warranty Watch</span>
          {expiringSoonWorkOrders.length > 0 ? (
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
              activeDashboardSubTab === 'warranty-watch'
                ? 'bg-white/20 text-white'
                : 'bg-rose-100 text-rose-800 border border-rose-200'
            }`}>
              {expiringSoonWorkOrders.length} Flagged
            </span>
          ) : (
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
              activeDashboardSubTab === 'warranty-watch'
                ? 'bg-white/20 text-white'
                : 'bg-[#E5E5EA] text-[#1D1D1F]'
            }`}>
              Clear
            </span>
          )}
        </button>
      </div>

      {/* Background Warranty Check Alert Banner on Dashboard */}
      {expiringSoonWorkOrders.length > 0 && activeDashboardSubTab !== 'warranty-watch' && (
        <div className="p-4 bg-gradient-to-r from-rose-50 via-amber-50 to-orange-50 border border-rose-200 rounded-2xl shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-start sm:items-center space-x-3">
              <div className="p-2 bg-rose-600 text-white rounded-xl shadow-2xs shrink-0">
                <ShieldAlert className="w-5 h-5 animate-pulse" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center space-x-2">
                  <span className="font-black text-rose-950 text-sm">Background Warranty Monitor Flagged</span>
                  <span className="text-[10px] font-mono font-bold bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full border border-rose-200">
                    90-Day Standard Window
                  </span>
                </div>
                <p className="text-[#1D1D1F] text-xs">
                  <strong className="text-rose-700 font-extrabold">{expiringSoonWorkOrders.length} Work Order(s)</strong> are nearing the end of their 90-day warranty period ({criticalWarrantyCount} critical within 7 days).
                </p>
              </div>
            </div>

            <button
              onClick={() => setActiveDashboardSubTab('warranty-watch')}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer shrink-0 shadow-2xs flex items-center space-x-1.5 active:scale-95"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Inspect Flagged Tickets ({expiringSoonWorkOrders.length})</span>
            </button>
          </div>

          {/* Quick Preview Chips of Top Expiring Tickets */}
          <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar pt-1 border-t border-rose-200/60">
            <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider shrink-0">Expiring Soon:</span>
            {expiringSoonWorkOrders.slice(0, 4).map((item) => (
              <div
                key={item.wo.id}
                onClick={() => setActiveDashboardSubTab('warranty-watch')}
                className="bg-white/80 hover:bg-white border border-rose-200 px-2.5 py-1 rounded-lg text-[11px] flex items-center space-x-2 cursor-pointer shrink-0 shadow-2xs transition-all"
              >
                <span className="font-mono font-bold text-[#0071E3]">{item.wo.orderNumber}</span>
                <span className="font-bold text-[#1D1D1F]">{item.wo.customerName}</span>
                <span className="text-[#86868B]">({item.wo.deviceModel})</span>
                <span className={`px-1.5 py-0.2 rounded font-extrabold text-[10px] ${
                  item.remainingDays <= 3 ? 'bg-rose-600 text-white' : 'bg-amber-100 text-amber-800'
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
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between gap-3 text-xs text-amber-900 shadow-2xs">
              <div className="flex items-center space-x-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                <div>
                  <p className="font-bold text-amber-950">{stagnantWorkOrders.length} Repair Ticket(s) Bottlenecked (&gt;48h in Queue)</p>
                  <p className="text-[11px] text-amber-800">These tickets have been inactive for over 48 hours. Consider reassigning technicians or updating customer status.</p>
                </div>
              </div>
              <button
                onClick={() => onNavigateToTab('pipeline')}
                className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shrink-0 shadow-2xs"
              >
                Inspect Bottlenecks
              </button>
            </div>
          )}

          {/* Clean Executive Stage Summary Card & Quick Pipeline Jump */}
          <div className="bg-white border border-[#E5E5EA] rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E5E5EA]">
              <div className="space-y-0.5">
                <div className="flex items-center space-x-2">
                  <ListFilter className="w-4 h-4 text-[#0071E3]" />
                  <h3 className="text-sm font-extrabold text-[#1D1D1F]">
                    Status Queue & Stage Distribution
                  </h3>
                  <span className="px-2.5 py-0.5 bg-[#0071E3]/10 text-[#0071E3] rounded-full text-[11px] font-mono font-bold">
                    {filteredWorkOrders.length} Total Work Orders
                  </span>
                </div>
                <p className="text-xs text-[#86868B]">High-level stage tracking, bottlenecks, and active repair distribution</p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => onNavigateToTab('pipeline')}
                  className="px-4 py-2 bg-[#0071E3] hover:bg-[#0071E3]/90 text-white font-extrabold text-xs rounded-xl shadow-2xs flex items-center space-x-2 transition-all cursor-pointer active:scale-95"
                >
                  <Kanban className="w-4 h-4" />
                  <span>Open Interactive Pipeline</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Visual Stage Progress Bars Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
              {[
                { stage: 'Receive', title: 'Intake / Receive', count: statusQueueCounts['Receive'], color: 'bg-blue-500', bg: 'bg-blue-50', text: 'text-blue-700' },
                { stage: 'In Progress', title: 'In Progress (Active)', count: statusQueueCounts['In Progress'], color: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700' },
                { stage: 'Pending', title: 'Pending Approval / Parts', count: statusQueueCounts['Pending'], color: 'bg-amber-500', bg: 'bg-amber-50', text: 'text-amber-700' },
                { stage: 'Finished', title: 'Finished / Ready for Pickup', count: statusQueueCounts['Finished'], color: 'bg-teal-500', bg: 'bg-teal-50', text: 'text-teal-700' },
              ].map((item) => {
                const total = filteredWorkOrders.length || 1;
                const pct = Math.round((item.count / total) * 100);
                return (
                  <div key={item.stage} className={`p-4 rounded-xl border border-slate-200/80 ${item.bg} space-y-2`}>
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold ${item.text}`}>{item.title}</span>
                      <span className="font-mono text-xs font-black text-slate-800">{item.count} tickets</span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                      <div className={`h-full ${item.color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-slate-500">
                      <span>{pct}% of active queue</span>
                      <button
                        onClick={() => {
                          setStatusQueueFilter(item.stage);
                        }}
                        className="font-bold text-[#0071E3] hover:underline flex items-center space-x-0.5"
                      >
                        <span>Filter Queue Below</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>          {/* Live Work Order Status Analytics Queue Roster Table */}
          <div className="bg-white border border-[#E5E5EA] rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-[#E5E5EA]">
              <div className="space-y-0.5">
                <div className="flex items-center space-x-2">
                  <ClipboardList className="w-4 h-4 text-[#0071E3]" />
                  <h3 className="text-sm font-extrabold text-[#1D1D1F]">
                    Live Work Order Status Analytics Queue Roster
                  </h3>
                  <span className="px-2.5 py-0.5 bg-[#0071E3]/10 text-[#0071E3] rounded-full text-[11px] font-mono font-bold">
                    {statusQueueWorkOrders.length} {statusQueueWorkOrders.length === 1 ? 'Ticket' : 'Tickets'}
                  </span>
                  {statusQueueFilter !== 'ALL' && (
                    <span className="px-2.5 py-0.5 bg-indigo-100 text-indigo-800 rounded-full text-[11px] font-mono font-bold">
                      {statusQueueFilter === 'PIPELINE' ? 'Pipeline Data Only' : `Stage: ${statusQueueFilter}`}
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#86868B]">Read-only analytic ticket roster filtered by repair stage, technician, and priority</p>
              </div>
            </div>

            {/* Queue Search & Quick Filter Controls */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#F8F9FA] p-3 rounded-xl border border-[#E5E5EA]">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#86868B]" />
                <input
                  type="text"
                  value={queueSearchQuery}
                  onChange={(e) => setQueueSearchQuery(e.target.value)}
                  placeholder="Search analytics queue by order #, customer, model, serial..."
                  className="w-full bg-white text-xs text-[#1D1D1F] placeholder-[#86868B] pl-8 pr-7 py-1.5 rounded-lg border border-[#E5E5EA] focus:outline-none focus:border-[#0071E3] transition-all"
                />
                {queueSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setQueueSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[#86868B] hover:text-[#1D1D1F]"
                  >
                    ×
                  </button>
                )}
              </div>

              <div className="flex items-center space-x-2 flex-wrap">
                {/* Tech Filter Select */}
                <select
                  value={queueTechFilter}
                  onChange={(e) => setQueueTechFilter(e.target.value)}
                  className="bg-white text-xs text-[#1D1D1F] font-semibold py-1.5 px-2.5 rounded-lg border border-[#E5E5EA] focus:outline-none focus:border-[#0071E3]"
                >
                  <option value="ALL">All Technicians</option>
                  <option value="unassigned">Unassigned</option>
                  {technicians.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>

                {/* Priority Filter Select */}
                <select
                  value={queuePriorityFilter}
                  onChange={(e) => setQueuePriorityFilter(e.target.value)}
                  className="bg-white text-xs text-[#1D1D1F] font-semibold py-1.5 px-2.5 rounded-lg border border-[#E5E5EA] focus:outline-none focus:border-[#0071E3]"
                >
                  <option value="ALL">All Priorities</option>
                  <option value="Urgent">Urgent</option>
                  <option value="B2B Priority">B2B Priority</option>
                  <option value="Normal">Normal</option>
                  <option value="Warranty Redo">Warranty Redo</option>
                </select>

                {(statusQueueFilter !== 'ALL' || queueTechFilter !== 'ALL' || queuePriorityFilter !== 'ALL' || queueSearchQuery) && (
                  <button
                    type="button"
                    onClick={() => {
                      setStatusQueueFilter('ALL');
                      setQueueTechFilter('ALL');
                      setQueuePriorityFilter('ALL');
                      setQueueSearchQuery('');
                    }}
                    className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-lg transition-all cursor-pointer shrink-0"
                  >
                    Reset Filters
                  </button>
                )}
              </div>
            </div>

            {/* Work Orders Queue Table */}
            {statusQueueWorkOrders.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#86868B] space-y-2 bg-[#F8F9FA] rounded-xl border border-dashed border-[#D2D2D7]">
                <Inbox className="w-8 h-8 text-[#86868B] mx-auto opacity-60" />
                <p className="font-extrabold text-sm text-[#1D1D1F]">No Work Orders in Queue Matching Selection</p>
                <p className="text-[11px]">
                  {statusQueueFilter !== 'ALL'
                    ? `There are currently no tickets matching stage filter "${statusQueueFilter}".`
                    : 'Try adjusting your search query or reset status filters.'}
                </p>
                <div className="pt-2 flex items-center justify-center space-x-2">
                  {statusQueueFilter !== 'ALL' && (
                    <button
                      type="button"
                      onClick={() => setStatusQueueFilter('ALL')}
                      className="px-3 py-1.5 bg-[#0071E3] text-white text-xs font-bold rounded-lg hover:bg-[#0051B3] transition-all cursor-pointer"
                    >
                      Show All Stages
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#E5E5EA] text-[#86868B] font-bold text-[10px] uppercase tracking-wider bg-[#F8F9FA]">
                      <th className="py-2.5 px-3">Ticket # & Date</th>
                      <th className="py-2.5 px-3">Customer & Contact</th>
                      <th className="py-2.5 px-3">Device & Serial/IMEI</th>
                      <th className="py-2.5 px-3 hidden lg:table-cell">Symptoms / Service</th>
                      <th className="py-2.5 px-3 hidden lg:table-cell">Assigned Tech</th>
                      <th className="py-2.5 px-3 hidden lg:table-cell">Priority</th>
                      <th className="py-2.5 px-3">Stage & Status</th>
                      <th className="py-2.5 px-3">Amount</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E5EA]">
                    {statusQueueWorkOrders.map((wo) => {
                      const createdDate = new Date(wo.createdAt || Date.now()).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      });
                      const totalAmt = wo.totalAmount || wo.subtotal || 0;

                      return (
                        <tr key={wo.id} className="hover:bg-[#F8F9FA] transition-colors">
                          {/* Ticket # & Date */}
                          <td className="py-3 px-3">
                            <p className="font-mono font-black text-[#0071E3] text-xs">{wo.orderNumber || wo.id}</p>
                            <span className="text-[10px] text-[#86868B]">{createdDate}</span>
                          </td>

                          {/* Customer */}
                          <td className="py-3 px-3">
                            <p className="font-bold text-[#1D1D1F] truncate max-w-[140px]">{wo.customerName}</p>
                            <p className="text-[10px] text-[#86868B] font-mono">{wo.customerPhone}</p>
                          </td>

                          {/* Device & Serial */}
                          <td className="py-3 px-3">
                            <p className="font-semibold text-[#1D1D1F] truncate max-w-[150px]">{wo.deviceModel}</p>
                            <p className="text-[10px] font-mono text-[#86868B] truncate max-w-[150px]">
                              {wo.serialNumber || wo.imei ? `SN: ${wo.serialNumber || wo.imei}` : 'No Serial'}
                            </p>
                          </td>

                          {/* Symptoms / Service */}
                          <td className="py-3 px-3 hidden lg:table-cell">
                            <p className="text-xs text-[#1D1D1F] line-clamp-1 max-w-[180px]" title={wo.symptomsReported || wo.serviceType}>
                              {wo.symptomsReported || wo.serviceType || 'General Repair'}
                            </p>
                          </td>

                          {/* Assigned Tech */}
                          <td className="py-3 px-3 hidden lg:table-cell">
                            <div className="flex items-center space-x-1.5">
                              <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                                {(wo.assignedTechName || 'U').charAt(0)}
                              </div>
                              <span className="text-xs text-[#1D1D1F] font-medium truncate max-w-[100px]">
                                {wo.assignedTechName || 'Unassigned'}
                              </span>
                            </div>
                          </td>

                          {/* Priority */}
                          <td className="py-3 px-3 hidden lg:table-cell">
                            <PriorityBadge priority={wo.priority} />
                          </td>

                          {/* Stage & Status (Read-Only Badge) */}
                          <td className="py-3 px-3">
                            <StatusBadge status={wo.status} />
                          </td>

                          {/* Financial Amount */}
                          <td className="py-3 px-3">
                            <p className="font-mono font-extrabold text-xs text-[#1D1D1F]">
                              {totalAmt.toLocaleString()} MMK
                            </p>
                            <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                              wo.isPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                            }`}>
                              {wo.isPaid ? 'Paid' : 'Unpaid'}
                            </span>
                          </td>

                          {/* Ticket status inspector and label export */}
                          <td className="py-3 px-3 text-right">
                            <div className="inline-flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setRosterTicket(wo)}
                                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--blue-tint)] px-2.5 text-[10px] font-extrabold text-[var(--primary)] transition-colors hover:bg-[var(--card-bg)]"
                                title="View Ticket Status"
                                aria-label={`View status for ${wo.orderNumber || wo.id}`}
                              >
                                <Eye className="h-3.5 w-3.5" />
                                <span>View</span>
                              </button>
                              {onSelectPrintTag && (
                              <button
                                type="button"
                                onClick={() => onSelectPrintTag(wo)}
                                className="p-1.5 bg-[#F5F5F7] hover:bg-[#E5E5EA] text-[#1D1D1F] rounded-lg border border-[#E5E5EA] transition-all cursor-pointer inline-flex items-center space-x-1 text-[10px] font-bold"
                                title="Print Device Label Tag"
                              >
                                <Printer className="w-3.5 h-3.5 text-[#0071E3]" />
                                <span>Tag</span>
                              </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUBTAB 2: REPAIR DATA */}
      {activeDashboardSubTab === 'repair-data' && (
        <div role="tabpanel" id="dash-panel-repair-data" aria-labelledby="dash-tab-repair-data" className="space-y-6">
          {/* Top Repair Devices */}
          <div className="bg-white border border-[#E5E5EA] rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-[#E5E5EA]">
              <div className="space-y-0.5">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-[#AF52DE]/10 text-[#AF52DE] rounded-xl border border-[#AF52DE]/20">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-extrabold text-[#1D1D1F]">Top Repair Devices</h3>
                </div>
                <p className="text-xs text-[#86868B]">Most-repaired device models ranked by ticket volume</p>
              </div>
              <span className="text-xs font-extrabold bg-[#F0F6FF] text-[#0071E3] px-3.5 py-1.5 rounded-full border border-[#0071E3]/20 flex items-center space-x-1.5 shrink-0">
                <Smartphone className="w-4 h-4" />
                <span>{topRepairDevices.length} Models · {filteredWorkOrders.length} Tickets</span>
              </span>
            </div>

            <div className="space-y-2.5">
              {topRepairDevices.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#86868B] bg-[#F8F9FA] rounded-xl border border-dashed border-[#D2D2D7]">
                  No repair tickets in the selected date range.
                </div>
              ) : (
                topRepairDevices.map((dev, idx) => {
                  const maxCount = topRepairDevices[0]?.count || 1;
                  const barPct = Math.max(8, Math.round((dev.count / maxCount) * 100));
                  const medal = idx === 0 ? 'bg-[#FFD60A]/20 text-[#B25000] border-[#FFD60A]/50' : idx === 1 ? 'bg-slate-100 text-slate-600 border-slate-200' : idx === 2 ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-[#F5F5F7] text-[#86868B] border-[#E5E5EA]';
                  return (
                    <div key={dev.name} className="p-3 bg-[#F8F9FA] border border-[#E5E5EA] rounded-xl space-y-2">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <div className="flex items-center space-x-2 min-w-0">
                          <span className={`w-6 h-6 rounded-full border flex items-center justify-center font-black text-[10px] shrink-0 ${medal}`}>
                            {idx + 1}
                          </span>
                          <span className="font-extrabold text-[#1D1D1F] truncate">{dev.name}</span>
                        </div>
                        <div className="flex items-center space-x-3 shrink-0">
                          <span className="font-mono font-bold text-[#1D1D1F]">{dev.count} Repairs</span>
                          <span className="font-mono font-bold text-[#0071E3]">{dev.revenue.toLocaleString()} MMK</span>
                        </div>
                      </div>
                      <div className="w-full bg-[#E5E5EA] rounded-full h-2 overflow-hidden">
                        <div className="h-full rounded-full bg-[#AF52DE]" style={{ width: `${barPct}%` }} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Top Repair Categories with Income */}
          <div className="bg-white border border-[#E5E5EA] rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-[#E5E5EA]">
              <div className="space-y-0.5">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-[#0071E3]/10 text-[#0071E3] rounded-xl border border-[#0071E3]/20">
                    <BarChart3 className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-extrabold text-[#1D1D1F]">Top Repair Categories with Income</h3>
                </div>
                <p className="text-xs text-[#86868B]">Repair category breakdown by tickets and revenue</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {topRepairCategories.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#86868B] bg-[#F8F9FA] rounded-xl border border-dashed border-[#D2D2D7] md:col-span-2">
                  No repair tickets in the selected date range.
                </div>
              ) : (
                topRepairCategories.map((cat) => {
                  const IconComp = cat.icon;
                  const maxRevenue = topRepairCategories[0]?.revenue || 1;
                  const barPct = Math.max(8, Math.round((cat.revenue / maxRevenue) * 100));
                  return (
                    <div key={cat.id} className="p-3.5 bg-[#F8F9FA] border border-[#E5E5EA] rounded-xl space-y-2.5">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-2">
                          <div className={`p-1.5 rounded-md ${cat.bgLight} ${cat.textCol}`}>
                            <IconComp className="w-3.5 h-3.5" />
                          </div>
                          <span className="font-extrabold text-[#1D1D1F]">{cat.label}</span>
                        </div>
                        <span className="text-[10px] font-bold text-[#86868B] bg-white border border-[#E5E5EA] px-2 py-0.5 rounded-full">{cat.count} Tickets</span>
                      </div>
                      <div className="flex items-baseline justify-between">
                        <span className="font-mono font-black text-lg text-[#1D1D1F]">{cat.revenue.toLocaleString()} MMK</span>
                        <span className={`font-bold text-xs ${cat.textCol}`}>{cat.percentage}% of income</span>
                      </div>
                      <div className="w-full bg-[#E5E5EA] rounded-full h-2 overflow-hidden">
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs">
              <span className="font-bold text-amber-800 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                Queue imbalanced — reassign 1–2 tickets from {maxLoadTechs.map((t) => t.tech.name).join(' / ')} ({maxTechLoad}) to {minLoadTechs.map((t) => t.tech.name).join(' / ')} ({minTechLoad})
              </span>
              <span className="text-amber-700/80 text-[10px] font-semibold shrink-0">Load gap: {maxTechLoad - minTechLoad} tickets</span>
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
            <div className="bg-white border border-[#E5E5EA] rounded-2xl p-4 shadow-2xs space-y-1">
              <span className="text-xs font-bold text-[#86868B] uppercase">Total Parts Valuation</span>
              <p className="text-xl font-extrabold text-[#1D1D1F]">{inventoryAnalytics.totalValuation.toLocaleString()} MMK</p>
              <p className="text-[11px] text-[#34C759] font-semibold">{inventoryAnalytics.totalItems} Total Replacement Items</p>
            </div>

            <div className="bg-white border border-[#E5E5EA] rounded-2xl p-4 shadow-2xs space-y-1">
              <span className="text-xs font-bold text-[#86868B] uppercase">Low Stock Repair Items</span>
              <p className="text-xl font-extrabold text-[#FF9500]">{repairLowStockParts.length} Repair Parts</p>
              <p className="text-[11px] text-[#FF9500] font-semibold">Below reorder threshold</p>
            </div>

            <div className="bg-white border border-[#E5E5EA] rounded-2xl p-4 shadow-2xs space-y-1">
              <span className="text-xs font-bold text-[#86868B] uppercase">Pending Vendor RMAs</span>
              <p className="text-xl font-extrabold text-[#AF52DE]">{pendingRmas.length} Defective Returns</p>
              <p className="text-[11px] text-[#AF52DE] font-semibold">Awaiting supplier credits</p>
            </div>
          </div>

          {/* Low Stock Repair Triggers Card */}
          <div className="bg-white border border-[#E5E5EA] rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E5EA]">
              <div>
                <h3 className="text-sm font-bold text-[#1D1D1F] flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-[#FF9500]" />
                  <span>Low Stock Repair Component Auto Triggers</span>
                </h3>
                <p className="text-xs text-[#86868B]">Replacement screens, batteries, and logic board ICs needing reorder</p>
              </div>

              <button
                onClick={() => onNavigateToTab('inventory')}
                className="px-3.5 py-1.5 bg-[#0071E3] hover:bg-[#0077ED] text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
              >
                Go to Inventory Module
              </button>
            </div>

            {repairLowStockParts.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#34C759] bg-[#EAF8ED] border border-[#34C759]/20 rounded-xl space-y-1">
                <CheckCircle2 className="w-6 h-6 mx-auto" />
                <p className="font-extrabold text-sm text-[#1D1D1F]">All Repair Components In Stock</p>
                <p className="text-[#86868B]">No display, battery, or logic board micro-soldering parts are currently low.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {repairLowStockParts.map((part) => (
                  <div key={part.id} className="p-3.5 bg-[#FFF8ED] border border-[#FF9500]/30 rounded-xl space-y-2 shadow-2xs">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-extrabold text-xs text-[#1D1D1F]">{part.name}</p>
                        <p className="text-[10px] text-[#86868B]">{part.category} · {part.qualityTier}</p>
                      </div>
                      <span className="text-xs font-extrabold text-[#D97706] bg-amber-100 px-2 py-0.5 rounded-lg border border-amber-200 shrink-0">
                        {part.quantityInStock} Left
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] border-t border-[#FF9500]/20 pt-2 text-[#86868B]">
                      <span>Supplier: <strong className="text-[#1D1D1F]">{part.supplierName}</strong></span>
                      <span className="font-mono font-bold text-[#0071E3]">{part.costPrice.toLocaleString()} MMK Cost</span>
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
            <div className="bg-white border border-[#E5E5EA] rounded-2xl p-4 shadow-2xs space-y-1">
              <span className="text-xs font-bold text-[#86868B] uppercase">Total Revenue</span>
              <p className="text-2xl font-extrabold text-[#1D1D1F]">{totalRevenue.toLocaleString()} MMK</p>
              <p className="text-[11px] text-[#28A745] font-semibold">{marginPercent}% Gross Profit Margin</p>
            </div>

            <div className="bg-white border border-[#E5E5EA] rounded-2xl p-4 shadow-2xs space-y-1">
              <span className="text-xs font-bold text-[#86868B] uppercase">Gross Profit (Margin)</span>
              <p className="text-2xl font-extrabold text-[#34C759]">{totalMargin.toLocaleString()} MMK</p>
              <p className="text-[11px] text-[#86868B]">Revenue minus parts cost</p>
            </div>

            <div className="bg-white border border-[#E5E5EA] rounded-2xl p-4 shadow-2xs space-y-1">
              <span className="text-xs font-bold text-[#86868B] uppercase">Total Collected (Paid)</span>
              <p className="text-2xl font-extrabold text-[#0071E3]">{financialAnalytics.totalCollected.toLocaleString()} MMK</p>
              <p className="text-[11px] text-[#0071E3] font-semibold">{financialAnalytics.paidCount} Tickets Fully Settled</p>
            </div>

            <div className="bg-white border border-[#E5E5EA] rounded-2xl p-4 shadow-2xs space-y-1">
              <span className="text-xs font-bold text-[#86868B] uppercase">Unpaid Pending Balance</span>
              <p className="text-2xl font-extrabold text-rose-600">{financialAnalytics.totalUnpaidBalance.toLocaleString()} MMK</p>
              <p className="text-[11px] text-rose-600 font-semibold">{financialAnalytics.unpaidCount} Tickets Outstanding</p>
            </div>
          </div>

          {/* Revenue & Repairs Trend — with previous-period comparison */}
          <div className="bg-white border border-[#E5E5EA] rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-[#E5E5EA]">
              <div className="space-y-0.5">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-[#0071E3]/10 text-[#0071E3] rounded-xl border border-[#0071E3]/20">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-extrabold text-[#1D1D1F]">Revenue & Repairs Trend</h3>
                </div>
                <p className="text-xs text-[#86868B]">{trendSeries.windowLabel} · {trendSeries.bucketDays === 7 ? 'weekly' : 'daily'} buckets · completed tickets only</p>
              </div>
              <div className="flex items-center space-x-2 flex-wrap gap-y-1.5">
                {trendSeries.revenueDeltaPct !== null && (
                  <span className={`px-2.5 py-1 rounded-full border flex items-center space-x-1 text-[10px] font-extrabold ${trendSeries.revenueDeltaPct >= 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                    <ArrowUpRight className={`w-3 h-3 ${trendSeries.revenueDeltaPct >= 0 ? '' : 'rotate-90'}`} />
                    <span>Revenue {trendSeries.revenueDeltaPct >= 0 ? '+' : ''}{trendSeries.revenueDeltaPct}% vs prev period</span>
                  </span>
                )}
                {trendSeries.repairsDeltaPct !== null && (
                  <span className={`px-2.5 py-1 rounded-full border flex items-center space-x-1 text-[10px] font-extrabold ${trendSeries.repairsDeltaPct >= 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                    <ArrowUpRight className={`w-3 h-3 ${trendSeries.repairsDeltaPct >= 0 ? '' : 'rotate-90'}`} />
                    <span>Repairs {trendSeries.repairsDeltaPct >= 0 ? '+' : ''}{trendSeries.repairsDeltaPct}% vs prev period</span>
                  </span>
                )}
                {trendSeries.revenueDeltaPct === null && (
                  <span className="px-2.5 py-1 rounded-full border border-[#E5E5EA] bg-[#F5F5F7] text-[#86868B] text-[10px] font-bold">No previous-period data</span>
                )}
              </div>
            </div>

            {trendSeries.curRev === 0 && trendSeries.curRep === 0 ? (
              <div className="p-8 text-center text-xs text-[#86868B] bg-[#F8F9FA] rounded-xl border border-dashed border-[#D2D2D7] space-y-1">
                <TrendingUp className="w-6 h-6 mx-auto opacity-50" />
                <p className="font-extrabold text-sm text-[#1D1D1F]">No completed repairs in this period</p>
                <p className="text-[11px]">Completed (Finished / Taken Out) tickets will appear here.</p>
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
          <div className="bg-white border border-[#E5E5EA] rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E5EA]">
              <div>
                <h3 className="text-sm font-extrabold text-[#1D1D1F] flex items-center space-x-2">
                  <Coins className="w-4 h-4 text-[#34C759]" />
                  <span>Financial Revenue Intelligence</span>
                </h3>
                <p className="text-xs text-[#86868B]">Average ticket value and margin metrics</p>
              </div>

              <button
                onClick={() => onNavigateToTab('pos')}
                className="px-3.5 py-1.5 bg-[#0071E3] hover:bg-[#0077ED] text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
              >
                POS Register
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-[#F8F9FA] border border-[#E5E5EA] rounded-xl space-y-1">
                <p className="text-xs font-bold text-[#86868B] uppercase">Average Ticket Value (ATV)</p>
                <p className="text-2xl font-extrabold text-[#1D1D1F]">{avgTicketValue.toLocaleString()} MMK</p>
                <p className="text-[11px] text-[#86868B]">Per repair work order</p>
              </div>

              <div className="p-4 bg-[#F8F9FA] border border-[#E5E5EA] rounded-xl space-y-1">
                <p className="text-xs font-bold text-[#86868B] uppercase">Total Parts Cost</p>
                <p className="text-2xl font-extrabold text-[#1D1D1F]">{totalPartsCost.toLocaleString()} MMK</p>
                <p className="text-[11px] text-[#86868B]">Direct hardware component cost</p>
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
                  <div className="p-2 bg-rose-600 text-white rounded-xl shadow-xs">
                    <ShieldAlert className="w-5 h-5 animate-pulse" />
                  </div>
                  <h2 className="text-lg font-black tracking-tight text-white flex items-center space-x-2">
                    <span>90-Day Warranty Background Telemetry</span>
                  </h2>
                  <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono text-[10px] font-bold rounded-full flex items-center space-x-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block mr-1" />
                    <span>Background Scanner Active</span>
                  </span>
                </div>
                <p className="text-xs text-slate-300">
                  Real-time monitor flagging work orders nearing the end of their 90-day warranty window (within 14 days of expiry).
                </p>
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
                <span className="text-[10px] text-slate-300 font-bold uppercase">Scanned Tickets</span>
                <p className="text-xl font-black text-white">{warrantyCheckData.length}</p>
                <p className="text-[10px] text-slate-400">Total with warranty</p>
              </div>

              <div className="p-3 bg-rose-500/20 border border-rose-500/40 rounded-xl space-y-0.5">
                <span className="text-[10px] text-rose-200 font-bold uppercase">Nearing Expiry (&le;14d)</span>
                <p className="text-xl font-black text-rose-300">{expiringSoonWorkOrders.length}</p>
                <p className="text-[10px] text-rose-200">Flagged by monitor</p>
              </div>

              <div className="p-3 bg-rose-600/30 border border-rose-500/50 rounded-xl space-y-0.5">
                <span className="text-[10px] text-rose-200 font-bold uppercase">Critical Window (&le;7d)</span>
                <p className="text-xl font-black text-rose-200">{criticalWarrantyCount}</p>
                <p className="text-[10px] text-rose-300">Requires attention</p>
              </div>

              <div className="p-3 bg-amber-500/20 border border-amber-500/40 rounded-xl space-y-0.5">
                <span className="text-[10px] text-amber-200 font-bold uppercase">Warning Window (8-14d)</span>
                <p className="text-xl font-black text-amber-300">{warningWarrantyCount}</p>
                <p className="text-[10px] text-amber-200">Nearing end period</p>
              </div>

              <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl space-y-0.5 col-span-2 lg:col-span-1">
                <span className="text-[10px] text-emerald-200 font-bold uppercase">Active & Protected</span>
                <p className="text-xl font-black text-emerald-300">{activeWarrantyCount}</p>
                <p className="text-[10px] text-emerald-200">&gt;14 days remaining</p>
              </div>
            </div>
          </div>

          {/* Warranty Watch Roster Table Card */}
          <div className="bg-white border border-[#E5E5EA] rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[#E5E5EA]">
              {/* Search input */}
              <div className="relative w-full md:w-80">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#86868B]" />
                <input
                  type="text"
                  value={warrantySearchQuery}
                  onChange={(e) => setWarrantySearchQuery(e.target.value)}
                  placeholder="Search ticket #, customer, device, serial..."
                  className="w-full bg-[#F5F5F7] text-xs text-[#1D1D1F] placeholder-[#86868B] pl-8 pr-8 py-1.5 rounded-xl border border-[#E5E5EA] focus:bg-white focus:outline-none focus:border-[#0071E3] transition-all"
                />
                {warrantySearchQuery && (
                  <button
                    type="button"
                    onClick={() => setWarrantySearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[#86868B] hover:text-[#1D1D1F]"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center space-x-1 bg-[#F5F5F7] p-1 rounded-xl border border-[#E5E5EA] overflow-x-auto no-scrollbar">
                <button
                  type="button"
                  onClick={() => setWarrantyFilterTab('ALL_EXPIRING')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
                    warrantyFilterTab === 'ALL_EXPIRING'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'text-[#86868B] hover:text-[#1D1D1F]'
                  }`}
                >
                  Flagged Expiration ({expiringSoonWorkOrders.length})
                </button>
                <button
                  type="button"
                  onClick={() => setWarrantyFilterTab('CRITICAL')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
                    warrantyFilterTab === 'CRITICAL'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'text-[#86868B] hover:text-[#1D1D1F]'
                  }`}
                >
                  Critical &le;7d ({criticalWarrantyCount})
                </button>
                <button
                  type="button"
                  onClick={() => setWarrantyFilterTab('WARNING')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
                    warrantyFilterTab === 'WARNING'
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'text-[#86868B] hover:text-[#1D1D1F]'
                  }`}
                >
                  Warning 8-14d ({warningWarrantyCount})
                </button>
                <button
                  type="button"
                  onClick={() => setWarrantyFilterTab('EXPIRED')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
                    warrantyFilterTab === 'EXPIRED'
                      ? 'bg-slate-700 text-white shadow-xs'
                      : 'text-[#86868B] hover:text-[#1D1D1F]'
                  }`}
                >
                  Expired ({expiredWarrantyCount})
                </button>
                <button
                  type="button"
                  onClick={() => setWarrantyFilterTab('ALL')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
                    warrantyFilterTab === 'ALL'
                      ? 'bg-[#0071E3] text-white shadow-xs'
                      : 'text-[#86868B] hover:text-[#1D1D1F]'
                  }`}
                >
                  All Tickets ({warrantyCheckData.length})
                </button>
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
                  <div className="p-10 text-center text-xs text-[#86868B] space-y-2 bg-[#F8F9FA] rounded-xl border border-dashed border-[#D2D2D7]">
                    <ShieldCheck className="w-10 h-10 text-[#34C759] mx-auto opacity-70" />
                    <p className="font-extrabold text-sm text-[#1D1D1F]">No Work Orders Matching Warranty Criteria</p>
                    <p className="text-[11px]">
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
                      <tr className="border-b border-[#E5E5EA] text-[#86868B] font-bold text-[10px] uppercase tracking-wider">
                        <th className="py-2.5 px-3">Ticket #</th>
                        <th className="py-2.5 px-3">Customer & Contact</th>
                        <th className="py-2.5 px-3">Device & Serial</th>
                        <th className="py-2.5 px-3 hidden md:table-cell">Warranty Dates</th>
                        <th className="py-2.5 px-3">90-Day Elapsed</th>
                        <th className="py-2.5 px-3">Warranty Health Status</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E5EA]">
                      {displayList.map((item) => {
                        const isCopied = copiedNoticeId === item.wo.id;
                        return (
                          <tr key={item.wo.id} className={`hover:bg-[#F8F9FA] transition-colors ${item.isCritical ? 'bg-rose-50/40' : ''}`}>
                            <td className="py-3 px-3">
                              <p className="font-mono font-bold text-[#0071E3]">{item.wo.orderNumber}</p>
                              <span className="text-[10px] text-[#86868B]">{item.wo.status}</span>
                            </td>

                            <td className="py-3 px-3">
                              <p className="font-bold text-[#1D1D1F]">{item.wo.customerName}</p>
                              <p className="text-[10px] text-[#86868B]">{item.wo.customerPhone}</p>
                            </td>

                            <td className="py-3 px-3">
                              <p className="font-semibold text-[#1D1D1F]">{item.wo.deviceModel}</p>
                              <p className="text-[10px] font-mono text-[#86868B]">SN: {item.wo.serialNumber || 'N/A'}</p>
                            </td>

                            <td className="py-3 px-3 text-[11px] hidden md:table-cell">
                              <p className="text-[#86868B]">Start: <strong className="text-[#1D1D1F]">{item.startDateFormatted}</strong></p>
                              <p className="text-[#86868B]">Expires: <strong className="text-rose-700">{item.expiryDateFormatted}</strong></p>
                            </td>

                            <td className="py-3 px-3 w-36">
                              <div className="space-y-1">
                                <div className="flex justify-between text-[10px] text-[#86868B]">
                                  <span>{item.daysElapsed} days</span>
                                  <span>{item.percentElapsed}%</span>
                                </div>
                                <div className="w-full bg-[#E5E5EA] rounded-full h-1.5 overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${
                                      item.remainingDays <= 3
                                        ? 'bg-rose-600'
                                        : item.remainingDays <= 14
                                        ? 'bg-amber-500'
                                        : 'bg-[#34C759]'
                                    }`}
                                    style={{ width: `${item.percentElapsed}%` }}
                                  />
                                </div>
                              </div>
                            </td>

                            <td className="py-3 px-3">
                              {item.isCritical && (
                                <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-rose-600 text-white text-[10px] font-extrabold rounded-lg shadow-2xs">
                                  <Clock className="w-3 h-3" />
                                  <span>Critical: {item.remainingDays}d Left</span>
                                </span>
                              )}
                              {item.isWarning && (
                                <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-bold rounded-lg">
                                  <Clock className="w-3 h-3 text-amber-600" />
                                  <span>Nearing Expiry: {item.remainingDays}d Left</span>
                                </span>
                              )}
                              {item.isExpired && (
                                <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-slate-200 text-slate-700 text-[10px] font-bold rounded-lg">
                                  <span>Expired ({Math.abs(item.remainingDays)}d ago)</span>
                                </span>
                              )}
                              {item.isActive && (
                                <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold rounded-lg">
                                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                                  <span>Protected ({item.remainingDays}d Left)</span>
                                </span>
                              )}
                            </td>

                            <td className="py-3 px-3 text-right">
                              <div className="flex items-center justify-end space-x-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleCopyWarrantyCourtesyMessage(item)}
                                  className={`px-2.5 py-1.5 font-bold text-[10px] rounded-lg border transition-all flex items-center space-x-1 cursor-pointer active:scale-95 ${
                                    isCopied
                                      ? 'bg-emerald-600 text-white border-emerald-600'
                                      : 'bg-[#F5F5F7] hover:bg-[#E5E5EA] text-[#0071E3] border-[#E5E5EA]'
                                  }`}
                                  title="Copy Customer Warranty Courtesy SMS/Notice"
                                >
                                  {isCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                  <span>{isCopied ? 'Copied Notice' : 'Copy Notice'}</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => onNavigateToTab('crm')}
                                  className="p-1.5 bg-[#F5F5F7] hover:bg-[#E5E5EA] text-[#1D1D1F] rounded-lg border border-[#E5E5EA] transition-all cursor-pointer"
                                  title="Open Customer Dossier in CRM"
                                >
                                  <Users className="w-3.5 h-3.5" />
                                </button>
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
