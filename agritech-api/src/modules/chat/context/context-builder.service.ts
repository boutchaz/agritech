import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { MatchedModule } from './context-router.service';
import { SemanticContextRouterService } from './semantic-context-router.service';
import { WeatherProvider, WeatherForecast } from '../providers/weather.provider';
import { AgromindiaContextService, AgromindiaParcelContext } from './agromindia-context.service';

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

export { AgromindiaParcelContext } from './agromindia-context.service';

/** Which context modules the router requested for this query (prompt hints). */
export interface ContextRoutingFlags {
  weather: boolean;
  satellite: boolean;
}

export interface BuiltContext {
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
  agromindiaIntel?: AgromindiaParcelContext[] | null;
  /** Populated so the prompt can distinguish weather vs satellite-only routing. */
  contextRouting?: ContextRoutingFlags;
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
    /** Why forecast rows may be missing — keeps the LLM from blaming "no coordinates" incorrectly. */
    diagnostics?: {
      openweather_configured: boolean;
      parcels_loaded: number;
      parcels_resolved_location: number;
      forecasts_returned: number;
    };
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


@Injectable()
export class ContextBuilderService {
  private readonly logger = new Logger(ContextBuilderService.name);
  private readonly SUMMARY_LIMIT = 3;
  private readonly DEEP_LIMIT = 10;

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly contextRouter: SemanticContextRouterService,
    private weatherProvider?: WeatherProvider,
  ) {}

  private agromindiaContextService?: AgromindiaContextService;

  setWeatherProvider(provider: WeatherProvider) {
    this.weatherProvider = provider;
  }

  setAgromindiaContextService(service: AgromindiaContextService) {
    this.agromindiaContextService = service;
  }

   async build(
     organizationId: string,
     query: string,
   ): Promise<BuiltContext> {
    return this.buildUncached(organizationId, query);
   }

