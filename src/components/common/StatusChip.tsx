import React from 'react';

export type WorkOrderStatus =
  | 'Pending'
  | 'Receive'
  | 'Received'
  | 'In Progress'
  | 'Diagnostic'
  | 'Waiting Approval'
  | 'Approved'
  | 'Finished'
  | 'Taken Out'
  | 'Cant Repair'
  | 'Customer Not Repair'
  | string;

/**
 * Shared work-order status chip — one consistent style across POS, Pipeline,
 * Follow-ups and QA. Color semantics:
 *  green  = finished/completed, blue = active/in progress,
 *  amber  = waiting/needs action, slate = neutral/taken out,
 *  purple = approved, rose = issue/cancelled.
 */
export const StatusChip: React.FC<{ status: WorkOrderStatus; size?: 'xs' | 'sm' }> = ({ status, size = 'xs' }) => {
  const s = String(status || '');
  const base =
    size === 'sm'
      ? 'px-2.5 py-1 text-[11px] rounded-lg'
      : 'px-2 py-0.5 text-[10px] rounded-md';
  const tone = (() => {
    if (/finished|taken out|completed|done/i.test(s)) {
      return /taken out/i.test(s)
        ? 'bg-slate-100 text-slate-700 border-slate-300'
        : 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
    if (/cant repair|customer not repair|cancel|reject|fail|issue/i.test(s)) {
      return 'bg-rose-50 text-rose-700 border-rose-200';
    }
    if (/approved/i.test(s)) {
      return 'bg-purple-50 text-purple-700 border-purple-200';
    }
    if (/waiting|pending|approval|unpaid|diagnostic/i.test(s)) {
      return 'bg-amber-50 text-amber-700 border-amber-200';
    }
    return 'bg-blue-50 text-blue-700 border-blue-200';
  })();
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 border font-extrabold uppercase tracking-wide leading-none ${base} ${tone}`}
    >
      {s}
    </span>
  );
};
