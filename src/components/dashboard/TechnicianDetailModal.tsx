import React from 'react';
import { Button } from '../ui';
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
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85dvh] overflow-y-auto border border-line"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-md border-b border-line px-5 py-4 flex items-start justify-between gap-3 z-10">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-100 to-indigo-100 text-purple font-black text-xl flex items-center justify-center border border-purple-200 shadow-2xs shrink-0">
              {tech.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <h3 className="font-extrabold text-base text-ink truncate">{tech.name}</h3>
              <div className="flex items-center space-x-2 mt-0.5 flex-wrap gap-y-1">
                <span className={`text-xs font-extrabold px-2 py-0.5 rounded-lg border ${
                  tech.level === 'Level 3 Master' ? 'bg-purple-50 text-purple border-purple-200' :
                  tech.level === 'Level 2 Spareparts + Hardware' ? 'bg-blue-50 text-brand border-blue-200' :
                  'bg-emerald-50 text-success-deep border-emerald-200'
                }`}>
                  {tech.level}
                </span>
                {tech.specialty && (
                  <span className="text-xs font-bold text-muted bg-surface px-2 py-0.5 rounded-lg border border-line">
                    {tech.specialty}
                  </span>
                )}
                {commissionRateParts > 0 || commissionRateHardware > 0 ? (
                  <span className="text-xs font-bold text-brand bg-brand-soft px-2 py-0.5 rounded-lg border border-brand/20">
                    {commissionRateParts}% parts · {commissionRateHardware}% HW commission
                  </span>
                ) : null}
              </div>
            </div>
          </div>
          <Button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-surface text-muted hover:text-ink transition-all cursor-pointer shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-5 space-y-5">
          {/* KPI Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-surface border border-line rounded-xl">
              <span className="text-xs font-bold text-muted uppercase flex items-center gap-1">
                <Scale className="w-3 h-3" /> Active Queue
              </span>
              <p className="text-xl font-extrabold text-ink mt-1">{activeCount}</p>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full border inline-block mt-1 ${loadBadge.color}`}>
                {loadBadge.label}
              </span>
            </div>
            <div className="p-3 bg-surface border border-line rounded-xl">
              <span className="text-xs font-bold text-muted uppercase flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Completed {periodLabel ? `(${periodLabel})` : ''}
              </span>
              <p className="text-xl font-extrabold text-ink mt-1">{liveCompleted}</p>
              <span className="text-xs text-muted font-bold">Baseline {baselineMonthly}/mo</span>
            </div>
            <div className="p-3 bg-surface border border-line rounded-xl">
              <span className="text-xs font-bold text-muted uppercase flex items-center gap-1">
                <Clock className="w-3 h-3" /> Avg Turnaround
              </span>
              <p className="text-xl font-extrabold text-ink mt-1">
                {avgDurationHours !== null ? `${avgDurationHours}h` : '—'}
              </p>
              <span className="text-xs text-muted font-bold">per completed job</span>
            </div>
            <div className="p-3 bg-surface border border-line rounded-xl">
              <span className="text-xs font-bold text-muted uppercase flex items-center gap-1">
                <Award className="w-3 h-3" /> QA Pass Rate
              </span>
              <p className="text-xl font-extrabold text-success-deep mt-1">
                {successRate !== null ? `${successRate}%` : '—'}
              </p>
              <span className="text-xs text-muted font-bold">
                {warrantyReturnCount === 0 ? '0 returns' : `${warrantyReturnCount} return${warrantyReturnCount > 1 ? 's' : ''}`}
              </span>
            </div>
            <div className="p-3 bg-surface border border-line rounded-xl">
              <span className="text-xs font-bold text-muted uppercase flex items-center gap-1">
                <DollarSign className="w-3 h-3" /> Labor Revenue
              </span>
              <p className="text-xl font-extrabold text-ink mt-1">
                {laborRevenue > 0 ? `${laborRevenue.toLocaleString()} MMK` : '—'}
              </p>
              <span className="text-xs text-muted font-bold">this period</span>
            </div>
            <div className="p-3 bg-surface border border-line rounded-xl">
              <span className="text-xs font-bold text-muted uppercase flex items-center gap-1">
                <Percent className="w-3 h-3" /> Est. Commission
              </span>
              <p className="text-xl font-extrabold text-brand mt-1">
                {estCommission !== null ? `${estCommission.toLocaleString()} MMK` : '—'}
              </p>
              <span className="text-xs text-muted font-bold">
                {commissionRateParts > 0 || commissionRateHardware > 0
                  ? `${commissionRateParts}% parts · ${commissionRateHardware}% HW of labor`
                  : 'no rates set'}
              </span>
            </div>
          </div>

          {/* Earnings summary strip */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-gradient-to-br from-brand-soft/50 to-brand-soft/20 border border-brand/25 rounded-xl text-xs">
            <span className="font-bold text-ink flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-brand" />
              Period totals (real ticket data)
            </span>
            <span className="text-muted">
              Tickets <span className="font-black text-ink">{finishedOrders.length}</span>
              <span className="mx-1.5 text-line-strong">|</span>
              <span className="font-bold text-purple">{hardwareJobCount} HW</span>
              <span className="mx-1 text-line-strong">·</span>
              <span className="font-bold text-brand">{partsJobCount} Parts</span>
              <span className="mx-1.5 text-line-strong">|</span>
              Revenue <span className="font-black text-ink">{revenue > 0 ? `${revenue.toLocaleString()} MMK` : '—'}</span>
              <span className="mx-1.5 text-line-strong">|</span>
              Labor <span className="font-black text-brand">{laborRevenue > 0 ? `${laborRevenue.toLocaleString()} MMK` : '—'}</span>
            </span>
          </div>

          {/* Active Tickets */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-extrabold text-xs text-ink uppercase tracking-wider">Active Tickets ({activeOrders.length})</h4>
              <Button
                onClick={() => { onClose(); onNavigateToTab('pipeline'); }}
                className="text-xs font-bold text-brand hover:underline cursor-pointer"
              >
                Open Pipeline →
              </Button>
            </div>
            {activeOrders.length === 0 ? (
              <p className="p-3 bg-surface rounded-xl text-center text-xs text-muted">
                No active repairs in queue.
              </p>
            ) : (
              <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                {activeOrders.map((wo) => (
                  <div
                    key={wo.id}
                    onClick={() => { onClose(); onNavigateToTab('pipeline'); }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClose(); onNavigateToTab('pipeline'); }
                    }}
                    className="p-2.5 bg-surface hover:bg-white border border-line hover:border-brand/40 rounded-lg flex items-center justify-between text-xs cursor-pointer transition-all"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="font-mono font-bold text-brand text-xs truncate">{wo.orderNumber}</p>
                      <p className="text-xs text-ink font-semibold truncate">{wo.deviceModel}</p>
                    </div>
                    <StatusBadge status={wo.status} size="xs" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Completed Tickets */}
          <div className="space-y-2">
            <h4 className="font-extrabold text-xs text-ink uppercase tracking-wider">
              Completed This Period ({finishedOrders.length})
            </h4>
            {finishedOrders.length === 0 ? (
              <p className="p-3 bg-surface rounded-xl text-center text-xs text-muted">
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
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClose(); onNavigateToTab('pipeline'); }
                      }}
                      className="p-2.5 bg-success/10/40 hover:bg-white border border-line hover:border-success/40 rounded-lg flex items-center justify-between text-xs cursor-pointer transition-all"
                    >
                      <div className="min-w-0 pr-2">
                        <p className="font-mono font-bold text-success-deep text-xs truncate">{wo.orderNumber}</p>
                        <p className="text-xs text-ink font-semibold truncate">{wo.deviceModel}</p>
                      </div>
                      <div className="flex items-center space-x-2 shrink-0">
                        <span
                          className={`text-xs font-black px-1.5 py-0.5 rounded-md border flex items-center space-x-0.5 ${
                            isHardware
                              ? 'bg-purple-50 text-purple border-purple-200'
                              : 'bg-brand-soft text-brand border-brand/20'
                          }`}
                          title={source === 'AI' ? 'Classified by AI' : 'Classified by keyword rules'}
                        >
                          <span>{isHardware ? 'HW' : 'PARTS'}</span>
                          {source === 'AI' && <Sparkles className="w-2.5 h-2.5" />}
                        </span>
                        {hours !== null && (
                          <span className="text-xs text-muted font-mono font-bold">{hours.toFixed(1)}h</span>
                        )}
                        <span className="font-extrabold text-ink text-xs">
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
          <div className="flex items-center justify-between pt-1 border-t border-line">
            <p className="text-xs text-muted flex items-center gap-1">
              <Wrench className="w-3 h-3" />
              Data source: work orders in the selected dashboard period
            </p>
            <Button
              onClick={onClose}
              className="px-4 py-2 bg-brand hover:bg-brand-deep text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
            >
              Done
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
