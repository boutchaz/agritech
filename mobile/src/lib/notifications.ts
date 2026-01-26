import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Task } from './api';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
    priority: Notifications.AndroidNotificationPriority.HIGH,
  }),
});

export async function registerForPushNotifications() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return;
  }
}

export async function scheduleTaskReminder(task: Task) {
  if (!task.due_date || task.status === 'completed' || task.status === 'cancelled') {
    return;
  }

  const dueDate = new Date(task.due_date);
  const now = new Date();

  // Schedule for due date at 8:00 AM
  const dueNotificationDate = new Date(dueDate);
  dueNotificationDate.setHours(8, 0, 0, 0);

  if (dueNotificationDate > now) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Task Due Today',
        body: `Task "${task.title}" is due today.`,
        data: { taskId: task.id },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: dueNotificationDate },
    });
  }

  // Schedule for 1 day before at 8:00 AM
  const reminderDate = new Date(dueDate);
  reminderDate.setDate(reminderDate.getDate() - 1);
  reminderDate.setHours(8, 0, 0, 0);

  if (reminderDate > now) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Task Due Tomorrow',
        body: `Task "${task.title}" is due tomorrow.`,
        data: { taskId: task.id },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: reminderDate },
    });
  }
}

export async function cancelTaskReminders(taskId: string) {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const notification of scheduled) {
    if (notification.content.data?.taskId === taskId) {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
    }
  }
}
