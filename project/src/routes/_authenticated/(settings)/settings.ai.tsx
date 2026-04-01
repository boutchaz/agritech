import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AiUsageBar } from '@/components/settings/AiUsageBar';
import { AIProvidersSettings } from '@/components/settings/AIProvidersSettings';
import { useAiQuota } from '@/hooks/useAiQuota';
import { useAuth } from '@/hooks/useAuth';
import { Brain } from 'lucide-react';
import { SettingsPageSkeleton } from '@/components/ui/page-skeletons';

export const Route = createFileRoute('/_authenticated/(settings)/settings/ai')({
  component: AiSettingsPage,
});

function AiSettingsPage() {
  const { t } = useTranslation();
  const { currentOrganization } = useAuth();
  const { data: quota, isLoading } = useAiQuota(currentOrganization?.id || null);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Brain className="w-6 h-6" />
          {t('ai.settings.title', 'AI Settings')}
        </h2>
        <p className="text-muted-foreground">
          {t('ai.settings.description', 'Manage your AI usage, quotas, and provider configuration.')}
        </p>
      </div>

      {/* AI Usage Quota */}
      {isLoading ? (
        <SettingsPageSkeleton />
      ) : quota ? (
        <Card>
          <CardHeader>
            <CardTitle>{t('ai.settings.usage', 'AI Usage This Month')}</CardTitle>
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

      {/* AI Provider Configuration */}
      <AIProvidersSettings />
    </div>
  );
}
