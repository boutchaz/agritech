import { Injectable, NotFoundException, BadRequestException, Logger, OnModuleInit } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateEmailTemplateDto, EmailTemplateCategory, UpdateEmailTemplateDto } from './dto';

export interface SeedEmailTemplate {
  name: string;
  description: string;
  type: string;
  category: EmailTemplateCategory;
  subject: string;
  html_body: string;
  text_body: string;
  variables: string[];
  is_system: true;
}

@Injectable()
export class EmailTemplatesService implements OnModuleInit {
  private readonly logger = new Logger(EmailTemplatesService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  async onModuleInit() {
    try {
      await this.seedGlobalTemplates();
    } catch (error) {
      this.logger.error(`Failed to seed global email templates: ${error.message}`);
    }
  }

  async seedGlobalTemplates(): Promise<number> {
    const client = this.databaseService.getAdminClient();

    // Get existing global template types to avoid duplicates
    const { data: existing } = await client
      .from('email_templates')
      .select('type')
      .is('organization_id', null);

    const existingTypes = new Set((existing ?? []).map((r) => r.type));

    const templates = this.getGlobalTemplates();
    const toInsert = templates.filter((t) => !existingTypes.has(t.type));

    if (toInsert.length === 0) {
      this.logger.log(`Global email templates already seeded (${existingTypes.size} types)`);
      return 0;
    }

    let seeded = 0;

    for (const template of toInsert) {
      const { error } = await client
        .from('email_templates')
        .insert({
          ...template,
          organization_id: null,
        });

      if (!error) {
        seeded++;
      } else {
        this.logger.error(`Failed to seed global template "${template.type}": ${error.message}`);
      }
    }

    if (seeded > 0) {
      this.logger.log(`Seeded ${seeded} global email templates`);
    }

    return seeded;
  }

  async findGlobalByType(type: string) {
    const client = this.databaseService.getAdminClient();
    const { data, error } = await client
      .from('email_templates')
      .select('*')
      .is('organization_id', null)
      .eq('type', type)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      this.logger.error(`Failed to fetch global template "${type}": ${error.message}`);
      return null;
    }

    return data;
  }

