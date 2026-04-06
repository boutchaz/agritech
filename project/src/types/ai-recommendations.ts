export type AIRecommendationStatus = 'pending' | 'validated' | 'rejected' | 'executed' | 'expired';

export interface AIRecommendationEvaluationRecord {
  id: string;
  parcel_id: string;
  organization_id: string;
  calibration_id: string | null;
  status: AIRecommendationStatus;
  constat: string | null;
  diagnostic: string | null;
  action: string | null;
  conditions: unknown | null;
  suivi: string | null;
  crop_type: string | null;
  alert_code: string | null;
  priority: string | null;
  valid_from: string | null;
  valid_until: string | null;
  executed_at: string | null;
  execution_notes: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface AIRecommendationProductApplication {
  id: string;
  ai_recommendation_id: string | null;
  organization_id: string;
  farm_id: string | null;
  parcel_id: string | null;
  product_id: string | null;
  application_date: string | null;
  quantity_used: number | null;
  area_treated: number | null;
  cost: number | null;
  currency: string | null;
  notes: string | null;
  task_id: string | null;
  images: unknown;
  created_at: string | null;
  updated_at: string | null;
}

export interface AIRecommendationEvaluation {
  recommendation: AIRecommendationEvaluationRecord;
  product_applications: AIRecommendationProductApplication[];
}
