import { useState } from 'react';
import { forceAppUpdate, isMobileDevice } from '@/utils/clearCache';
import { RefreshCw } from 'lucide-react';

export function AppVersion() {
  const [isUpdating, setIsUpdating] = useState(false);
  const buildTime = import.meta.env.VITE_BUILD_TIME || 'development';
  const isMobile = isMobileDevice();

  const handleForceUpdate = async () => {
    if (confirm('This will clear all caches and reload the app. Continue?')) {
      setIsUpdating(true);
      await forceAppUpdate();
    }
  };

  // Only show on mobile or in development
  if (!isMobile && import.meta.env.PROD) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <div className="bg-gray-800 text-white text-xs px-3 py-2 rounded-lg shadow-lg flex items-center gap-2">
        <span className="opacity-70">v{buildTime}</span>
        {isMobile && (
          <button
            onClick={handleForceUpdate}
            disabled={isUpdating}
            className="p-1 hover:bg-gray-700 rounded transition-colors disabled:opacity-50"
            title="Force update"
          >
            <RefreshCw className={`h-3 w-3 ${isUpdating ? 'animate-spin' : ''}`} />
          </button>
        )}
      </div>
    </div>
  );
}
