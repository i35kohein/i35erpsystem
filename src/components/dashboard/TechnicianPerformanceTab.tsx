import React, { useState } from 'react';
import {
  Users,
  Clock,
  CheckCircle2,
  Award,
  Zap,
  BarChart3,
  Scale,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { WorkOrder, Technician } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { computeTechStats, getLoadBadge } from '../../utils/techAnalytics';

interface TechnicianPerformanceTabProps {
  technicians: Technician[];
  workOrders: WorkOrder[];
  onNavigateToTab: (tab: string) => void;
  onOpenTechDetail?: (tech: Technician) => void;
}

export const TechnicianPerformanceTab: React.FC<TechnicianPerformanceTabProps> = ({
  technicians,
  workOrders,
  onNavigateToTab,
  onOpenTechDetail,
}) => {
  const [selectedTechId, setSelectedTechId] = useState<string>('ALL');

  const techStats = technicians.map((tech) => computeTechStats(workOrders, tech));

  const totalShopLiveCompleted = techStats.reduce((sum, t) => sum + t.liveCompleted, 0);
  const totalShopBaseline = techStats.reduce((sum, t) => sum + t.baselineMonthly, 0);
  const totalShopWarrantyReturns = techStats.reduce((sum, t) => sum + t.warrantyReturnCount, 0);

  const avgDurations = techStats
    .map((t) => t.avgDurationHours)
    .filter((h): h is number => h !== null);
  const avgShopDurationHours =
    avgDurations.length > 0
      ? Number((avgDurations.reduce((s, h) => s + h, 0) / avgDurations.length).toFixed(1))
      : null;

  const shopQualityTotal = totalShopLiveCompleted + totalShopWarrantyReturns;
  const shopSuccessRate =
    shopQualityTotal > 0 ? Math.min(100, Math.round((totalShopLiveCompleted / shopQualityTotal) * 100)) : null;

  const totalActiveQueue = techStats.reduce((sum, t) => sum + t.activeCount, 0);

  const filteredTechStats =
    selectedTechId === 'ALL' ? techStats : techStats.filter((t) => t.tech.id === selectedTechId);

  return (
    <div className="space-y-3">
      {/* Top Banner: Shop-Wide Staff Performance Metrics */}
      <div className="bg-white border border-line rounded-2xl p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-line">
          <div className="space-y-0.5">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 bg-brand-soft text-brand rounded-lg">
                <Users className="w-5 h-5" />
              </div>
              <h2 className="text-base font-extrabold text-ink">
                Technician Staff Performance & Capacity Tracker
              </h2>
            </div>
            <p className="text-xs text-muted pl-8">
              Live metrics from work orders in the selected period — throughput, turnaround, and fix rate.
            </p>
          </div>

          {/* Technician Selector Filter */}
          <div className="flex items-center space-x-2 shrink-0">
            <span className="text-xs font-bold text-muted">Filter Staff:</span>
            <select
              value={selectedTechId}
              onChange={(e) => setSelectedTechId(e.target.value)}
              className="bg-surface border border-line text-ink text-xs font-bold rounded-xl px-3 py-1.5 focus:bg-white focus:border-brand focus:outline-none transition-all shadow-2xs"
            >
              <option value="ALL">All Technicians ({technicians.length})</option>
              {technicians.map((tech) => (
                <option key={tech.id} value={tech.id}>
                  {tech.name} ({tech.level})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 3 High Level KPI Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Total Successful Repairs */}
          <div className="bg-gradient-to-br from-[#EAF8ED]/50 to-[#EAF8ED]/20 border border-success/30 p-4 rounded-xl flex items-center justify-between shadow-2xs">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-muted uppercase tracking-wider">Total Successful Repairs</span>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl font-extrabold text-ink">{totalShopLiveCompleted}</span>
                <span className="text-xs text-[#28A745] font-bold">Completed This Period</span>
              </div>
              <p className="text-[11px] text-[#1E7E34] font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                {shopSuccessRate !== null ? `${shopSuccessRate}% QA Pass Rate` : '— Awaiting completed repairs'}
              </p>
            </div>
            <div className="p-3 bg-success text-white rounded-xl shadow-xs">
              <Award className="w-6 h-6" />
            </div>
          </div>

          {/* Avg Turnaround Time */}
          <div className="bg-gradient-to-br from-brand-soft/50 to-brand-soft/20 border border-brand/30 p-4 rounded-xl flex items-center justify-between shadow-2xs">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-muted uppercase tracking-wider">Average Repair Duration</span>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl font-extrabold text-ink">
                  {avgShopDurationHours !== null ? avgShopDurationHours : '—'}
                </span>
                <span className="text-xs text-brand font-bold">Hours / Job</span>
              </div>
              <p className="text-[11px] text-brand font-medium flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-brand" />
                Based on completion timestamps
              </p>
            </div>
            <div className="p-3 bg-brand text-white rounded-xl shadow-xs">
              <Clock className="w-6 h-6" />
            </div>
          </div>

          {/* Shop Capacity & Active Load */}
          <div className="bg-gradient-to-br from-purple-50/50 to-purple-50/20 border border-purple-300/40 p-4 rounded-xl flex items-center justify-between shadow-2xs">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-muted uppercase tracking-wider">Active Queue Capacity</span>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl font-extrabold text-ink">{totalActiveQueue}</span>
                <span className="text-xs text-[#AF52DE] font-bold">In-Queue Jobs</span>
              </div>
              <p className="text-[11px] text-[#AF52DE] font-medium flex items-center gap-1">
                <Scale className="w-3.5 h-3.5 text-[#AF52DE]" />
                Across {technicians.length} staff · {totalShopBaseline} baseline/mo
              </p>
            </div>
            <div className="p-3 bg-[#AF52DE] text-white rounded-xl shadow-xs">
              <BarChart3 className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Individual Technician Detailed Performance Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {filteredTechStats.map((stats) => {
          const {
            tech, activeOrders, activeCount, finishedOrders, liveCompleted, baselineMonthly,
            avgDurationHours, successRate, warrantyReturnCount, loadBadge,
          } = stats;
          const baselinePct =
            baselineMonthly > 0 ? Math.min(100, Math.round((liveCompleted / baselineMonthly) * 100)) : null;
          return (
            <div
              key={tech.id}
              onClick={() => onOpenTechDetail?.(tech)}
              className="bg-white border border-line hover:border-brand/40 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all space-y-5 flex flex-col justify-between cursor-pointer group"
            >
              {/* Header: Technician Info */}
              <div className="space-y-3 pb-3 border-b border-line">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center space-x-3">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-purple-100 to-indigo-100 text-[#AF52DE] font-black text-lg flex items-center justify-center border border-purple-200 shadow-2xs shrink-0">
                      {tech.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-ink flex items-center gap-1.5 group-hover:text-brand transition-colors">
                        <span>{tech.name}</span>
                        <span className="inline-block w-2 h-2 rounded-full bg-success" title="Active Staff" />
                      </h3>
                      <p className="text-xs text-muted">{tech.email}</p>
                    </div>
                  </div>

                  <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-lg border shadow-2xs shrink-0 ${
                    tech.level === 'Level 3 Master' ? 'bg-purple-50 text-[#AF52DE] border-purple-200' :
                    tech.level === 'Level 2 Spareparts + Hardware' ? 'bg-blue-50 text-brand border-blue-200' :
                    'bg-emerald-50 text-[#1E7E34] border-emerald-200'
                  }`}>
                    {tech.level}
                  </span>
                </div>

                {/* Status Bar: Active Workload Badge */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-muted font-semibold">Active Queue Load:</span>
                  <div className="flex items-center space-x-2">
                    <span className="font-extrabold text-ink">{activeCount} active tickets</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${loadBadge.color}`}>
                      {loadBadge.label}
                    </span>
                  </div>
                </div>
              </div>

              {/* Core Performance Metrics: Throughput, Duration, Successful Repairs */}
              <div className="grid grid-cols-3 gap-2 py-1 text-center bg-[#F8F9FA] p-3 rounded-xl border border-line">
                {/* 1. Throughput */}
                <div className="space-y-0.5">
                  <span className="block text-[10px] font-bold text-muted uppercase">Throughput</span>
                  <span className="block text-lg font-extrabold text-ink">{liveCompleted}</span>
                  <span className="block text-[10px] text-muted font-bold">Baseline {baselineMonthly}/mo</span>
                </div>

                {/* 2. Avg Repair Duration */}
                <div className="space-y-0.5 border-x border-line px-1">
                  <span className="block text-[10px] font-bold text-muted uppercase">Avg Duration</span>
                  <span className="block text-lg font-extrabold text-ink">
                    {avgDurationHours !== null ? `${avgDurationHours}h` : '—'}
                  </span>
                  <span className="block text-[10px] text-purple-600 font-bold">Turnaround</span>
                </div>

                {/* 3. Successful Repairs */}
                <div className="space-y-0.5">
                  <span className="block text-[10px] font-bold text-muted uppercase">Success Rate</span>
                  <span className="block text-lg font-extrabold text-[#1E7E34]">
                    {successRate !== null ? `${successRate}%` : '—'}
                  </span>
                  <span className="block text-[10px] text-muted font-medium">
                    {warrantyReturnCount === 0 ? '0 Returns' : `${warrantyReturnCount} Return${warrantyReturnCount > 1 ? 's' : ''}`}
                  </span>
                </div>
              </div>

              {/* Progress Bar: Live vs Baseline (replaces fabricated /50 target) */}
              {baselineMonthly > 0 ? (
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-ink flex items-center gap-1">
                      <TrendingUp className="w-3.5 h-3.5 text-brand" />
                      <span>This Period vs Baseline</span>
                    </span>
                    <span className="font-mono font-bold text-brand">
                      {baselinePct !== null ? `${baselinePct}%` : '—'}
                    </span>
                  </div>
                  <div className="w-full bg-line rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-brand to-success h-full rounded-full transition-all duration-300"
                      style={{ width: `${Math.max(4, baselinePct || 0)}%` }}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <span className="text-[10px] text-muted font-bold uppercase tracking-wider flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5 text-brand" />
                    This Period Completions
                  </span>
                  <span className="text-xs font-bold text-ink">{liveCompleted} completed · no baseline set</span>
                </div>
              )}

              {/* Assigned Active Work Orders Sub-List */}
              <div className="space-y-2 pt-2 border-t border-line">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-muted uppercase text-[10px] tracking-wider">Assigned Active Tickets</span>
                  <span className="text-[10px] font-mono text-brand font-bold">{activeOrders.length} In-Queue</span>
                </div>

                {activeOrders.length === 0 ? (
                  <div className="p-3 bg-surface rounded-xl text-center text-xs text-muted">
                    No active repairs in queue. Ready for new tickets.
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                    {activeOrders.slice(0, 3).map((wo) => (
                      <div
                        key={wo.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onNavigateToTab('pipeline');
                        }}
                        className="p-2 bg-[#F8F9FA] hover:bg-white border border-line hover:border-brand/40 rounded-lg flex items-center justify-between text-xs cursor-pointer transition-all group/ticket"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="font-mono font-bold text-brand group-hover/ticket:underline text-[11px] truncate">
                            {wo.orderNumber}
                          </p>
                          <p className="text-[11px] text-ink font-semibold truncate">{wo.deviceModel}</p>
                        </div>
                        <StatusBadge status={wo.status} size="xs" />
                      </div>
                    ))}
                    {activeOrders.length > 3 && (
                      <p className="text-[10px] text-center text-muted font-medium pt-1">
                        + {activeOrders.length - 3} more tickets assigned
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Action: drill-down only (modal handles pipeline navigation) */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenTechDetail?.(tech);
                }}
                className="w-full py-2 bg-brand-soft hover:bg-brand text-brand hover:text-white font-bold text-xs rounded-xl border border-brand/20 flex items-center justify-center space-x-1 transition-all cursor-pointer"
              >
                <span>View Details</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>

      {filteredTechStats.length === 0 && (
        <div className="bg-white border border-dashed border-line-strong rounded-2xl p-10 text-center text-xs text-muted space-y-1">
          <Users className="w-6 h-6 mx-auto opacity-50" />
          <p className="font-extrabold text-sm text-ink">No technicians found</p>
          <p>Add technicians in Settings to see performance tracking.</p>
        </div>
      )}

      {/* Note: full comparison roster moved to the Leaderboard section below (single table). */}
      <p className="text-[10px] text-muted text-center">
        Click any technician card for the full drill-down (tickets, earnings, commission).
      </p>
    </div>
  );
};
