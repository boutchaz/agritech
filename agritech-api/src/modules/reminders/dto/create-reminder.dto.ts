import { IsString, IsUUID, IsEnum, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ReminderType {
  DUE_SOON = 'due_soon',
  DUE_TODAY = 'due_today',
  OVERDUE_1D = 'overdue_1d',
  OVERDUE_3D = 'overdue_3d',
}

export class CreateReminderDto {
  @ApiProperty({ description: 'Task ID to create reminder for' })
  @IsUUID()
  taskId: string;

  @ApiProperty({ enum: ReminderType, description: 'Type of reminder' })
  @IsEnum(ReminderType)
  reminderType: ReminderType;

  @ApiPropertyOptional({ description: 'Scheduled time for the reminder' })
  @IsOptional()
  @IsDateString()
  scheduledFor?: string;
}
