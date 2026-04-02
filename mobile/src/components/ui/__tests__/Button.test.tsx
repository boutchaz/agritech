import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { Button } from '../Button';
import { colors } from '@/constants/theme';

const renderer = require('react-test-renderer');
const { act } = renderer;

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

const getButtonPressable = (tree: any) => tree.root.findByProps({ accessibilityRole: 'button' });

describe('Button', () => {
  it('renders with title text', () => {
    let tree: any;
    act(() => {
      tree = renderer.create(<Button>Save</Button>);
    });

    expect(tree.root.findByType(Text).props.children).toBe('Save');
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    let tree: any;
    act(() => {
      tree = renderer.create(<Button onPress={onPress}>Submit</Button>);
    });

    act(() => {
      getButtonPressable(tree).props.onPress();
    });

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('applies correct styles for different variants', () => {
    let primaryTree: any;
    let outlineTree: any;
    let ghostTree: any;
    let destructiveTree: any;
    act(() => {
      primaryTree = renderer.create(<Button variant="primary">Primary</Button>);
      outlineTree = renderer.create(<Button variant="outline">Outline</Button>);
      ghostTree = renderer.create(<Button variant="ghost">Ghost</Button>);
      destructiveTree = renderer.create(<Button variant="destructive">Delete</Button>);
    });

    const primaryStyle = StyleSheet.flatten(
      getButtonPressable(primaryTree).props.style({ pressed: false })
    );
    const outlineStyle = StyleSheet.flatten(
      getButtonPressable(outlineTree).props.style({ pressed: false })
    );
    const ghostStyle = StyleSheet.flatten(
      getButtonPressable(ghostTree).props.style({ pressed: false })
    );
    const destructiveStyle = StyleSheet.flatten(
      getButtonPressable(destructiveTree).props.style({ pressed: false })
    );

    expect(primaryStyle.backgroundColor).toBe(colors.primary[600]);
    expect(outlineStyle.backgroundColor).toBe(colors.transparent);
    expect(outlineStyle.borderColor).toBe(colors.primary[600]);
    expect(ghostStyle.backgroundColor).toBe(colors.transparent);
    expect(ghostStyle.borderColor).toBe(colors.transparent);
    expect(destructiveStyle.backgroundColor).toBe(colors.red[600]);
  });

  it('is disabled when disabled prop is true', () => {
    let tree: any;
    act(() => {
      tree = renderer.create(<Button disabled>Disabled</Button>);
    });

    expect(getButtonPressable(tree).props.disabled).toBe(true);
  });

  it('renders loading state', () => {
    let tree: any;
    act(() => {
      tree = renderer.create(<Button loading>Loading</Button>);
    });

    expect(getButtonPressable(tree).props.disabled).toBe(true);
    expect(tree.root.findByType(ActivityIndicator)).toBeTruthy();
    expect(() => tree.root.findByType(Text)).toThrow();
  });
});
