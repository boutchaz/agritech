import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, IsDateString, IsNumberString } from 'class-validator';

export class TaskFiltersDto {
  @ApiPropertyOptional({ description: 'Organization ID (handled separately by controller)' })
  @IsOptional()
  @IsUUID()
  organization_id?: string;

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

  @ApiPropertyOptional({ description: 'Page number (1-based)', default: 1 })
  @IsOptional()
  @IsNumberString()
  page?: string;

  @ApiPropertyOptional({ description: 'Number of items per page', default: 10 })
  @IsOptional()
  @IsNumberString()
  pageSize?: string;

  @ApiPropertyOptional({ description: 'Field to sort by', default: 'scheduled_start' })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ description: 'Sort direction (asc or desc)', default: 'desc' })
  @IsOptional()
  @IsString()
  sortDir?: string;
}
