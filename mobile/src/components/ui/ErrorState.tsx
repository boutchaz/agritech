import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '@/constants/theme';
import { AppText } from './AppText';
import { Button } from './Button';

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  testID?: string;
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  testID,
}: ErrorStateProps) {
  return (
    <View testID={testID} style={styles.container}>
      <Ionicons name="warning-outline" size={48} color={colors.red[500]} />
      <AppText variant="subheading" align="center">
        {title}
      </AppText>
      <AppText variant="body" color={colors.gray[500]} align="center">
        {message}
      </AppText>
      {onRetry ? (
        <View style={styles.actionWrap}>
          <Button variant="outline" onPress={onRetry}>
            Retry
          </Button>
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
