import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius } from '@/constants/theme';

export interface IconButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  accessibilityLabel: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  testID?: string;
}

const variantMap = {
  primary: {
    backgroundColor: colors.primary[600],
    borderColor: colors.primary[600],
    iconColor: colors.white,
  },
  ghost: {
    backgroundColor: colors.transparent,
    borderColor: colors.transparent,
    iconColor: colors.primary[600],
  },
  outline: {
    backgroundColor: colors.transparent,
    borderColor: colors.primary[600],
    iconColor: colors.primary[600],
  },
};

const sizeMap = {
  sm: { button: 32, icon: 16 },
  md: { button: 40, icon: 20 },
  lg: { button: 48, icon: 24 },
};

export function IconButton({
  icon,
  accessibilityLabel,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  testID,
}: IconButtonProps) {
  const selectedVariant = variantMap[variant];
  const selectedSize = sizeMap[size];
  const isDisabled = disabled || loading;

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.base,
        {
          width: selectedSize.button,
          height: selectedSize.button,
          borderRadius: borderRadius.full,
          backgroundColor: selectedVariant.backgroundColor,
          borderColor: selectedVariant.borderColor,
        },
        (pressed || isDisabled) && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={selectedVariant.iconColor} />
      ) : (
        <Ionicons name={icon} size={selectedSize.icon} color={selectedVariant.iconColor} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  disabled: {
    opacity: 0.6,
  },
});
