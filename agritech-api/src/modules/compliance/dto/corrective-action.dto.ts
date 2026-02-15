import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEnum, IsUUID, IsDateString, IsNumber } from 'class-validator';

export enum CorrectiveActionStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  VERIFIED = 'verified',
  OVERDUE = 'overdue',
}

export enum CorrectiveActionPriority {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

export class CreateCorrectiveActionDto {
  @ApiProperty({ description: 'ID of the related compliance check' })
  @IsUUID()
  @IsOptional()
  compliance_check_id?: string;

  @ApiProperty({ description: 'ID of the related certification' })
  @IsUUID()
  certification_id: string;

  @ApiProperty({ description: 'Description of the non-compliance finding' })
  @IsString()
  @IsNotEmpty()
  finding_description: string;

  @ApiPropertyOptional({ description: 'Code of the requirement that was violated' })
  @IsString()
  @IsOptional()
  requirement_code?: string;

  @ApiProperty({ description: 'Priority level', enum: CorrectiveActionPriority })
  @IsEnum(CorrectiveActionPriority)
  priority: CorrectiveActionPriority;

  @ApiProperty({ description: 'Description of the corrective action' })
  @IsString()
  @IsNotEmpty()
  action_description: string;

  @ApiProperty({ description: 'Person responsible for the action' })
  @IsString()
  @IsNotEmpty()
  responsible_person: string;

  @ApiProperty({ description: 'Due date for the action' })
  @IsDateString()
  due_date: string;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateCorrectiveActionDto {
  @ApiPropertyOptional({ description: 'Description of the non-compliance finding' })
  @IsString()
  @IsOptional()
  finding_description?: string;

  @ApiPropertyOptional({ description: 'Code of the requirement that was violated' })
  @IsString()
  @IsOptional()
  requirement_code?: string;

  @ApiPropertyOptional({ description: 'Priority level', enum: CorrectiveActionPriority })
  @IsEnum(CorrectiveActionPriority)
  @IsOptional()
  priority?: CorrectiveActionPriority;

  @ApiPropertyOptional({ description: 'Description of the corrective action' })
  @IsString()
  @IsOptional()
  action_description?: string;

  @ApiPropertyOptional({ description: 'Person responsible for the action' })
  @IsString()
  @IsOptional()
  responsible_person?: string;

  @ApiPropertyOptional({ description: 'Due date for the action' })
  @IsDateString()
  @IsOptional()
  due_date?: string;

  @ApiPropertyOptional({ description: 'Status of the action', enum: CorrectiveActionStatus })
  @IsEnum(CorrectiveActionStatus)
  @IsOptional()
  status?: CorrectiveActionStatus;

  @ApiPropertyOptional({ description: 'Notes about the resolution' })
  @IsString()
  @IsOptional()
  resolution_notes?: string;

  @ApiPropertyOptional({ description: 'Date when resolved' })
  @IsDateString()
  @IsOptional()
  resolved_at?: string;

  @ApiPropertyOptional({ description: 'User ID who verified the action' })
  @IsUUID()
  @IsOptional()
  verified_by?: string;

  @ApiPropertyOptional({ description: 'Date when verified' })
  @IsDateString()
  @IsOptional()
  verified_at?: string;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class CorrectiveActionStatsDto {
  @ApiProperty()
  total: number;

  @ApiProperty()
  open: number;

  @ApiProperty()
  in_progress: number;

  @ApiProperty()
  resolved: number;

  @ApiProperty()
  verified: number;

  @ApiProperty()
  overdue: number;

  @ApiProperty()
  resolution_rate: number;

  @ApiProperty()
  average_resolution_days: number;
}

export class CorrectiveActionFiltersDto {
  @ApiPropertyOptional()
  status?: CorrectiveActionStatus;

  @ApiPropertyOptional()
  priority?: CorrectiveActionPriority;

  @ApiPropertyOptional()
  certification_id?: string;

  @ApiPropertyOptional()
  overdue?: boolean;
}
