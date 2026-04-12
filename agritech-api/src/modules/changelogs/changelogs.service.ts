import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { paginate, type PaginatedResponse } from '../../common/dto/paginated-query.dto';
import { CreateChangelogDto, UpdateChangelogDto } from './dto';

@Injectable()
export class ChangelogsService {
  private readonly logger = new Logger(ChangelogsService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  /** Public — global changelogs only */
  async findAllPublic(page = 1, pageSize = 20): Promise<PaginatedResponse<any>> {
    const client = this.databaseService.getAdminClient();

    return paginate(client, 'changelogs', {
      filters: (q) => q.eq('is_global', true),
      page,
      pageSize,
      orderBy: 'published_at',
      ascending: false,
    });
  }

  /** Authenticated — global + org-specific */
  async findAll(organizationId: string, page = 1, pageSize = 20): Promise<PaginatedResponse<any>> {
    const client = this.databaseService.getAdminClient();

    return paginate(client, 'changelogs', {
      filters: (q) =>
        q.or(
          `is_global.eq.true,organization_id.eq.${organizationId}`,
        ),
      page,
      pageSize,
      orderBy: 'published_at',
      ascending: false,
    });
  }

  async findOne(id: string): Promise<any> {
    const client = this.databaseService.getAdminClient();
    const { data, error } = await client
      .from('changelogs')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      this.logger.error(`Failed to fetch changelog: ${error.message}`);
      throw new BadRequestException(`Failed to fetch changelog: ${error.message}`);
    }

    if (!data) throw new NotFoundException('Changelog not found');
    return data;
  }

  async create(dto: CreateChangelogDto, organizationId: string, createdBy: string): Promise<any> {
    const client = this.databaseService.getAdminClient();

    const { data, error } = await client
      .from('changelogs')
      .insert({
        organization_id: dto.is_global ? null : organizationId,
        title: dto.title,
        description: dto.description,
        version: dto.version,
        category: dto.category ?? 'feature',
        published_at: dto.published_at ?? new Date().toISOString(),
        is_global: dto.is_global ?? false,
        created_by: createdBy,
      })
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to create changelog: ${error.message}`);
      throw new BadRequestException(`Failed to create changelog: ${error.message}`);
    }

    return data;
  }

  async update(id: string, dto: UpdateChangelogDto): Promise<any> {
    await this.findOne(id);
    const client = this.databaseService.getAdminClient();

    const { data, error } = await client
      .from('changelogs')
      .update(dto)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to update changelog: ${error.message}`);
      throw new BadRequestException(`Failed to update changelog: ${error.message}`);
    }

    return data;
  }

  async delete(id: string): Promise<void> {
    await this.findOne(id);
    const client = this.databaseService.getAdminClient();

    const { error } = await client
      .from('changelogs')
      .delete()
      .eq('id', id);

    if (error) {
      this.logger.error(`Failed to delete changelog: ${error.message}`);
      throw new BadRequestException(`Failed to delete changelog: ${error.message}`);
    }
  }
}
