/**
 * Offline Analytics Queue for Mobile
 * Stores analytics events locally when offline and syncs when connectivity is restored
 * Uses Expo SQLite for persistent storage
 */

import * as SQLite from 'expo-sqlite';
import * as Network from 'expo-network';
import { trackEvent as baseTrackEvent } from './analytics';

const DB_NAME = 'analytics_queue.db';
const TABLE_NAME = 'pending_events';
const MAX_QUEUE_SIZE = 100; // Maximum events to queue
const SYNC_INTERVAL = 30000; // Sync every 30 seconds

let db: SQLite.SQLiteDatabase | null = null;
let syncInterval: NodeJS.Timeout | null = null;

interface QueuedEvent {
  id?: number;
  eventName: string;
  parameters: string; // JSON stringified
  timestamp: number;
  retryCount: number;
}

/**
 * Initialize the analytics queue database
 */
export const initAnalyticsQueue = async (): Promise<void> => {
  try {
    db = await SQLite.openDatabaseAsync(DB_NAME);

    // Create table if it doesn't exist
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        eventName TEXT NOT NULL,
        parameters TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        retryCount INTEGER DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS idx_timestamp ON ${TABLE_NAME} (timestamp);
    `);

    // Start periodic sync
    startPeriodicSync();
  } catch (error) {
    console.error('Failed to initialize analytics queue:', error);
  }
};

/**
 * Add an event to the queue
 */
export const queueEvent = async (eventName: string, parameters?: Record<string, string | number | boolean>): Promise<void> => {
  if (!db) {
    await initAnalyticsQueue();
  }

  try {
    // Check queue size and trim if necessary
    const count = await getQueueSize();
    if (count >= MAX_QUEUE_SIZE) {
      await trimQueue(MAX_QUEUE_SIZE - 10); // Keep latest 90 events
    }

    // Insert event
    const event: QueuedEvent = {
      eventName,
      parameters: JSON.stringify(parameters || {}),
      timestamp: Date.now(),
      retryCount: 0,
    };

    await db!.runAsync(
      `INSERT INTO ${TABLE_NAME} (eventName, parameters, timestamp, retryCount) VALUES (?, ?, ?, ?)`,
      [event.eventName, event.parameters, event.timestamp, event.retryCount]
    );
  } catch (error) {
    console.error('Failed to queue analytics event:', error);
  }
};

/**
 * Get the current queue size
 */
export const getQueueSize = async (): Promise<number> => {
  if (!db) return 0;

  try {
    const result = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM ${TABLE_NAME}`
    );
    return result?.count || 0;
  } catch (error) {
    console.error('Failed to get queue size:', error);
    return 0;
  }
};

/**
 * Trim the queue to keep only the most recent events
 */
export const trimQueue = async (keepCount: number): Promise<void> => {
  if (!db) return;

  try {
    await db.runAsync(
      `DELETE FROM ${TABLE_NAME} WHERE id IN (
        SELECT id FROM ${TABLE_NAME}
        ORDER BY timestamp DESC
        LIMIT -1 OFFSET ?
      )`,
      [keepCount]
    );
  } catch (error) {
    console.error('Failed to trim queue:', error);
  }
};

/**
 * Get all queued events
 */
export const getQueuedEvents = async (): Promise<QueuedEvent[]> => {
  if (!db) return [];

  try {
    const events = await db.getAllAsync<QueuedEvent>(
      `SELECT * FROM ${TABLE_NAME} ORDER BY timestamp ASC LIMIT 50`
    );
    return events;
  } catch (error) {
    console.error('Failed to get queued events:', error);
    return [];
  }
};

/**
 * Remove a queued event after successful sync
 */
export const removeQueuedEvent = async (id: number): Promise<void> => {
  if (!db) return;

  try {
    await db.runAsync(`DELETE FROM ${TABLE_NAME} WHERE id = ?`, [id]);
  } catch (error) {
    console.error('Failed to remove queued event:', error);
  }
};

/**
 * Check if device is online
 */
export const isOnline = async (): Promise<boolean> => {
  try {
    const networkState = await Network.getNetworkStateAsync();
    return networkState.isConnected && networkState.type !== Network.NetworkStateType.NONE;
  } catch (error) {
    // Assume online if we can't check
    return true;
  }
};

