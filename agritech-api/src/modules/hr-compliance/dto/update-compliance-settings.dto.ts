import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateComplianceSettingsDto {
  @ApiPropertyOptional() @IsOptional() @IsString() compliance_country?: string;

  @ApiPropertyOptional({ enum: ['morocco_standard', 'morocco_basic', 'morocco_none', 'custom'] })
  @IsOptional()
  @IsIn(['morocco_standard', 'morocco_basic', 'morocco_none', 'custom'])
  compliance_preset?: string;

  // CNSS
  @ApiPropertyOptional() @IsOptional() @IsBoolean() cnss_enabled?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(100) cnss_employee_rate?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(100) cnss_employer_rate?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) cnss_salary_cap?: number | null;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() cnss_auto_declare?: boolean;
  @ApiPropertyOptional({ enum: ['monthly', 'quarterly'] })
  @IsOptional()
  @IsIn(['monthly', 'quarterly'])
  cnss_declaration_frequency?: 'monthly' | 'quarterly';

  // AMO
  @ApiPropertyOptional() @IsOptional() @IsBoolean() amo_enabled?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(100) amo_employee_rate?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(100) amo_employer_rate?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) amo_salary_cap?: number | null;

  // CIS
  @ApiPropertyOptional() @IsOptional() @IsBoolean() cis_enabled?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(100) cis_employee_rate?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(100) cis_employer_rate?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) cis_salary_cap?: number | null;

  // IR
  @ApiPropertyOptional() @IsOptional() @IsBoolean() income_tax_enabled?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsUUID() income_tax_config_id?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() professional_expenses_deduction_enabled?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) @Max(100) professional_expenses_rate?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) professional_expenses_cap?: number | null;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() family_deduction_enabled?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) family_deduction_per_child?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) family_deduction_max_children?: number;

  // Leave
  @ApiPropertyOptional({ enum: ['morocco_legal', 'custom'] })
  @IsOptional()
  @IsIn(['morocco_legal', 'custom'])
  leave_compliance_mode?: 'morocco_legal' | 'custom';
  @ApiPropertyOptional() @IsOptional() @IsBoolean() enforce_minimum_leave?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() auto_allocate_annual_leave?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) annual_leave_days_per_month?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) sick_leave_days?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) maternity_leave_weeks?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) paternity_leave_days?: number;

  // Min wage
  @ApiPropertyOptional() @IsOptional() @IsBoolean() minimum_wage_check_enabled?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) minimum_daily_wage?: number | null;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) minimum_monthly_wage?: number | null;

  // Payroll behavior
  @ApiPropertyOptional({ enum: ['daily', 'weekly', 'biweekly', 'monthly'] })
  @IsOptional()
  @IsIn(['daily', 'weekly', 'biweekly', 'monthly'])
  default_pay_frequency?: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  @ApiPropertyOptional() @IsOptional() @IsString() default_currency?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() round_net_pay?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() auto_generate_slips_on_payroll_run?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() password_protect_payslips?: boolean;

  // Overtime
  @ApiPropertyOptional() @IsOptional() @IsBoolean() overtime_enabled?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) standard_working_hours?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(1) overtime_rate_multiplier?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(1) overtime_rate_multiplier_weekend?: number;
}
