import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import TasksList from '../components/Tasks/TasksList';
import TaskForm from '../components/Tasks/TaskForm';
import { useAuth } from '../components/MultiTenantAuthProvider';
import { useQuery } from '@tanstack/react-query';
import { tasksApi } from '../lib/api/tasks';
import { farmsApi } from '../lib/api/farms';
import type { Task } from '../types/tasks';

function TasksListPage() {
  const { currentOrganization } = useAuth();
  const [showTaskForm, setShowTaskForm] = useState(false);
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
      const farmsList = await farmsApi.getAll(
        { organization_id: currentOrganization.id },
        currentOrganization.id
      );
      return farmsList.map(f => ({ id: f.id, name: f.name }));
    },
    enabled: !!currentOrganization?.id,
  });

  // Open form when a task is selected
  const handleSelectTask = (taskId: string) => {
    setSelectedTaskId(taskId);
    setShowTaskForm(true);
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

      {/* Task Form Modal */}
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

export const Route = createFileRoute('/tasks/')({
  component: TasksListPage,
});
