import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/providers/ThemeProvider';
import {
  useCalibrationStatus,
  useCalibrationReport,
  useCalibrationHistory,
  useCalibrationReadiness,
  useStartCalibration,
} from '@/hooks/useCalibration';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

export default function AgromindTab() {
  const { id: parcelId } = useLocalSearchParams<{ id: string }>();
  const { colors: themeColors } = useTheme();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const { data: statusData, refetch: refetchStatus } = useCalibrationStatus(parcelId);
  const { data: reportData, refetch: refetchReport } = useCalibrationReport(parcelId);
  const { data: historyData, refetch: refetchHistory } = useCalibrationHistory(parcelId);
  useCalibrationReadiness(parcelId); // prefetch
  const startCalibration = useStartCalibration(parcelId);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchStatus(), refetchReport(), refetchHistory()]);
    setRefreshing(false);
  }, [refetchStatus, refetchReport, refetchHistory]);

  const phase = (statusData?.status as string) || 'unknown';
  const confidence = statusData?.confidence_score;
  const report = reportData?.report?.output;
  const historyCount = Array.isArray(historyData) ? historyData.length : 0;

  // Phase display
  const phaseConfig: Record<string, { label: string; color: string; bg: string; icon: IconName }> = {
    disabled: { label: 'Not calibrated', color: themeColors.textTertiary, bg: themeColors.surfaceContainer, icon: 'ellipse-outline' },
    calibrating: { label: 'Calibrating...', color: themeColors.warning, bg: themeColors.warningContainer, icon: 'hourglass-outline' },
    awaiting_nutrition_option: { label: 'Awaiting input', color: themeColors.warning, bg: themeColors.warningContainer, icon: 'hand-left-outline' },
    calibrated: { label: 'Calibrated', color: themeColors.success, bg: themeColors.successContainer, icon: 'checkmark-circle' },
    ready: { label: 'Ready', color: themeColors.success, bg: themeColors.successContainer, icon: 'checkmark-circle' },
    unknown: { label: 'Unknown', color: themeColors.textTertiary, bg: themeColors.surfaceContainer, icon: 'help-circle-outline' },
  };

  const phaseCfg = phaseConfig[phase] || phaseConfig.unknown;

  const navItems: Array<{ key: string; icon: IconName; title: string; subtitle: string; route: string; color: string; bg: string; badge?: string }> = [
    {
      key: 'calibration',
      icon: 'analytics-outline',
      title: 'Calibration',
      subtitle: phaseCfg.label + (confidence != null ? ` · ${Math.min(100, Math.round(confidence))}%` : ''),
      route: `/(drawer)/(tabs)/production/parcel/${parcelId}/calibration`,
      color: themeColors.brandPrimary,
      bg: themeColors.brandContainer + '25',
    },
    {
      key: 'partial',
      icon: 'settings-outline',
      title: 'Partial Recalibration',
      subtitle: 'Adjust for new analysis or weather event',
      route: `/(drawer)/(tabs)/production/parcel/${parcelId}/calibration/wizard`,
      color: themeColors.warning,
      bg: themeColors.warningContainer,
    },
    {
      key: 'annual',
      icon: 'refresh-outline',
      title: 'Annual Recalibration',
      subtitle: 'Full F3 recalibration for new season',
      route: `/(drawer)/(tabs)/production/parcel/${parcelId}/calibration/annual`,
      color: themeColors.info,
      bg: themeColors.infoContainer,
    },
  ];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: themeColors.background }]}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Header card */}
      <View style={[styles.heroCard, { backgroundColor: themeColors.brandContainer }]}>
        <View style={styles.heroRow}>
          <View style={[styles.heroIcon, { backgroundColor: themeColors.brandPrimary + '30' }]}>
            <Ionicons name="sparkles" size={28} color={themeColors.onBrand} />
          </View>
          <View style={styles.heroInfo}>
            <Text style={[styles.heroTitle, { color: themeColors.onBrand }]}>Agromind IA</Text>
            <Text style={[styles.heroSubtitle, { color: themeColors.brandText }]}>
              AI-powered diagnostics & recommendations
            </Text>
          </View>
        </View>
      </View>

      {/* Calibration Status Card */}
      <View style={[styles.statusCard, { backgroundColor: themeColors.surfaceLowest }]}>
        <View style={styles.statusHeader}>
          <Text style={[styles.statusLabel, { color: themeColors.textSecondary }]}>Calibration Status</Text>
          <View style={[styles.phaseBadge, { backgroundColor: phaseCfg.bg }]}>
            <Ionicons name={phaseCfg.icon} size={14} color={phaseCfg.color} />
            <Text style={[styles.phaseText, { color: phaseCfg.color }]}>{phaseCfg.label}</Text>
          </View>
        </View>

        {/* Confidence meter */}
        {confidence != null && (
          <View style={styles.confidenceRow}>
            <Text style={[styles.confidenceLabel, { color: themeColors.textTertiary }]}>Confidence</Text>
            <View style={[styles.confidenceBar, { backgroundColor: themeColors.surfaceContainer }]}>
              <View style={[styles.confidenceBarFill, { width: `${Math.min(100, Math.round(confidence))}%`, backgroundColor: confidence >= 70 ? themeColors.success : confidence >= 40 ? themeColors.warning : themeColors.error }]} />
            </View>
            <Text style={[styles.confidenceValue, { color: themeColors.textPrimary }]}>{Math.min(100, Math.round(confidence))}%</Text>
          </View>
        )}

        {/* Report summary if available */}
        {report && (
          <View style={[styles.reportSummary, { borderTopColor: themeColors.outlineVariant }]}>
            {report.step8?.health_score != null && (
              <View style={styles.reportItem}>
                <Ionicons name="heart" size={14} color={themeColors.success} />
                <Text style={[styles.reportItemText, { color: themeColors.textSecondary }]}>
                  Health: {String(typeof report.step8.health_score === 'object' ? JSON.stringify(report.step8.health_score) : report.step8.health_score)}/10
                </Text>
              </View>
            )}
            {report.maturity_phase && (
              <View style={styles.reportItem}>
                <Ionicons name="leaf" size={14} color={themeColors.brandPrimary} />
                <Text style={[styles.reportItemText, { color: themeColors.textSecondary }]}>
                  {String(report.maturity_phase)}
                </Text>
              </View>
            )}
            {report.step6?.yield_potential && (
              <View style={styles.reportItem}>
                <Ionicons name="trending-up" size={14} color={themeColors.warning} />
                <Text style={[styles.reportItemText, { color: themeColors.textSecondary }]}>
                  Yield: {String(typeof report.step6.yield_potential === 'object' ? JSON.stringify(report.step6.yield_potential) : report.step6.yield_potential)}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Start calibration if not calibrated */}
        {phase === 'disabled' && (
          <TouchableOpacity
            style={[styles.startBtn, { backgroundColor: themeColors.brandPrimary }]}
            onPress={() => startCalibration.mutate({})}
            disabled={startCalibration.isPending}
          >
            {startCalibration.isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="play" size={16} color="#fff" />
                <Text style={styles.startBtnText}>Start Calibration</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Navigation items */}
      <Text style={[styles.navSectionTitle, { color: themeColors.textTertiary }]}>TOOLS</Text>
      {navItems.map((item) => (
        <TouchableOpacity
          key={item.key}
          style={[styles.navCard, { backgroundColor: themeColors.surfaceLowest }]}
          activeOpacity={0.7}
          onPress={() => router.push(item.route as Href)}
        >
          <View style={[styles.navIcon, { backgroundColor: item.bg }]}>
            <Ionicons name={item.icon} size={20} color={item.color} />
          </View>
          <View style={styles.navInfo}>
            <Text style={[styles.navTitle, { color: themeColors.textPrimary }]}>{item.title}</Text>
            <Text style={[styles.navSubtitle, { color: themeColors.textTertiary }]}>{item.subtitle}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={themeColors.iconSubtle} />
        </TouchableOpacity>
      ))}

      {/* History count */}
      {historyCount > 0 && (
        <TouchableOpacity
          style={[styles.navCard, { backgroundColor: themeColors.surfaceLowest }]}
          activeOpacity={0.7}
          onPress={() => router.push(`/(drawer)/(tabs)/production/parcel/${parcelId}/calibration` as Href)}
        >
          <View style={[styles.navIcon, { backgroundColor: themeColors.surfaceContainer }]}>
            <Ionicons name="time-outline" size={20} color={themeColors.textSecondary} />
          </View>
          <View style={styles.navInfo}>
            <Text style={[styles.navTitle, { color: themeColors.textPrimary }]}>Calibration History</Text>
            <Text style={[styles.navSubtitle, { color: themeColors.textTertiary }]}>{historyCount} calibration records</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={themeColors.iconSubtle} />
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 32, gap: 12 },

  heroCard: { borderRadius: 16, padding: 20 },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  heroIcon: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  heroInfo: { flex: 1 },
  heroTitle: { fontSize: 20, fontWeight: '700' },
  heroSubtitle: { fontSize: 13, marginTop: 2 },

  statusCard: { borderRadius: 16, padding: 16 },
  statusHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  statusLabel: { fontSize: 13, fontWeight: '500' },
  phaseBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  phaseText: { fontSize: 12, fontWeight: '600' },

  confidenceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  confidenceLabel: { fontSize: 12, width: 70 },
  confidenceBar: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  confidenceBarFill: { height: 8, borderRadius: 4 },
  confidenceValue: { fontSize: 14, fontWeight: '700', width: 40, textAlign: 'right' },

  reportSummary: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  reportItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  reportItemText: { fontSize: 12 },

  startBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12, marginTop: 12 },
  startBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },

  navSectionTitle: { fontSize: 11, fontWeight: '600', letterSpacing: 0.8, marginTop: 4, marginBottom: -4, paddingHorizontal: 4 },
  navCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 14, gap: 12 },
  navIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  navInfo: { flex: 1 },
  navTitle: { fontSize: 15, fontWeight: '600' },
  navSubtitle: { fontSize: 12, marginTop: 2 },
});
