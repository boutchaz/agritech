import { Controller, Get, Post, Patch, Delete, Query, Param, Body, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiHeader, ApiQuery, ApiParam, ApiBody } from '@nestjs/swagger';
import { AccountsService } from './accounts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequireModule } from '../../common/decorators/require-module.decorator';
import { OrganizationGuard } from '../../common/guards/organization.guard';
import { ModuleEntitlementGuard } from '../../common/guards/module-entitlement.guard';
import { PoliciesGuard } from '../casl/policies.guard';
import {
    CanManageAccounts,
    CanReadAccounts,
} from '../casl/permissions.decorator';
import { ApplyTemplateDto } from './dto/apply-template.dto';

@ApiTags('accounts')
@Controller('accounts')
@RequireModule('accounting')
@UseGuards(JwtAuthGuard, OrganizationGuard, ModuleEntitlementGuard, PoliciesGuard)
@ApiBearerAuth('JWT-auth')
@ApiHeader({
  name: 'X-Organization-Id',
  description: 'Organization ID for multi-tenant operations',
  required: true,
})
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Get()
  @CanReadAccounts()
  @ApiOperation({ summary: 'Get all accounts', description: 'Retrieve all accounts for the organization' })
  @ApiQuery({ name: 'is_active', required: false, type: Boolean, description: 'Filter by active status' })
  @ApiResponse({ status: 200, description: 'List of accounts returned successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(@Req() req: any, @Query('is_active') isActive?: string) {
    const organizationId = req.headers['x-organization-id'];

    if (!organizationId) {
      throw new Error('Organization ID is required');
    }

    const isActiveBool = isActive === 'true' ? true : isActive === 'false' ? false : undefined;

    return this.accountsService.findAll(organizationId, isActiveBool);
  }

  @Get(':id')
  @CanReadAccounts()
  @ApiOperation({ summary: 'Get account by ID', description: 'Retrieve a single account by its ID' })
  @ApiParam({ name: 'id', description: 'Account UUID' })
  @ApiResponse({ status: 200, description: 'Account returned successfully' })
  @ApiResponse({ status: 404, description: 'Account not found' })
  async findOne(@Req() req: any, @Param('id') id: string) {
    const organizationId = req.headers['x-organization-id'];

    if (!organizationId) {
      throw new Error('Organization ID is required');
    }

    return this.accountsService.findOne(id, organizationId);
  }

  @Post()
  @CanManageAccounts()
  @ApiOperation({ summary: 'Create account', description: 'Create a new account in the chart of accounts' })
  @ApiResponse({ status: 201, description: 'Account created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid account data' })
  @ApiResponse({ status: 409, description: 'Account code already exists' })
  async create(@Req() req: any, @Body() accountData: any) {
    const organizationId = req.headers['x-organization-id'];
    const userId = req.user.userId || req.user.sub;

    if (!organizationId) {
      throw new Error('Organization ID is required');
    }

    return this.accountsService.create(accountData, organizationId, userId);
  }

  @Patch(':id')
  @CanManageAccounts()
  @ApiOperation({ summary: 'Update account', description: 'Update an existing account' })
  @ApiParam({ name: 'id', description: 'Account UUID' })
  @ApiResponse({ status: 200, description: 'Account updated successfully' })
  @ApiResponse({ status: 404, description: 'Account not found' })
  async update(@Req() req: any, @Param('id') id: string, @Body() updates: any) {
    const organizationId = req.headers['x-organization-id'];

    if (!organizationId) {
      throw new Error('Organization ID is required');
    }

    return this.accountsService.update(id, updates, organizationId);
  }

  @Delete(':id')
  @CanManageAccounts()
  @ApiOperation({ summary: 'Delete account', description: 'Delete an account (only if no transactions)' })
  @ApiParam({ name: 'id', description: 'Account UUID' })
  @ApiResponse({ status: 200, description: 'Account deleted successfully' })
  @ApiResponse({ status: 404, description: 'Account not found' })
  @ApiResponse({ status: 409, description: 'Account has transactions and cannot be deleted' })
  async delete(@Req() req: any, @Param('id') id: string) {
    const organizationId = req.headers['x-organization-id'];

    if (!organizationId) {
      throw new Error('Organization ID is required');
    }

    await this.accountsService.delete(id, organizationId);
    return { success: true, message: 'Account deleted successfully' };
  }

  @Post('seed-moroccan-chart')
  @CanManageAccounts()
  @ApiOperation({ summary: 'Seed Moroccan chart of accounts', description: 'Initialize with Moroccan OHADA chart of accounts' })
  @ApiResponse({ status: 201, description: 'Chart of accounts seeded successfully' })
  async seedMoroccanChart(@Req() req: any) {
    const organizationId = req.headers['x-organization-id'];

    if (!organizationId) {
      throw new Error('Organization ID is required');
    }

    return this.accountsService.seedMoroccanChartOfAccounts(organizationId);
  }

  @Get('templates')
  @ApiOperation({ summary: 'Get available templates', description: 'List all available chart of accounts templates' })
  @ApiResponse({ status: 200, description: 'Templates returned successfully' })
  async getTemplates() {
    return this.accountsService.getAvailableTemplates();
  }

  @Get('templates/:countryCode')
  @ApiOperation({ summary: 'Get template by country', description: 'Get chart of accounts template for a specific country' })
  @ApiParam({ name: 'countryCode', description: 'Country code (e.g., MA, FR, SN)' })
  @ApiResponse({ status: 200, description: 'Template returned successfully' })
  @ApiResponse({ status: 404, description: 'Template not found for country' })
  async getTemplateByCountry(@Param('countryCode') countryCode: string) {
    return this.accountsService.getTemplateByCountry(countryCode);
  }

  @Post('templates/:countryCode/apply')
  @CanManageAccounts()
  @ApiOperation({ summary: 'Apply chart of accounts template', description: 'Apply a country-specific chart of accounts template to the organization' })
  @ApiParam({ name: 'countryCode', description: 'Country code (e.g., MA, FR, SN)' })
  @ApiResponse({ status: 201, description: 'Template applied successfully' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  @ApiResponse({ status: 409, description: 'Chart of accounts already exists (use overwrite option)' })
  async applyTemplate(
    @Req() req: any,
    @Param('countryCode') countryCode: string,
    @Body() applyTemplateDto: ApplyTemplateDto,
  ) {
    const organizationId = req.headers['x-organization-id'];

    if (!organizationId) {
      throw new Error('Organization ID is required');
    }

    return this.accountsService.applyTemplate(countryCode, organizationId, {
      overwrite: applyTemplateDto.overwrite,
      includeAccountMappings: applyTemplateDto.includeAccountMappings,
      includeCostCenters: applyTemplateDto.includeCostCenters,
    });
  }
}
