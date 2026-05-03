import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam
} from '@nestjs/swagger';
import { TaxesService } from './taxes.service';
import { CreateTaxDto } from './dto/create-tax.dto';
import { UpdateTaxDto } from './dto/update-tax.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationGuard } from '../../common/guards/organization.guard';

@ApiTags('taxes')
@Controller('taxes')
@UseGuards(JwtAuthGuard, OrganizationGuard)
@ApiBearerAuth()
export class TaxesController {
  constructor(private readonly taxesService: TaxesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all taxes with optional filters' })
  @ApiQuery({ name: 'tax_type', enum: ['sales', 'purchase', 'both'], required: false })
  @ApiQuery({ name: 'is_active', type: 'boolean', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiResponse({ status: 200, description: 'Taxes retrieved successfully' })
  async findAll(
    @Req() req: any,
    @Query('tax_type') taxType?: 'sales' | 'purchase' | 'both',
    @Query('is_active') isActive?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const organizationId = req.headers['x-organization-id'];
    return this.taxesService.findAll(organizationId, {
      tax_type: taxType,
      is_active: isActive === 'true',
      search,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single tax by ID' })
  @ApiParam({ name: 'id', description: 'Tax ID' })
  @ApiResponse({ status: 200, description: 'Tax retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Tax not found' })
  async findOne(@Req() req: any, @Param('id') id: string) {
    const organizationId = req.headers['x-organization-id'];
    return this.taxesService.findOne(id, organizationId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new tax' })
  @ApiResponse({ status: 201, description: 'Tax created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async create(@Body() createTaxDto: CreateTaxDto, @Req() req: any) {
    const organizationId = req.headers['x-organization-id'];
    createTaxDto.organization_id = organizationId;
    createTaxDto.created_by = req.user.sub;
    return this.taxesService.create(createTaxDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a tax' })
  @ApiParam({ name: 'id', description: 'Tax ID' })
  @ApiResponse({ status: 200, description: 'Tax updated successfully' })
  @ApiResponse({ status: 404, description: 'Tax not found' })
  async update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() updateTaxDto: UpdateTaxDto,
  ) {
    const organizationId = req.headers['x-organization-id'];
    const userId = req.user.sub;
    return this.taxesService.update(id, organizationId, userId, updateTaxDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a tax' })
  @ApiParam({ name: 'id', description: 'Tax ID' })
  @ApiResponse({ status: 200, description: 'Tax deleted successfully' })
  @ApiResponse({ status: 400, description: 'Cannot delete tax used in invoices' })
  async delete(@Param('id') id: string, @Req() req: any) {
    const organizationId = req.headers['x-organization-id'];
    return this.taxesService.delete(id, organizationId);
  }
}
