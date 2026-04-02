import React from 'react';
import type { NetInfoState } from '@react-native-community/netinfo';
import { OfflineBanner } from '../OfflineBanner';

const renderer = require('react-test-renderer');
const { act } = renderer;

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { defaultValue?: string }) => opts?.defaultValue ?? key,
  }),
}));

jest.mock('@/lib/i18n', () => ({}));

jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: {
    addEventListener: jest.fn(),
    fetch: jest.fn(),
  },
}));

const mockAddEventListener = jest.mocked(
  require('@react-native-community/netinfo').default.addEventListener
);

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: jest.fn(() => ({ top: 0, right: 0, bottom: 0, left: 0 })),
}));

jest.mock('@/providers/ThemeProvider', () => ({
  useTheme: jest.fn(() => ({
    colors: {
      error: '#ff0000',
    },
  })),
}));

describe('OfflineBanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not render anything when connected', () => {
    mockAddEventListener.mockImplementation((listener: (state: NetInfoState) => void) => {
      listener({ isConnected: true } as NetInfoState);
      return jest.fn();
    });

    let tree: any;
    act(() => {
      tree = renderer.create(<OfflineBanner />);
    });

    expect(tree.toJSON()).toBeNull();
  });

  it('renders offline banner when disconnected', () => {
    mockAddEventListener.mockImplementation((listener: (state: NetInfoState) => void) => {
      listener({ isConnected: false } as NetInfoState);
      return jest.fn();
    });

    let tree: any;
    act(() => {
      tree = renderer.create(<OfflineBanner />);
    });

    expect(
      tree.root.findByProps({ children: 'You are offline. Some features may be unavailable' })
    ).toBeTruthy();
  });

  it('updates rendering when connectivity changes', () => {
    let listener: (state: NetInfoState) => void = () => undefined;
    mockAddEventListener.mockImplementation((cb: (state: NetInfoState) => void) => {
      listener = cb;
      cb({ isConnected: true } as NetInfoState);
      return jest.fn();
    });

    let tree: any;
    act(() => {
      tree = renderer.create(<OfflineBanner />);
    });

    expect(tree.toJSON()).toBeNull();

    act(() => {
      listener({ isConnected: false } as NetInfoState);
    });

    expect(
      tree.root.findByProps({ children: 'You are offline. Some features may be unavailable' })
    ).toBeTruthy();
  });
});
