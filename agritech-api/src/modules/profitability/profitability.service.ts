import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateCostDto, CreateRevenueDto, ProfitabilityFiltersDto } from './dto';

@Injectable()
export class ProfitabilityService {
  private readonly logger = new Logger(ProfitabilityService.name);

  constructor(private databaseService: DatabaseService) {}

  /**
   * Get parcels for an organization
   */
  async getParcels(organizationId: string) {
    const supabase = this.databaseService.getAdminClient();

    const { data, error } = await supabase
      .from('parcels')
      .select('id, name')
      .eq('organization_id', organizationId)
      .order('name');

    if (error) {
      this.logger.error('Error fetching parcels', error);
      throw new InternalServerErrorException('Failed to fetch parcels');
    }

    return data || [];
  }

  /**
   * Get costs with filters
   */
  async getCosts(organizationId: string, filters: ProfitabilityFiltersDto) {
    const supabase = this.databaseService.getAdminClient();

    let query = supabase
      .from('costs')
      .select('*, parcel:parcels(id, name), category:cost_categories(name, type)')
      .eq('organization_id', organizationId)
      .order('date', { ascending: false });

    if (filters.start_date) {
      query = query.gte('date', filters.start_date);
    }
    if (filters.end_date) {
      query = query.lte('date', filters.end_date);
    }
    if (filters.parcel_id) {
      query = query.eq('parcel_id', filters.parcel_id);
    }

    const { data, error } = await query;

    if (error) {
      this.logger.error('Error fetching costs', error);
      throw new InternalServerErrorException('Failed to fetch costs');
    }

    return data || [];
  }

  /**
   * Get revenues with filters
   */
  async getRevenues(organizationId: string, filters: ProfitabilityFiltersDto) {
    const supabase = this.databaseService.getAdminClient();

    let query = supabase
      .from('revenues')
      .select('*, parcel:parcels(id, name)')
      .eq('organization_id', organizationId)
      .order('date', { ascending: false });

    if (filters.start_date) {
      query = query.gte('date', filters.start_date);
    }
    if (filters.end_date) {
      query = query.lte('date', filters.end_date);
    }
    if (filters.parcel_id) {
      query = query.eq('parcel_id', filters.parcel_id);
    }

    const { data, error } = await query;

    if (error) {
      this.logger.error('Error fetching revenues', error);
      throw new InternalServerErrorException('Failed to fetch revenues');
    }

    return data || [];
  }

  /**
   * Calculate profitability analytics
   */
  async getProfitability(organizationId: string, filters: ProfitabilityFiltersDto) {
    const [costs, revenues] = await Promise.all([
      this.getCosts(organizationId, filters),
      this.getRevenues(organizationId, filters),
    ]);

    // Calculate totals
    const totalCosts = costs.reduce((sum, cost) => sum + Number(cost.amount), 0);
    const totalRevenue = revenues.reduce((sum, rev) => sum + Number(rev.amount), 0);
    const netProfit = totalRevenue - totalCosts;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    // Cost breakdown by type
    const costBreakdown = costs.reduce((acc, cost) => {
      acc[cost.cost_type] = (acc[cost.cost_type] || 0) + Number(cost.amount);
      return acc;
    }, {} as Record<string, number>);

    // Revenue breakdown by type
    const revenueBreakdown = revenues.reduce((acc, rev) => {
      acc[rev.revenue_type] = (acc[rev.revenue_type] || 0) + Number(rev.amount);
      return acc;
    }, {} as Record<string, number>);

    // Group by parcel
    const byParcel: Record<string, any> = {};

    costs.forEach((cost) => {
      const parcelId = cost.parcel_id || 'unassigned';
      const parcelName = cost.parcel?.name || 'Non assigné';
      if (!byParcel[parcelId]) {
        byParcel[parcelId] = {
          parcel_id: cost.parcel_id,
          parcel_name: parcelName,
          total_costs: 0,
          total_revenue: 0,
          net_profit: 0,
          cost_breakdown: {},
          revenue_breakdown: {},
        };
      }
      byParcel[parcelId].total_costs += Number(cost.amount);
      byParcel[parcelId].cost_breakdown[cost.cost_type] =
        (byParcel[parcelId].cost_breakdown[cost.cost_type] || 0) + Number(cost.amount);
    });

    revenues.forEach((rev) => {
      const parcelId = rev.parcel_id || 'unassigned';
      const parcelName = rev.parcel?.name || 'Non assigné';
      if (!byParcel[parcelId]) {
        byParcel[parcelId] = {
          parcel_id: rev.parcel_id,
          parcel_name: parcelName,
          total_costs: 0,
          total_revenue: 0,
          net_profit: 0,
          cost_breakdown: {},
          revenue_breakdown: {},
        };
      }
      byParcel[parcelId].total_revenue += Number(rev.amount);
      byParcel[parcelId].revenue_breakdown[rev.revenue_type] =
        (byParcel[parcelId].revenue_breakdown[rev.revenue_type] || 0) + Number(rev.amount);
    });

    // Calculate net profit and margin for each parcel
    Object.values(byParcel).forEach((parcel) => {
      parcel.net_profit = parcel.total_revenue - parcel.total_costs;
      parcel.profit_margin =
        parcel.total_revenue > 0 ? (parcel.net_profit / parcel.total_revenue) * 100 : undefined;
    });

    return {
      totalCosts,
      totalRevenue,
      netProfit,
      profitMargin,
      costBreakdown,
      revenueBreakdown,
      byParcel: Object.values(byParcel),
    };
  }

