import { ApiProperty } from '@nestjs/swagger';

export class FarmDto {
  @ApiProperty({ description: 'Farm ID' })
  farm_id: string;

  @ApiProperty({ description: 'Farm name' })
  farm_name: string;

  @ApiProperty({ description: 'Parent farm ID (always null for now)' })
  parent_farm_id: string | null;

  @ApiProperty({ description: 'Farm type (always "main" for now)' })
  farm_type: string;

  @ApiProperty({ description: 'Farm size in hectares' })
  farm_size: number | null;

  @ApiProperty({ description: 'Manager name' })
  manager_name: string | null;

  @ApiProperty({ description: 'Is active' })
  is_active: boolean;

  @ApiProperty({ description: 'Hierarchy level (always 1 for now)' })
  hierarchy_level: number;

  @ApiProperty({ description: 'Number of parcels' })
  parcel_count: number;

  @ApiProperty({ description: 'Number of sub-parcels (always 0 for now)' })
  subparcel_count: number;
}

export class ListFarmsResponseDto {
  @ApiProperty({ description: 'Whether the request was successful' })
  success: boolean;

  @ApiProperty({ description: 'List of farms', type: [FarmDto] })
  farms: FarmDto[];

  @ApiProperty({ description: 'Total count of farms' })
  total: number;
}
