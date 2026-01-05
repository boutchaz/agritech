import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsDate, IsUUID, IsOptional, IsEnum, IsNotEmpty, Min } from 'class-validator';
import { Type } from 'class-transformer';

export enum BiologicalAssetType {
  TREE = 'tree',
  LIVESTOCK = 'livestock',
  VINE = 'vine',
  SHRUB = 'shrub',
  OTHER = 'other',
}

export enum BiologicalAssetStatus {
  ACTIVE = 'active',
  DORMANT = 'dormant',
  DISEASED = 'diseased',
  DEAD = 'dead',
  HARVESTED = 'harvested',
  REMOVED = 'removed',
}

export class CreateBiologicalAssetDto {
  @ApiProperty({ description: 'Organization ID' })
  @IsUUID()
  @IsNotEmpty()
  organization_id: string;

  @ApiProperty({ description: 'Farm ID' })
  @IsUUID()
  @IsNotEmpty()
  farm_id: string;

  @ApiProperty({ description: 'Parcel ID (optional)' })
  @IsUUID()
  @IsOptional()
  parcel_id?: string;

  @ApiProperty({ description: 'Asset type', enum: BiologicalAssetType })
  @IsEnum(BiologicalAssetType)
  @IsNotEmpty()
  asset_type: BiologicalAssetType;

  @ApiProperty({ description: 'Asset name/code' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Species/variety' })
  @IsString()
  @IsOptional()
  variety?: string;

  @ApiProperty({ description: 'Rootstock (for trees/vines)' })
  @IsString()
  @IsOptional()
  rootstock?: string;

  @ApiProperty({ description: 'Planting date' })
  @IsDate()
  @Type(() => Date)
  @IsNotEmpty()
  planting_date: Date;

  @ApiProperty({ description: 'Expected harvest date' })
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  expected_harvest_date?: Date;

  @ApiProperty({ description: 'Quantity' })
  @IsNumber()
  @Min(1)
  @IsNotEmpty()
  quantity: number;

  @ApiProperty({ description: 'Unit of measurement' })
  @IsString()
  @IsOptional()
  unit?: string;

  @ApiProperty({ description: 'Current age in years' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  age_years?: number;

  @ApiProperty({ description: 'Current status', enum: BiologicalAssetStatus })
  @IsEnum(BiologicalAssetStatus)
  @IsOptional()
  status?: BiologicalAssetStatus;

  @ApiProperty({ description: 'GPS coordinates (latitude)' })
  @IsNumber()
  @IsOptional()
  latitude?: number;

  @ApiProperty({ description: 'GPS coordinates (longitude)' })
  @IsNumber()
  @IsOptional()
  longitude?: number;

  @ApiProperty({ description: 'Notes' })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ description: 'Image URL' })
  @IsString()
  @IsOptional()
  image_url?: string;
}
