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
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { AccountMappingsService } from './account-mappings.service';
import { CreateAccountMappingDto, UpdateAccountMappingDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationGuard } from '../../common/guards/organization.guard';

@ApiTags('account-mappings')
@Controller('account-mappings')
@UseGuards(JwtAuthGuard, OrganizationGuard)
@ApiBearerAuth()
export class AccountMappingsController {
  constructor(private readonly accountMappingsService: AccountMappingsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all account mappings with optional filters' })
  @ApiQuery({ name: 'mapping_type', required: false, description: 'Filter by mapping type' })
  @ApiQuery({ name: 'is_active', type: 'boolean', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiResponse({ status: 200, description: 'Account mappings retrieved successfully' })
  async findAll(
    @Req() req: any,
    @Query('mapping_type') mappingType?: string,
    @Query('is_active') isActive?: string,
    @Query('search') search?: string,
  ) {
    const organizationId = req.headers['x-organization-id'];
    return this.accountMappingsService.findAll(organizationId, {
      mapping_type: mappingType,
      is_active: isActive === undefined ? undefined : isActive === 'true',
      search,
    });
  }

  @Get('types')
  @ApiOperation({ summary: 'Get available mapping types' })
  @ApiResponse({ status: 200, description: 'Mapping types retrieved successfully' })
  async getMappingTypes(@Req() req: any) {
    const organizationId = req.headers['x-organization-id'];
    return this.accountMappingsService.getMappingTypes(organizationId);
  }

  @Get('options')
  @ApiOperation({ summary: 'Get available mapping types and keys' })
  @ApiResponse({ status: 200, description: 'Mapping options retrieved successfully' })
  async getMappingOptions(@Req() req: any) {
    const organizationId = req.headers['x-organization-id'];
    return this.accountMappingsService.getMappingOptions(organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single account mapping by ID' })
  @ApiParam({ name: 'id', description: 'Account mapping ID' })
  @ApiResponse({ status: 200, description: 'Account mapping retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Account mapping not found' })
  async findOne(@Req() req: any, @Param('id') id: string) {
    const organizationId = req.headers['x-organization-id'];
    return this.accountMappingsService.findOne(id, organizationId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new account mapping' })
  @ApiResponse({ status: 201, description: 'Account mapping created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async create(@Body() dto: CreateAccountMappingDto, @Req() req: any) {
    const organizationId = req.headers['x-organization-id'];
    dto.organization_id = organizationId;
    return this.accountMappingsService.create(dto);
  }

  @Post('initialize')
  @ApiOperation({ summary: 'Initialize default mappings for the organization' })
  @ApiQuery({ name: 'country_code', required: true, description: 'Country code (e.g., MA, FR, US)' })
  @ApiResponse({ status: 201, description: 'Default mappings initialized successfully' })
  async initializeDefaults(
    @Req() req: any,
    @Query('country_code') countryCode: string,
  ) {
    const organizationId = req.headers['x-organization-id'];
    return this.accountMappingsService.initializeDefaultMappings(organizationId, countryCode);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an account mapping' })
  @ApiParam({ name: 'id', description: 'Account mapping ID' })
  @ApiResponse({ status: 200, description: 'Account mapping updated successfully' })
  @ApiResponse({ status: 404, description: 'Account mapping not found' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateAccountMappingDto,
    @Req() req: any,
  ) {
    const organizationId = req.headers['x-organization-id'];
    return this.accountMappingsService.update(id, organizationId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an account mapping' })
  @ApiParam({ name: 'id', description: 'Account mapping ID' })
  @ApiResponse({ status: 200, description: 'Account mapping deleted successfully' })
  async delete(@Param('id') id: string, @Req() req: any) {
    const organizationId = req.headers['x-organization-id'];
    return this.accountMappingsService.delete(id, organizationId);
  }
}
