import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { OrganizationGuard } from '../../common/guards/organization.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  AnnualPlanCalendarResponse,
  AnnualPlanResponse,
  AnnualPlanService,
  AnnualPlanSummaryResponse,
  PlanInterventionResponse,
  PlanInterventionsResponse,
} from './annual-plan.service';

@ApiTags('annual-plan')
@ApiBearerAuth()
@Controller()
@UseGuards(JwtAuthGuard, OrganizationGuard)
export class AnnualPlanController {
  constructor(private readonly annualPlanService: AnnualPlanService) {}

  @Get('parcels/:parcelId/ai/plan')
  @ApiOperation({ summary: 'Get the current annual plan for a parcel' })
  @ApiResponse({ status: 200, description: 'Annual plan retrieved successfully' })
  async getPlan(
    @Param('parcelId') parcelId: string,
    @Req() req: Request,
  ): Promise<AnnualPlanResponse> {
    const organizationId = this.getOrganizationId(req);

    return {
      data: await this.annualPlanService.getPlan(parcelId, organizationId),
    };
  }

  @Get('parcels/:parcelId/ai/plan/calendar')
  @ApiOperation({ summary: 'Get the current annual plan calendar for a parcel' })
  @ApiResponse({
    status: 200,
    description: 'Annual plan calendar retrieved successfully',
  })
  async getCalendar(
    @Param('parcelId') parcelId: string,
    @Req() req: Request,
  ): Promise<AnnualPlanCalendarResponse> {
    const organizationId = this.getOrganizationId(req);

    return {
      data: await this.annualPlanService.getCalendar(parcelId, organizationId),
    };
  }

  @Get('parcels/:parcelId/ai/plan/summary')
  @ApiOperation({ summary: 'Get annual plan summary statistics for a parcel' })
  @ApiResponse({
    status: 200,
    description: 'Annual plan summary retrieved successfully',
  })
  async getSummary(
    @Param('parcelId') parcelId: string,
    @Req() req: Request,
  ): Promise<AnnualPlanSummaryResponse> {
    const organizationId = this.getOrganizationId(req);

    return {
      data: await this.annualPlanService.getSummary(parcelId, organizationId),
    };
  }

  @Post('parcels/:parcelId/ai/plan/validate')
  @ApiOperation({ summary: 'Validate the current annual plan for a parcel' })
  @ApiResponse({ status: 200, description: 'Annual plan validated successfully' })
  async validatePlan(
    @Param('parcelId') parcelId: string,
    @Req() req: Request,
  ): Promise<AnnualPlanResponse> {
    const organizationId = this.getOrganizationId(req);
    const plan = await this.annualPlanService.getPlan(parcelId, organizationId);
    const validatedPlan = await this.annualPlanService.validatePlan(
      plan.id,
      organizationId,
    );

    return {
      data: {
        ...validatedPlan,
        interventions: plan.interventions,
      },
    };
  }

  @Get('parcels/:parcelId/ai/plan/interventions')
  @ApiOperation({ summary: 'Get current annual plan interventions for a parcel' })
  @ApiResponse({
    status: 200,
    description: 'Annual plan interventions retrieved successfully',
  })
  async getInterventions(
    @Param('parcelId') parcelId: string,
    @Req() req: Request,
  ): Promise<PlanInterventionsResponse> {
    const organizationId = this.getOrganizationId(req);

    return {
      data: await this.annualPlanService.getInterventions(parcelId, organizationId),
    };
  }

  @Patch('ai/plan/interventions/:id/execute')
  @ApiOperation({ summary: 'Mark a plan intervention as executed' })
  @ApiResponse({
    status: 200,
    description: 'Plan intervention executed successfully',
  })
  async executeIntervention(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<PlanInterventionResponse> {
    const organizationId = this.getOrganizationId(req);

    return {
      data: await this.annualPlanService.executeIntervention(id, organizationId),
    };
  }

  @Post('parcels/:parcelId/ai/plan/regenerate')
  @ApiOperation({ summary: 'Regenerate the annual plan for a parcel' })
  @ApiResponse({ status: 200, description: 'Annual plan regenerated successfully' })
  async regeneratePlan(
    @Param('parcelId') parcelId: string,
    @Body() body: { year?: number } | undefined,
    @Req() req: Request,
  ): Promise<AnnualPlanResponse> {
    const organizationId = this.getOrganizationId(req);

    return {
      data: await this.annualPlanService.regeneratePlan(
        parcelId,
        organizationId,
        this.resolveYear(body?.year),
      ),
    };
  }

  private getOrganizationId(req: Request): string {
    const headerValue = req.headers['x-organization-id'];
    const organizationId = Array.isArray(headerValue)
      ? headerValue[0]
      : headerValue;

    if (!organizationId) {
      throw new BadRequestException('Organization ID is required');
    }

    return organizationId;
  }

  private resolveYear(year?: number): number {
    if (year === undefined) {
      return new Date().getUTCFullYear();
    }

    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      throw new BadRequestException('A valid year is required');
    }

    return year;
  }
}
