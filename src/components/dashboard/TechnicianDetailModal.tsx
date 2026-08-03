import React from 'react';
import {
  X,
  Wrench,
  Clock,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  Scale,
  Award,
  Percent,
  Sparkles,
} from 'lucide-react';
import { WorkOrder, Technician } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { computeTechStats, getDurationHours, getRepairType } from '../../utils/techAnalytics';

interface TechnicianDetailModalProps {
  tech: Technician;
  workOrders: WorkOrder[];
  periodLabel?: string;
  onClose: () => void;
  onNavigateToTab: (tab: string) => void;
}

export const TechnicianDetailModal: React.FC<TechnicianDetailModalProps> = ({
  tech,
  workOrders,
  periodLabel,
  onClose,
  onNavigateToTab,
}) => {
  const stats = computeTechStats(workOrders, tech);
  const {
    activeOrders, activeCount, finishedOrders, liveCompleted, baselineMonthly,
    avgDurationHours, revenue, laborRevenue, commissionRateParts, commissionRateHardware, estCommission,
    hardwareJobCount, partsJobCount,
    warrantyReturnCount, successRate, loadBadge,
  } = stats;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${tech.name} detail`}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85dvh] overflow-y-auto border border-[#E5E5EA]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-md border-b border-[#E5E5EA] px-5 py-4 flex items-start justify-between gap-3 z-10">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-100 to-indigo-100 text-[#AF52DE] font-black text-xl flex items-center justify-center border border-purple-200 shadow-2xs shrink-0">
              {tech.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <h3 className="font-extrabold text-base text-[#1D1D1F] truncate">{tech.name}</h3>
              <div className="flex items-center space-x-2 mt-0.5 flex-wrap gap-y-1">
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-lg border ${
                  tech.level === 'Level 3 Master' ? 'bg-purple-50 text-[#AF52DE] border-purple-200' :
                  tech.level === 'Level 2 Spareparts + Hardware' ? 'bg-blue-50 text-[#0071E3] border-blue-200' :
                  'bg-emerald-50 text-[#1E7E34] border-emerald-200'
                }`}>
                  {tech.level}
                </span>
                {tech.specialty && (
                  <span className="text-[10px] font-bold text-[#86868B] bg-[#F5F5F7] px-2 py-0.5 rounded-lg border border-[#E5E5EA]">
                    {tech.specialty}
                  </span>
                )}
                {commissionRateParts > 0 || commissionRateHardware > 0 ? (
                  <span className="text-[10px] font-bold text-[#0071E3] bg-[#F0F6FF] px-2 py-0.5 rounded-lg border border-[#0071E3]/20">
                    {commissionRateParts}% parts · {commissionRateHardware}% HW commission
                  </span>
                ) : null}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-[#F5F5F7] text-[#86868B] hover:text-[#1D1D1F] transition-all cursor-pointer shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* KPI Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-[#F8F9FA] border border-[#E5E5EA] rounded-xl">
              <span className="text-[10px] font-bold text-[#86868B] uppercase flex items-center gap-1">
                <Scale className="w-3 h-3" /> Active Queue
              </span>
              <p className="text-xl font-extrabold text-[#1D1D1F] mt-1">{activeCount}</p>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border inline-block mt-1 ${loadBadge.color}`}>
                {loadBadge.label}
              </span>
            </div>
            <div className="p-3 bg-[#F8F9FA] border border-[#E5E5EA] rounded-xl">
              <span className="text-[10px] font-bold text-[#86868B] uppercase flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Completed {periodLabel ? `(${periodLabel})` : ''}
              </span>
              <p className="text-xl font-extrabold text-[#1D1D1F] mt-1">{liveCompleted}</p>
              <span className="text-[10px] text-[#86868B] font-bold">Baseline {baselineMonthly}/mo</span>
            </div>
            <div className="p-3 bg-[#F8F9FA] border border-[#E5E5EA] rounded-xl">
              <span className="text-[10px] font-bold text-[#86868B] uppercase flex items-center gap-1">
                <Clock className="w-3 h-3" /> Avg Turnaround
              </span>
              <p className="text-xl font-extrabold text-[#1D1D1F] mt-1">
                {avgDurationHours !== null ? `${avgDurationHours}h` : '—'}
              </p>
              <span className="text-[10px] text-[#86868B] font-bold">per completed job</span>
            </div>
            <div className="p-3 bg-[#F8F9FA] border border-[#E5E5EA] rounded-xl">
              <span className="text-[10px] font-bold text-[#86868B] uppercase flex items-center gap-1">
                <Award className="w-3 h-3" /> QA Pass Rate
              </span>
              <p className="text-xl font-extrabold text-[#1E7E34] mt-1">
                {successRate !== null ? `${successRate}%` : '—'}
              </p>
              <span className="text-[10px] text-[#86868B] font-bold">
                {warrantyReturnCount === 0 ? '0 returns' : `${warrantyReturnCount} return${warrantyReturnCount > 1 ? 's' : ''}`}
              </span>
            </div>
            <div className="p-3 bg-[#F8F9FA] border border-[#E5E5EA] rounded-xl">
              <span className="text-[10px] font-bold text-[#86868B] uppercase flex items-center gap-1">
                <DollarSign className="w-3 h-3" /> Labor Revenue
              </span>
              <p className="text-xl font-extrabold text-[#1D1D1F] mt-1">
                {laborRevenue > 0 ? `${laborRevenue.toLocaleString()} MMK` : '—'}
              </p>
              <span className="text-[10px] text-[#86868B] font-bold">this period</span>
            </div>
            <div className="p-3 bg-[#F8F9FA] border border-[#E5E5EA] rounded-xl">
              <span className="text-[10px] font-bold text-[#86868B] uppercase flex items-center gap-1">
                <Percent className="w-3 h-3" /> Est. Commission
              </span>
              <p className="text-xl font-extrabold text-[#0071E3] mt-1">
                {estCommission !== null ? `${estCommission.toLocaleString()} MMK` : '—'}
              </p>
              <span className="text-[10px] text-[#86868B] font-bold">
                {commissionRateParts > 0 || commissionRateHardware > 0
                  ? `${commissionRateParts}% parts · ${commissionRateHardware}% HW of labor`
                  : 'no rates set'}
              </span>
            </div>
          </div>

          {/* Earnings summary strip */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-gradient-to-br from-[#F0F6FF]/50 to-[#F0F6FF]/20 border border-[#0071E3]/25 rounded-xl text-xs">
            <span className="font-bold text-[#1D1D1F] flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-[#0071E3]" />
              Period totals (real ticket data)
            </span>
            <span className="text-[#86868B]">
              Tickets <span className="font-black text-[#1D1D1F]">{finishedOrders.length}</span>
              <span className="mx-1.5 text-[#D2D2D7]">|</span>
              <span className="font-bold text-[#AF52DE]">{hardwareJobCount} HW</span>
              <span className="mx-1 text-[#D2D2D7]">·</span>
              <span className="font-bold text-[#0071E3]">{partsJobCount} Parts</span>
              <span className="mx-1.5 text-[#D2D2D7]">|</span>
              Revenue <span className="font-black text-[#1D1D1F]">{revenue > 0 ? `${revenue.toLocaleString()} MMK` : '—'}</span>
              <span className="mx-1.5 text-[#D2D2D7]">|</span>
              Labor <span className="font-black text-[#0071E3]">{laborRevenue > 0 ? `${laborRevenue.toLocaleString()} MMK` : '—'}</span>
            </span>
          </div>

          {/* Active Tickets */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-extrabold text-xs text-[#1D1D1F] uppercase tracking-wider">Active Tickets ({activeOrders.length})</h4>
              <button
                onClick={() => { onClose(); onNavigateToTab('pipeline'); }}
                className="text-[11px] font-bold text-[#0071E3] hover:underline cursor-pointer"
              >
                Open Pipeline →
              </button>
            </div>
            {activeOrders.length === 0 ? (
              <p className="p-3 bg-[#F5F5F7] rounded-xl text-center text-xs text-[#86868B]">
                No active repairs in queue.
              </p>
            ) : (
              <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                {activeOrders.map((wo) => (
                  <div
                    key={wo.id}
                    onClick={() => { onClose(); onNavigateToTab('pipeline'); }}
                    className="p-2.5 bg-[#F8F9FA] hover:bg-white border border-[#E5E5EA] hover:border-[#0071E3]/40 rounded-lg flex items-center justify-between text-xs cursor-pointer transition-all"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="font-mono font-bold text-[#0071E3] text-[11px] truncate">{wo.orderNumber}</p>
                      <p className="text-[11px] text-[#1D1D1F] font-semibold truncate">{wo.deviceModel}</p>
                    </div>
                    <StatusBadge status={wo.status} size="xs" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Completed Tickets */}
          <div className="space-y-2">
            <h4 className="font-extrabold text-xs text-[#1D1D1F] uppercase tracking-wider">
              Completed This Period ({finishedOrders.length})
            </h4>
            {finishedOrders.length === 0 ? (
              <p className="p-3 bg-[#F5F5F7] rounded-xl text-center text-xs text-[#86868B]">
                No completed repairs in the selected period.
              </p>
            ) : (
              <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                {finishedOrders.map((wo) => {
                  const hours = getDurationHours(wo);
                  const isHardware = getRepairType(wo) === 'hardware';
                  const source = wo.repairTypeAI ? 'AI' : 'RULE';
                  return (
                    <div
                      key={wo.id}
                      onClick={() => { onClose(); onNavigateToTab('pipeline'); }}
                      className="p-2.5 bg-[#EAF8ED]/40 hover:bg-white border border-[#E5E5EA] hover:border-[#34C759]/40 rounded-lg flex items-center justify-between text-xs cursor-pointer transition-all"
                    >
                      <div className="min-w-0 pr-2">
                        <p className="font-mono font-bold text-[#1E7E34] text-[11px] truncate">{wo.orderNumber}</p>
                        <p className="text-[11px] text-[#1D1D1F] font-semibold truncate">{wo.deviceModel}</p>
                      </div>
                      <div className="flex items-center space-x-2 shrink-0">
                        <span
                          className={`text-[9px] font-black px-1.5 py-0.5 rounded-md border flex items-center space-x-0.5 ${
                            isHardware
                              ? 'bg-purple-50 text-[#AF52DE] border-purple-200'
                              : 'bg-[#F0F6FF] text-[#0071E3] border-[#0071E3]/20'
                          }`}
                          title={source === 'AI' ? 'Classified by AI' : 'Classified by keyword rules'}
                        >
                          <span>{isHardware ? 'HW' : 'PARTS'}</span>
                          {source === 'AI' && <Sparkles className="w-2.5 h-2.5" />}
                        </span>
                        {hours !== null && (
                          <span className="text-[10px] text-[#86868B] font-mono font-bold">{hours.toFixed(1)}h</span>
                        )}
                        <span className="font-extrabold text-[#1D1D1F] text-[11px]">
                          {(wo.subtotal || 0).toLocaleString()} MMK
                        </span>
                        <StatusBadge status={wo.status} size="xs" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-1 border-t border-[#E5E5EA]">
            <p className="text-[10px] text-[#86868B] flex items-center gap-1">
              <Wrench className="w-3 h-3" />
              Data source: work orders in the selected dashboard period
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-[#0071E3] hover:bg-[#0077ED] text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
