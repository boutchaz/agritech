import { useTranslation } from 'react-i18next';
import { Search, Loader2, X } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/button';
import { DateRangeFilter, type DatePreset } from './DateRangeFilter';
import { cn } from '@/lib/utils';

export interface FilterSelect {
  key: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  className?: string;
}

export interface StatusFilterOption {
  value: string;
  label: string;
}

export interface FilterBarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  isSearching?: boolean;

  filters?: FilterSelect[];

  statusFilters?: StatusFilterOption[];
  activeStatus?: string;
  onStatusChange?: (status: string) => void;

  datePreset?: DatePreset;
  onDatePresetChange?: (preset: DatePreset) => void;

  onClear?: () => void;

  className?: string;
}

export function FilterBar({
  searchValue,
  onSearchChange,
  searchPlaceholder,
  isSearching = false,
  filters = [],
  statusFilters,
  activeStatus,
  onStatusChange,
  datePreset,
  onDatePresetChange,
  onClear,
  className,
}: FilterBarProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const hasFilters = searchValue || (activeStatus && activeStatus !== 'all') ||
    filters.some(f => f.value !== 'all' && f.value !== '');

  return (
    <div className="space-y-3">
      <div className={cn('flex flex-col sm:flex-row gap-3', className)}>
        <div className="relative flex-1">
          <Search
            className={cn(
              'absolute top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400',
              isRTL ? 'right-3' : 'left-3',
            )}
          />
          <Input
            placeholder={searchPlaceholder ?? t('dataTable.search', 'Search...')}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className={isRTL ? 'pr-10' : 'pl-10'}
          />
          {isSearching && (
            <Loader2
              className={cn(
                'absolute top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400',
                isRTL ? 'left-3' : 'right-3',
              )}
            />
          )}
        </div>

        {filters.map((filter) => (
          <Select
            key={filter.key}
            value={filter.value}
            onChange={(e) => filter.onChange(e.target.value)}
            className={filter.className ?? 'w-full sm:w-40'}
          >
            {filter.options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        ))}

        {onDatePresetChange && (
          <DateRangeFilter
            value={datePreset ?? 'all'}
            onChange={onDatePresetChange}
          />
        )}
      </div>

      {statusFilters && statusFilters.length > 0 && onStatusChange && (
        <div className="flex flex-wrap items-center gap-2">
          {statusFilters.map((sf) => (
            <Button
              key={sf.value}
              size="sm"
              variant={activeStatus === sf.value ? 'default' : 'outline'}
              onClick={() => onStatusChange(sf.value)}
              className="text-xs sm:text-sm"
            >
              {sf.label}
            </Button>
          ))}
          {hasFilters && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                onSearchChange('');
                onStatusChange('all');
                onClear?.();
              }}
              className="text-xs text-gray-500 hover:text-gray-700 ml-auto"
            >
              <X className="w-3 h-3 mr-1" />
              {t('dataTable.clearFilters', 'Clear')}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
