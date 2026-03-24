import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createFileRoute } from '@tanstack/react-router';
import {
  Search,
  Filter,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Clock,
  RefreshCw,
  CircleDot,
  ShieldCheck,
  Building2,
} from 'lucide-react';

import { Input } from '@/components/ui/Input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/radix-select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CorrectiveActionsList } from '@/components/compliance/CorrectiveActionsList';
import { UpdateActionStatusDialog } from '@/components/compliance/UpdateActionStatusDialog';

import ModernPageHeader from '@/components/ModernPageHeader';
import { PageLayout } from '@/components/PageLayout';

import { useCorrectiveActions, useCorrectiveActionStats, useDeleteCorrectiveAction } from '@/hooks/useCompliance';
import { useAuth } from '@/hooks/useAuth';
import {
  CorrectiveActionStatus,
  CorrectiveActionPriority,
  type CorrectiveActionPlanResponseDto,
} from '@/lib/api/compliance';

export const Route = createFileRoute('/_authenticated/compliance/corrective-actions/')({
  component: CorrectiveActionsPage,
});

function CorrectiveActionsPage() {
  const { t } = useTranslation('compliance');
  const { currentOrganization } = useAuth();
  const orgId = currentOrganization?.id || null;

  const statusLabels: Record<CorrectiveActionStatus, string> = {
    [CorrectiveActionStatus.OPEN]: t('status.open'),
    [CorrectiveActionStatus.IN_PROGRESS]: t('status.inProgress'),
    [CorrectiveActionStatus.RESOLVED]: t('status.resolved'),
    [CorrectiveActionStatus.VERIFIED]: t('status.verified'),
    [CorrectiveActionStatus.OVERDUE]: t('status.overdue'),
  };

  const priorityLabels: Record<CorrectiveActionPriority, string> = {
    [CorrectiveActionPriority.CRITICAL]: t('priority.critical'),
    [CorrectiveActionPriority.HIGH]: t('priority.high'),
    [CorrectiveActionPriority.MEDIUM]: t('priority.medium'),
    [CorrectiveActionPriority.LOW]: t('priority.low'),
  };

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [selectedAction, setSelectedAction] = useState<CorrectiveActionPlanResponseDto | null>(null);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);

  const apiFilters = {
    ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
    ...(priorityFilter !== 'all' ? { priority: priorityFilter } : {}),
  };

  const { data: actions, isLoading } = useCorrectiveActions(orgId, Object.keys(apiFilters).length > 0 ? apiFilters : undefined);
  const { data: stats } = useCorrectiveActionStats(orgId);
  const deleteAction = useDeleteCorrectiveAction();

  const filteredActions = actions?.filter(action => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      action.finding_description.toLowerCase().includes(q) ||
      action.action_description.toLowerCase().includes(q) ||
      action.responsible_person.toLowerCase().includes(q) ||
      (action.requirement_code?.toLowerCase().includes(q) ?? false)
    );
  }) || [];

  const handleUpdateStatus = (action: CorrectiveActionPlanResponseDto) => {
    setSelectedAction(action);
    setShowUpdateDialog(true);
  };

  const handleDelete = (action: CorrectiveActionPlanResponseDto) => {
    if (!currentOrganization) return;
    if (confirm(t('correctiveActions.deleteConfirm'))) {
      deleteAction.mutate({
        organizationId: currentOrganization.id,
        actionId: action.id,
      });
    }
  };

  return (
    <PageLayout
      header={
        <ModernPageHeader
          breadcrumbs={[
            { icon: Building2, label: currentOrganization?.name || '', path: '/dashboard' },
            { icon: ShieldAlert, label: t('breadcrumb.compliance'), path: '/compliance' },
            { icon: ShieldAlert, label: t('breadcrumb.correctiveActions'), isActive: true },
          ]}
          title={t('correctiveActions.title')}
          subtitle={t('correctiveActions.subtitle')}
        />
      }
    >
    <div className="container mx-auto px-4 py-6 space-y-8">

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard
          title={t('status.open')}
          value={stats?.open ?? 0}
          icon={CircleDot}
          iconColor="text-gray-600"
        />
        <StatCard
          title={t('status.inProgress')}
          value={stats?.in_progress ?? 0}
          icon={RefreshCw}
          iconColor="text-blue-600"
        />
        <StatCard
          title={t('status.overdue')}
          value={stats?.overdue ?? 0}
          icon={AlertTriangle}
          iconColor="text-red-600"
        />
        <StatCard
          title={t('status.resolved')}
          value={stats?.resolved ?? 0}
          icon={CheckCircle2}
          iconColor="text-green-600"
        />
        <StatCard
          title={t('status.verified')}
          value={stats?.verified ?? 0}
          icon={ShieldCheck}
          iconColor="text-emerald-600"
        />
      </div>

      {stats && stats.total > 0 && (
        <Card className="bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950/20 dark:to-green-950/20 border-emerald-200 dark:border-emerald-800">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-900/40 rounded-lg">
                  <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">
                    {t('correctiveActions.resolutionRate')}
                  </p>
                  <p className="text-xs text-emerald-700 dark:text-emerald-300">
                    {t('correctiveActions.actionsProcessed', { resolved: stats.resolved + stats.verified, total: stats.total })}
                  </p>
                </div>
              </div>
              <div className="text-3xl font-bold text-emerald-700 dark:text-emerald-300">
                {Math.round(stats.resolution_rate)}%
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col md:flex-row gap-4 items-center bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('correctiveActions.searchPlaceholder')}
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <SelectValue placeholder={t('table.status')} />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('correctiveActions.allStatuses')}</SelectItem>
              {Object.entries(statusLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-[150px]">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <SelectValue placeholder={t('correctiveActions.priority')} />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('correctiveActions.allPriorities')}</SelectItem>
              {Object.entries(priorityLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <CorrectiveActionsList
        actions={filteredActions}
        isLoading={isLoading}
        showCertification
        onUpdateStatus={handleUpdateStatus}
        onDelete={handleDelete}
      />

      {selectedAction && (
        <UpdateActionStatusDialog
          action={selectedAction}
          open={showUpdateDialog}
          onOpenChange={(open) => {
            setShowUpdateDialog(open);
            if (!open) setSelectedAction(null);
          }}
        />
      )}
    </div>
    </PageLayout>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  iconColor,
}: {
  title: string;
  value: number;
  icon: typeof Clock;
  iconColor: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className={`h-4 w-4 ${iconColor}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}
