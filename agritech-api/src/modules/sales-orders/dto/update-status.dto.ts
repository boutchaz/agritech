import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SalesOrderStatus } from './sales-order-filters.dto';

export class UpdateStatusDto {
  @ApiProperty({ description: 'New order status', enum: SalesOrderStatus })
  @IsEnum(SalesOrderStatus)
  status: SalesOrderStatus;

  @ApiPropertyOptional({ description: 'Optional notes about status change' })
  @IsString()
  @IsOptional()
  notes?: string;
}
