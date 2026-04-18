import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, fontSize, fontWeight, shadows } from '@/constants/theme';

export interface ToastProps {
  visible: boolean;
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  onHide?: () => void;
}

const typeStyles = {
  success: {
    accentColor: colors.primary[600],
    icon: 'checkmark-circle-outline' as keyof typeof Ionicons.glyphMap,
  },
  error: {
    accentColor: colors.red[600],
    icon: 'close-circle-outline' as keyof typeof Ionicons.glyphMap,
  },
  warning: {
    accentColor: colors.yellow[600],
    icon: 'warning-outline' as keyof typeof Ionicons.glyphMap,
  },
  info: {
    accentColor: colors.blue[600],
    icon: 'information-circle-outline' as keyof typeof Ionicons.glyphMap,
  },
};

export function Toast({
  visible,
  message,
  type = 'info',
  duration = 3000,
  onHide,
}: ToastProps) {
  const [mounted, setMounted] = useState(visible);
  const translateY = useRef(new Animated.Value(80)).current;
  const hideTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
      }).start();

      if (hideTimeout.current) {
        clearTimeout(hideTimeout.current);
      }
      hideTimeout.current = setTimeout(() => {
        Animated.timing(translateY, {
          toValue: 80,
          duration: 200,
          useNativeDriver: true,
        }).start(() => {
          setMounted(false);
          onHide?.();
        });
      }, duration);
    } else if (mounted) {
      if (hideTimeout.current) {
        clearTimeout(hideTimeout.current);
      }
      Animated.timing(translateY, {
        toValue: 80,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setMounted(false);
      });
    }

    return () => {
      if (hideTimeout.current) {
        clearTimeout(hideTimeout.current);
      }
    };
  }, [duration, mounted, onHide, translateY, visible]);

  if (!mounted) {
    return null;
  }

  const selectedType = typeStyles[type];

  return (
    <Animated.View
      accessibilityLiveRegion="polite"
      style={[
        styles.container,
        {
          borderLeftColor: selectedType.accentColor,
          transform: [{ translateY }],
        },
      ]}
    >
      <View style={styles.content}>
        <Ionicons name={selectedType.icon} size={20} color={selectedType.accentColor} />
        <View style={styles.messageWrap}>
          <Animated.Text style={styles.message}>{message}</Animated.Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    borderLeftWidth: 4,
    padding: spacing.md,
    ...shadows.md,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  messageWrap: {
    marginLeft: spacing.sm,
    flexShrink: 1,
  },
  message: {
    color: colors.gray[700],
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
});
