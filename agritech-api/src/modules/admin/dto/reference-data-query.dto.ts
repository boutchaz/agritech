import { IsOptional, IsString, IsEnum, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
import { ReferenceDataTable } from './import-reference-data.dto';

export class ReferenceDataQueryDto {
  @IsString()
  @IsOptional()
  source?: string;

  @IsString()
  @IsOptional()
  version?: string;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  publishedOnly?: boolean;

  @IsString()
  @IsOptional()
  search?: string;

  @IsString()
  @IsOptional()
  sortBy?: string;

  @IsString()
  @IsOptional()
  sortOrder?: 'asc' | 'desc';

  @IsString()
  @IsOptional()
  limit?: string;

  @IsString()
  @IsOptional()
  offset?: string;
}

export class ReferenceDataDiffDto {
  @IsString()
  fromVersion: string;

  @IsString()
  @IsOptional()
  toVersion?: string;
}

export class ReferenceDataDiffResultDto {
  table: string;
  fromVersion: string;
  toVersion: string;
  added: number;
  modified: number;
  removed: number;
  changes: Array<{
    type: 'added' | 'modified' | 'removed';
    id: string;
    field?: string;
    oldValue?: any;
    newValue?: any;
  }>;
}
