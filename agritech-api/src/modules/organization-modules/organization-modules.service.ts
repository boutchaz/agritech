import { Injectable, Logger, NotFoundException, ForbiddenException, InternalServerErrorException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { UpdateModuleDto } from './dto/update-module.dto';
import {
  isFormulaAtLeast,
  normalizeFormula,
} from '../subscriptions/subscription-domain';
import { ModuleConfigService } from '../module-config/module-config.service';
import { ModuleConfigResponseDto } from '../module-config/dto/module-config.dto';

@Injectable()
export class OrganizationModulesService {
  private readonly logger = new Logger(OrganizationModulesService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly moduleConfigService: ModuleConfigService,
  ) {}

  /**
   * Get the full module config (catalog metadata + pricing + widget map)
   * enriched with per-organization activation state. Single source of truth
   * for authenticated UI — replaces the public /module-config endpoint for
   * org-scoped consumers.
   */
  async getOrganizationModules(
    userId: string,
    organizationId: string,
    locale: string = 'en',
  ): Promise<ModuleConfigResponseDto> {
    const client = this.databaseService.getAdminClient();

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

    const baseConfig = await this.moduleConfigService.getModuleConfig(locale);

    const { data: orgModules, error: orgModulesError } = await client
      .from('organization_modules')
      .select('module_id, is_active, settings')
      .eq('organization_id', organizationId);

    if (orgModulesError) {
      this.logger.error(`Failed to fetch organization modules: ${orgModulesError.message}`);
      throw new InternalServerErrorException('Failed to fetch organization modules');
    }

    const activationMap = new Map<string, { is_active: boolean; settings: Record<string, unknown> }>(
      (orgModules || []).map((om: any) => [
        om.module_id,
        { is_active: !!om.is_active, settings: (om.settings as Record<string, unknown>) || {} },
      ]),
    );

    return {
      ...baseConfig,
      modules: baseConfig.modules.map((m) => {
        const activation = activationMap.get(m.id);
        return {
          ...m,
          isActive: activation?.is_active ?? m.isRequired ?? false,
          settings: activation?.settings ?? {},
        };
      }),
    };
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
    if (roleName !== 'system_admin') {
      throw new ForbiddenException(
        'Module activation is managed by system administrators. Please contact sales to enable additional modules.',
      );
    }

    // Verify module exists and get full details
    const { data: module, error: moduleError } = await client
      .from('modules')
      .select('id, slug, name, icon, category, description, required_plan, is_required')
      .eq('id', moduleId)
      .eq('is_available', true)
      .maybeSingle();

    if (moduleError || !module) {
      throw new NotFoundException('Module not found');
    }

    // Block deactivation of required modules (e.g. core)
    if (updateDto.is_active === false && module.is_required) {
      throw new ForbiddenException(
        `Module '${module.slug}' is required and cannot be deactivated.`,
      );
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
      slug: module.slug,
      name: module.name || '',
      icon: module.icon || '',
      category: module.category || '',
      description: module.description || '',
      required_plan: module.required_plan,
      is_required: module.is_required || false,
      is_active: upsertedModule.is_active,
      settings: upsertedModule.settings,
    };
  }
}
