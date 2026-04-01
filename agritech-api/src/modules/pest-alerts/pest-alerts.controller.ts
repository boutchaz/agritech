import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { PestAlertsService } from './pest-alerts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationGuard } from '../../common/guards/organization.guard';
import { PoliciesGuard } from '../casl/policies.guard';
import { CheckPolicies } from '../casl/check-policies.decorator';
import { Action } from '../casl/action.enum';
import { AppAbility } from '../casl/casl-ability.factory';
import { CreatePestReportDto } from './dto/create-pest-report.dto';
import { UpdatePestReportDto } from './dto/update-pest-report.dto';
import { PestReportResponseDto, PestDiseaseLibraryDto } from './dto/pest-report-response.dto';

@ApiTags('pest-alerts')
@Controller('pest-alerts')
@UseGuards(JwtAuthGuard, OrganizationGuard)
@ApiBearerAuth()
export class PestAlertsController {
  constructor(private pestAlertsService: PestAlertsService) {}

  @Get('library')
  @ApiOperation({
    summary: 'Get pest/disease library',
    description: 'Get reference data for pests and diseases with treatment and prevention info',
  })
  @ApiResponse({
    status: 200,
    description: 'Library retrieved successfully',
    type: [PestDiseaseLibraryDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getLibrary(@Request() req): Promise<PestDiseaseLibraryDto[]> {
    const organizationId = req.headers['x-organization-id'] as string;
    return this.pestAlertsService.getLibrary(organizationId);
  }

  @Get('reports')
  @UseGuards(PoliciesGuard)
  @CheckPolicies((ability: AppAbility) => ability.can(Action.Read, 'Farm'))
  @ApiOperation({
    summary: 'Get all pest reports',
    description: 'Get all pest/disease reports for the organization',
  })
  @ApiResponse({
    status: 200,
    description: 'Reports retrieved successfully',
    type: [PestReportResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async getReports(@Request() req): Promise<PestReportResponseDto[]> {
    const organizationId = req.headers['x-organization-id'] as string;
    return this.pestAlertsService.getReports(organizationId);
  }

  @Get('reports/:id')
  @UseGuards(PoliciesGuard)
  @CheckPolicies((ability: AppAbility) => ability.can(Action.Read, 'Farm'))
  @ApiOperation({
    summary: 'Get single pest report',
    description: 'Get detailed information about a specific pest/disease report',
  })
  @ApiParam({
    name: 'id',
    description: 'Report ID',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Report retrieved successfully',
    type: PestReportResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Report not found' })
  async getReport(
    @Request() req,
    @Param('id') reportId: string,
  ): Promise<PestReportResponseDto> {
    const organizationId = req.headers['x-organization-id'] as string;
    return this.pestAlertsService.getReport(organizationId, reportId);
  }

  @Post('reports')
  @UseGuards(PoliciesGuard)
  @CheckPolicies((ability: AppAbility) => ability.can(Action.Create, 'Farm'))
  @ApiOperation({
    summary: 'Create new pest report',
    description: 'Create a new pest/disease report for a parcel',
  })
  @ApiResponse({
    status: 201,
    description: 'Report created successfully',
    type: PestReportResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request - invalid data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async createReport(
    @Request() req,
    @Body() dto: CreatePestReportDto,
  ): Promise<PestReportResponseDto> {
    const organizationId = req.headers['x-organization-id'] as string;
    return this.pestAlertsService.createReport(req.user.id, organizationId, dto);
  }

  @Patch('reports/:id')
  @UseGuards(PoliciesGuard)
  @CheckPolicies((ability: AppAbility) => ability.can(Action.Update, 'Farm'))
  @ApiOperation({
    summary: 'Update pest report status',
    description: 'Update the status and treatment information of a pest/disease report',
  })
  @ApiParam({
    name: 'id',
    description: 'Report ID',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Report updated successfully',
    type: PestReportResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request - invalid data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Report not found' })
  async updateReport(
    @Request() req,
    @Param('id') reportId: string,
    @Body() dto: UpdatePestReportDto,
  ): Promise<PestReportResponseDto> {
    const organizationId = req.headers['x-organization-id'] as string;
    return this.pestAlertsService.updateReport(req.user.id, organizationId, reportId, dto);
  }

  @Delete('reports/:id')
  @UseGuards(PoliciesGuard)
  @CheckPolicies((ability: AppAbility) => ability.can(Action.Delete, 'Farm'))
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete pest report',
    description: 'Delete a pest/disease report',
  })
  @ApiParam({
    name: 'id',
    description: 'Report ID',
    type: String,
  })
  @ApiResponse({
    status: 204,
    description: 'Report deleted successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Report not found' })
  async deleteReport(
    @Request() req,
    @Param('id') reportId: string,
  ): Promise<void> {
    const organizationId = req.headers['x-organization-id'] as string;
    return this.pestAlertsService.deleteReport(organizationId, reportId);
  }

  @Get('disease-risk/:parcelId')
  @UseGuards(PoliciesGuard)
  @CheckPolicies((ability: AppAbility) => ability.can(Action.Read, 'Farm'))
  @ApiOperation({
    summary: 'Get disease risk assessment for a parcel',
    description: 'Evaluates disease risk based on current weather conditions and crop-specific thresholds',
  })
  @ApiParam({
    name: 'parcelId',
    description: 'Parcel ID',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Disease risk assessment retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Parcel not found' })
  async getDiseaseRisk(
    @Request() req,
    @Param('parcelId') parcelId: string,
  ) {
    const organizationId = req.headers['x-organization-id'] as string;
    return this.pestAlertsService.getDiseaseRisk(parcelId, organizationId);
  }

  @Post('reports/:id/escalate')
  @UseGuards(PoliciesGuard)
  @CheckPolicies((ability: AppAbility) => ability.can(Action.Update, 'Farm'))
  @ApiOperation({
    summary: 'Escalate to performance alert',
    description: 'Escalate a pest/disease report to a performance alert',
  })
  @ApiParam({
    name: 'id',
    description: 'Report ID',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Report escalated successfully',
    schema: {
      type: 'object',
      properties: {
        alert_id: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Report not found' })
  async escalateToAlert(
    @Request() req,
    @Param('id') reportId: string,
  ): Promise<{ alert_id: string }> {
    const organizationId = req.headers['x-organization-id'] as string;
    return this.pestAlertsService.escalateToAlert(req.user.id, organizationId, reportId);
  }
}
