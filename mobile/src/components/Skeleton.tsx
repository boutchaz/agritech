import { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, type ViewStyle } from 'react-native';
import { colors, borderRadius, spacing } from '@/constants/theme';

type SkeletonProps = {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
  style?: ViewStyle;
};

function SkeletonBox({ width = '100%', height = 16, radius = borderRadius.md, style }: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.box,
        { width, height, borderRadius: radius, opacity },
        style,
      ]}
    />
  );
}

function TaskCardSkeleton() {
  return (
    <View style={styles.taskCard}>
      <View style={styles.taskCardTop}>
        <SkeletonBox width={80} height={22} radius={borderRadius.full} />
        <SkeletonBox width={90} height={22} radius={borderRadius.full} />
      </View>
      <SkeletonBox width="75%" height={18} style={{ marginTop: spacing.sm }} />
      <SkeletonBox width="50%" height={14} style={{ marginTop: spacing.sm }} />
      <View style={styles.taskCardBottom}>
        <SkeletonBox width={100} height={14} />
        <SkeletonBox width={80} height={14} />
      </View>
    </View>
  );
}

function TaskListSkeleton() {
  return (
    <View style={styles.listContainer}>
      <TaskCardSkeleton />
      <TaskCardSkeleton />
      <TaskCardSkeleton />
    </View>
  );
}

function FieldCardSkeleton() {
  return (
    <View style={styles.fieldCard}>
      <SkeletonBox width={120} height={120} radius={borderRadius.xl} />
      <View style={styles.fieldCardContent}>
        <SkeletonBox width="80%" height={18} />
        <SkeletonBox width="60%" height={14} style={{ marginTop: spacing.xs }} />
        <SkeletonBox width={110} height={26} radius={borderRadius.full} style={{ marginTop: spacing.sm }} />
        <View style={styles.fieldCardChips}>
          <SkeletonBox width={70} height={22} radius={borderRadius.full} />
          <SkeletonBox width={85} height={22} radius={borderRadius.full} />
        </View>
      </View>
    </View>
  );
}

function StatRowSkeleton({ count = 3 }: { count?: number }) {
  return (
    <View style={styles.statRow}>
      {Array.from({ length: count }).map((_, idx) => (
        <View key={`skeleton-stat-col-${String(idx)}`} style={styles.statCard}>
          <SkeletonBox width={40} height={40} radius={borderRadius.full} />
          <SkeletonBox width={40} height={24} style={{ marginTop: spacing.sm }} />
          <SkeletonBox width={60} height={12} style={{ marginTop: spacing.xs }} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.gray[200],
  },
  listContainer: {
    padding: spacing.md,
    gap: spacing.md,
  },
  taskCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  taskCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  taskCardBottom: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
  },
  fieldCard: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  fieldCardContent: {
    flex: 1,
  },
  fieldCardChips: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  statRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
  },
});

export { SkeletonBox, TaskCardSkeleton, TaskListSkeleton, FieldCardSkeleton, StatRowSkeleton };
export default SkeletonBox;
