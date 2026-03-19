import {
  IsString,
  IsOptional,
  IsBoolean,
  IsUUID,
  IsObject,
  IsEnum,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export enum NotificationType {
  TASK_ASSIGNED = "task_assigned",
  TASK_STATUS_CHANGED = "task_status_changed",
  TASK_REMINDER = "task_reminder",
  ORDER_STATUS_CHANGED = "order_status_changed",
  QUOTE_RECEIVED = "quote_received",
  QUOTE_RESPONDED = "quote_responded",
  HARVEST_COMPLETED = "harvest_completed",
  LOW_INVENTORY = "low_inventory",
  PAYMENT_PROCESSED = "payment_processed",
  AUDIT_REMINDER = "audit_reminder",
  CERTIFICATION_EXPIRY = "certification_expiry",
  SATELLITE_DOWNLOAD_COMPLETE = "satellite_download_complete",
  CALIBRATION_COMPLETE = "calibration_complete",
  CALIBRATION_FAILED = "calibration_failed",
  CRITICAL_ALERT = "critical_alert",
  SEASON_REMINDER = "season_reminder",
  SALES_ORDER_CREATED = "sales_order_created",
  SALES_ORDER_STATUS_CHANGED = "sales_order_status_changed",
  PURCHASE_ORDER_CREATED = "purchase_order_created",
  PURCHASE_ORDER_STATUS_CHANGED = "purchase_order_status_changed",
  STOCK_ENTRY_CREATED = "stock_entry_created",
  RECEPTION_BATCH_DECISION = "reception_batch_decision",
  QUALITY_INSPECTION_COMPLETED = "quality_inspection_completed",
  DELIVERY_STATUS_CHANGED = "delivery_status_changed",
  DELIVERY_COMPLETED = "delivery_completed",
  MEMBER_ADDED = "member_added",
  MEMBER_REMOVED = "member_removed",
  ROLE_CHANGED = "role_changed",
  WORKER_ADDED = "worker_added",
  GENERAL = "general",
}

export class CreateNotificationDto {
  @ApiProperty({ description: "User ID to send notification to" })
  @IsUUID()
  userId: string;

  @ApiProperty({ description: "Organization ID" })
  @IsUUID()
  organizationId: string;

  @ApiProperty({ enum: NotificationType, description: "Type of notification" })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiProperty({ description: "Notification title" })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: "Notification message" })
  @IsOptional()
  @IsString()
  message?: string;

  @ApiPropertyOptional({
    description: "Additional data (e.g., task_id, order_id)",
  })
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
  @ApiProperty({ description: "Notification ID" })
  @IsUUID()
  notificationId: string;
}

export class NotificationFiltersDto {
  @ApiPropertyOptional({ description: "Filter by read status" })
  @IsOptional()
  @IsBoolean()
  isRead?: boolean;

  @ApiPropertyOptional({
    enum: NotificationType,
    description: "Filter by type",
  })
  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;

  @ApiPropertyOptional({ description: "Limit results", default: 50 })
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({ description: "Offset for pagination", default: 0 })
  @IsOptional()
  offset?: number;
}
