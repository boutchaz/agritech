import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

class MissingTaskResolutionDto {
  @ApiProperty({ description: "Task identifier" })
  @IsString()
  task_id: string;

  @ApiProperty({
    description: "Resolution applied during the annual review",
    enum: ["completed", "not_done", "unconfirmed"],
  })
  @IsString()
  @IsIn(["completed", "not_done", "unconfirmed"])
  resolution: "completed" | "not_done" | "unconfirmed";

  @ApiPropertyOptional({
    description: "Execution date when the task was completed (YYYY-MM-DD)",
  })
  @IsOptional()
  @IsString()
  execution_date?: string;

  @ApiPropertyOptional({ description: "Optional review notes" })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ResolveAnnualMissingTasksDto {
  @ApiProperty({
    description: "Reviewed missing task resolutions to persist before annual recalibration",
    type: [MissingTaskResolutionDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MissingTaskResolutionDto)
  resolutions: MissingTaskResolutionDto[];
}
