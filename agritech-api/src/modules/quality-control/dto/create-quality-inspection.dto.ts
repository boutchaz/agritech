import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsDate, IsUUID, IsOptional, IsEnum, IsNotEmpty, IsNumber, Min, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

export enum InspectionType {
  HARVEST = 'harvest',
  PLANTING = 'planting',
  GROWTH = 'growth',
  SOIL = 'soil',
  WATER = 'water',
  PEST = 'pest',
  FERTILIZER = 'fertilizer',
  OTHER = 'other',
}

export enum InspectionStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  PASSED = 'passed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export class CreateQualityInspectionDto {
  @ApiProperty({ description: 'Organization ID' })
  @IsUUID()
  @IsNotEmpty()
  organization_id: string;

  @ApiProperty({ description: 'Farm ID' })
  @IsUUID()
  @IsNotEmpty()
  farm_id: string;

  @ApiProperty({ description: 'Parcel ID (optional)' })
  @IsUUID()
  @IsOptional()
  parcel_id?: string;

  @ApiProperty({ description: 'Crop cycle ID (optional)' })
  @IsUUID()
  @IsOptional()
  crop_cycle_id?: string;

  @ApiProperty({ description: 'Inspection type', enum: InspectionType })
  @IsEnum(InspectionType)
  @IsNotEmpty()
  type: InspectionType;

  @ApiProperty({ description: 'Inspection date' })
  @IsDate()
  @Type(() => Date)
  @IsNotEmpty()
  inspection_date: Date;

  @ApiProperty({ description: 'Inspector ID' })
  @IsUUID()
  @IsOptional()
  inspector_id?: string;

  @ApiProperty({ description: 'Inspection results' })
  @IsString()
  @IsOptional()
  results?: string;

  @ApiProperty({ description: 'Status' })
  @IsEnum(InspectionStatus)
  @IsOptional()
  status?: InspectionStatus;

  @ApiProperty({ description: 'Overall score (0-100)' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  overall_score?: number;

  @ApiProperty({ description: 'Notes' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ description: 'Attachment URLs' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  attachments?: string[];
}
