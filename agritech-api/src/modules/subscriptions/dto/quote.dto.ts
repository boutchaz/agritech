import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { BillingCycle, SubscriptionFormula } from '../subscription-domain';
import {
  ModularHaPriceBreakdownItem,
  ModularQuoteBreakdown,
} from '../subscription-pricing.service';

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

export class CreateModularQuoteDto {
  @ApiProperty({ type: String, isArray: true })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  selectedModules: string[];

  @ApiProperty({ example: 150 })
  @IsNumber()
  @Min(1)
  contractedHectares: number;

  @ApiProperty({ enum: BillingCycle, example: BillingCycle.MONTHLY })
  @IsEnum(BillingCycle)
  billingCycle: BillingCycle;

  @ApiPropertyOptional({ example: 10, description: 'Optional discount in percent (0-100)' })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  discountPercent?: number;
}

export class ModularHaPriceBreakdownItemDto implements ModularHaPriceBreakdownItem {
  @ApiProperty()
  tier: string;

  @ApiProperty()
  ha: number;

  @ApiProperty()
  pricePerHa: number;

  @ApiProperty()
  subtotal: number;
}

export class ModularQuoteResponseDto implements ModularQuoteBreakdown {
  @ApiProperty({ type: String, isArray: true })
  selectedModules: string[];

  @ApiProperty()
  erpMonthly: number;

  @ApiProperty()
  sizeMultiplier: number;

  @ApiProperty()
  haAnnual: number;

  @ApiProperty({ type: () => ModularHaPriceBreakdownItemDto, isArray: true })
  haPriceBreakdown: ModularHaPriceBreakdownItemDto[];

  @ApiProperty()
  annualSubtotalHt: number;

  @ApiProperty()
  discountPercent: number;

  @ApiProperty()
  discountAmountHt: number;

  @ApiProperty()
  annualAmountHt: number;

  @ApiProperty({ enum: BillingCycle })
  billingCycle: BillingCycle;

  @ApiProperty()
  installmentCountPerYear: number;

  @ApiProperty()
  cycleAmountHt: number;

  @ApiProperty()
  vatRate: number;

  @ApiProperty()
  cycleAmountTva: number;

  @ApiProperty()
  cycleAmountTtc: number;

  @ApiProperty()
  currency: string;
}