    async buildUncached(
      organizationId: string,
      query: string,
    ): Promise<BuiltContext> {
      const client = this.databaseService.getAdminClient();

      const contextNeeds = await this.contextRouter.analyzeQuery(query);
      const topModules = this.contextRouter
        .getMatchedModules()
        .slice(0, 2)
        .map((module) => module.key);

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
          ? this.getAccountingContext(client, organizationId, topModules).catch(err => {
              this.logger.warn(`Failed to load accounting context: ${err.message}`);
              return null;
            })
         : Promise.resolve(null),
        contextNeeds.inventory
          ? this.getInventoryContext(client, organizationId, topModules).catch(err => {
              this.logger.warn(`Failed to load inventory context: ${err.message}`);
              return null;
            })
         : Promise.resolve(null),
        contextNeeds.production
          ? this.getProductionContext(client, organizationId, topModules).catch(err => {
              this.logger.warn(`Failed to load production context: ${err.message}`);
              return null;
            })
         : Promise.resolve(null),
        contextNeeds.supplierCustomer
          ? this.getSupplierCustomerContext(client, organizationId, topModules).catch(err => {
              this.logger.warn(`Failed to load supplier/customer context: ${err.message}`);
              return null;
            })
         : Promise.resolve(null),
        contextNeeds.campaigns
          ? this.getCampaignsContext(client, organizationId, topModules).catch(err => {
              this.logger.warn(`Failed to load campaigns context: ${err.message}`);
              return null;
            })
         : Promise.resolve(null),
        contextNeeds.reception
          ? this.getReceptionBatchesContext(client, organizationId, topModules).catch(err => {
              this.logger.warn(`Failed to load reception batches context: ${err.message}`);
              return null;
            })
         : Promise.resolve(null),
        contextNeeds.compliance
          ? this.getComplianceContext(client, organizationId, topModules).catch(err => {
              this.logger.warn(`Failed to load compliance context: ${err.message}`);
              return null;
            })
         : Promise.resolve(null),
        contextNeeds.utilities
          ? this.getUtilitiesContext(client, organizationId, topModules).catch(err => {
              this.logger.warn(`Failed to load utilities context: ${err.message}`);
              return null;
            })
         : Promise.resolve(null),
        contextNeeds.reports
          ? this.getReportsContext(client, organizationId, topModules).catch(err => {
              this.logger.warn(`Failed to load reports context: ${err.message}`);
              return null;
            })
         : Promise.resolve(null),
        contextNeeds.marketplace
          ? this.getMarketplaceContext(client, organizationId, topModules).catch(err => {
              this.logger.warn(`Failed to load marketplace context: ${err.message}`);
              return null;
            })
         : Promise.resolve(null),
        contextNeeds.orchards
          ? this.getOrchardContext(client, organizationId, topModules).catch(err => {
              this.logger.warn(`Failed to load orchards context: ${err.message}`);
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
       contextNeeds.settings
         ? this.getSettingsContext(client, organizationId).catch(err => {
             this.logger.warn(`Failed to load settings context: ${err.message}`);
             return null;
           })
         : Promise.resolve(null),
     ]);

     // Log what was loaded for debugging
     this.logger.log(`Context loaded - Farms: ${farmContext?.farms_count || 0}, Workers: ${workerContext?.active_workers_count || 0}, Parcels: ${farmContext?.parcels_count || 0}`);

     // Fetch AgromindIA intelligence if needed and service is available
     let agromindiaIntel: AgromindiaParcelContext[] | null = null;
     if (contextNeeds.agromindiaIntel && this.agromindiaContextService) {
       try {
         agromindiaIntel = await this.agromindiaContextService.getOrgIntelligence(organizationId);
         this.logger.log(`AgromindIA intelligence loaded for ${agromindiaIntel?.length || 0} parcels`);
       } catch (err) {
         this.logger.warn(`Failed to load AgromindIA intelligence: ${err.message}`);
         agromindiaIntel = null;
       }
     }

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
       agromindiaIntel,
       contextRouting: {
         weather: contextNeeds.weather,
         satellite: contextNeeds.satellite,
       },
     };
   }

   /**
    * Analyze query context using simple keyword-based routing
    * Fast, deterministic, no AI calls - replaces analyzeQueryContextWithAI
    * Supports multilingual keywords (English, French, Arabic)
    * Farm and worker contexts are ALWAYS loaded (most common queries)
    */
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

  private getLimitForModule(
    moduleName: MatchedModule['key'],
    topModules: MatchedModule['key'][],
  ): number {
    return topModules.includes(moduleName) ? this.DEEP_LIMIT : this.SUMMARY_LIMIT;
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
    topModules: MatchedModule['key'][],
  ): Promise<AccountingContext> {
    try {
       const limit = this.getLimitForModule('accounting', topModules);
        // Get chart of accounts summary
        const { data: accounts, error: accountsError, count: accountsCount } = await client
         .from('accounts')
          .select('id, name, account_type, created_at', { count: 'exact' })
          .eq('organization_id', organizationId)
          .order('created_at', { ascending: false })
          .limit(limit);
      
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
          .limit(limit);
      
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
          .limit(limit);
      
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
    topModules: MatchedModule['key'][],
  ): Promise<InventoryContext> {
    try {
      const limit = this.getLimitForModule('inventory', topModules);
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
        items_recent: items.slice(0, limit),
        items_has_more: items.length > limit,
        warehouses_count: warehousesList.length,
        warehouses_recent:
          warehousesList.slice(0, limit).map((w: any) => ({
            id: w.id,
            name: w.name,
            location: w.location || 'N/A',
            farm_name: w.farm?.name,
          })),
        warehouses_has_more: warehousesList.length > limit,
        recent_stock_movements_count: stockEntries?.length || 0,
        low_stock_count: lowStockItems.length,
        low_stock_items_recent: lowStockItems.slice(0, limit),
        low_stock_items_has_more: lowStockItems.length > limit,
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
    topModules: MatchedModule['key'][],
  ): Promise<ProductionContext> {
    try {
      const limit = this.getLimitForModule('production', topModules);
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
        .limit(limit);

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
    topModules: MatchedModule['key'][],
  ): Promise<SupplierCustomerContext> {
    try {
       const limit = this.getLimitForModule('supplierCustomer', topModules);
        // Get all suppliers, not just active ones (summary)
       const { data: suppliers, error: suppliersError, count: suppliersCount } = await client
         .from('suppliers')
          .select('id, name, supplier_type, is_active, created_at', { count: 'exact' })
          .eq('organization_id', organizationId)
          .order('created_at', { ascending: false })
          .limit(limit);
      
      if (suppliersError) {
        this.logger.error(`Error fetching suppliers: ${suppliersError.message}`);
      }

       // Get all customers, not just active ones (summary)
       const { data: customers, error: customersError, count: customersCount } = await client
         .from('customers')
          .select('id, name, customer_type, is_active, created_at', { count: 'exact' })
          .eq('organization_id', organizationId)
          .order('created_at', { ascending: false })
          .limit(limit);
      
      if (customersError) {
        this.logger.error(`Error fetching customers: ${customersError.message}`);
      }

       const { data: salesOrders, error: salesOrdersError, count: salesOrdersCount } = await client
         .from('sales_orders')
         .select('id, order_number, order_date, total_amount, status', { count: 'exact' })
          .eq('organization_id', organizationId)
          .in('status', ['draft', 'confirmed', 'partial'])
          .order('order_date', { ascending: false })
          .limit(limit);
      
      if (salesOrdersError) {
        this.logger.error(`Error fetching sales orders: ${salesOrdersError.message}`);
      }

       const { data: purchaseOrders, error: purchaseOrdersError, count: purchaseOrdersCount } = await client
         .from('purchase_orders')
         .select('id, order_number, order_date, total_amount, status', { count: 'exact' })
          .eq('organization_id', organizationId)
          .in('status', ['draft', 'confirmed', 'partial'])
          .order('order_date', { ascending: false })
          .limit(limit);
      
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
    topModules: MatchedModule['key'][],
  ): Promise<CampaignsContext> {
    try {
      const limit = this.getLimitForModule('campaigns', topModules);
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
        .limit(limit);

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
    topModules: MatchedModule['key'][],
  ): Promise<ReceptionBatchesContext> {
    try {
      const limit = this.getLimitForModule('reception', topModules);
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
        .limit(limit);

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
    topModules: MatchedModule['key'][],
  ): Promise<ComplianceContext> {
    try {
      const limit = this.getLimitForModule('compliance', topModules);
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
        .limit(limit);

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
        .limit(limit);

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
    topModules: MatchedModule['key'][],
  ): Promise<UtilitiesContext> {
    try {
      const limit = this.getLimitForModule('utilities', topModules);
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
        .limit(limit);

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
    topModules: MatchedModule['key'][],
  ): Promise<ReportsContext> {
    try {
      const limit = this.getLimitForModule('reports', topModules);
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
        .limit(limit);

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
    topModules: MatchedModule['key'][],
  ): Promise<MarketplaceContext> {
    try {
      const limit = this.getLimitForModule('marketplace', topModules);
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
        .limit(limit);

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
        .limit(limit);

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
        .limit(limit);

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
    topModules: MatchedModule['key'][],
  ): Promise<OrchardContext> {
    try {
      const limit = this.getLimitForModule('orchards', topModules);
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
        .limit(limit);

      if (orchardAssetsError) {
        this.logger.error(`Error fetching orchard assets: ${orchardAssetsError.message}`);
      }

      const { data: pruningTasks, error: pruningTasksListError, count: pruningTasksTotalCount } = await client
        .from('tasks')
        .select('id, title, status, due_date', { count: 'exact' })
        .eq('organization_id', organizationId)
        .eq('task_type', 'pruning')
        .order('due_date', { ascending: true })
        .limit(limit);

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
          diagnostics: {
            openweather_configured: this.weatherProvider?.isConfigured() ?? false,
            parcels_loaded: 0,
            parcels_resolved_location: 0,
            forecasts_returned: 0,
          },
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
      diagnostics: {
        openweather_configured: this.weatherProvider?.isConfigured() ?? false,
        parcels_loaded: parcels.length,
        parcels_resolved_location: 0,
        forecasts_returned: 0,
      },
    };

    const postgisPoints = await this.fetchPostgisParcelCentroids(organizationId, parcelIds);
    const { data: aoiRows } = await client
      .from('satellite_aois')
      .select('parcel_id, geometry_json, updated_at')
      .eq('organization_id', organizationId)
      .in('parcel_id', parcelIds)
      .eq('is_active', true);

    const aoiGeometryByParcel = new Map<string, unknown>();
    const sortedAois = [...(aoiRows || [])].sort(
      (a: { updated_at?: string }, b: { updated_at?: string }) =>
        new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime(),
    );
    for (const row of sortedAois) {
      const pid = row.parcel_id as string;
      if (pid && !aoiGeometryByParcel.has(pid)) {
        aoiGeometryByParcel.set(pid, row.geometry_json);
      }
    }

    const resolveForecastPoint = (parcel: any): { latitude: number; longitude: number } | null => {
      const boundaryRaw =
        typeof parcel.boundary === 'string'
          ? (() => {
              try {
                return JSON.parse(parcel.boundary);
              } catch {
                return null;
              }
            })()
          : parcel.boundary;

      const fromBoundary = this.normalizeParcelBoundaryCoordinates(boundaryRaw);
      if (fromBoundary?.length) {
        const wgs84 = WeatherProvider.ensureWGS84(fromBoundary);
        return WeatherProvider.calculateCentroid(wgs84);
      }

      const pg = postgisPoints.get(parcel.id);
      if (pg) {
        return { latitude: pg.lat, longitude: pg.lng };
      }

      const aoiGeom = aoiGeometryByParcel.get(parcel.id);
      const fromAoi = this.normalizeParcelBoundaryCoordinates(aoiGeom);
      if (fromAoi?.length) {
        const wgs84 = WeatherProvider.ensureWGS84(fromAoi);
        return WeatherProvider.calculateCentroid(wgs84);
      }

      return null;
    };

    let resolvedCount = 0;
    for (const p of parcels) {
      if (resolveForecastPoint(p)) {
        resolvedCount += 1;
      }
    }
    weatherForecast.diagnostics.parcels_resolved_location = resolvedCount;

    const wp = this.weatherProvider;
    if (wp?.isConfigured()) {
      try {
        const forecastPromises = parcels.map(async (parcel: any) => {
          try {
            const point = resolveForecastPoint(parcel);
            if (!point) {
              return null;
            }

            const forecastData = await wp.getForecast(point.latitude, point.longitude, 5);

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
        const ok = forecastResults.filter(Boolean) as Array<{
          parcel_id: string;
          parcel_name: string;
          forecasts: WeatherForecast[];
        }>;
        weatherForecast = {
          parcels: ok,
          available: ok.length > 0,
          diagnostics: {
            ...weatherForecast.diagnostics,
            forecasts_returned: ok.length,
          },
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

  /**
   * Turn parcel.boundary JSONB, GeoJSON, AOI geometry_json, etc. into [lng, lat][] for centroid/weather.
   */
  private normalizeParcelBoundaryCoordinates(raw: unknown): number[][] | null {
    if (raw == null) {
      return null;
    }
    if (typeof raw === 'string') {
      try {
        return this.normalizeParcelBoundaryCoordinates(JSON.parse(raw));
      } catch {
        return null;
      }
    }
    if (typeof raw === 'object' && raw !== null && !Array.isArray(raw)) {
      const o = raw as Record<string, unknown>;
      if (o.type === 'Feature' && o.geometry) {
        return this.normalizeParcelBoundaryCoordinates(o.geometry);
      }
      if (o.type === 'Point' && Array.isArray(o.coordinates)) {
        const c = o.coordinates as number[];
        if (c.length >= 2 && typeof c[0] === 'number' && typeof c[1] === 'number') {
          return [[c[0], c[1]]];
        }
        return null;
      }
      if (o.type === 'Polygon' && Array.isArray(o.coordinates)) {
        const ring = (o.coordinates as number[][][])[0];
        if (!Array.isArray(ring) || ring.length < 1) {
          return null;
        }
        return ring
          .filter((pt) => Array.isArray(pt) && pt.length >= 2 && typeof pt[0] === 'number' && typeof pt[1] === 'number')
          .map((pt) => [pt[0], pt[1]]);
      }
      if (o.type === 'MultiPolygon' && Array.isArray(o.coordinates)) {
        const first = (o.coordinates as number[][][][])[0];
        if (!first?.[0]) {
          return null;
        }
        return first[0]
          .filter((pt) => Array.isArray(pt) && pt.length >= 2 && typeof pt[0] === 'number' && typeof pt[1] === 'number')
          .map((pt) => [pt[0], pt[1]]);
      }
    }
    if (!Array.isArray(raw) || raw.length === 0) {
      return null;
    }
    const first = raw[0] as unknown;
    if (Array.isArray(first) && typeof (first as number[])[0] === 'number') {
      const pairs = raw as number[][];
      if (pairs.every((p) => Array.isArray(p) && p.length >= 2 && typeof p[0] === 'number' && typeof p[1] === 'number')) {
        return pairs.length >= 1 ? pairs : null;
      }
      return null;
    }
    if (typeof first === 'object' && first !== null) {
      const out: number[][] = [];
      for (const pt of raw as Array<Record<string, unknown>>) {
        const lat =
          typeof pt.lat === 'number'
            ? pt.lat
            : typeof pt.latitude === 'number'
              ? pt.latitude
              : null;
        const lng =
          typeof pt.lng === 'number'
            ? pt.lng
            : typeof pt.lon === 'number'
              ? pt.lon
              : typeof pt.longitude === 'number'
                ? pt.longitude
                : null;
        if (lat != null && lng != null) {
          out.push([lng, lat]);
        }
      }
      return out.length >= 1 ? out : null;
    }
    return null;
  }

  /**
   * When JSON boundary is empty but PostGIS has centroid/boundary_geom (e.g. legacy sync), still resolve a point.
   */
  private async fetchPostgisParcelCentroids(
    organizationId: string,
    parcelIds: string[],
  ): Promise<Map<string, { lat: number; lng: number }>> {
    const map = new Map<string, { lat: number; lng: number }>();
    if (!parcelIds.length) {
      return map;
    }
    let pool;
    try {
      pool = this.databaseService.getPgPool();
    } catch {
      return map;
    }
    const client = await pool.connect();
    try {
      const res = await client.query(
        `SELECT p.id::text AS id,
          COALESCE(
            ST_Y(p.centroid::geometry),
            ST_Y(ST_Centroid(p.boundary_geom::geometry))
          ) AS lat,
          COALESCE(
            ST_X(p.centroid::geometry),
            ST_X(ST_Centroid(p.boundary_geom::geometry))
          ) AS lng
         FROM parcels p
         WHERE p.organization_id = $1::uuid
           AND p.id = ANY($2::uuid[])
           AND (p.centroid IS NOT NULL OR p.boundary_geom IS NOT NULL)`,
        [organizationId, parcelIds],
      );
      for (const row of res.rows) {
        const lat = parseFloat(row.lat);
        const lng = parseFloat(row.lng);
        if (
          Number.isFinite(lat) &&
          Number.isFinite(lng) &&
          Math.abs(lat) <= 90 &&
          Math.abs(lng) <= 180
        ) {
          map.set(row.id, { lat, lng });
        }
      }
    } catch (err) {
      this.logger.warn(
        `fetchPostgisParcelCentroids failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      client.release();
    }
    return map;
  }

  summarizeContext(context: BuiltContext) {
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
}
