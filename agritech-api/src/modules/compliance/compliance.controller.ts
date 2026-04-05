import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { Response } from 'express';
import { ComplianceService } from './compliance.service';
import { ComplianceReportsService } from './compliance-reports.service';
import { CorrectiveActionsService } from './corrective-actions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationGuard } from '../../common/guards/organization.guard';
import { PoliciesGuard } from '../casl/policies.guard';
import { CheckPolicies } from '../casl/check-policies.decorator';
import { Action } from '../casl/action.enum';
import { AppAbility } from '../casl/casl-ability.factory';
import { CreateCertificationDto } from './dto/create-certification.dto';
import { UpdateCertificationDto } from './dto/update-certification.dto';
import { CreateComplianceCheckDto } from './dto/create-compliance-check.dto';
import { UpdateComplianceCheckDto } from './dto/update-compliance-check.dto';
import { CreateEvidenceDto } from './dto/create-evidence.dto';

@ApiTags('compliance')
@Controller('compliance')
@UseGuards(JwtAuthGuard, OrganizationGuard)
@ApiBearerAuth()
export class ComplianceController {
  constructor(
    private complianceService: ComplianceService,
    private complianceReportsService: ComplianceReportsService,
    private correctiveActionsService: CorrectiveActionsService,
  ) {}

  // ============================================================================
  // CERTIFICATION ENDPOINTS
  // ============================================================================

