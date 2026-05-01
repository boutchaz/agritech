import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import TasksList from '@/components/Tasks/TasksList';
import TaskForm from '@/components/Tasks/TaskForm';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { tasksApi } from '@/lib/api/tasks';
import { farmsApi } from '@/lib/api/farms';
import type { Task } from '@/types/tasks';

function TasksListPage() {
  const { currentOrganization } = useAuth();
  const navigate = useNavigate();
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // Support ?editTaskId= for opening the edit form from detail page
  const search = Route.useSearch() as { editTaskId?: string };
  useEffect(() => {
    if (search.editTaskId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedTaskId(search.editTaskId);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowTaskForm(true);
    }
  }, [search.editTaskId]);

  // Fetch selected task data when selectedTaskId changes (for editing)
  const { data: selectedTask } = useQuery({
    queryKey: ['task', currentOrganization?.id, selectedTaskId],
    queryFn: async () => {
      if (!selectedTaskId || !currentOrganization?.id) return null;
      return tasksApi.getById(currentOrganization.id, selectedTaskId) as Promise<Task>;
    },
    enabled: !!selectedTaskId && !!currentOrganization?.id,
  });

  // Fetch farms
  const { data: farms = [] } = useQuery({
    queryKey: ['farms', currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) return [];
      const data = await farmsApi.getAll(
        { organization_id: currentOrganization.id },
        currentOrganization.id
      );
      return (data || []).map((f: { farm_id?: string; id?: string; farm_name?: string; name?: string }) => ({
        id: f.farm_id || f.id || '',
        name: f.farm_name || f.name || '',
      }));
    },
    enabled: !!currentOrganization?.id,
  });

  // Navigate to dedicated task detail page
  const handleSelectTask = (taskId: string) => {
    navigate({ to: '/tasks/$taskId', params: { taskId } });
  };

  // Open form for creating new task
  const handleCreateTask = () => {
    setSelectedTaskId(null);
    setShowTaskForm(true);
  };

  if (!currentOrganization) return null;

  return (
    <>
      <TasksList
        organizationId={currentOrganization.id}
        onSelectTask={handleSelectTask}
        onCreateTask={handleCreateTask}
      />

      {/* Task Form Modal (for creating/editing) */}
      {showTaskForm && (
        <TaskForm
          task={selectedTask}
          organizationId={currentOrganization.id}
          farms={farms}
          onClose={() => {
            setShowTaskForm(false);
            setSelectedTaskId(null);
          }}
          onSuccess={() => {
            setShowTaskForm(false);
            setSelectedTaskId(null);
          }}
        />
      )}
    </>
  );
}

export const Route = createFileRoute('/_authenticated/(workforce)/tasks/')({
  component: TasksListPage,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      editTaskId: (search.editTaskId as string) || undefined,
    };
  },
});
