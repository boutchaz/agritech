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
import { HrAdvancedService } from './hr-advanced.service';
import { HrTasksBridgeService } from './hr-tasks-bridge.service';
import {
  BulkEnrollDto,
  CreateEnrollmentDto,
  CreateGrievanceDto,
  CreateTrainingProgramDto,
  UpdateEnrollmentDto,
  UpdateGrievanceDto,
  UpdateTrainingProgramDto,
} from './dto';

@ApiTags('HR - Advanced')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, OrganizationGuard, PoliciesGuard)
@Controller('organizations/:organizationId')
export class HrAdvancedController {
  constructor(
    private readonly service: HrAdvancedService,
    private readonly tasksBridge: HrTasksBridgeService,
  ) {}

  // ── Tasks Bridge ──────────────────────────────────────────────
  @Post('onboarding-records/:id/sync-tasks')
  @RequirePermission(Action.Update, Subject.ONBOARDING)
  syncOnboardingTasks(
    @Request() req: any,
    @Param('organizationId') orgId: string,
    @Param('id') id: string,
  ) {
    return this.tasksBridge.syncOnboardingTasks(orgId, id, req.user?.id ?? null);
  }

  @Post('safety-incidents/:id/sync-tasks')
  @RequirePermission(Action.Update, Subject.SAFETY_INCIDENT)
  syncSafetyTasks(
    @Request() req: any,
    @Param('organizationId') orgId: string,
    @Param('id') id: string,
  ) {
    return this.tasksBridge.syncSafetyIncidentTasks(orgId, id, req.user?.id ?? null);
  }

  // Grievances
  @Get('grievances')
  @RequirePermission(Action.Read, Subject.GRIEVANCE)
  listGrievances(
    @Param('organizationId') orgId: string,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('grievance_type') grievanceType?: string,
  ) {
    return this.service.listGrievances(orgId, { status, priority, grievance_type: grievanceType });
  }

  @Post('grievances')
  @RequirePermission(Action.Create, Subject.GRIEVANCE)
  createGrievance(@Param('organizationId') orgId: string, @Body() dto: CreateGrievanceDto) {
    return this.service.createGrievance(orgId, dto);
  }

  @Put('grievances/:id')
  @RequirePermission(Action.Update, Subject.GRIEVANCE)
  updateGrievance(
    @Request() req: any,
    @Param('organizationId') orgId: string,
    @Param('id') id: string,
    @Body() dto: UpdateGrievanceDto,
  ) {
    return this.service.updateGrievance(orgId, id, req.user?.id ?? null, dto);
  }

  // Training Programs
  @Get('training-programs')
  @RequirePermission(Action.Read, Subject.TRAINING_PROGRAM)
  listPrograms(
    @Param('organizationId') orgId: string,
    @Query('includeInactive') includeInactive?: string,
  ) {
    return this.service.listPrograms(orgId, includeInactive === 'true');
  }

  @Post('training-programs')
  @RequirePermission(Action.Create, Subject.TRAINING_PROGRAM)
  createProgram(@Param('organizationId') orgId: string, @Body() dto: CreateTrainingProgramDto) {
    return this.service.createProgram(orgId, dto);
  }

  @Put('training-programs/:id')
  @RequirePermission(Action.Update, Subject.TRAINING_PROGRAM)
  updateProgram(
    @Param('organizationId') orgId: string,
    @Param('id') id: string,
    @Body() dto: UpdateTrainingProgramDto,
  ) {
    return this.service.updateProgram(orgId, id, dto);
  }

  @Delete('training-programs/:id')
  @RequirePermission(Action.Delete, Subject.TRAINING_PROGRAM)
  deleteProgram(@Param('organizationId') orgId: string, @Param('id') id: string) {
    return this.service.deleteProgram(orgId, id);
  }

  // Enrollments
  @Get('training-enrollments')
  @RequirePermission(Action.Read, Subject.TRAINING_ENROLLMENT)
  listEnrollments(
    @Param('organizationId') orgId: string,
    @Query('program_id') programId?: string,
    @Query('worker_id') workerId?: string,
    @Query('status') status?: string,
  ) {
    return this.service.listEnrollments(orgId, {
      program_id: programId,
      worker_id: workerId,
      status,
    });
  }

  @Post('training-enrollments')
  @RequirePermission(Action.Create, Subject.TRAINING_ENROLLMENT)
  createEnrollment(@Param('organizationId') orgId: string, @Body() dto: CreateEnrollmentDto) {
    return this.service.createEnrollment(orgId, dto);
  }

  @Post('training-enrollments/bulk')
  @RequirePermission(Action.Create, Subject.TRAINING_ENROLLMENT)
  bulkEnroll(@Param('organizationId') orgId: string, @Body() dto: BulkEnrollDto) {
    return this.service.bulkEnroll(orgId, dto);
  }

  @Put('training-enrollments/:id')
  @RequirePermission(Action.Update, Subject.TRAINING_ENROLLMENT)
  updateEnrollment(
    @Param('organizationId') orgId: string,
    @Param('id') id: string,
    @Body() dto: UpdateEnrollmentDto,
  ) {
    return this.service.updateEnrollment(orgId, id, dto);
  }

  // Analytics
  @Get('hr-analytics/workforce')
  @RequirePermission(Action.Read, Subject.WORKER)
  workforceSummary(@Param('organizationId') orgId: string) {
    return this.service.workforceSummary(orgId);
  }

  @Get('hr-analytics/leave-balances')
  @RequirePermission(Action.Read, Subject.LEAVE_ALLOCATION)
  leaveBalanceSummary(@Param('organizationId') orgId: string) {
    return this.service.leaveBalanceSummary(orgId);
  }
}
