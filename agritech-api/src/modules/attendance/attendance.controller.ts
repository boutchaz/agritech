import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationGuard } from '../../common/guards/organization.guard';
import { AttendanceService } from './attendance.service';
import {
  AttendanceFiltersDto,
  CreateAttendanceDto,
  UpsertGeofenceDto,
} from './dto';

@ApiTags('attendance')
@ApiBearerAuth()
@Controller('attendance')
@UseGuards(JwtAuthGuard, OrganizationGuard)
export class AttendanceController {
  constructor(private readonly service: AttendanceService) {}

  // ─── Geofences ───────────────────────────────────────────────

  @Get('geofences')
  @ApiOperation({ summary: 'List geofences for the org' })
  @ApiQuery({ name: 'farm_id', required: false })
  async listGeofences(
    @Headers('x-organization-id') organizationId: string,
    @Query('farm_id') farmId?: string,
  ) {
    if (!organizationId) throw new BadRequestException('Organization ID required');
    return this.service.listGeofences(organizationId, farmId);
  }

  @Post('geofences')
  @ApiOperation({ summary: 'Create a geofence' })
  async createGeofence(
    @Headers('x-organization-id') organizationId: string,
    @Body() dto: UpsertGeofenceDto,
  ) {
    if (!organizationId) throw new BadRequestException('Organization ID required');
    return this.service.createGeofence(organizationId, dto);
  }

  @Patch('geofences/:id')
  @ApiOperation({ summary: 'Update a geofence' })
  async updateGeofence(
    @Headers('x-organization-id') organizationId: string,
    @Param('id') id: string,
    @Body() dto: Partial<UpsertGeofenceDto>,
  ) {
    if (!organizationId) throw new BadRequestException('Organization ID required');
    return this.service.updateGeofence(organizationId, id, dto);
  }

  @Delete('geofences/:id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a geofence' })
  async deleteGeofence(
    @Headers('x-organization-id') organizationId: string,
    @Param('id') id: string,
  ) {
    if (!organizationId) throw new BadRequestException('Organization ID required');
    await this.service.deleteGeofence(organizationId, id);
  }

  // ─── Attendance records ──────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'List attendance records (paginated)' })
  async list(
    @Headers('x-organization-id') organizationId: string,
    @Query() filters: AttendanceFiltersDto,
  ) {
    if (!organizationId) throw new BadRequestException('Organization ID required');
    return this.service.list(organizationId, filters);
  }

  @Post()
  @ApiOperation({ summary: 'Record a check-in or check-out' })
  async create(
    @Headers('x-organization-id') organizationId: string,
    @Req() req: any,
    @Body() dto: CreateAttendanceDto,
  ) {
    if (!organizationId) throw new BadRequestException('Organization ID required');
    return this.service.create(organizationId, req.user?.id ?? null, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete an attendance record' })
  async delete(
    @Headers('x-organization-id') organizationId: string,
    @Param('id') id: string,
  ) {
    if (!organizationId) throw new BadRequestException('Organization ID required');
    await this.service.delete(organizationId, id);
  }

  @Get('summary/:workerId')
  @ApiOperation({ summary: 'Daily attendance summary for a worker' })
  @ApiQuery({ name: 'from', required: true })
  @ApiQuery({ name: 'to', required: true })
  async summary(
    @Headers('x-organization-id') organizationId: string,
    @Param('workerId') workerId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    if (!organizationId) throw new BadRequestException('Organization ID required');
    if (!from || !to) throw new BadRequestException('from and to are required');
    return this.service.dailySummary(organizationId, workerId, from, to);
  }
}
