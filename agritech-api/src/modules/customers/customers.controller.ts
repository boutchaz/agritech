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
import { CustomersService } from './customers.service';
import { CreateCustomerDto, UpdateCustomerDto, CustomerFiltersDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('api/v1/customers')
@UseGuards(JwtAuthGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  /**
   * Get all customers
   * GET /api/v1/customers
   */
  @Get()
  async findAll(@Req() req: any, @Query() filters: CustomerFiltersDto) {
    const organizationId = req.headers['x-organization-id'];

    if (!organizationId) {
      throw new Error('Organization ID is required');
    }

    return this.customersService.findAll(organizationId, filters);
  }

  /**
   * Get a single customer
   * GET /api/v1/customers/:id
   */
  @Get(':id')
  async findOne(@Req() req: any, @Param('id') id: string) {
    const organizationId = req.headers['x-organization-id'];

    if (!organizationId) {
      throw new Error('Organization ID is required');
    }

    return this.customersService.findOne(id, organizationId);
  }

  /**
   * Create a new customer
   * POST /api/v1/customers
   */
  @Post()
  async create(@Req() req: any, @Body() dto: CreateCustomerDto) {
    const organizationId = req.headers['x-organization-id'];
    const userId = req.user?.sub;

    if (!organizationId) {
      throw new Error('Organization ID is required');
    }

    return this.customersService.create(dto, organizationId, userId);
  }

  /**
   * Update a customer
   * PATCH /api/v1/customers/:id
   */
  @Patch(':id')
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

  /**
   * Delete a customer (soft delete)
   * DELETE /api/v1/customers/:id
   */
  @Delete(':id')
  async delete(@Req() req: any, @Param('id') id: string) {
    const organizationId = req.headers['x-organization-id'];

    if (!organizationId) {
      throw new Error('Organization ID is required');
    }

    return this.customersService.delete(id, organizationId);
  }
}
