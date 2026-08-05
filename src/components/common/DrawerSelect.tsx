import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface DrawerSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}

/**
 * Branded inline dropdown for the filter drawer — the option list expands
 * INSIDE the drawer (no native picker, no clipping, no escaping the panel).
 */
export const DrawerSelect: React.FC<DrawerSelectProps> = ({ label, value, onChange, options }) => {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <div>
      <label className="mb-1 block text-[10px] font-extrabold uppercase tracking-wider text-muted">{label}</label>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-line bg-white px-3 py-2.5 text-xs font-extrabold text-ink focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none transition-colors cursor-pointer"
      >
        <span className="truncate">{selected ? selected.label : 'Select…'}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="mt-1.5 max-h-56 overflow-y-auto rounded-xl border border-line bg-white p-1 shadow-lg animate-fade-in">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className={`w-full rounded-lg px-3 py-2.5 text-left text-xs font-bold transition-colors cursor-pointer ${
                opt.value === value ? 'bg-brand text-white' : 'text-ink hover:bg-surface'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
