import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { ConsolidatedReportsService } from './consolidated-reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationGuard } from '../../common/guards/organization.guard';
import { ModuleEntitlementGuard } from '../../common/guards/module-entitlement.guard';
import { RequireModule } from '../../common/decorators/require-module.decorator';

@ApiTags('financial-reports')
@Controller('financial-reports')
@RequireModule('accounting')
@UseGuards(JwtAuthGuard, OrganizationGuard, ModuleEntitlementGuard)
@ApiBearerAuth()
export class ConsolidatedReportsController {
  constructor(private readonly service: ConsolidatedReportsService) {}

  @Get('consolidated-profit-loss')
  @ApiOperation({ summary: 'Consolidated P&L across organization group members' })
  @ApiQuery({ name: 'group_id', required: true })
  @ApiQuery({ name: 'start', required: true })
  @ApiQuery({ name: 'end', required: true })
  @ApiQuery({ name: 'basis', required: false, description: 'accrual (default) | cash' })
  @ApiQuery({ name: 'include_zero_balances', required: false })
  @ApiQuery({ name: 'include_eliminations', required: false, description: 'default true' })
  @ApiResponse({ status: 200 })
  async getConsolidated(
    @Req() req: any,
    @Query('group_id') groupId: string,
    @Query('start') start: string,
    @Query('end') end: string,
    @Query('basis') basis?: string,
    @Query('include_zero_balances') includeZero?: string,
    @Query('include_eliminations') includeElim?: string,
  ) {
    const userId = req.user?.id || req.user?.sub;
    return this.service.getConsolidatedProfitLoss({
      groupId,
      userId,
      startDate: start,
      endDate: end,
      filters: {
        basis: basis === 'cash' ? 'cash' : 'accrual',
        include_zero_balances: includeZero === 'true' || includeZero === '1',
        include_eliminations:
          includeElim === undefined || includeElim === ''
            ? true
            : !(includeElim === 'false' || includeElim === '0'),
      },
    });
  }
}