/**
 * Sync queued events to the server
 */
export const syncQueuedEvents = async (): Promise<void> => {
  if (!db) return;

  try {
    // Check connectivity
    const online = await isOnline();
    if (!online) {
      return; // Skip sync if offline
    }

    // Get queued events
    const events = await getQueuedEvents();
    if (events.length === 0) {
      return;
    }

    // Process events in batch
    let syncedCount = 0;
    for (const event of events) {
      try {
        // Parse parameters
        const parameters = JSON.parse(event.parameters);

        // Send the event
        baseTrackEvent(event.eventName, parameters);

        // Remove from queue on success
        await removeQueuedEvent(event.id!);
        syncedCount++;
      } catch (error) {
        // Increment retry count
        await db.runAsync(
          `UPDATE ${TABLE_NAME} SET retryCount = retryCount + 1 WHERE id = ?`,
          [event.id]
        );

        // Remove events that have failed too many times (older than 7 days)
        const maxRetries = 10;
        const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
        if (event.retryCount >= maxRetries || (Date.now() - event.timestamp) > maxAge) {
          await removeQueuedEvent(event.id!);
        }
      }
    }

    if (syncedCount > 0) {
      console.log(`Synced ${syncedCount} analytics events`);
    }
  } catch (error) {
    console.error('Failed to sync analytics events:', error);
  }
};

/**
 * Start periodic sync
 */
export const startPeriodicSync = (): void => {
  if (syncInterval) {
    clearInterval(syncInterval);
  }

  syncInterval = setInterval(() => {
    syncQueuedEvents();
  }, SYNC_INTERVAL);
};

/**
 * Stop periodic sync
 */
export const stopPeriodicSync = (): void => {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
};

/**
 * Force immediate sync
 */
export const forceSync = async (): Promise<void> => {
  await syncQueuedEvents();
};

/**
 * Clear all queued events (useful for logout)
 */
export const clearQueue = async (): Promise<void> => {
  if (!db) return;

  try {
    await db.runAsync(`DELETE FROM ${TABLE_NAME}`);
  } catch (error) {
    console.error('Failed to clear analytics queue:', error);
  }
};

/**
 * Get queue statistics
 */
export const getQueueStats = async (): Promise<{
  totalEvents: number;
  oldestEvent: number | null;
  newestEvent: number | null;
}> => {
  if (!db) {
    return { totalEvents: 0, oldestEvent: null, newestEvent: null };
  }

  try {
    const stats = await db.getFirstAsync<{
      totalEvents: number;
      oldestEvent: number;
      newestEvent: number;
    }>(
      `SELECT
        COUNT(*) as totalEvents,
        MIN(timestamp) as oldestEvent,
        MAX(timestamp) as newestEvent
      FROM ${TABLE_NAME}`
    );
    return stats || { totalEvents: 0, oldestEvent: null, newestEvent: null };
  } catch (error) {
    console.error('Failed to get queue stats:', error);
    return { totalEvents: 0, oldestEvent: null, newestEvent: null };
  }
};

/**
 * Enhanced track event that queues when offline
 */
export const trackEvent = async (
  eventName: string,
  parameters?: Record<string, string | number | boolean>,
  forceQueue: boolean = false
): Promise<void> => {
  const online = await isOnline();

  if (online && !forceQueue) {
    // Send immediately if online
    baseTrackEvent(eventName, parameters);
  } else {
    // Queue for later if offline
    await queueEvent(eventName, parameters);
  }
};

/**
 * Initialize the queue and set up network state monitoring
 */
export const setupAnalyticsQueue = async (): Promise<void> => {
  await initAnalyticsQueue();

  // Listen for network state changes
  Network.addNetworkStateListener?.((networkState) => {
    if (networkState.isConnected) {
      // Sync when coming back online
      syncQueuedEvents();
    }
  });

  // Initial sync
  syncQueuedEvents();
};

export default {
  setupAnalyticsQueue,
  trackEvent,
  syncQueuedEvents,
  forceSync,
  clearQueue,
  getQueueSize,
  getQueueStats,
};
