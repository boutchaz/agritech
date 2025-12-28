import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID, IsString, IsOptional, IsNumber, IsEnum, Min, Max } from 'class-validator';

export enum RecommendationStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export class CreateRecommendationDto {
  @ApiProperty({ description: 'Analysis ID this recommendation belongs to' })
  @IsNotEmpty()
  @IsUUID()
  analysis_id: string;

  @ApiProperty({ description: 'Recommendation title' })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Detailed description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Category (fertilization, irrigation, pest_control, etc.)' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Priority (1-5, 5 being highest)', minimum: 1, maximum: 5 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  priority?: number;

  @ApiPropertyOptional({ enum: RecommendationStatus, default: RecommendationStatus.PENDING })
  @IsOptional()
  @IsEnum(RecommendationStatus)
  status?: RecommendationStatus;
}
