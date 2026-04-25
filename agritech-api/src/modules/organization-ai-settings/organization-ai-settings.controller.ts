import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Patch,
  UseGuards,
  Headers,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { OrganizationAISettingsService } from './organization-ai-settings.service';
import {
  UpsertAIProviderDto,
  AIProviderSettingsResponseDto,
  AIProviderType,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequireModule } from '../../common/decorators/require-module.decorator';
import { OrganizationGuard } from '../../common/guards/organization.guard';
import { ModuleEntitlementGuard } from '../../common/guards/module-entitlement.guard';

@ApiTags('organization-ai-settings')
@ApiBearerAuth()
@Controller('organization-ai-settings')
@RequireModule('agromind_advisor')
@UseGuards(JwtAuthGuard, OrganizationGuard, ModuleEntitlementGuard)
export class OrganizationAISettingsController {
  constructor(
    private readonly aiSettingsService: OrganizationAISettingsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all AI provider settings for the organization' })
  @ApiResponse({
    status: 200,
    description: 'Returns all AI provider settings',
    type: [AIProviderSettingsResponseDto],
  })
  async getSettings(
    @Headers('x-organization-id') organizationId: string,
  ): Promise<AIProviderSettingsResponseDto[]> {
    if (!organizationId) {
      throw new BadRequestException('Organization ID is required');
    }
    return this.aiSettingsService.getProviderSettings(organizationId);
  }

  @Post()
  @ApiOperation({ summary: 'Create or update an AI provider setting' })
  @ApiResponse({
    status: 201,
    description: 'Provider setting created/updated successfully',
    type: AIProviderSettingsResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid API key format',
  })
  async upsertProvider(
    @Headers('x-organization-id') organizationId: string,
    @Body() dto: UpsertAIProviderDto,
  ): Promise<AIProviderSettingsResponseDto> {
    if (!organizationId) {
      throw new BadRequestException('Organization ID is required');
    }
    return this.aiSettingsService.upsertProvider(organizationId, dto);
  }

  @Delete(':provider')
  @ApiOperation({ summary: 'Delete an AI provider setting' })
  @ApiResponse({
    status: 200,
    description: 'Provider setting deleted successfully',
  })
  async deleteProvider(
    @Headers('x-organization-id') organizationId: string,
    @Param('provider') provider: string,
  ): Promise<{ success: boolean; message: string }> {
    if (!organizationId) {
      throw new BadRequestException('Organization ID is required');
    }

    if (!Object.values(AIProviderType).includes(provider as AIProviderType)) {
      throw new BadRequestException(`Invalid provider: ${provider}`);
    }

    await this.aiSettingsService.deleteProvider(
      organizationId,
      provider as AIProviderType,
    );

    return {
      success: true,
      message: `Provider ${provider} configuration removed`,
    };
  }

  @Patch(':provider/toggle')
  @ApiOperation({ summary: 'Enable or disable an AI provider' })
  @ApiResponse({
    status: 200,
    description: 'Provider status toggled successfully',
    type: AIProviderSettingsResponseDto,
  })
  async toggleProvider(
    @Headers('x-organization-id') organizationId: string,
    @Param('provider') provider: string,
    @Body('enabled') enabled: boolean,
  ): Promise<AIProviderSettingsResponseDto> {
    if (!organizationId) {
      throw new BadRequestException('Organization ID is required');
    }

    if (!Object.values(AIProviderType).includes(provider as AIProviderType)) {
      throw new BadRequestException(`Invalid provider: ${provider}`);
    }

    return this.aiSettingsService.toggleProvider(
      organizationId,
      provider as AIProviderType,
      enabled,
    );
  }
}
