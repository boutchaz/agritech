import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import {
  CreateTreeCategoryDto,
  UpdateTreeCategoryDto,
  CreateTreeDto,
  UpdateTreeDto,
  CreatePlantationTypeDto,
  UpdatePlantationTypeDto,
} from './dto';

@Injectable()
export class TreeManagementService {
  constructor(private readonly databaseService: DatabaseService) {}

  private async verifyOrganizationAccess(
    userId: string,
    organizationId: string,
  ): Promise<void> {
    const client = this.databaseService.getAdminClient();
    const { data, error } = await client
      .from('organization_members')
      .select('id')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .single();

    if (error || !data) {
      throw new NotFoundException('Organization not found or access denied');
    }
  }

  async getCategories(userId: string, organizationId: string) {
    await this.verifyOrganizationAccess(userId, organizationId);

    const client = this.databaseService.getAdminClient();

    const { data: categories, error: categoriesError } = await client
      .from('tree_categories')
      .select('*')
      .eq('organization_id', organizationId)
      .order('category', { ascending: true });

    if (categoriesError) {
      throw new BadRequestException(`Failed to fetch categories: ${categoriesError.message}`);
    }

    if (!categories || categories.length === 0) {
      return [];
    }

    const { data: trees, error: treesError } = await client
      .from('trees')
      .select('*')
      .in('category_id', categories.map(c => c.id))
      .order('name', { ascending: true });

    if (treesError) {
      throw new BadRequestException(`Failed to fetch trees: ${treesError.message}`);
    }

    return categories.map(category => ({
      ...category,
      trees: (trees || []).filter(tree => tree.category_id === category.id),
    }));
  }

  async createCategory(
    userId: string,
    organizationId: string,
    dto: CreateTreeCategoryDto,
  ) {
    await this.verifyOrganizationAccess(userId, organizationId);

    const client = this.databaseService.getAdminClient();
    const { data, error } = await client
      .from('tree_categories')
      .insert({
        organization_id: organizationId,
        category: dto.category,
      })
      .select()
      .single();

    if (error) {
      throw new BadRequestException(`Failed to create category: ${error.message}`);
    }

    return data;
  }

  async updateCategory(
    userId: string,
    organizationId: string,
    categoryId: string,
    dto: UpdateTreeCategoryDto,
  ) {
    await this.verifyOrganizationAccess(userId, organizationId);

    const client = this.databaseService.getAdminClient();

    const { data: existing } = await client
      .from('tree_categories')
      .select('id')
      .eq('id', categoryId)
      .eq('organization_id', organizationId)
      .single();

    if (!existing) {
      throw new NotFoundException('Category not found');
    }

    const { data, error } = await client
      .from('tree_categories')
      .update({ category: dto.category })
      .eq('id', categoryId)
      .select()
      .single();

    if (error) {
      throw new BadRequestException(`Failed to update category: ${error.message}`);
    }

    return data;
  }

  async deleteCategory(
    userId: string,
    organizationId: string,
    categoryId: string,
  ) {
    await this.verifyOrganizationAccess(userId, organizationId);

    const client = this.databaseService.getAdminClient();
    const { error } = await client
      .from('tree_categories')
      .delete()
      .eq('id', categoryId)
      .eq('organization_id', organizationId);

    if (error) {
      throw new BadRequestException(`Failed to delete category: ${error.message}`);
    }
  }

  async createTree(
    userId: string,
    organizationId: string,
    dto: CreateTreeDto,
  ) {
    await this.verifyOrganizationAccess(userId, organizationId);

    const client = this.databaseService.getAdminClient();

    const { data: category } = await client
      .from('tree_categories')
      .select('id')
      .eq('id', dto.category_id)
      .eq('organization_id', organizationId)
      .single();

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const { data, error } = await client
      .from('trees')
      .insert({
        category_id: dto.category_id,
        name: dto.name,
      })
      .select()
      .single();

    if (error) {
      throw new BadRequestException(`Failed to create tree: ${error.message}`);
    }

    return data;
  }

