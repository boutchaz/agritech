/**
 * Universal Storage Adapter
 *
 * Uses MMKV when available (production/dev builds)
 * Falls back to SecureStore for Expo Go
 */

import { createJSONStorage } from 'zustand/middleware';

// Type for our storage interface
interface StorageAdapter {
  setItem: (name: string, value: string) => void | Promise<void>;
  getItem: (name: string) => string | null | Promise<string | null>;
  removeItem: (name: string) => void | Promise<void>;
}

// Try to import MMKV, fall back gracefully
let MMKVStorage: StorageAdapter | null = null;
let SecureStoreFallback: StorageAdapter | null = null;

// Try MMKV first (works in dev builds, not Expo Go)
try {
  const { MMKV } = require('react-native-mmkv');

  const mmkvInstance = new MMKV({
    id: 'agritech-storage',
    encryptionKey: 'agritech-storage-encryption',
  });

  MMKVStorage = {
    setItem: (name: string, value: string) => mmkvInstance.set(name, value),
    getItem: (name: string) => mmkvInstance.getString(name) ?? null,
    removeItem: (name: string) => mmkvInstance.delete(name),
  };

  console.log('✅ Using MMKV for storage (fast & encrypted)');
} catch (error) {
  console.log('⚠️ MMKV not available, using SecureStore for Expo Go');
}

// Fallback: Use SecureStore (works in Expo Go)
if (!MMKVStorage) {
  try {
    const SecureStore = require('expo-secure-store');

    SecureStoreFallback = {
      setItem: async (name: string, value: string) => {
        await SecureStore.setItemAsync(name, value);
      },
      getItem: async (name: string) => {
        const value = await SecureStore.getItemAsync(name);
        return value;
      },
      removeItem: async (name: string) => {
        await SecureStore.deleteItemAsync(name);
      },
    };

    console.log('✅ Using SecureStore for storage (Expo Go compatible)');
  } catch (error) {
    console.error('❌ No storage available!', error);
  }
}

// Final storage adapter (prefer MMKV, fallback to SecureStore)
// We wrap async methods to make them compatible with Zustand
export const storageAdapter: StorageAdapter = MMKVStorage || {
  setItem: async (name: string, value: string) => {
    await SecureStoreFallback?.setItem(name, value);
  },
  getItem: async (name: string) => {
    return await SecureStoreFallback?.getItem(name) ?? null;
  },
  removeItem: async (name: string) => {
    await SecureStoreFallback?.removeItem(name);
  },
};

// Export a flag to know which storage is being used
export const storageType = MMKVStorage ? 'mmkv' : SecureStoreFallback ? 'securestore' : 'memory';

// Create Zustand storage with our adapter
export const zustandStorage = createJSONStorage(() => storageAdapter);
