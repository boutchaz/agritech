import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { AccountingAutomationService } from '../journal-entries/accounting-automation.service';
import { CreateCostDto, CreateRevenueDto, ProfitabilityFiltersDto, ProfitabilityAnalysisFiltersDto } from './dto';

@Injectable()
export class ProfitabilityService {
  private readonly logger = new Logger(ProfitabilityService.name);

  constructor(
    private databaseService: DatabaseService,
    private accountingAutomationService: AccountingAutomationService,
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

    // Create journal entry automatically for the cost
    if (data && data.amount > 0) {
      try {
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
      } catch (journalError) {
        // Log error but don't fail cost creation if journal entry fails
        // This allows costs to be recorded even if account mappings are not configured
        this.logger.error(
          `Failed to create journal entry for cost ${data.id}: ${journalError instanceof Error ? journalError.message : 'Unknown error'}`,
          journalError instanceof Error ? journalError.stack : undefined,
        );
        this.logger.warn(
          `Cost ${data.id} created but journal entry not created. ` +
          `Please configure account mappings for cost_type: ${createCostDto.cost_type} or create manual journal entry.`
        );
      }
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

    // Create journal entry automatically for the revenue
    if (data && data.amount > 0) {
      try {
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
      } catch (journalError) {
        // Log error but don't fail revenue creation if journal entry fails
        // This allows revenues to be recorded even if account mappings are not configured
        this.logger.error(
          `Failed to create journal entry for revenue ${data.id}: ${journalError instanceof Error ? journalError.message : 'Unknown error'}`,
          journalError instanceof Error ? journalError.stack : undefined,
        );
        this.logger.warn(
          `Revenue ${data.id} created but journal entry not created. ` +
          `Please configure account mappings for revenue_type: ${createRevenueDto.revenue_type} or create manual journal entry.`
        );
      }
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
    const combinedCosts = totalCosts + ledgerExpenseTotal;
    const combinedRevenue = totalRevenue + ledgerRevenueTotal;

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

    // Grand totals = accounting + operational
    const grandTotalCosts = combinedCosts + taskLaborTotal + materialCostTotal;
    const grandTotalRevenue = combinedRevenue + harvestRevenueTotal + metayageTotal;
    const grandProfit = grandTotalRevenue - grandTotalCosts;
    const grandMargin = grandTotalRevenue > 0 ? (grandProfit / grandTotalRevenue) * 100 : 0;

    return {
      // Grand totals (accounting + operational)
      totalCosts: grandTotalCosts,
      totalRevenue: grandTotalRevenue,
      netProfit: grandProfit,
      profitMargin: grandMargin,
      // Accounting sub-totals
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
   * Multi-filter financial analysis:
   * Aggregates costs + revenues across all parcels matching the given filter scope.
   */
  async getAnalysis(organizationId: string, filters: ProfitabilityAnalysisFiltersDto) {
    const supabase = this.databaseService.getAdminClient();

    const startDate = filters.start_date || '1970-01-01';
    const endDate = filters.end_date || new Date().toISOString().split('T')[0];

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
        cost_breakdown: { labor: 0, materials: 0, product_applications: 0, equipment: 0, other: 0 },
        revenue_breakdown: { harvest: 0, invoiced: 0, other: 0 },
        by_parcel: [],
      };
    }

    const parcelIds = parcels.map((p) => p.id);
    const farmIds = [...new Set(parcels.map((p: any) => p.farm_id).filter(Boolean))];

    // Per-parcel accumulator
    const parcelMap = new Map<string, { name: string; crop_type: string | null; variety: string | null; costs: number; revenue: number }>();
    for (const p of parcels) {
      parcelMap.set(p.id, { name: p.name, crop_type: (p as any).crop_type || null, variety: (p as any).variety || null, costs: 0, revenue: 0 });
    }

    // Cost breakdown accumulators
    const breakdown = { labor: 0, materials: 0, product_applications: 0, equipment: 0, other: 0 };
    const revBreakdown = { harvest: 0, invoiced: 0, other: 0 };

    // 2. Aggregate legacy costs table
    const { data: costsData } = await supabase
      .from('costs')
      .select('parcel_id, cost_type, amount')
      .eq('organization_id', organizationId)
      .in('parcel_id', parcelIds)
      .gte('date', startDate)
      .lte('date', endDate);

    for (const c of costsData || []) {
      const pm = parcelMap.get(c.parcel_id);
      if (pm) pm.costs += Number(c.amount || 0);
      const ct = (c.cost_type || 'other').toLowerCase();
      if (ct === 'labor') breakdown.labor += Number(c.amount || 0);
      else if (ct === 'materials') breakdown.materials += Number(c.amount || 0);
      else if (ct === 'equipment') breakdown.equipment += Number(c.amount || 0);
      else breakdown.other += Number(c.amount || 0);
    }

    // 3. Aggregate legacy revenues table
    const { data: revsData } = await supabase
      .from('revenues')
      .select('parcel_id, revenue_type, amount')
      .eq('organization_id', organizationId)
      .in('parcel_id', parcelIds)
      .gte('date', startDate)
      .lte('date', endDate);

    for (const r of revsData || []) {
      const pm = parcelMap.get(r.parcel_id);
      if (pm) pm.revenue += Number(r.amount || 0);
      const rt = (r.revenue_type || 'other').toLowerCase();
      if (rt === 'harvest') revBreakdown.harvest += Number(r.amount || 0);
      else revBreakdown.other += Number(r.amount || 0);
    }

    // 4. Task-based labor costs (work_records linked to parcel tasks)
    const { data: parcelTasksData } = await supabase
      .from('tasks')
      .select('id, parcel_id')
      .in('parcel_id', parcelIds)
      .eq('organization_id', organizationId);

    const taskParcelMap = new Map<string, string>(); // task_id → parcel_id
    for (const t of parcelTasksData || []) {
      taskParcelMap.set(t.id, t.parcel_id);
    }

    const taskIds = [...taskParcelMap.keys()];
    if (taskIds.length > 0) {
      const { data: workRecs } = await supabase
        .from('work_records')
        .select('task_id, total_payment')
        .eq('organization_id', organizationId)
        .in('task_id', taskIds)
        .gte('work_date', startDate)
        .lte('work_date', endDate);

      for (const wr of workRecs || []) {
        const parcelId = taskParcelMap.get(wr.task_id);
        if (parcelId) {
          const pm = parcelMap.get(parcelId);
          if (pm) pm.costs += Number(wr.total_payment || 0);
        }
        breakdown.labor += Number(wr.total_payment || 0);
      }

      // 5. Product applications (material costs)
      const { data: appsByTask } = await supabase
        .from('product_applications')
        .select('task_id, parcel_id, cost, quantity_used, items(standard_rate)')
        .eq('organization_id', organizationId)
        .in('task_id', taskIds)
        .gte('application_date', startDate)
        .lte('application_date', endDate);

      for (const app of appsByTask || []) {
        const effectiveCost = app.cost != null
          ? Number(app.cost)
          : ((app as any).items?.standard_rate ? Number((app as any).items.standard_rate) * Number((app as any).quantity_used || 0) : 0);
        if (effectiveCost <= 0) continue;
        const resolvedParcelId = app.parcel_id || taskParcelMap.get(app.task_id);
        if (resolvedParcelId) {
          const pm = parcelMap.get(resolvedParcelId);
          if (pm) pm.costs += effectiveCost;
        }
        breakdown.product_applications += effectiveCost;
      }
    }

    // Also product applications directly by parcel_id (no task)
    const { data: appsByParcel } = await supabase
      .from('product_applications')
      .select('parcel_id, cost, quantity_used, items(standard_rate)')
      .eq('organization_id', organizationId)
      .in('parcel_id', parcelIds)
      .is('task_id', null)
      .gte('application_date', startDate)
      .lte('application_date', endDate);

    for (const app of appsByParcel || []) {
      const effectiveCost = app.cost != null
        ? Number(app.cost)
        : ((app as any).items?.standard_rate ? Number((app as any).items.standard_rate) * Number((app as any).quantity_used || 0) : 0);
      if (effectiveCost <= 0) continue;
      const pm = parcelMap.get(app.parcel_id);
      if (pm) pm.costs += effectiveCost;
      breakdown.product_applications += effectiveCost;
    }

    // 6. Harvest revenues
    const { data: harvests } = await supabase
      .from('harvest_records')
      .select('parcel_id, estimated_revenue')
      .eq('organization_id', organizationId)
      .in('parcel_id', parcelIds)
      .gte('harvest_date', startDate)
      .lte('harvest_date', endDate);

    for (const h of harvests || []) {
      const pm = parcelMap.get(h.parcel_id);
      if (pm) pm.revenue += Number(h.estimated_revenue || 0);
      revBreakdown.harvest += Number(h.estimated_revenue || 0);
    }

    // 7. Journal items for these parcels (ledger expenses & revenues)
    const { data: expItems } = await supabase
      .from('journal_items')
      .select('parcel_id, debit, credit, accounts!inner(account_type), journal_entries!inner(entry_date, status, organization_id)')
      .in('parcel_id', parcelIds)
      .eq('accounts.account_type', 'expense')
      .eq('journal_entries.organization_id', organizationId)
      .eq('journal_entries.status', 'posted')
      .gte('journal_entries.entry_date', startDate)
      .lte('journal_entries.entry_date', endDate);

    for (const item of expItems || []) {
      const net = Number(item.debit || 0) - Number(item.credit || 0);
      const pm = parcelMap.get((item as any).parcel_id);
      if (pm) pm.costs += net;
      breakdown.other += net;
    }

    const { data: revItems } = await supabase
      .from('journal_items')
      .select('parcel_id, debit, credit, accounts!inner(account_type), journal_entries!inner(entry_date, status, organization_id)')
      .in('parcel_id', parcelIds)
      .eq('accounts.account_type', 'revenue')
      .eq('journal_entries.organization_id', organizationId)
      .eq('journal_entries.status', 'posted')
      .gte('journal_entries.entry_date', startDate)
      .lte('journal_entries.entry_date', endDate);

    for (const item of revItems || []) {
      const net = Number(item.credit || 0) - Number(item.debit || 0);
      const pm = parcelMap.get((item as any).parcel_id);
      if (pm) pm.revenue += net;
      revBreakdown.invoiced += net;
    }

    // 8. Aggregate totals
    let totalCosts = 0;
    let totalRevenue = 0;
    const byParcel = Array.from(parcelMap.entries()).map(([parcelId, data]) => {
      totalCosts += data.costs;
      totalRevenue += data.revenue;
      return {
        parcel_id: parcelId,
        parcel_name: data.name,
        crop_type: data.crop_type,
        variety: data.variety,
        costs: data.costs,
        revenue: data.revenue,
        profit: data.revenue - data.costs,
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
      cost_breakdown: breakdown,
      revenue_breakdown: revBreakdown,
      by_parcel: byParcel,
    };
  }
}
