import { ApiProperty } from '@nestjs/swagger';

export class ParcelDto {
  @ApiProperty({ description: 'Parcel ID' })
  id: string;

  @ApiProperty({ description: 'Farm ID' })
  farm_id: string;

  @ApiProperty({ description: 'Parcel name' })
  name: string;

  @ApiProperty({ description: 'Parcel description', required: false })
  description?: string;

  @ApiProperty({ description: 'Area in hectares' })
  area: number;

  @ApiProperty({ description: 'Area unit' })
  area_unit: string;

  @ApiProperty({ description: 'Crop category', required: false })
  crop_category?: string;

  @ApiProperty({ description: 'Crop type', required: false })
  crop_type?: string;

  @ApiProperty({ description: 'Tree type (for orchards)', required: false })
  tree_type?: string;

  @ApiProperty({ description: 'Tree count', required: false })
  tree_count?: number;

  @ApiProperty({ description: 'Planting density', required: false })
  planting_density?: number;

  @ApiProperty({ description: 'Crop variety', required: false })
  variety?: string;

  @ApiProperty({ description: 'Planting system', required: false })
  planting_system?: string;

  @ApiProperty({ description: 'Spacing', required: false })
  spacing?: string;

  @ApiProperty({ description: 'Density per hectare', required: false })
  density_per_hectare?: number;

  @ApiProperty({ description: 'Plant count', required: false })
  plant_count?: number;

  @ApiProperty({ description: 'Planting date', required: false })
  planting_date?: string;

  @ApiProperty({ description: 'Planting year', required: false })
  planting_year?: number;

  @ApiProperty({ description: 'Rootstock', required: false })
  rootstock?: string;

  @ApiProperty({ description: 'Soil type', required: false })
  soil_type?: string;

  @ApiProperty({ description: 'Irrigation type', required: false })
  irrigation_type?: string;

  @ApiProperty({ description: 'Is active' })
  is_active: boolean;

  @ApiProperty({ description: 'Created at' })
  created_at: string;

  @ApiProperty({ description: 'Updated at' })
  updated_at: string;
}

export class ListParcelsResponseDto {
  @ApiProperty({ description: 'Whether the request was successful' })
  success: boolean;

  @ApiProperty({ description: 'List of parcels', type: [ParcelDto] })
  parcels: ParcelDto[];
}

export class GetParcelResponseDto {
  @ApiProperty({ description: 'Whether the request was successful' })
  success: boolean;

  @ApiProperty({ description: 'Parcel', type: ParcelDto })
  parcel: ParcelDto;
}

