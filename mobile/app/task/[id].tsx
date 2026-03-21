import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
  Animated,
  Pressable,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, fontSize, shadows } from '@/constants/theme';
import {
  useTask,
  useUpdateTaskStatus,
  useClockIn,
  useCompleteTask,
  useAddTaskComment,
  useUploadTaskPhoto,
  useTaskComments,
  useTaskChecklist,
  useToggleChecklistItem,
  useAddChecklistItem,
  useRemoveChecklistItem,
  useTaskDependencies,
} from '@/hooks/useTasks';
import { format } from 'date-fns';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { useState, useRef, useEffect } from 'react';

type TaskStatus = 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold';

const STATUS_CONFIG: Record<TaskStatus, { color: string; label: string; nextAction: string }> = {
  pending: { color: colors.yellow[500], label: 'Pending', nextAction: 'Start Task' },
  assigned: { color: colors.blue[500], label: 'Assigned', nextAction: 'Start Task' },
  in_progress: { color: colors.blue[600], label: 'In Progress', nextAction: 'Complete Task' },
  completed: { color: colors.primary[500], label: 'Completed', nextAction: '' },
  cancelled: { color: colors.gray[500], label: 'Cancelled', nextAction: '' },
  on_hold: { color: colors.yellow[600], label: 'On Hold', nextAction: 'Resume Task' },
};

const PRIORITY_CONFIG: Record<string, { color: string; label: string; icon: keyof typeof Ionicons.glyphMap }> = {
  low: { color: colors.gray[500], label: 'Low', icon: 'flag-outline' },
  medium: { color: colors.blue[500], label: 'Medium', icon: 'flag' },
  high: { color: colors.yellow[600], label: 'High', icon: 'flag' },
  urgent: { color: colors.red[500], label: 'Urgent', icon: 'flag' },
};

function ProgressBar({ percentage }: { percentage: number }) {
  const animatedWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animatedWidth, {
      toValue: percentage,
      duration: 600,
      useNativeDriver: false,
    }).start();
  }, [percentage]);

  const width = animatedWidth.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
    extrapolate: 'clamp',
  });

  return (
    <View style={progressStyles.container}>
      <View style={progressStyles.header}>
        <Text style={progressStyles.label}>Progress</Text>
        <Text style={progressStyles.value}>{Math.round(percentage)}%</Text>
      </View>
      <View style={progressStyles.track}>
        <Animated.View
          style={[
            progressStyles.fill,
            {
              width,
              backgroundColor:
                percentage >= 100
                  ? colors.primary[500]
                  : percentage >= 50
                  ? colors.blue[500]
                  : colors.yellow[500],
            },
          ]}
        />
      </View>
    </View>
  );
}

