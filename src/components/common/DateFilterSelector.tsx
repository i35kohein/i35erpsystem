import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, X, Check} from 'lucide-react';
import { CustomDropdownMenu} from './CustomDropdownMenu';
import { Button , Input } from '../ui';

export type DatePreset = 'all' | 'today' | '7days' | '30days' | '60days' | 'custom';

export interface DateFilterState {
  preset: DatePreset;
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
}

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// audit A-P2: exported so the mobile drawer's date option can render the
// same "Jan 3 - Jan 8" label as the header control (was raw ISO in the drawer).
export const formatDateLabel = (dStr?: string) => {
  if (!dStr) return '';
  const parts = dStr.split('-');
  if (parts.length !== 3) return dStr;
  const mIndex = parseInt(parts[1], 10) - 1;
  return `${monthNames[mIndex]?.substring(0, 3)} ${parseInt(parts[2], 10)}`;
};

interface DateFilterSelectorProps {
  filter?: DateFilterState;
  value?: DateFilterState;
  onChange: (newFilter: DateFilterState) => void;
  className?: string;
  buttonClassName?: string;
  compact?: boolean;
  iconOnly?: boolean;
  /** audit A-P2: real prop replacing the external `!`-override class hacks
      (Finance header used 8 important overrides for the same control). */
  labeled?: boolean;
}

