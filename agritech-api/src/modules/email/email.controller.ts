import { Controller, Get, Post, Body, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { EmailService } from './email.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InternalAdminGuard } from '../admin/guards/internal-admin.guard';

/**
 * Email controller — restricted to internal admins only.
 * These endpoints send emails with sensitive content (temp passwords).
 * They must NEVER be publicly accessible.
 */
@ApiTags('email')
@ApiBearerAuth()
@Controller('email')
@UseGuards(JwtAuthGuard, InternalAdminGuard)
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Get('config')
  @ApiOperation({ summary: 'Get current SMTP configuration (redacted)' })
  getConfig() {
    return this.emailService.getRedactedConfig();
  }

  @Post('test')
  async sendTestEmail(@Body() body: { to: string }) {
    const sent = await this.emailService.sendTestEmail(body.to);
    if (!sent) {
      throw new BadRequestException('Email service is not configured');
    }
    return { message: 'Test email sent successfully' };
  }

  @Post('user-created')
  async sendUserCreatedEmail(@Body() body: {
    to: string;
    firstName: string;
    lastName: string;
    tempPassword: string;
    organizationName: string;
  }) {
    const sent = await this.emailService.sendUserCreatedEmail(
      body.to,
      body.firstName,
      body.lastName,
      body.tempPassword,
      body.organizationName,
    );
    if (!sent) {
      throw new BadRequestException('Email service is not configured');
    }
    return { message: 'User created email sent successfully' };
  }

  @Post('password-reset')
  async sendPasswordResetEmail(@Body() body: {
    to: string;
    firstName: string;
    tempPassword: string;
  }) {
    const sent = await this.emailService.sendPasswordResetEmail(
      body.to,
      body.firstName,
      body.tempPassword,
    );
    if (!sent) {
      throw new BadRequestException('Email service is not configured');
    }
    return { message: 'Password reset email sent successfully' };
  }
}
