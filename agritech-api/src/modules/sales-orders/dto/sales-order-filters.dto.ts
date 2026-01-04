import { IsOptional, IsString, IsUUID, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginatedQueryDto } from '../../../common/dto/paginated-query.dto';

export enum SalesOrderStatus {
  DRAFT = 'draft',
  CONFIRMED = 'confirmed',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
}

export class SalesOrderFiltersDto extends PaginatedQueryDto {
  @ApiPropertyOptional({ description: 'Filter by order status', enum: SalesOrderStatus })
  @IsEnum(SalesOrderStatus)
  @IsOptional()
  status?: SalesOrderStatus;

  @ApiPropertyOptional({ description: 'Filter by customer ID', format: 'uuid' })
  @IsUUID()
  @IsOptional()
  customer_id?: string;

  @ApiPropertyOptional({ description: 'Filter by customer name (partial match)' })
  @IsString()
  @IsOptional()
  customer_name?: string;

  @ApiPropertyOptional({ description: 'Filter by order number' })
  @IsString()
  @IsOptional()
  order_number?: string;

  @ApiPropertyOptional({ description: 'Filter by stock issued status' })
  @IsString()
  @IsOptional()
  stock_issued?: string;
}
