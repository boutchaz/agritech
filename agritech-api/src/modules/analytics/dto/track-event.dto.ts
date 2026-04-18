import {
  IsString,
  IsOptional,
  IsObject,
  IsNumber,
  IsBoolean,
  IsArray,
  ValidateNested,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum AnalyticsEventCategory {
  PAGE_VIEW = 'page_view',
  AUTHENTICATION = 'authentication',
  ONBOARDING = 'onboarding',
  NAVIGATION = 'navigation',
  FORM = 'form',
  FEATURE = 'feature',
  CRUD = 'crud',
  DASHBOARD = 'dashboard',
  SEARCH = 'search',
  SETTINGS = 'settings',
  ENGAGEMENT = 'engagement',
  TRIAL = 'trial',
  ECOMMERCE = 'ecommerce',
  AGRITECH = 'agritech',
  ERROR = 'error',
  API = 'api',
}

export class TrackEventDto {
  @ApiProperty({ description: 'Event action name', example: 'login_success' })
  @IsString()
  action: string;

  @ApiPropertyOptional({ enum: AnalyticsEventCategory, description: 'Event category' })
  @IsOptional()
  @IsEnum(AnalyticsEventCategory)
  category?: AnalyticsEventCategory;

  @ApiPropertyOptional({ description: 'Event label for additional context' })
  @IsOptional()
  @IsString()
  label?: string;

  @ApiPropertyOptional({ description: 'Numeric value associated with the event' })
  @IsOptional()
  @IsNumber()
  value?: number;

  @ApiPropertyOptional({ description: 'Whether this is a non-interaction event' })
  @IsOptional()
  @IsBoolean()
  nonInteraction?: boolean;

  @ApiPropertyOptional({ description: 'Additional event metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Session ID for grouping events' })
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiPropertyOptional({ description: 'Page path where the event occurred' })
  @IsOptional()
  @IsString()
  pagePath?: string;

  @ApiPropertyOptional({ description: 'Device type', example: 'web' })
  @IsOptional()
  @IsString()
  deviceType?: string;

  @ApiPropertyOptional({ description: 'Device OS', example: 'macos' })
  @IsOptional()
  @IsString()
  deviceOs?: string;

  @ApiPropertyOptional({ description: 'App version', example: '1.0.0' })
  @IsOptional()
  @IsString()
  appVersion?: string;
}

export class TrackBatchEventsDto {
  @ApiProperty({ type: [TrackEventDto], description: 'Array of events to track' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TrackEventDto)
  events: TrackEventDto[];
}

export class TrackPageViewDto {
  @ApiProperty({ description: 'Page path', example: '/dashboard' })
  @IsString()
  path: string;

  @ApiPropertyOptional({ description: 'Page title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Referrer URL' })
  @IsOptional()
  @IsString()
  referrer?: string;

  @ApiPropertyOptional({ description: 'Session ID' })
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiPropertyOptional({ description: 'Device type' })
  @IsOptional()
  @IsString()
  deviceType?: string;

  @ApiPropertyOptional({ description: 'Device OS' })
  @IsOptional()
  @IsString()
  deviceOs?: string;
}

export class IdentifyUserDto {
  @ApiPropertyOptional({ description: 'Subscription tier' })
  @IsOptional()
  @IsString()
  subscriptionTier?: string;

  @ApiPropertyOptional({ description: 'Trial status' })
  @IsOptional()
  @IsString()
  trialStatus?: string;

  @ApiPropertyOptional({ description: 'Number of farms' })
  @IsOptional()
  @IsNumber()
  farmCount?: number;

  @ApiPropertyOptional({ description: 'Total hectares managed' })
  @IsOptional()
  @IsNumber()
  totalHectares?: number;

  @ApiPropertyOptional({ description: 'Device type' })
  @IsOptional()
  @IsString()
  deviceType?: string;

  @ApiPropertyOptional({ description: 'Device OS' })
  @IsOptional()
  @IsString()
  deviceOs?: string;

  @ApiPropertyOptional({ description: 'App version' })
  @IsOptional()
  @IsString()
  appVersion?: string;

  @ApiPropertyOptional({ description: 'Additional user properties' })
  @IsOptional()
  @IsObject()
  properties?: Record<string, any>;
}
