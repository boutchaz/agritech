// =====================================================
// TASK MANAGEMENT TYPES
// =====================================================

export type TaskType = 
  | 'planting' 
  | 'harvesting' 
  | 'irrigation' 
  | 'fertilization' 
  | 'maintenance' 
  | 'general'
  | 'pest_control'
  | 'pruning'
  | 'soil_preparation';

export type TaskStatus = 
  | 'pending' 
  | 'assigned' 
  | 'in_progress' 
  | 'paused' 
  | 'completed' 
  | 'cancelled' 
  | 'overdue';

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export type DependencyType = 'finish_to_start' | 'start_to_start' | 'finish_to_finish';

export type EquipmentCondition = 'excellent' | 'good' | 'fair' | 'poor';

export interface Task {
  id: string;
  organization_id: string;
  farm_id: string;
  parcel_id?: string;
  crop_id?: string;
  category_id: string;
  template_id?: string;
  worker_id?: string;
  
  // Basic Info
  title: string;
  description?: string;
  task_type: TaskType;
  priority: TaskPriority;
  status: TaskStatus;
  
  // Assignment
  assigned_to?: string; // worker UUID
  
  // Scheduling
  scheduled_start?: string;
  scheduled_end?: string;
  actual_start?: string;
  actual_end?: string;
  due_date?: string;
  completed_date?: string;
  
  // Duration
  estimated_duration?: number; // hours
  actual_duration?: number; // hours
  
  // Location
  location_lat?: number;
  location_lng?: number;
  
  // Requirements
  required_skills?: string[];
  equipment_required?: string[];
  
  // Progress & Quality
  completion_percentage: number;
  quality_rating?: number; // 1-5 stars
  
  // Cost
  cost_estimate?: number;
  actual_cost?: number;

  // Work Unit Payment (NEW - for piece-work tracking)
  work_unit_id?: string; // Reference to work_units table
  units_required?: number; // How many units to complete
  units_completed?: number; // Progress in units
  rate_per_unit?: number; // Payment per unit
  payment_type?: 'daily' | 'per_unit' | 'monthly' | 'metayage';

  // Approval
  approved_by?: string;
  approved_at?: string;
  
  // Special Features
  weather_dependency: boolean;
  repeat_pattern?: RepeatPattern;
  parent_task_id?: string;
  
  // Attachments & Checklist
  attachments?: Attachment[];
  checklist?: ChecklistItem[];
  
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface RepeatPattern {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number; // every X days/weeks/months
  end_date?: string;
  days_of_week?: number[]; // 0-6 for weekly
  day_of_month?: number; // 1-31 for monthly
}

export interface Attachment {
  id: string;
  name: string;
  url: string;
  type: string; // mime type
  size: number;
  uploaded_at: string;
}

export interface ChecklistItem {
  id: string;
  title: string;
  completed: boolean;
  completed_at?: string;
  completed_by?: string;
}

// =====================================================
// TASK CATEGORY
// =====================================================
export interface TaskCategory {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  default_duration?: number;
  default_skills?: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// =====================================================
// TASK COMMENT
// =====================================================
export type CommentType = 'comment' | 'status_update' | 'completion_note' | 'issue';

export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  worker_id?: string;
  comment: string;
  type: CommentType;
  attachments?: Attachment[];
  created_at: string;
  updated_at: string;
  
  // Joined data
  user_name?: string;
  worker_name?: string;
}

// =====================================================
// TASK TIME LOG
// =====================================================
export interface TaskTimeLog {
  id: string;
  task_id: string;
  worker_id: string;
  start_time: string;
  end_time?: string;
  break_duration: number; // minutes
  total_hours: number;
  notes?: string;
  location_lat?: number;
  location_lng?: number;
  created_at: string;
  updated_at: string;
  
  // Joined data
  worker_name?: string;
  task_title?: string;
}

// =====================================================
// TASK COST (NEW)
// =====================================================
export interface TaskCost {
  id: string;
  task_id: string;
  organization_id: string;

  // Cost Details
  cost_type: 'labor' | 'material' | 'equipment' | 'utility' | 'other';
  description?: string;
  quantity?: number;
  unit_price?: number;
  total_amount: number;

  // Payment Status
  payment_status: 'pending' | 'approved' | 'paid' | 'cancelled';
  payment_date?: string;
  payment_reference?: string;

  // Accounting
  journal_entry_id?: string;
  account_id?: string;

  // Work Unit Reference (for piece-work)
  work_unit_id?: string;
  units_completed?: number;
  rate_per_unit?: number;

  // Worker Reference (for labor)
  worker_id?: string;
  piece_work_record_id?: string;

  // Audit
  created_at: string;
  updated_at: string;
  created_by?: string;

  // Joined data
  worker_name?: string;
  work_unit_code?: string;
  work_unit_name?: string;
}

// =====================================================
// TASK DEPENDENCY
// =====================================================
export interface TaskDependency {
  id: string;
  task_id: string;
  depends_on_task_id: string;
  dependency_type: DependencyType;
  lag_days: number;
  created_at: string;

