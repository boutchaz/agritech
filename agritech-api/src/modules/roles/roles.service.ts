import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { paginatedResponse, type PaginatedResponse } from '../../common/dto/paginated-query.dto';

@Injectable()
export class RolesService {
  private readonly logger = new Logger(RolesService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Get all active roles
   */
  async findAll(
    pagination: { page?: number; pageSize?: number } = {},
  ): Promise<PaginatedResponse<any>> {
    const client = this.databaseService.getAdminClient();
    const page = Math.max(1, Number(pagination.page) || 1);
    const pageSize = Math.max(1, Math.min(100, Number(pagination.pageSize) || 100));
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const apply = (q: any) =>
      q.eq('is_active', true).neq('name', 'internal_admin');

    const { count } = await apply(
      client.from('roles').select('id', { count: 'exact', head: true }),
    );
    const { data, error } = await apply(client.from('roles').select('*'))
      .order('level', { ascending: true })
      .range(from, to);

    if (error) {
      this.logger.error(`Failed to fetch roles: ${error.message}`);
      throw new BadRequestException(`Failed to fetch roles: ${error.message}`);
    }

    return paginatedResponse(data ?? [], count ?? 0, page, pageSize);
  }

  /**
   * Get a single role by ID
   */
  async findOne(id: string) {
    const client = this.databaseService.getAdminClient();

    const { data, error } = await client
      .from('roles')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      this.logger.error(`Failed to fetch role: ${error.message}`);
      throw new BadRequestException(`Failed to fetch role: ${error.message}`);
    }

    return data;
  }

  /**
   * Get a role by name
   */
  async findByName(name: string) {
    const client = this.databaseService.getAdminClient();

    const { data, error } = await client
      .from('roles')
      .select('*')
      .eq('name', name)
      .single();

    if (error) {
      this.logger.error(`Failed to fetch role by name: ${error.message}`);
      throw new BadRequestException(`Failed to fetch role by name: ${error.message}`);
    }

    return data;
  }
}
