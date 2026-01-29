import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../database/database.service';
import {
  PurchaseAddonDto,
  CancelAddonDto,
  AddonModuleDto,
  OrganizationAddonDto,
  AddonsOverviewDto,
  AddonSlotsDto,
} from './dto/addon.dto';

interface ModuleRow {
  id: string;
  name: string;
  icon: string | null;
  category: string | null;
  description: string | null;
  required_plan: string | null;
  is_addon_eligible: boolean;
  addon_price_monthly: number | null;
  addon_product_id: string | null;
}

interface OrganizationAddonRow {
  id: string;
  organization_id: string;
  module_id: string;
  polar_subscription_id: string | null;
  polar_customer_id: string | null;
  status: string;
  price_monthly: number | null;
  started_at: string;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
  module?: ModuleRow | ModuleRow[];
}

interface SubscriptionRow {
  id: string;
  organization_id: string;
  plan_type: string;
  status: string;
  included_addon_slots: number | null;
  additional_addon_slots: number | null;
}

@Injectable()
export class AddonsService {
  private readonly logger = new Logger(AddonsService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly configService: ConfigService,
  ) {}

  private async validateOrgAccess(userId: string, organizationId: string): Promise<{ isAdmin: boolean }> {
    const client = this.databaseService.getAdminClient();

    const { data: orgUser, error } = await client
      .from('organization_users')
      .select(`
        organization_id,
        role:roles!organization_users_role_id_fkey(name)
      `)
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle();

    if (error || !orgUser) {
      throw new ForbiddenException('You do not have access to this organization');
    }

    const role = Array.isArray(orgUser.role) ? orgUser.role[0] : orgUser.role;
    const roleName = role?.name;
    const isAdmin = roleName === 'system_admin' || roleName === 'organization_admin';

    return { isAdmin };
  }

  async getAvailableAddons(userId: string, organizationId: string): Promise<AddonModuleDto[]> {
    await this.validateOrgAccess(userId, organizationId);

    const client = this.databaseService.getAdminClient();

    const { data: modules, error } = await client
      .from('modules')
      .select('id, name, icon, category, description, required_plan, is_addon_eligible, addon_price_monthly, addon_product_id')
      .eq('is_addon_eligible', true)
      .eq('is_available', true)
      .order('category')
      .order('name');

    if (error) {
      this.logger.error(`Failed to fetch addon modules: ${error.message}`);
      throw new InternalServerErrorException('Failed to fetch available addons');
    }

    return (modules || []).map((m: ModuleRow) => ({
      id: m.id,
      name: m.name,
      icon: m.icon || undefined,
      category: m.category || undefined,
      description: m.description || undefined,
      required_plan: m.required_plan || undefined,
      is_addon_eligible: m.is_addon_eligible,
      addon_price_monthly: m.addon_price_monthly || undefined,
      addon_product_id: m.addon_product_id || undefined,
    }));
  }

  async getOrganizationAddons(userId: string, organizationId: string): Promise<OrganizationAddonDto[]> {
    await this.validateOrgAccess(userId, organizationId);

    const client = this.databaseService.getAdminClient();

    const { data: addons, error } = await client
      .from('organization_addons')
      .select(`
        id, organization_id, module_id, polar_subscription_id, polar_customer_id,
        status, price_monthly, started_at, current_period_start, current_period_end,
        cancel_at_period_end, canceled_at,
        module:modules!organization_addons_module_id_fkey(
          id, name, icon, category, description, required_plan,
          is_addon_eligible, addon_price_monthly, addon_product_id
        )
      `)
      .eq('organization_id', organizationId)
      .in('status', ['active', 'trialing'])
      .order('started_at', { ascending: false });

    if (error) {
      this.logger.error(`Failed to fetch organization addons: ${error.message}`);
      throw new InternalServerErrorException('Failed to fetch organization addons');
    }

    return (addons || []).map((a: OrganizationAddonRow) => {
      const moduleData = Array.isArray(a.module) ? a.module[0] : a.module;
      return {
        id: a.id,
        organization_id: a.organization_id,
        module_id: a.module_id,
        module: moduleData ? {
          id: moduleData.id,
          name: moduleData.name,
          icon: moduleData.icon || undefined,
          category: moduleData.category || undefined,
          description: moduleData.description || undefined,
          required_plan: moduleData.required_plan || undefined,
          is_addon_eligible: moduleData.is_addon_eligible,
          addon_price_monthly: moduleData.addon_price_monthly || undefined,
          addon_product_id: moduleData.addon_product_id || undefined,
        } : {} as AddonModuleDto,
        polar_subscription_id: a.polar_subscription_id || undefined,
        status: a.status,
        price_monthly: a.price_monthly || undefined,
        started_at: a.started_at,
        current_period_start: a.current_period_start || undefined,
        current_period_end: a.current_period_end || undefined,
        cancel_at_period_end: a.cancel_at_period_end,
        canceled_at: a.canceled_at || undefined,
      };
    });
  }

