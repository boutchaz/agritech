import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, ImageBackground } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format, isToday } from 'date-fns';
import { useAuthStore } from '@/stores/authStore';
import { useAbility } from '@/hooks/useAbility';
import type { Subject } from '@/lib/ability';
import type { Task } from '@/lib/api';
import { useMyTasks, useTaskStatistics } from '@/hooks/useTasks';
import { useFarms, useParcels } from '@/hooks/useFarms';
import { palette } from '@/constants/tokens';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const HERO_IMAGE = {
  uri: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1400&q=80',
};

const PRIORITY_BORDER: Record<string, string> = {
  urgent: palette.error,
  high: palette.error,
  medium: palette.secondaryContainer,
  low: palette.primary + '33',
};

const PRIORITY_LABEL: Record<string, { bg: string; fg: string }> = {
  urgent: { bg: palette.errorContainer, fg: palette.onErrorContainer },
  high: { bg: palette.errorContainer, fg: palette.onErrorContainer },
  medium: { bg: palette.secondaryContainer + '33', fg: palette.onSecondaryContainer },
  low: { bg: palette.surfaceContainer, fg: palette.primary },
};

function TaskCard({ task, onPress }: { task: Task; onPress: () => void }) {
  const border = PRIORITY_BORDER[task.priority] || palette.primary + '33';
  const badge = PRIORITY_LABEL[task.priority] || PRIORITY_LABEL.low;
  const isUrgent = task.priority === 'urgent' || task.priority === 'high';
  const dueLabel = task.due_date
    ? isToday(new Date(task.due_date))
      ? `Today ${format(new Date(task.due_date), 'h a')}`
      : format(new Date(task.due_date), 'EEE, MMM d')
    : null;

  return (
    <TouchableOpacity activeOpacity={0.92} onPress={onPress} style={[s.taskCard, { borderLeftColor: border }]}>
      <View style={s.taskBody}>
        <View style={s.taskBadgeRow}>
          <View style={[s.priorityBadge, { backgroundColor: badge.bg }]}>
            <Text style={[s.priorityLabel, { color: badge.fg }]}>{task.priority}</Text>
          </View>
          {task.parcel?.name && <Text style={s.parcelLabel}>{task.parcel.name}</Text>}
        </View>
        <Text style={s.taskTitle} numberOfLines={1}>{task.title}</Text>
        {task.description && <Text style={s.taskDesc} numberOfLines={2}>{task.description}</Text>}
      </View>
      <View style={s.taskRight}>
        {dueLabel && (
          <View style={s.dueRow}>
            <Ionicons name="time-outline" size={14} color={isUrgent ? palette.error : palette.onSurfaceVariant} />
            <Text style={[s.dueText, isUrgent && { color: palette.error }]}>{dueLabel}</Text>
          </View>
        )}
        <TouchableOpacity style={s.taskAction} onPress={onPress}>
          <Text style={s.taskActionText}>View Details</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

type ModuleCard = {
  key: string;
  title: string;
  icon: IconName;
  route: Href;
  permission?: Subject;
};

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile, currentFarm, role, abilities } = useAuthStore();
  const { can } = useAbility();
  const [refreshing, setRefreshing] = useState(false);
  const { t } = useTranslation();
  const { t: tAuth } = useTranslation('auth');

  const { data: tasks, isLoading: tasksLoading, refetch: refetchTasks } = useMyTasks();
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useTaskStatistics();
  const { data: farms = [], refetch: refetchFarms } = useFarms();
  const { data: parcels = [], refetch: refetchParcels } = useParcels(currentFarm?.id);

  const roleLabel =
    abilities?.role?.display_name ||
    (role
      ? role.split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')
      : '');

  const initials = profile ? `${profile.first_name?.[0] || ''}${profile.last_name?.[0] || ''}` : 'U';

  const modules: ModuleCard[] = [
    { key: 'production', title: 'Production', icon: 'leaf-outline', route: '/(drawer)/(production)' as Href, permission: 'Parcel' },
    { key: 'workforce', title: 'Workforce', icon: 'people-outline', route: '/(drawer)/(workforce)' as Href, permission: 'Task' },
    { key: 'inventory', title: 'Inventory', icon: 'cube-outline', route: '/(drawer)/(inventory)' as Href, permission: 'Inventory' },
    { key: 'accounting', title: 'Accounting', icon: 'wallet-outline', route: '/(drawer)/(accounting)' as Href, permission: 'Invoice' },
    { key: 'settings', title: 'Settings', icon: 'settings-outline', route: '/(drawer)/(settings)' as Href },
    { key: 'misc', title: 'Misc', icon: 'grid-outline', route: '/(drawer)/(misc)' as Href },
  ];

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetchTasks(), refetchStats(), refetchFarms(), refetchParcels()]);
    } finally {
      setRefreshing(false);
    }
  }, [refetchTasks, refetchStats, refetchFarms, refetchParcels]);

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('greetings.morning');
    if (hour < 18) return t('greetings.afternoon');
    return t('greetings.evening');
  };

  const pendingTasks = tasks?.filter((tk) => tk.status === 'pending') || [];
  const inProgressTasks = tasks?.filter((tk) => tk.status === 'in_progress') || [];
  const recentTasks = [...inProgressTasks, ...pendingTasks].slice(0, 3);
  const totalTasks = stats?.total ?? tasks?.length ?? 0;
  const completedCount = stats?.completed ?? 0;
  const completionRate = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      showsVerticalScrollIndicator={false}
    >
      {/* HERO */}
      <View style={s.heroShell}>
        <ImageBackground source={HERO_IMAGE} style={s.heroImage} imageStyle={s.heroImageRadius}>
          <LinearGradient
            colors={['rgba(0,69,13,0.15)', 'rgba(0,69,13,0.55)', 'rgba(0,69,13,0.82)']}
            start={{ x: 0, y: 0.1 }}
            end={{ x: 0, y: 1 }}
            style={[s.heroOverlay, { paddingTop: insets.top + 12 }]}
          >
            <View style={s.heroTopBar}>
              <View style={s.locationPill}>
                <Ionicons name="location" size={14} color={palette.white} />
                <Text style={s.locationText}>{currentFarm?.name || tAuth('selectFarm')}</Text>
              </View>
              <View style={s.avatarCircle}>
                <Text style={s.avatarText}>{initials}</Text>
              </View>
            </View>
            <View style={s.heroBottom}>
              <Text style={s.heroGreeting}>{`${greeting()},`}</Text>
              <Text style={s.heroName}>{profile?.first_name || 'Operator'}</Text>
              {roleLabel ? <Text style={s.heroRole}>{roleLabel}</Text> : null}
              <View style={s.heroStats}>
                <View style={s.heroStat}>
                  <Text style={s.heroStatValue}>{farms.length}</Text>
                  <Text style={s.heroStatLabel}>Farms</Text>
                </View>
                <View style={s.heroStatDivider} />
                <View style={s.heroStat}>
                  <Text style={s.heroStatValue}>{parcels.length}</Text>
                  <Text style={s.heroStatLabel}>Parcels</Text>
                </View>
                <View style={s.heroStatDivider} />
                <View style={s.heroStat}>
                  <Text style={s.heroStatValue}>{totalTasks}</Text>
                  <Text style={s.heroStatLabel}>Tasks</Text>
                </View>
              </View>
            </View>
          </LinearGradient>
        </ImageBackground>
      </View>

      {/* HERO SECTION HEADER */}
      <View style={s.section}>
        <View style={s.sectionHeaderRow}>
          <View>
            <Text style={s.overline}>Operations</Text>
            <Text style={s.sectionTitle}>Field Tasks</Text>
          </View>
          <TouchableOpacity
            style={s.ctaButton}
            onPress={() => router.push('/(drawer)/(tabs)/tasks' as Href)}
          >
            <LinearGradient colors={[palette.primary, palette.primaryContainer]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.ctaGradient}>
              <Ionicons name="add" size={18} color={palette.white} />
              <Text style={s.ctaText}>View All</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      {/* TASK CARDS */}
      <View style={s.section}>
        {tasksLoading ? (
          <View style={s.loadingBox}>
            <ActivityIndicator size="small" color={palette.primary} />
          </View>
        ) : recentTasks.length > 0 ? (
          <View style={s.taskList}>
            {recentTasks.map((task) => (
              <TaskCard key={task.id} task={task} onPress={() => router.push(`/task/${task.id}`)} />
            ))}
          </View>
        ) : (
          <View style={s.emptyState}>
            <Ionicons name="checkmark-done-circle-outline" size={56} color={palette.primary + '33'} />
            <Text style={s.emptyTitle}>No pending tasks.</Text>
            <Text style={s.emptySubtitle}>All field operations are up to date.</Text>
          </View>
        )}
      </View>

      {/* BENTO SUMMARY */}
      <View style={s.bentoRow}>
        <LinearGradient colors={[palette.primary, palette.primaryContainer]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.bentoGradientCard}>
          <Text style={s.bentoOverline}>Completion Rate</Text>
          <Text style={s.bentoHeroNumber}>{completionRate}%</Text>
          <Text style={s.bentoHint}>
            {completedCount} of {totalTasks} tasks completed this period.
          </Text>
        </LinearGradient>
        <View style={s.bentoInfoCard}>
          <Text style={s.bentoOverlineDark}>Quick Nav</Text>
          <View style={s.bentoModuleGrid}>
            {modules.slice(0, 4).map((m) => {
              const allowed = !m.permission || can('read', m.permission);
              return (
                <TouchableOpacity
                  key={m.key}
                  style={[s.bentoModule, !allowed && { opacity: 0.4 }]}
                  onPress={() => allowed && router.push(m.route)}
                  disabled={!allowed}
                >
                  <Ionicons name={m.icon} size={20} color={palette.primary} />
                  <Text style={s.bentoModuleLabel}>{m.title}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>

      {/* FIELD OVERVIEW */}
      {parcels.length > 0 && (
        <View style={s.section}>
          <View style={s.sectionHeaderRow}>
            <Text style={s.sectionTitle}>Field Overview</Text>
            <TouchableOpacity onPress={() => router.push('/(drawer)/(production)' as Href)}>
              <Text style={s.linkText}>View Map</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.fieldScroll}>
            {parcels.slice(0, 5).map((parcel) => (
              <TouchableOpacity
                key={parcel.id}
                style={s.fieldCard}
                onPress={() => router.push(`/(drawer)/(production)/parcel/${parcel.id}` as Href)}
              >
                <View style={s.fieldCardTop}>
                  <Ionicons name="map" size={20} color={palette.primary} />
                  <Text style={s.fieldCardName} numberOfLines={1}>{parcel.name}</Text>
                </View>
                <View style={s.fieldCardMeta}>
                  {parcel.area != null && <Text style={s.fieldCardMetaText}>{parcel.area} {parcel.area_unit || 'ha'}</Text>}
                  <View style={[s.fieldCardStatus, { backgroundColor: parcel.status === 'active' ? palette.successContainer : palette.surfaceContainer }]}>
                    <Text style={[s.fieldCardStatusText, { color: parcel.status === 'active' ? palette.success : palette.onSurfaceVariant }]}>{parcel.status}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.surface },
  content: { paddingBottom: 32 },

  heroShell: { paddingHorizontal: 16, paddingTop: 4 },
  heroImage: { height: 340, borderRadius: 20, overflow: 'hidden' },
  heroImageRadius: { borderRadius: 20 },
  heroOverlay: { flex: 1, paddingHorizontal: 16, paddingBottom: 20, justifyContent: 'space-between' },
  heroTopBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  locationPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, gap: 6 },
  locationText: { fontSize: 14, fontWeight: '600', color: palette.white },
  avatarCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: palette.white, fontSize: 16, fontWeight: '700' },
  heroBottom: {},
  heroGreeting: { color: 'rgba(255,255,255,0.8)', fontSize: 16, fontWeight: '500' },
  heroName: { color: palette.white, fontSize: 28, fontWeight: '900', letterSpacing: -0.5 },
  heroRole: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 },
  heroStats: { flexDirection: 'row', alignItems: 'center', marginTop: 16, gap: 16 },
  heroStat: { alignItems: 'center' },
  heroStatValue: { color: palette.white, fontSize: 22, fontWeight: '900' },
  heroStatLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.5 },
  heroStatDivider: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.2)' },

  section: { paddingHorizontal: 16, marginTop: 28 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 },
  overline: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 3, color: palette.primary + '99', marginBottom: 4 },
  sectionTitle: { fontSize: 28, fontWeight: '900', color: palette.primary, letterSpacing: -0.8 },
  linkText: { fontSize: 14, fontWeight: '700', color: palette.primary },

  ctaButton: { borderRadius: 12, overflow: 'hidden' },
  ctaGradient: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 6 },
  ctaText: { color: palette.white, fontSize: 13, fontWeight: '700' },

  taskList: { gap: 16 },
  taskCard: { backgroundColor: palette.surfaceContainerLowest, borderRadius: 12, padding: 16, borderLeftWidth: 6, flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  taskBody: { flex: 1 },
  taskBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  priorityBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  priorityLabel: { fontSize: 9, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 2 },
  parcelLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 2, color: palette.onSurface + '66' },
  taskTitle: { fontSize: 18, fontWeight: '800', color: palette.primary, letterSpacing: -0.3 },
  taskDesc: { fontSize: 13, color: palette.onSurface + 'B3', fontWeight: '500', marginTop: 4, lineHeight: 18 },
  taskRight: { alignItems: 'flex-end', justifyContent: 'space-between', minWidth: 90 },
  dueRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dueText: { fontSize: 12, fontWeight: '700', color: palette.onSurfaceVariant },
  taskAction: { backgroundColor: palette.surfaceContainerHigh, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  taskActionText: { fontSize: 12, fontWeight: '700', color: palette.primary },

  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48, backgroundColor: palette.surfaceContainerLow, borderRadius: 24, borderWidth: 2, borderColor: palette.primary + '1A', borderStyle: 'dashed' },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: palette.primary + '66', marginTop: 12, letterSpacing: -0.3 },
  emptySubtitle: { fontSize: 13, color: palette.onSurface + '66', marginTop: 4 },

  loadingBox: { paddingVertical: 48, alignItems: 'center' },

  bentoRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, marginTop: 28 },
  bentoGradientCard: { flex: 1, borderRadius: 24, padding: 20, overflow: 'hidden', minHeight: 170 },
  bentoOverline: { fontSize: 9, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 3, color: 'rgba(255,255,255,0.6)' },
  bentoHeroNumber: { fontSize: 48, fontWeight: '900', color: palette.white, letterSpacing: -2, marginTop: 6 },
  bentoHint: { fontSize: 12, fontWeight: '500', color: 'rgba(255,255,255,0.75)', marginTop: 8, lineHeight: 18 },
  bentoInfoCard: { flex: 1, backgroundColor: palette.surfaceContainerHigh, borderRadius: 24, padding: 16 },
  bentoOverlineDark: { fontSize: 9, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 3, color: palette.primary + '99', marginBottom: 12 },
  bentoModuleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  bentoModule: { width: '46%', backgroundColor: palette.surfaceContainerLowest, borderRadius: 12, padding: 10, alignItems: 'center', gap: 4 },
  bentoModuleLabel: { fontSize: 10, fontWeight: '700', color: palette.primary, textTransform: 'uppercase', letterSpacing: 0.5 },

  fieldScroll: { gap: 12, paddingRight: 16 },
  fieldCard: { width: 160, backgroundColor: palette.surfaceContainerLowest, borderRadius: 12, padding: 14 },
  fieldCardTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  fieldCardName: { fontSize: 14, fontWeight: '800', color: palette.primary, flex: 1 },
  fieldCardMeta: { gap: 6 },
  fieldCardMetaText: { fontSize: 12, fontWeight: '600', color: palette.onSurfaceVariant },
  fieldCardStatus: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  fieldCardStatusText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
});
