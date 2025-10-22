import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { CheckSquare, Calendar, BarChart3, Building2 } from 'lucide-react';
import TasksList from '../components/Tasks/TasksList';
import TaskForm from '../components/Tasks/TaskForm';
import { useAuth } from '../components/MultiTenantAuthProvider';
import Sidebar from '../components/Sidebar';
import PageHeader from '../components/PageHeader';
import type { Module } from '../types';

const mockModules: Module[] = [
  {
    id: 'fruit-trees',
    name: 'Arbres Fruitiers',
    icon: 'Tree',
    active: true,
    category: 'agriculture',
    description: 'Gérez vos vergers',
    metrics: []
  },
];

function TasksPage() {
  const { currentOrganization, currentFarm } = useAuth();
  const [activeModule, setActiveModule] = useState('tasks');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [modules] = useState(mockModules);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'list' | 'calendar' | 'stats'>('list');
  const [farms, setFarms] = useState<Array<{ id: string; name: string }>>([]);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

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

  if (!currentOrganization) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex min-h-screen ${isDarkMode ? 'dark' : ''}`}>
      <Sidebar
        modules={modules.filter(m => m.active)}
        activeModule={activeModule}
        onModuleChange={setActiveModule}
        isDarkMode={isDarkMode}
        onThemeToggle={toggleTheme}
      />
      <main className="flex-1 bg-gray-50 dark:bg-gray-900 w-full lg:w-auto">
        <PageHeader
          breadcrumbs={[
            { icon: Building2, label: currentOrganization.name },
            { icon: CheckSquare, label: 'Tâches', isActive: true }
          ]}
        />

        <div className="p-3 sm:p-4 lg:p-6">
          {/* Tabs */}
          <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
            <nav className="flex space-x-8" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('list')}
                className={`
                  flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm
                  ${activeTab === 'list'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }
                `}
              >
                <CheckSquare className="w-5 h-5" />
                Liste des tâches
              </button>
              <button
                onClick={() => setActiveTab('calendar')}
                className={`
                  flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm
                  ${activeTab === 'calendar'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }
                `}
              >
                <Calendar className="w-5 h-5" />
                Calendrier
              </button>
              <button
                onClick={() => setActiveTab('stats')}
                className={`
                  flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm
                  ${activeTab === 'stats'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }
                `}
              >
                <BarChart3 className="w-5 h-5" />
                Statistiques
              </button>
            </nav>
          </div>

          {/* Content */}
          {activeTab === 'list' && (
            <TasksList
              organizationId={currentOrganization.id}
              onSelectTask={setSelectedTaskId}
              onCreateTask={() => setShowTaskForm(true)}
            />
          )}

          {activeTab === 'calendar' && (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-8 text-center">
              <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">Vue calendrier - À venir</p>
            </div>
          )}

          {activeTab === 'stats' && (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-8 text-center">
              <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">Statistiques - À venir</p>
            </div>
          )}
        </div>
      </main>

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
    </div>
  );
}

export const Route = createFileRoute('/tasks')({
  component: TasksPage,
});

