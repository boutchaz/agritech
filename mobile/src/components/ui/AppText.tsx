import type { ReactNode } from 'react';
import { Text, StyleSheet, TextStyle } from 'react-native';
import { colors, fontSize, fontWeight } from '@/constants/theme';

export interface AppTextProps {
  variant?: 'heading' | 'subheading' | 'body' | 'caption' | 'label' | 'overline';
  color?: string;
  align?: 'left' | 'center' | 'right';
  numberOfLines?: number;
  children: ReactNode;
  testID?: string;
}

const variantMap: Record<NonNullable<AppTextProps['variant']>, TextStyle> = {
  heading: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
  },
  subheading: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  body: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.normal,
  },
  caption: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.normal,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  overline: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    textTransform: 'uppercase',
  },
};

export function AppText({
  variant = 'body',
  color = colors.gray[700],
  align = 'left',
  numberOfLines,
  children,
  testID,
}: AppTextProps) {
  return (
    <Text
      testID={testID}
      numberOfLines={numberOfLines}
      style={[styles.base, variantMap[variant], { color, textAlign: align }]}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    color: colors.gray[700],
  },
});
