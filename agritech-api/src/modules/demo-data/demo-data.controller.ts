import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  ForbiddenException,
  Body,
  Res,
  Header,
} from '@nestjs/common';
import { Response } from 'express';
import { DemoDataService } from './demo-data.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationGuard } from '../../common/guards/organization.guard';
import { DatabaseService } from '../database/database.service';

@Controller('organizations/:organizationId/demo-data')
@UseGuards(JwtAuthGuard, OrganizationGuard)
export class DemoDataController {
  constructor(
    private readonly demoDataService: DemoDataService,
    private readonly databaseService: DatabaseService,
  ) {}

  /**
   * Get data statistics for an organization
   */
  @Get('stats')
  async getDataStats(
    @Param('organizationId') organizationId: string,
  ) {
    const stats = await this.demoDataService.getDataStats(organizationId);
    return {
      organizationId,
      stats,
      total: Object.values(stats).reduce((sum, count) => sum + count, 0),
    };
  }

  /**
   * Seed demo data for an organization
   */
  @Post('seed')
  @HttpCode(HttpStatus.CREATED)
  async seedDemoData(
    @Param('organizationId') organizationId: string,
    @Request() req: any,
  ) {
    // Verify user has admin access
    await this.verifyAdminAccess(req.user.id, organizationId);

    await this.demoDataService.seedDemoData(organizationId, req.user.id);
    const stats = await this.demoDataService.getDataStats(organizationId);

    return {
      message: 'Demo data seeded successfully',
      organizationId,
      stats,
    };
  }

  @Post('seed-siam')
  @HttpCode(HttpStatus.CREATED)
  async seedSiamDemoData(
    @Param('organizationId') organizationId: string,
    @Request() req: any,
  ) {
    await this.verifyAdminAccess(req.user.id, organizationId);
    await this.demoDataService.seedSiamDemoData(organizationId, req.user.id);
    const stats = await this.demoDataService.getDataStats(organizationId);

    return {
      message: 'SIAM demo data seeded successfully',
      organizationId,
      stats,
    };
  }

  /**
   * Clear all data for an organization
   */
  @Delete('clear')
  @HttpCode(HttpStatus.OK)
  async clearData(
    @Param('organizationId') organizationId: string,
    @Request() req: any,
  ) {
    // Verify user has admin access
    await this.verifyAdminAccess(req.user.id, organizationId);

    const result = await this.demoDataService.clearDemoData(organizationId);

    return {
      message: 'All data cleared successfully',
      organizationId,
      deletedCounts: result.deletedCounts,
      totalDeleted: Object.values(result.deletedCounts).reduce((sum, count) => sum + count, 0),
    };
  }

  @Delete('clear-demo-only')
  @HttpCode(HttpStatus.OK)
  async clearDemoDataOnly(
    @Param('organizationId') organizationId: string,
    @Request() req: any,
  ) {
    await this.verifyAdminAccess(req.user.id, organizationId);

    const result = await this.demoDataService.clearDemoDataOnly(organizationId);

    return {
      message: 'Demo data cleared successfully',
      organizationId,
      deletedCounts: result.deletedCounts,
      totalDeleted: Object.values(result.deletedCounts).reduce((sum, count) => sum + count, 0),
    };
  }

  /**
   * Export all organization data as JSON
   */
  @Get('export')
  @Header('Content-Type', 'application/json')
  async exportData(
    @Param('organizationId') organizationId: string,
    @Request() req: any,
    @Res() res: Response,
  ) {
    // Verify user has admin access
    await this.verifyAdminAccess(req.user.id, organizationId);

    const exportData = await this.demoDataService.exportOrganizationData(organizationId);

    const filename = `agritech-export-${organizationId}-${new Date().toISOString().split('T')[0]}.json`;

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.json(exportData);
  }

  /**
   * Import organization data from JSON
   */
  @Post('import')
  @HttpCode(HttpStatus.OK)
  async importData(
    @Param('organizationId') organizationId: string,
    @Request() req: any,
    @Body() importData: any,
  ) {
    // Verify user has admin access
    await this.verifyAdminAccess(req.user.id, organizationId);

    const result = await this.demoDataService.importOrganizationData(
      organizationId,
      req.user.id,
      importData,
    );

    return {
      message: 'Data imported successfully',
      organizationId,
      importedCounts: result.importedCounts,
      totalImported: Object.values(result.importedCounts).reduce((sum: number, count: number) => sum + count, 0),
    };
  }

  /**
   * Verify user has admin access to the organization
   */
  private async verifyAdminAccess(userId: string, organizationId: string): Promise<void> {
    const client = this.databaseService.getAdminClient();

    const { data, error } = await client
      .from('organization_users')
      .select('role_id, roles(name, level)')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      throw new ForbiddenException('You do not have access to this organization');
    }

    const roleName = (data.roles as any)?.name;
    const adminRoles = ['system_admin', 'organization_admin'];

    if (!adminRoles.includes(roleName)) {
      throw new ForbiddenException('Only administrators can perform this action');
    }
  }
}
