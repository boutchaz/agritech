import {
  Injectable,
  Logger,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../database/database.service';
import { ZaiProvider } from './providers/zai.provider';
import { ZaiTTSProvider, TTSRequest } from './providers/zai-tts.provider';
import { WeatherProvider, WeatherForecast } from './providers/weather.provider';
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
  farms_recent: Array<{ id: string; name: string; area: number; location?: string }>;
  farms_has_more: boolean;
  parcels_count: number;
  parcels_recent: Array<{
    id: string;
    name: string;
    area: string;
    crop: string;
    farm_id: string;
    soil_type?: string;
    irrigation_type?: string;
  }>;
  parcels_has_more: boolean;
  crop_cycles_count: number;
  active_crop_cycles: number;
  crop_cycles_recent: Array<{
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
  crop_cycles_has_more: boolean;
  structures_count: number;
  structures_recent: Array<{ id: string; name: string; type: string }>;
  structures_has_more: boolean;
}

interface WorkerContext {
  workers_count: number;
  active_workers_count: number;
  workers_recent: Array<{ id: string; name: string; type: string; farm_id?: string }>;
  workers_has_more: boolean;
  pending_tasks_count: number;
  tasks_recent: Array<{ id: string; title: string; status: string; type: string }>;
  tasks_has_more: boolean;
  recent_work_records_count: number;
  work_records_recent: Array<{ id: string; work_date: string; amount_paid: number; status: string }>;
  work_records_has_more: boolean;
}

interface AccountingContext {
  accounts_count: number;
  accounts_recent: Array<{ id: string; name: string; type: string; balance: number }>;
  accounts_has_more: boolean;
  recent_invoices_count: number;
  invoices_recent: Array<{
    number: string;
    type: string;
    status: string;
    total: number;
    date: string;
  }>;
  invoices_has_more: boolean;
  recent_payments_count: number;
  payments_recent: Array<{
    date: string;
    amount: number;
    method: string;
    status: string;
  }>;
  payments_has_more: boolean;
  current_fiscal_year: { name: string; start_date: string; end_date: string } | null;
  total_revenue_30d?: number;
  total_expenses_30d?: number;
}

interface InventoryContext {
  items_count: number;
  items_recent: Array<{
    id: string;
    name: string;
    code: string;
    stock: number;
    unit: string;
    minimum_stock_level?: number;
    is_low_stock: boolean;
    total_value?: number;
  }>;
  items_has_more: boolean;
  warehouses_count: number;
  warehouses_recent: Array<{ id: string; name: string; location: string; farm_name?: string }>;
  warehouses_has_more: boolean;
  recent_stock_movements_count: number;
  low_stock_count: number;
  low_stock_items_recent: Array<{
    name: string;
    code: string;
    current_stock: number;
    minimum_level: number;
    unit: string;
    shortage: number;
  }>;
  low_stock_items_has_more: boolean;
  total_inventory_value: number;
}

interface ProductionContext {
  recent_harvests_count: number;
  harvests_recent: Array<{
    date: string;
    crop: string;
    quantity: string;
    quality: string;
    status: string;
    lot_number?: string;
    parcel_name?: string;
  }>;
  harvests_has_more: boolean;
  recent_quality_checks_count: number;
  recent_deliveries_count: number;
}

interface SupplierCustomerContext {
  suppliers_count: number;
  suppliers_recent: Array<{ id: string; name: string; type: string }>;
  suppliers_has_more: boolean;
  customers_count: number;
  customers_recent: Array<{ id: string; name: string; type: string }>;
  customers_has_more: boolean;
  pending_sales_orders_count: number;
  sales_orders_recent: Array<{
    number: string;
    date: string;
    total: number;
    status: string;
  }>;
  sales_orders_has_more: boolean;
  pending_purchase_orders_count: number;
  purchase_orders_recent: Array<{
    number: string;
    date: string;
    total: number;
    status: string;
  }>;
  purchase_orders_has_more: boolean;
}

interface CampaignsContext {
  campaigns_count: number;
  active_campaigns_count: number;
  planned_campaigns_count: number;
  campaigns_recent: Array<{
    id: string;
    name: string;
    type: string;
    status: string;
    start_date: string;
    end_date?: string;
    priority: string;
  }>;
  campaigns_has_more: boolean;
}

interface ReceptionBatchesContext {
  batches_count: number;
  recent_batches: Array<{
    id: string;
    batch_code: string;
    reception_date: string;
    weight: number;
    weight_unit: string;
    status: string;
    quality_grade?: string;
    parcel_name?: string;
    warehouse_name?: string;
  }>;
  batches_has_more: boolean;
}

interface ComplianceContext {
  certifications_count: number;
  active_certifications_count: number;
  expiring_certifications_count: number;
  non_compliant_checks_count: number;
  checks_count: number;
  certifications_recent: Array<{
    id: string;
    certification_type: string;
    status: string;
    expiry_date?: string;
  }>;
  certifications_has_more: boolean;
  recent_checks: Array<{
    id: string;
    check_type: string;
    check_date: string;
    status: string;
    score?: number;
    certification_type?: string;
  }>;
  checks_has_more: boolean;
}

interface UtilitiesContext {
  utilities_count: number;
  pending_utilities_count: number;
  utilities_recent: Array<{
    id: string;
    type: string;
    provider?: string;
    amount: number;
    billing_date: string;
    due_date?: string;
    payment_status: string;
    farm_name?: string;
    parcel_name?: string;
  }>;
  utilities_has_more: boolean;
}

interface ReportsContext {
  reports_count: number;
  pending_reports_count: number;
  failed_reports_count: number;
  reports_recent: Array<{
    id: string;
    title: string;
    template_id: string;
    status: string;
    generated_at: string;
    parcel_name?: string;
  }>;
  reports_has_more: boolean;
}

interface MarketplaceContext {
  listings_count: number;
  active_listings_count: number;
  orders_count: number;
  pending_orders_count: number;
  quote_requests_count: number;
  listings_recent: Array<{
    id: string;
    title: string;
    status: string;
    price: number;
    currency: string;
    quantity_available: number;
  }>;
  listings_has_more: boolean;
  orders_recent: Array<{
    id: string;
    status: string;
    total_amount: number;
    currency: string;
    role: 'buyer' | 'seller';
    created_at: string;
  }>;
  orders_has_more: boolean;
  quote_requests_recent: Array<{
    id: string;
    product_title: string;
    status: string;
    role: 'requester' | 'seller';
    created_at: string;
  }>;
  quote_requests_has_more: boolean;
}

interface OrchardContext {
  orchard_assets_count: number;
  tree_categories_count: number;
  trees_count: number;
  pruning_tasks_count: number;
  orchard_assets_recent: Array<{
    id: string;
    name: string;
    category: string;
    status: string;
    quantity?: number;
    area_ha?: number;
    farm_id?: string;
  }>;
  orchard_assets_has_more: boolean;
  pruning_tasks_recent: Array<{
    id: string;
    title: string;
    status: string;
    due_date?: string;
  }>;
  pruning_tasks_has_more: boolean;
}

interface SettingsContext {
  subscription: {
    plan_type: string | null;
    formula: string | null;
    status: string;
    max_users: number | null;
    max_farms: number | null;
    max_parcels: number | null;
    contract_end_at: string | null;
  } | null;
  organization_users: Array<{
    name: string;
    email: string;
    role: string;
    is_active: boolean;
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
  campaigns?: CampaignsContext | null;
  receptionBatches?: ReceptionBatchesContext | null;
  compliance?: ComplianceContext | null;
  utilities?: UtilitiesContext | null;
  reports?: ReportsContext | null;
  marketplace?: MarketplaceContext | null;
  orchards?: OrchardContext | null;
  satelliteWeather?: SatelliteWeatherContext | null;
  soilAnalysis?: SoilAnalysisContext | null;
  productionIntelligence?: ProductionIntelligenceContext | null;
  settings?: SettingsContext | null;
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
  campaigns: boolean;
  reception: boolean;
  compliance: boolean;
  utilities: boolean;
  reports: boolean;
  marketplace: boolean;
  orchards: boolean;
  satellite: boolean;
  weather: boolean;
  soil: boolean;
  alerts: boolean;
  forecast: boolean;
  settings: boolean;
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
  weather_forecast: {
    parcels: Array<{
      parcel_id: string;
      parcel_name: string;
      forecasts: WeatherForecast[];
    }>;
    available: boolean;
  };
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

interface CachedContext {
  data: unknown;
  timestamp: number;
}

interface CachedResponse {
  response: string;
  metadata: {
    provider: string;
    model: string;
    tokensUsed: number;
  };
  timestamp: number;
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private readonly zaiProvider: ZaiProvider;
  private readonly zaiTTSProvider: ZaiTTSProvider;
  private readonly moduleCache = new Map<string, CachedContext>();
  private readonly responseCache = new Map<string, CachedResponse>();
  private readonly RESPONSE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds
  private readonly SUMMARY_LIMIT = 3;
  private readonly MODULE_CACHE_TTLS = {
    organization: 30 * 60 * 1000,
    farms: 30 * 60 * 1000,
    workers: 10 * 60 * 1000,
    accounting: 5 * 60 * 1000,
    inventory: 5 * 60 * 1000,
    production: 5 * 60 * 1000,
    supplierCustomer: 10 * 60 * 1000,
    campaigns: 30 * 60 * 1000,
    receptionBatches: 5 * 60 * 1000,
    compliance: 30 * 60 * 1000,
    utilities: 10 * 60 * 1000,
    reports: 10 * 60 * 1000,
    marketplace: 5 * 60 * 1000,
    orchards: 30 * 60 * 1000,
    satelliteWeather: 60 * 60 * 1000,
    soilAnalysis: 60 * 60 * 1000,
    productionIntelligence: 5 * 60 * 1000,
    settings: 30 * 60 * 1000,
  };

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly configService: ConfigService,
    private readonly ttsProvider: ZaiTTSProvider,
    private readonly weatherProvider: WeatherProvider,
  ) {
    this.zaiProvider = new ZaiProvider(configService);
    this.zaiTTSProvider = ttsProvider;
  }

  private async getCachedModule<T>(
    cacheKey: string,
    ttl: number,
    fetcher: () => Promise<T>,
  ): Promise<T> {
    const cached = this.moduleCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < ttl) {
      return cached.data as T;
    }

    const data = await fetcher();
    this.moduleCache.set(cacheKey, { data, timestamp: Date.now() });
    return data;
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

    // Load conversation history (last 10 messages for better context retention)
    // 10 messages provides optimal balance between context awareness and token efficiency
    // Allows AI to maintain conversation continuity across multi-turn interactions
    const shouldSaveHistory = dto.save_history !== false;
    const recentMessages = shouldSaveHistory
      ? await this.getRecentConversationHistory(userId, organizationId, 10)
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

    // Check response cache before generating
    const cacheKey = `${organizationId}:${dto.query.toLowerCase().trim()}`;
    const cached = this.responseCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.RESPONSE_CACHE_TTL) {
      this.logger.log(`Response cache HIT for query: "${dto.query}"`);

      // Still save to history (user expects to see it)
      if (shouldSaveHistory) {
        await this.saveMessage(userId, organizationId, 'assistant', cached.response, dto.language, cached.metadata);
      }

      return {
        response: cached.response,
        context_summary: this.summarizeContext(context),
        metadata: {
          ...cached.metadata,
          timestamp: new Date(),
        },
      };
    }

    this.logger.log(`Response cache MISS for query: "${dto.query}"`);

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

      // Cache successful response
      this.responseCache.set(cacheKey, {
        response: response.content,
        metadata: {
          provider: 'zai',
          model: response.model,
          tokensUsed: response.tokensUsed,
        },
        timestamp: Date.now(),
      });

      // Calculate and log cost
      const tokensUsed = response.tokensUsed || 0;
      const costPerToken = 0.00001; // $0.01 per 1000 tokens (Z.ai GLM-4.5-Flash pricing)
      const estimatedCost = tokensUsed * costPerToken;

      this.logger.log(
        `Chat cost: ${tokensUsed} tokens, ~$${estimatedCost.toFixed(4)} ` +
        `(org: ${organizationId}, user: ${userId}, model: ${response.model})`
      );

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
      
      // Provide more helpful error messages
      let errorMessage = error.message || 'Failed to generate response';
      
      if (error.message?.includes('Z.ai API key') || error.message?.includes('not configured')) {
        errorMessage = 'AI service is not properly configured. Please contact support.';
      } else if (error.message?.includes('timeout') || error.message?.includes('ETIMEDOUT')) {
        errorMessage = 'The AI service took too long to respond. Please try again.';
      } else if (error.message?.includes('ECONNREFUSED') || error.message?.includes('ENOTFOUND')) {
        errorMessage = 'Unable to connect to the AI service. Please check your network connection.';
      }
      
      throw new BadRequestException(errorMessage);
    }
  }

  async sendMessageStream(
    userId: string,
    organizationId: string,
    dto: SendMessageDto,
    callbacks: {
      onToken: (token: string) => void;
      onComplete: (metadata: any) => void;
      onError: (error: Error) => void;
    },
  ): Promise<void> {
    await this.verifyOrganizationAccess(userId, organizationId);

    this.logger.log(`Building context for streaming chat request in org ${organizationId}`);

    const shouldSaveHistory = dto.save_history !== false;
    const recentMessages = shouldSaveHistory
      ? await this.getRecentConversationHistory(userId, organizationId, 10)
      : [];

    const context = await this.buildOrganizationContext(organizationId, dto.query);
    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt(
      dto.query,
      context,
      dto.language || 'en',
      recentMessages,
    );

    const apiKey = this.configService.get<string>('ZAI_API_KEY', '');
    this.zaiProvider.setApiKey(apiKey);

    if (shouldSaveHistory) {
      await this.saveMessage(userId, organizationId, 'user', dto.query, dto.language);
    }

    let fullResponse = '';

    await this.zaiProvider.generateStream({
      systemPrompt,
      userPrompt,
      config: {
        provider: 'zai' as any,
        model: 'GLM-4.5-Flash',
        temperature: 0.7,
        maxTokens: 8192,
      },
      onToken: (token: string) => {
        fullResponse += token;
        callbacks.onToken(token);
      },
      onComplete: async () => {
        if (shouldSaveHistory) {
          await this.saveMessage(userId, organizationId, 'assistant', fullResponse, dto.language, {
            provider: 'zai',
            model: 'GLM-4.5-Flash',
            streamed: true,
          });
        }
        callbacks.onComplete({
          provider: 'zai',
          model: 'GLM-4.5-Flash',
          timestamp: new Date(),
        });
      },
      onError: (error: Error) => {
        this.logger.error(`Stream generation failed: ${error.message}`, error.stack);
        callbacks.onError(error);
      },
    });
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
    return this.buildOrganizationContextUncached(organizationId, query);
   }

    private async buildOrganizationContextUncached(
      organizationId: string,
      query: string,
    ): Promise<BuiltContext> {
      const client = this.databaseService.getAdminClient();

      // Analyze query using simple keyword-based routing (no AI call - performance optimization)
      // Eliminates 1 AI call per message, reducing latency by 1-2 seconds
      const contextNeeds = this.analyzeQueryContextSimple(query);

     // Get current date and season
     const now = new Date();
     const currentDate = now.toISOString().split('T')[0];
     const month = now.getMonth() + 1;
     const currentSeason = 
       month >= 3 && month <= 5 ? 'spring' :
       month >= 6 && month <= 8 ? 'summer' :
       month >= 9 && month <= 11 ? 'autumn' : 'winter';

     // Build all context in parallel
     // CRITICAL: Always load farm and worker context for basic queries like "list farms" or "list workers"
     // The AI routing might miss these, so we ensure they're always available
     const [
       organizationContext,
       farmContext,
       workerContext,
       accountingContext,
       inventoryContext,
       productionContext,
       supplierCustomerContext,
       campaignsContext,
       receptionBatchesContext,
       complianceContext,
       utilitiesContext,
       reportsContext,
       marketplaceContext,
       orchardsContext,
       satelliteWeatherContext,
       soilAnalysisContext,
       productionIntelligenceContext,
       settingsContext,
     ] = await Promise.all([
       this.getCachedModule(
         `${organizationId}:organization`,
         this.MODULE_CACHE_TTLS.organization,
         () => this.getOrganizationContext(client, organizationId),
       ),
       // Always load farm context - it's needed for basic queries
       this.getCachedModule(
         `${organizationId}:farms`,
         this.MODULE_CACHE_TTLS.farms,
         () => this.getFarmContext(client, organizationId),
       ).catch(err => {
         this.logger.error(`Failed to load farm context: ${err.message}`, err.stack);
         return null;
       }),
       // Always load worker context - it's needed for basic queries
       this.getCachedModule(
         `${organizationId}:workers`,
         this.MODULE_CACHE_TTLS.workers,
         () => this.getWorkerContext(client, organizationId),
       ).catch(err => {
         this.logger.error(`Failed to load worker context: ${err.message}`, err.stack);
         return null;
       }),
       contextNeeds.accounting
         ? this.getCachedModule(
             `${organizationId}:accounting`,
             this.MODULE_CACHE_TTLS.accounting,
             () => this.getAccountingContext(client, organizationId),
           ).catch(err => {
             this.logger.warn(`Failed to load accounting context: ${err.message}`);
             return null;
           })
         : Promise.resolve(null),
       contextNeeds.inventory
         ? this.getCachedModule(
             `${organizationId}:inventory`,
             this.MODULE_CACHE_TTLS.inventory,
             () => this.getInventoryContext(client, organizationId),
           ).catch(err => {
             this.logger.warn(`Failed to load inventory context: ${err.message}`);
             return null;
           })
         : Promise.resolve(null),
       contextNeeds.production
         ? this.getCachedModule(
             `${organizationId}:production`,
             this.MODULE_CACHE_TTLS.production,
             () => this.getProductionContext(client, organizationId),
           ).catch(err => {
             this.logger.warn(`Failed to load production context: ${err.message}`);
             return null;
           })
         : Promise.resolve(null),
       contextNeeds.supplierCustomer
         ? this.getCachedModule(
             `${organizationId}:supplierCustomer`,
             this.MODULE_CACHE_TTLS.supplierCustomer,
             () => this.getSupplierCustomerContext(client, organizationId),
           ).catch(err => {
             this.logger.warn(`Failed to load supplier/customer context: ${err.message}`);
             return null;
           })
         : Promise.resolve(null),
       contextNeeds.campaigns
         ? this.getCachedModule(
             `${organizationId}:campaigns`,
             this.MODULE_CACHE_TTLS.campaigns,
             () => this.getCampaignsContext(client, organizationId),
           ).catch(err => {
             this.logger.warn(`Failed to load campaigns context: ${err.message}`);
             return null;
           })
         : Promise.resolve(null),
       contextNeeds.reception
         ? this.getCachedModule(
             `${organizationId}:receptionBatches`,
             this.MODULE_CACHE_TTLS.receptionBatches,
             () => this.getReceptionBatchesContext(client, organizationId),
           ).catch(err => {
             this.logger.warn(`Failed to load reception batches context: ${err.message}`);
             return null;
           })
         : Promise.resolve(null),
       contextNeeds.compliance
         ? this.getCachedModule(
             `${organizationId}:compliance`,
             this.MODULE_CACHE_TTLS.compliance,
             () => this.getComplianceContext(client, organizationId),
           ).catch(err => {
             this.logger.warn(`Failed to load compliance context: ${err.message}`);
             return null;
           })
         : Promise.resolve(null),
       contextNeeds.utilities
         ? this.getCachedModule(
             `${organizationId}:utilities`,
             this.MODULE_CACHE_TTLS.utilities,
             () => this.getUtilitiesContext(client, organizationId),
           ).catch(err => {
             this.logger.warn(`Failed to load utilities context: ${err.message}`);
             return null;
           })
         : Promise.resolve(null),
       contextNeeds.reports
         ? this.getCachedModule(
             `${organizationId}:reports`,
             this.MODULE_CACHE_TTLS.reports,
             () => this.getReportsContext(client, organizationId),
           ).catch(err => {
             this.logger.warn(`Failed to load reports context: ${err.message}`);
             return null;
           })
         : Promise.resolve(null),
       contextNeeds.marketplace
         ? this.getCachedModule(
             `${organizationId}:marketplace`,
             this.MODULE_CACHE_TTLS.marketplace,
             () => this.getMarketplaceContext(client, organizationId),
           ).catch(err => {
             this.logger.warn(`Failed to load marketplace context: ${err.message}`);
             return null;
           })
         : Promise.resolve(null),
       contextNeeds.orchards
         ? this.getCachedModule(
             `${organizationId}:orchards`,
             this.MODULE_CACHE_TTLS.orchards,
             () => this.getOrchardContext(client, organizationId),
           ).catch(err => {
             this.logger.warn(`Failed to load orchards context: ${err.message}`);
             return null;
           })
         : Promise.resolve(null),
       (contextNeeds.satellite || contextNeeds.weather)
         ? this.getCachedModule(
             `${organizationId}:satelliteWeather`,
             this.MODULE_CACHE_TTLS.satelliteWeather,
             () => this.getSatelliteWeatherContext(client, organizationId),
           ).catch(err => {
             this.logger.warn(`Failed to load satellite/weather context: ${err.message}`);
             return null;
           })
         : Promise.resolve(null),
       contextNeeds.soil
         ? this.getCachedModule(
             `${organizationId}:soilAnalysis`,
             this.MODULE_CACHE_TTLS.soilAnalysis,
             () => this.getSoilAnalysisContext(client, organizationId),
           ).catch(err => {
             this.logger.warn(`Failed to load soil analysis context: ${err.message}`);
             return null;
           })
         : Promise.resolve(null),
       (contextNeeds.alerts || contextNeeds.forecast)
         ? this.getCachedModule(
             `${organizationId}:productionIntelligence`,
             this.MODULE_CACHE_TTLS.productionIntelligence,
             () => this.getProductionIntelligenceContext(client, organizationId),
           ).catch(err => {
             this.logger.warn(`Failed to load production intelligence context: ${err.message}`);
             return null;
           })
         : Promise.resolve(null),
       contextNeeds.settings
         ? this.getCachedModule(
             `${organizationId}:settings`,
             this.MODULE_CACHE_TTLS.settings,
             () => this.getSettingsContext(client, organizationId),
           ).catch(err => {
             this.logger.warn(`Failed to load settings context: ${err.message}`);
             return null;
           })
         : Promise.resolve(null),
     ]);

     // Log what was loaded for debugging
     this.logger.log(`Context loaded - Farms: ${farmContext?.farms_count || 0}, Workers: ${workerContext?.active_workers_count || 0}, Parcels: ${farmContext?.parcels_count || 0}`);

     return {
       organization: organizationContext,
       farms: farmContext,
       workers: workerContext,
       accounting: accountingContext,
       inventory: inventoryContext,
       production: productionContext,
       suppliersCustomers: supplierCustomerContext,
       campaigns: campaignsContext,
       receptionBatches: receptionBatchesContext,
       compliance: complianceContext,
       utilities: utilitiesContext,
       reports: reportsContext,
       marketplace: marketplaceContext,
       orchards: orchardsContext,
       satelliteWeather: satelliteWeatherContext,
       soilAnalysis: soilAnalysisContext,
       productionIntelligence: productionIntelligenceContext,
       settings: settingsContext,
       currentDate,
       currentSeason,
     };
   }

   /**
    * Analyze query context using simple keyword-based routing
    * Fast, deterministic, no AI calls - replaces analyzeQueryContextWithAI
    * Supports multilingual keywords (English, French, Arabic)
    * Farm and worker contexts are ALWAYS loaded (most common queries)
    */
   private analyzeQueryContextSimple(query: string): ContextNeeds {
     const lowerQuery = query.toLowerCase();
     
    const contextNeeds: ContextNeeds = {
      farm: true, // Always load - most queries need this
      worker: true, // Always load - most queries need this
      accounting: /invoice|payment|expense|revenue|profit|cost|fiscal|tax|accounting|financial|budget|journal|account|total|spend|how much|facture|paiement|dépense|revenu|coût|comptabilité|financier|combien|total des|فاتورة|دفعة|مصروف|إيراد|تكلفة|محاسبة|مالي|كم|إجمالي/.test(lowerQuery),
      inventory: /stock|inventory|warehouse|item|product|material|reception|supply|inventaire|entrepôt|article|produit|matériel|approvisionnement|مخزون|مستودع|منتج|مادة/.test(lowerQuery),
      production: /harvest|yield|production|quality|delivery|crop cycle|récolte|rendement|contrôle qualité|livraison|cycle de culture|حصاد|محصول|إنتاج|مراقبة الجودة|تسليم/.test(lowerQuery),
      supplierCustomer: /supplier|customer|vendor|client|order|quote|purchase|sale|fournisseur|client|commande|devis|achat|vente|مورد|عميل|طلب|عرض أسعار|شراء|بيع/.test(lowerQuery),
      campaigns: /campaign|campagne|campagnes|project|initiative|حملة/.test(lowerQuery),
      reception: /reception|batch|lot|reception batch|lotissement|réception|دفعة|استلام/.test(lowerQuery),
      compliance: /compliance|certification|audit|non[- ]compliant|conformité|certificat|audit|امتثال|شهادة/.test(lowerQuery),
      utilities: /utility|utilities|bill|electric|water|fuel|gas|utility bill|facture|électricité|eau|gaz|فاتورة/.test(lowerQuery),
      reports: /report|reports|analytics|dashboard report|rapport|statistique|تحليل|تقارير/.test(lowerQuery),
      marketplace: /marketplace|listing|quote request|market|order marketplace|marché|annonce|demande de devis|سوق|عرض/.test(lowerQuery),
      orchards: /orchard|orchards|tree|trees|fruit tree|pruning|taille|arbor|verger|أشجار|بستان/.test(lowerQuery),
      satellite: /satellite|ndvi|ndmi|ndre|gci|savi|vegetation|remote sensing|imagery|indice de végétation|télédétection|imagerie|قمر صناعي|مؤشر الغطاء النباتي|الاستشعار عن بعد/.test(lowerQuery),
      weather: /weather|forecast|temperature|rain|precipitation|climate|frost|storm|humidity|wind|météo|prévision|température|pluie|climat|gel|tempête|humidité|vent|طقس|توقعات|درجة الحرارة|مطر|مناخ|صقيع|عاصفة|رطوبة|رياح/.test(lowerQuery),
      soil: /soil|nutrient|fertilizer|ph|organic matter|texture|soil analysis|sol|nutriment|engrais|matière organique|analyse du sol|تربة|مغذيات|سماد|مادة عضوية|تحليل التربة/.test(lowerQuery),
      alerts: /alert|warning|problem|issue|underperforming|critical|deviation|alerte|avertissement|problème|critique|déviation|تنبيه|تحذير|مشكلة|حرج|انحراف/.test(lowerQuery),
      forecast: /forecast|prediction|expected|upcoming|yield forecast|benchmark|prévision|prédiction|attendu|à venir|référence|توقعات|تنبؤ|متوقع|قادم|معيار/.test(lowerQuery),
      settings: /settings|plan|subscription|admin|role|user|member|permission|paramètre|abonnement|administrateur|rôle|utilisateur|permission|إعدادات|اشتراك|مسؤول|دور|مستخدم|صلاحية/.test(lowerQuery),
    };

    // Check if any specific module was matched (excluding always-loaded farm/worker)
    const specificModulesMatched = [
      contextNeeds.accounting, contextNeeds.inventory, contextNeeds.production,
      contextNeeds.supplierCustomer, contextNeeds.campaigns, contextNeeds.reception,
      contextNeeds.compliance, contextNeeds.utilities, contextNeeds.reports,
      contextNeeds.marketplace, contextNeeds.orchards, contextNeeds.satellite,
      contextNeeds.weather, contextNeeds.soil, contextNeeds.alerts, contextNeeds.forecast,
      contextNeeds.settings,
    ].some(Boolean);

    // General/overview queries that should load ALL key contexts
    const isGeneralQuery = /overview|summary|dashboard|help|status|what should i do|how.+doing|everything|all|résumé|vue d'ensemble|aide|tableau de bord|comment ça va|tout|ملخص|نظرة عامة|مساعدة|لوحة القيادة|كل شيء|good morning|bonjour|صباح الخير|today|aujourd'hui|اليوم/.test(lowerQuery);

    if (!specificModulesMatched || isGeneralQuery) {
      contextNeeds.accounting = true;
      contextNeeds.inventory = true;
      contextNeeds.production = true;
      contextNeeds.campaigns = true;
      contextNeeds.compliance = true;
      contextNeeds.weather = true;
      contextNeeds.alerts = true;
      contextNeeds.forecast = true;
      contextNeeds.settings = true;
    }

     // Log routing decision for debugging
     this.logger.log(
      `Context routing (keyword-based): farm=${contextNeeds.farm}, worker=${contextNeeds.worker}, ` +
      `accounting=${contextNeeds.accounting}, inventory=${contextNeeds.inventory}, ` +
      `production=${contextNeeds.production}, supplierCustomer=${contextNeeds.supplierCustomer}, ` +
      `campaigns=${contextNeeds.campaigns}, reception=${contextNeeds.reception}, ` +
      `compliance=${contextNeeds.compliance}, utilities=${contextNeeds.utilities}, ` +
      `reports=${contextNeeds.reports}, marketplace=${contextNeeds.marketplace}, ` +
      `orchards=${contextNeeds.orchards}, satellite=${contextNeeds.satellite}, ` +
      `weather=${contextNeeds.weather}, soil=${contextNeeds.soil}, ` +
      `alerts=${contextNeeds.alerts}, forecast=${contextNeeds.forecast}, ` +
      `settings=${contextNeeds.settings}, isGeneral=${isGeneralQuery}`
    );

     return contextNeeds;
   }

   /**
    * [DEPRECATED] Analyze query context using AI to understand intent and route to correct agents/modules
    * This method is kept for reference but is NO LONGER USED
    * Replaced by analyzeQueryContextSimple() for performance (eliminates 1 AI call per message)
    * Supports all languages (Arabic, French, English, etc.)
    */
   private async analyzeQueryContextWithAI(
     query: string,
   ): Promise<ContextNeeds> {
    try {
      const systemPrompt = `You are an intelligent query router for an agricultural management system. 
Your task is to analyze the user's query (which may be in ANY language: English, French, Arabic, etc.) and determine which data modules/agents need to be activated to answer the query.

Think of this as routing the query to specialized agents. Each agent has access to specific data:

AVAILABLE AGENTS/MODULES:

1. **farm**: Farms, parcels, crops, fields, irrigation systems, structures, land, agricultural properties
   - Keywords (EN): farm, farms, parcel, parcels, crop, crops, field, fields, land, irrigation, structure, structures, agricultural property
   - Keywords (FR): ferme, fermes, parcelle, parcelles, culture, cultures, champ, champs, terrain, irrigation, structure
   - Keywords (AR): مزرعة, مزارع, قطعة, قطع, محصول, محاصيل, حقل, حقول, أرض, ري, هيكل
   - Examples: "How many farms?", "كم عدد المزارع", "Combien de fermes", "What crops are planted?", "Show me my parcels"

2. **worker**: Workers, employees, tasks, labor, wages, salaries, workforce, staff, day laborers, piece work
   - Keywords (EN): worker, workers, employee, employees, staff, labor, labour, task, tasks, wage, wages, salary, salaries, workforce, hiring, worker management
   - Keywords (FR): travailleur, travailleurs, employé, employés, personnel, main-d'œuvre, tâche, tâches, salaire, salaires, embauche
   - Keywords (AR): عامل, عمال, موظف, موظفون, موظفين, مهمة, مهام, راتب, رواتب, أجور
   - Examples: "How many workers?", "List my employees", "Show worker tasks", "What are the wages?"

3. **accounting**: Invoices, payments, expenses, revenue, profit, cost, fiscal year, taxes, financial records, chart of accounts, journal entries
   - Keywords (EN): invoice, invoices, payment, payments, expense, expenses, revenue, profit, cost, costs, fiscal, tax, taxes, accounting, financial, budget, journal, account
   - Keywords (FR): facture, factures, paiement, paiements, dépense, dépenses, revenu, profit, coût, coûts, fiscal, taxe, taxes, comptabilité, financier, budget, journal
   - Keywords (AR): فاتورة, فواتير, دفعة, دفعات, مصروف, مصروفات, إيراد, ربح, تكلفة, تكاليف, ضريبة, ضرائب, محاسبة, مالي, ميزانية
   - Examples: "Show invoices", "What are my expenses?", "Revenue this month", "Tax payments"

4. **inventory**: Stock, warehouse, items, products, materials, reception, supplies, inventory management, stock entries
   - Keywords (EN): stock, inventory, warehouse, warehouses, item, items, product, products, material, materials, reception, supply, supplies, stock entry, stock entries
   - Keywords (FR): stock, inventaire, entrepôt, entrepôts, article, articles, produit, produits, matériel, réception, approvisionnement
   - Keywords (AR): مخزون, مستودع, مستودعات, عنصر, عناصر, منتج, منتجات, مادة, مواد, استقبال, إمداد
   - Examples: "What's in stock?", "Show inventory", "Warehouse items", "Stock levels"

5. **production**: Harvests, yields, quality control, deliveries, production data, crop cycles, harvest records
   - Keywords (EN): harvest, harvests, yield, yields, production, quality control, delivery, deliveries, crop cycle, crop cycles, harvest record
   - Keywords (FR): récolte, récoltes, rendement, rendements, production, contrôle qualité, livraison, livraisons, cycle de culture
   - Keywords (AR): حصاد, حصاد, محصول, محاصيل, إنتاج, مراقبة الجودة, تسليم, تسليمات, دورة المحاصيل
   - Examples: "Harvest records", "Production yield", "Quality control results", "Crop cycles"

6. **supplierCustomer**: Suppliers, customers, vendors, clients, orders, quotes, purchases, sales, sales orders
   - Keywords (EN): supplier, suppliers, customer, customers, vendor, vendors, client, clients, order, orders, quote, quotes, purchase, purchases, sale, sales
   - Keywords (FR): fournisseur, fournisseurs, client, clients, vendeur, vendeurs, commande, commandes, devis, achat, achats, vente, ventes
   - Keywords (AR): مورد, موردون, عميل, عملاء, بائع, بائعون, طلب, طلبات, عرض أسعار, شراء, مشتريات, بيع, مبيعات
   - Examples: "List suppliers", "Customer orders", "Sales this month", "Purchase orders"

7. **satellite**: Satellite imagery, NDVI, NDMI, NDRE, GCI, SAVI, vegetation indices, remote sensing, satellite analysis
   - Keywords (EN): satellite, NDVI, NDMI, NDRE, GCI, SAVI, vegetation index, indices, remote sensing, satellite imagery, satellite analysis
   - Keywords (FR): satellite, NDVI, NDMI, NDRE, GCI, SAVI, indice de végétation, télédétection, imagerie satellite
   - Keywords (AR): قمر صناعي, NDVI, NDMI, NDRE, مؤشر الغطاء النباتي, الاستشعار عن بعد, تحليل الأقمار الصناعية
   - Examples: "Show NDVI", "Satellite analysis", "Vegetation health", "Remote sensing data"

8. **weather**: Weather data, forecasts, temperature, rain, precipitation, climate, frost, storms, humidity, wind
   - Keywords (EN): weather, forecast, forecasts, temperature, rain, precipitation, climate, frost, storm, storms, humidity, wind, sunny, cloudy
   - Keywords (FR): météo, prévision, prévisions, température, pluie, précipitation, climat, gel, tempête, humidité, vent, ensoleillé, nuageux
   - Keywords (AR): طقس, توقعات, درجة الحرارة, مطر, هطول, مناخ, صقيع, عاصفة, رطوبة, رياح, مشمس, غائم
   - Examples: "Weather forecast", "What's the temperature?", "Rain tomorrow", "ما هو الطقس غدا؟"

9. **soil**: Soil analysis, nutrients, fertilizer, pH, organic matter, texture, soil quality, soil testing
   - Keywords (EN): soil, nutrient, nutrients, fertilizer, fertiliser, pH, organic matter, texture, soil analysis, soil quality, soil test
   - Keywords (FR): sol, nutriment, nutriments, engrais, pH, matière organique, texture, analyse du sol, qualité du sol
   - Keywords (AR): تربة, مغذيات, سماد, أسمدة, pH, مادة عضوية, قوام, تحليل التربة, جودة التربة
   - Examples: "Soil analysis", "Nutrient levels", "pH of soil", "Fertilizer needs"

10. **alerts**: Performance alerts, warnings, problems, issues, underperforming areas, critical situations, performance issues
    - Keywords (EN): alert, alerts, warning, warnings, problem, problems, issue, issues, underperforming, critical, deviation, performance issue
    - Keywords (FR): alerte, alertes, avertissement, avertissements, problème, problèmes, critique, déviation, problème de performance
    - Keywords (AR): تنبيه, تنبيهات, تحذير, تحذيرات, مشكلة, مشاكل, حرج, انحراف, مشكلة الأداء
    - Examples: "Show alerts", "Performance issues", "Critical problems", "Underperforming areas"

11. **forecast**: Yield forecasts, predictions, expected outcomes, upcoming events, benchmarks, yield predictions
    - Keywords (EN): forecast, forecasts, prediction, predictions, expected, upcoming, yield forecast, benchmark, benchmarks
    - Keywords (FR): prévision, prévisions, prédiction, prédictions, attendu, à venir, prévision de rendement, référence
    - Keywords (AR): توقعات, تنبؤ, تنبؤات, متوقع, قادم, توقعات المحصول, معيار
    - Examples: "Yield forecast", "Expected harvest", "Production predictions", "Benchmarks"

ROUTING INSTRUCTIONS:
- Understand the query's INTENT, not just keywords
- Consider context: "my farms" = farm agent, "my workers" = worker agent
- Support ALL languages: Arabic queries like "كم عدد المزارع" should route to farm agent
- Be intelligent: "will it rain tomorrow" needs weather agent, "show me invoices" needs accounting agent
- Route to multiple agents if the query needs data from multiple sources
- If unsure, err on the side of including more agents (better to have data than miss it)

Return ONLY a valid JSON object with boolean values for each agent.
Example: {"farm": true, "worker": false, "accounting": false, "inventory": false, "production": false, "supplierCustomer": false, "satellite": false, "weather": true, "soil": false, "alerts": false, "forecast": false}

Do not include any explanation, only the JSON object.`;

      const userPrompt = `Query: "${query}"

Determine which modules are relevant based on the query's intent and content. Return only valid JSON.`;

      // Use low temperature for consistent JSON output and limit tokens
      const response = await this.zaiProvider.generate({
        systemPrompt,
        userPrompt,
        config: {
          provider: 'zai' as any,
          model: 'GLM-4.5-Flash',
          temperature: 0.1,
          maxTokens: 200,
        },
      });

      // Parse JSON response
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        // Validate and return with defaults for missing fields
        return {
          farm: parsed.farm === true,
          worker: parsed.worker === true,
          accounting: parsed.accounting === true,
          inventory: parsed.inventory === true,
          production: parsed.production === true,
          supplierCustomer: parsed.supplierCustomer === true,
          campaigns: parsed.campaigns === true,
          reception: parsed.reception === true,
          compliance: parsed.compliance === true,
          utilities: parsed.utilities === true,
          reports: parsed.reports === true,
          marketplace: parsed.marketplace === true,
          orchards: parsed.orchards === true,
          satellite: parsed.satellite === true,
          weather: parsed.weather === true,
          soil: parsed.soil === true,
          alerts: parsed.alerts === true,
          forecast: parsed.forecast === true,
          settings: parsed.settings === true,
        };
      }

      // If JSON parsing fails, return default (all false) and log error
      this.logger.error('Failed to parse AI context analysis JSON. Response:', response.content);
      // Return minimal context - only organization (always loaded)
      return {
        farm: false,
        worker: false,
        accounting: false,
        inventory: false,
        production: false,
        supplierCustomer: false,
        campaigns: false,
        reception: false,
        compliance: false,
        utilities: false,
        reports: false,
        marketplace: false,
        orchards: false,
        satellite: false,
        weather: false,
        soil: false,
        alerts: false,
        forecast: false,
        settings: false,
      };
    } catch (error) {
      // On any error, log and return default (no regex fallback)
      this.logger.error(
        `AI context analysis failed: ${error.message}. Using default (no modules).`,
      );
      // Return minimal context - only organization (always loaded)
      return {
        farm: false,
        worker: false,
        accounting: false,
        inventory: false,
        production: false,
        supplierCustomer: false,
        campaigns: false,
        reception: false,
        compliance: false,
        utilities: false,
        reports: false,
        marketplace: false,
        orchards: false,
        satellite: false,
        weather: false,
        soil: false,
        alerts: false,
        forecast: false,
        settings: false,
      };
    }
  }

  private async getSettingsContext(
    client: any,
    organizationId: string,
  ): Promise<SettingsContext> {
    const [usersResult, subscriptionResult] = await Promise.all([
      client
        .from('organization_users')
        .select('user_id, role, is_active, profiles(first_name, last_name, email)')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .limit(20),
      client
        .from('subscriptions')
        .select('plan_type, formula, status, max_users, max_farms, max_parcels, contract_end_at')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    return {
      subscription: subscriptionResult.data
        ? {
            plan_type: subscriptionResult.data.plan_type,
            formula: subscriptionResult.data.formula,
            status: subscriptionResult.data.status,
            max_users: subscriptionResult.data.max_users,
            max_farms: subscriptionResult.data.max_farms,
            max_parcels: subscriptionResult.data.max_parcels,
            contract_end_at: subscriptionResult.data.contract_end_at,
          }
        : null,
      organization_users: (usersResult.data || []).map((u: any) => ({
        name: `${u.profiles?.first_name || ''} ${u.profiles?.last_name || ''}`.trim() || 'Unknown',
        email: u.profiles?.email || '',
        role: u.role,
        is_active: u.is_active,
      })),
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
    try {
      // Get farms summary
      const { data: farms, error: farmsError, count: farmsCount } = await client
        .from('farms')
        .select('id, name, location, size, size_unit, is_active, status, created_at', {
          count: 'exact',
        })
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(this.SUMMARY_LIMIT);
      
      if (farmsError) {
        this.logger.error(`Error fetching farms: ${farmsError.message}`);
      }

       // Get parcels summary with soil and irrigation info
       const { data: parcels, error: parcelsError, count: parcelsCount } = await client
         .from('parcels')
         .select('id, name, area, area_unit, crop_type, farm_id, soil_type, irrigation_type, created_at', {
           count: 'exact',
         })
         .eq('organization_id', organizationId)
         .order('created_at', { ascending: false })
         .limit(this.SUMMARY_LIMIT);
      
      if (parcelsError) {
        this.logger.error(`Error fetching parcels: ${parcelsError.message}`);
      }

       // Get crop cycles with detailed information
       const { data: cropCycles, error: cropCyclesError, count: cropCyclesCount } = await client
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
         `, { count: 'exact' })
         .eq('organization_id', organizationId)
         .order('planting_date', { ascending: false })
         .limit(this.SUMMARY_LIMIT);
      
      if (cropCyclesError) {
        this.logger.error(`Error fetching crop cycles: ${cropCyclesError.message}`);
      }

      const { count: activeCropCyclesCount, error: activeCropCyclesError } = await client
        .from('crop_cycles')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .in('status', ['active', 'planned']);

      if (activeCropCyclesError) {
        this.logger.error(`Error counting active crop cycles: ${activeCropCyclesError.message}`);
      }

       // Get structures summary
       const { data: structures, error: structuresError, count: structuresCount } = await client
         .from('structures')
         .select('id, name, type, created_at', { count: 'exact' })
         .eq('organization_id', organizationId)
         .order('created_at', { ascending: false })
         .limit(this.SUMMARY_LIMIT);
      
      if (structuresError) {
        this.logger.error(`Error fetching structures: ${structuresError.message}`);
      }

      const farmsTotal = farmsCount ?? farms?.length ?? 0;
      const parcelsTotal = parcelsCount ?? parcels?.length ?? 0;
      const cropCyclesTotal = cropCyclesCount ?? cropCycles?.length ?? 0;
      const structuresTotal = structuresCount ?? structures?.length ?? 0;

      this.logger.log(`Loaded farm context: ${farmsTotal} farms, ${parcelsTotal} parcels, ${cropCyclesTotal} crop cycles`);

      return {
        farms_count: farmsTotal,
        farms_recent:
          farms?.map((f: any) => ({
            id: f.id,
            name: f.name,
            area: f.size || 0,
            location: f.location,
          })) || [],
        farms_has_more: farmsTotal > (farms?.length || 0),
        parcels_count: parcelsTotal,
        parcels_recent:
          parcels?.map((p: any) => ({
            id: p.id,
            name: p.name,
            area: `${p.area} ${p.area_unit}`,
            crop: p.crop_type || 'N/A',
            farm_id: p.farm_id,
            soil_type: p.soil_type,
            irrigation_type: p.irrigation_type,
          })) || [],
        parcels_has_more: parcelsTotal > (parcels?.length || 0),
        crop_cycles_count: cropCyclesTotal,
        active_crop_cycles: activeCropCyclesCount ?? (cropCycles?.filter((cc: any) => cc.status === 'active' || cc.status === 'planned').length || 0),
        crop_cycles_recent:
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
        crop_cycles_has_more: cropCyclesTotal > (cropCycles?.length || 0),
        structures_count: structuresTotal,
        structures_recent:
          structures?.map((s: any) => ({
            id: s.id,
            name: s.name,
            type: s.type,
          })) || [],
        structures_has_more: structuresTotal > (structures?.length || 0),
      };
    } catch (error) {
      this.logger.error(`Error in getFarmContext: ${error.message}`, error.stack);
      // Return empty context instead of failing
      return {
        farms_count: 0,
        farms_recent: [],
        farms_has_more: false,
        parcels_count: 0,
        parcels_recent: [],
        parcels_has_more: false,
        crop_cycles_count: 0,
        active_crop_cycles: 0,
        crop_cycles_recent: [],
        crop_cycles_has_more: false,
        structures_count: 0,
        structures_recent: [],
        structures_has_more: false,
      };
    }
  }

  private async getWorkerContext(
    client: any,
    organizationId: string,
  ): Promise<WorkerContext> {
    try {
       // Get all workers, not just active ones (summary)
       const { data: workers, error: workersError, count: workersCount } = await client
         .from('workers')
         .select('id, first_name, last_name, worker_type, is_active, farm_id, created_at', {
           count: 'exact',
         })
         .eq('organization_id', organizationId)
         .order('created_at', { ascending: false })
         .limit(this.SUMMARY_LIMIT);
      
      if (workersError) {
        this.logger.error(`Error fetching workers: ${workersError.message}`);
      }

      const { count: activeWorkersCount, error: activeWorkersError } = await client
        .from('workers')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('is_active', true);

      if (activeWorkersError) {
        this.logger.error(`Error fetching active workers count: ${activeWorkersError.message}`);
      }

       const { data: tasks, error: tasksError, count: tasksCount } = await client
         .from('tasks')
         .select('id, title, status, task_type, priority, created_at', {
           count: 'exact',
         })
         .eq('organization_id', organizationId)
         .in('status', ['pending', 'assigned', 'in_progress'])
         .order('created_at', { ascending: false })
         .limit(this.SUMMARY_LIMIT);
      
      if (tasksError) {
        this.logger.error(`Error fetching tasks: ${tasksError.message}`);
      }

       const { data: workRecords, error: workRecordsError, count: workRecordsCount } = await client
         .from('work_records')
         .select('id, work_date, amount_paid, payment_status', { count: 'exact' })
         .eq('organization_id', organizationId)
         .gte(
           'work_date',
           new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
         )
         .order('work_date', { ascending: false })
         .limit(this.SUMMARY_LIMIT);
      
      if (workRecordsError) {
        this.logger.error(`Error fetching work records: ${workRecordsError.message}`);
      }

      const workersTotal = workersCount ?? workers?.length ?? 0;
      const tasksTotal = tasksCount ?? tasks?.length ?? 0;
      const workRecordsTotal = workRecordsCount ?? workRecords?.length ?? 0;

      this.logger.log(`Loaded worker context: ${workersTotal} workers, ${tasksTotal} tasks`);

      return {
        workers_count: workersTotal,
        active_workers_count: activeWorkersCount ?? (workers?.filter((w: any) => w.is_active).length || 0),
        workers_recent:
          workers?.map((w: any) => ({
            id: w.id,
            name: `${w.first_name} ${w.last_name}`,
            type: w.worker_type,
            farm_id: w.farm_id,
          })) || [],
        workers_has_more: workersTotal > (workers?.length || 0),
        pending_tasks_count: tasksTotal,
        tasks_recent:
          tasks?.map((t: any) => ({
            id: t.id,
            title: t.title,
            status: t.status,
            type: t.task_type,
          })) || [],
        tasks_has_more: tasksTotal > (tasks?.length || 0),
        recent_work_records_count: workRecordsTotal,
        work_records_recent:
          workRecords?.map((record: any) => ({
            id: record.id,
            work_date: record.work_date,
            amount_paid: record.amount_paid,
            status: record.payment_status,
          })) || [],
        work_records_has_more: workRecordsTotal > (workRecords?.length || 0),
      };
    } catch (error) {
      this.logger.error(`Error in getWorkerContext: ${error.message}`, error.stack);
      // Return empty context instead of failing
      return {
        workers_count: 0,
        active_workers_count: 0,
        workers_recent: [],
        workers_has_more: false,
        pending_tasks_count: 0,
        tasks_recent: [],
        tasks_has_more: false,
        recent_work_records_count: 0,
        work_records_recent: [],
        work_records_has_more: false,
      };
    }
  }

  private async getAccountingContext(
    client: any,
    organizationId: string,
  ): Promise<AccountingContext> {
    try {
       // Get chart of accounts summary
       const { data: accounts, error: accountsError, count: accountsCount } = await client
         .from('accounts')
         .select('id, name, account_type, created_at', { count: 'exact' })
         .eq('organization_id', organizationId)
         .order('created_at', { ascending: false })
         .limit(this.SUMMARY_LIMIT);
      
      if (accountsError) {
        this.logger.error(`Error fetching accounts: ${accountsError.message}`);
      }

       // Get recent invoices
       const { data: invoices, error: invoicesError, count: invoicesCount } = await client
         .from('invoices')
         .select(
           'id, invoice_number, invoice_type, status, grand_total, invoice_date',
           { count: 'exact' },
         )
         .eq('organization_id', organizationId)
         .gte(
           'invoice_date',
           new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
         )
         .order('invoice_date', { ascending: false })
         .limit(this.SUMMARY_LIMIT);
      
      if (invoicesError) {
        this.logger.error(`Error fetching invoices: ${invoicesError.message}`);
      }

       // Get recent payments
       const { data: payments, error: paymentsError, count: paymentsCount } = await client
         .from('accounting_payments')
         .select('id, payment_date, amount, payment_method, status', { count: 'exact' })
         .eq('organization_id', organizationId)
         .gte(
           'payment_date',
           new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
         )
         .order('payment_date', { ascending: false })
         .limit(this.SUMMARY_LIMIT);
      
      if (paymentsError) {
        this.logger.error(`Error fetching payments: ${paymentsError.message}`);
      }

      // Get fiscal year
      const { data: fiscalYear, error: fiscalYearError } = await client
        .from('fiscal_years')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_current', true)
        .maybeSingle();
      
      if (fiscalYearError) {
        this.logger.error(`Error fetching fiscal year: ${fiscalYearError.message}`);
      }

      // Get 30-day revenue/expense totals for aggregation
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data: recentInvoices } = await client
        .from('invoices')
        .select('invoice_type, grand_total, status')
        .eq('organization_id', organizationId)
        .neq('status', 'cancelled')
        .gte('invoice_date', thirtyDaysAgo);

      let totalRevenue30d = 0;
      let totalExpenses30d = 0;
      if (recentInvoices) {
        for (const inv of recentInvoices) {
          if (inv.invoice_type === 'sale') {
            totalRevenue30d += Number(inv.grand_total) || 0;
          } else if (inv.invoice_type === 'purchase') {
            totalExpenses30d += Number(inv.grand_total) || 0;
          }
        }
      }

      const accountsTotal = accountsCount ?? accounts?.length ?? 0;
      const invoicesTotal = invoicesCount ?? invoices?.length ?? 0;
      const paymentsTotal = paymentsCount ?? payments?.length ?? 0;

      this.logger.log(`Loaded accounting context: ${accountsTotal} accounts, ${invoicesTotal} invoices, ${paymentsTotal} payments, rev30d=${totalRevenue30d}, exp30d=${totalExpenses30d}`);

      return {
        accounts_count: accountsTotal,
        accounts_recent:
          accounts?.map((a: any) => ({
            id: a.id,
            name: a.name,
            type: a.account_type,
            balance: 0, // Balance is calculated, not stored
          })) || [],
        accounts_has_more: accountsTotal > (accounts?.length || 0),
        recent_invoices_count: invoicesTotal,
        invoices_recent:
          invoices?.map((i: any) => ({
            number: i.invoice_number,
            type: i.invoice_type,
            status: i.status,
            total: i.grand_total,
            date: i.invoice_date,
          })) || [],
        invoices_has_more: invoicesTotal > (invoices?.length || 0),
        recent_payments_count: paymentsTotal,
        payments_recent:
          payments?.map((p: any) => ({
            date: p.payment_date,
            amount: p.amount,
            method: p.payment_method,
            status: p.status,
          })) || [],
        payments_has_more: paymentsTotal > (payments?.length || 0),
        current_fiscal_year: fiscalYear
          ? {
              name: fiscalYear.name,
              start_date: fiscalYear.start_date,
              end_date: fiscalYear.end_date,
            }
          : null,
        total_revenue_30d: totalRevenue30d,
        total_expenses_30d: totalExpenses30d,
      };
    } catch (error) {
      this.logger.error(`Error in getAccountingContext: ${error.message}`, error.stack);
      return {
        accounts_count: 0,
        accounts_recent: [],
        accounts_has_more: false,
        recent_invoices_count: 0,
        invoices_recent: [],
        invoices_has_more: false,
        recent_payments_count: 0,
        payments_recent: [],
        payments_has_more: false,
        current_fiscal_year: null,
        total_revenue_30d: 0,
        total_expenses_30d: 0,
      };
    }
  }

  private async getInventoryContext(
    client: any,
    organizationId: string,
  ): Promise<InventoryContext> {
    try {
      // Get stock levels from stock_valuation view (actual stock quantities)
      // This is the same approach used by getFarmStockLevels in items.service.ts
      const { data: stockData, error: stockError } = await client
        .from('stock_valuation')
        .select(`
          item_id,
          warehouse_id,
          remaining_quantity,
          total_cost,
          warehouse:warehouses!inner(
            id,
            name,
            location,
            farm_id,
            farm:farms(id, name)
          ),
          item:items!inner(
            id,
            item_code,
            item_name,
            default_unit,
            minimum_stock_level,
            is_active
          )
        `)
        .eq('organization_id', organizationId)
        .gt('remaining_quantity', 0);

      if (stockError) {
        this.logger.error(`Error fetching stock valuation: ${stockError.message}`);
      }

      // Get all warehouses (including empty ones)
      const { data: warehouses, error: warehousesError } = await client
        .from('warehouses')
        .select(`
          id,
          name,
          location,
          farm_id,
          farm:farms(id, name)
        `)
        .eq('organization_id', organizationId)
        .eq('is_active', true);

      if (warehousesError) {
        this.logger.error(`Error fetching warehouses: ${warehousesError.message}`);
      }

      // Get recent stock movements count
      const { data: stockEntries, error: stockEntriesError } = await client
        .from('stock_entries')
        .select('id')
        .eq('organization_id', organizationId)
        .gte(
          'entry_date',
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        );

      if (stockEntriesError) {
        this.logger.error(`Error fetching stock entries: ${stockEntriesError.message}`);
      }

      // Aggregate stock by item
      const itemMap = new Map<string, {
        id: string;
        name: string;
        code: string;
        stock: number;
        unit: string;
        minimum_stock_level?: number;
        is_low_stock: boolean;
        total_value: number;
      }>();

      let totalInventoryValue = 0;

      (stockData || []).forEach((row: any) => {
        const item = row.item;
        if (!item) return;

        const itemId = item.id;
        const quantity = parseFloat(row.remaining_quantity || 0);
        const value = parseFloat(row.total_cost || 0);
        const minStock = item.minimum_stock_level
          ? parseFloat(item.minimum_stock_level)
          : undefined;

        totalInventoryValue += value;

        if (!itemMap.has(itemId)) {
          itemMap.set(itemId, {
            id: itemId,
            name: item.item_name,
            code: item.item_code,
            stock: 0,
            unit: item.default_unit,
            minimum_stock_level: minStock,
            is_low_stock: false,
            total_value: 0,
          });
        }

        const itemData = itemMap.get(itemId)!;
        itemData.stock += quantity;
        itemData.total_value += value;

        // Check if stock is below minimum
        if (minStock !== undefined && itemData.stock < minStock) {
          itemData.is_low_stock = true;
        }
      });

      const items = Array.from(itemMap.values());

      // Build low stock items array for quick reference
      const lowStockItems = items
        .filter((item) => item.is_low_stock && item.minimum_stock_level !== undefined)
        .map((item) => ({
          name: item.name,
          code: item.code,
          current_stock: item.stock,
          minimum_level: item.minimum_stock_level!,
          unit: item.unit,
          shortage: item.minimum_stock_level! - item.stock,
        }))
        .sort((a, b) => b.shortage - a.shortage); // Sort by shortage (most critical first)

      this.logger.log(
        `Loaded inventory context: ${items.length} items with stock, ` +
        `${lowStockItems.length} low stock items, ${warehouses?.length || 0} warehouses, ` +
        `total value: ${totalInventoryValue.toFixed(2)}`
      );

      const warehousesList = warehouses || [];

      return {
        items_count: items.length,
        items_recent: items.slice(0, this.SUMMARY_LIMIT),
        items_has_more: items.length > this.SUMMARY_LIMIT,
        warehouses_count: warehousesList.length,
        warehouses_recent:
          warehousesList.slice(0, this.SUMMARY_LIMIT).map((w: any) => ({
            id: w.id,
            name: w.name,
            location: w.location || 'N/A',
            farm_name: w.farm?.name,
          })),
        warehouses_has_more: warehousesList.length > this.SUMMARY_LIMIT,
        recent_stock_movements_count: stockEntries?.length || 0,
        low_stock_count: lowStockItems.length,
        low_stock_items_recent: lowStockItems.slice(0, this.SUMMARY_LIMIT),
        low_stock_items_has_more: lowStockItems.length > this.SUMMARY_LIMIT,
        total_inventory_value: totalInventoryValue,
      };
    } catch (error) {
      this.logger.error(`Error in getInventoryContext: ${error.message}`, error.stack);
      return {
        items_count: 0,
        items_recent: [],
        items_has_more: false,
        warehouses_count: 0,
        warehouses_recent: [],
        warehouses_has_more: false,
        recent_stock_movements_count: 0,
        low_stock_count: 0,
        low_stock_items_recent: [],
        low_stock_items_has_more: false,
        total_inventory_value: 0,
      };
    }
  }

  private async getProductionContext(
    client: any,
    organizationId: string,
  ): Promise<ProductionContext> {
    try {
      const { data: harvests, error: harvestsError, count: harvestsCount } = await client
        .from('harvest_records')
        .select(`
          id,
          harvest_date,
          quantity,
          unit,
          quality_grade,
          status,
          lot_number,
          parcel:parcels(id, name, crop_type),
          crop_cycle:crop_cycles(id, cycle_name, crop_type, variety_name)
        `, { count: 'exact' })
        .eq('organization_id', organizationId)
        .gte(
          'harvest_date',
          new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
        )
        .order('harvest_date', { ascending: false })
        .limit(this.SUMMARY_LIMIT);

      if (harvestsError) {
        this.logger.error(`Error fetching harvests: ${harvestsError.message}`);
      }

      const { data: qualityChecks, error: qualityChecksError } = await client
        .from('quality_inspections')
        .select(`
          id,
          inspection_date,
          inspection_type,
          overall_grade,
          notes,
          parcel:parcels(id, name)
        `)
        .eq('organization_id', organizationId)
        .gte(
          'inspection_date',
          new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
        )
        .order('inspection_date', { ascending: false })
        .limit(10);

      if (qualityChecksError) {
        this.logger.error(`Error fetching quality checks: ${qualityChecksError.message}`);
      }

      const { data: deliveries, error: deliveriesError } = await client
        .from('deliveries')
        .select(`
          id,
          delivery_date,
          status,
          total_quantity,
          customer:customers(id, name)
        `)
        .eq('organization_id', organizationId)
        .gte(
          'delivery_date',
          new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
        )
        .order('delivery_date', { ascending: false })
        .limit(10);

      if (deliveriesError) {
        this.logger.error(`Error fetching deliveries: ${deliveriesError.message}`);
      }

      const harvestsTotal = harvestsCount ?? harvests?.length ?? 0;

      this.logger.log(
        `Loaded production context: ${harvestsTotal} harvests, ` +
        `${qualityChecks?.length || 0} quality checks, ${deliveries?.length || 0} deliveries`
      );

      return {
        recent_harvests_count: harvestsTotal,
        harvests_recent:
          harvests?.map((h: any) => {
            const cropName = h.crop_cycle?.crop_type || h.parcel?.crop_type || 'Unknown';
            const variety = h.crop_cycle?.variety_name;
            return {
              date: h.harvest_date,
              crop: variety ? `${cropName} (${variety})` : cropName,
              quantity: `${h.quantity} ${h.unit}`,
              quality: h.quality_grade || 'N/A',
              status: h.status,
              lot_number: h.lot_number,
              parcel_name: h.parcel?.name,
            };
          }) || [],
        harvests_has_more: harvestsTotal > (harvests?.length || 0),
        recent_quality_checks_count: qualityChecks?.length || 0,
        recent_deliveries_count: deliveries?.length || 0,
      };
    } catch (error) {
      this.logger.error(`Error in getProductionContext: ${error.message}`, error.stack);
      return {
        recent_harvests_count: 0,
        harvests_recent: [],
        harvests_has_more: false,
        recent_quality_checks_count: 0,
        recent_deliveries_count: 0,
      };
    }
  }

  private async getSupplierCustomerContext(
    client: any,
    organizationId: string,
  ): Promise<SupplierCustomerContext> {
    try {
       // Get all suppliers, not just active ones (summary)
       const { data: suppliers, error: suppliersError, count: suppliersCount } = await client
         .from('suppliers')
         .select('id, name, supplier_type, is_active, created_at', { count: 'exact' })
         .eq('organization_id', organizationId)
         .order('created_at', { ascending: false })
         .limit(this.SUMMARY_LIMIT);
      
      if (suppliersError) {
        this.logger.error(`Error fetching suppliers: ${suppliersError.message}`);
      }

       // Get all customers, not just active ones (summary)
       const { data: customers, error: customersError, count: customersCount } = await client
         .from('customers')
         .select('id, name, customer_type, is_active, created_at', { count: 'exact' })
         .eq('organization_id', organizationId)
         .order('created_at', { ascending: false })
         .limit(this.SUMMARY_LIMIT);
      
      if (customersError) {
        this.logger.error(`Error fetching customers: ${customersError.message}`);
      }

       const { data: salesOrders, error: salesOrdersError, count: salesOrdersCount } = await client
         .from('sales_orders')
         .select('id, order_number, order_date, total_amount, status', { count: 'exact' })
         .eq('organization_id', organizationId)
         .in('status', ['draft', 'confirmed', 'partial'])
         .order('order_date', { ascending: false })
         .limit(this.SUMMARY_LIMIT);
      
      if (salesOrdersError) {
        this.logger.error(`Error fetching sales orders: ${salesOrdersError.message}`);
      }

       const { data: purchaseOrders, error: purchaseOrdersError, count: purchaseOrdersCount } = await client
         .from('purchase_orders')
         .select('id, order_number, order_date, total_amount, status', { count: 'exact' })
         .eq('organization_id', organizationId)
         .in('status', ['draft', 'confirmed', 'partial'])
         .order('order_date', { ascending: false })
         .limit(this.SUMMARY_LIMIT);
      
      if (purchaseOrdersError) {
        this.logger.error(`Error fetching purchase orders: ${purchaseOrdersError.message}`);
      }

      const suppliersTotal = suppliersCount ?? suppliers?.length ?? 0;
      const customersTotal = customersCount ?? customers?.length ?? 0;
      const salesOrdersTotal = salesOrdersCount ?? salesOrders?.length ?? 0;
      const purchaseOrdersTotal = purchaseOrdersCount ?? purchaseOrders?.length ?? 0;

      this.logger.log(`Loaded supplier/customer context: ${suppliersTotal} suppliers, ${customersTotal} customers`);

      return {
        suppliers_count: suppliersTotal,
        suppliers_recent:
          suppliers?.map((s: any) => ({
            id: s.id,
            name: s.name,
            type: s.supplier_type,
          })) || [],
        suppliers_has_more: suppliersTotal > (suppliers?.length || 0),
        customers_count: customersTotal,
        customers_recent:
          customers?.map((c: any) => ({
            id: c.id,
            name: c.name,
            type: c.customer_type,
          })) || [],
        customers_has_more: customersTotal > (customers?.length || 0),
        pending_sales_orders_count: salesOrdersTotal,
        sales_orders_recent:
          salesOrders?.map((o: any) => ({
            number: o.order_number,
            date: o.order_date,
            total: o.total_amount,
            status: o.status,
          })) || [],
        sales_orders_has_more: salesOrdersTotal > (salesOrders?.length || 0),
        pending_purchase_orders_count: purchaseOrdersTotal,
        purchase_orders_recent:
          purchaseOrders?.map((o: any) => ({
            number: o.order_number,
            date: o.order_date,
            total: o.total_amount,
            status: o.status,
          })) || [],
        purchase_orders_has_more: purchaseOrdersTotal > (purchaseOrders?.length || 0),
      };
    } catch (error) {
      this.logger.error(`Error in getSupplierCustomerContext: ${error.message}`, error.stack);
      return {
        suppliers_count: 0,
        suppliers_recent: [],
        suppliers_has_more: false,
        customers_count: 0,
        customers_recent: [],
        customers_has_more: false,
        pending_sales_orders_count: 0,
        sales_orders_recent: [],
        sales_orders_has_more: false,
        pending_purchase_orders_count: 0,
        purchase_orders_recent: [],
        purchase_orders_has_more: false,
      };
    }
  }

  private async getCampaignsContext(
    client: any,
    organizationId: string,
  ): Promise<CampaignsContext> {
    try {
      const { count: campaignsCount, error: campaignsCountError } = await client
        .from('campaigns')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId);

      if (campaignsCountError) {
        this.logger.error(`Error counting campaigns: ${campaignsCountError.message}`);
      }

      const { count: activeCampaignsCount, error: activeCampaignsError } = await client
        .from('campaigns')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('status', 'active');

      if (activeCampaignsError) {
        this.logger.error(`Error counting active campaigns: ${activeCampaignsError.message}`);
      }

      const { count: plannedCampaignsCount, error: plannedCampaignsError } = await client
        .from('campaigns')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('status', 'planned');

      if (plannedCampaignsError) {
        this.logger.error(`Error counting planned campaigns: ${plannedCampaignsError.message}`);
      }

      const { data: campaigns, error: campaignsError, count: campaignsTotalCount } = await client
        .from('campaigns')
        .select('id, name, type, status, start_date, end_date, priority', { count: 'exact' })
        .eq('organization_id', organizationId)
        .order('start_date', { ascending: false })
        .limit(this.SUMMARY_LIMIT);

      if (campaignsError) {
        this.logger.error(`Error fetching campaigns: ${campaignsError.message}`);
      }

      return {
        campaigns_count: campaignsCount || 0,
        active_campaigns_count: activeCampaignsCount || 0,
        planned_campaigns_count: plannedCampaignsCount || 0,
        campaigns_recent:
          campaigns?.map((campaign: any) => ({
            id: campaign.id,
            name: campaign.name,
            type: campaign.type,
            status: campaign.status,
            start_date: campaign.start_date,
            end_date: campaign.end_date,
            priority: campaign.priority,
          })) || [],
        campaigns_has_more: (campaignsTotalCount ?? campaigns?.length ?? 0) > (campaigns?.length || 0),
      };
    } catch (error) {
      this.logger.error(`Error in getCampaignsContext: ${error.message}`, error.stack);
      return {
        campaigns_count: 0,
        active_campaigns_count: 0,
        planned_campaigns_count: 0,
        campaigns_recent: [],
        campaigns_has_more: false,
      };
    }
  }

  private async getReceptionBatchesContext(
    client: any,
    organizationId: string,
  ): Promise<ReceptionBatchesContext> {
    try {
      const { count: batchesCount, error: batchesCountError } = await client
        .from('reception_batches')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId);

      if (batchesCountError) {
        this.logger.error(`Error counting reception batches: ${batchesCountError.message}`);
      }

      const { data: batches, error: batchesError, count: batchesTotalCount } = await client
        .from('reception_batches')
        .select(
          `
          id,
          batch_code,
          reception_date,
          weight,
          weight_unit,
          status,
          quality_grade,
          parcel:parcels(name),
          warehouse:warehouses(name)
        `,
          { count: 'exact' },
        )
        .eq('organization_id', organizationId)
        .order('reception_date', { ascending: false })
        .limit(this.SUMMARY_LIMIT);

      if (batchesError) {
        this.logger.error(`Error fetching reception batches: ${batchesError.message}`);
      }

      return {
        batches_count: batchesCount || 0,
        recent_batches:
          batches?.map((batch: any) => ({
            id: batch.id,
            batch_code: batch.batch_code,
            reception_date: batch.reception_date,
            weight: batch.weight,
            weight_unit: batch.weight_unit,
            status: batch.status,
            quality_grade: batch.quality_grade,
            parcel_name: batch.parcel?.name,
            warehouse_name: batch.warehouse?.name,
          })) || [],
        batches_has_more: (batchesTotalCount ?? batches?.length ?? 0) > (batches?.length || 0),
      };
    } catch (error) {
      this.logger.error(`Error in getReceptionBatchesContext: ${error.message}`, error.stack);
      return {
        batches_count: 0,
        recent_batches: [],
        batches_has_more: false,
      };
    }
  }

  private async getComplianceContext(
    client: any,
    organizationId: string,
  ): Promise<ComplianceContext> {
    try {
      const { count: certificationsCount, error: certificationsCountError } = await client
        .from('certifications')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId);

      if (certificationsCountError) {
        this.logger.error(`Error counting certifications: ${certificationsCountError.message}`);
      }

      const { count: activeCertificationsCount, error: activeCertificationsError } = await client
        .from('certifications')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('status', 'active');

      if (activeCertificationsError) {
        this.logger.error(`Error counting active certifications: ${activeCertificationsError.message}`);
      }

      const today = new Date();
      const expiringCutoff = new Date();
      expiringCutoff.setDate(today.getDate() + 90);

      const { count: expiringCertificationsCount, error: expiringCertificationsError } = await client
        .from('certifications')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .gte('expiry_date', today.toISOString().split('T')[0])
        .lte('expiry_date', expiringCutoff.toISOString().split('T')[0]);

      if (expiringCertificationsError) {
        this.logger.error(`Error counting expiring certifications: ${expiringCertificationsError.message}`);
      }

      const { count: nonCompliantChecksCount, error: nonCompliantChecksError } = await client
        .from('compliance_checks')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('status', 'non_compliant');

      if (nonCompliantChecksError) {
        this.logger.error(`Error counting non-compliant checks: ${nonCompliantChecksError.message}`);
      }

      const { data: certifications, error: certificationsError, count: certificationsTotalCount } = await client
        .from('certifications')
        .select('id, certification_type, status, expiry_date', { count: 'exact' })
        .eq('organization_id', organizationId)
        .order('expiry_date', { ascending: true })
        .limit(this.SUMMARY_LIMIT);

      if (certificationsError) {
        this.logger.error(`Error fetching certifications: ${certificationsError.message}`);
      }

      const { data: checks, error: checksError, count: checksTotalCount } = await client
        .from('compliance_checks')
        .select(
          `
          id,
          check_type,
          check_date,
          status,
          score,
          certification:certifications(certification_type)
        `,
          { count: 'exact' },
        )
        .eq('organization_id', organizationId)
        .order('check_date', { ascending: false })
        .limit(this.SUMMARY_LIMIT);

      if (checksError) {
        this.logger.error(`Error fetching compliance checks: ${checksError.message}`);
      }

      return {
        certifications_count: certificationsCount || 0,
        active_certifications_count: activeCertificationsCount || 0,
        expiring_certifications_count: expiringCertificationsCount || 0,
        non_compliant_checks_count: nonCompliantChecksCount || 0,
        checks_count: checksTotalCount || 0,
        certifications_recent:
          certifications?.map((cert: any) => ({
            id: cert.id,
            certification_type: cert.certification_type,
            status: cert.status,
            expiry_date: cert.expiry_date,
          })) || [],
        certifications_has_more: (certificationsTotalCount ?? certifications?.length ?? 0) > (certifications?.length || 0),
        recent_checks:
          checks?.map((check: any) => ({
            id: check.id,
            check_type: check.check_type,
            check_date: check.check_date,
            status: check.status,
            score: check.score,
            certification_type: check.certification?.certification_type,
          })) || [],
        checks_has_more: (checksTotalCount ?? checks?.length ?? 0) > (checks?.length || 0),
      };
    } catch (error) {
      this.logger.error(`Error in getComplianceContext: ${error.message}`, error.stack);
      return {
        certifications_count: 0,
        active_certifications_count: 0,
        expiring_certifications_count: 0,
        non_compliant_checks_count: 0,
        checks_count: 0,
        certifications_recent: [],
        certifications_has_more: false,
        recent_checks: [],
        checks_has_more: false,
      };
    }
  }

  private async getUtilitiesContext(
    client: any,
    organizationId: string,
  ): Promise<UtilitiesContext> {
    try {
      const { count: utilitiesCount, error: utilitiesCountError } = await client
        .from('utilities')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId);

      if (utilitiesCountError) {
        this.logger.error(`Error counting utilities: ${utilitiesCountError.message}`);
      }

      const { count: pendingUtilitiesCount, error: pendingUtilitiesError } = await client
        .from('utilities')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('payment_status', 'pending');

      if (pendingUtilitiesError) {
        this.logger.error(`Error counting pending utilities: ${pendingUtilitiesError.message}`);
      }

      const { data: utilities, error: utilitiesError, count: utilitiesTotalCount } = await client
        .from('utilities')
        .select(
          `
          id,
          type,
          provider,
          amount,
          billing_date,
          due_date,
          payment_status,
          farm:farms(name),
          parcel:parcels(name)
        `,
          { count: 'exact' },
        )
        .eq('organization_id', organizationId)
        .order('billing_date', { ascending: false })
        .limit(this.SUMMARY_LIMIT);

      if (utilitiesError) {
        this.logger.error(`Error fetching utilities: ${utilitiesError.message}`);
      }

      return {
        utilities_count: utilitiesCount || 0,
        pending_utilities_count: pendingUtilitiesCount || 0,
        utilities_recent:
          utilities?.map((utility: any) => ({
            id: utility.id,
            type: utility.type,
            provider: utility.provider,
            amount: utility.amount,
            billing_date: utility.billing_date,
            due_date: utility.due_date,
            payment_status: utility.payment_status,
            farm_name: utility.farm?.name,
            parcel_name: utility.parcel?.name,
          })) || [],
        utilities_has_more: (utilitiesTotalCount ?? utilities?.length ?? 0) > (utilities?.length || 0),
      };
    } catch (error) {
      this.logger.error(`Error in getUtilitiesContext: ${error.message}`, error.stack);
      return {
        utilities_count: 0,
        pending_utilities_count: 0,
        utilities_recent: [],
        utilities_has_more: false,
      };
    }
  }

  private async getReportsContext(
    client: any,
    organizationId: string,
  ): Promise<ReportsContext> {
    try {
      const { count: reportsCount, error: reportsCountError } = await client
        .from('parcel_reports')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId);

      if (reportsCountError) {
        this.logger.error(`Error counting reports: ${reportsCountError.message}`);
      }

      const { count: pendingReportsCount, error: pendingReportsError } = await client
        .from('parcel_reports')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('status', 'pending');

      if (pendingReportsError) {
        this.logger.error(`Error counting pending reports: ${pendingReportsError.message}`);
      }

      const { count: failedReportsCount, error: failedReportsError } = await client
        .from('parcel_reports')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('status', 'failed');

      if (failedReportsError) {
        this.logger.error(`Error counting failed reports: ${failedReportsError.message}`);
      }

      const { data: reports, error: reportsError, count: reportsTotalCount } = await client
        .from('parcel_reports')
        .select('id, title, template_id, status, generated_at, parcel:parcels(name)', {
          count: 'exact',
        })
        .eq('organization_id', organizationId)
        .order('generated_at', { ascending: false })
        .limit(this.SUMMARY_LIMIT);

      if (reportsError) {
        this.logger.error(`Error fetching reports: ${reportsError.message}`);
      }

      return {
        reports_count: reportsCount || 0,
        pending_reports_count: pendingReportsCount || 0,
        failed_reports_count: failedReportsCount || 0,
        reports_recent:
          reports?.map((report: any) => ({
            id: report.id,
            title: report.title,
            template_id: report.template_id,
            status: report.status,
            generated_at: report.generated_at,
            parcel_name: report.parcel?.name,
          })) || [],
        reports_has_more: (reportsTotalCount ?? reports?.length ?? 0) > (reports?.length || 0),
      };
    } catch (error) {
      this.logger.error(`Error in getReportsContext: ${error.message}`, error.stack);
      return {
        reports_count: 0,
        pending_reports_count: 0,
        failed_reports_count: 0,
        reports_recent: [],
        reports_has_more: false,
      };
    }
  }

  private async getMarketplaceContext(
    client: any,
    organizationId: string,
  ): Promise<MarketplaceContext> {
    try {
      const { count: listingsCount, error: listingsCountError } = await client
        .from('marketplace_listings')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId);

      if (listingsCountError) {
        this.logger.error(`Error counting marketplace listings: ${listingsCountError.message}`);
      }

      const { count: activeListingsCount, error: activeListingsError } = await client
        .from('marketplace_listings')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('status', 'active');

      if (activeListingsError) {
        this.logger.error(`Error counting active listings: ${activeListingsError.message}`);
      }

      const ordersFilter = `buyer_organization_id.eq.${organizationId},seller_organization_id.eq.${organizationId}`;

      const { count: ordersCount, error: ordersCountError } = await client
        .from('marketplace_orders')
        .select('*', { count: 'exact', head: true })
        .or(ordersFilter);

      if (ordersCountError) {
        this.logger.error(`Error counting marketplace orders: ${ordersCountError.message}`);
      }

      const { count: pendingOrdersCount, error: pendingOrdersError } = await client
        .from('marketplace_orders')
        .select('*', { count: 'exact', head: true })
        .or(ordersFilter)
        .eq('status', 'pending');

      if (pendingOrdersError) {
        this.logger.error(`Error counting pending marketplace orders: ${pendingOrdersError.message}`);
      }

      const { count: quoteRequestsCount, error: quoteRequestsCountError } = await client
        .from('marketplace_quote_requests')
        .select('*', { count: 'exact', head: true })
        .or(`requester_organization_id.eq.${organizationId},seller_organization_id.eq.${organizationId}`);

      if (quoteRequestsCountError) {
        this.logger.error(`Error counting marketplace quote requests: ${quoteRequestsCountError.message}`);
      }

      const { data: listings, error: listingsError, count: listingsTotalCount } = await client
        .from('marketplace_listings')
        .select('id, title, status, price, currency, quantity_available', { count: 'exact' })
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(this.SUMMARY_LIMIT);

      if (listingsError) {
        this.logger.error(`Error fetching marketplace listings: ${listingsError.message}`);
      }

      const { data: orders, error: ordersError, count: ordersTotalCount } = await client
        .from('marketplace_orders')
        .select('id, status, total_amount, currency, buyer_organization_id, seller_organization_id, created_at', {
          count: 'exact',
        })
        .or(ordersFilter)
        .order('created_at', { ascending: false })
        .limit(this.SUMMARY_LIMIT);

      if (ordersError) {
        this.logger.error(`Error fetching marketplace orders: ${ordersError.message}`);
      }

      const { data: quoteRequests, error: quoteRequestsError, count: quoteRequestsTotalCount } = await client
        .from('marketplace_quote_requests')
        .select('id, product_title, status, requester_organization_id, seller_organization_id, created_at', {
          count: 'exact',
        })
        .or(`requester_organization_id.eq.${organizationId},seller_organization_id.eq.${organizationId}`)
        .order('created_at', { ascending: false })
        .limit(this.SUMMARY_LIMIT);

      if (quoteRequestsError) {
        this.logger.error(`Error fetching marketplace quote requests: ${quoteRequestsError.message}`);
      }

      return {
        listings_count: listingsCount || 0,
        active_listings_count: activeListingsCount || 0,
        orders_count: ordersCount || 0,
        pending_orders_count: pendingOrdersCount || 0,
        quote_requests_count: quoteRequestsCount || 0,
        listings_recent:
          listings?.map((listing: any) => ({
            id: listing.id,
            title: listing.title,
            status: listing.status,
            price: listing.price,
            currency: listing.currency,
            quantity_available: listing.quantity_available,
          })) || [],
        listings_has_more: (listingsTotalCount ?? listings?.length ?? 0) > (listings?.length || 0),
        orders_recent:
          orders?.map((order: any) => ({
            id: order.id,
            status: order.status,
            total_amount: order.total_amount,
            currency: order.currency,
            role: order.buyer_organization_id === organizationId ? 'buyer' : 'seller',
            created_at: order.created_at,
          })) || [],
        orders_has_more: (ordersTotalCount ?? orders?.length ?? 0) > (orders?.length || 0),
        quote_requests_recent:
          quoteRequests?.map((request: any) => ({
            id: request.id,
            product_title: request.product_title,
            status: request.status,
            role: request.requester_organization_id === organizationId ? 'requester' : 'seller',
            created_at: request.created_at,
          })) || [],
        quote_requests_has_more: (quoteRequestsTotalCount ?? quoteRequests?.length ?? 0) > (quoteRequests?.length || 0),
      };
    } catch (error) {
      this.logger.error(`Error in getMarketplaceContext: ${error.message}`, error.stack);
      return {
        listings_count: 0,
        active_listings_count: 0,
        orders_count: 0,
        pending_orders_count: 0,
        quote_requests_count: 0,
        listings_recent: [],
        listings_has_more: false,
        orders_recent: [],
        orders_has_more: false,
        quote_requests_recent: [],
        quote_requests_has_more: false,
      };
    }
  }

  private async getOrchardContext(
    client: any,
    organizationId: string,
  ): Promise<OrchardContext> {
    try {
      const orchardAssetTypes = ['bearer_plant', 'consumable_plant'];

      const { count: orchardAssetsCount, error: orchardAssetsCountError } = await client
        .from('biological_assets')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .in('asset_type', orchardAssetTypes);

      if (orchardAssetsCountError) {
        this.logger.error(`Error counting orchard assets: ${orchardAssetsCountError.message}`);
      }

      const { count: treeCategoriesCount, error: treeCategoriesError } = await client
        .from('tree_categories')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId);

      if (treeCategoriesError) {
        this.logger.error(`Error counting tree categories: ${treeCategoriesError.message}`);
      }

      const { count: treesCount, error: treesCountError } = await client
        .from('trees')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId);

      if (treesCountError) {
        this.logger.error(`Error counting trees: ${treesCountError.message}`);
      }

      const { count: pruningTasksCount, error: pruningTasksError } = await client
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('task_type', 'pruning');

      if (pruningTasksError) {
        this.logger.error(`Error counting pruning tasks: ${pruningTasksError.message}`);
      }

      const { data: orchardAssets, error: orchardAssetsError, count: orchardAssetsTotalCount } = await client
        .from('biological_assets')
        .select('id, asset_name, asset_category, status, quantity, area_ha, farm_id', { count: 'exact' })
        .eq('organization_id', organizationId)
        .in('asset_type', orchardAssetTypes)
        .order('created_at', { ascending: false })
        .limit(this.SUMMARY_LIMIT);

      if (orchardAssetsError) {
        this.logger.error(`Error fetching orchard assets: ${orchardAssetsError.message}`);
      }

      const { data: pruningTasks, error: pruningTasksListError, count: pruningTasksTotalCount } = await client
        .from('tasks')
        .select('id, title, status, due_date', { count: 'exact' })
        .eq('organization_id', organizationId)
        .eq('task_type', 'pruning')
        .order('due_date', { ascending: true })
        .limit(this.SUMMARY_LIMIT);

      if (pruningTasksListError) {
        this.logger.error(`Error fetching pruning tasks: ${pruningTasksListError.message}`);
      }

      return {
        orchard_assets_count: orchardAssetsCount || 0,
        tree_categories_count: treeCategoriesCount || 0,
        trees_count: treesCount || 0,
        pruning_tasks_count: pruningTasksCount || 0,
        orchard_assets_recent:
          orchardAssets?.map((asset: any) => ({
            id: asset.id,
            name: asset.asset_name,
            category: asset.asset_category,
            status: asset.status,
            quantity: asset.quantity,
            area_ha: asset.area_ha,
            farm_id: asset.farm_id,
          })) || [],
        orchard_assets_has_more: (orchardAssetsTotalCount ?? orchardAssets?.length ?? 0) > (orchardAssets?.length || 0),
        pruning_tasks_recent:
          pruningTasks?.map((task: any) => ({
            id: task.id,
            title: task.title,
            status: task.status,
            due_date: task.due_date,
          })) || [],
        pruning_tasks_has_more: (pruningTasksTotalCount ?? pruningTasks?.length ?? 0) > (pruningTasks?.length || 0),
      };
    } catch (error) {
      this.logger.error(`Error in getOrchardContext: ${error.message}`, error.stack);
      return {
        orchard_assets_count: 0,
        tree_categories_count: 0,
        trees_count: 0,
        pruning_tasks_count: 0,
        orchard_assets_recent: [],
        orchard_assets_has_more: false,
        pruning_tasks_recent: [],
        pruning_tasks_has_more: false,
      };
    }
  }

  private async getSatelliteWeatherContext(
    client: any,
    organizationId: string,
  ): Promise<SatelliteWeatherContext> {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const startDate = sixMonthsAgo.toISOString().split('T')[0];
    const endDate = new Date().toISOString().split('T')[0];

     // Get parcels with boundaries - limit to 10 most recent
     // Reduced from 20 to 10 to optimize prompt size and reduce AI processing time
     const { data: parcels } = await client
       .from('parcels')
       .select('id, name, boundary')
       .eq('organization_id', organizationId)
       .eq('is_active', true)
       .limit(10);

    if (!parcels || parcels.length === 0) {
      return {
        latest_indices: [],
        trends: [],
        weather_summary: null,
        weather_forecast: {
          parcels: [],
          available: false,
        },
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

    // Fetch weather forecast for each parcel
    let weatherForecast = {
      parcels: [] as Array<{ parcel_id: string; parcel_name: string; forecasts: WeatherForecast[] }>,
      available: false,
    };

    if (this.weatherProvider.isConfigured()) {
      try {
        const forecastPromises = parcels.map(async (parcel: any) => {
          try {
            if (!parcel.boundary || parcel.boundary.length === 0) {
              return null;
            }

            // Ensure coordinates are in WGS84
            const wgs84Boundary = WeatherProvider.ensureWGS84(parcel.boundary);
            const { latitude, longitude } = WeatherProvider.calculateCentroid(wgs84Boundary);

            // Get 5-day forecast
            const forecastData = await this.weatherProvider.getForecast(latitude, longitude, 5);

            return {
              parcel_id: parcel.id,
              parcel_name: parcel.name || 'Unknown',
              forecasts: forecastData.forecasts,
            };
          } catch (error) {
            this.logger.warn(`Failed to fetch forecast for parcel ${parcel.id}: ${error.message}`);
            return null;
          }
        });

        const forecastResults = await Promise.all(forecastPromises);
        weatherForecast = {
          parcels: forecastResults.filter(Boolean),
          available: forecastResults.some(Boolean),
        };

        this.logger.log(`Fetched weather forecast for ${weatherForecast.parcels.length} parcels`);
      } catch (error) {
        this.logger.warn(`Failed to fetch weather forecasts: ${error.message}`);
      }
    }

    return {
      latest_indices: latestIndices as any,
      trends: trends as any,
      weather_summary: weatherSummary,
      weather_forecast: weatherForecast,
    };
  }

  private async getSoilAnalysisContext(
    client: any,
    organizationId: string,
  ): Promise<SoilAnalysisContext> {
     // Get latest soil analyses - limit to 10 most recent
     // Reduced from 20 to 10 to optimize prompt size and reduce AI processing time
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
       .limit(10);

     // Get latest water analyses - limit to 10 most recent
     // Reduced from 20 to 10 to optimize prompt size and reduce AI processing time
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
       .limit(10);

     // Get latest plant analyses - limit to 10 most recent
     // Reduced from 20 to 10 to optimize prompt size and reduce AI processing time
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
       .limit(10);

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
     // Get active performance alerts - limit to 10 most recent
     // Reduced from 20 to 10 to optimize prompt size and reduce AI processing time
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
       .limit(10);

     // Get upcoming harvest forecasts - limit to 10 most recent
     // Reduced from 20 to 10 to optimize prompt size and reduce AI processing time
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
       .limit(10);

     // Get yield benchmarks - limit to 10 most recent
     // Reduced from 30 to 10 to optimize prompt size and reduce AI processing time
     const { data: benchmarks } = await client
       .from('yield_benchmarks')
       .select('crop_type, target_yield_per_hectare, is_active')
       .eq('organization_id', organizationId)
       .eq('is_active', true)
       .limit(10);

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
- **CRITICAL: When the user has no farm data, act as a helpful onboarding assistant and agricultural advisor**

**Response Guidelines:**
- **BE CONCISE AND DIRECT** - Answer the question directly, don't write essays
- For simple queries like "list farms", "list workers", "show invoices" - provide a brief, direct answer first
- If there's no data, say so briefly (e.g., "You have 0 farms registered" or "No workers found")
- Only provide detailed explanations if the user asks follow-up questions or requests more information
- Always base your responses on the provided context data
- When providing recommendations, include:
  * Priority level (high/medium/low)
  * Category (irrigation, fertilization, soil, pruning, pest-control, general)
  * Specific dosages, methods, and timing guidance
  * Expected impact on yield/quality
- **When there's no data:**
  * Give a brief, direct answer first (e.g., "You have 0 farms" or "No workers registered")
  * Then offer ONE sentence about how to add data (e.g., "You can add farms through the Farm Management module")
  * Don't repeat the same information multiple times
  * Don't write long paragraphs explaining what they need to do - be concise
- If you don't have sufficient data, clearly state what information is missing briefly
- Use professional agricultural terminology while remaining accessible
- Be specific with references to actual data (parcel names, amounts, dates, indices) when available
- For complex analyses, break down your response clearly
- Consider the current season and phenological stages when making timing recommendations
- When interpreting satellite indices, relate them to recent farm tasks, weather, and crop stage
- If the user asks for something that requires actions you cannot perform, explain what needs to be done briefly
- **Remember: Users want quick answers, not long explanations unless they specifically ask for details**

**CRITICAL — Language Rule:**
- You MUST reply in the EXACT language specified in the user prompt's language instruction.
- Supported languages: English (en), French (fr), Arabic (ar).
- Your ENTIRE response must be in that language — do not mix languages.
- If the user writes in a different language than the one specified, still respond in the specified language.`;
  }

  private buildUserPrompt(
    query: string,
    context: BuiltContext,
    language: string,
    conversationHistory: Array<{ role: string; content: string }> = [],
  ): string {
    const langInstruction =
      language === 'fr'
        ? '⚠️ LANGUE OBLIGATOIRE : Répondre UNIQUEMENT en français. Toute la réponse doit être en français.'
        : language === 'ar'
        ? '⚠️ اللغة الإلزامية: يجب الرد باللغة العربية فقط. يجب أن تكون الإجابة بالكامل باللغة العربية.'
        : '⚠️ REQUIRED LANGUAGE: Respond ONLY in English. The entire response must be in English.';

    // Check if weather forecast is available (no string matching - AI already routed to weather agent)
    const hasWeatherForecast = context.satelliteWeather?.weather_forecast?.available && 
                               context.satelliteWeather.weather_forecast.parcels.length > 0;
    
    // Determine if this is a weather query by checking if weather context was loaded
    // (AI routing already determined this, so we just check if weather data exists)
    const isWeatherQuery = context.satelliteWeather !== null && hasWeatherForecast;

    const conversationContext = conversationHistory.length > 0
      ? `\n====================================================\nCONVERSATION HISTORY\n====================================================\n${conversationHistory.map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`).join('\n\n')}\n`
      : '';

    // Add weather forecast emphasis if query is about weather
    const weatherEmphasis = isWeatherQuery && hasWeatherForecast 
      ? `\n\n⚠️ IMPORTANT: The user is asking about weather/forecast. You MUST use the "Weather Forecast (Next 5 Days)" data provided below to answer their question. The forecast includes:
- Tomorrow's weather (labeled as "Tomorrow")
- Precipitation amounts in mm
- Rain probability percentages
- Temperature ranges
- Weather descriptions

If the user asks "will it rain tomorrow", check the "Tomorrow" forecast entry for precipitation > 0mm or rain probability > 0%. Answer directly based on this data.`
      : isWeatherQuery && !hasWeatherForecast
      ? `\n\n⚠️ NOTE: The user is asking about weather, but weather forecast data is not available. This could be because:
- OpenWeatherMap API key is not configured (set OPENWEATHER_API_KEY environment variable)
- Parcels don't have boundary coordinates configured
- Weather API is temporarily unavailable

Inform the user about this limitation and suggest they configure the weather API or check parcel boundaries.`
      : '';

    return `${langInstruction}${weatherEmphasis}

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

${context.settings ? `====================================================
SETTINGS & SUBSCRIPTION
====================================================
${context.settings.subscription ? `
Plan: ${context.settings.subscription.plan_type || 'Free'} (${context.settings.subscription.formula || 'N/A'})
Status: ${context.settings.subscription.status}
Max Users: ${context.settings.subscription.max_users ?? 'Unlimited'}
Max Farms: ${context.settings.subscription.max_farms ?? 'Unlimited'}
Max Parcels: ${context.settings.subscription.max_parcels ?? 'Unlimited'}
${context.settings.subscription.contract_end_at ? `Contract Ends: ${context.settings.subscription.contract_end_at}` : ''}
` : 'No subscription data.'}

Team Members (${context.settings.organization_users.length}):
${context.settings.organization_users.map(u => `- ${u.name} (${u.role}) - ${u.email}`).join('\n')}
` : ''}
====================================================
FARM DATA
====================================================
${context.farms && context.farms.farms_count > 0 ? `
Farms: ${context.farms.farms_count}
${context.farms.farms_recent.map((f) => `- ${f.name} (${f.area} ha${f.location ? `, ${f.location}` : ''})`).join('\n')}
${context.farms.farms_has_more ? `\n... and ${context.farms.farms_count - context.farms.farms_recent.length} more farms` : ''}

Parcels: ${context.farms.parcels_count}
${context.farms.parcels_recent.map((p) => `- ${p.name}: ${p.crop}, ${p.area}${p.soil_type ? `, Soil: ${p.soil_type}` : ''}${p.irrigation_type ? `, Irrigation: ${p.irrigation_type}` : ''}`).join('\n')}
${context.farms.parcels_has_more ? `\n... and ${context.farms.parcels_count - context.farms.parcels_recent.length} more parcels` : ''}

Active Crop Cycles: ${context.farms.active_crop_cycles}
${context.farms.crop_cycles_recent && context.farms.crop_cycles_recent.length > 0 ? `
Crop Cycle Details:
${context.farms.crop_cycles_recent.map((cc) => `- ${cc.cycle_name} (${cc.crop_type}${cc.variety_name ? `, ${cc.variety_name}` : ''}): Status ${cc.status}, Planted ${cc.planting_date || 'N/A'}, Expected harvest ${cc.expected_harvest_start || 'N/A'} - ${cc.expected_harvest_end || 'N/A'}, Area: ${cc.planted_area_ha || 'N/A'} ha`).join('\n')}
${context.farms.crop_cycles_has_more ? `\n... and ${context.farms.crop_cycles_count ? context.farms.crop_cycles_count - context.farms.crop_cycles_recent.length : ''} more crop cycles` : ''}
` : ''}
Structures: ${context.farms.structures_count}
${context.farms.structures_recent.length > 0 ? `\n${context.farms.structures_recent.map((s) => `- ${s.name} (${s.type})`).join('\n')}` : ''}
${context.farms.structures_has_more ? `\n... and ${context.farms.structures_count - context.farms.structures_recent.length} more structures` : ''}
` : `⚠️ IMPORTANT: This organization has NO farm data registered yet (0 farms, 0 parcels).

**CRITICAL: Be CONCISE and DIRECT.**
- For simple queries like "list farms" or "list workers", answer directly: "You have 0 farms" or "No farms found"
- Don't write long paragraphs - keep it brief
- Only provide detailed explanations if the user explicitly asks for them
- Don't repeat the same information multiple times
- One sentence about how to add data is enough (e.g., "You can add farms through the Farm Management module")
- Answer the question first, then optionally offer help if relevant`}

====================================================
CAMPAIGNS
====================================================
${context.campaigns ? `
Total Campaigns: ${context.campaigns.campaigns_count}
Active Campaigns: ${context.campaigns.active_campaigns_count}
Planned Campaigns: ${context.campaigns.planned_campaigns_count}
${context.campaigns.campaigns_recent.length > 0 ? `
Recent Campaigns:
${context.campaigns.campaigns_recent.map((c) => `- ${c.name} (${c.type}, ${c.status}, ${c.priority}): ${c.start_date}${c.end_date ? ` → ${c.end_date}` : ''}`).join('\n')}
${context.campaigns.campaigns_has_more ? `\n... and ${context.campaigns.campaigns_count - context.campaigns.campaigns_recent.length} more campaigns` : ''}
` : 'No recent campaigns.'}
` : 'No campaign data available.'}

====================================================
RECEPTION BATCHES
====================================================
${context.receptionBatches ? `
Reception Batches: ${context.receptionBatches.batches_count}
${context.receptionBatches.recent_batches.length > 0 ? `
Recent Batches:
${context.receptionBatches.recent_batches.map((b) => `- ${b.batch_code} (${b.reception_date}): ${b.weight} ${b.weight_unit}, ${b.status}${b.quality_grade ? `, Grade ${b.quality_grade}` : ''}${b.parcel_name ? `, Parcel ${b.parcel_name}` : ''}${b.warehouse_name ? `, Warehouse ${b.warehouse_name}` : ''}`).join('\n')}
${context.receptionBatches.batches_has_more ? `\n... and ${context.receptionBatches.batches_count - context.receptionBatches.recent_batches.length} more batches` : ''}
` : 'No recent reception batches.'}
` : 'No reception batch data available.'}

====================================================
COMPLIANCE
====================================================
${context.compliance ? `
Certifications: ${context.compliance.certifications_count}
Active Certifications: ${context.compliance.active_certifications_count}
Expiring Soon (90d): ${context.compliance.expiring_certifications_count}
Non-compliant Checks: ${context.compliance.non_compliant_checks_count}
${context.compliance.certifications_recent.length > 0 ? `
Recent Certifications:
${context.compliance.certifications_recent.map((c) => `- ${c.certification_type} (${c.status}${c.expiry_date ? `, expires ${c.expiry_date}` : ''})`).join('\n')}
${context.compliance.certifications_has_more ? `\n... and ${context.compliance.certifications_count - context.compliance.certifications_recent.length} more certifications` : ''}
` : 'No recent certifications.'}
${context.compliance.recent_checks.length > 0 ? `
Recent Compliance Checks:
${context.compliance.recent_checks.map((c) => `- ${c.check_type} (${c.check_date}): ${c.status}${c.score !== undefined && c.score !== null ? `, score ${c.score}` : ''}${c.certification_type ? `, ${c.certification_type}` : ''}`).join('\n')}
${context.compliance.checks_has_more ? `\n... and ${context.compliance.checks_count - context.compliance.recent_checks.length} more checks` : ''}
` : 'No recent compliance checks.'}
` : 'No compliance data available.'}

====================================================
UTILITIES & EXPENSES
====================================================
${context.utilities ? `
Utility Bills: ${context.utilities.utilities_count}
Pending Bills: ${context.utilities.pending_utilities_count}
${context.utilities.utilities_recent.length > 0 ? `
Recent Utilities:
${context.utilities.utilities_recent.map((u) => `- ${u.type} (${u.billing_date}): ${u.amount}, ${u.payment_status}${u.provider ? `, ${u.provider}` : ''}${u.farm_name ? `, Farm ${u.farm_name}` : ''}${u.parcel_name ? `, Parcel ${u.parcel_name}` : ''}`).join('\n')}
${context.utilities.utilities_has_more ? `\n... and ${context.utilities.utilities_count - context.utilities.utilities_recent.length} more utility bills` : ''}
` : 'No recent utility bills.'}
` : 'No utilities data available.'}

====================================================
REPORTS
====================================================
${context.reports ? `
Reports: ${context.reports.reports_count}
Pending Reports: ${context.reports.pending_reports_count}
Failed Reports: ${context.reports.failed_reports_count}
${context.reports.reports_recent.length > 0 ? `
Recent Reports:
${context.reports.reports_recent.map((r) => `- ${r.title} (${r.status}, ${r.generated_at})${r.parcel_name ? `, Parcel ${r.parcel_name}` : ''}`).join('\n')}
${context.reports.reports_has_more ? `\n... and ${context.reports.reports_count - context.reports.reports_recent.length} more reports` : ''}
` : 'No recent reports.'}
` : 'No reports data available.'}

====================================================
MARKETPLACE
====================================================
${context.marketplace ? `
Listings: ${context.marketplace.listings_count} (Active: ${context.marketplace.active_listings_count})
Orders: ${context.marketplace.orders_count} (Pending: ${context.marketplace.pending_orders_count})
Quote Requests: ${context.marketplace.quote_requests_count}
${context.marketplace.listings_recent.length > 0 ? `
Recent Listings:
${context.marketplace.listings_recent.map((l) => `- ${l.title}: ${l.price} ${l.currency}, ${l.status}, Qty ${l.quantity_available}`).join('\n')}
${context.marketplace.listings_has_more ? `\n... and ${context.marketplace.listings_count - context.marketplace.listings_recent.length} more listings` : ''}
` : 'No recent listings.'}
${context.marketplace.orders_recent.length > 0 ? `
Recent Orders:
${context.marketplace.orders_recent.map((o) => `- ${o.id}: ${o.total_amount} ${o.currency}, ${o.status}, ${o.role}`).join('\n')}
${context.marketplace.orders_has_more ? `\n... and ${context.marketplace.orders_count - context.marketplace.orders_recent.length} more orders` : ''}
` : 'No recent orders.'}
${context.marketplace.quote_requests_recent.length > 0 ? `
Recent Quote Requests:
${context.marketplace.quote_requests_recent.map((q) => `- ${q.product_title}: ${q.status}, ${q.role}`).join('\n')}
${context.marketplace.quote_requests_has_more ? `\n... and ${context.marketplace.quote_requests_count - context.marketplace.quote_requests_recent.length} more quote requests` : ''}
` : 'No recent quote requests.'}
` : 'No marketplace data available.'}

====================================================
FRUIT TREES & ORCHARDS
====================================================
${context.orchards ? `
Orchard Assets: ${context.orchards.orchard_assets_count}
Tree Categories: ${context.orchards.tree_categories_count}
Trees: ${context.orchards.trees_count}
Pruning Tasks: ${context.orchards.pruning_tasks_count}
${context.orchards.orchard_assets_recent.length > 0 ? `
Recent Orchard Assets:
${context.orchards.orchard_assets_recent.map((a) => `- ${a.name} (${a.category}, ${a.status})${a.quantity ? `, Qty ${a.quantity}` : ''}${a.area_ha ? `, ${a.area_ha} ha` : ''}`).join('\n')}
${context.orchards.orchard_assets_has_more ? `\n... and ${context.orchards.orchard_assets_count - context.orchards.orchard_assets_recent.length} more orchard assets` : ''}
` : 'No orchard assets found.'}
${context.orchards.pruning_tasks_recent.length > 0 ? `
Pruning Tasks:
${context.orchards.pruning_tasks_recent.map((t) => `- ${t.title} (${t.status}${t.due_date ? `, due ${t.due_date}` : ''})`).join('\n')}
${context.orchards.pruning_tasks_has_more ? `\n... and ${context.orchards.pruning_tasks_count - context.orchards.pruning_tasks_recent.length} more pruning tasks` : ''}
` : 'No pruning tasks found.'}
` : 'No orchard data available.'}

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
` : 'Weather summary not available.'}

Weather Forecast (Next 5 Days):
${context.satelliteWeather.weather_forecast?.available && context.satelliteWeather.weather_forecast.parcels.length > 0 ? context.satelliteWeather.weather_forecast.parcels.map(p => `
**${p.parcel_name}** (Parcel ID: ${p.parcel_id}):
${p.forecasts.map((f, idx) => {
  const forecastDate = new Date(f.date);
  const today = new Date();
  const isTomorrow = forecastDate.toDateString() === new Date(today.getTime() + 24 * 60 * 60 * 1000).toDateString();
  const dayLabel = idx === 0 ? 'Today' : isTomorrow ? 'Tomorrow' : `Day ${idx + 1}`;
  return `  ${dayLabel} (${f.date}): ${f.temp.day}°C (${f.temp.min}-${f.temp.max}°C), ${f.description}, Precipitation: ${f.precipitation}mm${f.rainProbability !== undefined ? `, Rain probability: ${f.rainProbability}%` : ''}${f.humidity !== undefined ? `, Humidity: ${f.humidity}%` : ''}${f.windSpeed !== undefined ? `, Wind: ${f.windSpeed} km/h` : ''}`;
}).join('\n')}
`).join('\n') : 'Weather forecast not available. Make sure parcels have boundary coordinates configured and OpenWeatherMap API key is set.'}
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
${context.workers.workers_recent.map((w) => `- ${w.name} (${w.type})`).join('\n')}
${context.workers.workers_has_more ? `\n... and ${context.workers.workers_count - context.workers.workers_recent.length} more workers` : ''}

Pending Tasks: ${context.workers.pending_tasks_count}
${context.workers.tasks_recent.map((t) => `- ${t.title}: ${t.status}`).join('\n')}
${context.workers.tasks_has_more ? `\n... and ${context.workers.pending_tasks_count - context.workers.tasks_recent.length} more tasks` : ''}

Recent Work Records (last 30 days): ${context.workers.recent_work_records_count}
${context.workers.work_records_recent.length > 0 ? `\n${context.workers.work_records_recent.map((r) => `- ${r.work_date}: ${r.amount_paid} (${r.status})`).join('\n')}` : ''}
` : 'No workforce data available.'}

====================================================
ACCOUNTING DATA
====================================================
${context.accounting ? `
Chart of Accounts: ${context.accounting.accounts_count} accounts

Recent Invoices (last 90 days): ${context.accounting.recent_invoices_count}
${context.accounting.invoices_recent.map((i) => `- ${i.number} (${i.type}): ${i.status} - ${i.total} ${i.date}`).join('\n')}
${context.accounting.invoices_has_more ? `\n... and ${context.accounting.recent_invoices_count - context.accounting.invoices_recent.length} more invoices` : ''}

Recent Payments (last 30 days): ${context.accounting.recent_payments_count}
${context.accounting.payments_recent.map((p) => `- ${p.date}: ${p.amount} (${p.method})`).join('\n')}
${context.accounting.payments_has_more ? `\n... and ${context.accounting.recent_payments_count - context.accounting.payments_recent.length} more payments` : ''}

Fiscal Year: ${context.accounting.current_fiscal_year?.name || 'Not set'}

Financial Summary (Last 30 Days):
- Total Revenue: ${context.accounting.total_revenue_30d?.toFixed(2) || '0.00'} ${context.organization.currency}
- Total Expenses: ${context.accounting.total_expenses_30d?.toFixed(2) || '0.00'} ${context.organization.currency}
- Net Profit: ${((context.accounting.total_revenue_30d || 0) - (context.accounting.total_expenses_30d || 0)).toFixed(2)} ${context.organization.currency}
` : 'No accounting data available.'}

====================================================
INVENTORY DATA
====================================================
${context.inventory ? `
Total Items with Stock: ${context.inventory.items_count}
Total Inventory Value: ${context.inventory.total_inventory_value.toFixed(2)}

${context.inventory.low_stock_count > 0 ? `⚠️ LOW STOCK ALERT: ${context.inventory.low_stock_count} item(s) below minimum level!
${context.inventory.low_stock_items_recent.map((i) => `- ${i.name} (${i.code}): ${i.current_stock} ${i.unit} (MIN: ${i.minimum_level} ${i.unit}) - SHORTAGE: ${i.shortage.toFixed(2)} ${i.unit}`).join('\n')}
${context.inventory.low_stock_items_has_more ? `\n... and ${context.inventory.low_stock_count - context.inventory.low_stock_items_recent.length} more low stock items` : ''}
` : 'All items are at or above minimum stock levels.'}

Stock Levels by Item:
${context.inventory.items_recent.map((i) => `- ${i.name} (${i.code}): ${i.stock.toFixed(2)} ${i.unit}${i.minimum_stock_level ? ` (min: ${i.minimum_stock_level})` : ''}${i.is_low_stock ? ' ⚠️ LOW' : ''}${i.total_value ? ` - Value: ${i.total_value.toFixed(2)}` : ''}`).join('\n')}
${context.inventory.items_has_more ? `\n... and ${context.inventory.items_count - context.inventory.items_recent.length} more items` : ''}

Warehouses: ${context.inventory.warehouses_count}
${context.inventory.warehouses_recent.map((w) => `- ${w.name}${w.farm_name ? ` (Farm: ${w.farm_name})` : ''} - ${w.location}`).join('\n')}
${context.inventory.warehouses_has_more ? `\n... and ${context.inventory.warehouses_count - context.inventory.warehouses_recent.length} more warehouses` : ''}

Recent Stock Movements (last 30 days): ${context.inventory.recent_stock_movements_count}
` : 'No inventory data available.'}

====================================================
PRODUCTION DATA
====================================================
${context.production ? `
Recent Harvests (last 365 days): ${context.production.recent_harvests_count}
${context.production.harvests_recent.map((h) => `- ${h.date}: ${h.crop} - ${h.quantity} (Grade: ${h.quality}, Status: ${h.status})${h.parcel_name ? ` [${h.parcel_name}]` : ''}${h.lot_number ? ` Lot: ${h.lot_number}` : ''}`).join('\n')}
${context.production.harvests_has_more ? `\n... and ${context.production.recent_harvests_count - context.production.harvests_recent.length} more harvests` : ''}

Recent Quality Checks (last 90 days): ${context.production.recent_quality_checks_count}
Recent Deliveries (last 90 days): ${context.production.recent_deliveries_count}
` : 'No production data available.'}

====================================================
SUPPLIERS & CUSTOMERS DATA
====================================================
${context.suppliersCustomers ? `
Suppliers: ${context.suppliersCustomers.suppliers_count}
${context.suppliersCustomers.suppliers_recent.map((s) => `- ${s.name} (${s.type})`).join('\n')}
${context.suppliersCustomers.suppliers_has_more ? `\n... and ${context.suppliersCustomers.suppliers_count - context.suppliersCustomers.suppliers_recent.length} more` : ''}

Customers: ${context.suppliersCustomers.customers_count}
${context.suppliersCustomers.customers_recent.map((c) => `- ${c.name} (${c.type})`).join('\n')}
${context.suppliersCustomers.customers_has_more ? `\n... and ${context.suppliersCustomers.customers_count - context.suppliersCustomers.customers_recent.length} more` : ''}

Pending Sales Orders: ${context.suppliersCustomers.pending_sales_orders_count}
${context.suppliersCustomers.sales_orders_recent.map((o) => `- ${o.number}: ${o.total} (${o.status})`).join('\n')}
${context.suppliersCustomers.sales_orders_has_more ? `\n... and ${context.suppliersCustomers.pending_sales_orders_count - context.suppliersCustomers.sales_orders_recent.length} more sales orders` : ''}

Pending Purchase Orders: ${context.suppliersCustomers.pending_purchase_orders_count}
${context.suppliersCustomers.purchase_orders_recent.map((o) => `- ${o.number}: ${o.total} (${o.status})`).join('\n')}
${context.suppliersCustomers.purchase_orders_has_more ? `\n... and ${context.suppliersCustomers.pending_purchase_orders_count - context.suppliersCustomers.purchase_orders_recent.length} more purchase orders` : ''}
` : 'No supplier/customer data available.'}

====================================================
YOUR RESPONSE
====================================================
Based on the above context, current date (${context.currentDate}), season (${context.currentSeason}), and the user's question, provide a helpful, accurate response with expert agricultural insights. 

**CRITICAL INSTRUCTIONS:**
${(!context.farms || context.farms.farms_count === 0) ? `
⚠️ THIS USER HAS NO FARM DATA. You MUST:
1. **Answer directly and concisely first** - If they ask "list farms", say "You have 0 farms registered" or "No farms found"
2. **Don't write long paragraphs** - Keep responses brief unless they ask for details
3. **Don't repeat yourself** - If you've already explained something, don't explain it again
4. **Be helpful but concise** - One sentence about how to add data is enough (e.g., "You can add farms through the Farm Management module")
5. **Only provide detailed guidance if they explicitly ask for it** - Don't assume they want a full tutorial
6. Answer their questions directly - if they ask "list farms", list them (or say there are none), don't write an essay
` : `
When providing recommendations:
- Include priority level (high/medium/low), category, specific dosages/methods, timing guidance, and expected impact
- Consider the current season and phenological stages
- Interpret satellite indices in context of recent tasks, weather, and crop stage
- Reference specific data points (parcel names, dates, values)
- If data is missing, acknowledge it and provide general best practices
- For urgent issues (alerts, underperformance), prioritize actionable mitigation strategies
`}

**REMEMBER: Users want quick, direct answers. Be concise unless they ask for details.**`;
  }

  private summarizeContext(context: BuiltContext) {
    return {
      organization: context.organization.name,
      farms_count: context.farms?.farms_count || 0,
      parcels_count: context.farms?.parcels_count || 0,
      workers_count: context.workers?.workers_count || 0,
      pending_tasks: context.workers?.pending_tasks_count || 0,
      recent_invoices: context.accounting?.recent_invoices_count || 0,
      inventory_items: context.inventory?.items_count || 0,
      recent_harvests: context.production?.recent_harvests_count || 0,
      campaigns: context.campaigns?.campaigns_count || 0,
      reception_batches: context.receptionBatches?.batches_count || 0,
      certifications: context.compliance?.certifications_count || 0,
      utilities: context.utilities?.utilities_count || 0,
      reports: context.reports?.reports_count || 0,
      marketplace_listings: context.marketplace?.listings_count || 0,
      orchards: context.orchards?.orchard_assets_count || 0,
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

  /**
   * Convert text to speech using Z.ai TTS
   */
  async textToSpeech(
    organizationId: string,
    request: TTSRequest,
  ): Promise<{ audio: Buffer; contentType: string }> {
    // Get Z.ai API key from organization settings or environment
    const apiKey = this.configService.get<string>('ZAI_API_KEY', '');
    this.zaiTTSProvider.setApiKey(apiKey);

    const ttsResponse = await this.zaiTTSProvider.textToSpeech(request);

    return {
      audio: ttsResponse.audio,
      contentType: ttsResponse.contentType,
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
