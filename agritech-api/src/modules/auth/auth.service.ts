import {
  Injectable,
  UnauthorizedException,
  Logger,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DatabaseService } from '../database/database.service';
import { SignupDto } from './dto/signup.dto';
import { UsersService } from '../users/users.service';
import { OrganizationsService } from '../organizations/organizations.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private databaseService: DatabaseService,
    private jwtService: JwtService,
    private usersService: UsersService,
    private organizationsService: OrganizationsService,
  ) { }

  /**
   * Validate a Supabase JWT token
   */
  async validateToken(token: string): Promise<any> {
    try {
      // Use admin client to verify the token - it can validate any user's token
      const adminClient = this.databaseService.getAdminClient();
      const {
        data: { user },
        error,
      } = await adminClient.auth.getUser(token);

      if (error || !user) {
        this.logger.error(`Token validation error: ${error?.message}`);
        throw new UnauthorizedException('Invalid token');
      }

      return user;
    } catch (error) {
      this.logger.error(`Token validation failed: ${error.message}`);
      throw new UnauthorizedException('Invalid token');
    }
  }

  /**
   * Get user profile with organization and role information
   */
  async getUserProfile(userId: string) {
    const client = this.databaseService.getAdminClient();

    const { data: profile, error } = await client
      .from('user_profiles')
      .select(
        `
        *,
        organization_users (
          organization_id,
          role_id,
          is_active,
          organizations (
            id,
            name,
            subscription_plan
          ),
          roles (
            id,
            name,
            display_name,
            level
          )
        )
      `,
      )
      .eq('id', userId)
      .single();

    if (error) {
      this.logger.error(`Failed to get user profile: ${error.message}`);
      throw new UnauthorizedException('User profile not found');
    }

    return profile;
  }

  /**
   * Check if user has required role level
   * Roles hierarchy: system_admin(1) > organization_admin(2) > farm_manager(3) > farm_worker(4) > day_laborer(5) > viewer(6)
   */
  async hasRequiredRole(
    userId: string,
    organizationId: string,
    requiredLevel: number,
  ): Promise<boolean> {
    const client = this.databaseService.getAdminClient();

    const { data, error } = await client
      .from('organization_users')
      .select('role_id, roles(level)')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      return false;
    }

    return (data.roles as any).level <= requiredLevel;
  }

  /**
   * Get user's organizations
   */
  async getUserOrganizations(userId: string) {
    const client = this.databaseService.getAdminClient();

    const { data, error } = await client
      .from('organization_users')
      .select(
        `
        organization_id,
        role_id,
        is_active,
        organizations (
          id,
          name,
          description,
          subscription_plan,
          is_active
        ),
        roles (
          id,
          name,
          display_name
        )
      `,
      )
      .eq('user_id', userId)
      .eq('is_active', true);

    if (error) {
      this.logger.error(`Failed to get user organizations: ${error.message}`);
      return [];
    }

    return data;
  }

  /**
   * Signup - Create user, profile, and organization
   */
  async signup(signupDto: SignupDto) {
    const adminClient = this.databaseService.getAdminClient();
    const regularClient = this.databaseService.getClient();

    // 1. Create Supabase user using regular signUp
    // IMPORTANT: Requires ENABLE_EMAIL_AUTOCONFIRM=true in Supabase config
    // This ensures passwords are properly hashed for signInWithPassword
    this.logger.log(`Creating user with email: ${signupDto.email}`);

    const { data: signUpData, error: signUpError } =
      await regularClient.auth.signUp({
        email: signupDto.email,
        password: signupDto.password,
        options: {
          data: {
            full_name: `${signupDto.firstName} ${signupDto.lastName}`,
            first_name: signupDto.firstName,
            last_name: signupDto.lastName,
            phone: signupDto.phone || null,
            invited_to_organization: signupDto.invitedToOrganization || null,
            invited_with_role: signupDto.invitedWithRole || null,
          },
          // Skip email confirmation redirect
          emailRedirectTo: undefined,
        },
      });

    if (signUpError || !signUpData.user) {
      this.logger.error(`Failed to create user: ${signUpError?.message}`);
      throw new BadRequestException(
        signUpError?.message || 'Failed to create user',
      );
    }

    this.logger.log(`User created successfully: ${signUpData.user.id}`);

    const authData = signUpData;

    const userId = authData.user.id;
    const email = authData.user.email;
    const fullName = `${signupDto.firstName} ${signupDto.lastName}`;

    try {
      // 2. Create user profile using UsersService (migrated from RPC)
      await this.usersService.createProfile({
        userId,
        email,
        firstName: signupDto.firstName,
        lastName: signupDto.lastName,
        fullName,
        phone: signupDto.phone || undefined,
        language: 'fr',
        timezone: 'Africa/Casablanca',
        onboardingCompleted: false,
        passwordSet: true,
      });

      let organizationId: string;
      let organizationName: string;
      let organizationSlug: string;

      // 3. Check if user was invited to an organization
      if (signupDto.invitedToOrganization) {
        // User was invited - add to existing organization
        organizationId = signupDto.invitedToOrganization;

        // Get organization details
        const { data: org, error: orgError } = await adminClient
          .from('organizations')
          .select('id, name, slug')
          .eq('id', organizationId)
          .single();

        if (orgError || !org) {
          this.logger.error(
            `Organization not found: ${signupDto.invitedToOrganization}`,
          );
          throw new BadRequestException('Invited organization not found');
        }

        organizationName = org.name;
        organizationSlug = org.slug;

        // Get role (use invited role or default to organization_admin)
        const roleId =
          signupDto.invitedWithRole ||
          (await this.getOrgAdminRoleId(adminClient));

        // Add user to organization
        this.logger.log(`Creating organization_users record (invited): user_id=${userId}, organization_id=${organizationId}, role_id=${roleId}`);
        const { data: orgUserData, error: orgUserError } = await adminClient
          .from('organization_users')
          .insert({
            user_id: userId,
            organization_id: organizationId,
            role_id: roleId,
            is_active: true,
          })
          .select()
          .single();

        if (orgUserError) {
          this.logger.error(
            `Failed to add user to organization: ${orgUserError.message}, code: ${orgUserError.code}, details: ${JSON.stringify(orgUserError.details)}`,
          );
          throw new BadRequestException('Failed to join organization');
        }
        this.logger.log(`Successfully created organization_users record (invited): ${JSON.stringify(orgUserData)}`);
      } else {
        // 4. No invitation - Create new organization using OrganizationsService
        organizationName =
          signupDto.organizationName ||
          `${signupDto.firstName}'s Organization`;

        const newOrg = await this.organizationsService.create({
          name: organizationName,
          currencyCode: 'MAD',
          timezone: 'Africa/Casablanca',
          isActive: true,
        });

        organizationId = newOrg.id;
        organizationSlug = newOrg.slug;

        // Get organization_admin role
        const orgAdminRoleId = await this.getOrgAdminRoleId(adminClient);
        this.logger.log(`Got organization_admin role ID: ${orgAdminRoleId}`);

        // Add user to organization as admin
        this.logger.log(`Creating organization_users record: user_id=${userId}, organization_id=${organizationId}, role_id=${orgAdminRoleId}`);
        const { data: orgUserData, error: orgUserError } = await adminClient
          .from('organization_users')
          .insert({
            user_id: userId,
            organization_id: organizationId,
            role_id: orgAdminRoleId,
            is_active: true,
          })
          .select()
          .single();

        if (orgUserError) {
          this.logger.error(
            `Failed to add user to organization: ${orgUserError.message}, code: ${orgUserError.code}, details: ${JSON.stringify(orgUserError.details)}`,
          );
          throw new BadRequestException(
            'Failed to add user as organization admin',
          );
        }
        this.logger.log(`Successfully created organization_users record: ${JSON.stringify(orgUserData)}`);
      }

      // 5. Return user info - frontend will handle the login
      // Note: Supabase admin API cannot generate sessions via signInWithPassword
      // The frontend should call Supabase directly to sign in after signup
      this.logger.log(`User ${userId} created successfully, frontend will handle session creation`);

      this.logger.log(
        `User ${email} signed up successfully with organization ${organizationName}`,
      );

      return {
        user: {
          id: userId,
          email: email,
          fullName: fullName,
        },
        organization: {
          id: organizationId,
          name: organizationName,
          slug: organizationSlug,
        },
        // No session - frontend must call Supabase signInWithPassword directly
        requiresLogin: true,
      };
    } catch (error) {
      // Rollback: Delete the auth user if anything fails
      this.logger.error(`Signup failed, rolling back user: ${error.message}`);
      await adminClient.auth.admin.deleteUser(userId);
      throw error;
    }
  }

  /**
   * Get organization_admin role ID
   */
  private async getOrgAdminRoleId(adminClient: any): Promise<string> {
    const { data: role, error } = await adminClient
      .from('roles')
      .select('id')
      .eq('name', 'organization_admin')
      .single();

    if (error || !role) {
      this.logger.error('Failed to get organization_admin role');
      throw new BadRequestException('Organization admin role not found');
    }

    return role.id;
  }

  /**
   * Get user role and permissions for a specific organization
   * Returns role info and all permissions granted to that role
   */
  async getUserRoleAndPermissions(userId: string, organizationId: string) {
    const client = this.databaseService.getAdminClient();

    // Get user's role in the organization
    const { data: orgUser, error: orgUserError } = await client
      .from('organization_users')
      .select(`
        role_id,
        roles (
          id,
          name,
          display_name,
          level
        )
      `)
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .maybeSingle();

    if (orgUserError) {
      this.logger.error(`Error fetching user role: ${orgUserError.message}`);
      throw new BadRequestException('Failed to fetch user role');
    }

    if (!orgUser || !orgUser.roles) {
      return {
        role: null,
        permissions: [],
      };
    }

    const role = orgUser.roles as any;

    // Get permissions for this role
    const { data: rolePermissions, error: permissionsError } = await client
      .from('role_permissions')
      .select(`
        permissions (
          name,
          display_name,
          resource,
          action
        )
      `)
      .eq('role_id', role.id);

    if (permissionsError) {
      this.logger.warn(`Error fetching permissions: ${permissionsError.message}`);
      // Continue without permissions
    }

    // Format response to match frontend expectations
    return {
      role: {
        role_name: role.name,
        role_display_name: role.display_name,
        role_level: role.level,
      },
      permissions: (rolePermissions || []).map((rp: any) => ({
        permission_name: rp.permissions.name,
        resource: rp.permissions.resource,
        action: rp.permissions.action,
      })),
    };
  }
}
