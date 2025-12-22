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
} from '@nestjs/common';
import { DemoDataService } from './demo-data.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('api/v1/organizations/:organizationId/demo-data')
@UseGuards(JwtAuthGuard)
export class DemoDataController {
  constructor(private readonly demoDataService: DemoDataService) {}

  /**
   * Get data statistics for an organization
   */
  @Get('stats')
  async getDataStats(
    @Param('organizationId') organizationId: string,
    @Request() req: any,
  ) {
    // Verify user has access to this organization
    this.verifyOrganizationAccess(req.user, organizationId);

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
    // Verify user has admin access to this organization
    this.verifyAdminAccess(req.user, organizationId);

    await this.demoDataService.seedDemoData(organizationId, req.user.id);
    const stats = await this.demoDataService.getDataStats(organizationId);

    return {
      message: 'Demo data seeded successfully',
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
    // Verify user has admin access to this organization
    this.verifyAdminAccess(req.user, organizationId);

    const result = await this.demoDataService.clearDemoData(organizationId);

    return {
      message: 'All data cleared successfully',
      organizationId,
      deletedCounts: result.deletedCounts,
      totalDeleted: Object.values(result.deletedCounts).reduce((sum, count) => sum + count, 0),
    };
  }

  /**
   * Verify user has access to the organization
   */
  private verifyOrganizationAccess(user: any, organizationId: string): void {
    // Check if user belongs to this organization
    const userOrgId = user.organization_id || user.organizationId;
    if (userOrgId !== organizationId) {
      throw new ForbiddenException('You do not have access to this organization');
    }
  }

  /**
   * Verify user has admin access to the organization
   */
  private verifyAdminAccess(user: any, organizationId: string): void {
    this.verifyOrganizationAccess(user, organizationId);

    // Check if user has admin role
    const role = user.role || user.role_name;
    const adminRoles = ['system_admin', 'organization_admin'];
    if (!adminRoles.includes(role)) {
      throw new ForbiddenException('Only administrators can perform this action');
    }
  }
}
