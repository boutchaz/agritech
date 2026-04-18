
import { useTranslation } from 'react-i18next';
import { Calendar, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subWeeks, subMonths, subYears } from 'date-fns';

export type DatePreset = 'all' | 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'this_year' | 'last_year' | 'custom';

export interface DateRange {
  from: Date | null;
  to: Date | null;
}

interface DateRangeFilterProps {
  value: DatePreset;
  onChange: (preset: DatePreset) => void;
  customRange?: DateRange;
  onCustomRangeChange?: (range: DateRange) => void;
  className?: string;
}

const presetLabels: Record<DatePreset, string> = {
  all: 'dataTable.dateFilter.all',
  this_week: 'dataTable.dateFilter.thisWeek',
  last_week: 'dataTable.dateFilter.lastWeek',
  this_month: 'dataTable.dateFilter.thisMonth',
  last_month: 'dataTable.dateFilter.lastMonth',
  this_year: 'dataTable.dateFilter.thisYear',
  last_year: 'dataTable.dateFilter.lastYear',
  custom: 'dataTable.dateFilter.custom',
};

function getPresetDateRange(preset: DatePreset): DateRange {
  const now = new Date();
  switch (preset) {
    case 'this_week':
      return { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) };
    case 'last_week': {
      const lastWeek = subWeeks(now, 1);
      return { from: startOfWeek(lastWeek, { weekStartsOn: 1 }), to: endOfWeek(lastWeek, { weekStartsOn: 1 }) };
    }
    case 'this_month':
      return { from: startOfMonth(now), to: endOfMonth(now) };
    case 'last_month': {
      const lastMonth = subMonths(now, 1);
      return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) };
    }
    case 'this_year':
      return { from: startOfYear(now), to: endOfYear(now) };
    case 'last_year': {
      const lastYear = subYears(now, 1);
      return { from: startOfYear(lastYear), to: endOfYear(lastYear) };
    }
    default:
      return { from: null, to: null };
  }
}

export function DateRangeFilter({
  value,
  onChange,
  className,
}: DateRangeFilterProps) {
  const { t } = useTranslation();

  const getDisplayLabel = () => {
    if (value === 'all') {
      return t(presetLabels.all, 'All Time');
    }
    
    const range = getPresetDateRange(value);
    if (range.from && range.to) {
      return `${format(range.from, 'MMM d')} - ${format(range.to, 'MMM d, yyyy')}`;
    }
    
    return t(presetLabels[value], value);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className={cn('min-w-[180px] justify-between', className)}>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <span className="truncate">{getDisplayLabel()}</span>
          </div>
          <ChevronDown className="h-4 w-4 text-gray-500 ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuItem 
          onClick={() => onChange('all')}
          className={cn(value === 'all' && 'bg-green-50 dark:bg-green-900/20')}
        >
          {t(presetLabels.all, 'All Time')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={() => onChange('this_week')}
          className={cn(value === 'this_week' && 'bg-green-50 dark:bg-green-900/20')}
        >
          {t(presetLabels.this_week, 'This Week')}
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => onChange('last_week')}
          className={cn(value === 'last_week' && 'bg-green-50 dark:bg-green-900/20')}
        >
          {t(presetLabels.last_week, 'Last Week')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={() => onChange('this_month')}
          className={cn(value === 'this_month' && 'bg-green-50 dark:bg-green-900/20')}
        >
          {t(presetLabels.this_month, 'This Month')}
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => onChange('last_month')}
          className={cn(value === 'last_month' && 'bg-green-50 dark:bg-green-900/20')}
        >
          {t(presetLabels.last_month, 'Last Month')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={() => onChange('this_year')}
          className={cn(value === 'this_year' && 'bg-green-50 dark:bg-green-900/20')}
        >
          {t(presetLabels.this_year, 'This Year')}
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => onChange('last_year')}
          className={cn(value === 'last_year' && 'bg-green-50 dark:bg-green-900/20')}
        >
          {t(presetLabels.last_year, 'Last Year')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
