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
    const supportedLocales = ['en', 'fr', 'ar'];
    const normalizedLocale = supportedLocales.includes(locale) ? locale : 'en';

    const { data: modules, error } = await this.supabase
      .from('modules')
      .select(`
        id,
        slug,
        icon,
        color,
        category,
        display_order,
        price_monthly,
        is_required,
        is_recommended,
        is_addon_eligible,
        is_available,
        required_plan,
        dashboard_widgets,
        navigation_items,
        module_translations(name, description, features, locale)
      `)
      .order('display_order');

    if (error) {
      this.logger.error(`Error fetching module config: ${error.message}`);
      throw new Error(`Failed to fetch module config: ${error.message}`);
    }

    const moduleDtos: ModuleConfigDto[] = (modules || []).map((m: Record<string, unknown>) => {
      const translations = m.module_translations as Array<{ name: string; description: string; features: string[]; locale: string }> || [];
      const translation = translations.find(t => t.locale === normalizedLocale) || translations.find(t => t.locale === 'en') || translations[0];
      return {
        id: m.id as string,
        slug: m.slug as string,
        icon: m.icon as string,
        color: m.color as string,
        category: m.category as string,
        displayOrder: m.display_order as number,
        priceMonthly: m.price_monthly ? Number(m.price_monthly) : 0,
        isRequired: (m.is_required as boolean) || false,
        isRecommended: (m.is_recommended as boolean) || false,
        isAddonEligible: (m.is_addon_eligible as boolean) || false,
        isAvailable: m.is_available !== false,
        requiredPlan: (m.required_plan as string) || null,
        dashboardWidgets: (m.dashboard_widgets as string[]) || [],
        navigationItems: (m.navigation_items as string[]) || [],
        name: translation?.name || (m.slug as string),
        description: translation?.description || '',
        features: translation?.features || [],
      };
    });

    const { data: pricingData, error: pricingError } = await this.supabase
      .from('subscription_pricing_config')
      .select('config_key, value');

    if (pricingError) {
      this.logger.warn(`Error fetching pricing config: ${pricingError.message}, using defaults`);
    }

    const pricingMap = (pricingData || []).reduce((acc: Record<string, number>, item: { config_key: string; value: string }) => {
      acc[item.config_key] = Number(item.value);
      return acc;
    }, {} as Record<string, number>);

    const pricing: SubscriptionPricingDto = {
      basePriceMonthly: pricingMap.base_price_monthly || 15,
      trialDays: pricingMap.trial_days || 14,
      addonSlotPrice: pricingMap.addon_slot_price || 5,
    };

    const { data: widgetData, error: widgetError } = await this.supabase
      .from('widgets')
      .select('name, module_slug');

    const widgetToModuleMap: Record<string, string> = {};
    if (!widgetError && widgetData) {
      for (const item of widgetData) {
        if (item.name && item.module_slug) {
          widgetToModuleMap[item.name] = item.module_slug;
        }
      }
    }

    return {
      modules: moduleDtos,
      pricing,
      widgetToModuleMap,
    };
  }

  async calculatePrice(moduleSlugs: string[]): Promise<CalculatePriceResponseDto> {
    try {
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
    } catch (error) {
      this.logger.error(`Error calculating price: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  async clearCache(): Promise<void> {
    this.logger.log('Module config cache clear requested (no-op - caching handled at app level)');
  }
}