export const DateFilterSelector: React.FC<DateFilterSelectorProps> = ({
  filter,
  value,
  onChange,
  className = '',
  buttonClassName = '',
  compact = false,
  iconOnly = false,
  labeled = false,
}) => {
  const currentFilter = filter || value || { preset: 'all' };
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  // audit A-P2: calendar popover anchors to the Custom trigger instead of the
  // viewport corner; null = compact-mode fallback (top-right).
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number } | null>(null);
  const customBtnRef = useRef<HTMLButtonElement>(null);
  const startDateRef = useRef<HTMLInputElement>(null);
  
  const [tempStartDate, setTempStartDate] = useState<string | undefined>(currentFilter.startDate);
  const [tempEndDate, setTempEndDate] = useState<string | undefined>(currentFilter.endDate);
  // audit F-P2: reversed range (end < start) must not be applied silently
  const [rangeError, setRangeError] = useState<string>('');

  const popoverRef = useRef<HTMLDivElement>(null);

  // audit A-P3: focus the start-date field when the calendar opens (minimum
  // a11y bar — the open popover has no focus management otherwise).
  useEffect(() => {
    if (showCalendarModal) {
      const t = window.setTimeout(() => startDateRef.current?.focus(), 60);
      return () => window.clearTimeout(t);
    }
  }, [showCalendarModal]);

  useEffect(() => {
    setTempStartDate(currentFilter.startDate);
    setTempEndDate(currentFilter.endDate);
  }, [currentFilter.startDate, currentFilter.endDate]);

  // Close calendar popover on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setShowCalendarModal(false);
      }
    };
    if (showCalendarModal) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showCalendarModal]);

  const handlePresetChange = (preset: DatePreset) => {
    if (preset === 'custom') {
      setPopoverPos(null);
      setShowCalendarModal(true);
    } else {
      setShowCalendarModal(false);
      onChange({ preset, startDate: undefined, endDate: undefined });
    }
  };

  // audit F-P2: a reversed custom range (endDate < startDate) would silently
  // yield an empty list — validate and surface an inline error instead.
  const isRangeInvalid =
    !!tempStartDate && !!tempEndDate && tempEndDate < tempStartDate;

  const handleApplyCustomRange = () => {
    if (isRangeInvalid) {
      setRangeError('End date must be on or after the start date.');
      return;
    }
    setRangeError('');
    if (tempStartDate) {
      onChange({
        preset: 'custom',
        startDate: tempStartDate,
        endDate: tempEndDate || tempStartDate,
      });
    }
    setShowCalendarModal(false);
  };

  return (
    <div ref={popoverRef} className={`relative flex items-center ${className}`}>
      {compact ? (
        /* Compact Dropdown Menu Modal */
        <div className="relative flex items-center space-x-1.5">
          <CustomDropdownMenu
            value={currentFilter.preset}
            onChange={(val) => handlePresetChange(val as DatePreset)}
            iconOnly={iconOnly}
            size="md"
            triggerIcon={<Calendar className="h-3.5 w-3.5" />}
            ariaLabel="Filter by date"
            // audit A-P2: labeled prop — plain (non-`!`) classes replace the
            // Finance header's 8 important overrides.
            buttonClassName={labeled ? "min-w-[150px] rounded-xl border-line-strong bg-white px-3 text-xs font-extrabold shadow-2xs hover:border-brand/40 hover:bg-brand-soft" : buttonClassName}
            options={[
              { value: 'all', label: 'All Dates' },
              { value: 'today', label: 'Today' },
              { value: '7days', label: 'Last 7 Days' },
              { value: '30days', label: 'Last 30 Days' },
              { value: '60days', label: 'Last 60 Days' },
              {
                value: 'custom',
                label:
                  currentFilter.preset === 'custom' && currentFilter.startDate
                    ? `${formatDateLabel(currentFilter.startDate)} - ${formatDateLabel(currentFilter.endDate)}`
                    : 'Custom Range...',
              },
            ]}
          />
        </div>
      ) : (
        /* Minimalistic Segmented Control */
        <div className="flex items-center bg-surface p-1 rounded-xl border border-line shadow-2xs space-x-1">
          {/* audit A-P2: map over the static presets instead of four
              copy-pasted buttons; the Custom segment gets min-w + truncated
              label so picking a range doesn't shift the control width. */}
          {([['all', 'All'], ['today', 'Today'], ['7days', '7 Days'], ['30days', '30 Days']] as const).map(([preset, label]) => (
            <Button
              key={preset}
              type="button"
              onClick={() => handlePresetChange(preset)}
              variant="ghost" size="sm" className={`px-3 py-1 ${
                currentFilter.preset === preset
                  ? 'bg-brand text-white shadow-2xs font-bold'
                  : 'text-muted hover:text-ink hover:bg-white/60'
              }`}
            >
              {label}
            </Button>
          ))}

          {/* Custom Calendar Trigger Button */}
          <Button
            ref={customBtnRef}
            type="button"
            onClick={() => {
              const rect = customBtnRef.current?.getBoundingClientRect();
              if (rect) {
                // audit A-P2: anchor the popover to this trigger's rect
                // (portal + fixed coords) instead of the viewport corner.
                setPopoverPos({
                  top: Math.max(8, Math.min(rect.bottom + 8, window.innerHeight - 420)),
                  left: Math.max(8, Math.min(rect.right - 280, window.innerWidth - 288)),
                });
              } else {
                setPopoverPos(null);
              }
              setShowCalendarModal(!showCalendarModal);
              if (currentFilter.preset !== 'custom') {
                onChange({ ...currentFilter, preset: 'custom' });
              }
            }}
            variant="ghost" size="sm" className={`px-3 py-1 min-w-20 flex items-center space-x-1.5 ${
              currentFilter.preset === 'custom'
                ? 'bg-brand text-white shadow-2xs font-bold'
                : 'text-muted hover:text-ink hover:bg-white/60'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 shrink-0" />
            <span className="max-w-[110px] truncate">
              {currentFilter.preset === 'custom' && currentFilter.startDate
                ? currentFilter.endDate && currentFilter.endDate !== currentFilter.startDate
                  ? `${formatDateLabel(currentFilter.startDate)} - ${formatDateLabel(currentFilter.endDate)}`
                  : formatDateLabel(currentFilter.startDate)
                : 'Custom'}
            </span>
          </Button>
        </div>
      )}

      {/* Beautiful Popover Calendar Modal */}
      {showCalendarModal && createPortal(
        <div
          className="fixed inset-0 z-[110]"
          onMouseDown={() => setShowCalendarModal(false)}
          role="presentation"
        >
        <div
          // audit A-P2: anchored to the Custom trigger's rect (portal + fixed
          // coords) instead of always floating at the viewport's top-right.
          className={`fixed w-[280px] max-w-[calc(100vw-2rem)] bg-white rounded-xl border border-line-strong shadow-xl p-3 text-ink animate-in fade-in zoom-in-95 duration-150 ${popoverPos ? '' : 'right-4 top-12'}`}
          style={popoverPos ? { top: popoverPos.top, left: popoverPos.left } : undefined}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-line pb-2 mb-2">
            <div className="flex items-center space-x-1.5">
              <Calendar className="w-3.5 h-3.5 text-brand" />
              <span className="font-extrabold text-[11px] text-ink">Custom Date Range</span>
            </div>
            <Button variant="ghost"
              onClick={() => setShowCalendarModal(false)}
              // audit A-P3: 24px close target → 32px (h-8 w-8).
              className="h-8 w-8 p-0 rounded-full text-muted hover:text-ink hover:bg-surface transition-all cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>

          {/* Range Selection Status */}
          <div className="bg-surface px-2 py-1.5 rounded-lg border border-line text-[11px] mb-2 flex items-center justify-between">
            <div className="text-[11px] text-faint truncate">
              {tempStartDate ? (
                <span>
                  <strong className="text-ink">{tempStartDate}</strong>
                  {tempEndDate ? (
                    <> to <strong className="text-ink">{tempEndDate}</strong></>
                  ) : (
                    <span className="text-muted"> (select end date)</span>
                  )}
                </span>
              ) : (
                <span>Choose start and end dates</span>
              )}
            </div>
            {(tempStartDate || tempEndDate) && (
              <Button variant="ghost"
                type="button"
                onClick={() => {
                  setTempStartDate(undefined);
                  setTempEndDate(undefined);
                  setRangeError('');
                }}
                className="!h-6 !min-h-6 px-1.5 text-[11px] text-brand font-bold hover:underline cursor-pointer ml-2"
              >
                Clear
              </Button>
            )}
          </div>

          {/* audit F-P2: inline error for a reversed custom range */}
          {rangeError && (
            <div className="mb-1.5 px-2 py-1.5 rounded-lg bg-danger/10 border border-danger/30 text-danger text-[11px] font-bold">
              {rangeError}
            </div>
          )}

          {/* Direct Input Fallback & Action buttons */}
          <div className="space-y-1.5">
            <div className="grid grid-cols-2 gap-1.5 text-[11px]">
              <div>
                <label className="block text-muted font-semibold mb-0.5">Start Date</label>
                <Input
                  ref={startDateRef}
                  type="date"
                  value={tempStartDate || ''}
                  onChange={(e) => setTempStartDate(e.target.value)}
                  // audit A-P2: honor the Input kit height (h-10) + text-xs
                  // minimum (was a cramped h-8/11px override).
                  className="h-10 w-full px-1.5 py-1 bg-surface border border-line rounded-lg text-xs text-ink focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-muted font-semibold mb-0.5">End Date</label>
                <Input
                  type="date"
                  value={tempEndDate || ''}
                  onChange={(e) => setTempEndDate(e.target.value)}
                  className="h-10 w-full px-1.5 py-1 bg-surface border border-line rounded-lg text-xs text-ink focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-1.5 pt-1.5 border-t border-line">
              <Button
                type="button"
                onClick={() => setShowCalendarModal(false)}
                variant="ghost"
                // audit A-P3: 28px → 36px minimum touch target.
                className="!h-9 !min-h-9 px-2 text-[11px] text-faint font-semibold hover:bg-surface rounded-lg transition-all cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleApplyCustomRange}
                disabled={!tempStartDate || isRangeInvalid}
                className="!h-9 !min-h-9 px-3 bg-brand hover:bg-brand-deep disabled:opacity-50 text-white font-bold text-[11px] rounded-lg shadow-xs transition-all cursor-pointer flex items-center space-x-1"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Apply Range</span>
              </Button>
            </div>
          </div>
        </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export const filterByDateRange = <T extends { createdAt?: string }>(
  items: T[],
  filter?: DateFilterState
): T[] => {
  if (!filter || filter.preset === 'all') return items;

  if (filter.preset === 'today') {
    // Local-day range (numeric): toISOString() would give the UTC date, which is
    // the previous day for UTC+6:30 between midnight and 06:30.
    const now = new Date();
    const startMs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const endMs = startMs + 24 * 60 * 60 * 1000;
    return items.filter((item) => {
      const itemTime = item.createdAt ? new Date(item.createdAt).getTime() : 0;
      return !isNaN(itemTime) && itemTime >= startMs && itemTime < endMs;
    });
  }

  let days = 0;
  if (filter.preset === '7days') days = 7;
  else if (filter.preset === '30days') days = 30;
  else if (filter.preset === '60days') days = 60;

  if (days > 0) {
    const todayStartMs = new Date().setHours(0, 0, 0, 0);
    const cutoffMs = todayStartMs - (days - 1) * 24 * 60 * 60 * 1000;
    return items.filter((item) => {
      const itemTime = item.createdAt ? new Date(item.createdAt).getTime() : 0;
      return !isNaN(itemTime) && itemTime >= cutoffMs;
    });
  }

  if (filter.preset === 'custom') {
    const startMs = filter.startDate ? new Date(filter.startDate + 'T00:00:00').getTime() : 0;
    const endMs = filter.endDate ? new Date(filter.endDate + 'T23:59:59').getTime() : Date.now();
    return items.filter((item) => {
      const itemTime = item.createdAt ? new Date(item.createdAt).getTime() : 0;
      return !isNaN(itemTime) && itemTime >= startMs && itemTime <= endMs;
    });
  }

  return items;
};

export const isDateMatchingFilter = (
  dateStr?: string,
  filter?: DateFilterState
): boolean => {
  if (!filter || filter.preset === 'all') return true;
  if (!dateStr) return false;
  return filterByDateRange([{ createdAt: dateStr }], filter).length > 0;
};