  async updateTree(
    userId: string,
    organizationId: string,
    treeId: string,
    dto: UpdateTreeDto,
  ) {
    await this.verifyOrganizationAccess(userId, organizationId);

    const client = this.databaseService.getAdminClient();

    const { data: tree } = await client
      .from('trees')
      .select('id, category_id')
      .eq('id', treeId)
      .single();

    if (!tree) {
      throw new NotFoundException('Tree not found');
    }

    const { data: category } = await client
      .from('tree_categories')
      .select('id')
      .eq('id', tree.category_id)
      .eq('organization_id', organizationId)
      .single();

    if (!category) {
      throw new NotFoundException('Tree not found or access denied');
    }

    const { data, error } = await client
      .from('trees')
      .update({ name: dto.name })
      .eq('id', treeId)
      .select()
      .single();

    if (error) {
      throw new BadRequestException(`Failed to update tree: ${error.message}`);
    }

    return data;
  }

  async deleteTree(
    userId: string,
    organizationId: string,
    treeId: string,
  ) {
    await this.verifyOrganizationAccess(userId, organizationId);

    const client = this.databaseService.getAdminClient();

    const { data: tree } = await client
      .from('trees')
      .select('id, category_id')
      .eq('id', treeId)
      .single();

    if (!tree) {
      throw new NotFoundException('Tree not found');
    }

    const { data: category } = await client
      .from('tree_categories')
      .select('id')
      .eq('id', tree.category_id)
      .eq('organization_id', organizationId)
      .single();

    if (!category) {
      throw new NotFoundException('Tree not found or access denied');
    }

    const { error } = await client
      .from('trees')
      .delete()
      .eq('id', treeId);

    if (error) {
      throw new BadRequestException(`Failed to delete tree: ${error.message}`);
    }
  }

  async getPlantationTypes(userId: string, organizationId: string) {
    await this.verifyOrganizationAccess(userId, organizationId);

    const client = this.databaseService.getAdminClient();
    const { data, error } = await client
      .from('plantation_types')
      .select('*')
      .eq('organization_id', organizationId)
      .order('type', { ascending: true });

    if (error) {
      throw new BadRequestException(`Failed to fetch plantation types: ${error.message}`);
    }

    return data || [];
  }

  async createPlantationType(
    userId: string,
    organizationId: string,
    dto: CreatePlantationTypeDto,
  ) {
    await this.verifyOrganizationAccess(userId, organizationId);

    const client = this.databaseService.getAdminClient();
    const { data, error } = await client
      .from('plantation_types')
      .insert({
        organization_id: organizationId,
        type: dto.type,
        spacing: dto.spacing,
        trees_per_ha: dto.trees_per_ha,
      })
      .select()
      .single();

    if (error) {
      throw new BadRequestException(`Failed to create plantation type: ${error.message}`);
    }

    return data;
  }

  async updatePlantationType(
    userId: string,
    organizationId: string,
    typeId: string,
    dto: UpdatePlantationTypeDto,
  ) {
    await this.verifyOrganizationAccess(userId, organizationId);

    const client = this.databaseService.getAdminClient();

    const { data: existing } = await client
      .from('plantation_types')
      .select('id')
      .eq('id', typeId)
      .eq('organization_id', organizationId)
      .single();

    if (!existing) {
      throw new NotFoundException('Plantation type not found');
    }

    const { data, error } = await client
      .from('plantation_types')
      .update({
        type: dto.type,
        spacing: dto.spacing,
        trees_per_ha: dto.trees_per_ha,
      })
      .eq('id', typeId)
      .select()
      .single();

    if (error) {
      throw new BadRequestException(`Failed to update plantation type: ${error.message}`);
    }

    return data;
  }

  async deletePlantationType(
    userId: string,
    organizationId: string,
    typeId: string,
  ) {
    await this.verifyOrganizationAccess(userId, organizationId);

    const client = this.databaseService.getAdminClient();
    const { error } = await client
      .from('plantation_types')
      .delete()
      .eq('id', typeId)
      .eq('organization_id', organizationId);

    if (error) {
      throw new BadRequestException(`Failed to delete plantation type: ${error.message}`);
    }
  }
}
