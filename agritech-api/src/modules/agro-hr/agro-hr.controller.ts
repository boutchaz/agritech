import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationGuard } from '../../common/guards/organization.guard';
import { PoliciesGuard } from '../casl/policies.guard';
import { Action } from '../casl/action.enum';
import { Subject } from '../casl/subject.enum';
import { RequirePermission } from '../casl/permissions.decorator';
import { AgroHrService } from './agro-hr.service';
import { resolveSelfScope } from '../../common/utils/self-scope';
import {
  CreateSafetyIncidentDto,
  CreateSeasonalCampaignDto,
  CreateWorkerQualificationDto,
  CreateWorkerTransportDto,
  UpdateSafetyIncidentDto,
  UpdateSeasonalCampaignDto,
  UpdateWorkerQualificationDto,
  UpdateWorkerTransportDto,
} from './dto';

@ApiTags('HR - Agricultural')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, OrganizationGuard, PoliciesGuard)
@Controller('organizations/:organizationId')
export class AgroHrController {
  constructor(private readonly service: AgroHrService) {}

  // ── Seasonal Campaigns ─────────────────────────────────────────
  @Get('seasonal-campaigns')
  @RequirePermission(Action.Read, Subject.SEASONAL_CAMPAIGN)
  listCampaigns(
    @Param('organizationId') orgId: string,
    @Query('farm_id') farmId?: string,
    @Query('status') status?: string,
    @Query('season_type') seasonType?: string,
  ) {
    return this.service.listCampaigns(orgId, {
      farm_id: farmId,
      status,
      season_type: seasonType,
    });
  }

  @Post('seasonal-campaigns')
  @RequirePermission(Action.Create, Subject.SEASONAL_CAMPAIGN)
  createCampaign(
    @Request() req: any,
    @Param('organizationId') orgId: string,
    @Body() dto: CreateSeasonalCampaignDto,
  ) {
    return this.service.createCampaign(orgId, req.user?.id ?? null, dto);
  }

  @Put('seasonal-campaigns/:id')
  @RequirePermission(Action.Update, Subject.SEASONAL_CAMPAIGN)
  updateCampaign(
    @Param('organizationId') orgId: string,
    @Param('id') id: string,
    @Body() dto: UpdateSeasonalCampaignDto,
  ) {
    return this.service.updateCampaign(orgId, id, dto);
  }

  @Delete('seasonal-campaigns/:id')
  @RequirePermission(Action.Delete, Subject.SEASONAL_CAMPAIGN)
  deleteCampaign(@Param('organizationId') orgId: string, @Param('id') id: string) {
    return this.service.deleteCampaign(orgId, id);
  }

  // ── Worker Qualifications ──────────────────────────────────────
  @Get('worker-qualifications')
  @RequirePermission(Action.Read, Subject.WORKER_QUALIFICATION)
  listQualifications(
    @Request() req: any,
    @Param('organizationId') orgId: string,
    @Query('worker_id') workerId?: string,
    @Query('expiring_within_days') expiringWithinDays?: string,
    @Query('type') type?: string,
    @Query('scope') scope?: string,
  ) {
    const selfScope = resolveSelfScope(req.user, scope);
    const effectiveWorkerId = selfScope.mine ? selfScope.workerId ?? '__none__' : workerId;
    return this.service.listQualifications(orgId, {
      worker_id: effectiveWorkerId,
      expiring_within_days: expiringWithinDays ? Number(expiringWithinDays) : undefined,
      type,
    });
  }

  @Post('worker-qualifications')
  @RequirePermission(Action.Create, Subject.WORKER_QUALIFICATION)
  createQualification(
    @Param('organizationId') orgId: string,
    @Body() dto: CreateWorkerQualificationDto,
  ) {
    return this.service.createQualification(orgId, dto);
  }

  @Put('worker-qualifications/:id')
  @RequirePermission(Action.Update, Subject.WORKER_QUALIFICATION)
  updateQualification(
    @Param('organizationId') orgId: string,
    @Param('id') id: string,
    @Body() dto: UpdateWorkerQualificationDto,
  ) {
    return this.service.updateQualification(orgId, id, dto);
  }

  @Put('worker-qualifications/:id/verify')
  @RequirePermission(Action.Update, Subject.WORKER_QUALIFICATION)
  verifyQualification(
    @Request() req: any,
    @Param('organizationId') orgId: string,
    @Param('id') id: string,
  ) {
    return this.service.verifyQualification(orgId, id, req.user?.id ?? null);
  }

  @Delete('worker-qualifications/:id')
  @RequirePermission(Action.Delete, Subject.WORKER_QUALIFICATION)
  deleteQualification(@Param('organizationId') orgId: string, @Param('id') id: string) {
    return this.service.deleteQualification(orgId, id);
  }

  // ── Safety Incidents ───────────────────────────────────────────
  @Get('safety-incidents')
  @RequirePermission(Action.Read, Subject.SAFETY_INCIDENT)
  listIncidents(
    @Param('organizationId') orgId: string,
    @Query('farm_id') farmId?: string,
    @Query('status') status?: string,
    @Query('severity') severity?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.listIncidents(orgId, { farm_id: farmId, status, severity, from, to });
  }

  @Get('safety-incidents/:id')
  @RequirePermission(Action.Read, Subject.SAFETY_INCIDENT)
  getIncident(@Param('organizationId') orgId: string, @Param('id') id: string) {
    return this.service.getIncident(orgId, id);
  }

  @Post('safety-incidents')
  @RequirePermission(Action.Create, Subject.SAFETY_INCIDENT)
  createIncident(
    @Request() req: any,
    @Param('organizationId') orgId: string,
    @Body() dto: CreateSafetyIncidentDto,
  ) {
    return this.service.createIncident(orgId, req.user?.id ?? null, dto);
  }

  @Put('safety-incidents/:id')
  @RequirePermission(Action.Update, Subject.SAFETY_INCIDENT)
  updateIncident(
    @Param('organizationId') orgId: string,
    @Param('id') id: string,
    @Body() dto: UpdateSafetyIncidentDto,
  ) {
    return this.service.updateIncident(orgId, id, dto);
  }

  // ── Worker Transport ───────────────────────────────────────────
  @Get('worker-transport')
  @RequirePermission(Action.Read, Subject.WORKER_TRANSPORT)
  listTransport(
    @Param('organizationId') orgId: string,
    @Query('farm_id') farmId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.listTransport(orgId, { farm_id: farmId, from, to });
  }

  @Post('worker-transport')
  @RequirePermission(Action.Create, Subject.WORKER_TRANSPORT)
  createTransport(
    @Request() req: any,
    @Param('organizationId') orgId: string,
    @Body() dto: CreateWorkerTransportDto,
  ) {
    return this.service.createTransport(orgId, req.user?.id ?? null, dto);
  }

  @Put('worker-transport/:id')
  @RequirePermission(Action.Update, Subject.WORKER_TRANSPORT)
  updateTransport(
    @Param('organizationId') orgId: string,
    @Param('id') id: string,
    @Body() dto: UpdateWorkerTransportDto,
  ) {
    return this.service.updateTransport(orgId, id, dto);
  }

  @Delete('worker-transport/:id')
  @RequirePermission(Action.Delete, Subject.WORKER_TRANSPORT)
  deleteTransport(@Param('organizationId') orgId: string, @Param('id') id: string) {
    return this.service.deleteTransport(orgId, id);
  }
}
