import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsOptional,
  IsNumber,
  IsString,
  IsArray,
  IsUUID,
  Min,
  Max,
  ValidateNested,
} from "class-validator";
import { ConsumedItemDto } from "./consumed-item.dto";

export class CompleteTaskDto {
  @ApiPropertyOptional({ description: "Quality rating (1-5)" })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  quality_rating?: number;

  @ApiPropertyOptional({ description: "Actual cost" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  actual_cost?: number;

  @ApiPropertyOptional({ description: "Completion notes" })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    description:
      "Items/products consumed during task execution (overrides planned_items if provided)",
    type: [ConsumedItemDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConsumedItemDto)
  consumed_items?: ConsumedItemDto[];

  @ApiPropertyOptional({
    description: "Actual units completed for per-unit payment tasks",
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  units_completed?: number;

  @ApiPropertyOptional({
    description: "Rate per unit (overrides task default if provided)",
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  rate_per_unit?: number;

  @ApiPropertyOptional({
    description: "Work unit ID for piece work",
  })
  @IsOptional()
  @IsUUID()
  work_unit_id?: string;
}
