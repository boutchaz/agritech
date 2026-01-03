import { IsOptional, IsEnum, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginatedQueryDto } from '../../../common/dto/paginated-query.dto';

export class QuoteFiltersDto extends PaginatedQueryDto {
  @ApiPropertyOptional({
    description: 'Quote status filter',
    enum: ['draft', 'sent', 'accepted', 'rejected', 'expired', 'converted', 'cancelled']
  })
  @IsEnum(['draft', 'sent', 'accepted', 'rejected', 'expired', 'converted', 'cancelled'])
  @IsOptional()
  status?: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'converted' | 'cancelled';

  @ApiPropertyOptional({ description: 'Customer ID filter' })
  @IsString()
  @IsOptional()
  customer_id?: string;
}
