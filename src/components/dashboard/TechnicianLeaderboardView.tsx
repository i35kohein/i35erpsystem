import React from 'react';
import {
  Trophy,
  Crown,
} from 'lucide-react';
import { WorkOrder, Technician } from '../../types';
import { computeTechStats } from '../../utils/techAnalytics';

interface TechnicianLeaderboardViewProps {
  technicians: Technician[];
  workOrders: WorkOrder[];
  onNavigateToTab: (tab: string) => void;
  onOpenTechDetail?: (tech: Technician) => void;
  periodLabel?: string;
}

export const TechnicianLeaderboardView: React.FC<TechnicianLeaderboardViewProps> = ({
  technicians,
  workOrders,
  onOpenTechDetail,
  periodLabel,
}) => {
  // Single source of truth — same computeTechStats as the performance cards above.
  const leaderboardData = technicians
    .map((tech) => computeTechStats(workOrders, tech))
    .sort((a, b) => b.liveCompleted - a.liveCompleted || b.laborRevenue - a.laborRevenue);

  const totalShopCompleted = leaderboardData.reduce((sum, item) => sum + item.liveCompleted, 0);

  return (
    <div className="bg-white border border-line rounded-2xl p-3 shadow-2xs">
      {/* Compact header row */}
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-line">
        <div className="flex items-center space-x-1.5">
          <Trophy className="w-3.5 h-3.5 text-warning" />
          <h3 className="text-xs font-extrabold text-ink uppercase tracking-wider">Leaderboard</h3>
          {periodLabel && (
            <span className="text-[11px] font-bold text-muted bg-surface border border-line px-1.5 py-0.5 rounded-full">
              {periodLabel}
            </span>
          )}
        </div>
        {totalShopCompleted > 0 && (
          <span className="text-[11px] font-bold text-muted">{totalShopCompleted} completed</span>
        )}
      </div>

      {leaderboardData.length === 0 ? (
        <div className="p-6 text-center text-xs text-muted bg-surface rounded-xl border border-dashed border-line-strong space-y-1">
          <Trophy className="w-6 h-6 mx-auto opacity-50" />
          <p className="font-extrabold text-sm text-ink">No technicians yet</p>
          <p>Add technicians in Settings to populate the leaderboard.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-ink">
            <thead>
              <tr className="border-b border-line text-muted font-bold text-[11px] uppercase tracking-wider bg-surface">
                <th className="py-2 px-2.5 rounded-l-lg">#</th>
                <th className="py-2 px-2.5">Technician</th>
                <th className="py-2 px-2.5 text-center">Completed</th>
                <th className="py-2 px-2.5 text-center hidden sm:table-cell">Labor Revenue</th>
                <th className="py-2 px-2.5 text-center hidden md:table-cell">Commission</th>
                <th className="py-2 px-2.5 text-center">QA Pass</th>
                <th className="py-2 px-2.5 text-center hidden sm:table-cell">Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {leaderboardData.map((item, index) => {
                const rank = index + 1;
                const hasRate = item.commissionRateParts > 0 || item.commissionRateHardware > 0;

                return (
                  <tr
                    key={item.tech.id}
                    onClick={() => onOpenTechDetail?.(item.tech)}
                    className="hover:bg-surface transition-colors cursor-pointer"
                  >
                    <td className="py-2 px-2.5">
                      <span className={`w-5 h-5 rounded-md text-[11px] font-black flex items-center justify-center ${
                        rank === 1 ? 'bg-warning text-white shadow-2xs' :
                        rank === 2 ? 'bg-slate-300 text-ink font-extrabold' :
                        rank === 3 ? 'bg-warning/20 text-warning font-bold' :
                        'bg-surface text-muted'
                      }`}>
                        {rank}
                      </span>
                    </td>

                    <td className="py-2 px-2.5">
                      <div className="flex items-center space-x-2">
                        <div className="w-7 h-7 rounded-lg bg-brand/10 text-brand-deep font-bold text-[11px] flex items-center justify-center shrink-0">
                          {item.tech.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-extrabold text-ink flex items-center space-x-1 truncate">
                            <span className="truncate">{item.tech.name}</span>
                            {rank === 1 && <Crown className="w-3 h-3 text-warning fill-amber-400 shrink-0" />}
                          </p>
                          <p className="text-[11px] text-muted truncate hidden sm:block">{item.tech.level}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-2 px-2.5 text-center">
                      <span className="font-black text-ink">{item.liveCompleted}</span>
                      <span className="text-[11px] text-muted block">baseline {item.baselineMonthly}/mo</span>
                    </td>

                    <td className="py-2 px-2.5 text-center hidden sm:table-cell">
                      <span className="font-extrabold text-ink">
                        {item.laborRevenue > 0 ? `${item.laborRevenue.toLocaleString()} MMK` : '—'}
                      </span>
                    </td>

                    <td className="py-2 px-2.5 text-center hidden md:table-cell">
                      {hasRate ? (
                        <span className="font-bold text-ink">
                          {item.estCommission !== null ? `${item.estCommission.toLocaleString()} MMK` : '—'}
                          <span className="text-[11px] text-brand block">
                            {item.commissionRateParts}% P · {item.commissionRateHardware}% HW
                          </span>
                        </span>
                      ) : (
                        <span className="text-[11px] text-muted">— no rate</span>
                      )}
                    </td>

                    <td className="py-2 px-2.5 text-center">
                      <span className={`font-bold ${item.successRate !== null ? 'text-success' : 'text-muted'}`}>
                        {item.successRate !== null ? `${item.successRate}%` : '—'}
                      </span>
                      <span className="text-[11px] text-muted block">
                        {item.warrantyReturnCount === 0 ? '0 returns' : `${item.warrantyReturnCount} return${item.warrantyReturnCount > 1 ? 's' : ''}`}
                      </span>
                    </td>

                    <td className="py-2 px-2.5 text-center hidden sm:table-cell">
                      <span className="px-1.5 py-0.5 rounded-full bg-surface text-ink border border-line text-[11px] font-bold">
                        {item.activeCount}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
