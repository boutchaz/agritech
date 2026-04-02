import React from 'react';
import { Text } from 'react-native';
import { ErrorBoundary } from '../ErrorBoundary';

const renderer = require('react-test-renderer');
const { act } = renderer;

function ThrowingChild(): React.JSX.Element {
  throw new Error('test error');
}

describe('ErrorBoundary', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    jest.restoreAllMocks();
  });

  it('renders children when no error occurs', () => {
    let tree: any;
    act(() => {
      tree = renderer.create(
        <ErrorBoundary>
          <Text>Safe content</Text>
        </ErrorBoundary>
      );
    });

    expect(tree.root.findByProps({ children: 'Safe content' })).toBeTruthy();
  });

  it('renders ErrorState fallback when a child throws', () => {
    let tree: any;
    act(() => {
      tree = renderer.create(
        <ErrorBoundary>
          <ThrowingChild />
        </ErrorBoundary>
      );
    });

    expect(tree.root.findByProps({ children: 'test error' })).toBeTruthy();
    expect(tree.root.findByProps({ children: 'Retry' })).toBeTruthy();
  });

  it('calls componentDidCatch when error occurs', () => {
    const didCatchSpy = jest.spyOn(ErrorBoundary.prototype, 'componentDidCatch');

    act(() => {
      renderer.create(
        <ErrorBoundary>
          <ThrowingChild />
        </ErrorBoundary>
      );
    });

    expect(didCatchSpy).toHaveBeenCalledTimes(1);
  });

  it('resets error state when retry is pressed', () => {
    let tree: any;
    act(() => {
      tree = renderer.create(
        <ErrorBoundary>
          <ThrowingChild />
        </ErrorBoundary>
      );
    });

    expect(tree.root.findByProps({ children: 'test error' })).toBeTruthy();

    act(() => {
      tree.update(
        <ErrorBoundary>
          <Text>Recovered content</Text>
        </ErrorBoundary>
      );
    });

    const retryButton = tree.root.findByProps({ accessibilityRole: 'button' });
    act(() => {
      retryButton.props.onPress();
    });

    expect(tree.root.findByProps({ children: 'Recovered content' })).toBeTruthy();
  });

  it('renders a custom fallback when fallback prop is provided', () => {
    let tree: any;
    act(() => {
      tree = renderer.create(
        <ErrorBoundary fallback={<Text>Custom fallback</Text>}>
          <ThrowingChild />
        </ErrorBoundary>
      );
    });

    expect(tree.root.findByProps({ children: 'Custom fallback' })).toBeTruthy();
    expect(() => tree.root.findByProps({ children: 'Retry' })).toThrow();
  });
});
