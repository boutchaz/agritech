import { Controller, Post, Get, Body, Param, UseGuards, Req, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PolarService, CreateOrUpdatePolarSubscriptionDto, LogPolarWebhookDto } from './polar.service';

@ApiTags('polar')
@Controller('polar')
export class PolarController {
  constructor(private readonly polarService: PolarService) {}

  /**
   * Webhook endpoint for Polar events
   * No authentication required - Polar calls this directly
   */
  @Post('webhook')
  @ApiOperation({ summary: 'Handle Polar webhook events' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  async handleWebhook(
    @Headers('x-polar-signature') signature: string,
    @Body() payload: any,
    @Req() req: any,
  ): Promise<{ received: boolean }> {
    const eventType = req.headers['x-polar-event'] || payload.type;
    const eventId = payload.id;

    this.logWebhook(eventType, eventId, signature);

    await this.polarService.processWebhook(eventType, payload);

    return { received: true };
  }

  /**
   * Get subscription pricing
   */
  @Get('pricing')
  @ApiOperation({ summary: 'Get subscription pricing configuration' })
  @ApiResponse({ status: 200, description: 'Pricing configuration' })
  async getPricing() {
    return this.polarService.getSubscriptionPricing();
  }

  /**
   * Calculate subscription price for modules
   */
  @Post('calculate-price')
  @ApiOperation({ summary: 'Calculate subscription price for selected modules' })
  @ApiResponse({ status: 200, description: 'Price calculation' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async calculatePrice(@Body() body: { moduleSlugs: string[] }) {
    return this.polarService.calculateModuleSubscriptionPrice(body.moduleSlugs);
  }

  /**
   * Get Polar subscription for organization (authenticated)
   */
  @Get('subscription/:organizationId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get Polar subscription for organization' })
  @ApiResponse({ status: 200, description: 'Subscription details' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async getSubscription(@Param('organizationId') organizationId: string) {
    return this.polarService.getSubscription(organizationId);
  }

  /**
   * Create or update subscription (admin)
   */
  @Post('subscription')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create or update Polar subscription' })
  @ApiResponse({ status: 200, description: 'Subscription created/updated' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createOrUpdateSubscription(@Body() dto: CreateOrUpdatePolarSubscriptionDto) {
    return this.polarService.createOrUpdateSubscription(dto);
  }

  private logWebhook(eventType: string, eventId: string, signature: string) {
    console.log(`Polar webhook: ${eventType} (${eventId})`);
    if (signature) {
      console.log(`Signature: ${signature.substring(0, 20)}...`);
    }
  }
}
