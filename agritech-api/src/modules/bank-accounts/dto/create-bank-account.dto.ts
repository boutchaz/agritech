import { IsString, IsBoolean, IsOptional, IsUUID, IsNumber } from 'class-validator';

export class CreateBankAccountDto {
  @IsString()
  account_name: string;

  @IsString()
  @IsOptional()
  account_number?: string;

  @IsString()
  @IsOptional()
  bank_name?: string;

  @IsString()
  @IsOptional()
  branch_name?: string;

  @IsString()
  @IsOptional()
  swift_code?: string;

  @IsString()
  @IsOptional()
  iban?: string;

  @IsString()
  @IsOptional()
  currency_code?: string;

  @IsNumber()
  @IsOptional()
  opening_balance?: number;

  @IsNumber()
  @IsOptional()
  current_balance?: number;

  @IsUUID()
  @IsOptional()
  gl_account_id?: string;

  @IsBoolean()
  @IsOptional()
  is_active?: boolean;

  // Set by controller
  @IsUUID()
  @IsOptional()
  organization_id?: string;

  @IsUUID()
  @IsOptional()
  created_by?: string;
}
