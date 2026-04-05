import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '@/constants/theme';
import { AppText } from './AppText';

export interface ListItemProps {
  title: string;
  subtitle?: string;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  leftIconColor?: string;
  rightElement?: ReactNode;
  showChevron?: boolean;
  onPress?: () => void;
  disabled?: boolean;
  testID?: string;
  accessibilityRole?: 'button' | 'text';
  accessibilityLabel?: string;
}

export function ListItem({
  title,
  subtitle,
  leftIcon,
  leftIconColor = colors.primary[600],
  rightElement,
  showChevron = true,
  onPress,
  disabled = false,
  testID,
  accessibilityRole = 'button',
  accessibilityLabel,
}: ListItemProps) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled || !onPress}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel ?? subtitle ?? title}
      style={({ pressed }) => [styles.container, pressed && styles.pressed, disabled && styles.disabled]}
    >
      {leftIcon ? (
        <View style={styles.leftIconWrap}>
          <Ionicons name={leftIcon} size={20} color={leftIconColor} />
        </View>
      ) : null}

      <View style={styles.content}>
        <AppText variant="label">{title}</AppText>
        {subtitle ? (
          <AppText variant="caption" color={colors.gray[500]}>
            {subtitle}
          </AppText>
        ) : null}
      </View>

      {rightElement ? (
        <View>{rightElement}</View>
      ) : showChevron ? (
        <Ionicons name="chevron-forward" size={18} color={colors.gray[400]} />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  leftIconWrap: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    gap: 2,
  },
  pressed: {
    backgroundColor: colors.gray[50],
  },
  disabled: {
    opacity: 0.5,
  },
});
