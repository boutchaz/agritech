import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, fontSize, spacing } from '@/constants/theme';
import PageHeader from '@/components/PageHeader';

export default function AccountingScreen() {
  const { t } = useTranslation(['common', 'navigation']);

  return (
    <View style={styles.container}>
      <PageHeader title={t('domains.accounting', { ns: 'navigation', defaultValue: 'Accounting' })} onMorePress={() => {}} />
      <View style={styles.body}>
        <Text style={styles.subtitle}>{t('empty.noData', { ns: 'common', defaultValue: 'No data available' })}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[50],
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
    textAlign: 'center',
  },
});
