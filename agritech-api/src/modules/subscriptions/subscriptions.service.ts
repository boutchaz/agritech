import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  CreateTrialSubscriptionDto,
  PlanType,
} from './dto/create-trial-subscription.dto';
import { CheckSubscriptionDto } from './dto/check-subscription.dto';

@Injectable()
export class SubscriptionsService {
  private readonly supabaseAdmin: SupabaseClient;
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(private configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseServiceKey = this.configService.get<string>(
      'SUPABASE_SERVICE_ROLE_KEY',
    );

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    this.supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  async createTrialSubscription(
    userId: string,
    dto: CreateTrialSubscriptionDto,
  ) {
    const { organization_id, plan_type } = dto;

    this.logger.log(
      `Creating trial subscription for user ${userId} and organization ${organization_id}`,
    );

    // Debug: Check all organization memberships for this user
    this.logger.debug(`Checking organization memberships for user ${userId}`);
    const { data: allOrgUsers } = await this.supabaseAdmin
      .from('organization_users')
      .select('organization_id, role_id, is_active')
      .eq('user_id', userId);

    this.logger.debug(
      `User ${userId} belongs to ${allOrgUsers?.length || 0} organizations: ${JSON.stringify(allOrgUsers)}`,
    );

    // Verify user belongs to the organization
    const { data: orgUser, error: orgUserError } = await this.supabaseAdmin
      .from('organization_users')
      .select('organization_id, role_id, is_active')
      .eq('user_id', userId)
      .eq('organization_id', organization_id)
      .eq('is_active', true)
      .single();

    if (orgUserError || !orgUser) {
      this.logger.error(
        `User ${userId} does not belong to organization ${organization_id}. Error: ${JSON.stringify(orgUserError)}`,
      );
      this.logger.error(
        `Query result - orgUser: ${JSON.stringify(orgUser)}, orgUserError: ${JSON.stringify(orgUserError)}`,
      );
      throw new ForbiddenException(
        'User does not belong to this organization',
      );
    }

    // Check if organization already has a subscription
    const { data: existingSubscription, error: existingError } =
      await this.supabaseAdmin
        .from('subscriptions')
        .select('id, status')
        .eq('organization_id', organization_id)
        .maybeSingle();

    if (existingError && existingError.code !== 'PGRST116') {
      this.logger.error(
        'Error checking existing subscription',
        existingError,
      );
      throw new InternalServerErrorException(
        'Failed to check existing subscription',
      );
    }

    // If organization has an active paid subscription, reject
    if (existingSubscription && existingSubscription.status === 'active') {
      throw new BadRequestException(
        'Organization already has an active subscription',
      );
    }

    // Calculate trial end date (14 days from now)
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 14);

    // Map plan_type to plan_id for Polar.sh integration
    const planIdMap = {
      [PlanType.STARTER]: 'starter-trial',
      [PlanType.PROFESSIONAL]: 'professional-trial',
      [PlanType.ENTERPRISE]: 'enterprise-trial',
    };

    const plan_id = planIdMap[plan_type] || planIdMap[PlanType.PROFESSIONAL];

    let subscription;
    let upsertError;

    if (existingSubscription) {
      // Update existing subscription
      this.logger.log(
        `Updating existing subscription: ${existingSubscription.id}`,
      );
      const { data: updatedSub, error: updateError } =
        await this.supabaseAdmin
          .from('subscriptions')
          .update({
            plan_id: plan_id,
            status: 'trialing',
            current_period_start: new Date().toISOString(),
            current_period_end: trialEndDate.toISOString(),
            cancel_at_period_end: false,
          })
          .eq('id', existingSubscription.id)
          .select()
          .single();

      subscription = updatedSub;
      upsertError = updateError;
    } else {
      // Insert new subscription
      this.logger.log('Creating new subscription');
      const { data: newSub, error: insertError } = await this.supabaseAdmin
        .from('subscriptions')
        .insert({
          organization_id: organization_id,
          plan_id: plan_id,
          status: 'trialing',
          current_period_start: new Date().toISOString(),
          current_period_end: trialEndDate.toISOString(),
          cancel_at_period_end: false,
        })
        .select()
        .single();

      subscription = newSub;
      upsertError = insertError;
    }

    if (upsertError) {
      this.logger.error(
        'Error creating/updating subscription',
        upsertError,
      );
      throw new InternalServerErrorException(
        `Failed to create subscription: ${upsertError.message}`,
      );
    }

    this.logger.log(`Trial subscription created: ${subscription.id}`);

    return { success: true, subscription };
  }

