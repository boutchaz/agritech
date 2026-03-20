import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { colors, spacing, borderRadius, fontSize, shadows } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import { useTimeTrackingStore } from '@/stores/timeTrackingStore';
import { useMyTasks, useClockIn, useClockOut } from '@/hooks/useTasks';
import { useQueryClient } from '@tanstack/react-query';
import { taskKeys } from '@/hooks/useTasks';

type ClockStatus = 'clocked_out' | 'clocked_in';

export default function ClockScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { activeSession, setActiveSession, clearActiveSession, isLoading: sessionLoading } =
    useTimeTrackingStore();

  const [elapsedTime, setElapsedTime] = useState(0);
  const [location, setLocation] = useState<string>('');
  const [isLocating, setIsLocating] = useState(false);
  const [locationCoords, setLocationCoords] = useState<{ lat: number; lng: number } | null>(null);

  const { data: tasks, isLoading: tasksLoading } = useMyTasks();
  const clockInMutation = useClockIn();
  const clockOutMutation = useClockOut();

  const status: ClockStatus = activeSession?.timeLogId ? 'clocked_in' : 'clocked_out';

  // Calculate elapsed time for active session
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (status === 'clocked_in' && activeSession?.clockInTime) {
      const clockIn = new Date(activeSession.clockInTime).getTime();
      interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - clockIn) / 1000);
        setElapsedTime(elapsed);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [status, activeSession]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}`;
  };

  const getCurrentLocation = async (): Promise<{ lat: number; lng: number; name: string } | null> => {
    setIsLocating(true);
    try {
      const { status: permStatus } = await Location.requestForegroundPermissionsAsync();
      if (permStatus !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is recommended for clock-in');
        return null;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const [address] = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });

      const locationStr = address
        ? `${address.name || ''}, ${address.city || ''}`.replace(/^,\s*/, '')
        : `${loc.coords.latitude.toFixed(4)}, ${loc.coords.longitude.toFixed(4)}`;

      const coords = { lat: loc.coords.latitude, lng: loc.coords.longitude };
      setLocationCoords(coords);
      setLocation(locationStr);

      return { ...coords, name: locationStr };
    } catch (error) {
      console.error('Location error:', error);
      return null;
    } finally {
      setIsLocating(false);
    }
  };

  const handleClockIn = async () => {
    // Find an active task to clock into
    const activeTask = tasks?.find((t) => t.status === 'in_progress');

    if (!activeTask) {
      // Show task selection modal or redirect to tasks
      Alert.alert(
        'No Active Task',
        'You need to start a task first. Go to your tasks and start one.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Go to Tasks', onPress: () => router.push('/(drawer)/(tabs)/tasks') },
        ]
      );
      return;
    }

    const loc = await getCurrentLocation();
    if (!loc) {
      // Proceed even without location
    }

    try {
      const result = await clockInMutation.mutateAsync({
        taskId: activeTask.id,
        location: loc ? { lat: loc.lat, lng: loc.lng } : undefined,
      });

      setActiveSession({
        timeLogId: result.id,
        taskId: activeTask.id,
        task: activeTask,
        clockInTime: result.clock_in,
        location: loc ? { lat: loc.lat, lng: loc.lng } : null,
      });

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(activeTask.id) });
      queryClient.invalidateQueries({ queryKey: taskKeys.myTasks() });
    } catch (error) {
      Alert.alert('Error', 'Failed to clock in. Please try again.');
    }
  };

  const handleClockOut = async () => {
    if (!activeSession?.timeLogId || !activeSession?.taskId) {
      Alert.alert('Error', 'No active session found.');
      return;
    }

    const loc = await getCurrentLocation();

    Alert.alert(
      'Clock Out',
      'Add any notes for this session?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clock Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await clockOutMutation.mutateAsync({
                timeLogId: activeSession.timeLogId,
                taskId: activeSession.taskId!,
                location: loc ? { lat: loc.lat, lng: loc.lng } : undefined,
              });

              clearActiveSession();
              setElapsedTime(0);
              setLocation('');
              setLocationCoords(null);

              // Invalidate queries to refresh data
              queryClient.invalidateQueries({ queryKey: taskKeys.detail(activeSession.taskId!) });
              queryClient.invalidateQueries({ queryKey: taskKeys.myTasks() });
            } catch (error) {
              Alert.alert('Error', 'Failed to clock out. Please try again.');
            }
          },
        },
      ]
    );
  };

  // Get active task for display
  const activeTask = activeSession?.task;
  const inProgressTasks = tasks?.filter((t) => t.status === 'in_progress') || [];
  const hasActiveTask = inProgressTasks.length > 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.gray[50] }}>
    <PageHeader title="Clock" showBack={false} />
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.clockCard}>
        <View style={styles.statusIndicator}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: status === 'clocked_in' ? colors.primary[500] : colors.gray[300] },
            ]}
          />
          <Text style={styles.statusText}>
            {status === 'clocked_in' ? 'Currently Working' : 'Not Clocked In'}
          </Text>
        </View>

        <Text style={styles.timer}>{formatTime(elapsedTime)}</Text>

        {activeTask && (
          <View style={styles.activeTaskCard}>
            <Ionicons name="checkbox-outline" size={16} color={colors.primary[600]} />
            <Text style={styles.activeTaskText}>{activeTask.title}</Text>
          </View>
        )}

        {location && status === 'clocked_in' && (
          <View style={styles.locationInfo}>
            <Ionicons name="location" size={16} color={colors.gray[500]} />
            <Text style={styles.locationText} numberOfLines={1}>
              {location}
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.clockButton,
            status === 'clocked_in' ? styles.clockOutButton : styles.clockInButton,
            (!status === 'clocked_in' && !hasActiveTask) || clockInMutation.isPending || clockOutMutation.isPending
              ? styles.clockButtonDisabled
              : '',
          ]}
          onPress={status === 'clocked_in' ? handleClockOut : handleClockIn}
          disabled={
            isLocating ||
            clockInMutation.isPending ||
            clockOutMutation.isPending ||
            (status === 'clocked_out' && !hasActiveTask)
          }
        >
          {isLocating || clockInMutation.isPending || clockOutMutation.isPending ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : status === 'clocked_out' && !hasActiveTask ? (
            <>
              <Ionicons name="warning" size={28} color={colors.gray[400]} />
              <Text style={styles.clockButtonText}>Start a Task First</Text>
            </>
          ) : (
            <>
              <Ionicons
                name={status === 'clocked_in' ? 'stop-circle' : 'play-circle'}
                size={28}
                color={colors.white}
              />
              <Text style={styles.clockButtonText}>
                {status === 'clocked_in' ? 'Clock Out' : 'Clock In'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {status === 'clocked_out' && !hasActiveTask && !tasksLoading && (
          <TouchableOpacity
            style={styles.startTaskButton}
            onPress={() => router.push('/(drawer)/(tabs)/tasks')}
          >
            <Text style={styles.startTaskButtonText}>Go to Tasks to Start Working</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.infoSection}>
        <Text style={styles.sectionTitle}>How Time Tracking Works</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoItem}>
            <View style={styles.infoNumber}>
              <Text style={styles.infoNumberText}>1</Text>
            </View>
            <Text style={styles.infoText}>Go to Tasks and start a task</Text>
          </View>
          <View style={styles.infoItem}>
            <View style={styles.infoNumber}>
              <Text style={styles.infoNumberText}>2</Text>
            </View>
            <Text style={styles.infoText}>Come here and clock in</Text>
          </View>
          <View style={styles.infoItem}>
            <View style={styles.infoNumber}>
              <Text style={styles.infoNumberText}>3</Text>
            </View>
            <Text style={styles.infoText}>Clock out when you're done</Text>
          </View>
        </View>
      </View>

      {inProgressTasks.length > 0 && status === 'clocked_out' && (
        <View style={styles.tasksSection}>
          <Text style={styles.sectionTitle}>Active Tasks</Text>
          {inProgressTasks.map((task) => (
            <View key={task.id} style={styles.taskCard}>
              <Text style={styles.taskTitle}>{task.title}</Text>
              <View style={styles.taskMeta}>
                <Ionicons name="location-outline" size={14} color={colors.gray[500]} />
                <Text style={styles.taskMetaText}>
                  {task.parcel?.name || 'Unassigned'} {task.farm?.name ? `• ${task.farm.name}` : ''}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[50],
  },
  content: {
    padding: spacing.md,
  },
  clockCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    ...shadows.md,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: spacing.sm,
  },
  statusText: {
    fontSize: fontSize.base,
    color: colors.gray[600],
    fontWeight: '500',
  },
  timer: {
    fontSize: 48,
    fontWeight: '700',
    color: colors.gray[900],
    fontVariant: ['tabular-nums'],
    marginVertical: spacing.md,
  },
  activeTaskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary[50],
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
  },
  activeTaskText: {
    fontSize: fontSize.sm,
    color: colors.primary[700],
    fontWeight: '600',
    marginLeft: spacing.sm,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  locationText: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
    marginLeft: spacing.xs,
    flex: 1,
  },
  clockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.xl,
    minWidth: 180,
  },
  clockInButton: {
    backgroundColor: colors.primary[600],
  },
  clockOutButton: {
    backgroundColor: colors.red[600],
  },
  clockButtonDisabled: {
    backgroundColor: colors.gray[300],
  },
  clockButtonText: {
    color: colors.white,
    fontSize: fontSize.lg,
    fontWeight: '600',
    marginLeft: spacing.sm,
  },
  startTaskButton: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
  },
  startTaskButtonText: {
    fontSize: fontSize.sm,
    color: colors.primary[600],
    fontWeight: '500',
  },
  infoSection: {
    marginTop: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.gray[900],
    marginBottom: spacing.md,
  },
  infoCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.sm,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  infoNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  infoNumberText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.primary[700],
  },
  infoText: {
    flex: 1,
    fontSize: fontSize.base,
    color: colors.gray[700],
  },
  tasksSection: {
    marginTop: spacing.lg,
  },
  taskCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  taskTitle: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.gray[900],
    marginBottom: spacing.xs,
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  taskMetaText: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
    marginLeft: spacing.xs,
  },
});
