import { IsOptional, IsString, IsNumber, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { AnalyticsEventCategory } from './track-event.dto';

export class AnalyticsQueryDto {
  @ApiPropertyOptional({ description: 'Start date (ISO string)' })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date (ISO string)' })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional({ enum: AnalyticsEventCategory })
  @IsOptional()
  @IsEnum(AnalyticsEventCategory)
  category?: AnalyticsEventCategory;

  @ApiPropertyOptional({ description: 'Filter by event action' })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional({ description: 'Filter by user ID' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ description: 'Number of days to look back', default: 30 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  days?: number;

  @ApiPropertyOptional({ default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  offset?: number;
}

export class AnalyticsMetricsSummary {
  totalEvents: number;
  uniqueUsers: number;
  uniqueSessions: number;
  topActions: { action: string; count: number }[];
  topCategories: { category: string; count: number }[];
  dailyTrend: { date: string; count: number }[];
  deviceBreakdown: { device: string; count: number }[];
  pageViews: { path: string; count: number }[];
}

export class UserActivitySummary {
  userId: string;
  totalEvents: number;
  lastActivity: string;
  topActions: { action: string; count: number }[];
  sessionCount: number;
  avgSessionDuration?: number;
}

export class RealTimeMetrics {
  activeUsers15min: number;
  activeUsers5min: number;
  eventsLastHour: number;
  topPagesNow: { path: string; activeUsers: number }[];
  eventRatePerMinute: number;
}
