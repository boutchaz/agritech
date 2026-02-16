import type { QualityGrade } from './reception';

export type InspectionType = 'pre_harvest' | 'post_harvest' | 'storage' | 'transport' | 'processing';
export type InspectionStatus = 'scheduled' | 'in_progress' | 'completed' | 'failed' | 'cancelled';

export type DefectSeverity = 'critical' | 'major' | 'minor' | 'cosmetic';
export type DefectCategory = 'physical_damage' | 'contamination' | 'size_defect' | 'color_defect' | 'moisture' | 'pest_damage' | 'mold' | 'other';

export type NonConformityStatus = 'open' | 'under_review' | 'corrective_action' | 'resolved' | 'closed' | 'escalated';
export type NCRSeverity = 'low' | 'medium' | 'high' | 'critical';

export type WorkflowStatus = 'pending_review' | 'under_review' | 'approved' | 'rejected' | 'escalated' | 'expired';
export type ApprovalDecision = 'approve' | 'reject' | 'request_changes' | 'escalate';
export type SLAStatus = 'on_track' | 'at_risk' | 'overdue';

export type NotificationType = 'inspection_assigned' | 'approval_required' | 'ncr_created' | 'sla_warning' | 'sla_breach' | 'certificate_ready';

export interface ChecklistItem {
  id: string;
  label: string;
  description?: string | null;
  category?: string | null;
  required: boolean;
  order: number;
}

export interface ChecklistItemResult {
  item_id: string;
  passed: boolean | null;
  notes?: string | null;
  photos?: string[] | null;
}

export interface ChecklistTemplate {
  id: string;
  organization_id: string;
  name: string;
  description?: string | null;
  items: ChecklistItem[];
  inspection_type: InspectionType;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface QualityInspection {
  id: string;
  organization_id: string;
  farm_id: string;
  parcel_id?: string | null;
  crop_cycle_id?: string | null;
  type: InspectionType;
  inspection_date: string;
  inspector_id: string;
  results: Record<string, unknown>;
  status: InspectionStatus;
  overall_score?: number | null;
  notes?: string | null;
  attachments?: string[] | null;
  created_at: string;
  updated_at: string;

  checklist_template_id?: string | null;
  checklist_results?: ChecklistItemResult[] | null;
  workflow_status?: WorkflowStatus | null;
  sla_deadline?: string | null;
  sla_status?: SLAStatus | null;

  inspector_name?: string;
  farm_name?: string;
  parcel_name?: string;
}

export interface InspectionDefect {
  id: string;
  inspection_id: string;
  category: DefectCategory;
  severity: DefectSeverity;
  description?: string | null;
  photo_urls?: string[] | null;
  location_notes?: string | null;
}

export interface GradeRule {
  id: string;
  organization_id: string;
  name: string;
  grade: QualityGrade;
  min_score: number;
  max_score: number;
  auto_assign: boolean;
}

export interface GradeAssignment {
  inspection_id: string;
  grade: QualityGrade;
  score: number;
  auto_assigned: boolean;
  manual_justification?: string | null;
}

export interface QualityTrend {
  period: string;
  inspection_count: number;
  avg_score: number;
  pass_rate: number;
}

export interface QualityMetrics {
  total_inspections: number;
  avg_score: number;
  pass_rate: number;
  rejection_rate: number;
  grade_distribution: Record<string, number>;
  trend_data: QualityTrend[];
}

export interface QualityKPI {
  label: string;
  value: number;
  unit: string;
  change_percentage: number;
  trend: 'up' | 'down' | 'stable';
}

export interface CorrectiveAction {
  id: string;
  description: string;
  assignee_id: string;
  assignee_name?: string | null;
  due_date: string;
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  completion_notes?: string | null;
  completed_at?: string | null;
}

export interface NonConformity {
  id: string;
  organization_id: string;
  inspection_id: string;
  title: string;
  description: string;
  severity: NCRSeverity;
  status: NonConformityStatus;
  root_cause?: string | null;
  affected_batch_ids?: string[] | null;
  corrective_actions?: CorrectiveAction[] | null;
  reported_by: string;
  reported_at: string;
  resolved_at?: string | null;
  escalation_history?: Array<{
    escalated_at: string;
    escalated_by: string;
    reason: string;
    target_role: string;
  }> | null;
}

export interface WorkflowStep {
  step_order: number;
  role: string;
  assignee_id?: string | null;
  assignee_name?: string | null;
  decision?: ApprovalDecision | null;
  comments?: string | null;
  decided_at?: string | null;
  sla_deadline?: string | null;
}

export interface ApprovalChain {
  inspection_id: string;
  steps: WorkflowStep[];
  current_step: number;
  status: WorkflowStatus;
}

export interface SLAConfig {
  max_hours_per_step: number;
  escalation_target_role: string;
  warning_threshold_hours: number;
}

export interface EscalationRule {
  trigger_condition: string;
  target_role: string;
  notification_message: string;
}

export interface CertificateData {
  inspection_details: Record<string, unknown>;
  grade_info: GradeAssignment;
  approval_chain_summary: Array<{
    step_order: number;
    role: string;
    decision: ApprovalDecision;
    decided_at: string;
  }>;
  organization_name: string;
  organization_logo_url?: string | null;
}

export interface QualityCertificate {
  id: string;
  organization_id: string;
  inspection_id: string;
  certificate_number: string;
  issued_by: string;
  issued_at: string;
  valid_until?: string | null;
  data: CertificateData;
}

export interface QualityNotification {
  id: string;
  type: NotificationType;
  recipient_id: string;
  recipient_role: string;
  inspection_id?: string | null;
  message: string;
  sent_at: string;
  read_at?: string | null;
}

export interface CreateInspectionDto {
  farm_id: string;
  parcel_id?: string;
  crop_cycle_id?: string;
  type: InspectionType;
  inspection_date: string;
  inspector_id: string;
  results?: Record<string, unknown>;
  overall_score?: number;
  notes?: string;
  attachments?: string[];
  checklist_template_id?: string;
  checklist_results?: ChecklistItemResult[];
}

export interface UpdateInspectionDto {
  status?: InspectionStatus;
  results?: Record<string, unknown>;
  overall_score?: number;
  notes?: string;
  attachments?: string[];
  checklist_results?: ChecklistItemResult[];
  workflow_status?: WorkflowStatus;
}

export interface CreateNonConformityDto {
  inspection_id: string;
  title: string;
  description: string;
  severity: NCRSeverity;
  root_cause?: string;
  affected_batch_ids?: string[];
  corrective_actions?: Array<{
    description: string;
    assignee_id: string;
    due_date: string;
  }>;
}

export interface UpdateNonConformityDto {
  status?: NonConformityStatus;
  root_cause?: string;
  corrective_actions?: CorrectiveAction[];
  resolved_at?: string;
}

export interface MakeApprovalDecisionDto {
  decision: ApprovalDecision;
  comments?: string;
  step_order: number;
}

export interface GenerateCertificateDto {
  inspection_id: string;
  valid_until?: string;
}

export interface QCFilters {
  organization_id?: string;
  farm_id?: string;
  parcel_id?: string;
  type?: InspectionType;
  status?: InspectionStatus;
  inspector_id?: string;
  date_from?: string;
  date_to?: string;
  min_score?: number;
  max_score?: number;
  grade?: QualityGrade;
}
