import { IsOptional, IsEnum, IsString, IsDateString, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class QuoteFiltersDto {
  @ApiProperty({
    description: 'Quote status filter',
    enum: ['draft', 'sent', 'accepted', 'rejected', 'expired', 'converted', 'cancelled'],
    required: false
  })
  @IsEnum(['draft', 'sent', 'accepted', 'rejected', 'expired', 'converted', 'cancelled'])
  @IsOptional()
  status?: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'converted' | 'cancelled';

  @ApiProperty({ description: 'Customer ID filter', required: false })
  @IsString()
  @IsOptional()
  customer_id?: string;

  @ApiProperty({ description: 'Customer name search', required: false })
  @IsString()
  @IsOptional()
  customer_name?: string;

  @ApiProperty({ description: 'Quote number search', required: false })
  @IsString()
  @IsOptional()
  quote_number?: string;

  @ApiProperty({ description: 'Start date for quote_date range filter', example: '2024-01-01', required: false })
  @IsDateString()
  @IsOptional()
  date_from?: string;

  @ApiProperty({ description: 'End date for quote_date range filter', example: '2024-12-31', required: false })
  @IsDateString()
  @IsOptional()
  date_to?: string;

  @ApiProperty({ description: 'Page number for pagination', example: 1, required: false })
  @IsNumber()
  @IsOptional()
  page?: number;

  @ApiProperty({ description: 'Number of items per page', example: 50, required: false })
  @IsNumber()
  @IsOptional()
  limit?: number;
}