  @Get('certifications')
  @UseGuards(PoliciesGuard)
  @CheckPolicies((ability: AppAbility) => ability.can(Action.Read, 'Farm'))
  @ApiOperation({
    summary: 'Get all certifications',
    description: 'Get all certifications for the organization',
  })
  @ApiResponse({
    status: 200,
    description: 'Certifications retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async getAllCertifications(@Request() req) {
    const organizationId = req.headers['x-organization-id'] as string;
    return this.complianceService.findAllCertifications(organizationId);
  }

  @Get('certifications/:id')
  @UseGuards(PoliciesGuard)
  @CheckPolicies((ability: AppAbility) => ability.can(Action.Read, 'Farm'))
  @ApiOperation({
    summary: 'Get single certification',
    description: 'Get detailed information about a specific certification',
  })
  @ApiParam({
    name: 'id',
    description: 'Certification ID',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Certification retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Certification not found' })
  async getCertification(@Request() req, @Param('id') certificationId: string) {
    const organizationId = req.headers['x-organization-id'] as string;
    return this.complianceService.findOneCertification(
      organizationId,
      certificationId,
    );
  }

  @Post('certifications')
  @UseGuards(PoliciesGuard)
  @CheckPolicies((ability: AppAbility) => ability.can(Action.Create, 'Farm'))
  @ApiOperation({
    summary: 'Create new certification',
    description: 'Create a new certification for the organization',
  })
  @ApiResponse({
    status: 201,
    description: 'Certification created successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request - invalid data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async createCertification(
    @Request() req,
    @Body() dto: CreateCertificationDto,
  ) {
    const organizationId = req.headers['x-organization-id'] as string;
    return this.complianceService.createCertification(organizationId, dto);
  }

  @Patch('certifications/:id')
  @UseGuards(PoliciesGuard)
  @CheckPolicies((ability: AppAbility) => ability.can(Action.Update, 'Farm'))
  @ApiOperation({
    summary: 'Update certification',
    description: 'Update certification information',
  })
  @ApiParam({
    name: 'id',
    description: 'Certification ID',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Certification updated successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request - invalid data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Certification not found' })
  async updateCertification(
    @Request() req,
    @Param('id') certificationId: string,
    @Body() dto: UpdateCertificationDto,
  ) {
    const organizationId = req.headers['x-organization-id'] as string;
    return this.complianceService.updateCertification(
      organizationId,
      certificationId,
      dto,
    );
  }

  @Delete('certifications/:id')
  @UseGuards(PoliciesGuard)
  @CheckPolicies((ability: AppAbility) => ability.can(Action.Delete, 'Farm'))
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete certification',
    description: 'Delete a certification',
  })
  @ApiParam({
    name: 'id',
    description: 'Certification ID',
    type: String,
  })
  @ApiResponse({
    status: 204,
    description: 'Certification deleted successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Certification not found' })
  async deleteCertification(
    @Request() req,
    @Param('id') certificationId: string,
  ): Promise<void> {
    const organizationId = req.headers['x-organization-id'] as string;
    return this.complianceService.removeCertification(
      organizationId,
      certificationId,
    );
  }

  // ============================================================================
  // COMPLIANCE CHECK ENDPOINTS
  // ============================================================================

  @Get('checks')
  @UseGuards(PoliciesGuard)
  @CheckPolicies((ability: AppAbility) => ability.can(Action.Read, 'Farm'))
  @ApiOperation({
    summary: 'Get all compliance checks',
    description: 'Get all compliance checks for the organization',
  })
  @ApiResponse({
    status: 200,
    description: 'Compliance checks retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async getAllChecks(@Request() req) {
    const organizationId = req.headers['x-organization-id'] as string;
    return this.complianceService.findAllChecks(organizationId);
  }

  @Get('checks/:id')
  @UseGuards(PoliciesGuard)
  @CheckPolicies((ability: AppAbility) => ability.can(Action.Read, 'Farm'))
  @ApiOperation({
    summary: 'Get single compliance check',
    description:
      'Get detailed information about a specific compliance check including evidence',
  })
  @ApiParam({
    name: 'id',
    description: 'Compliance check ID',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Compliance check retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Compliance check not found' })
  async getCheck(@Request() req, @Param('id') checkId: string) {
    const organizationId = req.headers['x-organization-id'] as string;
    return this.complianceService.findOneCheck(organizationId, checkId);
  }

  @Post('checks')
  @UseGuards(PoliciesGuard)
  @CheckPolicies((ability: AppAbility) => ability.can(Action.Create, 'Farm'))
  @ApiOperation({
    summary: 'Create new compliance check',
    description: 'Create a new compliance check for a certification',
  })
  @ApiResponse({
    status: 201,
    description: 'Compliance check created successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request - invalid data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async createCheck(@Request() req, @Body() dto: CreateComplianceCheckDto) {
    const organizationId = req.headers['x-organization-id'] as string;
    return this.complianceService.createCheck(organizationId, dto);
  }

  @Patch('checks/:id')
  @UseGuards(PoliciesGuard)
  @CheckPolicies((ability: AppAbility) => ability.can(Action.Update, 'Farm'))
  @ApiOperation({
    summary: 'Update compliance check',
    description: 'Update compliance check information',
  })
  @ApiParam({
    name: 'id',
    description: 'Compliance check ID',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Compliance check updated successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request - invalid data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Compliance check not found' })
  async updateCheck(
    @Request() req,
    @Param('id') checkId: string,
    @Body() dto: UpdateComplianceCheckDto,
  ) {
    const organizationId = req.headers['x-organization-id'] as string;
    return this.complianceService.updateCheck(organizationId, checkId, dto);
  }

  @Delete('checks/:id')
  @UseGuards(PoliciesGuard)
  @CheckPolicies((ability: AppAbility) => ability.can(Action.Delete, 'Farm'))
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete compliance check',
    description: 'Delete a compliance check',
  })
  @ApiParam({
    name: 'id',
    description: 'Compliance check ID',
    type: String,
  })
  @ApiResponse({
    status: 204,
    description: 'Compliance check deleted successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Compliance check not found' })
  async deleteCheck(
    @Request() req,
    @Param('id') checkId: string,
  ): Promise<void> {
    const organizationId = req.headers['x-organization-id'] as string;
    return this.complianceService.removeCheck(organizationId, checkId);
  }

  // ============================================================================
  // REQUIREMENTS ENDPOINTS
  // ============================================================================

  @Get('requirements')
  @ApiOperation({
    summary: 'Get compliance requirements',
    description:
      'Get compliance requirements, optionally filtered by certification type',
  })
  @ApiQuery({
    name: 'certification_type',
    required: false,
    description: 'Filter by certification type (e.g., GlobalGAP, HACCP)',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Requirements retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getRequirements(@Query('certification_type') certificationType?: string) {
    return this.complianceService.findRequirements(certificationType);
  }

  // ============================================================================
  // EVIDENCE ENDPOINTS
  // ============================================================================

  @Post('evidence')
  @UseGuards(PoliciesGuard)
  @CheckPolicies((ability: AppAbility) => ability.can(Action.Create, 'Farm'))
  @ApiOperation({
    summary: 'Upload compliance evidence',
    description: 'Upload evidence for a compliance check',
  })
  @ApiResponse({
    status: 201,
    description: 'Evidence uploaded successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request - invalid data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async createEvidence(@Request() req, @Body() dto: CreateEvidenceDto) {
    const organizationId = req.headers['x-organization-id'] as string;
    dto.uploaded_by = req.user.id;
    return this.complianceService.createEvidence(organizationId, dto);
  }

  // ============================================================================
  // DASHBOARD ENDPOINTS
  // ============================================================================

  @Get('dashboard')
  @UseGuards(PoliciesGuard)
  @CheckPolicies((ability: AppAbility) => ability.can(Action.Read, 'Farm'))
  @ApiOperation({
    summary: 'Get compliance dashboard statistics',
    description:
      'Get compliance dashboard with certification and check statistics',
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        certifications: {
          type: 'object',
          properties: {
            total: { type: 'number' },
            active: { type: 'number' },
            expiring_soon: { type: 'number' },
          },
        },
        checks: {
          type: 'object',
          properties: {
            recent: { type: 'array' },
            non_compliant_count: { type: 'number' },
            average_score: { type: 'number' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async getDashboard(@Request() req) {
    const organizationId = req.headers['x-organization-id'] as string;
    return this.complianceService.getDashboardStats(organizationId);
  }

  // ============================================================================
  // REPORTS ENDPOINTS
  // ============================================================================

  @Get('certifications/:id/report/pdf')
  @UseGuards(PoliciesGuard)
  @CheckPolicies((ability: AppAbility) => ability.can(Action.Read, 'Farm'))
  @ApiOperation({
    summary: 'Generate GlobalGAP compliance PDF report',
    description:
      'Generate a comprehensive PDF report for a GlobalGAP certification including requirements, checks, and summary',
  })
  @ApiParam({
    name: 'id',
    description: 'Certification ID',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'PDF report generated successfully',
    content: {
      'application/pdf': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Certification not found' })
  async generatePDFReport(
    @Request() req,
    @Param('id') certificationId: string,
    @Res() res: Response,
  ): Promise<void> {
    const organizationId = req.headers['x-organization-id'] as string;

    const pdfBuffer =
      await this.complianceReportsService.generateGlobalGAPReport(
        certificationId,
        organizationId,
      );

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="globalgap-report-${certificationId}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });

    res.send(pdfBuffer);
  }

  // ============================================================================
  // CORRECTIVE ACTIONS ENDPOINTS
  // ============================================================================

  @Get('corrective-actions/stats')
  @UseGuards(PoliciesGuard)
  @CheckPolicies((ability: AppAbility) => ability.can(Action.Read, 'Farm'))
  @ApiOperation({
    summary: 'Get corrective action statistics',
    description: 'Get statistics about corrective actions for the organization',
  })
  @ApiResponse({
    status: 200,
    description: 'Corrective action statistics retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async getCorrectiveActionStats(@Request() req) {
    const organizationId = req.headers['x-organization-id'] as string;
    return this.correctiveActionsService.getStats(organizationId);
  }

  @Get('corrective-actions')
  @UseGuards(PoliciesGuard)
  @CheckPolicies((ability: AppAbility) => ability.can(Action.Read, 'Farm'))
  @ApiOperation({
    summary: 'Get all corrective actions',
    description: 'Get all corrective actions for the organization',
  })
  @ApiResponse({
    status: 200,
    description: 'Corrective actions retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async getAllCorrectiveActions(@Request() req, @Query() filters: any) {
    const organizationId = req.headers['x-organization-id'] as string;
    return this.correctiveActionsService.findAll(organizationId, filters);
  }

  @Get('corrective-actions/:id')
  @UseGuards(PoliciesGuard)
  @CheckPolicies((ability: AppAbility) => ability.can(Action.Read, 'Farm'))
  @ApiOperation({
    summary: 'Get single corrective action',
    description: 'Get detailed information about a specific corrective action',
  })
  @ApiParam({
    name: 'id',
    description: 'Corrective Action ID',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Corrective action retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Corrective action not found' })
  async getCorrectiveAction(@Request() req, @Param('id') actionId: string) {
    const organizationId = req.headers['x-organization-id'] as string;
    return this.correctiveActionsService.findOne(organizationId, actionId);
  }

  @Post('corrective-actions')
  @UseGuards(PoliciesGuard)
  @CheckPolicies((ability: AppAbility) => ability.can(Action.Create, 'Farm'))
  @ApiOperation({
    summary: 'Create new corrective action',
    description: 'Create a new corrective action for a compliance finding',
  })
  @ApiResponse({
    status: 201,
    description: 'Corrective action created successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request - invalid data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async createCorrectiveAction(
    @Request() req,
    @Body() dto: any,
  ) {
    const organizationId = req.headers['x-organization-id'] as string;
    return this.correctiveActionsService.create(organizationId, req.user.id, dto);
  }

  @Patch('corrective-actions/:id')
  @UseGuards(PoliciesGuard)
  @CheckPolicies((ability: AppAbility) => ability.can(Action.Update, 'Farm'))
  @ApiOperation({
    summary: 'Update corrective action',
    description: 'Update corrective action information',
  })
  @ApiParam({
    name: 'id',
    description: 'Corrective Action ID',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Corrective action updated successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request - invalid data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Corrective action not found' })
  async updateCorrectiveAction(
    @Request() req,
    @Param('id') actionId: string,
    @Body() dto: any,
  ) {
    const organizationId = req.headers['x-organization-id'] as string;
    return this.correctiveActionsService.update(organizationId, actionId, req.user.id, dto);
  }

  @Delete('corrective-actions/:id')
  @UseGuards(PoliciesGuard)
  @CheckPolicies((ability: AppAbility) => ability.can(Action.Delete, 'Farm'))
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete corrective action',
    description: 'Delete a corrective action',
  })
  @ApiParam({
    name: 'id',
    description: 'Corrective Action ID',
    type: String,
  })
  @ApiResponse({
    status: 204,
    description: 'Corrective action deleted successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Corrective action not found' })
  async deleteCorrectiveAction(
    @Request() req,
    @Param('id') actionId: string,
  ): Promise<void> {
    const organizationId = req.headers['x-organization-id'] as string;
    return this.correctiveActionsService.remove(organizationId, actionId);
  }
}
