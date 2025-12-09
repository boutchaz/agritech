import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsDateString, IsNumber, Min, Max, IsOptional, IsString, IsInt } from 'class-validator';

export class CreatePieceWorkDto {
  @ApiProperty({ description: 'Worker ID' })
  @IsUUID()
  worker_id: string;

  @ApiProperty({ description: 'Work date (ISO format)', example: '2024-12-09' })
  @IsDateString()
  work_date: string;

  @ApiPropertyOptional({ description: 'Task ID' })
  @IsOptional()
  @IsUUID()
  task_id?: string;

  @ApiPropertyOptional({ description: 'Parcel ID' })
  @IsOptional()
  @IsUUID()
  parcel_id?: string;

  @ApiProperty({ description: 'Work unit ID' })
  @IsUUID()
  work_unit_id: string;

  @ApiProperty({ description: 'Units completed', example: 100 })
  @IsNumber()
  @Min(0.01)
  units_completed: number;

  @ApiProperty({ description: 'Rate per unit', example: 15.50 })
  @IsNumber()
  @Min(0)
  rate_per_unit: number;

  @ApiPropertyOptional({ description: 'Quality rating (1-5)', example: 4 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  quality_rating?: number;

  @ApiPropertyOptional({ description: 'Start time (HH:MM format)', example: '08:00' })
  @IsOptional()
  @IsString()
  start_time?: string;

  @ApiPropertyOptional({ description: 'End time (HH:MM format)', example: '17:00' })
  @IsOptional()
  @IsString()
  end_time?: string;

  @ApiPropertyOptional({ description: 'Break duration in minutes', example: 60 })
  @IsOptional()
  @IsInt()
  @Min(0)
  break_duration?: number;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
