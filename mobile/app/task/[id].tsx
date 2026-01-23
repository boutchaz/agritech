import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, TextInput, Modal } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, fontSize, shadows } from '@/constants/theme';
import { useTask, useUpdateTaskStatus, useClockIn, useCompleteTask, useAddTaskComment } from '@/hooks/useTasks';
import { format } from 'date-fns';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Image } from 'react-native';

type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

const STATUS_CONFIG: Record<TaskStatus, { color: string; label: string; nextAction: string }> = {
  pending: { color: colors.yellow[500], label: 'Pending', nextAction: 'Start Task' },
  in_progress: { color: colors.blue[500], label: 'In Progress', nextAction: 'Complete Task' },
  completed: { color: colors.primary[500], label: 'Completed', nextAction: '' },
  cancelled: { color: colors.gray[500], label: 'Cancelled', nextAction: '' },
};

const PRIORITY_CONFIG: Record<string, { color: string; label: string }> = {
  low: { color: colors.gray[500], label: 'Low' },
  medium: { color: colors.blue[500], label: 'Medium' },
  high: { color: colors.yellow[600], label: 'High' },
  urgent: { color: colors.red[500], label: 'Urgent' },
};

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [isLocating, setIsLocating] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completionNotes, setCompletionNotes] = useState('');

  const { data: task, isLoading, error, refetch } = useTask(id || '');
  const updateStatusMutation = useUpdateTaskStatus();
  const clockInMutation = useClockIn();
  const completeTaskMutation = useCompleteTask();
  const addCommentMutation = useAddTaskComment();

  const status = task ? STATUS_CONFIG[task.status as TaskStatus] : null;
  const priority = task ? PRIORITY_CONFIG[task.priority] : null;

  const getCurrentLocation = async (): Promise<{ lat: number; lng: number } | null> => {
    setIsLocating(true);
    try {
      const { status: permStatus } = await Location.requestForegroundPermissionsAsync();
      if (permStatus !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is recommended for task tracking');
        return null;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      return { lat: loc.coords.latitude, lng: loc.coords.longitude };
    } catch (error) {
      console.error('Location error:', error);
      return null;
    } finally {
      setIsLocating(false);
    }
  };

  const handleAddPhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Camera permission is needed to take photos');
      return;
    }

    Alert.alert(
      'Add Photo',
      'Choose photo source',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Camera',
          onPress: async () => {
            const result = await ImagePicker.launchCameraAsync({
              mediaTypes: 'images',
              quality: 0.8,
              allowsEditing: true,
            });

            if (!result.canceled && result.assets[0]) {
              // TODO: Upload photo to server
              Alert.alert('Photo Added', 'Photo will be uploaded when you save the task');
            }
          },
        },
        {
          text: 'Gallery',
          onPress: async () => {
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: 'images',
              quality: 0.8,
            });

            if (!result.canceled && result.assets[0]) {
              // TODO: Upload photo to server
              Alert.alert('Photo Added', 'Photo will be uploaded when you save the task');
            }
          },
        },
      ]
    );
  };

  const handleAddNote = async () => {
    if (!noteText.trim()) {
      Alert.alert('Error', 'Please enter a note');
      return;
    }

    try {
      await addCommentMutation.mutateAsync({
        taskId: task!.id,
        content: noteText,
      });
      setNoteText('');
      setShowNoteModal(false);
      Alert.alert('Success', 'Note added successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to add note');
    }
  };

  const handleStatusChange = async () => {
    if (!task) return;

    if (task.status === 'pending') {
      Alert.alert('Start Task', 'Mark this task as in progress?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start',
          onPress: async () => {
            try {
              const location = await getCurrentLocation();
              await updateStatusMutation.mutateAsync({
                taskId: task.id,
                status: 'in_progress',
              });
              await clockInMutation.mutateAsync({
                taskId: task.id,
                location: location || undefined,
              });
              refetch();
            } catch (error) {
              Alert.alert('Error', 'Failed to start task. Please try again.');
            }
          },
        },
      ]);
    } else if (task.status === 'in_progress') {
      setShowCompleteModal(true);
    }
  };

  const handleCompleteTask = async () => {
    if (!task) return;

    try {
      await completeTaskMutation.mutateAsync({
        taskId: task.id,
        data: {
          notes: completionNotes || undefined,
          completion_data: {},
        },
      });
      setShowCompleteModal(false);
      setCompletionNotes('');
      Alert.alert('Success', 'Task completed successfully', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to complete task. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary[600]} />
        <Text style={styles.loadingText}>Loading task...</Text>
      </View>
    );
  }

  if (error || !task) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.gray[400]} />
        <Text style={styles.errorTitle}>Task Not Found</Text>
        <Text style={styles.errorText}>
          {error instanceof Error ? error.message : 'This task could not be loaded.'}
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => router.back()}>
          <Text style={styles.retryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const dueDate = task.due_date ? format(new Date(task.due_date), 'MMM dd, yyyy') : 'No due date';
  const createdAt = task.created_at ? format(new Date(task.created_at), 'MMM dd, yyyy • HH:mm') : '';

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Task Details',
          headerRight: () => (
            <TouchableOpacity onPress={() => {}}>
              <Ionicons name="ellipsis-horizontal" size={24} color={colors.white} />
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          {status && (
            <View style={[styles.statusBadge, { backgroundColor: status.color + '20' }]}>
              <View style={[styles.statusDot, { backgroundColor: status.color }]} />
              <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
            </View>
          )}
          {priority && (
            <View style={styles.priorityBadge}>
              <Ionicons name="flag" size={14} color={priority.color} />
              <Text style={[styles.priorityText, { color: priority.color }]}>{priority.label} Priority</Text>
            </View>
          )}
        </View>

        <Text style={styles.title}>{task.title}</Text>

        <View style={styles.metaGrid}>
          <View style={styles.metaItem}>
            <Ionicons name="location-outline" size={18} color={colors.gray[500]} />
            <View style={styles.metaContent}>
              <Text style={styles.metaLabel}>Location</Text>
              <Text style={styles.metaValue}>
                {task.parcel?.name || 'Unassigned'} {task.farm?.name ? `• ${task.farm.name}` : ''}
              </Text>
            </View>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="calendar-outline" size={18} color={colors.gray[500]} />
            <View style={styles.metaContent}>
              <Text style={styles.metaLabel}>Due Date</Text>
              <Text style={styles.metaValue}>{dueDate}</Text>
            </View>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={18} color={colors.gray[500]} />
            <View style={styles.metaContent}>
              <Text style={styles.metaLabel}>Created</Text>
              <Text style={styles.metaValue}>{createdAt}</Text>
            </View>
          </View>
          {task.assigned_worker && (
            <View style={styles.metaItem}>
              <Ionicons name="person-outline" size={18} color={colors.gray[500]} />
              <View style={styles.metaContent}>
                <Text style={styles.metaLabel}>Assigned To</Text>
                <Text style={styles.metaValue}>
                  {task.assigned_worker.first_name} {task.assigned_worker.last_name}
                </Text>
              </View>
            </View>
          )}
        </View>

        {task.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <View style={styles.card}>
              <Text style={styles.description}>{task.description}</Text>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity style={styles.actionButton} onPress={handleAddPhoto}>
              <Ionicons name="camera-outline" size={24} color={colors.primary[600]} />
              <Text style={styles.actionText}>Add Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={() => Alert.alert('Coming Soon', 'Voice notes feature coming soon')}>
              <Ionicons name="mic-outline" size={24} color={colors.primary[600]} />
              <Text style={styles.actionText}>Voice Note</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={() => setShowNoteModal(true)}>
              <Ionicons name="document-text-outline" size={24} color={colors.primary[600]} />
              <Text style={styles.actionText}>Add Note</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={() => router.push(`/task/${task.id}/report-issue`)}>
              <Ionicons name="alert-circle-outline" size={24} color={colors.red[500]} />
              <Text style={[styles.actionText, { color: colors.red[500] }]}>Report Issue</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {task.status !== 'completed' && task.status !== 'cancelled' && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.mainButton,
              { backgroundColor: task.status === 'pending' ? colors.blue[600] : colors.primary[600] },
            ]}
            onPress={handleStatusChange}
            disabled={updateStatusMutation.isPending || clockInMutation.isPending || isLocating}
          >
            {updateStatusMutation.isPending || clockInMutation.isPending || isLocating ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <>
                <Ionicons
                  name={task.status === 'pending' ? 'play' : 'checkmark'}
                  size={24}
                  color={colors.white}
                />
                <Text style={styles.mainButtonText}>{status?.nextAction}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Add Note Modal */}
      <Modal
        visible={showNoteModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowNoteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Note</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter your note..."
              value={noteText}
              onChangeText={setNoteText}
              multiline
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setShowNoteModal(false);
                  setNoteText('');
                }}
              >
                <Text style={styles.modalButtonTextCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={handleAddNote}
                disabled={addCommentMutation.isPending}
              >
                {addCommentMutation.isPending ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text style={styles.modalButtonTextConfirm}>Add Note</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Complete Task Modal */}
      <Modal
        visible={showCompleteModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCompleteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Complete Task</Text>
            <Text style={styles.modalSubtitle}>Add any completion notes (optional)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="How did the task go? Any issues?"
              value={completionNotes}
              onChangeText={setCompletionNotes}
              multiline
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setShowCompleteModal(false);
                  setCompletionNotes('');
                }}
              >
                <Text style={styles.modalButtonTextCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={handleCompleteTask}
                disabled={completeTaskMutation.isPending}
              >
                {completeTaskMutation.isPending ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text style={styles.modalButtonTextConfirm}>Complete</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[50],
  },
  content: {
    padding: spacing.md,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.gray[50],
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: fontSize.base,
    color: colors.gray[600],
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.gray[50],
    padding: spacing.xl,
  },
  errorTitle: {
    fontSize: fontSize.xl,
    fontWeight: '600',
    color: colors.gray[900],
    marginTop: spacing.md,
  },
  errorText: {
    fontSize: fontSize.base,
    color: colors.gray[600],
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  retryButton: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary[600],
    borderRadius: borderRadius.lg,
  },
  retryButtonText: {
    color: colors.white,
    fontSize: fontSize.base,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.xs,
  },
  statusText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priorityText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    marginLeft: spacing.xs,
  },
  title: {
    fontSize: fontSize['2xl'],
    fontWeight: '700',
    color: colors.gray[900],
    marginBottom: spacing.md,
  },
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    width: '50%',
    marginBottom: spacing.md,
  },
  metaContent: {
    marginLeft: spacing.sm,
  },
  metaLabel: {
    fontSize: fontSize.xs,
    color: colors.gray[500],
  },
  metaValue: {
    fontSize: fontSize.base,
    color: colors.gray[900],
    fontWeight: '500',
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.gray[500],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.sm,
  },
  description: {
    fontSize: fontSize.base,
    color: colors.gray[700],
    lineHeight: 24,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.xs,
  },
  actionButton: {
    width: '50%',
    padding: spacing.xs,
  },
  actionText: {
    fontSize: fontSize.sm,
    color: colors.primary[600],
    fontWeight: '500',
    marginTop: spacing.xs,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
    ...shadows.lg,
  },
  mainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
  },
  mainButtonText: {
    color: colors.white,
    fontSize: fontSize.lg,
    fontWeight: '600',
    marginLeft: spacing.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.xl,
  },
  modalTitle: {
    fontSize: fontSize.xl,
    fontWeight: '600',
    color: colors.gray[900],
    marginBottom: spacing.xs,
  },
  modalSubtitle: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
    marginBottom: spacing.md,
  },
  modalInput: {
    backgroundColor: colors.gray[50],
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    fontSize: fontSize.base,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: spacing.md,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  modalButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: colors.gray[100],
  },
  modalButtonConfirm: {
    backgroundColor: colors.primary[600],
  },
  modalButtonTextCancel: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.gray[700],
  },
  modalButtonTextConfirm: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.white,
  },
});
