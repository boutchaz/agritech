import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, Max, Min } from 'class-validator';
import { BillingCycle, SubscriptionFormula } from '../subscription-domain';

export class CreateQuoteDto {
  @ApiProperty({ enum: SubscriptionFormula })
  @IsEnum(SubscriptionFormula)
  formula: SubscriptionFormula;

  @ApiProperty({ example: 150 })
  @IsNumber()
  @Min(1)
  contractedHectares: number;

  @ApiProperty({ enum: BillingCycle, example: BillingCycle.MONTHLY })
  @IsEnum(BillingCycle)
  billingCycle: BillingCycle;

  @ApiPropertyOptional({ example: 5, description: 'Optional discount in percent (0-100)' })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  discountPercent?: number;
}

export class QuoteResponseDto {
  @ApiProperty({ enum: SubscriptionFormula })
  formula: SubscriptionFormula;

  @ApiProperty()
  contractedHectares: number;

  @ApiProperty({ nullable: true })
  includedUsers: number | null;

  @ApiProperty({ enum: BillingCycle })
  billingCycle: BillingCycle;

  @ApiProperty()
  currency: string;

  @ApiProperty()
  vatRate: number;

  @ApiProperty()
  priceHtPerHaYear: number;

  @ApiProperty()
  annualAmountHt: number;

  @ApiProperty()
  cycleAmountHt: number;

  @ApiProperty()
  cycleAmountTva: number;

  @ApiProperty()
  cycleAmountTtc: number;

  @ApiProperty()
  installmentCountPerYear: number;

  @ApiProperty()
  discountPercent: number;
}
