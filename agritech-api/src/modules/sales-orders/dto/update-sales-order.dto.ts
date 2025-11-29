import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateSalesOrderDto } from './create-sales-order.dto';

export class UpdateSalesOrderDto extends PartialType(
  OmitType(CreateSalesOrderDto, ['items'] as const),
) {
  // All fields from CreateSalesOrderDto are optional except items
  // Items are updated separately through dedicated endpoints
}
