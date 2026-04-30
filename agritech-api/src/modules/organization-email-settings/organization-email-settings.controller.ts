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
import { OrganizationEmailSettingsService } from './organization-email-settings.service';
import {
  EmailSettingsResponseDto,
  TestEmailDto,
  UpsertEmailSettingsDto,
} from './dto';

@ApiTags('organization-email-settings')
@ApiBearerAuth()
@Controller('organization-email-settings')
@UseGuards(JwtAuthGuard, OrganizationGuard)
export class OrganizationEmailSettingsController {
  constructor(
    private readonly emailSettingsService: OrganizationEmailSettingsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get the org SMTP settings' })
  @ApiResponse({ status: 200, type: EmailSettingsResponseDto })
  async get(
    @Headers('x-organization-id') organizationId: string,
  ): Promise<EmailSettingsResponseDto> {
    if (!organizationId) {
      throw new BadRequestException('Organization ID is required');
    }
    return this.emailSettingsService.getSettings(organizationId);
  }

  @Put()
  @ApiOperation({ summary: 'Create or update the org SMTP settings' })
  @ApiResponse({ status: 200, type: EmailSettingsResponseDto })
  async upsert(
    @Headers('x-organization-id') organizationId: string,
    @Body() dto: UpsertEmailSettingsDto,
  ): Promise<EmailSettingsResponseDto> {
    if (!organizationId) {
      throw new BadRequestException('Organization ID is required');
    }
    return this.emailSettingsService.upsertSettings(organizationId, dto);
  }

  @Delete()
  @HttpCode(204)
  @ApiOperation({ summary: 'Remove the org SMTP settings' })
  async remove(
    @Headers('x-organization-id') organizationId: string,
  ): Promise<void> {
    if (!organizationId) {
      throw new BadRequestException('Organization ID is required');
    }
    await this.emailSettingsService.deleteSettings(organizationId);
  }

  @Post('test')
  @ApiOperation({ summary: 'Send a test email using the saved SMTP settings' })
  @ApiResponse({
    status: 200,
    description: 'Test result. success=false includes error.',
  })
  async test(
    @Headers('x-organization-id') organizationId: string,
    @Body() dto: TestEmailDto,
  ): Promise<{ success: boolean; error?: string }> {
    if (!organizationId) {
      throw new BadRequestException('Organization ID is required');
    }
    return this.emailSettingsService.sendTestEmail(organizationId, dto.to);
  }
}
