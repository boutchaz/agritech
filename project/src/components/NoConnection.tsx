import React, { useState } from 'react';
import { useNetworkStatusContext } from './NetworkStatusProvider';
import { useTranslation } from 'react-i18next';
import { WifiOff, RefreshCw, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface NoConnectionProps {
  /** Custom illustration or icon */
  illustration?: React.ReactNode;
  /** Show tips for troubleshooting */
  showTroubleshootingTips?: boolean;
  /** Custom className */
  className?: string;
  /** Callback when retry is clicked */
  onRetry?: () => void;
}

/**
 * Full-page view displayed when there's no network connection
 * Includes retry button and troubleshooting tips
 */
export function NoConnection({
  illustration,
  showTroubleshootingTips = true,
  className,
  onRetry,
}: NoConnectionProps) {
  const { checkConnectivity } = useNetworkStatusContext();
  const { t } = useTranslation();
  const [isChecking, setIsChecking] = useState(false);

  const handleRetry = async () => {
    setIsChecking(true);
    try {
      const isOnline = await checkConnectivity();
      if (isOnline) {
        window.location.reload();
      }
      onRetry?.();
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div
      className={cn(
        'flex min-h-screen items-center justify-center bg-gradient-to-b from-background to-muted/20 p-4',
        className
      )}
    >
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
            {illustration || <WifiOff className="h-10 w-10 text-destructive" />}
          </div>
          <CardTitle className="text-2xl">{t('network.noConnection.title')}</CardTitle>
          <CardDescription className="text-base">
            {t('network.noConnection.description')}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Retry Button */}
          <Button
            onClick={handleRetry}
            disabled={isChecking}
            className="w-full"
            size="lg"
          >
            {isChecking ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                {t('network.noConnection.checking')}
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                {t('network.noConnection.retry')}
              </>
            )}
          </Button>

          {/* Troubleshooting Tips */}
          {showTroubleshootingTips && (
            <div className="space-y-3 rounded-lg border bg-muted/50 p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <AlertTriangle className="h-4 w-4" />
                {t('network.noConnection.troubleshooting.title')}
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-primary">•</span>
                  <span>{t('network.noConnection.troubleshooting.tip1')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-primary">•</span>
                  <span>{t('network.noConnection.troubleshooting.tip2')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-primary">•</span>
                  <span>{t('network.noConnection.troubleshooting.tip3')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-primary">•</span>
                  <span>{t('network.noConnection.troubleshooting.tip4')}</span>
                </li>
              </ul>
            </div>
          )}

          {/* Connection Details */}
          <div className="space-y-2 text-center text-xs text-muted-foreground">
            <p>{t('network.noConnection.willAutoReconnect')}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
