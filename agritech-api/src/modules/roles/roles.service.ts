import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class RolesService {
  private readonly logger = new Logger(RolesService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Get all active roles
   */
  async findAll() {
    const client = this.databaseService.getAdminClient();

    const { data, error } = await client
      .from('roles')
      .select('*')
      .eq('is_active', true)
      .order('level', { ascending: true });

    if (error) {
      this.logger.error(`Failed to fetch roles: ${error.message}`);
      throw new BadRequestException(`Failed to fetch roles: ${error.message}`);
    }

    return data || [];
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
