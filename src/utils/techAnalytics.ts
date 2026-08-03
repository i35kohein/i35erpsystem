import { WorkOrder, Technician } from '../types';

// ===== Shared technician analytics (single source of truth for dashboard tech KPIs) =====

export const DONE_STATUSES = ['Finished', 'Taken Out'];
export const EXCLUDED_STATUSES = ['Cant Repair', 'Customer Not Repair'];

export const LOAD_THRESHOLD_MODERATE = 3;
export const LOAD_THRESHOLD_HEAVY = 5;

// ===== Repair-type classification: Spareparts Change vs Hardware Repair =====
// A ticket counts as HARDWARE (board-level) when any of these fire:
//   1. serviceType === 'Micro-Soldering'
//   2. microSolderingLog exists (real board diagnostics recorded)
//   3. Repair name / symptoms match board-level keywords
// Everything else defaults to Spareparts Change (modular parts swap).
const HARDWARE_KEYWORDS: RegExp[] = [
  /\b(logic\s*board|motherboard|mainboard|board)\b/i,
  /\bmicro[-\s]?solder(ing)?\b/i,
  /\bchip(s)?\b/i,
  /\bic\b/i,
  /\breball(ing)?\b/i,
  /\bjumper\b/i,
  /\btrace(s)?\b/i,
  /\bwater\b/i,
  /\bliquid\b/i,
  /\bno\s*power\b/i,
  /\bpower\s*ic\b/i,
  /\bcharge\s*ic\b/i,
  /\bcharging\s*ic\b/i,
  /\baudio\s*ic\b/i,
  /\bwifi\s*ic\b/i,
  /\bbaseband\b/i,
  /\bnand\b/i,
  /\bmosfet\b/i,
  /\binductor\b/i,
  /\bshort\s*circuit\b/i,
  /\bboot\s*loop\b/i,
  /\bsolder(ing)?\b/i,
];

export function isHardwareRepair(wo: WorkOrder): boolean {
  if (wo.serviceType === 'Micro-Soldering') return true;
  if (wo.microSolderingLog && Object.keys(wo.microSolderingLog).length > 0) return true;
  const text = [
    (wo.selectedRepairs || []).map((r) => r.name).join(' '),
    wo.symptomsReported || '',
    wo.diagnosticResult || '',
    wo.afterRepairSummary || '',
  ].join(' ');
  return HARDWARE_KEYWORDS.some((re) => re.test(text));
}

/** Final repair type for a ticket: AI verdict wins, rule-based is the fallback. */
export function getRepairType(wo: WorkOrder): 'hardware' | 'spareparts' {
  if (wo.repairTypeAI) return wo.repairTypeAI;
  return isHardwareRepair(wo) ? 'hardware' : 'spareparts';
}

