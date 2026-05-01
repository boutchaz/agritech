import imageCompression from 'browser-image-compression';
import { v4 as uuidv4 } from 'uuid';
import { db, PhotoRow } from './db';
import { canAcceptNewPhoto } from './storageGuard';
import { telemetry } from './telemetry';

const COMPRESS_OPTS = {
  maxSizeMB: 1,
  maxWidthOrHeight: 1600,
  useWebWorker: true,
  preserveExif: true,
};

async function sha256(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export interface EnqueuePhotoInput {
  organizationId: string;
  parentResource: string;
  parentClientId: string;
  fieldName: string;
  file: File | Blob;
  mime?: string;
}

export class PhotoQuotaExceededError extends Error {
  constructor() {
    super('Storage quota exceeded — cannot queue new photo');
    this.name = 'PhotoQuotaExceededError';
  }
}

export async function enqueuePhoto(input: EnqueuePhotoInput): Promise<PhotoRow> {
  if (!(await canAcceptNewPhoto())) throw new PhotoQuotaExceededError();
  let blob: Blob = input.file;
  try {
    if (input.file instanceof File) {
      blob = await imageCompression(input.file, COMPRESS_OPTS);
    }
  } catch (err) {
    console.warn('[photoQueue] compression failed, storing original', err);
  }
  const mime = input.mime ?? blob.type ?? 'image/jpeg';
  const contentSha256 = await sha256(blob);
  const row: PhotoRow = {
    id: uuidv4(),
    organizationId: input.organizationId,
    clientId: uuidv4(),
    blob,
    mime,
    contentSha256,
    parentResource: input.parentResource,
    parentClientId: input.parentClientId,
    fieldName: input.fieldName,
    uploaded: 0,
    attempts: 0,
    createdAt: Date.now(),
  };
  await db().photos.add(row);
  telemetry.track('photo_enqueue', { resource: input.parentResource, sizeKb: Math.round(blob.size / 1024) });
  return row;
}

export async function pendingPhotos(organizationId: string): Promise<PhotoRow[]> {
  return db().photos
    .where('[organizationId+uploaded]')
    .equals([organizationId, 0])
    .toArray();
}

export async function markPhotoUploaded(id: string, url: string): Promise<void> {
  await db().photos.update(id, { uploaded: 1, uploadedUrl: url });
}

export async function markPhotoFailed(id: string, err: string): Promise<void> {
  const row = await db().photos.get(id);
  if (!row) return;
  await db().photos.update(id, { attempts: row.attempts + 1, lastError: err });
}

export async function deletePhoto(id: string): Promise<void> {
  await db().photos.delete(id);
}
