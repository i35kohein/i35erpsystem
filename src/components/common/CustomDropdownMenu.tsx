import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface DropdownOption {
  value: string;
  label: string;
  badge?: string | number;
  badgeColor?: string;
}

interface CustomDropdownMenuProps {
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  buttonClassName?: string;
  size?: 'sm' | 'md';
  menuAlign?: 'left' | 'right' | 'group-left';
  menuClassName?: string;
  menuPlacement?: 'top' | 'bottom';
}

export const CustomDropdownMenu: React.FC<CustomDropdownMenuProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Select option...',
  className = '',
  buttonClassName = '',
  size = 'sm',
  menuAlign = 'right',
  menuClassName = '',
  menuPlacement = 'bottom',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => o.value === value) || options[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  return (
    <div ref={containerRef} className={`relative inline-block text-left ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`flex min-w-32 items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--card-bg)] font-bold text-[var(--text-main)] transition-colors cursor-pointer hover:bg-[var(--blue-tint)] focus:outline-none focus:border-[var(--primary)] ${
          size === 'sm' ? 'h-8 px-2.5 text-xs' : 'h-10 px-3.5 text-sm'
        } ${buttonClassName}`}
      >
        <span className="truncate max-w-[120px] sm:max-w-[170px]">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[var(--border-subtle)]">
          <ChevronDown className={`h-3.5 w-3.5 text-[var(--text-muted)] transition-transform ${isOpen ? 'rotate-180 text-[var(--primary)]' : ''}`} />
        </span>
      </button>

      {/* Floating Menu Modal / Popover */}
      {isOpen && (
        <div
          className={`absolute z-50 w-56 max-w-[calc(100vw-2rem)] rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-1.5 shadow-lg ${
            menuAlign === 'group-left'
              ? '-left-8 origin-top-left'
              : menuAlign === 'left'
                ? 'left-0 origin-top-left'
                : 'right-0 origin-top-right'
          } ${menuPlacement === 'top' ? 'bottom-full mb-1.5' : 'mt-1.5'} ${menuClassName}`}
        >
          <div role="listbox" className="max-h-64 overflow-y-auto space-y-0.5 custom-scrollbar">
            {options.map((option) => {
              const isSelected = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`min-h-9 w-full flex items-center justify-between gap-3 px-3 py-2 text-xs rounded-lg transition-colors cursor-pointer text-left ${
                    isSelected
                      ? 'bg-[var(--primary)] text-white font-extrabold'
                      : 'text-[var(--text-main)] hover:bg-[var(--blue-tint)] font-semibold'
                  }`}
                >
                  <span className="truncate">{option.label}</span>
                  <div className="flex items-center space-x-1.5">
                    {option.badge !== undefined && (
                      <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-[var(--border-subtle)] text-[var(--text-secondary)]'
                      }`}>
                        {option.badge}
                      </span>
                    )}
                    {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
