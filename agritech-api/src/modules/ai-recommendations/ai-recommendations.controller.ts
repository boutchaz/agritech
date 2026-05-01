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
import { RequireModule } from '../../common/decorators/require-module.decorator';
import { ModuleEntitlementGuard } from '../../common/guards/module-entitlement.guard';
import { OrganizationGuard } from '../../common/guards/organization.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CreateRecommendationDto,
  ExecuteRecommendationDto,
} from './dto/create-recommendation.dto';
import {
  AiRecommendationEvaluation,
  AiRecommendationRecord,
  AiRecommendationsService,
} from './ai-recommendations.service';

@ApiTags('ai-recommendations')
@ApiBearerAuth()
@Controller()
@RequireModule('agromind_advisor')
@UseGuards(JwtAuthGuard, OrganizationGuard, ModuleEntitlementGuard)
export class AiRecommendationsController {
  constructor(
    private readonly aiRecommendationsService: AiRecommendationsService,
  ) {}

  @Get('parcels/:parcelId/ai/recommendations')
  @ApiOperation({ summary: 'Get all AI recommendations for a parcel' })
  @ApiResponse({
    status: 200,
    description: 'AI recommendations retrieved successfully',
  })
  async getRecommendations(
    @Param('parcelId') parcelId: string,
    @Req() req: Request,
  ): Promise<AiRecommendationRecord[]> {
    const organizationId = this.getOrganizationId(req);

    return this.aiRecommendationsService.getRecommendations(
      parcelId,
      organizationId,
    );
  }

  @Get('ai/recommendations/:id')
  @ApiOperation({ summary: 'Get a single AI recommendation' })
  @ApiResponse({
    status: 200,
    description: 'AI recommendation retrieved successfully',
  })
  async getRecommendation(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<AiRecommendationRecord> {
    const organizationId = this.getOrganizationId(req);

    return this.aiRecommendationsService.getRecommendation(
      id,
      organizationId,
    );
  }

  @Post('ai/recommendations')
  @ApiOperation({ summary: 'Create an AI recommendation' })
  @ApiResponse({ status: 201, description: 'AI recommendation created successfully' })
  async createRecommendation(
    @Body() body: CreateRecommendationDto,
    @Req() req: Request,
  ): Promise<AiRecommendationRecord> {
    const organizationId = this.getOrganizationId(req);

    return this.aiRecommendationsService.createRecommendation(
      body,
      organizationId,
    );
  }

  @Patch('ai/recommendations/:id/validate')
  @ApiOperation({ summary: 'Validate an AI recommendation' })
  @ApiResponse({
    status: 200,
    description: 'AI recommendation validated successfully',
  })
  async validateRecommendation(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<AiRecommendationRecord> {
    const organizationId = this.getOrganizationId(req);

    return this.aiRecommendationsService.validateRecommendation(
      id,
      organizationId,
    );
  }

  @Patch('ai/recommendations/:id/reject')
  @ApiOperation({ summary: 'Reject an AI recommendation' })
  @ApiResponse({
    status: 200,
    description: 'AI recommendation rejected successfully',
  })
  async rejectRecommendation(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<AiRecommendationRecord> {
    const organizationId = this.getOrganizationId(req);

    return this.aiRecommendationsService.rejectRecommendation(
      id,
      organizationId,
    );
  }

  @Patch('ai/recommendations/:id/execute')
  @ApiOperation({ summary: 'Execute an AI recommendation' })
  @ApiResponse({
    status: 200,
    description: 'AI recommendation executed successfully',
  })
  async executeRecommendation(
    @Param('id') id: string,
    @Body() body: ExecuteRecommendationDto,
    @Req() req: Request,
  ): Promise<AiRecommendationRecord> {
    const organizationId = this.getOrganizationId(req);

    return this.aiRecommendationsService.executeRecommendation(
      id,
      organizationId,
      body?.notes,
    );
  }

  @Get('ai/recommendations/:id/evaluation')
  @ApiOperation({ summary: 'Get evaluation data for an executed AI recommendation' })
  @ApiResponse({
    status: 200,
    description: 'AI recommendation evaluation retrieved successfully',
  })
  async getEvaluation(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<AiRecommendationEvaluation> {
    const organizationId = this.getOrganizationId(req);

    return this.aiRecommendationsService.getEvaluation(id, organizationId);
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
}
