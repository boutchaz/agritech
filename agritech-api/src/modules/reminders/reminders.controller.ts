import {
  Controller,
  Get,
  Post,
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
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RemindersService } from './reminders.service';
import { UpdateUserPreferencesDto, UserPreferencesResponseDto } from './dto/user-preferences.dto';
import { OrganizationGuard } from '../../common/guards/organization.guard';
import { InternalAdminGuard } from '../admin/guards/internal-admin.guard';

@ApiTags('reminders')
@ApiBearerAuth('JWT-auth')
@ApiHeader({
  name: 'x-organization-id',
  description: 'Organization ID for multi-tenant context',
  required: true,
})
@Controller('reminders')
@UseGuards(JwtAuthGuard)
export class RemindersController {
  constructor(private readonly remindersService: RemindersService) {}

  @Get('preferences')
  @UseGuards(OrganizationGuard)
  @ApiOperation({ summary: 'Get user notification preferences' })
  @ApiResponse({
    status: 200,
    description: 'User notification preferences',
    type: UserPreferencesResponseDto,
  })
  async getPreferences(@Req() req: any): Promise<UserPreferencesResponseDto | null> {
    const userId = req.user.id;
    const organizationId = req.headers['x-organization-id'];
    return this.remindersService.getUserPreferences(userId, organizationId);
  }

  @Post('preferences')
  @UseGuards(OrganizationGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update user notification preferences' })
  @ApiResponse({
    status: 200,
    description: 'Updated user notification preferences',
    type: UserPreferencesResponseDto,
  })
  async updatePreferences(
    @Req() req: any,
    @Body() dto: UpdateUserPreferencesDto,
  ): Promise<UserPreferencesResponseDto> {
    const userId = req.user.id;
    const organizationId = req.headers['x-organization-id'];
    return this.remindersService.updateUserPreferences(userId, organizationId, dto);
  }

  @Post('test')
  @UseGuards(InternalAdminGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Trigger reminder check manually (for testing)' })
  @ApiResponse({
    status: 200,
    description: 'Reminder check triggered',
  })
  async testReminders(): Promise<{ dueTasks: number; overdueTasks: number }> {
    return this.remindersService.triggerReminderCheck();
  }
}
