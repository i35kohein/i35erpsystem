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
  Scale,
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
  Trophy,
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
import { get21Diagnostics, get21AfterDiagnostics } from '../../utils/diagnosticUtils';
import { DateFilterState, filterByDateRange, DateFilterSelector } from '../common/DateFilterSelector';
import { TechnicianPerformanceTab } from './TechnicianPerformanceTab';
import { TechnicianLeaderboardView } from './TechnicianLeaderboardView';
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
}

const REPAIR_CATEGORIES_KEYWORDS = [
  'display', 'battery', 'logic board', 'chip', 'charging', 'port', 
  'back glass', 'camera', 'audio', 'flex', 'screen', 'touch', 'speaker'
];

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
}) => {
  const { t } = useLanguage();
  const [internalDateFilter, setInternalDateFilter] = useState<DateFilterState>({ preset: 'all' });
  const dateFilter = externalDateFilter || internalDateFilter;
  const setDateFilter = externalSetDateFilter || setInternalDateFilter;

  const [activeDashboardSubTab, setActiveDashboardSubTab] = useState<'status-queue' | 'repair-data' | 'tech-kpi' | 'leaderboard' | 'inventory' | 'finance' | 'warranty-watch'>('status-queue');

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
      const startDateMs = new Date(wo.updatedAt || wo.createdAt).getTime();
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

  // Filter work orders for the Status Queue roster table
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

  // Financial calculations
  const totalRevenue = useMemo(() => {
    return filteredWorkOrders.reduce((sum, wo) => sum + (wo.subtotal || 0), 0);
  }, [filteredWorkOrders]);

  const totalPartsCost = useMemo(() => {
    return filteredWorkOrders.reduce((sum, wo) => {
      const lineItems = wo.lineItems || [];
      return sum + lineItems.reduce((c, li) => c + (li.unitCost || 0) * (li.quantity || 1), 0);
    }, 0);
  }, [filteredWorkOrders]);

  const totalMargin = totalRevenue - totalPartsCost;
  const marginPercent = totalRevenue > 0 ? Math.round((totalMargin / totalRevenue) * 100) : 0;
  const avgTicketValue = filteredWorkOrders.length > 0 ? Math.round(totalRevenue / filteredWorkOrders.length) : 0;

  // Monthly Repairs & Turnaround Metrics
  const monthlyRepairsCount = technicians.reduce((sum, tech) => sum + tech.completedThisMonth, 0);
  
  const completedOrActive = filteredWorkOrders.filter((w) => w.createdAt);
  let avgTurnaroundHours = 0;
  if (completedOrActive.length > 0) {
    const totalHours = completedOrActive.reduce((acc, wo) => {
      const created = new Date(wo.createdAt).getTime();
      const isClosed = ['Taken Out', 'Cant Repair', 'Customer Not Repair'].includes(wo.status);
      const endTime = isClosed ? new Date(wo.updatedAt || wo.createdAt).getTime() : Date.now();
      const diffHours = Math.max(0, (endTime - created) / (1000 * 60 * 60));
      return acc + diffHours;
    }, 0);
    avgTurnaroundHours = Number((totalHours / completedOrActive.length).toFixed(1));
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
  const readyForPickup = filteredWorkOrders.filter((w) => w.status === 'Finished' || w.status === 'Taken Out');

  // Top Technicians for Monthly Leaderboard Quick Widget
  const topTechniciansLeaderboard = useMemo(() => {
    return [...technicians].sort((a, b) => b.completedThisMonth - a.completedThisMonth);
  }, [technicians]);
  const inRepair = filteredWorkOrders.filter((w) => w.status === 'In Progress' || w.status === 'Receive');
  const pendingRmas = rmas.filter((r) => r.status === 'Shipped to Vendor' || r.status === 'Draft');

  // Technician Workload Data
  const techQueueData = useMemo(() => {
    return technicians.map((tech) => {
      const techActiveOrders = filteredWorkOrders.filter(
        (wo) => wo.assignedTechId === tech.id && wo.status !== 'Finished' && wo.status !== 'Taken Out' && wo.status !== 'Cant Repair' && wo.status !== 'Customer Not Repair'
      );
      const activeCount = techActiveOrders.length > 0 ? techActiveOrders.length : tech.activeJobsCount;
      const inProgressCount = techActiveOrders.filter((wo) => wo.status === 'In Progress').length;
      const receiveCount = techActiveOrders.filter((wo) => wo.status === 'Receive').length;
      const pendingCount = techActiveOrders.filter((wo) => wo.status === 'Pending').length;

      const maxCapacity = 5;
      const loadPercent = Math.min(100, Math.round((activeCount / maxCapacity) * 100));

      let loadBadge = { label: 'Optimal Load', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      if (activeCount >= 5) {
        loadBadge = { label: 'Overloaded', color: 'bg-rose-50 text-rose-700 border-rose-200' };
      } else if (activeCount >= 3) {
        loadBadge = { label: 'Heavy Queue', color: 'bg-amber-50 text-amber-700 border-amber-200' };
      } else if (activeCount === 0) {
        loadBadge = { label: 'Available', color: 'bg-blue-50 text-blue-700 border-blue-200' };
      }

      return {
        tech,
        activeCount,
        inProgressCount,
        receiveCount,
        pendingCount,
        loadPercent,
        loadBadge,
      };
    });
  }, [technicians, filteredWorkOrders]);

  const totalActiveTechJobs = techQueueData.reduce((sum, item) => sum + item.activeCount, 0);
  const maxTechLoad = Math.max(...techQueueData.map((t) => t.activeCount), 0);
  const minTechLoad = Math.min(...techQueueData.map((t) => t.activeCount), 0);
  const isQueueImbalanced = totalActiveTechJobs >= 2 && (maxTechLoad - minTechLoad) >= 3;

  // Analytical Breakdown: Repair Service Category Distribution
  const serviceCategoryAnalytics = useMemo(() => {
    const totalCount = filteredWorkOrders.length || 1;
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

      if (s.includes('screen') || s.includes('display') || s.includes('oled') || desc.includes('screen') || desc.includes('cracked')) {
        stats[0].count += 1;
        stats[0].revenue += rev;
      } else if (s.includes('battery') || s.includes('charging') || s.includes('power') || desc.includes('battery') || desc.includes('charge')) {
        stats[1].count += 1;
        stats[1].revenue += rev;
      } else if (s.includes('soldering') || s.includes('board') || s.includes('ic') || s.includes('micro') || desc.includes('power') || desc.includes('short')) {
        stats[2].count += 1;
        stats[2].revenue += rev;
      } else {
        stats[3].count += 1;
        stats[3].revenue += rev;
      }
    });

    return stats.map((st) => ({
      ...st,
      percentage: Math.round((st.count / totalCount) * 100),
    }));
  }, [filteredWorkOrders]);

  // Analytical Breakdown: Device Family Distribution
  const deviceFamilyAnalytics = useMemo(() => {
    const totalCount = filteredWorkOrders.length || 1;
    let iphone = { name: 'iPhone', count: 0, revenue: 0, color: 'bg-[#0071E3]', textCol: 'text-[#0071E3]' };
    let macbook = { name: 'MacBook', count: 0, revenue: 0, color: 'bg-[#AF52DE]', textCol: 'text-[#AF52DE]' };
    let ipad = { name: 'iPad', count: 0, revenue: 0, color: 'bg-[#FF9500]', textCol: 'text-[#FF9500]' };
    let watch = { name: 'Apple Watch & Other', count: 0, revenue: 0, color: 'bg-emerald-500', textCol: 'text-emerald-600' };

    filteredWorkOrders.forEach((wo) => {
      const model = (wo.deviceModel || '').toLowerCase();
      const rev = wo.subtotal || 0;
      if (model.includes('iphone')) {
        iphone.count += 1;
        iphone.revenue += rev;
      } else if (model.includes('macbook') || model.includes('mac')) {
        macbook.count += 1;
        macbook.revenue += rev;
      } else if (model.includes('ipad')) {
        ipad.count += 1;
        ipad.revenue += rev;
      } else {
        watch.count += 1;
        watch.revenue += rev;
      }
    });

    const items = [iphone, macbook, ipad, watch];
    return items.map((item) => ({
      ...item,
      percentage: Math.round((item.count / totalCount) * 100),
    }));
  }, [filteredWorkOrders]);

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
  const diagnostic21Analytics = useMemo(() => {
    let totalPass = 0;
    let totalFail = 0;
    let totalNA = 0;
    const testFailMap: Record<string, number> = {};
    const testPassMap: Record<string, number> = {};
    const testCountMap: Record<string, number> = {};

    // Normalize each ticket's diagnostics the same way Intake / QA do
    // (get21Diagnostics merges stored results with symptom-based inference),
    // so the dashboard matches what staff see in the other tabs.
    filteredWorkOrders.forEach((wo) => {
      const normalized = get21Diagnostics(wo.beforeDiagnostics, wo.symptomsReported, wo.intakeChecklist);
      normalized.forEach((d) => {
        const status = d.status;
        testCountMap[d.name] = (testCountMap[d.name] || 0) + 1;
        if (status === 'Pass') {
          totalPass += 1;
          testPassMap[d.name] = (testPassMap[d.name] || 0) + 1;
        } else if (status === 'Fail') {
          totalFail += 1;
          testFailMap[d.name] = (testFailMap[d.name] || 0) + 1;
        } else {
          totalNA += 1;
        }
      });
    });

    const topFailingTests = Object.entries(testFailMap)
      .map(([test, count]) => ({ test, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const topPerformingTests = Object.entries(testPassMap)
      .map(([test, count]) => ({
        test,
        count,
        total: testCountMap[test] || 1,
        passRate: Math.round((count / (testCountMap[test] || 1)) * 100),
      }))
      .filter((t) => t.total >= 2)
      .sort((a, b) => b.passRate - a.passRate)
      .slice(0, 5);

    const totalDiag = totalPass + totalFail;
    const passRate = totalDiag > 0 ? Math.round((totalPass / totalDiag) * 100) : 100;

    // First-Time Fix Rate: tickets whose every before-repair Fail component
    // passed in post-repair QA (afterDiagnostics). Computed from real QA data
    // instead of a static estimate, so it syncs with the QA tab. Only tickets
    // that actually went through QA count — pending QA doesn't penalize the rate.
    let ftfTickets = 0;
    let ftfPassed = 0;
    filteredWorkOrders.forEach((wo) => {
      const before = get21Diagnostics(wo.beforeDiagnostics, wo.symptomsReported, wo.intakeChecklist);
      const failedBefore = before.filter((d) => d.status === 'Fail');
      if (failedBefore.length === 0) return;
      const after = get21AfterDiagnostics(wo.afterDiagnostics, wo.beforeDiagnostics, wo.symptomsReported, wo.intakeChecklist);
      // Skip tickets that never went through post-repair QA.
      const hasQaResults = (wo.afterDiagnostics || []).some((d) => d.status === 'Pass' || d.status === 'Fail');
      if (!hasQaResults) return;
      const afterMap = new Map(after.map((d) => [d.name, d.status]));
      ftfTickets += 1;
      const allFixed = failedBefore.every((d) => afterMap.get(d.name) === 'Pass');
      if (allFixed) ftfPassed += 1;
    });
    const firstTimeFixRate = ftfTickets > 0 ? Math.round((ftfPassed / ftfTickets) * 100) : null;

    return {
      totalPass,
      totalFail,
      totalNA,
      passRate,
      topFailingTests,
      topPerformingTests,
      firstTimeFixRate,
      ftfTickets,
      ftfPassed,
    };
  }, [filteredWorkOrders]);

  // Financial Analytics
  const financialAnalytics = useMemo(() => {
    let totalCollected = 0;
    let totalUnpaidBalance = 0;
    let paidCount = 0;
    let unpaidCount = 0;

    filteredWorkOrders.forEach((wo) => {
      const total = wo.subtotal || wo.totalAmount || 0;
      const paid = wo.depositPaid || 0;
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

  return (
    <div className="space-y-3">
      {/* Top Dashboard Navigation Subtabs Bar */}
      <div className="bg-[#F5F5F7] p-1.5 rounded-2xl border border-[#E5E5EA] flex items-center space-x-1.5 overflow-x-auto no-scrollbar w-full text-xs shadow-2xs">
        {/* Subtab 1: Status Queue */}
        <button
          type="button"
          role="tab"
          aria-selected={activeDashboardSubTab === 'status-queue'}
          onClick={() => setActiveDashboardSubTab('status-queue')}
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
          aria-selected={activeDashboardSubTab === 'repair-data'}
          onClick={() => setActiveDashboardSubTab('repair-data')}
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

        {/* Subtab 3: Assign Technician KPI */}
        <button
          type="button"
          role="tab"
          aria-selected={activeDashboardSubTab === 'tech-kpi'}
          onClick={() => setActiveDashboardSubTab('tech-kpi')}
          className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center space-x-2 shrink-0 cursor-pointer border select-none active:scale-95 ${
            activeDashboardSubTab === 'tech-kpi'
              ? 'bg-[#0071E3] text-white border-[#0071E3] shadow-xs'
              : 'bg-white hover:bg-slate-100 text-[#6E6E73] hover:text-[#1D1D1F] border-[#E5E5EA]'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Assign Technician KPI</span>
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
            activeDashboardSubTab === 'tech-kpi'
              ? 'bg-white/20 text-white'
              : 'bg-[#E5E5EA] text-[#1D1D1F]'
          }`}>
            {technicians.length} Staff
          </span>
        </button>

        {/* Subtab 4: Technician Leaderboard */}
        <button
          type="button"
          role="tab"
          aria-selected={activeDashboardSubTab === 'leaderboard'}
          onClick={() => setActiveDashboardSubTab('leaderboard')}
          className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center space-x-2 shrink-0 cursor-pointer border select-none active:scale-95 ${
            activeDashboardSubTab === 'leaderboard'
              ? 'bg-[#0071E3] text-white border-[#0071E3] shadow-xs'
              : 'bg-white hover:bg-slate-100 text-[#6E6E73] hover:text-[#1D1D1F] border-[#E5E5EA]'
          }`}
        >
          <Trophy className="w-4 h-4" />
          <span>Leaderboard</span>
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
            activeDashboardSubTab === 'leaderboard'
              ? 'bg-white/20 text-white'
              : 'bg-[#E5E5EA] text-[#1D1D1F]'
          }`}>
            July 2026
          </span>
        </button>

        {/* Subtab 5: Inventory */}
        <button
          type="button"
          role="tab"
          aria-selected={activeDashboardSubTab === 'inventory'}
          onClick={() => setActiveDashboardSubTab('inventory')}
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
          aria-selected={activeDashboardSubTab === 'finance'}
          onClick={() => setActiveDashboardSubTab('finance')}
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
          aria-selected={activeDashboardSubTab === 'warranty-watch'}
          onClick={() => setActiveDashboardSubTab('warranty-watch')}
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

      {/* Queue summary cards belong only to the Status Queue view. */}
      {activeDashboardSubTab === 'status-queue' && (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
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
              {inRepair.length} In Progress
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
      </div>
      )}

      {/* SUBTAB 1: STATUS QUEUE */}
      {activeDashboardSubTab === 'status-queue' && (
        <div className="space-y-6">
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
                      <th className="py-2.5 px-3">Symptoms / Service</th>
                      <th className="py-2.5 px-3">Assigned Tech</th>
                      <th className="py-2.5 px-3">Priority</th>
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
                          <td className="py-3 px-3">
                            <p className="text-xs text-[#1D1D1F] line-clamp-1 max-w-[180px]" title={wo.symptomsReported || wo.serviceType}>
                              {wo.symptomsReported || wo.serviceType || 'General Repair'}
                            </p>
                          </td>

                          {/* Assigned Tech */}
                          <td className="py-3 px-3">
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
                          <td className="py-3 px-3">
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
        <div className="space-y-6">
          {/* 21-Point Hardware Diagnostic Pass/Fail Executive Analytics */}
          <div className="bg-white border border-[#E5E5EA] rounded-2xl p-5 shadow-2xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-[#E5E5EA]">
              <div className="space-y-0.5">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-[#0071E3]/10 text-[#0071E3] rounded-xl border border-[#0071E3]/20">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-extrabold text-[#1D1D1F]">
                    21-Point Hardware Diagnostic Analytics
                  </h3>
                </div>
                <p className="text-xs text-[#86868B]">
                  Component pass/fail diagnostics telemetry across all incoming and outgoing repair tickets
                </p>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                <span className="text-xs font-extrabold bg-emerald-50 text-emerald-700 px-3.5 py-1.5 rounded-full border border-emerald-200 flex items-center space-x-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{diagnostic21Analytics.passRate}% Pass Rate</span>
                </span>
              </div>
            </div>

            {/* Diagnostic Ratio Visual Bar */}
            <div className="space-y-2 bg-[#F8FBFD] p-3.5 rounded-xl border border-[#D8E5ED]">
              <div className="flex items-center justify-between text-xs font-mono font-extrabold">
                <span className="text-emerald-700 flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>Passed Components: {diagnostic21Analytics.totalPass}</span>
                </span>
                <span className="text-rose-600 flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                  <span>Failed Components: {diagnostic21Analytics.totalFail}</span>
                </span>
                <span className="text-slate-500 flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                  <span>Not Tested: {diagnostic21Analytics.totalNA}</span>
                </span>
              </div>
              <div className="w-full h-3 bg-[#E5E5EA] rounded-full overflow-hidden p-0.5 flex space-x-0.5">
                <div 
                  className="h-full bg-emerald-500 rounded-l-full transition-all duration-500" 
                  style={{ width: `${Math.max(5, diagnostic21Analytics.passRate)}%` }} 
                />
                <div 
                  className="h-full bg-rose-500 rounded-r-full transition-all duration-500" 
                  style={{ width: `${Math.max(0, 100 - diagnostic21Analytics.passRate)}%` }} 
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              <div className="p-4 bg-emerald-50/50 border border-emerald-200/80 rounded-xl text-center space-y-1">
                <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Total Passed Components</p>
                <p className="text-3xl font-extrabold text-emerald-600 font-mono">{diagnostic21Analytics.totalPass}</p>
                <p className="text-[11px] text-emerald-700 font-medium">Verified healthy hardware modules</p>
              </div>

              <div className="p-4 bg-rose-50/50 border border-rose-200/80 rounded-xl text-center space-y-1">
                <p className="text-xs font-bold text-rose-800 uppercase tracking-wider">Total Failed Components</p>
                <p className="text-3xl font-extrabold text-rose-600 font-mono">{diagnostic21Analytics.totalFail}</p>
                <p className="text-[11px] text-rose-700 font-medium">Flagged for repair or replacement</p>
              </div>

              <div className="p-4 bg-blue-50/50 border border-blue-200/80 rounded-xl text-center space-y-1">
                <p className="text-xs font-bold text-blue-800 uppercase tracking-wider">First-Time Fix Rate</p>
                <p className="text-3xl font-extrabold text-[#0071E3] font-mono">
                  {diagnostic21Analytics.firstTimeFixRate === null ? '—' : `${diagnostic21Analytics.firstTimeFixRate}%`}
                </p>
                <p className="text-[11px] text-blue-700 font-medium">
                  {diagnostic21Analytics.ftfTickets > 0
                    ? `${diagnostic21Analytics.ftfPassed}/${diagnostic21Analytics.ftfTickets} tickets — failed components passed post-repair QA`
                    : 'Awaiting post-repair QA results'}
                </p>
              </div>
            </div>

            {/* Top Failing Component List */}
            {diagnostic21Analytics.topFailingTests.length > 0 && (
              <div className="pt-2 space-y-2 border-t border-[#E5E5EA]">
                <h4 className="text-xs font-extrabold text-[#1D1D1F] uppercase tracking-wider flex items-center space-x-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                  <span>Top Failing Hardware Components</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                  {diagnostic21Analytics.topFailingTests.map(({ test, count }) => (
                    <div key={test} className="p-2.5 bg-rose-50/70 border border-rose-200 rounded-xl space-y-0.5 text-center">
                      <p className="font-extrabold text-xs text-rose-900 capitalize truncate">{test}</p>
                      <p className="text-xs font-bold text-rose-600 font-mono">{count} Flagged Failures</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Top Performing Component List — mirrors the QA tab's healthy modules */}
            {diagnostic21Analytics.topPerformingTests.length > 0 && (
              <div className="pt-2 space-y-2 border-t border-[#E5E5EA]">
                <h4 className="text-xs font-extrabold text-[#1D1D1F] uppercase tracking-wider flex items-center space-x-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Top Performing Hardware Components</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                  {diagnostic21Analytics.topPerformingTests.map(({ test, passRate, count, total }) => (
                    <div key={test} className="p-2.5 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-0.5 text-center">
                      <p className="font-extrabold text-xs text-emerald-900 capitalize truncate">{test}</p>
                      <p className="text-xs font-bold text-emerald-600 font-mono">{passRate}% pass ({count}/{total})</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Service Mix & Device Family Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Service Category Breakdown */}
            <div className="bg-white border border-[#E5E5EA] rounded-2xl p-5 shadow-xs space-y-4">
              <h3 className="text-sm font-extrabold text-[#1D1D1F] flex items-center space-x-2">
                <BarChart3 className="w-4 h-4 text-[#0071E3]" />
                <span>Service Category Revenue Mix</span>
              </h3>

              <div className="space-y-3">
                {serviceCategoryAnalytics.map((item) => {
                  const IconComp = item.icon;
                  return (
                    <div key={item.id} className="p-3 bg-[#F8F9FA] border border-[#E5E5EA] rounded-xl space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-2">
                          <div className={`p-1.5 rounded-md ${item.bgLight} ${item.textCol}`}>
                            <IconComp className="w-3.5 h-3.5" />
                          </div>
                          <span className="font-extrabold text-[#1D1D1F]">{item.label}</span>
                        </div>
                        <span className="font-mono font-bold text-[#1D1D1F]">{item.revenue.toLocaleString()} MMK</span>
                      </div>
                      <div className="w-full bg-[#E5E5EA] rounded-full h-2 overflow-hidden">
                        <div className={`h-full rounded-full ${item.color}`} style={{ width: `${Math.max(8, item.percentage)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Device Family Breakdown */}
            <div className="bg-white border border-[#E5E5EA] rounded-2xl p-5 shadow-xs space-y-4">
              <h3 className="text-sm font-extrabold text-[#1D1D1F] flex items-center space-x-2">
                <Smartphone className="w-4 h-4 text-[#AF52DE]" />
                <span>Device Model Distribution</span>
              </h3>

              <div className="grid grid-cols-2 gap-3">
                {deviceFamilyAnalytics.map((dev) => (
                  <div key={dev.name} className="p-3 bg-[#F8F9FA] border border-[#E5E5EA] rounded-xl space-y-1">
                    <p className="text-[10px] font-bold text-[#86868B] truncate">{dev.name}</p>
                    <p className="text-base font-extrabold text-[#1D1D1F]">{dev.count} Repairs</p>
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-[#86868B] font-mono">{dev.revenue.toLocaleString()} MMK</span>
                      <span className={`font-bold ${dev.textCol}`}>{dev.percentage}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 3: ASSIGN TECHNICIAN KPI */}
      {activeDashboardSubTab === 'tech-kpi' && (
        <div className="space-y-6">
          {/* Workload Balancer Widget */}
          <div className="bg-white border border-[#E5E5EA] rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E5E5EA]">
              <div className="space-y-0.5">
                <div className="flex items-center space-x-2">
                  <div className="p-1.5 bg-[#F0F6FF] text-[#0071E3] rounded-lg">
                    <Scale className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-[#1D1D1F]">
                    Technician Workload & Queue Balancer
                  </h3>
                  <span className="text-[10px] bg-[#0071E3]/10 text-[#0071E3] font-mono font-bold px-2 py-0.5 rounded-full border border-[#0071E3]/20">
                    {totalActiveTechJobs} Active Jobs In Queue
                  </span>
                </div>
              </div>

              <button
                onClick={() => onNavigateToTab('pipeline')}
                className="px-3.5 py-1.5 bg-[#F5F5F7] hover:bg-[#E5E5EA] text-[#0071E3] font-bold text-xs rounded-xl border border-[#E5E5EA] flex items-center space-x-1.5 transition-all shrink-0 cursor-pointer"
              >
                <span>Pipeline Queue</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Technician Capacity Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {techQueueData.map(({ tech, activeCount, inProgressCount, receiveCount, pendingCount, loadPercent, loadBadge }) => (
                <div
                  key={tech.id}
                  className="p-3.5 bg-[#F8F9FA] border border-[#E5E5EA] rounded-xl space-y-2.5 shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-purple-100 text-[#AF52DE] font-bold text-xs flex items-center justify-center shrink-0">
                        {tech.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-xs text-[#1D1D1F] truncate">{tech.name}</h4>
                        <p className="text-[10px] text-[#86868B] truncate">{tech.level}</p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border shrink-0 ${loadBadge.color}`}>
                      {loadBadge.label}
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between pt-1">
                    <span className="text-xl font-extrabold text-[#1D1D1F]">{activeCount} Active</span>
                    <span className="text-[10px] text-[#86868B] font-mono">{loadPercent}% Capacity</span>
                  </div>

                  <div className="w-full bg-[#E5E5EA] rounded-full h-1.5 overflow-hidden">
                    <div className="h-full bg-[#0071E3] rounded-full" style={{ width: `${Math.max(8, loadPercent)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Full Technician Performance Tab Component */}
          <TechnicianPerformanceTab
            technicians={technicians}
            workOrders={filteredWorkOrders}
            onNavigateToTab={onNavigateToTab}
          />
        </div>
      )}

      {/* SUBTAB 4: TECHNICIAN LEADERBOARD */}
      {activeDashboardSubTab === 'leaderboard' && (
        <TechnicianLeaderboardView
          technicians={technicians}
          workOrders={filteredWorkOrders}
          onNavigateToTab={onNavigateToTab}
        />
      )}

      {/* SUBTAB 5: INVENTORY */}
      {activeDashboardSubTab === 'inventory' && (
        <div className="space-y-6">
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
        <div className="space-y-6">
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
        <div className="space-y-6">
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
                <button
                  type="button"
                  onClick={() => {
                    const btn = document.getElementById('warranty-scan-trigger');
                    if (btn) {
                      btn.innerText = 'Scanning...';
                      setTimeout(() => { btn.innerText = 'Scan Complete'; setTimeout(() => { btn.innerText = 'Run Re-Scan'; }, 1500); }, 600);
                    }
                  }}
                  id="warranty-scan-trigger"
                  className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white font-extrabold text-xs rounded-xl border border-white/20 transition-all flex items-center space-x-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Run Re-Scan</span>
                </button>
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
                        <th className="py-2.5 px-3">Warranty Dates</th>
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

                            <td className="py-3 px-3 text-[11px]">
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
    </div>
  );
};
