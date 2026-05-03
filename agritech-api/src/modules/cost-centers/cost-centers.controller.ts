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
import { CostCentersService } from './cost-centers.service';
import { CreateCostCenterDto, UpdateCostCenterDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequireModule } from '../../common/decorators/require-module.decorator';
import { OrganizationGuard } from '../../common/guards/organization.guard';
import { ModuleEntitlementGuard } from '../../common/guards/module-entitlement.guard';

@ApiTags('cost-centers')
@Controller('cost-centers')
@RequireModule('accounting')
@UseGuards(JwtAuthGuard, OrganizationGuard, ModuleEntitlementGuard)
@ApiBearerAuth()
export class CostCentersController {
  constructor(private readonly costCentersService: CostCentersService) {}

  @Get()
  @ApiOperation({ summary: 'Get all cost centers with optional filters' })
  @ApiQuery({ name: 'is_active', type: 'boolean', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiResponse({ status: 200, description: 'Cost centers retrieved successfully' })
  async findAll(
    @Req() req: any,
    @Query('is_active') isActive?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const organizationId = req.headers['x-organization-id'];
    return this.costCentersService.findAll(organizationId, {
      is_active: isActive === undefined ? undefined : isActive === 'true',
      search,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single cost center by ID' })
  @ApiParam({ name: 'id', description: 'Cost center ID' })
  @ApiResponse({ status: 200, description: 'Cost center retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Cost center not found' })
  async findOne(@Req() req: any, @Param('id') id: string) {
    const organizationId = req.headers['x-organization-id'];
    return this.costCentersService.findOne(id, organizationId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new cost center' })
  @ApiResponse({ status: 201, description: 'Cost center created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async create(@Body() dto: CreateCostCenterDto, @Req() req: any) {
    const organizationId = req.headers['x-organization-id'];
    dto.organization_id = organizationId;
    dto.created_by = req.user.sub;
    return this.costCentersService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a cost center' })
  @ApiParam({ name: 'id', description: 'Cost center ID' })
  @ApiResponse({ status: 200, description: 'Cost center updated successfully' })
  @ApiResponse({ status: 404, description: 'Cost center not found' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCostCenterDto,
    @Req() req: any,
  ) {
    const organizationId = req.headers['x-organization-id'];
    const userId = req.user.sub;
    return this.costCentersService.update(id, organizationId, userId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a cost center' })
  @ApiParam({ name: 'id', description: 'Cost center ID' })
  @ApiResponse({ status: 200, description: 'Cost center deleted successfully' })
  @ApiResponse({ status: 400, description: 'Cannot delete cost center in use' })
  async delete(@Param('id') id: string, @Req() req: any) {
    const organizationId = req.headers['x-organization-id'];
    return this.costCentersService.delete(id, organizationId);
  }
}
