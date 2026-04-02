import React from 'react';

import NewStockEntryScreen from '../../../app/(drawer)/(inventory)/entries/new';

const renderer = require('react-test-renderer');
const { act } = renderer;

jest.mock('expo-router', () => ({ router: { back: jest.fn() } }));

jest.mock('@expo/vector-icons', () => {
  const ReactNative = require('react-native');
  return {
    Ionicons: ({ name }: { name: string }) => <ReactNative.Text>{name}</ReactNative.Text>,
  };
});

jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: { addEventListener: jest.fn(), fetch: jest.fn() },
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: jest.fn(() => ({ top: 0, right: 0, bottom: 0, left: 0 })),
}));

jest.mock('@/providers/ThemeProvider', () => ({
  useTheme: jest.fn(() => ({ colors: { error: '#ff0000' } })),
}));

jest.mock('@/components/PageHeader', () => {
  const ReactNative = require('react-native');
  return ({ title }: { title: string }) => <ReactNative.Text>{title}</ReactNative.Text>;
});

jest.mock('@/hooks/useInventory', () => ({
  useCreateStockEntry: () => ({ mutate: jest.fn(), isPending: false }),
  useItemsForSelection: () => ({ data: [] }),
  useWarehouses: () => ({ data: [] }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, arg?: string | { defaultValue?: string }) =>
      typeof arg === 'string' ? arg : arg?.defaultValue ?? key,
  }),
}));

jest.mock('@/lib/i18n', () => ({}));

describe('NewStockEntryScreen', () => {
  it('renders without crashing', () => {
    let tree: any;
    act(() => {
      tree = renderer.create(<NewStockEntryScreen />);
    });

    expect(tree).toBeTruthy();
  });

  it('shows form title', () => {
    let tree: any;
    act(() => {
      tree = renderer.create(<NewStockEntryScreen />);
    });

    expect(tree.root.findByProps({ children: 'New Stock Entry' })).toBeTruthy();
  });

  it('shows validation errors on empty submit', async () => {
    let tree: any;
    act(() => {
      tree = renderer.create(<NewStockEntryScreen />);
    });

    const submitButton = tree.root
      .findAll((node: any) => typeof node.props?.onPress === 'function')
      .at(-1);

    await act(async () => {
      submitButton.props.onPress();
    });

    expect(tree.root.findByProps({ children: 'Please select an item' })).toBeTruthy();
  });
});
