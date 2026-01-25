import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificationsService } from './notifications.service';
import {
  NotificationResponseDto,
  NotificationFiltersDto,
  NotificationType,
} from './dto/notification.dto';

@ApiTags('notifications')
@ApiBearerAuth('JWT-auth')
@ApiHeader({
  name: 'x-organization-id',
  description: 'Organization ID for multi-tenant context',
  required: true,
})
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all notifications for current user' })
  @ApiResponse({
    status: 200,
    description: 'List of notifications',
    type: [NotificationResponseDto],
  })
  @ApiQuery({ name: 'isRead', required: false, type: Boolean })
  @ApiQuery({ name: 'type', required: false, enum: NotificationType })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  async getNotifications(
    @Req() req: any,
    @Query() filters: NotificationFiltersDto,
  ): Promise<NotificationResponseDto[]> {
    const userId = req.user.id;
    const organizationId = req.headers['x-organization-id'];
    return this.notificationsService.getNotifications(userId, organizationId, filters);
  }

  @Get('unread/count')
  @ApiOperation({ summary: 'Get unread notification count' })
  @ApiResponse({ status: 200, description: 'Unread count' })
  async getUnreadCount(@Req() req: any): Promise<{ count: number }> {
    const userId = req.user.id;
    const organizationId = req.headers['x-organization-id'];
    const count = await this.notificationsService.getUnreadCount(userId, organizationId);
    return { count };
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a notification as read' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  async markAsRead(
    @Req() req: any,
    @Param('id') notificationId: string,
  ): Promise<{ success: boolean }> {
    const userId = req.user.id;
    await this.notificationsService.markAsRead(notificationId, userId);
    return { success: true };
  }

  @Post('read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({ status: 200, description: 'All notifications marked as read' })
  async markAllAsRead(@Req() req: any): Promise<{ success: boolean; count: number }> {
    const userId = req.user.id;
    const organizationId = req.headers['x-organization-id'];
    const count = await this.notificationsService.markAllAsRead(userId, organizationId);
    return { success: true, count };
  }

  @Get('connection-status')
  @ApiOperation({ summary: 'Get WebSocket connection status' })
  @ApiResponse({ status: 200, description: 'Connection status info' })
  async getConnectionStatus(@Req() req: any): Promise<{
    isConnected: boolean;
    connectedUsers: number;
  }> {
    const userId = req.user.id;
    return this.notificationsService.getConnectionStatus(userId);
  }

  @Post('test')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Send a test notification (development only)' })
  @ApiResponse({ status: 201, description: 'Test notification sent' })
  async sendTestNotification(@Req() req: any): Promise<NotificationResponseDto> {
    const userId = req.user.id;
    const organizationId = req.headers['x-organization-id'];

    return this.notificationsService.createNotification({
      userId,
      organizationId,
      type: NotificationType.SYSTEM,
      title: 'Test Notification',
      message: `This is a test notification sent at ${new Date().toLocaleString()}`,
      data: { test: true, timestamp: Date.now() },
    });
  }
}
