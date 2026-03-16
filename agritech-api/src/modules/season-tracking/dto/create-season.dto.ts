import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class CreateSeasonDto {
  @ApiProperty({ description: "Season identifier, e.g. 2025-2026" })
  @IsString()
  saison: string;
}