  async getAddonSlots(userId: string, organizationId: string): Promise<AddonSlotsDto> {
    await this.validateOrgAccess(userId, organizationId);

    const client = this.databaseService.getAdminClient();

    const { data: subscription, error: subError } = await client
      .from('subscriptions')
      .select('included_addon_slots, additional_addon_slots')
      .eq('organization_id', organizationId)
      .in('status', ['active', 'trialing'])
      .maybeSingle();

    if (subError) {
      this.logger.error(`Failed to fetch subscription: ${subError.message}`);
      throw new InternalServerErrorException('Failed to fetch subscription');
    }

    const included = subscription?.included_addon_slots || 0;
    const additional = subscription?.additional_addon_slots || 0;
    const total = included + additional;

    const { count: usedCount, error: countError } = await client
      .from('organization_addons')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .in('status', ['active', 'trialing']);

    if (countError) {
      this.logger.error(`Failed to count addons: ${countError.message}`);
      throw new InternalServerErrorException('Failed to count addons');
    }

    const used = usedCount || 0;

    return {
      included,
      additional,
      total,
      used,
      available: Math.max(total - used, 0),
    };
  }

  async getAddonsOverview(userId: string, organizationId: string): Promise<AddonsOverviewDto> {
    const [slots, activeAddons, availableAddons] = await Promise.all([
      this.getAddonSlots(userId, organizationId),
      this.getOrganizationAddons(userId, organizationId),
      this.getAvailableAddons(userId, organizationId),
    ]);

    const activeModuleIds = new Set(activeAddons.map(a => a.module_id));
    const filteredAvailable = availableAddons.filter(m => !activeModuleIds.has(m.id));

    return {
      slots,
      active_addons: activeAddons,
      available_addons: filteredAvailable,
    };
  }

  async purchaseAddon(
    userId: string,
    organizationId: string,
    dto: PurchaseAddonDto,
  ): Promise<{ checkout_url: string; addon_id?: string }> {
    const { isAdmin } = await this.validateOrgAccess(userId, organizationId);

    if (!isAdmin) {
      throw new ForbiddenException('Only administrators can purchase addons');
    }

    const client = this.databaseService.getAdminClient();

    const { data: module, error: moduleError } = await client
      .from('modules')
      .select('id, name, is_addon_eligible, addon_price_monthly, addon_product_id')
      .eq('id', dto.module_id)
      .eq('is_addon_eligible', true)
      .eq('is_available', true)
      .maybeSingle();

    if (moduleError || !module) {
      throw new NotFoundException('Module not found or not available as addon');
    }

    const { data: existingAddon } = await client
      .from('organization_addons')
      .select('id, status')
      .eq('organization_id', organizationId)
      .eq('module_id', dto.module_id)
      .maybeSingle();

    if (existingAddon && existingAddon.status === 'active') {
      throw new BadRequestException('This addon is already active for your organization');
    }

    const slots = await this.getAddonSlots(userId, organizationId);
    if (slots.available <= 0) {
      throw new BadRequestException('No addon slots available. Please purchase additional slots or upgrade your plan.');
    }

    const polarCheckoutUrl = this.configService.get<string>('POLAR_CHECKOUT_URL');
    const productId = module.addon_product_id;

    if (!polarCheckoutUrl || !productId) {
      const periodEnd = new Date();
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      const { data: addon, error: addonError } = await client
        .from('organization_addons')
        .upsert({
          organization_id: organizationId,
          module_id: dto.module_id,
          status: 'active',
          price_monthly: module.addon_price_monthly,
          started_at: new Date().toISOString(),
          current_period_start: new Date().toISOString(),
          current_period_end: periodEnd.toISOString(),
          cancel_at_period_end: false,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'organization_id,module_id',
        })
        .select('id')
        .single();

      if (addonError) {
        this.logger.error(`Failed to create addon: ${addonError.message}`);
        throw new InternalServerErrorException('Failed to activate addon');
      }

      await this.activateModuleForOrganization(organizationId, dto.module_id);

      return {
        checkout_url: dto.success_url || '/settings/modules',
        addon_id: addon.id,
      };
    }

    const url = new URL(polarCheckoutUrl);
    url.searchParams.set('product_id', productId);
    url.searchParams.set('metadata[organization_id]', organizationId);
    url.searchParams.set('metadata[module_id]', dto.module_id);
    url.searchParams.set('metadata[type]', 'addon');

    if (dto.success_url) {
      url.searchParams.set('success_url', dto.success_url);
    }

    return {
      checkout_url: url.toString(),
    };
  }

