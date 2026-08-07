import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
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
  iconOnly?: boolean;
  triggerIcon?: React.ReactNode;
  ariaLabel?: string;
}

const MENU_WIDTH = 224; // w-56
const MENU_MIN_HEIGHT = 232; // ~9 options before the internal list scrolls (max-h-64)
const VIEWPORT_MARGIN = 8;

/**
 * Custom dropdown. The menu is portal-rendered and positioned with `fixed`
 * coordinates computed from the trigger's bounding rect, so it can never be
 * clipped by an `overflow:hidden` ancestor (workspace panels, cards) and can
 * never escape the viewport edge on phones. A transparent backdrop captures
 * outside taps; the menu closes on scroll/resize so stale coordinates can't
 * linger. (Audit S1: in-place absolute menus clipped & overflowed on mobile.)
 */
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
  iconOnly = false,
  triggerIcon,
  ariaLabel,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number; placeTop: boolean } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => o.value === value);

  const close = useCallback(() => {
    setIsOpen(false);
    setMenuPos(null);
  }, []);

  const open = useCallback(() => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) {
      setIsOpen(true);
      return;
    }
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    // Respect an explicit `top` placement, but auto-flip when the preferred
    // side has no room (portaled menus can't rely on CSS flipping).
    const preferTop = menuPlacement === 'top';
    const placeTop = preferTop
      ? spaceAbove > MENU_MIN_HEIGHT || spaceAbove >= spaceBelow
      : spaceBelow < MENU_MIN_HEIGHT && spaceAbove > spaceBelow;

    // Horizontal anchor mirrors the old left/right/group-left alignment.
    let left =
      menuAlign === 'left' ? rect.left
      : menuAlign === 'group-left' ? rect.left - 32
      : rect.right - MENU_WIDTH; // right (default)
    // Clamp inside the viewport so phones never get an off-screen menu.
    left = Math.max(VIEWPORT_MARGIN, Math.min(left, window.innerWidth - MENU_WIDTH - VIEWPORT_MARGIN));

    setMenuPos({ top: placeTop ? rect.top - 8 : rect.bottom + 8, left, placeTop });
    setIsOpen(true);
  }, [menuPlacement, menuAlign]);

  // Close on scroll/resize while open so fixed coordinates never go stale.
  useEffect(() => {
    if (!isOpen) return;
    const onViewportChange = (e: Event) => {
      // Ignore scrolls INSIDE the open menu — its own option list must be able
      // to scroll freely (e.g. 40+ model/category options) without the menu
      // closing itself on the first wheel/touch tick.
      const target = e.target as Node | null;
      if (target && menuRef.current?.contains(target)) return;
      close();
    };
    window.addEventListener('scroll', onViewportChange, true);
    window.addEventListener('resize', onViewportChange);
    window.addEventListener('orientationchange', onViewportChange);
    return () => {
      window.removeEventListener('scroll', onViewportChange, true);
      window.removeEventListener('resize', onViewportChange);
      window.removeEventListener('orientationchange', onViewportChange);
    };
  }, [isOpen, close]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [close]);

  const menu = menuPos && (
    <>
      {/* Transparent backdrop — captures outside taps/mouse-downs; higher than
          the menu itself is NOT needed, it sits below the menu (z order by
          DOM order within the same stacking context). */}
      <div
        className="fixed inset-0 z-[95]"
        onMouseDown={close}
        onTouchStart={close}
        role="presentation"
        aria-hidden="true"
      />
      <div
        ref={menuRef}
        role="listbox"
        className={`fixed z-[96] w-56 max-w-[calc(100vw-1rem)] rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-1.5 shadow-lg ${menuPos.placeTop ? '-translate-y-full' : ''} ${menuClassName}`}
        style={{ top: menuPos.top, left: menuPos.left }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="max-h-64 overflow-y-auto space-y-0.5 custom-scrollbar">
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
                  close();
                }}
                className={`min-h-9 w-full flex items-center justify-between gap-3 px-3 py-2 text-xs rounded-lg transition-colors cursor-pointer text-left ${
                  isSelected
                    ? 'bg-brand text-white font-extrabold'
                    : 'text-[var(--text-main)] hover:bg-[var(--blue-tint)] font-semibold'
                }`}
              >
                <span className="truncate">{option.label}</span>
                <div className="flex items-center space-x-1.5">
                  {option.badge !== undefined && (
                    <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${
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
    </>
  );

  return (
    <div ref={containerRef} className={`relative inline-block text-left ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => (isOpen ? close() : open())}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel || selectedOption?.label || placeholder}
        title={ariaLabel || selectedOption?.label || placeholder}
        className={`flex items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--card-bg)] font-bold text-[var(--text-main)] transition-colors cursor-pointer hover:bg-[var(--blue-tint)] focus:outline-none focus:border-[var(--primary)] ${
          iconOnly
            ? size === 'sm' ? 'h-8 w-8 justify-center' : 'h-10 w-10 justify-center'
            : size === 'sm' ? 'h-8 min-w-32 px-2.5 text-xs' : 'h-10 min-w-32 px-3.5 text-sm'
        } ${buttonClassName}`}
      >
        {iconOnly ? (
          <span className="flex h-5 w-5 shrink-0 items-center justify-center text-[var(--primary)]">
            {triggerIcon}
          </span>
        ) : (
          <span className="truncate max-w-[120px] sm:max-w-[170px]">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        )}
        <span className={`${iconOnly ? 'sr-only' : 'flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[var(--border-subtle)]'}`}>
          <ChevronDown className={`h-3.5 w-3.5 text-[var(--text-muted)] transition-transform ${isOpen ? 'rotate-180 text-[var(--primary)]' : ''}`} />
        </span>
      </button>

      {/* Portal to body: immune to ancestor clipping/overflow and viewport escape */}
      {isOpen && menu && createPortal(menu, document.body)}
    </div>
  );
};
