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
import { resolveSelfScope } from '../../common/utils/self-scope';
import { PerformanceService } from './performance.service';
import {
  CreateAppraisalCycleDto,
  CreateAppraisalDto,
  CreateFeedbackDto,
  UpdateAppraisalCycleDto,
  UpdateAppraisalDto,
} from './dto';

@ApiTags('HR - Performance')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, OrganizationGuard, PoliciesGuard)
@Controller('organizations/:organizationId')
export class PerformanceController {
  constructor(private readonly service: PerformanceService) {}

  // Cycles
  @Get('appraisal-cycles')
  @RequirePermission(Action.Read, Subject.APPRAISAL_CYCLE)
  listCycles(@Param('organizationId') orgId: string) {
    return this.service.listCycles(orgId);
  }

  @Post('appraisal-cycles')
  @RequirePermission(Action.Create, Subject.APPRAISAL_CYCLE)
  createCycle(
    @Request() req: any,
    @Param('organizationId') orgId: string,
    @Body() dto: CreateAppraisalCycleDto,
  ) {
    return this.service.createCycle(orgId, req.user?.id ?? null, dto);
  }

  @Put('appraisal-cycles/:id')
  @RequirePermission(Action.Update, Subject.APPRAISAL_CYCLE)
  updateCycle(
    @Param('organizationId') orgId: string,
    @Param('id') id: string,
    @Body() dto: UpdateAppraisalCycleDto,
  ) {
    return this.service.updateCycle(orgId, id, dto);
  }

  @Delete('appraisal-cycles/:id')
  @RequirePermission(Action.Delete, Subject.APPRAISAL_CYCLE)
  deleteCycle(@Param('organizationId') orgId: string, @Param('id') id: string) {
    return this.service.deleteCycle(orgId, id);
  }

  // Appraisals
  @Get('appraisals')
  @RequirePermission(Action.Read, Subject.APPRAISAL)
  listAppraisals(
    @Request() req: any,
    @Param('organizationId') orgId: string,
    @Query('cycle_id') cycleId?: string,
    @Query('worker_id') workerId?: string,
    @Query('status') status?: string,
    @Query('scope') scope?: string,
  ) {
    const selfScope = resolveSelfScope(req.user, scope);
    const effectiveWorkerId = selfScope.mine ? selfScope.workerId ?? '__none__' : workerId;
    return this.service.listAppraisals(orgId, {
      cycle_id: cycleId,
      worker_id: effectiveWorkerId,
      status,
    });
  }

  @Post('appraisals')
  @RequirePermission(Action.Create, Subject.APPRAISAL)
  createAppraisal(@Param('organizationId') orgId: string, @Body() dto: CreateAppraisalDto) {
    return this.service.createAppraisal(orgId, dto);
  }

  @Put('appraisals/:id')
  @RequirePermission(Action.Update, Subject.APPRAISAL)
  updateAppraisal(
    @Param('organizationId') orgId: string,
    @Param('id') id: string,
    @Body() dto: UpdateAppraisalDto,
  ) {
    return this.service.updateAppraisal(orgId, id, dto);
  }

  @Post('appraisal-cycles/:cycleId/bulk-appraisals')
  @RequirePermission(Action.Create, Subject.APPRAISAL)
  bulkCreate(
    @Param('organizationId') orgId: string,
    @Param('cycleId') cycleId: string,
    @Body() body: { worker_ids: string[] },
  ) {
    return this.service.bulkCreateForCycle(orgId, cycleId, body.worker_ids);
  }

  // Feedback
  @Get('performance-feedback')
  @RequirePermission(Action.Read, Subject.PERFORMANCE_FEEDBACK)
  listFeedback(
    @Request() req: any,
    @Param('organizationId') orgId: string,
    @Query('worker_id') workerId?: string,
    @Query('scope') scope?: string,
  ) {
    const selfScope = resolveSelfScope(req.user, scope);
    const effectiveWorkerId = selfScope.mine ? selfScope.workerId ?? '__none__' : workerId;
    return this.service.listFeedback(orgId, effectiveWorkerId);
  }

  @Post('performance-feedback')
  @RequirePermission(Action.Create, Subject.PERFORMANCE_FEEDBACK)
  createFeedback(@Param('organizationId') orgId: string, @Body() dto: CreateFeedbackDto) {
    return this.service.createFeedback(orgId, dto);
  }
}
