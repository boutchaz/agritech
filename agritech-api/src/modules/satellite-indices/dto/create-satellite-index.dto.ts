import { IsString, IsDateString, IsUUID, IsOptional, IsNumber, IsObject } from 'class-validator';

export class CreateSatelliteIndexDto {
  @IsDateString()
  date: string;

  @IsString()
  index_name: string;

  @IsUUID()
  parcel_id: string;

  @IsOptional()
  @IsUUID()
  farm_id?: string;

  @IsOptional()
  @IsString()
  image_source?: string;

  @IsOptional()
  @IsNumber()
  cloud_coverage_percentage?: number;

  @IsOptional()
  @IsNumber()
  min_value?: number;

  @IsOptional()
  @IsNumber()
  max_value?: number;

  @IsOptional()
  @IsNumber()
  mean_value?: number;

  @IsOptional()
  @IsNumber()
  median_value?: number;

  @IsOptional()
  @IsNumber()
  std_value?: number;

  @IsOptional()
  @IsNumber()
  percentile_25?: number;

  @IsOptional()
  @IsNumber()
  percentile_75?: number;

  @IsOptional()
  @IsNumber()
  percentile_90?: number;

  @IsOptional()
  @IsNumber()
  pixel_count?: number;

  @IsOptional()
  @IsString()
  geotiff_url?: string;

  @IsOptional()
  @IsDateString()
  geotiff_expires_at?: string;

  @IsOptional()
  @IsUUID()
  processing_job_id?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  // Set by controller
  organization_id?: string;
}