  /**
   * Create a new cost
   */
  async createCost(
    userId: string,
    organizationId: string,
    createCostDto: CreateCostDto,
  ) {
    const supabase = this.databaseService.getAdminClient();

    const { data, error } = await supabase
      .from('costs')
      .insert({
        organization_id: organizationId,
        created_by: userId,
        ...createCostDto,
      })
      .select()
      .single();

    if (error) {
      this.logger.error('Error creating cost', error);
      throw new InternalServerErrorException('Failed to create cost');
    }

    return data;
  }

  /**
   * Create a new revenue
   */
  async createRevenue(
    userId: string,
    organizationId: string,
    createRevenueDto: CreateRevenueDto,
  ) {
    const supabase = this.databaseService.getAdminClient();

    const { data, error } = await supabase
      .from('revenues')
      .insert({
        organization_id: organizationId,
        created_by: userId,
        ...createRevenueDto,
      })
      .select()
      .single();

    if (error) {
      this.logger.error('Error creating revenue', error);
      throw new InternalServerErrorException('Failed to create revenue');
    }

    return data;
  }

  /**
   * Get comprehensive profitability data for a parcel (includes ledger data)
   */
  async getParcelProfitability(
    organizationId: string,
    parcelId: string,
    startDate: string,
    endDate: string,
  ) {
    const supabase = this.databaseService.getAdminClient();

    // Fetch costs
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

    if (costsError) {
      this.logger.error('Error fetching costs', costsError);
      throw new InternalServerErrorException('Failed to fetch costs');
    }

    // Fetch revenues
    const { data: revenues, error: revenuesError } = await supabase
      .from('revenues')
      .select('*')
      .eq('parcel_id', parcelId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false });

    if (revenuesError) {
      this.logger.error('Error fetching revenues', revenuesError);
      throw new InternalServerErrorException('Failed to fetch revenues');
    }

    // Find costs/revenues that have linked journal entries to avoid double counting
    // Journal entries store reference_type='cost' or 'revenue' and reference_number=id
    const costIds = (costs || []).map(c => c.id);
    const revenueIds = (revenues || []).map(r => r.id);

    // Get journal entries that reference these costs/revenues
    const { data: linkedJournalEntries } = await supabase
      .from('journal_entries')
      .select('reference_type, reference_number')
      .eq('organization_id', organizationId)
      .eq('status', 'posted')
      .in('reference_type', ['cost', 'revenue']);

