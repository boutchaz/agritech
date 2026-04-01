import { useEffect, useState, useCallback } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { toast } from 'sonner';
import { ButtonLoader } from '@/components/ui/loader';

/**
 * PWA Service Worker update handler.
 *
 * Strategy: `registerType: 'autoUpdate'` in vite-plugin-pwa config means
 * the new SW activates immediately (skipWaiting + clientsClaim). This
 * component shows a toast when a new version is ready, giving the user
 * the option to reload now or letting the update apply on next navigation.
 *
 * Cache busting:
 * - workbox `cleanupOutdatedCaches: true` removes old precache buckets
 * - `skipWaiting: true` ensures old SW never lingers
 * - Periodic update checks catch deployments the user might miss
 */

// How often to check for SW updates (in ms)
const UPDATE_CHECK_INTERVAL = 60 * 60 * 1000; // 1 hour

export function ServiceWorkerUpdate() {
  const [isUpdating, setIsUpdating] = useState(false);

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    // Check for updates periodically
    onRegisteredSW(swUrl, registration) {
      if (!registration) return;

      // Periodic check for new SW
      setInterval(async () => {
        // Don't check if the page is hidden or offline
        if (document.hidden || !navigator.onLine) return;

        try {
          const resp = await fetch(swUrl, {
            cache: 'no-store',
            headers: { 'cache-control': 'no-cache' },
          });

          if (resp.status === 200) {
            await registration.update();
          }
        } catch {
          // Network error — skip this check
        }
      }, UPDATE_CHECK_INTERVAL);
    },
    onRegisterError(error) {
      console.error('SW registration failed:', error);
    },
  });

  const handleUpdate = useCallback(async () => {
    setIsUpdating(true);
    try {
      await updateServiceWorker(true);
      // The page will reload automatically
    } catch (err) {
      console.error('SW update failed:', err);
      setIsUpdating(false);
      // Fallback: hard reload to bust all caches
      window.location.reload();
    }
  }, [updateServiceWorker]);

  // Show toast when new version is detected
  useEffect(() => {
    if (!needRefresh) return;

    toast.info('Nouvelle version disponible', {
      description: 'Cliquez sur "Mettre à jour" pour obtenir les dernières fonctionnalités.',
      action: {
        label: 'Mettre à jour',
        onClick: handleUpdate,
      },
      cancel: {
        label: 'Plus tard',
        onClick: () => setNeedRefresh(false),
      },
      duration: Infinity, // Keep until user acts
      id: 'sw-update', // Prevent duplicate toasts
    });

    return () => {
      toast.dismiss('sw-update');
    };
  }, [needRefresh, handleUpdate, setNeedRefresh]);

  // Also check for updates when the tab regains focus
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && navigator.onLine) {
        // Check is done by the periodic interval — but also trigger on visibility
        navigator.serviceWorker?.getRegistration()?.then((reg) => {
          reg?.update().catch(() => {});
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  if (isUpdating) {
    return (
      <div className="fixed bottom-4 right-4 bg-green-600 text-white px-4 py-3 rounded-lg shadow-lg z-[9999] flex items-center gap-3">
        <ButtonLoader />
        <span className="text-sm font-medium">Mise à jour en cours...</span>
      </div>
    );
  }

  return null;
}
