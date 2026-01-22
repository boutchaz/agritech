import {
    Controller,
    Get,
    Put,
    Body,
    Param,
    UseGuards,
    Request,
    BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('dashboard')
@ApiBearerAuth('JWT-auth')
@Controller('dashboard')
// PoliciesGuard removed - dashboard endpoints validate org membership in service layer
// This allows the dashboard flow to work before full CASL permissions are established
@UseGuards(JwtAuthGuard)
export class DashboardController {
    constructor(private readonly dashboardService: DashboardService) { }

    @Get('summary')
    @ApiOperation({ summary: 'Get dashboard summary statistics' })
    @ApiResponse({ status: 200, description: 'Dashboard summary data' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden - User not in organization' })
    async getDashboardSummary(
        @Request() req,
    ) {
        const orgId = req.headers['x-organization-id'] as string;
        if (!orgId) {
            throw new BadRequestException('Organization ID is required');
        }
        return this.dashboardService.getDashboardSummary(req.user.id, orgId);
    }

    @Get('live/metrics')
    @ApiOperation({ summary: 'Get live dashboard metrics including concurrent users, active operations, and farm activities' })
    @ApiResponse({ status: 200, description: 'Live dashboard metrics data' })
    @ApiResponse({ status: 403, description: 'Forbidden - User not in organization' })
    async getLiveMetrics(
        @Request() req,
    ) {
        const orgId = req.headers['x-organization-id'] as string;
        if (!orgId) {
            throw new BadRequestException('Organization ID is required');
        }
        return this.dashboardService.getLiveMetrics(req.user.id, orgId);
    }

    @Get('live/summary')
    @ApiOperation({ summary: 'Get live dashboard summary stats for quick overview' })
    @ApiResponse({ status: 200, description: 'Live dashboard summary data' })
    @ApiResponse({ status: 403, description: 'Forbidden - User not in organization' })
    async getLiveSummary(
        @Request() req,
    ) {
        const orgId = req.headers['x-organization-id'] as string;
        if (!orgId) {
            throw new BadRequestException('Organization ID is required');
        }
        return this.dashboardService.getLiveSummary(req.user.id, orgId);
    }

    @Get('live/heatmap')
    @ApiOperation({ summary: 'Get activity heatmap data for geographic visualization' })
    @ApiResponse({ status: 200, description: 'Activity heatmap data points' })
    @ApiResponse({ status: 403, description: 'Forbidden - User not in organization' })
    async getActivityHeatmap(
        @Request() req,
    ) {
        const orgId = req.headers['x-organization-id'] as string;
        if (!orgId) {
            throw new BadRequestException('Organization ID is required');
        }
        return this.dashboardService.getActivityHeatmap(req.user.id, orgId);
    }

    @Get('widgets/:type')
    @ApiResponse({ status: 200, description: 'Widget data retrieved successfully' })
    @ApiResponse({ status: 403, description: 'Forbidden - User not in organization' })
    async getWidgetData(
        @Request() req,
        @Param('type') type: string,
    ) {
        const orgId = req.headers['x-organization-id'] as string;
        if (!orgId) {
            throw new BadRequestException('Organization ID is required');
        }
        return this.dashboardService.getWidgetData(req.user.id, orgId, type);
    }

    @Get('settings')
    @ApiResponse({ status: 200, description: 'Dashboard settings retrieved successfully' })
    @ApiResponse({ status: 403, description: 'Forbidden - User not in organization' })
    async getDashboardSettings(
        @Request() req,
    ) {
        const userId = req.user?.sub || req.user?.userId;
        const orgId = req.headers['x-organization-id'] as string;

        if (!userId || !orgId) {
            throw new BadRequestException('User ID and Organization ID are required');
        }

        return this.dashboardService.getDashboardSettings(req.user.id, orgId, userId);
    }

    @Put('settings')
    @ApiResponse({ status: 200, description: 'Dashboard settings updated successfully' })
    @ApiResponse({ status: 403, description: 'Forbidden - User not in organization' })
    async upsertDashboardSettings(
        @Request() req,
        @Body() settings: any,
    ) {
        const userId = req.user?.sub || req.user?.userId;
        const orgId = req.headers['x-organization-id'] as string;

        if (!userId || !orgId) {
            throw new BadRequestException('User ID and Organization ID are required');
        }

        return this.dashboardService.upsertDashboardSettings(req.user.id, orgId, userId, settings);
    }
}
