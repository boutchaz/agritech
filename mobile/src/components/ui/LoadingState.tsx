import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { colors, spacing } from '@/constants/theme';
import { AppText } from './AppText';

export interface LoadingStateProps {
  message?: string;
  size?: 'small' | 'large';
  testID?: string;
}

export function LoadingState({ message, size = 'large', testID }: LoadingStateProps) {
  return (
    <View
      testID={testID}
      style={styles.container}
      accessibilityRole="progressbar"
      accessibilityLabel="Loading"
    >
      <ActivityIndicator size={size} color={colors.primary[600]} />
      {message ? (
        <AppText variant="body" color={colors.gray[500]} align="center">
          {message}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
});
