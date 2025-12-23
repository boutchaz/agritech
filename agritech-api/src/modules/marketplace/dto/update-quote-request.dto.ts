import { IsString, IsOptional, IsNumber, IsIn, Min } from 'class-validator';

export class UpdateQuoteRequestDto {
  @IsString()
  @IsOptional()
  @IsIn(['pending', 'viewed', 'responded', 'quoted', 'accepted', 'declined', 'cancelled'])
  status?: string;

  @IsString()
  @IsOptional()
  seller_response?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  quoted_price?: number;

  @IsString()
  @IsOptional()
  quoted_currency?: string;

  @IsString()
  @IsOptional()
  quote_valid_until?: string;
}
