import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsObject, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ExportMetadataDto {
  @ApiProperty({ description: 'Total number of farms' })
  total_farms: number;

  @ApiProperty({ description: 'Total number of parcels' })
  total_parcels: number;

  @ApiProperty({ description: 'Total number of AOIs' })
  total_aois: number;
}

export class ExportDataDto {
  @ApiProperty({ description: 'Export timestamp' })
  @IsString()
  exported_at: string;

  @ApiProperty({ description: 'Export version' })
  @IsString()
  version: string;

  @ApiProperty({ description: 'Array of farms to import', type: 'array' })
  @IsNotEmpty()
  farms: any[];

  @ApiPropertyOptional({ description: 'Array of parcels to import', type: 'array' })
  @IsOptional()
  parcels?: any[];

  @ApiPropertyOptional({ description: 'Array of satellite AOIs to import', type: 'array' })
  @IsOptional()
  satellite_aois?: any[];

  @ApiProperty({ description: 'Export metadata' })
  @ValidateNested()
  @Type(() => ExportMetadataDto)
  metadata: ExportMetadataDto;
}

export class ImportFarmDto {
  @ApiProperty({
    description: 'Organization ID to import into',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  organization_id: string;

  @ApiProperty({ description: 'Export data to import' })
  @IsObject()
  @ValidateNested()
  @Type(() => ExportDataDto)
  export_data: ExportDataDto;

  @ApiPropertyOptional({
    description: 'Skip importing duplicates (same name)',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  skip_duplicates?: boolean;
}

export class IdMappingsDto {
  @ApiProperty({ description: 'Farm ID mappings (original_id -> new_id)' })
  farms: Record<string, string>;

  @ApiProperty({ description: 'Parcel ID mappings (original_id -> new_id)' })
  parcels: Record<string, string>;

  @ApiProperty({ description: 'AOI ID mappings (original_id -> new_id)' })
  satellite_aois: Record<string, string>;
}

export class ImportedCountsDto {
  @ApiProperty({ description: 'Number of farms imported' })
  farms: number;

  @ApiProperty({ description: 'Number of parcels imported' })
  parcels: number;

  @ApiProperty({ description: 'Number of satellite AOIs imported' })
  satellite_aois: number;

  @ApiProperty({ description: 'ID mappings from original to new IDs' })
  id_mappings: IdMappingsDto;
}

export class ImportFarmResponseDto {
  @ApiProperty({ description: 'Whether import was successful' })
  success: boolean;

  @ApiPropertyOptional({ description: 'Import statistics' })
  imported?: ImportedCountsDto;

  @ApiPropertyOptional({ description: 'Import errors', type: [String] })
  errors?: string[];

  @ApiPropertyOptional({ description: 'Import warnings', type: [String] })
  warnings?: string[];
}
