import {
    Controller,
    Get,
    Query,
    Param,
    UseGuards,
    Request,
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
        @Query('farmId') farmId?: string,
    ) {
        const organizationId = req.user.organizationId;
        return this.dashboardService.getDashboardSummary(organizationId, farmId);
    }

    @Get('widgets/:type')
    @CheckPolicies((ability) => ability.can(Action.Read, 'Dashboard'))
    async getWidgetData(@Request() req, @Param('type') type: string) {
        const organizationId = req.user.organizationId;
        return this.dashboardService.getWidgetData(organizationId, type);
    }
}
