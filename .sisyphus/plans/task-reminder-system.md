# Task Reminder & Notification System - Implementation Plan

**Created**: 2026-01-26  
**Status**: Ready for Implementation  
**Priority**: HIGH

---

## 📋 OVERVIEW

Implement a comprehensive task reminder and notification system that proactively alerts users about upcoming due dates, overdue tasks, and other time-sensitive items across all modules (Tasks, Invoices, Utilities, Compliance).

---

## 🎯 OBJECTIVES

1. **Automated Reminders**: Send notifications before tasks are due
2. **Overdue Alerts**: Alert users when tasks become overdue
3. **Multi-Channel**: Support in-app, email, and mobile push notifications
4. **Configurable**: Allow users to customize reminder preferences
5. **Scalable**: Support all modules with due dates (Tasks, Invoices, Utilities, Compliance)

---

## 📊 CURRENT STATE

### ✅ Existing Infrastructure
- Email Service (Nodemailer + SMTP)
- Notification Service (WebSocket + Database)
- Task Management (full CRUD)
- Due date fields in database

### ❌ Missing Components
- Task scheduler (@nestjs/schedule)
- Automated reminder logic
- Reminder tracking in database
- Mobile push notification integration
- Email reminder templates

---

## 🏗️ IMPLEMENTATION PHASES

### **PHASE 1: Backend Scheduler & Reminder Service** 🔴 HIGH PRIORITY

#### 1.1 Install Dependencies
```bash
cd agritech-api
npm install @nestjs/schedule --legacy-peer-deps
```

#### 1.2 Database Migration
**File**: `project/supabase/migrations/YYYYMMDDHHMMSS_add_task_reminders.sql`

```sql
-- Task reminders tracking table
CREATE TABLE IF NOT EXISTS task_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('due_soon', 'due_today', 'overdue_1d', 'overdue_3d')),
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  notification_id UUID REFERENCES notifications(id),
  email_sent BOOLEAN DEFAULT false,
  push_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_task_reminders_scheduled ON task_reminders(scheduled_for) WHERE sent_at IS NULL;
CREATE INDEX idx_task_reminders_task ON task_reminders(task_id);
CREATE INDEX idx_task_reminders_type ON task_reminders(reminder_type);

-- User notification preferences
CREATE TABLE IF NOT EXISTS user_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  task_reminders_enabled BOOLEAN DEFAULT true,
  task_reminder_1d_before BOOLEAN DEFAULT true,
  task_reminder_on_due_date BOOLEAN DEFAULT true,
  task_overdue_alerts BOOLEAN DEFAULT true,
  email_notifications BOOLEAN DEFAULT true,
  push_notifications BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, organization_id)
);

-- RLS Policies
ALTER TABLE task_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their task reminders"
  ON task_reminders FOR SELECT
  USING (
    task_id IN (
      SELECT t.id FROM tasks t
      INNER JOIN organization_users ou ON ou.organization_id = t.organization_id
      WHERE ou.user_id = auth.uid() AND ou.is_active = true
    )
  );

CREATE POLICY "Users can manage their notification preferences"
  ON user_notification_preferences FOR ALL
  USING (user_id = auth.uid());

-- Comments
COMMENT ON TABLE task_reminders IS 'Tracks scheduled and sent task reminders';
COMMENT ON TABLE user_notification_preferences IS 'User preferences for notification delivery';
```

#### 1.3 Create Reminders Module
**Directory Structure**:
```
agritech-api/src/modules/reminders/
├── reminders.module.ts
├── reminders.service.ts
├── reminders.controller.ts
├── dto/
│   ├── create-reminder.dto.ts
│   ├── reminder-config.dto.ts
│   └── user-preferences.dto.ts
└── interfaces/
    └── reminder-rule.interface.ts
```

**Key Files**:

**`reminders.module.ts`**:
```typescript
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { RemindersService } from './reminders.service';
import { RemindersController } from './reminders.controller';
import { DatabaseModule } from '../database/database.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    DatabaseModule,
    NotificationsModule,
    EmailModule,
  ],
  controllers: [RemindersController],
  providers: [RemindersService],
  exports: [RemindersService],
})
export class RemindersModule {}
```

**`reminders.service.ts`** (Core Logic):
```typescript
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DatabaseService } from '../database/database.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailService } from '../email/email.service';

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
   * Runs every day at 8:00 AM
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
      .eq('status', 'pending')
      .eq('status', 'assigned')
      .eq('status', 'in_progress')
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
      type: 'TASK_REMINDER',
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
}
```

