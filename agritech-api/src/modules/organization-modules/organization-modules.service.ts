import { Injectable, Logger, NotFoundException, ForbiddenException, InternalServerErrorException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { UpdateModuleDto } from './dto/update-module.dto';
import {
  isFormulaAtLeast,
  normalizeFormula,
} from '../subscriptions/subscription-domain';

@Injectable()
export class OrganizationModulesService {
  private readonly logger = new Logger(OrganizationModulesService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Get all modules with activation status for an organization
   */
  async getOrganizationModules(userId: string, organizationId: string) {
    const client = this.databaseService.getAdminClient();

    // Verify user has access to this organization
    const { data: orgUser, error: orgError } = await client
      .from('organization_users')
      .select('organization_id')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle();

    if (orgError || !orgUser) {
      throw new ForbiddenException('You do not have access to this organization');
    }

    // Get all available modules
    const { data: allModules, error: modulesError } = await client
      .from('modules')
      .select('id, name, icon, category, description, required_plan')
      .eq('is_available', true)
      .order('category')
      .order('name');

    if (modulesError) {
      this.logger.error(`Failed to fetch modules: ${modulesError.message}`);
      throw new InternalServerErrorException('Failed to fetch modules');
    }

    // Get organization's module activations
    const { data: orgModules, error: orgModulesError } = await client
      .from('organization_modules')
      .select('module_id, is_active, settings')
      .eq('organization_id', organizationId);

    if (orgModulesError) {
      this.logger.error(`Failed to fetch organization modules: ${orgModulesError.message}`);
      throw new InternalServerErrorException('Failed to fetch organization modules');
    }

    // Create a map of module_id -> activation status
    const activationMap = new Map(
      (orgModules || []).map((om: any) => [om.module_id, { is_active: om.is_active, settings: om.settings }])
    );

    // Transform the response to include activation status
    const transformedModules = (allModules || []).map((module: any) => {
      const activation = activationMap.get(module.id);
      return {
        id: module.id,
        name: module.name,
        icon: module.icon,
        category: module.category,
        description: module.description,
        required_plan: module.required_plan,
        is_active: activation?.is_active || false,
        settings: activation?.settings || {},
      };
    });

    return transformedModules;
  }

  /**
   * Update module activation status or settings for an organization
   */
  async updateOrganizationModule(
    userId: string,
    organizationId: string,
    moduleId: string,
    updateDto: UpdateModuleDto,
  ) {
    const client = this.databaseService.getAdminClient();

    // Verify user is admin of the organization
    const { data: orgUser, error: orgError } = await client
      .from('organization_users')
      .select(`
        organization_id,
        role:roles!organization_users_role_id_fkey(name)
      `)
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle();

    if (orgError || !orgUser) {
      throw new ForbiddenException('You do not have access to this organization');
    }

    // Role is returned as array by Supabase foreign key join
    const role = Array.isArray(orgUser.role) ? orgUser.role[0] : orgUser.role;
    const roleName = role?.name;
    if (roleName !== 'system_admin' && roleName !== 'organization_admin') {
      throw new ForbiddenException('You do not have permission to update modules');
    }

    // Verify module exists and get full details
    const { data: module, error: moduleError } = await client
      .from('modules')
      .select('id, name, icon, category, description, required_plan')
      .eq('id', moduleId)
      .eq('is_available', true)
      .maybeSingle();

    if (moduleError || !module) {
      throw new NotFoundException('Module not found');
    }

    // If trying to activate a premium module, check subscription
    if (updateDto.is_active && module.required_plan) {
      const { data: subscription } = await client
        .from('subscriptions')
        .select('plan_type, formula, status')
        .eq('organization_id', organizationId)
        .maybeSingle();

      const requiredFormula = normalizeFormula(module.required_plan);
      const currentFormula = normalizeFormula(
        subscription?.formula || subscription?.plan_type,
      );

      if (
        !subscription ||
        subscription.status !== 'active' ||
        (requiredFormula &&
          (!currentFormula || !isFormulaAtLeast(currentFormula, requiredFormula)))
      ) {
        throw new ForbiddenException(
          `This module requires ${module.required_plan} plan or higher. Please upgrade your subscription.`
        );
      }
    }

    // Upsert the organization_modules record (create if not exists, update if exists)
    const { data: upsertedModule, error: upsertError } = await client
      .from('organization_modules')
      .upsert({
        organization_id: organizationId,
        module_id: moduleId,
        is_active: updateDto.is_active,
        settings: updateDto.settings || {},
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'organization_id,module_id',
      })
      .select('module_id, is_active, settings')
      .single();

    if (upsertError) {
      this.logger.error(`Failed to update module: ${upsertError.message}`);
      throw new InternalServerErrorException('Failed to update module');
    }

    return {
      id: module.id,
      name: module.name || '',
      icon: module.icon || '',
      category: module.category || '',
      description: module.description || '',
      required_plan: module.required_plan,
      is_active: upsertedModule.is_active,
      settings: upsertedModule.settings,
    };
  }
}
