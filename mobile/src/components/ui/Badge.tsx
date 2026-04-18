import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '@/constants/theme';

export interface BadgeProps {
  variant?: 'success' | 'warning' | 'error' | 'info' | 'neutral';
  size?: 'sm' | 'md';
  label: string;
  dotOnly?: boolean;
  testID?: string;
}

const variantStyles = {
  success: {
    backgroundColor: colors.primary[50],
    textColor: colors.primary[700],
  },
  warning: {
    backgroundColor: colors.yellow[50],
    textColor: colors.yellow[600],
  },
  error: {
    backgroundColor: colors.red[50],
    textColor: colors.red[600],
  },
  info: {
    backgroundColor: colors.blue[50],
    textColor: colors.blue[600],
  },
  neutral: {
    backgroundColor: colors.gray[100],
    textColor: colors.gray[600],
  },
};

const sizeStyles = {
  sm: {
    paddingVertical: 2,
    paddingHorizontal: spacing.xs,
    fontSize: fontSize.xs,
    dotSize: 8,
  },
  md: {
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    fontSize: fontSize.sm,
    dotSize: 10,
  },
};

export function Badge({
  variant = 'neutral',
  size = 'md',
  label,
  dotOnly = false,
  testID,
}: BadgeProps) {
  const selectedVariant = variantStyles[variant];
  const selectedSize = sizeStyles[size];

  return (
    <View
      testID={testID}
      accessibilityRole="text"
      style={[
        styles.container,
        {
          backgroundColor: selectedVariant.backgroundColor,
          paddingVertical: dotOnly ? 0 : selectedSize.paddingVertical,
          paddingHorizontal: dotOnly ? 0 : selectedSize.paddingHorizontal,
        },
      ]}
    >
      {dotOnly ? (
        <View
          style={[
            styles.dot,
            {
              backgroundColor: selectedVariant.textColor,
              width: selectedSize.dotSize,
              height: selectedSize.dotSize,
            },
          ]}
        />
      ) : (
        <Text
          style={[
            styles.text,
            {
              color: selectedVariant.textColor,
              fontSize: selectedSize.fontSize,
            },
          ]}
        >
          {label}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'flex-start',
    borderRadius: borderRadius.full,
  },
  text: {
    fontWeight: fontWeight.semibold,
  },
  dot: {
    borderRadius: borderRadius.full,
  },
});
