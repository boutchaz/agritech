import { IsString, IsBoolean, IsOptional, IsUUID, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAccountMappingDto {
  @ApiProperty({ description: 'Mapping type (e.g., cost_type, revenue_type, harvest_sale, cash)' })
  @IsString()
  mapping_type: string;

  @ApiProperty({ description: 'Mapping key for global mappings (e.g., labor, materials)' })
  @IsString()
  @IsOptional()
  mapping_key?: string;

  @ApiProperty({ description: 'Source key for org-specific mappings (e.g., planting, harvesting)' })
  @IsString()
  @IsOptional()
  source_key?: string;

  @ApiProperty({ description: 'Account ID to map to' })
  @IsUUID()
  account_id: string;

  @ApiPropertyOptional({ description: 'Whether the mapping is active' })
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;

  @ApiPropertyOptional({ description: 'Description of the mapping' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Additional metadata for the mapping' })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;

  // Set by controller
  @IsUUID()
  @IsOptional()
  organization_id?: string;
}
