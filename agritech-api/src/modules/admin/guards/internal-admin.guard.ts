import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DatabaseService } from '../../database/database.service';

/**
 * Guard to ensure user has internal_admin role
 * Internal admins can access all reference data and analytics
 */
@Injectable()
export class InternalAdminGuard implements CanActivate {
  private readonly logger = new Logger(InternalAdminGuard.name);

  constructor(
    private reflector: Reflector,
    private databaseService: DatabaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    const isInternalAdmin = await this.checkInternalAdmin(user.id);

    if (!isInternalAdmin) {
      throw new ForbiddenException(
        'Access denied. Internal admin privileges required.',
      );
    }

    // Mark the user as internal admin for downstream use
    request.isInternalAdmin = true;

    return true;
  }

  /**
   * Check if user is in internal_admins table
   */
  private async checkInternalAdmin(userId: string): Promise<boolean> {
    const client = this.databaseService.getAdminClient();

    const { data, error } = await client
      .from('internal_admins')
      .select('id')
      .eq('user_id', userId)
      .eq('is_active', true)
      .limit(1);

    if (error) {
      this.logger.error(`Error checking internal admin status: ${error.message}`);
      return false;
    }

    return data && data.length > 0;
  }
}
