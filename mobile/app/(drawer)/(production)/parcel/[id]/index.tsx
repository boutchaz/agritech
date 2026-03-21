import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useState, useCallback } from 'react';
import { format } from 'date-fns';
import { useParcel, useFarm } from '@/hooks/useFarms';
import { useHarvests } from '@/hooks/useHarvests';
import { useTheme } from '@/providers/ThemeProvider';



type IconName = React.ComponentProps<typeof Ionicons>['name'];

function InfoRow({
  icon,
  label,
  value,
  themeColors,
}: {
  icon: IconName;
  label: string;
  value: string;
  themeColors: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <View style={[styles.infoRow, { borderBottomColor: themeColors.outlineVariant }]}>
      <View style={styles.infoLabel}>
        <Ionicons name={icon} size={16} color={themeColors.iconSubtle} />
        <Text style={[styles.infoLabelText, { color: themeColors.textSecondary }]}>{label}</Text>
      </View>
      <Text style={[styles.infoValue, { color: themeColors.textPrimary }]}>{value}</Text>
    </View>
  );
}

export default function ParcelOverviewTab() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const { colors: themeColors } = useTheme();
  const [refreshing, setRefreshing] = useState(false);

  const { data: parcel } = useParcel(id);
  const { data: farm } = useFarm(parcel?.farm_id || '');
  const { data: harvestData, isLoading: harvestsLoading, refetch: refetchHarvests } = useHarvests({
    farmId: parcel?.farm_id,
  });

  const parcelHarvests = harvestData?.data?.filter((h) => h.parcel_id === id).slice(0, 10) || [];

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetchHarvests();
    } finally {
      setRefreshing(false);
    }
  }, [refetchHarvests]);

  if (!parcel) return null;

  // Quick stat cards
  const quickStats = [
    {
      icon: 'resize-outline' as IconName,
      label: 'Area',
      value: parcel.area != null ? `${parcel.area} ${parcel.area_unit || 'ha'}` : '-',
      color: themeColors.info,
      bg: themeColors.infoContainer,
    },
    {
      icon: 'leaf-outline' as IconName,
      label: 'Crop',
      value: parcel.current_crop || 'None',
      color: themeColors.success,
      bg: themeColors.successContainer,
    },
    {
      icon: 'archive-outline' as IconName,
      label: 'Harvests',
      value: `${parcelHarvests.length}`,
      color: themeColors.warning,
      bg: themeColors.warningContainer,
    },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Quick stats */}
      <View style={styles.statsRow}>
        {quickStats.map((stat) => (
          <View key={stat.label} style={[styles.statCard, { backgroundColor: themeColors.surfaceLowest }]}>
            <View style={[styles.statIcon, { backgroundColor: stat.bg }]}>
              <Ionicons name={stat.icon} size={18} color={stat.color} />
            </View>
            <Text style={[styles.statValue, { color: themeColors.textPrimary }]}>{stat.value}</Text>
            <Text style={[styles.statLabel, { color: themeColors.textTertiary }]}>{stat.label}</Text>
          </View>
        ))}
      </View>

      {/* Details card */}
      <View style={[styles.card, { backgroundColor: themeColors.surfaceLowest }]}>
        <Text style={[styles.cardTitle, { color: themeColors.textPrimary }]}>
          {t('production.details', { defaultValue: 'Details' })}
        </Text>
        {parcel.area != null && (
          <InfoRow
            icon="resize-outline"
            label={t('production.area', { defaultValue: 'Area' })}
            value={`${parcel.area} ${parcel.area_unit || 'ha'}`}
            themeColors={themeColors}
          />
        )}
        {parcel.current_crop && (
          <InfoRow
            icon="leaf-outline"
            label={t('production.currentCrop', { defaultValue: 'Current Crop' })}
            value={parcel.current_crop}
            themeColors={themeColors}
          />
        )}
        <InfoRow
          icon="flag-outline"
          label={t('status.label', { defaultValue: 'Status' })}
          value={parcel.status}
          themeColors={themeColors}
        />
        {farm && (
          <InfoRow
            icon="business-outline"
            label="Farm"
            value={farm.name}
            themeColors={themeColors}
          />
        )}
      </View>

      {/* Quick actions */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: themeColors.brandContainer + '30' }]}
          onPress={() => router.push(`/(drawer)/(production)/parcel/${id}/calibration` as Href)}
        >
          <Ionicons name="analytics-outline" size={20} color={themeColors.brandPrimary} />
          <Text style={[styles.actionLabel, { color: themeColors.brandPrimary }]}>Calibration</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: themeColors.infoContainer }]}
          onPress={() => router.push(`/(drawer)/(production)/parcel/${id}/weather` as Href)}
        >
          <Ionicons name="cloud-outline" size={20} color={themeColors.info} />
          <Text style={[styles.actionLabel, { color: themeColors.info }]}>Weather</Text>
        </TouchableOpacity>
      </View>

      {/* Recent harvests */}
      <View style={[styles.card, { backgroundColor: themeColors.surfaceLowest }]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: themeColors.textPrimary }]}>
            {t('production.recentHarvests', { defaultValue: 'Recent Harvests' })}
          </Text>
          <Text style={[styles.harvestCount, { color: themeColors.textTertiary }]}>
            {parcelHarvests.length}
          </Text>
        </View>

        {harvestsLoading ? (
          <ActivityIndicator size="small" color={themeColors.brandPrimary} style={styles.cardLoading} />
        ) : parcelHarvests.length > 0 ? (
          parcelHarvests.map((h) => (
            <View key={h.id} style={[styles.harvestItem, { borderBottomColor: themeColors.outlineVariant }]}>
              <View style={styles.harvestInfo}>
                <Text style={[styles.harvestCrop, { color: themeColors.textPrimary }]}>
                  {h.crop?.name || 'Harvest'}
                </Text>
                <Text style={[styles.harvestDate, { color: themeColors.textTertiary }]}>
                  {format(new Date(h.harvest_date), 'MMM d, yyyy')}
                </Text>
              </View>
              <Text style={[styles.harvestQty, { color: themeColors.brandPrimary }]}>
                {h.quantity} {h.unit}
              </Text>
              {h.quality_grade && (
                <View style={[styles.gradeBadge, { backgroundColor: themeColors.successContainer }]}>
                  <Text style={[styles.gradeText, { color: themeColors.success }]}>{h.quality_grade}</Text>
                </View>
              )}
            </View>
          ))
        ) : (
          <View style={styles.emptyHarvests}>
            <Ionicons name="leaf-outline" size={32} color={themeColors.iconSubtle} />
            <Text style={[styles.emptyText, { color: themeColors.textTertiary }]}>
              {t('production.noHarvestsForParcel', { defaultValue: 'No harvests recorded' })}
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: { flex: 1, borderRadius: 14, padding: 14, alignItems: 'center' },
  statIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statValue: { fontSize: 16, fontWeight: '700' },
  statLabel: { fontSize: 11, marginTop: 2 },

  card: { borderRadius: 14, padding: 16, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 17, fontWeight: '600', marginBottom: 12 },
  cardLoading: { paddingVertical: 20 },
  harvestCount: { fontSize: 13, fontWeight: '500', marginBottom: 12 },

  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  infoLabel: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoLabelText: { fontSize: 14 },
  infoValue: { fontSize: 14, fontWeight: '600' },

  actionsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12 },
  actionLabel: { fontSize: 14, fontWeight: '600' },

  harvestItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, gap: 8 },
  harvestInfo: { flex: 1 },
  harvestCrop: { fontSize: 14, fontWeight: '500' },
  harvestDate: { fontSize: 12, marginTop: 2 },
  harvestQty: { fontSize: 14, fontWeight: '600' },
  gradeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  gradeText: { fontSize: 11, fontWeight: '600' },

  emptyHarvests: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  emptyText: { fontSize: 13, textAlign: 'center' },
});
