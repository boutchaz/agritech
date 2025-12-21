import { IsString, IsBoolean, IsOptional, IsArray, ValidateNested, IsEnum, IsObject } from 'class-validator';
import { Type } from 'class-transformer';

export enum ReferenceDataTable {
  ACCOUNT_TEMPLATES = 'account_templates',
  ACCOUNT_MAPPINGS = 'account_mappings',
  MODULES = 'modules',
  CURRENCIES = 'currencies',
  ROLES = 'roles',
  WORK_UNITS = 'work_units',
}

export class ReferenceDataRowDto {
  @IsObject()
  data: Record<string, any>;
}

export class ImportReferenceDataDto {
  @IsEnum(ReferenceDataTable)
  table: ReferenceDataTable;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReferenceDataRowDto)
  rows: ReferenceDataRowDto[];

  @IsBoolean()
  @IsOptional()
  dryRun?: boolean;

  @IsBoolean()
  @IsOptional()
  updateExisting?: boolean;

  @IsString()
  @IsOptional()
  version?: string;
}

export class ImportResultDto {
  success: boolean;
  dryRun: boolean;
  recordsProcessed: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsSkipped: number;
  errors: Array<{ row: number; error: string }>;
  jobId?: string;
}
