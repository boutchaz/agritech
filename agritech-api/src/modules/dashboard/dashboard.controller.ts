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
import { PoliciesGuard } from '../casl/policies.guard';
import { CheckPolicies } from '../casl/check-policies.decorator';
import { Action } from '../casl/action.enum';

@ApiTags('dashboard')
@ApiBearerAuth('JWT-auth')
@Controller('dashboard')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class DashboardController {
    constructor(private readonly dashboardService: DashboardService) { }

    @Get('summary')
    @ApiOperation({ summary: 'Get dashboard summary statistics' })
    @ApiResponse({ status: 200, description: 'Dashboard summary data' })
    @CheckPolicies((ability) => ability.can(Action.Read, 'Dashboard'))
    async getDashboardSummary(
        @Request() req,
    ) {
        const orgId = req.headers['x-organization-id'] as string;
        if (!orgId) {
            throw new BadRequestException('Organization ID is required');
        }
        return this.dashboardService.getDashboardSummary(orgId);
    }

    @Get('live/metrics')
    @ApiOperation({ summary: 'Get live dashboard metrics including concurrent users, active operations, and farm activities' })
    @ApiResponse({ status: 200, description: 'Live dashboard metrics data' })
    @CheckPolicies((ability) => ability.can(Action.Read, 'Dashboard'))
    async getLiveMetrics(
        @Request() req,
    ) {
        const orgId = req.headers['x-organization-id'] as string;
        if (!orgId) {
            throw new BadRequestException('Organization ID is required');
        }
        return this.dashboardService.getLiveMetrics(orgId);
    }

    @Get('live/summary')
    @ApiOperation({ summary: 'Get live dashboard summary stats for quick overview' })
    @ApiResponse({ status: 200, description: 'Live dashboard summary data' })
    @CheckPolicies((ability) => ability.can(Action.Read, 'Dashboard'))
    async getLiveSummary(
        @Request() req,
    ) {
        const orgId = req.headers['x-organization-id'] as string;
        if (!orgId) {
            throw new BadRequestException('Organization ID is required');
        }
        return this.dashboardService.getLiveSummary(orgId);
    }

    @Get('live/heatmap')
    @ApiOperation({ summary: 'Get activity heatmap data for geographic visualization' })
    @ApiResponse({ status: 200, description: 'Activity heatmap data points' })
    @CheckPolicies((ability) => ability.can(Action.Read, 'Dashboard'))
    async getActivityHeatmap(
        @Request() req,
    ) {
        const orgId = req.headers['x-organization-id'] as string;
        if (!orgId) {
            throw new BadRequestException('Organization ID is required');
        }
        return this.dashboardService.getActivityHeatmap(orgId);
    }

    @Get('widgets/:type')
    @CheckPolicies((ability) => ability.can(Action.Read, 'Dashboard'))
    async getWidgetData(
        @Request() req,
        @Param('type') type: string,
    ) {
        const orgId = req.headers['x-organization-id'] as string;
        if (!orgId) {
            throw new BadRequestException('Organization ID is required');
        }
        return this.dashboardService.getWidgetData(orgId, type);
    }

    @Get('settings')
    @CheckPolicies((ability) => ability.can(Action.Read, 'Dashboard'))
    async getDashboardSettings(
        @Request() req,
    ) {
        const userId = req.user?.sub || req.user?.userId;
        const orgId = req.headers['x-organization-id'] as string;

        if (!userId || !orgId) {
            throw new BadRequestException('User ID and Organization ID are required');
        }

        return this.dashboardService.getDashboardSettings(userId, orgId);
    }

    @Put('settings')
    @CheckPolicies((ability) => ability.can(Action.Update, 'Dashboard'))
    async upsertDashboardSettings(
        @Request() req,
        @Body() settings: any,
    ) {
        const userId = req.user?.sub || req.user?.userId;
        const orgId = req.headers['x-organization-id'] as string;

        if (!userId || !orgId) {
            throw new BadRequestException('User ID and Organization ID are required');
        }

        return this.dashboardService.upsertDashboardSettings(userId, orgId, settings);
    }
}
