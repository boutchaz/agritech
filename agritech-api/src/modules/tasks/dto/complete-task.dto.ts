import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsNumber, IsString, Min, Max } from 'class-validator';

export class CompleteTaskDto {
  @ApiPropertyOptional({ description: 'Quality rating (1-5)' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  quality_rating?: number;

  @ApiPropertyOptional({ description: 'Actual cost' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  actual_cost?: number;

  @ApiPropertyOptional({ description: 'Completion notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
