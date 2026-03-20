import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/providers/ThemeProvider';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

type CardProps = {
  title: string;
  subtitle?: string;
  icon?: IconName;
  ctaLabel?: string;
  onPress?: () => void;
  onCtaPress?: () => void;
};

export default function Card({ title, subtitle, icon, ctaLabel, onPress, onCtaPress }: CardProps) {
  const { colors, space, type, font, radii, elevation: elev, sz } = useTheme();

  return (
    <TouchableOpacity
      activeOpacity={onPress ? 0.85 : 1}
      onPress={onPress}
      disabled={!onPress}
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderRadius: radii.lg,
          padding: space.lg,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.outlineVariant + '33',
        },
        elev.sm,
      ]}
    >
      {icon && (
        <View
          style={[
            styles.iconWrap,
            {
              backgroundColor: colors.surfaceLow,
              borderRadius: radii.md,
              width: 44,
              height: 44,
              marginBottom: space.md,
            },
          ]}
        >
          <Ionicons name={icon} size={22} color={colors.brandPrimary} />
        </View>
      )}

      <Text
        style={{
          fontSize: sz('h3'),
          lineHeight: type.h3.lineHeight,
          fontFamily: font.bold,
          color: colors.textPrimary,
          letterSpacing: type.h3.tracking,
        }}
        numberOfLines={2}
      >
        {title}
      </Text>

      {subtitle && (
        <Text
          style={{
            fontSize: sz('bodySmall'),
            lineHeight: type.bodySmall.lineHeight,
            fontFamily: font.regular,
            color: colors.textSecondary,
            letterSpacing: type.bodySmall.tracking,
            marginTop: space.xs,
          }}
          numberOfLines={3}
        >
          {subtitle}
        </Text>
      )}

      {ctaLabel && (
        <TouchableOpacity
          onPress={onCtaPress ?? onPress}
          activeOpacity={0.8}
          style={[
            styles.cta,
            {
              backgroundColor: colors.brandPrimary,
              borderRadius: radii.md,
              paddingHorizontal: space.lg,
              paddingVertical: space.md,
              marginTop: space.lg,
            },
          ]}
        >
          <Text
            style={{
              fontSize: type.label.size,
              fontFamily: font.medium,
              color: colors.textInverse,
              letterSpacing: type.label.tracking,
              textAlign: 'center',
            }}
          >
            {ctaLabel}
          </Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cta: {
    alignSelf: 'stretch',
  },
});