  async cancelAddon(
    userId: string,
    organizationId: string,
    dto: CancelAddonDto,
  ): Promise<{ success: boolean; message: string }> {
    const { isAdmin } = await this.validateOrgAccess(userId, organizationId);

    if (!isAdmin) {
      throw new ForbiddenException('Only administrators can cancel addons');
    }

    const client = this.databaseService.getAdminClient();

    const { data: addon, error: addonError } = await client
      .from('organization_addons')
      .select('id, polar_subscription_id, status')
      .eq('organization_id', organizationId)
      .eq('module_id', dto.module_id)
      .maybeSingle();

    if (addonError || !addon) {
      throw new NotFoundException('Addon not found');
    }

    if (addon.status !== 'active' && addon.status !== 'trialing') {
      throw new BadRequestException('Addon is not active');
    }

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (dto.cancel_immediately) {
      updateData.status = 'canceled';
      updateData.canceled_at = new Date().toISOString();
    } else {
      updateData.cancel_at_period_end = true;
    }

    const { error: updateError } = await client
      .from('organization_addons')
      .update(updateData)
      .eq('id', addon.id);

    if (updateError) {
      this.logger.error(`Failed to cancel addon: ${updateError.message}`);
      throw new InternalServerErrorException('Failed to cancel addon');
    }

    if (dto.cancel_immediately) {
      await this.deactivateModuleForOrganization(organizationId, dto.module_id);
    }

    return {
      success: true,
      message: dto.cancel_immediately
        ? 'Addon canceled immediately'
        : 'Addon will be canceled at the end of the billing period',
    };
  }

  async hasAddonAccess(organizationId: string, moduleId: string): Promise<boolean> {
    const client = this.databaseService.getAdminClient();

    const { data: addon, error } = await client
      .from('organization_addons')
      .select('id, status, current_period_end')
      .eq('organization_id', organizationId)
      .eq('module_id', moduleId)
      .in('status', ['active', 'trialing'])
      .maybeSingle();

    if (error || !addon) {
      return false;
    }

    if (addon.current_period_end) {
      const endDate = new Date(addon.current_period_end);
      if (endDate < new Date()) {
        return false;
      }
    }

    return true;
  }

  private async activateModuleForOrganization(organizationId: string, moduleId: string): Promise<void> {
    const client = this.databaseService.getAdminClient();

    await client
      .from('organization_modules')
      .upsert({
        organization_id: organizationId,
        module_id: moduleId,
        is_active: true,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'organization_id,module_id',
      });
  }

  private async deactivateModuleForOrganization(organizationId: string, moduleId: string): Promise<void> {
    const client = this.databaseService.getAdminClient();

    await client
      .from('organization_modules')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('organization_id', organizationId)
      .eq('module_id', moduleId);
  }

  async handlePolarWebhook(event: {
    type: string;
    data: {
      subscription_id?: string;
      product_id?: string;
      status?: string;
      metadata?: Record<string, string>;
      current_period_start?: string;
      current_period_end?: string;
      customer_id?: string;
    };
  }): Promise<void> {
    const { type, data } = event;

    if (!data.metadata?.type || data.metadata.type !== 'addon') {
      return;
    }

    const organizationId = data.metadata.organization_id;
    const moduleId = data.metadata.module_id;

    if (!organizationId || !moduleId) {
      this.logger.warn('Webhook missing organization_id or module_id in metadata');
      return;
    }

    const client = this.databaseService.getAdminClient();

    switch (type) {
      case 'subscription.created':
      case 'subscription.updated':
      case 'subscription.active': {
        const periodEnd = data.current_period_end
          ? new Date(data.current_period_end)
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        await client
          .from('organization_addons')
          .upsert({
            organization_id: organizationId,
            module_id: moduleId,
            polar_subscription_id: data.subscription_id,
            polar_customer_id: data.customer_id,
            status: data.status === 'trialing' ? 'trialing' : 'active',
            current_period_start: data.current_period_start || new Date().toISOString(),
            current_period_end: periodEnd.toISOString(),
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'organization_id,module_id',
          });

        await this.activateModuleForOrganization(organizationId, moduleId);
        break;
      }

      case 'subscription.canceled':
        await client
          .from('organization_addons')
          .update({
            status: 'canceled',
            canceled_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('organization_id', organizationId)
          .eq('module_id', moduleId);

        await this.deactivateModuleForOrganization(organizationId, moduleId);
        break;

      case 'subscription.revoked':
        await client
          .from('organization_addons')
          .update({
            status: 'canceled',
            canceled_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('organization_id', organizationId)
          .eq('module_id', moduleId);

        await this.deactivateModuleForOrganization(organizationId, moduleId);
        break;
    }
  }
}
