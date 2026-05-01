import { Controller, Get, Patch, Body, Param, Query, Request, UseGuards, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationModulesService } from './organization-modules.service';
import { UpdateModuleDto } from './dto/update-module.dto';

@ApiTags('Organization Modules')
@ApiBearerAuth()
@Controller('organizations/:organizationId/modules')
@UseGuards(JwtAuthGuard)
export class OrganizationModulesController {
  private readonly logger = new Logger(OrganizationModulesController.name);

  constructor(
    private readonly organizationModulesService: OrganizationModulesService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get module catalog + pricing + widget map enriched with org activation state' })
  @ApiQuery({ name: 'locale', required: false, description: 'Translation locale (en, fr, ar)' })
  @ApiResponse({ status: 200, description: 'Org-scoped module config' })
  @ApiResponse({ status: 403, description: 'Access denied to this organization' })
  async getModules(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Query('locale') locale?: string,
  ) {
    this.logger.log(`User ${req.user.id} fetching modules for organization ${organizationId}`);
    return this.organizationModulesService.getOrganizationModules(
      req.user.id,
      organizationId,
      locale || 'en',
    );
  }

  @Patch(':moduleId')
  @ApiOperation({ summary: 'Update module activation status or settings' })
  @ApiResponse({ status: 200, description: 'Module updated successfully' })
  @ApiResponse({ status: 403, description: 'Permission denied or module requires subscription upgrade' })
  @ApiResponse({ status: 404, description: 'Module not found' })
  async updateModule(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Param('moduleId') moduleId: string,
    @Body() updateDto: UpdateModuleDto,
  ) {
    this.logger.log(`User ${req.user.id} updating module ${moduleId} for organization ${organizationId}`);
    return this.organizationModulesService.updateOrganizationModule(
      req.user.id,
      organizationId,
      moduleId,
      updateDto,
    );
  }
}
