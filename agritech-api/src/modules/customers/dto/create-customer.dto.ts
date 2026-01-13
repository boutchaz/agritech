import { IsString, IsEmail, IsOptional, IsBoolean, IsNumber, Matches } from 'class-validator';

export class CreateCustomerDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  customer_code?: string;

  @IsOptional()
  @IsString()
  contact_person?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @Matches(/^[\+]?[0-9()\s\-.]{8,20}$/, {
    message: 'Phone number must be in valid international format (8-20 characters, can include +, digits, spaces, parentheses, hyphens, dots)'
  })
  phone?: string;

  @IsOptional()
  @Matches(/^[\+]?[0-9()\s\-.]{8,20}$/, {
    message: 'Mobile number must be in valid international format (8-20 characters, can include +, digits, spaces, parentheses, hyphens, dots)'
  })
  mobile?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state_province?: string;

  @IsOptional()
  @IsString()
  postal_code?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsString()
  tax_id?: string;

  @IsOptional()
  @IsString()
  payment_terms?: string;

  @IsOptional()
  @IsNumber()
  credit_limit?: number;

  @IsOptional()
  @IsString()
  currency_code?: string;

  @IsOptional()
  @IsString()
  customer_type?: string;

  @IsOptional()
  @IsString()
  price_list?: string;

  @IsOptional()
  @IsString()
  assigned_to?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
