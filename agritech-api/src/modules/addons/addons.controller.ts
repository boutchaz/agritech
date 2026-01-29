import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AddonsService } from './addons.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  PurchaseAddonDto,
  CancelAddonDto,
  AddonsOverviewDto,
  OrganizationAddonDto,
  AddonModuleDto,
  AddonSlotsDto,
  CheckoutResponseDto,
} from './dto/addon.dto';

@ApiTags('addons')
@Controller('addons')
@UseGuards(JwtAuthGuard)
export class AddonsController {
  constructor(private addonsService: AddonsService) {}

  @Get()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get addons overview for organization',
    description: 'Returns addon slots, active addons, and available addons to purchase',
  })
  @ApiResponse({
    status: 200,
    description: 'Addons overview retrieved successfully',
    type: AddonsOverviewDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - no access to organization' })
  async getAddonsOverview(@Request() req): Promise<AddonsOverviewDto> {
    const organizationId = req.headers['x-organization-id'] as string;
    if (!organizationId) {
      throw new BadRequestException('Organization ID is required in X-Organization-Id header');
    }
    return this.addonsService.getAddonsOverview(req.user.id, organizationId);
  }

  @Get('active')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get active addons for organization',
    description: 'Returns list of currently active addon subscriptions',
  })
  @ApiResponse({
    status: 200,
    description: 'Active addons retrieved successfully',
    type: [OrganizationAddonDto],
  })
  async getActiveAddons(@Request() req): Promise<OrganizationAddonDto[]> {
    const organizationId = req.headers['x-organization-id'] as string;
    if (!organizationId) {
      throw new BadRequestException('Organization ID is required in X-Organization-Id header');
    }
    return this.addonsService.getOrganizationAddons(req.user.id, organizationId);
  }

  @Get('available')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get available addons to purchase',
    description: 'Returns list of modules available for purchase as addons',
  })
  @ApiResponse({
    status: 200,
    description: 'Available addons retrieved successfully',
    type: [AddonModuleDto],
  })
  async getAvailableAddons(@Request() req): Promise<AddonModuleDto[]> {
    const organizationId = req.headers['x-organization-id'] as string;
    if (!organizationId) {
      throw new BadRequestException('Organization ID is required in X-Organization-Id header');
    }
    return this.addonsService.getAvailableAddons(req.user.id, organizationId);
  }

  @Get('slots')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get addon slot information',
    description: 'Returns information about addon slots (included, used, available)',
  })
  @ApiResponse({
    status: 200,
    description: 'Addon slots retrieved successfully',
    type: AddonSlotsDto,
  })
  async getAddonSlots(@Request() req): Promise<AddonSlotsDto> {
    const organizationId = req.headers['x-organization-id'] as string;
    if (!organizationId) {
      throw new BadRequestException('Organization ID is required in X-Organization-Id header');
    }
    return this.addonsService.getAddonSlots(req.user.id, organizationId);
  }

  @Post('purchase')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Purchase a module addon',
    description: 'Initiates purchase flow for a module addon. Returns checkout URL for Polar or activates directly if no payment required.',
  })
  @ApiResponse({
    status: 201,
    description: 'Purchase initiated successfully',
    type: CheckoutResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request - module not available or no slots' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin access required' })
  @ApiResponse({ status: 404, description: 'Module not found' })
  async purchaseAddon(
    @Request() req,
    @Body() dto: PurchaseAddonDto,
  ): Promise<CheckoutResponseDto> {
    const organizationId = req.headers['x-organization-id'] as string;
    if (!organizationId) {
      throw new BadRequestException('Organization ID is required in X-Organization-Id header');
    }
    return this.addonsService.purchaseAddon(req.user.id, organizationId, dto);
  }

  @Post('cancel')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Cancel a module addon',
    description: 'Cancels an active addon subscription. Can cancel immediately or at period end.',
  })
  @ApiResponse({
    status: 200,
    description: 'Addon canceled successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request - addon not active' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin access required' })
  @ApiResponse({ status: 404, description: 'Addon not found' })
  async cancelAddon(
    @Request() req,
    @Body() dto: CancelAddonDto,
  ): Promise<{ success: boolean; message: string }> {
    const organizationId = req.headers['x-organization-id'] as string;
    if (!organizationId) {
      throw new BadRequestException('Organization ID is required in X-Organization-Id header');
    }
    return this.addonsService.cancelAddon(req.user.id, organizationId, dto);
  }

  @Post('webhook')
  @ApiOperation({
    summary: 'Handle Polar webhook events for addons',
    description: 'Receives and processes webhook events from Polar for addon subscriptions',
  })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  async handleWebhook(@Body() event: any): Promise<{ received: boolean }> {
    await this.addonsService.handlePolarWebhook(event);
    return { received: true };
  }
}
