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
import { resolveSelfScope } from '../../common/utils/self-scope';
import { ExpenseClaimsService } from './expense-claims.service';
import {
  ApproveClaimDto,
  CreateExpenseCategoryDto,
  CreateExpenseClaimDto,
  RejectClaimDto,
  UpdateExpenseCategoryDto,
  UpdateExpenseClaimDto,
} from './dto';

@ApiTags('HR - Expense Claims')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, OrganizationGuard, PoliciesGuard)
@Controller('organizations/:organizationId')
export class ExpenseClaimsController {
  constructor(private readonly service: ExpenseClaimsService) {}

  // Categories
  @Get('expense-categories')
  @RequirePermission(Action.Read, Subject.EXPENSE_CATEGORY)
  listCategories(@Param('organizationId') orgId: string) {
    return this.service.listCategories(orgId);
  }

  @Post('expense-categories')
  @RequirePermission(Action.Create, Subject.EXPENSE_CATEGORY)
  createCategory(@Param('organizationId') orgId: string, @Body() dto: CreateExpenseCategoryDto) {
    return this.service.createCategory(orgId, dto);
  }

  @Put('expense-categories/:id')
  @RequirePermission(Action.Update, Subject.EXPENSE_CATEGORY)
  updateCategory(
    @Param('organizationId') orgId: string,
    @Param('id') id: string,
    @Body() dto: UpdateExpenseCategoryDto,
  ) {
    return this.service.updateCategory(orgId, id, dto);
  }

  @Delete('expense-categories/:id')
  @RequirePermission(Action.Delete, Subject.EXPENSE_CATEGORY)
  deleteCategory(@Param('organizationId') orgId: string, @Param('id') id: string) {
    return this.service.deleteCategory(orgId, id);
  }

  // Claims
  @Get('expense-claims')
  @RequirePermission(Action.Read, Subject.EXPENSE_CLAIM)
  listClaims(
    @Request() req: any,
    @Param('organizationId') orgId: string,
    @Query('worker_id') workerId?: string,
    @Query('status') status?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('scope') scope?: string,
  ) {
    const selfScope = resolveSelfScope(req.user, scope);
    const effectiveWorkerId = selfScope.mine ? selfScope.workerId ?? '__none__' : workerId;
    return this.service.listClaims(orgId, {
      worker_id: effectiveWorkerId,
      status,
      from,
      to,
    });
  }

  @Post('expense-claims')
  @RequirePermission(Action.Create, Subject.EXPENSE_CLAIM)
  createClaim(
    @Request() req: any,
    @Param('organizationId') orgId: string,
    @Body() dto: CreateExpenseClaimDto,
  ) {
    return this.service.createClaim(orgId, req.user?.id ?? null, dto);
  }

  @Put('expense-claims/:id')
  @RequirePermission(Action.Update, Subject.EXPENSE_CLAIM)
  updateClaim(
    @Param('organizationId') orgId: string,
    @Param('id') id: string,
    @Body() dto: UpdateExpenseClaimDto,
  ) {
    return this.service.updateClaim(orgId, id, dto);
  }

  @Put('expense-claims/:id/approve')
  @RequirePermission(Action.Update, Subject.EXPENSE_CLAIM)
  approve(
    @Request() req: any,
    @Param('organizationId') orgId: string,
    @Param('id') id: string,
    @Body() dto: ApproveClaimDto,
  ) {
    return this.service.approveClaim(
      orgId,
      id,
      req.user?.id ?? null,
      dto,
      req.user?.orgRole ?? null,
    );
  }

  @Put('expense-claims/:id/reject')
  @RequirePermission(Action.Update, Subject.EXPENSE_CLAIM)
  reject(
    @Request() req: any,
    @Param('organizationId') orgId: string,
    @Param('id') id: string,
    @Body() dto: RejectClaimDto,
  ) {
    return this.service.rejectClaim(orgId, id, req.user?.id ?? null, dto);
  }

  @Delete('expense-claims/:id')
  @RequirePermission(Action.Delete, Subject.EXPENSE_CLAIM)
  deleteClaim(@Param('organizationId') orgId: string, @Param('id') id: string) {
    return this.service.deleteClaim(orgId, id);
  }
}
