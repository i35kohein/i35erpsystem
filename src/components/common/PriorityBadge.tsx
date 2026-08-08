import React from 'react';

interface PriorityBadgeProps {
  priority: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  showNormal?: boolean;
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({
  priority,
  size = 'xs',
  className = '',
  showNormal = false,
}) => {
  const normPriority = (priority || 'Normal').toString().trim();

  if (!showNormal && normPriority === 'Normal') {
    return null;
  }

  const sizeClasses = {
    xs: 'text-xs px-2 rounded-md font-extrabold uppercase tracking-wider h-[20px] inline-flex items-center justify-center leading-none',
    sm: 'text-xs px-2.5 rounded-lg font-extrabold uppercase tracking-wider h-[22px] inline-flex items-center justify-center leading-none',
    md: 'text-xs px-2.5 rounded-lg font-extrabold uppercase tracking-wider h-[26px] inline-flex items-center justify-center leading-none',
    lg: 'text-sm px-3 rounded-xl font-extrabold uppercase tracking-wider h-[30px] inline-flex items-center justify-center leading-none',
  }[size];

  let badgeStyle = 'bg-surface text-muted border border-line';

  switch (normPriority) {
    case 'Urgent':
    case 'Rush':
      badgeStyle = 'bg-danger/15 text-danger border border-danger/30 shadow-2xs';
      break;
    case 'Warranty Redo':
      badgeStyle = 'bg-purple/15 text-purple border border-purple/30 shadow-2xs';
      break;
    case 'B2B Priority':
      badgeStyle = 'bg-warning/15 text-warning border border-warning/30 shadow-2xs';
      break;
    case 'Normal':
    default:
      badgeStyle = 'bg-surface text-muted border border-line';
      break;
  }

  return (
    <span
      className={`inline-flex items-center justify-center whitespace-nowrap border shrink-0 transition-all duration-200 ${sizeClasses} ${badgeStyle} ${className}`}
    >
      {normPriority === 'Rush' ? 'Urgent' : normPriority}
    </span>
  );
};
