import React, { useState, useMemo, forwardRef, useImperativeHandle } from 'react';

import {
  Coins, AlertTriangle, CheckCircle2, Clock, TrendingUp,
  Users, BarChart3, Smartphone, Activity, Zap,
  ShieldCheck, ShieldAlert, Check, ArrowUpRight,
  ClipboardList, Copy, Search, RefreshCw, X
} from 'lucide-react';
import { WorkOrder, Technician, WorkOrderStatus } from '../../types';
import { toast } from '../../lib/toast';
import { DateFilterState, filterByDateRange } from '../common/DateFilterSelector';
import {
  Card as AntCard, Statistic, Space, Table, Tag, Tabs, Row, Col,
  Typography, theme
} from 'antd';
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { TechnicianPerformanceTab } from './TechnicianPerformanceTab';
import { TechnicianLeaderboardView } from './TechnicianLeaderboardView';
import { TechnicianDetailModal } from './TechnicianDetailModal';
import { computeTechStats, getDurationHours } from '../../utils/techAnalytics';

const { Text, Title } = Typography;

interface DashboardAntdProps {
  workOrders: WorkOrder[];
  parts: never[];
  technicians: Technician[];
  onNavigateToTab: (tab: string) => void;
  dateFilter?: DateFilterState;
  setDateFilter?: (filter: DateFilterState) => void;
  currencySymbol?: string;
  activeSubTab?: 'status-queue' | 'repair-data' | 'tech-kpi' | 'finance' | 'warranty-watch';
  onSubTabChange?: (tab: 'status-queue' | 'repair-data' | 'tech-kpi' | 'finance' | 'warranty-watch') => void;
}

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
              <span className="font-bold text-brand-deep">{(payload[0]?.value ?? 0).toLocaleString()} {currencySymbol}</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-success" />
              <span className="text-muted">Repairs:</span>
              <span className="font-bold text-success-deep">{payload[1]?.value ?? 0}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-64 mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 10, right: 10, left: -12, bottom: 5 }}>
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

function KpiCard({
  label,
  value,
  valueClass = '#1D1D1F',
  footer,
  footerClass = 'text-muted',
  footerIcon,
  prefix,
}: {
  label: string;
  value: string;
  valueClass?: string;
  footer: string;
  footerClass?: string;
  footerIcon?: React.ReactNode;
  prefix?: React.ReactNode;
}) {
  return (
    <AntCard size="small" style={{ borderRadius: 16, height: '100%' }}>
      <Statistic
        title={
          <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#616161' }}>
            {label}
          </span>
        }
        value={value}
        valueStyle={{
          fontSize: 24,
          fontWeight: 900,
          color: valueClass,
          fontFamily: "'IBM Plex Mono', monospace",
        }}
        prefix={prefix}
      />
      <div style={{ marginTop: 4, fontSize: 11, color: footerClass === 'text-muted' ? '#616161' : footerClass }}>
        <Space size={4}>
          {footerIcon}
          <span>{footer}</span>
        </Space>
      </div>
    </AntCard>
  );
}

export interface DashboardAntdHandle {
  setSubTab: (tab: 'status-queue' | 'repair-data' | 'tech-kpi' | 'finance' | 'warranty-watch') => void;
}

