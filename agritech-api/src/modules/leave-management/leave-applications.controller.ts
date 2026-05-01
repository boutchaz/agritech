import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationGuard } from '../../common/guards/organization.guard';
import { PoliciesGuard } from '../casl/policies.guard';
import { Action } from '../casl/action.enum';
import { Subject } from '../casl/subject.enum';
import { RequirePermission } from '../casl/permissions.decorator';
import { CaslAbilityFactory } from '../casl/casl-ability.factory';
import { resolveSelfScope } from '../../common/utils/self-scope';
import { LeaveApplicationsService } from './leave-applications.service';
import { CreateLeaveApplicationDto, RejectLeaveApplicationDto } from './dto';

@ApiTags('HR - Leave Applications')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, OrganizationGuard, PoliciesGuard)
@Controller('organizations/:organizationId/leave-applications')
export class LeaveApplicationsController {
  constructor(
    private readonly service: LeaveApplicationsService,
    private readonly caslFactory: CaslAbilityFactory,
  ) {}

  @Get()
  @RequirePermission(Action.Read, Subject.LEAVE_APPLICATION)
  list(
    @Request() req: any,
    @Param('organizationId') organizationId: string,
    @Query('worker_id') workerId?: string,
    @Query('status') status?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('scope') scope?: string,
  ) {
    const selfScope = resolveSelfScope(req.user, scope);
    // Forced self-only roles override any worker_id passed by the client.
    const effectiveWorkerId = selfScope.mine ? selfScope.workerId ?? '__none__' : workerId;
    return this.service.list(organizationId, {
      worker_id: effectiveWorkerId,
      status,
      from,
      to,
    });
  }

  @Get('calendar')
  @RequirePermission(Action.Read, Subject.LEAVE_APPLICATION)
  calendar(
    @Param('organizationId') organizationId: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    if (!from || !to)
      throw new BadRequestException('from and to query params are required');
    return this.service.calendar(organizationId, from, to);
  }

  @Post()
  @RequirePermission(Action.Create, Subject.LEAVE_APPLICATION)
  create(
    @Request() req: any,
    @Param('organizationId') organizationId: string,
    @Body() dto: CreateLeaveApplicationDto,
  ) {
    return this.service.create(organizationId, req.user?.id ?? null, dto);
  }

  @Put(':id/approve')
  @RequirePermission(Action.Update, Subject.LEAVE_APPLICATION)
  approve(
    @Request() req: any,
    @Param('organizationId') organizationId: string,
    @Param('id') id: string,
  ) {
    return this.service.approve(organizationId, req.user?.id ?? null, id);
  }

  @Put(':id/reject')
  @RequirePermission(Action.Update, Subject.LEAVE_APPLICATION)
  reject(
    @Request() req: any,
    @Param('organizationId') organizationId: string,
    @Param('id') id: string,
    @Body() dto: RejectLeaveApplicationDto,
  ) {
    return this.service.reject(organizationId, req.user?.id ?? null, id, dto);
  }

  @Put(':id/cancel')
  @ApiOperation({
    summary:
      'Cancel a leave application. Self-service workers may cancel only their own; admins/managers may cancel any.',
  })
  async cancel(
    @Request() req: any,
    @Param('organizationId') organizationId: string,
    @Param('id') id: string,
  ) {
    const ability = await this.caslFactory.createForUser(req.user, organizationId);
    const isAdmin = ability.can(Action.Update, Subject.LEAVE_APPLICATION);
    return this.service.cancel(organizationId, req.user?.id ?? null, id, isAdmin);
  }
}
