import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsUUID,
  IsNumber,
  IsEnum,
  IsArray,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum PestReportSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum DetectionMethod {
  VISUAL_INSPECTION = 'visual_inspection',
  TRAP_MONITORING = 'trap_monitoring',
  LAB_TEST = 'lab_test',
  FIELD_SCOUT = 'field_scout',
  AUTOMATED_SENSOR = 'automated_sensor',
  WORKER_REPORT = 'worker_report',
}

export class LocationDto {
  @ApiProperty({ description: 'Latitude' })
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @ApiProperty({ description: 'Longitude' })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;
}

export class CreatePestReportDto {
  @ApiProperty({ description: 'Farm ID' })
  @IsUUID()
  farm_id: string;

  @ApiProperty({ description: 'Parcel ID' })
  @IsUUID()
  parcel_id: string;

  @ApiProperty({ description: 'Pest/Disease ID from library' })
  @IsUUID()
  pest_disease_id: string;

  @ApiProperty({ enum: PestReportSeverity, description: 'Severity level' })
  @IsEnum(PestReportSeverity)
  severity: PestReportSeverity;

  @ApiPropertyOptional({ description: 'Affected area percentage (0-100)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  affected_area_percentage?: number;

  @ApiPropertyOptional({ description: 'Detection method', enum: DetectionMethod })
  @IsOptional()
  @IsEnum(DetectionMethod)
  detection_method?: DetectionMethod;

  @ApiPropertyOptional({ description: 'Photo URLs', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photo_urls?: string[];

  @ApiPropertyOptional({ description: 'GPS location', type: LocationDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDto)
  location?: LocationDto;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
