import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, fontSize } from '@/constants/theme';

export interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onClear?: () => void;
  autoFocus?: boolean;
  testID?: string;
}

export function SearchBar({
  value,
  onChangeText,
  placeholder = 'Search',
  onClear,
  autoFocus = false,
  testID,
}: SearchBarProps) {
  const [focused, setFocused] = useState(false);

  const clear = () => {
    if (onClear) {
      onClear();
      return;
    }
    onChangeText('');
  };

  return (
    <View
      testID={testID}
      style={[
        styles.container,
        {
          borderColor: focused ? colors.gray[300] : colors.transparent,
        },
      ]}
    >
      <Ionicons name="search" size={18} color={colors.gray[400]} />
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.gray[400]}
        autoFocus={autoFocus}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      {value.length > 0 ? (
        <Pressable onPress={clear} hitSlop={8} style={styles.clearButton}>
          <Ionicons name="close-circle" size={18} color={colors.gray[400]} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray[100],
    borderWidth: 1,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    minHeight: 40,
  },
  input: {
    flex: 1,
    marginLeft: spacing.xs,
    fontSize: fontSize.base,
    color: colors.gray[700],
    paddingVertical: spacing.sm,
  },
  clearButton: {
    marginLeft: spacing.xs,
  },
});
