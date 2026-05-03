import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationGuard } from '../../common/guards/organization.guard';
import { PoliciesGuard } from '../casl/policies.guard';
import { Action } from '../casl/action.enum';
import { Subject } from '../casl/subject.enum';
import { RequirePermission } from '../casl/permissions.decorator';
import { LeaveTypesService } from './leave-types.service';
import { CreateLeaveTypeDto, UpdateLeaveTypeDto } from './dto';

@ApiTags('HR - Leave Types')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, OrganizationGuard, PoliciesGuard)
@Controller('organizations/:organizationId/leave-types')
export class LeaveTypesController {
  constructor(private readonly service: LeaveTypesService) {}

  @Get()
  @RequirePermission(Action.Read, Subject.LEAVE_TYPE)
  @ApiOperation({ summary: 'List leave types' })
  list(
    @Param('organizationId') organizationId: string,
    @Query('includeInactive') includeInactive?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.service.list(organizationId, includeInactive === 'true', {
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Get(':id')
  @RequirePermission(Action.Read, Subject.LEAVE_TYPE)
  getOne(
    @Param('organizationId') organizationId: string,
    @Param('id') id: string,
  ) {
    return this.service.getOne(organizationId, id);
  }

  @Post()
  @RequirePermission(Action.Create, Subject.LEAVE_TYPE)
  create(
    @Param('organizationId') organizationId: string,
    @Body() dto: CreateLeaveTypeDto,
  ) {
    return this.service.create(organizationId, dto);
  }

  @Put(':id')
  @RequirePermission(Action.Update, Subject.LEAVE_TYPE)
  update(
    @Param('organizationId') organizationId: string,
    @Param('id') id: string,
    @Body() dto: UpdateLeaveTypeDto,
  ) {
    return this.service.update(organizationId, id, dto);
  }

  @Delete(':id')
  @RequirePermission(Action.Delete, Subject.LEAVE_TYPE)
  @ApiOperation({ summary: 'Deactivate leave type (soft-delete)' })
  deactivate(
    @Param('organizationId') organizationId: string,
    @Param('id') id: string,
  ) {
    return this.service.deactivate(organizationId, id);
  }
}