    // Build sets of cost/revenue IDs that have journal entries
    const costsWithJournalEntry = new Set<string>();
    const revenuesWithJournalEntry = new Set<string>();

    (linkedJournalEntries || []).forEach((entry: any) => {
      if (entry.reference_type === 'cost' && costIds.includes(entry.reference_number)) {
        costsWithJournalEntry.add(entry.reference_number);
      } else if (entry.reference_type === 'revenue' && revenueIds.includes(entry.reference_number)) {
        revenuesWithJournalEntry.add(entry.reference_number);
      }
    });

    // Calculate totals - exclude costs/revenues that have linked journal entries
    // Those will be counted via the ledger data instead
    const totalCosts = (costs || [])
      .filter(cost => !costsWithJournalEntry.has(cost.id))
      .reduce((sum, cost) => sum + Number(cost.amount || 0), 0);
    const totalRevenue = (revenues || [])
      .filter(rev => !revenuesWithJournalEntry.has(rev.id))
      .reduce((sum, rev) => sum + Number(rev.amount || 0), 0);
    const netProfit = totalRevenue - totalCosts;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    // Category breakdown
    const categoryMap = new Map();
    (costs || []).forEach((cost) => {
      const category = cost.cost_categories;
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
      breakdown.total_amount += Number(cost.amount || 0);
      breakdown.transaction_count += 1;
    });

    const categoryBreakdown = Array.from(categoryMap.values()).sort(
      (a, b) => b.total_amount - a.total_amount,
    );

