import React from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import type { AuthContextType, AuthOrganization, AuthFarm, AuthUser, AuthUserProfile } from '@/contexts/AuthContext';
import type { HarvestSummary, HarvestRecord } from '@/types/harvests';
import type { ReceptionBatch } from '@/types/reception';
import type { AgriculturalCampaign, CropCycle } from '@/types/agricultural-accounting';

// =====================================================
// QUERY CLIENT
// =====================================================

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

// =====================================================
// PROVIDERS WRAPPER
// =====================================================

interface WrapperProps {
  children: React.ReactNode;
}

function QueryProviderWrapper({ children, queryClient }: WrapperProps & { queryClient: QueryClient }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

export function renderWithProviders(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'> & { queryClient?: QueryClient }
) {
  const queryClient = options?.queryClient ?? createTestQueryClient();

  return {
    ...render(ui, {
      wrapper: ({ children }) => <QueryProviderWrapper queryClient={queryClient}>{children}</QueryProviderWrapper>,
      ...options,
    }),
    queryClient,
  };
}

// =====================================================
// AUTH MOCKS
// =====================================================

export function createMockOrganization(overrides?: Partial<AuthOrganization>): AuthOrganization {
  return {
    id: 'test-org-id',
    name: 'Test Organization',
    slug: 'test-org',
    role: 'organization_admin',
    role_id: 'test-role-id',
    is_active: true,
    onboarding_completed: true,
    currency: 'MAD',
    timezone: 'Africa/Casablanca',
    language: 'fr',
    map_provider: 'default',
    ...overrides,
  };
}

export function createMockUser(overrides?: Partial<AuthUser>): AuthUser {
  return {
    id: 'test-user-id',
    email: 'test@agritech.com',
    ...overrides,
  };
}

export function createMockProfile(overrides?: Partial<AuthUserProfile>): AuthUserProfile {
  return {
    id: 'test-user-id',
    first_name: 'Test',
    last_name: 'User',
    full_name: 'Test User',
    avatar_url: null,
    phone: null,
    timezone: 'Africa/Casablanca',
    language: 'fr',
    password_set: true,
    onboarding_completed: true,
    ...overrides,
  };
}

export function createMockFarm(overrides?: Partial<AuthFarm>): AuthFarm {
  return {
    id: 'test-farm-id',
    name: 'Test Farm',
    location: 'Casablanca, Morocco',
    size: 50,
    manager_name: 'Test Manager',
    ...overrides,
  };
}

export function mockUseAuth(overrides?: Partial<AuthContextType>): AuthContextType {
  return {
    user: createMockUser(),
    profile: createMockProfile(),
    organizations: [createMockOrganization()],
    currentOrganization: createMockOrganization(),
    farms: [createMockFarm()],
    currentFarm: createMockFarm(),
    userRole: 'organization_admin' as any,
    loading: false,
    needsOnboarding: false,
    needsImport: false,
    setCurrentOrganization: vi.fn(),
    setCurrentFarm: vi.fn(),
    signOut: vi.fn().mockResolvedValue(undefined),
    refreshUserData: vi.fn().mockResolvedValue(undefined),
    hasRole: vi.fn().mockReturnValue(true),
    isAtLeastRole: vi.fn().mockReturnValue(true),
    ...overrides,
  };
}

// =====================================================
// TRANSLATION MOCK
// =====================================================

export function mockUseTranslation() {
  return {
    t: (key: string, defaultValue?: string) => defaultValue || key,
    i18n: {
      language: 'en',
      changeLanguage: vi.fn().mockResolvedValue(undefined),
    },
  };
}

// =====================================================
// HARVEST MOCK FACTORIES
// =====================================================

export function createMockHarvestRecord(overrides?: Partial<HarvestRecord>): HarvestRecord {
  return {
    id: 'harvest-1',
    organization_id: 'test-org-id',
    farm_id: 'test-farm-id',
    parcel_id: 'test-parcel-id',
    harvest_date: '2026-01-15',
    quantity: 500,
    unit: 'kg',
    quality_grade: 'A',
    quality_score: 8,
    quality_notes: 'Good quality harvest',
    workers: [
      { worker_id: 'worker-1', worker_name: 'Worker One', hours_worked: 8, quantity_picked: 250 },
      { worker_id: 'worker-2', worker_name: 'Worker Two', hours_worked: 8, quantity_picked: 250 },
    ],
    supervisor_id: 'supervisor-1',
    storage_location: 'Warehouse A',
    temperature: 22,
    humidity: 45,
    intended_for: 'market',
    expected_price_per_unit: 10,
    estimated_revenue: 5000,
    status: 'stored',
    notes: 'Test harvest',
    created_by: 'test-user-id',
    created_at: '2026-01-15T10:00:00Z',
    updated_at: '2026-01-15T10:00:00Z',
    farm_name: 'Test Farm',
    parcel_name: 'Parcel A',
    crop_name: 'Olives',
    supervisor_name: 'Test Supervisor',
    ...overrides,
  };
}

export function createMockHarvest(overrides?: Partial<HarvestSummary>): HarvestSummary {
  return {
    ...createMockHarvestRecord(overrides),
    worker_count: 2,
    delivery_count: 0,
    quantity_delivered: 0,
    ...overrides,
  };
}

// =====================================================
// RECEPTION BATCH MOCK FACTORY
// =====================================================

export function createMockReceptionBatch(overrides?: Partial<ReceptionBatch>): ReceptionBatch {
  return {
    id: 'batch-1',
    organization_id: 'test-org-id',
    warehouse_id: 'warehouse-1',
    harvest_id: 'harvest-1',
    parcel_id: 'test-parcel-id',
    crop_id: 'crop-1',
    culture_type: 'olivier',
    batch_code: 'RB-2026-001',
    reception_date: '2026-01-16',
    reception_time: '09:30',
    weight: 1000,
    weight_unit: 'kg',
    quantity: 100,
    quantity_unit: 'crates',
    quality_grade: 'A',
    quality_score: 8,
    quality_notes: 'Good quality batch',
    humidity_percentage: 12,
    maturity_level: 'mature',
    temperature: 20,
    moisture_content: 10,
    defects: null,
    photos: null,
    received_by: 'test-user-id',
    quality_checked_by: 'test-user-id',
    decision: 'pending',
    decision_notes: null,
    decision_date: null,
    decision_by: null,
    destination_warehouse_id: null,
    sales_order_id: null,
    stock_entry_id: null,
    producer_name: 'Test Producer',
    supplier_id: null,
    status: 'received',
    created_at: '2026-01-16T09:30:00Z',
    updated_at: '2026-01-16T09:30:00Z',
    ...overrides,
  };
}

// =====================================================
// CAMPAIGN MOCK FACTORY
// =====================================================

export function createMockCampaign(overrides?: Partial<AgriculturalCampaign>): AgriculturalCampaign {
  return {
    id: 'campaign-1',
    organization_id: 'test-org-id',
    name: 'Campaign 2025-2026',
    code: 'C-2025',
    description: 'Agricultural campaign for 2025-2026 season',
    start_date: '2025-09-01',
    end_date: '2026-08-31',
    campaign_type: 'general',
    status: 'active',
    is_current: true,
    primary_fiscal_year_id: 'fy-1',
    secondary_fiscal_year_id: null,
    total_area_ha: 150,
    total_planned_production: 10000,
    total_actual_production: 0,
    total_costs: 50000,
    total_revenue: 0,
    created_at: '2025-09-01T00:00:00Z',
    created_by: 'test-user-id',
    updated_at: '2025-09-01T00:00:00Z',
    ...overrides,
  };
}

// =====================================================
// CROP CYCLE MOCK FACTORY
// =====================================================

export function createMockCropCycle(overrides?: Partial<CropCycle>): CropCycle {
  return {
    id: 'cycle-1',
    organization_id: 'test-org-id',
    farm_id: 'test-farm-id',
    parcel_id: 'test-parcel-id',
    crop_id: 'crop-1',
    variety_id: null,
    crop_type: 'olives',
    variety_name: 'Picholine',
    cycle_code: 'CC-2025-001',
    cycle_name: 'Olives Season 2025',
    campaign_id: 'campaign-1',
    fiscal_year_id: 'fy-1',
    season: 'autumn_winter',
    land_prep_date: '2025-09-15',
    planting_date: '2025-10-01',
    expected_harvest_start: '2026-01-01',
    expected_harvest_end: '2026-03-31',
    actual_harvest_start: null,
    actual_harvest_end: null,
    cycle_closed_date: null,
    status: 'growing',
    planted_area_ha: 25,
    harvested_area_ha: null,
    expected_yield_per_ha: 400,
    expected_total_yield: 10000,
    actual_yield_per_ha: null,
    actual_total_yield: null,
    yield_unit: 'kg',
    average_quality_grade: null,
    quality_notes: null,
    total_costs: 25000,
    total_revenue: 0,
    net_profit: -25000,
    cost_per_ha: 1000,
    cost_per_unit: null,
    revenue_per_ha: null,
    profit_margin: null,
    created_at: '2025-09-01T00:00:00Z',
    created_by: 'test-user-id',
    updated_at: '2025-10-01T00:00:00Z',
    notes: null,
    ...overrides,
  } as CropCycle;
}
