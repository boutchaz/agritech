import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { Calendar, Scissors } from 'lucide-react';
import { tasksApi } from '@/lib/api/tasks';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';

export const Route = createFileRoute('/_authenticated/(production)/pruning')({
  component: Pruning,
});

function Pruning() {
  const { t } = useTranslation();
  const { organizationId } = useAuth();

  // Use existing tasks API - filter for pruning tasks
  const { data: allTasks, isLoading } = useQuery({
    queryKey: ['tasks', organizationId],
    queryFn: () => tasksApi.list(organizationId!),
    enabled: !!organizationId,
  });

  // Filter tasks for pruning (task_type='maintenance' and title contains 'pruning' or has custom sub_type)
  const pruningTasks = allTasks?.filter(task =>
    task.task_type === 'maintenance' &&
    (task.title?.toLowerCase().includes('pruning') ||
     task.title?.toLowerCase().includes('taille'))
  ) || [];

  const upcomingPruning = pruningTasks.filter(task =>
    task.status === 'pending' &&
    task.scheduled_date &&
    new Date(task.scheduled_date) >= new Date()
  ).sort((a, b) =>
    new Date(a.scheduled_date || 0).getTime() - new Date(b.scheduled_date || 0).getTime()
  ).slice(0, 5);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
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

      {/* Upcoming Pruning */}
      {upcomingPruning.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {t('pruning.upcoming', 'Upcoming Pruning')}
            </h2>
            <div className="space-y-3">
              {upcomingPruning.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-3 bg-accent/50 rounded-lg hover:bg-accent transition-colors"
                >
                  <div>
                    <div className="font-medium">{task.title}</div>
                    <div className="text-sm text-muted-foreground">
                      {task.farm_name && `Farm: ${task.farm_name}`}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">
                      {task.scheduled_date
                        ? format(new Date(task.scheduled_date), 'MMM dd, yyyy')
                        : 'Not scheduled'}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {task.status}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Pruning Tasks */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      ) : pruningTasks.length > 0 ? (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">
            {t('pruning.history', 'Pruning History')}
          </h2>
          <div className="space-y-3">
            {pruningTasks.map((task) => (
              <Card key={task.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="font-semibold">{task.title}</div>
                      <div className="text-sm text-muted-foreground">
                        {task.scheduled_date
                          ? format(new Date(task.scheduled_date), 'MMM dd, yyyy')
                          : 'No date'}
                      </div>
                      {task.description && (
                        <div className="text-sm text-muted-foreground">
                          {task.description}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                        task.status === 'completed' ? 'bg-green-100 text-green-800' :
                        task.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {task.status}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-64 border rounded-lg border-dashed">
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2">
              {t('pruning.noRecords', 'No pruning records yet')}
            </h3>
            <p className="text-muted-foreground">
              {t('pruning.noRecordsDesc', 'Create pruning tasks to track your activities')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
