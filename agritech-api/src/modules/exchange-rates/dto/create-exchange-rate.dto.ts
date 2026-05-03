import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, Length, IsDateString, IsNumber, IsOptional, Min } from 'class-validator';

export class CreateExchangeRateDto {
  @ApiProperty({ example: '2026-05-01' })
  @IsDateString()
  rate_date!: string;

  @ApiProperty({ example: 'EUR' })
  @IsString()
  @Length(3, 3)
  from_currency!: string;

  @ApiProperty({ example: 'MAD' })
  @IsString()
  @Length(3, 3)
  to_currency!: string;

  @ApiProperty({ example: 10.85 })
  @IsNumber()
  @Min(0.00000001)
  rate!: number;

  @ApiPropertyOptional({ example: 'manual' })
  @IsOptional()
  @IsString()
  source?: string;
}
