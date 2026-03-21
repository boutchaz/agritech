import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsUUID, IsBoolean, IsInt, IsEnum } from 'class-validator';

export enum BucketName {
  PRODUCTS = 'products',
  INVOICES = 'invoices',
  DOCUMENTS = 'documents',
  SATELLITE_DATA = 'satellite-data',
}

export enum EntityType {
  ITEM = 'item',
  INVOICE = 'invoice',
  DOCUMENT = 'document',
  UTILITY = 'utility',
  SELLER = 'seller',
  FARM = 'farm',
  PARCEL = 'parcel',
  TASK = 'task',
}

export class RegisterFileDto {
  @ApiProperty()
  @IsString()
  bucket_name: string;

  @ApiProperty()
  @IsString()
  file_path: string;

  @ApiProperty()
  @IsString()
  file_name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  file_size?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  mime_type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  entity_type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  entity_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  field_name?: string;
}

export class UpdateFileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  entity_type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  entity_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  field_name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_orphan?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  marked_for_deletion?: boolean;
}

export class FileRegistryResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  organization_id: string;

  @ApiProperty()
  bucket_name: string;

  @ApiProperty()
  file_path: string;

  @ApiProperty()
  file_name: string;

  @ApiPropertyOptional()
  file_size?: number;

  @ApiPropertyOptional()
  mime_type?: string;

  @ApiPropertyOptional()
  entity_type?: string;

  @ApiPropertyOptional()
  entity_id?: string;

  @ApiPropertyOptional()
  field_name?: string;

  @ApiProperty()
  uploaded_at: string;

  @ApiPropertyOptional()
  last_accessed_at?: string;

  @ApiProperty()
  access_count: number;

  @ApiProperty()
  is_orphan: boolean;

  @ApiProperty()
  marked_for_deletion: boolean;
}

export class StorageStatsDto {
  @ApiProperty()
  bucket_name: string;

  @ApiProperty()
  file_count: number;

  @ApiProperty()
  total_size_mb: number;

  @ApiProperty()
  orphan_count: number;

  @ApiProperty()
  orphan_size_mb: number;
}

export class OrphanedFileDto {
  @ApiProperty()
  file_id: string;

  @ApiProperty()
  bucket_name: string;

  @ApiProperty()
  file_path: string;

  @ApiPropertyOptional()
  entity_type?: string;

  @ApiPropertyOptional()
  entity_id?: string;

  @ApiProperty()
  reason: string;
}
