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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationGuard } from '../../common/guards/organization.guard';

@ApiTags('financial-reports')
@Controller('financial-reports')
@UseGuards(JwtAuthGuard, OrganizationGuard)
@ApiBearerAuth()
export class FinancialReportsController {
  constructor(private readonly reportsService: FinancialReportsService) {}

  @Get('trial-balance')
  @ApiOperation({ summary: 'Get trial balance report' })
  @ApiQuery({ name: 'as_of_date', required: false, description: 'Date for balance calculation (YYYY-MM-DD)' })
  @ApiResponse({ status: 200, description: 'Trial balance retrieved successfully' })
  async getTrialBalance(
    @Req() req: any,
    @Query('as_of_date') asOfDate?: string,
  ) {
    const organizationId = req.headers['x-organization-id'];
    return this.reportsService.getTrialBalance(organizationId, asOfDate);
  }

  @Get('balance-sheet')
  @ApiOperation({ summary: 'Get balance sheet report' })
  @ApiQuery({ name: 'as_of_date', required: false, description: 'Date for balance calculation (YYYY-MM-DD)' })
  @ApiResponse({ status: 200, description: 'Balance sheet retrieved successfully' })
  async getBalanceSheet(
    @Req() req: any,
    @Query('as_of_date') asOfDate?: string,
  ) {
    const organizationId = req.headers['x-organization-id'];
    return this.reportsService.getBalanceSheet(organizationId, asOfDate);
  }

  @Get('profit-loss')
  @ApiOperation({ summary: 'Get profit and loss statement' })
  @ApiQuery({ name: 'start_date', required: true, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'end_date', required: false, description: 'End date (YYYY-MM-DD)' })
  @ApiResponse({ status: 200, description: 'Profit/Loss statement retrieved successfully' })
  async getProfitLoss(
    @Req() req: any,
    @Query('start_date') startDate: string,
    @Query('end_date') endDate?: string,
  ) {
    const organizationId = req.headers['x-organization-id'];
    return this.reportsService.getProfitLoss(organizationId, startDate, endDate);
  }

  @Get('general-ledger/:accountId')
  @ApiOperation({ summary: 'Get general ledger for a specific account' })
  @ApiParam({ name: 'accountId', description: 'Account ID' })
  @ApiQuery({ name: 'start_date', required: true, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'end_date', required: false, description: 'End date (YYYY-MM-DD)' })
  @ApiResponse({ status: 200, description: 'General ledger retrieved successfully' })
  async getGeneralLedger(
    @Req() req: any,
    @Param('accountId') accountId: string,
    @Query('start_date') startDate: string,
    @Query('end_date') endDate?: string,
  ) {
    const organizationId = req.headers['x-organization-id'];
    return this.reportsService.getGeneralLedger(organizationId, accountId, startDate, endDate);
  }

  @Get('account-summary')
  @ApiOperation({ summary: 'Get account balance summary by type' })
  @ApiQuery({ name: 'as_of_date', required: false, description: 'Date for balance calculation (YYYY-MM-DD)' })
  @ApiResponse({ status: 200, description: 'Account summary retrieved successfully' })
  async getAccountSummary(
    @Req() req: any,
    @Query('as_of_date') asOfDate?: string,
  ) {
    const organizationId = req.headers['x-organization-id'];
    return this.reportsService.getAccountSummary(organizationId, asOfDate);
  }

  @Get('account-balance/:accountId')
  @ApiOperation({ summary: 'Get balance for a specific account' })
  @ApiParam({ name: 'accountId', description: 'Account ID' })
  @ApiQuery({ name: 'as_of_date', required: false, description: 'Date for balance calculation (YYYY-MM-DD)' })
  @ApiResponse({ status: 200, description: 'Account balance retrieved successfully' })
  async getAccountBalance(
    @Req() req: any,
    @Param('accountId') accountId: string,
    @Query('as_of_date') asOfDate?: string,
  ) {
    const organizationId = req.headers['x-organization-id'];
    return this.reportsService.getAccountBalance(organizationId, accountId, asOfDate);
  }
}
