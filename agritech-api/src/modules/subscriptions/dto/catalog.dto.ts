import { ApiProperty } from '@nestjs/swagger';
import { BillingCycle, SubscriptionFormula } from '../subscription-domain';

export class SubscriptionFormulaCatalogItemDto {
  @ApiProperty({ enum: SubscriptionFormula })
  formula: SubscriptionFormula;

  @ApiProperty({ nullable: true })
  minHectaresExclusive: number | null;

  @ApiProperty({ nullable: true })
  maxHectaresInclusive: number | null;

  @ApiProperty({ nullable: true })
  includedUsers: number | null;

  @ApiProperty()
  supportLevel: string;

  @ApiProperty()
  slaAvailable: boolean;

  @ApiProperty()
  agromindIaLevel: string;

  @ApiProperty()
  marketplaceMode: string;
}

export class SubscriptionCatalogResponseDto {
  @ApiProperty({ enum: BillingCycle, isArray: true })
  billingCycles: BillingCycle[];

  @ApiProperty({ type: SubscriptionFormulaCatalogItemDto, isArray: true })
  formulas: SubscriptionFormulaCatalogItemDto[];

  @ApiProperty()
  currency: string;

  @ApiProperty()
  vatRate: number;
}
