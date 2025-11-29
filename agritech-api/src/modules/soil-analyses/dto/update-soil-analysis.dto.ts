import { IsDateString, IsUUID, IsOptional, IsObject, IsString } from 'class-validator';

export class UpdateSoilAnalysisDto {
  @IsOptional()
  @IsDateString()
  analysis_date?: string;

  @IsOptional()
  @IsUUID()
  parcel_id?: string;

  @IsOptional()
  @IsUUID()
  test_type_id?: string;

  @IsOptional()
  @IsObject()
  physical?: Record<string, any>;

  @IsOptional()
  @IsObject()
  chemical?: Record<string, any>;

  @IsOptional()
  @IsObject()
  biological?: Record<string, any>;

  @IsOptional()
  @IsString()
  notes?: string;
}
