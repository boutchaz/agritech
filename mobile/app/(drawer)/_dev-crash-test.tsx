import { Pressable, StyleSheet, Text, View } from 'react-native';
import PageHeader from '@/components/PageHeader';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '@/constants/theme';

export default function DevCrashTestScreen() {
  if (!__DEV__) return null;
  return (
    <View style={styles.container}>
      <PageHeader title="Dev crash test" showBack={false} />
      <Pressable style={styles.button} onPress={() => { throw new Error('Test crash for ErrorBoundary verification'); }}>
        <Text style={styles.text}>Crash now</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.gray[50], padding: spacing.lg, gap: spacing.lg },
  button: { marginTop: spacing.xl, paddingVertical: spacing.md, paddingHorizontal: spacing.lg, borderRadius: borderRadius.lg, backgroundColor: colors.red[500], alignItems: 'center' },
  text: { color: colors.white, fontSize: fontSize.base, fontWeight: fontWeight.bold },
});
