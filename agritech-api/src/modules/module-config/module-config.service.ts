import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  ModuleConfigDto,
  SubscriptionPricingDto,
  ModuleConfigResponseDto,
  CalculatePriceResponseDto,
} from './dto/module-config.dto';

@Injectable()
export class ModuleConfigService {
  private readonly logger = new Logger(ModuleConfigService.name);
  private supabase: SupabaseClient;
  private readonly supabaseUrl: string;
  private readonly supabaseKey: string;

  constructor(private configService: ConfigService) {
    this.supabaseUrl = this.configService.get<string>('SUPABASE_URL') || 'http://localhost:54321';
    this.supabaseKey = this.configService.get<string>('SUPABASE_ANON_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE3OTc4NzE5MTN9.1cEVKY9wM9jLcSTZenPxVpmwMWtYLkcHnXGTPNfKOvA';
    this.supabase = createClient(this.supabaseUrl, this.supabaseKey);
  }

  async getModuleConfig(locale: string = 'en'): Promise<ModuleConfigResponseDto> {
    // Normalize locale (default to 'en' if not supported)
    const supportedLocales = ['en', 'fr', 'ar'];
    const normalizedLocale = supportedLocales.includes(locale) ? locale : 'en';

    // Call the database function to get module config with translations
    const { data: modules, error } = await this.supabase.rpc('get_module_config', {
      p_locale: normalizedLocale,
    });

    if (error) {
      this.logger.error(`Error fetching module config: ${error.message}`);
      throw new Error(`Failed to fetch module config: ${error.message}`);
    }

    // Map database results to DTOs
    const moduleDtos: ModuleConfigDto[] = (modules || []).map((m: any) => ({
      id: m.id,
      slug: m.slug,
      icon: m.icon,
      color: m.color,
      category: m.category,
      displayOrder: m.display_order,
      priceMonthly: m.price_monthly ? Number(m.price_monthly) : 0,
      isRequired: m.is_required || false,
      isRecommended: m.is_recommended || false,
      isAddonEligible: m.is_addon_eligible || false,
      isAvailable: m.is_available !== false,
      requiredPlan: m.required_plan || null,
      dashboardWidgets: m.dashboard_widgets || [],
      navigationItems: m.navigation_items || [],
      name: m.name,
      description: m.description,
      features: m.features || [],
    }));

    // Get subscription pricing from database
    const { data: pricingData, error: pricingError } = await this.supabase.rpc('get_subscription_pricing');

    if (pricingError) {
      this.logger.warn(`Error fetching pricing config: ${pricingError.message}, using defaults`);
    }

    // Build pricing object from database or use defaults
    const pricingMap = (pricingData || []).reduce((acc: any, item: any) => {
      acc[item.config_key] = Number(item.value);
      return acc;
    }, {});

    const pricing: SubscriptionPricingDto = {
      basePriceMonthly: pricingMap.base_price_monthly || 15,
      trialDays: pricingMap.trial_days || 14,
      addonSlotPrice: pricingMap.addon_slot_price || 5,
    };

    // Build widget to module map
    const { data: widgetData, error: widgetError } = await this.supabase.rpc('get_widget_to_module_map');

    const widgetToModuleMap: Record<string, string> = {};
    if (!widgetError && widgetData) {
      for (const item of widgetData) {
        widgetToModuleMap[item.widget_name] = item.module_slug;
      }
    }

    return {
      modules: moduleDtos,
      pricing,
      widgetToModuleMap,
    };
  }

  async calculatePrice(moduleSlugs: string[]): Promise<CalculatePriceResponseDto> {
    // Call the database function to calculate price
    const { data, error } = await this.supabase.rpc('calculate_module_subscription_price', {
      p_module_slugs: moduleSlugs,
    });

    if (error) {
      this.logger.error(`Error calculating price: ${error.message}`);
      // Fallback to simple calculation
      const config = await this.getModuleConfig();
      let modulesPrice = 0;
      const breakdown: { slug: string; name: string; price: number }[] = [];

      for (const slug of moduleSlugs) {
        const module = config.modules.find(m => m.slug === slug);
        if (module && !module.isRequired && module.priceMonthly > 0) {
          modulesPrice += module.priceMonthly;
          breakdown.push({
            slug,
            name: module.name,
            price: module.priceMonthly,
          });
        }
      }

      return {
        basePrice: config.pricing.basePriceMonthly,
        modulesPrice,
        totalPrice: config.pricing.basePriceMonthly + modulesPrice,
        breakdown,
      };
    }

    const result = data?.[0];
    if (!result) {
      throw new Error('No price calculation result returned');
    }

    // Get module details for breakdown
    const config = await this.getModuleConfig();
    const breakdown: { slug: string; name: string; price: number }[] = [];

    for (const slug of moduleSlugs) {
      const module = config.modules.find(m => m.slug === slug);
      if (module && !module.isRequired && module.priceMonthly > 0) {
        breakdown.push({
          slug,
          name: module.name,
          price: module.priceMonthly,
        });
      }
    }

    return {
      basePrice: Number(result.base_price),
      modulesPrice: Number(result.modules_price),
      totalPrice: Number(result.total_price),
      breakdown,
    };
  }

  async clearCache(): Promise<void> {
    // Call the database function to clear cache
    const { error } = await this.supabase.rpc('clear_module_config_cache');

    if (error) {
      this.logger.warn(`Error clearing cache: ${error.message}`);
    } else {
      this.logger.log('Module config cache cleared');
    }
  }
}
