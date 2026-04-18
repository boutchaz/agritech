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
import { CustomersService } from './customers.service';
import { CreateCustomerDto, UpdateCustomerDto, CustomerFiltersDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationGuard } from '../../common/guards/organization.guard';

@ApiTags('CRM - Customers')
@ApiBearerAuth('JWT-auth')
@ApiHeader({
  name: 'x-organization-id',
  description: 'Organization ID for multi-tenant context',
  required: true,
})
@Controller('customers')
@UseGuards(JwtAuthGuard, OrganizationGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  @ApiOperation({
    summary: 'Get all customers',
    description: 'Retrieve all customers for the organization with optional filtering by type, status, and search term.',
  })
  @ApiQuery({ name: 'type', required: false, description: 'Filter by customer type (individual, company)' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status (active, inactive)' })
  @ApiQuery({ name: 'search', required: false, description: 'Search by name, email, or phone' })
  @ApiResponse({ status: 200, description: 'Customers retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid or missing JWT token' })
  @ApiResponse({ status: 400, description: 'Bad request - missing organization ID' })
  async findAll(@Req() req: any, @Query() filters: CustomerFiltersDto) {
    const organizationId = req.headers['x-organization-id'];

    if (!organizationId) {
      throw new Error('Organization ID is required');
    }

    return this.customersService.findAll(organizationId, filters);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a single customer',
    description: 'Retrieve detailed information about a specific customer by ID.',
  })
  @ApiParam({ name: 'id', description: 'Customer UUID' })
  @ApiResponse({ status: 200, description: 'Customer retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid or missing JWT token' })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  async findOne(@Req() req: any, @Param('id') id: string) {
    const organizationId = req.headers['x-organization-id'];

    if (!organizationId) {
      throw new Error('Organization ID is required');
    }

    return this.customersService.findOne(id, organizationId);
  }

  @Post()
  @ApiOperation({
    summary: 'Create a new customer',
    description: 'Create a new customer record with contact information, billing details, and optional GL account linking.',
  })
  @ApiResponse({ status: 201, description: 'Customer created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - validation error or missing required fields' })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid or missing JWT token' })
  @ApiResponse({ status: 409, description: 'Conflict - customer with email already exists' })
  async create(@Req() req: any, @Body() dto: CreateCustomerDto) {
    const organizationId = req.headers['x-organization-id'];
    const userId = req.user?.sub;

    if (!organizationId) {
      throw new Error('Organization ID is required');
    }

    return this.customersService.create(dto, organizationId, userId);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a customer',
    description: 'Update customer information including contact details, billing address, and status.',
  })
  @ApiParam({ name: 'id', description: 'Customer UUID' })
  @ApiResponse({ status: 200, description: 'Customer updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid or missing JWT token' })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  async update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    const organizationId = req.headers['x-organization-id'];

    if (!organizationId) {
      throw new Error('Organization ID is required');
    }

    return this.customersService.update(id, dto, organizationId);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a customer',
    description: 'Soft delete a customer. The customer will be marked as inactive but data is preserved for historical records.',
  })
  @ApiParam({ name: 'id', description: 'Customer UUID' })
  @ApiResponse({ status: 200, description: 'Customer deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid or missing JWT token' })
  @ApiResponse({ status: 404, description: 'Customer not found' })
  @ApiResponse({ status: 400, description: 'Cannot delete - customer has active invoices or payments' })
  async delete(@Req() req: any, @Param('id') id: string) {
    const organizationId = req.headers['x-organization-id'];

    if (!organizationId) {
      throw new Error('Organization ID is required');
    }

    return this.customersService.delete(id, organizationId);
  }
}
