import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TreeManagementService } from './tree-management.service';
import {
  CreateTreeCategoryDto,
  UpdateTreeCategoryDto,
  CreateTreeDto,
  UpdateTreeDto,
  CreatePlantationTypeDto,
  UpdatePlantationTypeDto,
} from './dto';

@ApiTags('Tree Management')
@ApiBearerAuth()
@Controller('organizations/:organizationId/tree-management')
@UseGuards(JwtAuthGuard)
export class TreeManagementController {
  constructor(private readonly treeManagementService: TreeManagementService) {}

  @Get('categories')
  @ApiOperation({ summary: 'Get all tree categories with trees' })
  @ApiResponse({ status: 200, description: 'Categories retrieved successfully' })
  async getCategories(
    @Request() req,
    @Param('organizationId') organizationId: string,
  ) {
    return this.treeManagementService.getCategories(req.user.userId, organizationId);
  }

  @Post('categories')
  @ApiOperation({ summary: 'Create a new tree category' })
  @ApiResponse({ status: 201, description: 'Category created successfully' })
  async createCategory(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Body() dto: CreateTreeCategoryDto,
  ) {
    return this.treeManagementService.createCategory(req.user.userId, organizationId, dto);
  }

  @Patch('categories/:id')
  @ApiOperation({ summary: 'Update a tree category' })
  @ApiResponse({ status: 200, description: 'Category updated successfully' })
  async updateCategory(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Param('id') categoryId: string,
    @Body() dto: UpdateTreeCategoryDto,
  ) {
    return this.treeManagementService.updateCategory(
      req.user.userId,
      organizationId,
      categoryId,
      dto,
    );
  }

  @Delete('categories/:id')
  @ApiOperation({ summary: 'Delete a tree category' })
  @ApiResponse({ status: 200, description: 'Category deleted successfully' })
  async deleteCategory(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Param('id') categoryId: string,
  ) {
    await this.treeManagementService.deleteCategory(req.user.userId, organizationId, categoryId);
    return { message: 'Category deleted successfully' };
  }

  @Post('trees')
  @ApiOperation({ summary: 'Create a new tree' })
  @ApiResponse({ status: 201, description: 'Tree created successfully' })
  async createTree(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Body() dto: CreateTreeDto,
  ) {
    return this.treeManagementService.createTree(req.user.userId, organizationId, dto);
  }

  @Patch('trees/:id')
  @ApiOperation({ summary: 'Update a tree' })
  @ApiResponse({ status: 200, description: 'Tree updated successfully' })
  async updateTree(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Param('id') treeId: string,
    @Body() dto: UpdateTreeDto,
  ) {
    return this.treeManagementService.updateTree(
      req.user.userId,
      organizationId,
      treeId,
      dto,
    );
  }

  @Delete('trees/:id')
  @ApiOperation({ summary: 'Delete a tree' })
  @ApiResponse({ status: 200, description: 'Tree deleted successfully' })
  async deleteTree(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Param('id') treeId: string,
  ) {
    await this.treeManagementService.deleteTree(req.user.userId, organizationId, treeId);
    return { message: 'Tree deleted successfully' };
  }

  @Get('plantation-types')
  @ApiOperation({ summary: 'Get all plantation types' })
  @ApiResponse({ status: 200, description: 'Plantation types retrieved successfully' })
  async getPlantationTypes(
    @Request() req,
    @Param('organizationId') organizationId: string,
  ) {
    return this.treeManagementService.getPlantationTypes(req.user.userId, organizationId);
  }

  @Post('plantation-types')
  @ApiOperation({ summary: 'Create a new plantation type' })
  @ApiResponse({ status: 201, description: 'Plantation type created successfully' })
  async createPlantationType(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Body() dto: CreatePlantationTypeDto,
  ) {
    return this.treeManagementService.createPlantationType(req.user.userId, organizationId, dto);
  }

  @Patch('plantation-types/:id')
  @ApiOperation({ summary: 'Update a plantation type' })
  @ApiResponse({ status: 200, description: 'Plantation type updated successfully' })
  async updatePlantationType(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Param('id') typeId: string,
    @Body() dto: UpdatePlantationTypeDto,
  ) {
    return this.treeManagementService.updatePlantationType(
      req.user.userId,
      organizationId,
      typeId,
      dto,
    );
  }

  @Delete('plantation-types/:id')
  @ApiOperation({ summary: 'Delete a plantation type' })
  @ApiResponse({ status: 200, description: 'Plantation type deleted successfully' })
  async deletePlantationType(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Param('id') typeId: string,
  ) {
    await this.treeManagementService.deletePlantationType(req.user.userId, organizationId, typeId);
    return { message: 'Plantation type deleted successfully' };
  }
}
