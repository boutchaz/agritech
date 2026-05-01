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
import { EmployeeLifecycleService } from './employee-lifecycle.service';
import {
  CreateOnboardingTemplateDto,
  CreateSeparationDto,
  StartOnboardingDto,
  UpdateFnfDto,
  UpdateOnboardingRecordDto,
  UpdateOnboardingTemplateDto,
  UpdateSeparationDto,
} from './dto';

@ApiTags('HR - Employee Lifecycle')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, OrganizationGuard, PoliciesGuard)
@Controller('organizations/:organizationId')
export class EmployeeLifecycleController {
  constructor(private readonly service: EmployeeLifecycleService) {}

  // ── Onboarding Templates ──────────────────────────────────────
  @Get('onboarding-templates')
  @RequirePermission(Action.Read, Subject.ONBOARDING)
  listTemplates(@Param('organizationId') orgId: string) {
    return this.service.listTemplates(orgId);
  }

  @Post('onboarding-templates')
  @RequirePermission(Action.Create, Subject.ONBOARDING)
  createTemplate(
    @Param('organizationId') orgId: string,
    @Body() dto: CreateOnboardingTemplateDto,
  ) {
    return this.service.createTemplate(orgId, dto);
  }

  @Put('onboarding-templates/:id')
  @RequirePermission(Action.Update, Subject.ONBOARDING)
  updateTemplate(
    @Param('organizationId') orgId: string,
    @Param('id') id: string,
    @Body() dto: UpdateOnboardingTemplateDto,
  ) {
    return this.service.updateTemplate(orgId, id, dto);
  }

  @Delete('onboarding-templates/:id')
  @RequirePermission(Action.Delete, Subject.ONBOARDING)
  deleteTemplate(
    @Param('organizationId') orgId: string,
    @Param('id') id: string,
  ) {
    return this.service.deleteTemplate(orgId, id);
  }

  // ── Onboarding Records ────────────────────────────────────────
  @Get('onboarding-records')
  @RequirePermission(Action.Read, Subject.ONBOARDING)
  listRecords(
    @Param('organizationId') orgId: string,
    @Query('worker_id') workerId?: string,
    @Query('status') status?: string,
  ) {
    return this.service.listRecords(orgId, { worker_id: workerId, status });
  }

  @Post('onboarding-records')
  @RequirePermission(Action.Create, Subject.ONBOARDING)
  start(
    @Request() req: any,
    @Param('organizationId') orgId: string,
    @Body() dto: StartOnboardingDto,
  ) {
    return this.service.start(orgId, req.user?.id ?? null, dto);
  }

  @Put('onboarding-records/:id')
  @RequirePermission(Action.Update, Subject.ONBOARDING)
  updateRecord(
    @Param('organizationId') orgId: string,
    @Param('id') id: string,
    @Body() dto: UpdateOnboardingRecordDto,
  ) {
    return this.service.updateRecord(orgId, id, dto);
  }

  // ── Separations ───────────────────────────────────────────────
  @Get('separations')
  @RequirePermission(Action.Read, Subject.SEPARATION)
  listSeparations(
    @Param('organizationId') orgId: string,
    @Query('status') status?: string,
    @Query('worker_id') workerId?: string,
  ) {
    return this.service.listSeparations(orgId, { status, worker_id: workerId });
  }

  @Get('separations/:id')
  @RequirePermission(Action.Read, Subject.SEPARATION)
  getSeparation(
    @Param('organizationId') orgId: string,
    @Param('id') id: string,
  ) {
    return this.service.getSeparation(orgId, id);
  }

  @Post('separations')
  @RequirePermission(Action.Create, Subject.SEPARATION)
  createSeparation(
    @Request() req: any,
    @Param('organizationId') orgId: string,
    @Body() dto: CreateSeparationDto,
  ) {
    return this.service.createSeparation(orgId, req.user?.id ?? null, dto);
  }

  @Put('separations/:id')
  @RequirePermission(Action.Update, Subject.SEPARATION)
  updateSeparation(
    @Param('organizationId') orgId: string,
    @Param('id') id: string,
    @Body() dto: UpdateSeparationDto,
  ) {
    return this.service.updateSeparation(orgId, id, dto);
  }

  @Put('separations/:id/fnf')
  @RequirePermission(Action.Update, Subject.SEPARATION)
  updateFnf(
    @Param('organizationId') orgId: string,
    @Param('id') id: string,
    @Body() dto: UpdateFnfDto,
  ) {
    return this.service.updateFnf(orgId, id, dto);
  }
}
