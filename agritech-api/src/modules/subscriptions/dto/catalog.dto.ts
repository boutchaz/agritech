import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  BillingCycle,
  SubscriptionFormula,
  type ErpModule,
  type HaPriceTier,
  type SizeMultiplierTier,
} from '../subscription-domain';

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

  @ApiPropertyOptional({ type: () => ErpModuleCatalogDto, isArray: true })
  modules?: ErpModuleCatalogDto[];

  @ApiPropertyOptional({ type: () => HaPriceTierCatalogDto, isArray: true })
  haTiers?: HaPriceTierCatalogDto[];

  @ApiPropertyOptional({ type: () => SizeMultiplierCatalogDto, isArray: true })
  sizeMultipliers?: SizeMultiplierCatalogDto[];

  @ApiPropertyOptional()
  defaultDiscount?: number;

  @ApiProperty()
  currency: string;

  @ApiProperty()
  vatRate: number;
}

export class ErpModuleCatalogDto implements ErpModule {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  desc: string;

  @ApiProperty()
  isBase: boolean;

  @ApiProperty()
  pricePerMonth: number;
}

export class HaPriceTierCatalogDto implements HaPriceTier {
  @ApiProperty({ nullable: true })
  maxHa: number | null;

  @ApiProperty()
  label: string;

  @ApiProperty()
  pricePerHaYear: number;
}

export class SizeMultiplierCatalogDto implements SizeMultiplierTier {
  @ApiProperty()
  minHa: number;

  @ApiProperty({ nullable: true })
  maxHa: number | null;

  @ApiProperty()
  multiplier: number;
}
