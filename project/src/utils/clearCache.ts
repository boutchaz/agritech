/**
 * Utility to force clear all caches and reload the app
 * Useful for mobile devices that may have stale cache issues
 */
export async function clearAllCaches(): Promise<void> {
  if ('caches' in window) {
    try {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map((cacheName) => caches.delete(cacheName))
      );
      console.warn('All caches cleared');
    } catch (error) {
      console.error('Failed to clear caches:', error);
    }
  }
}

/**
 * Unregister all service workers and clear caches
 * Nuclear option for forcing updates on mobile
 */
export async function forceAppUpdate(): Promise<void> {
  try {
    // Clear all caches
    await clearAllCaches();

    // Unregister all service workers
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(
        registrations.map((registration) => registration.unregister())
      );
      console.warn('All service workers unregistered');
    }

    // Force reload
    window.location.reload();
  } catch (error) {
    console.error('Failed to force app update:', error);
    // Try reload anyway
    window.location.reload();
  }
}

/**
 * Check if running on mobile device
 */
export function isMobileDevice(): boolean {
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

/**
 * Get app version from build timestamp or package.json
 */
export function getAppVersion(): string {
  // This will be replaced by build process
  return import.meta.env.VITE_APP_VERSION || 'development';
}

/**
 * Check and force update if needed on mobile
 * This can be called on app startup
 */
export async function checkMobileUpdate(): Promise<void> {
  if (!isMobileDevice()) {
    return;
  }

  // Check for service worker updates
  if ('serviceWorker' in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();

      // Force update check on all registrations
      await Promise.all(
        registrations.map(async (registration) => {
          await registration.update();

          // If there's a waiting service worker, activate it immediately
          if (registration.waiting) {
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
            // Reload after activation
            navigator.serviceWorker.addEventListener('controllerchange', () => {
              window.location.reload();
            });
          }
        })
      );
    } catch (error) {
      console.error('Failed to check for updates:', error);
    }
  }
}
