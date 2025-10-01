export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  type: 'parcel_analysis' | 'soil_report' | 'satellite_report' | 'yield_forecast';
  sections: ReportSection[];
  icon?: string;
}

export interface ReportSection {
  id: string;
  title: string;
  type: 'text' | 'table' | 'chart' | 'image' | 'metrics';
  required: boolean;
}

export interface ReportMetadata {
  format?: 'pdf' | 'html' | 'json';
  includeCharts?: boolean;
  includeImages?: boolean;
  customFields?: Record<string, string | number | boolean>;
}

export interface GeneratedReport {
  id: string;
  parcel_id: string;
  template_id: string;
  title: string;
  generated_at: string;
  generated_by: string;
  status: 'pending' | 'completed' | 'failed';
  file_url?: string;
  metadata?: ReportMetadata;
}

export interface SoilAnalysisData {
  ph?: number;
  texture?: string;
  moisture?: number;
  organic_matter?: number;
  phosphorus?: number;
  potassium?: number;
  nitrogen?: number;
}

export interface SatelliteAnalysisData {
  ndvi?: number;
  ndwi?: number;
  evi?: number;
  imageUrl?: string;
  captureDate?: string;
  cloudCover?: number;
}

export interface ReportData {
  parcel: {
    id: string;
    name: string;
    area: number;
    soil_type?: string;
    boundary?: number[][];
    tree_type?: string;
    tree_count?: number;
    planting_year?: number;
    variety?: string;
    rootstock?: string;
  };
  metrics: {
    ndvi?: number;
    irrigation?: number;
    yield?: number;
    health?: string;
    soil_moisture?: number;
    soil_temp?: number;
  };
  analysis?: {
    soil?: SoilAnalysisData;
    satellite?: SatelliteAnalysisData;
    recommendations?: string[];
  };
}