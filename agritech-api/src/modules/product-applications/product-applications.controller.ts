import { Controller, Get, Post, Delete, Param, Body, UseGuards, Request } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ProductApplicationsService } from './product-applications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationGuard } from '../../common/guards/organization.guard';
import { PoliciesGuard } from '../casl/policies.guard';
import { CheckPolicies } from '../casl/check-policies.decorator';
import { Action } from '../casl/action.enum';
import { AppAbility } from '../casl/casl-ability.factory';
import { CreateProductApplicationDto } from './dto/create-product-application.dto';
import { ListProductApplicationsResponseDto } from './dto/list-product-applications.dto';

@ApiTags('product-applications')
@Controller('product-applications')
@UseGuards(JwtAuthGuard, OrganizationGuard, PoliciesGuard)
export class ProductApplicationsController {
  constructor(private productApplicationsService: ProductApplicationsService) {}

  @Get()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'List product applications for an organization',
    description: 'Get all product applications with inventory details',
  })
  @ApiResponse({
    status: 200,
    description: 'Product applications retrieved successfully',
    type: ListProductApplicationsResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - no access to organization' })
  @CheckPolicies((ability: AppAbility) => ability.can(Action.Read, 'ProductApplication'))
  async listProductApplications(@Request() req) {
    const organizationId = req.headers['x-organization-id'] as string;
    if (!organizationId) {
      throw new Error('Organization ID is required');
    }
    return this.productApplicationsService.listProductApplications(req.user.id, organizationId);
  }

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new product application' })
  @ApiResponse({ status: 201, description: 'Product application created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - no access to organization' })
  @CheckPolicies((ability: AppAbility) => ability.can(Action.Create, 'ProductApplication'))
  async createProductApplication(
    @Request() req,
    @Body() createDto: CreateProductApplicationDto,
  ) {
    const organizationId = req.headers['x-organization-id'] as string;
    if (!organizationId) {
      throw new Error('Organization ID is required');
    }
    return this.productApplicationsService.createProductApplication(req.user.id, organizationId, createDto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a product application and reverse stock/accounting' })
  @ApiResponse({ status: 200, description: 'Product application deleted successfully' })
  @ApiResponse({ status: 404, description: 'Product application not found' })
  @CheckPolicies((ability: AppAbility) => ability.can(Action.Delete, 'ProductApplication'))
  async deleteProductApplication(
    @Request() req,
    @Param('id') id: string,
  ) {
    const organizationId = req.headers['x-organization-id'] as string;
    if (!organizationId) {
      throw new Error('Organization ID is required');
    }
    return this.productApplicationsService.deleteProductApplication(req.user.id, organizationId, id);
  }

  @Get('available-products')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get available products from inventory',
    description: 'Get products with quantity > 0 for use in applications',
  })
  @ApiResponse({ status: 200, description: 'Available products retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @CheckPolicies((ability: AppAbility) => ability.can(Action.Read, 'Stock'))
  async getAvailableProducts(@Request() req) {
    const organizationId = req.headers['x-organization-id'] as string;
    if (!organizationId) {
      throw new Error('Organization ID is required');
    }
    return this.productApplicationsService.getAvailableProducts(req.user.id, organizationId);
  }
}
