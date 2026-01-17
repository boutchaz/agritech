import { Injectable, Logger, BadRequestException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
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
   * Get onboarding state for the current user
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

    return data.onboarding_state;
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
  async clearState(userId: string) {
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
  }

  /**
   * Save user profile (Step 1)
   */
  async saveProfile(userId: string, email: string, dto: SaveOnboardingProfileDto) {
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
        throw new InternalServerErrorException('Failed to create organization');
      }

      const organizationId = data.id;

      // Add user to organization
      const { error: orgUserError } = await client
        .from('organization_users')
        .insert({
          organization_id: organizationId,
          user_id: userId,
          role_id: null, // Will be set to default owner role
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
   */
  async saveFarm(userId: string, dto: SaveOnboardingFarmDto): Promise<{ id: string }> {
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

    // Create farm
    const { data, error } = await client
      .from('farms')
      .insert({
        organization_id: organizationId,
        name: dto.name,
        location: dto.location,
        size: dto.size,
        size_unit: dto.size_unit,
        farm_type: dto.farm_type || 'main',
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

  /**
   * Save selected modules (Step 4)
   */
  async saveModules(userId: string, dto: SaveOnboardingModulesDto) {
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

    // Get selected module names
    const selectedModuleNames = Object.entries(dto.moduleSelection)
      .filter(([_, enabled]) => enabled)
      .map(([name, _]) => name);

    if (selectedModuleNames.length === 0) {
      return;
    }

    // Fetch module IDs
    const { data: modules, error: modulesError } = await client
      .from('modules')
      .select('id')
      .in('name', selectedModuleNames);

    if (modulesError) {
      this.logger.error(`Failed to fetch modules: ${modulesError.message}`);
      throw new InternalServerErrorException('Failed to fetch modules');
    }

    if (!modules || modules.length === 0) {
      return;
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
  }

  /**
   * Save preferences and complete onboarding (Step 5)
   */
  async savePreferencesAndComplete(
    userId: string,
    organizationId: string | null,
    dto: SaveOnboardingPreferencesDto,
  ) {
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

    // Update user profile with language preference
    const { error: profileError } = await client
      .from('user_profiles')
      .update({
        language: dto.language || 'fr',
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
  }

  /**
   * Complete onboarding (mark as completed)
   */
  async completeOnboarding(userId: string) {
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
  }
}
