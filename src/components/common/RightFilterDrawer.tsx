import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, RotateCcw } from 'lucide-react';

interface RightFilterDrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  /** Optional sticky footer actions */
  onReset?: () => void;
  resetDisabled?: boolean;
  /** Button that opened the drawer — focus returns here on close */
  triggerRef?: React.RefObject<HTMLElement | null>;
}

/**
 * Right-side slide-in drawer for mobile filter controls.
 * Portal-rendered; backdrop + ESC + X + edge-swipe close; locks body scroll,
 * manages focus (dialog semantics), safe-area aware.
 */
export const RightFilterDrawer: React.FC<RightFilterDrawerProps> = ({
  open,
  onClose,
  title = 'Filters',
  children,
  onReset,
  resetDisabled,
  triggerRef,
}) => {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const titleId = useRef(`filter-drawer-title-${Math.random().toString(36).slice(2, 8)}`);
  const touchStartX = useRef<number | null>(null);
  const restoreFocusEl = useRef<HTMLElement | null>(null);

  // ESC close + body scroll lock + focus management
  useEffect(() => {
    if (!open) return;

    const scrollEl = document.getElementById('main-content-scroll') || document.body;
    const prevOverflow = scrollEl.style.overflow;
    scrollEl.style.overflow = 'hidden';

    restoreFocusEl.current = (document.activeElement as HTMLElement) || null;
    // focus the panel (or close button) once the slide starts
    requestAnimationFrame(() => {
      panelRef.current?.focus();
    });

    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);

    return () => {
      scrollEl.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handler);
      // return focus to the trigger (Filters button)
      if (triggerRef?.current) {
        triggerRef.current.focus();
      } else if (restoreFocusEl.current && document.contains(restoreFocusEl.current)) {
        restoreFocusEl.current.focus();
      }
    };
  }, [open, onClose, triggerRef]);

  // Edge swipe-to-close (P2)
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (delta > 60) onClose(); // swiped right = close
  };

  return createPortal(
    <div
      className={`fixed inset-0 z-[80] lg:hidden ${open ? '' : 'pointer-events-none invisible'}`}
      aria-hidden={!open}
    >
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/45 backdrop-blur-sm transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />
      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId.current}
        tabIndex={-1}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        className={`absolute inset-y-0 right-0 flex w-[min(85vw,320px)] max-w-[85vw] flex-col bg-white shadow-2xl outline-none transition-transform duration-300 ease-out motion-reduce:transition-none ${
          open ? 'translate-x-0' : 'translate-x-full motion-reduce:translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <p id={titleId.current} className="text-sm font-extrabold text-ink">{title}</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close filters"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-surface hover:text-ink transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {/* Body */}
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          {children}
        </div>
        {/* Sticky footer (P1) */}
        {onReset && (
          <div className="flex items-center gap-2 border-t border-line bg-white px-4 pt-2.5 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
            <button
              type="button"
              onClick={onReset}
              disabled={resetDisabled}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-extrabold text-rose-700 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
            >
              <RotateCcw className="w-4 h-4" />
              Reset All
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex flex-1 items-center justify-center rounded-xl bg-brand px-3 py-2.5 text-xs font-extrabold text-white shadow-xs transition-colors cursor-pointer hover:bg-brand-deep active:scale-95"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
};
