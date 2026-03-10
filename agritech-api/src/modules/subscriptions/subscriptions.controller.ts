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
  UnauthorizedException,
  Req,
  UsePipes,
  ValidationPipe,
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
import { CreateQuoteDto, QuoteResponseDto } from './dto/quote.dto';
import { SubscriptionCatalogResponseDto } from './dto/catalog.dto';
import {
  RenewalNoticeDto,
  TerminateSubscriptionDto,
} from './dto/lifecycle.dto';

const polarWebhookModulePath = '@polar-sh/sdk/webhooks';
const { validateEvent, WebhookVerificationError } = require(polarWebhookModulePath);

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

  @Post('checkout')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Create a Polar checkout URL and persist quote snapshot for migration/reconciliation',
  })
  @ApiResponse({ status: 201, type: CheckoutResponseDto })
  async createCheckout(@Request() req, @Body() checkoutDto: CheckoutDto) {
    const organizationId = req.headers['x-organization-id'] as string;
    if (!organizationId) {
      throw new BadRequestException(
        'Organization ID is required in X-Organization-Id header',
      );
    }

    return this.subscriptionsService.createCheckoutUrl(
      req.user.id,
      organizationId,
      checkoutDto,
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

  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Post('polar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle Polar.sh webhook events' })
  @UsePipes(
    new ValidationPipe({
      transform: true,
      whitelist: false,
      forbidNonWhitelisted: false,
    }),
  )
  async handlePolarWebhook(
    @Req()
    req: {
      rawBody?: string;
      headers: Record<string, string | string[] | undefined>;
    },
  ) {
    const rawBody = req.rawBody;
    if (!rawBody) {
      throw new UnauthorizedException('Missing raw body');
    }

    const webhookSecret = process.env.POLAR_WEBHOOK_SECRET;
    if (!webhookSecret) {
      this.logger.error('POLAR_WEBHOOK_SECRET is not configured');
      throw new UnauthorizedException('Invalid webhook signature');
    }

    const normalizedHeaders: Record<string, string> = {};
    for (const [key, value] of Object.entries(req.headers || {})) {
      if (typeof value === 'string') {
        normalizedHeaders[key] = value;
      } else if (Array.isArray(value) && value.length > 0) {
        normalizedHeaders[key] = value[0];
      }
    }

    let event: { type: string; data: Record<string, unknown> };
    try {
      event = validateEvent(rawBody, normalizedHeaders, webhookSecret);
    } catch (error) {
      if (error instanceof WebhookVerificationError) {
        throw new UnauthorizedException('Invalid webhook signature');
      }
      throw error;
    }

    try {
      const result = await this.subscriptionsService.handlePolarWebhook(
        event.type,
        event.data,
      );
      return {
        success: true,
        message: 'Webhook processed successfully',
        data: result,
      };
    } catch (error) {
      this.logger.error('Error processing webhook', error);
      if (error instanceof BadRequestException) {
        const message =
          error instanceof Error ? error.message : 'Invalid webhook payload';
        return { success: false, message };
      }
      throw error;
    }
  }
}
