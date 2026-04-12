import {
  Controller,
  Get,
  Put,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InternalAdminGuard } from './guards/internal-admin.guard';
import { PricingConfigService, type PricingConfig } from './pricing-config.service';

@ApiTags('admin/pricing-config')
@ApiBearerAuth()
@Controller('admin/pricing-config')
@UseGuards(JwtAuthGuard, InternalAdminGuard)
export class PricingConfigController {
  constructor(private readonly pricingConfigService: PricingConfigService) {}

  @Get()
  @ApiOperation({ summary: 'Get current subscription pricing configuration' })
  async getConfig() {
    return this.pricingConfigService.getConfig();
  }

  @Put()
  @ApiOperation({ summary: 'Save subscription pricing configuration' })
  async saveConfig(@Req() req, @Body() body: Omit<PricingConfig, 'updated_at' | 'updated_by'>) {
    const userId = req.user.sub;
    return this.pricingConfigService.saveConfig(body, userId);
  }
}
