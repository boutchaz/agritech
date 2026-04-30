import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import {
  SyncFlushRequestDto,
  SyncItemDto,
  SyncResultItem,
} from './dto/sync-flush.dto';

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(private readonly http: HttpService) {}

  /**
   * Drain a batch of offline outbox items by re-issuing each as an in-process
   * HTTP call so the existing controllers, guards, interceptors, and
   * idempotency/optimistic-lock interceptor handle the actual work.
   *
   * Sorted topologically by `deps` so a comment never lands before its task.
   * One row failing returns a per-item error without aborting the batch.
   */
  async flush(
    body: SyncFlushRequestDto,
    headers: Record<string, string>,
    baseUrl: string,
  ): Promise<{ results: SyncResultItem[] }> {
    const ordered = topoSort(body.items);
    const results: SyncResultItem[] = [];

    for (const item of ordered) {
      const itemHeaders: Record<string, string> = {
        ...headers,
        'Idempotency-Key': item.client_id,
      };
      if (item.version != null) itemHeaders['If-Match'] = String(item.version);
      if (item.client_created_at) itemHeaders['X-Client-Created-At'] = item.client_created_at;

      try {
        const url = item.url.startsWith('http') ? item.url : `${baseUrl}${item.url}`;
        const res = await firstValueFrom(
          this.http.request({
            method: item.method,
            url,
            headers: itemHeaders,
            data: item.method === 'DELETE' ? undefined : item.payload,
            validateStatus: () => true,
          }),
        );
        if (res.status >= 200 && res.status < 300) {
          results.push({
            client_id: item.client_id,
            status: 'ok',
            http_status: res.status,
            body: res.data,
          });
        } else if (res.status === 409) {
          results.push({
            client_id: item.client_id,
            status: 'conflict',
            http_status: 409,
            body: res.data,
          });
        } else {
          results.push({
            client_id: item.client_id,
            status: 'error',
            http_status: res.status,
            error:
              typeof res.data === 'object' && res.data && 'message' in res.data
                ? String((res.data as { message?: unknown }).message)
                : `HTTP ${res.status}`,
          });
        }
      } catch (err) {
        this.logger.warn(`sync.flush item ${item.client_id} failed`, err);
        results.push({
          client_id: item.client_id,
          status: 'error',
          http_status: 0,
          error: err instanceof Error ? err.message : 'unknown',
        });
      }
    }

    return { results };
  }
}

function topoSort(items: SyncItemDto[]): SyncItemDto[] {
  const byCid = new Map(items.map((i) => [i.client_id, i] as const));
  const visited = new Set<string>();
  const out: SyncItemDto[] = [];
  const visit = (it: SyncItemDto) => {
    if (visited.has(it.client_id)) return;
    visited.add(it.client_id);
    for (const dep of it.deps ?? []) {
      const d = byCid.get(dep);
      if (d) visit(d);
    }
    out.push(it);
  };
  for (const it of items) visit(it);
  return out;
}
