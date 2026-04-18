import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsOptional, IsBoolean, IsDateString } from "class-validator";

export class CreateParcelEventDto {
  @ApiProperty({
    description:
      "Event type key: new_water_source, soil_analysis, water_analysis, severe_pruning, removal, disease, frost, drought, other",
  })
  @IsString()
  type: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  date_evenement?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  donnees?: Record<string, unknown>;

  @ApiPropertyOptional({
    description:
      "Whether this event should trigger a partial (F2) recalibration",
  })
  @IsOptional()
  @IsBoolean()
  recalibrage_requis?: boolean;
}
