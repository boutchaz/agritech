import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID, IsString, IsOptional, IsNumber, IsEnum, IsDateString } from 'class-validator';

export enum RecommendationPriority {
  LOW = 1,
  MEDIUM = 2,
  HIGH = 3,
  CRITICAL = 4,
}

export enum RecommendationStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export class CreateLabRecommendationDto {
  @ApiProperty({ description: 'Order ID this recommendation is based on' })
  @IsNotEmpty()
  @IsUUID()
  order_id: string;

  @ApiPropertyOptional({ description: 'Parcel ID for this recommendation' })
  @IsOptional()
  @IsUUID()
  parcel_id?: string;

  @ApiProperty({ description: 'Recommendation title' })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Detailed recommendation description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Category (fertilization, irrigation, pest_control, etc.)' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ enum: [1, 2, 3, 4], description: 'Priority level (1=low, 4=critical)' })
  @IsOptional()
  @IsNumber()
  priority?: number;

  @ApiPropertyOptional({ enum: RecommendationStatus, default: RecommendationStatus.PENDING })
  @IsOptional()
  @IsEnum(RecommendationStatus)
  status?: RecommendationStatus;

  @ApiPropertyOptional({ description: 'Target date for implementation' })
  @IsOptional()
  @IsDateString()
  target_date?: string;

  @ApiPropertyOptional({ description: 'Estimated cost' })
  @IsOptional()
  @IsNumber()
  estimated_cost?: number;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
