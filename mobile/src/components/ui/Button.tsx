import type { ReactNode } from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '@/constants/theme';

export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  children: ReactNode;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  fullWidth?: boolean;
  testID?: string;
  accessibilityLabel?: string;
}

const variantStyles = {
  primary: {
    backgroundColor: colors.primary[600],
    borderColor: colors.primary[600],
    textColor: colors.white,
  },
  secondary: {
    backgroundColor: colors.gray[100],
    borderColor: colors.gray[100],
    textColor: colors.gray[700],
  },
  outline: {
    backgroundColor: colors.transparent,
    borderColor: colors.primary[600],
    textColor: colors.primary[600],
  },
  ghost: {
    backgroundColor: colors.transparent,
    borderColor: colors.transparent,
    textColor: colors.primary[600],
  },
  destructive: {
    backgroundColor: colors.red[600],
    borderColor: colors.red[600],
    textColor: colors.white,
  },
};

const sizeStyles = {
  sm: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    fontSize: fontSize.sm,
    iconSize: 14,
  },
  md: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    fontSize: fontSize.base,
    iconSize: 18,
  },
  lg: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    fontSize: fontSize.lg,
    iconSize: 20,
  },
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  onPress,
  children,
  leftIcon,
  rightIcon,
  fullWidth = false,
  testID,
  accessibilityLabel,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const selectedVariant = variantStyles[variant];
  const selectedSize = sizeStyles[size];
  const computedAccessibilityLabel =
    accessibilityLabel ??
    (typeof children === 'string' || typeof children === 'number' ? String(children) : undefined);

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={computedAccessibilityLabel}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: selectedVariant.backgroundColor,
          borderColor: selectedVariant.borderColor,
          paddingVertical: selectedSize.paddingVertical,
          paddingHorizontal: selectedSize.paddingHorizontal,
        },
        fullWidth && styles.fullWidth,
        (pressed || isDisabled) && styles.dimmed,
      ]}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator color={selectedVariant.textColor} size="small" />
        ) : (
          <>
            {leftIcon ? (
              <Ionicons
                name={leftIcon}
                size={selectedSize.iconSize}
                color={selectedVariant.textColor}
                style={styles.leftIcon}
              />
            ) : null}
            <Text
              style={[
                styles.text,
                {
                  color: selectedVariant.textColor,
                  fontSize: selectedSize.fontSize,
                },
              ]}
            >
              {children}
            </Text>
            {rightIcon ? (
              <Ionicons
                name={rightIcon}
                size={selectedSize.iconSize}
                color={selectedVariant.textColor}
                style={styles.rightIcon}
              />
            ) : null}
          </>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  dimmed: {
    opacity: 0.6,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: fontWeight.semibold,
  },
  leftIcon: {
    marginRight: spacing.xs,
  },
  rightIcon: {
    marginLeft: spacing.xs,
  },
});
