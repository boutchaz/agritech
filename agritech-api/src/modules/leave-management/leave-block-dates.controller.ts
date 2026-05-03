import { Body, Controller, Delete, Get, Param, Post, Put, Query, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationGuard } from '../../common/guards/organization.guard';
import { PoliciesGuard } from '../casl/policies.guard';
import { Action } from '../casl/action.enum';
import { Subject } from '../casl/subject.enum';
import { RequirePermission } from '../casl/permissions.decorator';
import { LeaveBlockDatesService } from './leave-block-dates.service';
import { CreateLeaveBlockDateDto, UpdateLeaveBlockDateDto } from './dto';

@ApiTags('HR - Leave Block Dates')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, OrganizationGuard, PoliciesGuard)
@Controller('organizations/:organizationId/leave-block-dates')
export class LeaveBlockDatesController {
  constructor(private readonly service: LeaveBlockDatesService) {}

  @Get()
  @RequirePermission(Action.Read, Subject.LEAVE_BLOCK_DATE)
  @ApiOperation({ summary: 'List leave block dates' })
  list(
    @Param('organizationId') organizationId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('leave_type_id') leaveTypeId?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.service.list(organizationId, {
      from,
      to,
      leave_type_id: leaveTypeId,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Post()
  @RequirePermission(Action.Create, Subject.LEAVE_BLOCK_DATE)
  @ApiOperation({ summary: 'Create a leave block date' })
  create(
    @Request() req: any,
    @Param('organizationId') organizationId: string,
    @Body() dto: CreateLeaveBlockDateDto,
  ) {
    return this.service.create(organizationId, req.user?.id ?? null, dto);
  }

  @Put(':id')
  @RequirePermission(Action.Update, Subject.LEAVE_BLOCK_DATE)
  @ApiOperation({ summary: 'Update a leave block date' })
  update(
    @Param('organizationId') organizationId: string,
    @Param('id') id: string,
    @Body() dto: UpdateLeaveBlockDateDto,
  ) {
    return this.service.update(organizationId, id, dto);
  }

  @Delete(':id')
  @RequirePermission(Action.Delete, Subject.LEAVE_BLOCK_DATE)
  @ApiOperation({ summary: 'Delete a leave block date' })
  remove(
    @Param('organizationId') organizationId: string,
    @Param('id') id: string,
  ) {
    return this.service.remove(organizationId, id);
  }
}
