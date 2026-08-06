import React from 'react';
import { X } from 'lucide-react';

export interface ActiveFilterChip {
  key: string;
  label: string;
  onClear: () => void;
}

/** One-tap-clear chips for each applied filter — shared by module header and the mobile drawer. */
export const ActiveFilterChips: React.FC<{ chips: ActiveFilterChip[] }> = ({ chips }) => {
  if (!chips.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={chip.onClear}
          className="inline-flex items-center gap-1 rounded-full border border-brand/25 bg-brand-soft px-2.5 py-1 text-xs font-extrabold text-brand hover:bg-brand hover:text-white transition-colors cursor-pointer active:scale-95"
          title={`Clear ${chip.label}`}
        >
          {chip.label}
          <X className="w-3 h-3" />
        </button>
      ))}
    </div>
  );
};
