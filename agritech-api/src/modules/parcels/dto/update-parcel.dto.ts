import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsDateString, Min, IsInt } from 'class-validator';

export class UpdateParcelDto {
  @ApiPropertyOptional({
    description: 'Parcel name',
    example: 'Parcelle Nord',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Parcel description',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Area in hectares',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  area?: number;

  @ApiPropertyOptional({
    description: 'Area unit',
  })
  @IsOptional()
  @IsString()
  area_unit?: string;

  @ApiPropertyOptional({
    description: 'Crop category',
  })
  @IsOptional()
  @IsString()
  crop_category?: string;

  @ApiPropertyOptional({
    description: 'Crop type',
  })
  @IsOptional()
  @IsString()
  crop_type?: string;

  @ApiPropertyOptional({
    description: 'Crop variety',
  })
  @IsOptional()
  @IsString()
  variety?: string;

  @ApiPropertyOptional({
    description: 'Planting system',
  })
  @IsOptional()
  @IsString()
  planting_system?: string;

  @ApiPropertyOptional({
    description: 'Spacing between plants',
  })
  @IsOptional()
  @IsString()
  spacing?: string;

  @ApiPropertyOptional({
    description: 'Density per hectare',
  })
  @IsOptional()
  @IsNumber()
  density_per_hectare?: number;

  @ApiPropertyOptional({
    description: 'Total plant count',
  })
  @IsOptional()
  @IsInt()
  plant_count?: number;

  @ApiPropertyOptional({
    description: 'Planting date',
  })
  @IsOptional()
  @IsDateString()
  planting_date?: string;

  @ApiPropertyOptional({
    description: 'Planting year',
  })
  @IsOptional()
  @IsInt()
  planting_year?: number;

  @ApiPropertyOptional({
    description: 'Rootstock (for trees)',
  })
  @IsOptional()
  @IsString()
  rootstock?: string;

  @ApiPropertyOptional({
    description: 'Soil type',
  })
  @IsOptional()
  @IsString()
  soil_type?: string;

  @ApiPropertyOptional({
    description: 'Irrigation type',
  })
  @IsOptional()
  @IsString()
  irrigation_type?: string;
}

