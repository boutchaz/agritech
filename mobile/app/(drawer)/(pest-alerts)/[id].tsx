// Pest Report Detail Screen
import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  RefreshControl,
  Image,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius, fontSize, fontWeight, shadows } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';
import { usePestReport, useUpdatePestReport, useDeletePestReport, useEscalatePestReport } from '@/hooks/usePestAlerts';
import type { PestReportSeverity, PestReportStatus } from '@/types/pest-alerts';

const SEVERITY_COLORS: Record<PestReportSeverity, string> = {
  critical: colors.red[500],
  high: '#f97316',
  medium: colors.yellow[500],
  low: colors.blue[500],
};

const STATUS_COLORS: Record<PestReportStatus, string> = {
  pending: colors.yellow[500],
  verified: colors.blue[500],
  treated: colors.primary[600],
  resolved: colors.primary[400],
  dismissed: colors.gray[400],
};

const STATUS_FLOW: PestReportStatus[] = ['pending', 'verified', 'treated', 'resolved'];

export default function PestReportDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation('common');
  const { data: report, isLoading, refetch } = usePestReport(id!);
  const updateMutation = useUpdatePestReport(id!);
  const deleteMutation = useDeletePestReport();
  const escalateMutation = useEscalatePestReport();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleStatusChange = (newStatus: PestReportStatus) => {
    if (newStatus === 'treated') {
      Alert.prompt?.(
        t('pestAlerts.treatmentApplied', { defaultValue: 'Treatment Applied' }),
        t('pestAlerts.describeTreatment', { defaultValue: 'Describe the treatment applied' }),
        (text) => {
          updateMutation.mutate({ status: newStatus, treatment_applied: text || undefined });
        }
      );
      // Fallback for Android (no Alert.prompt)
      if (!Alert.prompt) {
        updateMutation.mutate({ status: newStatus });
      }
    } else {
      updateMutation.mutate({ status: newStatus });
    }
  };

  const handleDelete = () => {
    Alert.alert(
      t('actions.delete', { defaultValue: 'Delete' }),
      t('pestAlerts.deleteConfirm', { defaultValue: 'Are you sure you want to delete this report?' }),
      [
        { text: t('actions.cancel', { defaultValue: 'Cancel' }), style: 'cancel' },
        {
          text: t('actions.delete', { defaultValue: 'Delete' }),
          style: 'destructive',
          onPress: () => {
            deleteMutation.mutate(id!, {
              onSuccess: () => router.back(),
            });
          },
        },
      ]
    );
  };

  const handleEscalate = () => {
    Alert.alert(
      t('pestAlerts.escalate', { defaultValue: 'Escalate Report' }),
      t('pestAlerts.escalateConfirm', { defaultValue: 'This will create a system-wide performance alert. Continue?' }),
      [
        { text: t('actions.cancel', { defaultValue: 'Cancel' }), style: 'cancel' },
        {
          text: t('pestAlerts.escalate', { defaultValue: 'Escalate' }),
          style: 'destructive',
          onPress: () => escalateMutation.mutate(id!),
        },
      ]
    );
  };

  if (isLoading || !report) {
    return (
      <View style={styles.container}>
        <PageHeader title={t('pestAlerts.loading', { defaultValue: 'Loading...' })} showBack />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>{t('actions.loading', { defaultValue: 'Loading...' })}</Text>
        </View>
      </View>
    );
  }

  const pestName = report.pest_disease?.name || t('pestAlerts.unknownPest', { defaultValue: 'Unknown pest/disease' });
  const currentStatusIdx = STATUS_FLOW.indexOf(report.status);
  const nextStatus = currentStatusIdx >= 0 && currentStatusIdx < STATUS_FLOW.length - 1
    ? STATUS_FLOW[currentStatusIdx + 1]
    : null;
  const canEscalate = report.severity !== 'critical' && report.status !== 'resolved' && report.status !== 'dismissed';

  return (
    <View style={styles.container}>
      <PageHeader
        title={pestName}
        showBack
        actions={[
          {
            icon: 'trash-outline' as const,
            onPress: handleDelete,
          },
        ]}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {/* Severity & Status header */}
        <View style={[styles.headerCard, { borderLeftColor: SEVERITY_COLORS[report.severity] }]}>
          <View style={styles.headerRow}>
            <View style={[styles.severityBadge, { backgroundColor: SEVERITY_COLORS[report.severity] + '20' }]}>
              <View style={[styles.severityDot, { backgroundColor: SEVERITY_COLORS[report.severity] }]} />
              <Text style={[styles.severityText, { color: SEVERITY_COLORS[report.severity] }]}>
                {report.severity.charAt(0).toUpperCase() + report.severity.slice(1)}
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[report.status] + '20' }]}>
              <Text style={[styles.statusText, { color: STATUS_COLORS[report.status] }]}>
                {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
              </Text>
            </View>
          </View>
          {report.pest_disease?.type && (
            <Text style={styles.pestType}>
              {report.pest_disease.type === 'pest' ? 'Pest' : 'Disease'}
            </Text>
          )}
        </View>

        {/* Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('pestAlerts.details', { defaultValue: 'Details' })}</Text>
          <View style={styles.detailGrid}>
            <DetailRow icon="business-outline" label="Farm" value={report.farm?.name || '-'} />
            <DetailRow icon="map-outline" label="Parcel" value={report.parcel?.name || '-'} />
            <DetailRow
              icon="person-outline"
              label="Reporter"
              value={report.reporter ? `${report.reporter.first_name} ${report.reporter.last_name}` : '-'}
            />
            <DetailRow icon="calendar-outline" label="Date" value={new Date(report.created_at).toLocaleDateString()} />
            {report.detection_method && (
              <DetailRow
                icon="search-outline"
                label="Detection"
                value={report.detection_method.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
              />
            )}
            {report.affected_area_percentage !== undefined && (
              <DetailRow icon="resize-outline" label="Affected Area" value={`${report.affected_area_percentage}%`} />
            )}
          </View>
        </View>

        {/* Notes */}
        {report.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('pestAlerts.observations', { defaultValue: 'Observations' })}</Text>
            <Text style={styles.notesText}>{report.notes}</Text>
          </View>
        )}

        {/* Photos */}
        {report.photo_urls && report.photo_urls.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('pestAlerts.photos', { defaultValue: 'Photos' })}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoScroll}>
              {report.photo_urls.map((url, idx) => (
                <Image key={idx} source={{ uri: url }} style={styles.photo} resizeMode="cover" />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Treatment */}
        {report.treatment_applied && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('pestAlerts.treatment', { defaultValue: 'Treatment Applied' })}</Text>
            <Text style={styles.notesText}>{report.treatment_applied}</Text>
            {report.treatment_date && (
              <Text style={styles.treatmentDate}>
                {new Date(report.treatment_date).toLocaleDateString()}
              </Text>
            )}
          </View>
        )}

        {/* Pest/Disease Reference */}
        {report.pest_disease && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('pestAlerts.reference', { defaultValue: 'Reference' })}</Text>
            <View style={styles.referenceCard}>
              {report.pest_disease.symptoms && (
                <View style={styles.refSection}>
                  <Text style={styles.refLabel}>Symptoms</Text>
                  <Text style={styles.refText}>{report.pest_disease.symptoms}</Text>
                </View>
              )}
              {report.pest_disease.treatment && (
                <View style={styles.refSection}>
                  <Text style={styles.refLabel}>Recommended Treatment</Text>
                  <Text style={styles.refText}>{report.pest_disease.treatment}</Text>
                </View>
              )}
              {report.pest_disease.prevention && (
                <View style={styles.refSection}>
                  <Text style={styles.refLabel}>Prevention</Text>
                  <Text style={styles.refText}>{report.pest_disease.prevention}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Timeline */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('pestAlerts.timeline', { defaultValue: 'Timeline' })}</Text>
          <View style={styles.timeline}>
            <TimelineEvent
              icon="add-circle-outline"
              title="Report Created"
              date={report.created_at}
              color={colors.blue[500]}
            />
            {report.verified_by && report.verified_at && (
              <TimelineEvent
                icon="checkmark-circle-outline"
                title={`Verified${report.verifier ? ` by ${report.verifier.first_name}` : ''}`}
                date={report.verified_at}
                color={colors.primary[600]}
              />
            )}
            {report.treatment_date && (
              <TimelineEvent
                icon="medkit-outline"
                title="Treatment Applied"
                date={report.treatment_date}
                color={colors.primary[400]}
              />
            )}
          </View>
        </View>

        {/* Action buttons */}
        <View style={styles.actionsSection}>
          {nextStatus && (
            <Pressable
              style={[styles.actionButton, { backgroundColor: colors.primary[600] }]}
              onPress={() => handleStatusChange(nextStatus)}
              disabled={updateMutation.isPending}
            >
              <Ionicons name="arrow-forward-outline" size={18} color={colors.white} />
              <Text style={styles.actionButtonText}>
                {t(`pestAlerts.markAs${nextStatus.charAt(0).toUpperCase() + nextStatus.slice(1)}`, {
                  defaultValue: `Mark as ${nextStatus.charAt(0).toUpperCase() + nextStatus.slice(1)}`,
                })}
              </Text>
            </Pressable>
          )}
          {report.status !== 'dismissed' && report.status !== 'resolved' && (
            <Pressable
              style={[styles.actionButton, { backgroundColor: colors.gray[200] }]}
              onPress={() => handleStatusChange('dismissed')}
              disabled={updateMutation.isPending}
            >
              <Ionicons name="close-outline" size={18} color={colors.gray[700]} />
              <Text style={[styles.actionButtonText, { color: colors.gray[700] }]}>
                {t('pestAlerts.dismiss', { defaultValue: 'Dismiss' })}
              </Text>
            </Pressable>
          )}
          {canEscalate && (
            <Pressable
              style={[styles.actionButton, { backgroundColor: colors.red[50], borderWidth: 1, borderColor: colors.red[500] }]}
              onPress={handleEscalate}
              disabled={escalateMutation.isPending}
            >
              <Ionicons name="megaphone-outline" size={18} color={colors.red[500]} />
              <Text style={[styles.actionButtonText, { color: colors.red[500] }]}>
                {t('pestAlerts.escalate', { defaultValue: 'Escalate' })}
              </Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function DetailRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Ionicons name={icon as any} size={16} color={colors.gray[400]} />
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function TimelineEvent({ icon, title, date, color }: { icon: string; title: string; date: string; color: string }) {
  return (
    <View style={styles.timelineEvent}>
      <View style={[styles.timelineIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon as any} size={16} color={color} />
      </View>
      <View style={styles.timelineContent}>
        <Text style={styles.timelineTitle}>{title}</Text>
        <Text style={styles.timelineDate}>{new Date(date).toLocaleDateString()}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[50],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: colors.gray[500],
    fontSize: fontSize.base,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xl * 2,
  },
  headerCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderLeftWidth: 4,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  headerRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  severityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    gap: 4,
  },
  severityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  severityText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  statusText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  pestType: {
    fontSize: fontSize.xs,
    color: colors.gray[500],
    marginTop: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  section: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.gray[500],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  detailGrid: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    gap: spacing.sm,
  },
  detailLabel: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
    width: 100,
  },
  detailValue: {
    fontSize: fontSize.sm,
    color: colors.gray[900],
    fontWeight: fontWeight.medium,
    flex: 1,
  },
  notesText: {
    fontSize: fontSize.sm,
    color: colors.gray[700],
    lineHeight: 20,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.sm,
  },
  treatmentDate: {
    fontSize: fontSize.xs,
    color: colors.gray[400],
    marginTop: spacing.xs,
    paddingLeft: spacing.md,
  },
  photoScroll: {
    flexDirection: 'row',
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: borderRadius.md,
    marginRight: spacing.sm,
  },
  referenceCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.sm,
  },
  refSection: {
    marginBottom: spacing.sm,
  },
  refLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.gray[500],
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  refText: {
    fontSize: fontSize.sm,
    color: colors.gray[700],
    lineHeight: 18,
  },
  timeline: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.sm,
  },
  timelineEvent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  timelineIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineContent: {
    flex: 1,
  },
  timelineTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.gray[900],
  },
  timelineDate: {
    fontSize: fontSize.xs,
    color: colors.gray[400],
  },
  actionsSection: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.lg,
  },
  actionButtonText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
});
