import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsInt, IsOptional, Min } from "class-validator";

export class AnnualSnoozeDto {
  @ApiPropertyOptional({
    description: "Number of days to snooze the annual recalibration reminder",
    default: 7,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  days?: number;
}
