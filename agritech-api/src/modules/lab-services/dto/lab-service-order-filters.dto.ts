import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID, IsEnum } from 'class-validator';

export enum OrderStatus {
  PENDING = 'pending',
  SAMPLE_COLLECTED = 'sample_collected',
  SENT_TO_LAB = 'sent_to_lab',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum ServiceCategory {
  SOIL = 'soil',
  LEAF = 'leaf',
  WATER = 'water',
  TISSUE = 'tissue',
  OTHER = 'other',
}

export class LabServiceOrderFiltersDto {
  @ApiPropertyOptional({ description: 'Filter by farm ID' })
  @IsOptional()
  @IsUUID()
  farmId?: string;

  @ApiPropertyOptional({ description: 'Filter by parcel ID' })
  @IsOptional()
  @IsUUID()
  parcelId?: string;

  @ApiPropertyOptional({ enum: OrderStatus, description: 'Filter by order status' })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;
}
