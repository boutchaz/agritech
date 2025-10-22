import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import TasksList from '../components/Tasks/TasksList';
import TaskForm from '../components/Tasks/TaskForm';
import { useAuth } from '../components/MultiTenantAuthProvider';

function TasksListPage() {
  const { currentOrganization } = useAuth();
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
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
    <>
      <TasksList
        organizationId={currentOrganization.id}
        onSelectTask={setSelectedTaskId}
        onCreateTask={() => setShowTaskForm(true)}
      />

      {/* Task Form Modal */}
      {showTaskForm && (
        <TaskForm
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
