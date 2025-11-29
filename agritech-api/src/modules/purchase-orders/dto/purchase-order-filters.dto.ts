import { IsOptional, IsString, IsDateString, IsUUID, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum PurchaseOrderStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  CONFIRMED = 'confirmed',
  RECEIVING = 'receiving',
  RECEIVED = 'received',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
}

export class PurchaseOrderFiltersDto {
  @ApiPropertyOptional({ description: 'Filter by order status', enum: PurchaseOrderStatus })
  @IsEnum(PurchaseOrderStatus)
  @IsOptional()
  status?: PurchaseOrderStatus;

  @ApiPropertyOptional({ description: 'Filter by supplier ID', format: 'uuid' })
  @IsUUID()
  @IsOptional()
  supplier_id?: string;

  @ApiPropertyOptional({ description: 'Search by supplier name' })
  @IsString()
  @IsOptional()
  supplier_name?: string;

  @ApiPropertyOptional({ description: 'Search by order number' })
  @IsString()
  @IsOptional()
  order_number?: string;

  @ApiPropertyOptional({ description: 'Filter by start date', example: '2024-01-01' })
  @IsDateString()
  @IsOptional()
  date_from?: string;

  @ApiPropertyOptional({ description: 'Filter by end date', example: '2024-12-31' })
  @IsDateString()
  @IsOptional()
  date_to?: string;

  @ApiPropertyOptional({ description: 'Filter by stock received status' })
  @IsString()
  @IsOptional()
  stock_received?: string; // Will be converted to boolean

  @ApiPropertyOptional({ description: 'Page number for pagination', example: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', example: 20 })
  @IsOptional()
  limit?: number;
}
