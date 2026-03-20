import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/providers/ThemeProvider';

type SyncState = 'synced' | 'offline' | 'pending';

type SyncBladeProps = {
  state: SyncState;
};

export default function SyncBlade({ state }: SyncBladeProps) {
  const insets = useSafeAreaInsets();
  const { colors, space, radii, font } = useTheme();
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (state === 'pending') {
      const anim = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 0.5, duration: 800, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
        ]),
      );
      anim.start();
      return () => anim.stop();
    }
    pulse.setValue(1);
    return undefined;
  }, [state, pulse]);

  const config = {
    synced: { bg: colors.brandContainer, icon: 'checkmark-circle' as const, label: 'Synced', fg: colors.brandText },
    offline: { bg: colors.accent, icon: 'cloud-offline' as const, label: 'Offline', fg: colors.onAccent },
    pending: { bg: colors.surfaceHigh, icon: 'sync' as const, label: 'Syncing...', fg: colors.textSecondary },
  }[state];

  return (
    <Animated.View
      style={[
        styles.blade,
        {
          backgroundColor: config.bg,
          paddingTop: insets.top + space.xs,
          paddingBottom: space.xs,
          paddingHorizontal: space.lg,
          opacity: pulse,
        },
      ]}
    >
      <View style={styles.row}>
        <Ionicons name={config.icon} size={14} color={config.fg} />
        <Text style={[styles.label, { color: config.fg, fontFamily: font.medium, marginLeft: space.xs }]}>
          {config.label}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  blade: {
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});
