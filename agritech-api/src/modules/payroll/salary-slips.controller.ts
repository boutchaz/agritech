import {
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
import { resolveSelfScope } from '../../common/utils/self-scope';
import { SalarySlipsService } from './salary-slips.service';
import { GenerateSlipDto } from './dto';

@ApiTags('HR - Salary Slips')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, OrganizationGuard, PoliciesGuard)
@Controller('organizations/:organizationId/salary-slips')
export class SalarySlipsController {
  constructor(private readonly service: SalarySlipsService) {}

  @Get()
  @RequirePermission(Action.Read, Subject.SALARY_SLIP)
  list(
    @Request() req: any,
    @Param('organizationId') organizationId: string,
    @Query('worker_id') workerId?: string,
    @Query('payroll_run_id') payrollRunId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('status') status?: string,
    @Query('scope') scope?: string,
  ) {
    const selfScope = resolveSelfScope(req.user, scope);
    const effectiveWorkerId = selfScope.mine ? selfScope.workerId ?? '__none__' : workerId;
    return this.service.list(organizationId, {
      worker_id: effectiveWorkerId,
      payroll_run_id: payrollRunId,
      from,
      to,
      status,
    });
  }

  @Get(':id')
  @RequirePermission(Action.Read, Subject.SALARY_SLIP)
  getOne(
    @Param('organizationId') organizationId: string,
    @Param('id') id: string,
  ) {
    return this.service.getOne(organizationId, id);
  }

  @Post('generate')
  @RequirePermission(Action.Create, Subject.SALARY_SLIP)
  @ApiOperation({
    summary:
      'Generate or regenerate a draft salary slip for a worker (idempotent on (worker_id, period))',
  })
  generate(
    @Request() req: any,
    @Param('organizationId') organizationId: string,
    @Body() dto: GenerateSlipDto,
  ) {
    return this.service.generate(organizationId, req.user?.id ?? null, dto);
  }

  @Put(':id/submit')
  @RequirePermission(Action.Update, Subject.SALARY_SLIP)
  submit(
    @Param('organizationId') organizationId: string,
    @Param('id') id: string,
  ) {
    return this.service.setStatus(organizationId, id, 'submitted');
  }

  @Put(':id/pay')
  @RequirePermission(Action.Update, Subject.SALARY_SLIP)
  pay(
    @Request() req: any,
    @Param('organizationId') organizationId: string,
    @Param('id') id: string,
  ) {
    return this.service.setStatus(organizationId, id, 'paid', req.user?.id ?? null);
  }

  @Put(':id/cancel')
  @RequirePermission(Action.Update, Subject.SALARY_SLIP)
  cancel(
    @Param('organizationId') organizationId: string,
    @Param('id') id: string,
  ) {
    return this.service.setStatus(organizationId, id, 'cancelled');
  }
}
