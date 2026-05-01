import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Wifi, WifiOff, CloudOff, RefreshCw, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const QUEUE_KEY = 'agritech_offline_queue';

interface QueuedOperation {
  id: string;
  type: string;
  data: unknown;
  timestamp: number;
  retries: number;
}

function getQueue(): QueuedOperation[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveQueue(queue: QueuedOperation[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export default function OfflineQueueIndicator() {
  const { t } = useTranslation('stock');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queue, setQueue] = useState<QueuedOperation[]>(getQueue());
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setQueue(getQueue());
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const removeItem = useCallback((id: string) => {
    const updated = getQueue().filter((op) => op.id !== id);
    saveQueue(updated);
    setQueue(updated);
  }, []);

  const clearQueue = useCallback(() => {
    saveQueue([]);
    setQueue([]);
  }, []);

  const retryItem = useCallback((id: string) => {
    const current = getQueue();
    const item = current.find((op) => op.id === id);
    if (item) {
      removeItem(id);
    }
  }, [removeItem]);

  if (queue.length === 0 && isOnline) return null;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          'relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
          isOnline
            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
        )}
        type="button"
      >
        {isOnline ? (
          <Wifi className="w-3.5 h-3.5" />
        ) : (
          <WifiOff className="w-3.5 h-3.5" />
        )}
        <span>{isOnline ? t('offlineQueue.online', 'Online') : t('offlineQueue.offline', 'Offline')}</span>
        {queue.length > 0 && (
          <Badge className="ml-1 bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 text-xs px-1.5 py-0.5">
            {t('offlineQueue.pending', '{{count}} pending', { count: queue.length })}
          </Badge>
        )}
      </button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md dark:border-gray-700">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CloudOff className="w-5 h-5" />
              {t('offlineQueue.title', 'Offline Queue')}
            </DialogTitle>
          </DialogHeader>

          {queue.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-gray-500 dark:text-gray-400">
                {t('offlineQueue.noPending', 'No pending operations')}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('offlineQueue.subtitle', 'Operations waiting to sync')}
              </p>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {queue.map((op) => (
                  <div
                    key={op.id}
                    className="flex items-center justify-between rounded-lg border p-3 dark:border-gray-700"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{op.type}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(op.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => retryItem(op.id)}
                        title={t('offlineQueue.retry', 'Retry')}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(op.id)}
                        title={t('offlineQueue.clear', 'Clear')}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={clearQueue}>
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  {t('offlineQueue.clear', 'Clear')}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
