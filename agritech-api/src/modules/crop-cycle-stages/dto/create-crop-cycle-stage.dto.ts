import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsUUID,
  IsOptional,
  IsEnum,
  IsNotEmpty,
  IsInt,
  IsDateString,
  Min,
} from 'class-validator';

export enum CropCycleStageStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  SKIPPED = 'skipped',
}

export class CreateCropCycleStageDto {
  @ApiProperty({ description: 'Crop cycle ID' })
  @IsUUID()
  @IsNotEmpty()
  crop_cycle_id: string;

  @ApiProperty({ description: 'Stage name (e.g. germination, vegetative, flowering)' })
  @IsString()
  @IsNotEmpty()
  stage_name: string;

  @ApiProperty({ description: 'Order of the stage within the cycle' })
  @IsInt()
  @Min(1)
  stage_order: number;

  @ApiPropertyOptional({ description: 'Expected start date (ISO 8601)' })
  @IsDateString()
  @IsOptional()
  expected_start_date?: string;

  @ApiPropertyOptional({ description: 'Expected end date (ISO 8601)' })
  @IsDateString()
  @IsOptional()
  expected_end_date?: string;

  @ApiPropertyOptional({ description: 'Actual start date (ISO 8601)' })
  @IsDateString()
  @IsOptional()
  actual_start_date?: string;

  @ApiPropertyOptional({ description: 'Actual end date (ISO 8601)' })
  @IsDateString()
  @IsOptional()
  actual_end_date?: string;

  @ApiPropertyOptional({ description: 'Stage status', enum: CropCycleStageStatus, default: CropCycleStageStatus.PENDING })
  @IsEnum(CropCycleStageStatus)
  @IsOptional()
  status?: CropCycleStageStatus;

  @ApiPropertyOptional({ description: 'Notes' })
  @IsString()
  @IsOptional()
  notes?: string;
}
