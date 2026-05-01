import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { FinancialReportsService } from './financial-reports.service';
import { FxRevaluationService } from './fx-revaluation.service';
import { FiscalYearsService } from '../fiscal-years/fiscal-years.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequireModule } from '../../common/decorators/require-module.decorator';
import { OrganizationGuard } from '../../common/guards/organization.guard';
import { ModuleEntitlementGuard } from '../../common/guards/module-entitlement.guard';

@ApiTags('financial-reports')
@Controller('financial-reports')
@RequireModule('accounting')
@UseGuards(JwtAuthGuard, OrganizationGuard, ModuleEntitlementGuard)
@ApiBearerAuth()
export class FinancialReportsController {
  constructor(
    private readonly reportsService: FinancialReportsService,
    private readonly fiscalYearsService: FiscalYearsService,
    private readonly fxRevaluationService: FxRevaluationService,
  ) {}

  /**
   * Resolve fiscal year to as_of_date (end_date) for point-in-time reports
   */
  private async resolveAsOfDate(organizationId: string, asOfDate?: string, fiscalYearId?: string): Promise<string | undefined> {
    if (asOfDate) return asOfDate;
    if (!fiscalYearId) return undefined;
    const fy = await this.fiscalYearsService.findOne(fiscalYearId, organizationId);
    return fy?.end_date;
  }

  /**
   * Resolve fiscal year to start_date/end_date for range reports
   */
  private async resolveRange(
    organizationId: string,
    startDate?: string,
    endDate?: string,
    fiscalYearId?: string,
  ): Promise<{ startDate?: string; endDate?: string }> {
    if (startDate) return { startDate, endDate };
    if (!fiscalYearId) return { startDate, endDate };
    const fy = await this.fiscalYearsService.findOne(fiscalYearId, organizationId);
    return {
      startDate: fy?.start_date || startDate,
      endDate: endDate || fy?.end_date,
    };
  }

  @Get('trial-balance')
  @ApiOperation({ summary: 'Get trial balance report' })
  @ApiQuery({ name: 'as_of_date', required: false, description: 'Date for balance calculation (YYYY-MM-DD)' })
  @ApiQuery({ name: 'fiscal_year_id', required: false, description: 'Fiscal year ID (uses end_date as as_of_date)' })
  @ApiResponse({ status: 200, description: 'Trial balance retrieved successfully' })
  async getTrialBalance(
    @Req() req: any,
    @Query('as_of_date') asOfDate?: string,
    @Query('fiscal_year_id') fiscalYearId?: string,
  ) {
    const organizationId = req.headers['x-organization-id'];
    const resolvedDate = await this.resolveAsOfDate(organizationId, asOfDate, fiscalYearId);
    return this.reportsService.getTrialBalance(organizationId, resolvedDate);
  }

  @Get('balance-sheet')
  @ApiOperation({ summary: 'Get balance sheet report' })
  @ApiQuery({ name: 'as_of_date', required: false, description: 'Date for balance calculation (YYYY-MM-DD)' })
  @ApiQuery({ name: 'fiscal_year_id', required: false, description: 'Fiscal year ID (uses end_date as as_of_date)' })
  @ApiResponse({ status: 200, description: 'Balance sheet retrieved successfully' })
  async getBalanceSheet(
    @Req() req: any,
    @Query('as_of_date') asOfDate?: string,
    @Query('fiscal_year_id') fiscalYearId?: string,
  ) {
    const organizationId = req.headers['x-organization-id'];
    const resolvedDate = await this.resolveAsOfDate(organizationId, asOfDate, fiscalYearId);
    return this.reportsService.getBalanceSheet(organizationId, resolvedDate);
  }

