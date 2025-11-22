import {
    Controller,
    Get,
    Query,
    Param,
    UseGuards,
    Request,
    BadRequestException,
} from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PoliciesGuard } from '../casl/policies.guard';
import { CheckPolicies } from '../casl/check-policies.decorator';
import { Action } from '../casl/action.enum';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, PoliciesGuard)
export class DashboardController {
    constructor(private readonly dashboardService: DashboardService) { }

    @Get('summary')
    @CheckPolicies((ability) => ability.can(Action.Read, 'Dashboard'))
    async getDashboardSummary(
        @Request() req,
        @Query('organization_id') organizationId: string,
        @Query('farmId') farmId?: string,
    ) {
        // Fallback to request.organizationId if not in query (set by OrganizationGuard)
        const orgId = organizationId || req.organizationId || req.user?.organizationId;
        if (!orgId) {
            throw new BadRequestException('Organization ID is required');
        }
        return this.dashboardService.getDashboardSummary(orgId, farmId);
    }

    @Get('widgets/:type')
    @CheckPolicies((ability) => ability.can(Action.Read, 'Dashboard'))
    async getWidgetData(
        @Request() req,
        @Param('type') type: string,
        @Query('organization_id') organizationId: string,
    ) {
        // Fallback to request.organizationId if not in query (set by OrganizationGuard)
        const orgId = organizationId || req.organizationId || req.user?.organizationId;
        if (!orgId) {
            throw new BadRequestException('Organization ID is required');
        }
        return this.dashboardService.getWidgetData(orgId, type);
    }
}
