import type { ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheet } from './BottomSheet';
import { Button } from './Button';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '@/constants/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

export interface ConfirmDialogProps {
  visible: boolean;
  onDismiss: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'destructive' | 'primary';
  loading?: boolean;
  icon?: IconName;
  children?: ReactNode;
}

export function ConfirmDialog({
  visible,
  onDismiss,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'primary',
  loading = false,
  icon,
  children,
}: ConfirmDialogProps) {
  const iconColor = variant === 'destructive' ? colors.red[600] : colors.primary[600];
  const iconBg = variant === 'destructive' ? colors.red[50] : colors.primary[50];

  return (
    <BottomSheet visible={visible} onDismiss={onDismiss} accessibilityViewIsModal>
      <View style={styles.container}>
        {icon && (
          <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>
            <Ionicons name={icon} size={28} color={iconColor} />
          </View>
        )}

        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>

        {children}

        <View style={styles.actions}>
          <Button
            variant="secondary"
            onPress={onDismiss}
            disabled={loading}
            fullWidth
            accessibilityLabel={cancelLabel}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={variant}
            onPress={onConfirm}
            loading={loading}
            fullWidth
            accessibilityLabel={confirmLabel}
          >
            {confirmLabel}
          </Button>
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.gray[900],
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  message: {
    fontSize: fontSize.sm,
    color: colors.gray[500],
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
  },
});
