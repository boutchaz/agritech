import { useEffect, useState } from 'react';
import { registerSW } from 'virtual:pwa-register';
import { toast } from 'sonner';

export function ServiceWorkerUpdate() {
  const [_updateAvailable, setUpdateAvailable] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        setUpdateAvailable(true);
        toast.info('New version available', {
          description: 'Click "Update" to get the latest features and improvements',
          action: {
            label: 'Update',
            onClick: () => {
              setIsUpdating(true);
              toast.loading('Updating app...');
              updateSW(true); // Force reload
            },
          },
          duration: Infinity, // Keep until user dismisses or updates
        });
      },
      onOfflineReady() {
        // App is ready to work offline - no action needed
      },
      onRegisterError(error) {
        console.error('Service Worker registration error:', error);
        toast.error('Failed to register service worker', {
          description: error.message,
        });
      },
    });

    // Check for updates periodically (every hour)
    const interval = setInterval(() => {
      updateSW();
    }, 60 * 60 * 1000); // Check every hour

    // Check when page becomes visible
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        updateSW();
      }
    };

    // Check when window regains focus
    const handleFocus = () => {
      updateSW();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  if (isUpdating) {
    return (
      <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg z-50">
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          <span>Updating app...</span>
        </div>
      </div>
    );
  }

  return null;
}
