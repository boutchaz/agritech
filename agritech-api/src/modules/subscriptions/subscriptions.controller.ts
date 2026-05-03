import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Get,
  BadRequestException,
  HttpCode,
  HttpStatus,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
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
import { CheckoutDto, CheckoutResponseDto } from './dto/checkout.dto';
import {
  CheckSubscriptionDto,
  SubscriptionCheckResponseDto,
} from './dto/check-subscription.dto';
import {
  CreateModularQuoteDto,
  CreateQuoteDto,
  ModularQuoteResponseDto,
  QuoteResponseDto,
} from './dto/quote.dto';
import { SubscriptionCatalogResponseDto } from './dto/catalog.dto';
import {
  RenewalNoticeDto,
  TerminateSubscriptionDto,
} from './dto/lifecycle.dto';

// Polar billing integration is currently disabled (Morocco-only operation).
// The checkout + webhook endpoints below return 503 to avoid exercising the
// SDK at runtime. Restore by re-importing @polar-sh/sdk/webhooks here and
// undoing the throws in createCheckout / handlePolarWebhook below.

@ApiTags('subscriptions')
@Controller('subscriptions')
@UseGuards(JwtAuthGuard)
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get subscription for an organization',
  })
  async getSubscription(@Request() req) {
    const organizationId = req.headers['x-organization-id'] as string;
    if (!organizationId) {
      throw new BadRequestException(
        'Organization ID is required in X-Organization-Id header',
      );
    }

    return this.subscriptionsService.getSubscription(req.user.id, organizationId);
  }

  @Get('current')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get current subscription including contract lifecycle fields',
  })
  async getCurrentSubscription(@Request() req) {
    const organizationId = req.headers['x-organization-id'] as string;
    if (!organizationId) {
      throw new BadRequestException(
        'Organization ID is required in X-Organization-Id header',
      );
    }

    return this.subscriptionsService.getCurrentSubscription(
      req.user.id,
      organizationId,
    );
  }

  @Get('usage')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get usage counts for an organization',
  })
  async getUsageCounts(@Request() req) {
    const organizationId = req.headers['x-organization-id'] as string;
    if (!organizationId) {
      throw new BadRequestException(
        'Organization ID is required in X-Organization-Id header',
      );
    }

    return this.subscriptionsService.getUsageCounts(req.user.id, organizationId);
  }

  @Get('catalog')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get subscription formulas and billing cycles catalog' })
  @ApiResponse({ status: 200, type: SubscriptionCatalogResponseDto })
  async getCatalog() {
    return this.subscriptionsService.getSubscriptionCatalog();
  }

  @Post('quote')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate pricing quote for formula/hectares/cycle' })
  @ApiResponse({ status: 201, type: QuoteResponseDto })
  async createQuote(@Body() dto: CreateQuoteDto) {
    return this.subscriptionsService.createQuote(dto);
  }

  @Post('quote/modular')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate pricing quote for modular pricing selection' })
  @ApiResponse({ status: 201, type: ModularQuoteResponseDto })
  async createModularQuote(@Body() dto: CreateModularQuoteDto) {
    return this.subscriptionsService.createModularQuote(dto);
  }

  @Post('checkout')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Create a Polar checkout URL and persist quote snapshot for migration/reconciliation',
  })
  @ApiResponse({ status: 201, type: CheckoutResponseDto })
  async createCheckout(@Request() _req, @Body() _checkoutDto: CheckoutDto) {
    // Billing checkout is disabled — Polar integration paused for Morocco-only ops.
    // Subscriptions are managed manually by admins until a regional billing
    // provider is wired up. Re-enable by restoring the body below.
    throw new ServiceUnavailableException(
      'Online subscription checkout is currently disabled. Contact an administrator to upgrade your plan.',
    );
  }

  @Post('trial')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a trial subscription for an organization' })
  @ApiResponse({ status: 201, type: SubscriptionResponseDto })
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
    summary: 'Check subscription status, feature access, and usage',
  })
  @ApiResponse({ status: 200, type: SubscriptionCheckResponseDto })
  async checkSubscription(
    @Request() req,
    @Body() checkSubscriptionDto: CheckSubscriptionDto,
  ) {
    return this.subscriptionsService.checkSubscription(
      req.user.id,
      checkSubscriptionDto,
    );
  }

  @Post('renewal/notice')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Register renewal notice event for an organization' })
  async registerRenewalNotice(@Request() req, @Body() dto: RenewalNoticeDto) {
    return this.subscriptionsService.registerRenewalNotice(req.user.id, dto);
  }

  @Post('terminate')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Terminate subscription and start export/deletion lifecycle countdown',
  })
  async terminateSubscription(@Request() req, @Body() dto: TerminateSubscriptionDto) {
    return this.subscriptionsService.terminateSubscription(req.user.id, dto);
  }
}

@ApiTags('webhooks')
@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor() {}

  @Post('polar')
  @HttpCode(HttpStatus.SERVICE_UNAVAILABLE)
  @ApiOperation({ summary: 'Polar webhook (disabled — Morocco-only ops)' })
  async handlePolarWebhook() {
    // Polar webhook handler is disabled. To re-enable, restore the prior
    // implementation: read req.rawBody, verify signature with
    // POLAR_WEBHOOK_SECRET via @polar-sh/sdk/webhooks → validateEvent, then
    // dispatch event.type to subscriptionsService.handlePolarWebhook(...).
    this.logger.warn('Received Polar webhook while billing integration is disabled — ignoring.');
    throw new ServiceUnavailableException('Polar webhooks are currently disabled.');
  }
}
