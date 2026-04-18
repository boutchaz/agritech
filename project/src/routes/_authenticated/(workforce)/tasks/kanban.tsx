import { createFileRoute, useNavigate } from '@tanstack/react-router';
import TasksKanban from '@/components/Tasks/TasksKanban';
import { useAuth } from '@/hooks/useAuth';

function TasksKanbanPage() {
  const { currentOrganization } = useAuth();
  const navigate = useNavigate();

  if (!currentOrganization) return null;

  const handleSelectTask = (taskId: string) => {
    navigate({ to: '/tasks/$taskId', params: { taskId } });
  };

  return (
    <TasksKanban
      organizationId={currentOrganization.id}
      onSelectTask={handleSelectTask}
    />
  );
}

export const Route = createFileRoute('/_authenticated/(workforce)/tasks/kanban')({
  component: TasksKanbanPage,
});
