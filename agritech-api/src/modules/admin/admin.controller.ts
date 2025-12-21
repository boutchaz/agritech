import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InternalAdminGuard } from './guards/internal-admin.guard';
import { AdminService } from './admin.service';
import {
  ReferenceDataTable,
  ImportReferenceDataDto,
  PublishReferenceDataDto,
  SeedAccountsDto,
  ReferenceDataQueryDto,
  ReferenceDataDiffDto,
  OrgUsageQueryDto,
} from './dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, InternalAdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ============================================
  // Reference Data Endpoints
  // ============================================

  /**
   * Get reference data with optional filters
   */
  @Get('ref/:table')
  async getReferenceData(
    @Param('table') table: ReferenceDataTable,
    @Query() query: ReferenceDataQueryDto,
    @Request() req: any,
  ) {
    return this.adminService.getReferenceData(table, query, req.user.id);
  }

  /**
   * Get diff between reference data versions
   */
  @Get('ref/:table/diff')
  async getReferenceDataDiff(
    @Param('table') table: ReferenceDataTable,
    @Query() query: ReferenceDataDiffDto,
  ) {
    return this.adminService.getReferenceDataDiff(table, query);
  }

  /**
   * Import reference data (supports dry-run)
   */
  @Post('ref/import')
  async importReferenceData(
    @Body() dto: ImportReferenceDataDto,
    @Request() req: any,
  ) {
    return this.adminService.importReferenceData(dto, req.user.id);
  }

  /**
   * Publish or unpublish reference data
   */
  @Post('ref/publish')
  async publishReferenceData(
    @Body() dto: PublishReferenceDataDto,
    @Request() req: any,
  ) {
    return this.adminService.publishReferenceData(dto, req.user.id);
  }

  /**
   * Seed chart of accounts for an organization
   */
  @Post('ref/seed-accounts')
  async seedAccounts(
    @Body() dto: SeedAccountsDto,
    @Request() req: any,
  ) {
    return this.adminService.seedAccounts(dto, req.user.id);
  }

  // ============================================
  // Analytics / SaaS Metrics Endpoints
  // ============================================

  /**
   * Get overall SaaS metrics dashboard data
   */
  @Get('saas-metrics')
  async getSaasMetrics() {
    return this.adminService.getSaasMetrics();
  }

  /**
   * Get list of organizations with usage data
   */
  @Get('orgs')
  async getOrganizations(@Query() query: OrgUsageQueryDto) {
    return this.adminService.getOrgUsage(query);
  }

  /**
   * Get single organization usage details
   */
  @Get('orgs/:id/usage')
  async getOrgUsage(@Param('id') orgId: string) {
    return this.adminService.getOrgUsageById(orgId);
  }

  /**
   * Get admin job logs
   */
  @Get('jobs')
  async getJobLogs(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.adminService.getJobLogs(
      parseInt(limit || '50', 10),
      parseInt(offset || '0', 10),
    );
  }
}
