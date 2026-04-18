import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { EmailService } from '../email/email.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/dto/notification.dto';
import { extractPagination, paginatedResponse, type PaginatedResponse } from '../../common/dto/paginated-query.dto';
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
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Get all organization users with optional filters
   * Includes user profiles, roles, and worker info
   */
  async findAll(organizationId: string, filters?: OrganizationUserFiltersDto): Promise<PaginatedResponse<any>> {
    const client = this.databaseService.getAdminClient();

    try {
      const { page, pageSize, from, to } = extractPagination(filters);

      const applyFilters = (q: any) => {
        q = q.eq('organization_id', organizationId);
        if (filters?.is_active !== undefined) q = q.eq('is_active', filters.is_active);
        if (filters?.role_id) q = q.eq('role_id', filters.role_id);
        if (filters?.user_id) q = q.eq('user_id', filters.user_id);
        return q;
      };

      // Count
      const { count } = await applyFilters(
        client.from('organization_users').select('id', { count: 'exact', head: true }),
      );

      // Data query
      let query = client
        .from('organization_users')
        .select(`
          *,
          roles!inner(id, name, display_name),
          user_profiles!organization_users_user_profile_fkey!inner(id, first_name, last_name, email)
        `);
      query = applyFilters(query);
      query = query.order('created_at', { ascending: false }).range(from, to);

      const { data, error } = await query;

      if (error) {
        this.logger.error(`Failed to fetch organization users: ${error.message}`);
        throw new BadRequestException(`Failed to fetch organization users: ${error.message}`);
      }

      // Fetch workers separately (no direct FK between organization_users and workers)
      const userIds = (data || []).map((ou: any) => ou.user_id);
      let workerMap = new Map<string, any>();
      if (userIds.length > 0) {
        const { data: workers } = await client
          .from('workers')
          .select('id, user_id, position, is_active')
          .in('user_id', userIds);
        workerMap = new Map((workers || []).map((w: any) => [w.user_id, w]));
      }

      // Transform data
      const transformedData = (data || []).map((ou: any) => {
        const profile = Array.isArray(ou.user_profiles) ? ou.user_profiles[0] : ou.user_profiles;
        const worker = workerMap.get(ou.user_id) || null;
        return {
          ...ou,
          full_name: `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim(),
          workers: worker ? [worker] : [],
        };
      });

      return paginatedResponse(transformedData, count || 0, page, pageSize);
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
        user_profiles!organization_users_user_profile_fkey(id, first_name, last_name, email)
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

    // Fetch worker info separately (no direct FK between organization_users and workers)
    const { data: worker } = await client
      .from('workers')
      .select('id, position, is_active')
      .eq('user_id', userId)
      .maybeSingle();

    const profile = Array.isArray(data.user_profiles) ? data.user_profiles[0] : data.user_profiles;

    return {
      ...data,
      full_name: `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim(),
      workers: worker ? [worker] : [],
    };
  }

  /**
   * Add a user to an organization
   */
  async create(dto: CreateOrganizationUserDto, organizationId: string, createdBy: string): Promise<any> {
    const client = this.databaseService.getAdminClient();

    try {
      const { data: sub } = await client
        .from('subscriptions')
        .select('max_users')
        .eq('organization_id', organizationId)
        .maybeSingle();

      if (sub?.max_users != null) {
        const { count: userCount } = await client
          .from('organization_users')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', organizationId)
          .eq('is_active', true);

        if ((userCount ?? 0) >= sub.max_users) {
          throw new ForbiddenException(
            `Subscription limit reached: maximum ${sub.max_users} users for your plan`,
          );
        }
      }

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

      try {
        const { data: profile } = await client
          .from('user_profiles')
          .select('first_name, last_name')
          .eq('id', dto.user_id)
          .maybeSingle();

        const memberName = profile
          ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'A new member'
          : 'A new member';

        const { data: orgUsers } = await client
          .from('organization_users')
          .select('user_id')
          .eq('organization_id', organizationId)
          .eq('is_active', true);

        const userIds = (orgUsers || [])
          .map((u: { user_id: string }) => u.user_id)
          .filter((id: string) => id !== dto.user_id && id !== createdBy);

        if (userIds.length > 0) {
          await this.notificationsService.createNotificationsForUsers(
            userIds,
            organizationId,
            NotificationType.MEMBER_ADDED,
            `${memberName} joined the organization`,
            `${memberName} has been added to the organization`,
            { userId: dto.user_id, memberName },
          );
        }

        await this.notificationsService.createNotification({
          userId: dto.user_id,
          organizationId,
          type: NotificationType.MEMBER_ADDED,
          title: 'Welcome to the organization',
          message: 'You have been added to the organization',
          data: { userId: dto.user_id },
        });
      } catch (notifError) {
        this.logger.warn(`Failed to send member added notification: ${notifError}`);
      }

      return data;
    } catch (error) {
      this.logger.error('Error creating organization user:', error);
      throw error;
    }
  }

  /**
   * Invite a user by email to the organization
   * Creates a Supabase auth user if needed, then adds to organization
   */
  async inviteUser(
    email: string,
    roleId: string,
    organizationId: string,
    invitedBy: string,
    firstName?: string,
    lastName?: string,
  ): Promise<any> {
    const client = this.databaseService.getAdminClient();

    try {
      // Check subscription limits
      const { data: sub } = await client
        .from('subscriptions')
        .select('max_users')
        .eq('organization_id', organizationId)
        .maybeSingle();

      if (sub?.max_users != null) {
        const { count: userCount } = await client
          .from('organization_users')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', organizationId)
          .eq('is_active', true);

        if ((userCount ?? 0) >= sub.max_users) {
          throw new ForbiddenException(
            `Subscription limit reached: maximum ${sub.max_users} users for your plan`,
          );
        }
      }

      // Check if user already exists by email in user_profiles
      const { data: existingProfile } = await client
        .from('user_profiles')
        .select('id, email')
        .eq('email', email.toLowerCase())
        .maybeSingle();

      let userId: string;

      if (existingProfile) {
        userId = existingProfile.id;

        // Check if already in organization
        const { data: existingOrgUser } = await client
          .from('organization_users')
          .select('user_id, is_active')
          .eq('user_id', userId)
          .eq('organization_id', organizationId)
          .maybeSingle();

        if (existingOrgUser) {
          if (existingOrgUser.is_active) {
            throw new BadRequestException('User is already a member of this organization');
          }
          // Re-activate if previously deactivated
          await client
            .from('organization_users')
            .update({ is_active: true, role_id: roleId })
            .eq('user_id', userId)
            .eq('organization_id', organizationId);

          return { success: true, message: 'User has been re-activated in the organization' };
        }
      } else {
        // Create new auth user with temporary password
        const crypto = require('crypto');
        const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
        let tempPassword = '';
        for (let i = 0; i < 16; i++) {
          tempPassword += chars.charAt(crypto.randomInt(chars.length));
        }

        const { data: authUser, error: authError } = await client.auth.admin.createUser({
          email: email.toLowerCase(),
          password: tempPassword,
          email_confirm: true,
          user_metadata: {
            first_name: firstName || '',
            last_name: lastName || '',
          },
        });

        if (authError) {
          this.logger.error(`Failed to create auth user: ${authError.message}`);
          throw new BadRequestException(`Failed to create user: ${authError.message}`);
        }

        userId = authUser.user.id;

        // Create user profile
        await client.from('user_profiles').upsert({
          id: userId,
          email: email.toLowerCase(),
          first_name: firstName || null,
          last_name: lastName || null,
        });

        // Send invitation email
        const memberName = firstName || email;
        const emailSent = await this.emailService.sendPasswordResetEmail(
          email,
          memberName,
          tempPassword,
        );
        if (emailSent) {
          this.logger.log(`Invitation email sent to ${email}`);
        }
      }

      // Add user to organization
      return this.create(
        { user_id: userId, role_id: roleId, is_active: true },
        organizationId,
        invitedBy,
      );
    } catch (error) {
      this.logger.error('Error inviting user:', error);
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

    if (dto.role_id) {
      try {
        const { data: role } = await client
          .from('roles')
          .select('name')
          .eq('id', dto.role_id)
          .maybeSingle();

        const roleName = role?.name || 'a new role';

        await this.notificationsService.createNotification({
          userId,
          organizationId,
          type: NotificationType.ROLE_CHANGED,
          title: `Your role has been changed to ${roleName}`,
          message: `Your permissions have been updated`,
          data: { userId, roleId: dto.role_id, roleName },
        });
      } catch (notifError) {
        this.logger.warn(`Failed to send role change notification: ${notifError}`);
      }
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

    try {
      await this.notificationsService.createNotification({
        userId,
        organizationId,
        type: NotificationType.MEMBER_REMOVED,
        title: 'You have been removed from the organization',
        message: 'Your access to this organization has been revoked',
        data: { userId },
      });
    } catch (notifError) {
      this.logger.warn(`Failed to send member removed notification: ${notifError}`);
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

    // Generate new temporary password using cryptographically secure RNG
    const crypto = require('crypto');
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let tempPassword = '';
    for (let i = 0; i < 16; i++) {
      tempPassword += chars.charAt(crypto.randomInt(chars.length));
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
      const emailSent = await this.emailService.sendPasswordResetEmail(
        profile.email,
        profile.first_name || 'User',
        tempPassword,
      );
      if (emailSent) {
        this.logger.log(`Password reset email sent to ${profile.email}`);
      } else {
        this.logger.debug(`Password reset email not sent (email service disabled) to ${profile.email}`);
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
