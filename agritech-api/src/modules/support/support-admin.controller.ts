import { Body, Controller, Get, Patch, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InternalAdminGuard } from '../admin/guards/internal-admin.guard';
import { SupportService } from './support.service';
import { UpdateSupportSettingsDto } from './dto/update-support-settings.dto';

@ApiTags('admin-support')
@ApiBearerAuth()
@Controller('admin/support')
@UseGuards(JwtAuthGuard, InternalAdminGuard)
export class SupportAdminController {
  constructor(private readonly supportService: SupportService) {}

  @Get()
  @ApiOperation({ summary: 'Get current support settings (admin)' })
  @ApiResponse({ status: 200 })
  async get() {
    return this.supportService.get();
  }

  @Patch()
  @ApiOperation({ summary: 'Update support settings' })
  @ApiResponse({ status: 200 })
  async update(@Request() req: any, @Body() dto: UpdateSupportSettingsDto) {
    return this.supportService.update(req.user.id, dto);
  }
}
