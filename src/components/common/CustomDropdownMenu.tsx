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
}

export const CustomDropdownMenu: React.FC<CustomDropdownMenuProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Select option...',
  className = '',
  buttonClassName = '',
  size = 'sm',
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
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className={`relative inline-block text-left ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between gap-1.5 bg-[#F5F5F7] hover:bg-[#EAEAEA] text-[#1D1D1F] font-semibold rounded-xl border border-[#E5E5EA] shadow-2xs transition-all cursor-pointer focus:outline-none focus:border-[#0071E3] ${
          size === 'sm' ? 'px-2.5 py-1.5 text-xs' : 'px-3.5 py-2 text-sm'
        } ${buttonClassName}`}
      >
        <span className="truncate max-w-[100px] sm:max-w-[140px]">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-[#86868B] transition-transform duration-200 ${isOpen ? 'rotate-180 text-[#0071E3]' : ''}`} />
      </button>

      {/* Floating Menu Modal / Popover */}
      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-52 origin-top-right rounded-2xl bg-white/95 backdrop-blur-xl border border-[#D2D2D7] shadow-xl ring-1 ring-black/5 z-50 p-1.5 animate-in fade-in zoom-in-95 duration-100">
          <div className="max-h-60 overflow-y-auto space-y-0.5 custom-scrollbar">
            {options.map((option) => {
              const isSelected = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-xl transition-all cursor-pointer text-left ${
                    isSelected
                      ? 'bg-[#0071E3] text-white font-bold shadow-2xs'
                      : 'text-[#1D1D1F] hover:bg-[#F5F5F7] font-medium'
                  }`}
                >
                  <span className="truncate">{option.label}</span>
                  <div className="flex items-center space-x-1.5">
                    {option.badge !== undefined && (
                      <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
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
