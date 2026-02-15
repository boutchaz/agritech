import { useState } from 'react';
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

const statusLabels: Record<CorrectiveActionStatus, string> = {
  [CorrectiveActionStatus.OPEN]: 'Ouverte',
  [CorrectiveActionStatus.IN_PROGRESS]: 'En cours',
  [CorrectiveActionStatus.RESOLVED]: 'Résolue',
  [CorrectiveActionStatus.VERIFIED]: 'Vérifiée',
  [CorrectiveActionStatus.OVERDUE]: 'En retard',
};

const priorityLabels: Record<CorrectiveActionPriority, string> = {
  [CorrectiveActionPriority.CRITICAL]: 'Critique',
  [CorrectiveActionPriority.HIGH]: 'Haute',
  [CorrectiveActionPriority.MEDIUM]: 'Moyenne',
  [CorrectiveActionPriority.LOW]: 'Basse',
};

function CorrectiveActionsPage() {
  const { currentOrganization } = useAuth();
  const orgId = currentOrganization?.id || null;

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
    if (confirm('Êtes-vous sûr de vouloir supprimer cette action corrective ?')) {
      deleteAction.mutate({
        organizationId: currentOrganization.id,
        actionId: action.id,
      });
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Actions Correctives
          </h1>
          <p className="text-muted-foreground mt-1">
            Suivez et gérez les actions correctives issues de vos contrôles de conformité.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard
          title="Ouvertes"
          value={stats?.open ?? 0}
          icon={CircleDot}
          iconColor="text-gray-600"
        />
        <StatCard
          title="En cours"
          value={stats?.in_progress ?? 0}
          icon={RefreshCw}
          iconColor="text-blue-600"
        />
        <StatCard
          title="En retard"
          value={stats?.overdue ?? 0}
          icon={AlertTriangle}
          iconColor="text-red-600"
        />
        <StatCard
          title="Résolues"
          value={stats?.resolved ?? 0}
          icon={CheckCircle2}
          iconColor="text-green-600"
        />
        <StatCard
          title="Vérifiées"
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
                    Taux de résolution
                  </p>
                  <p className="text-xs text-emerald-700 dark:text-emerald-300">
                    {stats.resolved + stats.verified} sur {stats.total} actions traitées
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
            placeholder="Rechercher par constat, action, responsable..."
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
                <SelectValue placeholder="Statut" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              {Object.entries(statusLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-[150px]">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <SelectValue placeholder="Priorité" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes priorités</SelectItem>
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
