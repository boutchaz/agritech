import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, fontSize, shadows } from '@/constants/theme';

type TaskStatus = 'pending' | 'in_progress' | 'completed';

const STATUS_CONFIG: Record<TaskStatus, { color: string; label: string; nextAction: string }> = {
  pending: { color: colors.yellow[500], label: 'Pending', nextAction: 'Start Task' },
  in_progress: { color: colors.blue[500], label: 'In Progress', nextAction: 'Complete Task' },
  completed: { color: colors.primary[500], label: 'Completed', nextAction: '' },
};

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const task = {
    id,
    title: 'Irrigation System Check',
    description:
      'Check all irrigation lines in Parcel A1 for leaks and ensure proper water flow. Pay special attention to the drip irrigation system near the tomato rows.',
    status: 'in_progress' as TaskStatus,
    priority: 'high',
    parcel: 'Parcel A1',
    farm: 'Green Valley Farm',
    dueDate: '2026-01-22',
    assignedBy: 'Ahmed Manager',
    assignedAt: '2026-01-21 09:00',
    estimatedDuration: '2 hours',
    instructions: [
      'Walk through all irrigation lines in the parcel',
      'Check for visible leaks or damaged pipes',
      'Test water pressure at main valves',
      'Inspect drip emitters for clogging',
      'Report any issues found',
    ],
  };

  const status = STATUS_CONFIG[task.status];

  const handleStatusChange = () => {
    if (task.status === 'pending') {
      Alert.alert('Start Task', 'Mark this task as in progress?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Start', onPress: () => console.log('Started') },
      ]);
    } else if (task.status === 'in_progress') {
      Alert.alert('Complete Task', 'Mark this task as completed?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Complete', onPress: () => router.back() },
      ]);
    }
  };

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
          <View style={[styles.statusBadge, { backgroundColor: status.color + '20' }]}>
            <View style={[styles.statusDot, { backgroundColor: status.color }]} />
            <Text style={[styles.statusText, { color: status.color }]}>
              {status.label}
            </Text>
          </View>
          <View style={styles.priorityBadge}>
            <Ionicons name="flag" size={14} color={colors.red[500]} />
            <Text style={styles.priorityText}>High Priority</Text>
          </View>
        </View>

        <Text style={styles.title}>{task.title}</Text>

        <View style={styles.metaGrid}>
          <View style={styles.metaItem}>
            <Ionicons name="location-outline" size={18} color={colors.gray[500]} />
            <View style={styles.metaContent}>
              <Text style={styles.metaLabel}>Location</Text>
              <Text style={styles.metaValue}>{task.parcel}</Text>
            </View>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="calendar-outline" size={18} color={colors.gray[500]} />
            <View style={styles.metaContent}>
              <Text style={styles.metaLabel}>Due Date</Text>
              <Text style={styles.metaValue}>{task.dueDate}</Text>
            </View>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={18} color={colors.gray[500]} />
            <View style={styles.metaContent}>
              <Text style={styles.metaLabel}>Duration</Text>
              <Text style={styles.metaValue}>{task.estimatedDuration}</Text>
            </View>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="person-outline" size={18} color={colors.gray[500]} />
            <View style={styles.metaContent}>
              <Text style={styles.metaLabel}>Assigned By</Text>
              <Text style={styles.metaValue}>{task.assignedBy}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <View style={styles.card}>
            <Text style={styles.description}>{task.description}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Instructions</Text>
          <View style={styles.card}>
            {task.instructions.map((instruction, index) => (
              <View key={index} style={styles.instructionItem}>
                <View style={styles.instructionNumber}>
                  <Text style={styles.instructionNumberText}>{index + 1}</Text>
                </View>
                <Text style={styles.instructionText}>{instruction}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="camera-outline" size={24} color={colors.primary[600]} />
              <Text style={styles.actionText}>Add Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="mic-outline" size={24} color={colors.primary[600]} />
              <Text style={styles.actionText}>Voice Note</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="document-text-outline" size={24} color={colors.primary[600]} />
              <Text style={styles.actionText}>Add Note</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="alert-circle-outline" size={24} color={colors.red[500]} />
              <Text style={[styles.actionText, { color: colors.red[500] }]}>
                Report Issue
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {task.status !== 'completed' && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.mainButton,
              { backgroundColor: task.status === 'pending' ? colors.blue[600] : colors.primary[600] },
            ]}
            onPress={handleStatusChange}
          >
            <Ionicons
              name={task.status === 'pending' ? 'play' : 'checkmark'}
              size={24}
              color={colors.white}
            />
            <Text style={styles.mainButtonText}>{status.nextAction}</Text>
          </TouchableOpacity>
        </View>
      )}
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
    color: colors.red[500],
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
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  instructionNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  instructionNumberText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.primary[700],
  },
  instructionText: {
    flex: 1,
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
});
