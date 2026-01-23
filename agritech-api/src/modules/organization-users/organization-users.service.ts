import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { EmailService } from '../email/email.service';
import {
  OrganizationUserFiltersDto,
  CreateOrganizationUserDto,
  UpdateOrganizationUserDto,
} from './dto';

@Injectable()
export class OrganizationUsersService {
  private readonly logger = new Logger(OrganizationUsersService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly emailService: EmailService,
  ) {}

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
          user_profiles!organization_users_user_id_fkey!inner(id, first_name, last_name, email),
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
      // First get organization users with their roles
      const { data: orgUsers, error: orgUsersError } = await client
        .from('organization_users')
        .select(`
          user_id,
          organization_id,
          role_id,
          roles!inner(name, display_name)
        `)
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .not('roles.name', 'in', '(viewer,day_laborer)');

      if (orgUsersError) {
        this.logger.error(`Failed to fetch organization users: ${orgUsersError.message}`);
        throw new BadRequestException(`Failed to fetch assignable users: ${orgUsersError.message}`);
      }

      if (!orgUsers || orgUsers.length === 0) {
        return [];
      }

      // Get user IDs for profile lookup
      const userIds = orgUsers.map((ou: any) => ou.user_id);

      // Fetch user profiles separately
      const { data: profiles, error: profilesError } = await client
        .from('user_profiles')
        .select('id, first_name, last_name')
        .in('id', userIds);

      if (profilesError) {
        this.logger.warn(`Failed to fetch user profiles: ${profilesError.message}`);
        // Continue without profiles
      }

      // Fetch workers for these users
      const { data: workers, error: workersError } = await client
        .from('workers')
        .select('id, user_id, position, is_active')
        .in('user_id', userIds)
        .eq('is_active', true);

      if (workersError) {
        this.logger.warn(`Failed to fetch workers: ${workersError.message}`);
        // Continue without workers
      }

      // Create lookup maps
      const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));
      const workerMap = new Map((workers || []).map((w: any) => [w.user_id, w]));

      // Transform to match expected format
      const assignableUsers = orgUsers.map((ou: any) => {
        const profile = profileMap.get(ou.user_id);
        const role = Array.isArray(ou.roles) ? ou.roles[0] : ou.roles;
        const worker = workerMap.get(ou.user_id);

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
        user_profiles!organization_users_user_id_fkey(id, first_name, last_name, email),
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

  /**
   * Get temporary password for a worker user
   * Organization admins can view the temporary password for worker accounts
   */
  async getTempPassword(userId: string, organizationId: string): Promise<any> {
    const client = this.databaseService.getAdminClient();

    // First verify user is in the organization
    const { data: orgUser } = await client
      .from('organization_users')
      .select('user_id')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (!orgUser) {
      throw new NotFoundException('User not found in organization');
    }

    // Check if this is a worker with a temporary password
    const { data: worker } = await client
      .from('workers')
      .select('temp_password, temp_password_expires_at')
      .eq('user_id', userId)
      .maybeSingle();

    if (!worker) {
      throw new NotFoundException('User is not a worker or has no temporary password');
    }

    if (!worker.temp_password) {
      throw new NotFoundException('No temporary password available. The password may have been used or expired.');
    }

    // Check if password has expired
    if (worker.temp_password_expires_at) {
      const expiresAt = new Date(worker.temp_password_expires_at);
      if (expiresAt < new Date()) {
        throw new Error('Temporary password has expired. Please reset the password.');
      }
    }

    return {
      temp_password: worker.temp_password,
      expires_at: worker.temp_password_expires_at,
    };
  }

  /**
   * Reset password for a user in the organization
   * Generates a new temporary password and returns it
   */
  async resetPassword(userId: string, organizationId: string): Promise<any> {
    const client = this.databaseService.getAdminClient();

    // Verify user is in the organization
    await this.findOne(userId, organizationId);

    // Check if this is a worker
    const { data: worker } = await client
      .from('workers')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    const isWorker = !!worker;

    // Generate new temporary password
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let tempPassword = '';
    for (let i = 0; i < 16; i++) {
      tempPassword += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // Update Supabase auth user password
    const { error: updateError } = await client.auth.admin.updateUserById(userId, {
      password: tempPassword,
    });

    if (updateError) {
      throw new BadRequestException(`Failed to reset password: ${updateError.message}`);
    }

    // If this is a worker, store the temporary password with expiration
    if (worker) {
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      const { error: workerUpdateError } = await client
        .from('workers')
        .update({
          temp_password: tempPassword,
          temp_password_expires_at: expiresAt.toISOString(),
        })
        .eq('user_id', userId);

      if (workerUpdateError) {
        this.logger.warn(`Failed to store worker temp password: ${workerUpdateError.message}`);
        // Non-fatal - continue anyway
      }
    }

    // Get user email and name for sending the email
    const { data: profile } = await client
      .from('user_profiles')
      .select('email, first_name')
      .eq('id', userId)
      .maybeSingle();

    // Send password reset email
    if (profile?.email) {
      try {
        await this.emailService.sendPasswordResetEmail(
          profile.email,
          profile.first_name || 'User',
          tempPassword,
        );
        this.logger.log(`Password reset email sent to ${profile.email}`);
      } catch (emailError) {
        this.logger.warn(`Failed to send password reset email: ${emailError.message}`);
        // Non-fatal - password was reset successfully
      }
    }

    return {
      success: true,
      temp_password: tempPassword,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      message: 'Password has been reset. Please share the new temporary password with the user.',
    };
  }
}
