import { Body, Controller, Get, Patch, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InternalAdminGuard } from '../admin/guards/internal-admin.guard';
import { LandingService } from './landing.service';
import { UpdateLandingSettingsDto } from './dto/update-landing-settings.dto';

@ApiTags('admin-landing')
@ApiBearerAuth()
@Controller('admin/landing')
@UseGuards(JwtAuthGuard, InternalAdminGuard)
export class LandingAdminController {
  constructor(private readonly landingService: LandingService) {}

  @Get()
  @ApiOperation({ summary: 'Get current landing settings (admin)' })
  async get() {
    return this.landingService.get();
  }

  @Patch()
  @ApiOperation({ summary: 'Update landing settings' })
  @ApiResponse({ status: 200 })
  async update(@Request() req: any, @Body() dto: UpdateLandingSettingsDto) {
    return this.landingService.update(req.user.id, dto);
  }
}
