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

    // Check subscription validity using database function
    const { data: isValid, error: validError } = await this.supabaseAdmin.rpc(
      'has_valid_subscription',
      { org_id: organizationId },
    );

    if (validError) {
      this.logger.error('Error checking subscription validity', validError);
      throw new InternalServerErrorException(
        'Failed to check subscription validity',
      );
    }

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
}
