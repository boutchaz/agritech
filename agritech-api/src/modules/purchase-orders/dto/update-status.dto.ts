import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PurchaseOrderStatus } from './purchase-order-filters.dto';

export class UpdateStatusDto {
  @ApiProperty({ description: 'New order status', enum: PurchaseOrderStatus })
  @IsEnum(PurchaseOrderStatus)
  status: PurchaseOrderStatus;

  @ApiPropertyOptional({ description: 'Optional notes about status change' })
  @IsString()
  @IsOptional()
  notes?: string;
}
