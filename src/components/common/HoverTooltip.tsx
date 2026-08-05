import React, { useEffect, useRef, useState } from 'react';

type TooltipState = {
  label: string;
  left: number;
  top: number;
  placement: 'top' | 'bottom';
};

const TOOLTIP_SELECTOR = 'button[title], button[aria-label], button[data-tooltip], [role="button"][title], [role="button"][aria-label], [role="button"][data-tooltip]';

export const HoverTooltip: React.FC = () => {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const activeElementRef = useRef<HTMLElement | null>(null);
  const originalTitleRef = useRef<string | null>(null);
  const showTimerRef = useRef<number | null>(null);

  useEffect(() => {
    // Tooltips are a hover/fine-pointer affordance only. On touch, tapping an
    // icon button focuses it (esp. Android Chrome) which previously popped a
    // tooltip at the tap point and covered the control; and hover never fires
    // anyway. Gate the whole system off for coarse pointers. (Audit S2.)
    if (typeof window !== 'undefined' && !window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      return;
    }

    const clearTimer = () => {
      if (showTimerRef.current !== null) {
        window.clearTimeout(showTimerRef.current);
        showTimerRef.current = null;
      }
    };

    const restoreTitle = () => {
      if (activeElementRef.current && originalTitleRef.current !== null) {
        activeElementRef.current.setAttribute('title', originalTitleRef.current);
      }
      activeElementRef.current = null;
      originalTitleRef.current = null;
    };

    const hideTooltip = () => {
      clearTimer();
      setTooltip(null);
      restoreTitle();
    };

    const findTooltipTarget = (eventTarget: EventTarget | null) => {
      if (!(eventTarget instanceof Element)) return null;
      return eventTarget.closest<HTMLElement>(TOOLTIP_SELECTOR);
    };

    const scheduleTooltip = (target: HTMLElement, immediate = false) => {
      const label =
        target.dataset.tooltip ||
        target.getAttribute('title') ||
        target.getAttribute('aria-label');

      if (!label?.trim()) return;

      clearTimer();
      restoreTitle();
      activeElementRef.current = target;
      originalTitleRef.current = target.getAttribute('title');
      if (originalTitleRef.current !== null) target.removeAttribute('title');

      const show = () => {
        if (!target.isConnected) return;
        const rect = target.getBoundingClientRect();
        const placement = rect.top >= 64 ? 'top' : 'bottom';
        setTooltip({
          label: label.trim(),
          left: Math.min(window.innerWidth - 12, Math.max(12, rect.left + rect.width / 2)),
          top: placement === 'top' ? rect.top - 8 : rect.bottom + 8,
          placement,
        });
      };

      if (immediate) show();
      else showTimerRef.current = window.setTimeout(show, 350);
    };

    const handleMouseOver = (event: MouseEvent) => {
      const target = findTooltipTarget(event.target);
      if (!target || target === activeElementRef.current) return;
      scheduleTooltip(target);
    };

    const handleMouseOut = (event: MouseEvent) => {
      const active = activeElementRef.current;
      if (!active) return;
      if (event.relatedTarget instanceof Node && active.contains(event.relatedTarget)) return;
      hideTooltip();
    };

    const handleFocusIn = (event: FocusEvent) => {
      const target = findTooltipTarget(event.target);
      if (target) scheduleTooltip(target, true);
    };

    const handleFocusOut = () => hideTooltip();
    const handleViewportChange = () => hideTooltip();

    document.addEventListener('mouseover', handleMouseOver);
    document.addEventListener('mouseout', handleMouseOut);
    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);
    window.addEventListener('scroll', handleViewportChange, true);
    window.addEventListener('resize', handleViewportChange);

    return () => {
      hideTooltip();
      document.removeEventListener('mouseover', handleMouseOver);
      document.removeEventListener('mouseout', handleMouseOut);
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
      window.removeEventListener('scroll', handleViewportChange, true);
      window.removeEventListener('resize', handleViewportChange);
    };
  }, []);

  if (!tooltip) return null;

  return (
    <div
      role="tooltip"
      className="fixed z-[1000] pointer-events-none max-w-64 px-2.5 py-1.5 bg-ink text-white text-[11px] font-semibold leading-tight text-center rounded-lg shadow-lg"
      style={{
        left: tooltip.left,
        top: tooltip.top,
        transform: tooltip.placement === 'top' ? 'translate(-50%, -100%)' : 'translate(-50%, 0)',
      }}
    >
      {tooltip.label}
    </div>
  );
};
