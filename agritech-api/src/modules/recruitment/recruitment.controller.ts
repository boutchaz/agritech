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
import { RecruitmentService } from './recruitment.service';
import {
  CreateInterviewDto,
  CreateJobApplicantDto,
  CreateJobOpeningDto,
  UpdateInterviewDto,
  UpdateJobApplicantDto,
  UpdateJobOpeningDto,
} from './dto';

@ApiTags('HR - Recruitment')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, OrganizationGuard, PoliciesGuard)
@Controller('organizations/:organizationId')
export class RecruitmentController {
  constructor(private readonly service: RecruitmentService) {}

  // Openings
  @Get('job-openings')
  @RequirePermission(Action.Read, Subject.JOB_OPENING)
  listOpenings(
    @Param('organizationId') orgId: string,
    @Query('status') status?: string,
    @Query('farm_id') farmId?: string,
  ) {
    return this.service.listOpenings(orgId, { status, farm_id: farmId });
  }

  @Post('job-openings')
  @RequirePermission(Action.Create, Subject.JOB_OPENING)
  createOpening(
    @Request() req: any,
    @Param('organizationId') orgId: string,
    @Body() dto: CreateJobOpeningDto,
  ) {
    return this.service.createOpening(orgId, req.user?.id ?? null, dto);
  }

  @Put('job-openings/:id')
  @RequirePermission(Action.Update, Subject.JOB_OPENING)
  updateOpening(
    @Param('organizationId') orgId: string,
    @Param('id') id: string,
    @Body() dto: UpdateJobOpeningDto,
  ) {
    return this.service.updateOpening(orgId, id, dto);
  }

  @Delete('job-openings/:id')
  @RequirePermission(Action.Delete, Subject.JOB_OPENING)
  deleteOpening(@Param('organizationId') orgId: string, @Param('id') id: string) {
    return this.service.deleteOpening(orgId, id);
  }

  // Applicants
  @Get('job-applicants')
  @RequirePermission(Action.Read, Subject.JOB_APPLICANT)
  listApplicants(
    @Param('organizationId') orgId: string,
    @Query('job_opening_id') openingId?: string,
    @Query('status') status?: string,
  ) {
    return this.service.listApplicants(orgId, { job_opening_id: openingId, status });
  }

  @Post('job-applicants')
  @RequirePermission(Action.Create, Subject.JOB_APPLICANT)
  createApplicant(
    @Param('organizationId') orgId: string,
    @Body() dto: CreateJobApplicantDto,
  ) {
    return this.service.createApplicant(orgId, dto);
  }

  @Put('job-applicants/:id')
  @RequirePermission(Action.Update, Subject.JOB_APPLICANT)
  updateApplicant(
    @Param('organizationId') orgId: string,
    @Param('id') id: string,
    @Body() dto: UpdateJobApplicantDto,
  ) {
    return this.service.updateApplicant(orgId, id, dto);
  }

  @Delete('job-applicants/:id')
  @RequirePermission(Action.Delete, Subject.JOB_APPLICANT)
  deleteApplicant(@Param('organizationId') orgId: string, @Param('id') id: string) {
    return this.service.deleteApplicant(orgId, id);
  }

  // Interviews
  @Get('interviews')
  @RequirePermission(Action.Read, Subject.INTERVIEW)
  listInterviews(
    @Param('organizationId') orgId: string,
    @Query('applicant_id') applicantId?: string,
  ) {
    return this.service.listInterviews(orgId, { applicant_id: applicantId });
  }

  @Post('interviews')
  @RequirePermission(Action.Create, Subject.INTERVIEW)
  createInterview(@Param('organizationId') orgId: string, @Body() dto: CreateInterviewDto) {
    return this.service.createInterview(orgId, dto);
  }

  @Put('interviews/:id')
  @RequirePermission(Action.Update, Subject.INTERVIEW)
  updateInterview(
    @Param('organizationId') orgId: string,
    @Param('id') id: string,
    @Body() dto: UpdateInterviewDto,
  ) {
    return this.service.updateInterview(orgId, id, dto);
  }
}
