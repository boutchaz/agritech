import { useTranslation } from 'react-i18next';
import { Search, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
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

export interface FilterBarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  isSearching?: boolean;

  filters?: FilterSelect[];

  datePreset?: DatePreset;
  onDatePresetChange?: (preset: DatePreset) => void;

  className?: string;
}

export function FilterBar({
  searchValue,
  onSearchChange,
  searchPlaceholder,
  isSearching = false,
  filters = [],
  datePreset,
  onDatePresetChange,
  className,
}: FilterBarProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  return (
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
  );
}
