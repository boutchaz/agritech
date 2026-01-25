import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsUUID,
  IsNumber,
  IsArray,
  IsObject,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum ComplianceCheckType {
  PESTICIDE_USAGE = 'pesticide_usage',
  TRACEABILITY = 'traceability',
  WORKER_SAFETY = 'worker_safety',
  RECORD_KEEPING = 'record_keeping',
  ENVIRONMENTAL = 'environmental',
  QUALITY_CONTROL = 'quality_control',
}

export enum ComplianceCheckStatus {
  COMPLIANT = 'compliant',
  NON_COMPLIANT = 'non_compliant',
  NEEDS_REVIEW = 'needs_review',
  IN_PROGRESS = 'in_progress',
}

export class FindingDto {
  @ApiProperty({ description: 'Requirement code (e.g., AF.1.1)' })
  @IsString()
  requirement_code: string;

  @ApiProperty({ description: 'Description of the finding' })
  @IsString()
  finding_description: string;

  @ApiProperty({ description: 'Severity level (low, medium, high, critical)' })
  @IsString()
  severity: string;
}

export class CorrectiveActionDto {
  @ApiProperty({ description: 'Description of corrective action' })
  @IsString()
  action_description: string;

  @ApiProperty({ description: 'Due date for completion (ISO 8601)' })
  @IsDateString()
  due_date: string;

  @ApiProperty({ description: 'Person responsible for action' })
  @IsString()
  responsible_person: string;

  @ApiProperty({ description: 'Status (pending, in_progress, completed)' })
  @IsString()
  status: string;
}

export class CreateComplianceCheckDto {
  @ApiProperty({ description: 'Certification ID being audited' })
  @IsUUID()
  certification_id: string;

  @ApiProperty({
    enum: ComplianceCheckType,
    description: 'Type of compliance check',
  })
  @IsEnum(ComplianceCheckType)
  check_type: ComplianceCheckType;

  @ApiProperty({ description: 'Date the check was conducted (ISO 8601)' })
  @IsDateString()
  check_date: string;

  @ApiProperty({
    enum: ComplianceCheckStatus,
    description: 'Result status of the check',
    default: ComplianceCheckStatus.IN_PROGRESS,
  })
  @IsEnum(ComplianceCheckStatus)
  status: ComplianceCheckStatus;

  @ApiPropertyOptional({
    description: 'Array of findings',
    type: [FindingDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FindingDto)
  findings?: FindingDto[];

  @ApiPropertyOptional({
    description: 'Array of corrective actions',
    type: [CorrectiveActionDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CorrectiveActionDto)
  corrective_actions?: CorrectiveActionDto[];

  @ApiPropertyOptional({
    description: 'Scheduled date for next check (ISO 8601)',
  })
  @IsOptional()
  @IsDateString()
  next_check_date?: string;

  @ApiPropertyOptional({ description: 'Name of auditor who conducted the check' })
  @IsOptional()
  @IsString()
  auditor_name?: string;

  @ApiPropertyOptional({
    description: 'Compliance score (0-100)',
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  score?: number;
}
