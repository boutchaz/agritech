import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsEnum,
  IsOptional,
  IsDateString,
} from 'class-validator';
import { AIProvider } from '../interfaces';

export class GenerateAIReportDto {
  @ApiProperty({ description: 'Parcel ID to generate report for' })
  @IsNotEmpty()
  @IsString()
  parcel_id: string;

  @ApiProperty({ enum: AIProvider, description: 'AI provider to use for generation' })
  @IsNotEmpty()
  @IsEnum(AIProvider)
  provider: AIProvider;

  @ApiPropertyOptional({ description: 'Custom model override (e.g., gpt-4-turbo, gemini-1.5-pro)' })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional({ description: 'Start date for satellite/weather data range' })
  @IsOptional()
  @IsDateString()
  data_start_date?: string;

  @ApiPropertyOptional({ description: 'End date for satellite/weather data range' })
  @IsOptional()
  @IsDateString()
  data_end_date?: string;

  @ApiPropertyOptional({ description: 'Language for the report (default: fr)', default: 'fr' })
  @IsOptional()
  @IsString()
  language?: string;
}

export class AIProviderInfoDto {
  @ApiProperty({ enum: AIProvider })
  provider: AIProvider;

  @ApiProperty()
  available: boolean;

  @ApiProperty()
  name: string;
}

export enum AIReportJobStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export class AIReportJobResponseDto {
  @ApiProperty({ description: 'Job ID for tracking' })
  job_id: string;

  @ApiProperty({ enum: AIReportJobStatus, description: 'Current job status' })
  status: AIReportJobStatus;

  @ApiProperty({ description: 'Progress percentage (0-100)' })
  progress: number;

  @ApiPropertyOptional({ description: 'Error message if failed' })
  error_message?: string;

  @ApiPropertyOptional({ description: 'Report ID when completed' })
  report_id?: string;

  @ApiPropertyOptional({ description: 'Full report result when completed' })
  result?: any;

  @ApiProperty({ description: 'Job creation timestamp' })
  created_at: string;

  @ApiPropertyOptional({ description: 'Processing start timestamp' })
  started_at?: string;

  @ApiPropertyOptional({ description: 'Completion timestamp' })
  completed_at?: string;
}
