import { IsOptional, IsEnum, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginatedQueryDto } from '../../../common/dto/paginated-query.dto';

export class InvoiceFiltersDto extends PaginatedQueryDto {
  @ApiPropertyOptional({ description: 'Invoice type filter', enum: ['sales', 'purchase'] })
  @IsEnum(['sales', 'purchase'])
  @IsOptional()
  invoice_type?: 'sales' | 'purchase';

  @ApiPropertyOptional({ description: 'Invoice status filter', enum: ['draft', 'submitted', 'paid', 'partially_paid', 'overdue', 'cancelled'] })
  @IsEnum(['draft', 'submitted', 'paid', 'partially_paid', 'overdue', 'cancelled'])
  @IsOptional()
  status?: 'draft' | 'submitted' | 'paid' | 'partially_paid' | 'overdue' | 'cancelled';

  @ApiPropertyOptional({ description: 'Party (Customer/Supplier) ID filter' })
  @IsString()
  @IsOptional()
  party_id?: string;

  @ApiPropertyOptional({ description: 'Party name filter (partial match)' })
  @IsString()
  @IsOptional()
  party_name?: string;

  @ApiPropertyOptional({ description: 'Invoice number filter' })
  @IsString()
  @IsOptional()
  invoice_number?: string;

  @ApiPropertyOptional({ description: 'Farm ID filter' })
  @IsString()
  @IsOptional()
  farm_id?: string;

  @ApiPropertyOptional({ description: 'Parcel ID filter' })
  @IsString()
  @IsOptional()
  parcel_id?: string;
}
