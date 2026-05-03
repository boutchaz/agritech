import { Injectable, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { TrialPlanInput } from '../subscriptions/dto/create-trial-subscription.dto';
import { AccountsService } from '../accounts/accounts.service';
import { FiscalYearsService } from '../fiscal-years/fiscal-years.service';
import { DemoDataService } from '../demo-data/demo-data.service';
import {
  SaveOnboardingProfileDto,
  SaveOnboardingOrganizationDto,
  SaveOnboardingFarmDto,
  SaveOnboardingModulesDto,
  SaveOnboardingPreferencesDto,
  OnboardingStateDto,
} from './dto/onboarding.dto';

const STORAGE_VERSION = 2;

/** Countries with a built-in chart of accounts template in AccountsService.getFallbackTemplate */
const SUPPORTED_CHART_COUNTRIES = new Set(['MA', 'FR', 'TN', 'US', 'GB', 'DE']);

@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);

  constructor(
    private databaseService: DatabaseService,
    private subscriptionsService: SubscriptionsService,
    private readonly accountsService: AccountsService,
    private readonly fiscalYearsService: FiscalYearsService,
    private readonly demoDataService: DemoDataService,
  ) {}

  /**
   * Map organization country (e.g. ES, DZ) to a chart template we ship (MA, FR, …).
   */
  private resolveChartTemplateCountry(iso2: string | null | undefined): string {
    const upper = (iso2 || 'MA').trim().toUpperCase();
    if (SUPPORTED_CHART_COUNTRIES.has(upper)) {
      return upper;
    }
    const fallback: Record<string, string> = {
      ES: 'FR',
      DZ: 'MA',
      AD: 'FR',
      BE: 'FR',
      LU: 'FR',
      CH: 'FR',
    };
    return fallback[upper] || 'MA';
  }

  /**
   * Ensures an organization has an active row in organization_modules for the given catalog slug.
   * Used when completing onboarding so accounting APIs (RequireModule('accounting')) succeed.
   */
  private async ensureOrganizationModuleActive(organizationId: string, moduleSlug: string): Promise<void> {
    const client = this.databaseService.getAdminClient();
    const { data: mod, error: modErr } = await client
      .from('modules')
      .select('id')
      .eq('slug', moduleSlug)
      .eq('is_available', true)
      .maybeSingle();

    if (modErr || !mod?.id) {
      this.logger.warn(
        `ensureOrganizationModuleActive: module "${moduleSlug}" not found or unavailable: ${modErr?.message ?? 'no row'}`,
      );
      return;
    }

    const { error: upErr } = await client.from('organization_modules').upsert(
      {
        organization_id: organizationId,
        module_id: mod.id,
        is_active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'organization_id,module_id' },
    );

    if (upErr) {
      this.logger.warn(`ensureOrganizationModuleActive: upsert failed for ${moduleSlug}: ${upErr.message}`);
    }
  }

  private async ensureOrgMembership(userId: string, organizationId: string): Promise<void> {
    const client = this.databaseService.getAdminClient();
    const { data: existing } = await client
      .from('organization_users')
      .select('id, is_active')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (existing?.id) {
      if (!existing.is_active) {
        const { error } = await client
          .from('organization_users')
          .update({ is_active: true })
          .eq('id', existing.id);
        if (error) {
          this.logger.error(`ensureOrgMembership: reactivate failed: ${error.message}`);
          throw new InternalServerErrorException('Failed to reactivate organization membership');
        }
      }
      return;
    }

    const { data: roleData, error: roleError } = await client
      .from('roles')
      .select('id')
      .eq('name', 'organization_admin')
      .single();
    if (roleError || !roleData) {
      this.logger.error(`ensureOrgMembership: role lookup failed: ${roleError?.message || 'not found'}`);
      throw new InternalServerErrorException('Failed to find default role for organization');
    }

    const { error: insertError } = await client
      .from('organization_users')
      .insert({
        organization_id: organizationId,
        user_id: userId,
        role_id: roleData.id,
        is_active: true,
        created_at: new Date().toISOString(),
      });
    if (insertError) {
      this.logger.error(`ensureOrgMembership: insert failed: ${insertError.message}`);
      throw new InternalServerErrorException('Failed to add user to organization');
    }
  }

  private async resolveOrganizationIdForUser(
    userId: string,
    headerOrganizationId: string | null | undefined,
  ): Promise<string | null> {
    if (headerOrganizationId && headerOrganizationId.trim()) {
      return headerOrganizationId;
    }
    const client = this.databaseService.getAdminClient();
    const { data, error } = await client
      .from('organization_users')
      .select('organization_id')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) {
      this.logger.warn(`resolveOrganizationIdForUser: ${error.message}`);
      return null;
    }
    return data?.organization_id ?? null;
  }

  /**
   * Check if a slug is available for use
   */
  async checkSlugAvailability(slug: string): Promise<{
    available: boolean;
    slug: string;
    suggestion?: string;
    error?: string;
  }> {
    // Validate slug format
    const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    if (!slug || slug.length < 3) {
      return {
        available: false,
        slug,
        error: 'Slug must be at least 3 characters long',
      };
    }

    if (slug.length > 50) {
      return {
        available: false,
        slug,
        error: 'Slug must be at most 50 characters long',
      };
    }

    if (!slugRegex.test(slug)) {
      return {
        available: false,
        slug,
        error: 'Slug can only contain lowercase letters, numbers, and hyphens',
      };
    }

    const client = this.databaseService.getAdminClient();

    // Check if slug exists
    const { data, error } = await client
      .from('organizations')
      .select('id, slug')
      .eq('slug', slug)
      .maybeSingle();

    if (error) {
      this.logger.error(`Failed to check slug availability: ${error.message}`);
      throw new InternalServerErrorException('Failed to check slug availability');
    }

    if (data) {
      // Slug is taken, generate a suggestion
      const suggestion = await this.generateSlugSuggestion(slug);
      return {
        available: false,
        slug,
        suggestion,
      };
    }

    return {
      available: true,
      slug,
    };
  }

  /**
   * Generate a unique slug suggestion based on the original slug
   */
  private async generateSlugSuggestion(baseSlug: string): Promise<string> {
    const client = this.databaseService.getAdminClient();

    // Try adding numbers to the end
    for (let i = 1; i <= 10; i++) {
      const suggestion = `${baseSlug}-${i}`;
      const { data } = await client
        .from('organizations')
        .select('id')
        .eq('slug', suggestion)
        .maybeSingle();

      if (!data) {
        return suggestion;
      }
    }

    // If all simple numbers are taken, use a random suffix
    const randomSuffix = Math.random().toString(36).substring(2, 6);
    return `${baseSlug}-${randomSuffix}`;
  }

  /**
   * Get onboarding state for the current user
   * Enriches the state with existing farm/org data if not already tracked
   */
  async getState(userId: string) {
    const client = this.databaseService.getAdminClient();

    const { data, error } = await client
      .from('user_profiles')
      .select('onboarding_state, onboarding_current_step')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      this.logger.error(`Failed to load onboarding state: ${error.message}`);
      throw new InternalServerErrorException('Failed to load onboarding state');
    }

    if (!data?.onboarding_state) {
      return null;
    }

    let state = data.onboarding_state;

    // If existingFarmId is not set but we have an organization, check for existing farms
    if (!state.existingFarmId && state.existingOrgId) {
      const { data: farms } = await client
        .from('farms')
        .select('id, name, location, size, size_unit, description, soil_type, climate_zone')
        .eq('organization_id', state.existingOrgId)
        .eq('is_active', true)
        .limit(1)
        .order('created_at', { ascending: true });

      if (farms && farms.length > 0) {
        const farm = farms[0];
        this.logger.log(`Found existing farm ${farm.id} for user ${userId}, enriching state`);

        // Enrich the state with existing farm data
        state = {
          ...state,
          existingFarmId: farm.id,
          farmData: {
            name: farm.name || state.farmData?.name || '',
            location: farm.location || state.farmData?.location || '',
            size: farm.size || state.farmData?.size || 0,
            size_unit: farm.size_unit || state.farmData?.size_unit || 'hectares',
            farm_type: 'main',
            description: farm.description || state.farmData?.description || '',
            soil_type: farm.soil_type || state.farmData?.soil_type,
            climate_zone: farm.climate_zone || state.farmData?.climate_zone,
          },
        };
      }
    }

    return state;
  }

  /**
   * Save onboarding state
   */
  async saveState(userId: string, state: OnboardingStateDto) {
    const client = this.databaseService.getAdminClient();

    const { data, error } = await client
      .from('user_profiles')
      .update({
        onboarding_state: { ...state, version: STORAGE_VERSION, userId },
        onboarding_current_step: state.currentStep || 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select('onboarding_state, onboarding_current_step')
      .single();

    if (error) {
      this.logger.error(`Failed to save onboarding state: ${error.message}`);
      throw new InternalServerErrorException('Failed to save onboarding state');
    }

    return data.onboarding_state;
  }

  /**
   * Clear onboarding state
   */
  async clearState(userId: string): Promise<{ success: boolean }> {
    const client = this.databaseService.getAdminClient();

    const { error } = await client
      .from('user_profiles')
      .update({
        onboarding_state: null,
        onboarding_current_step: 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      this.logger.error(`Failed to clear onboarding state: ${error.message}`);
      throw new InternalServerErrorException('Failed to clear onboarding state');
    }

    return { success: true };
  }

  /**
   * Save user profile (Step 1)
   */
  async saveProfile(userId: string, email: string, dto: SaveOnboardingProfileDto): Promise<{ success: boolean }> {
    const client = this.databaseService.getAdminClient();

    const { error } = await client
      .from('user_profiles')
      .update({
        first_name: dto.first_name,
        last_name: dto.last_name,
        full_name: `${dto.first_name} ${dto.last_name}`,
        phone: dto.phone || null,
        timezone: dto.timezone,
        language: dto.language,
        email: email,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      this.logger.error(`Failed to save profile: ${error.message}`);
      throw new InternalServerErrorException('Failed to save profile');
    }

    return { success: true };
  }

  /**
   * Save or update organization (Step 2)
   */
  async saveOrganization(
    userId: string,
    dto: SaveOnboardingOrganizationDto,
    existingOrgId?: string,
  ): Promise<{ id: string }> {
    const client = this.databaseService.getAdminClient();

    if (existingOrgId) {
      // Update existing organization
      const countryCode =
        dto.country && dto.country.length === 2 ? dto.country.toUpperCase() : null;
      const { data, error } = await client
        .from('organizations')
        .update({
          name: dto.name,
          slug: dto.slug,
          phone: dto.phone || null,
          email: dto.email,
          account_type: dto.account_type,
          address: dto.address || null,
          city: dto.city || null,
          country: dto.country,
          ...(countryCode ? { country_code: countryCode } : {}),
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingOrgId)
        .select('id')
        .single();

      if (error) {
        this.logger.error(`Failed to update organization: ${error.message}`);
        throw new InternalServerErrorException('Failed to update organization');
      }

      // Defensive: when an org was created out-of-band (e.g. backoffice
      // provisioning, or a prior partial onboarding) the user may not yet
      // be a member. Without this every authenticated request 403s on
      // OrganizationGuard. Upsert as organization_admin if missing.
      await this.ensureOrgMembership(userId, data.id);

      return { id: data.id };
    } else {
      // Get organization_admin role ID
      const { data: roleData, error: roleError } = await client
        .from('roles')
        .select('id')
        .eq('name', 'organization_admin')
        .single();

      if (roleError || !roleData) {
        this.logger.error(`Failed to find organization_admin role: ${roleError?.message || 'Not found'}`);
        throw new InternalServerErrorException('Failed to find default role for organization');
      }

      const roleId = roleData.id;

      // Create new organization
      const countryCode =
        dto.country && dto.country.length === 2 ? dto.country.toUpperCase() : null;
      const { data, error } = await client
        .from('organizations')
        .insert({
          name: dto.name,
          slug: dto.slug,
          phone: dto.phone || null,
          email: dto.email,
          account_type: dto.account_type,
          address: dto.address || null,
          city: dto.city || null,
          country: dto.country,
          ...(countryCode ? { country_code: countryCode } : {}),
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (error) {
        this.logger.error(`Failed to create organization: ${error.message}`);
        if (error.code === '23505' && error.message.includes('organizations_slug_key')) {
          throw new BadRequestException('This organization slug is already taken. Please choose a different one.');
        }
        throw new InternalServerErrorException('Failed to create organization');
      }

      const organizationId = data.id;

      // Add user to organization with organization_admin role
      const { error: orgUserError } = await client
        .from('organization_users')
        .insert({
          organization_id: organizationId,
          user_id: userId,
          role_id: roleId,
          is_active: true,
          created_at: new Date().toISOString(),
        });

      if (orgUserError) {
        this.logger.error(`Failed to add user to organization: ${orgUserError.message}`);
        throw new InternalServerErrorException('Failed to add user to organization');
      }

      try {
        await this.subscriptionsService.createTrialSubscription(userId, {
          organization_id: organizationId,
          plan_type: TrialPlanInput.STARTER,
        });
        this.logger.log(`Trial subscription created for organization ${organizationId}`);
      } catch (trialError) {
        this.logger.error(
          `Failed to create trial subscription (non-critical): ${trialError.message}`,
          trialError.stack,
        );
      }

      return { id: organizationId };
    }
  }

  /**
   * Save farm (Step 3)
   * Creates a new farm if none exists, otherwise updates the first farm
   */
  async saveFarm(userId: string, dto: SaveOnboardingFarmDto, existingFarmId?: string): Promise<{ id: string }> {
    const client = this.databaseService.getAdminClient();

    // Get user's organization
    const { data: orgUsers, error: orgError } = await client
      .from('organization_users')
      .select('organization_id')
      .eq('user_id', userId)
      .eq('is_active', true)
      .limit(1);

    if (orgError || !orgUsers || orgUsers.length === 0) {
      this.logger.error(`User has no active organization: ${orgError?.message || 'Not found'}`);
      throw new BadRequestException('User has no active organization');
    }

    const organizationId = orgUsers[0].organization_id;

    // Check if farm already exists for this organization (from onboarding state)
    let farmId = existingFarmId;
    if (!farmId) {
      const { data: existingFarms } = await client
        .from('farms')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .limit(1)
        .order('created_at', { ascending: true });

      if (existingFarms && existingFarms.length > 0) {
        farmId = existingFarms[0].id;
        this.logger.log(`Found existing farm ${farmId}, updating instead of creating new one`);
      }
    }

    const coordinates =
      dto.latitude != null &&
      dto.longitude != null &&
      Number.isFinite(dto.latitude) &&
      Number.isFinite(dto.longitude)
        ? { type: 'Point' as const, coordinates: [dto.longitude, dto.latitude] }
        : undefined;

    if (farmId) {
      // Update existing farm
      const updatePayload: Record<string, unknown> = {
        name: dto.name,
        location: dto.location,
        size: dto.size,
        size_unit: dto.size_unit,
        description: dto.description || null,
        soil_type: dto.soil_type || null,
        climate_zone: dto.climate_zone || null,
        updated_at: new Date().toISOString(),
      };
      if (coordinates) {
        updatePayload.coordinates = coordinates;
      }

      const { data, error } = await client.from('farms').update(updatePayload).eq('id', farmId).select('id').single();

      if (error) {
        this.logger.error(`Failed to update farm: ${error.message}`);
        throw new InternalServerErrorException('Failed to update farm');
      }

      return { id: data.id };
    } else {
      // Create new farm
      // Note: farms table doesn't have farm_type column - hierarchy not yet supported
      const insertPayload: Record<string, unknown> = {
        organization_id: organizationId,
        name: dto.name,
        location: dto.location,
        size: dto.size,
        size_unit: dto.size_unit,
        description: dto.description || null,
        soil_type: dto.soil_type || null,
        climate_zone: dto.climate_zone || null,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      if (coordinates) {
        insertPayload.coordinates = coordinates;
      }

      const { data, error } = await client.from('farms').insert(insertPayload).select('id').single();

      if (error) {
        this.logger.error(`Failed to create farm: ${error.message}`);
        throw new InternalServerErrorException('Failed to create farm');
      }

      return { id: data.id };
    }
  }

  /**
   * Save selected modules (Step 4)
   */
  async saveModules(userId: string, dto: SaveOnboardingModulesDto): Promise<{ success: boolean }> {
    const client = this.databaseService.getAdminClient();

    // Get user's organization
    const { data: orgUsers, error: orgError } = await client
      .from('organization_users')
      .select('organization_id')
      .eq('user_id', userId)
      .eq('is_active', true)
      .limit(1);

    if (orgError || !orgUsers || orgUsers.length === 0) {
      this.logger.error(`User has no active organization: ${orgError?.message || 'Not found'}`);
      throw new BadRequestException('User has no active organization');
    }

    const organizationId = orgUsers[0].organization_id;

    // Get selected module slugs
    const selectedModuleSlugs = Object.entries(dto.moduleSelection)
      .filter(([_, enabled]) => enabled)
      .map(([slug, _]) => slug);

    // Always include required modules
    const { data: requiredModules, error: requiredModulesError } = await client
      .from('modules')
      .select('id, slug')
      .eq('is_required', true)
      .eq('is_active', true)
      .eq('is_available', true);

    if (requiredModulesError) {
      this.logger.error(`Failed to fetch required modules: ${requiredModulesError.message}`);
      throw new InternalServerErrorException('Failed to fetch required modules');
    }

    const requiredSlugs = (requiredModules || []).map((m) => m.slug).filter(Boolean);
    const moduleSlugs = Array.from(new Set([...selectedModuleSlugs, ...requiredSlugs]));

    if (moduleSlugs.length === 0) {
      return { success: true };
    }

    // Fetch module IDs by slug
    const { data: modules, error: modulesError } = await client
      .from('modules')
      .select('id')
      .in('slug', moduleSlugs);

    if (modulesError) {
      this.logger.error(`Failed to fetch modules: ${modulesError.message}`);
      throw new InternalServerErrorException('Failed to fetch modules');
    }

    if (!modules || modules.length === 0) {
      return { success: true };
    }

    // Create organization_modules records
    const modulesToInsert = modules.map((module) => ({
      organization_id: organizationId,
      module_id: module.id,
      is_active: true,
      created_at: new Date().toISOString(),
    }));

    const { error: insertError } = await client
      .from('organization_modules')
      .upsert(modulesToInsert, {
        onConflict: 'organization_id,module_id',
        ignoreDuplicates: false,
      });

    if (insertError) {
      this.logger.error(`Failed to save modules: ${insertError.message}`);
      throw new InternalServerErrorException('Failed to save modules');
    }

    // Mirror the selection onto the org's subscription so the backoffice
    // contract view (admin → clients → :orgId → Modules) reflects what the
    // user picked during onboarding. Without this, organization_modules
    // (feature gates) and subscriptions.selected_modules (contract
    // entitlement) drift, and admins see only the slugs they originally
    // typed in the contract form — not the user's onboarding choices.
    const { error: subUpdateError } = await client
      .from('subscriptions')
      .update({ selected_modules: moduleSlugs })
      .eq('organization_id', organizationId);
    if (subUpdateError) {
      // Don't fail the onboarding step — the contract sync is a nice-to-have,
      // not a hard requirement for module access. Log so it shows up.
      this.logger.warn(
        `Saved modules to organization_modules but failed to mirror onto subscriptions.selected_modules: ${subUpdateError.message}`,
      );
    }

    return { success: true };
  }

  /**
   * Save preferences and complete onboarding (Step 5)
   */
  async savePreferencesAndComplete(
    userId: string,
    organizationId: string | null,
    dto: SaveOnboardingPreferencesDto,
  ): Promise<{ success: boolean }> {
    const client = this.databaseService.getAdminClient();

    const resolvedOrgId = await this.resolveOrganizationIdForUser(userId, organizationId);
    if (!resolvedOrgId) {
      throw new BadRequestException(
        'No organization found for this user. Finish the organization step before completing onboarding.',
      );
    }

    const { data: orgRow, error: orgFetchError } = await client
      .from('organizations')
      .select('id, country, country_code, accounting_settings')
      .eq('id', resolvedOrgId)
      .maybeSingle();

    if (orgFetchError || !orgRow) {
      this.logger.error(`Failed to load organization: ${orgFetchError?.message}`);
      throw new InternalServerErrorException('Failed to load organization');
    }

    const isoCountry =
      (dto.accounting_template_country || orgRow.country_code || orgRow.country || 'MA')
        .toString()
        .trim()
        .toUpperCase();
    const chartCountry = this.resolveChartTemplateCountry(
      isoCountry.length === 2 ? isoCountry : 'MA',
    );

    const prevSettings =
      orgRow.accounting_settings && typeof orgRow.accounting_settings === 'object'
        ? (orgRow.accounting_settings as Record<string, unknown>)
        : {};
    const accounting_settings = {
      ...prevSettings,
      date_format: dto.date_format,
    };

    const { error: orgError } = await client
      .from('organizations')
      .update({
        currency_code: dto.currency,
        country_code:
          orgRow.country_code ||
          (orgRow.country && String(orgRow.country).length === 2
            ? String(orgRow.country).toUpperCase()
            : chartCountry),
        accounting_settings,
        updated_at: new Date().toISOString(),
      })
      .eq('id', resolvedOrgId);

    if (orgError) {
      this.logger.error(`Failed to update organization: ${orgError.message}`);
      throw new InternalServerErrorException('Failed to update organization');
    }

    // Chart + currency step implies accounting; module is not is_required in catalog, so activate it here.
    await this.ensureOrganizationModuleActive(resolvedOrgId, 'accounting');

    const { data: sampleAccount, error: sampleAccountError } = await client
      .from('accounts')
      .select('id')
      .eq('organization_id', resolvedOrgId)
      .limit(1)
      .maybeSingle();

    if (sampleAccountError) {
      this.logger.warn(`Account presence check failed: ${sampleAccountError.message}`);
    }

    if (!sampleAccount) {
      try {
        await this.accountsService.applyTemplate(chartCountry, resolvedOrgId, { overwrite: false });
        this.logger.log(`Chart of accounts template ${chartCountry} applied for org ${resolvedOrgId}`);
      } catch (e) {
        this.logger.error(
          `Failed to apply chart template during onboarding: ${e instanceof Error ? e.message : e}`,
        );
        throw new BadRequestException(
          `Could not install the chart of accounts for ${chartCountry}. Check country and try again, or apply a template later in Accounting.`,
        );
      }
    }

    const { data: existingFy, error: fyErr } = await client
      .from('fiscal_years')
      .select('id')
      .eq('organization_id', resolvedOrgId)
      .limit(1)
      .maybeSingle();

    if (!fyErr && !existingFy) {
      const y = new Date().getFullYear();
      try {
        await this.fiscalYearsService.create(resolvedOrgId, userId, {
          name: `FY ${y}`,
          code: `FY${y}`,
          start_date: `${y}-01-01`,
          end_date: `${y}-12-31`,
          period_type: 'monthly',
          is_current: true,
        });
        this.logger.log(`Default fiscal year FY${y} created for org ${resolvedOrgId}`);
      } catch (e) {
        this.logger.warn(`Could not create default fiscal year: ${e instanceof Error ? e.message : e}`);
      }
    }

    if (dto.use_demo_data) {
      const { count: farmCount, error: farmCountErr } = await client
        .from('farms')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', resolvedOrgId)
        .eq('is_active', true);

      if (!farmCountErr && Number(farmCount) === 0) {
        try {
          await this.demoDataService.seedDemoData(resolvedOrgId, userId);
          this.logger.log(`Demo data seeded for org ${resolvedOrgId} during onboarding`);
        } catch (e) {
          this.logger.warn(`Demo data seed skipped or failed: ${e instanceof Error ? e.message : e}`);
        }
      } else {
        this.logger.log(
          'Skipping demo data seed: organization already has farms (avoids wiping onboarding data).',
        );
      }
    }

    const { data: profileRow } = await client
      .from('user_profiles')
      .select('notification_preferences')
      .eq('id', userId)
      .maybeSingle();

    const prevNotif =
      profileRow?.notification_preferences &&
      typeof profileRow.notification_preferences === 'object'
        ? (profileRow.notification_preferences as Record<string, unknown>)
        : {};
    const notification_preferences = {
      email: true,
      push: true,
      alerts: true,
      reports: false,
      ...prevNotif,
    };
    notification_preferences.email = dto.enable_notifications;
    notification_preferences.push = dto.enable_notifications;
    notification_preferences.alerts = dto.enable_notifications;

    const { error: profileError } = await client
      .from('user_profiles')
      .update({
        onboarding_completed: true,
        onboarding_completed_at: new Date().toISOString(),
        onboarding_state: null,
        onboarding_current_step: 1,
        notification_preferences,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (profileError) {
      this.logger.error(`Failed to update profile: ${profileError.message}`);
      throw new InternalServerErrorException('Failed to update profile');
    }

    return { success: true };
  }

  /**
   * Complete onboarding (mark as completed)
   */
  async completeOnboarding(userId: string): Promise<{ success: boolean }> {
    const client = this.databaseService.getAdminClient();

    const { error } = await client
      .from('user_profiles')
      .update({
        onboarding_completed: true,
        onboarding_completed_at: new Date().toISOString(),
        onboarding_state: null,
        onboarding_current_step: 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      this.logger.error(`Failed to complete onboarding: ${error.message}`);
      throw new InternalServerErrorException('Failed to complete onboarding');
    }

    return { success: true };
  }
}
