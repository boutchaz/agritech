import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '@/constants/theme';
import { AppText } from './AppText';
import { Button } from './Button';

export interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  action?: { label: string; onPress: () => void };
  testID?: string;
}

export function EmptyState({ icon, title, subtitle, action, testID }: EmptyStateProps) {
  return (
    <View testID={testID} style={styles.container}>
      <Ionicons name={icon} size={48} color={colors.gray[300]} />
      <AppText variant="subheading" align="center" accessibilityRole="text">
        {title}
      </AppText>
      {subtitle ? (
        <AppText variant="body" color={colors.gray[500]} align="center" accessibilityRole="text">
          {subtitle}
        </AppText>
      ) : null}
      {action ? (
        <View style={styles.actionWrap}>
          <Button onPress={action.onPress}>{action.label}</Button>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.sm,
  },
  actionWrap: {
    marginTop: spacing.sm,
  },
});
