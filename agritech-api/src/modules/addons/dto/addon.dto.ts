import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsUUID, IsOptional, IsBoolean } from 'class-validator';

export class PurchaseAddonDto {
  @ApiProperty({ description: 'Module ID to purchase as addon' })
  @IsUUID()
  module_id: string;

  @ApiPropertyOptional({ description: 'Success redirect URL after checkout' })
  @IsOptional()
  @IsString()
  success_url?: string;

  @ApiPropertyOptional({ description: 'Cancel redirect URL if checkout is abandoned' })
  @IsOptional()
  @IsString()
  cancel_url?: string;
}

export class CancelAddonDto {
  @ApiProperty({ description: 'Module ID of addon to cancel' })
  @IsUUID()
  module_id: string;

  @ApiPropertyOptional({ description: 'Cancel immediately or at period end' })
  @IsOptional()
  @IsBoolean()
  cancel_immediately?: boolean;
}

export class AddonModuleDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  icon?: string;

  @ApiPropertyOptional()
  category?: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional()
  required_plan?: string;

  @ApiProperty()
  is_addon_eligible: boolean;

  @ApiPropertyOptional()
  addon_price_monthly?: number;

  @ApiPropertyOptional()
  addon_product_id?: string;
}

export class OrganizationAddonDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  organization_id: string;

  @ApiProperty()
  module_id: string;

  @ApiProperty()
  module: AddonModuleDto;

  @ApiPropertyOptional()
  polar_subscription_id?: string;

  @ApiProperty()
  status: string;

  @ApiPropertyOptional()
  price_monthly?: number;

  @ApiProperty()
  started_at: string;

  @ApiPropertyOptional()
  current_period_start?: string;

  @ApiPropertyOptional()
  current_period_end?: string;

  @ApiProperty()
  cancel_at_period_end: boolean;

  @ApiPropertyOptional()
  canceled_at?: string;
}

export class AddonSlotsDto {
  @ApiProperty({ description: 'Number of addon slots included with plan' })
  included: number;

  @ApiProperty({ description: 'Number of additional addon slots purchased' })
  additional: number;

  @ApiProperty({ description: 'Total addon slots available' })
  total: number;

  @ApiProperty({ description: 'Number of addon slots currently used' })
  used: number;

  @ApiProperty({ description: 'Number of addon slots remaining' })
  available: number;
}

export class AddonsOverviewDto {
  @ApiProperty({ type: AddonSlotsDto })
  slots: AddonSlotsDto;

  @ApiProperty({ type: [OrganizationAddonDto] })
  active_addons: OrganizationAddonDto[];

  @ApiProperty({ type: [AddonModuleDto] })
  available_addons: AddonModuleDto[];
}

export class CheckoutResponseDto {
  @ApiProperty()
  checkout_url: string;

  @ApiPropertyOptional()
  addon_id?: string;
}
