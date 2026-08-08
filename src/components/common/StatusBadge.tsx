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

  // Size variations
  const sizeClasses = {
    xs: 'text-xs px-2 rounded-md font-extrabold uppercase tracking-wider h-[20px] inline-flex items-center leading-none',
    sm: 'text-xs px-2.5 rounded-lg font-extrabold uppercase tracking-wider h-[22px] inline-flex items-center leading-none',
    md: 'text-xs px-2.5 rounded-lg font-extrabold uppercase tracking-wider h-[26px] inline-flex items-center leading-none',
    lg: 'text-sm px-3 rounded-xl font-extrabold uppercase tracking-wider h-[30px] inline-flex items-center leading-none',
  }[size];

  const dotSizes = {
    xs: 'h-1.5 w-1.5',
    sm: 'h-1.5 w-1.5',
    md: 'h-2 w-2',
    lg: 'h-2.5 w-2.5',
  }[size];

  // Specific configuration per status
  let badgeStyle = 'bg-surface text-muted border border-line';
  let dotColor = 'bg-surface0';
  let pingColor = 'bg-slate-400';
  let isPulsing = false;

  switch (normStatus) {
    case 'In Progress':
    case 'In Repair':
    case 'Diagnosing':
      badgeStyle = 'bg-purple/10 text-purple border border-purple/30';
      dotColor = 'bg-purple';
      pingColor = 'bg-purple-400';
      isPulsing = false;
      break;

    case 'Pending':
    case 'Pending Parts':
    case 'Awaiting Parts':
    case 'Pending Client':
      badgeStyle = 'bg-warning/10 text-warning border border-warning/30';
      dotColor = 'bg-warning/100';
      pingColor = 'bg-warning';
      isPulsing = false;
      break;

    case 'Receive':
    case 'Intake':
    case 'New Intake':
      badgeStyle = 'bg-brand-soft text-brand border border-brand/30';
      dotColor = 'bg-brand';
      pingColor = 'bg-blue-400';
      isPulsing = false;
      break;

    case 'Finished':
    case 'Ready for Pickup':
    case 'QA Passed':
      badgeStyle = 'bg-success/10 text-success-deep border border-success/30';
      dotColor = 'bg-success';
      pingColor = 'bg-emerald-400';
      isPulsing = false;
      break;

    case 'Cant Repair':
    case 'Declined':
    case 'Unfixable':
      badgeStyle = 'bg-danger/10 text-danger border border-danger/30';
      dotColor = 'bg-danger';
      pingColor = 'bg-rose-400';
      isPulsing = false;
      break;

    case 'Customer Not Repair':
    case 'Customer No Repair':
    case 'No Repair':
      badgeStyle = 'bg-warning/10 text-warning border border-warning/30';
      dotColor = 'bg-warning';
      pingColor = 'bg-orange-400';
      isPulsing = false;
      break;

    case 'Taken Out':
    case 'Paid':
    case 'Returned':
      badgeStyle = 'bg-surface text-muted border border-line';
      dotColor = 'bg-surface0';
      pingColor = 'bg-slate-400';
      isPulsing = false;
      break;

    default:
      badgeStyle = 'bg-surface text-muted border border-line';
      dotColor = 'bg-surface0';
      pingColor = 'bg-slate-400';
      isPulsing = false;
      break;
  }

  return (
    <span
      className={`inline-flex items-center space-x-1.5 transition-all duration-200 whitespace-nowrap ${sizeClasses} ${badgeStyle} ${className}`}
    >
      {showIndicator && (
        <span className={`relative flex ${dotSizes} shrink-0`}>
          {isPulsing && (
            <span
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
