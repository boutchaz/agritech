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
      // Use Supabase client to verify the token
      const client = this.databaseService.getClient();
      const {
        data: { user },
        error,
      } = await client.auth.getUser(token);

      if (error || !user) {
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

    // 1. Create Supabase user
    const { data: authData, error: authError } =
      await adminClient.auth.admin.createUser({
        email: signupDto.email,
        password: signupDto.password,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          full_name: `${signupDto.firstName} ${signupDto.lastName}`,
          first_name: signupDto.firstName,
          last_name: signupDto.lastName,
          phone: signupDto.phone || null,
          invited_to_organization: signupDto.invitedToOrganization || null,
          invited_with_role: signupDto.invitedWithRole || null,
        },
      });

    if (authError || !authData.user) {
      this.logger.error(`Failed to create user: ${authError?.message}`);
      throw new BadRequestException(
        authError?.message || 'Failed to create user',
      );
    }

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
        const { error: orgUserError } = await adminClient
          .from('organization_users')
          .insert({
            user_id: userId,
            organization_id: organizationId,
            role_id: roleId,
            is_active: true,
          });

        if (orgUserError) {
          this.logger.error(
            `Failed to add user to organization: ${orgUserError.message}`,
          );
          throw new BadRequestException('Failed to join organization');
        }
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

        // Add user to organization as admin
        const { error: orgUserError } = await adminClient
          .from('organization_users')
          .insert({
            user_id: userId,
            organization_id: organizationId,
            role_id: orgAdminRoleId,
            is_active: true,
          });

        if (orgUserError) {
          this.logger.error(
            `Failed to add user to organization: ${orgUserError.message}`,
          );
          throw new BadRequestException(
            'Failed to add user as organization admin',
          );
        }
      }

      // 5. Generate session tokens
      const { data: sessionData, error: sessionError } =
        await adminClient.auth.signInWithPassword({
          email: signupDto.email,
          password: signupDto.password,
        });

      if (sessionError || !sessionData.session) {
        this.logger.error(`Failed to create session: ${sessionError?.message}`);
        throw new BadRequestException('Failed to create session');
      }

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
        session: {
          access_token: sessionData.session.access_token,
          refresh_token: sessionData.session.refresh_token,
          expires_in: sessionData.session.expires_in,
        },
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
}
