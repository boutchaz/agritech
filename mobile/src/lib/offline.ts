import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system';
import NetInfo from '@react-native-community/netinfo';
import { api, filesApi } from './api';

const DB_NAME = 'agritech_offline.db';

type SyncAction = 'POST' | 'PATCH' | 'DELETE';

interface SyncQueueItem {
  id: number;
  endpoint: string;
  method: SyncAction;
  data: string;
  created_at: string;
  retry_count: number;
}

class OfflineDatabase {
  private db: SQLite.SQLiteDatabase | null = null;

  async initialize(): Promise<void> {
    this.db = await SQLite.openDatabaseAsync(DB_NAME);

    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS sync_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        endpoint TEXT NOT NULL,
        method TEXT NOT NULL,
        data TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        retry_count INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS cached_tasks (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS cached_harvests (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS cached_parcels (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS cached_farms (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS pending_photos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        local_uri TEXT NOT NULL,
        remote_url TEXT,
        record_type TEXT NOT NULL,
        record_id TEXT NOT NULL,
        uploaded INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }

  async addToSyncQueue(
    endpoint: string,
    method: SyncAction,
    data: Record<string, unknown>
  ): Promise<void> {
    if (!this.db) await this.initialize();

    await this.db!.runAsync(
      'INSERT INTO sync_queue (endpoint, method, data) VALUES (?, ?, ?)',
      [endpoint, method, JSON.stringify(data)]
    );
  }

  async getSyncQueue(): Promise<SyncQueueItem[]> {
    if (!this.db) await this.initialize();

    const result = await this.db!.getAllAsync<SyncQueueItem>(
      'SELECT * FROM sync_queue ORDER BY created_at ASC'
    );
    return result;
  }

  async removeSyncItem(id: number): Promise<void> {
    if (!this.db) await this.initialize();
    await this.db!.runAsync('DELETE FROM sync_queue WHERE id = ?', [id]);
  }

  async incrementRetryCount(id: number): Promise<void> {
    if (!this.db) await this.initialize();
    await this.db!.runAsync(
      'UPDATE sync_queue SET retry_count = retry_count + 1 WHERE id = ?',
      [id]
    );
  }

  async cacheTasks(tasks: Record<string, unknown>[]): Promise<void> {
    if (!this.db) await this.initialize();

    for (const task of tasks) {
      await this.db!.runAsync(
        'INSERT OR REPLACE INTO cached_tasks (id, data, updated_at) VALUES (?, ?, datetime("now"))',
        [task.id as string, JSON.stringify(task)]
      );
    }
  }

  async getCachedTasks(): Promise<Record<string, unknown>[]> {
    if (!this.db) await this.initialize();

    const result = await this.db!.getAllAsync<{ id: string; data: string }>(
      'SELECT * FROM cached_tasks ORDER BY updated_at DESC'
    );
    return result.map((row) => JSON.parse(row.data));
  }

  async cacheHarvests(harvests: Record<string, unknown>[]): Promise<void> {
    if (!this.db) await this.initialize();

    for (const harvest of harvests) {
      await this.db!.runAsync(
        'INSERT OR REPLACE INTO cached_harvests (id, data, updated_at) VALUES (?, ?, datetime("now"))',
        [harvest.id as string, JSON.stringify(harvest)]
      );
    }
  }

  async getCachedHarvests(): Promise<Record<string, unknown>[]> {
    if (!this.db) await this.initialize();

    const result = await this.db!.getAllAsync<{ id: string; data: string }>(
      'SELECT * FROM cached_harvests ORDER BY updated_at DESC'
    );
    return result.map((row) => JSON.parse(row.data));
  }

  async cacheFarms(farms: Record<string, unknown>[]): Promise<void> {
    if (!this.db) await this.initialize();

    for (const farm of farms) {
      await this.db!.runAsync(
        'INSERT OR REPLACE INTO cached_farms (id, data, updated_at) VALUES (?, ?, datetime("now"))',
        [farm.id as string, JSON.stringify(farm)]
      );
    }
  }

  async getCachedFarms(): Promise<Record<string, unknown>[]> {
    if (!this.db) await this.initialize();

    const result = await this.db!.getAllAsync<{ id: string; data: string }>(
      'SELECT * FROM cached_farms ORDER BY updated_at DESC'
    );
    return result.map((row) => JSON.parse(row.data));
  }

  async addPendingPhoto(
    localUri: string,
    recordType: string,
    recordId: string
  ): Promise<void> {
    if (!this.db) await this.initialize();

    await this.db!.runAsync(
      'INSERT INTO pending_photos (local_uri, record_type, record_id) VALUES (?, ?, ?)',
      [localUri, recordType, recordId]
    );
  }

  async getPendingPhotos(): Promise<{ id: number; local_uri: string; record_type: string; record_id: string }[]> {
    if (!this.db) await this.initialize();

    return await this.db!.getAllAsync(
      'SELECT id, local_uri, record_type, record_id FROM pending_photos WHERE uploaded = 0'
    );
  }

  async markPhotoUploaded(id: number, remoteUrl: string): Promise<void> {
    if (!this.db) await this.initialize();

    await this.db!.runAsync(
      'UPDATE pending_photos SET uploaded = 1, remote_url = ? WHERE id = ?',
      [remoteUrl, id]
    );
  }

  async getSyncQueueCount(): Promise<number> {
    if (!this.db) await this.initialize();

    const result = await this.db!.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM sync_queue'
    );
    return result?.count ?? 0;
  }

  async clearCache(): Promise<void> {
    if (!this.db) await this.initialize();

    await this.db!.execAsync(`
      DELETE FROM cached_tasks;
      DELETE FROM cached_harvests;
      DELETE FROM cached_parcels;
      DELETE FROM cached_farms;
    `);
  }
}

export const offlineDb = new OfflineDatabase();

export class SyncManager {
  private isSyncing = false;
  private listeners: Set<() => void> = new Set();

  addListener(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notifyListeners(): void {
    this.listeners.forEach((cb) => cb());
  }

  async checkConnectivity(): Promise<boolean> {
    const state = await NetInfo.fetch();
    return state.isConnected === true;
  }

  async sync(): Promise<{ success: number; failed: number }> {
    if (this.isSyncing) return { success: 0, failed: 0 };

    const isOnline = await this.checkConnectivity();
    if (!isOnline) return { success: 0, failed: 0 };

    this.isSyncing = true;
    let success = 0;
    let failed = 0;

    try {
      const queue = await offlineDb.getSyncQueue();

      for (const item of queue) {
        if (item.retry_count >= 3) {
          failed++;
          continue;
        }

        try {
          const data = JSON.parse(item.data);

          switch (item.method) {
            case 'POST':
              await api.post(item.endpoint, data);
              break;
            case 'PATCH':
              await api.patch(item.endpoint, data);
              break;
            case 'DELETE':
              await api.delete(item.endpoint);
              break;
          }

          await offlineDb.removeSyncItem(item.id);
          success++;
        } catch (error) {
          console.error('Sync error for item:', item.id, error);
          await offlineDb.incrementRetryCount(item.id);
          failed++;
        }
      }

      await this.uploadPendingPhotos();
    } finally {
      this.isSyncing = false;
      this.notifyListeners();
    }

    return { success, failed };
  }

  private async uploadPendingPhotos(): Promise<void> {
    const photos = await offlineDb.getPendingPhotos();

    for (const photo of photos) {
      try {
        const fileInfo = await FileSystem.getInfoAsync(photo.local_uri);
        if (!fileInfo.exists) continue;

        const result = await filesApi.uploadImage(photo.local_uri, photo.record_type);
        await offlineDb.markPhotoUploaded(photo.id, result.url);
      } catch (error) {
        console.error('Photo upload error:', error);
      }
    }
  }
}

export const syncManager = new SyncManager();

export async function queueOfflineAction(
  endpoint: string,
  method: SyncAction,
  data: Record<string, unknown>
): Promise<void> {
  const isOnline = await syncManager.checkConnectivity();

  if (isOnline) {
    switch (method) {
      case 'POST':
        await api.post(endpoint, data);
        break;
      case 'PATCH':
        await api.patch(endpoint, data);
        break;
      case 'DELETE':
        await api.delete(endpoint);
        break;
    }
  } else {
    await offlineDb.addToSyncQueue(endpoint, method, data);
  }
}
