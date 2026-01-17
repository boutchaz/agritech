import { IsString, IsOptional, IsEnum, IsBoolean, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OnboardingStateDto {
  @ApiProperty({ description: 'Current onboarding step (1-5)' })
  @IsNumber()
  @IsOptional()
  currentStep?: number;

  @ApiPropertyOptional({ description: 'Profile data' })
  profileData?: {
    first_name?: string;
    last_name?: string;
    phone?: string;
    timezone?: string;
    language?: string;
  };

  @ApiPropertyOptional({ description: 'Organization data' })
  organizationData?: {
    name?: string;
    slug?: string;
    phone?: string;
    email?: string;
    account_type?: 'individual' | 'business' | 'farm';
    address?: string;
    city?: string;
    country?: string;
  };

  @ApiPropertyOptional({ description: 'Farm data' })
  farmData?: {
    name?: string;
    location?: string;
    size?: number;
    size_unit?: string;
    farm_type?: 'main' | 'sub';
    description?: string;
    soil_type?: string;
    climate_zone?: string;
  };

  @ApiPropertyOptional({ description: 'Module selection' })
  moduleSelection?: {
    farm_management?: boolean;
    inventory?: boolean;
    sales?: boolean;
    procurement?: boolean;
    accounting?: boolean;
    hr?: boolean;
    analytics?: boolean;
    marketplace?: boolean;
  };

  @ApiPropertyOptional({ description: 'Preferences' })
  preferences?: {
    currency?: string;
    date_format?: string;
    use_demo_data?: boolean;
    enable_notifications?: boolean;
  };

  @ApiPropertyOptional({ description: 'Existing organization ID' })
  existingOrgId?: string;
}

export class SaveOnboardingProfileDto {
  @ApiProperty({ description: 'First name' })
  @IsString()
  first_name: string;

  @ApiProperty({ description: 'Last name' })
  @IsString()
  last_name: string;

  @ApiPropertyOptional({ description: 'Phone number' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ description: 'Timezone' })
  @IsString()
  timezone: string;

  @ApiProperty({ description: 'Language' })
  @IsString()
  language: string;
}

export class SaveOnboardingOrganizationDto {
  @ApiProperty({ description: 'Organization name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Organization slug' })
  @IsString()
  slug: string;

  @ApiPropertyOptional({ description: 'Phone number' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ description: 'Email' })
  @IsString()
  email: string;

  @ApiProperty({ description: 'Account type' })
  @IsEnum(['individual', 'business', 'farm'])
  account_type: 'individual' | 'business' | 'farm';

  @ApiPropertyOptional({ description: 'Address' })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ description: 'City' })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiProperty({ description: 'Country' })
  @IsString()
  country: string;
}

export class SaveOnboardingFarmDto {
  @ApiProperty({ description: 'Farm name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Location' })
  @IsString()
  location: string;

  @ApiProperty({ description: 'Size' })
  @IsNumber()
  size: number;

  @ApiProperty({ description: 'Size unit' })
  @IsString()
  size_unit: string;

  @ApiPropertyOptional({ description: 'Farm type' })
  @IsEnum(['main', 'sub'])
  @IsOptional()
  farm_type?: 'main' | 'sub';

  @ApiPropertyOptional({ description: 'Description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Soil type' })
  @IsString()
  @IsOptional()
  soil_type?: string;

  @ApiPropertyOptional({ description: 'Climate zone' })
  @IsString()
  @IsOptional()
  climate_zone?: string;
}

export class SaveOnboardingModulesDto {
  @ApiProperty({ description: 'Module selection' })
  moduleSelection: {
    farm_management: boolean;
    inventory: boolean;
    sales: boolean;
    procurement: boolean;
    accounting: boolean;
    hr: boolean;
    analytics: boolean;
    marketplace: boolean;
  };
}

export class SaveOnboardingPreferencesDto {
  @ApiProperty({ description: 'Currency' })
  @IsString()
  currency: string;

  @ApiProperty({ description: 'Date format' })
  @IsString()
  date_format: string;

  @ApiProperty({ description: 'Use demo data' })
  @IsBoolean()
  use_demo_data: boolean;

  @ApiProperty({ description: 'Enable notifications' })
  @Boolean()
  enable_notifications: boolean;
}
