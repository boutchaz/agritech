import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationGuard } from '../../common/guards/organization.guard';
import { PoliciesGuard } from '../casl/policies.guard';
import { Action } from '../casl/action.enum';
import { Subject } from '../casl/subject.enum';
import { RequirePermission } from '../casl/permissions.decorator';
import { HrCalendarService } from './hr-calendar.service';

@ApiTags('HR - Calendar')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, OrganizationGuard, PoliciesGuard)
@Controller('organizations/:organizationId')
export class HrCalendarController {
  constructor(private readonly service: HrCalendarService) {}

  @Get('hr-calendar')
  @RequirePermission(Action.Read, Subject.WORKER)
  list(
    @Param('organizationId') orgId: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('types') types?: string,
  ) {
    const typeFilter = types ? types.split(',') : undefined;
    return this.service.aggregate(orgId, from, to, typeFilter);
  }
}
