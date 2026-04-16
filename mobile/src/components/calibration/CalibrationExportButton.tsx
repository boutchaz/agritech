import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '@/constants/theme';
import { Button, Badge } from '@/components/ui';
import { useExportCalibration } from '@/hooks/useCalibration';

interface CalibrationExportButtonProps {
  calibrationId: string;
  availableFormats?: ('json' | 'csv' | 'zip')[];
}

const formatIcons: Record<string, string> = {
  json: '{ }',
  csv: ',',
  zip: '📦',
};

export function CalibrationExportButton({
  calibrationId,
  availableFormats,
}: CalibrationExportButtonProps) {
  const { t } = useTranslation('common');
  const exportMutation = useExportCalibration();

  const formats = availableFormats ?? ['json', 'csv', 'zip'];

  const handleExport = (format: 'json' | 'csv' | 'zip') => {
    exportMutation.mutate({ calibrationId, format });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{t('calibration.export.label', 'Exporter')}</Text>
      <View style={styles.formats}>
        {formats.map((format) => (
          <Button
            key={format}
            variant="outline"
            size="sm"
            loading={exportMutation.isPending}
            disabled={exportMutation.isPending}
            onPress={() => handleExport(format)}
          >
            {formatIcons[format]} {format.toUpperCase()}
          </Button>
        ))}
      </View>
      {exportMutation.isSuccess && (
        <Badge variant="success" size="sm" label={t('calibration.export.success', 'Exporté')} />
      )}
      {exportMutation.isError && (
        <Badge variant="error" size="sm" label={t('calibration.export.error', 'Erreur')} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.gray[700],
  },
  formats: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
});
