import { Injectable, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import {
  SaveOnboardingProfileDto,
  SaveOnboardingOrganizationDto,
  SaveOnboardingFarmDto,
  SaveOnboardingModulesDto,
  SaveOnboardingPreferencesDto,
  OnboardingStateDto,
} from './dto/onboarding.dto';

const STORAGE_VERSION = 2;

@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);

  constructor(private databaseService: DatabaseService) {}

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
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingOrgId)
        .select('id')
        .single();

      if (error) {
        this.logger.error(`Failed to update organization: ${error.message}`);
        throw new InternalServerErrorException('Failed to update organization');
      }

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

    if (farmId) {
      // Update existing farm
      const { data, error } = await client
        .from('farms')
        .update({
          name: dto.name,
          location: dto.location,
          size: dto.size,
          size_unit: dto.size_unit,
          description: dto.description || null,
          soil_type: dto.soil_type || null,
          climate_zone: dto.climate_zone || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', farmId)
        .select('id')
        .single();

      if (error) {
        this.logger.error(`Failed to update farm: ${error.message}`);
        throw new InternalServerErrorException('Failed to update farm');
      }

      return { id: data.id };
    } else {
      // Create new farm
      // Note: farms table doesn't have farm_type column - hierarchy not yet supported
      const { data, error } = await client
        .from('farms')
        .insert({
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
        })
        .select('id')
        .single();

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

    // Update organization with currency preference
    if (organizationId) {
      const { error: orgError } = await client
        .from('organizations')
        .update({
          currency_code: dto.currency,
          updated_at: new Date().toISOString(),
        })
        .eq('id', organizationId);

      if (orgError) {
        this.logger.error(`Failed to update organization: ${orgError.message}`);
        throw new InternalServerErrorException('Failed to update organization');
      }
    }

    // Update user profile with onboarding completion
    const { error: profileError } = await client
      .from('user_profiles')
      .update({
        onboarding_completed: true,
        onboarding_completed_at: new Date().toISOString(),
        onboarding_state: null,
        onboarding_current_step: 1,
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
