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
  data: BuiltContext;
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
  private readonly contextCache = new Map<string, CachedContext>();
  private readonly responseCache = new Map<string, CachedResponse>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds
  private readonly RESPONSE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly configService: ConfigService,
    private readonly ttsProvider: ZaiTTSProvider,
    private readonly weatherProvider: WeatherProvider,
  ) {
    this.zaiProvider = new ZaiProvider(configService);
    this.zaiTTSProvider = ttsProvider;
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
     const cached = this.contextCache.get(organizationId);
     if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
       this.logger.log(`Cache HIT for org ${organizationId}`);
       return cached.data;
     }

     this.logger.log(`Cache MISS for org ${organizationId}`);
     const context = await this.buildOrganizationContextUncached(organizationId, query);

     this.contextCache.set(organizationId, {
       data: context,
       timestamp: Date.now(),
     });

     return context;
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
       satelliteWeatherContext,
       soilAnalysisContext,
       productionIntelligenceContext,
     ] = await Promise.all([
       this.getOrganizationContext(client, organizationId),
       // Always load farm context - it's needed for basic queries
       this.getFarmContext(client, organizationId).catch(err => {
         this.logger.error(`Failed to load farm context: ${err.message}`, err.stack);
         return null;
       }),
       // Always load worker context - it's needed for basic queries
       this.getWorkerContext(client, organizationId).catch(err => {
         this.logger.error(`Failed to load worker context: ${err.message}`, err.stack);
         return null;
       }),
       contextNeeds.accounting
         ? this.getAccountingContext(client, organizationId).catch(err => {
             this.logger.warn(`Failed to load accounting context: ${err.message}`);
             return null;
           })
         : Promise.resolve(null),
       contextNeeds.inventory
         ? this.getInventoryContext(client, organizationId).catch(err => {
             this.logger.warn(`Failed to load inventory context: ${err.message}`);
             return null;
           })
         : Promise.resolve(null),
       contextNeeds.production
         ? this.getProductionContext(client, organizationId).catch(err => {
             this.logger.warn(`Failed to load production context: ${err.message}`);
             return null;
           })
         : Promise.resolve(null),
       contextNeeds.supplierCustomer
         ? this.getSupplierCustomerContext(client, organizationId).catch(err => {
             this.logger.warn(`Failed to load supplier/customer context: ${err.message}`);
             return null;
           })
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
       satelliteWeather: satelliteWeatherContext,
       soilAnalysis: soilAnalysisContext,
       productionIntelligence: productionIntelligenceContext,
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
     
     const contextNeeds = {
       farm: true, // Always load - most queries need this
       worker: true, // Always load - most queries need this
       accounting: /invoice|payment|expense|revenue|profit|cost|fiscal|tax|accounting|financial|budget|journal|account|facture|paiement|dépense|revenu|coût|comptabilité|financier|فاتورة|دفعة|مصروف|إيراد|تكلفة|محاسبة|مالي/.test(lowerQuery),
       inventory: /stock|inventory|warehouse|item|product|material|reception|supply|inventaire|entrepôt|article|produit|matériel|approvisionnement|مخزون|مستودع|منتج|مادة/.test(lowerQuery),
       production: /harvest|yield|production|quality|delivery|crop cycle|récolte|rendement|contrôle qualité|livraison|cycle de culture|حصاد|محصول|إنتاج|مراقبة الجودة|تسليم/.test(lowerQuery),
       supplierCustomer: /supplier|customer|vendor|client|order|quote|purchase|sale|fournisseur|client|commande|devis|achat|vente|مورد|عميل|طلب|عرض أسعار|شراء|بيع/.test(lowerQuery),
       satellite: /satellite|ndvi|ndmi|ndre|gci|savi|vegetation|remote sensing|imagery|indice de végétation|télédétection|imagerie|قمر صناعي|مؤشر الغطاء النباتي|الاستشعار عن بعد/.test(lowerQuery),
       weather: /weather|forecast|temperature|rain|precipitation|climate|frost|storm|humidity|wind|météo|prévision|température|pluie|climat|gel|tempête|humidité|vent|طقس|توقعات|درجة الحرارة|مطر|مناخ|صقيع|عاصفة|رطوبة|رياح/.test(lowerQuery),
       soil: /soil|nutrient|fertilizer|ph|organic matter|texture|soil analysis|sol|nutriment|engrais|matière organique|analyse du sol|تربة|مغذيات|سماد|مادة عضوية|تحليل التربة/.test(lowerQuery),
       alerts: /alert|warning|problem|issue|underperforming|critical|deviation|alerte|avertissement|problème|critique|déviation|تنبيه|تحذير|مشكلة|حرج|انحراف/.test(lowerQuery),
       forecast: /forecast|prediction|expected|upcoming|yield forecast|benchmark|prévision|prédiction|attendu|à venir|référence|توقعات|تنبؤ|متوقع|قادم|معيار/.test(lowerQuery),
     };

     // Log routing decision for debugging
     this.logger.log(
       `Context routing (keyword-based): farm=${contextNeeds.farm}, worker=${contextNeeds.worker}, ` +
       `accounting=${contextNeeds.accounting}, inventory=${contextNeeds.inventory}, ` +
       `production=${contextNeeds.production}, supplierCustomer=${contextNeeds.supplierCustomer}, ` +
       `satellite=${contextNeeds.satellite}, weather=${contextNeeds.weather}, ` +
       `soil=${contextNeeds.soil}, alerts=${contextNeeds.alerts}, forecast=${contextNeeds.forecast}`
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
          satellite: parsed.satellite === true,
          weather: parsed.weather === true,
          soil: parsed.soil === true,
          alerts: parsed.alerts === true,
          forecast: parsed.forecast === true,
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
        satellite: false,
        weather: false,
        soil: false,
        alerts: false,
        forecast: false,
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
        satellite: false,
        weather: false,
        soil: false,
        alerts: false,
        forecast: false,
      };
    }
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
      // Get farms - include all farms, not just active ones
      const { data: farms, error: farmsError } = await client
        .from('farms')
        .select('id, name, location, size, size_unit, is_active, status')
        .eq('organization_id', organizationId);
      
      if (farmsError) {
        this.logger.error(`Error fetching farms: ${farmsError.message}`);
      }

       // Get parcels summary with soil and irrigation info - limit to 20 most recent
       // Reduced from 50 to 20 to optimize prompt size and reduce AI processing time
       const { data: parcels, error: parcelsError } = await client
         .from('parcels')
         .select('id, name, area, area_unit, crop_type, farm_id, soil_type, irrigation_type')
         .eq('organization_id', organizationId)
         .limit(20);
      
      if (parcelsError) {
        this.logger.error(`Error fetching parcels: ${parcelsError.message}`);
      }

       // Get crop cycles with detailed information - limit to 10 most recent
       // Reduced from 20 to 10 to optimize prompt size and reduce AI processing time
       const { data: cropCycles, error: cropCyclesError } = await client
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
         .order('planting_date', { ascending: false })
         .limit(10);
      
      if (cropCyclesError) {
        this.logger.error(`Error fetching crop cycles: ${cropCyclesError.message}`);
      }

       // Get structures - limit to 10 most recent
       // Reduced from 20 to 10 to optimize prompt size and reduce AI processing time
       const { data: structures, error: structuresError } = await client
         .from('structures')
         .select('*')
         .eq('organization_id', organizationId)
         .limit(10);
      
      if (structuresError) {
        this.logger.error(`Error fetching structures: ${structuresError.message}`);
      }

      this.logger.log(`Loaded farm context: ${farms?.length || 0} farms, ${parcels?.length || 0} parcels, ${cropCycles?.length || 0} crop cycles`);

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
        active_crop_cycles: cropCycles?.filter((cc: any) => cc.status === 'active' || cc.status === 'planned').length || 0,
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
    } catch (error) {
      this.logger.error(`Error in getFarmContext: ${error.message}`, error.stack);
      // Return empty context instead of failing
      return {
        farms_count: 0,
        farms: [],
        parcels_count: 0,
        parcels: [],
        active_crop_cycles: 0,
        crop_cycles: [],
        structures_count: 0,
      };
    }
  }

  private async getWorkerContext(
    client: any,
    organizationId: string,
  ): Promise<WorkerContext> {
    try {
       // Get all workers, not just active ones - limit to 10 most recent
       // Reduced from 50 to 10 to optimize prompt size and reduce AI processing time
       const { data: workers, error: workersError } = await client
         .from('workers')
         .select('id, first_name, last_name, worker_type, is_active, farm_id')
         .eq('organization_id', organizationId)
         .limit(10);
      
      if (workersError) {
        this.logger.error(`Error fetching workers: ${workersError.message}`);
      }

       const { data: tasks, error: tasksError } = await client
         .from('tasks')
         .select('id, title, status, task_type, priority')
         .eq('organization_id', organizationId)
         .in('status', ['pending', 'assigned', 'in_progress'])
         .limit(10); // Reduced from 50 to 10 to optimize prompt size
      
      if (tasksError) {
        this.logger.error(`Error fetching tasks: ${tasksError.message}`);
      }

       const { data: workRecords, error: workRecordsError } = await client
         .from('work_records')
         .select('id, work_date, amount_paid, payment_status')
         .eq('organization_id', organizationId)
         .gte(
           'work_date',
           new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
         )
         .limit(10); // Reduced from 50 to 10 to optimize prompt size
      
      if (workRecordsError) {
        this.logger.error(`Error fetching work records: ${workRecordsError.message}`);
      }

      this.logger.log(`Loaded worker context: ${workers?.length || 0} workers, ${tasks?.length || 0} tasks`);

      return {
        active_workers_count: workers?.filter((w: any) => w.is_active).length || 0,
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
    } catch (error) {
      this.logger.error(`Error in getWorkerContext: ${error.message}`, error.stack);
      // Return empty context instead of failing
      return {
        active_workers_count: 0,
        workers: [],
        pending_tasks_count: 0,
        tasks: [],
        recent_work_records_count: 0,
      };
    }
  }

  private async getAccountingContext(
    client: any,
    organizationId: string,
  ): Promise<AccountingContext> {
    try {
       // Get chart of accounts summary - limit to 10 most recent
       // Reduced from 50 to 10 to optimize prompt size and reduce AI processing time
       const { data: accounts, error: accountsError } = await client
         .from('accounts')
         .select('id, name, account_type')
         .eq('organization_id', organizationId)
         .limit(10);
      
      if (accountsError) {
        this.logger.error(`Error fetching accounts: ${accountsError.message}`);
      }

       // Get recent invoices - limit to 10 most recent
       // Reduced from 30 to 10 to optimize prompt size and reduce AI processing time
       const { data: invoices, error: invoicesError } = await client
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
         .limit(10);
      
      if (invoicesError) {
        this.logger.error(`Error fetching invoices: ${invoicesError.message}`);
      }

       // Get recent payments - limit to 10 most recent
       // Reduced from 20 to 10 to optimize prompt size and reduce AI processing time
       const { data: payments, error: paymentsError } = await client
         .from('accounting_payments')
         .select('id, payment_date, amount, payment_method, status')
         .eq('organization_id', organizationId)
         .gte(
           'payment_date',
           new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
         )
         .order('payment_date', { ascending: false })
         .limit(10);
      
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

      this.logger.log(`Loaded accounting context: ${accounts?.length || 0} accounts, ${invoices?.length || 0} invoices, ${payments?.length || 0} payments`);

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
    } catch (error) {
      this.logger.error(`Error in getAccountingContext: ${error.message}`, error.stack);
      return {
        accounts_count: 0,
        accounts: [],
        recent_invoices_count: 0,
        invoices: [],
        recent_payments_count: 0,
        payments: [],
        current_fiscal_year: null,
      };
    }
  }

  private async getInventoryContext(
    client: any,
    organizationId: string,
  ): Promise<InventoryContext> {
    try {
       // Get all items, not just active ones - limit to 10 most recent
       // Reduced from 50 to 10 to optimize prompt size and reduce AI processing time
       const { data: items, error: itemsError } = await client
         .from('items')
         .select('id, item_name, item_code, default_unit')
         .eq('organization_id', organizationId)
         .limit(10);
      
      if (itemsError) {
        this.logger.error(`Error fetching items: ${itemsError.message}`);
      }

      // Get all warehouses, not just active ones
      const { data: warehouses, error: warehousesError } = await client
        .from('warehouses')
        .select('*')
        .eq('organization_id', organizationId);
      
      if (warehousesError) {
        this.logger.error(`Error fetching warehouses: ${warehousesError.message}`);
      }

       const { data: stockEntries, error: stockEntriesError } = await client
         .from('stock_entries')
         .select('id, entry_type, entry_date')
         .eq('organization_id', organizationId)
         .gte(
           'entry_date',
           new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
         )
         .order('entry_date', { ascending: false })
         .limit(10); // Reduced from 20 to 10 to optimize prompt size
      
      if (stockEntriesError) {
        this.logger.error(`Error fetching stock entries: ${stockEntriesError.message}`);
      }

      this.logger.log(`Loaded inventory context: ${items?.length || 0} items, ${warehouses?.length || 0} warehouses`);

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
    } catch (error) {
      this.logger.error(`Error in getInventoryContext: ${error.message}`, error.stack);
      return {
        items_count: 0,
        items: [],
        warehouses_count: 0,
        warehouses: [],
        recent_stock_movements_count: 0,
      };
    }
  }

  private async getProductionContext(
    client: any,
    organizationId: string,
  ): Promise<ProductionContext> {
    try {
       const { data: harvests, error: harvestsError } = await client
         .from('harvest_records')
         .select('id, harvest_date, quantity, unit, quality_grade, status')
         .eq('organization_id', organizationId)
         .gte(
           'harvest_date',
           new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
         )
         .order('harvest_date', { ascending: false })
         .limit(10); // Reduced from 30 to 10 to optimize prompt size
      
      if (harvestsError) {
        this.logger.error(`Error fetching harvests: ${harvestsError.message}`);
      }

       const { data: qualityChecks, error: qualityChecksError } = await client
         .from('quality_inspections')
         .select('*')
         .eq('organization_id', organizationId)
         .gte(
           'inspection_date',
           new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
         )
         .order('inspection_date', { ascending: false })
         .limit(10); // Reduced from 20 to 10 to optimize prompt size
      
      if (qualityChecksError) {
        this.logger.error(`Error fetching quality checks: ${qualityChecksError.message}`);
      }

       const { data: deliveries, error: deliveriesError } = await client
         .from('deliveries')
         .select('*')
         .eq('organization_id', organizationId)
         .gte(
           'delivery_date',
           new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
         )
         .order('delivery_date', { ascending: false })
         .limit(10); // Reduced from 20 to 10 to optimize prompt size
      
      if (deliveriesError) {
        this.logger.error(`Error fetching deliveries: ${deliveriesError.message}`);
      }

      this.logger.log(`Loaded production context: ${harvests?.length || 0} harvests, ${qualityChecks?.length || 0} quality checks, ${deliveries?.length || 0} deliveries`);

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
    } catch (error) {
      this.logger.error(`Error in getProductionContext: ${error.message}`, error.stack);
      return {
        recent_harvests_count: 0,
        harvests: [],
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
       // Get all suppliers, not just active ones - limit to 10 most recent
       // Reduced from 30 to 10 to optimize prompt size and reduce AI processing time
       const { data: suppliers, error: suppliersError } = await client
         .from('suppliers')
         .select('id, name, supplier_type, is_active')
         .eq('organization_id', organizationId)
         .limit(10);
      
      if (suppliersError) {
        this.logger.error(`Error fetching suppliers: ${suppliersError.message}`);
      }

       // Get all customers, not just active ones - limit to 10 most recent
       // Reduced from 30 to 10 to optimize prompt size and reduce AI processing time
       const { data: customers, error: customersError } = await client
         .from('customers')
         .select('id, name, customer_type, is_active')
         .eq('organization_id', organizationId)
         .limit(10);
      
      if (customersError) {
        this.logger.error(`Error fetching customers: ${customersError.message}`);
      }

       const { data: salesOrders, error: salesOrdersError } = await client
         .from('sales_orders')
         .select('id, order_number, order_date, total_amount, status')
         .eq('organization_id', organizationId)
         .in('status', ['draft', 'confirmed', 'partial'])
         .order('order_date', { ascending: false })
         .limit(10); // Reduced from 20 to 10 to optimize prompt size
      
      if (salesOrdersError) {
        this.logger.error(`Error fetching sales orders: ${salesOrdersError.message}`);
      }

       const { data: purchaseOrders, error: purchaseOrdersError } = await client
         .from('purchase_orders')
         .select('id, order_number, order_date, total_amount, status')
         .eq('organization_id', organizationId)
         .in('status', ['draft', 'confirmed', 'partial'])
         .order('order_date', { ascending: false })
         .limit(10); // Reduced from 20 to 10 to optimize prompt size
      
      if (purchaseOrdersError) {
        this.logger.error(`Error fetching purchase orders: ${purchaseOrdersError.message}`);
      }

      this.logger.log(`Loaded supplier/customer context: ${suppliers?.length || 0} suppliers, ${customers?.length || 0} customers`);

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
    } catch (error) {
      this.logger.error(`Error in getSupplierCustomerContext: ${error.message}`, error.stack);
      return {
        suppliers_count: 0,
        suppliers: [],
        customers_count: 0,
        customers: [],
        pending_sales_orders_count: 0,
        sales_orders: [],
        pending_purchase_orders_count: 0,
        purchase_orders: [],
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
- **Remember: Users want quick answers, not long explanations unless they specifically ask for details**`;
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

====================================================
FARM DATA
====================================================
${context.farms && context.farms.farms_count > 0 ? `
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
` : `⚠️ IMPORTANT: This organization has NO farm data registered yet (0 farms, 0 parcels).

**CRITICAL: Be CONCISE and DIRECT.**
- For simple queries like "list farms" or "list workers", answer directly: "You have 0 farms" or "No farms found"
- Don't write long paragraphs - keep it brief
- Only provide detailed explanations if the user explicitly asks for them
- Don't repeat the same information multiple times
- One sentence about how to add data is enough (e.g., "You can add farms through the Farm Management module")
- Answer the question first, then optionally offer help if relevant`}

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
