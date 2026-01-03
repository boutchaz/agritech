import { useState, useCallback, useMemo } from 'react';
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  subWeeks,
  subMonths,
  subYears,
  format,
} from 'date-fns';

export type SortDirection = 'asc' | 'desc';
export type DatePreset = 'all' | 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'this_year' | 'last_year';

export interface SortConfig {
  key: string;
  direction: SortDirection;
}

export interface ServerTableState {
  page: number;
  pageSize: number;
  sortConfig: SortConfig;
  search: string;
  datePreset: DatePreset;
  dateFrom: string | undefined;
  dateTo: string | undefined;
}

export interface ServerTableStateOptions {
  defaultPageSize?: number;
  defaultSort?: SortConfig;
  pageSizeOptions?: number[];
}

export interface ServerTableStateReturn extends ServerTableState {
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  setSearch: (search: string) => void;
  setDatePreset: (preset: DatePreset) => void;
  handleSort: (key: string) => void;
  resetFilters: () => void;
  queryParams: {
    page: number;
    pageSize: number;
    sortBy: string;
    sortDir: SortDirection;
    search: string | undefined;
    dateFrom: string | undefined;
    dateTo: string | undefined;
  };
}

function getDateRangeFromPreset(preset: DatePreset): { from: string | undefined; to: string | undefined } {
  const now = new Date();
  const formatDate = (date: Date) => format(date, 'yyyy-MM-dd');

  switch (preset) {
    case 'this_week':
      return {
        from: formatDate(startOfWeek(now, { weekStartsOn: 1 })),
        to: formatDate(endOfWeek(now, { weekStartsOn: 1 })),
      };
    case 'last_week': {
      const lastWeek = subWeeks(now, 1);
      return {
        from: formatDate(startOfWeek(lastWeek, { weekStartsOn: 1 })),
        to: formatDate(endOfWeek(lastWeek, { weekStartsOn: 1 })),
      };
    }
    case 'this_month':
      return {
        from: formatDate(startOfMonth(now)),
        to: formatDate(endOfMonth(now)),
      };
    case 'last_month': {
      const lastMonth = subMonths(now, 1);
      return {
        from: formatDate(startOfMonth(lastMonth)),
        to: formatDate(endOfMonth(lastMonth)),
      };
    }
    case 'this_year':
      return {
        from: formatDate(startOfYear(now)),
        to: formatDate(endOfYear(now)),
      };
    case 'last_year': {
      const lastYear = subYears(now, 1);
      return {
        from: formatDate(startOfYear(lastYear)),
        to: formatDate(endOfYear(lastYear)),
      };
    }
    case 'all':
    default:
      return { from: undefined, to: undefined };
  }
}

export function useServerTableState(options: ServerTableStateOptions = {}): ServerTableStateReturn {
  const {
    defaultPageSize = 10,
    defaultSort = { key: 'created_at', direction: 'desc' as SortDirection },
  } = options;

  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(defaultPageSize);
  const [sortConfig, setSortConfig] = useState<SortConfig>(defaultSort);
  const [search, setSearchState] = useState('');
  const [datePreset, setDatePresetState] = useState<DatePreset>('all');

  const dateRange = useMemo(() => getDateRangeFromPreset(datePreset), [datePreset]);

  const setPageSize = useCallback((size: number) => {
    setPageSizeState(size);
    setPage(1);
  }, []);

  const setSearch = useCallback((value: string) => {
    setSearchState(value);
    setPage(1);
  }, []);

  const setDatePreset = useCallback((preset: DatePreset) => {
    setDatePresetState(preset);
    setPage(1);
  }, []);

  const handleSort = useCallback((key: string) => {
    setSortConfig((current) => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }));
    setPage(1);
  }, []);

  const resetFilters = useCallback(() => {
    setPage(1);
    setPageSizeState(defaultPageSize);
    setSortConfig(defaultSort);
    setSearchState('');
    setDatePresetState('all');
  }, [defaultPageSize, defaultSort]);

  const queryParams = useMemo(() => ({
    page,
    pageSize,
    sortBy: sortConfig.key,
    sortDir: sortConfig.direction,
    search: search || undefined,
    dateFrom: dateRange.from,
    dateTo: dateRange.to,
  }), [page, pageSize, sortConfig, search, dateRange]);

  return {
    page,
    pageSize,
    sortConfig,
    search,
    datePreset,
    dateFrom: dateRange.from,
    dateTo: dateRange.to,
    setPage,
    setPageSize,
    setSearch,
    setDatePreset,
    handleSort,
    resetFilters,
    queryParams,
  };
}