const progressStyles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.gray[600],
  },
  value: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.gray[900],
  },
  track: {
    height: 8,
    backgroundColor: colors.gray[200],
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
});

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [isLocating, setIsLocating] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completionNotes, setCompletionNotes] = useState('');
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [commentText, setCommentText] = useState('');

  const taskId = id || '';

  const { data: task, isLoading, error, refetch } = useTask(taskId);
  const { data: comments, isLoading: commentsLoading } = useTaskComments(taskId);
  const { data: checklist, isLoading: checklistLoading } = useTaskChecklist(taskId);
  const { data: dependencies } = useTaskDependencies(taskId);

  const updateStatusMutation = useUpdateTaskStatus();
  const clockInMutation = useClockIn();
  const completeTaskMutation = useCompleteTask();
  const addCommentMutation = useAddTaskComment();
  const uploadPhotoMutation = useUploadTaskPhoto();
  const toggleChecklistMutation = useToggleChecklistItem();
  const addChecklistMutation = useAddChecklistItem();
  const removeChecklistMutation = useRemoveChecklistItem();

  const status = task ? STATUS_CONFIG[task.status as TaskStatus] ?? STATUS_CONFIG.pending : null;
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
    } catch (err) {
      console.error('Location error:', err);
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

    Alert.alert('Add Photo', 'Choose photo source', [
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
            try {
              await uploadPhotoMutation.mutateAsync({
                uri: result.assets[0].uri,
                folder: 'tasks',
              });
              Alert.alert('Success', 'Photo uploaded successfully');
              refetch();
            } catch {
              Alert.alert('Error', 'Failed to upload photo');
            }
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
            try {
              await uploadPhotoMutation.mutateAsync({
                uri: result.assets[0].uri,
                folder: 'tasks',
              });
              Alert.alert('Success', 'Photo uploaded successfully');
              refetch();
            } catch {
              Alert.alert('Error', 'Failed to upload photo');
            }
          }
        },
      },
    ]);
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
    } catch {
      Alert.alert('Error', 'Failed to add note');
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    try {
      await addCommentMutation.mutateAsync({
        taskId: task!.id,
        content: commentText,
      });
      setCommentText('');
    } catch {
      Alert.alert('Error', 'Failed to add comment');
    }
  };

  const handleToggleChecklistItem = (itemId: string) => {
    toggleChecklistMutation.mutate({ taskId, itemId });
  };

  const handleAddChecklistItem = () => {
    if (!newChecklistItem.trim()) return;
    addChecklistMutation.mutate(
      { taskId, title: newChecklistItem.trim() },
      {
        onSuccess: () => setNewChecklistItem(''),
      }
    );
  };

  const handleRemoveChecklistItem = (itemId: string, title: string) => {
    Alert.alert('Remove Item', `Remove "${title}" from the checklist?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => removeChecklistMutation.mutate({ taskId, itemId }),
      },
    ]);
  };

  const handleStatusChange = async () => {
    if (!task) return;

    if (task.status === 'pending' || task.status === 'assigned') {
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
            } catch {
              Alert.alert('Error', 'Failed to start task. Please try again.');
            }
          },
        },
      ]);
    } else if (task.status === 'on_hold') {
      Alert.alert('Resume Task', 'Resume this task?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Resume',
          onPress: async () => {
            try {
              await updateStatusMutation.mutateAsync({
                taskId: task.id,
                status: 'in_progress',
              });
              refetch();
            } catch {
              Alert.alert('Error', 'Failed to resume task.');
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
    } catch {
      Alert.alert('Error', 'Failed to complete task. Please try again.');
    }
  };

  // --- Derived data ---
  const checklistItems: any[] = Array.isArray(checklist) ? checklist : [];
  const completedItems = checklistItems.filter((item: any) => item.is_completed || item.completed);
  const hasBlockingDeps =
    dependencies?.depends_on?.some((dep: any) => dep.status !== 'completed') ?? false;
  const dependsOn: any[] = dependencies?.depends_on ?? [];
  const requiredBy: any[] = dependencies?.required_by ?? [];
  const commentsList: any[] = Array.isArray(comments) ? comments : [];

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
  const isDueSoon =
    task.due_date && new Date(task.due_date).getTime() - Date.now() < 2 * 24 * 60 * 60 * 1000;
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed';

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
        {/* (a) Header: Status + Priority + Title */}
        <View style={styles.header}>
          {status && (
            <View style={[styles.statusBadge, { backgroundColor: status.color + '20' }]}>
              <View style={[styles.statusDot, { backgroundColor: status.color }]} />
              <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
            </View>
          )}
          {priority && (
            <View style={styles.priorityBadge}>
              <Ionicons name={priority.icon} size={14} color={priority.color} />
              <Text style={[styles.priorityText, { color: priority.color }]}>
                {priority.label} Priority
              </Text>
            </View>
          )}
        </View>

        <Text style={styles.title}>{task.title}</Text>

        {task.description && (
          <Text style={styles.descriptionInline}>{task.description}</Text>
        )}

        {/* (b) Info Cards */}
        <View style={styles.metaGrid}>
          <View style={styles.metaItem}>
            <Ionicons name="location-outline" size={18} color={colors.gray[500]} />
            <View style={styles.metaContent}>
              <Text style={styles.metaLabel}>Location</Text>
              <Text style={styles.metaValue}>
                {task.parcel?.name || 'Unassigned'}
                {task.farm?.name ? ` \u2022 ${task.farm.name}` : ''}
              </Text>
            </View>
          </View>

          <View style={styles.metaItem}>
            <Ionicons
              name="calendar-outline"
              size={18}
              color={isOverdue ? colors.red[500] : isDueSoon ? colors.yellow[600] : colors.gray[500]}
            />
            <View style={styles.metaContent}>
              <Text style={styles.metaLabel}>Due Date</Text>
              <Text
                style={[
                  styles.metaValue,
                  isOverdue && { color: colors.red[500] },
                  isDueSoon && !isOverdue && { color: colors.yellow[600] },
                ]}
              >
                {dueDate}
                {isOverdue ? ' (Overdue)' : ''}
              </Text>
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

          {task.task_type && (
            <View style={styles.metaItem}>
              <Ionicons name="construct-outline" size={18} color={colors.gray[500]} />
              <View style={styles.metaContent}>
                <Text style={styles.metaLabel}>Task Type</Text>
                <Text style={styles.metaValue}>{task.task_type}</Text>
              </View>
            </View>
          )}

          {task.estimated_duration != null && (
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={18} color={colors.gray[500]} />
              <View style={styles.metaContent}>
                <Text style={styles.metaLabel}>Est. Duration</Text>
                <Text style={styles.metaValue}>
                  {task.estimated_duration >= 60
                    ? `${Math.floor(task.estimated_duration / 60)}h ${task.estimated_duration % 60}m`
                    : `${task.estimated_duration}m`}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* (c) Progress Bar */}
        {task.completion_percentage != null && (
          <ProgressBar percentage={task.completion_percentage} />
        )}

        {/* (d) Dependencies Section */}
        {(dependsOn.length > 0 || requiredBy.length > 0) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Dependencies</Text>
            <View style={styles.card}>
              {hasBlockingDeps && (
                <View style={styles.blockedBanner}>
                  <Ionicons name="warning" size={18} color={colors.yellow[600]} />
                  <Text style={styles.blockedText}>
                    This task is blocked by unfinished dependencies
                  </Text>
                </View>
              )}

              {dependsOn.length > 0 && (
                <>
                  <Text style={styles.depGroupTitle}>Depends on</Text>
                  {dependsOn.map((dep: any) => (
                    <View key={dep.id} style={styles.depItem}>
                      <Ionicons
                        name={
                          dep.status === 'completed' ? 'checkmark-circle' : 'ellipse-outline'
                        }
                        size={18}
                        color={
                          dep.status === 'completed' ? colors.primary[500] : colors.yellow[500]
                        }
                      />
                      <Text style={styles.depItemText} numberOfLines={1}>
                        {dep.title || dep.id}
                      </Text>
                      <Text style={styles.depItemStatus}>
                        {(STATUS_CONFIG[dep.status as TaskStatus] ?? STATUS_CONFIG.pending).label}
                      </Text>
                    </View>
                  ))}
                </>
              )}

              {requiredBy.length > 0 && (
                <>
                  <Text style={[styles.depGroupTitle, dependsOn.length > 0 && { marginTop: spacing.md }]}>
                    Required by
                  </Text>
                  {requiredBy.map((dep: any) => (
                    <View key={dep.id} style={styles.depItem}>
                      <Ionicons name="arrow-forward-circle-outline" size={18} color={colors.gray[500]} />
                      <Text style={styles.depItemText} numberOfLines={1}>
                        {dep.title || dep.id}
                      </Text>
                    </View>
                  ))}
                </>
              )}
            </View>
          </View>
        )}

        {/* (e) Checklist Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Checklist</Text>
            {checklistItems.length > 0 && (
              <Text style={styles.checklistCount}>
                {completedItems.length}/{checklistItems.length} completed
              </Text>
            )}
          </View>
          <View style={styles.card}>
            {checklistLoading ? (
              <ActivityIndicator size="small" color={colors.primary[600]} />
            ) : checklistItems.length === 0 ? (
              <Text style={styles.emptyText}>No checklist items yet</Text>
            ) : (
              checklistItems.map((item: any) => {
                const isChecked = item.is_completed || item.completed;
                return (
                  <Pressable
                    key={item.id}
                    style={styles.checklistItem}
                    onPress={() => handleToggleChecklistItem(item.id)}
                    onLongPress={() => handleRemoveChecklistItem(item.id, item.title)}
                  >
                    <Ionicons
                      name={isChecked ? 'checkbox' : 'square-outline'}
                      size={22}
                      color={isChecked ? colors.primary[500] : colors.gray[400]}
                    />
                    <Text
                      style={[
                        styles.checklistItemText,
                        isChecked && styles.checklistItemTextDone,
                      ]}
                      numberOfLines={2}
                    >
                      {item.title}
                    </Text>
                  </Pressable>
                );
              })
            )}

            <View style={styles.addChecklistRow}>
              <TextInput
                style={styles.addChecklistInput}
                placeholder="Add checklist item..."
                placeholderTextColor={colors.gray[400]}
                value={newChecklistItem}
                onChangeText={setNewChecklistItem}
                onSubmitEditing={handleAddChecklistItem}
                returnKeyType="done"
              />
              <TouchableOpacity
                style={styles.addChecklistButton}
                onPress={handleAddChecklistItem}
                disabled={addChecklistMutation.isPending || !newChecklistItem.trim()}
              >
                {addChecklistMutation.isPending ? (
                  <ActivityIndicator size="small" color={colors.primary[600]} />
                ) : (
                  <Ionicons name="add-circle" size={28} color={colors.primary[600]} />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* (f) Comments Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Comments</Text>
          <View style={styles.card}>
            {commentsLoading ? (
              <ActivityIndicator size="small" color={colors.primary[600]} />
            ) : commentsList.length === 0 ? (
              <Text style={styles.emptyText}>No comments yet</Text>
            ) : (
              commentsList.map((comment: any) => (
                <View key={comment.id} style={styles.commentItem}>
                  <View style={styles.commentHeader}>
                    <View style={styles.commentAvatar}>
                      <Ionicons name="person" size={14} color={colors.white} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.commentUser}>
                        {comment.user?.first_name || comment.author_name || 'User'}{' '}
                        {comment.user?.last_name || ''}
                      </Text>
                      <Text style={styles.commentTime}>
                        {comment.created_at
                          ? format(new Date(comment.created_at), 'MMM dd, yyyy HH:mm')
                          : ''}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.commentContent}>{comment.content}</Text>
                </View>
              ))
            )}

            <View style={styles.addCommentRow}>
              <TextInput
                style={styles.addCommentInput}
                placeholder="Write a comment..."
                placeholderTextColor={colors.gray[400]}
                value={commentText}
                onChangeText={setCommentText}
                multiline
              />
              <TouchableOpacity
                style={styles.addCommentButton}
                onPress={handleAddComment}
                disabled={addCommentMutation.isPending || !commentText.trim()}
              >
                {addCommentMutation.isPending ? (
                  <ActivityIndicator size="small" color={colors.primary[600]} />
                ) : (
                  <Ionicons name="send" size={22} color={colors.primary[600]} />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* (g) Actions Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity style={styles.actionCard} onPress={handleAddPhoto}>
              <View style={[styles.actionIconWrap, { backgroundColor: colors.primary[50] }]}>
                <Ionicons name="camera-outline" size={24} color={colors.primary[600]} />
              </View>
              <Text style={styles.actionText}>Add Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => Alert.alert('Coming Soon', 'Voice notes feature coming soon')}
            >
              <View style={[styles.actionIconWrap, { backgroundColor: colors.blue[50] }]}>
                <Ionicons name="mic-outline" size={24} color={colors.blue[600]} />
              </View>
              <Text style={styles.actionText}>Voice Note</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionCard} onPress={() => setShowNoteModal(true)}>
              <View style={[styles.actionIconWrap, { backgroundColor: colors.yellow[50] }]}>
                <Ionicons name="document-text-outline" size={24} color={colors.yellow[600]} />
              </View>
              <Text style={styles.actionText}>Add Note</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push(`/task/${task.id}/report-issue`)}
            >
              <View style={[styles.actionIconWrap, { backgroundColor: colors.red[50] }]}>
                <Ionicons name="alert-circle-outline" size={24} color={colors.red[500]} />
              </View>
              <Text style={[styles.actionText, { color: colors.red[500] }]}>Report Issue</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* (h) Footer Action Button */}
      {task.status !== 'completed' && task.status !== 'cancelled' && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.mainButton,
              {
                backgroundColor:
                  task.status === 'in_progress'
                    ? colors.primary[600]
                    : colors.blue[600],
              },
            ]}
            onPress={handleStatusChange}
            disabled={
              updateStatusMutation.isPending || clockInMutation.isPending || isLocating
            }
          >
            {updateStatusMutation.isPending || clockInMutation.isPending || isLocating ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <>
                <Ionicons
                  name={task.status === 'in_progress' ? 'checkmark' : 'play'}
                  size={24}
                  color={colors.white}
                />
                <Text style={styles.mainButtonText}>{status?.nextAction}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* (i) Add Note Modal */}
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

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
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
    marginBottom: spacing.xs,
  },
  descriptionInline: {
    fontSize: fontSize.base,
    color: colors.gray[600],
    lineHeight: 22,
    marginBottom: spacing.md,
  },

  // Meta grid
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
    flex: 1,
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

  // Sections
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
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
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.gray[400],
    textAlign: 'center',
    paddingVertical: spacing.md,
  },

  // Dependencies
  blockedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.yellow[50],
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  blockedText: {
    fontSize: fontSize.sm,
    color: colors.yellow[600],
    fontWeight: '500',
    marginLeft: spacing.sm,
    flex: 1,
  },
  depGroupTitle: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.gray[500],
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  depItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  depItemText: {
    fontSize: fontSize.base,
    color: colors.gray[800],
    flex: 1,
    marginLeft: spacing.sm,
  },
  depItemStatus: {
    fontSize: fontSize.xs,
    color: colors.gray[500],
    fontWeight: '500',
  },

  // Checklist
  checklistCount: {
    fontSize: fontSize.xs,
    color: colors.gray[500],
    fontWeight: '500',
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.gray[200],
  },
  checklistItemText: {
    fontSize: fontSize.base,
    color: colors.gray[900],
    marginLeft: spacing.sm,
    flex: 1,
  },
  checklistItemTextDone: {
    textDecorationLine: 'line-through',
    color: colors.gray[400],
  },
  addChecklistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  addChecklistInput: {
    flex: 1,
    backgroundColor: colors.gray[50],
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    fontSize: fontSize.base,
    color: colors.gray[900],
  },
  addChecklistButton: {
    marginLeft: spacing.sm,
    padding: spacing.xs,
  },

  // Comments
  commentItem: {
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.gray[200],
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  commentAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary[400],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  commentUser: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.gray[900],
  },
  commentTime: {
    fontSize: fontSize.xs,
    color: colors.gray[400],
  },
  commentContent: {
    fontSize: fontSize.base,
    color: colors.gray[700],
    lineHeight: 22,
    marginLeft: 28 + 8, // avatar width + margin
  },
  addCommentRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
  },
  addCommentInput: {
    flex: 1,
    backgroundColor: colors.gray[50],
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    fontSize: fontSize.base,
    color: colors.gray[900],
    maxHeight: 80,
  },
  addCommentButton: {
    marginLeft: spacing.sm,
    padding: spacing.xs,
  },

  // Actions
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.xs,
  },
  actionCard: {
    width: '50%',
    paddingHorizontal: spacing.xs,
    marginBottom: spacing.sm,
  },
  actionIconWrap: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  actionText: {
    fontSize: fontSize.sm,
    color: colors.gray[700],
    fontWeight: '500',
    textAlign: 'center',
    marginTop: spacing.xs,
  },

  // Footer
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

  // Modals
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