  // Joined data
  depends_on_task_title?: string;
  depends_on_task_status?: TaskStatus;
}

// =====================================================
// TASK EQUIPMENT
// =====================================================
export interface TaskEquipment {
  id: string;
  task_id: string;
  equipment_name: string;
  quantity: number;
  start_time?: string;
  end_time?: string;
  condition_before?: EquipmentCondition;
  condition_after?: EquipmentCondition;
  fuel_used?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// =====================================================
// TASK SUMMARY (VIEW)
// =====================================================
export interface TaskSummary extends Task {
  worker_name?: string;
  worker_type?: string;
  farm_name?: string;
  parcel_name?: string;
  category_name?: string;
  comment_count: number;
  time_log_count: number;
  total_hours_logged: number;
}

// =====================================================
// API REQUEST/RESPONSE TYPES
// =====================================================

export interface TaskFilters {
  status?: TaskStatus | TaskStatus[];
  priority?: TaskPriority | TaskPriority[];
  task_type?: TaskType | TaskType[];
  assigned_to?: string;
  farm_id?: string;
  parcel_id?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
}

export interface CreateTaskRequest {
  farm_id: string;
  title: string;
  description?: string;
  task_type: TaskType;
  priority?: TaskPriority;
  category_id?: string;
  parcel_id?: string;
  crop_id?: string;
  assigned_to?: string;
  scheduled_start?: string;
  scheduled_end?: string;
  due_date?: string;
  estimated_duration?: number;
  required_skills?: string[];
  equipment_required?: string[];
  weather_dependency?: boolean;
  repeat_pattern?: RepeatPattern;
  cost_estimate?: number;
  notes?: string;
}

export interface UpdateTaskRequest extends Partial<CreateTaskRequest> {
  status?: TaskStatus;
  completion_percentage?: number;
  actual_start?: string;
  actual_end?: string;
  actual_duration?: number;
  actual_cost?: number;
  quality_rating?: number;
}

export interface ClockInRequest {
  task_id: string;
  worker_id: string;
  location_lat?: number;
  location_lng?: number;
  notes?: string;
}

export interface ClockOutRequest {
  time_log_id: string;
  break_duration?: number;
  notes?: string;
}

export interface TaskAssignmentRequest {
  task_id: string;
  worker_id: string;
  notify?: boolean;
}

export interface WorkerAvailability {
  worker_id: string;
  worker_name: string;
  is_available: boolean;
  tasks_count: number;
  total_hours: number;
  current_tasks: Task[];
}

// =====================================================
// TASK STATISTICS
// =====================================================
export interface TaskStatistics {
  total_tasks: number;
  completed_tasks: number;
  in_progress_tasks: number;
  overdue_tasks: number;
  completion_rate: number;
  average_completion_time: number; // hours
  total_cost: number;
  tasks_by_type: Record<TaskType, number>;
  tasks_by_priority: Record<TaskPriority, number>;
  tasks_by_worker: Array<{
    worker_id: string;
    worker_name: string;
    task_count: number;
    completion_rate: number;
    average_quality_rating: number;
  }>;
}

// =====================================================
// FORM HELPERS
// =====================================================
export const TASK_TYPE_LABELS: Record<TaskType, { en: string; fr: string }> = {
  planting: { en: 'Planting', fr: 'Plantation' },
  harvesting: { en: 'Harvesting', fr: 'Récolte' },
  irrigation: { en: 'Irrigation', fr: 'Irrigation' },
  fertilization: { en: 'Fertilization', fr: 'Fertilisation' },
  maintenance: { en: 'Maintenance', fr: 'Entretien' },
  general: { en: 'General', fr: 'Général' },
  pest_control: { en: 'Pest Control', fr: 'Traitement' },
  pruning: { en: 'Pruning', fr: 'Taille' },
  soil_preparation: { en: 'Soil Preparation', fr: 'Préparation du sol' },
};

export const TASK_STATUS_LABELS: Record<TaskStatus, { en: string; fr: string }> = {
  pending: { en: 'Pending', fr: 'En attente' },
  assigned: { en: 'Assigned', fr: 'Assignée' },
  in_progress: { en: 'In Progress', fr: 'En cours' },
  paused: { en: 'Paused', fr: 'En pause' },
  completed: { en: 'Completed', fr: 'Terminée' },
  cancelled: { en: 'Cancelled', fr: 'Annulée' },
  overdue: { en: 'Overdue', fr: 'En retard' },
};

export const TASK_PRIORITY_LABELS: Record<TaskPriority, { en: string; fr: string }> = {
  low: { en: 'Low', fr: 'Basse' },
  medium: { en: 'Medium', fr: 'Moyenne' },
  high: { en: 'High', fr: 'Haute' },
  urgent: { en: 'Urgent', fr: 'Urgente' },
};

export const TASK_PRIORITY_COLORS: Record<TaskPriority, string> = {
  low: 'bg-gray-100 text-gray-800',
  medium: 'bg-blue-100 text-blue-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800',
};

export const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  pending: 'bg-gray-100 text-gray-800',
  assigned: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-purple-100 text-purple-800',
  paused: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  overdue: 'bg-red-100 text-red-800',
};

// Helper functions
export function getTaskTypeLabel(type: TaskType, lang: 'en' | 'fr' = 'fr'): string {
  return TASK_TYPE_LABELS[type][lang];
}

export function getTaskStatusLabel(status: TaskStatus, lang: 'en' | 'fr' = 'fr'): string {
  return TASK_STATUS_LABELS[status][lang];
}

export function getTaskPriorityLabel(priority: TaskPriority, lang: 'en' | 'fr' = 'fr'): string {
  return TASK_PRIORITY_LABELS[priority][lang];
}

export function calculateTaskProgress(task: Task): number {
  if (task.status === 'completed') return 100;
  if (task.completion_percentage) return task.completion_percentage;
  
  // Estimate based on time if available
  if (task.actual_start && task.estimated_duration) {
    const start = new Date(task.actual_start).getTime();
    const now = Date.now();
    const elapsed = (now - start) / (1000 * 60 * 60); // hours
    return Math.min(Math.round((elapsed / task.estimated_duration) * 100), 90);
  }
  
  return 0;
}

