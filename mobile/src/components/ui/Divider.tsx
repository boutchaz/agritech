import { StyleSheet, View } from 'react-native';
import { colors } from '@/constants/theme';

export interface DividerProps {
  orientation?: 'horizontal' | 'vertical';
  color?: string;
  thickness?: number;
  spacing?: number;
  testID?: string;
}

export function Divider({
  orientation = 'horizontal',
  color = colors.gray[200],
  thickness = 1,
  spacing = 0,
  testID,
}: DividerProps) {
  return (
    <View
      testID={testID}
      accessibilityRole={'separator' as any}
      importantForAccessibility="no"
      style={[
        styles.base,
        orientation === 'horizontal'
          ? {
              height: thickness,
              width: '100%',
              marginVertical: spacing,
            }
          : {
              width: thickness,
              alignSelf: 'stretch',
              marginVertical: spacing,
            },
        { backgroundColor: color },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    flexShrink: 0,
  },
});
