import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsUUID,
  IsString,
  IsNumber,
  IsOptional,
  IsDateString,
  Min,
  IsInt,
  IsArray,
  ArrayMinSize,
} from "class-validator";

export class CreateParcelDto {
  @ApiProperty({
    description: "Farm ID that this parcel belongs to",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @IsUUID()
  farm_id: string;

  @ApiPropertyOptional({
    description: "Organization ID (auto-populated from farm if not provided)",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @IsOptional()
  @IsUUID()
  organization_id?: string;

  @ApiProperty({
    description: "Parcel name",
    example: "Parcelle Nord",
  })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: "Parcel description",
    example: "Main wheat field in the north section",
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: "Area in hectares",
    example: 25.5,
  })
  @IsNumber()
  @Min(0)
  area: number;

  @ApiPropertyOptional({
    description: "Area unit",
    example: "hectares",
    default: "hectares",
  })
  @IsOptional()
  @IsString()
  area_unit?: string;

  @ApiPropertyOptional({
    description: "Crop category",
    example: "cereals",
  })
  @IsOptional()
  @IsString()
  crop_category?: string;

  @ApiPropertyOptional({
    description: "Crop type",
    example: "Wheat",
  })
  @IsOptional()
  @IsString()
  crop_type?: string;

  @ApiPropertyOptional({
    description: "Crop variety",
    example: "Hard Red Winter",
  })
  @IsOptional()
  @IsString()
  variety?: string;

  @ApiPropertyOptional({
    description: "Planting system",
    example: "Row planting",
  })
  @IsOptional()
  @IsString()
  planting_system?: string;

  @ApiPropertyOptional({
    description: "Spacing between plants",
    example: "4x1.5",
  })
  @IsOptional()
  @IsString()
  spacing?: string;

  @ApiPropertyOptional({
    description: "Density per hectare",
    example: 1667,
  })
  @IsOptional()
  @IsNumber()
  density_per_hectare?: number;

  @ApiPropertyOptional({
    description: "Total plant count",
    example: 41675,
  })
  @IsOptional()
  @IsInt()
  plant_count?: number;

  @ApiPropertyOptional({
    description: "Planting date",
    example: "2024-03-15",
  })
  @IsOptional()
  @IsDateString()
  planting_date?: string;

  @ApiPropertyOptional({
    description: "Planting year",
    example: 2024,
  })
  @IsOptional()
  @IsInt()
  planting_year?: number;

  @ApiPropertyOptional({
    description: "Planting type",
    example: "traditional",
  })
  @IsOptional()
  @IsString()
  planting_type?: string;

  @ApiPropertyOptional({
    description: "Rootstock (for trees)",
    example: "GF677",
  })
  @IsOptional()
  @IsString()
  rootstock?: string;

  @ApiPropertyOptional({
    description: "Soil type",
    example: "Clay",
  })
  @IsOptional()
  @IsString()
  soil_type?: string;

  @ApiPropertyOptional({
    description: "Irrigation type",
    example: "Drip irrigation",
  })
  @IsOptional()
  @IsString()
  irrigation_type?: string;

  @ApiPropertyOptional({
    description: "Water source key: well, dam, canal, municipal, mixed, other",
    example: "well",
  })
  @IsOptional()
  @IsString()
  water_source?: string;

  @ApiPropertyOptional({
    description:
      "Irrigation frequency key: daily, 2_3_per_week, weekly, biweekly, monthly, other",
    example: "2_3_per_week",
  })
  @IsOptional()
  @IsString()
  irrigation_frequency?: string;

  @ApiPropertyOptional({
    description: "Water quantity per irrigation session",
    example: 50,
  })
  @IsOptional()
  @IsNumber()
  water_quantity_per_session?: number;

  @ApiPropertyOptional({
    description: "Water quantity unit: m3, liters",
    example: "m3",
  })
  @IsOptional()
  @IsString()
  water_quantity_unit?: string;

  @ApiProperty({
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
  @IsArray()
  @ArrayMinSize(3)
  boundary: number[][];

  @ApiPropertyOptional({
    description: "Calculated area from boundary",
    example: 0.05,
  })
  @IsOptional()
  @IsNumber()
  calculated_area?: number;

  @ApiPropertyOptional({
    description: "Perimeter of the parcel",
    example: 100.5,
  })
  @IsOptional()
  @IsNumber()
  perimeter?: number;

  @ApiPropertyOptional({
    description: "Report language key: fr, ar, ber",
    example: "fr",
  })
  @IsOptional()
  @IsString()
  langue?: string;
}
