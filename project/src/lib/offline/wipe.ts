import { closeDb, db } from './db';
import { clearPersistedQueries } from './persister';

function deleteDb(name: string): Promise<void> {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.deleteDatabase(name);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
      req.onblocked = () => resolve();
    } catch {
      resolve();
    }
  });
}

export interface WipeOptions {
  organizationId?: string | null;
  scope: 'org' | 'all';
}

export async function wipeOffline(opts: WipeOptions): Promise<void> {
  try {
    if (opts.scope === 'all') {
      await closeDb();
      await deleteDb('agrogina_offline');
      await deleteDb('agrogina_query_cache');
      return;
    }
    const orgId = opts.organizationId ?? null;
    await db().transaction('rw', db().outbox, db().photos, db().deadLetter, async () => {
      if (orgId) {
        await db().outbox.where('organizationId').equals(orgId).delete();
        await db().photos.where('organizationId').equals(orgId).delete();
        await db().deadLetter.where('organizationId').equals(orgId).delete();
      } else {
        await db().outbox.clear();
        await db().photos.clear();
        await db().deadLetter.clear();
      }
    });
    await clearPersistedQueries(orgId);
  } catch (err) {
    console.warn('[offline.wipe] failed', err);
  }
}