  async checkSubscription(userId: string, dto: CheckSubscriptionDto) {
    const { organizationId, feature } = dto;

    this.logger.log(
      `Checking subscription for user ${userId} and organization ${organizationId}`,
    );

    // Verify user belongs to the organization
    const { data: orgUser, error: orgUserError } = await this.supabaseAdmin
      .from('organization_users')
      .select('organization_id, role_id, is_active')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .single();

    if (orgUserError || !orgUser) {
      this.logger.error(
        `User ${userId} does not have access to organization ${organizationId}`,
      );
      throw new ForbiddenException('Access denied to organization');
    }

    // Check subscription validity using service method
    const isValid = await this.hasValidSubscription(organizationId);

    // Get subscription details
    const { data: subscription } = await this.supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('organization_id', organizationId)
      .maybeSingle();

    const response: any = {
      isValid: isValid === true,
      subscription,
      reason: !isValid
        ? !subscription
          ? 'no_subscription'
          : subscription.status === 'canceled'
            ? 'canceled'
            : subscription.status === 'past_due'
              ? 'past_due'
              : 'expired'
        : undefined,
    };

    // Check specific feature if requested
    if (feature && isValid) {
      const { data: hasFeature, error: featureError } =
        await this.supabaseAdmin.rpc('has_feature_access', {
          org_id: organizationId,
          feature_name: feature,
        });

      if (featureError) {
        this.logger.warn('Error checking feature access', featureError);
      } else {
        response.hasFeature = hasFeature === true;
      }
    }

    // Get usage stats if valid subscription
    if (isValid && subscription) {
      try {
        // Check if can create more resources
        const { data: canCreateFarm } = await this.supabaseAdmin.rpc(
          'can_create_farm',
          { org_id: organizationId },
        );

        const { data: canCreateParcel } = await this.supabaseAdmin.rpc(
          'can_create_parcel',
          { org_id: organizationId },
        );

        const { data: canAddUser } = await this.supabaseAdmin.rpc(
          'can_add_user',
          { org_id: organizationId },
        );

        // Get current counts
        const { count: farmsCount } = await this.supabaseAdmin
          .from('farms')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', organizationId);

        const { count: parcelsCount } = await this.supabaseAdmin
          .from('parcels')
          .select('parcels.id, farms!inner(organization_id)', {
            count: 'exact',
            head: true,
          })
          .eq('farms.organization_id', organizationId);

        const { count: usersCount } = await this.supabaseAdmin
          .from('organization_users')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', organizationId)
          .eq('is_active', true);

        response.usage = {
          farms: {
            current: farmsCount || 0,
            max: subscription.max_farms || 0,
            canCreate: canCreateFarm === true,
          },
          parcels: {
            current: parcelsCount || 0,
            max: subscription.max_parcels || 0,
            canCreate: canCreateParcel === true,
          },
          users: {
            current: usersCount || 0,
            max: subscription.max_users || 0,
            canAdd: canAddUser === true,
          },
        };
      } catch (error) {
        this.logger.warn('Error getting usage stats', error);
        // Don't fail the request if usage stats can't be retrieved
      }
    }

    this.logger.log(
      `Subscription check complete for organization ${organizationId}: isValid=${isValid}`,
    );

    return response;
  }

