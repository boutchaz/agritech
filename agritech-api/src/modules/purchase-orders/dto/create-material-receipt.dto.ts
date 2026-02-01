import { IsUUID, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateMaterialReceiptDto {
  @ApiProperty({ description: 'Warehouse ID for receipt' })
  @IsUUID()
  warehouse_id: string;

  @ApiProperty({ description: 'Receipt date (YYYY-MM-DD)' })
  @IsDateString()
  receipt_date: string;
}