**`reminders.controller.ts`**:
```typescript
import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RemindersService } from './reminders.service';
import { CurrentUser } from '../auth/current-user.decorator';

@ApiTags('reminders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reminders')
export class RemindersController {
  constructor(private readonly remindersService: RemindersService) {}

  @Get('preferences')
  @ApiOperation({ summary: 'Get user notification preferences' })
  async getPreferences(@CurrentUser() user: any) {
    // Implementation
  }

  @Post('preferences')
  @ApiOperation({ summary: 'Update user notification preferences' })
  async updatePreferences(@CurrentUser() user: any, @Body() dto: any) {
    // Implementation
  }

  @Post('test')
  @ApiOperation({ summary: 'Trigger reminder check manually (for testing)' })
  async testReminders() {
    // Implementation
  }
}
```

#### 1.4 Register Module in App
**File**: `agritech-api/src/app.module.ts`

Add `RemindersModule` to imports array.

---

### **PHASE 2: Email Templates** 🟡 MEDIUM PRIORITY

#### 2.1 Create Email Templates
**Directory**: `agritech-api/src/modules/email/templates/`

**`task-due-soon.hbs`**:
```handlebars
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #16a34a; color: white; padding: 20px; text-align: center; }
    .content { background: #f9fafb; padding: 30px; border-radius: 8px; margin: 20px 0; }
    .task-info { background: white; padding: 20px; border-left: 4px solid #f59e0b; margin: 20px 0; }
    .button { display: inline-block; background: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⏰ Task Due Tomorrow</h1>
    </div>
    
    <div class="content">
      <p>Hi {{firstName}},</p>
      
      <p>This is a friendly reminder that the following task is due <strong>tomorrow</strong>:</p>
      
      <div class="task-info">
        <h2>{{taskTitle}}</h2>
        <p>{{taskDescription}}</p>
        <p><strong>Due Date:</strong> {{dueDate}}</p>
      </div>
      
      <p>Please make sure to complete this task on time to avoid delays.</p>
      
      <a href="{{taskUrl}}" class="button">View Task Details</a>
    </div>
    
    <div class="footer">
      <p>AgriTech Platform - Task Management System</p>
      <p>You're receiving this because you have task reminders enabled.</p>
    </div>
  </div>
</body>
</html>
```

**`task-due-today.hbs`**:
```handlebars
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #f59e0b; color: white; padding: 20px; text-align: center; }
    .content { background: #fffbeb; padding: 30px; border-radius: 8px; margin: 20px 0; }
    .task-info { background: white; padding: 20px; border-left: 4px solid #f59e0b; margin: 20px 0; }
    .urgent { color: #dc2626; font-weight: bold; }
    .button { display: inline-block; background: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔥 Task Due TODAY</h1>
    </div>
    
    <div class="content">
      <p>Hi {{firstName}},</p>
      
      <p class="urgent">⚠️ URGENT: This task is due TODAY!</p>
      
      <div class="task-info">
        <h2>{{taskTitle}}</h2>
        <p>{{taskDescription}}</p>
        <p><strong>Due Date:</strong> {{dueDate}}</p>
      </div>
      
      <p>Please complete this task as soon as possible to avoid it becoming overdue.</p>
      
      <a href="{{taskUrl}}" class="button">Complete Task Now</a>
    </div>
    
    <div class="footer">
      <p>AgriTech Platform - Task Management System</p>
      <p>You're receiving this because you have task reminders enabled.</p>
    </div>
  </div>
</body>
</html>
```

**`task-overdue.hbs`**:
```handlebars
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #dc2626; color: white; padding: 20px; text-align: center; }
    .content { background: #fef2f2; padding: 30px; border-radius: 8px; margin: 20px 0; }
    .task-info { background: white; padding: 20px; border-left: 4px solid #dc2626; margin: 20px 0; }
    .critical { color: #dc2626; font-weight: bold; font-size: 18px; }
    .button { display: inline-block; background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚨 Task OVERDUE</h1>
    </div>
    
    <div class="content">
      <p>Hi {{firstName}},</p>
      
      <p class="critical">⚠️ CRITICAL: This task is now OVERDUE!</p>
      
      <div class="task-info">
        <h2>{{taskTitle}}</h2>
        <p>{{taskDescription}}</p>
        <p><strong>Was Due:</strong> {{dueDate}}</p>
        <p style="color: #dc2626;"><strong>Status:</strong> OVERDUE</p>
      </div>
      
      <p>This task requires immediate attention. Please complete it as soon as possible.</p>
      
      <a href="{{taskUrl}}" class="button">Complete Task Immediately</a>
    </div>
    
    <div class="footer">
      <p>AgriTech Platform - Task Management System</p>
      <p>You're receiving this because you have task reminders enabled.</p>
    </div>
  </div>
</body>
</html>
```

---

### **PHASE 3: Mobile Push Notifications** 🟡 MEDIUM PRIORITY

#### 3.1 Configure Expo Notifications
**File**: `mobile/app/_layout.tsx`

