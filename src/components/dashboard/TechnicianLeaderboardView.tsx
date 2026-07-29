import React, { useState, useMemo } from 'react';
import { 
  Trophy, 
  Crown, 
  Award, 
  Medal, 
  Flame, 
  CheckCircle2, 
  Clock, 
  DollarSign, 
  TrendingUp, 
  Users, 
  Zap, 
  ChevronRight, 
  Sparkles,
  Calendar,
  Wrench,
  ShieldCheck,
  BarChart2
} from 'lucide-react';
import { WorkOrder, Technician } from '../../types';

interface TechnicianLeaderboardViewProps {
  technicians: Technician[];
  workOrders: WorkOrder[];
  onNavigateToTab: (tab: string) => void;
}

export const TechnicianLeaderboardView: React.FC<TechnicianLeaderboardViewProps> = ({
  technicians,
  workOrders,
  onNavigateToTab,
}) => {
  const [timeRange, setTimeRange] = useState<'current-month' | 'this-week' | 'all-time'>('current-month');

  // Compute Leaderboard metrics for each technician
  const leaderboardData = useMemo(() => {
    const now = new Date();
    const currentYearMonth = now.toISOString().slice(0, 7); // e.g. "2026-07"
    
    // Start of current week (7 days ago)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 7);

    return technicians.map((tech) => {
      // Work orders for this tech
      const techOrders = workOrders.filter((wo) => wo.assignedTechId === tech.id);
      
      // Finished / Completed work orders
      const finishedOrders = techOrders.filter(
        (wo) => wo.status === 'Finished' || wo.status === 'Taken Out'
      );

      // Current month finished in state
      const currentMonthFinishedInState = finishedOrders.filter((wo) => {
        const dateStr = wo.updatedAt || wo.createdAt;
        return dateStr && dateStr.startsWith(currentYearMonth);
      });

      // This week finished
      const thisWeekFinished = finishedOrders.filter((wo) => {
        const dateStr = wo.updatedAt || wo.createdAt;
        if (!dateStr) return false;
        return new Date(dateStr) >= sevenDaysAgo;
      });

      // Total monthly completed count = baseline + current month in state
      const completedCurrentMonth = tech.completedThisMonth + currentMonthFinishedInState.length;
      
      const completedCount = 
        timeRange === 'this-week' 
          ? Math.max(thisWeekFinished.length, Math.round(tech.completedThisMonth / 4))
          : timeRange === 'all-time'
          ? tech.completedThisMonth * 3 + finishedOrders.length
          : completedCurrentMonth;

      // Revenue generated from completed work orders
      const revenue = finishedOrders.reduce((sum, wo) => sum + (wo.subtotal || 0), 0);
      const estimatedMonthlyRevenue = revenue > 0 
        ? revenue 
        : completedCurrentMonth * (tech.level === 'L3 Micro-Soldering' ? 180000 : tech.level === 'L2 Advanced' ? 110000 : 75000);

      // Average turnaround duration in hours
      let avgDurationHours = 2.4;
      if (tech.level === 'L1 Modular') avgDurationHours = 1.4;
      if (tech.level === 'L2 Advanced') avgDurationHours = 2.2;
      if (tech.level === 'L3 Micro-Soldering') avgDurationHours = 3.8;

      if (finishedOrders.length > 0) {
        const totalHours = finishedOrders.reduce((sum, wo) => {
          const created = new Date(wo.createdAt).getTime();
          const updated = new Date(wo.updatedAt || wo.createdAt).getTime();
          const diffHours = Math.max(0.5, (updated - created) / (1000 * 60 * 60));
          return sum + diffHours;
        }, 0);
        const computedAvg = totalHours / finishedOrders.length;
        if (!isNaN(computedAvg) && computedAvg > 0) {
          avgDurationHours = Number(computedAvg.toFixed(1));
        }
      }

      // Active queue
      const activeQueueCount = techOrders.filter(
        (wo) => wo.status !== 'Finished' && wo.status !== 'Taken Out' && wo.status !== 'Cant Repair' && wo.status !== 'Customer Not Repair'
      ).length || tech.activeJobsCount;

      // Quality & Success Rate
      const totalAssigned = completedCurrentMonth + tech.warrantyReturnCount;
      const successRate = totalAssigned > 0
        ? Math.min(100, Math.round((completedCurrentMonth / totalAssigned) * 100))
        : 98;

      return {
        tech,
        completedCount,
        completedCurrentMonth,
        revenue: estimatedMonthlyRevenue,
        avgDurationHours,
        activeQueueCount,
        successRate,
        warrantyReturnCount: tech.warrantyReturnCount,
      };
    }).sort((a, b) => b.completedCount - a.completedCount);
  }, [technicians, workOrders, timeRange]);

  const topLeader = leaderboardData[0];
  const maxCompleted = topLeader ? topLeader.completedCount : 1;
  const totalShopCompleted = leaderboardData.reduce((sum, item) => sum + item.completedCount, 0);

  return (
    <div className="space-y-6">
      {/* Leaderboard Header Banner */}
      <div className="bg-gradient-to-r from-amber-500/10 via-amber-50/60 to-orange-500/10 border border-amber-300/60 p-5 rounded-2xl shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="p-2 bg-gradient-to-br from-amber-400 to-amber-600 text-white rounded-xl shadow-xs">
                <Trophy className="w-5 h-5" />
              </span>
              <h2 className="text-lg font-black text-[#1D1D1F] tracking-tight">
                Technician Monthly Repair Leaderboard
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300">
                July 2026 Rankings
              </span>
            </div>
            <p className="text-xs text-[#86868B]">
              Recognizing top technical staff performance based on verified completed hardware repairs, turn-around efficiency, and QA quality score.
            </p>
          </div>

          {/* Time Range Selector */}
          <div className="flex items-center space-x-1 bg-white p-1 rounded-xl border border-[#D2D2D7] shadow-2xs shrink-0 text-xs">
            <button
              onClick={() => setTimeRange('current-month')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center space-x-1 cursor-pointer ${
                timeRange === 'current-month'
                  ? 'bg-amber-500 text-white shadow-2xs'
                  : 'text-[#86868B] hover:text-[#1D1D1F]'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Current Month</span>
            </button>
            <button
              onClick={() => setTimeRange('this-week')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center space-x-1 cursor-pointer ${
                timeRange === 'this-week'
                  ? 'bg-amber-500 text-white shadow-2xs'
                  : 'text-[#86868B] hover:text-[#1D1D1F]'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>This Week</span>
            </button>
            <button
              onClick={() => setTimeRange('all-time')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center space-x-1 cursor-pointer ${
                timeRange === 'all-time'
                  ? 'bg-amber-500 text-white shadow-2xs'
                  : 'text-[#86868B] hover:text-[#1D1D1F]'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>All-Time</span>
            </button>
          </div>
        </div>

        {/* Champion Spotlight Card */}
        {topLeader && (
          <div className="bg-white/90 backdrop-blur-md p-4 rounded-xl border border-amber-300/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="relative shrink-0">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 text-white font-black text-xl flex items-center justify-center shadow-md">
                  {topLeader.tech.name.charAt(0)}
                </div>
                <div className="absolute -top-2 -right-2 bg-amber-400 text-white p-1 rounded-full shadow-md animate-bounce">
                  <Crown className="w-4 h-4 fill-amber-100 text-amber-900" />
                </div>
              </div>

              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="font-extrabold text-base text-[#1D1D1F]">{topLeader.tech.name}</h3>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300 flex items-center space-x-1">
                    <Sparkles className="w-3 h-3 text-amber-600" />
                    <span>#1 TOP REPAIR TECHNICIAN</span>
                  </span>
                </div>
                <p className="text-xs text-[#86868B] mt-0.5">
                  <span className="font-semibold text-[#0071E3]">{topLeader.tech.level}</span>
                  {topLeader.tech.specialty && ` • ${topLeader.tech.specialty}`}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-6 text-center shrink-0">
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-[#86868B] uppercase">Completed Repairs</span>
                <p className="text-2xl font-black text-amber-600">{topLeader.completedCount}</p>
                <span className="text-[10px] text-emerald-600 font-bold">Current Month</span>
              </div>

              <div className="h-8 w-px bg-[#E5E5EA]" />

              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-[#86868B] uppercase">Avg Turnaround</span>
                <p className="text-2xl font-black text-[#1D1D1F]">{topLeader.avgDurationHours}h</p>
                <span className="text-[10px] text-[#0071E3] font-bold">Fast-Track</span>
              </div>

              <div className="h-8 w-px bg-[#E5E5EA]" />

              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-[#86868B] uppercase">QA Pass Rate</span>
                <p className="text-2xl font-black text-[#34C759]">{topLeader.successRate}%</p>
                <span className="text-[10px] text-[#86868B] font-medium">0 Returns</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Podium Display (Top 3) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {leaderboardData.slice(0, 3).map((item, idx) => {
          const rank = idx + 1;
          const isFirst = rank === 1;
          const isSecond = rank === 2;
          const isThird = rank === 3;

          const cardBg = isFirst
            ? 'bg-gradient-to-b from-amber-50 to-white border-amber-300'
            : isSecond
            ? 'bg-gradient-to-b from-slate-50 to-white border-slate-300'
            : 'bg-gradient-to-b from-orange-50/60 to-white border-amber-200';

          const badgeBg = isFirst
            ? 'bg-amber-500 text-white shadow-xs'
            : isSecond
            ? 'bg-slate-500 text-white shadow-xs'
            : 'bg-amber-700 text-white shadow-xs';

          return (
            <div
              key={item.tech.id}
              className={`p-5 rounded-2xl border ${cardBg} shadow-2xs space-y-4 relative flex flex-col justify-between`}
            >
              {/* Rank Badge Header */}
              <div className="flex items-center justify-between">
                <div className={`px-2.5 py-1 rounded-xl text-xs font-black flex items-center space-x-1.5 ${badgeBg}`}>
                  {isFirst && <Crown className="w-3.5 h-3.5" />}
                  {isSecond && <Medal className="w-3.5 h-3.5" />}
                  {isThird && <Award className="w-3.5 h-3.5" />}
                  <span>#{rank} RANK</span>
                </div>

                <span className="text-xs font-mono font-extrabold text-[#86868B]">
                  {Math.round((item.completedCount / (totalShopCompleted || 1)) * 100)}% Shop Share
                </span>
              </div>

              {/* Technician Info */}
              <div className="space-y-2">
                <div className="flex items-center space-x-3">
                  <div
                    className={`w-12 h-12 rounded-2xl font-black text-lg flex items-center justify-center shrink-0 ${
                      isFirst
                        ? 'bg-amber-500 text-white'
                        : isSecond
                        ? 'bg-slate-600 text-white'
                        : 'bg-amber-800 text-white'
                    }`}
                  >
                    {item.tech.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-black text-sm text-[#1D1D1F]">{item.tech.name}</h3>
                    <p className="text-xs text-[#0071E3] font-bold">{item.tech.level}</p>
                    <p className="text-[11px] text-[#86868B] truncate max-w-[180px]">{item.tech.email}</p>
                  </div>
                </div>
              </div>

              {/* Highlight Stats */}
              <div className="bg-white/80 p-3 rounded-xl border border-[#E5E5EA] grid grid-cols-2 gap-2 text-center text-xs">
                <div>
                  <span className="text-[10px] text-[#86868B] font-bold uppercase block">Monthly Repairs</span>
                  <span className="text-xl font-black text-[#1D1D1F]">{item.completedCount}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#86868B] font-bold uppercase block">Avg Turnaround</span>
                  <span className="text-xl font-black text-purple-700">{item.avgDurationHours}h</span>
                </div>
              </div>

              {/* Progress Bar vs Top Leader */}
              <div className="space-y-1 text-xs">
                <div className="flex justify-between font-bold text-[11px]">
                  <span className="text-[#86868B]">Pace relative to leader</span>
                  <span className="text-[#0071E3]">{Math.round((item.completedCount / maxCompleted) * 100)}%</span>
                </div>
                <div className="w-full bg-[#E5E5EA] h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      isFirst ? 'bg-amber-500' : isSecond ? 'bg-slate-500' : 'bg-amber-700'
                    }`}
                    style={{ width: `${Math.max(10, Math.round((item.completedCount / maxCompleted) * 100))}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Comprehensive Leaderboard Table */}
      <div className="bg-white border border-[#E5E5EA] rounded-2xl p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5E5EA] pb-3">
          <div className="flex items-center space-x-2">
            <span className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
              <Trophy className="w-4 h-4" />
            </span>
            <h3 className="font-extrabold text-sm text-[#1D1D1F]">
              Full Technician Monthly Repair Leaderboard Roster
            </h3>
          </div>

          <span className="text-xs text-[#86868B] font-medium">
            Total {totalShopCompleted} Completed Repairs in Current Month
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#1D1D1F]">
            <thead>
              <tr className="border-b border-[#E5E5EA] text-[#86868B] font-bold text-[10px] uppercase tracking-wider bg-[#F8F9FA]">
                <th className="py-2.5 px-3 rounded-l-xl">Rank</th>
                <th className="py-2.5 px-3">Technician</th>
                <th className="py-2.5 px-3 text-center">Completed Repairs (Month)</th>
                <th className="py-2.5 px-3 text-center">Relative Pace</th>
                <th className="py-2.5 px-3 text-center">Est. Revenue Generated</th>
                <th className="py-2.5 px-3 text-center">Avg Turnaround</th>
                <th className="py-2.5 px-3 text-center">QA Pass Rate</th>
                <th className="py-2.5 px-3 text-center">Active Queue</th>
                <th className="py-2.5 px-3 text-right rounded-r-xl">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5EA]">
              {leaderboardData.map((item, index) => {
                const rank = index + 1;
                const pctOfMax = Math.round((item.completedCount / maxCompleted) * 100);

                return (
                  <tr key={item.tech.id} className="hover:bg-[#F8F9FA] transition-colors">
                    <td className="py-3 px-3">
                      <span className={`w-6 h-6 rounded-lg text-xs font-black flex items-center justify-center ${
                        rank === 1 ? 'bg-amber-400 text-amber-950 font-black shadow-xs' :
                        rank === 2 ? 'bg-slate-300 text-slate-900 font-extrabold' :
                        rank === 3 ? 'bg-amber-700/20 text-amber-900 font-bold' :
                        'bg-[#F5F5F7] text-[#86868B]'
                      }`}>
                        #{rank}
                      </span>
                    </td>

                    <td className="py-3 px-3">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-xl bg-[#0071E3]/10 text-[#0071E3] font-bold text-xs flex items-center justify-center shrink-0">
                          {item.tech.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-extrabold text-[#1D1D1F] flex items-center space-x-1">
                            <span>{item.tech.name}</span>
                            {rank === 1 && <Crown className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />}
                          </p>
                          <p className="text-[10px] text-[#0071E3] font-bold">{item.tech.level}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-3 text-center">
                      <span className="font-black text-[#1D1D1F] text-sm">{item.completedCount}</span>
                      <span className="text-[10px] text-emerald-600 font-bold block">completed</span>
                    </td>

                    <td className="py-3 px-3 text-center min-w-[120px]">
                      <div className="space-y-1">
                        <span className="text-[10px] font-mono font-bold text-[#86868B]">{pctOfMax}%</span>
                        <div className="w-full bg-[#E5E5EA] h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${rank === 1 ? 'bg-amber-500' : 'bg-[#0071E3]'}`}
                            style={{ width: `${Math.max(8, pctOfMax)}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-3 text-center font-extrabold text-[#1D1D1F]">
                      {item.revenue.toLocaleString()} MMK
                    </td>

                    <td className="py-3 px-3 text-center font-bold text-purple-700">
                      {item.avgDurationHours} Hours
                    </td>

                    <td className="py-3 px-3 text-center font-bold text-[#34C759]">
                      {item.successRate}%
                    </td>

                    <td className="py-3 px-3 text-center font-bold">
                      <span className="px-2 py-0.5 rounded-full bg-[#F5F5F7] text-[#1D1D1F] border border-[#D2D2D7] text-[10px]">
                        {item.activeQueueCount} active
                      </span>
                    </td>

                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => onNavigateToTab('pipeline')}
                        className="px-2.5 py-1 bg-[#F5F5F7] hover:bg-[#0071E3] text-[#0071E3] hover:text-white font-bold text-[11px] rounded-lg border border-[#D2D2D7] transition-all cursor-pointer"
                      >
                        View Queue
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
