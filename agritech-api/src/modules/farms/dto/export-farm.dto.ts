import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class ExportFarmDto {
  @ApiPropertyOptional({
    description: 'Farm ID to export (with optional sub-farms)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsString()
  farm_id?: string;

  @ApiPropertyOptional({
    description: 'Organization ID to export all farms from',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsOptional()
  @IsString()
  organization_id?: string;

  @ApiPropertyOptional({
    description: 'Include sub-farms recursively (only applies when farm_id is provided)',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  include_sub_farms?: boolean;
}

export class ExportFarmMetadataDto {
  @ApiProperty({ description: 'Total number of farms exported' })
  total_farms: number;

  @ApiProperty({ description: 'Total number of parcels exported' })
  total_parcels: number;

  @ApiProperty({ description: 'Total number of satellite AOIs exported' })
  total_aois: number;
}

export class ExportFarmDataDto {
  @ApiProperty({ description: 'Export timestamp (ISO 8601)', example: '2024-01-15T10:30:00Z' })
  exported_at: string;

  @ApiProperty({ description: 'Export format version', example: '1.0.0' })
  version: string;

  @ApiProperty({ description: 'Exported farms with original_id preserved', type: [Object] })
  farms: any[];

  @ApiProperty({ description: 'Exported parcels with original_id and original_farm_id preserved', type: [Object] })
  parcels: any[];

  @ApiProperty({ description: 'Exported satellite AOIs with original IDs preserved', type: [Object] })
  satellite_aois: any[];

  @ApiProperty({ description: 'Export metadata', type: ExportFarmMetadataDto })
  metadata: ExportFarmMetadataDto;
}

export class ExportFarmResponseDto {
  @ApiProperty({ description: 'Success status', example: true })
  success: boolean;

  @ApiProperty({ description: 'Export data', type: ExportFarmDataDto })
  data: ExportFarmDataDto;
}