  @Get('profit-loss')
  @ApiOperation({ summary: 'Get profit and loss statement' })
  @ApiQuery({ name: 'start_date', required: false, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'end_date', required: false, description: 'End date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'fiscal_year_id', required: false, description: 'Fiscal year ID (resolves start/end dates)' })
  @ApiQuery({ name: 'cost_center_id', required: false, description: 'Filter by cost center' })
  @ApiQuery({ name: 'farm_id', required: false, description: 'Filter by farm' })
  @ApiQuery({ name: 'parcel_id', required: false, description: 'Filter by parcel' })
  @ApiQuery({ name: 'include_zero_balances', required: false, description: 'Include accounts with zero balance' })
  @ApiQuery({ name: 'include_budget', required: false, description: 'Merge cost_center_budgets into rows (requires fiscal_year_id)' })
  @ApiQuery({ name: 'compare_with', required: false, description: 'previous_period | previous_year' })
  @ApiQuery({ name: 'basis', required: false, description: 'accrual (default) | cash' })
  @ApiResponse({ status: 200, description: 'Profit/Loss statement retrieved successfully' })
  async getProfitLoss(
    @Req() req: any,
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
    @Query('fiscal_year_id') fiscalYearId?: string,
    @Query('cost_center_id') costCenterId?: string,
    @Query('farm_id') farmId?: string,
    @Query('parcel_id') parcelId?: string,
    @Query('include_zero_balances') includeZeroBalances?: string,
    @Query('include_budget') includeBudget?: string,
    @Query('include_by_currency') includeByCurrency?: string,
    @Query('compare_with') compareWith?: string,
    @Query('basis') basis?: string,
  ) {
    const organizationId = req.headers['x-organization-id'];
    const resolved = await this.resolveRange(organizationId, startDate, endDate, fiscalYearId);
    const resolvedBasis: 'accrual' | 'cash' = basis === 'cash' ? 'cash' : 'accrual';
    const filters = {
      cost_center_id: costCenterId,
      farm_id: farmId,
      parcel_id: parcelId,
      fiscal_year_id: fiscalYearId,
      include_zero_balances:
        includeZeroBalances === 'true' || includeZeroBalances === '1',
      include_budget: includeBudget === 'true' || includeBudget === '1',
      include_by_currency: includeByCurrency === 'true' || includeByCurrency === '1',
      basis: resolvedBasis,
    };
    if (compareWith === 'previous_period' || compareWith === 'previous_year') {
      return this.reportsService.getProfitLossComparison(
        organizationId,
        resolved.startDate!,
        resolved.endDate || new Date().toISOString().split('T')[0],
        compareWith,
        filters,
      );
    }
    return this.reportsService.getProfitLoss(
      organizationId,
      resolved.startDate!,
      resolved.endDate,
      filters,
    );
  }

  @Get('general-ledger/:accountId')
  @ApiOperation({ summary: 'Get general ledger for a specific account' })
  @ApiParam({ name: 'accountId', description: 'Account ID' })
  @ApiQuery({ name: 'start_date', required: false, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'end_date', required: false, description: 'End date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'fiscal_year_id', required: false, description: 'Fiscal year ID (resolves start/end dates)' })
  @ApiResponse({ status: 200, description: 'General ledger retrieved successfully' })
  async getGeneralLedger(
    @Req() req: any,
    @Param('accountId') accountId: string,
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
    @Query('fiscal_year_id') fiscalYearId?: string,
  ) {
    const organizationId = req.headers['x-organization-id'];
    const resolved = await this.resolveRange(organizationId, startDate, endDate, fiscalYearId);
    return this.reportsService.getGeneralLedger(organizationId, accountId, resolved.startDate!, resolved.endDate);
  }

  @Get('account-summary')
  @ApiOperation({ summary: 'Get account balance summary by type' })
  @ApiQuery({ name: 'as_of_date', required: false, description: 'Date for balance calculation (YYYY-MM-DD)' })
  @ApiQuery({ name: 'fiscal_year_id', required: false, description: 'Fiscal year ID (uses end_date as as_of_date)' })
  @ApiResponse({ status: 200, description: 'Account summary retrieved successfully' })
  async getAccountSummary(
    @Req() req: any,
    @Query('as_of_date') asOfDate?: string,
    @Query('fiscal_year_id') fiscalYearId?: string,
  ) {
    const organizationId = req.headers['x-organization-id'];
    const resolvedDate = await this.resolveAsOfDate(organizationId, asOfDate, fiscalYearId);
    return this.reportsService.getAccountSummary(organizationId, resolvedDate);
  }

  @Get('account-balance/:accountId')
  @ApiOperation({ summary: 'Get balance for a specific account' })
  @ApiParam({ name: 'accountId', description: 'Account ID' })
  @ApiQuery({ name: 'as_of_date', required: false, description: 'Date for balance calculation (YYYY-MM-DD)' })
  @ApiQuery({ name: 'fiscal_year_id', required: false, description: 'Fiscal year ID (uses end_date as as_of_date)' })
  @ApiResponse({ status: 200, description: 'Account balance retrieved successfully' })
  async getAccountBalance(
    @Req() req: any,
    @Param('accountId') accountId: string,
    @Query('as_of_date') asOfDate?: string,
    @Query('fiscal_year_id') fiscalYearId?: string,
  ) {
    const organizationId = req.headers['x-organization-id'];
    const resolvedDate = await this.resolveAsOfDate(organizationId, asOfDate, fiscalYearId);
    return this.reportsService.getAccountBalance(organizationId, accountId, resolvedDate);
  }

  @Get('cash-flow')
  @ApiOperation({ summary: 'Get cash flow statement' })
  @ApiQuery({ name: 'start_date', required: false, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'end_date', required: false, description: 'End date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'fiscal_year_id', required: false, description: 'Fiscal year ID (resolves start/end dates)' })
  @ApiResponse({ status: 200, description: 'Cash flow statement retrieved successfully' })
  async getCashFlow(
    @Req() req: any,
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
    @Query('fiscal_year_id') fiscalYearId?: string,
  ) {
    const organizationId = req.headers['x-organization-id'];
    const resolved = await this.resolveRange(organizationId, startDate, endDate, fiscalYearId);
    return this.reportsService.getCashFlow(organizationId, resolved.startDate!, resolved.endDate);
  }

  @Post('close-fiscal-year')
  @ApiOperation({ summary: 'Post a year-end closing voucher and close the fiscal year' })
  @ApiResponse({ status: 201, description: 'Fiscal year closed successfully' })
  async closeFiscalYear(
    @Req() req: any,
    @Body()
    body: {
      fiscal_year_id: string;
      retained_earnings_account_id: string;
      closing_date?: string;
      remarks?: string;
    },
  ) {
    const organizationId = req.headers['x-organization-id'];
    const userId = req.user?.id || req.user?.userId;
    return this.reportsService.closeFiscalYear({
      organizationId,
      userId,
      fiscalYearId: body.fiscal_year_id,
      retainedEarningsAccountId: body.retained_earnings_account_id,
      closingDate: body.closing_date,
      remarks: body.remarks,
    });
  }

  @Post('fx-revaluate')
  @ApiOperation({ summary: 'Run unrealized FX revaluation for an as-of date' })
  @ApiResponse({ status: 201, description: 'FX revaluation entry posted' })
  async fxRevaluate(
    @Req() req: any,
    @Body() body: { as_of_date: string; remarks?: string; base_currency?: string },
  ) {
    const organizationId = req.headers['x-organization-id'];
    const userId = req.user?.id || req.user?.userId;
    return this.fxRevaluationService.revaluate({
      organizationId,
      userId,
      asOfDate: body.as_of_date,
      baseCurrency: body.base_currency,
      remarks: body.remarks,
    });
  }

  @Post('fx-revaluate/reverse')
  @ApiOperation({ summary: 'Reverse a previously-posted FX revaluation entry' })
  @ApiResponse({ status: 201, description: 'FX revaluation reversed' })
  async fxRevaluateReverse(
    @Req() req: any,
    @Body() body: { as_of_date: string; reason?: string },
  ) {
    const organizationId = req.headers['x-organization-id'];
    const userId = req.user?.id || req.user?.userId;
    return this.fxRevaluationService.reverse({
      organizationId,
      userId,
      asOfDate: body.as_of_date,
      reason: body.reason,
    });
  }

  @Post('reopen-fiscal-year')
  @ApiOperation({ summary: 'Reverse a closing voucher and reopen the fiscal year' })
  @ApiResponse({ status: 201, description: 'Fiscal year reopened successfully' })
  async reopenFiscalYear(
    @Req() req: any,
    @Body() body: { fiscal_year_id: string },
  ) {
    const organizationId = req.headers['x-organization-id'];
    const userId = req.user?.id || req.user?.userId;
    return this.reportsService.reverseFiscalYearClose(
      organizationId,
      userId,
      body.fiscal_year_id,
    );
  }
}
