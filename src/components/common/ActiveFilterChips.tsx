import React from 'react';
import { Button } from '../ui';
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
        <Button
          key={chip.key}
          type="button"
          onClick={chip.onClear}
          variant="chip"
          // audit A-P2: bigger chip + aria-label; audit A-P3: hover signals
          // dismissal (danger tint) instead of flipping to solid brand.
          aria-label={`Clear filter ${chip.label}`}
          className="h-9 border-brand/25 bg-brand-soft px-2.5 py-1 text-brand hover:border-danger/40 hover:bg-danger/10 hover:text-danger"
          title={`Clear ${chip.label}`}
        >
          {chip.label}
          <X className="w-3.5 h-3.5" />
        </Button>
      ))}
    </div>
  );
};
