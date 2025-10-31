import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import TasksList from '../components/Tasks/TasksList';
import TaskForm from '../components/Tasks/TaskForm';
import { useAuth } from '../components/MultiTenantAuthProvider';
import { useQuery } from '@tanstack/react-query';
import type { Task } from '../types/tasks';

function TasksListPage() {
  const { currentOrganization } = useAuth();
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [farms, setFarms] = useState<Array<{ id: string; name: string }>>([]);

  // Fetch selected task data when selectedTaskId changes
  const { data: selectedTask } = useQuery({
    queryKey: ['task', selectedTaskId],
    queryFn: async () => {
      if (!selectedTaskId) return null;
      const { supabase } = await import('../lib/supabase');
      const { data } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', selectedTaskId)
        .single();
      return data as Task;
    },
    enabled: !!selectedTaskId,
  });

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
