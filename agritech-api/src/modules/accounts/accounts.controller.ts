import { Controller, Get, Post, Patch, Delete, Query, Param, Body, Req, UseGuards } from '@nestjs/common';
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
   * Get a single account by ID
   * GET /api/v1/accounts/:id
   */
  @Get(':id')
  async findOne(@Req() req: any, @Param('id') id: string) {
    const organizationId = req.headers['x-organization-id'];

    if (!organizationId) {
      throw new Error('Organization ID is required');
    }

    return this.accountsService.findOne(id, organizationId);
  }

  /**
   * Create a new account
   * POST /api/v1/accounts
   */
  @Post()
  async create(@Req() req: any, @Body() accountData: any) {
    const organizationId = req.headers['x-organization-id'];
    const userId = req.user.userId || req.user.sub;

    if (!organizationId) {
      throw new Error('Organization ID is required');
    }

    return this.accountsService.create(accountData, organizationId, userId);
  }

  /**
   * Update an existing account
   * PATCH /api/v1/accounts/:id
   */
  @Patch(':id')
  async update(@Req() req: any, @Param('id') id: string, @Body() updates: any) {
    const organizationId = req.headers['x-organization-id'];

    if (!organizationId) {
      throw new Error('Organization ID is required');
    }

    return this.accountsService.update(id, updates, organizationId);
  }

  /**
   * Delete an account
   * DELETE /api/v1/accounts/:id
   */
  @Delete(':id')
  async delete(@Req() req: any, @Param('id') id: string) {
    const organizationId = req.headers['x-organization-id'];

    if (!organizationId) {
      throw new Error('Organization ID is required');
    }

    await this.accountsService.delete(id, organizationId);
    return { success: true, message: 'Account deleted successfully' };
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
