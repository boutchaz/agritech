import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, spacing, borderRadius, shadows } from '@/constants/theme';

export interface CardProps {
  variant?: 'elevated' | 'outlined' | 'flat';
  onPress?: () => void;
  children: ReactNode;
  header?: ReactNode;
  footer?: ReactNode;
  padding?: number;
  testID?: string;
}

const variantStyles = {
  elevated: {
    backgroundColor: colors.white,
    borderWidth: 0,
    ...shadows.md,
  },
  outlined: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  flat: {
    backgroundColor: colors.gray[50],
    borderWidth: 0,
  },
};

export function Card({
  variant = 'elevated',
  onPress,
  children,
  header,
  footer,
  padding = spacing.md,
  testID,
}: CardProps) {
  const content = (
    <View style={[styles.container, variantStyles[variant], { padding }]}>
      {header ? <View style={styles.header}>{header}</View> : null}
      <View>{children}</View>
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        testID={testID}
        onPress={onPress}
        style={({ pressed }) => [pressed && styles.pressed]}
      >
        {content}
      </Pressable>
    );
  }

  return <View testID={testID}>{content}</View>;
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
  },
  header: {
    marginBottom: spacing.sm,
  },
  footer: {
    marginTop: spacing.sm,
  },
  pressed: {
    opacity: 0.9,
  },
});