    // Cost type breakdown
    const costTypeMap = new Map();
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
      breakdown.total_amount += Number(cost.amount || 0);
      breakdown.transaction_count += 1;
    });

    const costTypeBreakdown = Array.from(costTypeMap.values()).sort(
      (a, b) => b.total_amount - a.total_amount,
    );

    // Revenue type breakdown
    const revenueTypeMap = new Map();
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
      breakdown.total_amount += Number(rev.amount || 0);
      breakdown.transaction_count += 1;
    });

    const revenueTypeBreakdown = Array.from(revenueTypeMap.values()).sort(
      (a, b) => b.total_amount - a.total_amount,
    );

    // Monthly time series
    const monthlyMap = new Map();
    const getMonthKey = (dateStr: string) => {
      const date = new Date(dateStr);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    };

    (costs || []).forEach((cost) => {
      const month = getMonthKey(cost.date);
      if (!monthlyMap.has(month)) {
        monthlyMap.set(month, { costs: 0, revenue: 0 });
      }
      const monthData = monthlyMap.get(month);
      monthData.costs += Number(cost.amount || 0);
    });

    (revenues || []).forEach((rev) => {
      const month = getMonthKey(rev.date);
      if (!monthlyMap.has(month)) {
        monthlyMap.set(month, { costs: 0, revenue: 0 });
      }
      const monthData = monthlyMap.get(month);
      monthData.revenue += Number(rev.amount || 0);
    });

    const monthlyData = Array.from(monthlyMap.entries())
      .map(([month, data]) => ({
        month,
        costs: data.costs,
        revenue: data.revenue,
        profit: data.revenue - data.costs,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // Fetch ledger data from journal_items with parcel filter
    let ledgerExpenses: any[] = [];
    let ledgerRevenues: any[] = [];
    let accountBreakdown: any[] = [];
    let costCenterBreakdown: any[] = [];

    try {
      // Fetch journal items for this parcel with expense accounts
      const { data: expenseItems } = await supabase
        .from('journal_items')
        .select(`
          *,
          accounts!inner(code, name, account_type),
          journal_entries!inner(entry_date, entry_number, description, status),
          cost_centers(name),
          parcels(name)
        `)
        .eq('parcel_id', parcelId)
        .eq('accounts.account_type', 'expense')
        .eq('journal_entries.status', 'posted')
        .gte('journal_entries.entry_date', startDate)
        .lte('journal_entries.entry_date', endDate);

      if (expenseItems) {
        ledgerExpenses = expenseItems.map((item: any) => ({
          ...item,
          account_code: item.accounts?.code,
          account_name: item.accounts?.name,
          account_type: 'Expense',
          entry_date: item.journal_entries?.entry_date,
          entry_number: item.journal_entries?.entry_number,
          cost_center_name: item.cost_centers?.name,
          parcel_name: item.parcels?.name,
        }));
      }

      // Fetch journal items for this parcel with revenue accounts
      const { data: revenueItems } = await supabase
        .from('journal_items')
        .select(`
          *,
          accounts!inner(code, name, account_type),
          journal_entries!inner(entry_date, entry_number, description, status),
          cost_centers(name),
          parcels(name)
        `)
        .eq('parcel_id', parcelId)
        .eq('accounts.account_type', 'revenue')
        .eq('journal_entries.status', 'posted')
        .gte('journal_entries.entry_date', startDate)
        .lte('journal_entries.entry_date', endDate);

      if (revenueItems) {
        ledgerRevenues = revenueItems.map((item: any) => ({
          ...item,
          account_code: item.accounts?.code,
          account_name: item.accounts?.name,
          account_type: 'Revenue',
          entry_date: item.journal_entries?.entry_date,
          entry_number: item.journal_entries?.entry_number,
          cost_center_name: item.cost_centers?.name,
          parcel_name: item.parcels?.name,
        }));
      }

      // Account breakdown
      const accountMap = new Map();
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
        acc.total_debit += Number(item.debit || 0);
        acc.total_credit += Number(item.credit || 0);

        if (item.account_type === 'Expense' || item.account_type === 'Asset') {
          acc.net_amount = acc.total_debit - acc.total_credit;
        } else {
          acc.net_amount = acc.total_credit - acc.total_debit;
        }
      });

      accountBreakdown = Array.from(accountMap.values()).sort(
        (a, b) => Math.abs(b.net_amount) - Math.abs(a.net_amount),
      );

      // Cost Center breakdown
      const costCenterMap = new Map();
      [...ledgerExpenses, ...ledgerRevenues].forEach((item) => {
        const ccName = item.cost_center_name || 'Unassigned';
        if (!costCenterMap.has(ccName)) {
          costCenterMap.set(ccName, {
            cost_center_name: ccName,
            expense_amount: 0,
            revenue_amount: 0,
            net_amount: 0,
          });
        }

        const cc = costCenterMap.get(ccName);
        if (item.account_type === 'Expense') {
          cc.expense_amount += Number(item.debit || 0) - Number(item.credit || 0);
        } else if (item.account_type === 'Revenue') {
          cc.revenue_amount += Number(item.credit || 0) - Number(item.debit || 0);
        }
        cc.net_amount = cc.revenue_amount - cc.expense_amount;
      });

      costCenterBreakdown = Array.from(costCenterMap.values()).sort(
        (a, b) => b.net_amount - a.net_amount,
      );
    } catch (error) {
      // Ledger data is optional, continue without it
      this.logger.warn('Ledger data not available', error);
    }

    // Calculate ledger totals
    const ledgerExpenseTotal = ledgerExpenses.reduce(
      (sum, item) => sum + (Number(item.debit || 0) - Number(item.credit || 0)),
      0,
    );
    const ledgerRevenueTotal = ledgerRevenues.reduce(
      (sum, item) => sum + (Number(item.credit || 0) - Number(item.debit || 0)),
      0,
    );

    // Combine totals: legacy + ledger
    // Note: Legacy totals already exclude costs/revenues that have linked journal entries
    // so adding them together won't cause double counting
    const combinedCosts = totalCosts + ledgerExpenseTotal;
    const combinedRevenue = totalRevenue + ledgerRevenueTotal;
    const combinedProfit = combinedRevenue - combinedCosts;
    const combinedMargin = combinedRevenue > 0 ? (combinedProfit / combinedRevenue) * 100 : 0;

    return {
      // Combined totals (legacy + ledger)
      totalCosts: combinedCosts,
      totalRevenue: combinedRevenue,
      netProfit: combinedProfit,
      profitMargin: combinedMargin,
      // Legacy data for backward compatibility
      costs: costs || [],
      revenues: revenues || [],
      categoryBreakdown,
      costTypeBreakdown,
      revenueTypeBreakdown,
      monthlyData,
      // Ledger data
      ledgerExpenses,
      ledgerRevenues,
      ledgerExpenseTotal,
      ledgerRevenueTotal,
      accountBreakdown,
      costCenterBreakdown,
    };
  }

  /**
   * Get journal entries for a parcel
   */
  async getJournalEntriesForParcel(
    organizationId: string,
    parcelId: string,
    startDate: string,
    endDate: string,
  ) {
    const supabase = this.databaseService.getAdminClient();

    const { data, error } = await supabase
      .from('journal_entries')
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

    if (error) {
      this.logger.error('Error fetching journal entries', error);
      throw new InternalServerErrorException('Failed to fetch journal entries');
    }

    // Filter entries that have at least one item with this parcel
    const filtered = (data || []).filter((entry: any) =>
      entry.journal_items?.some((item: any) => item.parcel_id === parcelId),
    );

    return filtered;
  }

  /**
   * Get account mappings for profitability journal entries
   * Returns the default expense, revenue, and cash accounts based on mappings
   */
  async getAccountMappings(organizationId: string) {
    const supabase = this.databaseService.getAdminClient();

    // Get mappings for common cost types and cash accounts
    const { data: mappings, error: mappingsError } = await supabase
      .from('account_mappings')
      .select(`
        mapping_type,
        mapping_key,
        account_id,
        accounts (
          id,
          code,
          name,
          account_type
        )
      `)
      .eq('organization_id', organizationId)
      .eq('is_active', true);

    if (mappingsError) {
      this.logger.warn('Error fetching account mappings', mappingsError);
    }

    // Build a structured response
    const result = {
      expense: {} as Record<string, { id: string; code: string; name: string }>,
      revenue: {} as Record<string, { id: string; code: string; name: string }>,
      cash: null as { id: string; code: string; name: string } | null,
      defaultExpense: null as { id: string; code: string; name: string } | null,
      defaultRevenue: null as { id: string; code: string; name: string } | null,
    };

    (mappings || []).forEach((mapping: any) => {
      const account = mapping.accounts;
      if (!account) return;

      const accountInfo = {
        id: account.id,
        code: account.code,
        name: account.name,
      };

      if (mapping.mapping_type === 'cost_type') {
        result.expense[mapping.mapping_key] = accountInfo;
      } else if (mapping.mapping_type === 'revenue_type') {
        result.revenue[mapping.mapping_key] = accountInfo;
      } else if (mapping.mapping_type === 'cash') {
        result.cash = accountInfo;
      }
    });

    // If no mappings found, try to get default accounts by account_type
    if (!result.cash) {
      const { data: cashAccounts } = await supabase
        .from('accounts')
        .select('id, code, name')
        .eq('organization_id', organizationId)
        .eq('account_type', 'Asset')
        .eq('is_active', true)
        .like('code', '51%') // Bank/cash accounts typically start with 51
        .limit(1);

      if (cashAccounts?.[0]) {
        result.cash = cashAccounts[0];
      }
    }

    if (Object.keys(result.expense).length === 0) {
      const { data: expenseAccounts } = await supabase
        .from('accounts')
        .select('id, code, name')
        .eq('organization_id', organizationId)
        .eq('account_type', 'Expense')
        .eq('is_active', true)
        .limit(1);

      if (expenseAccounts?.[0]) {
        result.defaultExpense = expenseAccounts[0];
      }
    }

    if (Object.keys(result.revenue).length === 0) {
      const { data: revenueAccounts } = await supabase
        .from('accounts')
        .select('id, code, name')
        .eq('organization_id', organizationId)
        .eq('account_type', 'Revenue')
        .eq('is_active', true)
        .limit(1);

      if (revenueAccounts?.[0]) {
        result.defaultRevenue = revenueAccounts[0];
      }
    }

    return result;
  }
}
