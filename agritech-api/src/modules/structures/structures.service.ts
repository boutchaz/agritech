import { Injectable, Logger, NotFoundException, ForbiddenException, InternalServerErrorException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateStructureDto } from './dto/create-structure.dto';
import { UpdateStructureDto } from './dto/update-structure.dto';
import { paginatedResponse, type PaginatedResponse } from '../../common/dto/paginated-query.dto';

@Injectable()
export class StructuresService {
  private readonly logger = new Logger(StructuresService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Get all structures for an organization
   */
  async findAll(
    userId: string,
    organizationId: string,
    pagination: { page?: number; pageSize?: number } = {},
  ): Promise<PaginatedResponse<any>> {
    const client = this.databaseService.getAdminClient();
    const page = Math.max(1, Number(pagination.page) || 1);
    const pageSize = Math.max(1, Math.min(100, Number(pagination.pageSize) || 100));
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data: orgUser, error: orgError } = await client
      .from('organization_users')
      .select('organization_id')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle();

    if (orgError || !orgUser) {
      throw new ForbiddenException('You do not have access to this organization');
    }

    const apply = (q: any) =>
      q.eq('organization_id', organizationId).eq('is_active', true);

    const { count } = await apply(
      client.from('structures').select('id', { count: 'exact', head: true }),
    );

    const { data: structures, error: structuresError } = await apply(
      client.from('structures').select(`
        *,
        farm:farms(id, name)
      `),
    )
      .order('name')
      .range(from, to);

    if (structuresError) {
      this.logger.error(`Failed to fetch structures: ${structuresError.message}`);
      throw new InternalServerErrorException('Failed to fetch structures');
    }

    return paginatedResponse(structures ?? [], count ?? 0, page, pageSize);
  }

  /**
   * Get a single structure by ID
   */
  async findOne(userId: string, organizationId: string, structureId: string) {
    const client = this.databaseService.getAdminClient();

    // Verify user has access to this organization
    const { data: orgUser, error: orgError } = await client
      .from('organization_users')
      .select('organization_id')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle();

    if (orgError || !orgUser) {
      throw new ForbiddenException('You do not have access to this organization');
    }

    const { data: structure, error: structureError } = await client
      .from('structures')
      .select(`
        *,
        farm:farms(id, name)
      `)
      .eq('id', structureId)
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .maybeSingle();

    if (structureError) {
      this.logger.error(`Failed to fetch structure: ${structureError.message}`);
      throw new InternalServerErrorException('Failed to fetch structure');
    }

    if (!structure) {
      throw new NotFoundException('Structure not found');
    }

    return structure;
  }

  /**
   * Create a new structure
   */
  async create(userId: string, organizationId: string, createDto: CreateStructureDto) {
    const client = this.databaseService.getAdminClient();

    // Verify user has access to this organization
    const { data: orgUser, error: orgError } = await client
      .from('organization_users')
      .select('organization_id')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle();

    if (orgError || !orgUser) {
      throw new ForbiddenException('You do not have access to this organization');
    }

    // If farm_id is provided, verify it belongs to the organization
    if (createDto.farm_id) {
      const { data: farm, error: farmError } = await client
        .from('farms')
        .select('id')
        .eq('id', createDto.farm_id)
        .eq('organization_id', organizationId)
        .maybeSingle();

      if (farmError || !farm) {
        throw new ForbiddenException('Farm does not belong to this organization');
      }
    }

    // Create the structure
    const { data: structure, error: structureError } = await client
      .from('structures')
      .insert({
        ...createDto,
        organization_id: organizationId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select(`
        *,
        farm:farms(id, name)
      `)
      .single();

    if (structureError) {
      this.logger.error(`Failed to create structure: ${structureError.message}`);
      throw new InternalServerErrorException('Failed to create structure');
    }

    return structure;
  }

  /**
   * Update a structure
   */
  async update(
    userId: string,
    organizationId: string,
    structureId: string,
    updateDto: UpdateStructureDto,
  ) {
    const client = this.databaseService.getAdminClient();

    // Verify user has access to this organization
    const { data: orgUser, error: orgError } = await client
      .from('organization_users')
      .select('organization_id')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle();

    if (orgError || !orgUser) {
      throw new ForbiddenException('You do not have access to this organization');
    }

    // Verify structure belongs to organization
    const { data: existingStructure, error: existingError } = await client
      .from('structures')
      .select('id')
      .eq('id', structureId)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (existingError || !existingStructure) {
      throw new NotFoundException('Structure not found');
    }

    // If farm_id is being updated, verify it belongs to the organization
    if (updateDto.farm_id) {
      const { data: farm, error: farmError } = await client
        .from('farms')
        .select('id')
        .eq('id', updateDto.farm_id)
        .eq('organization_id', organizationId)
        .maybeSingle();

      if (farmError || !farm) {
        throw new ForbiddenException('Farm does not belong to this organization');
      }
    }

    // Update the structure
    const { data: structure, error: structureError } = await client
      .from('structures')
      .update({
        ...updateDto,
        updated_at: new Date().toISOString(),
      })
      .eq('id', structureId)
      .eq('organization_id', organizationId)
      .select(`
        *,
        farm:farms(id, name)
      `)
      .single();

    if (structureError) {
      this.logger.error(`Failed to update structure: ${structureError.message}`);
      throw new InternalServerErrorException('Failed to update structure');
    }

    return structure;
  }

  /**
   * Soft delete a structure (set is_active to false)
   */
  async remove(userId: string, organizationId: string, structureId: string) {
    const client = this.databaseService.getAdminClient();

    // Verify user has access to this organization
    const { data: orgUser, error: orgError } = await client
      .from('organization_users')
      .select('organization_id')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle();

    if (orgError || !orgUser) {
      throw new ForbiddenException('You do not have access to this organization');
    }

    // Verify structure belongs to organization
    const { data: existingStructure, error: existingError } = await client
      .from('structures')
      .select('id')
      .eq('id', structureId)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (existingError || !existingStructure) {
      throw new NotFoundException('Structure not found');
    }

    // Soft delete the structure
    const { error: deleteError } = await client
      .from('structures')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', structureId)
      .eq('organization_id', organizationId);

    if (deleteError) {
      this.logger.error(`Failed to delete structure: ${deleteError.message}`);
      throw new InternalServerErrorException('Failed to delete structure');
    }

    return { message: 'Structure deleted successfully' };
  }
}
