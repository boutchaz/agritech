import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useState, useMemo } from 'react';
import { Calendar, Scissors } from 'lucide-react';
import { tasksApi } from '@/lib/api/tasks';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { FilterBar, ResponsiveList, ListPageLayout } from '@/components/ui/data-table';
import { TableCell, TableHead } from '@/components/ui/table';

export const Route = createFileRoute('/_authenticated/(production)/pruning')({
  component: Pruning,
});

function Pruning() {
  const { t } = useTranslation();
  const { organizationId } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');

  // Use existing tasks API - filter for pruning tasks
  const { data: allTasks, isLoading } = useQuery({
    queryKey: ['tasks', organizationId],
    queryFn: () => tasksApi.list(organizationId!),
    enabled: !!organizationId,
  });

  // Filter tasks for pruning (task_type='maintenance' and title contains 'pruning' or has custom sub_type)
  const pruningTasks = useMemo(() => {
    const tasks = allTasks?.filter(task =>
      task.task_type === 'maintenance' &&
      (task.title?.toLowerCase().includes('pruning') ||
       task.title?.toLowerCase().includes('taille'))
    ) || [];

    if (!searchTerm.trim()) return tasks;
    const q = searchTerm.toLowerCase();
    return tasks.filter(
      (task) =>
        task.title?.toLowerCase().includes(q) ||
        task.farm_name?.toLowerCase().includes(q) ||
        task.description?.toLowerCase().includes(q)
    );
  }, [allTasks, searchTerm]);

  const upcomingPruning = useMemo(() =>
    pruningTasks
      .filter(task =>
        task.status === 'pending' &&
        task.scheduled_date &&
        new Date(task.scheduled_date) >= new Date()
      )
      .sort((a, b) =>
        new Date(a.scheduled_date || 0).getTime() - new Date(b.scheduled_date || 0).getTime()
      )
      .slice(0, 5),
    [pruningTasks]
  );

  const statusBadge = (status: string) => {
    const variant = status === 'completed' ? 'default' : status === 'in_progress' ? 'secondary' : 'outline';
    return <Badge variant={variant}>{status}</Badge>;
  };

  return (
    <ListPageLayout
      header={
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Scissors className="h-8 w-8" />
              {t('pruning.title', 'Pruning Management')}
            </h1>
            <p className="text-muted-foreground">
              {t('pruning.description', 'Track pruning schedules and records')}
            </p>
          </div>
        </div>
      }
      filters={
        <FilterBar
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder={t('pruning.searchPlaceholder', 'Search pruning tasks...')}
        />
      }
    >
      {/* Upcoming Pruning */}
      {upcomingPruning.length > 0 && (
        <div className="mb-6 rounded-lg border bg-card p-4">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {t('pruning.upcoming', 'Upcoming Pruning')}
          </h2>
          <div className="space-y-2">
            {upcomingPruning.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between p-3 bg-accent/50 rounded-lg hover:bg-accent transition-colors"
              >
                <div>
                  <div className="font-medium">{task.title}</div>
                  <div className="text-sm text-muted-foreground">
                    {task.farm_name && `${t('pruning.farm', 'Farm')}: ${task.farm_name}`}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium">
                    {task.scheduled_date
                      ? format(new Date(task.scheduled_date), 'MMM dd, yyyy')
                      : t('pruning.notScheduled', 'Not scheduled')}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {statusBadge(task.status)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Pruning Tasks */}
      <div>
        <h2 className="text-xl font-semibold mb-4">
          {t('pruning.history', 'Pruning History')}
        </h2>
        <ResponsiveList
          items={pruningTasks}
          isLoading={isLoading}
          keyExtractor={(task) => task.id}
          emptyIcon={Scissors}
          emptyMessage={t('pruning.noRecords', 'No pruning records yet')}
          renderCard={(task) => (
            <div className="p-4 border border-border rounded-lg hover:shadow-md transition-shadow bg-card">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2 flex-1">
                  <div className="font-semibold">{task.title}</div>
                  <div className="text-sm text-muted-foreground">
                    {task.scheduled_date
                      ? format(new Date(task.scheduled_date), 'MMM dd, yyyy')
                      : t('pruning.noDate', 'No date')}
                  </div>
                  {task.description && (
                    <div className="text-sm text-muted-foreground">
                      {task.description}
                    </div>
                  )}
                </div>
                <div className="flex-shrink-0">
                  {statusBadge(task.status)}
                </div>
              </div>
            </div>
          )}
          renderTableHeader={
            <>
              <TableHead>{t('pruning.task', 'Task')}</TableHead>
              <TableHead>{t('pruning.scheduledDate', 'Scheduled Date')}</TableHead>
              <TableHead>{t('pruning.farm', 'Farm')}</TableHead>
              <TableHead>{t('pruning.status', 'Status')}</TableHead>
            </>
          }
          renderTable={(task) => (
            <>
              <TableCell className="font-medium">{task.title}</TableCell>
              <TableCell>
                {task.scheduled_date
                  ? format(new Date(task.scheduled_date), 'MMM dd, yyyy')
                  : '-'}
              </TableCell>
              <TableCell>{task.farm_name || '-'}</TableCell>
              <TableCell>{statusBadge(task.status)}</TableCell>
            </>
          )}
        />
      </div>
    </ListPageLayout>
  );
}
