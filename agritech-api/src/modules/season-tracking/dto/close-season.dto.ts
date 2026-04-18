import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsOptional, IsNumber, IsArray, Min } from "class-validator";

export class CloseSeasonDto {
  @ApiPropertyOptional({ description: "Actual yield in T/ha" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  rendement_reel_t_ha?: number;

  @ApiPropertyOptional({ description: "Actual yield in kg/tree" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  rendement_reel_kg_arbre?: number;

  @ApiPropertyOptional({ description: "Harvest quality key" })
  @IsOptional()
  @IsString()
  qualite_recolte?: string;

  @ApiPropertyOptional({
    description:
      "Perceived regularity key: stable, marked_alternance, very_irregular",
  })
  @IsOptional()
  @IsString()
  regularite_percue?: string;

  @ApiPropertyOptional({ description: "Season review notes" })
  @IsOptional()
  @IsString()
  bilan_campagne?: string;

  @ApiPropertyOptional({ description: "Applications performed during season" })
  @IsOptional()
  @IsArray()
  applications?: Record<string, unknown>[];

  @ApiPropertyOptional({ description: "Notable events during season" })
  @IsOptional()
  @IsArray()
  evenements?: Record<string, unknown>[];
}
