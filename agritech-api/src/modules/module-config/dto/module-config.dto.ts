import { ApiProperty } from '@nestjs/swagger';

export class ModuleConfigDto {
  @ApiProperty({ description: 'Module UUID' })
  id: string;

  @ApiProperty({ description: 'Module slug identifier', example: 'farm_management' })
  slug: string;

  @ApiProperty({ description: 'Lucide icon name', example: 'MapPin' })
  icon: string;

  @ApiProperty({ description: 'Tailwind color name', example: 'emerald' })
  color: string;

  @ApiProperty({ description: 'Module category', example: 'core' })
  category: string;

  @ApiProperty({ description: 'Display order for sorting' })
  displayOrder: number;

  @ApiProperty({ description: 'Monthly price in USD' })
  priceMonthly: number;

  @ApiProperty({ description: 'Whether this module is required (cannot be deselected)' })
  isRequired: boolean;

  @ApiProperty({ description: 'Whether this module is recommended for new users' })
  isRecommended: boolean;

  @ApiProperty({ description: 'Whether this module can be purchased as addon' })
  isAddonEligible: boolean;

  @ApiProperty({ description: 'Whether this module is currently available' })
  isAvailable: boolean;

  @ApiProperty({
    description:
      'Minimum formula required (starter, standard, premium, enterprise). Legacy aliases may still appear during migration.',
    required: false,
    enum: [
      'starter',
      'standard',
      'premium',
      'enterprise',
      'essential',
      'professional',
      null,
    ],
  })
  requiredPlan?: string | null;

  @ApiProperty({ description: 'Widget IDs this module enables on dashboard', type: [String] })
  dashboardWidgets: string[];

  @ApiProperty({ description: 'Navigation paths this module enables', type: [String] })
  navigationItems: string[];

  @ApiProperty({ description: 'Translated module name' })
  name: string;

  @ApiProperty({ description: 'Translated module description' })
  description: string;

  @ApiProperty({ description: 'Translated feature list', type: [String] })
  features: string[];
}

export class SubscriptionPricingDto {
  @ApiProperty({ description: 'Base subscription price per month' })
  basePriceMonthly: number;

  @ApiProperty({ description: 'Number of trial days' })
  trialDays: number;

  @ApiProperty({ description: 'Price per additional addon slot' })
  addonSlotPrice: number;
}

export class ModuleConfigResponseDto {
  @ApiProperty({ description: 'List of available modules', type: [ModuleConfigDto] })
  modules: ModuleConfigDto[];

  @ApiProperty({ description: 'Subscription pricing configuration' })
  pricing: SubscriptionPricingDto;

  @ApiProperty({ description: 'Widget to module mapping for quick lookups' })
  widgetToModuleMap: Record<string, string>;
}

export class CalculatePriceRequestDto {
  @ApiProperty({ description: 'Array of module slugs to calculate price for', type: [String] })
  moduleSlugs: string[];
}

export class CalculatePriceResponseDto {
  @ApiProperty({ description: 'Base subscription price' })
  basePrice: number;

  @ApiProperty({ description: 'Total price of selected modules' })
  modulesPrice: number;

  @ApiProperty({ description: 'Total monthly price' })
  totalPrice: number;

  @ApiProperty({ description: 'Breakdown of module prices' })
  breakdown: { slug: string; name: string; price: number }[];
}
