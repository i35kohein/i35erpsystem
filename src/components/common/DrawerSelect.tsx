import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';

interface DrawerSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}

const MENU_WIDTH = 192; // w-48 (audit A-P3: was 200 — off by 8px from the real 192px menu)
const MENU_MIN_HEIGHT = 120;
const MENU_MAX_HEIGHT = 240; // max-h-56 (224px) + p-1.5 + border/shadow estimate
const VIEWPORT_MARGIN = 8;

/**
 * Branded inline dropdown for the filter drawer. Uses portal + fixed positioning
 * so it can never be clipped by overflow or viewport edges (Ko Hein 2026-08-10).
 */
export const DrawerSelect: React.FC<DrawerSelectProps> = ({ label, value, onChange, options }) => {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number; placeTop: boolean } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);
  // audit A-P3: stable ids so the label can be associated with the trigger
  // and the listbox can be named (aria-labelledby).
  const selectId = useRef(`drawer-select-${Math.random().toString(36).slice(2, 8)}`);
  const labelId = useRef(`${selectId.current}-label`);

  const close = useCallback(() => {
    setOpen(false);
    setMenuPos(null);
  }, []);

  const toggle = useCallback(() => {
    if (open) { close(); return; }
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) { setOpen(true); return; }
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    let placeTop = spaceBelow < MENU_MIN_HEIGHT && spaceAbove > spaceBelow;
    let top = placeTop ? rect.top - 8 : rect.bottom + 8;
    // Vertical viewport clamp: keep the whole menu on screen. The menu extends
    // UP from `top` when placeTop (-translate-y-full), DOWN otherwise (audit F-P2).
    if (placeTop) {
      top = Math.min(window.innerHeight - VIEWPORT_MARGIN, Math.max(VIEWPORT_MARGIN + MENU_MAX_HEIGHT, top));
    } else {
      top = Math.max(VIEWPORT_MARGIN, Math.min(window.innerHeight - MENU_MAX_HEIGHT - VIEWPORT_MARGIN, top));
    }
    // If the clamp pushed the menu over the trigger, flip to the other side
    // when that side has room (audit F-P2).
    const coversTrigger = placeTop ? top > rect.top : top < rect.bottom;
    if (coversTrigger) {
      const altTop = placeTop ? rect.bottom + 8 : rect.top - 8;
      const altFits = placeTop
        ? altTop + MENU_MAX_HEIGHT <= window.innerHeight - VIEWPORT_MARGIN
        : altTop - MENU_MAX_HEIGHT >= VIEWPORT_MARGIN;
      if (altFits) {
        placeTop = !placeTop;
        top = altTop;
      }
    }
    let left = Math.max(VIEWPORT_MARGIN, Math.min(rect.left, window.innerWidth - MENU_WIDTH - VIEWPORT_MARGIN));
    setMenuPos({ top, left, placeTop });
    setOpen(true);
  }, [open, close]);

  useEffect(() => {
    if (!open) return;
    const closeOnOutside = (e: Event) => {
      const target = e.target as Node | null;
      if (target && menuRef.current?.contains(target)) return;
      close();
    };
    // Named handler so the ESC listener is actually removed on cleanup — the
    // old anonymous listener accumulated on every open/close cycle (audit F-P2).
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('scroll', closeOnOutside, true);
    window.addEventListener('resize', closeOnOutside);
    document.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('scroll', closeOnOutside, true);
      window.removeEventListener('resize', closeOnOutside);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, close]);

  const menu = menuPos && (
    <>
      <div className="fixed inset-0 z-[95]" onMouseDown={close} onTouchStart={close} role="presentation" aria-hidden="true" />
      <div
        ref={menuRef}
        role="listbox"
        aria-labelledby={labelId.current}
        className={`fixed z-[96] w-48 max-w-[calc(100vw-1rem)] rounded-xl border border-line bg-white p-1.5 shadow-xl ${menuPos.placeTop ? '-translate-y-full' : ''}`}
        style={{ top: menuPos.top, left: menuPos.left }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="max-h-56 overflow-y-auto space-y-0.5 custom-scrollbar">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="option"
              aria-selected={opt.value === value}
              onClick={() => { onChange(opt.value); close(); }}
              className={`min-h-9 w-full rounded-lg px-3 py-2.5 text-left text-xs font-bold transition-colors cursor-pointer focus-visible:bg-surface focus-visible:ring-2 focus-visible:ring-brand/40 ${
                opt.value === value ? 'bg-brand text-white' : 'text-ink hover:bg-surface'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </>
  );

  return (
    <div className="relative">
      <label id={labelId.current} htmlFor={selectId.current} className="mb-1 block text-xs font-extrabold uppercase tracking-wider text-muted">{label}</label>
      <button
        ref={buttonRef}
        id={selectId.current}
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-labelledby={labelId.current}
        // audit A-P1: restore a visible focus indicator on the trigger.
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-line bg-white px-3 py-2.5 text-xs font-extrabold text-ink outline-none transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-brand/60"
      >
        <span className="truncate">{selected ? selected.label : 'Select…'}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && menu && createPortal(menu, document.body)}
    </div>
  );
};
