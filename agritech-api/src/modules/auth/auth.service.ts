import {
  Injectable,
  UnauthorizedException,
  Logger,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';
import { DatabaseService } from '../database/database.service';
import { SignupDto } from './dto/signup.dto';
import { UsersService } from '../users/users.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { DemoDataService } from '../demo-data/demo-data.service';
import { AdoptionService, MilestoneType } from '../adoption/adoption.service';
import { CaslAbilityFactory } from '../casl/casl-ability.factory';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  // In-memory store for exchange codes
  private exchangeCodes = new Map<string, { userId: string; createdAt: number }>();

  // Clean expired codes every 60 seconds
  private cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [code, data] of this.exchangeCodes) {
      if (now - data.createdAt > 30_000) {
        this.exchangeCodes.delete(code);
      }
    }
  }, 60_000);

  constructor(
    private databaseService: DatabaseService,
    private configService: ConfigService,
    private usersService: UsersService,
    private organizationsService: OrganizationsService,
    private demoDataService: DemoDataService,
    private adoptionService: AdoptionService,
    private caslAbilityFactory: CaslAbilityFactory,
  ) { }

  /**
   * Login - Authenticate user with email and password
   */
  async login(email: string, password: string, rememberMe: boolean = true) {
    // IMPORTANT: Create a fresh Supabase client for each login attempt
    // Using the shared client causes issues because:
    // 1. It's a singleton with persistSession: false
    // 2. Concurrent logins can interfere with each other
    // 3. The session state is shared across requests
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseAnonKey = this.configService.get<string>('SUPABASE_ANON_KEY');

    const freshClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    this.logger.log(`Login attempt for email: ${email}`);

    try {
      const { data, error } = await freshClient.auth.signInWithPassword({
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
        refresh_token: rememberMe ? data.session.refresh_token : '',
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

  async getOAuthUrl(provider: string, redirectTo: string): Promise<{ url: string }> {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');

    if (!supabaseUrl) {
      throw new BadRequestException('Supabase URL is not configured');
    }

    const url = `${supabaseUrl}/auth/v1/authorize?provider=${encodeURIComponent(provider)}&redirect_to=${encodeURIComponent(redirectTo)}&access_type=offline&prompt=consent`;

    return { url };
  }

  async exchangeOAuthCode(code: string) {
    const supabase = this.databaseService.getAdminClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error || !data.session) {
      this.logger.error(`Failed to exchange OAuth code: ${error?.message}`);
      throw new UnauthorizedException('Invalid OAuth code');
    }

    const user = data.user ?? data.session.user;

    return {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_in: data.session.expires_in,
      user: {
        id: user?.id,
        email: user?.email,
        fullName: user?.user_metadata?.full_name || '',
      },
    };
  }

  /**
   * Validate a Supabase JWT token
   */
  async validateToken(token: string): Promise<any> {
    try {
      // Create a fresh client to validate the token
      // Using admin client's getUser works but may have issues in some cases
      const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
      const supabaseAnonKey = this.configService.get<string>('SUPABASE_ANON_KEY');

      const freshClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });

      // Set the session using the token
      const { data: sessionData, error: sessionError } = await freshClient.auth.setSession({
        access_token: token,
        refresh_token: '', // We don't have refresh token, but that's ok for validation
      });

      if (sessionError) {
        this.logger.error(`Token session error: ${sessionError.message}`);
        // Try admin client as fallback
        const adminClient = this.databaseService.getAdminClient();
        const { data: { user }, error } = await adminClient.auth.getUser(token);

        if (error || !user) {
          this.logger.error(`Admin token validation also failed: ${error?.message}`);
          throw new UnauthorizedException('Invalid token');
        }

        this.logger.log(`Token validated via admin client for user: ${user.id}`);
        return user;
      }

      const user = sessionData?.user;
      if (!user) {
        this.logger.error('Token validation: no user in session data');
        throw new UnauthorizedException('Invalid token');
      }

      this.logger.debug(`Token validated successfully for user: ${user.id}`);
      return user;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
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
    * Change current user password and mark password_set
    */
   async changePassword(userId: string, newPassword: string) {
     if (!newPassword || newPassword.length < 8) {
       throw new BadRequestException('Password must be at least 8 characters long');
     }

     const client = this.databaseService.getAdminClient();

     const { error: updateError } = await client.auth.admin.updateUserById(userId, {
       password: newPassword,
     });

     if (updateError) {
       throw new BadRequestException(`Failed to update password: ${updateError.message}`);
     }

     await client
       .from('user_profiles')
       .upsert({
         id: userId,
         password_set: true,
         updated_at: new Date().toISOString(),
       }, {
         onConflict: 'id',
       });

     // Clear worker temp password if applicable
     await client
       .from('workers')
       .update({
         temp_password: null,
         temp_password_expires_at: null,
       })
       .eq('user_id', userId);

     return { success: true };
   }

   /**
    * Logout and revoke all refresh tokens globally
    */
   async logout(jwt: string): Promise<void> {
     try {
       const adminClient = this.databaseService.getAdminClient();
       await adminClient.auth.admin.signOut(jwt, 'global');
       this.logger.log('User logged out successfully and all sessions revoked');
     } catch (error) {
       // Fire-and-forget: log error but don't throw
       this.logger.error(`Failed to revoke session: ${error.message}`);
     }
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

      // Handle duplicate user error gracefully
      if (signUpError?.message?.includes('already been registered') ||
          signUpError?.message?.includes('already exists') ||
          signUpError?.code === 'user_already_exists') {
        throw new BadRequestException(
          'An account with this email already exists. Please try logging in instead.',
        );
      }

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

        const { data: sub } = await adminClient
          .from('subscriptions')
          .select('max_users')
          .eq('organization_id', organizationId)
          .maybeSingle();

        if (sub?.max_users != null) {
          const { count: userCount } = await adminClient
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

      // Track user signup milestone
      await this.adoptionService.recordMilestone(
        userId,
        MilestoneType.USER_SIGNUP,
        organizationId,
        {
          email: email,
          organization_name: organizationName,
          signup_method: signupDto.invitedToOrganization ? 'invitation' : 'self_signup',
          seller_type: signupDto.sellerType || 'individual',
        },
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

  /**
   * Send password reset email
   */
  async forgotPassword(email: string, redirectTo: string) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseAnonKey = this.configService.get<string>('SUPABASE_ANON_KEY');

    this.logger.log(`Password reset requested for email: ${email}, redirectTo: ${redirectTo}`);
    this.logger.debug(`Using Supabase URL: ${supabaseUrl}`);

    if (!supabaseUrl || !supabaseAnonKey) {
      this.logger.error('Supabase configuration missing - SUPABASE_URL or SUPABASE_ANON_KEY not set');
      // Still return success to prevent information leakage
      return {
        success: true,
        message: 'If an account exists with this email, a password reset link will be sent.',
      };
    }

    const freshClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    try {
      const { data, error } = await freshClient.auth.resetPasswordForEmail(email, {
        redirectTo,
      });

      if (error) {
        this.logger.error(`Failed to send password reset email - Code: ${error.code}, Status: ${error.status}, Message: ${error.message}, Name: ${error.name}`);
        this.logger.error(`Full error object: ${JSON.stringify(error, null, 2)}`);
        // Don't reveal if email exists or not for security
        // Always return success to prevent email enumeration
      } else {
        this.logger.log(`Password reset email sent successfully to: ${email}`);
        this.logger.debug(`Response data: ${JSON.stringify(data)}`);
      }
    } catch (err) {
      this.logger.error(`Exception sending password reset email: ${err.message}`);
      this.logger.error(`Exception stack: ${err.stack}`);
    }

    return {
      success: true,
      message: 'If an account exists with this email, a password reset link will be sent.',
    };
  }

  /**
   * Reset password (called after user clicks reset link and is authenticated with recovery token)
   */
  async resetPassword(userId: string, newPassword: string) {
    if (!newPassword || newPassword.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters long');
    }

    const client = this.databaseService.getAdminClient();

    const { error: updateError } = await client.auth.admin.updateUserById(userId, {
      password: newPassword,
    });

    if (updateError) {
      this.logger.error(`Failed to reset password: ${updateError.message}`);
      throw new BadRequestException('Failed to reset password');
    }

    // Mark password as set in profile
    await client
      .from('user_profiles')
      .upsert({
        id: userId,
        password_set: true,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'id',
      });

    this.logger.log(`Password reset successfully for user: ${userId}`);

    return { success: true, message: 'Password reset successfully' };
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken: string) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseAnonKey = this.configService.get<string>('SUPABASE_ANON_KEY');

    const freshClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data, error } = await freshClient.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error || !data.session) {
      this.logger.error(`Failed to refresh token: ${error?.message}`);
      throw new UnauthorizedException('Invalid refresh token');
    }

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

  /**
   * Get user's CASL abilities for frontend/mobile permission sync
   * This is the SOURCE OF TRUTH for permissions across all platforms
   */
  async getUserAbilities(userId: string, organizationId: string) {
    return this.caslAbilityFactory.getAbilitiesForUser({ id: userId }, organizationId);
  }

  /**
   * Generate one-time exchange code for cross-app authentication
   * Code expires after 30 seconds and is single-use
   */
  async generateExchangeCode(userId: string): Promise<{ code: string; expiresIn: number }> {
    const { randomUUID } = await import('crypto');
    const code = randomUUID();
    this.exchangeCodes.set(code, { userId, createdAt: Date.now() });
    this.logger.log(`Exchange code generated for user ${userId}`);
    return { code, expiresIn: 30 };
  }

  /**
   * Redeem exchange code for session tokens
   * Code must be valid, not expired, and is deleted after use
   */
  async redeemExchangeCode(code: string): Promise<{ access_token: string; refresh_token: string; expires_in: number }> {
    const entry = this.exchangeCodes.get(code);
    if (!entry) {
      throw new UnauthorizedException('Invalid or expired exchange code');
    }

    if (Date.now() - entry.createdAt > 30_000) {
      this.exchangeCodes.delete(code);
      throw new UnauthorizedException('Exchange code expired');
    }

    this.exchangeCodes.delete(code);

    const adminClient = this.databaseService.getAdminClient();
    const { data: userData, error: userError } = await adminClient.auth.admin.getUserById(entry.userId);
    
    if (userError || !userData?.user?.email) {
      throw new UnauthorizedException('Failed to retrieve user');
    }

    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: 'magiclink',
      email: userData.user.email,
    });

    if (linkError || !linkData) {
      throw new UnauthorizedException('Failed to create session');
    }

    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseAnonKey = this.configService.get<string>('SUPABASE_ANON_KEY');
    const freshClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data: sessionData, error: sessionError } = await freshClient.auth.verifyOtp({
      token_hash: linkData.properties.hashed_token,
      type: 'magiclink',
    });

    if (sessionError || !sessionData.session) {
      throw new UnauthorizedException('Failed to create session');
    }

    return {
      access_token: sessionData.session.access_token,
      refresh_token: sessionData.session.refresh_token,
      expires_in: sessionData.session.expires_in,
    };
  }
}
