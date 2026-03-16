import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsNumber,
  IsOptional,
  IsDateString,
  Min,
  IsInt,
} from "class-validator";

export class UpdateParcelDto {
  @ApiPropertyOptional({
    description: "Parcel name",
    example: "Parcelle Nord",
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: "Parcel description",
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: "Area in hectares",
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  area?: number;

  @ApiPropertyOptional({
    description: "Area unit",
  })
  @IsOptional()
  @IsString()
  area_unit?: string;

  @ApiPropertyOptional({
    description: "Crop category",
  })
  @IsOptional()
  @IsString()
  crop_category?: string;

  @ApiPropertyOptional({
    description: "Crop type",
  })
  @IsOptional()
  @IsString()
  crop_type?: string;

  @ApiPropertyOptional({
    description: "Crop variety",
  })
  @IsOptional()
  @IsString()
  variety?: string;

  @ApiPropertyOptional({
    description: "Planting system",
  })
  @IsOptional()
  @IsString()
  planting_system?: string;

  @ApiPropertyOptional({
    description: "Spacing between plants",
  })
  @IsOptional()
  @IsString()
  spacing?: string;

  @ApiPropertyOptional({
    description: "Density per hectare",
  })
  @IsOptional()
  @IsNumber()
  density_per_hectare?: number;

  @ApiPropertyOptional({
    description: "Total plant count",
  })
  @IsOptional()
  @IsInt()
  plant_count?: number;

  @ApiPropertyOptional({
    description: "Planting date",
  })
  @IsOptional()
  @IsDateString()
  planting_date?: string;

  @ApiPropertyOptional({
    description: "Planting year",
  })
  @IsOptional()
  @IsInt()
  planting_year?: number;

  @ApiPropertyOptional({
    description: "Planting type",
  })
  @IsOptional()
  @IsString()
  planting_type?: string;

  @ApiPropertyOptional({
    description: "Rootstock (for trees)",
  })
  @IsOptional()
  @IsString()
  rootstock?: string;

  @ApiPropertyOptional({
    description: "Soil type",
  })
  @IsOptional()
  @IsString()
  soil_type?: string;

  @ApiPropertyOptional({
    description: "Irrigation type",
  })
  @IsOptional()
  @IsString()
  irrigation_type?: string;

  @ApiPropertyOptional({ description: "Water source" })
  @IsOptional()
  @IsString()
  water_source?: string;

  @ApiPropertyOptional({ description: "Irrigation frequency" })
  @IsOptional()
  @IsString()
  irrigation_frequency?: string;

  @ApiPropertyOptional({ description: "Water quantity per irrigation session" })
  @IsOptional()
  @IsNumber()
  water_quantity_per_session?: number;

  @ApiPropertyOptional({ description: "Water quantity unit" })
  @IsOptional()
  @IsString()
  water_quantity_unit?: string;

  @ApiPropertyOptional({
    description:
      "Parcel boundary coordinates (array of [longitude, latitude] pairs)",
    example: [
      [-759185.3554873749, 4028238.0941472454],
      [-759185.3554873749, 4028195.435298061],
      [-759167.0127388571, 4028195.4248612197],
      [-759167.2092993675, 4028239.087386639],
      [-759185.3554873749, 4028238.0941472454],
    ],
  })
  @IsOptional()
  boundary?: number[][];

  @ApiPropertyOptional({
    description: "Calculated area from boundary",
  })
  @IsOptional()
  @IsNumber()
  calculated_area?: number;

  @ApiPropertyOptional({
    description: "Perimeter of the parcel",
  })
  @IsOptional()
  @IsNumber()
  perimeter?: number;
}
