import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { AccountingAutomationService } from '../journal-entries/accounting-automation.service';
import { FiscalYearsService } from '../fiscal-years/fiscal-years.service';
import { CreateCostDto, CreateRevenueDto, ProfitabilityFiltersDto, ProfitabilityAnalysisFiltersDto } from './dto';

@Injectable()
export class ProfitabilityService {
  private readonly logger = new Logger(ProfitabilityService.name);

  constructor(
    private databaseService: DatabaseService,
    private accountingAutomationService: AccountingAutomationService,
    private fiscalYearsService: FiscalYearsService,
  ) {}

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
    if (filters.fiscal_year_id) {
      query = query.eq('fiscal_year_id', filters.fiscal_year_id);
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
    if (filters.fiscal_year_id) {
      query = query.eq('fiscal_year_id', filters.fiscal_year_id);
    }

    const { data, error } = await query;

    if (error) {
      this.logger.error('Error fetching revenues', error);
      throw new InternalServerErrorException('Failed to fetch revenues');
    }

    return data || [];
  }

  /**
   * Build account_id → bucket-label maps from account_mappings.
   * Bucket label = mapping_key (e.g. 'labor', 'materials', 'harvest').
   * Items posted to accounts not present in any mapping fall into 'other'.
   */
  private async loadAccountBuckets(organizationId: string): Promise<{
    costBucketByAccountId: Map<string, string>;
    revenueBucketByAccountId: Map<string, string>;
  }> {
    const supabase = this.databaseService.getAdminClient();
    const { data: mappings, error } = await supabase
      .from('account_mappings')
      .select('mapping_type, mapping_key, account_id')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .in('mapping_type', ['cost_type', 'revenue_type']);

    if (error) {
      this.logger.warn(`Failed to load account_mappings for buckets: ${error.message}`);
    }

    const costBucketByAccountId = new Map<string, string>();
    const revenueBucketByAccountId = new Map<string, string>();
    for (const m of mappings || []) {
      if (!m.account_id || !m.mapping_key) continue;
      if (m.mapping_type === 'cost_type') costBucketByAccountId.set(m.account_id, m.mapping_key);
      else if (m.mapping_type === 'revenue_type') revenueBucketByAccountId.set(m.account_id, m.mapping_key);
    }
    return { costBucketByAccountId, revenueBucketByAccountId };
  }

  /**
   * Resolve a fiscal year's date window so a fiscal_year filter narrows the
   * journal_entries query. Returns null if not found.
   */
  private async resolveFiscalYearWindow(
    organizationId: string,
    fiscalYearId: string,
  ): Promise<{ start: string; end: string } | null> {
    const supabase = this.databaseService.getAdminClient();
    const { data } = await supabase
      .from('fiscal_years')
      .select('start_date, end_date')
      .eq('organization_id', organizationId)
      .eq('id', fiscalYearId)
      .maybeSingle();
    if (!data) return null;
    return { start: data.start_date, end: data.end_date };
  }

