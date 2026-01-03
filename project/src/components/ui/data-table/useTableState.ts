import { useState, useMemo, useCallback } from 'react';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subWeeks, subMonths, subYears, isWithinInterval, parseISO } from 'date-fns';

export type SortDirection = 'asc' | 'desc' | null;

export interface SortConfig<T> {
  key: keyof T | null;
  direction: SortDirection;
}

export interface DateRange {
  from: Date | null;
  to: Date | null;
}

export type DatePreset = 'all' | 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'this_year' | 'last_year' | 'custom';

export interface TableState<T> {
  sortConfig: SortConfig<T>;
  setSortConfig: (config: SortConfig<T>) => void;
  handleSort: (key: keyof T) => void;
  
  page: number;
  setPage: (page: number) => void;
  pageSize: number;
  setPageSize: (size: number) => void;
  totalPages: number;
  
  datePreset: DatePreset;
  setDatePreset: (preset: DatePreset) => void;
  dateRange: DateRange;
  setDateRange: (range: DateRange) => void;
  
  paginatedData: T[];
  filteredData: T[];
  totalItems: number;
}

interface UseTableStateOptions<T> {
  data: T[];
  dateField?: keyof T;
  defaultPageSize?: number;
  defaultSort?: SortConfig<T>;
}

export function useTableState<T extends Record<string, unknown>>({
  data,
  dateField,
  defaultPageSize = 10,
  defaultSort = { key: null, direction: null },
}: UseTableStateOptions<T>): TableState<T> {
  const [sortConfig, setSortConfig] = useState<SortConfig<T>>(defaultSort);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [dateRange, setDateRange] = useState<DateRange>({ from: null, to: null });

  const handleSort = useCallback((key: keyof T) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        if (prev.direction === 'asc') return { key, direction: 'desc' };
        if (prev.direction === 'desc') return { key: null, direction: null };
        return { key, direction: 'asc' };
      }
      return { key, direction: 'asc' };
    });
    setPage(1);
  }, []);

  const getDateRangeFromPreset = useCallback((preset: DatePreset): DateRange => {
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
      case 'custom':
        return dateRange;
      default:
        return { from: null, to: null };
    }
  }, [dateRange]);

  const filteredData = useMemo(() => {
    let result = [...data];

    if (dateField && datePreset !== 'all') {
      const range = getDateRangeFromPreset(datePreset);
      if (range.from && range.to) {
        result = result.filter((item) => {
          const dateValue = item[dateField];
          if (!dateValue) return false;
          const itemDate = typeof dateValue === 'string' ? parseISO(dateValue) : dateValue as Date;
          return isWithinInterval(itemDate, { start: range.from!, end: range.to! });
        });
      }
    }

    if (sortConfig.key && sortConfig.direction) {
      result.sort((a, b) => {
        const aVal = a[sortConfig.key!];
        const bVal = b[sortConfig.key!];
        
        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;
        
        let comparison = 0;
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          comparison = aVal.localeCompare(bVal);
        } else if (typeof aVal === 'number' && typeof bVal === 'number') {
          comparison = aVal - bVal;
        } else if (aVal instanceof Date && bVal instanceof Date) {
          comparison = aVal.getTime() - bVal.getTime();
        } else {
          comparison = String(aVal).localeCompare(String(bVal));
        }
        
        return sortConfig.direction === 'desc' ? -comparison : comparison;
      });
    }

    return result;
  }, [data, dateField, datePreset, getDateRangeFromPreset, sortConfig]);

  const totalItems = filteredData.length;
  const totalPages = Math.ceil(totalItems / pageSize);

  const paginatedData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, page, pageSize]);

  const handleSetDatePreset = useCallback((preset: DatePreset) => {
    setDatePreset(preset);
    setPage(1);
  }, []);

  const handleSetPageSize = useCallback((size: number) => {
    setPageSize(size);
    setPage(1);
  }, []);

  return {
    sortConfig,
    setSortConfig,
    handleSort,
    page,
    setPage,
    pageSize,
    setPageSize: handleSetPageSize,
    totalPages,
    datePreset,
    setDatePreset: handleSetDatePreset,
    dateRange,
    setDateRange,
    paginatedData,
    filteredData,
    totalItems,
  };
}
