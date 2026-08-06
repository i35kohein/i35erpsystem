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
    xs: 'text-[9px] px-2 rounded-md font-extrabold uppercase tracking-wider h-[20px] inline-flex items-center justify-center leading-none',
    sm: 'text-xs px-2.5 rounded-lg font-extrabold uppercase tracking-wider h-[22px] inline-flex items-center justify-center leading-none',
    md: 'text-xs px-2.5 rounded-lg font-extrabold uppercase tracking-wider h-[26px] inline-flex items-center justify-center leading-none',
    lg: 'text-sm px-3 rounded-xl font-extrabold uppercase tracking-wider h-[30px] inline-flex items-center justify-center leading-none',
  }[size];

  let badgeStyle = 'bg-slate-100 text-slate-600 border border-slate-200';

  switch (normPriority) {
    case 'Urgent':
    case 'Rush':
      badgeStyle = 'bg-rose-100 text-rose-700 border border-rose-200 shadow-2xs';
      break;
    case 'Warranty Redo':
      badgeStyle = 'bg-purple-100 text-purple-700 border border-purple-200 shadow-2xs';
      break;
    case 'B2B Priority':
      badgeStyle = 'bg-amber-100 text-amber-800 border border-amber-200 shadow-2xs';
      break;
    case 'Normal':
    default:
      badgeStyle = 'bg-slate-100 text-slate-600 border border-slate-200';
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
