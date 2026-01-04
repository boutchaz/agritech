import { IsOptional, IsString, IsUUID, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginatedQueryDto } from '../../../common/dto/paginated-query.dto';

export enum PurchaseOrderStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  CONFIRMED = 'confirmed',
  RECEIVING = 'receiving',
  RECEIVED = 'received',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
}

export class PurchaseOrderFiltersDto extends PaginatedQueryDto {
  @ApiPropertyOptional({ description: 'Filter by order status', enum: PurchaseOrderStatus })
  @IsEnum(PurchaseOrderStatus)
  @IsOptional()
  status?: PurchaseOrderStatus;

  @ApiPropertyOptional({ description: 'Filter by supplier ID', format: 'uuid' })
  @IsUUID()
  @IsOptional()
  supplier_id?: string;

  @ApiPropertyOptional({ description: 'Filter by supplier name (partial match)' })
  @IsString()
  @IsOptional()
  supplier_name?: string;

  @ApiPropertyOptional({ description: 'Filter by order number' })
  @IsString()
  @IsOptional()
  order_number?: string;

  @ApiPropertyOptional({ description: 'Filter by stock received status' })
  @IsString()
  @IsOptional()
  stock_received?: string;
}