  /**
   * Single source of truth for profitability totals: aggregate posted journal
   * lines under expense/revenue accounts. Buckets each line via
   * account_mappings (cost_type/revenue_type) — unmapped accounts → 'other'.
   *
   * Returns totals + per-parcel rollup. parcel_id=null lines are bucketed
   * under the 'unassigned' key.
   */
  private async aggregateLedger(opts: {
    organizationId: string;
    startDate?: string;
    endDate?: string;
    parcelId?: string;
  }): Promise<{
    totalCosts: number;
    totalRevenue: number;
    costBreakdown: Record<string, number>;
    revenueBreakdown: Record<string, number>;
    byParcel: Map<string, {
      parcel_id: string | null;
      total_costs: number;
      total_revenue: number;
      cost_breakdown: Record<string, number>;
      revenue_breakdown: Record<string, number>;
    }>;
  }> {
    const supabase = this.databaseService.getAdminClient();
    const { costBucketByAccountId, revenueBucketByAccountId } = await this.loadAccountBuckets(opts.organizationId);

    const baseSelect = `
      parcel_id, account_id, debit, credit,
      accounts!inner(account_type),
      journal_entries!inner(entry_date, status, organization_id)
    `;

    let q = supabase
      .from('journal_items')
      .select(baseSelect)
      .eq('journal_entries.organization_id', opts.organizationId)
      .eq('journal_entries.status', 'posted')
      .in('accounts.account_type', ['expense', 'revenue', 'Expense', 'Revenue']);

    if (opts.startDate) q = q.gte('journal_entries.entry_date', opts.startDate);
    if (opts.endDate) q = q.lte('journal_entries.entry_date', opts.endDate);
    if (opts.parcelId) q = q.eq('parcel_id', opts.parcelId);

    const { data: items, error } = await q;
    if (error) {
      this.logger.error('Error aggregating ledger', error);
      throw new InternalServerErrorException('Failed to aggregate ledger');
    }

    let totalCosts = 0;
    let totalRevenue = 0;
    const costBreakdown: Record<string, number> = {};
    const revenueBreakdown: Record<string, number> = {};
    const byParcel = new Map<string, {
      parcel_id: string | null;
      total_costs: number;
      total_revenue: number;
      cost_breakdown: Record<string, number>;
      revenue_breakdown: Record<string, number>;
    }>();

    const ensureParcel = (rawParcelId: string | null) => {
      const key = rawParcelId || 'unassigned';
      let row = byParcel.get(key);
      if (!row) {
        row = {
          parcel_id: rawParcelId,
          total_costs: 0,
          total_revenue: 0,
          cost_breakdown: {},
          revenue_breakdown: {},
        };
        byParcel.set(key, row);
      }
      return row;
    };

    for (const raw of items || []) {
      const item = raw as any;
      const accountType = String(item.accounts?.account_type || '').toLowerCase();
      const debit = Number(item.debit || 0);
      const credit = Number(item.credit || 0);
      const parcelRow = ensureParcel(item.parcel_id || null);

      if (accountType === 'expense') {
        const net = debit - credit;
        if (net === 0) continue;
        const bucket = costBucketByAccountId.get(item.account_id) || 'other';
        totalCosts += net;
        costBreakdown[bucket] = (costBreakdown[bucket] || 0) + net;
        parcelRow.total_costs += net;
        parcelRow.cost_breakdown[bucket] = (parcelRow.cost_breakdown[bucket] || 0) + net;
      } else if (accountType === 'revenue') {
        const net = credit - debit;
        if (net === 0) continue;
        const bucket = revenueBucketByAccountId.get(item.account_id) || 'other';
        totalRevenue += net;
        revenueBreakdown[bucket] = (revenueBreakdown[bucket] || 0) + net;
        parcelRow.total_revenue += net;
        parcelRow.revenue_breakdown[bucket] = (parcelRow.revenue_breakdown[bucket] || 0) + net;
      }
    }

    return { totalCosts, totalRevenue, costBreakdown, revenueBreakdown, byParcel };
  }

