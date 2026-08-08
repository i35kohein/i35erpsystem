import React from 'react';
import {
  Users,
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
  const techStats = technicians.map((tech) => computeTechStats(workOrders, tech));

  return (
    <div className="space-y-3">
      {/* Technician Compact Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {techStats.map((stats) => {
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
                  <span className="block text-[11px] font-bold text-muted uppercase">Done</span>
                  <span className="block text-lg font-extrabold text-ink">{liveCompleted}</span>
                  <span className="block text-[11px] text-muted font-bold">Goal {baselineMonthly}/mo</span>
                </div>
                <div className="space-y-0.5">
                  <span className="block text-[11px] font-bold text-muted uppercase">Pass</span>
                  <span className="block text-lg font-extrabold text-success-deep">
                    {successRate !== null ? `${successRate}%` : '—'}
                  </span>
                  <span className="block text-[11px] text-muted font-medium">
                    {warrantyReturnCount === 0 ? '0 returns' : `${warrantyReturnCount} return${warrantyReturnCount > 1 ? 's' : ''}`}
                  </span>
                </div>
              </div>

              {/* Progress Bar: Done vs Goal */}
              <div className="mt-2.5 space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-ink">Progress</span>
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

      {techStats.length === 0 && (
        <div className="bg-white border border-dashed border-line-strong rounded-2xl p-8 text-center text-xs text-muted space-y-1">
          <Users className="w-6 h-6 mx-auto opacity-50" />
          <p className="font-extrabold text-sm text-ink">No technicians found</p>
          <p>Add technicians in Settings to see performance tracking.</p>
        </div>
      )}
    </div>
  );
};
