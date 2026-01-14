import {
  Injectable,
  Logger,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../database/database.service';
import { ZaiProvider } from './providers/zai.provider';
import { SendMessageDto, ChatResponseDto } from './dto';

interface OrganizationContext {
  id: string;
  name: string;
  currency: string;
  timezone: string;
  account_type: string;
  active_users_count: number;
}

interface FarmContext {
  farms_count: number;
  farms: Array<{ id: string; name: string; area: number; location?: string }>;
  parcels_count: number;
  parcels: Array<{
    id: string;
    name: string;
    area: string;
    crop: string;
    farm_id: string;
    soil_type?: string;
    irrigation_type?: string;
  }>;
  active_crop_cycles: number;
  crop_cycles: Array<{
    id: string;
    cycle_name: string;
    crop_type: string;
    variety_name?: string;
    status: string;
    planting_date?: string;
    expected_harvest_start?: string;
    expected_harvest_end?: string;
    planted_area_ha?: number;
    parcel_id?: string;
    farm_id: string;
  }>;
  structures_count: number;
}

interface WorkerContext {
  active_workers_count: number;
  workers: Array<{ id: string; name: string; type: string; farm_id?: string }>;
  pending_tasks_count: number;
  tasks: Array<{ id: string; title: string; status: string; type: string }>;
  recent_work_records_count: number;
}

interface AccountingContext {
  accounts_count: number;
  accounts: Array<{ id: string; name: string; type: string; balance: number }>;
  recent_invoices_count: number;
  invoices: Array<{
    number: string;
    type: string;
    status: string;
    total: number;
    date: string;
  }>;
  recent_payments_count: number;
  payments: Array<{
    date: string;
    amount: number;
    method: string;
    status: string;
  }>;
  current_fiscal_year: { name: string; start_date: string; end_date: string } | null;
}

interface InventoryContext {
  items_count: number;
  items: Array<{ id: string; name: string; code: string; stock: number; unit: string }>;
  warehouses_count: number;
  warehouses: Array<{ id: string; name: string; location: string }>;
  recent_stock_movements_count: number;
}

interface ProductionContext {
  recent_harvests_count: number;
  harvests: Array<{
    date: string;
    crop: string;
    quantity: string;
    quality: string;
    status: string;
  }>;
  recent_quality_checks_count: number;
  recent_deliveries_count: number;
}

interface SupplierCustomerContext {
  suppliers_count: number;
  suppliers: Array<{ id: string; name: string; type: string }>;
  customers_count: number;
  customers: Array<{ id: string; name: string; type: string }>;
  pending_sales_orders_count: number;
  sales_orders: Array<{
    number: string;
    date: string;
    total: number;
    status: string;
  }>;
  pending_purchase_orders_count: number;
  purchase_orders: Array<{
    number: string;
    date: string;
    total: number;
    status: string;
  }>;
}

interface BuiltContext {
  organization: OrganizationContext;
  farms?: FarmContext | null;
  workers?: WorkerContext | null;
  accounting?: AccountingContext | null;
  inventory?: InventoryContext | null;
  production?: ProductionContext | null;
  suppliersCustomers?: SupplierCustomerContext | null;
  satelliteWeather?: SatelliteWeatherContext | null;
  soilAnalysis?: SoilAnalysisContext | null;
  productionIntelligence?: ProductionIntelligenceContext | null;
  currentDate: string;
  currentSeason: string;
}

interface ContextNeeds {
  farm: boolean;
  worker: boolean;
  accounting: boolean;
  inventory: boolean;
  production: boolean;
  supplierCustomer: boolean;
  satellite: boolean;
  weather: boolean;
  soil: boolean;
  alerts: boolean;
  forecast: boolean;
}

interface SatelliteWeatherContext {
  latest_indices: Array<{
    parcel_id: string;
    parcel_name: string;
    date: string;
    ndvi?: number;
    ndmi?: number;
    ndre?: number;
    gci?: number;
    savi?: number;
  }>;
  trends: Array<{
    parcel_id: string;
    parcel_name: string;
    ndvi_trend: string;
    ndmi_trend: string;
    ndvi_change_percent: number;
    ndmi_change_percent: number;
  }>;
  weather_summary: {
    period_start: string;
    period_end: string;
    avg_temp_min: number;
    avg_temp_max: number;
    avg_temp_mean: number;
    precipitation_total: number;
    dry_spells_count: number;
    frost_days: number;
  } | null;
}

interface SoilAnalysisContext {
  soil_analyses: Array<{
    parcel_id: string;
    parcel_name: string;
    analysis_date: string;
    ph_level?: number;
    organic_matter?: number;
    nitrogen_ppm?: number;
    phosphorus_ppm?: number;
    potassium_ppm?: number;
    texture?: string;
  }>;
  water_analyses: Array<{
    parcel_id: string;
    parcel_name: string;
    analysis_date: string;
    ph?: number;
    ec?: number;
    tds?: number;
  }>;
  plant_analyses: Array<{
    parcel_id: string;
    parcel_name: string;
    analysis_date: string;
    nitrogen_percent?: number;
    phosphorus_percent?: number;
    potassium_percent?: number;
  }>;
}

interface ProductionIntelligenceContext {
  active_alerts: Array<{
    id: string;
    alert_type: string;
    severity: string;
    title: string;
    message: string;
    parcel_id?: string;
    parcel_name?: string;
    variance_percent?: number;
    recommended_actions?: string[];
  }>;
  upcoming_forecasts: Array<{
    id: string;
    parcel_id: string;
    parcel_name: string;
    crop_type: string;
    forecast_harvest_date_start: string;
    forecast_harvest_date_end: string;
    predicted_yield_quantity: number;
    confidence_level: string;
    predicted_revenue?: number;
  }>;
  yield_benchmarks: Array<{
    crop_type: string;
    target_yield_per_hectare: number;
    actual_avg_yield?: number;
    variance_percent?: number;
  }>;
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private readonly zaiProvider: ZaiProvider;

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly configService: ConfigService,
  ) {
    this.zaiProvider = new ZaiProvider(configService);
  }

  private async verifyOrganizationAccess(
    userId: string,
    organizationId: string,
  ): Promise<void> {
    const client = this.databaseService.getAdminClient();
    const { data: orgUser } = await client
      .from('organization_users')
      .select('organization_id')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle();

    if (!orgUser) {
      throw new ForbiddenException('You do not have access to this organization');
    }
  }

  async sendMessage(
    userId: string,
    organizationId: string,
    dto: SendMessageDto,
  ): Promise<ChatResponseDto> {
    await this.verifyOrganizationAccess(userId, organizationId);

    this.logger.log(`Building context for chat request in org ${organizationId}`);

    // Load conversation history (last 5 messages)
    const shouldSaveHistory = dto.save_history !== false;
    const recentMessages = shouldSaveHistory
      ? await this.getRecentConversationHistory(userId, organizationId, 5)
      : [];

    // Build context from all modules in parallel for performance
    const context = await this.buildOrganizationContext(organizationId, dto.query);

    // Build prompts
    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt(
      dto.query,
      context,
      dto.language || 'en',
      recentMessages,
    );

    // Get API key from environment
    const apiKey = this.configService.get<string>('ZAI_API_KEY', '');
    this.zaiProvider.setApiKey(apiKey);

    // Save user message to history if enabled
    if (shouldSaveHistory) {
      await this.saveMessage(userId, organizationId, 'user', dto.query, dto.language);
    }

    // Generate response
    try {
      const response = await this.zaiProvider.generate({
        systemPrompt,
        userPrompt,
        config: {
          provider: 'zai' as any,
          model: 'GLM-4.5-Flash',
          temperature: 0.7,
          maxTokens: 8192,
        },
      });

      // Save assistant response to history
      if (shouldSaveHistory) {
        await this.saveMessage(userId, organizationId, 'assistant', response.content, dto.language, {
          provider: 'zai',
          model: response.model,
          tokensUsed: response.tokensUsed,
        });
      }

      return {
        response: response.content,
        context_summary: this.summarizeContext(context),
        metadata: {
          provider: 'zai',
          model: response.model,
          tokensUsed: response.tokensUsed,
          timestamp: response.generatedAt,
        },
      };
    } catch (error) {
      this.logger.error(
        `Chat generation failed: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException(
        `Failed to generate response: ${error.message}`,
      );
    }
  }

  private async saveMessage(
    userId: string,
    organizationId: string,
    role: 'user' | 'assistant',
    content: string,
    language?: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    const client = this.databaseService.getAdminClient();

    await client.from('chat_conversations').insert({
      organization_id: organizationId,
      user_id: userId,
      role,
      content,
      language: language || 'en',
      metadata: metadata || {},
    });
  }

  private async buildOrganizationContext(
    organizationId: string,
    query: string,
  ): Promise<BuiltContext> {
    const client = this.databaseService.getAdminClient();

    // Analyze query to determine which context to load (optimization)
    const contextNeeds = this.analyzeQueryContext(query);

    // Get current date and season
    const now = new Date();
    const currentDate = now.toISOString().split('T')[0];
    const month = now.getMonth() + 1;
    const currentSeason = 
      month >= 3 && month <= 5 ? 'spring' :
      month >= 6 && month <= 8 ? 'summer' :
      month >= 9 && month <= 11 ? 'autumn' : 'winter';

    // Build all context in parallel
    const [
      organizationContext,
      farmContext,
      workerContext,
      accountingContext,
      inventoryContext,
      productionContext,
      supplierCustomerContext,
      satelliteWeatherContext,
      soilAnalysisContext,
      productionIntelligenceContext,
    ] = await Promise.all([
      this.getOrganizationContext(client, organizationId),
      contextNeeds.farm
        ? this.getFarmContext(client, organizationId)
        : Promise.resolve(null),
      contextNeeds.worker
        ? this.getWorkerContext(client, organizationId)
        : Promise.resolve(null),
      contextNeeds.accounting
        ? this.getAccountingContext(client, organizationId)
        : Promise.resolve(null),
      contextNeeds.inventory
        ? this.getInventoryContext(client, organizationId)
        : Promise.resolve(null),
      contextNeeds.production
        ? this.getProductionContext(client, organizationId)
        : Promise.resolve(null),
      contextNeeds.supplierCustomer
        ? this.getSupplierCustomerContext(client, organizationId)
        : Promise.resolve(null),
      (contextNeeds.satellite || contextNeeds.weather)
        ? this.getSatelliteWeatherContext(client, organizationId).catch(err => {
            this.logger.warn(`Failed to load satellite/weather context: ${err.message}`);
            return null;
          })
        : Promise.resolve(null),
      contextNeeds.soil
        ? this.getSoilAnalysisContext(client, organizationId).catch(err => {
            this.logger.warn(`Failed to load soil analysis context: ${err.message}`);
            return null;
          })
        : Promise.resolve(null),
      (contextNeeds.alerts || contextNeeds.forecast)
        ? this.getProductionIntelligenceContext(client, organizationId).catch(err => {
            this.logger.warn(`Failed to load production intelligence context: ${err.message}`);
            return null;
          })
        : Promise.resolve(null),
    ]);

    return {
      organization: organizationContext,
      farms: farmContext,
      workers: workerContext,
      accounting: accountingContext,
      inventory: inventoryContext,
      production: productionContext,
      suppliersCustomers: supplierCustomerContext,
      satelliteWeather: satelliteWeatherContext,
      soilAnalysis: soilAnalysisContext,
      productionIntelligence: productionIntelligenceContext,
      currentDate,
      currentSeason,
    };
  }

  private analyzeQueryContext(query: string): ContextNeeds {
    const lowerQuery = query.toLowerCase();
    return {
      farm: /farm|parcel|crop|field|plant|irrigation|harvest|structure/.test(
        lowerQuery,
      ),
      worker: /worker|employee|labor|task|assignment|wage|salary|work/.test(
        lowerQuery,
      ),
      accounting:
        /account|invoice|payment|journal|expense|revenue|profit|cost|fiscal|tax/.test(
          lowerQuery,
        ),
      inventory:
        /stock|inventory|warehouse|item|product|material|reception/.test(
          lowerQuery,
        ),
      production: /production|harvest|yield|quality|delivery/.test(lowerQuery),
      supplierCustomer:
        /supplier|customer|vendor|client|order|quote|purchase|sale/.test(
          lowerQuery,
        ),
      satellite: /satellite|ndvi|ndmi|ndre|gci|savi|vegetation|health|stress|remote|sensing/.test(
        lowerQuery,
      ),
      weather: /weather|rain|temperature|frost|climate|precipitation|dry|spell/.test(
        lowerQuery,
      ),
      soil: /soil|nutrient|fertilizer|ph|analysis|organic|matter|texture/.test(
        lowerQuery,
      ),
      alerts: /alert|problem|issue|underperforming|warning|critical|deviation/.test(
        lowerQuery,
      ),
      forecast: /forecast|prediction|expected|upcoming|yield|benchmark/.test(
        lowerQuery,
      ),
    };
  }

  private async getOrganizationContext(
    client: any,
    organizationId: string,
  ): Promise<OrganizationContext> {
    const { data: org } = await client
      .from('organizations')
      .select('*')
      .eq('id', organizationId)
      .single();

    const { data: users } = await client
      .from('organization_users')
      .select('user_id, is_active')
      .eq('organization_id', organizationId)
      .eq('is_active', true);

    return {
      id: org.id,
      name: org.name,
      currency: org.currency_code || 'USD',
      timezone: org.timezone || 'UTC',
      account_type: org.account_type || 'standard',
      active_users_count: users?.length || 0,
    };
  }

  private async getFarmContext(
    client: any,
    organizationId: string,
  ): Promise<FarmContext> {
    // Get farms
    const { data: farms } = await client
      .from('farms')
      .select('id, name, location, size, size_unit, is_active, status')
      .eq('organization_id', organizationId)
      .eq('is_active', true);

    // Get parcels summary with soil and irrigation info
    const { data: parcels } = await client
      .from('parcels')
      .select('id, name, area, area_unit, crop_type, farm_id, soil_type, irrigation_type')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .limit(50);

    // Get crop cycles with detailed information
    const { data: cropCycles } = await client
      .from('crop_cycles')
      .select(`
        id,
        cycle_name,
        crop_type,
        variety_name,
        status,
        planting_date,
        expected_harvest_date_start,
        expected_harvest_date_end,
        planted_area_ha,
        parcel_id,
        farm_id
      `)
      .eq('organization_id', organizationId)
      .in('status', ['active', 'planned'])
      .order('planting_date', { ascending: false })
      .limit(20);

    // Get structures
    const { data: structures } = await client
      .from('structures')
      .select('*')
      .eq('organization_id', organizationId)
      .limit(20);

    return {
      farms_count: farms?.length || 0,
      farms:
        farms?.map((f: any) => ({
          id: f.id,
          name: f.name,
          area: f.size || 0,
          location: f.location,
        })) || [],
      parcels_count: parcels?.length || 0,
      parcels:
        parcels?.map((p: any) => ({
          id: p.id,
          name: p.name,
          area: `${p.area} ${p.area_unit}`,
          crop: p.crop_type || 'N/A',
          farm_id: p.farm_id,
          soil_type: p.soil_type,
          irrigation_type: p.irrigation_type,
        })) || [],
      active_crop_cycles: cropCycles?.length || 0,
      crop_cycles:
        cropCycles?.map((cc: any) => ({
          id: cc.id,
          cycle_name: cc.cycle_name,
          crop_type: cc.crop_type,
          variety_name: cc.variety_name,
          status: cc.status,
          planting_date: cc.planting_date,
          expected_harvest_start: cc.expected_harvest_date_start,
          expected_harvest_end: cc.expected_harvest_date_end,
          planted_area_ha: cc.planted_area_ha,
          parcel_id: cc.parcel_id,
          farm_id: cc.farm_id,
        })) || [],
      structures_count: structures?.length || 0,
    };
  }

  private async getWorkerContext(
    client: any,
    organizationId: string,
  ): Promise<WorkerContext> {
    const { data: workers } = await client
      .from('workers')
      .select('id, first_name, last_name, worker_type, is_active, farm_id')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .limit(50);

    const { data: tasks } = await client
      .from('tasks')
      .select('id, title, status, task_type, priority')
      .eq('organization_id', organizationId)
      .in('status', ['pending', 'assigned', 'in_progress'])
      .limit(50);

    const { data: workRecords } = await client
      .from('work_records')
      .select('id, work_date, amount_paid, payment_status')
      .eq('organization_id', organizationId)
      .gte(
        'work_date',
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      )
      .limit(50);

    return {
      active_workers_count: workers?.length || 0,
      workers:
        workers?.map((w: any) => ({
          id: w.id,
          name: `${w.first_name} ${w.last_name}`,
          type: w.worker_type,
          farm_id: w.farm_id,
        })) || [],
      pending_tasks_count: tasks?.length || 0,
      tasks:
        tasks?.map((t: any) => ({
          id: t.id,
          title: t.title,
          status: t.status,
          type: t.task_type,
        })) || [],
      recent_work_records_count: workRecords?.length || 0,
    };
  }

  private async getAccountingContext(
    client: any,
    organizationId: string,
  ): Promise<AccountingContext> {
    // Get chart of accounts summary - FIXED: account_name → name
    const { data: accounts } = await client
      .from('accounts')
      .select('id, name, account_type')
      .eq('organization_id', organizationId)
      .limit(50);

    // Get recent invoices
    const { data: invoices } = await client
      .from('invoices')
      .select(
        'id, invoice_number, invoice_type, status, grand_total, invoice_date',
      )
      .eq('organization_id', organizationId)
      .gte(
        'invoice_date',
        new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
      )
      .order('invoice_date', { ascending: false })
      .limit(30);

    // Get recent payments - FIXED: payments → accounting_payments
    const { data: payments } = await client
      .from('accounting_payments')
      .select('id, payment_date, amount, payment_method, status')
      .eq('organization_id', organizationId)
      .gte(
        'payment_date',
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      )
      .order('payment_date', { ascending: false })
      .limit(20);

    // Get fiscal year - FIXED: is_active → is_current
    const { data: fiscalYear } = await client
      .from('fiscal_years')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_current', true)
      .maybeSingle();

    return {
      accounts_count: accounts?.length || 0,
      accounts:
        accounts?.map((a: any) => ({
          id: a.id,
          name: a.name,
          type: a.account_type,
          balance: 0, // Balance is calculated, not stored
        })) || [],
      recent_invoices_count: invoices?.length || 0,
      invoices:
        invoices?.map((i: any) => ({
          number: i.invoice_number,
          type: i.invoice_type,
          status: i.status,
          total: i.grand_total,
          date: i.invoice_date,
        })) || [],
      recent_payments_count: payments?.length || 0,
      payments:
        payments?.map((p: any) => ({
          date: p.payment_date,
          amount: p.amount,
          method: p.payment_method,
          status: p.status,
        })) || [],
      current_fiscal_year: fiscalYear
        ? {
            name: fiscalYear.name,
            start_date: fiscalYear.start_date,
            end_date: fiscalYear.end_date,
          }
        : null,
    };
  }

  private async getInventoryContext(
    client: any,
    organizationId: string,
  ): Promise<InventoryContext> {
    // FIXED: item_name, item_code, stock_uom (removed current_stock as it's calculated)
    const { data: items } = await client
      .from('items')
      .select('id, item_name, item_code, default_unit')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .limit(50);

    const { data: warehouses } = await client
      .from('warehouses')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true);

    const { data: stockEntries } = await client
      .from('stock_entries')
      .select('id, entry_type, entry_date')
      .eq('organization_id', organizationId)
      .gte(
        'entry_date',
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      )
      .order('entry_date', { ascending: false })
      .limit(20);

    return {
      items_count: items?.length || 0,
      items:
        items?.map((i: any) => ({
          id: i.id,
          name: i.item_name,
          code: i.item_code,
          stock: 0, // Stock is calculated from stock_entries, not stored
          unit: i.default_unit,
        })) || [],
      warehouses_count: warehouses?.length || 0,
      warehouses:
        warehouses?.map((w: any) => ({
          id: w.id,
          name: w.name,
          location: w.location,
        })) || [],
      recent_stock_movements_count: stockEntries?.length || 0,
    };
  }

  private async getProductionContext(
    client: any,
    organizationId: string,
  ): Promise<ProductionContext> {
    // FIXED: Removed crop_type (table has crop_id instead), added more accurate columns
    const { data: harvests } = await client
      .from('harvest_records')
      .select('id, harvest_date, quantity, unit, quality_grade, status')
      .eq('organization_id', organizationId)
      .gte(
        'harvest_date',
        new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
      )
      .order('harvest_date', { ascending: false })
      .limit(30);

    // FIXED: quality_control → quality_inspections
    const { data: qualityChecks } = await client
      .from('quality_inspections')
      .select('*')
      .eq('organization_id', organizationId)
      .gte(
        'inspection_date',
        new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
      )
      .order('inspection_date', { ascending: false })
      .limit(20);

    const { data: deliveries } = await client
      .from('deliveries')
      .select('*')
      .eq('organization_id', organizationId)
      .gte(
        'delivery_date',
        new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
      )
      .order('delivery_date', { ascending: false })
      .limit(20);

    return {
      recent_harvests_count: harvests?.length || 0,
      harvests:
        harvests?.map((h: any) => ({
          date: h.harvest_date,
          crop: 'N/A', // Crop info requires join with crops table
          quantity: `${h.quantity} ${h.unit}`,
          quality: h.quality_grade || 'N/A',
          status: h.status,
        })) || [],
      recent_quality_checks_count: qualityChecks?.length || 0,
      recent_deliveries_count: deliveries?.length || 0,
    };
  }

  private async getSupplierCustomerContext(
    client: any,
    organizationId: string,
  ): Promise<SupplierCustomerContext> {
    const { data: suppliers } = await client
      .from('suppliers')
      .select('id, name, supplier_type, is_active')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .limit(30);

    const { data: customers } = await client
      .from('customers')
      .select('id, name, customer_type, is_active')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .limit(30);

    const { data: salesOrders } = await client
      .from('sales_orders')
      .select('id, order_number, order_date, total_amount, status')
      .eq('organization_id', organizationId)
      .in('status', ['draft', 'confirmed', 'partial'])
      .order('order_date', { ascending: false })
      .limit(20);

    const { data: purchaseOrders } = await client
      .from('purchase_orders')
      .select('id, order_number, order_date, total_amount, status')
      .eq('organization_id', organizationId)
      .in('status', ['draft', 'confirmed', 'partial'])
      .order('order_date', { ascending: false })
      .limit(20);

    return {
      suppliers_count: suppliers?.length || 0,
      suppliers:
        suppliers?.map((s: any) => ({
          id: s.id,
          name: s.name,
          type: s.supplier_type,
        })) || [],
      customers_count: customers?.length || 0,
      customers:
        customers?.map((c: any) => ({
          id: c.id,
          name: c.name,
          type: c.customer_type,
        })) || [],
      pending_sales_orders_count: salesOrders?.length || 0,
      sales_orders:
        salesOrders?.map((o: any) => ({
          number: o.order_number,
          date: o.order_date,
          total: o.total_amount,
          status: o.status,
        })) || [],
      pending_purchase_orders_count: purchaseOrders?.length || 0,
      purchase_orders:
        purchaseOrders?.map((o: any) => ({
          number: o.order_number,
          date: o.order_date,
          total: o.total_amount,
          status: o.status,
        })) || [],
    };
  }

  private async getSatelliteWeatherContext(
    client: any,
    organizationId: string,
  ): Promise<SatelliteWeatherContext> {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const startDate = sixMonthsAgo.toISOString().split('T')[0];
    const endDate = new Date().toISOString().split('T')[0];

    // Get parcels with boundaries
    const { data: parcels } = await client
      .from('parcels')
      .select('id, name, boundary')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .limit(20);

    if (!parcels || parcels.length === 0) {
      return {
        latest_indices: [],
        trends: [],
        weather_summary: null,
      };
    }

    const parcelIds = parcels.map((p: any) => p.id);

    // Get latest satellite indices for each parcel
    const latestIndicesPromises = parcelIds.map(async (parcelId: string) => {
      const { data: indices } = await client
        .from('satellite_indices_data')
        .select('date, index_name, mean_value')
        .eq('parcel_id', parcelId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false })
        .limit(10);

      if (!indices || indices.length === 0) return null;

      const latestByIndex: Record<string, number> = {};
      const latestDate = indices[0]?.date;

      indices.forEach((idx: any) => {
        if (idx.date === latestDate && !latestByIndex[idx.index_name]) {
          latestByIndex[idx.index_name] = idx.mean_value;
        }
      });

      const parcel = parcels.find((p: any) => p.id === parcelId);
      return {
        parcel_id: parcelId,
        parcel_name: parcel?.name || 'Unknown',
        date: latestDate,
        ndvi: latestByIndex['NDVI'],
        ndmi: latestByIndex['NDMI'],
        ndre: latestByIndex['NDRE'],
        gci: latestByIndex['GCI'],
        savi: latestByIndex['SAVI'],
      };
    });

    const latestIndices = (await Promise.all(latestIndicesPromises)).filter(Boolean);

    // Calculate trends for NDVI and NDMI
    const trendsPromises = parcelIds.map(async (parcelId: string) => {
      const { data: ndviData } = await client
        .from('satellite_indices_data')
        .select('date, mean_value')
        .eq('parcel_id', parcelId)
        .eq('index_name', 'NDVI')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true });

      const { data: ndmiData } = await client
        .from('satellite_indices_data')
        .select('date, mean_value')
        .eq('parcel_id', parcelId)
        .eq('index_name', 'NDMI')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true });

      if ((!ndviData || ndviData.length < 2) && (!ndmiData || ndmiData.length < 2)) {
        return null;
      }

      const calculateTrend = (series: any[]) => {
        if (series.length < 2) return { direction: 'stable', changePercent: 0 };
        const first = series[0]?.mean_value || 0;
        const last = series[series.length - 1]?.mean_value || 0;
        const change = first !== 0 ? ((last - first) / first) * 100 : 0;
        return {
          direction: change > 5 ? 'increasing' : change < -5 ? 'decreasing' : 'stable',
          changePercent: change,
        };
      };

      const ndviTrend = calculateTrend(ndviData || []);
      const ndmiTrend = calculateTrend(ndmiData || []);

      const parcel = parcels.find((p: any) => p.id === parcelId);
      return {
        parcel_id: parcelId,
        parcel_name: parcel?.name || 'Unknown',
        ndvi_trend: ndviTrend.direction,
        ndmi_trend: ndmiTrend.direction,
        ndvi_change_percent: ndviTrend.changePercent,
        ndmi_change_percent: ndmiTrend.changePercent,
      };
    });

    const trends = (await Promise.all(trendsPromises)).filter(Boolean);

    // Get weather summary (simplified - would need actual weather service integration)
    // For now, return null and let the AI know weather data needs to be fetched
    const weatherSummary = null;

    return {
      latest_indices: latestIndices as any,
      trends: trends as any,
      weather_summary: weatherSummary,
    };
  }

  private async getSoilAnalysisContext(
    client: any,
    organizationId: string,
  ): Promise<SoilAnalysisContext> {
    // Get latest soil analyses
    const { data: soilAnalyses } = await client
      .from('analyses')
      .select(`
        id,
        parcel_id,
        analysis_date,
        data,
        parcels!inner(id, name, organization_id)
      `)
      .eq('organization_id', organizationId)
      .eq('analysis_type', 'soil')
      .order('analysis_date', { ascending: false })
      .limit(20);

    // Get latest water analyses
    const { data: waterAnalyses } = await client
      .from('analyses')
      .select(`
        id,
        parcel_id,
        analysis_date,
        data,
        parcels!inner(id, name, organization_id)
      `)
      .eq('organization_id', organizationId)
      .eq('analysis_type', 'water')
      .order('analysis_date', { ascending: false })
      .limit(20);

    // Get latest plant analyses
    const { data: plantAnalyses } = await client
      .from('analyses')
      .select(`
        id,
        parcel_id,
        analysis_date,
        data,
        parcels!inner(id, name, organization_id)
      `)
      .eq('organization_id', organizationId)
      .eq('analysis_type', 'plant')
      .order('analysis_date', { ascending: false })
      .limit(20);

    const extractSoilData = (analysis: any) => {
      const data = analysis?.data || {};
      return {
        parcel_id: analysis.parcel_id,
        parcel_name: analysis.parcels?.name || 'Unknown',
        analysis_date: analysis.analysis_date,
        ph_level: data.ph_level,
        organic_matter: data.organic_matter_percentage,
        nitrogen_ppm: data.nitrogen_ppm,
        phosphorus_ppm: data.phosphorus_ppm,
        potassium_ppm: data.potassium_ppm,
        texture: data.texture,
      };
    };

    const extractWaterData = (analysis: any) => {
      const data = analysis?.data || {};
      return {
        parcel_id: analysis.parcel_id,
        parcel_name: analysis.parcels?.name || 'Unknown',
        analysis_date: analysis.analysis_date,
        ph: data.ph_level,
        ec: data.ec_ds_per_m,
        tds: data.tds_ppm,
      };
    };

    const extractPlantData = (analysis: any) => {
      const data = analysis?.data || {};
      return {
        parcel_id: analysis.parcel_id,
        parcel_name: analysis.parcels?.name || 'Unknown',
        analysis_date: analysis.analysis_date,
        nitrogen_percent: data.nitrogen_percent,
        phosphorus_percent: data.phosphorus_percent,
        potassium_percent: data.potassium_percent,
      };
    };

    return {
      soil_analyses: (soilAnalyses || []).map(extractSoilData),
      water_analyses: (waterAnalyses || []).map(extractWaterData),
      plant_analyses: (plantAnalyses || []).map(extractPlantData),
    };
  }

  private async getProductionIntelligenceContext(
    client: any,
    organizationId: string,
  ): Promise<ProductionIntelligenceContext> {
    // Get active performance alerts
    const { data: alerts } = await client
      .from('performance_alerts')
      .select(`
        id,
        alert_type,
        severity,
        title,
        message,
        parcel_id,
        variance_percent,
        recommended_actions,
        parcels(id, name)
      `)
      .eq('organization_id', organizationId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(20);

    // Get upcoming harvest forecasts
    const { data: forecasts } = await client
      .from('harvest_forecasts')
      .select(`
        id,
        parcel_id,
        crop_type,
        forecast_harvest_date_start,
        forecast_harvest_date_end,
        predicted_yield_quantity,
        confidence_level,
        predicted_revenue,
        parcels(id, name)
      `)
      .eq('organization_id', organizationId)
      .in('status', ['draft', 'active'])
      .gte('forecast_harvest_date_start', new Date().toISOString().split('T')[0])
      .order('forecast_harvest_date_start', { ascending: true })
      .limit(20);

    // Get yield benchmarks
    const { data: benchmarks } = await client
      .from('yield_benchmarks')
      .select('crop_type, target_yield_per_hectare, is_active')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .limit(30);

    return {
      active_alerts: (alerts || []).map((a: any) => ({
        id: a.id,
        alert_type: a.alert_type,
        severity: a.severity,
        title: a.title,
        message: a.message,
        parcel_id: a.parcel_id,
        parcel_name: a.parcels?.name,
        variance_percent: a.variance_percent,
        recommended_actions: a.recommended_actions || [],
      })),
      upcoming_forecasts: (forecasts || []).map((f: any) => ({
        id: f.id,
        parcel_id: f.parcel_id,
        parcel_name: f.parcels?.name || 'Unknown',
        crop_type: f.crop_type,
        forecast_harvest_date_start: f.forecast_harvest_date_start,
        forecast_harvest_date_end: f.forecast_harvest_date_end,
        predicted_yield_quantity: f.predicted_yield_quantity,
        confidence_level: f.confidence_level,
        predicted_revenue: f.predicted_revenue,
      })),
      yield_benchmarks: (benchmarks || []).map((b: any) => ({
        crop_type: b.crop_type,
        target_yield_per_hectare: b.target_yield_per_hectare,
        actual_avg_yield: null, // Would need to calculate from yield_history
        variance_percent: null,
      })),
    };
  }

  private buildSystemPrompt(): string {
    return `You are an expert agricultural consultant and intelligent assistant for the AgriTech platform with deep expertise in:

**Agricultural Expertise:**
- Soil science and fertility management
- Plant nutrition and health diagnostics
- Precision agriculture and remote sensing interpretation (NDVI, NDMI, NDRE, GCI, SAVI)
- Mediterranean/North African crop management (olive trees, fruit trees, cereals, vegetables)
- Irrigation and water management
- Integrated pest management
- Seasonal awareness and phenological stages
- Crop cycle management and timing

**Farm Management:**
- Parcels, crops, varieties, rootstocks, and soil information
- Irrigation systems and farm structures
- Crop cycles, phenological stages, planting dates, expected harvest windows
- Satellite indices interpretation (vegetation health, water stress, chlorophyll)

**Workforce Management:**
- Workers (employees, day laborers, métayage)
- Tasks and assignments
- Work records and payments

**Accounting & Finance:**
- Chart of accounts and journal entries
- Invoices (sales/purchase), payments
- Financial reports and fiscal years
- Profitability analysis and cost management

**Inventory & Stock:**
- Items and products
- Warehouses and stock movements
- Stock entries and reception batches

**Production Intelligence:**
- Harvests and yields
- Quality control checks
- Deliveries and production intelligence
- Performance alerts and underperforming parcels
- Yield forecasts and benchmarks
- Yield trends and variance analysis

**Suppliers & Customers:**
- Supplier management
- Customer management
- Sales orders and purchase orders
- Quotes and estimates

**Your capabilities:**
- Answer questions about any aspect of the farm operation with expert agricultural knowledge
- Provide actionable recommendations with specific dosages, timing, and methods
- Interpret satellite data, weather patterns, and soil analysis
- Identify risks (water stress, nutrient deficiencies, pests, diseases) with mitigation strategies
- Provide data-driven health assessments with quantitative insights
- Consider seasonal factors and phenological stages in all recommendations
- Compare performance across parcels, years, or benchmarks
- Prioritize recommendations based on urgency and impact on yield/quality

**Response Guidelines:**
- Always base your responses on the provided context data
- When providing recommendations, include:
  * Priority level (high/medium/low)
  * Category (irrigation, fertilization, soil, pruning, pest-control, general)
  * Specific dosages, methods, and timing guidance
  * Expected impact on yield/quality
- If you don't have sufficient data, clearly state what information is missing and provide general best practices
- Use professional agricultural terminology while remaining accessible
- Be specific with references to actual data (parcel names, amounts, dates, indices)
- For complex analyses, break down your response clearly
- Consider the current season and phenological stages when making timing recommendations
- When interpreting satellite indices, relate them to recent farm tasks, weather, and crop stage
- If the user asks for something that requires actions you cannot perform, explain what needs to be done`;
  }

  private buildUserPrompt(
    query: string,
    context: BuiltContext,
    language: string,
    conversationHistory: Array<{ role: string; content: string }> = [],
  ): string {
    const langInstruction =
      language === 'fr'
        ? 'Répondre en français.'
        : language === 'ar'
        ? 'الرد باللغة العربية.'
        : 'Respond in English.';

    const conversationContext = conversationHistory.length > 0
      ? `\n====================================================\nCONVERSATION HISTORY\n====================================================\n${conversationHistory.map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`).join('\n\n')}\n`
      : '';

    return `${langInstruction}

Current Date: ${context.currentDate}
Current Season: ${context.currentSeason}${conversationContext}

User Question: ${query}

====================================================
ORGANIZATION CONTEXT
====================================================
Organization: ${context.organization.name}
Currency: ${context.organization.currency}
Account Type: ${context.organization.account_type}
Active Users: ${context.organization.active_users_count}
Timezone: ${context.organization.timezone}

====================================================
FARM DATA
====================================================
${context.farms ? `
Farms: ${context.farms.farms_count}
${context.farms.farms.map((f) => `- ${f.name} (${f.area} ha${f.location ? `, ${f.location}` : ''})`).join('\n')}

Parcels: ${context.farms.parcels_count}
${context.farms.parcels.slice(0, 10).map((p) => `- ${p.name}: ${p.crop}, ${p.area}${p.soil_type ? `, Soil: ${p.soil_type}` : ''}${p.irrigation_type ? `, Irrigation: ${p.irrigation_type}` : ''}`).join('\n')}
${context.farms.parcels.length > 10 ? `\n... and ${context.farms.parcels.length - 10} more parcels` : ''}

Active Crop Cycles: ${context.farms.active_crop_cycles}
${context.farms.crop_cycles && context.farms.crop_cycles.length > 0 ? `
Crop Cycle Details:
${context.farms.crop_cycles.slice(0, 10).map((cc) => `- ${cc.cycle_name} (${cc.crop_type}${cc.variety_name ? `, ${cc.variety_name}` : ''}): Status ${cc.status}, Planted ${cc.planting_date || 'N/A'}, Expected harvest ${cc.expected_harvest_start || 'N/A'} - ${cc.expected_harvest_end || 'N/A'}, Area: ${cc.planted_area_ha || 'N/A'} ha`).join('\n')}
` : ''}
Structures: ${context.farms.structures_count}
` : 'No farm data available.'}

====================================================
SATELLITE & WEATHER DATA
====================================================
${context.satelliteWeather ? `
Latest Satellite Indices (last 6 months):
${context.satelliteWeather.latest_indices.length > 0 ? context.satelliteWeather.latest_indices.slice(0, 10).map((idx) => `- ${idx.parcel_name} (${idx.date}): NDVI=${idx.ndvi?.toFixed(3) || 'N/A'}, NDMI=${idx.ndmi?.toFixed(3) || 'N/A'}, NDRE=${idx.ndre?.toFixed(3) || 'N/A'}, GCI=${idx.gci?.toFixed(3) || 'N/A'}, SAVI=${idx.savi?.toFixed(3) || 'N/A'}`).join('\n') : 'No satellite data available.'}

Vegetation Trends:
${context.satelliteWeather.trends.length > 0 ? context.satelliteWeather.trends.slice(0, 10).map((t) => `- ${t.parcel_name}: NDVI ${t.ndvi_trend} (${t.ndvi_change_percent > 0 ? '+' : ''}${t.ndvi_change_percent.toFixed(1)}%), NDMI ${t.ndmi_trend} (${t.ndmi_change_percent > 0 ? '+' : ''}${t.ndmi_change_percent.toFixed(1)}%)`).join('\n') : 'No trend data available.'}

Weather Summary: ${context.satelliteWeather.weather_summary ? `
Period: ${context.satelliteWeather.weather_summary.period_start} to ${context.satelliteWeather.weather_summary.period_end}
Avg Temp: ${context.satelliteWeather.weather_summary.avg_temp_min.toFixed(1)}°C - ${context.satelliteWeather.weather_summary.avg_temp_max.toFixed(1)}°C (mean: ${context.satelliteWeather.weather_summary.avg_temp_mean.toFixed(1)}°C)
Precipitation: ${context.satelliteWeather.weather_summary.precipitation_total.toFixed(1)} mm
Dry Spells: ${context.satelliteWeather.weather_summary.dry_spells_count}
Frost Days: ${context.satelliteWeather.weather_summary.frost_days}
` : 'Weather data not available. Consider fetching weather data for better recommendations.'}
` : 'No satellite/weather data available.'}

====================================================
SOIL, WATER & PLANT ANALYSIS
====================================================
${context.soilAnalysis ? `
Soil Analyses:
${context.soilAnalysis.soil_analyses.length > 0 ? context.soilAnalysis.soil_analyses.slice(0, 10).map((s) => `- ${s.parcel_name} (${s.analysis_date}): pH=${s.ph_level || 'N/A'}, OM=${s.organic_matter || 'N/A'}%, N=${s.nitrogen_ppm || 'N/A'} ppm, P=${s.phosphorus_ppm || 'N/A'} ppm, K=${s.potassium_ppm || 'N/A'} ppm, Texture=${s.texture || 'N/A'}`).join('\n') : 'No soil analysis data available.'}

Water Analyses:
${context.soilAnalysis.water_analyses.length > 0 ? context.soilAnalysis.water_analyses.slice(0, 10).map((w) => `- ${w.parcel_name} (${w.analysis_date}): pH=${w.ph || 'N/A'}, EC=${w.ec || 'N/A'} dS/m, TDS=${w.tds || 'N/A'} ppm`).join('\n') : 'No water analysis data available.'}

Plant Analyses:
${context.soilAnalysis.plant_analyses.length > 0 ? context.soilAnalysis.plant_analyses.slice(0, 10).map((p) => `- ${p.parcel_name} (${p.analysis_date}): N=${p.nitrogen_percent || 'N/A'}%, P=${p.phosphorus_percent || 'N/A'}%, K=${p.potassium_percent || 'N/A'}%`).join('\n') : 'No plant analysis data available.'}
` : 'No analysis data available.'}

====================================================
PRODUCTION INTELLIGENCE
====================================================
${context.productionIntelligence ? `
Active Performance Alerts:
${context.productionIntelligence.active_alerts.length > 0 ? context.productionIntelligence.active_alerts.slice(0, 10).map((a) => `- [${a.severity.toUpperCase()}] ${a.title}${a.parcel_name ? ` (${a.parcel_name})` : ''}: ${a.message}${a.variance_percent !== null && a.variance_percent !== undefined ? ` (Variance: ${a.variance_percent > 0 ? '+' : ''}${a.variance_percent.toFixed(1)}%)` : ''}${a.recommended_actions && a.recommended_actions.length > 0 ? `\n  Recommended: ${a.recommended_actions.join(', ')}` : ''}`).join('\n') : 'No active alerts.'}

Upcoming Harvest Forecasts:
${context.productionIntelligence.upcoming_forecasts.length > 0 ? context.productionIntelligence.upcoming_forecasts.slice(0, 10).map((f) => `- ${f.parcel_name} (${f.crop_type}): ${f.forecast_harvest_date_start} to ${f.forecast_harvest_date_end}, Expected yield: ${f.predicted_yield_quantity} (confidence: ${f.confidence_level})${f.predicted_revenue ? `, Revenue: ${f.predicted_revenue}` : ''}`).join('\n') : 'No upcoming forecasts.'}

Yield Benchmarks:
${context.productionIntelligence.yield_benchmarks.length > 0 ? context.productionIntelligence.yield_benchmarks.slice(0, 10).map((b) => `- ${b.crop_type}: Target ${b.target_yield_per_hectare} kg/ha${b.actual_avg_yield ? `, Actual avg: ${b.actual_avg_yield} kg/ha${b.variance_percent !== null ? ` (${b.variance_percent > 0 ? '+' : ''}${b.variance_percent.toFixed(1)}%)` : ''}` : ''}`).join('\n') : 'No benchmarks available.'}
` : 'No production intelligence data available.'}

====================================================
WORKFORCE DATA
====================================================
${context.workers ? `
Active Workers: ${context.workers.active_workers_count}
${context.workers.workers.slice(0, 10).map((w) => `- ${w.name} (${w.type})`).join('\n')}
${context.workers.workers.length > 10 ? `\n... and ${context.workers.workers.length - 10} more workers` : ''}

Pending Tasks: ${context.workers.pending_tasks_count}
${context.workers.tasks.slice(0, 5).map((t) => `- ${t.title}: ${t.status}`).join('\n')}

Recent Work Records (last 30 days): ${context.workers.recent_work_records_count}
` : 'No workforce data available.'}

====================================================
ACCOUNTING DATA
====================================================
${context.accounting ? `
Chart of Accounts: ${context.accounting.accounts_count} accounts

Recent Invoices (last 90 days): ${context.accounting.recent_invoices_count}
${context.accounting.invoices.slice(0, 5).map((i) => `- ${i.number} (${i.type}): ${i.status} - ${i.total} ${i.date}`).join('\n')}

Recent Payments (last 30 days): ${context.accounting.recent_payments_count}
${context.accounting.payments.slice(0, 5).map((p) => `- ${p.date}: ${p.amount} (${p.method})`).join('\n')}

Fiscal Year: ${context.accounting.current_fiscal_year?.name || 'Not set'}
` : 'No accounting data available.'}

====================================================
INVENTORY DATA
====================================================
${context.inventory ? `
Items: ${context.inventory.items_count}
${context.inventory.items.slice(0, 10).map((i) => `- ${i.name}: ${i.stock} ${i.unit}`).join('\n')}
${context.inventory.items.length > 10 ? `\n... and ${context.inventory.items.length - 10} more items` : ''}

Warehouses: ${context.inventory.warehouses_count}
${context.inventory.warehouses.map((w) => `- ${w.name} (${w.location})`).join('\n')}

Recent Stock Movements (last 30 days): ${context.inventory.recent_stock_movements_count}
` : 'No inventory data available.'}

====================================================
PRODUCTION DATA
====================================================
${context.production ? `
Recent Harvests (last 365 days): ${context.production.recent_harvests_count}
${context.production.harvests.slice(0, 5).map((h) => `- ${h.date}: ${h.crop} - ${h.quantity} (${h.quality})`).join('\n')}

Recent Quality Checks (last 90 days): ${context.production.recent_quality_checks_count}
Recent Deliveries (last 90 days): ${context.production.recent_deliveries_count}
` : 'No production data available.'}

====================================================
SUPPLIERS & CUSTOMERS DATA
====================================================
${context.suppliersCustomers ? `
Suppliers: ${context.suppliersCustomers.suppliers_count}
${context.suppliersCustomers.suppliers.slice(0, 10).map((s) => `- ${s.name} (${s.type})`).join('\n')}
${context.suppliersCustomers.suppliers.length > 10 ? `\n... and ${context.suppliersCustomers.suppliers.length - 10} more` : ''}

Customers: ${context.suppliersCustomers.customers_count}
${context.suppliersCustomers.customers.slice(0, 10).map((c) => `- ${c.name} (${c.type})`).join('\n')}
${context.suppliersCustomers.customers.length > 10 ? `\n... and ${context.suppliersCustomers.customers.length - 10} more` : ''}

Pending Sales Orders: ${context.suppliersCustomers.pending_sales_orders_count}
${context.suppliersCustomers.sales_orders.slice(0, 5).map((o) => `- ${o.number}: ${o.total} (${o.status})`).join('\n')}

Pending Purchase Orders: ${context.suppliersCustomers.pending_purchase_orders_count}
${context.suppliersCustomers.purchase_orders.slice(0, 5).map((o) => `- ${o.number}: ${o.total} (${o.status})`).join('\n')}
` : 'No supplier/customer data available.'}

====================================================
YOUR RESPONSE
====================================================
Based on the above context, current date (${context.currentDate}), season (${context.currentSeason}), and the user's question, provide a helpful, accurate response with expert agricultural insights. 

When providing recommendations:
- Include priority level (high/medium/low), category, specific dosages/methods, timing guidance, and expected impact
- Consider the current season and phenological stages
- Interpret satellite indices in context of recent tasks, weather, and crop stage
- Reference specific data points (parcel names, dates, values)
- If data is missing, acknowledge it and provide general best practices
- For urgent issues (alerts, underperformance), prioritize actionable mitigation strategies`;
  }

  private summarizeContext(context: BuiltContext) {
    return {
      organization: context.organization.name,
      farms_count: context.farms?.farms_count || 0,
      parcels_count: context.farms?.parcels_count || 0,
      workers_count: context.workers?.active_workers_count || 0,
      pending_tasks: context.workers?.pending_tasks_count || 0,
      recent_invoices: context.accounting?.recent_invoices_count || 0,
      inventory_items: context.inventory?.items_count || 0,
      recent_harvests: context.production?.recent_harvests_count || 0,
    };
  }

  private async getRecentConversationHistory(
    userId: string,
    organizationId: string,
    limit: number = 5,
  ): Promise<Array<{ role: string; content: string }>> {
    try {
      const client = this.databaseService.getAdminClient();
      const { data: messages } = await client
        .from('chat_conversations')
        .select('role, content')
        .eq('organization_id', organizationId)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      return (messages || []).reverse().map((msg: any) => ({
        role: msg.role,
        content: msg.content,
      }));
    } catch (error) {
      this.logger.warn(`Failed to load conversation history: ${error.message}`);
      return [];
    }
  }

  async getConversationHistory(
    userId: string,
    organizationId: string,
    limit = 10,
  ) {
    await this.verifyOrganizationAccess(userId, organizationId);

    const client = this.databaseService.getAdminClient();

    // Get total count
    const { count } = await client
      .from('chat_conversations')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('user_id', userId);

    // Get messages with pagination
    const { data: messages } = await client
      .from('chat_conversations')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(limit);

    return {
      messages: (messages || []).map((msg: any) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        timestamp: msg.created_at,
        metadata: msg.metadata,
      })),
      total: count || 0,
    };
  }

  async clearConversationHistory(userId: string, organizationId: string) {
    await this.verifyOrganizationAccess(userId, organizationId);

    const client = this.databaseService.getAdminClient();

    const { error } = await client
      .from('chat_conversations')
      .delete()
      .eq('organization_id', organizationId)
      .eq('user_id', userId);

    if (error) {
      this.logger.error(`Failed to clear chat history: ${error.message}`);
      throw new BadRequestException(`Failed to clear chat history: ${error.message}`);
    }

    return {
      success: true,
    };
  }
}
