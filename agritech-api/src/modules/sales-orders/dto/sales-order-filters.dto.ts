import { IsOptional, IsString, IsDateString, IsUUID, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum SalesOrderStatus {
  DRAFT = 'draft',
  CONFIRMED = 'confirmed',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
}

export class SalesOrderFiltersDto {
  @ApiPropertyOptional({ description: 'Filter by order status', enum: SalesOrderStatus })
  @IsEnum(SalesOrderStatus)
  @IsOptional()
  status?: SalesOrderStatus;

  @ApiPropertyOptional({ description: 'Filter by customer ID', format: 'uuid' })
  @IsUUID()
  @IsOptional()
  customer_id?: string;

  @ApiPropertyOptional({ description: 'Search by customer name' })
  @IsString()
  @IsOptional()
  customer_name?: string;

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

  @ApiPropertyOptional({ description: 'Filter by stock issued status' })
  @IsString()
  @IsOptional()
  stock_issued?: string; // Will be converted to boolean

  @ApiPropertyOptional({ description: 'Page number for pagination', example: 1 })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', example: 20 })
  @IsOptional()
  limit?: number;
}
