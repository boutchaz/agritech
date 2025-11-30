import { Controller, Post, Req, UseGuards } from '@nestjs/common';
import { AccountsService } from './accounts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('accounts')
@UseGuards(JwtAuthGuard)
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  /**
   * Seed Moroccan Chart of Accounts
   * POST /api/v1/accounts/seed-moroccan-chart
   */
  @Post('seed-moroccan-chart')
  async seedMoroccanChart(@Req() req: any) {
    const organizationId = req.headers['x-organization-id'];

    if (!organizationId) {
      throw new Error('Organization ID is required');
    }

    return this.accountsService.seedMoroccanChartOfAccounts(organizationId);
  }
}
