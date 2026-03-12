import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
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
  AnnualPlanCalendar,
  AnnualPlanService,
  AnnualPlanSummary,
  AnnualPlanWithInterventions,
  PlanInterventionRecord,
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
  ): Promise<AnnualPlanWithInterventions | null> {
    const organizationId = this.getOrganizationId(req);

    return this.annualPlanService.getPlanOrNull(parcelId, organizationId);
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
  ): Promise<AnnualPlanCalendar> {
    const organizationId = this.getOrganizationId(req);

    return this.annualPlanService.getCalendar(parcelId, organizationId);
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
  ): Promise<AnnualPlanSummary> {
    const organizationId = this.getOrganizationId(req);

    return this.annualPlanService.getSummary(parcelId, organizationId);
  }

  @Post('parcels/:parcelId/ai/plan/validate')
  @ApiOperation({ summary: 'Validate the current annual plan for a parcel' })
  @ApiResponse({ status: 200, description: 'Annual plan validated successfully' })
  async validatePlan(
    @Param('parcelId') parcelId: string,
    @Req() req: Request,
  ): Promise<AnnualPlanWithInterventions> {
    const organizationId = this.getOrganizationId(req);
    const plan = await this.annualPlanService.getPlan(parcelId, organizationId);

    if (!plan) {
      throw new NotFoundException('Annual plan not found for parcel');
    }

    const validatedPlan = await this.annualPlanService.validatePlan(
      plan.id,
      organizationId,
    );

    return {
      ...validatedPlan,
      interventions: plan.interventions,
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
  ): Promise<PlanInterventionRecord[]> {
    const organizationId = this.getOrganizationId(req);

    return this.annualPlanService.getInterventions(parcelId, organizationId);
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
  ): Promise<PlanInterventionRecord> {
    const organizationId = this.getOrganizationId(req);

    return this.annualPlanService.executeIntervention(id, organizationId);
  }

  @Post('parcels/:parcelId/ai/plan/regenerate')
  @ApiOperation({ summary: 'Regenerate the annual plan for a parcel' })
  @ApiResponse({ status: 200, description: 'Annual plan regenerated successfully' })
  async regeneratePlan(
    @Param('parcelId') parcelId: string,
    @Body() body: { year?: number } | undefined,
    @Req() req: Request,
  ): Promise<AnnualPlanWithInterventions> {
    const organizationId = this.getOrganizationId(req);

    return this.annualPlanService.regeneratePlan(
      parcelId,
      organizationId,
      this.resolveYear(body?.year),
    );
  }

  private getOrganizationId(req: Request): string {
    const requestOrganizationId = (req as Request & { organizationId?: unknown }).organizationId;
    const headerValue = req.headers['x-organization-id'];
    const headerOrganizationId = Array.isArray(headerValue)
      ? headerValue[0]
      : headerValue;

    const organizationId =
      typeof requestOrganizationId === 'string' && requestOrganizationId.trim().length > 0
        ? requestOrganizationId
        : typeof headerOrganizationId === 'string'
          ? headerOrganizationId
          : undefined;

    const normalizedOrganizationId = organizationId?.trim();

    if (
      !normalizedOrganizationId ||
      normalizedOrganizationId === 'undefined' ||
      normalizedOrganizationId === 'null'
    ) {
      throw new BadRequestException('Organization ID is required');
    }

    return normalizedOrganizationId;
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
