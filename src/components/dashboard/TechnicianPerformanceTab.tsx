import React, { useState } from 'react';
import { 
  Users, 
  Clock, 
  CheckCircle2, 
  Award, 
  Zap, 
  BarChart3, 
  Wrench, 
  ShieldCheck, 
  Scale, 
  ChevronRight, 
  TrendingUp, 
  CircleDot, 
  Activity,
  AlertCircle,
  Smartphone,
  Cpu,
  Layers,
  Sparkles
} from 'lucide-react';
import { WorkOrder, Technician } from '../../types';
import { StatusBadge } from '../common/StatusBadge';

interface TechnicianPerformanceTabProps {
  technicians: Technician[];
  workOrders: WorkOrder[];
  onNavigateToTab: (tab: string) => void;
}

export const TechnicianPerformanceTab: React.FC<TechnicianPerformanceTabProps> = ({
  technicians,
  workOrders,
  onNavigateToTab,
}) => {
  const [selectedTechId, setSelectedTechId] = useState<string>('ALL');

  // Compute stats for each technician
  const techStats = technicians.map((tech) => {
    // Work orders assigned to this technician
    const techOrders = workOrders.filter((wo) => wo.assignedTechId === tech.id);
    
    // Active jobs in queue
    const activeOrders = techOrders.filter(
      (wo) => wo.status !== 'Finished' && wo.status !== 'Taken Out' && wo.status !== 'Cant Repair' && wo.status !== 'Customer Not Repair'
    );
    const activeCount = activeOrders.length > 0 ? activeOrders.length : tech.activeJobsCount;

    // Completed jobs in current filtered dataset
    const finishedOrders = techOrders.filter(
      (wo) => wo.status === 'Finished' || wo.status === 'Taken Out'
    );
    
    // Total successful repairs = completedThisMonth + finished in state
    const totalSuccessfulRepairs = tech.completedThisMonth + finishedOrders.length;

    // Average repair duration calculation in hours
    // Benchmark durations based on skill level if no closed timestamps available
    let avgDurationHours = 2.4;
    if (tech.level === 'L1 Modular') {
      avgDurationHours = 1.4;
    } else if (tech.level === 'L2 Advanced') {
      avgDurationHours = 2.2;
    } else if (tech.level === 'L3 Micro-Soldering') {
      avgDurationHours = 3.8;
    }

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

    // Individual Throughput (monthly target benchmark is 50 jobs)
    const monthlyTarget = 50;
    const throughputPercent = Math.min(100, Math.round((totalSuccessfulRepairs / monthlyTarget) * 100));
    const weeklyThroughput = Math.round(tech.completedThisMonth / 4);

    // QA Pass & Success Rate
    const totalAssignedCount = totalSuccessfulRepairs + tech.warrantyReturnCount;
    const successRatePercent = totalAssignedCount > 0 
      ? Math.min(100, Math.round(((totalSuccessfulRepairs) / (totalAssignedCount)) * 100))
      : 98;

    return {
      tech,
      techOrders,
      activeOrders,
      activeCount,
      finishedOrders,
      totalSuccessfulRepairs,
      avgDurationHours,
      throughputPercent,
      weeklyThroughput,
      successRatePercent,
    };
  });

  // Shop wide aggregates
  const totalShopSuccessfulRepairs = techStats.reduce((sum, t) => sum + t.totalSuccessfulRepairs, 0);
  const avgShopDurationHours = Number(
    (techStats.reduce((sum, t) => sum + t.avgDurationHours, 0) / (techStats.length || 1)).toFixed(1)
  );
  const totalShopWarrantyReturns = technicians.reduce((sum, t) => sum + t.warrantyReturnCount, 0);
  const shopSuccessRate = totalShopSuccessfulRepairs > 0
    ? Math.round(((totalShopSuccessfulRepairs) / (totalShopSuccessfulRepairs + totalShopWarrantyReturns)) * 100)
    : 98;

  const filteredTechStats = selectedTechId === 'ALL'
    ? techStats
    : techStats.filter((t) => t.tech.id === selectedTechId);

  return (
    <div className="space-y-6">
      {/* Top Banner: Shop-Wide Staff Performance Metrics */}
      <div className="bg-white border border-[#E5E5EA] rounded-2xl p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E5E5EA]">
          <div className="space-y-0.5">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 bg-[#F0F6FF] text-[#0071E3] rounded-lg">
                <Users className="w-5 h-5" />
              </div>
              <h2 className="text-base font-extrabold text-[#1D1D1F]">
                Technician Staff Performance & Capacity Tracker
              </h2>
            </div>
            <p className="text-xs text-[#86868B] pl-8">
              Real-time monitoring of individual repair throughput, average job completion duration, and successful fix rates.
            </p>
          </div>

          {/* Technician Selector Filter */}
          <div className="flex items-center space-x-2 shrink-0">
            <span className="text-xs font-bold text-[#86868B]">Filter Staff:</span>
            <select
              value={selectedTechId}
              onChange={(e) => setSelectedTechId(e.target.value)}
              className="bg-[#F5F5F7] border border-[#E5E5EA] text-[#1D1D1F] text-xs font-bold rounded-xl px-3 py-1.5 focus:bg-white focus:border-[#0071E3] focus:outline-none transition-all shadow-2xs"
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
          <div className="bg-gradient-to-br from-[#EAF8ED]/50 to-[#EAF8ED]/20 border border-[#34C759]/30 p-4 rounded-xl flex items-center justify-between shadow-2xs">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-[#86868B] uppercase tracking-wider">Total Successful Repairs</span>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl font-extrabold text-[#1D1D1F]">{totalShopSuccessfulRepairs}</span>
                <span className="text-xs text-[#28A745] font-bold">Repairs Completed</span>
              </div>
              <p className="text-[11px] text-[#1E7E34] font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#34C759]" />
                {shopSuccessRate}% First-Time QA Pass Rate
              </p>
            </div>
            <div className="p-3 bg-[#34C759] text-white rounded-xl shadow-xs">
              <Award className="w-6 h-6" />
            </div>
          </div>

          {/* Avg Turnaround Time */}
          <div className="bg-gradient-to-br from-[#F0F6FF]/50 to-[#F0F6FF]/20 border border-[#0071E3]/30 p-4 rounded-xl flex items-center justify-between shadow-2xs">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-[#86868B] uppercase tracking-wider">Average Repair Duration</span>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl font-extrabold text-[#1D1D1F]">{avgShopDurationHours}</span>
                <span className="text-xs text-[#0071E3] font-bold">Hours / Job</span>
              </div>
              <p className="text-[11px] text-[#0071E3] font-medium flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-[#0071E3]" />
                Fast-track modular & L3 micro-soldering
              </p>
            </div>
            <div className="p-3 bg-[#0071E3] text-white rounded-xl shadow-xs">
              <Clock className="w-6 h-6" />
            </div>
          </div>

          {/* Shop Capacity & Active Load */}
          <div className="bg-gradient-to-br from-purple-50/50 to-purple-50/20 border border-purple-300/40 p-4 rounded-xl flex items-center justify-between shadow-2xs">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-[#86868B] uppercase tracking-wider">Active Queue Capacity</span>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl font-extrabold text-[#1D1D1F]">
                  {techStats.reduce((sum, t) => sum + t.activeCount, 0)}
                </span>
                <span className="text-xs text-[#AF52DE] font-bold">In-Queue Jobs</span>
              </div>
              <p className="text-[11px] text-[#AF52DE] font-medium flex items-center gap-1">
                <Scale className="w-3.5 h-3.5 text-[#AF52DE]" />
                Balanced across {technicians.length} staff members
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
        {filteredTechStats.map(({ tech, techOrders, activeOrders, activeCount, finishedOrders, totalSuccessfulRepairs, avgDurationHours, throughputPercent, weeklyThroughput, successRatePercent }) => {
          return (
            <div
              key={tech.id}
              className="bg-white border border-[#E5E5EA] hover:border-[#0071E3]/40 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all space-y-5 flex flex-col justify-between"
            >
              {/* Header: Technician Info */}
              <div className="space-y-3 pb-3 border-b border-[#E5E5EA]">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center space-x-3">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-purple-100 to-indigo-100 text-[#AF52DE] font-black text-lg flex items-center justify-center border border-purple-200 shadow-2xs shrink-0">
                      {tech.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-[#1D1D1F] flex items-center gap-1.5">
                        <span>{tech.name}</span>
                        <span className="inline-block w-2 h-2 rounded-full bg-[#34C759]" title="Active Staff" />
                      </h3>
                      <p className="text-xs text-[#86868B]">{tech.email}</p>
                    </div>
                  </div>

                  <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-lg border shadow-2xs shrink-0 ${
                    tech.level === 'L3 Micro-Soldering' ? 'bg-purple-50 text-[#AF52DE] border-purple-200' :
                    tech.level === 'L2 Advanced' ? 'bg-blue-50 text-[#0071E3] border-blue-200' :
                    'bg-emerald-50 text-[#1E7E34] border-emerald-200'
                  }`}>
                    {tech.level}
                  </span>
                </div>

                {/* Status Bar: Active Workload Badge */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-[#86868B] font-semibold">Active Queue Load:</span>
                  <div className="flex items-center space-x-2">
                    <span className="font-extrabold text-[#1D1D1F]">{activeCount} active tickets</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      activeCount >= 5 ? 'bg-rose-50 text-rose-700 border-rose-200' :
                      activeCount >= 3 ? 'bg-amber-50 text-amber-700 border-amber-200' :
                      'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}>
                      {activeCount >= 5 ? 'Heavy' : activeCount >= 3 ? 'Moderate' : 'Optimal'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Core Performance Metrics: Throughput, Duration, Successful Repairs */}
              <div className="grid grid-cols-3 gap-2 py-1 text-center bg-[#F8F9FA] p-3 rounded-xl border border-[#E5E5EA]">
                {/* 1. Throughput */}
                <div className="space-y-0.5">
                  <span className="block text-[10px] font-bold text-[#86868B] uppercase">Throughput</span>
                  <span className="block text-lg font-extrabold text-[#1D1D1F]">{totalSuccessfulRepairs}</span>
                  <span className="block text-[10px] text-[#0071E3] font-bold">{weeklyThroughput}/wk avg</span>
                </div>

                {/* 2. Avg Repair Duration */}
                <div className="space-y-0.5 border-x border-[#E5E5EA] px-1">
                  <span className="block text-[10px] font-bold text-[#86868B] uppercase">Avg Duration</span>
                  <span className="block text-lg font-extrabold text-[#1D1D1F]">{avgDurationHours}h</span>
                  <span className="block text-[10px] text-purple-600 font-bold">Turnaround</span>
                </div>

                {/* 3. Successful Repairs */}
                <div className="space-y-0.5">
                  <span className="block text-[10px] font-bold text-[#86868B] uppercase">Success Rate</span>
                  <span className="block text-lg font-extrabold text-[#1E7E34]">{successRatePercent}%</span>
                  <span className="block text-[10px] text-[#86868B] font-medium">
                    {tech.warrantyReturnCount === 0 ? '0 Returns' : `${tech.warrantyReturnCount} Return`}
                  </span>
                </div>
              </div>

              {/* Progress Bar: Throughput vs Target */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-[#1D1D1F] flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5 text-[#0071E3]" />
                    <span>Monthly Throughput Goal</span>
                  </span>
                  <span className="font-mono font-bold text-[#0071E3]">{throughputPercent}% ({totalSuccessfulRepairs}/50)</span>
                </div>
                <div className="w-full bg-[#E5E5EA] rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-[#0071E3] to-[#34C759] h-full rounded-full transition-all duration-300"
                    style={{ width: `${Math.max(6, throughputPercent)}%` }}
                  />
                </div>
              </div>

              {/* Assigned Active Work Orders Sub-List */}
              <div className="space-y-2 pt-2 border-t border-[#E5E5EA]">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-[#86868B] uppercase text-[10px] tracking-wider">Assigned Active Tickets</span>
                  <span className="text-[10px] font-mono text-[#0071E3] font-bold">{activeOrders.length} In-Queue</span>
                </div>

                {activeOrders.length === 0 ? (
                  <div className="p-3 bg-[#F5F5F7] rounded-xl text-center text-xs text-[#86868B]">
                    No active repairs in queue. Ready for new tickets.
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                    {activeOrders.slice(0, 3).map((wo) => (
                      <div
                        key={wo.id}
                        onClick={() => onNavigateToTab('pipeline')}
                        className="p-2 bg-[#F8F9FA] hover:bg-white border border-[#E5E5EA] hover:border-[#0071E3]/40 rounded-lg flex items-center justify-between text-xs cursor-pointer transition-all group"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="font-mono font-bold text-[#0071E3] group-hover:underline text-[11px] truncate">
                            {wo.orderNumber}
                          </p>
                          <p className="text-[11px] text-[#1D1D1F] font-semibold truncate">{wo.deviceModel}</p>
                        </div>
                        <StatusBadge status={wo.status} size="xs" />
                      </div>
                    ))}
                    {activeOrders.length > 3 && (
                      <p className="text-[10px] text-center text-[#86868B] font-medium pt-1">
                        + {activeOrders.length - 3} more tickets assigned
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Action: Manage Queue */}
              <button
                onClick={() => onNavigateToTab('pipeline')}
                className="w-full py-2 bg-[#F5F5F7] hover:bg-[#E5E5EA] text-[#0071E3] font-bold text-xs rounded-xl border border-[#E5E5EA] flex items-center justify-center space-x-1.5 transition-all shadow-2xs"
              >
                <span>View Assigned Tickets in Pipeline</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Comprehensive Staff Leaderboard & Comparison Table */}
      <div className="bg-white border border-[#E5E5EA] rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-[#E5E5EA] pb-3">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-[#EAF8ED] text-[#34C759] rounded-lg">
              <Award className="w-5 h-5" />
            </div>
            <h3 className="font-extrabold text-sm text-[#1D1D1F]">
              Staff Performance Comparison & Metrics Leaderboard
            </h3>
          </div>
          <span className="text-xs text-[#86868B] font-semibold">
            Ranked by Monthly Throughput
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#1D1D1F]">
            <thead>
              <tr className="border-b border-[#E5E5EA] text-[#86868B] font-bold text-[10px] uppercase tracking-wider bg-[#F8F9FA]">
                <th className="py-2.5 px-3 rounded-l-xl">Rank & Staff Name</th>
                <th className="py-2.5 px-3">Skill Level</th>
                <th className="py-2.5 px-3 text-center">Active Queue</th>
                <th className="py-2.5 px-3 text-center">Monthly Throughput</th>
                <th className="py-2.5 px-3 text-center">Avg Repair Duration</th>
                <th className="py-2.5 px-3 text-center">Success Rate</th>
                <th className="py-2.5 px-3 text-center">Warranty Returns</th>
                <th className="py-2.5 px-3 text-right rounded-r-xl">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5EA]">
              {[...techStats]
                .sort((a, b) => b.totalSuccessfulRepairs - a.totalSuccessfulRepairs)
                .map(({ tech, activeCount, totalSuccessfulRepairs, avgDurationHours, successRatePercent }, index) => (
                  <tr key={tech.id} className="hover:bg-[#F5F5F7] transition-colors">
                    <td className="py-3 px-3">
                      <div className="flex items-center space-x-2.5">
                        <span className={`w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center shrink-0 ${
                          index === 0 ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                          index === 1 ? 'bg-slate-200 text-slate-700' :
                          'bg-amber-700/10 text-amber-900'
                        }`}>
                          #{index + 1}
                        </span>
                        <div>
                          <p className="font-bold text-[#1D1D1F]">{tech.name}</p>
                          <p className="text-[10px] text-[#86868B]">{tech.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-semibold text-xs text-[#86868B]">{tech.level}</span>
                    </td>
                    <td className="py-3 px-3 text-center font-bold">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                        activeCount >= 5 ? 'bg-rose-100 text-rose-800 font-bold' :
                        activeCount >= 3 ? 'bg-amber-100 text-amber-800 font-bold' :
                        'bg-blue-50 text-[#0071E3] font-bold'
                      }`}>
                        {activeCount} active
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="font-extrabold text-[#1D1D1F] text-sm">{totalSuccessfulRepairs}</span>
                      <span className="text-[10px] text-[#86868B] block">repairs</span>
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-purple-700">
                      {avgDurationHours} Hours
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-[#1E7E34]">
                      {successRatePercent}%
                    </td>
                    <td className="py-3 px-3 text-center font-medium">
                      {tech.warrantyReturnCount === 0 ? (
                        <span className="text-[#28A745] font-bold">0 Returns</span>
                      ) : (
                        <span className="text-amber-700 font-bold">{tech.warrantyReturnCount} Returns</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => onNavigateToTab('pipeline')}
                        className="px-2.5 py-1 bg-[#F0F6FF] hover:bg-[#0071E3] text-[#0071E3] hover:text-white font-bold text-[11px] rounded-lg transition-all border border-[#0071E3]/20"
                      >
                        Balance Queue
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
