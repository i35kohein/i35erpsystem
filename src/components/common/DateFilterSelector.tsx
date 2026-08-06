import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, X, Check} from 'lucide-react';
import { CustomDropdownMenu} from './CustomDropdownMenu';
import { Button } from '../ui';

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
  compact?: boolean;
  iconOnly?: boolean;
}

export const DateFilterSelector: React.FC<DateFilterSelectorProps> = ({
  filter,
  value,
  onChange,
  className = '',
  compact = false,
  iconOnly = false,
}) => {
  const currentFilter = filter || value || { preset: 'all' };
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  
  // Internal state for custom calendar view month navigation
  const [currentYear, setCurrentYear] = useState<number>(2026);
  const [currentMonth, setCurrentMonth] = useState<number>(6); // 0-indexed: 6 = July
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
      onChange({ ...currentFilter, preset: 'custom' });
    } else {
      setShowCalendarModal(false);
      onChange({ preset, startDate: undefined, endDate: undefined });
    }
  };

  // Helper for calendar month grid rendering
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Sun

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handleDateClick = (day: number) => {
    const monthStr = String(currentMonth + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const dateStr = `${currentYear}-${monthStr}-${dayStr}`;

    if (!tempStartDate || (tempStartDate && tempEndDate)) {
      setTempStartDate(dateStr);
      setTempEndDate(undefined);
    } else if (tempStartDate && !tempEndDate) {
      if (new Date(dateStr) < new Date(tempStartDate)) {
        setTempEndDate(tempStartDate);
        setTempStartDate(dateStr);
      } else {
        setTempEndDate(dateStr);
      }
    }
  };

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

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  // Format date helper for badge display
  const formatDateLabel = (dStr?: string) => {
    if (!dStr) return '';
    const parts = dStr.split('-');
    if (parts.length !== 3) return dStr;
    const mIndex = parseInt(parts[1], 10) - 1;
    return `${monthNames[mIndex]?.substring(0, 3)} ${parseInt(parts[2], 10)}`;
  };

  const isSelectedDate = (day: number) => {
    const monthStr = String(currentMonth + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const dateStr = `${currentYear}-${monthStr}-${dayStr}`;
    return dateStr === tempStartDate || dateStr === tempEndDate;
  };

  const isInRangeDate = (day: number) => {
    if (!tempStartDate || !tempEndDate) return false;
    const monthStr = String(currentMonth + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const dateStr = `${currentYear}-${monthStr}-${dayStr}`;
    return dateStr > tempStartDate && dateStr < tempEndDate;
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
            triggerIcon={<Calendar className="h-3.5 w-3.5" />}
            ariaLabel="Filter by date"
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

          {!iconOnly && <Button
            type="button"
            onClick={() => {
              setShowCalendarModal(!showCalendarModal);
              if (currentFilter.preset !== 'custom') {
                onChange({ ...currentFilter, preset: 'custom' });
              }
            }}
            variant="iconGhost"
            size="iconSm"
            className={`shrink-0 rounded-xl border border-line ${
              currentFilter.preset === 'custom'
                ? 'bg-brand text-white font-bold'
                : 'bg-surface hover:bg-white text-[#424245]'
            }`}
            title="Calendar Picker"
          >
            <Calendar className="w-3.5 h-3.5" />
          </Button>}
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
                : 'text-[#424245] hover:text-ink hover:bg-white/60'
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
                : 'text-[#424245] hover:text-ink hover:bg-white/60'
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
                : 'text-[#424245] hover:text-ink hover:bg-white/60'
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
                : 'text-[#424245] hover:text-ink hover:bg-white/60'
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
                : 'text-[#424245] hover:text-ink hover:bg-white/60'
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
      {showCalendarModal && (
        <div
          className="absolute right-0 top-11 z-50 w-80 bg-white rounded-2xl border border-line-strong shadow-2xl p-4 text-ink animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-line pb-3 mb-3">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-brand" />
              <span className="font-extrabold text-xs text-ink">Select Custom Date Range</span>
            </div>
            <Button
              onClick={() => setShowCalendarModal(false)}
              className="p-1 rounded-full text-muted hover:text-ink hover:bg-surface transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-3 px-1">
            <Button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg border border-line hover:bg-surface text-ink transition-all cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="font-bold text-xs text-ink">
              {monthNames[currentMonth]} {currentYear}
            </span>
            <Button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg border border-line hover:bg-surface text-ink transition-all cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Days of Week */}
          <div className="grid grid-cols-7 text-center text-xs font-bold text-muted mb-2 uppercase">
            <span>Su</span>
            <span>Mo</span>
            <span>Tu</span>
            <span>We</span>
            <span>Th</span>
            <span>Fr</span>
            <span>Sa</span>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1 text-center text-xs mb-4">
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const selected = isSelectedDate(day);
              const inRange = isInRangeDate(day);

              return (
                <Button
                  key={`day-${day}`}
                  type="button"
                  onClick={() => handleDateClick(day)}
                  className={`h-8 w-8 mx-auto rounded-lg font-semibold flex items-center justify-center transition-all cursor-pointer text-xs ${
                    selected
                      ? 'bg-brand text-white font-bold shadow-xs'
                      : inRange
                      ? 'bg-brand-soft text-brand font-bold'
                      : 'hover:bg-surface text-ink'
                  }`}
                >
                  {day}
                </Button>
              );
            })}
          </div>

          {/* Range Selection Status */}
          <div className="bg-surface p-2.5 rounded-xl border border-line text-xs mb-3 flex items-center justify-between">
            <div className="text-xs text-faint">
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
                <span>Click dates to pick range</span>
              )}
            </div>
            {(tempStartDate || tempEndDate) && (
              <Button
                type="button"
                onClick={() => {
                  setTempStartDate(undefined);
                  setTempEndDate(undefined);
                }}
                className="text-xs text-brand font-bold hover:underline cursor-pointer ml-2"
              >
                Clear
              </Button>
            )}
          </div>

          {/* Direct Input Fallback & Action buttons */}
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="block text-muted font-semibold mb-0.5">Start Date</label>
                <input
                  type="date"
                  value={tempStartDate || ''}
                  onChange={(e) => setTempStartDate(e.target.value)}
                  className="w-full px-2 py-1 bg-surface border border-line rounded-lg text-ink focus:outline-none focus:border-brand"
                />
              </div>
              <div>
                <label className="block text-muted font-semibold mb-0.5">End Date</label>
                <input
                  type="date"
                  value={tempEndDate || ''}
                  onChange={(e) => setTempEndDate(e.target.value)}
                  className="w-full px-2 py-1 bg-surface border border-line rounded-lg text-ink focus:outline-none focus:border-brand"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-line">
              <Button
                type="button"
                onClick={() => setShowCalendarModal(false)}
                className="px-3 py-1.5 text-xs text-faint font-semibold hover:bg-surface rounded-lg transition-all cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleApplyCustomRange}
                disabled={!tempStartDate}
                className="px-4 py-1.5 bg-brand hover:bg-[#0077ED] disabled:opacity-50 text-white font-bold text-xs rounded-lg shadow-xs transition-all cursor-pointer flex items-center space-x-1"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Apply Range</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const filterByDateRange = <T extends { createdAt?: string }>(
  items: T[],
  filter?: DateFilterState
): T[] => {
  if (!filter || filter.preset === 'all') return items;

  const todayStr = new Date().toISOString().split('T')[0];

  if (filter.preset === 'today') {
    return items.filter((item) => item.createdAt && item.createdAt.startsWith(todayStr));
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
