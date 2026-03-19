import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '@/constants/theme';
import { AppText } from './AppText';

export interface SegmentedControlOption {
  key: string;
  label: string;
  count?: number;
}

export interface SegmentedControlProps {
  options: SegmentedControlOption[];
  value: string;
  onChange: (key: string) => void;
  testID?: string;
}

export function SegmentedControl({ options, value, onChange, testID }: SegmentedControlProps) {
  return (
    <ScrollView
      testID={testID}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {options.map((option) => {
        const isActive = option.key === value;
        return (
          <Pressable
            key={option.key}
            onPress={() => onChange(option.key)}
            style={({ pressed }) => [
              styles.pill,
              {
                backgroundColor: isActive ? colors.primary[600] : colors.gray[100],
              },
              pressed && styles.pressed,
            ]}
          >
            <AppText
              variant="label"
              color={isActive ? colors.white : colors.gray[600]}
              numberOfLines={1}
            >
              {option.label}
            </AppText>
            {typeof option.count === 'number' ? (
              <View
                style={[
                  styles.countBadge,
                  {
                    backgroundColor: isActive ? colors.primary[700] : colors.gray[200],
                  },
                ]}
              >
                <AppText
                  variant="caption"
                  color={isActive ? colors.white : colors.gray[600]}
                >
                  {option.count}
                </AppText>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.full,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  pressed: {
    opacity: 0.85,
  },
  countBadge: {
    minWidth: 18,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
});
