import Dexie, { Table } from 'dexie';

export type OutboxStatus = 'pending' | 'inflight' | 'failed' | 'dead';
export type HttpMethod = 'POST' | 'PATCH' | 'PUT' | 'DELETE';

export interface OutboxRow {
  id: string;
  organizationId: string;
  clientId: string;
  resource: string;
  method: HttpMethod;
  url: string;
  payload: unknown;
  ifMatchVersion?: number | null;
  payloadVersion: number;
  attempts: number;
  status: OutboxStatus;
  lastError?: string | null;
  nextAttemptAt: number;
  clientCreatedAt: number;
  clientTzOffset: number;
  deps?: string[];
  photoIds?: string[];
}

export interface PhotoRow {
  id: string;
  organizationId: string;
  clientId: string;
  blob: Blob;
  mime: string;
  contentSha256: string;
  parentResource: string;
  parentClientId: string;
  fieldName: string;
  uploaded: 0 | 1;
  uploadedUrl?: string;
  attempts: number;
  lastError?: string | null;
  createdAt: number;
}

export interface MetaRow {
  key: string;
  value: unknown;
  updatedAt: number;
}

export interface DeadLetterRow {
  id: string;
  organizationId: string;
  original: OutboxRow;
  reason: string;
  movedAt: number;
}

export class OfflineDB extends Dexie {
  outbox!: Table<OutboxRow, string>;
  photos!: Table<PhotoRow, string>;
  meta!: Table<MetaRow, string>;
  deadLetter!: Table<DeadLetterRow, string>;

  constructor() {
    super('agrogina_offline');
    this.version(1).stores({
      outbox:
        'id, organizationId, status, nextAttemptAt, [organizationId+status], [organizationId+clientId], resource, clientCreatedAt',
      photos:
        'id, organizationId, parentClientId, uploaded, [organizationId+uploaded], contentSha256',
      meta: 'key',
      deadLetter: 'id, organizationId, movedAt',
    });
  }
}

let _db: OfflineDB | null = null;

export function db(): OfflineDB {
  if (!_db) _db = new OfflineDB();
  return _db;
}

export async function closeDb(): Promise<void> {
  if (_db) {
    _db.close();
    _db = null;
  }
}

export const CURRENT_PAYLOAD_VERSION = 1;
