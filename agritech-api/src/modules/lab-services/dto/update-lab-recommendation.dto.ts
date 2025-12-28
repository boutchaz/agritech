import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID, IsString, IsNumber, IsEnum, IsDateString } from 'class-validator';
import { RecommendationStatus } from './create-lab-recommendation.dto';

export class UpdateLabRecommendationDto {
  @ApiPropertyOptional({ description: 'Recommendation title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Detailed recommendation description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Category' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Priority level (1=low, 4=critical)' })
  @IsOptional()
  @IsNumber()
  priority?: number;

  @ApiPropertyOptional({ enum: RecommendationStatus })
  @IsOptional()
  @IsEnum(RecommendationStatus)
  status?: RecommendationStatus;

  @ApiPropertyOptional({ description: 'Target date for implementation' })
  @IsOptional()
  @IsDateString()
  target_date?: string;

  @ApiPropertyOptional({ description: 'Implementation date' })
  @IsOptional()
  @IsDateString()
  implemented_date?: string;

  @ApiPropertyOptional({ description: 'User who implemented' })
  @IsOptional()
  @IsUUID()
  implemented_by?: string;

  @ApiPropertyOptional({ description: 'Estimated cost' })
  @IsOptional()
  @IsNumber()
  estimated_cost?: number;

  @ApiPropertyOptional({ description: 'Actual cost' })
  @IsOptional()
  @IsNumber()
  actual_cost?: number;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
