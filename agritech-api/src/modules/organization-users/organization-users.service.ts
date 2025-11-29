import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import {
  OrganizationUserFiltersDto,
  CreateOrganizationUserDto,
  UpdateOrganizationUserDto,
} from './dto';

@Injectable()
export class OrganizationUsersService {
  private readonly logger = new Logger(OrganizationUsersService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Get all organization users with optional filters
   * Includes user profiles, roles, and worker info
   */
  async findAll(organizationId: string, filters?: OrganizationUserFiltersDto): Promise<any> {
    const client = this.databaseService.getAdminClient();

    try {
      // Build query with joins
      let query = client
        .from('organization_users')
        .select(`
          *,
          roles!inner(id, name, display_name),
          user_profiles!inner(id, first_name, last_name, email),
          workers(id, position, is_active)
        `)
        .eq('organization_id', organizationId);

      // Apply filters
      if (filters?.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active);
      }

      if (filters?.role_id) {
        query = query.eq('role_id', filters.role_id);
      }

      if (filters?.user_id) {
        query = query.eq('user_id', filters.user_id);
      }

      // Apply pagination
      if (filters?.page && filters?.limit) {
        const offset = (filters.page - 1) * filters.limit;
        query = query.range(offset, offset + filters.limit - 1);
      }

      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        this.logger.error(`Failed to fetch organization users: ${error.message}`);
        throw new BadRequestException(`Failed to fetch organization users: ${error.message}`);
      }

      // Transform data to include full_name
      const transformedData = (data || []).map((ou: any) => {
        const profile = Array.isArray(ou.user_profiles) ? ou.user_profiles[0] : ou.user_profiles;
        return {
          ...ou,
          full_name: `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim(),
        };
      });

      return transformedData;
    } catch (error) {
      this.logger.error('Error fetching organization users:', error);
      throw error;
    }
  }

  /**
   * Get assignable users for task assignment
   * Excludes viewers and day_laborers
   */
  async getAssignableUsers(organizationId: string): Promise<any> {
    const client = this.databaseService.getAdminClient();

    try {
      const { data, error } = await client
        .from('organization_users')
        .select(`
          user_id,
          organization_id,
          role_id,
          roles!inner(name, display_name),
          user_profiles!inner(id, first_name, last_name),
          workers(id, position, is_active)
        `)
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .not('roles.name', 'in', '(viewer,day_laborer)');

      if (error) {
        this.logger.error(`Failed to fetch assignable users: ${error.message}`);
        throw new BadRequestException(`Failed to fetch assignable users: ${error.message}`);
      }

      // Transform to match expected format
      const assignableUsers = (data || []).map((ou: any) => {
        const profile = Array.isArray(ou.user_profiles) ? ou.user_profiles[0] : ou.user_profiles;
        const role = Array.isArray(ou.roles) ? ou.roles[0] : ou.roles;
        const worker = Array.isArray(ou.workers) ? ou.workers[0] : ou.workers;

        return {
          user_id: ou.user_id,
          first_name: profile?.first_name || '',
          last_name: profile?.last_name || '',
          full_name: `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim(),
          organization_id: ou.organization_id,
          role: role?.name || 'viewer',
          worker_id: worker?.id || null,
          worker_position: worker?.position || null,
          user_type: worker ? ('worker' as const) : ('user' as const),
        };
      });

      return assignableUsers;
    } catch (error) {
      this.logger.error('Error fetching assignable users:', error);
      throw error;
    }
  }

  /**
   * Get a single organization user
   */
  async findOne(userId: string, organizationId: string): Promise<any> {
    const client = this.databaseService.getAdminClient();

    const { data, error } = await client
      .from('organization_users')
      .select(`
        *,
        roles(id, name, display_name),
        user_profiles(id, first_name, last_name, email),
        workers(id, position, is_active)
      `)
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (error) {
      this.logger.error(`Failed to fetch organization user: ${error.message}`);
      throw new BadRequestException(`Failed to fetch organization user: ${error.message}`);
    }

    if (!data) {
      throw new NotFoundException('Organization user not found');
    }

    const profile = Array.isArray(data.user_profiles) ? data.user_profiles[0] : data.user_profiles;

    return {
      ...data,
      full_name: `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim(),
    };
  }

  /**
   * Add a user to an organization
   */
  async create(dto: CreateOrganizationUserDto, organizationId: string, createdBy: string): Promise<any> {
    const client = this.databaseService.getAdminClient();

    try {
      const { data, error } = await client
        .from('organization_users')
        .insert({
          organization_id: organizationId,
          user_id: dto.user_id,
          role_id: dto.role_id,
          is_active: dto.is_active !== undefined ? dto.is_active : true,
          created_by: createdBy,
        })
        .select()
        .single();

      if (error) {
        this.logger.error(`Failed to create organization user: ${error.message}`);
        throw new BadRequestException(`Failed to create organization user: ${error.message}`);
      }

      return data;
    } catch (error) {
      this.logger.error('Error creating organization user:', error);
      throw error;
    }
  }

  /**
   * Update an organization user (typically role or active status)
   */
  async update(userId: string, organizationId: string, dto: UpdateOrganizationUserDto): Promise<any> {
    const client = this.databaseService.getAdminClient();

    // Verify user exists in organization
    await this.findOne(userId, organizationId);

    const { data, error } = await client
      .from('organization_users')
      .update(dto)
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to update organization user: ${error.message}`);
      throw new BadRequestException(`Failed to update organization user: ${error.message}`);
    }

    return data;
  }

  /**
   * Remove a user from an organization (soft delete)
   */
  async delete(userId: string, organizationId: string): Promise<any> {
    const client = this.databaseService.getAdminClient();

    // Verify user exists in organization
    await this.findOne(userId, organizationId);

    const { error } = await client
      .from('organization_users')
      .update({ is_active: false })
      .eq('user_id', userId)
      .eq('organization_id', organizationId);

    if (error) {
      this.logger.error(`Failed to deactivate organization user: ${error.message}`);
      throw new BadRequestException(`Failed to deactivate organization user: ${error.message}`);
    }

    return { message: 'User removed from organization successfully' };
  }
}
