import React, { useState, useMemo } from 'react';
import {
  CalendarBody,
  CalendarDate,
  CalendarDatePagination,
  CalendarDatePicker,
  CalendarHeader,
  CalendarItem,
  CalendarMonthPicker,
  CalendarProvider,
  CalendarYearPicker,
  useCalendarMonth,
  useCalendarYear,
  type Feature,
} from '../kibo-ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Plus, Clock, User, MapPin } from 'lucide-react';
import { useTasks } from '../../hooks/useTasks';
import TaskForm from './TaskForm';
import type { Task } from '../../types/tasks';
import { format, parseISO, startOfMonth, endOfMonth, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';

interface TasksCalendarProps {
  organizationId: string;
  farms: Array<{ id: string; name: string }>;
}

// Task status colors matching Kibo UI Feature structure
const getTaskStatus = (task: Task) => {
  const statusColors: Record<string, string> = {
    pending: '#94a3b8',      // gray
    assigned: '#3b82f6',     // blue
    in_progress: '#f59e0b',  // amber
    paused: '#6b7280',       // gray
    completed: '#10b981',    // green
    cancelled: '#ef4444',    // red
    overdue: '#dc2626',      // red
  };

  const priorityColors: Record<string, string> = {
    low: '#10b981',      // green
    medium: '#f59e0b',   // amber
    high: '#f97316',     // orange
    urgent: '#ef4444',   // red
  };

  // Use priority color if in progress or pending, otherwise use status color
  const color = task.status === 'pending' || task.status === 'assigned'
    ? priorityColors[task.priority] || statusColors[task.status]
    : statusColors[task.status];

  return {
    id: task.status,
    name: task.status,
    color,
  };
};

// Calendar content component (needs to be inside CalendarProvider)
const CalendarContent: React.FC<{
  tasks: Task[];
  onTaskSelect: (task: Task) => void;
  onCreateTask: () => void;
}> = ({ tasks, onTaskSelect, onCreateTask }) => {
  const [month] = useCalendarMonth();
  const [year] = useCalendarYear();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Convert tasks to Kibo UI Feature format
  const features: Feature[] = useMemo(() => {
    return tasks
      .filter(task => task.scheduled_start)
      .map(task => {
        const startDate = parseISO(task.scheduled_start!);
        const endDate = task.due_date ? parseISO(task.due_date) : startDate;

        return {
          id: task.id,
          name: task.title,
          startAt: startDate,
          endAt: endDate,
          status: getTaskStatus(task),
          // Store the full task object for later use
          _task: task,
        } as Feature & { _task: Task };
      });
  }, [tasks]);

  // Get tasks for selected date
  const selectedDateTasks = useMemo(() => {
    if (!selectedDate) return [];
    return tasks.filter(task => {
      if (!task.scheduled_start) return false;
      return isSameDay(parseISO(task.scheduled_start), selectedDate);
    });
  }, [selectedDate, tasks]);

  // Get status badge variant
  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'completed': return 'default';
      case 'in_progress': return 'secondary';
      case 'cancelled': return 'destructive';
      default: return 'outline';
    }
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Calendar Section */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CalendarDate>
              {(date) => (
                <CardTitle className="text-2xl font-bold">
                  {format(date, 'MMMM yyyy', { locale: fr })}
                </CardTitle>
              )}
            </CalendarDate>
            <div className="flex items-center gap-2">
              <CalendarDatePagination />
              <Button onClick={onCreateTask} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Nouvelle tâche
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="space-y-4">
            {/* Month and Year Pickers */}
            <div className="flex items-center gap-2">
              <CalendarMonthPicker
                labels={{
                  button: "Mois",
                  empty: "Aucun mois trouvé",
                  search: "Rechercher un mois...",
                }}
              />
              <CalendarYearPicker
                labels={{
                  button: "Année",
                  empty: "Aucune année trouvée",
                  search: "Rechercher une année...",
                }}
              />
            </div>

            {/* Calendar Grid */}
            <CalendarHeader className="mb-2" />
            <CalendarBody features={features}>
              {({ feature }) => (
                <div
                  key={feature.id}
                  className="cursor-pointer hover:opacity-80"
                  onClick={() => {
                    // Get the task from the feature
                    const task = (feature as Feature & { _task: Task })._task;
                    if (task) {
                      onTaskSelect(task);
                      // Also set the selected date
                      if (task.scheduled_start) {
                        setSelectedDate(parseISO(task.scheduled_start));
                      }
                    }
                  }}
                >
                  <CalendarItem feature={feature} />
                </div>
              )}
            </CalendarBody>
          </div>
        </CardContent>
      </Card>

      {/* Tasks for Selected Date */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {selectedDate
              ? `Tâches du ${format(selectedDate, 'dd MMMM yyyy', { locale: fr })}`
              : 'Sélectionnez une date'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!selectedDate ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Cliquez sur une date pour voir les tâches</p>
            </div>
          ) : selectedDateTasks.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Aucune tâche prévue</p>
            </div>
          ) : (
            <div className="space-y-3">
              {selectedDateTasks.map(task => (
                <div
                  key={task.id}
                  className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                  onClick={() => onTaskSelect(task)}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="font-medium text-sm line-clamp-1">{task.title}</h4>
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0 mt-0.5"
                      style={{ backgroundColor: getTaskStatus(task).color }}
                    />
                  </div>

                  {task.description && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
                      {task.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <Badge variant={getStatusVariant(task.status)} className="text-xs">
                      {task.status}
                    </Badge>

                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      {task.assigned_to && (
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          <span>Assigné</span>
                        </div>
                      )}

                      {task.farm_id && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Main component
const TasksCalendar: React.FC<TasksCalendarProps> = ({ organizationId, farms }) => {
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Get current month range for fetching tasks
  const now = new Date();
  const startDate = format(startOfMonth(now), 'yyyy-MM-dd');
  const endDate = format(endOfMonth(now), 'yyyy-MM-dd');

  const { data: tasks = [], isLoading } = useTasks(organizationId, {
    date_from: startDate,
    date_to: endDate,
  });

  const handleTaskSelect = (task: Task) => {
    setSelectedTask(task);
    setShowTaskForm(true);
  };

  const handleCreateTask = () => {
    setSelectedTask(null);
    setShowTaskForm(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600 dark:text-gray-400">Chargement du calendrier...</span>
      </div>
    );
  }

  return (
    <>
      <CalendarProvider locale="fr-FR" startDay={1}>
        <CalendarContent
          tasks={tasks}
          onTaskSelect={handleTaskSelect}
          onCreateTask={handleCreateTask}
        />
      </CalendarProvider>

      {/* Task Form Modal */}
      {showTaskForm && (
        <TaskForm
          task={selectedTask}
          organizationId={organizationId}
          farms={farms}
          onClose={() => {
            setShowTaskForm(false);
            setSelectedTask(null);
          }}
          onSuccess={() => {
            setShowTaskForm(false);
            setSelectedTask(null);
          }}
        />
      )}
    </>
  );
};

export default TasksCalendar;
