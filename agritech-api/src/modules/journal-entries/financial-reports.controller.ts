import {
  Controller,
  Get,
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
import { FiscalYearsService } from '../fiscal-years/fiscal-years.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationGuard } from '../../common/guards/organization.guard';

@ApiTags('financial-reports')
@Controller('financial-reports')
@UseGuards(JwtAuthGuard, OrganizationGuard)
@ApiBearerAuth()
export class FinancialReportsController {
  constructor(
    private readonly reportsService: FinancialReportsService,
    private readonly fiscalYearsService: FiscalYearsService,
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
  @ApiResponse({ status: 200, description: 'Profit/Loss statement retrieved successfully' })
  async getProfitLoss(
    @Req() req: any,
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
    @Query('fiscal_year_id') fiscalYearId?: string,
  ) {
    const organizationId = req.headers['x-organization-id'];
    const resolved = await this.resolveRange(organizationId, startDate, endDate, fiscalYearId);
    return this.reportsService.getProfitLoss(organizationId, resolved.startDate!, resolved.endDate);
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
}
