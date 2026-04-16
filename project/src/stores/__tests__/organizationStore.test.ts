import { beforeEach, describe, expect, it, vi } from 'vitest';

const store: Record<string, string> = {};
const testLocalStorage = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => { store[key] = String(value); },
  removeItem: (key: string) => { delete store[key]; },
  clear: () => { for (const k of Object.keys(store)) delete store[k]; },
  get length() { return Object.keys(store).length; },
  key: (index: number) => Object.keys(store)[index] ?? null,
};
const testSessionStorage = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => { store[key] = String(value); },
  removeItem: (key: string) => { delete store[key]; },
  clear: () => { for (const k of Object.keys(store)) delete store[k]; },
  get length() { return Object.keys(store).length; },
  key: (index: number) => Object.keys(store)[index] ?? null,
};

Object.defineProperty(globalThis, 'localStorage', { value: testLocalStorage, configurable: true });
Object.defineProperty(globalThis, 'sessionStorage', { value: testSessionStorage, configurable: true });
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'localStorage', { value: testLocalStorage, configurable: true });
  Object.defineProperty(window, 'sessionStorage', { value: testSessionStorage, configurable: true });
}

const { useOrganizationStore } = await import('../organizationStore');

import { type Organization } from '../organizationStore';

const mockOrganization: Organization = {
  id: 'org-1',
  name: 'Atlas Farms',
  description: 'Moroccan cooperative',
  slug: 'atlas-farms',
  currency_code: 'MAD',
  timezone: 'Africa/Casablanca',
  is_active: true,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  map_provider: 'default',
};

describe('organizationStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useOrganizationStore.setState({ currentOrganization: null });
  });

  it('starts with no selected organization', () => {
    expect(useOrganizationStore.getState().currentOrganization).toBeNull();
  });

  it('sets the current organization', () => {
    useOrganizationStore.getState().setCurrentOrganization(mockOrganization);

    expect(useOrganizationStore.getState().currentOrganization).toEqual(mockOrganization);
  });

  it('clears the selected organization', () => {
    useOrganizationStore.setState({ currentOrganization: mockOrganization });

    useOrganizationStore.getState().clearOrganization();

    expect(useOrganizationStore.getState().currentOrganization).toBeNull();
  });

  it('persists the selected organization in localStorage', () => {
    useOrganizationStore.getState().setCurrentOrganization(mockOrganization);

    const stored = localStorage.getItem('organization-storage');

    expect(stored).toContain('Atlas Farms');
    expect(stored).toContain('org-1');
  });
});
