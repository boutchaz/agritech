import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { Animated, Modal, Pressable, StyleSheet, View } from 'react-native';
import { colors, spacing, borderRadius } from '@/constants/theme';
import { AppText } from './AppText';

export interface BottomSheetProps {
  visible: boolean;
  onDismiss: () => void;
  title?: string;
  children: ReactNode;
  testID?: string;
}

export function BottomSheet({ visible, onDismiss, title, children, testID }: BottomSheetProps) {
  const [mounted, setMounted] = useState(visible);
  const translateY = useRef(new Animated.Value(360)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
      }).start();
    }
  }, [translateY, visible]);

  const dismiss = () => {
    Animated.timing(translateY, {
      toValue: 360,
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      setMounted(false);
      onDismiss();
    });
  };

  if (!mounted) {
    return null;
  }

  return (
    <Modal transparent visible={mounted} animationType="none" onRequestClose={dismiss}>
      <View style={styles.overlay} testID={testID}>
        <Pressable style={styles.backdrop} onPress={dismiss} />
        <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
          <View style={styles.handle} />
          {title ? (
            <AppText variant="subheading" align="center">
              {title}
            </AppText>
          ) : null}
          <View style={styles.content}>{children}</View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    minHeight: 120,
  },
  handle: {
    width: 44,
    height: 5,
    borderRadius: borderRadius.full,
    backgroundColor: colors.gray[300],
    alignSelf: 'center',
    marginBottom: spacing.sm,
  },
  content: {
    marginTop: spacing.sm,
  },
});
