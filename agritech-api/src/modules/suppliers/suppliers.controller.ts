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
  ApiHeader,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto, UpdateSupplierDto, SupplierFiltersDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationGuard } from '../../common/guards/organization.guard';

@ApiTags('CRM - Suppliers')
@ApiBearerAuth('JWT-auth')
@ApiHeader({
  name: 'x-organization-id',
  description: 'Organization ID for multi-tenant context',
  required: true,
})
@Controller('suppliers')
@UseGuards(JwtAuthGuard, OrganizationGuard)
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Get()
  @ApiOperation({
    summary: 'Get all suppliers',
    description: 'Retrieve all suppliers for the organization with optional filtering by type, status, and search term.',
  })
  @ApiQuery({ name: 'type', required: false, description: 'Filter by supplier type (individual, company)' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status (active, inactive)' })
  @ApiQuery({ name: 'search', required: false, description: 'Search by name, email, or phone' })
  @ApiResponse({ status: 200, description: 'Suppliers retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid or missing JWT token' })
  @ApiResponse({ status: 400, description: 'Bad request - missing organization ID' })
  async findAll(@Req() req: any, @Query() filters: SupplierFiltersDto) {
    const organizationId = req.headers['x-organization-id'];

    if (!organizationId) {
      throw new Error('Organization ID is required');
    }

    return this.suppliersService.findAll(organizationId, filters);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a single supplier',
    description: 'Retrieve detailed information about a specific supplier by ID.',
  })
  @ApiParam({ name: 'id', description: 'Supplier UUID' })
  @ApiResponse({ status: 200, description: 'Supplier retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid or missing JWT token' })
  @ApiResponse({ status: 404, description: 'Supplier not found' })
  async findOne(@Req() req: any, @Param('id') id: string) {
    const organizationId = req.headers['x-organization-id'];

    if (!organizationId) {
      throw new Error('Organization ID is required');
    }

    return this.suppliersService.findOne(id, organizationId);
  }

  @Post()
  @ApiOperation({
    summary: 'Create a new supplier',
    description: 'Create a new supplier record with contact information, payment terms, and optional GL account linking.',
  })
  @ApiResponse({ status: 201, description: 'Supplier created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - validation error or missing required fields' })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid or missing JWT token' })
  @ApiResponse({ status: 409, description: 'Conflict - supplier with email already exists' })
  async create(@Req() req: any, @Body() dto: CreateSupplierDto) {
    const organizationId = req.headers['x-organization-id'];
    const userId = req.user?.sub;

    if (!organizationId) {
      throw new Error('Organization ID is required');
    }

    return this.suppliersService.create(dto, organizationId, userId);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a supplier',
    description: 'Update supplier information including contact details, payment terms, and status.',
  })
  @ApiParam({ name: 'id', description: 'Supplier UUID' })
  @ApiResponse({ status: 200, description: 'Supplier updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid or missing JWT token' })
  @ApiResponse({ status: 404, description: 'Supplier not found' })
  async update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateSupplierDto,
  ) {
    const organizationId = req.headers['x-organization-id'];

    if (!organizationId) {
      throw new Error('Organization ID is required');
    }

    return this.suppliersService.update(id, dto, organizationId);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a supplier',
    description: 'Soft delete a supplier. The supplier will be marked as inactive but data is preserved for historical records.',
  })
  @ApiParam({ name: 'id', description: 'Supplier UUID' })
  @ApiResponse({ status: 200, description: 'Supplier deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid or missing JWT token' })
  @ApiResponse({ status: 404, description: 'Supplier not found' })
  @ApiResponse({ status: 400, description: 'Cannot delete - supplier has active purchase orders or payments' })
  async delete(@Req() req: any, @Param('id') id: string) {
    const organizationId = req.headers['x-organization-id'];

    if (!organizationId) {
      throw new Error('Organization ID is required');
    }

    return this.suppliersService.delete(id, organizationId);
  }
}
