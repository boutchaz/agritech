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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationGuard } from '../../common/guards/organization.guard';
import { PoliciesGuard } from '../casl/policies.guard';
import { Action } from '../casl/action.enum';
import { Subject } from '../casl/subject.enum';
import { RequirePermission } from '../casl/permissions.decorator';
import { SalaryStructuresService } from './salary-structures.service';
import {
  CreateSalaryStructureDto,
  CreateStructureAssignmentDto,
  ReplaceComponentsDto,
  UpdateSalaryStructureDto,
} from './dto';

@ApiTags('HR - Salary Structures')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, OrganizationGuard, PoliciesGuard)
@Controller('organizations/:organizationId/salary-structures')
export class SalaryStructuresController {
  constructor(private readonly service: SalaryStructuresService) {}

  @Get()
  @RequirePermission(Action.Read, Subject.SALARY_STRUCTURE)
  list(@Param('organizationId') organizationId: string) {
    return this.service.list(organizationId);
  }

  @Get('assignments')
  @RequirePermission(Action.Read, Subject.SALARY_STRUCTURE)
  listAssignments(
    @Param('organizationId') organizationId: string,
    @Query('worker_id') workerId?: string,
  ) {
    return this.service.listAssignments(organizationId, workerId);
  }

  @Post('assignments')
  @RequirePermission(Action.Create, Subject.SALARY_STRUCTURE)
  @ApiOperation({ summary: 'Assign a salary structure to a worker' })
  createAssignment(
    @Request() req: any,
    @Param('organizationId') organizationId: string,
    @Body() dto: CreateStructureAssignmentDto,
  ) {
    return this.service.createAssignment(organizationId, req.user?.id ?? null, dto);
  }

  @Get(':id')
  @RequirePermission(Action.Read, Subject.SALARY_STRUCTURE)
  getOne(
    @Param('organizationId') organizationId: string,
    @Param('id') id: string,
  ) {
    return this.service.getOne(organizationId, id);
  }

  @Post()
  @RequirePermission(Action.Create, Subject.SALARY_STRUCTURE)
  create(
    @Request() req: any,
    @Param('organizationId') organizationId: string,
    @Body() dto: CreateSalaryStructureDto,
  ) {
    return this.service.create(organizationId, req.user?.id ?? null, dto);
  }

  @Put(':id')
  @RequirePermission(Action.Update, Subject.SALARY_STRUCTURE)
  update(
    @Param('organizationId') organizationId: string,
    @Param('id') id: string,
    @Body() dto: UpdateSalaryStructureDto,
  ) {
    return this.service.update(organizationId, id, dto);
  }

  @Put(':id/components')
  @RequirePermission(Action.Update, Subject.SALARY_STRUCTURE)
  @ApiOperation({ summary: 'Replace all components on a structure' })
  replaceComponents(
    @Param('id') id: string,
    @Body() dto: ReplaceComponentsDto,
  ) {
    return this.service.replaceComponents(id, dto.components);
  }

  @Delete(':id')
  @RequirePermission(Action.Delete, Subject.SALARY_STRUCTURE)
  remove(
    @Param('organizationId') organizationId: string,
    @Param('id') id: string,
  ) {
    return this.service.remove(organizationId, id);
  }
}
