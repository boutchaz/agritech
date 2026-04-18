import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import TasksList from '@/components/Tasks/TasksList';
import TaskForm from '@/components/Tasks/TaskForm';
import TaskDetailDialog from '@/components/Tasks/TaskDetailDialog';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { tasksApi } from '@/lib/api/tasks';
import { farmsApi } from '@/lib/api/farms';
import type { Task } from '@/types/tasks';

function TasksListPage() {
  const { currentOrganization } = useAuth();
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showTaskDetail, setShowTaskDetail] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // Fetch selected task data when selectedTaskId changes - now uses NestJS API
  const { data: selectedTask } = useQuery({
    queryKey: ['task', currentOrganization?.id, selectedTaskId],
    queryFn: async () => {
      if (!selectedTaskId || !currentOrganization?.id) return null;
      return tasksApi.getById(currentOrganization.id, selectedTaskId) as Promise<Task>;
    },
    enabled: !!selectedTaskId && !!currentOrganization?.id,
  });

  // Fetch farms - now uses NestJS API
  const { data: farms = [] } = useQuery({
    queryKey: ['farms', currentOrganization?.id],
    queryFn: async () => {
      if (!currentOrganization?.id) return [];
      const farms = await farmsApi.getAll(
        { organization_id: currentOrganization.id },
        currentOrganization.id
      );
      return (farms || []).map((f: { farm_id?: string; id?: string; farm_name?: string; name?: string }) => ({
        id: f.farm_id || f.id || '',
        name: f.farm_name || f.name || '',
      }));
    },
    enabled: !!currentOrganization?.id,
  });

  // Open detail dialog when a task is selected
  const handleSelectTask = (taskId: string) => {
    setSelectedTaskId(taskId);
    setShowTaskDetail(true);
  };

  // Open form for creating new task
  const handleCreateTask = () => {
    setSelectedTaskId(null);
    setShowTaskForm(true);
  };

  // Switch from detail view to edit view
  const handleEditTask = () => {
    setShowTaskDetail(false);
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

      {/* Task Detail Dialog */}
      {showTaskDetail && selectedTask && (
        <TaskDetailDialog
          task={selectedTask}
          organizationId={currentOrganization.id}
          onClose={() => {
            setShowTaskDetail(false);
            setSelectedTaskId(null);
          }}
          onEdit={handleEditTask}
        />
      )}

      {/* Task Form Modal (for editing) */}
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

export const Route = createFileRoute('/_authenticated/(workforce)/workforce/tasks/')({
  component: TasksListPage,
});
