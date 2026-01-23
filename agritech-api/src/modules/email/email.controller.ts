import { Controller, Post, Body, Get } from '@nestjs/common';
import { EmailService } from './email.service';

@Controller('email')
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Post('test')
  async sendTestEmail(@Body() body: { to: string }) {
    await this.emailService.sendTestEmail(body.to);
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
    await this.emailService.sendUserCreatedEmail(
      body.to,
      body.firstName,
      body.lastName,
      body.tempPassword,
      body.organizationName,
    );
    return { message: 'User created email sent successfully' };
  }

  @Post('password-reset')
  async sendPasswordResetEmail(@Body() body: {
    to: string;
    firstName: string;
    tempPassword: string;
  }) {
    await this.emailService.sendPasswordResetEmail(
      body.to,
      body.firstName,
      body.tempPassword,
    );
    return { message: 'Password reset email sent successfully' };
  }
}
