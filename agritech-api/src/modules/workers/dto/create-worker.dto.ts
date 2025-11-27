import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsUUID,
  IsEmail,
  IsDateString,
  IsIn,
  IsBoolean,
  IsNumber,
  IsArray,
  Min,
  Max,
} from 'class-validator';

export class CreateWorkerDto {
  @ApiProperty({ description: 'First name' })
  @IsString()
  first_name: string;

  @ApiProperty({ description: 'Last name' })
  @IsString()
  last_name: string;

  @ApiPropertyOptional({ description: 'National ID number (CIN)' })
  @IsOptional()
  @IsString()
  cin?: string;

  @ApiPropertyOptional({ description: 'Phone number' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'Email address' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'Address' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ description: 'Date of birth (ISO date)' })
  @IsOptional()
  @IsDateString()
  date_of_birth?: string;

  @ApiProperty({
    description: 'Worker type',
    enum: ['fixed_salary', 'daily_worker', 'metayage']
  })
  @IsIn(['fixed_salary', 'daily_worker', 'metayage'])
  worker_type: string;

  @ApiPropertyOptional({ description: 'Position/job title' })
  @IsOptional()
  @IsString()
  position?: string;

  @ApiProperty({ description: 'Hire date (ISO date)' })
  @IsDateString()
  hire_date: string;

  @ApiPropertyOptional({ description: 'Farm ID (if farm-specific worker)' })
  @IsOptional()
  @IsUUID()
  farm_id?: string;

  @ApiProperty({ description: 'Is declared to CNSS', default: false })
  @IsBoolean()
  is_cnss_declared: boolean;

  @ApiPropertyOptional({ description: 'CNSS number' })
  @IsOptional()
  @IsString()
  cnss_number?: string;

  @ApiPropertyOptional({ description: 'Monthly salary for fixed employees' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  monthly_salary?: number;

  @ApiPropertyOptional({ description: 'Daily rate for daily workers' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  daily_rate?: number;

  @ApiPropertyOptional({
    description: 'Métayage type',
    enum: ['khammass', 'rebaa', 'tholth', 'custom']
  })
  @IsOptional()
  @IsIn(['khammass', 'rebaa', 'tholth', 'custom'])
  metayage_type?: string;

  @ApiPropertyOptional({
    description: 'Métayage percentage (0-50)',
    minimum: 0,
    maximum: 50
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(50)
  metayage_percentage?: number;

  @ApiPropertyOptional({
    description: 'Calculation basis for métayage',
    enum: ['gross_revenue', 'net_revenue']
  })
  @IsOptional()
  @IsIn(['gross_revenue', 'net_revenue'])
  calculation_basis?: string;

  @ApiPropertyOptional({
    description: 'Métayage contract details',
    type: 'object',
    additionalProperties: true
  })
  @IsOptional()
  metayage_contract_details?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Worker specialties',
    type: [String]
  })
  @IsOptional()
  @IsArray()
  specialties?: string[];

  @ApiPropertyOptional({
    description: 'Worker certifications',
    type: [String]
  })
  @IsOptional()
  @IsArray()
  certifications?: string[];

  @ApiPropertyOptional({
    description: 'Payment frequency',
    enum: ['monthly', 'daily', 'per_task', 'harvest_share']
  })
  @IsOptional()
  @IsIn(['monthly', 'daily', 'per_task', 'harvest_share'])
  payment_frequency?: string;

  @ApiPropertyOptional({ description: 'Bank account number' })
  @IsOptional()
  @IsString()
  bank_account?: string;

  @ApiPropertyOptional({ description: 'Payment method' })
  @IsOptional()
  @IsString()
  payment_method?: string;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Active status', default: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
