import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type, Transform } from "class-transformer";
import {
  IsString,
  IsOptional,
  IsUUID,
  IsIn,
  IsNumber,
  IsBoolean,
  IsArray,
  IsDateString,
  Min,
  Max,
  ValidateNested,
} from "class-validator";
import { ConsumedItemDto } from "./consumed-item.dto";

// Custom transform to convert empty strings to null
function EmptyStringToNull() {
  return Transform(({ value }) => (value === "" ? null : value));
}

export class CreateTaskDto {
  @ApiPropertyOptional({
    description: "Task ID (if provided, will update existing task)",
  })
  @IsOptional()
  @IsUUID()
  id?: string;

  @ApiProperty({ description: "Farm ID" })
  @IsUUID()
  farm_id: string;

  @ApiProperty({ description: "Task title" })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: "Task description" })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: "Task type",
    enum: [
      "planting",
      "harvesting",
      "irrigation",
      "fertilization",
      "maintenance",
      "general",
      "pest_control",
      "pruning",
      "soil_preparation",
    ],
  })
  @IsIn([
    "planting",
    "harvesting",
    "irrigation",
    "fertilization",
    "maintenance",
    "general",
    "pest_control",
    "pruning",
    "soil_preparation",
  ])
  task_type: string;

  @ApiPropertyOptional({
    description: "Task priority",
    enum: ["low", "medium", "high", "urgent"],
    default: "medium",
  })
  @IsOptional()
  @IsIn(["low", "medium", "high", "urgent"])
  priority?: string;

  @ApiPropertyOptional({ description: "Category ID" })
  @IsOptional()
  @IsUUID()
  @EmptyStringToNull()
  category_id?: string;

  @ApiPropertyOptional({ description: "Parcel ID" })
  @IsOptional()
  @IsUUID()
  @EmptyStringToNull()
  parcel_id?: string;

  @ApiPropertyOptional({ description: "Crop ID" })
  @IsOptional()
  @IsUUID()
  @EmptyStringToNull()
  crop_id?: string;

  @ApiPropertyOptional({ description: "Worker ID to assign task to" })
  @IsOptional()
  @IsUUID()
  @EmptyStringToNull()
  assigned_to?: string;

  @ApiPropertyOptional({ description: "Scheduled start time (ISO 8601)" })
  @IsOptional()
  @IsDateString()
  scheduled_start?: string;

  @ApiPropertyOptional({ description: "Scheduled end time (ISO 8601)" })
  @IsOptional()
  @IsDateString()
  scheduled_end?: string;

  @ApiPropertyOptional({ description: "Due date (ISO date)" })
  @IsOptional()
  @IsDateString()
  due_date?: string;

  @ApiPropertyOptional({ description: "Estimated duration in hours" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  estimated_duration?: number;

  @ApiPropertyOptional({
    description: "Required skills",
    type: [String],
  })
  @IsOptional()
  @IsArray()
  required_skills?: string[];

  @ApiPropertyOptional({
    description: "Equipment required",
    type: [String],
  })
  @IsOptional()
  @IsArray()
  equipment_required?: string[];

  @ApiPropertyOptional({ description: "Weather dependency", default: false })
  @IsOptional()
  @IsBoolean()
  weather_dependency?: boolean;

  @ApiPropertyOptional({ description: "Cost estimate" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  cost_estimate?: number;

  @ApiPropertyOptional({ description: "Additional notes" })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: "Location latitude" })
  @IsOptional()
  @IsNumber()
  location_lat?: number;

  @ApiPropertyOptional({ description: "Location longitude" })
  @IsOptional()
  @IsNumber()
  location_lng?: number;

  // Work Unit Payment fields (for piece-work tracking)
  @ApiPropertyOptional({
    description: "Payment type",
    enum: ["daily", "per_unit", "monthly", "metayage"],
    default: "daily",
  })
  @IsOptional()
  @IsIn(["daily", "per_unit", "monthly", "metayage"])
  payment_type?: string;

  @ApiPropertyOptional({ description: "Work unit ID for piece-work" })
  @IsOptional()
  @IsUUID()
  @EmptyStringToNull()
  work_unit_id?: string;

  @ApiPropertyOptional({ description: "Estimated units required" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  units_required?: number;

  @ApiPropertyOptional({ description: "Rate per unit (MAD)" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  rate_per_unit?: number;

  @ApiPropertyOptional({
    description:
      "Planned items/products to consume when task is completed (e.g., fertilizers, pesticides)",
    type: [ConsumedItemDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConsumedItemDto)
  planned_items?: ConsumedItemDto[];
}
