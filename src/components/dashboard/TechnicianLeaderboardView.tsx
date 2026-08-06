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
  onNavigateToTab,
  onOpenTechDetail,
  periodLabel,
}) => {
  // Single source of truth — same computeTechStats as the performance cards above.
  const leaderboardData = technicians
    .map((tech) => computeTechStats(workOrders, tech))
    .sort((a, b) => b.liveCompleted - a.liveCompleted || b.laborRevenue - a.laborRevenue);

  const topLeader = leaderboardData[0];
  const totalShopCompleted = leaderboardData.reduce((sum, item) => sum + item.liveCompleted, 0);

  return (
    <div className="space-y-3">
      {/* Leaderboard Header */}
      <div className="bg-gradient-to-r from-amber-500/10 via-amber-50/60 to-orange-500/10 border border-amber-300/60 p-5 rounded-2xl shadow-2xs">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="p-2 bg-gradient-to-br from-amber-400 to-amber-600 text-white rounded-xl shadow-xs">
                <Trophy className="w-5 h-5" />
              </span>
              <h2 className="text-lg font-black text-ink tracking-tight">
                Technician Repair Leaderboard
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-amber-100 text-amber-800 border border-amber-300 shrink-0">
                {periodLabel || 'This period'}
              </span>
            </div>
            <p className="text-xs text-muted">
              Ranked by verified completed repairs (Finished / Taken Out) in the selected period — live from work orders.
            </p>
          </div>
          {totalShopCompleted > 0 && (
            <span className="text-xs text-muted font-semibold bg-white/70 px-3 py-1.5 rounded-xl border border-amber-200 shadow-2xs shrink-0">
              Total {totalShopCompleted} Completed Repairs
            </span>
          )}
        </div>
      </div>

      {/* Comprehensive Leaderboard Table — the single roster */}
      <div className="bg-white border border-line rounded-2xl p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-3">
          <div className="flex items-center space-x-2">
            <span className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
              <Trophy className="w-4 h-4" />
            </span>
            <h3 className="font-extrabold text-sm text-ink">
              Full Technician Leaderboard Roster
            </h3>
          </div>

          <span className="text-xs text-muted font-medium">
            Real labor revenue + commission · baseline for reference · click a row for drill-down
          </span>

          <button
            onClick={() => onNavigateToTab('pipeline')}
            className="px-3.5 py-1.5 bg-surface hover:bg-line text-brand font-bold text-xs rounded-xl border border-line flex items-center space-x-1.5 transition-all shrink-0 cursor-pointer"
          >
            <span>Open Pipeline</span>
          </button>
        </div>

        {leaderboardData.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted bg-[#F8F9FA] rounded-xl border border-dashed border-line-strong space-y-1">
            <Trophy className="w-6 h-6 mx-auto opacity-50" />
            <p className="font-extrabold text-sm text-ink">No technicians yet</p>
            <p>Add technicians in Settings to populate the leaderboard.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-ink">
              <thead>
                <tr className="border-b border-line text-muted font-bold text-xs uppercase tracking-wider bg-[#F8F9FA]">
                  <th className="py-2.5 px-3 rounded-l-xl">Rank</th>
                  <th className="py-2.5 px-3">Technician</th>
                  <th className="py-2.5 px-3 text-center">Completed (Period)</th>
                  <th className="py-2.5 px-3 text-center hidden sm:table-cell">Baseline</th>
                  <th className="py-2.5 px-3 text-center">Labor Revenue</th>
                  <th className="py-2.5 px-3 text-center hidden md:table-cell">Commission</th>
                  <th className="py-2.5 px-3 text-center hidden lg:table-cell">Avg Turnaround</th>
                  <th className="py-2.5 px-3 text-center">QA Pass</th>
                  <th className="py-2.5 px-3 text-center hidden sm:table-cell">Active Queue</th>
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
                      className="hover:bg-[#F8F9FA] transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-3">
                        <span className={`w-6 h-6 rounded-lg text-xs font-black flex items-center justify-center ${
                          rank === 1 ? 'bg-amber-400 text-amber-950 font-black shadow-xs' :
                          rank === 2 ? 'bg-slate-300 text-slate-900 font-extrabold' :
                          rank === 3 ? 'bg-amber-700/20 text-amber-900 font-bold' :
                          'bg-surface text-muted'
                        }`}>
                          #{rank}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-8 h-8 rounded-xl bg-brand/10 text-brand font-bold text-xs flex items-center justify-center shrink-0">
                            {item.tech.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-extrabold text-ink flex items-center space-x-1">
                              <span>{item.tech.name}</span>
                              {rank === 1 && <Crown className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />}
                            </p>
                            <p className="text-xs text-brand font-bold hidden md:block">{item.tech.level}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span className="font-black text-ink text-sm">{item.liveCompleted}</span>
                        <span className="text-xs text-emerald-600 font-bold block">completed</span>
                      </td>

                      <td className="py-3 px-3 text-center hidden sm:table-cell">
                        <span className="text-xs font-bold text-muted bg-surface px-2 py-0.5 rounded-full border border-line">
                          {item.baselineMonthly}/mo
                        </span>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <div className="space-y-0.5">
                          <span className="font-extrabold text-ink">
                            {item.laborRevenue > 0 ? `${item.laborRevenue.toLocaleString()} MMK` : '—'}
                          </span>
                          <span className="text-xs text-muted font-medium block">labor only</span>
                        </div>
                      </td>

                      <td className="py-3 px-3 text-center hidden md:table-cell">
                        {hasRate ? (
                          <div className="space-y-0.5">
                            <span className="font-bold text-ink">
                              {item.estCommission !== null ? `${item.estCommission.toLocaleString()} MMK` : '—'}
                            </span>
                            <span className="text-xs text-brand font-bold block">
                              {item.commissionRateParts}% parts · {item.commissionRateHardware}% HW
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted font-medium">— no rate</span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-center hidden lg:table-cell font-bold text-purple-700">
                        {item.avgDurationHours !== null ? `${item.avgDurationHours} Hours` : '—'}
                      </td>

                      <td className="py-3 px-3 text-center font-bold">
                        {item.successRate !== null ? (
                          <span className="text-success">{item.successRate}%</span>
                        ) : (
                          <span className="text-muted font-medium">—</span>
                        )}
                        <span className="text-xs text-muted font-medium block">
                          {item.warrantyReturnCount === 0 ? '0 returns' : `${item.warrantyReturnCount} return${item.warrantyReturnCount > 1 ? 's' : ''}`}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-center hidden sm:table-cell font-bold">
                        <span className="px-2 py-0.5 rounded-full bg-surface text-ink border border-line-strong text-xs">
                          {item.activeCount} active
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

      {topLeader && (
        <p className="text-xs text-muted text-center">
          Champion: <span className="font-bold text-ink">{topLeader.tech.name}</span> · click any row for the full drill-down.
        </p>
      )}
    </div>
  );
};
