import { IsString, IsBoolean, IsOptional } from 'class-validator';

export class ApplyTemplateDto {
  @IsBoolean()
  @IsOptional()
  overwrite?: boolean;

  @IsBoolean()
  @IsOptional()
  includeAccountMappings?: boolean;

  @IsBoolean()
  @IsOptional()
  includeCostCenters?: boolean;
}

export interface TemplateAccount {
  code: string;
  name: string;
  account_type: string;
  account_subtype: string;
  is_group: boolean;
  is_active: boolean;
  parent_code?: string;
  currency_code: string;
  description_fr?: string;
  description_ar?: string;
}

export interface TemplateCountry {
  country_code: string;
  country_name: string;
  country_name_native?: string;
  accounting_standard: string;
  default_currency: string;
  version: string;
}

export interface ChartOfAccountsTemplate {
  id: number;
  country_code: string;
  country_name: string;
  country_name_native?: string;
  accounting_standard: string;
  default_currency: string;
  version: string;
  description?: string;
  description_native?: string;
  accounts: TemplateAccount[];
  is_default: boolean;
  supported_industries: string[];
  tax_settings?: Record<string, unknown>;
  fiscal_year_start_month: number;
}

export interface ApplyTemplateResult {
  success: boolean;
  accounts_created: number;
  account_mappings_created?: number;
  cost_centers_created?: number;
  message: string;
}
