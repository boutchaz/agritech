import { Controller, Post, Body, UseGuards, Req, Param } from '@nestjs/common';
import { AccountingAutomationService } from './accounting-automation.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequireModule } from '../../common/decorators/require-module.decorator';
import { OrganizationGuard } from '../../common/guards/organization.guard';
import { ModuleEntitlementGuard } from '../../common/guards/module-entitlement.guard';

@Controller('accounting')
@RequireModule('accounting')
@UseGuards(JwtAuthGuard, OrganizationGuard, ModuleEntitlementGuard)
export class AccountingController {
  constructor(
    private readonly accountingAutomationService: AccountingAutomationService,
  ) { }

  @Post('costs/:id/journal-entry')
  async createJournalEntryFromCost(
    @Param('id') costId: string,
    @Body() body: {
      organization_id: string;
      cost_type: string;
      amount: number;
      date: Date;
      description: string;
      parcel_id?: string;
    },
    @Req() req: any,
  ) {
    return this.accountingAutomationService.createJournalEntryFromCost(
      body.organization_id,
      costId,
      body.cost_type,
      body.amount,
      body.date,
      body.description,
      req.user.sub,
      body.parcel_id,
    );
  }

  @Post('revenues/:id/journal-entry')
  async createJournalEntryFromRevenue(
    @Param('id') revenueId: string,
    @Body() body: {
      organization_id: string;
      revenue_type: string;
      amount: number;
      date: Date;
      description: string;
      parcel_id?: string;
    },
    @Req() req: any,
  ) {
    return this.accountingAutomationService.createJournalEntryFromRevenue(
      body.organization_id,
      revenueId,
      body.revenue_type,
      body.amount,
      body.date,
      body.description,
      req.user.sub,
      body.parcel_id,
    );
  }
}
