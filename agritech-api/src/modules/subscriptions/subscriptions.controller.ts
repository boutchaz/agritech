import { Controller, Post, Body, UseGuards, Request, Get, BadRequestException } from '@nestjs/common';
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
import { PoliciesGuard } from '../casl/policies.guard';
import { CheckPolicies } from '../casl/check-policies.decorator';
import { Action } from '../casl/action.enum';
import { AppAbility } from '../casl/casl-ability.factory';

@ApiTags('subscriptions')
@Controller('subscriptions')
@UseGuards(JwtAuthGuard, PoliciesGuard)
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
  @CheckPolicies((ability: AppAbility) => ability.can(Action.Read, 'Subscription'))
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
