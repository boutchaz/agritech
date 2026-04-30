import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Trash2, Wifi, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { wipeOffline } from '@/lib/offline/wipe';
import {
  countByStatus,
  oldestPendingAgeSeconds,
  subscribeOutbox,
} from '@/lib/offline/outbox';
import { getStorageStatus } from '@/lib/offline/storageGuard';
import { useOnlineStatus } from '@/lib/offline/useOnlineStatus';

export const Route = createFileRoute('/_authenticated/(settings)/settings/offline')({
  component: OfflineSettingsPage,
});

function formatBytes(bytes: number): string {
  if (!bytes) return '0';
  const units = ['B', 'KB', 'MB', 'GB'];
  let v = bytes;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  return `${v.toFixed(v >= 100 ? 0 : 1)} ${units[i]}`;
}

function formatAge(s: number): string {
  if (s <= 0) return '—';
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.round(s / 60)}min`;
  return `${(s / 3600).toFixed(1)}h`;
}

function OfflineSettingsPage() {
  const { t } = useTranslation();
  const { currentOrganization } = useAuth();
  const status = useOnlineStatus();
  const [counts, setCounts] = useState({ pending: 0, inflight: 0, failed: 0, dead: 0 });
  const [oldestAge, setOldestAge] = useState(0);
  const [storage, setStorage] = useState<{ usage: number; quota: number; ratio: number; persisted: boolean } | null>(null);
  const [isWiping, setIsWiping] = useState(false);

  useEffect(() => {
    if (!currentOrganization?.id) return;
    let cancelled = false;
    const refresh = async () => {
      const c = await countByStatus(currentOrganization.id);
      const age = await oldestPendingAgeSeconds(currentOrganization.id);
      const s = await getStorageStatus(true);
      if (cancelled) return;
      setCounts(c);
      setOldestAge(age);
      if (s) setStorage(s);
    };
    void refresh();
    const unsub = subscribeOutbox(refresh);
    const interval = window.setInterval(refresh, 10_000);
    return () => {
      cancelled = true;
      unsub();
      window.clearInterval(interval);
    };
  }, [currentOrganization?.id]);

  const handleReset = async () => {
    if (!window.confirm(
      t('offline.resetConfirm', 'Reset all offline data? Pending uploads will be lost.'),
    )) return;
    setIsWiping(true);
    try {
      await wipeOffline({ scope: 'all' });
      toast.success(t('offline.resetSuccess', 'Offline cache cleared. Reloading…'));
      window.setTimeout(() => window.location.reload(), 800);
    } catch (err) {
      toast.error(t('offline.resetError', 'Could not clear offline cache.'));
      console.error(err);
    } finally {
      setIsWiping(false);
    }
  };

  return (
    <div className="container max-w-3xl py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Wifi className="h-6 w-6" />
          {t('offline.pageTitle', 'Offline & sync')}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {t(
            'offline.pageSubtitle',
            'Status of the offline queue and the local cache used in the field.',
          )}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('offline.statusTitle', 'Connection')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground text-xs uppercase">{t('offline.statusLabel', 'Status')}</div>
              <div className="font-medium">
                {status === 'online'
                  ? t('offline.statusOnline', 'Online')
                  : status === 'offline'
                  ? t('offline.statusOffline', 'Offline')
                  : t('offline.statusLimited', 'Limited connectivity')}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground text-xs uppercase">{t('offline.oldestAgeLabel', 'Oldest pending')}</div>
              <div className="font-medium">{formatAge(oldestAge)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('offline.queueTitle', 'Sync queue')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4 text-sm">
            <Stat label={t('offline.pending', 'Pending')} value={counts.pending} tone="amber" />
            <Stat label={t('offline.inflight', 'In flight')} value={counts.inflight} tone="sky" />
            <Stat label={t('offline.failed', 'Failed')} value={counts.failed} tone="orange" />
            <Stat label={t('offline.dead', 'Dead-letter')} value={counts.dead} tone="red" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('offline.storageTitle', 'Local storage')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {storage ? (
            <>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t('offline.storageUsage', 'Used')}</span>
                <span className="font-medium">
                  {formatBytes(storage.usage)} / {formatBytes(storage.quota)} (
                  {(storage.ratio * 100).toFixed(1)}%)
                </span>
              </div>
              <div className="h-2 rounded bg-muted overflow-hidden">
                <div
                  className={`h-full ${
                    storage.ratio > 0.95
                      ? 'bg-red-600'
                      : storage.ratio > 0.8
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, storage.ratio * 100)}%` }}
                />
              </div>
              {!storage.persisted && (
                <p className="text-xs text-amber-600 flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {t(
                    'offline.notPersisted',
                    'Browser may evict cached data under pressure. Re-grant when prompted.',
                  )}
                </p>
              )}
            </>
          ) : (
            <p className="text-muted-foreground">{t('offline.storageUnavailable', 'Storage info unavailable.')}</p>
          )}
        </CardContent>
      </Card>

      <Card className="border-red-200 dark:border-red-900/50">
        <CardHeader>
          <CardTitle className="text-red-700 dark:text-red-400 flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            {t('offline.dangerTitle', 'Reset offline cache')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            {t(
              'offline.dangerDescription',
              'Clears the local IndexedDB outbox, photo queue, and persisted query cache for this device. Use only if the offline data appears corrupt.',
            )}
          </p>
          <p className="text-xs text-red-600 font-medium">
            {t(
              'offline.dangerWarning',
              'Warning: any pending sync items not yet uploaded will be permanently lost.',
            )}
          </p>
          <Button variant="destructive" onClick={handleReset} disabled={isWiping}>
            {isWiping
              ? t('offline.resetting', 'Resetting…')
              : t('offline.resetButton', 'Reset offline cache')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: 'amber' | 'sky' | 'orange' | 'red' }) {
  const colors: Record<string, string> = {
    amber: 'text-amber-600',
    sky: 'text-sky-600',
    orange: 'text-orange-600',
    red: 'text-red-600',
  };
  return (
    <div className="rounded border p-3">
      <div className="text-xs uppercase text-muted-foreground">{label}</div>
      <div className={`text-2xl font-bold ${colors[tone]}`}>{value}</div>
    </div>
  );
}
