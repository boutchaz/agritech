import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PestReportResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  organization_id: string;

  @ApiProperty()
  farm_id: string;

  @ApiProperty()
  parcel_id: string;

  @ApiProperty()
  reporter_id: string;

  @ApiProperty()
  pest_disease_id: string;

  @ApiProperty()
  severity: string;

  @ApiPropertyOptional()
  affected_area_percentage?: number;

  @ApiPropertyOptional()
  detection_method?: string;

  @ApiPropertyOptional({ type: [String] })
  photo_urls?: string[];

  @ApiPropertyOptional()
  location?: any;

  @ApiPropertyOptional()
  notes?: string;

  @ApiProperty()
  status: string;

  @ApiPropertyOptional()
  verified_by?: string;

  @ApiPropertyOptional()
  verified_at?: string;

  @ApiPropertyOptional()
  treatment_applied?: string;

  @ApiPropertyOptional()
  treatment_date?: string;

  @ApiProperty()
  created_at: string;

  @ApiProperty()
  updated_at: string;

  // Joined data
  @ApiPropertyOptional()
  pest_disease?: {
    id: string;
    name: string;
    type: string;
    symptoms: string;
    treatment: string;
    prevention: string;
  };

  @ApiPropertyOptional()
  farm?: {
    id: string;
    name: string;
  };

  @ApiPropertyOptional()
  parcel?: {
    id: string;
    name: string;
  };

  @ApiPropertyOptional()
  reporter?: {
    id: string;
    first_name: string;
    last_name: string;
  };
}

export class PestDiseaseLibraryDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  type: string;

  @ApiPropertyOptional({ type: [String] })
  crop_types?: string[];

  @ApiProperty()
  symptoms: string;

  @ApiProperty()
  treatment: string;

  @ApiProperty()
  prevention: string;

  @ApiProperty()
  severity: string;

  @ApiPropertyOptional()
  image_url?: string;

  @ApiProperty()
  is_active: boolean;

  @ApiProperty()
  created_at: string;

  @ApiProperty()
  updated_at: string;
}
