import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationId } from '../../common/decorators/organization.decorator';
import { FinancialReportsService } from './financial-reports.service';

@ApiTags('Financial Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('financial-reports')
export class FinancialReportsController {
  constructor(private readonly financialReportsService: FinancialReportsService) {}

  @Get('aged-receivables')
  @ApiOperation({ summary: 'Get aged receivables report' })
  @ApiQuery({ name: 'as_of_date', required: false, description: 'Report as of date (YYYY-MM-DD)' })
  async getAgedReceivables(
    @OrganizationId() organizationId: string,
    @Query('as_of_date') asOfDate?: string,
  ) {
    return this.financialReportsService.getAgedReceivables(organizationId, asOfDate);
  }

  @Get('aged-payables')
  @ApiOperation({ summary: 'Get aged payables report' })
  @ApiQuery({ name: 'as_of_date', required: false, description: 'Report as of date (YYYY-MM-DD)' })
  async getAgedPayables(
    @OrganizationId() organizationId: string,
    @Query('as_of_date') asOfDate?: string,
  ) {
    return this.financialReportsService.getAgedPayables(organizationId, asOfDate);
  }
}
