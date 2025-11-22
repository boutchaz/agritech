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
}
