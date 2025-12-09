import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNumber, Min, Max, IsOptional, IsString, IsInt, IsUUID, IsEnum } from 'class-validator';

export enum PieceWorkPaymentStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  PAID = 'paid',
  DISPUTED = 'disputed',
  CANCELLED = 'cancelled',
}

export class UpdatePieceWorkDto {
  @ApiPropertyOptional({ description: 'Work date (ISO format)', example: '2024-12-09' })
  @IsOptional()
  @IsDateString()
  work_date?: string;

  @ApiPropertyOptional({ description: 'Task ID' })
  @IsOptional()
  @IsUUID()
  task_id?: string;

  @ApiPropertyOptional({ description: 'Parcel ID' })
  @IsOptional()
  @IsUUID()
  parcel_id?: string;

  @ApiPropertyOptional({ description: 'Work unit ID' })
  @IsOptional()
  @IsUUID()
  work_unit_id?: string;

  @ApiPropertyOptional({ description: 'Units completed', example: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  units_completed?: number;

  @ApiPropertyOptional({ description: 'Rate per unit', example: 15.50 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  rate_per_unit?: number;

  @ApiPropertyOptional({ description: 'Quality rating (1-5)', example: 4 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  quality_rating?: number;

  @ApiPropertyOptional({ description: 'Payment status', enum: PieceWorkPaymentStatus })
  @IsOptional()
  @IsEnum(PieceWorkPaymentStatus)
  payment_status?: PieceWorkPaymentStatus;

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

  @ApiPropertyOptional({ description: 'Verified by user ID' })
  @IsOptional()
  @IsUUID()
  verified_by?: string;

  @ApiPropertyOptional({ description: 'Verification timestamp' })
  @IsOptional()
  @IsDateString()
  verified_at?: string;

  @ApiPropertyOptional({ description: 'Payment record ID' })
  @IsOptional()
  @IsUUID()
  payment_record_id?: string;
}
