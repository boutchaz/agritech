import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, IsDateString } from 'class-validator';

export class TaskFiltersDto {
  @ApiPropertyOptional({ description: 'Filter by status (comma-separated)' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Filter by priority (comma-separated)' })
  @IsOptional()
  @IsString()
  priority?: string;

  @ApiPropertyOptional({ description: 'Filter by task type (comma-separated)' })
  @IsOptional()
  @IsString()
  task_type?: string;

  @ApiPropertyOptional({ description: 'Filter by assigned worker ID' })
  @IsOptional()
  @IsUUID()
  assigned_to?: string;

  @ApiPropertyOptional({ description: 'Filter by farm ID' })
  @IsOptional()
  @IsUUID()
  farm_id?: string;

  @ApiPropertyOptional({ description: 'Filter by parcel ID' })
  @IsOptional()
  @IsUUID()
  parcel_id?: string;

  @ApiPropertyOptional({ description: 'Filter by start date (ISO format)' })
  @IsOptional()
  @IsDateString()
  date_from?: string;

  @ApiPropertyOptional({ description: 'Filter by end date (ISO format)' })
  @IsOptional()
  @IsDateString()
  date_to?: string;

  @ApiPropertyOptional({ description: 'Search term for title/description' })
  @IsOptional()
  @IsString()
  search?: string;
}
