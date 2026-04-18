import { Text, StyleSheet, TouchableOpacity, ActivityIndicator, type ViewStyle } from 'react-native';
import { useTheme } from '@/providers/ThemeProvider';
import { LinearGradient } from 'expo-linear-gradient';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
};

export default function Button({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
}: ButtonProps) {
  const { colors, space, radii, font } = useTheme();

  const isDisabled = disabled || loading;

  if (variant === 'primary') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={isDisabled}
        activeOpacity={0.9}
        style={[fullWidth && styles.fullWidth, style]}
      >
        <LinearGradient
          colors={isDisabled ? [colors.surfaceHigh, colors.surfaceHigh] : [colors.gradientFrom, colors.gradientTo]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.base,
            {
              borderRadius: radii.md,
              paddingHorizontal: space.xl,
              paddingVertical: space.md,
            },
          ]}
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.onBrand} />
          ) : (
            <Text style={[styles.label, { color: colors.onBrand, fontFamily: font.semibold }]}>
              {label}
            </Text>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  const bg = variant === 'secondary' ? colors.accent : 'transparent';
  const fg = variant === 'secondary' ? colors.onAccent : colors.brandPrimary;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.85}
      style={[
        styles.base,
        {
          backgroundColor: isDisabled ? colors.surfaceHigh : bg,
          borderRadius: radii.md,
          paddingHorizontal: space.xl,
          paddingVertical: space.md,
        },
        fullWidth && styles.fullWidth,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={fg} />
      ) : (
        <Text style={[styles.label, { color: isDisabled ? colors.textTertiary : fg, fontFamily: font.semibold }]}>
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  label: {
    fontSize: 14,
    letterSpacing: 0.1,
    textTransform: 'uppercase',
  },
});
