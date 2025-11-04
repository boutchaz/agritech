/**
 * Profitability Query Hook
 *
 * Provides comprehensive profitability analysis from:
 * - Cost/revenue tracking (costs, revenues, cost_categories tables)
 * - Accounting ledger (journal_entries, accounts, vw_ledger)
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database.types';

type Tables = Database['public']['Tables'];
type Cost = Tables['costs']['Row'];
type Revenue = Tables['revenues']['Row'];
type CostCategory = Tables['cost_categories']['Row'];

// Accounting module is now available - no need to check

// Ledger item interface
interface LedgerItem {
  id: string;
  organization_id: string;
  entry_date: string;
  posting_date: string;
  reference_number: string | null;
  reference_type: string | null;
  status: string;
  account_code: string;
  account_name: string;
  account_type: string;
  debit: number;
  credit: number;
  description: string | null;
  cost_center_name: string | null;
  farm_name: string | null;
  parcel_name: string | null;
  created_by: string | null;
  created_at: string;
}

interface CostCategoryBreakdown {
  category_id: string | null;
  category_name: string;
  cost_type: string;
  total_amount: number;
  transaction_count: number;
}

interface CostTypeBreakdown {
  cost_type: string;
  total_amount: number;
  transaction_count: number;
}

interface RevenueTypeBreakdown {
  revenue_type: string;
  total_amount: number;
  transaction_count: number;
}

interface ProfitabilityData {
  // Summary metrics
  totalCosts: number;
  totalRevenue: number;
  netProfit: number;
  profitMargin: number;

  // Raw data
  costs: Cost[];
  revenues: Revenue[];

  // Breakdowns
  categoryBreakdown: CostCategoryBreakdown[];
  costTypeBreakdown: CostTypeBreakdown[];
  revenueTypeBreakdown: RevenueTypeBreakdown[];

  // Time series (monthly aggregation)
  monthlyData: Array<{
    month: string;
    costs: number;
    revenue: number;
    profit: number;
  }>;

  // Ledger data from accounting module
  ledgerExpenses: LedgerItem[];
  ledgerRevenues: LedgerItem[];
  accountBreakdown: Array<{
    account_code: string;
    account_name: string;
    account_type: string;
    total_debit: number;
    total_credit: number;
    net_amount: number;
  }>;
}

export function useProfitabilityData(
  parcelId: string,
  startDate: string,
  endDate: string,
  organizationId: string
) {
  return useQuery({
    queryKey: ['profitability', parcelId, startDate, endDate, organizationId],
    queryFn: async (): Promise<ProfitabilityData> => {
      // 1. Fetch costs with category information
      const { data: costs, error: costsError } = await supabase
        .from('costs')
        .select(`
          *,
          cost_categories (
            id,
            name,
            type
          )
        `)
        .eq('parcel_id', parcelId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false });

      if (costsError) throw costsError;

      // 2. Fetch revenues
      const { data: revenues, error: revenuesError } = await supabase
        .from('revenues')
        .select('*')
        .eq('parcel_id', parcelId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false });

      if (revenuesError) throw revenuesError;

      // 3. Calculate totals
      const totalCosts = (costs || []).reduce(
        (sum, cost) => sum + Number(cost.amount || 0),
        0
      );
      const totalRevenue = (revenues || []).reduce(
        (sum, rev) => sum + Number(rev.amount || 0),
        0
      );
      const netProfit = totalRevenue - totalCosts;
      const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

      // 4. Category breakdown (from costs with category join)
      const categoryMap = new Map<string, CostCategoryBreakdown>();

      (costs || []).forEach((cost) => {
        const category = cost.cost_categories as CostCategory | null;
        const categoryId = cost.category_id || null;
        const categoryName = category?.name || 'Non catégorisé';
        const key = `${categoryId || 'none'}-${cost.cost_type}`;

        if (!categoryMap.has(key)) {
          categoryMap.set(key, {
            category_id: categoryId,
            category_name: categoryName,
            cost_type: cost.cost_type,
            total_amount: 0,
            transaction_count: 0,
          });
        }

        const breakdown = categoryMap.get(key);
        if (breakdown) {
          breakdown.total_amount += Number(cost.amount || 0);
          breakdown.transaction_count += 1;
        }
      });

      const categoryBreakdown = Array.from(categoryMap.values())
        .sort((a, b) => b.total_amount - a.total_amount);

      // 5. Cost type breakdown
      const costTypeMap = new Map<string, CostTypeBreakdown>();

      (costs || []).forEach((cost) => {
        const costType = cost.cost_type || 'other';
        if (!costTypeMap.has(costType)) {
          costTypeMap.set(costType, {
            cost_type: costType,
            total_amount: 0,
            transaction_count: 0,
          });
        }

        const breakdown = costTypeMap.get(costType);
        if (breakdown) {
          breakdown.total_amount += Number(cost.amount || 0);
          breakdown.transaction_count += 1;
        }
      });

      const costTypeBreakdown = Array.from(costTypeMap.values())
        .sort((a, b) => b.total_amount - a.total_amount);

      // 6. Revenue type breakdown
      const revenueTypeMap = new Map<string, RevenueTypeBreakdown>();

      (revenues || []).forEach((rev) => {
        const revenueType = rev.revenue_type || 'other';
        if (!revenueTypeMap.has(revenueType)) {
          revenueTypeMap.set(revenueType, {
            revenue_type: revenueType,
            total_amount: 0,
            transaction_count: 0,
          });
        }

        const breakdown = revenueTypeMap.get(revenueType);
        if (breakdown) {
          breakdown.total_amount += Number(rev.amount || 0);
          breakdown.transaction_count += 1;
        }
      });

      const revenueTypeBreakdown = Array.from(revenueTypeMap.values())
        .sort((a, b) => b.total_amount - a.total_amount);

      // 7. Monthly time series
      const monthlyMap = new Map<string, { costs: number; revenue: number }>();

      // Helper to get month key
      const getMonthKey = (dateStr: string) => {
        const date = new Date(dateStr);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      };

      // Add costs
      (costs || []).forEach((cost) => {
        const month = getMonthKey(cost.date);
        if (!monthlyMap.has(month)) {
          monthlyMap.set(month, { costs: 0, revenue: 0 });
        }
        const monthData = monthlyMap.get(month);
        if (monthData) {
          monthData.costs += Number(cost.amount || 0);
        }
      });

      // Add revenues
      (revenues || []).forEach((rev) => {
        const month = getMonthKey(rev.date);
        if (!monthlyMap.has(month)) {
          monthlyMap.set(month, { costs: 0, revenue: 0 });
        }
        const monthData = monthlyMap.get(month);
        if (monthData) {
          monthData.revenue += Number(rev.amount || 0);
        }
      });

      const monthlyData = Array.from(monthlyMap.entries())
        .map(([month, data]) => ({
          month,
          costs: data.costs,
          revenue: data.revenue,
          profit: data.revenue - data.costs,
        }))
        .sort((a, b) => a.month.localeCompare(b.month));

      // 8. Fetch ledger data from accounting module
      let ledgerExpenses: LedgerItem[] = [];
      let ledgerRevenues: LedgerItem[] = [];
      let accountBreakdown: Array<{
        account_code: string;
        account_name: string;
        account_type: string;
        total_debit: number;
        total_credit: number;
        net_amount: number;
      }> = [];

      try {
        // Fetch ledger expenses (vw_ledger is a view, not in types)
        const { data: expensesData, error: expensesError } = await supabase
          .from('vw_ledger' as never)
          .select('*')
          .eq('organization_id', organizationId)
          .eq('account_type', 'Expense')
          .gte('entry_date', startDate)
          .lte('entry_date', endDate);

        if (!expensesError && expensesData && Array.isArray(expensesData)) {
          ledgerExpenses = (expensesData as unknown as LedgerItem[]).filter(
            (item) => item.parcel_name !== null
          );
        }

        // Fetch ledger revenues
        const { data: revenuesData, error: revenuesError } = await supabase
          .from('vw_ledger' as never)
          .select('*')
          .eq('organization_id', organizationId)
          .eq('account_type', 'Revenue')
          .gte('entry_date', startDate)
          .lte('entry_date', endDate);

        if (!revenuesError && revenuesData && Array.isArray(revenuesData)) {
          ledgerRevenues = (revenuesData as unknown as LedgerItem[]).filter(
            (item) => item.parcel_name !== null
          );
        }

        // Account breakdown (from ledger)
        const accountMap = new Map<string, typeof accountBreakdown[0]>();

        [...ledgerExpenses, ...ledgerRevenues].forEach((item) => {
          const key = item.account_code;
          if (!accountMap.has(key)) {
            accountMap.set(key, {
              account_code: item.account_code,
              account_name: item.account_name,
              account_type: item.account_type,
              total_debit: 0,
              total_credit: 0,
              net_amount: 0,
            });
          }

          const acc = accountMap.get(key);
          if (acc) {
            acc.total_debit += Number(item.debit || 0);
            acc.total_credit += Number(item.credit || 0);

            // Calculate net based on account type
            if (item.account_type === 'Expense' || item.account_type === 'Asset') {
              acc.net_amount = acc.total_debit - acc.total_credit;
            } else {
              acc.net_amount = acc.total_credit - acc.total_debit;
            }
          }
        });

        accountBreakdown = Array.from(accountMap.values()).sort(
          (a, b) => Math.abs(b.net_amount) - Math.abs(a.net_amount)
        );
      } catch (_error) {
        // If ledger view is not available, continue without it
        // Ledger data will remain empty arrays
      }

      return {
        totalCosts,
        totalRevenue,
        netProfit,
        profitMargin,
        costs: costs || [],
        revenues: revenues || [],
        categoryBreakdown,
        costTypeBreakdown,
        revenueTypeBreakdown,
        monthlyData,
        ledgerExpenses,
        ledgerRevenues,
        accountBreakdown,
      };
    },
    enabled: !!parcelId && !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Fetch journal entries for a parcel
 */
export function useJournalEntriesForParcel(
  parcelId: string,
  startDate: string,
  endDate: string,
  organizationId: string
) {
  return useQuery({
    queryKey: ['journal-entries-parcel', parcelId, startDate, endDate, organizationId],
    queryFn: async () => {
      // Fetch journal entries with items (journal_entries not in types yet - needs regeneration)
      const { data, error } = await supabase
        .from('journal_entries' as never)
        .select(`
          *,
          journal_items(
            *,
            accounts(code, name, account_type)
          )
        `)
        .eq('organization_id', organizationId)
        .eq('status', 'posted')
        .gte('entry_date', startDate)
        .lte('entry_date', endDate);

      if (error) throw error;

      // Filter entries that have at least one item with this parcel
      const entries = (data || []) as unknown as Array<{
        journal_items?: Array<{ parcel_id: string | null }>;
      }>;
      
      const filtered = entries.filter((entry) =>
        entry.journal_items?.some((item) => item.parcel_id === parcelId)
      );

      return filtered;
    },
    enabled: !!parcelId && !!organizationId,
    staleTime: 5 * 60 * 1000,
  });
}
