import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

export interface WorkUnit {
  code: string;
  name: string;
  name_fr: string;
  name_ar: string;
  unit_category: 'count' | 'weight' | 'volume' | 'area' | 'length';
  base_unit?: string;
  conversion_factor?: number;
  allow_decimal: boolean;
}

export interface ChartOfAccountConfig {
  locale: 'morocco' | 'france' | 'custom';
  organizationId: string;
}

@Injectable()
export class OrgSetupService {
  private readonly logger = new Logger(OrgSetupService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Seed default work units for an organization
   * Moved from SQL: seed_default_work_units()
   */
  async seedDefaultWorkUnits(organizationId: string): Promise<{ inserted: number }> {
    const client = this.databaseService.getAdminClient();

    const defaultWorkUnits: WorkUnit[] = [
      // Count-based units
      { code: 'TREE', name: 'Tree', name_fr: 'Arbre', name_ar: 'شجرة', unit_category: 'count', allow_decimal: false },
      { code: 'PLANT', name: 'Plant', name_fr: 'Plante', name_ar: 'نبتة', unit_category: 'count', allow_decimal: false },
      { code: 'UNIT', name: 'Unit', name_fr: 'Unité', name_ar: 'وحدة', unit_category: 'count', allow_decimal: false },
      { code: 'BOX', name: 'Box', name_fr: 'Caisse', name_ar: 'صندوق', unit_category: 'count', allow_decimal: false },
      { code: 'CRATE', name: 'Crate', name_fr: 'Caisse', name_ar: 'قفص', unit_category: 'count', allow_decimal: false },
      { code: 'BAG', name: 'Bag', name_fr: 'Sac', name_ar: 'كيس', unit_category: 'count', allow_decimal: false },
      // Weight units
      { code: 'KG', name: 'Kilogram', name_fr: 'Kilogramme', name_ar: 'كيلوغرام', unit_category: 'weight', allow_decimal: true },
      { code: 'TON', name: 'Ton', name_fr: 'Tonne', name_ar: 'طن', unit_category: 'weight', allow_decimal: true },
      { code: 'QUINTAL', name: 'Quintal', name_fr: 'Quintal', name_ar: 'قنطار', unit_category: 'weight', allow_decimal: true },
      // Volume units
      { code: 'LITER', name: 'Liter', name_fr: 'Litre', name_ar: 'لتر', unit_category: 'volume', allow_decimal: true },
      { code: 'M3', name: 'Cubic meter', name_fr: 'Mètre cube', name_ar: 'متر مكعب', unit_category: 'volume', allow_decimal: true },
      // Area units
      { code: 'HA', name: 'Hectare', name_fr: 'Hectare', name_ar: 'هكتار', unit_category: 'area', allow_decimal: true },
      { code: 'M2', name: 'Square meter', name_fr: 'Mètre carré', name_ar: 'متر مربع', unit_category: 'area', allow_decimal: true },
      // Length units
      { code: 'M', name: 'Meter', name_fr: 'Mètre', name_ar: 'متر', unit_category: 'length', allow_decimal: true },
      { code: 'KM', name: 'Kilometer', name_fr: 'Kilomètre', name_ar: 'كيلومتر', unit_category: 'length', allow_decimal: true },
    ];

    const { data, error, count } = await client
      .from('work_units')
      .insert(
        defaultWorkUnits.map((unit) => ({
          organization_id: organizationId,
          code: unit.code,
          name: unit.name,
          name_fr: unit.name_fr,
          name_ar: unit.name_ar,
          unit_category: unit.unit_category,
          base_unit: unit.base_unit || null,
          conversion_factor: unit.conversion_factor || null,
          allow_decimal: unit.allow_decimal,
          is_active: true,
        })),
      )
      .select('id');

    if (error) {
      this.logger.error(`Failed to seed work units for org ${organizationId}: ${error.message}`);
      throw new Error(`Failed to seed work units: ${error.message}`);
    }

    this.logger.log(`Seeded ${count || 0} default work units for organization ${organizationId}`);

    return { inserted: count || 0 };
  }

  /**
   * Create a default fiscal year for an organization
   * Moved from SQL: create_default_fiscal_year()
   */
  async createDefaultFiscalYear(organizationId: string, year?: number): Promise<{ fiscalYearId: string }> {
    const client = this.databaseService.getAdminClient();
    const fiscalYear = year || new Date().getFullYear();
    const startDate = new Date(fiscalYear, 0, 1); // January 1st
    const endDate = new Date(fiscalYear, 11, 31); // December 31st

    const { data, error } = await client
      .from('fiscal_years')
      .insert({
        organization_id: organizationId,
        name: `${fiscalYear}`,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        is_current: true,
        status: 'active',
      })
      .select('id')
      .single();

    if (error) {
      this.logger.error(`Failed to create fiscal year for org ${organizationId}: ${error.message}`);
      throw new Error(`Failed to create fiscal year: ${error.message}`);
    }

    this.logger.log(`Created fiscal year ${fiscalYear} for organization ${organizationId}`);

    return { fiscalYearId: data.id };
  }

  /**
   * Create Morocco campaign for an organization
   * Moved from SQL: create_morocco_campaign()
   */
  async createMoroccoCampaign(organizationId: string, year?: number): Promise<{ campaignId: string }> {
    const client = this.databaseService.getAdminClient();
    const campaignYear = year || new Date().getFullYear();

    // Morocco campaign typically runs from September to August of the next year
    const startDate = new Date(campaignYear, 8, 1); // September 1st
    const endDate = new Date(campaignYear + 1, 7, 31); // August 31st of next year

    const { data, error } = await client
      .from('campaigns')
      .insert({
        organization_id: organizationId,
        name: `Campagne ${campaignYear}-${campaignYear + 1}`,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        is_current: true,
        status: 'active',
        campaign_type: 'morocco',
      })
      .select('id')
      .single();

    if (error) {
      this.logger.error(`Failed to create Morocco campaign for org ${organizationId}: ${error.message}`);
      throw new Error(`Failed to create Morocco campaign: ${error.message}`);
    }

    this.logger.log(`Created Morocco campaign ${campaignYear}-${campaignYear + 1} for organization ${organizationId}`);

    return { campaignId: data.id };
  }

  /**
   * Initialize organization with default setup
   * Moved from SQL: create_organization_with_farm()
   * This is a convenience function that calls other setup methods
   */
  async initializeOrganization(
    organizationId: string,
    options: {
      skipWorkUnits?: boolean;
      skipFiscalYear?: boolean;
      skipCampaign?: boolean;
      fiscalYear?: number;
      campaignYear?: number;
    } = {},
  ): Promise<{
    workUnitsInserted?: number;
    fiscalYearId?: string;
    campaignId?: string;
  }> {
    const result: any = {};

    if (!options.skipWorkUnits) {
      const workUnitsResult = await this.seedDefaultWorkUnits(organizationId);
      result.workUnitsInserted = workUnitsResult.inserted;
    }

    if (!options.skipFiscalYear) {
      const fiscalYearResult = await this.createDefaultFiscalYear(organizationId, options.fiscalYear);
      result.fiscalYearId = fiscalYearResult.fiscalYearId;
    }

    if (!options.skipCampaign) {
      const campaignResult = await this.createMoroccoCampaign(organizationId, options.campaignYear);
      result.campaignId = campaignResult.campaignId;
    }

    this.logger.log(`Organization ${organizationId} initialized successfully`);

    return result;
  }
}
