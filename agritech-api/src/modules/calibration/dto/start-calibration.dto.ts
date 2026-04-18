import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsOptional,
  IsString,
  IsNumber,
  IsInt,
  IsBoolean,
  IsArray,
  ValidateNested,
  Min,
} from "class-validator";
import { Type } from "class-transformer";

class StressEventDto {
  @IsString()
  type: string;

  @IsOptional()
  @IsInt()
  year?: number;

  @IsOptional()
  @IsString()
  description?: string;
}

export class StartCalibrationDto {
  @ApiPropertyOptional({
    description: "Calibration mode: full (initial), partial (block update), annual (post-campaign)",
  })
  @IsOptional()
  @IsString()
  mode_calibrage?: "full" | "partial" | "annual";

  @ApiPropertyOptional({ description: "Partial recalibration motif" })
  @IsOptional()
  @IsString()
  recalibration_motif?: string;

  @ApiPropertyOptional({
    description: "Annual: expected trigger reason (harvest_completed, date_reached, manual)",
  })
  @IsOptional()
  @IsString()
  annual_trigger_reason?: string;

  @ApiPropertyOptional({
    description: "Annual: actual seasonal yield entered by user",
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  annual_actual_yield?: number;

  @ApiPropertyOptional({
    description: "Annual: unit for actual seasonal yield (kg, tons, etc.)",
  })
  @IsOptional()
  @IsString()
  annual_actual_yield_unit?: string;

  @ApiPropertyOptional({
    description: "Annual: user acknowledges unresolved seasonal tasks",
  })
  @IsOptional()
  @IsBoolean()
  annual_missing_tasks_acknowledged?: boolean;

  @ApiPropertyOptional({
    description: "Annual: optional notes about campaign review before validation",
  })
  @IsOptional()
  @IsString()
  annual_campaign_notes?: string;

  @ApiPropertyOptional({ description: "Partial: free text for motif=other" })
  @IsOptional()
  @IsString()
  recalibration_motif_detail?: string;

  // Step 1: Plantation Complements
  @ApiPropertyOptional({
    description: "Real tree count (overrides auto-estimated)",
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  real_tree_count?: number;

  @ApiPropertyOptional({ description: 'Real spacing (e.g. "6x6")' })
  @IsOptional()
  @IsString()
  real_spacing?: string;

  @ApiPropertyOptional({
    description: "Water source key: well, dam, canal, municipal, mixed, other",
  })
  @IsOptional()
  @IsString()
  water_source?: string;

  @ApiPropertyOptional({
    description: "Has the water source changed recently?",
  })
  @IsOptional()
  @IsBoolean()
  water_source_changed?: boolean;

  @ApiPropertyOptional({
    description: "Date when water source changed (ISO string)",
  })
  @IsOptional()
  @IsString()
  water_source_change_date?: string;

  @ApiPropertyOptional({
    description: "Previous water source before the change",
  })
  @IsOptional()
  @IsString()
  previous_water_source?: string;

  // Step 2: Irrigation History
  @ApiPropertyOptional({
    description:
      "Irrigation frequency key: daily, 2_3_per_week, weekly, biweekly, monthly, other",
  })
  @IsOptional()
  @IsString()
  irrigation_frequency?: string;

  @ApiPropertyOptional({
    description: "Volume per tree per irrigation (liters)",
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  volume_per_tree_liters?: number;

  @ApiPropertyOptional({
    description: "Has the irrigation regime changed recently?",
  })
  @IsOptional()
  @IsBoolean()
  irrigation_regime_changed?: boolean;

  @ApiPropertyOptional({
    description: "Date when irrigation regime changed (ISO string)",
  })
  @IsOptional()
  @IsString()
  irrigation_change_date?: string;

  @ApiPropertyOptional({ description: "Previous irrigation frequency" })
  @IsOptional()
  @IsString()
  previous_irrigation_frequency?: string;

  @ApiPropertyOptional({ description: "Previous volume per tree (liters)" })
  @IsOptional()
  @IsNumber()
  previous_volume_per_tree_liters?: number;

  // Step 6: Harvest regularity
  @ApiPropertyOptional({
    description:
      "Perceived harvest regularity key: stable, marked_alternance, very_irregular",
  })
  @IsOptional()
  @IsString()
  harvest_regularity?: string;

  // Step 7: Cultural History
  @ApiPropertyOptional({
    description:
      "Pruning type key: formation, production, rejuvenation, sanitary, mixed",
  })
  @IsOptional()
  @IsString()
  pruning_type?: string;

  @ApiPropertyOptional({ description: "Last pruning date (ISO string)" })
  @IsOptional()
  @IsString()
  last_pruning_date?: string;

  @ApiPropertyOptional({
    description:
      "Pruning intensity: light (<15%), medium (15-25%), heavy (>25%)",
  })
  @IsOptional()
  @IsString()
  pruning_intensity?: string;

  @ApiPropertyOptional({
    description: "Past fertilization key: yes, no, partial",
  })
  @IsOptional()
  @IsString()
  past_fertilization?: string;

  @ApiPropertyOptional({
    description: "Fertilization type: organic, mineral, both, unknown",
  })
  @IsOptional()
  @IsString()
  fertilization_type?: string;

  @ApiPropertyOptional({
    description: "Biostimulants used key: yes, no, unknown",
  })
  @IsOptional()
  @IsString()
  biostimulants_used?: string;

  @ApiPropertyOptional({ description: "Major stress events" })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StressEventDto)
  stress_events?: StressEventDto[];

  @ApiPropertyOptional({
    description: "Free-form observations from user or technician",
  })
  @IsOptional()
  @IsString()
  observations?: string;
}
