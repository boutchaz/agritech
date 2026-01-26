import { IsBoolean, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserPreferencesDto {
  @ApiPropertyOptional({ description: 'Enable/disable task reminders' })
  @IsOptional()
  @IsBoolean()
  taskRemindersEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Enable/disable 1 day before reminder' })
  @IsOptional()
  @IsBoolean()
  taskReminder1dBefore?: boolean;

  @ApiPropertyOptional({ description: 'Enable/disable on due date reminder' })
  @IsOptional()
  @IsBoolean()
  taskReminderOnDueDate?: boolean;

  @ApiPropertyOptional({ description: 'Enable/disable overdue alerts' })
  @IsOptional()
  @IsBoolean()
  taskOverdueAlerts?: boolean;

  @ApiPropertyOptional({ description: 'Enable/disable email notifications' })
  @IsOptional()
  @IsBoolean()
  emailNotifications?: boolean;

  @ApiPropertyOptional({ description: 'Enable/disable push notifications' })
  @IsOptional()
  @IsBoolean()
  pushNotifications?: boolean;
}

export class UserPreferencesResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  organizationId: string;

  @ApiProperty()
  taskRemindersEnabled: boolean;

  @ApiProperty()
  taskReminder1dBefore: boolean;

  @ApiProperty()
  taskReminderOnDueDate: boolean;

  @ApiProperty()
  taskOverdueAlerts: boolean;

  @ApiProperty()
  emailNotifications: boolean;

  @ApiProperty()
  pushNotifications: boolean;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}
