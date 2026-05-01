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
  IsUrl,
  Min,
  Max,
  Matches,
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

  @ApiPropertyOptional({
    description: 'Phone number (international format)',
    example: '+212 6 12 34 56 78'
  })
  @IsOptional()
  @IsString()
  @Matches(/^[\+]?[0-9()\s\-.]{8,20}$/, {
    message: 'Phone number must be in valid international format (8-20 characters, can include +, digits, spaces, parentheses, hyphens, dots)'
  })
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

  @ApiPropertyOptional({ description: 'Organization ID (auto-populated from farm if not provided)' })
  @IsOptional()
  @IsUUID()
  organization_id?: string;

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

  @ApiPropertyOptional({ description: 'Per-unit rate for piece work' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  per_unit_rate?: number;

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
    enum: ['monthly', 'daily', 'per_task', 'per_unit', 'harvest_share']
  })
  @IsOptional()
  @IsIn(['monthly', 'daily', 'per_task', 'per_unit', 'harvest_share'])
  payment_frequency?: string;

  @ApiPropertyOptional({ description: 'Accepted payment modes for daily workers (multi-select)', type: [String] })
  @IsOptional()
  @IsArray()
  @IsIn(['monthly', 'daily', 'per_task', 'harvest_share', 'per_unit'], { each: true })
  payment_frequencies?: string[];

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

  @ApiPropertyOptional({ description: 'Photo URLs', type: [String] })
  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  photos?: string[];

  @ApiPropertyOptional({ description: 'Active status', default: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  // ── Phase 1.C — Enhanced Profile ────────────────────────────────────
  @ApiPropertyOptional({
    enum: ['full_time', 'part_time', 'intern', 'contract', 'seasonal', 'probation'],
  })
  @IsOptional()
  @IsIn(['full_time', 'part_time', 'intern', 'contract', 'seasonal', 'probation'])
  employment_type?: string;

  @ApiPropertyOptional({ enum: ['male', 'female'] })
  @IsOptional()
  @IsIn(['male', 'female'])
  gender?: 'male' | 'female';

  @ApiPropertyOptional({ enum: ['single', 'married', 'divorced', 'widowed'] })
  @IsOptional()
  @IsIn(['single', 'married', 'divorced', 'widowed'])
  marital_status?: 'single' | 'married' | 'divorced' | 'widowed';

  @ApiPropertyOptional({ description: 'Number of dependent children (used for IR family deduction)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  number_of_children?: number;

  @ApiPropertyOptional() @IsOptional() @IsString() nationality?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() cin_issue_date?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() cin_issue_place?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() emergency_contact_name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() emergency_contact_phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() emergency_contact_relation?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() health_insurance_provider?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() health_insurance_number?: string;

  @ApiPropertyOptional({ enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] })
  @IsOptional()
  @IsIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'])
  blood_type?: string;

  @ApiPropertyOptional() @IsOptional() @IsDateString() contract_start_date?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() contract_end_date?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() probation_end_date?: string;

  @ApiPropertyOptional({ description: 'Notice period in days' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  notice_period_days?: number;

  @ApiPropertyOptional() @IsOptional() @IsDateString() confirmation_date?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() reporting_to?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() photo_url?: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() personal_email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() permanent_address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() current_address?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() educational_qualification?: string;

  @ApiPropertyOptional({ description: 'Previous work experience (free-form JSON array)' })
  @IsOptional()
  @IsArray()
  previous_work_experience?: unknown[];

  @ApiPropertyOptional() @IsOptional() @IsUUID() holiday_list_id?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() salary_structure_assignment_id?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() bank_name?: string;
  @ApiPropertyOptional({ description: 'Bank RIB (Relevé d’Identité Bancaire)' })
  @IsOptional()
  @IsString()
  bank_rib?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() tax_identification_number?: string;

  @ApiPropertyOptional({
    enum: ['active', 'inactive', 'on_leave', 'terminated', 'probation'],
  })
  @IsOptional()
  @IsIn(['active', 'inactive', 'on_leave', 'terminated', 'probation'])
  status?: string;
}
