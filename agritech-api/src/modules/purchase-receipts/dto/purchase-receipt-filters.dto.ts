import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { PaginatedQueryDto } from '../../../common/dto/paginated-query.dto';
import { PurchaseReceiptStatus } from './purchase-receipt-status.enum';

export class PurchaseReceiptFiltersDto extends PaginatedQueryDto {
  @ApiPropertyOptional({ description: 'Filter by receipt status', enum: PurchaseReceiptStatus })
  @IsEnum(PurchaseReceiptStatus)
  @IsOptional()
  status?: PurchaseReceiptStatus;
}
