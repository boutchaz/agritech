import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, fontSize, spacing } from '@/constants/theme';

export default function ProductionScreen() {
  const { t } = useTranslation(['common', 'navigation']);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('domains.production', { ns: 'navigation' })}</Text>
      <Text style={styles.subtitle}>{t('empty.noData', { ns: 'common' })}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gray[50],
    padding: spacing.lg,
  },
  title: {
    fontSize: fontSize.lg,
    color: colors.gray[700],
  },
  subtitle: {
    marginTop: spacing.sm,
    fontSize: fontSize.sm,
    color: colors.gray[500],
    textAlign: 'center',
  },
});
