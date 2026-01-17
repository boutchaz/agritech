import { IsString, IsOptional, IsEnum, IsBoolean, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OnboardingStateDto {
  @ApiProperty({ description: 'Current onboarding step (1-5)' })
  @IsNumber()
  @IsOptional()
  currentStep?: number;

  @ApiPropertyOptional({ description: 'Profile data' })
  profileData?: {
    @IsString()
    @IsOptional()
    first_name?: string;
    @IsString()
    @IsOptional()
    last_name?: string;
    @IsString()
    @IsOptional()
    phone?: string;
    @IsString()
    @IsOptional()
    timezone?: string;
    @IsString()
    @IsOptional()
    language?: string;
  };

  @ApiPropertyOptional({ description: 'Organization data' })
  organizationData?: {
    @IsString()
    @IsOptional()
    name?: string;
    @IsString()
    @IsOptional()
    slug?: string;
    @IsString()
    @IsOptional()
    phone?: string;
    @IsString()
    @IsOptional()
    email?: string;
    @IsEnum(['individual', 'business', 'farm'])
    @IsOptional()
    account_type?: 'individual' | 'business' | 'farm';
    @IsString()
    @IsOptional()
    address?: string;
    @IsString()
    @IsOptional()
    city?: string;
    @IsString()
    @IsOptional()
    country?: string;
  };

  @ApiPropertyOptional({ description: 'Farm data' })
  farmData?: {
    @IsString()
    @IsOptional()
    name?: string;
    @IsString()
    @IsOptional()
    location?: string;
    @IsNumber()
    @IsOptional()
    size?: number;
    @IsString()
    @IsOptional()
    size_unit?: string;
    @IsEnum(['main', 'sub'])
    @IsOptional()
    farm_type?: 'main' | 'sub';
    @IsString()
    @IsOptional()
    description?: string;
    @IsString()
    @IsOptional()
    soil_type?: string;
    @IsString()
    @IsOptional()
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
    @IsString()
    @IsOptional()
    currency?: string;
    @IsString()
    @IsOptional()
    date_format?: string;
    @IsBoolean()
    @IsOptional()
    use_demo_data?: boolean;
    @IsBoolean()
    @IsOptional()
    enable_notifications?: boolean;
  };

  @ApiPropertyOptional({ description: 'Existing organization ID' })
  @IsString()
  @IsOptional()
  existingOrgId?: string | null;
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
  @IsBoolean()
  enable_notifications: boolean;
}
