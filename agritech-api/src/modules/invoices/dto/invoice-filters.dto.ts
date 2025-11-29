import { IsOptional, IsEnum, IsString, IsDateString, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class InvoiceFiltersDto {
  @ApiProperty({ description: 'Invoice type filter', enum: ['sales', 'purchase'], required: false })
  @IsEnum(['sales', 'purchase'])
  @IsOptional()
  invoice_type?: 'sales' | 'purchase';

  @ApiProperty({ description: 'Invoice status filter', enum: ['draft', 'submitted', 'paid', 'partially_paid', 'overdue', 'cancelled'], required: false })
  @IsEnum(['draft', 'submitted', 'paid', 'partially_paid', 'overdue', 'cancelled'])
  @IsOptional()
  status?: 'draft' | 'submitted' | 'paid' | 'partially_paid' | 'overdue' | 'cancelled';

  @ApiProperty({ description: 'Party (Customer/Supplier) ID filter', required: false })
  @IsString()
  @IsOptional()
  party_id?: string;

  @ApiProperty({ description: 'Party name search', required: false })
  @IsString()
  @IsOptional()
  party_name?: string;

  @ApiProperty({ description: 'Invoice number search', required: false })
  @IsString()
  @IsOptional()
  invoice_number?: string;

  @ApiProperty({ description: 'Start date for invoice_date range filter', example: '2024-01-01', required: false })
  @IsDateString()
  @IsOptional()
  date_from?: string;

  @ApiProperty({ description: 'End date for invoice_date range filter', example: '2024-12-31', required: false })
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
