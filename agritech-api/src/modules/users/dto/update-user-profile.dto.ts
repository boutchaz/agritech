import { IsOptional, IsString, IsEmail, IsIn, Matches, IsArray, IsBoolean, IsObject } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserProfileDto {
  @ApiPropertyOptional({ description: 'User full name' })
  @IsOptional()
  @IsString()
  full_name?: string;

  @ApiPropertyOptional({ description: 'User first name' })
  @IsOptional()
  @IsString()
  first_name?: string;

  @ApiPropertyOptional({ description: 'User last name' })
  @IsOptional()
  @IsString()
  last_name?: string;

  @ApiPropertyOptional({ description: 'User email' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    description: 'User phone number (international format)',
    example: '+212 6 12 34 56 78'
  })
  @IsOptional()
  @Matches(/^[\+]?[0-9()\s\-.]{8,20}$/, {
    message: 'Phone number must be in valid international format (8-20 characters, can include +, digits, spaces, parentheses, hyphens, dots)'
  })
  phone?: string;

  @ApiPropertyOptional({ description: 'User avatar URL' })
  @IsOptional()
  @IsString()
  avatar_url?: string;

  @ApiPropertyOptional({ description: 'User timezone', example: 'Africa/Casablanca' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({ description: 'User language', enum: ['fr', 'en', 'ar', 'es'] })
  @IsOptional()
  @IsIn(['fr', 'en', 'ar', 'es'])
  language?: string;

  @ApiPropertyOptional({ description: 'Enable dark mode', example: false })
  @IsOptional()
  @IsBoolean()
  dark_mode?: boolean;

  @ApiPropertyOptional({ description: 'User experience level', enum: ['basic', 'intermediate', 'advanced'] })
  @IsOptional()
  @IsIn(['basic', 'intermediate', 'advanced'])
  experience_level?: string;

  @ApiPropertyOptional({
    description: 'Array of dismissed hint IDs',
    example: ['welcome-hint', 'task-hint'],
    type: [String]
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dismissed_hints?: string[];

  @ApiPropertyOptional({
    description: 'Feature usage tracking object',
    example: { dashboard: { count: 5, lastUsed: '2026-03-26T00:00:00Z', firstUsed: '2026-03-20T00:00:00Z' } }
  })
  @IsOptional()
  @IsObject()
  feature_usage?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Notification preferences',
    example: { email: true, push: true, alerts: true, reports: false }
  })
  @IsOptional()
  @IsObject()
  notification_preferences?: Record<string, boolean>;

  @ApiPropertyOptional({
    description: 'Array of completed tour IDs',
    example: ['welcome', 'dashboard', 'farm-management'],
    type: [String]
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  completed_tours?: string[];

  @ApiPropertyOptional({
    description: 'Array of dismissed tour IDs (tours user explicitly skipped)',
    example: ['welcome', 'full-app'],
    type: [String]
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dismissed_tours?: string[];

  @ApiPropertyOptional({ description: 'Whether the user has completed onboarding' })
  @IsOptional()
  @IsBoolean()
  onboarding_completed?: boolean;
}
