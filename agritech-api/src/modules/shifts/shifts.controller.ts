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
import { ShiftsService } from './shifts.service';
import {
  CreateShiftAssignmentDto,
  CreateShiftDto,
  CreateShiftRequestDto,
  ResolveShiftRequestDto,
  UpdateShiftDto,
} from './dto';

@ApiTags('HR - Shifts')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, OrganizationGuard, PoliciesGuard)
@Controller('organizations/:organizationId')
export class ShiftsController {
  constructor(private readonly service: ShiftsService) {}

  // ── Shifts ─────────────────────────────────────────────────────
  @Get('shifts')
  @RequirePermission(Action.Read, Subject.SHIFT)
  list(@Param('organizationId') orgId: string) {
    return this.service.list(orgId);
  }

  @Post('shifts')
  @RequirePermission(Action.Create, Subject.SHIFT)
  create(@Param('organizationId') orgId: string, @Body() dto: CreateShiftDto) {
    return this.service.create(orgId, dto);
  }

  @Put('shifts/:id')
  @RequirePermission(Action.Update, Subject.SHIFT)
  update(
    @Param('organizationId') orgId: string,
    @Param('id') id: string,
    @Body() dto: UpdateShiftDto,
  ) {
    return this.service.update(orgId, id, dto);
  }

  @Delete('shifts/:id')
  @RequirePermission(Action.Delete, Subject.SHIFT)
  remove(@Param('organizationId') orgId: string, @Param('id') id: string) {
    return this.service.remove(orgId, id);
  }

  // ── Assignments ───────────────────────────────────────────────
  @Get('shift-assignments')
  @RequirePermission(Action.Read, Subject.SHIFT_ASSIGNMENT)
  listAssignments(
    @Param('organizationId') orgId: string,
    @Query('worker_id') workerId?: string,
    @Query('shift_id') shiftId?: string,
    @Query('status') status?: 'active' | 'inactive',
  ) {
    return this.service.listAssignments(orgId, {
      worker_id: workerId,
      shift_id: shiftId,
      status,
    });
  }

  @Post('shift-assignments')
  @RequirePermission(Action.Create, Subject.SHIFT_ASSIGNMENT)
  createAssignment(
    @Request() req: any,
    @Param('organizationId') orgId: string,
    @Body() dto: CreateShiftAssignmentDto,
  ) {
    return this.service.createAssignment(orgId, req.user?.id ?? null, dto);
  }

  @Delete('shift-assignments/:id')
  @RequirePermission(Action.Update, Subject.SHIFT_ASSIGNMENT)
  deactivateAssignment(
    @Param('organizationId') orgId: string,
    @Param('id') id: string,
  ) {
    return this.service.deactivateAssignment(orgId, id);
  }

  // ── Requests ──────────────────────────────────────────────────
  @Get('shift-requests')
  @RequirePermission(Action.Read, Subject.SHIFT_REQUEST)
  listRequests(
    @Param('organizationId') orgId: string,
    @Query('worker_id') workerId?: string,
    @Query('status') status?: 'pending' | 'approved' | 'rejected',
  ) {
    return this.service.listRequests(orgId, { worker_id: workerId, status });
  }

  @Post('shift-requests')
  @RequirePermission(Action.Create, Subject.SHIFT_REQUEST)
  createRequest(
    @Param('organizationId') orgId: string,
    @Body() dto: CreateShiftRequestDto,
  ) {
    return this.service.createRequest(orgId, dto);
  }

  @Put('shift-requests/:id/resolve')
  @RequirePermission(Action.Update, Subject.SHIFT_REQUEST)
  resolveRequest(
    @Request() req: any,
    @Param('organizationId') orgId: string,
    @Param('id') id: string,
    @Body() dto: ResolveShiftRequestDto,
  ) {
    return this.service.resolveRequest(orgId, req.user?.id ?? null, id, dto);
  }
}
