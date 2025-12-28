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
import { DemoDataService } from '../demo-data/demo-data.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private databaseService: DatabaseService,
    private jwtService: JwtService,
    private usersService: UsersService,
    private organizationsService: OrganizationsService,
    private demoDataService: DemoDataService,
  ) { }

  /**
   * Login - Authenticate user with email and password
   */
  async login(email: string, password: string) {
    const client = this.databaseService.getClient();

    this.logger.log(`Login attempt for email: ${email}`);

    try {
      const { data, error } = await client.auth.signInWithPassword({
        email,
        password,
      });

      if (error || !data.user) {
        this.logger.error(`Login failed for ${email}: ${JSON.stringify(error, null, 2)}`);
        this.logger.error(`Error details - code: ${error?.code}, status: ${error?.status}, message: ${error?.message}`);
        throw new UnauthorizedException('Invalid email or password');
      }

      this.logger.log(`User ${email} logged in successfully`);
      return {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_in: data.session.expires_in,
        user: {
          id: data.user.id,
          email: data.user.email,
          fullName: data.user.user_metadata?.full_name || '',
        },
      };
    } catch (err) {
      this.logger.error(`Login exception for ${email}: ${err.message}`);
      this.logger.error(`Exception stack: ${err.stack}`);
      throw new UnauthorizedException('Invalid email or password');
    }
  }

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

    // First try to get user_profile
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

    if (!error && profile) {
      return profile;
    }

    // If no profile exists, fall back to basic Supabase auth user data
    // This is for marketplace-only users who don't have full profiles
    this.logger.warn(`No user_profile found for ${userId}, falling back to auth user data`);

    const { data: authUser, error: authError } = await client.auth.admin.getUserById(userId);

    if (authError || !authUser) {
      this.logger.error(`Failed to get auth user: ${authError?.message}`);
      throw new UnauthorizedException('User not found');
    }

    // Get user's organizations
    const { data: orgUsers } = await client
      .from('organization_users')
      .select(`
        organization_id,
        role_id,
        is_active,
        organizations!inner (
          id,
          name,
          subscription_plan,
          slug
        )
      `)
      .eq('user_id', userId);

    // Return a simplified profile for marketplace users
    const firstOrg = orgUsers && orgUsers.length > 0 ? orgUsers[0] : null;
    const organization = firstOrg?.organizations as any;

    return {
      id: authUser.user.id,
      email: authUser.user.email,
      first_name: authUser.user.user_metadata?.first_name || '',
      last_name: authUser.user.user_metadata?.last_name || '',
      full_name: authUser.user.user_metadata?.full_name || authUser.user.email,
      phone: authUser.user.user_metadata?.phone || authUser.user.phone || null,
      organization_users: orgUsers || [],
      // For marketplace users, provide the first organization if available
      ...(organization && {
        organization_id: organization.id,
        organization_name: organization.name,
        organization_slug: organization.slug,
      }),
    };
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
   * Supports flexible signup for marketplace:
   * - Individual users can provide displayName instead of firstName/lastName
   * - Business/farm users can provide organizationName as their display name
   */
  async signup(signupDto: SignupDto) {
    const adminClient = this.databaseService.getAdminClient();

    // Derive firstName and lastName from available data
    // Priority: explicit firstName/lastName > displayName > organizationName > default
    let firstName = signupDto.firstName;
    let lastName = signupDto.lastName;

    if (!firstName && !lastName) {
      if (signupDto.displayName) {
        // Split displayName into firstName and lastName
        const parts = signupDto.displayName.trim().split(/\s+/);
        firstName = parts[0] || 'User';
        lastName = parts.slice(1).join(' ') || '';
      } else if (signupDto.organizationName) {
        // Use organization name as display name for business/farm accounts
        firstName = signupDto.organizationName;
        lastName = '';
      } else {
        // Default fallback
        firstName = 'User';
        lastName = '';
      }
    } else {
      // Ensure we have at least firstName
      firstName = firstName || 'User';
      lastName = lastName || '';
    }

    const fullName = lastName ? `${firstName} ${lastName}` : firstName;

    // 1. Create Supabase user using admin API to bypass email confirmation
    // Using admin client allows us to create confirmed users directly
    this.logger.log(`Creating user with email: ${signupDto.email}`);

    const { data: signUpData, error: signUpError } =
      await adminClient.auth.admin.createUser({
        email: signupDto.email,
        password: signupDto.password,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          full_name: fullName,
          first_name: firstName,
          last_name: lastName,
          phone: signupDto.phone || null,
          invited_to_organization: signupDto.invitedToOrganization || null,
          invited_with_role: signupDto.invitedWithRole || null,
          seller_type: signupDto.sellerType || 'individual',
        },
      });

    if (signUpError || !signUpData.user) {
      this.logger.error(`Failed to create user: ${JSON.stringify(signUpError, null, 2)}`);
      this.logger.error(`Signup error details - code: ${signUpError?.code}, status: ${signUpError?.status}, message: ${signUpError?.message}`);
      throw new BadRequestException(
        signUpError?.message || 'Failed to create user',
      );
    }

    this.logger.log(`User created successfully: ${signUpData.user.id}`);

    const authData = signUpData;

    const userId = authData.user.id;
    const email = authData.user.email;

    try {
      // 2. Create user profile using UsersService (migrated from RPC)
      await this.usersService.createProfile({
        userId,
        email,
        firstName: firstName,
        lastName: lastName,
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
        // For marketplace users: use organizationName or derive from displayName/firstName
        organizationName =
          signupDto.organizationName ||
          (signupDto.sellerType === 'individual' ? `${firstName}'s Shop` : `${firstName}`);

        const newOrg = await this.organizationsService.create({
          name: organizationName,
          currencyCode: 'MAD',
          timezone: 'Africa/Casablanca',
          isActive: true,
          // Store seller type for marketplace
          accountType: signupDto.sellerType || 'individual',
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

        // 5. Seed demo data if requested
        this.logger.log(`includeDemoData value: ${signupDto.includeDemoData} (type: ${typeof signupDto.includeDemoData})`);
        if (signupDto.includeDemoData) {
          this.logger.log(`Demo data requested, starting seeding for organization ${organizationId}`);
          try {
            await this.demoDataService.seedDemoData(organizationId, userId);
            this.logger.log(`Demo data seeded successfully for organization ${organizationId}`);
          } catch (demoError) {
            // Log error but don't fail signup - organization creation succeeded
            this.logger.error(
              `Failed to seed demo data (non-critical): ${demoError.message}`,
              demoError.stack,
            );
          }
        } else {
          this.logger.log(`Demo data not requested, skipping seeding`);
        }
      }

      // 6. Return user info - frontend will handle the login
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

  async setupOrganization(userId: string, userEmail: string, organizationName?: string) {
    const adminClient = this.databaseService.getAdminClient();

    const { data: existingOrgUser } = await adminClient
      .from('organization_users')
      .select('organization_id')
      .eq('user_id', userId)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    if (existingOrgUser?.organization_id) {
      const { data: existingOrg } = await adminClient
        .from('organizations')
        .select('id, name, slug')
        .eq('id', existingOrgUser.organization_id)
        .single();

      this.logger.log(`User ${userId} already has organization: ${existingOrgUser.organization_id}`);
      return {
        success: true,
        organization: existingOrg,
        message: 'Organization already exists',
      };
    }

    const orgName = organizationName || `${userEmail?.split('@')[0] || 'User'}'s Organization`;
    this.logger.log(`Creating organization for existing user ${userId}: ${orgName}`);

    const { data: existingProfile } = await adminClient
      .from('user_profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (!existingProfile) {
      const { data: authUser } = await adminClient.auth.admin.getUserById(userId);
      const metadata = authUser?.user?.user_metadata || {};

      await this.usersService.createProfile({
        userId,
        email: userEmail,
        firstName: metadata.first_name || userEmail?.split('@')[0] || 'User',
        lastName: metadata.last_name || '',
        fullName: metadata.full_name || userEmail,
        language: 'fr',
        timezone: 'Africa/Casablanca',
        onboardingCompleted: false,
        passwordSet: true,
      });
      this.logger.log(`Created user profile for ${userId}`);
    }

    const newOrg = await this.organizationsService.create({
      name: orgName,
      currencyCode: 'MAD',
      timezone: 'Africa/Casablanca',
      isActive: true,
    });

    this.logger.log(`Created organization ${newOrg.id} for user ${userId}`);

    const orgAdminRoleId = await this.getOrgAdminRoleId(adminClient);

    const { error: orgUserError } = await adminClient
      .from('organization_users')
      .insert({
        user_id: userId,
        organization_id: newOrg.id,
        role_id: orgAdminRoleId,
        is_active: true,
      });

    if (orgUserError) {
      this.logger.error(`Failed to add user to organization: ${orgUserError.message}`);
      throw new BadRequestException('Failed to add user to organization');
    }

    this.logger.log(`User ${userId} added to organization ${newOrg.id} as organization_admin`);

    return {
      success: true,
      organization: {
        id: newOrg.id,
        name: newOrg.name,
        slug: newOrg.slug,
      },
    };
  }

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
