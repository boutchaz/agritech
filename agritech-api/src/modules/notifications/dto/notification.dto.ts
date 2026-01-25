import { IsString, IsOptional, IsBoolean, IsUUID, IsObject, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum NotificationType {
  TASK_ASSIGNED = 'task_assigned',
  TASK_STATUS_CHANGED = 'task_status_changed',
  ORDER_STATUS_CHANGED = 'order_status_changed',
  QUOTE_RECEIVED = 'quote_received',
  QUOTE_RESPONDED = 'quote_responded',
  HARVEST_COMPLETED = 'harvest_completed',
  LOW_INVENTORY = 'low_inventory',
  PAYMENT_PROCESSED = 'payment_processed',
  GENERAL = 'general',
}

export class CreateNotificationDto {
  @ApiProperty({ description: 'User ID to send notification to' })
  @IsUUID()
  userId: string;

  @ApiProperty({ description: 'Organization ID' })
  @IsUUID()
  organizationId: string;

  @ApiProperty({ enum: NotificationType, description: 'Type of notification' })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiProperty({ description: 'Notification title' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Notification message' })
  @IsOptional()
  @IsString()
  message?: string;

  @ApiPropertyOptional({ description: 'Additional data (e.g., task_id, order_id)' })
  @IsOptional()
  @IsObject()
  data?: Record<string, any>;
}

export class NotificationResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  user_id: string;

  @ApiProperty()
  organization_id: string;

  @ApiProperty({ enum: NotificationType })
  type: NotificationType;

  @ApiProperty()
  title: string;

  @ApiPropertyOptional()
  message?: string;

  @ApiPropertyOptional()
  data?: Record<string, any>;

  @ApiProperty()
  is_read: boolean;

  @ApiProperty()
  created_at: string;

  @ApiPropertyOptional()
  read_at?: string;
}

export class MarkAsReadDto {
  @ApiProperty({ description: 'Notification ID' })
  @IsUUID()
  notificationId: string;
}

export class NotificationFiltersDto {
  @ApiPropertyOptional({ description: 'Filter by read status' })
  @IsOptional()
  @IsBoolean()
  isRead?: boolean;

  @ApiPropertyOptional({ enum: NotificationType, description: 'Filter by type' })
  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;

  @ApiPropertyOptional({ description: 'Limit results', default: 50 })
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({ description: 'Offset for pagination', default: 0 })
  @IsOptional()
  offset?: number;
}
