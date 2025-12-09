import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import TasksCalendar from '../components/Tasks/TasksCalendar';
import { useAuth } from '../components/MultiTenantAuthProvider';
import { farmsApi } from '../lib/api/farms';

function TasksCalendarPage() {
  const { currentOrganization } = useAuth();

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

  if (!currentOrganization) return null;

  return (
    <TasksCalendar
      organizationId={currentOrganization.id}
      farms={farms}
    />
  );
}

export const Route = createFileRoute('/tasks/calendar')({
  component: TasksCalendarPage,
});