Add notification configuration and request permissions.

#### 3.2 Create Notification Service
**File**: `mobile/src/lib/notifications.ts`

```typescript
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotifications() {
  if (!Device.isDevice) {
    console.log('Push notifications only work on physical devices');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Failed to get push notification permissions');
    return null;
  }

  const token = (await Notifications.getExpoPushTokenAsync()).data;
  console.log('Expo Push Token:', token);

  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#16a34a',
    });
  }

  return token;
}

export async function scheduleTaskReminder(task: any) {
  if (!task.due_date) return;

  const dueDate = new Date(task.due_date);
  const oneDayBefore = new Date(dueDate.getTime() - 24 * 60 * 60 * 1000);
  
  // Schedule notification for 1 day before
  if (oneDayBefore > new Date()) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `Task Due Tomorrow: ${task.title}`,
        body: task.description || 'No description',
        data: { taskId: task.id, type: 'task_reminder' },
        sound: true,
      },
      trigger: oneDayBefore,
    });
  }

  // Schedule notification on due date
  if (dueDate > new Date()) {
    const dueDateMorning = new Date(dueDate);
    dueDateMorning.setHours(8, 0, 0, 0);
    
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `Task Due Today: ${task.title}`,
        body: task.description || 'No description',
        data: { taskId: task.id, type: 'task_due_today' },
        sound: true,
        priority: 'high',
      },
      trigger: dueDateMorning,
    });
  }
}

export async function cancelTaskReminders(taskId: string) {
  const notifications = await Notifications.getAllScheduledNotificationsAsync();
  
  for (const notification of notifications) {
    if (notification.content.data?.taskId === taskId) {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
    }
  }
}
```

#### 3.3 Integrate in Task Hooks
**File**: `mobile/src/hooks/useTasks.ts`

Add notification scheduling when tasks are created/updated.

---

### **PHASE 4: User Preferences UI** 🟢 LOW PRIORITY

#### 4.1 Create Preferences Page
**File**: `project/src/routes/_authenticated/(settings)/settings/notifications.tsx`

Allow users to configure:
- Enable/disable task reminders
- Choose reminder timing (1 day before, on due date, etc.)
- Email vs push notification preferences
- Quiet hours

---

## 📝 IMPLEMENTATION CHECKLIST

### Backend (NestJS)
- [ ] Install @nestjs/schedule package
- [ ] Create database migration for task_reminders table
- [ ] Create database migration for user_notification_preferences table
- [ ] Create reminders module structure
- [ ] Implement RemindersService with cron jobs
- [ ] Implement RemindersController for preferences
- [ ] Register RemindersModule in AppModule
- [ ] Create email templates (task-due-soon, task-due-today, task-overdue)
- [ ] Test cron jobs manually
- [ ] Test email sending
- [ ] Test notification creation

### Mobile (React Native)
- [ ] Configure expo-notifications
- [ ] Request notification permissions
- [ ] Create notification service
- [ ] Integrate with task creation/update
- [ ] Handle notification taps
- [ ] Test local notifications
- [ ] Test push notifications

### Frontend (Web)
- [ ] Create notification preferences page
- [ ] Add preferences API integration
- [ ] Update user settings menu
- [ ] Test preferences saving

### Testing
- [ ] Unit tests for RemindersService
- [ ] Integration tests for cron jobs
- [ ] E2E tests for notification flow
- [ ] Manual testing with real tasks
- [ ] Performance testing with large task volumes

---

## 🚀 DEPLOYMENT STEPS

1. **Database Migration**: Run migration on staging/production
2. **Backend Deployment**: Deploy updated NestJS API
3. **Mobile App Update**: Release new version with notifications
4. **Frontend Deployment**: Deploy updated web app
5. **Monitoring**: Monitor cron job execution and notification delivery
6. **User Communication**: Announce new feature to users

---

## 📊 SUCCESS METRICS

- [ ] Cron jobs running successfully (check logs)
- [ ] Reminders sent for 100% of eligible tasks
- [ ] Email delivery rate > 95%
- [ ] Push notification delivery rate > 90%
- [ ] User engagement with reminders > 70%
- [ ] Task completion rate improvement > 10%

---

## 🔧 MAINTENANCE

- Monitor cron job execution daily
- Review notification delivery rates weekly
- Collect user feedback on reminder timing
- Adjust reminder schedules based on usage patterns
- Add more reminder types as needed (invoices, utilities, compliance)

---

## 📚 REFERENCES

- NestJS Schedule: https://docs.nestjs.com/techniques/task-scheduling
- Expo Notifications: https://docs.expo.dev/versions/latest/sdk/notifications/
- Nodemailer: https://nodemailer.com/
- Handlebars Templates: https://handlebarsjs.com/

---

**END OF IMPLEMENTATION PLAN**
