import { IsString, IsBoolean, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCostCenterDto {
  @ApiProperty({ description: 'Cost center code (unique within organization)' })
  @IsString()
  code: string;

  @ApiProperty({ description: 'Cost center name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Cost center description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Parent cost center ID for hierarchical structure' })
  @IsUUID()
  @IsOptional()
  parent_id?: string;

  @ApiPropertyOptional({ description: 'Farm ID to link cost center to a specific farm' })
  @IsUUID()
  @IsOptional()
  farm_id?: string;

  @ApiPropertyOptional({ description: 'Parcel ID to link cost center to a specific parcel' })
  @IsUUID()
  @IsOptional()
  parcel_id?: string;

  @ApiPropertyOptional({ description: 'Whether the cost center is active', default: true })
  @IsBoolean()
  @IsOptional()
  is_active?: boolean;

  @IsUUID()
  @IsOptional()
  organization_id?: string;

  @IsUUID()
  @IsOptional()
  created_by?: string;
}
