import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import TasksCalendar from '@/components/Tasks/TasksCalendar';
import { useAuth } from '@/hooks/useAuth';
import { farmsApi } from '@/lib/api/farms';

function TasksCalendarPage() {
  const { currentOrganization } = useAuth();

  // Fetch farms - now uses NestJS API
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

  if (!currentOrganization) return null;

  return (
    <TasksCalendar
      organizationId={currentOrganization.id}
      farms={farms}
    />
  );
}

export const Route = createFileRoute('/_authenticated/(workforce)/workforce/tasks/calendar')({
  component: TasksCalendarPage,
});