  /**
   * Calculate profitability analytics from posted journal entries.
   * The legacy `costs` and `revenues` tables are no longer summed here —
   * they are detail data (createCost/createRevenue post a journal entry,
   * which is the single source of truth).
   */
  async getProfitability(organizationId: string, filters: ProfitabilityFiltersDto) {
    let startDate = filters.start_date;
    let endDate = filters.end_date;

    if (filters.fiscal_year_id) {
      const win = await this.resolveFiscalYearWindow(organizationId, filters.fiscal_year_id);
      if (win) {
        startDate = startDate || win.start;
        endDate = endDate || win.end;
      }
    }

    const agg = await this.aggregateLedger({
      organizationId,
      startDate,
      endDate,
      parcelId: filters.parcel_id,
    });

    const supabase = this.databaseService.getAdminClient();
    const parcelIds = Array.from(agg.byParcel.values())
      .map((p) => p.parcel_id)
      .filter((id): id is string => Boolean(id));

    const parcelNameById = new Map<string, string>();
    if (parcelIds.length > 0) {
      const { data: parcels } = await supabase
        .from('parcels')
        .select('id, name')
        .eq('organization_id', organizationId)
        .in('id', parcelIds);
      for (const p of parcels || []) parcelNameById.set(p.id, p.name);
    }

    const byParcel = Array.from(agg.byParcel.values()).map((row) => ({
      parcel_id: row.parcel_id,
      parcel_name: row.parcel_id ? (parcelNameById.get(row.parcel_id) || 'Parcelle') : 'Non assigné',
      total_costs: row.total_costs,
      total_revenue: row.total_revenue,
      net_profit: row.total_revenue - row.total_costs,
      profit_margin: row.total_revenue > 0
        ? ((row.total_revenue - row.total_costs) / row.total_revenue) * 100
        : undefined,
      cost_breakdown: row.cost_breakdown,
      revenue_breakdown: row.revenue_breakdown,
    }));

    const netProfit = agg.totalRevenue - agg.totalCosts;
    return {
      totalCosts: agg.totalCosts,
      totalRevenue: agg.totalRevenue,
      netProfit,
      profitMargin: agg.totalRevenue > 0 ? (netProfit / agg.totalRevenue) * 100 : 0,
      costBreakdown: agg.costBreakdown,
      revenueBreakdown: agg.revenueBreakdown,
      byParcel,
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

    // Validate account mappings exist before inserting — hard fail if missing
    const expenseAccountId = await this.accountingAutomationService.resolveAccountId(
      organizationId, 'cost_type', createCostDto.cost_type,
    );
    const cashAccountId = await this.accountingAutomationService.resolveAccountId(
      organizationId, 'cash', 'bank',
    );
    if (!expenseAccountId || !cashAccountId) {
      throw new BadRequestException(
        `Account mappings not configured for cost_type: ${createCostDto.cost_type}. ` +
        `Please configure account mappings before creating costs.`,
      );
    }

    // Resolve fiscal year from date if not provided
    const costFiscalYearId = createCostDto.fiscal_year_id ||
      await this.fiscalYearsService.resolveFiscalYear(organizationId, createCostDto.date);

    const { data, error } = await supabase
      .from('costs')
      .insert({
        organization_id: organizationId,
        created_by: userId,
        ...createCostDto,
        ...(costFiscalYearId ? { fiscal_year_id: costFiscalYearId } : {}),
      })
      .select()
      .single();

    if (error) {
      this.logger.error('Error creating cost', error);
      throw new InternalServerErrorException('Failed to create cost');
    }

    // Create journal entry — mandatory, no silent swallow
    if (data && data.amount > 0) {
      await this.accountingAutomationService.createJournalEntryFromCost(
        organizationId,
        data.id,
        createCostDto.cost_type,
        Number(data.amount),
        new Date(createCostDto.date),
        createCostDto.description || `Cost: ${createCostDto.cost_type}`,
        userId,
        createCostDto.parcel_id,
      );
      this.logger.log(`Journal entry created automatically for cost ${data.id}`);
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

    // Validate account mappings exist before inserting — hard fail if missing
    const revenueAccountId = await this.accountingAutomationService.resolveAccountId(
      organizationId, 'revenue_type', createRevenueDto.revenue_type,
    );
    const cashAccountId = await this.accountingAutomationService.resolveAccountId(
      organizationId, 'cash', 'bank',
    );
    if (!revenueAccountId || !cashAccountId) {
      throw new BadRequestException(
        `Account mappings not configured for revenue_type: ${createRevenueDto.revenue_type}. ` +
        `Please configure account mappings before creating revenues.`,
      );
    }

    // Resolve fiscal year from date if not provided
    const revFiscalYearId = createRevenueDto.fiscal_year_id ||
      await this.fiscalYearsService.resolveFiscalYear(organizationId, createRevenueDto.date);

    const { data, error } = await supabase
      .from('revenues')
      .insert({
        organization_id: organizationId,
        created_by: userId,
        ...createRevenueDto,
        ...(revFiscalYearId ? { fiscal_year_id: revFiscalYearId } : {}),
      })
      .select()
      .single();

    if (error) {
      this.logger.error('Error creating revenue', error);
      throw new InternalServerErrorException('Failed to create revenue');
    }

    // Create journal entry — mandatory, no silent swallow
    if (data && data.amount > 0) {
      await this.accountingAutomationService.createJournalEntryFromRevenue(
        organizationId,
        data.id,
        createRevenueDto.revenue_type,
        Number(data.amount),
        new Date(createRevenueDto.date),
        createRevenueDto.description || `Revenue: ${createRevenueDto.revenue_type}`,
        userId,
        createRevenueDto.parcel_id,
      );
      this.logger.log(`Journal entry created automatically for revenue ${data.id}`);
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
      .eq('organization_id', organizationId)
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
      .eq('organization_id', organizationId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false });

    if (revenuesError) {
      this.logger.error('Error fetching revenues', revenuesError);
      throw new InternalServerErrorException('Failed to fetch revenues');
    }

    // De-duplication logic removed: journal_entries is now the single source of truth.
    // Costs/revenues tables are kept as detail data only — totals come from journal.

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

    // Monthly time series — built from journal items after ledger queries
    // (populated after ledger data is fetched below)
    let monthlyData: { month: string; costs: number; revenue: number; profit: number }[] = [];

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
        .eq('journal_entries.organization_id', organizationId)
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
        .eq('journal_entries.organization_id', organizationId)
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

    // Journal is the single source of truth for totals
    const combinedCosts = ledgerExpenseTotal;
    const combinedRevenue = ledgerRevenueTotal;

    // Build monthly time series from journal items
    const monthlyMap = new Map<string, { costs: number; revenue: number }>();
    const getMonthKey = (dateStr: string) => {
      const date = new Date(dateStr);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    };
    ledgerExpenses.forEach((item) => {
      const month = getMonthKey(item.entry_date);
      if (!monthlyMap.has(month)) monthlyMap.set(month, { costs: 0, revenue: 0 });
      monthlyMap.get(month)!.costs += Number(item.debit || 0) - Number(item.credit || 0);
    });
    ledgerRevenues.forEach((item) => {
      const month = getMonthKey(item.entry_date);
      if (!monthlyMap.has(month)) monthlyMap.set(month, { costs: 0, revenue: 0 });
      monthlyMap.get(month)!.revenue += Number(item.credit || 0) - Number(item.debit || 0);
    });
    monthlyData = Array.from(monthlyMap.entries())
      .map(([month, data]) => ({
        month,
        costs: data.costs,
        revenue: data.revenue,
        profit: data.revenue - data.costs,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // === OPERATIONAL DATA (tasks, products, harvests, metayage) ===

    // Step 1: Get all task IDs linked to this parcel
    const { data: parcelTasks } = await supabase
      .from('tasks')
      .select('id, title, task_type')
      .eq('parcel_id', parcelId)
      .eq('organization_id', organizationId);

    const parcelTaskIds = (parcelTasks || []).map((t) => t.id);
    const taskTitleMap = new Map((parcelTasks || []).map((t) => [t.id, t.title]));

    // Step 2: Work records (labor costs) linked to parcel tasks
    let taskLaborCosts: any[] = [];
    if (parcelTaskIds.length > 0) {
      const { data: wr } = await supabase
        .from('work_records')
        .select('id, work_date, total_payment, hours_worked, hourly_rate, payment_status, task_description, task_id, worker_type')
        .eq('organization_id', organizationId)
        .in('task_id', parcelTaskIds)
        .gte('work_date', startDate)
        .lte('work_date', endDate)
        .order('work_date', { ascending: false });
      taskLaborCosts = (wr || []).map((r) => ({
        ...r,
        task_title: taskTitleMap.get(r.task_id) || 'Tâche',
      }));
    }
    const taskLaborTotal = taskLaborCosts.reduce((s, r) => s + Number(r.total_payment || 0), 0);

    // Step 3: Product/material costs for this parcel
    // Primary: filter by parcel_id (same as "Historique des Applications")
    // Secondary: filter by task_id for applications where parcel_id may be NULL
    const { data: appsByParcel } = await supabase
      .from('product_applications')
      .select(`
        id, application_date, quantity_used, cost, currency, task_id, product_id,
        items!inner(item_name, default_unit, standard_rate)
      `)
      .eq('parcel_id', parcelId)
      .eq('organization_id', organizationId)
      .gte('application_date', startDate)
      .lte('application_date', endDate)
      .order('application_date', { ascending: false });

    let appsByTask: any[] = [];
    if (parcelTaskIds.length > 0) {
      const { data: byTask } = await supabase
        .from('product_applications')
        .select(`
          id, application_date, quantity_used, cost, currency, task_id, product_id,
          items!inner(item_name, default_unit, standard_rate)
        `)
        .in('task_id', parcelTaskIds)
        .is('parcel_id', null)
        .gte('application_date', startDate)
        .lte('application_date', endDate)
        .order('application_date', { ascending: false });
      appsByTask = byTask || [];
    }

    const allProductApps = [...(appsByParcel || []), ...appsByTask];

    const mapApp = (app: any) => {
      const item = app.items;
      const effectiveCost =
        app.cost != null
          ? Number(app.cost)
          : item?.standard_rate
            ? Number(item.standard_rate) * Number(app.quantity_used || 0)
            : 0;
      return {
        id: app.id,
        application_date: app.application_date,
        quantity_used: Number(app.quantity_used || 0),
        cost: effectiveCost,
        currency: app.currency,
        task_id: app.task_id,
        task_title: taskTitleMap.get(app.task_id) || null,
        item_name: item?.item_name || 'Produit',
        unit: item?.default_unit,
      };
    };

    const materialCosts = allProductApps.map(mapApp).filter((a) => a.cost > 0);
    const materialCostTotal = materialCosts.reduce((s, a) => s + a.cost, 0);

    // Step 4: Harvest revenues (harvest_records linked to parcel)
    const { data: harvestRecs } = await supabase
      .from('harvest_records')
      .select('id, harvest_date, quantity, unit, expected_price_per_unit, estimated_revenue, lot_number, crop_type')
      .eq('parcel_id', parcelId)
      .eq('organization_id', organizationId)
      .gte('harvest_date', startDate)
      .lte('harvest_date', endDate)
      .order('harvest_date', { ascending: false });

    const harvestRevenues = harvestRecs || [];
    const harvestRevenueTotal = harvestRevenues.reduce((s, h) => s + Number(h.estimated_revenue || 0), 0);

    // Step 5: Metayage settlements (linked to parcel)
    const { data: metayage } = await supabase
      .from('metayage_settlements')
      .select('id, payment_date, gross_revenue, net_revenue, total_charges, worker_share_amount, worker_percentage, payment_status, created_at')
      .eq('parcel_id', parcelId)
      .eq('organization_id', organizationId)
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .order('created_at', { ascending: false });

    const metayageSettlements = metayage || [];
    const metayageTotal = metayageSettlements.reduce((s, m) => s + Number(m.net_revenue || 0), 0);

    // Grand totals = journal only (single source of truth)
    const netProfit = combinedRevenue - combinedCosts;
    const profitMargin = combinedRevenue > 0 ? (netProfit / combinedRevenue) * 100 : 0;

    return {
      // Totals from journal entries (single source of truth)
      totalCosts: combinedCosts,
      totalRevenue: combinedRevenue,
      netProfit,
      profitMargin,
      // Accounting sub-totals (same as totals now)
      accountingCosts: combinedCosts,
      accountingRevenue: combinedRevenue,
      // Legacy data
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
      // Operational data
      taskLaborCosts,
      taskLaborTotal,
      materialCosts,
      materialCostTotal,
      harvestRevenues,
      harvestRevenueTotal,
      metayageSettlements,
      metayageTotal,
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

  /**
   * Multi-filter financial analysis. Single source of truth = posted journal
   * entries. Operational tables (costs, revenues, work_records,
   * product_applications, harvest_records) are NOT summed here — they each
   * post (or should post) their own JE via accounting-automation, and summing
   * both sides double-counts.
   *
   * Cost/revenue buckets come from account_mappings (mapping_type cost_type/
   * revenue_type). Items hitting unmapped accounts → 'other'.
   */
  async getAnalysis(organizationId: string, filters: ProfitabilityAnalysisFiltersDto) {
    const supabase = this.databaseService.getAdminClient();

    const startDate = filters.start_date;
    const endDate = filters.end_date;

    // 1. Resolve target parcels based on filter_type
    let parcelsQuery = supabase
      .from('parcels')
      .select('id, name, crop_type, variety, farm_id, farms(name)')
      .eq('organization_id', organizationId);

    const filterType = filters.filter_type || 'organization';
    const filterValue = filters.filter_value;

    if (filterType === 'farm' && filterValue) {
      parcelsQuery = parcelsQuery.eq('farm_id', filterValue);
    } else if (filterType === 'parcel' && filterValue) {
      parcelsQuery = parcelsQuery.eq('id', filterValue);
    } else if (filterType === 'crop_type' && filterValue) {
      parcelsQuery = parcelsQuery.ilike('crop_type', filterValue);
    } else if (filterType === 'variety' && filterValue) {
      parcelsQuery = parcelsQuery.ilike('variety', filterValue);
    }
    // 'organization' → no additional filter (all parcels)

    const { data: parcels, error: parcelsError } = await parcelsQuery.order('name');
    if (parcelsError) {
      this.logger.error('Error fetching parcels for analysis', parcelsError);
      throw new InternalServerErrorException('Failed to fetch parcels');
    }

    const emptyCostBreakdown = { labor: 0, materials: 0, product_applications: 0, equipment: 0, other: 0 };
    const emptyRevBreakdown = { harvest: 0, invoiced: 0, other: 0 };

    if (!parcels || parcels.length === 0) {
      return {
        filter_type: filterType,
        filter_value: filterValue,
        filter_label: filterValue || 'Organisation',
        parcel_count: 0,
        farm_count: 0,
        total_costs: 0,
        total_revenue: 0,
        net_profit: 0,
        margin_percent: 0,
        cost_breakdown: emptyCostBreakdown,
        revenue_breakdown: emptyRevBreakdown,
        by_parcel: [],
      };
    }

    const parcelIds = parcels.map((p) => p.id);
    const farmIds = [...new Set(parcels.map((p: any) => p.farm_id).filter(Boolean))];

    const parcelMeta = new Map<string, { name: string; crop_type: string | null; variety: string | null }>();
    for (const p of parcels) {
      parcelMeta.set(p.id, {
        name: p.name,
        crop_type: (p as any).crop_type || null,
        variety: (p as any).variety || null,
      });
    }

    // Aggregate ledger restricted to the target parcels. We loop because
    // aggregateLedger takes one parcel at a time; for whole-org the loop
    // collapses to a single un-filtered call.
    const accCostBreakdown: Record<string, number> = {};
    const accRevBreakdown: Record<string, number> = {};
    const perParcelTotals = new Map<string, { costs: number; revenue: number }>();
    let totalCosts = 0;
    let totalRevenue = 0;

    if (filterType === 'organization') {
      const agg = await this.aggregateLedger({ organizationId, startDate, endDate });
      totalCosts = agg.totalCosts;
      totalRevenue = agg.totalRevenue;
      Object.assign(accCostBreakdown, agg.costBreakdown);
      Object.assign(accRevBreakdown, agg.revenueBreakdown);
      for (const [key, row] of agg.byParcel) {
        if (key === 'unassigned') continue;
        if (parcelMeta.has(key)) {
          perParcelTotals.set(key, { costs: row.total_costs, revenue: row.total_revenue });
        }
      }
    } else {
      // Filtered scope — fetch ledger once for the whole org then keep the
      // matching parcels. Cheaper than N round-trips for big farms.
      const agg = await this.aggregateLedger({ organizationId, startDate, endDate });
      const targetSet = new Set(parcelIds);
      for (const [key, row] of agg.byParcel) {
        if (key === 'unassigned' || !targetSet.has(key)) continue;
        perParcelTotals.set(key, { costs: row.total_costs, revenue: row.total_revenue });
        totalCosts += row.total_costs;
        totalRevenue += row.total_revenue;
        for (const [bucket, val] of Object.entries(row.cost_breakdown)) {
          accCostBreakdown[bucket] = (accCostBreakdown[bucket] || 0) + val;
        }
        for (const [bucket, val] of Object.entries(row.revenue_breakdown)) {
          accRevBreakdown[bucket] = (accRevBreakdown[bucket] || 0) + val;
        }
      }
    }

    // Normalize buckets into the legacy shape the frontend expects. Unknown
    // mapping_keys collapse into 'other'.
    const costBreakdown = { ...emptyCostBreakdown };
    for (const [key, val] of Object.entries(accCostBreakdown)) {
      const norm = key.toLowerCase();
      if (norm === 'labor' || norm === 'materials' || norm === 'equipment' || norm === 'product_applications') {
        costBreakdown[norm] += val;
      } else {
        costBreakdown.other += val;
      }
    }
    const revBreakdown = { ...emptyRevBreakdown };
    for (const [key, val] of Object.entries(accRevBreakdown)) {
      const norm = key.toLowerCase();
      if (norm === 'harvest' || norm === 'invoiced') {
        revBreakdown[norm] += val;
      } else {
        revBreakdown.other += val;
      }
    }

    const byParcel = parcelIds.map((pid) => {
      const meta = parcelMeta.get(pid)!;
      const totals = perParcelTotals.get(pid) || { costs: 0, revenue: 0 };
      return {
        parcel_id: pid,
        parcel_name: meta.name,
        crop_type: meta.crop_type,
        variety: meta.variety,
        costs: totals.costs,
        revenue: totals.revenue,
        profit: totals.revenue - totals.costs,
      };
    }).sort((a, b) => b.profit - a.profit);

    const netProfit = totalRevenue - totalCosts;
    const marginPercent = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    // Build filter label
    let filterLabel = 'Organisation';
    if (filterType === 'farm' && filterValue) {
      const farm = (parcels[0] as any)?.farms;
      filterLabel = farm?.name || filterValue;
    } else if (filterType === 'parcel' && filterValue) {
      filterLabel = parcels[0]?.name || filterValue;
    } else if (filterType === 'crop_type' && filterValue) {
      filterLabel = filterValue;
    } else if (filterType === 'variety' && filterValue) {
      filterLabel = filterValue;
    }

    return {
      filter_type: filterType,
      filter_value: filterValue,
      filter_label: filterLabel,
      parcel_count: parcelIds.length,
      farm_count: farmIds.length,
      total_costs: totalCosts,
      total_revenue: totalRevenue,
      net_profit: netProfit,
      margin_percent: marginPercent,
      cost_breakdown: costBreakdown,
      revenue_breakdown: revBreakdown,
      by_parcel: byParcel,
    };
  }
}
