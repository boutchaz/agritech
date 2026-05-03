import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateLetterHeadDto, UpdateLetterHeadDto } from './dto';
import { paginatedResponse, type PaginatedResponse } from '../../common/dto/paginated-query.dto';

@Injectable()
export class LetterHeadsService {
  constructor(private readonly databaseService: DatabaseService) {}

  private async verifyOrganizationAccess(
    userId: string,
    organizationId: string,
  ): Promise<void> {
    const client = this.databaseService.getAdminClient();
    const { data, error } = await client
      .from('organization_users')
      .select('id')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      throw new NotFoundException('Organization not found or access denied');
    }
  }

  async findAll(
    userId: string,
    organizationId: string,
    pagination: { page?: number; pageSize?: number } = {},
  ): Promise<PaginatedResponse<any>> {
    await this.verifyOrganizationAccess(userId, organizationId);

    const client = this.databaseService.getAdminClient();
    const page = Math.max(1, Number(pagination.page) || 1);
    const pageSize = Math.max(1, Math.min(100, Number(pagination.pageSize) || 100));
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { count } = await client
      .from('letter_heads')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId);

    const { data, error } = await client
      .from('letter_heads')
      .select('*')
      .eq('organization_id', organizationId)
      .order('name')
      .range(from, to);

    if (error) {
      throw new BadRequestException(`Failed to fetch letter heads: ${error.message}`);
    }

    return paginatedResponse(data ?? [], count ?? 0, page, pageSize);
  }

  async findOne(userId: string, organizationId: string, letterHeadId: string) {
    await this.verifyOrganizationAccess(userId, organizationId);

    const client = this.databaseService.getAdminClient();
    const { data, error } = await client
      .from('letter_heads')
      .select('*')
      .eq('id', letterHeadId)
      .eq('organization_id', organizationId)
      .single();

    if (error || !data) {
      throw new NotFoundException('Letter head not found');
    }

    return data;
  }

  async findDefault(userId: string, organizationId: string) {
    await this.verifyOrganizationAccess(userId, organizationId);

    const client = this.databaseService.getAdminClient();
    const { data, error } = await client
      .from('letter_heads')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_default', true)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      throw new BadRequestException(`Failed to fetch default letter head: ${error.message}`);
    }

    return data;
  }

  async create(userId: string, organizationId: string, dto: CreateLetterHeadDto) {
    await this.verifyOrganizationAccess(userId, organizationId);

    const client = this.databaseService.getAdminClient();

    if (dto.is_default) {
      await this.clearDefault(client, organizationId);
    }

    const { data, error } = await client
      .from('letter_heads')
      .insert({
        ...dto,
        organization_id: organizationId,
        created_by: userId,
        is_active: dto.is_active ?? true,
      })
      .select()
      .single();

    if (error) {
      throw new BadRequestException(`Failed to create letter head: ${error.message}`);
    }

    return data;
  }

  async update(userId: string, organizationId: string, letterHeadId: string, dto: UpdateLetterHeadDto) {
    await this.verifyOrganizationAccess(userId, organizationId);

    const client = this.databaseService.getAdminClient();

    const { data: existing } = await client
      .from('letter_heads')
      .select('id')
      .eq('id', letterHeadId)
      .eq('organization_id', organizationId)
      .single();

    if (!existing) {
      throw new NotFoundException('Letter head not found');
    }

    if (dto.is_default) {
      await this.clearDefault(client, organizationId);
    }

    const { data, error } = await client
      .from('letter_heads')
      .update({
        ...dto,
        updated_at: new Date().toISOString(),
      })
      .eq('id', letterHeadId)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) {
      throw new BadRequestException(`Failed to update letter head: ${error.message}`);
    }

    return data;
  }

  async delete(userId: string, organizationId: string, letterHeadId: string) {
    await this.verifyOrganizationAccess(userId, organizationId);

    const client = this.databaseService.getAdminClient();
    const { error } = await client
      .from('letter_heads')
      .delete()
      .eq('id', letterHeadId)
      .eq('organization_id', organizationId);

    if (error) {
      throw new BadRequestException(`Failed to delete letter head: ${error.message}`);
    }
  }

  async setDefault(userId: string, organizationId: string, letterHeadId: string) {
    await this.verifyOrganizationAccess(userId, organizationId);

    const client = this.databaseService.getAdminClient();

    const { data: existing } = await client
      .from('letter_heads')
      .select('id')
      .eq('id', letterHeadId)
      .eq('organization_id', organizationId)
      .single();

    if (!existing) {
      throw new NotFoundException('Letter head not found');
    }

    await this.clearDefault(client, organizationId);

    const { data, error } = await client
      .from('letter_heads')
      .update({ is_default: true })
      .eq('id', letterHeadId)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) {
      throw new BadRequestException(`Failed to set default: ${error.message}`);
    }

    return data;
  }

  async duplicate(userId: string, organizationId: string, letterHeadId: string, newName?: string) {
    await this.verifyOrganizationAccess(userId, organizationId);

    const client = this.databaseService.getAdminClient();

    const { data: original } = await client
      .from('letter_heads')
      .select('*')
      .eq('id', letterHeadId)
      .eq('organization_id', organizationId)
      .single();

    if (!original) {
      throw new NotFoundException('Letter head not found');
    }

    const { id, created_at, updated_at, ...cloneData } = original;

    const { data, error } = await client
      .from('letter_heads')
      .insert({
        ...cloneData,
        name: newName || `${original.name} (Copy)`,
        is_default: false,
        created_by: userId,
      })
      .select()
      .single();

    if (error) {
      throw new BadRequestException(`Failed to duplicate letter head: ${error.message}`);
    }

    return data;
  }

  private async clearDefault(
    client: ReturnType<typeof this.databaseService.getAdminClient>,
    organizationId: string,
  ) {
    await client
      .from('letter_heads')
      .update({ is_default: false })
      .eq('organization_id', organizationId)
      .eq('is_default', true);
  }
}
