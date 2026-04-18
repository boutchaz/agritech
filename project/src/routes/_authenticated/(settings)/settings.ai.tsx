import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AiUsageBar } from '@/components/settings/AiUsageBar';
import { AiTokenUsage } from '@/components/settings/AiTokenUsage';
import { AIProvidersSettings } from '@/components/settings/AIProvidersSettings';
import { useAiQuota, useAiUsageLog } from '@/hooks/useAiQuota';
import { useAuth } from '@/hooks/useAuth';
import { AlertCircle, Brain } from 'lucide-react';
import { SettingsPageSkeleton } from '@/components/ui/page-skeletons';

export const Route = createFileRoute('/_authenticated/(settings)/settings/ai')({
  component: AiSettingsPage,
});

function AiSettingsPage() {
  const { t } = useTranslation('ai');
  const { t: tCommon } = useTranslation('common');
  const { currentOrganization } = useAuth();
  const orgId = currentOrganization?.id || null;
  const { data: quota, isLoading } = useAiQuota(orgId);
  const {
    data: usageLog,
    isLoading: isLoadingLog,
    isError: isUsageLogError,
    error: usageLogError,
    refetch: refetchUsageLog,
  } = useAiUsageLog(orgId);

  return (
    <div className="min-w-0 max-w-full space-y-6 overflow-x-hidden">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Brain className="w-6 h-6" />
          {t('settings.title', 'AI Settings')}
        </h2>
        <p className="text-muted-foreground">
          {t('settings.description', 'Manage your AI usage, quotas, and provider configuration.')}
        </p>
      </div>

      {/* AI Usage Quota */}
      {isLoading ? (
        <SettingsPageSkeleton />
      ) : quota ? (
        <Card>
          <CardHeader>
            <CardTitle>{t('settings.usage', 'AI Usage This Month')}</CardTitle>
          </CardHeader>
          <CardContent>
            <AiUsageBar
              currentCount={quota.current_count}
              monthlyLimit={quota.monthly_limit}
              periodEnd={quota.period_end}
              isByok={quota.is_byok}
              isUnlimited={quota.is_unlimited}
            />
          </CardContent>
        </Card>
      ) : null}

      {/* Token Usage Details */}
      {isUsageLogError ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>
            {t('usage.loadFailedTitle', 'Could not load usage details')}
          </AlertTitle>
          <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>
              {usageLogError instanceof Error
                ? usageLogError.message
                : t('usage.loadFailedDescription', 'Check your connection and try again.')}
            </span>
            <Button type="button" variant="outline" size="sm" onClick={() => refetchUsageLog()}>
              {tCommon('app.retry', 'Retry')}
            </Button>
          </AlertDescription>
        </Alert>
      ) : isLoadingLog ? (
        <SettingsPageSkeleton />
      ) : usageLog ? (
        <AiTokenUsage usageLog={usageLog} />
      ) : null}

      {/* AI Provider Configuration */}
      <AIProvidersSettings />
    </div>
  );
}
