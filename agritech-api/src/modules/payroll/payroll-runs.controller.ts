import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
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
import { PayrollRunsService } from './payroll-runs.service';
import { CreatePayrollRunDto } from './dto';

@ApiTags('HR - Payroll Runs')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, OrganizationGuard, PoliciesGuard)
@Controller('organizations/:organizationId/payroll-runs')
export class PayrollRunsController {
  constructor(private readonly service: PayrollRunsService) {}

  @Get()
  @RequirePermission(Action.Read, Subject.PAYROLL_RUN)
  list(@Param('organizationId') organizationId: string) {
    return this.service.list(organizationId);
  }

  @Get(':id')
  @RequirePermission(Action.Read, Subject.PAYROLL_RUN)
  getOne(
    @Param('organizationId') organizationId: string,
    @Param('id') id: string,
  ) {
    return this.service.getOne(organizationId, id);
  }

  @Post()
  @RequirePermission(Action.Create, Subject.PAYROLL_RUN)
  create(
    @Request() req: any,
    @Param('organizationId') organizationId: string,
    @Body() dto: CreatePayrollRunDto,
  ) {
    return this.service.create(organizationId, req.user?.id ?? null, dto);
  }

  @Post(':id/generate')
  @RequirePermission(Action.Update, Subject.PAYROLL_RUN)
  @ApiOperation({ summary: 'Generate draft slips for all matching workers' })
  generate(
    @Request() req: any,
    @Param('organizationId') organizationId: string,
    @Param('id') id: string,
  ) {
    return this.service.generate(organizationId, req.user?.id ?? null, id);
  }

  @Put(':id/submit')
  @RequirePermission(Action.Update, Subject.PAYROLL_RUN)
  submit(
    @Request() req: any,
    @Param('organizationId') organizationId: string,
    @Param('id') id: string,
  ) {
    return this.service.submit(organizationId, req.user?.id ?? null, id);
  }

  @Put(':id/cancel')
  @RequirePermission(Action.Update, Subject.PAYROLL_RUN)
  cancel(
    @Param('organizationId') organizationId: string,
    @Param('id') id: string,
  ) {
    return this.service.cancel(organizationId, id);
  }
}
