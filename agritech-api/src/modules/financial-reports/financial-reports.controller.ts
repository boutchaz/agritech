import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiHeader } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequireModule } from '../../common/decorators/require-module.decorator';
import { OrganizationId } from '../../common/decorators/organization.decorator';
import { AgedReportsService } from './financial-reports.service';
import { OrganizationGuard } from '../../common/guards/organization.guard';
import { ModuleEntitlementGuard } from '../../common/guards/module-entitlement.guard';

@ApiTags('Financial Reports')
@ApiBearerAuth()
@ApiHeader({ name: 'x-organization-id', required: true, description: 'Organization ID' })
@RequireModule('accounting')
@UseGuards(JwtAuthGuard, OrganizationGuard, ModuleEntitlementGuard)
@Controller('financial-reports')
export class FinancialReportsController {
  constructor(private readonly financialReportsService: AgedReportsService) {}

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
