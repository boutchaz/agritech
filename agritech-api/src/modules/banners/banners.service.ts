import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { paginate, type PaginatedResponse } from '../../common/dto/paginated-query.dto';
import { CreateBannerDto, UpdateBannerDto } from './dto';

@Injectable()
export class BannersService {
  private readonly logger = new Logger(BannersService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  async findAll(page = 1, pageSize = 50): Promise<PaginatedResponse<any>> {
    const client = this.databaseService.getAdminClient();

    return paginate(client, 'banners', {
      page,
      pageSize,
      orderBy: 'created_at',
      ascending: false,
    });
  }

  async findActive(organizationId?: string, userId?: string, userRole?: string): Promise<any[]> {
    const client = this.databaseService.getAdminClient();
    const now = new Date().toISOString();

    let query = client
      .from('banners')
      .select('*')
      .eq('enabled', true)
      .lte('start_at', now)
      .or(`end_at.is.null,end_at.gte.${now}`)
      .order('priority', { ascending: false })
      .limit(5);

    // Show global banners (null org) + org-specific banners
    if (organizationId) {
      query = query.or(`organization_id.is.null,organization_id.eq.${organizationId}`);
    } else {
      query = query.is('organization_id', null);
    }

    const { data, error } = await query;

    if (error) {
      this.logger.error(`Failed to fetch active banners: ${error.message}`);
      return [];
    }

    if (!data || data.length === 0) return [];

    if (userId) {
      const dismissed = await client
        .from('banner_dismissals')
        .select('banner_id')
        .eq('user_id', userId)
        .in('banner_id', data.map((b) => b.id));

      const dismissedIds = new Set(dismissed.data?.map((d) => d.banner_id) || []);
      const filtered = data.filter((b) => !dismissedIds.has(b.id) || !b.dismissible);

      for (const banner of filtered) {
        await client
          .from('banners')
          .update({ impressions: banner.impressions + 1 })
          .eq('id', banner.id);
      }

      return filtered;
    }

    return data;
  }

  async findOne(id: string): Promise<any> {
    const client = this.databaseService.getAdminClient();
    const { data, error } = await client
      .from('banners')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      this.logger.error(`Failed to fetch banner: ${error.message}`);
      throw new BadRequestException(`Failed to fetch banner: ${error.message}`);
    }

    if (!data) throw new NotFoundException('Banner not found');
    return data;
  }

  async create(dto: CreateBannerDto, createdBy: string): Promise<any> {
    const client = this.databaseService.getAdminClient();

    const { data, error } = await client
      .from('banners')
      .insert({
        organization_id: dto.organization_id ?? null,
        title: dto.title,
        message: dto.message,
        severity: dto.severity ?? 'info',
        audience: dto.audience ?? 'all',
        enabled: dto.enabled ?? true,
        dismissible: dto.dismissible ?? true,
        cta_label: dto.cta_label,
        cta_url: dto.cta_url,
        priority: dto.priority ?? 0,
        start_at: dto.start_at ?? new Date().toISOString(),
        end_at: dto.end_at,
        created_by: createdBy,
      })
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to create banner: ${error.message}`);
      throw new BadRequestException(`Failed to create banner: ${error.message}`);
    }

    return data;
  }

  async update(id: string, dto: UpdateBannerDto): Promise<any> {
    await this.findOne(id);
    const client = this.databaseService.getAdminClient();

    const { data, error } = await client
      .from('banners')
      .update(dto)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to update banner: ${error.message}`);
      throw new BadRequestException(`Failed to update banner: ${error.message}`);
    }

    return data;
  }

  async delete(id: string): Promise<void> {
    await this.findOne(id);
    const client = this.databaseService.getAdminClient();

    const { error } = await client
      .from('banners')
      .delete()
      .eq('id', id);

    if (error) {
      this.logger.error(`Failed to delete banner: ${error.message}`);
      throw new BadRequestException(`Failed to delete banner: ${error.message}`);
    }
  }

  async dismiss(bannerId: string, userId: string): Promise<void> {
    const client = this.databaseService.getAdminClient();

    const { error } = await client
      .from('banner_dismissals')
      .upsert({ banner_id: bannerId, user_id: userId }, { onConflict: 'banner_id,user_id' });

    if (error) {
      this.logger.error(`Failed to dismiss banner: ${error.message}`);
      throw new BadRequestException(`Failed to dismiss banner: ${error.message}`);
    }

    const { data: banner } = await client
      .from('banners')
      .select('dismissals')
      .eq('id', bannerId)
      .single();

    if (banner) {
      await client
        .from('banners')
        .update({ dismissals: (banner.dismissals || 0) + 1 })
        .eq('id', bannerId);
    }
  }
}
