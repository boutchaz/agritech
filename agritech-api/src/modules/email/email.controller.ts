import { Controller, Post, Body, Get, BadRequestException } from '@nestjs/common';
import { EmailService } from './email.service';

@Controller('email')
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

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
