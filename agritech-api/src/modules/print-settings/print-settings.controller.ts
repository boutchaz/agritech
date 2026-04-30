import { Body, Controller, Get, Param, Put, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { OrganizationGuard } from '../../common/guards/organization.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdatePrintSettingsDto } from './dto';
import { PrintSettingsService } from './print-settings.service';

@ApiTags('Print Settings')
@ApiBearerAuth()
@Controller('organizations/:organizationId/print-settings')
@UseGuards(JwtAuthGuard, OrganizationGuard)
export class PrintSettingsController {
  constructor(private readonly printSettingsService: PrintSettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Get organization print settings' })
  @ApiResponse({ status: 200, description: 'Print settings retrieved successfully' })
  async getPrintSettings(
    @Req() req: Request & { user: { userId: string } },
    @Param('organizationId') organizationId: string,
  ) {
    return this.printSettingsService.getOrCreate(req.user.userId, organizationId);
  }

  @Put()
  @ApiOperation({ summary: 'Update organization print settings' })
  @ApiResponse({ status: 200, description: 'Print settings updated successfully' })
  async updatePrintSettings(
    @Req() req: Request & { user: { userId: string } },
    @Param('organizationId') organizationId: string,
    @Body() dto: UpdatePrintSettingsDto,
  ) {
    return this.printSettingsService.upsert(req.user.userId, organizationId, dto);
  }
}
