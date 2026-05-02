import { useEffect, useState } from 'react';
import { CloudOff, RefreshCw, AlertTriangle, Wifi } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useOnlineStatus } from '@/lib/offline/useOnlineStatus';
import { countByStatus, subscribeOutbox } from '@/lib/offline/outbox';
import { useOrganizationStore } from '@/stores/organizationStore';
import { cn } from '@/lib/utils';

interface Counts {
  pending: number;
  inflight: number;
  failed: number;
  dead: number;
}

export function OfflineBanner({
  onReviewDeadLetters,
}: {
  onReviewDeadLetters?: () => void;
}) {
  const { t } = useTranslation();
  const status = useOnlineStatus();
  const orgId = useOrganizationStore((s) => s.currentOrganization?.id ?? null);
  const [counts, setCounts] = useState<Counts>({ pending: 0, inflight: 0, failed: 0, dead: 0 });

  useEffect(() => {
    if (!orgId) return;
    let cancelled = false;
    const refresh = async () => {
      const c = await countByStatus(orgId);
      if (!cancelled) setCounts(c);
    };
    void refresh();
    const unsub = subscribeOutbox(refresh);
    const interval = window.setInterval(refresh, 5_000);
    return () => {
      cancelled = true;
      unsub();
      window.clearInterval(interval);
    };
  }, [orgId]);

  const totalPending = counts.pending + counts.inflight;
  const hasFailed = counts.failed > 0 || counts.dead > 0;

  if (status === 'online' && totalPending === 0 && !hasFailed) return null;

  let tone: 'red' | 'amber' | 'purple' | 'sky' = 'sky';
  let icon = <Wifi className="h-4 w-4" />;
  let text = '';

  if (status === 'offline') {
    tone = 'red';
    icon = <CloudOff className="h-4 w-4" />;
    text = totalPending > 0
      ? t('offlineBanner.offlineWithPending', `Offline — ${totalPending} pending`, { count: totalPending })
      : t('offlineBanner.offline', 'Offline');
  } else if (counts.inflight > 0) {
    tone = 'amber';
    icon = <RefreshCw className="h-4 w-4 animate-spin" />;
    text = t('offlineBanner.syncing', `Syncing… ${counts.inflight}`, { count: counts.inflight });
  } else if (totalPending > 0) {
    tone = 'amber';
    icon = <RefreshCw className="h-4 w-4" />;
    text = t('offlineBanner.pendingActions', `${totalPending} action(s) pending`, { count: totalPending });
  } else if (counts.dead > 0) {
    tone = 'purple';
    icon = <AlertTriangle className="h-4 w-4" />;
    text = t('offlineBanner.failedActions', `${counts.dead} action(s) failed`, { count: counts.dead });
  } else if (status === 'limited') {
    tone = 'sky';
    icon = <Wifi className="h-4 w-4" />;
    text = t('offlineBanner.limitedConnection', 'Limited connection');
  }

  const colorMap = {
    red: 'bg-red-600 text-white',
    amber: 'bg-amber-500 text-white',
    purple: 'bg-purple-600 text-white',
    sky: 'bg-sky-600 text-white',
  } as const;

  return (
    <div
      className={cn(
        'fixed top-0 inset-x-0 z-[100] flex items-center justify-center gap-2 px-3 py-1 text-xs font-medium shadow',
        colorMap[tone],
      )}
      role="status"
      aria-live="polite"
    >
      {icon}
      <span>{text}</span>
      {counts.dead > 0 && onReviewDeadLetters ? (
        <button
          type="button"
          onClick={onReviewDeadLetters}
          className="ml-2 rounded bg-white/20 px-2 py-0.5 hover:bg-white/30"
        >
          {t('offlineBanner.review', 'Review')}
        </button>
      ) : null}
    </div>
  );
}
