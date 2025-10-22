import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import TasksCalendar from '../components/Tasks/TasksCalendar';
import { useAuth } from '../components/MultiTenantAuthProvider';

function TasksCalendarPage() {
  const { currentOrganization } = useAuth();
  const [farms, setFarms] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    const fetchFarms = async () => {
      if (!currentOrganization?.id) return;

      try {
        const { supabase } = await import('../lib/supabase');
        const { data } = await supabase
          .from('farms')
          .select('id, name')
          .eq('organization_id', currentOrganization.id)
          .order('name');

        setFarms(data || []);
      } catch (error) {
        console.error('Error fetching farms:', error);
      }
    };

    fetchFarms();
  }, [currentOrganization]);

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
