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
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto, UpdateSupplierDto, SupplierFiltersDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('api/v1/suppliers')
@UseGuards(JwtAuthGuard)
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  /**
   * Get all suppliers
   * GET /api/v1/suppliers
   */
  @Get()
  async findAll(@Req() req: any, @Query() filters: SupplierFiltersDto) {
    const organizationId = req.headers['x-organization-id'];

    if (!organizationId) {
      throw new Error('Organization ID is required');
    }

    return this.suppliersService.findAll(organizationId, filters);
  }

  /**
   * Get a single supplier
   * GET /api/v1/suppliers/:id
   */
  @Get(':id')
  async findOne(@Req() req: any, @Param('id') id: string) {
    const organizationId = req.headers['x-organization-id'];

    if (!organizationId) {
      throw new Error('Organization ID is required');
    }

    return this.suppliersService.findOne(id, organizationId);
  }

  /**
   * Create a new supplier
   * POST /api/v1/suppliers
   */
  @Post()
  async create(@Req() req: any, @Body() dto: CreateSupplierDto) {
    const organizationId = req.headers['x-organization-id'];
    const userId = req.user?.sub;

    if (!organizationId) {
      throw new Error('Organization ID is required');
    }

    return this.suppliersService.create(dto, organizationId, userId);
  }

  /**
   * Update a supplier
   * PATCH /api/v1/suppliers/:id
   */
  @Patch(':id')
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

  /**
   * Delete a supplier (soft delete)
   * DELETE /api/v1/suppliers/:id
   */
  @Delete(':id')
  async delete(@Req() req: any, @Param('id') id: string) {
    const organizationId = req.headers['x-organization-id'];

    if (!organizationId) {
      throw new Error('Organization ID is required');
    }

    return this.suppliersService.delete(id, organizationId);
  }
}
