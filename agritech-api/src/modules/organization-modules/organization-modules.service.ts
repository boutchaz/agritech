import { Injectable, Logger, NotFoundException, ForbiddenException, InternalServerErrorException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { UpdateModuleDto } from './dto/update-module.dto';

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

    // Get all modules with organization's activation status
    const { data: modules, error: modulesError } = await client
      .from('modules')
      .select(`
        id,
        name,
        icon,
        category,
        description,
        required_plan,
        organization_modules!inner(
          is_active,
          settings
        )
      `)
      .eq('organization_modules.organization_id', organizationId)
      .eq('is_available', true)
      .order('category')
      .order('name');

    if (modulesError) {
      this.logger.error(`Failed to fetch modules: ${modulesError.message}`);
      throw new InternalServerErrorException('Failed to fetch modules');
    }

    // Transform the response to flatten the structure
    const transformedModules = modules?.map((module: any) => ({
      id: module.id,
      name: module.name,
      icon: module.icon,
      category: module.category,
      description: module.description,
      required_plan: module.required_plan,
      is_active: module.organization_modules?.[0]?.is_active || false,
      settings: module.organization_modules?.[0]?.settings || {},
    })) || [];

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

    // Verify module exists
    const { data: module, error: moduleError } = await client
      .from('modules')
      .select('id, required_plan')
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
        .select('plan_type, status')
        .eq('organization_id', organizationId)
        .maybeSingle();

      // Check if organization has required plan
      const planHierarchy = { 'essential': 1, 'professional': 2, 'enterprise': 3 };
      const requiredLevel = planHierarchy[module.required_plan] || 0;
      const currentLevel = subscription?.plan_type ? planHierarchy[subscription.plan_type] || 0 : 0;

      if (!subscription || subscription.status !== 'active' || currentLevel < requiredLevel) {
        throw new ForbiddenException(
          `This module requires ${module.required_plan} plan or higher. Please upgrade your subscription.`
        );
      }
    }

    // Update the organization_modules record
    const { data: updatedModule, error: updateError } = await client
      .from('organization_modules')
      .update({
        ...updateDto,
        updated_at: new Date().toISOString(),
      })
      .eq('organization_id', organizationId)
      .eq('module_id', moduleId)
      .select(`
        module_id,
        is_active,
        settings,
        modules!inner(
          id,
          name,
          icon,
          category,
          description,
          required_plan
        )
      `)
      .single();

    if (updateError) {
      this.logger.error(`Failed to update module: ${updateError.message}`);
      throw new InternalServerErrorException('Failed to update module');
    }

    // Transform response - modules is returned as array by Supabase
    const moduleData = Array.isArray(updatedModule.modules)
      ? updatedModule.modules[0]
      : updatedModule.modules;

    return {
      id: moduleData.id,
      name: moduleData.name,
      icon: moduleData.icon,
      category: moduleData.category,
      description: moduleData.description,
      required_plan: moduleData.required_plan,
      is_active: updatedModule.is_active,
      settings: updatedModule.settings,
    };
  }
}