  /**
   * Check if organization has a valid subscription
   * Migrated from has_valid_subscription SQL function
   */
  async hasValidSubscription(organizationId: string): Promise<boolean> {
    const { data: subscription, error } = await this.supabaseAdmin
      .from('subscriptions')
      .select('status, current_period_end')
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (error) {
      this.logger.error(`Error checking subscription: ${error.message}`);
      return false;
    }

    if (!subscription) {
      return false;
    }

    const isValidStatus = ['active', 'trialing'].includes(subscription.status);
    const isNotExpired = !subscription.current_period_end || new Date(subscription.current_period_end) >= new Date();

    return isValidStatus && isNotExpired;
  }

  async getSubscription(userId: string, organizationId: string) {
    this.logger.log(
      `Getting subscription for user ${userId} and organization ${organizationId}`,
    );

    this.logger.debug(`[getSubscription] Checking membership - userId: "${userId}", orgId: "${organizationId}", types: userId=${typeof userId}, orgId=${typeof organizationId}`);

    // First, check if user exists at all
    const { data: allUserOrgs, error: allOrgsError } = await this.supabaseAdmin
      .from('organization_users')
      .select('user_id, organization_id, role_id, is_active')
      .eq('user_id', userId);

    this.logger.debug(`[getSubscription] All user orgs query - count: ${allUserOrgs?.length || 0}, error: ${JSON.stringify(allOrgsError)}`);
    this.logger.debug(`[getSubscription] All user orgs data: ${JSON.stringify(allUserOrgs)}`);

    // Now check specific organization
    const { data: orgUser, error: orgUserError } = await this.supabaseAdmin
      .from('organization_users')
      .select('user_id, organization_id, role_id, is_active')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .maybeSingle();

    this.logger.debug(`[getSubscription] Specific org check - found: ${!!orgUser}, orgUser: ${JSON.stringify(orgUser)}, error: ${JSON.stringify(orgUserError)}`);

    if (orgUserError || !orgUser) {
      this.logger.error(
        `User ${userId} does not have access to organization ${organizationId}. Error: ${JSON.stringify(orgUserError)}`,
      );
      throw new ForbiddenException('You do not have access to this organization');
    }

    // Get subscription details
    const { data: subscription, error: subscriptionError } = await this.supabaseAdmin
      .from('subscriptions')
      .select('id, organization_id, status, plan_id, plan_type, current_period_start, current_period_end, cancel_at_period_end, created_at, updated_at')
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (subscriptionError && subscriptionError.code !== 'PGRST116') {
      this.logger.error('Error fetching subscription', subscriptionError);
      throw new InternalServerErrorException(
        `Failed to fetch subscription: ${subscriptionError.message}`,
      );
    }

    // Return null if no subscription found (this is expected, not an error)
    return subscription || null;
  }

  /**
   * Get usage counts for an organization
   */
  async getUsageCounts(userId: string, organizationId: string) {
    this.logger.log(
      `Getting usage counts for user ${userId} and organization ${organizationId}`,
    );

    // Verify user belongs to the organization
    const { data: orgUser, error: orgUserError } = await this.supabaseAdmin
      .from('organization_users')
      .select('organization_id, role_id, is_active')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .single();

    if (orgUserError || !orgUser) {
      this.logger.error(
        `User ${userId} does not have access to organization ${organizationId}`,
      );
      throw new ForbiddenException('Access denied to organization');
    }

    // Get farms count
    const { count: farmsCount } = await this.supabaseAdmin
      .from('farms')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId);

    // Get farm IDs for parcels query
    const { data: farms } = await this.supabaseAdmin
      .from('farms')
      .select('id')
      .eq('organization_id', organizationId);

    const farmIds = farms?.map((f) => f.id) || [];
    let parcelsCount = 0;

    if (farmIds.length > 0) {
      const { count } = await this.supabaseAdmin
        .from('parcels')
        .select('*', { count: 'exact', head: true })
        .in('farm_id', farmIds);
      parcelsCount = count || 0;
    }

    // Get users count
    const { count: usersCount } = await this.supabaseAdmin
      .from('organization_users')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('is_active', true);

    return {
      farms_count: farmsCount || 0,
      parcels_count: parcelsCount,
      users_count: usersCount || 0,
      satellite_reports_count: 0, // TODO: Add if satellite reports table exists
    };
  }
}
