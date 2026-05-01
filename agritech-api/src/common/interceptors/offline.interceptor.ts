import {
  CallHandler,
  ConflictException,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, of, from } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { Request } from 'express';
import { DatabaseService } from '../../modules/database/database.service';
import {
  IDEMPOTENT_KEY,
  IdempotentOptions,
  OPTIMISTIC_LOCK_KEY,
  OptimisticLockOptions,
} from '../decorators/offline.decorators';

interface OfflineRequest extends Request {
  body: Record<string, unknown> & { client_id?: string; version?: number };
  headers: Request['headers'] & {
    'idempotency-key'?: string;
    'if-match'?: string;
    'x-organization-id'?: string;
    'x-client-created-at'?: string;
  };
}

@Injectable()
export class OfflineInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly db: DatabaseService,
  ) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const idem = this.reflector.get<IdempotentOptions>(IDEMPOTENT_KEY, ctx.getHandler());
    const lock = this.reflector.get<OptimisticLockOptions>(
      OPTIMISTIC_LOCK_KEY,
      ctx.getHandler(),
    );
    if (!idem && !lock) return next.handle();

    const req = ctx.switchToHttp().getRequest<OfflineRequest>();
    const orgId = req.headers['x-organization-id'] as string | undefined;
    const idemKey = (req.headers['idempotency-key'] as string | undefined) ?? req.body?.client_id;
    const ifMatchRaw = req.headers['if-match'] as string | undefined;
    const ifMatchVersion = ifMatchRaw ? Number(ifMatchRaw) : null;
    const clientCreatedAt = req.headers['x-client-created-at'] as string | undefined;

    return from(this.preCheck(idem, lock, orgId, idemKey, ifMatchVersion, req)).pipe(
      mergeMap((short) => {
        if (short !== undefined) return of(short);
        // Inject client_id / client_created_at into body for downstream services.
        if (idemKey && req.body && typeof req.body === 'object') {
          if (!req.body.client_id) req.body.client_id = idemKey;
          if (clientCreatedAt && !req.body['client_created_at']) {
            req.body['client_created_at'] = clientCreatedAt;
          }
        }
        return next.handle();
      }),
    );
  }

  private async preCheck(
    idem: IdempotentOptions | undefined,
    lock: OptimisticLockOptions | undefined,
    orgId: string | undefined,
    idemKey: string | undefined,
    ifMatchVersion: number | null,
    req: OfflineRequest,
  ): Promise<unknown | undefined> {
    if (!orgId) return undefined;
    const sb = this.db.getAdminClient();

    // Idempotency replay: if (org_id, client_id) row exists, return it.
    if (idem && idemKey) {
      const { data } = await sb
        .from(idem.table)
        .select(idem.returning ?? '*')
        .eq('organization_id', orgId)
        .eq('client_id', idemKey)
        .maybeSingle();
      if (data) return data;
    }

    // Optimistic lock: read current version, compare to If-Match.
    if (lock && ifMatchVersion != null) {
      const params = (req.params ?? {}) as Record<string, string>;
      const id =
        params.id ??
        params.uuid ??
        params.taskId ??
        params.entryId ??
        params.harvestId ??
        params.reportId ??
        params.workRecordId ??
        null;
      if (id) {
        const { data } = await sb
          .from(lock.table)
          .select('version')
          .eq('id', id)
          .eq('organization_id', orgId)
          .maybeSingle();
        if (data && (data as { version?: number }).version !== ifMatchVersion) {
          throw new ConflictException({
            statusCode: 409,
            message: 'version conflict',
            currentVersion: (data as { version?: number }).version,
          });
        }
      }
    }

    return undefined;
  }
}
