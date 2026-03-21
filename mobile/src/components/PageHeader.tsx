import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing, borderRadius } from '@/constants/theme';
import { useTheme } from '@/providers/ThemeProvider';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

type HeaderAction = {
  icon: IconName;
  onPress: () => void;
};

type PageHeaderProps = {
  title: string;
  showBack?: boolean;
  actions?: HeaderAction[];
  onMorePress?: () => void;
  transparent?: boolean;
};

export default function PageHeader({
  title,
  showBack = true,
  actions,
  onMorePress,
  transparent = false,
}: PageHeaderProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors: themeColors } = useTheme();

  const iconColor = transparent ? '#ffffff' : themeColors.textPrimary;
  const hasRight = (actions && actions.length > 0) || !!onMorePress;

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top,
          backgroundColor: transparent ? 'transparent' : themeColors.background,
        },
      ]}
    >
      <View style={styles.row}>
        <View style={styles.slot}>
          {showBack ? (
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => router.back()}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="arrow-back" size={24} color={iconColor} />
            </TouchableOpacity>
          ) : (
            <View style={styles.iconBtn} />
          )}
        </View>

        <Text
          style={[
            styles.title,
            { color: transparent ? '#ffffff' : themeColors.textPrimary },
          ]}
          numberOfLines={1}
        >
          {title}
        </Text>

        <View style={[styles.slot, styles.slotRight]}>
          {actions?.map((action) => (
            <TouchableOpacity
              key={action.icon}
              style={styles.iconBtn}
              onPress={action.onPress}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name={action.icon} size={22} color={iconColor} />
            </TouchableOpacity>
          ))}
          {onMorePress && (
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={onMorePress}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="ellipsis-horizontal" size={22} color={iconColor} />
            </TouchableOpacity>
          )}
          {!hasRight && <View style={styles.iconBtn} />}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    paddingHorizontal: spacing.sm,
  },
  slot: {
    width: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  slotRight: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.xs,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '600',
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
