import { IsString, IsOptional, IsEnum, IsBoolean, IsNumber, IsObject, Matches, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CheckSlugAvailabilityResponseDto {
  @ApiProperty({ description: 'Whether the slug is available' })
  available: boolean;

  @ApiProperty({ description: 'The slug that was checked' })
  slug: string;

  @ApiPropertyOptional({ description: 'Suggested alternative if slug is taken' })
  suggestion?: string;

  @ApiPropertyOptional({ description: 'Error message if slug format is invalid' })
  error?: string;
}

export class OnboardingStateDto {
  @ApiPropertyOptional({ description: 'State version for compatibility checking' })
  @IsNumber()
  @IsOptional()
  version?: number;

  @ApiPropertyOptional({ description: 'User ID (for cross-device sync validation)' })
  @IsString()
  @IsOptional()
  userId?: string;

  @ApiPropertyOptional({ description: 'Current onboarding step (1-5)' })
  @IsNumber()
  @IsOptional()
  currentStep?: number;

  @ApiPropertyOptional({ description: 'Profile data' })
  @IsObject()
  @IsOptional()
  profileData?: {
    first_name?: string;
    last_name?: string;
    phone?: string;
    timezone?: string;
    language?: string;
  };

  @ApiPropertyOptional({ description: 'Organization data' })
  @IsObject()
  @IsOptional()
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
  @IsObject()
  @IsOptional()
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
  @IsObject()
  @IsOptional()
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
  @IsObject()
  @IsOptional()
  preferences?: {
    currency?: string;
    date_format?: string;
    use_demo_data?: boolean;
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
  @IsObject()
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
