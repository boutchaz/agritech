import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private databaseService: DatabaseService,
    private jwtService: JwtService,
  ) {}

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
}
