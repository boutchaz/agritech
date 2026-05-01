import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useIsModuleActive } from '../useIsModuleActive';
import { useModuleBasedDashboard } from '../useModuleBasedDashboard';

vi.mock('../useModuleBasedDashboard', () => ({
  useModuleBasedDashboard: vi.fn(),
}));

const mockedDashboard = vi.mocked(useModuleBasedDashboard);

function stub(activeModules: string[], isLoading = false) {
  return {
    activeModules,
    availableWidgets: [],
    availableNavigation: [],
    availableNavigationSet: new Set<string>(),
    isWidgetEnabled: () => true,
    isNavigationEnabled: () => true,
    findOwningModule: () => null,
    isLoading,
  };
}

describe('useIsModuleActive', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns true when slug is in activeModules', () => {
    mockedDashboard.mockReturnValue(stub(['core', 'agromind_advisor']));
    const { result } = renderHook(() => useIsModuleActive('agromind_advisor'));
    expect(result.current).toBe(true);
  });

  it('returns false when slug is not in activeModules', () => {
    mockedDashboard.mockReturnValue(stub(['core']));
    const { result } = renderHook(() => useIsModuleActive('marketplace'));
    expect(result.current).toBe(false);
  });

  it('returns false while loading (fail closed)', () => {
    mockedDashboard.mockReturnValue(stub(['core', 'agromind_advisor'], true));
    const { result } = renderHook(() => useIsModuleActive('agromind_advisor'));
    expect(result.current).toBe(false);
  });

  it('returns false when activeModules is empty', () => {
    mockedDashboard.mockReturnValue(stub([]));
    const { result } = renderHook(() => useIsModuleActive('core'));
    expect(result.current).toBe(false);
  });
});
