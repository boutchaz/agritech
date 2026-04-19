import * as React from 'react';
import { StatusDot } from '@/components/ui/status-dot';
import { format, parseISO } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/style.css';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

interface DatePickerProps {
  value?: string; // YYYY-MM-DD format
  onChange: (date: string | undefined) => void;
  availableDates?: string[]; // Array of YYYY-MM-DD dates
  isLoading?: boolean;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}

export function DatePicker({
  value,
  onChange,
  availableDates = [],
  isLoading = false,
  disabled = false,
  className,
  placeholder,
}: DatePickerProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = React.useState(false);
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(
    value ? parseISO(value) : undefined
  );
  const [calendarStyle, setCalendarStyle] = React.useState<React.CSSProperties>({});
  const triggerRef = React.useRef<HTMLButtonElement>(null);

  // Convert available dates to Date objects for comparison
  const availableDateObjects = React.useMemo(
    () => availableDates.map((dateStr) => parseISO(dateStr)),
    [availableDates]
  );

  // Create a Set of date strings for O(1) lookup
  const availableDatesSet = React.useMemo(
    () => new Set(availableDates),
    [availableDates]
  );

  // Update selected date when value prop changes
  React.useEffect(() => {
    setSelectedDate(value ? parseISO(value) : undefined);
  }, [value]);

  // Compute fixed position when opening — avoids clipping by dialog overflow
  const open = () => {
    if (disabled || isLoading) return;
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const calendarHeight = 320; // approximate height of DayPicker
      if (spaceBelow >= calendarHeight) {
        setCalendarStyle({ top: rect.bottom + 4, left: rect.left });
      } else {
        setCalendarStyle({ bottom: window.innerHeight - rect.top + 4, left: rect.left });
      }
    }
    setIsOpen(true);
  };

  const handleSelect = (date: Date | undefined) => {
    if (!date) {
      setSelectedDate(undefined);
      onChange(undefined);
      setIsOpen(false);
      return;
    }

    const dateStr = format(date, 'yyyy-MM-dd');

    // If no availableDates restriction, allow any date
    // Otherwise only allow selection of available dates
    if (availableDates.length === 0 || availableDatesSet.has(dateStr)) {
      setSelectedDate(date);
      onChange(dateStr);
      setIsOpen(false);
    }
  };

  // Disable dates that are not in the available dates list
  const disabledMatcher = React.useCallback(
    (date: Date) => {
      if (availableDates.length === 0) return false;
      const dateStr = format(date, 'yyyy-MM-dd');
      return !availableDatesSet.has(dateStr);
    },
    [availableDates, availableDatesSet]
  );

  // Custom modifiers to highlight available dates
  const modifiers = React.useMemo(
    () => ({
      available: availableDateObjects,
    }),
    [availableDateObjects]
  );

  const displayValue = selectedDate
    ? format(selectedDate, 'PPP')
    : placeholder || t('datePicker.placeholder', 'Select date');

  return (
    <div className={cn('relative', className)}>
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={open}
        disabled={disabled || isLoading}
        className={cn(
          'flex h-10 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ring-offset-white',
          'placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          !selectedDate && 'text-gray-500'
        )}
      >
        <span>{isLoading ? t('datePicker.loadingDates', 'Loading dates...') : displayValue}</span>
        <CalendarIcon className="h-4 w-4 opacity-50" />
      </button>

      {/* Calendar — fixed position so it's never clipped by dialog overflow */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <button
            type="button"
            className="fixed inset-0 z-[9998]"
            onClick={() => setIsOpen(false)}
            aria-label={t('datePicker.close', 'Close calendar')}
          />

          {/* Calendar Popover */}
          <div
            className="fixed z-[9999] rounded-md border border-gray-200 bg-white p-3 shadow-lg"
            style={calendarStyle}
          >
            <DayPicker
              mode="single"
              selected={selectedDate}
              onSelect={handleSelect}
              disabled={disabledMatcher}
              modifiers={modifiers}
              modifiersClassNames={{
                available: 'rdp-day_available',
              }}
              className="rdp-custom"
            />

            {/* Legend */}
            {availableDates.length > 0 && (
              <div className="mt-3 border-t border-gray-200 pt-3 text-xs text-gray-600">
                <div className="flex items-center gap-2">
                  <StatusDot color="green" size="sm" />
                  <span>{t('datePicker.availableSatelliteImagery', 'Available satellite imagery')}</span>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Custom Styles */}
      <style>{`
        .rdp-custom {
          --rdp-accent-color: #22c55e;
          --rdp-background-color: #dcfce7;
        }

        .rdp-day_available:not(.rdp-day_disabled) {
          position: relative;
        }

        .rdp-day_available:not(.rdp-day_disabled)::after {
          content: '';
          position: absolute;
          bottom: 2px;
          left: 50%;
          transform: translateX(-50%);
          width: 4px;
          height: 4px;
          background-color: #22c55e;
          border-radius: 50%;
        }

        .rdp-day_disabled {
          opacity: 0.3;
          cursor: not-allowed !important;
        }

        .rdp-day_disabled:hover {
          background-color: transparent !important;
        }

        .rdp-day_selected:not(.rdp-day_disabled) {
          background-color: var(--rdp-accent-color);
          color: white;
          font-weight: 600;
        }

        .rdp-day:not(.rdp-day_disabled):not(.rdp-day_selected):hover {
          background-color: var(--rdp-background-color);
        }
      `}</style>
    </div>
  );
}

export default DatePicker;
