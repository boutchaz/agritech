import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsUUID,
  IsString,
  IsOptional,
  IsEnum,
  ValidateIf,
} from 'class-validator';

export class MakeReceptionDecisionDto {
  @ApiProperty({
    description: 'Reception decision',
    enum: ['direct_sale', 'storage', 'transformation', 'rejected']
  })
  @IsEnum(['direct_sale', 'storage', 'transformation', 'rejected'])
  decision: 'direct_sale' | 'storage' | 'transformation' | 'rejected';

  @ApiPropertyOptional({ description: 'Decision notes/reasoning' })
  @IsOptional()
  @IsString()
  decision_notes?: string;

  @ApiPropertyOptional({ description: 'Destination warehouse ID (for storage)' })
  @IsOptional()
  @ValidateIf(o => o.decision === 'storage')
  @IsUUID()
  destination_warehouse_id?: string;

  @ApiPropertyOptional({ description: 'Sales order ID (for direct sale)' })
  @IsOptional()
  @ValidateIf(o => o.decision === 'direct_sale')
  @IsUUID()
  sales_order_id?: string;

  @ApiPropertyOptional({ description: 'Transformation order ID (for transformation)' })
  @IsOptional()
  @ValidateIf(o => o.decision === 'transformation')
  @IsUUID()
  transformation_order_id?: string;

  @ApiPropertyOptional({ description: 'Stock entry ID (created after decision)' })
  @IsOptional()
  @IsUUID()
  stock_entry_id?: string;
}
