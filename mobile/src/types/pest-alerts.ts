// Pest & Disease Alert Types

export type PestReportSeverity = 'low' | 'medium' | 'high' | 'critical';

export type PestReportStatus = 'pending' | 'verified' | 'treated' | 'resolved' | 'dismissed';

export type DetectionMethod =
  | 'visual_inspection'
  | 'trap_monitoring'
  | 'lab_test'
  | 'field_scout'
  | 'automated_sensor'
  | 'worker_report';

export interface PestDiseaseLibraryItem {
  id: string;
  name: string;
  type: 'pest' | 'disease';
  crop_types: string[];
  symptoms: string;
  treatment: string;
  prevention: string;
  severity: PestReportSeverity;
  image_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PestReport {
  id: string;
  organization_id: string;
  farm_id: string;
  parcel_id: string;
  reporter_id: string;
  pest_disease_id?: string;
  severity: PestReportSeverity;
  affected_area_percentage?: number;
  detection_method?: DetectionMethod;
  photo_urls?: string[];
  location?: { type: string; coordinates: [number, number] };
  notes?: string;
  status: PestReportStatus;
  verified_by?: string;
  verified_at?: string;
  treatment_applied?: string;
  treatment_date?: string;
  created_at: string;
  updated_at: string;
  // Joined relations
  pest_disease?: PestDiseaseLibraryItem;
  farm?: { id: string; name: string };
  parcel?: { id: string; name: string };
  reporter?: { id: string; first_name: string; last_name: string };
  verifier?: { id: string; first_name: string; last_name: string };
}

export interface CreatePestReportInput {
  farm_id: string;
  parcel_id: string;
  pest_disease_id?: string;
  severity: PestReportSeverity;
  affected_area_percentage?: number;
  detection_method?: DetectionMethod;
  photo_urls?: string[];
  location?: { latitude: number; longitude: number };
  notes?: string;
}

export interface UpdatePestReportInput {
  status: PestReportStatus;
  treatment_applied?: string;
}

export interface PestReportFilters {
  severity?: PestReportSeverity;
  status?: PestReportStatus;
  farm_id?: string;
  parcel_id?: string;
  search?: string;
}

export interface DiseaseRiskItem {
  disease_name: string;
  disease_name_fr: string | null;
  pathogen_name: string | null;
  disease_type: string | null;
  severity: string | null;
  risk_active: boolean;
  temperature_range: { min: number | null; max: number | null };
  humidity_threshold: number | null;
  treatment_product: string | null;
  treatment_dose: string | null;
  treatment_timing: string | null;
  satellite_signal: string | null;
}

export interface DiseaseRiskResponse {
  parcel_id: string;
  crop_type: string;
  risks: DiseaseRiskItem[];
  weather: {
    temperature: number | null;
    humidity: number | null;
    date: string | null;
  };
}
