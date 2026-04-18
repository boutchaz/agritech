import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { AuditService, AuditMeta } from './audit.service';

/**
 * Interceptor that automatically captures request context (user_id, organization_id,
 * ip_address, user_agent) and makes it available for audit logging.
 *
 * Apply to controllers or individual routes via @UseInterceptors(AuditInterceptor).
 *
 * The interceptor attaches audit metadata to the request object so that services
 * can access it without manually extracting it from every controller method.
 *
 * Usage in a controller:
 *   @UseInterceptors(AuditInterceptor)
 *   @Post()
 *   async create(@Req() req) {
 *     // req.auditMeta is available with { userId, organizationId, meta }
 *   }
 *
 * Or use it to auto-log after successful mutations by checking the response.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();

    const userId = request.user?.sub || request.user?.id || null;
    const organizationId =
      request.user?.organization_id ||
      request.headers?.['x-organization-id'] ||
      null;

    const meta: AuditMeta = {
      ipAddress:
        request.headers?.['x-forwarded-for'] ||
        request.connection?.remoteAddress ||
        request.ip ||
        null,
      userAgent: request.headers?.['user-agent'] || null,
    };

    // Attach audit context to the request for downstream use
    request.auditContext = {
      userId,
      organizationId,
      meta,
    };

    return next.handle().pipe(
      tap({
        error: () => {
          // Don't audit failed requests
        },
      }),
    );
  }
}