export function getLoadBadge(activeCount: number) {
  if (activeCount >= LOAD_THRESHOLD_HEAVY) {
    return { label: 'Heavy', color: 'bg-rose-50 text-rose-700 border-rose-200' };
  }
  if (activeCount >= LOAD_THRESHOLD_MODERATE) {
    return { label: 'Moderate', color: 'bg-amber-50 text-amber-700 border-amber-200' };
  }
  if (activeCount === 0) {
    return { label: 'Available', color: 'bg-blue-50 text-blue-700 border-blue-200' };
  }
  return { label: 'Optimal', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
}

export function isActiveStatus(status: string) {
  return !DONE_STATUSES.includes(status) && !EXCLUDED_STATUSES.includes(status);
}

export function getTechActiveOrders(workOrders: WorkOrder[], techId: string) {
  return workOrders.filter((wo) => wo.assignedTechId === techId && isActiveStatus(wo.status));
}

export function getTechFinishedOrders(workOrders: WorkOrder[], techId: string) {
  return workOrders.filter((wo) => wo.assignedTechId === techId && DONE_STATUSES.includes(wo.status));
}

/** Real turnaround hours: anchored to completedAt (falls back to updatedAt, then createdAt). */
export function getDurationHours(wo: WorkOrder) {
  const created = new Date(wo.createdAt).getTime();
  const endRaw = wo.completedAt || wo.updatedAt || wo.createdAt;
  const end = new Date(endRaw).getTime();
  if (isNaN(created) || isNaN(end)) return null;
  return Math.max(0.5, (end - created) / (1000 * 60 * 60));
}

/** Labor-only revenue for a work order (isLabor line items). */
export function getLaborRevenue(wo: WorkOrder) {
  return (wo.lineItems || [])
    .filter((i) => i.isLabor)
    .reduce((sum, i) => sum + (i.unitPrice || 0) * (i.quantity || 1), 0);
}

export interface TechStats {
  tech: Technician;
  activeOrders: WorkOrder[];
  activeCount: number;
  finishedOrders: WorkOrder[];
  liveCompleted: number; // finished/taken out in the current filtered window
  baselineMonthly: number; // seeded historical baseline (tech.completedThisMonth) — never added to live
  avgDurationHours: number | null; // null = no finished tickets in window
  revenue: number; // subtotal of finished tickets (real)
  laborRevenue: number; // labor-only revenue of finished tickets (real)
  commissionRateParts: number;
  commissionRateHardware: number;
  estCommission: number | null; // null when no rates configured
  hardwareJobCount: number; // finished tickets classified as board-level
  partsJobCount: number; // finished tickets classified as modular swap
  warrantyReturnCount: number;
  successRate: number | null; // null when no data to compute
  loadBadge: { label: string; color: string };
}

export function computeTechStats(workOrders: WorkOrder[], tech: Technician): TechStats {
  const activeOrders = getTechActiveOrders(workOrders, tech.id);
  const activeCount = activeOrders.length > 0 ? activeOrders.length : tech.activeJobsCount;
  const finishedOrders = getTechFinishedOrders(workOrders, tech.id);
  const liveCompleted = finishedOrders.length;
  const baselineMonthly = tech.completedThisMonth || 0;

  const durations = finishedOrders.map(getDurationHours).filter((h): h is number => h !== null);
  const avgDurationHours =
    durations.length > 0
      ? Number((durations.reduce((s, h) => s + h, 0) / durations.length).toFixed(1))
      : null;

  const revenue = finishedOrders.reduce((sum, wo) => sum + (wo.subtotal || 0), 0);
  const laborRevenue = finishedOrders.reduce((sum, wo) => sum + getLaborRevenue(wo), 0);
  // Split commission: Spareparts Change (Standard Modular / B2B) vs Hardware Repair (Micro-Soldering).
  // Legacy single commissionRate acts as fallback for both when the split fields aren't set.
  const commissionRateParts = tech.commissionRateParts ?? tech.commissionRate ?? 0;
  const commissionRateHardware = tech.commissionRateHardware ?? tech.commissionRate ?? 0;
  const hasCommission = commissionRateParts > 0 || commissionRateHardware > 0;
  const estCommission = hasCommission && finishedOrders.length > 0
    ? Math.round(
        finishedOrders.reduce((sum, wo) => {
          const rate = getRepairType(wo) === 'hardware' ? commissionRateHardware : commissionRateParts;
          return sum + getLaborRevenue(wo) * (rate / 100);
        }, 0)
      )
    : null;

  const warrantyReturnCount = tech.warrantyReturnCount || 0;
  const qualityTotal = liveCompleted + warrantyReturnCount;
  const successRate = qualityTotal > 0 ? Math.min(100, Math.round((liveCompleted / qualityTotal) * 100)) : null;
  const hardwareJobCount = finishedOrders.filter((wo) => getRepairType(wo) === 'hardware').length;
  const partsJobCount = finishedOrders.length - hardwareJobCount;

  return {
    tech,
    activeOrders,
    activeCount,
    finishedOrders,
    liveCompleted,
    baselineMonthly,
    avgDurationHours,
    revenue,
    laborRevenue,
    commissionRateParts,
    commissionRateHardware,
    estCommission,
    hardwareJobCount,
    partsJobCount,
    warrantyReturnCount,
    successRate,
    loadBadge: getLoadBadge(activeCount),
  };
}
