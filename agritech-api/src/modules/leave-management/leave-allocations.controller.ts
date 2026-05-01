import {
  Body,
  Controller,
  Get,
  Param,
  Post,
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
import { LeaveAllocationsService } from './leave-allocations.service';
import { BulkAllocateDto, CreateLeaveAllocationDto } from './dto';

@ApiTags('HR - Leave Allocations')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, OrganizationGuard, PoliciesGuard)
@Controller('organizations/:organizationId/leave-allocations')
export class LeaveAllocationsController {
  constructor(private readonly service: LeaveAllocationsService) {}

  @Get()
  @RequirePermission(Action.Read, Subject.LEAVE_ALLOCATION)
  list(
    @Param('organizationId') organizationId: string,
    @Query('worker_id') workerId?: string,
    @Query('leave_type_id') leaveTypeId?: string,
  ) {
    return this.service.list(organizationId, {
      worker_id: workerId,
      leave_type_id: leaveTypeId,
    });
  }

  @Get('worker/:workerId')
  @RequirePermission(Action.Read, Subject.LEAVE_ALLOCATION)
  forWorker(
    @Param('organizationId') organizationId: string,
    @Param('workerId') workerId: string,
  ) {
    return this.service.forWorker(organizationId, workerId);
  }

  @Post()
  @RequirePermission(Action.Create, Subject.LEAVE_ALLOCATION)
  create(
    @Request() req: any,
    @Param('organizationId') organizationId: string,
    @Body() dto: CreateLeaveAllocationDto,
  ) {
    return this.service.create(organizationId, req.user?.id ?? null, dto);
  }

  @Post('bulk')
  @RequirePermission(Action.Create, Subject.LEAVE_ALLOCATION)
  @ApiOperation({ summary: 'Bulk allocate leave to multiple workers' })
  bulkCreate(
    @Request() req: any,
    @Param('organizationId') organizationId: string,
    @Body() dto: BulkAllocateDto,
  ) {
    return this.service.bulkCreate(organizationId, req.user?.id ?? null, dto);
  }
}