  private getGlobalTemplates(): SeedEmailTemplate[] {
    return [
      ...this.getDefaultTemplates(),
      {
        name: 'Welcome - Account Created',
        description: 'Sent to new users when their account is created',
        type: 'user_created',
        category: EmailTemplateCategory.GENERAL,
        subject: 'Welcome to AgriTech - Your Account Details',
        html_body: `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Welcome to AgriTech</title><style>body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }.container { border: 1px solid #ddd; border-radius: 8px; padding: 30px; background-color: #f9f9f9; }.header { text-align: center; margin-bottom: 30px; }.logo { font-size: 24px; font-weight: bold; color: #2e7d32; }.content { background-color: #fff; padding: 20px; border-radius: 6px; }.button { display: inline-block; padding: 12px 30px; background-color: #2e7d32; color: #fff; text-decoration: none; border-radius: 5px; margin: 20px 0; }.button:hover { background-color: #1b5e20; }.password-box { background-color: #f5f5f5; border: 1px solid #ddd; border-radius: 5px; padding: 15px; margin: 20px 0; text-align: center; }.password { font-size: 18px; font-weight: bold; color: #2e7d32; letter-spacing: 2px; }.warning { color: #d32f2f; font-size: 14px; margin-top: 10px; }.footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }</style></head><body><div class="container"><div class="header"><div class="logo">AgriTech</div></div><div class="content"><h2>Welcome to AgriTech!</h2><p>Dear <strong>{{firstName}} {{lastName}}</strong>,</p><p>Your account has been successfully created for <strong>{{organizationName}}</strong>.</p><p>You can now access the AgriTech platform to manage your agricultural activities.</p><div class="password-box"><p>Your temporary password is:</p><div class="password">{{tempPassword}}</div><p class="warning">Please change your password after your first login for security reasons.</p></div><p style="text-align: center;"><a href="{{loginUrl}}" class="button">Login to AgriTech</a></p><p><strong>Login URL:</strong> <a href="{{loginUrl}}">{{loginUrl}}</a></p><p><strong>Your email:</strong> {{email}}</p><hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;"><p><em>If you have any questions or need assistance, please contact your organization administrator.</em></p></div><div class="footer"><p>&copy; 2025 AgriTech. All rights reserved.</p></div></div></body></html>`,
        text_body: 'Welcome to AgriTech!\n\nDear {{firstName}} {{lastName}},\n\nYour account has been created for {{organizationName}}.\nTemporary password: {{tempPassword}}\nLogin: {{loginUrl}}\n\nPlease change your password after first login.',
        variables: ['firstName', 'lastName', 'email', 'tempPassword', 'organizationName', 'loginUrl'],
        is_system: true,
      },
      {
        name: 'Password Reset',
        description: 'Sent when a user password is reset by an administrator',
        type: 'password_reset',
        category: EmailTemplateCategory.GENERAL,
        subject: 'Your Password Has Been Reset',
        html_body: `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Password Reset - AgriTech</title><style>body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }.container { border: 1px solid #ddd; border-radius: 8px; padding: 30px; background-color: #f9f9f9; }.header { text-align: center; margin-bottom: 30px; }.logo { font-size: 24px; font-weight: bold; color: #2e7d32; }.content { background-color: #fff; padding: 20px; border-radius: 6px; }.button { display: inline-block; padding: 12px 30px; background-color: #2e7d32; color: #fff; text-decoration: none; border-radius: 5px; margin: 20px 0; }.button:hover { background-color: #1b5e20; }.password-box { background-color: #fff3e0; border: 2px solid #ff9800; border-radius: 5px; padding: 15px; margin: 20px 0; text-align: center; }.password { font-size: 18px; font-weight: bold; color: #e65100; letter-spacing: 2px; }.warning { color: #d32f2f; font-size: 14px; margin-top: 10px; }.info { background-color: #e3f2fd; border-left: 4px solid #2196f3; padding: 15px; margin: 20px 0; }.footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }</style></head><body><div class="container"><div class="header"><div class="logo">AgriTech</div></div><div class="content"><h2>Password Has Been Reset</h2><p>Dear <strong>{{firstName}}</strong>,</p><p>Your AgriTech password has been reset by your administrator.</p><div class="password-box"><p>Your new temporary password is:</p><div class="password">{{tempPassword}}</div><p class="warning">This password will expire in 7 days. Please change it as soon as possible.</p></div><div class="info"><strong>Security Notice:</strong> For your account security, please log in immediately with your new password, change your password after logging in, and do not share this password with anyone.</div><p style="text-align: center;"><a href="{{loginUrl}}" class="button">Login to AgriTech</a></p><hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;"><p><em>If you did not request this password reset, please contact your organization administrator immediately.</em></p></div><div class="footer"><p>&copy; 2025 AgriTech. All rights reserved.</p></div></div></body></html>`,
        text_body: 'Password Reset\n\nDear {{firstName}},\n\nYour password has been reset.\nNew temporary password: {{tempPassword}}\nLogin: {{loginUrl}}\n\nPlease change your password immediately.',
        variables: ['firstName', 'tempPassword', 'loginUrl'],
        is_system: true,
      },
      {
        name: 'Test Email',
        description: 'Test email to verify SMTP configuration',
        type: 'test_email',
        category: EmailTemplateCategory.GENERAL,
        subject: 'Test Email from AgriTech',
        html_body: `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Test Email</title><style>body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }.container { border: 1px solid #ddd; border-radius: 8px; padding: 30px; background-color: #f9f9f9; }.header { text-align: center; margin-bottom: 30px; }.logo { font-size: 24px; font-weight: bold; color: #2e7d32; }.content { background-color: #fff; padding: 20px; border-radius: 6px; }.footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }</style></head><body><div class="container"><div class="header"><div class="logo">AgriTech</div></div><div class="content"><h2>Test Email</h2><p>{{message}}</p><p><strong>Date:</strong> {{date}}</p><p>If you received this email, the email service is working correctly!</p></div><div class="footer"><p>&copy; 2025 AgriTech. All rights reserved.</p></div></div></body></html>`,
        text_body: 'Test Email\n\n{{message}}\nDate: {{date}}\n\nIf you received this email, the email service is working correctly!',
        variables: ['message', 'date'],
        is_system: true,
      },
      {
        name: 'Task Due Soon',
        description: 'Sent when a task is due tomorrow',
        type: 'task_due_soon',
        category: EmailTemplateCategory.TASK,
        subject: 'Task Due Tomorrow: {{taskTitle}}',
        html_body: `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Task Due Soon - AgriTech</title><style>body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }.container { border: 1px solid #ddd; border-radius: 8px; padding: 30px; background-color: #f9f9f9; }.header { text-align: center; margin-bottom: 30px; }.logo { font-size: 24px; font-weight: bold; color: #16a34a; }.content { background-color: #fff; padding: 20px; border-radius: 6px; }.task-box { background-color: #f0fdf4; border-left: 4px solid #16a34a; padding: 15px; margin: 20px 0; border-radius: 4px; }.task-title { font-size: 18px; font-weight: bold; color: #15803d; margin: 0 0 10px 0; }.task-description { color: #555; margin: 10px 0; font-size: 14px; }.task-meta { color: #666; font-size: 13px; margin: 10px 0; }.button { display: inline-block; padding: 12px 30px; background-color: #16a34a; color: #fff; text-decoration: none; border-radius: 5px; margin: 20px 0; }.info-box { background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 5px; padding: 15px; margin: 20px 0; }.footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }</style></head><body><div class="container"><div class="header"><div class="logo">AgriTech</div></div><div class="content"><h2>Task Due Tomorrow</h2><p>Hi <strong>{{firstName}}</strong>,</p><p>This is a friendly reminder that the following task is due <strong>tomorrow</strong>:</p><div class="task-box"><div class="task-title">{{taskTitle}}</div><div class="task-description">{{taskDescription}}</div><div class="task-meta"><strong>Due Date:</strong> {{dueDate}}</div></div><div class="info-box"><p>Please make sure to complete this task on time to avoid delays.</p></div><p style="text-align: center;"><a href="{{taskUrl}}" class="button">View Task Details</a></p></div><div class="footer"><p>&copy; 2025 AgriTech. All rights reserved.</p></div></div></body></html>`,
        text_body: 'Task Due Tomorrow\n\nHi {{firstName}},\n\nTask: {{taskTitle}}\nDescription: {{taskDescription}}\nDue Date: {{dueDate}}\n\nView: {{taskUrl}}',
        variables: ['firstName', 'taskTitle', 'taskDescription', 'dueDate', 'taskUrl', 'reminderType'],
        is_system: true,
      },
      {
        name: 'Task Due Today',
        description: 'Sent when a task is due today',
        type: 'task_due_today',
        category: EmailTemplateCategory.TASK,
        subject: 'URGENT: Task Due TODAY - {{taskTitle}}',
        html_body: `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Task Due Today - AgriTech</title><style>body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }.container { border: 1px solid #ddd; border-radius: 8px; padding: 30px; background-color: #f9f9f9; }.header { text-align: center; margin-bottom: 30px; }.logo { font-size: 24px; font-weight: bold; color: #f59e0b; }.content { background-color: #fff; padding: 20px; border-radius: 6px; }.task-box { background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px; }.task-title { font-size: 18px; font-weight: bold; color: #d97706; margin: 0 0 10px 0; }.task-description { color: #555; margin: 10px 0; font-size: 14px; }.task-meta { color: #666; font-size: 13px; margin: 10px 0; }.urgent-notice { background-color: #fee2e2; border: 2px solid #dc2626; border-radius: 5px; padding: 15px; margin: 20px 0; color: #991b1b; font-weight: bold; }.button { display: inline-block; padding: 12px 30px; background-color: #f59e0b; color: #fff; text-decoration: none; border-radius: 5px; margin: 20px 0; }.info-box { background-color: #fffbeb; border: 1px solid #fcd34d; border-radius: 5px; padding: 15px; margin: 20px 0; }.footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }</style></head><body><div class="container"><div class="header"><div class="logo">AgriTech</div></div><div class="content"><h2>Task Due TODAY</h2><p>Hi <strong>{{firstName}}</strong>,</p><div class="urgent-notice">URGENT: This task is due TODAY!</div><p>The following task requires your immediate attention:</p><div class="task-box"><div class="task-title">{{taskTitle}}</div><div class="task-description">{{taskDescription}}</div><div class="task-meta"><strong>Due Date:</strong> {{dueDate}}</div></div><div class="info-box"><p>Please complete this task as soon as possible to avoid it becoming overdue.</p></div><p style="text-align: center;"><a href="{{taskUrl}}" class="button">Complete Task Now</a></p></div><div class="footer"><p>&copy; 2025 AgriTech. All rights reserved.</p></div></div></body></html>`,
        text_body: 'URGENT: Task Due TODAY\n\nHi {{firstName}},\n\nTask: {{taskTitle}}\nDescription: {{taskDescription}}\nDue Date: {{dueDate}}\n\nComplete now: {{taskUrl}}',
        variables: ['firstName', 'taskTitle', 'taskDescription', 'dueDate', 'taskUrl', 'reminderType'],
        is_system: true,
      },
      {
        name: 'Task Overdue',
        description: 'Sent when a task is past its due date',
        type: 'task_overdue',
        category: EmailTemplateCategory.TASK,
        subject: 'OVERDUE: {{taskTitle}}',
        html_body: `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Task Overdue - AgriTech</title><style>body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }.container { border: 1px solid #ddd; border-radius: 8px; padding: 30px; background-color: #f9f9f9; }.header { text-align: center; margin-bottom: 30px; }.logo { font-size: 24px; font-weight: bold; color: #dc2626; }.content { background-color: #fff; padding: 20px; border-radius: 6px; }.task-box { background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; border-radius: 4px; }.task-title { font-size: 18px; font-weight: bold; color: #991b1b; margin: 0 0 10px 0; }.task-description { color: #555; margin: 10px 0; font-size: 14px; }.task-meta { color: #666; font-size: 13px; margin: 10px 0; }.critical-notice { background-color: #fee2e2; border: 2px solid #dc2626; border-radius: 5px; padding: 15px; margin: 20px 0; color: #991b1b; font-weight: bold; font-size: 16px; }.status-badge { display: inline-block; background-color: #dc2626; color: white; padding: 5px 12px; border-radius: 4px; font-weight: bold; font-size: 12px; margin-top: 10px; }.button { display: inline-block; padding: 12px 30px; background-color: #dc2626; color: #fff; text-decoration: none; border-radius: 5px; margin: 20px 0; }.info-box { background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 5px; padding: 15px; margin: 20px 0; }.footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }</style></head><body><div class="container"><div class="header"><div class="logo">AgriTech</div></div><div class="content"><h2>Task OVERDUE</h2><p>Hi <strong>{{firstName}}</strong>,</p><div class="critical-notice">CRITICAL: This task is now OVERDUE!</div><p>The following task requires your immediate attention:</p><div class="task-box"><div class="task-title">{{taskTitle}}</div><div class="task-description">{{taskDescription}}</div><div class="task-meta"><strong>Was Due:</strong> {{dueDate}}</div><div class="status-badge">OVERDUE</div></div><div class="info-box"><p><strong>This task is now overdue and requires immediate action.</strong> Please complete it as soon as possible.</p></div><p style="text-align: center;"><a href="{{taskUrl}}" class="button">Complete Task Immediately</a></p></div><div class="footer"><p>&copy; 2025 AgriTech. All rights reserved.</p></div></div></body></html>`,
        text_body: 'OVERDUE Task\n\nHi {{firstName}},\n\nTask: {{taskTitle}}\nDescription: {{taskDescription}}\nWas Due: {{dueDate}}\n\nComplete immediately: {{taskUrl}}',
        variables: ['firstName', 'taskTitle', 'taskDescription', 'dueDate', 'taskUrl', 'reminderType'],
        is_system: true,
      },
      {
        name: 'Audit Reminder',
        description: 'Sent as a reminder for upcoming compliance audits',
        type: 'audit_reminder',
        category: EmailTemplateCategory.REMINDER,
        subject: 'Rappel d\'Audit - {{certificationType}}',
        html_body: `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Rappel d'Audit - AgriTech</title><style>body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }.container { border: 1px solid #ddd; border-radius: 8px; padding: 30px; background-color: #f9f9f9; }.header { text-align: center; margin-bottom: 30px; }.logo { font-size: 24px; font-weight: bold; color: #16a34a; }.content { background-color: #fff; padding: 20px; border-radius: 6px; }.audit-box { background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px; }.audit-title { font-size: 18px; font-weight: bold; color: #92400e; margin: 0 0 10px 0; }.audit-meta { color: #666; font-size: 14px; margin: 10px 0; }.button { display: inline-block; padding: 12px 30px; background-color: #16a34a; color: #fff; text-decoration: none; border-radius: 5px; margin: 20px 0; }.checklist { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 5px; padding: 15px; margin: 20px 0; }.footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }</style></head><body><div class="container"><div class="header"><div class="logo">AgriTech</div></div><div class="content"><h2>Rappel d'Audit</h2><p>Bonjour <strong>{{firstName}}</strong>,</p><p>Ceci est un rappel pour votre prochain audit de certification :</p><div class="audit-box"><div class="audit-title">{{certificationType}}</div><div class="audit-meta"><strong>Numero de certification :</strong> {{certificationNumber}}<br><strong>Date d'audit :</strong> {{auditDate}}</div></div><div class="checklist"><strong>Liste de verification avant l'audit :</strong><br>- Tous les documents sont a jour<br>- Les registres de tracabilite sont complets<br>- Les controles de conformite sont effectues<br>- Le personnel est informe de l'audit<br>- Les non-conformites precedentes sont resolues</div><p style="text-align: center;"><a href="{{dashboardUrl}}" class="button">Voir les Details</a></p></div><div class="footer"><p>&copy; 2026 AgriTech. Tous droits reserves.</p></div></div></body></html>`,
        text_body: 'Rappel d\'Audit\n\nBonjour {{firstName}},\n\nCertification: {{certificationType}}\nNumero: {{certificationNumber}}\nDate d\'audit: {{auditDate}}\n\nVoir: {{dashboardUrl}}',
        variables: ['firstName', 'certificationType', 'certificationNumber', 'auditDate', 'reminderType', 'dashboardUrl'],
        is_system: true,
      },
    ];
  }

