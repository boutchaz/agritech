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
