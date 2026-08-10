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

interface DateFilterSelectorProps {
  filter?: DateFilterState;
  value?: DateFilterState;
  onChange: (newFilter: DateFilterState) => void;
  className?: string;
  buttonClassName?: string;
  compact?: boolean;
  iconOnly?: boolean;
}

export const DateFilterSelector: React.FC<DateFilterSelectorProps> = ({
  filter,
  value,
  onChange,
  className = '',
  buttonClassName = '',
  compact = false,
  iconOnly = false,
}) => {
  const currentFilter = filter || value || { preset: 'all' };
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  
  const [tempStartDate, setTempStartDate] = useState<string | undefined>(currentFilter.startDate);
  const [tempEndDate, setTempEndDate] = useState<string | undefined>(currentFilter.endDate);

  const popoverRef = useRef<HTMLDivElement>(null);

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
      setShowCalendarModal(true);
    } else {
      setShowCalendarModal(false);
      onChange({ preset, startDate: undefined, endDate: undefined });
    }
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handleApplyCustomRange = () => {
    if (tempStartDate) {
      onChange({
        preset: 'custom',
        startDate: tempStartDate,
        endDate: tempEndDate || tempStartDate,
      });
    }
    setShowCalendarModal(false);
  };

  // Format date helper for badge display
  const formatDateLabel = (dStr?: string) => {
    if (!dStr) return '';
    const parts = dStr.split('-');
    if (parts.length !== 3) return dStr;
    const mIndex = parseInt(parts[1], 10) - 1;
    return `${monthNames[mIndex]?.substring(0, 3)} ${parseInt(parts[2], 10)}`;
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
            buttonClassName={buttonClassName}
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
          <Button
            type="button"
            onClick={() => handlePresetChange('all')}
            variant="ghost" size="sm" className={`px-3 py-1 ${
              currentFilter.preset === 'all'
                ? 'bg-brand text-white shadow-2xs font-bold'
                : 'text-muted hover:text-ink hover:bg-white/60'
            }`}
          >
            All
          </Button>

          <Button
            type="button"
            onClick={() => handlePresetChange('today')}
            variant="ghost" size="sm" className={`px-3 py-1 ${
              currentFilter.preset === 'today'
                ? 'bg-brand text-white shadow-2xs font-bold'
                : 'text-muted hover:text-ink hover:bg-white/60'
            }`}
          >
            Today
          </Button>

          <Button
            type="button"
            onClick={() => handlePresetChange('7days')}
            variant="ghost" size="sm" className={`px-3 py-1 ${
              currentFilter.preset === '7days'
                ? 'bg-brand text-white shadow-2xs font-bold'
                : 'text-muted hover:text-ink hover:bg-white/60'
            }`}
          >
            7 Days
          </Button>

          <Button
            type="button"
            onClick={() => handlePresetChange('30days')}
            variant="ghost" size="sm" className={`px-3 py-1 ${
              currentFilter.preset === '30days'
                ? 'bg-brand text-white shadow-2xs font-bold'
                : 'text-muted hover:text-ink hover:bg-white/60'
            }`}
          >
            30 Days
          </Button>

          {/* Custom Calendar Trigger Button */}
          <Button
            type="button"
            onClick={() => {
              setShowCalendarModal(!showCalendarModal);
              if (currentFilter.preset !== 'custom') {
                onChange({ ...currentFilter, preset: 'custom' });
              }
            }}
            variant="ghost" size="sm" className={`px-3 py-1 flex items-center space-x-1.5 ${
              currentFilter.preset === 'custom'
                ? 'bg-brand text-white shadow-2xs font-bold'
                : 'text-muted hover:text-ink hover:bg-white/60'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>
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
          className="fixed inset-0 z-[110] flex items-start justify-end px-4 pt-12"
          onMouseDown={() => setShowCalendarModal(false)}
          role="presentation"
        >
        <div
          className="w-[280px] max-w-[calc(100vw-2rem)] bg-white rounded-xl border border-line-strong shadow-xl p-3 text-ink animate-in fade-in zoom-in-95 duration-150"
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
              className="!h-6 !min-h-6 w-6 p-0 rounded-full text-muted hover:text-ink hover:bg-surface transition-all cursor-pointer"
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
                }}
                className="!h-6 !min-h-6 px-1.5 text-[11px] text-brand font-bold hover:underline cursor-pointer ml-2"
              >
                Clear
              </Button>
            )}
          </div>

          {/* Direct Input Fallback & Action buttons */}
          <div className="space-y-1.5">
            <div className="grid grid-cols-2 gap-1.5 text-[11px]">
              <div>
                <label className="block text-muted font-semibold mb-0.5">Start Date</label>
                <Input
                  type="date"
                  value={tempStartDate || ''}
                  onChange={(e) => setTempStartDate(e.target.value)}
                  className="h-8 w-full px-1.5 py-1 bg-surface border border-line rounded-lg text-[11px] text-ink focus:outline-none "
                />
              </div>
              <div>
                <label className="block text-muted font-semibold mb-0.5">End Date</label>
                <Input
                  type="date"
                  value={tempEndDate || ''}
                  onChange={(e) => setTempEndDate(e.target.value)}
                  className="h-8 w-full px-1.5 py-1 bg-surface border border-line rounded-lg text-[11px] text-ink focus:outline-none "
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-1.5 pt-1.5 border-t border-line">
              <Button
                type="button"
                onClick={() => setShowCalendarModal(false)}
                variant="ghost"
                className="!h-7 !min-h-7 px-2 text-[11px] text-faint font-semibold hover:bg-surface rounded-lg transition-all cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleApplyCustomRange}
                disabled={!tempStartDate}
                className="!h-7 !min-h-7 px-3 bg-brand hover:bg-brand-deep disabled:opacity-50 text-white font-bold text-[11px] rounded-lg shadow-xs transition-all cursor-pointer flex items-center space-x-1"
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
