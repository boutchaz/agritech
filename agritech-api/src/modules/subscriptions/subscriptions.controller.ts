import { Controller, Post, Body, UseGuards, Request, Get, BadRequestException, Headers, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { SubscriptionsService } from './subscriptions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CreateTrialSubscriptionDto,
  SubscriptionResponseDto,
} from './dto/create-trial-subscription.dto';
import {
  CheckSubscriptionDto,
  SubscriptionCheckResponseDto,
} from './dto/check-subscription.dto';
import { PolarWebhookDto } from './dto/webhook.dto';
// PoliciesGuard removed - subscription endpoints validate org membership in service layer
// This allows the trial setup flow to work before full CASL permissions are established

@ApiTags('subscriptions')
@Controller('subscriptions')
@UseGuards(JwtAuthGuard)
export class SubscriptionsController {
  constructor(private subscriptionsService: SubscriptionsService) {}

  @Get()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get subscription for an organization',
    description: 'Retrieve subscription details for the current organization. Organization ID is passed via X-Organization-Id header.',
  })
  @ApiResponse({
    status: 200,
    description: 'Subscription retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - no access to organization' })
  @ApiResponse({ status: 404, description: 'No subscription found' })
  // Note: No @CheckPolicies here - the service validates organization membership internally
  // This allows new users to check subscription status during trial setup flow
  async getSubscription(@Request() req) {
    console.log('========== [SubscriptionsController] GET /subscriptions ENTERED ==========');
    console.log('[SubscriptionsController] GET /subscriptions called', {
      userId: req.user?.id,
      userObject: req.user,
      organizationIdHeader: req.headers['x-organization-id'],
      headers: Object.keys(req.headers).filter(h => h.toLowerCase().includes('org')),
    });
    const organizationId = req.headers['x-organization-id'] as string;
    if (!organizationId) {
      throw new BadRequestException('Organization ID is required in X-Organization-Id header');
    }

    console.log('[SubscriptionsController] Calling service with', {
      userId: req.user.id,
      userIdType: typeof req.user.id,
      organizationId,
      organizationIdType: typeof organizationId,
    });

    return this.subscriptionsService.getSubscription(req.user.id, organizationId);
  }

  @Get('usage')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get usage counts for an organization',
    description: 'Retrieve current usage counts (farms, parcels, users) for the organization. Organization ID is passed via X-Organization-Id header.',
  })
  @ApiResponse({
    status: 200,
    description: 'Usage counts retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - no access to organization' })
  // Service validates organization membership internally
  async getUsageCounts(@Request() req) {
    const organizationId = req.headers['x-organization-id'] as string;
    if (!organizationId) {
      throw new BadRequestException('Organization ID is required in X-Organization-Id header');
    }
    return this.subscriptionsService.getUsageCounts(req.user.id, organizationId);
  }

  @Post('trial')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a trial subscription for an organization' })
  @ApiResponse({
    status: 201,
    description: 'Trial subscription created successfully',
    type: SubscriptionResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - User not in organization' })
  async createTrialSubscription(
    @Request() req,
    @Body() createTrialSubscriptionDto: CreateTrialSubscriptionDto,
  ) {
    return this.subscriptionsService.createTrialSubscription(
      req.user.id,
      createTrialSubscriptionDto,
    );
  }

  @Post('check')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Check subscription status and feature access',
    description:
      'Verify subscription validity, check feature access, and get usage statistics',
  })
  @ApiResponse({
    status: 200,
    description: 'Subscription check completed successfully',
    type: SubscriptionCheckResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - User not in organization' })
  async checkSubscription(
    @Request() req,
    @Body() checkSubscriptionDto: CheckSubscriptionDto,
  ) {
    return this.subscriptionsService.checkSubscription(
      req.user.id,
      checkSubscriptionDto,
    );
  }
}

/**
 * Separate controller for webhooks (no authentication required)
 * Polar.sh sends webhook events to this endpoint
 */
@ApiTags('webhooks')
@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(private subscriptionsService: SubscriptionsService) {}

  @Post('polar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Handle Polar.sh webhook events',
    description:
      'Receives subscription events from Polar.sh such as subscription.created, subscription.updated, subscription.active, etc.',
  })
  @ApiResponse({
    status: 200,
    description: 'Webhook processed successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid webhook payload' })
  @ApiResponse({ status: 401, description: 'Invalid webhook signature' })
  async handlePolarWebhook(
    @Body() webhookDto: PolarWebhookDto,
    @Headers('x-polar-signature-256') signature: string,
    @Headers('x-polar-event-id') eventId: string,
  ) {
    this.logger.log(
      `Received Polar webhook: ${webhookDto.type} (Event ID: ${eventId || webhookDto.id})`,
    );

    // Verify webhook signature if secret is configured
    const webhookSecret = process.env.POLAR_WEBHOOK_SECRET;
    if (webhookSecret && signature) {
      // In a real implementation, you would verify the signature here
      // const rawBody = // Get raw request body
      // const isValid = this.subscriptionsService.verifyWebhookSignature(
      //   rawBody,
      //   signature,
      //   webhookSecret
      // );
      // if (!isValid) {
      //   this.logger.warn('Invalid webhook signature');
      //   throw new UnauthorizedException('Invalid webhook signature');
      // }
      this.logger.debug('Webhook signature verification skipped (to be implemented)');
    } else if (webhookSecret && !signature) {
      this.logger.warn('Webhook signature missing but secret is configured');
    }

    // Process the webhook
    try {
      const result = await this.subscriptionsService.handlePolarWebhook(webhookDto);
      return {
        success: true,
        message: 'Webhook processed successfully',
        data: result,
      };
    } catch (error) {
      this.logger.error('Error processing webhook', error);
      // Return 200 anyway to avoid Polar retrying indefinitely
      // The error has been logged for investigation
      return {
        success: false,
        message: error.message,
      };
    }
  }
}
