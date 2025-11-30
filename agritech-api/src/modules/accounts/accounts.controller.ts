import { Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AccountsService } from './accounts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('accounts')
@UseGuards(JwtAuthGuard)
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  /**
   * Get all accounts for an organization
   * GET /api/v1/accounts?is_active=true
   */
  @Get()
  async findAll(@Req() req: any, @Query('is_active') isActive?: string) {
    const organizationId = req.headers['x-organization-id'];

    if (!organizationId) {
      throw new Error('Organization ID is required');
    }

    const isActiveBool = isActive === 'true' ? true : isActive === 'false' ? false : undefined;

    return this.accountsService.findAll(organizationId, isActiveBool);
  }

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