export const DashboardAntd = forwardRef<DashboardAntdHandle, DashboardAntdProps>(({
  workOrders,
  technicians,
  onNavigateToTab,
  currencySymbol,
  dateFilter: externalDateFilter,
  activeSubTab,
  onSubTabChange,
}: DashboardAntdProps, ref) => {
  const { token } = theme.useToken();
  const currency = currencySymbol || 'MMK';
  const [internalDateFilter] = useState<DateFilterState>({ preset: 'all' });
  const dateFilter = externalDateFilter || internalDateFilter;

  const [internalSubTab, setInternalSubTab] = useState<'status-queue' | 'repair-data' | 'tech-kpi' | 'finance' | 'warranty-watch'>('status-queue');
  const activeDashboardSubTab = activeSubTab || internalSubTab;
  const setActiveDashboardSubTab = (tab: typeof activeDashboardSubTab) => {
    if (onSubTabChange) {
      onSubTabChange(tab);
    } else {
      setInternalSubTab(tab);
    }
  };

  useImperativeHandle(ref, () => ({
    setSubTab: (tab) => setActiveDashboardSubTab(tab),
  }));

  const [detailTechId, setDetailTechId] = useState<string | null>(null);
  const detailTech = detailTechId ? technicians.find((t) => t.id === detailTechId) || null : null;

  const [copiedNoticeId, setCopiedNoticeId] = useState<string | null>(null);
  const [warrantySearchQuery, setWarrantySearchQuery] = useState<string>('');
  const [warrantyFilterTab, setWarrantyFilterTab] = useState<'ALL_EXPIRING' | 'CRITICAL' | 'WARNING' | 'EXPIRED' | 'ALL'>('ALL_EXPIRING');

  const warrantyCheckData = useMemo(() => {
    const now = Date.now();
    const ONE_DAY_MS = 1000 * 60 * 60 * 24;

    return workOrders
      .filter((wo) => wo.status === 'Finished' || wo.status === 'Taken Out')
      .map((wo) => {
        const warrantyDays = wo.warrantyDays ?? 90;
        if (warrantyDays <= 0) return null;

        const startDateMs = new Date(wo.completedAt || wo.createdAt).getTime();
        if (isNaN(startDateMs)) return null;

        const expiryDateMs = startDateMs + (warrantyDays * ONE_DAY_MS);
        const remainingDays = Math.floor((expiryDateMs - now) / ONE_DAY_MS);
        const daysElapsed = Math.floor((now - startDateMs) / ONE_DAY_MS);
        const percentElapsed = Math.min(100, Math.max(0, Math.round((daysElapsed / warrantyDays) * 100)));

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
    navigator.clipboard.writeText(msg)
      .then(() => {
        setCopiedNoticeId(item.wo.id);
        setTimeout(() => setCopiedNoticeId(null), 3000);
      })
      .catch(() => toast.error('Copy failed — please copy manually'));
  };

  const filteredWorkOrders = useMemo(() => {
    return filterByDateRange<WorkOrder>(workOrders, dateFilter);
  }, [workOrders, dateFilter]);

  const REVENUE_STATUSES: WorkOrderStatus[] = ['Finished', 'Taken Out'];
  const revenueWorkOrders = useMemo(
    () => filteredWorkOrders.filter((w) => REVENUE_STATUSES.includes(w.status)),
    [filteredWorkOrders]
  );

  const totalRevenue = useMemo(() => {
    return revenueWorkOrders.reduce((sum, wo) => sum + (wo.totalAmount || wo.subtotal || 0), 0);
  }, [revenueWorkOrders]);

  const totalPartsCost = useMemo(() => {
    return revenueWorkOrders.reduce((sum, wo) => {
      const lineItems = wo.lineItems || [];
      return sum + lineItems.reduce((c, li) => c + (li.unitCost || 0) * (li.quantity || 1), 0);
    }, 0);
  }, [revenueWorkOrders]);

  const totalMargin = totalRevenue - totalPartsCost;
  const marginPercent = totalRevenue > 0 ? Math.round((totalMargin / totalRevenue) * 100) : 0;
  const avgTicketValue = revenueWorkOrders.length > 0 ? Math.round(totalRevenue / revenueWorkOrders.length) : 0;

  const completedWorkOrders = filteredWorkOrders.filter((w) => w.status === 'Finished' || w.status === 'Taken Out');
  let avgTurnaroundHours = 0;
  if (completedWorkOrders.length > 0) {
    const totalHours = completedWorkOrders.reduce((acc, wo) => {
      const h = getDurationHours(wo);
      return acc + (h ?? 0);
    }, 0);
    avgTurnaroundHours = Number((totalHours / completedWorkOrders.length).toFixed(1));
  }

  const activeRepairs = filteredWorkOrders.filter((w) => w.status !== 'Taken Out' && w.status !== 'Finished' && w.status !== 'Cant Repair' && w.status !== 'Customer Not Repair');
  const readyForPickup = filteredWorkOrders.filter((w) => w.status === 'Finished');

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

  const topRepairDevices = useMemo(() => {
    const byModel = new Map<string, { count: number; revenue: number }>();
    filteredWorkOrders.forEach((wo) => {
      const isRevenue = REVENUE_STATUSES.includes(wo.status);
      const model = (wo.deviceModel || 'Unknown Device').trim() || 'Unknown Device';
      const entry = byModel.get(model) || { count: 0, revenue: 0 };
      entry.count += 1;
      if (isRevenue) entry.revenue += wo.totalAmount || wo.subtotal || 0;
      byModel.set(model, entry);
    });
    return Array.from(byModel.entries())
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.count - a.count || b.revenue - a.revenue)
      .slice(0, 8);
  }, [filteredWorkOrders]);

  const topRepairCategories = useMemo(() => {
    const revOrders = filteredWorkOrders.filter((wo) => REVENUE_STATUSES.includes(wo.status));
    const totalRev = revOrders.reduce((sum, wo) => sum + (wo.totalAmount || wo.subtotal || 0), 0);
    const stats = [
      { id: 'screen', label: 'Screen & Display OLED', icon: Smartphone, color: 'var(--color-brand)', textCol: 'var(--color-brand)', bgLight: '#f0f5ff', count: 0, revenue: 0 },
      { id: 'battery', label: 'Battery & Charging System', icon: Zap, color: '#52c41a', textCol: '#52c41a', bgLight: '#f6ffed', count: 0, revenue: 0 },
      { id: 'board', label: 'Logic Board & Micro-Soldering', icon: Activity, color: '#722ed1', textCol: '#722ed1', bgLight: '#f9f0ff', count: 0, revenue: 0 },
      { id: 'housing', label: 'Glass, Port, Camera & Housing', icon: Smartphone, color: '#faad14', textCol: '#faad14', bgLight: '#fffbe6', count: 0, revenue: 0 },
    ];

    filteredWorkOrders.forEach((wo) => {
      const s = (wo.serviceType || '').toLowerCase();
      const desc = (wo.symptomsReported || '').toLowerCase();
      const repairs = (wo.selectedRepairs || []).map((r) => r.name).join(' ').toLowerCase();
      const hay = `${s} ${desc} ${repairs}`;
      const rev = REVENUE_STATUSES.includes(wo.status) ? (wo.totalAmount || wo.subtotal || 0) : 0;

      if (hay.includes('display') || hay.includes('oled') || hay.includes('screen') || hay.includes('cracked')) {
        stats[0].count += 1;
        stats[0].revenue += rev;
      } else if (hay.includes('battery') || hay.includes('charging') || hay.includes('charge') || hay.includes('power')) {
        stats[1].count += 1;
        stats[1].revenue += rev;
      } else if (hay.includes('board') || hay.includes('soldering') || hay.includes('ic') || hay.includes('micro') || hay.includes('short') || hay.includes('wifi') || hay.includes('baseband') || hay.includes('network')) {
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
        percentage: totalRev > 0 ? Math.round((st.revenue / totalRev) * 100) : 0,
      }))
      .filter((st) => st.count > 0)
      .sort((a, b) => b.revenue - a.revenue);
  }, [filteredWorkOrders]);

  const financialAnalytics = useMemo(() => {
    let totalCollected = 0;
    let totalUnpaidBalance = 0;
    let paidCount = 0;
    let unpaidCount = 0;

    filteredWorkOrders.forEach((wo) => {
      const total = wo.totalAmount || wo.subtotal || 0;
      if (total <= 0) return;
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

  const unpaidRecoveryTickets = useMemo(() => {
    return filteredWorkOrders
      .map((wo) => {
        const total = wo.totalAmount || wo.subtotal || 0;
        if (total <= 0) return null;
        const paid = wo.isPaid ? total : (wo.paidAmount || wo.depositAmount || 0);
        const balance = Math.max(0, total - paid);
        if (balance <= 0) return null;
        const openAt = wo.updatedAt || wo.createdAt || '';
        const daysOpen = openAt ? Math.max(0, Math.floor((Date.now() - new Date(openAt).getTime()) / 86400000)) : null;
        return { wo, balance, daysOpen };
      })
      .filter((x): x is { wo: WorkOrder; balance: number; daysOpen: number | null } => x !== null)
      .sort((a, b) => b.balance - a.balance);
  }, [filteredWorkOrders]);

  // ===== Revenue & Repairs Trend =====
  const DAY_MS = 1000 * 60 * 60 * 24;
  const trendSeries = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayStartMs = todayStart.getTime();
    const endOfTodayMs = todayStartMs + DAY_MS - 1;

    let windowStartMs: number;
    if (!dateFilter || dateFilter.preset === 'all') {
      const oldest = workOrders.reduce((min, wo) => {
        const t = new Date(wo.createdAt || Date.now()).getTime();
        return isNaN(t) ? min : Math.min(min, t);
      }, todayStartMs);
      windowStartMs = oldest;
    } else if (dateFilter.preset === 'today') windowStartMs = todayStartMs;
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
      const rev = isRevenueStatus(wo.status) ? wo.totalAmount || wo.subtotal || 0 : 0;
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

  const cardStyle: React.CSSProperties = {
    borderRadius: 16,
    cursor: 'pointer',
  };

  const priorityBtnStyle = (borderColor: string, bgColor: string): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    borderRadius: 16,
    border: `1px solid ${borderColor}`,
    background: bgColor,
    padding: '10px 14px',
    cursor: 'pointer',
    minHeight: 44,
    width: '100%',
  });

  const warrantyColumns: any[] = [
    {
      title: 'Ticket #',
      dataIndex: 'wo',
      key: 'ticket',
      width: 140,
      render: (wo: WorkOrder) => (
        <div>
          <Text strong style={{ fontFamily: "'IBM Plex Mono', monospace", color: token.colorPrimary }}>
            {wo.orderNumber}
          </Text>
          <br />
          <Text type="secondary" style={{ fontSize: 11 }}>{wo.status}</Text>
        </div>
      ),
    },
    {
      title: 'Customer & Contact',
      dataIndex: 'wo',
      key: 'customer',
      width: 180,
      render: (wo: WorkOrder) => (
        <div>
          <Text strong>{wo.customerName}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 11 }}>{wo.customerPhone}</Text>
        </div>
      ),
    },
    {
      title: 'Device & Serial',
      dataIndex: 'wo',
      key: 'device',
      width: 170,
      render: (wo: WorkOrder) => (
        <div>
          <Text>{wo.deviceModel}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 11, fontFamily: "'IBM Plex Mono', monospace" }}>
            SN: {wo.serialNumber || 'N/A'}
          </Text>
        </div>
      ),
    },
    {
      title: 'Warranty Dates',
      key: 'dates',
      width: 200,
      responsive: ['md' as const],
      render: (_: unknown, record: { startDateFormatted: string; expiryDateFormatted: string }) => (
        <div style={{ fontSize: 12 }}>
          <Text type="secondary">Start: <Text>{record.startDateFormatted}</Text></Text>
          <br />
          <Text type="secondary">Expires: <Text style={{ color: '#ff4d4f' }}>{record.expiryDateFormatted}</Text></Text>
        </div>
      ),
    },
    {
      title: '90-Day Elapsed',
      key: 'elapsed',
      width: 160,
      render: (_: unknown, record: { daysElapsed: number; percentElapsed: number; remainingDays: number }) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: token.colorTextSecondary }}>
            <span>{record.daysElapsed} days</span>
            <span>{record.percentElapsed}%</span>
          </div>
          <div style={{
            width: '100%', height: 6, borderRadius: 3,
            background: token.colorBorderSecondary, overflow: 'hidden'
          }}>
            <div style={{
              height: '100%', borderRadius: 3,
              width: `${record.percentElapsed}%`,
              background: record.remainingDays <= 3 ? '#ff4d4f'
                : record.remainingDays <= 14 ? '#faad14'
                : '#52c41a',
            }} />
          </div>
        </div>
      ),
    },
    {
      title: 'Warranty Health',
      key: 'health',
      width: 200,
      render: (_: unknown, record: { isCritical: boolean; isWarning: boolean; isExpired: boolean; isActive: boolean; remainingDays: number; expiryDateFormatted: string }) => {
        if (record.isCritical) {
          return <Tag icon={<Clock size={12} />} color="error">Critical: {record.remainingDays}d Left</Tag>;
        }
        if (record.isWarning) {
          return <Tag icon={<Clock size={12} />} color="warning">Nearing Expiry: {record.remainingDays}d Left</Tag>;
        }
        if (record.isExpired) {
          return <Tag>Expired {record.expiryDateFormatted}</Tag>;
        }
        return <Tag icon={<ShieldCheck size={12} />} color="success">Protected ({record.remainingDays}d Left)</Tag>;
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 180,
      render: (_: unknown, record: { wo: { id: string } }) => {
        const isCopied = copiedNoticeId === record.wo.id;
        return (
          <Space>
            <button
              type="button"
              onClick={() => handleCopyWarrantyCourtesyMessage(record as any)}
              style={{
                padding: '4px 10px',
                fontSize: 11,
                fontWeight: 700,
                borderRadius: 8,
                border: '1px solid',
                borderColor: isCopied ? '#52c41a' : token.colorBorderSecondary,
                background: isCopied ? '#52c41a' : token.colorBgContainer,
                color: isCopied ? '#fff' : token.colorPrimary,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontFamily: 'inherit',
              }}
              title="Copy Customer Warranty Courtesy SMS/Notice"
            >
              {isCopied ? <Check size={12} /> : <Copy size={12} />}
              {isCopied ? 'Copied Notice' : 'Copy Notice'}
            </button>
            <button
              type="button"
              onClick={() => onNavigateToTab('crm')}
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                border: '1px solid',
                borderColor: token.colorBorderSecondary,
                background: token.colorBgContainer,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              title="Open Customer Dossier in CRM"
              aria-label="Open customer dossier in CRM"
            >
              <Users size={14} />
            </button>
          </Space>
        );
      },
    },
  ];

  const subTabItems = [
    {
      key: 'status-queue',
      label: 'Status Queue',
      children: (
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}>
            <AntCard
              size="small"
              hoverable
              onClick={() => setActiveDashboardSubTab('status-queue')}
              style={cardStyle}
            >
              <Statistic
                title={<Text type="secondary" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active Repairs</Text>}
                value={activeRepairs.length}
                valueStyle={{ fontSize: 28, fontWeight: 900, color: token.colorText }}
                prefix={<ClipboardList size={20} style={{ color: token.colorPrimary }} />}
              />
            </AntCard>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <AntCard
              size="small"
              hoverable
              onClick={() => setActiveDashboardSubTab('status-queue')}
              style={cardStyle}
            >
              <Statistic
                title={<Text type="secondary" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ready for Pickup</Text>}
                value={readyForPickup.length}
                valueStyle={{ fontSize: 28, fontWeight: 900, color: '#52c41a' }}
                prefix={<CheckCircle2 size={20} style={{ color: '#52c41a' }} />}
              />
            </AntCard>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <AntCard
              size="small"
              hoverable
              onClick={() => setActiveDashboardSubTab('finance')}
              style={cardStyle}
            >
              <Statistic
                title={<Text type="secondary" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Revenue</Text>}
                value={`${totalRevenue.toLocaleString()} ${currency}`}
                valueStyle={{ fontSize: 22, fontWeight: 900, color: token.colorText }}
                prefix={<Coins size={20} style={{ color: token.colorPrimary }} />}
              />
            </AntCard>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <AntCard
              size="small"
              hoverable
              onClick={() => setActiveDashboardSubTab('tech-kpi')}
              style={cardStyle}
            >
              <Statistic
                title={<Text type="secondary" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Avg Turnaround</Text>}
                value={avgTurnaroundHours > 0
                  ? avgTurnaroundHours >= 24
                    ? `${(avgTurnaroundHours / 24).toFixed(1)}d`
                    : `${avgTurnaroundHours}h`
                  : '\u2014'}
                valueStyle={{ fontSize: 28, fontWeight: 900, color: token.colorText }}
              />
            </AntCard>
          </Col>
        </Row>
      ),
    },
    {
      key: 'repair-data',
      label: 'Repair Data',
      children: (
        <Row gutter={[16, 16]}>
          <Col xs={24} xl={12}>
            <AntCard
              title={
                <Space>
                  <Smartphone size={16} style={{ color: '#722ed1' }} />
                  <Text strong style={{ fontSize: 12 }}>Top Repair Devices</Text>
                </Space>
              }
              extra={<Tag color="default">{topRepairDevices.length} Models</Tag>}
              style={{ borderRadius: 16 }}
            >
              {topRepairDevices.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center' }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>No repair tickets in the selected date range.</Text>
                </div>
              ) : (
                topRepairDevices.map((dev, idx) => {
                  const maxCount = topRepairDevices[0]?.count || 1;
                  const barPct = Math.max(8, Math.round((dev.count / maxCount) * 100));
                  const medalBg = idx === 0 ? '#faad14' : idx === 2 ? '#faad14' : token.colorBorderSecondary;
                  const medalColor = idx === 0 || idx === 2 ? '#fff' : token.colorTextSecondary;
                  return (
                    <div key={dev.name} style={{ marginBottom: 8, padding: 8, background: token.colorBgLayout, borderRadius: 12, border: `1px solid ${token.colorBorderSecondary}` }}>
                      <Row justify="space-between" align="middle" style={{ marginBottom: 4 }}>
                        <Space>
                          <span style={{
                            width: 22, height: 22, borderRadius: '50%',
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            background: medalBg, color: medalColor,
                            fontSize: 11, fontWeight: 700,
                          }}>
                            {idx + 1}
                          </span>
                          <Text strong style={{ fontSize: 12 }}>{dev.name}</Text>
                        </Space>
                        <Space size={8}>
                          <Text style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700 }}>{dev.count}</Text>
                          <Text style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, color: token.colorPrimary }}>{dev.revenue.toLocaleString()} {currency}</Text>
                        </Space>
                      </Row>
                      <div style={{ width: '100%', height: 6, borderRadius: 3, background: token.colorBorderSecondary, overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: 3, width: `${barPct}%`, background: '#722ed1' }} />
                      </div>
                    </div>
                  );
                })
              )}
            </AntCard>
          </Col>
          <Col xs={24} xl={12}>
            <AntCard
              title={
                <Space>
                  <BarChart3 size={16} style={{ color: token.colorPrimary }} />
                  <Text strong style={{ fontSize: 12 }}>Repair Categories</Text>
                </Space>
              }
              style={{ borderRadius: 16 }}
            >
              {topRepairCategories.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center' }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>No repair tickets in the selected date range.</Text>
                </div>
              ) : (
                topRepairCategories.map((cat) => {
                  const IconComp = cat.icon;
                  const mRevenue = topRepairCategories[0]?.revenue || 1;
                  const barPct = Math.max(8, Math.round((cat.revenue / mRevenue) * 100));
                  const cInfo = CATEGORY_STYLES[cat.id] || { bg: token.colorBgLayout, ic: token.colorTextSecondary, bar: token.colorPrimary };
                  return (
                    <div key={cat.id} style={{ marginBottom: 8, padding: 8, background: token.colorBgLayout, borderRadius: 12, border: `1px solid ${token.colorBorderSecondary}` }}>
                      <Row justify="space-between" align="middle" style={{ marginBottom: 4 }}>
                        <Space>
                          <div style={{ padding: 6, borderRadius: 6, background: cInfo.bg }}>
                            <IconComp size={14} color={cInfo.ic} />
                          </div>
                          <Text strong style={{ fontSize: 12 }}>{cat.label}</Text>
                        </Space>
                        <Tag style={{ borderRadius: 12 }}>{cat.count} Tickets</Tag>
                      </Row>
                      <Row justify="space-between" align="middle" style={{ marginBottom: 4 }}>
                        <Text style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 900, fontSize: 14 }}>{cat.revenue.toLocaleString()} {currency}</Text>
                        <Text style={{ fontWeight: 700, fontSize: 11, color: cInfo.ic }}>{cat.percentage}%</Text>
                      </Row>
                      <div style={{ width: '100%', height: 6, borderRadius: 3, background: token.colorBorderSecondary, overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: 3, width: `${barPct}%`, background: cInfo.bar }} />
                      </div>
                    </div>
                  );
                })
              )}
            </AntCard>
          </Col>
        </Row>
      ),
    },
    {
      key: 'tech-kpi',
      label: 'Tech KPI',
      children: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {isQueueImbalanced && maxLoadTechs.length > 0 && minLoadTechs.length > 0 && (
            <AntCard
              size="small"
              style={{ borderRadius: 12, borderColor: '#faad14' }}
            >
              <Space>
                <AlertTriangle size={14} color="#faad14" />
                <Text style={{ fontWeight: 700, fontSize: 12 }}>
                  Queue imbalanced — reassign 1–2 tickets from {maxLoadTechs.map((t) => t.tech.name).join(' / ')} ({maxTechLoad}) to {minLoadTechs.map((t) => t.tech.name).join(' / ')} ({minTechLoad})
                </Text>
                <Tag color="warning" style={{ fontSize: 11 }}>Load gap: {maxTechLoad - minTechLoad} tickets</Tag>
              </Space>
            </AntCard>
          )}

          <TechnicianPerformanceTab
            technicians={technicians}
            workOrders={filteredWorkOrders}
            onNavigateToTab={onNavigateToTab}
            onOpenTechDetail={(tech) => setDetailTechId(tech.id)}
          />

          <TechnicianLeaderboardView
            technicians={technicians}
            workOrders={filteredWorkOrders}
            onNavigateToTab={onNavigateToTab}
            onOpenTechDetail={(tech) => setDetailTechId(tech.id)}
            periodLabel={trendSeries.windowLabel}
          />
        </div>
      ),
    },
    {
      key: 'finance',
      label: 'Finance',
      children: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} lg={6}>
              <KpiCard
                label="Total Revenue"
                value={`${totalRevenue.toLocaleString()} ${currency}`}
                footer={`${marginPercent}% Gross Profit Margin`}
                footerClass={marginPercent < 0 ? '#ff4d4f' : '#52c41a'}
                footerIcon={marginPercent < 0 ? <AlertTriangle size={12} /> : undefined}
              />
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <KpiCard
                label="Gross Profit (Margin)"
                value={`${totalMargin.toLocaleString()} ${currency}`}
                valueClass="#52c41a"
                footer="Revenue minus parts cost"
              />
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <KpiCard
                label="Total Collected (Paid)"
                value={`${financialAnalytics.totalCollected.toLocaleString()} ${currency}`}
                valueClass={token.colorPrimary}
                footer={`${financialAnalytics.paidCount} Tickets Fully Settled`}
              />
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <KpiCard
                label="Unpaid Pending Balance"
                value={`${financialAnalytics.totalUnpaidBalance.toLocaleString()} ${currency}`}
                valueClass="#ff4d4f"
                footer={`${financialAnalytics.unpaidCount} Tickets Outstanding`}
              />
            </Col>
          </Row>

          {unpaidRecoveryTickets.length > 0 && (
            <AntCard
              title={
                <Space>
                  <div style={{ padding: 8, borderRadius: 12, border: '1px solid #ff4d4f', background: '#fff2f0', display: 'flex' }}>
                    <Coins size={16} color="#ff4d4f" />
                  </div>
                  <div>
                    <Text strong style={{ fontSize: 13 }}>Unpaid Recovery Queue</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 11 }}>Outstanding balances to collect — contact the customer, then settle in POS.</Text>
                  </div>
                </Space>
              }
              extra={
                <Tag color="error" style={{ fontWeight: 700 }}>
                  {unpaidRecoveryTickets.length} tickets · {unpaidRecoveryTickets.reduce((s, t) => s + t.balance, 0).toLocaleString()} {currency}
                </Tag>
              }
              style={{ borderRadius: 16, borderColor: '#ffccc7' }}
            >
              <Table
                dataSource={unpaidRecoveryTickets.slice(0, 12)}
                rowKey={(rec: { wo: { id: string } }) => rec.wo.id}
                pagination={false}
                size="small"
                columns={[
                  { title: 'Ticket', dataIndex: ['wo', 'orderNumber'], key: 'ticket', render: (v: string) => <Text strong style={{ fontFamily: "'IBM Plex Mono', monospace", color: token.colorPrimary }}>{v}</Text> },
                  {
                    title: 'Customer / Device', key: 'customer',
                    render: (_: unknown, r: { wo: WorkOrder }) => (
                      <div>
                        <Text strong style={{ fontSize: 12 }}>{r.wo.customerName}</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: 11 }}>{r.wo.deviceModel}</Text>
                      </div>
                    ),
                  },
                  {
                    title: 'Balance Due', dataIndex: 'balance', key: 'balance', align: 'right',
                    render: (v: number) => <Text strong style={{ fontFamily: "'IBM Plex Mono', monospace", color: '#ff4d4f' }}>{v.toLocaleString()} {currency}</Text>,
                  },
                  {
                    title: 'Days Open', dataIndex: 'daysOpen', key: 'daysOpen',
                    render: (v: number | null) => (
                      v !== null
                        ? <Tag color={v >= 14 ? 'error' : v >= 7 ? 'warning' : 'default'}>{v}d</Tag>
                        : null
                    ),
                  },
                  {
                    title: 'Contact Status', key: 'contact',
                    render: (_: unknown, r: { wo: WorkOrder }) => {
                      const contact = r.wo.followUpStatus || '\u2014';
                      return (
                        <Tag color={
                          contact === 'Satisfied' || contact === 'Closed' ? 'success' :
                          contact === 'Issue Reported' ? 'error' : 'default'
                        }>{contact}</Tag>
                      );
                    },
                  },
                  {
                    title: 'Reminders', key: 'reminders',
                    render: (_: unknown, r: { wo: WorkOrder }) => {
                      const records = (r.wo.followUpRecords || []).length;
                      return <Text style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{records > 0 ? `${records}\u00d7` : '\u2014'}</Text>;
                    },
                  },
                  {
                    title: 'Action', key: 'action', align: 'right',
                    render: (_: unknown) => (
                      <button
                        type="button"
                        onClick={() => onNavigateToTab('pos')}
                        style={{
                          background: token.colorPrimary,
                          color: '#fff',
                          borderRadius: 8,
                          fontWeight: 800,
                          fontSize: 11,
                          padding: '4px 12px',
                          border: 'none',
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                        }}
                        title="Collect balance in POS checkout"
                      >
                        Collect
                      </button>
                    ),
                  },
                ]}
              />
              <div style={{ marginTop: 8 }}>
                <Text type="secondary" style={{ fontSize: 10 }}>Showing top {Math.min(12, unpaidRecoveryTickets.length)} of {unpaidRecoveryTickets.length} unpaid tickets by amount due.</Text>
              </div>
            </AntCard>
          )}

          <AntCard
            title={
              <Space>
                <div style={{ padding: 8, borderRadius: 12, border: `1px solid ${token.colorPrimary}`, background: '#f0f5ff', display: 'flex' }}>
                  <TrendingUp size={16} color={token.colorPrimary} />
                </div>
                <div>
                  <Text strong style={{ fontSize: 13 }}>Revenue & Repairs Trend</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 11 }}>{trendSeries.windowLabel} · {trendSeries.bucketDays === 7 ? 'weekly' : 'daily'} buckets · completed tickets only</Text>
                </div>
              </Space>
            }
            extra={
              <Space size={8} wrap>
                {trendSeries.revenueDeltaPct !== null && (
                  <Tag color={trendSeries.revenueDeltaPct >= 0 ? 'success' : 'error'}>
                    <ArrowUpRight size={10} /> Revenue {trendSeries.revenueDeltaPct >= 0 ? '+' : ''}{trendSeries.revenueDeltaPct}% vs prev period
                  </Tag>
                )}
                {trendSeries.repairsDeltaPct !== null && (
                  <Tag color={trendSeries.repairsDeltaPct >= 0 ? 'success' : 'error'}>
                    <ArrowUpRight size={10} /> Repairs {trendSeries.repairsDeltaPct >= 0 ? '+' : ''}{trendSeries.repairsDeltaPct}% vs prev period
                  </Tag>
                )}
                {trendSeries.revenueDeltaPct === null && (
                  <Tag>No previous-period data</Tag>
                )}
              </Space>
            }
            style={{ borderRadius: 16 }}
          >
            {trendSeries.curRev === 0 && trendSeries.curRep === 0 ? (
              <div style={{ padding: 32, textAlign: 'center' }}>
                <TrendingUp size={24} style={{ opacity: 0.5, margin: '0 auto 8px', display: 'block' }} />
                <Text strong style={{ fontSize: 13 }}>No completed repairs in this period</Text>
                <br />
                <Text type="secondary" style={{ fontSize: 12 }}>Completed (Finished / Taken Out) tickets will appear here.</Text>
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
          </AntCard>

          <AntCard
            title={
              <Space>
                <Coins size={16} color="#52c41a" />
                <Text strong style={{ fontSize: 13 }}>Financial Revenue Intelligence</Text>
              </Space>
            }
            extra={
              <Space size={8}>
                <button
                  type="button"
                  onClick={() => onNavigateToTab('finance')}
                  style={{
                    background: token.colorPrimary,
                    color: '#fff',
                    borderRadius: 8,
                    border: 'none',
                    padding: '4px 12px',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  Open Shop Finance
                </button>
                <button
                  type="button"
                  onClick={() => onNavigateToTab('pos')}
                  style={{
                    background: token.colorBgContainer,
                    color: token.colorText,
                    borderRadius: 8,
                    border: `1px solid ${token.colorBorderSecondary}`,
                    padding: '4px 12px',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  POS Register
                </button>
              </Space>
            }
            style={{ borderRadius: 16 }}
          >
            <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 8 }}>
              Quick glance — full revenue, expenses, commissions details live in Shop Finance.
            </Text>
            <Row gutter={16}>
              <Col xs={24} sm={12}>
                <AntCard size="small" style={{ borderRadius: 12, background: token.colorBgLayout }}>
                  <Statistic
                    title={<Text type="secondary" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Average Ticket Value (ATV)</Text>}
                    value={`${avgTicketValue.toLocaleString()} ${currency}`}
                    valueStyle={{ fontSize: 22, fontWeight: 900, color: token.colorText }}
                  />
                  <Text type="secondary" style={{ fontSize: 11 }}>Per repair work order</Text>
                </AntCard>
              </Col>
              <Col xs={24} sm={12}>
                <AntCard size="small" style={{ borderRadius: 12, background: token.colorBgLayout }}>
                  <Statistic
                    title={<Text type="secondary" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Total Parts Cost</Text>}
                    value={`${totalPartsCost.toLocaleString()} ${currency}`}
                    valueStyle={{ fontSize: 22, fontWeight: 900, color: token.colorText }}
                  />
                  <Text type="secondary" style={{ fontSize: 11 }}>Direct hardware component cost</Text>
                </AntCard>
              </Col>
            </Row>
          </AntCard>
        </div>
      ),
    },
    {
      key: 'warranty-watch',
      label: 'Warranty Watch',
      children: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{
            padding: 20,
            borderRadius: 16,
            background: 'linear-gradient(135deg, #1a1a2e 0%, #4a1942 50%, #1a1a2e 100%)',
          }}>
            <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
              <div>
                <Space>
                  <div style={{ padding: 8, background: '#ff4d4f', borderRadius: 12, display: 'flex' }}>
                    <ShieldAlert size={20} color="#fff" />
                  </div>
                  <Title level={4} style={{ color: '#fff', margin: 0 }}>90-Day Warranty Background Telemetry</Title>
                  <Tag color="success" style={{ background: 'rgba(52,211,153,0.2)', border: '1px solid rgba(52,211,153,0.5)', color: '#6ee7b7' }}>
                    <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 4, background: '#34d399', marginRight: 4 }} />
                    Background Scanner Active
                  </Tag>
                </Space>
                <br />
                <Text style={{ color: '#94a3b8', fontSize: 12 }}>Flags tickets within 14 days of 90-day warranty expiry.</Text>
              </div>
              <Tag icon={<RefreshCw size={12} />} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: 12, padding: '4px 12px' }}>
                Live monitor · {warrantyCheckData.length} tickets
              </Tag>
            </Row>

            <Row gutter={12} style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 12 }}>
              <Col xs={12} lg={5}>
                <div style={{ padding: 12, background: 'rgba(255,255,255,0.1)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)' }}>
                  <Text style={{ color: '#94a3b8', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', display: 'block' }}>Scanned Tickets</Text>
                  <Text style={{ color: '#fff', fontSize: 22, fontWeight: 900 }}>{warrantyCheckData.length}</Text>
                  <Text style={{ color: '#94a3b8', fontSize: 11 }}>Total with warranty</Text>
                </div>
              </Col>
              <Col xs={12} lg={5}>
                <div style={{ padding: 12, background: 'rgba(244,67,54,0.2)', borderRadius: 12, border: '1px solid rgba(244,67,54,0.4)' }}>
                  <Text style={{ color: '#fca5a5', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', display: 'block' }}>Nearing Expiry (&le;14d)</Text>
                  <Text style={{ color: '#fda4af', fontSize: 22, fontWeight: 900 }}>{expiringSoonWorkOrders.length}</Text>
                  <Text style={{ color: '#fca5a5', fontSize: 11 }}>Flagged by monitor</Text>
                </div>
              </Col>
              <Col xs={12} lg={5}>
                <div style={{ padding: 12, background: 'rgba(244,67,54,0.3)', borderRadius: 12, border: '1px solid rgba(244,67,54,0.5)' }}>
                  <Text style={{ color: '#fca5a5', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', display: 'block' }}>Critical Window (&le;7d)</Text>
                  <Text style={{ color: '#fda4af', fontSize: 22, fontWeight: 900 }}>{criticalWarrantyCount}</Text>
                  <Text style={{ color: '#fca5a5', fontSize: 11 }}>Requires attention</Text>
                </div>
              </Col>
              <Col xs={12} lg={5}>
                <div style={{ padding: 12, background: 'rgba(250,204,21,0.2)', borderRadius: 12, border: '1px solid rgba(250,204,21,0.4)' }}>
                  <Text style={{ color: '#fde68a', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', display: 'block' }}>Warning Window (8-14d)</Text>
                  <Text style={{ color: '#fcd34d', fontSize: 22, fontWeight: 900 }}>{warningWarrantyCount}</Text>
                  <Text style={{ color: '#fde68a', fontSize: 11 }}>Nearing end period</Text>
                </div>
              </Col>
              <Col xs={12} lg={4}>
                <div style={{ padding: 12, background: 'rgba(82,196,26,0.2)', borderRadius: 12, border: '1px solid rgba(82,196,26,0.4)' }}>
                  <Text style={{ color: '#86efac', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', display: 'block' }}>Active & Protected</Text>
                  <Text style={{ color: '#6ee7b7', fontSize: 22, fontWeight: 900 }}>{activeWarrantyCount}</Text>
                  <Text style={{ color: '#86efac', fontSize: 11 }}>&gt;14 days remaining</Text>
                </div>
              </Col>
            </Row>
          </div>

          <AntCard style={{ borderRadius: 16 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ position: 'relative', width: 320, maxWidth: '100%' }}>
                <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: token.colorTextSecondary }} />
                <input
                  type="text"
                  value={warrantySearchQuery}
                  onChange={(e) => setWarrantySearchQuery(e.target.value)}
                  placeholder="Search ticket #, customer, device, serial..."
                  style={{
                    width: '100%',
                    padding: '6px 32px 6px 32px',
                    borderRadius: 12,
                    border: `1px solid ${token.colorBorderSecondary}`,
                    background: token.colorBgLayout,
                    color: token.colorText,
                    fontSize: 12,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                {warrantySearchQuery && (
                  <button
                    type="button"
                    onClick={() => setWarrantySearchQuery('')}
                    aria-label="Clear search"
                    style={{
                      position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                      border: 'none', background: 'transparent', cursor: 'pointer', padding: 4,
                      color: token.colorTextSecondary,
                    }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              <Space size={4} style={{ background: token.colorBgLayout, padding: 4, borderRadius: 12, border: `1px solid ${token.colorBorderSecondary}`, overflow: 'auto' as const }}>
                {(
                  [
                    { key: 'ALL_EXPIRING', label: `Flagged Expiration (${expiringSoonWorkOrders.length})` },
                    { key: 'CRITICAL', label: `Critical \u22647d (${criticalWarrantyCount})` },
                    { key: 'WARNING', label: `Warning 8-14d (${warningWarrantyCount})` },
                    { key: 'EXPIRED', label: `Expired (${expiredWarrantyCount})` },
                    { key: 'ALL', label: `All Tickets (${warrantyCheckData.length})` },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setWarrantyFilterTab(tab.key)}
                    style={{
                      padding: '4px 12px',
                      borderRadius: 8,
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: 12,
                      fontWeight: warrantyFilterTab === tab.key ? 700 : 400,
                      background: warrantyFilterTab === tab.key ? token.colorPrimary : 'transparent',
                      color: warrantyFilterTab === tab.key ? '#fff' : token.colorTextSecondary,
                      whiteSpace: 'nowrap' as const,
                      fontFamily: 'inherit',
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </Space>
            </div>

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
                  <div style={{ padding: 40, textAlign: 'center' }}>
                    <ShieldCheck size={40} style={{ color: '#52c41a', opacity: 0.7, margin: '0 auto 12px', display: 'block' }} />
                    <Text strong style={{ fontSize: 13 }}>No Work Orders Matching Warranty Criteria</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {warrantyFilterTab === 'ALL_EXPIRING'
                        ? 'No active work orders are currently nearing the end of their 90-day warranty window!'
                        : 'Try adjusting search keywords or selecting a different warranty filter tab.'}
                    </Text>
                  </div>
                );
              }

              return (
                <Table
                  dataSource={displayList.map((item) => ({ ...item, key: item.wo.id }))}
                  columns={warrantyColumns}
                  pagination={false}
                  size="small"
                  scroll={{ x: 900 }}
                />
              );
            })()}
          </AntCard>
        </div>
      ),
    },
  ];

  const CATEGORY_STYLES: Record<string, { bg: string; ic: string; bar: string }> = {
    screen: { bg: '#f0f5ff', ic: token.colorPrimary, bar: token.colorPrimary },
    battery: { bg: '#f6ffed', ic: '#52c41a', bar: '#52c41a' },
    board: { bg: '#f9f0ff', ic: '#722ed1', bar: '#722ed1' },
    housing: { bg: '#fffbe6', ic: '#faad14', bar: '#faad14' },
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Today's Actions — priority strip */}
      {(readyForPickup.length > 0 || financialAnalytics.unpaidCount > 0) && (
        <Row gutter={[8, 8]}>
          {readyForPickup.length > 0 && (
            <Col xs={24} sm={12} lg={6}>
              <button
                type="button"
                onClick={() => onNavigateToTab('intake')}
                style={priorityBtnStyle('rgba(82,196,26,0.3)', 'rgba(82,196,26,0.1)')}
                title="Open the ticket queue to contact customers for pickup"
              >
                <Space size={8}>
                  <CheckCircle2 size={16} color="#52c41a" />
                  <div style={{ textAlign: 'left' }}>
                    <Text strong style={{ fontSize: 12, display: 'block' }}>Ready for pickup</Text>
                    <Text type="secondary" style={{ fontSize: 10, display: 'block' }}>Contact customers to collect</Text>
                  </div>
                </Space>
                <Text strong style={{ fontSize: 18, fontFamily: "'IBM Plex Mono', monospace", color: '#52c41a' }}>
                  {readyForPickup.length}
                </Text>
              </button>
            </Col>
          )}
          {financialAnalytics.unpaidCount > 0 && (
            <Col xs={24} sm={12} lg={6}>
              <button
                type="button"
                onClick={() => onNavigateToTab('pos')}
                style={priorityBtnStyle('rgba(255,77,79,0.3)', 'rgba(255,77,79,0.1)')}
                title="Open POS checkout to collect unpaid balances"
              >
                <Space size={8}>
                  <Coins size={16} color="#ff4d4f" />
                  <div style={{ textAlign: 'left' }}>
                    <Text strong style={{ fontSize: 12, display: 'block' }}>Unpaid tickets</Text>
                    <Text type="secondary" style={{ fontSize: 10, display: 'block' }}>
                      {financialAnalytics.totalUnpaidBalance.toLocaleString()} {currency} to collect
                    </Text>
                  </div>
                </Space>
                <Text strong style={{ fontSize: 18, fontFamily: "'IBM Plex Mono', monospace", color: '#ff4d4f' }}>
                  {financialAnalytics.unpaidCount}
                </Text>
              </button>
            </Col>
          )}
        </Row>
      )}

      {/* Background Warranty Check Alert Banner on Dashboard */}
      {expiringSoonWorkOrders.length > 0 && activeDashboardSubTab !== 'warranty-watch' && (
        <div style={{
          padding: 16,
          borderRadius: 16,
          background: 'linear-gradient(135deg, rgba(255,77,79,0.1) 0%, rgba(250,173,20,0.1) 100%)',
          border: '1px solid rgba(255,77,79,0.3)',
        }}>
          <Row justify="space-between" align="middle" style={{ marginBottom: 12 }}>
            <Space size={12} align="start">
              <div style={{ padding: 8, background: '#ff4d4f', borderRadius: 12, display: 'flex' }}>
                <ShieldAlert size={20} color="#fff" />
              </div>
              <div>
                <Space size={8}>
                  <Text strong style={{ color: '#ff4d4f', fontSize: 13 }}>Background Warranty Monitor Flagged</Text>
                  <Tag color="error" style={{ fontSize: 11, fontFamily: "'IBM Plex Mono', monospace" }}>
                    90-Day Standard Window
                  </Tag>
                </Space>
                <br />
                <Text style={{ fontSize: 12 }}>
                  <Text strong style={{ color: '#ff4d4f' }}>{expiringSoonWorkOrders.length} Work Order(s)</Text> are nearing the end of their 90-day warranty period ({criticalWarrantyCount} critical within 7 days).
                </Text>
              </div>
            </Space>
            <button
              type="button"
              onClick={() => setActiveDashboardSubTab('warranty-watch')}
              style={{ background: '#ff4d4f', color: '#fff', borderRadius: 8, border: 'none', padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: 12 }}
            >
              <ShieldCheck size={16} />
              Inspect Flagged Tickets ({expiringSoonWorkOrders.length})
            </button>
          </Row>

          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            overflowX: 'auto', paddingTop: 8, borderTop: '1px solid rgba(255,77,79,0.3)',
          }}>
            <Text strong style={{ color: '#ff4d4f', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
              Expiring Soon:
            </Text>
            {expiringSoonWorkOrders.slice(0, 4).map((item) => (
              <button
                key={item.wo.id}
                type="button"
                onClick={() => setActiveDashboardSubTab('warranty-watch')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '4px 10px',
                  borderRadius: 8,
                  border: '1px solid rgba(255,77,79,0.3)',
                  background: 'rgba(255,255,255,0.8)',
                  cursor: 'pointer',
                  fontSize: 11,
                  whiteSpace: 'nowrap',
                  fontFamily: 'inherit',
                }}
              >
                <Text strong style={{ fontFamily: "'IBM Plex Mono', monospace", color: token.colorPrimary }}>{item.wo.orderNumber}</Text>
                <Text strong>{item.wo.customerName}</Text>
                <Text type="secondary">({item.wo.deviceModel})</Text>
                <Tag color={item.remainingDays <= 3 ? 'error' : 'warning'} style={{ margin: 0, fontSize: 10 }}>
                  <Clock size={10} /> {item.remainingDays}d left
                </Tag>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Sub-Tab Navigation */}
      <Tabs
        activeKey={activeDashboardSubTab}
        onChange={(key) => setActiveDashboardSubTab(key as typeof activeDashboardSubTab)}
        items={subTabItems}
        size="small"
        style={{ minHeight: 200 }}
      />

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