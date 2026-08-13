import React from 'react';
import { WorkOrderStatus } from '../../types';

interface StatusBadgeProps {
  status: WorkOrderStatus | string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showIndicator?: boolean;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'sm',
  showIndicator = true,
  className = '',
}) => {
  const normStatus = (status || '').toString().trim();
  // audit A-P3: multi-word statuses render mixed-case (uppercase would widen
  // "Customer Not Repair" ~30% and overflow narrow cards).
  const multiWord = normStatus.includes(' ');

  // Size variations — compact (audit A-P3: h-5/h-6/h-7 tokens + consistent
  // text sizes, replacing the arbitrary 16–22px micro heights).
  const sizeClasses = {
    xs: 'text-[10px] px-1.5 rounded-md font-extrabold h-5 inline-flex items-center leading-none',
    sm: 'text-xs px-2 rounded-lg font-extrabold h-6 inline-flex items-center leading-none',
    md: 'text-xs px-2 rounded-lg font-extrabold h-6 inline-flex items-center leading-none',
    lg: 'text-xs px-2.5 rounded-xl font-extrabold h-7 inline-flex items-center leading-none',
  }[size];
  const labelCase = multiWord ? 'tracking-tight' : 'uppercase tracking-wider';

  const dotSizes = {
    xs: 'h-1 w-1',
    sm: 'h-1 w-1',
    md: 'h-1.5 w-1.5',
    lg: 'h-1.5 w-1.5',
  }[size];

  // Specific configuration per status
  let badgeStyle = 'bg-surface text-muted border border-line';
  let dotColor = 'bg-faint';
  let pingColor = 'bg-line';
  let isPulsing = false;

  switch (normStatus) {
    case 'In Progress':
    case 'In Repair':
    case 'Diagnosing':
      badgeStyle = 'bg-purple/10 text-purple border border-purple/30';
      dotColor = 'bg-purple';
      pingColor = 'bg-purple';
      isPulsing = false;
      break;

    case 'Pending':
    case 'Pending Parts':
    case 'Awaiting Parts':
    case 'Pending Client':
      badgeStyle = 'bg-warning/10 text-warning border border-warning/30';
      dotColor = 'bg-warning';
      pingColor = 'bg-warning';
      // audit A-P3: pending states are attention-worthy — wire up the ping
      // animation that previously could never render.
      isPulsing = true;
      break;

    case 'Receive':
    case 'Intake':
    case 'New Intake':
      badgeStyle = 'bg-brand-soft text-brand border border-brand/30';
      dotColor = 'bg-brand';
      pingColor = 'bg-brand';
      isPulsing = false;
      break;

    case 'Finished':
    case 'Ready for Pickup':
    case 'QA Passed':
      badgeStyle = 'bg-success/10 text-success-deep border border-success/30';
      dotColor = 'bg-success';
      pingColor = 'bg-success';
      isPulsing = false;
      break;

    case 'Cant Repair':
    case 'Declined':
    case 'Unfixable':
      badgeStyle = 'bg-danger/10 text-danger border border-danger/30';
      dotColor = 'bg-danger';
      pingColor = 'bg-danger';
      isPulsing = false;
      break;

    case 'Customer Not Repair':
    case 'Customer No Repair':
    case 'No Repair':
      // Audit B-P3: unified with StatusChip — this is a declined/issue state,
      // so it reads as danger in both components (was amber here, rose there).
      badgeStyle = 'bg-danger/10 text-danger border border-danger/30';
      dotColor = 'bg-danger';
      pingColor = 'bg-danger';
      isPulsing = false;
      break;

    case 'Taken Out':
    case 'Paid':
    case 'Returned':
      // Audit B-P3: distinct completed tone (ink/success border) — the old
      // bg-surface/muted style was identical to the unknown fallback, so a
      // finished+paid ticket looked greyed-out/missing.
      // audit A-P3: completed states use the soft success tone (solid ink was
      // heavier than active states); solid ink stays for terminal rows only.
      badgeStyle = 'bg-success/10 text-success-deep border border-success/30';
      dotColor = 'bg-success';
      pingColor = 'bg-success';
      isPulsing = false;
      break;

    default:
      badgeStyle = 'bg-surface text-muted border border-line';
      dotColor = 'bg-faint';
      pingColor = 'bg-line';
      isPulsing = false;
      break;
  }

  return (
    <span
      className={`inline-flex items-center space-x-1 transition-all duration-200 whitespace-nowrap ${sizeClasses} ${labelCase} ${badgeStyle} ${className}`}
    >
      {showIndicator && (
        <span className={`relative flex ${dotSizes} shrink-0`}>
          {isPulsing && (
            <span
              aria-hidden="true"
              className={`animate-ping absolute inline-flex h-full w-full rounded-full ${pingColor} opacity-75`}
            />
          )}
          <span className={`relative inline-flex rounded-full ${dotSizes} ${dotColor}`} />
        </span>
      )}
      <span className="tracking-tight">{normStatus}</span>
    </span>
  );
};
