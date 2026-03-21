import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DatabaseService } from '../database/database.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/dto/notification.dto';
import { EmailService } from '../email/email.service';
import { UpdateUserPreferencesDto, UserPreferencesResponseDto } from './dto/user-preferences.dto';

@Injectable()
export class RemindersService {
  private readonly logger = new Logger(RemindersService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly notificationsService: NotificationsService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Check for tasks due in next 24 hours
   * Runs every day at 8:00 AM UTC
   */
  @Cron('0 8 * * *', { name: 'check-due-tasks', timeZone: 'UTC' })
  async checkDueTasks() {
    this.logger.log('Running daily task due date check...');

    const client = this.databaseService.getAdminClient();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(23, 59, 59, 999);

    // Find tasks due tomorrow that haven't been reminded
    const { data: tasks, error } = await client
      .from('tasks')
      .select(`
        id,
        title,
        description,
        due_date,
        organization_id,
        assigned_user_id,
        worker:workers!assigned_to(user_id)
      `)
      .in('status', ['pending', 'assigned', 'in_progress'])
      .lte('due_date', tomorrow.toISOString().split('T')[0])
      .is('completed_date', null);

    if (error) {
      this.logger.error(`Failed to fetch due tasks: ${error.message}`);
      return;
    }

    for (const task of tasks || []) {
      await this.sendTaskReminder(task, 'due_soon');
    }

    this.logger.log(`Processed ${tasks?.length || 0} due task reminders`);
  }

  /**
   * Check for overdue tasks
   * Runs every 6 hours
   */
  @Cron('0 */6 * * *', { name: 'check-overdue-tasks', timeZone: 'UTC' })
  async checkOverdueTasks() {
    this.logger.log('Running overdue task check...');

    const client = this.databaseService.getAdminClient();
    const today = new Date().toISOString().split('T')[0];

    // Find overdue tasks
    const { data: tasks, error } = await client
      .from('tasks')
      .select(`
        id,
        title,
        description,
        due_date,
        organization_id,
        assigned_user_id,
        worker:workers!assigned_to(user_id)
      `)
      .lt('due_date', today)
      .in('status', ['pending', 'assigned', 'in_progress'])
      .is('completed_date', null);

    if (error) {
      this.logger.error(`Failed to fetch overdue tasks: ${error.message}`);
      return;
    }

    for (const task of tasks || []) {
      const daysOverdue = this.calculateDaysOverdue(task.due_date);

      if (daysOverdue === 1) {
        await this.sendTaskReminder(task, 'overdue_1d');
      } else if (daysOverdue === 3) {
        await this.sendTaskReminder(task, 'overdue_3d');
      } else if (daysOverdue === 7) {
        await this.sendTaskReminder(task, 'overdue_7d');
      } else if (daysOverdue === 14) {
        await this.sendTaskReminder(task, 'overdue_14d');
      }
    }

    this.logger.log(`Processed ${tasks?.length || 0} overdue task alerts`);
  }

  /**
   * Send task reminder notification
   */
  private async sendTaskReminder(task: any, reminderType: string) {
    const client = this.databaseService.getAdminClient();

    // Check if reminder already sent
    const { data: existingReminder } = await client
      .from('task_reminders')
      .select('id')
      .eq('task_id', task.id)
      .eq('reminder_type', reminderType)
      .not('sent_at', 'is', null)
      .maybeSingle();

    if (existingReminder) {
      this.logger.debug(`Reminder already sent for task ${task.id} (${reminderType})`);
      return;
    }

    // Get user ID (from assigned_user_id or worker.user_id)
    const userId = task.assigned_user_id || task.worker?.user_id;
    if (!userId) {
      this.logger.warn(`No user assigned to task ${task.id}, skipping reminder`);
      return;
    }

    // Check user preferences
    const { data: prefs } = await client
      .from('user_notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .eq('organization_id', task.organization_id)
      .maybeSingle();

    if (prefs && !prefs.task_reminders_enabled) {
      this.logger.debug(`User ${userId} has disabled task reminders`);
      return;
    }

    // Create notification
    const notificationTitle = this.getReminderTitle(reminderType, task);
    const notificationMessage = this.getReminderMessage(reminderType, task);

    const notification = await this.notificationsService.createNotification({
      userId,
      organizationId: task.organization_id,
      type: NotificationType.TASK_REMINDER,
      title: notificationTitle,
      message: notificationMessage,
      data: {
        taskId: task.id,
        reminderType,
        dueDate: task.due_date,
      },
    });

    // Send email if enabled
    let emailSent = false;
    if (!prefs || prefs.email_notifications) {
      emailSent = await this.sendReminderEmail(userId, task, reminderType);
    }

    // Record reminder
    await client.from('task_reminders').insert({
      task_id: task.id,
      reminder_type: reminderType,
      scheduled_for: new Date().toISOString(),
      sent_at: new Date().toISOString(),
      notification_id: notification.id,
      email_sent: emailSent,
    });

    this.logger.log(`Sent ${reminderType} reminder for task ${task.id} to user ${userId}`);
  }

  private getReminderTitle(type: string, task: any): string {
    switch (type) {
      case 'due_soon':
        return `Task Due Tomorrow: ${task.title}`;
      case 'due_today':
        return `Task Due Today: ${task.title}`;
      case 'overdue_1d':
        return `Task Overdue: ${task.title}`;
      case 'overdue_3d':
        return `Task 3 Days Overdue: ${task.title}`;
      case 'overdue_7d':
        return `Task 1 Week Overdue: ${task.title}`;
      case 'overdue_14d':
        return `Task 2 Weeks Overdue: ${task.title}`;
      default:
        return `Task Reminder: ${task.title}`;
    }
  }

  private getReminderMessage(type: string, task: any): string {
    const dueDate = new Date(task.due_date).toLocaleDateString();

    switch (type) {
      case 'due_soon':
        return `This task is due tomorrow (${dueDate}). Please complete it soon.`;
      case 'due_today':
        return `This task is due today (${dueDate}). Please complete it as soon as possible.`;
      case 'overdue_1d':
        return `This task was due on ${dueDate} and is now 1 day overdue.`;
      case 'overdue_3d':
        return `This task was due on ${dueDate} and is now 3 days overdue. Immediate action required.`;
      case 'overdue_7d':
        return `This task was due on ${dueDate} and is now 1 week overdue. Escalating priority.`;
      case 'overdue_14d':
        return `This task was due on ${dueDate} and is now 2 weeks overdue. Requires management attention.`;
      default:
        return `Task due date: ${dueDate}`;
    }
  }

  private async sendReminderEmail(userId: string, task: any, reminderType: string): Promise<boolean> {
    // Get user email
    const client = this.databaseService.getAdminClient();
    const { data: profile } = await client
      .from('user_profiles')
      .select('email, first_name')
      .eq('id', userId)
      .maybeSingle();

    if (!profile?.email) {
      return false;
    }

    const templateName = this.getEmailTemplate(reminderType);

    return this.emailService.sendEmail({
      to: profile.email,
      subject: this.getReminderTitle(reminderType, task),
      template: templateName,
      context: {
        firstName: profile.first_name || 'User',
        taskTitle: task.title,
        taskDescription: task.description || 'No description',
        dueDate: new Date(task.due_date).toLocaleDateString(),
        reminderType,
        taskUrl: `${process.env.FRONTEND_URL}/workforce/tasks`,
      },
    });
  }

  private getEmailTemplate(reminderType: string): string {
    switch (reminderType) {
      case 'due_soon':
        return 'task-due-soon';
      case 'due_today':
        return 'task-due-today';
      case 'overdue_1d':
      case 'overdue_3d':
      case 'overdue_7d':
      case 'overdue_14d':
        return 'task-overdue';
      default:
        return 'task-reminder';
    }
  }

  private calculateDaysOverdue(dueDate: string): number {
    const due = new Date(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);

    const diffTime = today.getTime() - due.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Get user notification preferences
   */
  async getUserPreferences(userId: string, organizationId: string): Promise<UserPreferencesResponseDto | null> {
    const client = this.databaseService.getAdminClient();

    const { data, error } = await client
      .from('user_notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (error) {
      this.logger.error(`Failed to get user preferences: ${error.message}`);
      throw new Error(`Failed to get user preferences: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    return {
      id: data.id,
      userId: data.user_id,
      organizationId: data.organization_id,
      taskRemindersEnabled: data.task_reminders_enabled,
      taskReminder1dBefore: data.task_reminder_1d_before,
      taskReminderOnDueDate: data.task_reminder_on_due_date,
      taskOverdueAlerts: data.task_overdue_alerts,
      emailNotifications: data.email_notifications,
      pushNotifications: data.push_notifications,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  /**
   * Update user notification preferences
   */
  async updateUserPreferences(
    userId: string,
    organizationId: string,
    dto: UpdateUserPreferencesDto,
  ): Promise<UserPreferencesResponseDto> {
    const client = this.databaseService.getAdminClient();

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (dto.taskRemindersEnabled !== undefined) {
      updateData.task_reminders_enabled = dto.taskRemindersEnabled;
    }
    if (dto.taskReminder1dBefore !== undefined) {
      updateData.task_reminder_1d_before = dto.taskReminder1dBefore;
    }
    if (dto.taskReminderOnDueDate !== undefined) {
      updateData.task_reminder_on_due_date = dto.taskReminderOnDueDate;
    }
    if (dto.taskOverdueAlerts !== undefined) {
      updateData.task_overdue_alerts = dto.taskOverdueAlerts;
    }
    if (dto.emailNotifications !== undefined) {
      updateData.email_notifications = dto.emailNotifications;
    }
    if (dto.pushNotifications !== undefined) {
      updateData.push_notifications = dto.pushNotifications;
    }

    // Upsert preferences
    const { data, error } = await client
      .from('user_notification_preferences')
      .upsert(
        {
          user_id: userId,
          organization_id: organizationId,
          ...updateData,
        },
        {
          onConflict: 'user_id,organization_id',
        },
      )
      .select()
      .single();

    if (error) {
      this.logger.error(`Failed to update user preferences: ${error.message}`);
      throw new Error(`Failed to update user preferences: ${error.message}`);
    }

    return {
      id: data.id,
      userId: data.user_id,
      organizationId: data.organization_id,
      taskRemindersEnabled: data.task_reminders_enabled,
      taskReminder1dBefore: data.task_reminder_1d_before,
      taskReminderOnDueDate: data.task_reminder_on_due_date,
      taskOverdueAlerts: data.task_overdue_alerts,
      emailNotifications: data.email_notifications,
      pushNotifications: data.push_notifications,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  /**
   * Manually trigger reminder checks (for testing)
   */
  async triggerReminderCheck(): Promise<{ dueTasks: number; overdueTasks: number }> {
    this.logger.log('Manually triggering reminder checks...');

    await this.checkDueTasks();
    await this.checkOverdueTasks();

    return {
      dueTasks: 0, // Would need to track counts in the methods
      overdueTasks: 0,
    };
  }
}
