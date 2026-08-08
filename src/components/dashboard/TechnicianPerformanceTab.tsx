import React, { useState } from 'react';
import {
  Users,
  CheckCircle2,
  Award,
  TrendingUp,
} from 'lucide-react';
import { WorkOrder, Technician } from '../../types';
import { computeTechStats} from '../../utils/techAnalytics';

interface TechnicianPerformanceTabProps {
  technicians: Technician[];
  workOrders: WorkOrder[];
  onNavigateToTab: (tab: string) => void;
  onOpenTechDetail?: (tech: Technician) => void;
}

export const TechnicianPerformanceTab: React.FC<TechnicianPerformanceTabProps> = ({
  technicians,
  workOrders,
  onOpenTechDetail,
}) => {
  const [selectedTechId, setSelectedTechId] = useState<string>('ALL');

  const techStats = technicians.map((tech) => computeTechStats(workOrders, tech));

  const totalShopLiveCompleted = techStats.reduce((sum, t) => sum + t.liveCompleted, 0);
  const totalShopBaseline = techStats.reduce((sum, t) => sum + t.baselineMonthly, 0);
  const totalShopWarrantyReturns = techStats.reduce((sum, t) => sum + t.warrantyReturnCount, 0);

  const shopQualityTotal = totalShopLiveCompleted + totalShopWarrantyReturns;
  const shopSuccessRate =
    shopQualityTotal > 0 ? Math.min(100, Math.round((totalShopLiveCompleted / shopQualityTotal) * 100)) : null;

  const totalActiveQueue = techStats.reduce((sum, t) => sum + t.activeCount, 0);

  const filteredTechStats =
    selectedTechId === 'ALL' ? techStats : techStats.filter((t) => t.tech.id === selectedTechId);

  return (
    <div className="space-y-3">
      {/* Top Banner: Shop-Wide Staff Performance Metrics */}
      <div className="bg-white border border-line rounded-2xl p-4 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2.5 border-b border-line">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-brand-soft text-brand rounded-lg">
              <Users className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-extrabold text-ink">Technician Performance</h2>
          </div>

          {/* Technician Selector Filter */}
          <div className="flex items-center space-x-2 shrink-0">
            <span className="text-xs font-bold text-muted">Filter Staff:</span>
            <select aria-label="All Technicians ({technicians.length})"
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

        {/* 2 High Level KPI Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Total Successful Repairs */}
          <div className="bg-success/5 border border-success/30 p-3.5 rounded-xl flex items-center justify-between shadow-2xs">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-muted uppercase tracking-wider">Total Successful Repairs</span>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl font-extrabold text-ink">{totalShopLiveCompleted}</span>
                <span className="text-xs text-success-deep font-bold">This Period</span>
              </div>
              <p className="text-xs text-success-deep font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                {shopSuccessRate !== null ? `${shopSuccessRate}% QA Pass` : 'Awaiting completed repairs'}
              </p>
            </div>
            <div className="p-2.5 bg-success text-white rounded-xl shadow-xs">
              <Award className="w-5 h-5" />
            </div>
          </div>

          {/* Shop Capacity & Active Load */}
          <div className="bg-purple/5 border border-purple/30 p-3.5 rounded-xl flex items-center justify-between shadow-2xs">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-muted uppercase tracking-wider">Active Queue Capacity</span>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl font-extrabold text-ink">{totalActiveQueue}</span>
                <span className="text-xs text-purple font-bold">In-Queue Jobs</span>
              </div>
              <p className="text-xs text-purple font-medium">Across {technicians.length} staff · {totalShopBaseline} baseline/mo</p>
            </div>
            <div className="p-2.5 bg-purple text-white rounded-xl shadow-xs">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Individual Technician Compact Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {filteredTechStats.map((stats) => {
          const {
            tech, liveCompleted, baselineMonthly,
            successRate, warrantyReturnCount, loadBadge,
          } = stats;
          const baselinePct =
            baselineMonthly > 0 ? Math.min(100, Math.round((liveCompleted / baselineMonthly) * 100)) : null;
          return (
            <div
              key={tech.id}
              onClick={() => onOpenTechDetail?.(tech)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenTechDetail?.(tech); }
              }}
              className="bg-white border border-line hover:border-brand/40 rounded-2xl p-4 shadow-2xs hover:shadow-md transition-all cursor-pointer group"
            >
              {/* Header: Technician Info */}
              <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-line">
                <div className="flex items-center space-x-2.5">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-100 to-indigo-100 text-purple font-black text-base flex items-center justify-center border border-purple/30 shrink-0">
                    {tech.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-extrabold text-sm text-ink truncate group-hover:text-brand transition-colors">{tech.name}</h3>
                    <p className="text-[11px] text-muted truncate">{tech.level}</p>
                  </div>
                </div>
                <span className={`text-xs font-extrabold px-2 py-0.5 rounded-lg border shrink-0 ${loadBadge.color}`}>
                  {loadBadge.label}
                </span>
              </div>

              {/* Core Metrics: Throughput + Success Rate */}
              <div className="grid grid-cols-2 gap-2 mt-2.5 text-center">
                <div className="space-y-0.5">
                  <span className="block text-[11px] font-bold text-muted uppercase">Throughput</span>
                  <span className="block text-lg font-extrabold text-ink">{liveCompleted}</span>
                  <span className="block text-[11px] text-muted font-bold">Baseline {baselineMonthly}/mo</span>
                </div>
                <div className="space-y-0.5">
                  <span className="block text-[11px] font-bold text-muted uppercase">Success Rate</span>
                  <span className="block text-lg font-extrabold text-success-deep">
                    {successRate !== null ? `${successRate}%` : '—'}
                  </span>
                  <span className="block text-[11px] text-muted font-medium">
                    {warrantyReturnCount === 0 ? '0 Returns' : `${warrantyReturnCount} Return${warrantyReturnCount > 1 ? 's' : ''}`}
                  </span>
                </div>
              </div>

              {/* Progress Bar: Live vs Baseline */}
              <div className="mt-2.5 space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-ink">Period vs Baseline</span>
                  <span className="font-mono font-bold text-brand">
                    {baselinePct !== null ? `${baselinePct}%` : '—'}
                  </span>
                </div>
                <div className="w-full bg-line rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-brand to-success h-full rounded-full transition-all duration-300"
                    style={{ width: `${Math.max(4, baselinePct || 0)}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredTechStats.length === 0 && (
        <div className="bg-white border border-dashed border-line-strong rounded-2xl p-8 text-center text-xs text-muted space-y-1">
          <Users className="w-6 h-6 mx-auto opacity-50" />
          <p className="font-extrabold text-sm text-ink">No technicians found</p>
          <p>Add technicians in Settings to see performance tracking.</p>
        </div>
      )}
    </div>
  );
};
