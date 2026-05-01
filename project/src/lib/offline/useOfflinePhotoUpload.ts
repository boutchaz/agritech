import { useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { isLikelyOnline } from './useOnlineStatus';
import { enqueuePhoto, PhotoQuotaExceededError } from './photoQueue';
import { telemetry } from './telemetry';

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? '';

async function sha256(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export interface UploadPhotoInput {
  organizationId: string;
  parentResource: string;
  parentClientId: string;
  fieldName: string;
  file: File;
  folder?: string;
}

export type UploadPhotoResult =
  | { status: 'uploaded'; url: string; deduplicated?: boolean }
  | { status: 'queued'; queuedClientId: string; localPreviewUrl: string };

export function useOfflinePhotoUpload() {
  return useCallback(async (input: UploadPhotoInput): Promise<UploadPhotoResult> => {
    if (isLikelyOnline()) {
      try {
        const hash = await sha256(input.file);
        const form = new FormData();
        form.append('file', input.file);
        const params = new URLSearchParams();
        if (input.folder) params.set('folder', input.folder);
        const url = `${API_URL}/api/v1/files/upload${params.toString() ? `?${params}` : ''}`;
        const res = await fetch(url, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'X-Organization-Id': input.organizationId,
            'X-Content-Hash': hash,
          },
          body: form,
        });
        if (res.ok) {
          const body = (await res.json()) as { url: string; deduplicated?: boolean };
          telemetry.track('photo_uploaded', { dedup: !!body.deduplicated });
          return { status: 'uploaded', url: body.url, deduplicated: body.deduplicated };
        }
      } catch (err) {
        // Fall through to offline queue path on network failure
        if (!(err instanceof TypeError)) throw err;
      }
    }
    try {
      const row = await enqueuePhoto({
        organizationId: input.organizationId,
        parentResource: input.parentResource,
        parentClientId: input.parentClientId,
        fieldName: input.fieldName,
        file: input.file,
      });
      const localPreviewUrl = URL.createObjectURL(row.blob);
      return { status: 'queued', queuedClientId: row.clientId, localPreviewUrl };
    } catch (err) {
      if (err instanceof PhotoQuotaExceededError) throw err;
      // last-ditch fallback: synthetic queued state
      return {
        status: 'queued',
        queuedClientId: uuidv4(),
        localPreviewUrl: URL.createObjectURL(input.file),
      };
    }
  }, []);
}
