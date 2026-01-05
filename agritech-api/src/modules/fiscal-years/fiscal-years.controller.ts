import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationGuard } from '../../common/guards/organization.guard';
import { RequireRole } from '../../common/decorators/require-role.decorator';
import { FiscalYearsService } from './fiscal-years.service';
import { CreateFiscalYearDto } from './dto/create-fiscal-year.dto';
import { UpdateFiscalYearDto } from './dto/update-fiscal-year.dto';

@ApiTags('Fiscal Years')
@ApiBearerAuth()
@Controller('fiscal-years')
@UseGuards(JwtAuthGuard, OrganizationGuard)
export class FiscalYearsController {
  constructor(private readonly fiscalYearsService: FiscalYearsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all fiscal years' })
  @ApiResponse({ status: 200, description: 'Fiscal years retrieved successfully' })
  findAll(@Request() req) {
    const organizationId = req.headers['x-organization-id'] as string;
    return this.fiscalYearsService.findAll(organizationId);
  }

  @Get('active')
  @ApiOperation({ summary: 'Get active fiscal year' })
  @ApiResponse({ status: 200, description: 'Active fiscal year retrieved successfully' })
  getActive(@Request() req) {
    const organizationId = req.headers['x-organization-id'] as string;
    return this.fiscalYearsService.getActive(organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get fiscal year by ID' })
  @ApiResponse({ status: 200, description: 'Fiscal year retrieved successfully' })
  findOne(@Param('id') id: string, @Request() req) {
    const organizationId = req.headers['x-organization-id'] as string;
    return this.fiscalYearsService.findOne(id, organizationId);
  }

  @Post()
  @ApiOperation({ summary: 'Create fiscal year' })
  @ApiResponse({ status: 201, description: 'Fiscal year created successfully' })
  @RequireRole('organization_admin', 'system_admin')
  create(@Request() req, @Body() createDto: CreateFiscalYearDto) {
    const organizationId = req.headers['x-organization-id'] as string;
    return this.fiscalYearsService.create(organizationId, req.user.id, createDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update fiscal year' })
  @ApiResponse({ status: 200, description: 'Fiscal year updated successfully' })
  @RequireRole('organization_admin', 'system_admin')
  update(
    @Param('id') id: string,
    @Request() req,
    @Body() updateDto: UpdateFiscalYearDto,
  ) {
    const organizationId = req.headers['x-organization-id'] as string;
    return this.fiscalYearsService.update(id, organizationId, req.user.id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete fiscal year' })
  @ApiResponse({ status: 200, description: 'Fiscal year deleted successfully' })
  @RequireRole('organization_admin', 'system_admin')
  remove(@Param('id') id: string, @Request() req) {
    const organizationId = req.headers['x-organization-id'] as string;
    return this.fiscalYearsService.remove(id, organizationId);
  }

  @Post(':id/close')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Close fiscal year' })
  @ApiResponse({ status: 200, description: 'Fiscal year closed successfully' })
  @RequireRole('organization_admin', 'system_admin')
  close(@Param('id') id: string, @Request() req) {
    const organizationId = req.headers['x-organization-id'] as string;
    return this.fiscalYearsService.close(id, organizationId, req.user.id);
  }

  @Post(':id/reopen')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reopen fiscal year' })
  @ApiResponse({ status: 200, description: 'Fiscal year reopened successfully' })
  @RequireRole('organization_admin', 'system_admin')
  reopen(@Param('id') id: string, @Request() req) {
    const organizationId = req.headers['x-organization-id'] as string;
    return this.fiscalYearsService.reopen(id, organizationId, req.user.id);
  }
}
