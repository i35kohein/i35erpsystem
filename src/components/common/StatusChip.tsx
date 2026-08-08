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
      ? 'px-2.5 py-1 text-xs rounded-lg'
      : 'px-2 py-0.5 text-xs rounded-md';
  const tone = (() => {
    if (/finished|taken out|completed|done/i.test(s)) {
      return /taken out/i.test(s)
        ? 'bg-surface text-muted border-line'
        : 'bg-success/10 text-success-deep border-success/30';
    }
    if (/cant repair|customer not repair|cancel|reject|fail|issue/i.test(s)) {
      return 'bg-danger/10 text-danger border-danger/30';
    }
    if (/approved/i.test(s)) {
      return 'bg-purple/10 text-purple border-purple/30';
    }
    if (/waiting|pending|approval|unpaid|diagnostic/i.test(s)) {
      return 'bg-warning/10 text-warning border-warning/30';
    }
    return 'bg-brand-soft text-brand border-brand/30';
  })();
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 border font-extrabold uppercase tracking-wide leading-none ${base} ${tone}`}
    >
      {s}
    </span>
  );
};
