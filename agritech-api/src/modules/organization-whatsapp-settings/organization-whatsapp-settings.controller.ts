import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationGuard } from '../../common/guards/organization.guard';
import { OrganizationWhatsAppSettingsService } from './organization-whatsapp-settings.service';
import {
  TestWhatsAppDto,
  UpsertWhatsAppSettingsDto,
  WhatsAppSettingsResponseDto,
} from './dto';

@ApiTags('organization-whatsapp-settings')
@ApiBearerAuth()
@Controller('organization-whatsapp-settings')
@UseGuards(JwtAuthGuard, OrganizationGuard)
export class OrganizationWhatsAppSettingsController {
  constructor(
    private readonly whatsappSettingsService: OrganizationWhatsAppSettingsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get the org WhatsApp (Meta Cloud API) settings' })
  @ApiResponse({ status: 200, type: WhatsAppSettingsResponseDto })
  async get(
    @Headers('x-organization-id') organizationId: string,
  ): Promise<WhatsAppSettingsResponseDto> {
    if (!organizationId) {
      throw new BadRequestException('Organization ID is required');
    }
    return this.whatsappSettingsService.getSettings(organizationId);
  }

  @Put()
  @ApiOperation({ summary: 'Create or update the org WhatsApp settings' })
  @ApiResponse({ status: 200, type: WhatsAppSettingsResponseDto })
  async upsert(
    @Headers('x-organization-id') organizationId: string,
    @Body() dto: UpsertWhatsAppSettingsDto,
  ): Promise<WhatsAppSettingsResponseDto> {
    if (!organizationId) {
      throw new BadRequestException('Organization ID is required');
    }
    return this.whatsappSettingsService.upsertSettings(organizationId, dto);
  }

  @Delete()
  @HttpCode(204)
  @ApiOperation({ summary: 'Remove the org WhatsApp settings' })
  async remove(
    @Headers('x-organization-id') organizationId: string,
  ): Promise<void> {
    if (!organizationId) {
      throw new BadRequestException('Organization ID is required');
    }
    await this.whatsappSettingsService.deleteSettings(organizationId);
  }

  @Post('test')
  @ApiOperation({
    summary:
      'Send a Meta Cloud API template message to verify saved credentials',
  })
  @ApiResponse({
    status: 200,
    description: 'Test result. success=false includes error.',
  })
  async test(
    @Headers('x-organization-id') organizationId: string,
    @Body() dto: TestWhatsAppDto,
  ): Promise<{ success: boolean; error?: string }> {
    if (!organizationId) {
      throw new BadRequestException('Organization ID is required');
    }
    return this.whatsappSettingsService.sendTestMessage(
      organizationId,
      dto.to,
      dto.template,
      dto.language,
    );
  }
}
