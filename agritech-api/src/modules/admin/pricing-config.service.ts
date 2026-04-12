import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import {
  ERP_MODULES,
  HA_PRICE_TIERS,
  SIZE_MULTIPLIER_TIERS,
  DEFAULT_DISCOUNT_PERCENT,
  type ErpModule,
  type HaPriceTier,
  type SizeMultiplierTier,
} from '../subscriptions/subscription-domain';

export interface PricingConfig {
  modules: Array<{ id: string; pricePerMonth: number }>;
  ha_tiers: Array<{ maxHa: number | null; label: string; pricePerHaYear: number }>;
  size_multipliers: Array<{ minHa: number; maxHa: number | null; multiplier: number }>;
  default_discount_percent: number;
  updated_at?: string;
  updated_by?: string;
}

@Injectable()
export class PricingConfigService {
  private readonly logger = new Logger(PricingConfigService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  async getConfig(): Promise<PricingConfig> {
    const client = this.databaseService.getAdminClient();

    const { data, error } = await client
      .from('subscription_pricing_config')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (error) {
      this.logger.error(`Failed to load pricing config: ${error.message}`);
    }

    if (!data) {
      return this.getDefaults();
    }

    return {
      modules: data.modules || this.getDefaults().modules,
      ha_tiers: data.ha_tiers || this.getDefaults().ha_tiers,
      size_multipliers: data.size_multipliers || this.getDefaults().size_multipliers,
      default_discount_percent: data.default_discount_percent ?? DEFAULT_DISCOUNT_PERCENT,
      updated_at: data.updated_at,
      updated_by: data.updated_by,
    };
  }

  async saveConfig(config: Omit<PricingConfig, 'updated_at' | 'updated_by'>, userId: string): Promise<PricingConfig> {
    const client = this.databaseService.getAdminClient();

    // Check if a row already exists
    const { data: existing } = await client
      .from('subscription_pricing_config')
      .select('id')
      .limit(1)
      .maybeSingle();

    const payload = {
      modules: config.modules,
      ha_tiers: config.ha_tiers,
      size_multipliers: config.size_multipliers,
      default_discount_percent: config.default_discount_percent,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    };

    let result;
    if (existing) {
      result = await client
        .from('subscription_pricing_config')
        .update(payload)
        .eq('id', existing.id)
        .select()
        .single();
    } else {
      result = await client
        .from('subscription_pricing_config')
        .insert(payload)
        .select()
        .single();
    }

    if (result.error) {
      this.logger.error(`Failed to save pricing config: ${result.error.message}`);
      throw new Error(`Failed to save pricing config: ${result.error.message}`);
    }

    this.logger.log('Subscription pricing config saved');

    return {
      modules: result.data.modules,
      ha_tiers: result.data.ha_tiers,
      size_multipliers: result.data.size_multipliers,
      default_discount_percent: result.data.default_discount_percent,
      updated_at: result.data.updated_at,
      updated_by: result.data.updated_by,
    };
  }

  /**
   * Returns resolved ErpModule[] merging DB overrides with code defaults.
   */
  async getResolvedModules(): Promise<ErpModule[]> {
    const config = await this.getConfig();
    const overrides = new Map(config.modules.map((m) => [m.id, m.pricePerMonth]));

    return ERP_MODULES.map((m) => ({
      ...m,
      pricePerMonth: overrides.get(m.id) ?? m.pricePerMonth,
    }));
  }

  async getResolvedHaTiers(): Promise<HaPriceTier[]> {
    const config = await this.getConfig();
    if (config.ha_tiers.length > 0) {
      return config.ha_tiers;
    }
    return HA_PRICE_TIERS;
  }

  async getResolvedSizeMultipliers(): Promise<SizeMultiplierTier[]> {
    const config = await this.getConfig();
    if (config.size_multipliers.length > 0) {
      return config.size_multipliers;
    }
    return SIZE_MULTIPLIER_TIERS;
  }

  async getResolvedDiscountPercent(): Promise<number> {
    const config = await this.getConfig();
    return config.default_discount_percent;
  }

  private getDefaults(): PricingConfig {
    return {
      modules: ERP_MODULES.map((m) => ({ id: m.id, pricePerMonth: m.pricePerMonth })),
      ha_tiers: HA_PRICE_TIERS.map((t) => ({ maxHa: t.maxHa, label: t.label, pricePerHaYear: t.pricePerHaYear })),
      size_multipliers: SIZE_MULTIPLIER_TIERS.map((t) => ({ minHa: t.minHa, maxHa: t.maxHa, multiplier: t.multiplier })),
      default_discount_percent: DEFAULT_DISCOUNT_PERCENT,
    };
  }
}