  private async verifyOrganizationAccess(
    userId: string,
    organizationId: string,
  ): Promise<void> {
    const client = this.databaseService.getAdminClient();
    const { data, error } = await client
      .from('organization_users')
      .select('id')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      throw new NotFoundException('Organization not found or access denied');
    }
  }

  async seedDefaultsIfEmpty(organizationId: string): Promise<number> {
    const client = this.databaseService.getAdminClient();

    const { count } = await client
      .from('email_templates')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId);

    if (count && count > 0) {
      return 0;
    }

    const defaults = this.getDefaultTemplates();
    let seeded = 0;

    for (const template of defaults) {
      const { error } = await client
        .from('email_templates')
        .insert({
          ...template,
          organization_id: organizationId,
        });

      if (!error) {
        seeded++;
      } else {
        this.logger.error(`Failed to seed email template "${template.type}": ${error.message}`);
      }
    }

    if (seeded > 0) {
      this.logger.log(`Seeded ${seeded} default email templates for org ${organizationId}`);
    }

    return seeded;
  }

  async findAll(
    userId: string,
    organizationId: string,
    category?: EmailTemplateCategory,
  ) {
    await this.verifyOrganizationAccess(userId, organizationId);

    await this.seedDefaultsIfEmpty(organizationId);

    const client = this.databaseService.getAdminClient();
    let query = client
      .from('email_templates')
      .select('*')
      .eq('organization_id', organizationId)
      .order('category')
      .order('name');

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) {
      throw new BadRequestException(`Failed to fetch email templates: ${error.message}`);
    }

    return data || [];
  }

  async findOne(
    userId: string,
    organizationId: string,
    templateId: string,
  ) {
    await this.verifyOrganizationAccess(userId, organizationId);

    const client = this.databaseService.getAdminClient();
    const { data, error } = await client
      .from('email_templates')
      .select('*')
      .eq('id', templateId)
      .eq('organization_id', organizationId)
      .single();

    if (error || !data) {
      throw new NotFoundException('Email template not found');
    }

    return data;
  }

  async findByType(
    userId: string,
    organizationId: string,
    type: string,
  ) {
    await this.verifyOrganizationAccess(userId, organizationId);

    const client = this.databaseService.getAdminClient();
    const { data, error } = await client
      .from('email_templates')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('type', type)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      throw new BadRequestException(`Failed to fetch email template: ${error.message}`);
    }

    return data;
  }

  async create(
    userId: string,
    organizationId: string,
    dto: CreateEmailTemplateDto,
  ) {
    await this.verifyOrganizationAccess(userId, organizationId);

    const client = this.databaseService.getAdminClient();

    const { data, error } = await client
      .from('email_templates')
      .insert({
        ...dto,
        organization_id: organizationId,
        created_by: userId,
        is_system: false,
        is_active: dto.is_active ?? true,
        variables: dto.variables ?? [],
      })
      .select()
      .single();

    if (error) {
      throw new BadRequestException(`Failed to create email template: ${error.message}`);
    }

    return data;
  }

  async update(
    userId: string,
    organizationId: string,
    templateId: string,
    dto: UpdateEmailTemplateDto,
  ) {
    await this.verifyOrganizationAccess(userId, organizationId);

    const client = this.databaseService.getAdminClient();

    const { data: existing } = await client
      .from('email_templates')
      .select('id')
      .eq('id', templateId)
      .eq('organization_id', organizationId)
      .single();

    if (!existing) {
      throw new NotFoundException('Email template not found');
    }

    const { data, error } = await client
      .from('email_templates')
      .update({
        ...dto,
        updated_at: new Date().toISOString(),
      })
      .eq('id', templateId)
      .eq('organization_id', organizationId)
      .select()
      .single();

    if (error) {
      throw new BadRequestException(`Failed to update email template: ${error.message}`);
    }

    return data;
  }

  async delete(
    userId: string,
    organizationId: string,
    templateId: string,
  ) {
    await this.verifyOrganizationAccess(userId, organizationId);

    const client = this.databaseService.getAdminClient();

    const { data: existing } = await client
      .from('email_templates')
      .select('is_system')
      .eq('id', templateId)
      .eq('organization_id', organizationId)
      .single();

    if (!existing) {
      throw new NotFoundException('Email template not found');
    }

    if (existing.is_system) {
      const { error } = await client
        .from('email_templates')
        .update({ is_active: false })
        .eq('id', templateId)
        .eq('organization_id', organizationId);

      if (error) {
        throw new BadRequestException(`Failed to deactivate system template: ${error.message}`);
      }
      return { message: 'System template deactivated (cannot be deleted)' };
    }

    const { error } = await client
      .from('email_templates')
      .delete()
      .eq('id', templateId)
      .eq('organization_id', organizationId);

    if (error) {
      throw new BadRequestException(`Failed to delete email template: ${error.message}`);
    }

    return { message: 'Template deleted successfully' };
  }

  async duplicate(
    userId: string,
    organizationId: string,
    templateId: string,
    newName?: string,
  ) {
    await this.verifyOrganizationAccess(userId, organizationId);

    const client = this.databaseService.getAdminClient();

    const { data: original } = await client
      .from('email_templates')
      .select('*')
      .eq('id', templateId)
      .eq('organization_id', organizationId)
      .single();

    if (!original) {
      throw new NotFoundException('Email template not found');
    }

    const { id, created_at, updated_at, created_by, is_system, ...templateData } = original;

    const { data, error } = await client
      .from('email_templates')
      .insert({
        ...templateData,
        name: newName || `${original.name} (Copy)`,
        type: `${original.type}_copy_${Date.now()}`,
        is_system: false,
        created_by: userId,
      })
      .select()
      .single();

    if (error) {
      throw new BadRequestException(`Failed to duplicate email template: ${error.message}`);
    }

    return data;
  }

  private getDefaultTemplates(): SeedEmailTemplate[] {
    return [
      {
        name: 'Quote Request Received',
        description: 'Sent to seller when a buyer requests a quote on the marketplace',
        type: 'quote_request_received',
        category: EmailTemplateCategory.MARKETPLACE,
        subject: 'Nouvelle demande de devis - {{productTitle}}',
        html_body: `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px}.header{background:linear-gradient(135deg,#10b981 0%,#059669 100%);color:white;padding:30px;border-radius:10px 10px 0 0;text-align:center}.header h1{margin:0;font-size:24px}.content{background:#fff;border:1px solid #e5e7eb;border-top:none;padding:30px;border-radius:0 0 10px 10px}.info-row{margin:15px 0;padding:10px;background:#f9fafb;border-left:3px solid #10b981;border-radius:4px}.info-label{font-weight:600;color:#059669;margin-bottom:5px}.button{display:inline-block;padding:12px 30px;background:#10b981;color:white!important;text-decoration:none;border-radius:6px;font-weight:600;margin:20px 0;text-align:center}.footer{text-align:center;color:#6b7280;font-size:14px;margin-top:30px;padding-top:20px;border-top:1px solid #e5e7eb}</style></head><body><div class="header"><h1>Nouvelle Demande de Devis</h1></div><div class="content"><p>Bonjour,</p><p>Vous avez reçu une nouvelle demande de devis sur AgriTech Marketplace.</p><div class="info-row"><div class="info-label">Produit:</div><div><strong>{{productTitle}}</strong></div></div><div class="info-row"><div class="info-label">Client:</div><div>{{buyerName}}</div></div><div class="info-row"><div class="info-label">Email:</div><div><a href="mailto:{{buyerEmail}}">{{buyerEmail}}</a></div></div><div style="text-align:center"><a href="{{quoteRequestUrl}}" class="button">Répondre à la demande</a></div></div><div class="footer"><p>© 2025 AgroGina</p></div></body></html>`,
        text_body: 'Nouvelle Demande de Devis\n\nProduit: {{productTitle}}\nClient: {{buyerName}}\nEmail: {{buyerEmail}}\n\nRépondre: {{quoteRequestUrl}}',
        variables: ['productTitle', 'buyerName', 'buyerEmail', 'buyerPhone', 'requestedQuantity', 'unitOfMeasure', 'message', 'quoteRequestUrl'],
        is_system: true,
      },
      {
        name: 'Quote Response Sent',
        description: 'Sent to buyer when a seller responds to their quote request',
        type: 'quote_response_sent',
        category: EmailTemplateCategory.MARKETPLACE,
        subject: 'Réponse à votre demande de devis - {{productTitle}}',
        html_body: `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px}.header{background:linear-gradient(135deg,#10b981 0%,#059669 100%);color:white;padding:30px;border-radius:10px 10px 0 0;text-align:center}.header h1{margin:0;font-size:24px}.content{background:#fff;border:1px solid #e5e7eb;border-top:none;padding:30px;border-radius:0 0 10px 10px}.info-row{margin:15px 0;padding:10px;background:#f9fafb;border-left:3px solid #10b981;border-radius:4px}.price-box{background:linear-gradient(135deg,#ecfdf5 0%,#d1fae5 100%);padding:20px;border-radius:8px;margin:20px 0;text-align:center;border:2px solid #10b981}.price-box .price{font-size:32px;font-weight:700;color:#059669}.button{display:inline-block;padding:12px 30px;background:#10b981;color:white!important;text-decoration:none;border-radius:6px;font-weight:600;margin:20px 0;text-align:center}.footer{text-align:center;color:#6b7280;font-size:14px;margin-top:30px;padding-top:20px;border-top:1px solid #e5e7eb}</style></head><body><div class="header"><h1>Devis Reçu</h1></div><div class="content"><p>Bonjour {{buyerName}},</p><p>{{sellerName}} a répondu à votre demande de devis pour <strong>{{productTitle}}</strong>.</p><div class="info-row"><div class="info-label">Produit:</div><div><strong>{{productTitle}}</strong></div></div><div class="price-box"><div style="color:#059669;font-weight:600;margin-bottom:5px">Prix proposé</div><div class="price">{{quotedPrice}} {{currency}}</div></div><div style="text-align:center"><a href="{{quoteRequestUrl}}" class="button">Consulter le devis</a></div></div><div class="footer"><p>© 2025 AgroGina</p></div></body></html>`,
        text_body: 'Devis Reçu\n\nBonjour {{buyerName}},\n\n{{sellerName}} a répondu à votre demande de devis pour {{productTitle}}.\nPrix proposé: {{quotedPrice}} {{currency}}\n\nConsulter: {{quoteRequestUrl}}',
        variables: ['buyerName', 'sellerName', 'productTitle', 'quotedPrice', 'currency', 'requestedQuantity', 'unitOfMeasure', 'sellerResponse', 'validUntil', 'quoteRequestUrl'],
        is_system: true,
      },
      {
        name: 'Order Confirmed',
        description: 'Sent to buyer when their marketplace order is confirmed',
        type: 'order_confirmed',
        category: EmailTemplateCategory.ORDER,
        subject: 'Commande confirmée #{{orderNumber}} - AgroGina Marketplace',
        html_body: `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px}.header{background:linear-gradient(135deg,#10b981 0%,#059669 100%);color:white;padding:30px;border-radius:10px 10px 0 0;text-align:center}.header h1{margin:0;font-size:24px}.content{background:#fff;border:1px solid #e5e7eb;border-top:none;padding:30px;border-radius:0 0 10px 10px}.order-number{background:#f0fdf4;padding:15px;border-radius:8px;margin:20px 0;text-align:center;border:2px solid #10b981}.order-number strong{font-size:20px;color:#059669}.info-row{margin:15px 0;padding:10px;background:#f9fafb;border-left:3px solid #10b981;border-radius:4px}.button{display:inline-block;padding:12px 30px;background:#10b981;color:white!important;text-decoration:none;border-radius:6px;font-weight:600;margin:20px 0;text-align:center}.footer{text-align:center;color:#6b7280;font-size:14px;margin-top:30px;padding-top:20px;border-top:1px solid #e5e7eb}</style></head><body><div class="header"><h1>Commande Confirmée!</h1></div><div class="content"><p>Bonjour {{buyerName}},</p><p>Nous avons bien reçu votre commande. Merci pour votre confiance!</p><div class="order-number"><strong>Commande #{{orderNumber}}</strong></div><div class="info-row"><strong>Vendeur:</strong> {{sellerName}}</div><div class="info-row"><strong>Total:</strong> {{totalAmount}} {{currency}}</div><div style="text-align:center"><a href="{{orderUrl}}" class="button">Voir ma commande</a></div></div><div class="footer"><p>© 2025 AgroGina Marketplace</p></div></body></html>`,
        text_body: 'Commande Confirmée!\n\nBonjour {{buyerName}},\n\nCommande #{{orderNumber}}\nVendeur: {{sellerName}}\nTotal: {{totalAmount}} {{currency}}\n\nVoir: {{orderUrl}}',
        variables: ['buyerName', 'orderNumber', 'sellerName', 'totalAmount', 'currency', 'shippingAddress', 'orderUrl', 'items'],
        is_system: true,
      },
      {
        name: 'New Order to Seller',
        description: 'Sent to seller when a new marketplace order is placed',
        type: 'new_order_to_seller',
        category: EmailTemplateCategory.ORDER,
        subject: 'Nouvelle commande #{{orderNumber}} - AgroGina Marketplace',
        html_body: `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px}.header{background:linear-gradient(135deg,#6366f1 0%,#4f46e5 100%);color:white;padding:30px;border-radius:10px 10px 0 0;text-align:center}.header h1{margin:0;font-size:24px}.content{background:#fff;border:1px solid #e5e7eb;border-top:none;padding:30px;border-radius:0 0 10px 10px}.info-row{margin:15px 0;padding:10px;background:#f9fafb;border-left:3px solid #6366f1;border-radius:4px}.button{display:inline-block;padding:12px 30px;background:#6366f1;color:white!important;text-decoration:none;border-radius:6px;font-weight:600;margin:20px 0;text-align:center}.footer{text-align:center;color:#6b7280;font-size:14px;margin-top:30px;padding-top:20px;border-top:1px solid #e5e7eb}</style></head><body><div class="header"><h1>Nouvelle Commande!</h1></div><div class="content"><p><strong>Vous avez reçu une nouvelle commande #{{orderNumber}}</strong></p><p>Client: <strong>{{buyerName}}</strong></p><div class="info-row"><strong>Total:</strong> {{totalAmount}} {{currency}}</div><div class="info-row"><strong>Adresse de livraison:</strong><br>{{shippingAddress}}</div><div style="text-align:center"><a href="{{orderUrl}}" class="button">Gérer cette commande</a></div></div><div class="footer"><p>© 2025 AgroGina Marketplace</p></div></body></html>`,
        text_body: 'Nouvelle Commande!\n\nCommande #{{orderNumber}}\nClient: {{buyerName}}\nTotal: {{totalAmount}} {{currency}}\n\nGérer: {{orderUrl}}',
        variables: ['buyerName', 'orderNumber', 'sellerName', 'totalAmount', 'currency', 'shippingAddress', 'orderUrl', 'items'],
        is_system: true,
      },
      {
        name: 'Order Status Update',
        description: 'Sent to buyer when their order status changes (shipped, delivered, cancelled)',
        type: 'order_status_update',
        category: EmailTemplateCategory.ORDER,
        subject: 'Commande #{{orderNumber}} {{statusText}} - AgroGina Marketplace',
        html_body: `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px}.header{background:linear-gradient(135deg,#3b82f6 0%,#2563eb 100%);color:white;padding:30px;border-radius:10px 10px 0 0;text-align:center}.header h1{margin:0;font-size:24px}.content{background:#fff;border:1px solid #e5e7eb;border-top:none;padding:30px;border-radius:0 0 10px 10px}.status-message{background:#eff6ff;padding:20px;border-radius:8px;margin:20px 0;text-align:center;border:2px solid #3b82f6}.button{display:inline-block;padding:12px 30px;background:#3b82f6;color:white!important;text-decoration:none;border-radius:6px;font-weight:600;margin:20px 0;text-align:center}.footer{text-align:center;color:#6b7280;font-size:14px;margin-top:30px;padding-top:20px;border-top:1px solid #e5e7eb}</style></head><body><div class="header"><h1>Mise à jour de commande</h1></div><div class="content"><p>Bonjour {{buyerName}},</p><div class="status-message"><h2 style="margin:0;color:#3b82f6">Commande #{{orderNumber}}</h2><p style="margin:15px 0 0 0;font-size:16px">{{statusMessage}}</p></div><div style="text-align:center"><a href="{{orderUrl}}" class="button">Voir ma commande</a></div></div><div class="footer"><p>© 2025 AgroGina Marketplace</p></div></body></html>`,
        text_body: 'Mise à jour de commande\n\nBonjour {{buyerName}},\n\nCommande #{{orderNumber}}\n{{statusMessage}}\n\nVoir: {{orderUrl}}',
        variables: ['buyerName', 'orderNumber', 'status', 'statusText', 'statusMessage', 'orderUrl'],
        is_system: true,
      },
      {
        name: 'Invoice Email',
        description: 'Sent with invoice details to customer or supplier',
        type: 'invoice_email',
        category: EmailTemplateCategory.INVOICE,
        subject: 'Facture {{invoiceNumber}} - {{organizationName}}',
        html_body: `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px}.header{background:linear-gradient(135deg,#10b981 0%,#059669 100%);color:white;padding:30px;border-radius:10px 10px 0 0;text-align:center}.header h1{margin:0;font-size:24px}.content{background:#fff;border:1px solid #e5e7eb;border-top:none;padding:30px;border-radius:0 0 10px 10px}.invoice-number{background:#f0fdf4;padding:15px;border-radius:8px;margin:20px 0;text-align:center;border:2px solid #10b981}.invoice-number strong{font-size:20px;color:#059669}.info-row{margin:15px 0;padding:10px;background:#f9fafb;border-left:3px solid #10b981;border-radius:4px}.button{display:inline-block;padding:12px 30px;background:#10b981;color:white!important;text-decoration:none;border-radius:6px;font-weight:600;margin:20px 0;text-align:center}.footer{text-align:center;color:#6b7280;font-size:14px;margin-top:30px;padding-top:20px;border-top:1px solid #e5e7eb}</style></head><body><div class="header"><h1>{{invoiceTypeLabel}}</h1></div><div class="content"><p>Bonjour {{partyName}},</p><p>{{invoiceIntro}}</p><div class="invoice-number"><strong>Facture #{{invoiceNumber}}</strong></div><div class="info-row"><strong>Date:</strong> {{invoiceDate}}</div><div class="info-row"><strong>Échéance:</strong> {{dueDate}}</div><div class="info-row"><strong>Total TTC:</strong> {{grandTotal}} {{currency}}</div>{{#invoiceUrl}}<div style="text-align:center"><a href="{{invoiceUrl}}" class="button">Voir la facture</a></div>{{/invoiceUrl}}</div><div class="footer"><p>{{organizationName}}<br>Envoyé via AGROGINA</p></div></body></html>`,
        text_body: 'Facture\n\nBonjour {{partyName}},\n\nFacture #{{invoiceNumber}}\nDate: {{invoiceDate}}\nÉchéance: {{dueDate}}\nTotal TTC: {{grandTotal}} {{currency}}\n\n{{organizationName}}\nEnvoyé via AGROGINA',
        variables: ['partyName', 'invoiceNumber', 'invoiceType', 'invoiceTypeLabel', 'invoiceIntro', 'organizationName', 'invoiceDate', 'dueDate', 'subtotal', 'taxAmount', 'grandTotal', 'currency', 'items', 'notes', 'invoiceUrl'],
        is_system: true,
      },
      {
        name: 'Task Assignment',
        description: 'Sent to a worker when they are assigned a new task',
        type: 'task_assigned',
        category: EmailTemplateCategory.TASK,
        subject: 'Nouvelle tâche assignée: {{taskTitle}}',
        html_body: `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px}.header{background:linear-gradient(135deg,#f59e0b 0%,#d97706 100%);color:white;padding:30px;border-radius:10px 10px 0 0;text-align:center}.header h1{margin:0;font-size:24px}.content{background:#fff;border:1px solid #e5e7eb;border-top:none;padding:30px;border-radius:0 0 10px 10px}.info-row{margin:15px 0;padding:10px;background:#fffbeb;border-left:3px solid #f59e0b;border-radius:4px}.button{display:inline-block;padding:12px 30px;background:#f59e0b;color:white!important;text-decoration:none;border-radius:6px;font-weight:600;margin:20px 0;text-align:center}.footer{text-align:center;color:#6b7280;font-size:14px;margin-top:30px;padding-top:20px;border-top:1px solid #e5e7eb}</style></head><body><div class="header"><h1>Nouvelle Tâche</h1></div><div class="content"><p>Bonjour,</p><p><strong>{{assignerName}}</strong> vous a assigné une nouvelle tâche.</p><div class="info-row"><strong>Tâche:</strong> {{taskTitle}}</div><div class="info-row"><strong>Priorité:</strong> {{priority}}</div><div class="info-row"><strong>Échéance:</strong> {{dueDate}}</div><div style="text-align:center"><a href="{{taskUrl}}" class="button">Voir la tâche</a></div></div><div class="footer"><p>© 2025 AgroGina</p></div></body></html>`,
        text_body: 'Nouvelle Tâche\n\n{{assignerName}} vous a assigné une nouvelle tâche.\n\nTâche: {{taskTitle}}\nPriorité: {{priority}}\nÉchéance: {{dueDate}}\n\nVoir: {{taskUrl}}',
        variables: ['taskTitle', 'taskId', 'assignerName', 'priority', 'dueDate', 'taskUrl'],
        is_system: true,
      },
      {
        name: 'Low Stock Alert',
        description: 'Sent to managers when inventory items fall below minimum stock levels',
        type: 'low_stock_alert',
        category: EmailTemplateCategory.REMINDER,
        subject: 'Alerte stock faible: {{itemName}}',
        html_body: `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;padding:20px}.header{background:linear-gradient(135deg,#ef4444 0%,#dc2626 100%);color:white;padding:30px;border-radius:10px 10px 0 0;text-align:center}.header h1{margin:0;font-size:24px}.content{background:#fff;border:1px solid #e5e7eb;border-top:none;padding:30px;border-radius:0 0 10px 10px}.alert-box{background:#fef2f2;padding:20px;border-radius:8px;margin:20px 0;border:2px solid #ef4444}.info-row{margin:15px 0;padding:10px;background:#fef2f2;border-left:3px solid #ef4444;border-radius:4px}.footer{text-align:center;color:#6b7280;font-size:14px;margin-top:30px;padding-top:20px;border-top:1px solid #e5e7eb}</style></head><body><div class="header"><h1>Alerte Stock Faible</h1></div><div class="content"><div class="alert-box"><h2 style="margin:0;color:#dc2626">{{itemName}}</h2></div><div class="info-row"><strong>Stock actuel:</strong> {{currentQuantity}} {{unit}}</div><div class="info-row"><strong>Minimum requis:</strong> {{minimumStock}} {{unit}}</div><div class="info-row"><strong>Manque:</strong> {{shortageQuantity}} {{unit}}</div></div><div class="footer"><p>© 2025 AgroGina</p></div></body></html>`,
        text_body: 'Alerte Stock Faible\n\n{{itemName}}\nStock actuel: {{currentQuantity}} {{unit}}\nMinimum: {{minimumStock}} {{unit}}\nManque: {{shortageQuantity}} {{unit}}\n\n© 2025 AgroGina',
        variables: ['itemName', 'itemId', 'currentQuantity', 'minimumStock', 'unit', 'shortageQuantity'],
        is_system: true,
      },
    ];
  }
}
