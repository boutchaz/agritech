import React from 'react';
import { useNetworkStatusContext } from './NetworkStatusProvider';
import { useTranslation } from 'react-i18next';
import { WifiOff, Wifi, WifiLow } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OfflineIndicatorProps {
  className?: string;
  showWhenOnline?: boolean;
}

/**
 * Small indicator that shows network status
 * Displays in the top-right corner by default
 */
export function OfflineIndicator({ className, showWhenOnline = false }: OfflineIndicatorProps) {
  const { isOnline, isSlowConnection, connectionType } = useNetworkStatusContext();
  const { t } = useTranslation();

  // Don't show if online and showWhenOnline is false
  if (isOnline && !showWhenOnline && !isSlowConnection) {
    return null;
  }

  return (
    <div
      className={cn(
        'fixed top-4 right-4 z-50 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium shadow-lg transition-all',
        {
          'bg-destructive text-destructive-foreground': !isOnline,
          'bg-warning text-warning-foreground': isOnline && isSlowConnection,
          'bg-success text-success-foreground': isOnline && !isSlowConnection,
        },
        className
      )}
      role="status"
      aria-live="polite"
    >
      {!isOnline ? (
        <>
          <WifiOff className="h-4 w-4" />
          <span>{t('network.offline.indicator')}</span>
        </>
      ) : isSlowConnection ? (
        <>
          <WifiLow className="h-4 w-4" />
          <span>
            {t('network.slow.indicator')} ({connectionType})
          </span>
        </>
      ) : (
        <>
          <Wifi className="h-4 w-4" />
          <span>{t('network.online.indicator')}</span>
        </>
      )}
    </div>
  );
}
