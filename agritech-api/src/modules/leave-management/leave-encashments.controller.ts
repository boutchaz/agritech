import { Body, Controller, Delete, Get, Param, Post, Put, Query, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationGuard } from '../../common/guards/organization.guard';
import { PoliciesGuard } from '../casl/policies.guard';
import { Action } from '../casl/action.enum';
import { Subject } from '../casl/subject.enum';
import { RequirePermission } from '../casl/permissions.decorator';
import { LeaveEncashmentsService } from './leave-encashments.service';
import { CreateLeaveEncashmentDto } from './dto';

@ApiTags('HR - Leave Encashments')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, OrganizationGuard, PoliciesGuard)
@Controller('organizations/:organizationId/leave-encashments')
export class LeaveEncashmentsController {
  constructor(private readonly service: LeaveEncashmentsService) {}

  @Get()
  @RequirePermission(Action.Read, Subject.LEAVE_ENCASHMENT)
  @ApiOperation({ summary: 'List leave encashments' })
  list(
    @Param('organizationId') organizationId: string,
    @Query('worker_id') workerId?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.service.list(organizationId, {
      worker_id: workerId,
      status,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Post()
  @RequirePermission(Action.Create, Subject.LEAVE_ENCASHMENT)
  @ApiOperation({ summary: 'Create a leave encashment' })
  create(
    @Request() req: any,
    @Param('organizationId') organizationId: string,
    @Body() dto: CreateLeaveEncashmentDto,
  ) {
    return this.service.create(organizationId, req.user?.id ?? null, dto);
  }

  @Put(':id/approve')
  @RequirePermission(Action.Update, Subject.LEAVE_ENCASHMENT)
  @ApiOperation({ summary: 'Approve a leave encashment' })
  approve(
    @Request() req: any,
    @Param('organizationId') organizationId: string,
    @Param('id') id: string,
  ) {
    return this.service.approve(organizationId, req.user?.id ?? null, id);
  }

  @Put(':id/pay')
  @RequirePermission(Action.Update, Subject.LEAVE_ENCASHMENT)
  @ApiOperation({ summary: 'Mark encashment as paid' })
  markPaid(
    @Param('organizationId') organizationId: string,
    @Param('id') id: string,
  ) {
    return this.service.markPaid(organizationId, id);
  }

  @Put(':id/cancel')
  @RequirePermission(Action.Update, Subject.LEAVE_ENCASHMENT)
  @ApiOperation({ summary: 'Cancel a leave encashment' })
  cancel(
    @Request() req: any,
    @Param('organizationId') organizationId: string,
    @Param('id') id: string,
  ) {
    const role = req.user?.role?.name ?? '';
    return this.service.cancel(organizationId, req.user?.id ?? null, id, role);
  }
}
