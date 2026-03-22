import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock apiClient ───────────────────────────────────────────────
const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPatch = vi.fn();
const mockDelete = vi.fn();

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    patch: (...args: unknown[]) => mockPatch(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
  ApiClient: vi.fn(),
}));

const ORG_ID = 'org-123';
const FARM_ID = 'farm-456';

// ─── Helper: paginated envelope ───────────────────────────────────
function paginated<T>(data: T[], total?: number) {
  return {
    data,
    total: total ?? data.length,
    page: 1,
    pageSize: 50,
    totalPages: 1,
  };
}

// ═══════════════════════════════════════════════════════════════════
// createCrudApi
// ═══════════════════════════════════════════════════════════════════
describe('createCrudApi', () => {
  let createCrudApi: typeof import('../createCrudApi').createCrudApi;

  beforeEach(async () => {
    vi.clearAllMocks();
    ({ createCrudApi } = await import('../createCrudApi'));
  });

  it('unwraps {data:[]} paginated response', async () => {
    const api = createCrudApi<{ id: string; name: string }>('/api/v1/things');
    mockGet.mockResolvedValue(paginated([{ id: '1', name: 'A' }]));

    const result = await api.getAll(undefined, ORG_ID);

    expect(result).toEqual([{ id: '1', name: 'A' }]);
  });

  it('handles plain array response (backwards compat)', async () => {
    const api = createCrudApi<{ id: string }>('/api/v1/things');
    mockGet.mockResolvedValue([{ id: '1' }]);

    const result = await api.getAll(undefined, ORG_ID);

    expect(result).toEqual([{ id: '1' }]);
  });

  it('returns empty array when data is undefined', async () => {
    const api = createCrudApi<{ id: string }>('/api/v1/things');
    mockGet.mockResolvedValue({});

    const result = await api.getAll(undefined, ORG_ID);

    expect(result).toEqual([]);
  });

  it('does NOT send pageSize param (whitelist safety)', async () => {
    const api = createCrudApi<{ id: string }>('/api/v1/things');
    mockGet.mockResolvedValue(paginated([]));

    await api.getAll(undefined, ORG_ID);

    const calledUrl = mockGet.mock.calls[0][0] as string;
    expect(calledUrl).not.toContain('pageSize');
  });

  it('passes filter params as query string', async () => {
    const api = createCrudApi<{ id: string }, unknown, { is_active?: boolean }>('/api/v1/things');
    mockGet.mockResolvedValue(paginated([]));

    await api.getAll({ is_active: true }, ORG_ID);

    const calledUrl = mockGet.mock.calls[0][0] as string;
    expect(calledUrl).toContain('is_active=true');
  });

  it('skips organization_id in query params', async () => {
    const api = createCrudApi<{ id: string }, unknown, { organization_id?: string }>('/api/v1/things');
    mockGet.mockResolvedValue(paginated([]));

    await api.getAll({ organization_id: ORG_ID }, ORG_ID);

    const calledUrl = mockGet.mock.calls[0][0] as string;
    expect(calledUrl).not.toContain('organization_id');
  });
});

// ═══════════════════════════════════════════════════════════════════
// crops
// ═══════════════════════════════════════════════════════════════════
describe('cropsApi', () => {
  let cropsApi: typeof import('../crops').cropsApi;

  beforeEach(async () => {
    vi.clearAllMocks();
    ({ cropsApi } = await import('../crops'));
  });

  it('unwraps paginated response and returns array', async () => {
    mockGet.mockResolvedValue({ data: [{ id: 'c1', name: 'Wheat' }] });

    const result = await cropsApi.getAll(ORG_ID);

    expect(result).toEqual([{ id: 'c1', name: 'Wheat' }]);
  });

  it('returns empty array on empty data', async () => {
    mockGet.mockResolvedValue({ data: [] });
    expect(await cropsApi.getAll(ORG_ID)).toEqual([]);
  });

  it('returns empty array on undefined data', async () => {
    mockGet.mockResolvedValue({});
    expect(await cropsApi.getAll(ORG_ID)).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════════
// deliveries
// ═══════════════════════════════════════════════════════════════════
describe('deliveriesApi', () => {
  let deliveriesApi: typeof import('../deliveries').deliveriesApi;

  beforeEach(async () => {
    vi.clearAllMocks();
    ({ deliveriesApi } = await import('../deliveries'));
  });

  it('unwraps paginated response', async () => {
    mockGet.mockResolvedValue({ data: [{ id: 'd1' }] });

    const result = await deliveriesApi.getAll(undefined, ORG_ID);

    expect(result).toEqual([{ id: 'd1' }]);
  });

  it('does not send pageSize param', async () => {
    mockGet.mockResolvedValue({ data: [] });

    await deliveriesApi.getAll(undefined, ORG_ID);

    const calledUrl = mockGet.mock.calls[0][0] as string;
    expect(calledUrl).not.toContain('pageSize');
    expect(calledUrl).not.toContain('orderBy');
  });
});

// ═══════════════════════════════════════════════════════════════════
// workers
// ═══════════════════════════════════════════════════════════════════
describe('workersApi', () => {
  let workersApi: typeof import('../workers').workersApi;

  beforeEach(async () => {
    vi.clearAllMocks();
    ({ workersApi } = await import('../workers'));
  });

  it('unwraps paginated response', async () => {
    mockGet.mockResolvedValue({ data: [{ id: 'w1', first_name: 'Ali' }] });

    const result = await workersApi.getAll(undefined, ORG_ID);

    expect(result).toEqual([{ id: 'w1', first_name: 'Ali' }]);
  });

  it('returns empty array on missing data', async () => {
    mockGet.mockResolvedValue({});
    expect(await workersApi.getAll(undefined, ORG_ID)).toEqual([]);
  });

  it('does not send pageSize param', async () => {
    mockGet.mockResolvedValue({ data: [] });

    await workersApi.getAll(undefined, ORG_ID);

    const calledUrl = mockGet.mock.calls[0][0] as string;
    expect(calledUrl).not.toContain('pageSize');
  });
});

// ═══════════════════════════════════════════════════════════════════
// stock
// ═══════════════════════════════════════════════════════════════════
describe('stockEntriesApi', () => {
  let stockEntriesApi: typeof import('../stock').stockEntriesApi;

  beforeEach(async () => {
    vi.clearAllMocks();
    ({ stockEntriesApi } = await import('../stock'));
  });

  it('unwraps paginated response', async () => {
    mockGet.mockResolvedValue({ data: [{ id: 's1' }] });

    const result = await stockEntriesApi.getAll(undefined, ORG_ID);

    expect(result).toEqual([{ id: 's1' }]);
  });

  it('returns empty array on empty response', async () => {
    mockGet.mockResolvedValue({});
    expect(await stockEntriesApi.getAll(undefined, ORG_ID)).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════════
// utilities
// ═══════════════════════════════════════════════════════════════════
describe('utilitiesApi', () => {
  let utilitiesApi: typeof import('../utilities').utilitiesApi;

  beforeEach(async () => {
    vi.clearAllMocks();
    ({ utilitiesApi } = await import('../utilities'));
  });

  it('unwraps paginated response', async () => {
    mockGet.mockResolvedValue({ data: [{ id: 'u1', type: 'electricity' }] });

    const result = await utilitiesApi.getAll(ORG_ID, FARM_ID);

    expect(result).toEqual([{ id: 'u1', type: 'electricity' }]);
  });

  it('returns empty array on missing data', async () => {
    mockGet.mockResolvedValue({});
    expect(await utilitiesApi.getAll(ORG_ID, FARM_ID)).toEqual([]);
  });

  it('does not send pageSize in URL', async () => {
    mockGet.mockResolvedValue({ data: [] });

    await utilitiesApi.getAll(ORG_ID, FARM_ID);

    const calledUrl = mockGet.mock.calls[0][0] as string;
    expect(calledUrl).not.toContain('pageSize');
  });
});

// ═══════════════════════════════════════════════════════════════════
// work-units
// ═══════════════════════════════════════════════════════════════════
describe('workUnitsApi', () => {
  let workUnitsApi: typeof import('../work-units').workUnitsApi;

  beforeEach(async () => {
    vi.clearAllMocks();
    ({ workUnitsApi } = await import('../work-units'));
  });

  it('unwraps paginated response', async () => {
    mockGet.mockResolvedValue({ data: [{ id: 'wu1', code: 'KG' }] });

    const result = await workUnitsApi.getAll(undefined, ORG_ID);

    expect(result).toEqual([{ id: 'wu1', code: 'KG' }]);
  });

  it('returns empty array on empty response', async () => {
    mockGet.mockResolvedValue({});
    const result = await workUnitsApi.getAll(undefined, ORG_ID);
    expect(result).toEqual([]);
  });

  it('does not send pageSize or orderBy params', async () => {
    mockGet.mockResolvedValue({ data: [] });

    await workUnitsApi.getAll({ is_active: true }, ORG_ID);

    const calledUrl = mockGet.mock.calls[0][0] as string;
    expect(calledUrl).not.toContain('pageSize');
    expect(calledUrl).not.toContain('orderBy');
    expect(calledUrl).toContain('is_active=true');
  });
});

// ═══════════════════════════════════════════════════════════════════
// soil-analyses
// ═══════════════════════════════════════════════════════════════════
describe('soilAnalysesApi', () => {
  let soilAnalysesApi: typeof import('../soil-analyses').soilAnalysesApi;

  beforeEach(async () => {
    vi.clearAllMocks();
    ({ soilAnalysesApi } = await import('../soil-analyses'));
  });

  it('unwraps paginated response', async () => {
    mockGet.mockResolvedValue({ data: [{ id: 'sa1' }] });

    const result = await soilAnalysesApi.getAll(undefined, ORG_ID);

    expect(result).toEqual([{ id: 'sa1' }]);
  });

  it('returns empty array on empty response', async () => {
    mockGet.mockResolvedValue({});
    const result = await soilAnalysesApi.getAll(undefined, ORG_ID);
    expect(result).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════════
// payment-records
// ═══════════════════════════════════════════════════════════════════
describe('paymentRecordsApi', () => {
  let paymentRecordsApi: typeof import('../payment-records').paymentRecordsApi;

  beforeEach(async () => {
    vi.clearAllMocks();
    ({ paymentRecordsApi } = await import('../payment-records'));
  });

  it('unwraps paginated response', async () => {
    mockGet.mockResolvedValue({ data: [{ id: 'pr1' }] });

    const result = await paymentRecordsApi.getAll(undefined, ORG_ID);

    expect(result).toEqual([{ id: 'pr1' }]);
  });

  it('returns empty array on missing data', async () => {
    mockGet.mockResolvedValue({});
    expect(await paymentRecordsApi.getAll(undefined, ORG_ID)).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════════
// payments
// ═══════════════════════════════════════════════════════════════════
describe('paymentsApi', () => {
  let paymentsApi: typeof import('../payments').paymentsApi;

  beforeEach(async () => {
    vi.clearAllMocks();
    ({ paymentsApi } = await import('../payments'));
  });

  it('unwraps paginated response', async () => {
    mockGet.mockResolvedValue({ data: [{ id: 'pay1' }] });

    const result = await paymentsApi.getAll(undefined, ORG_ID);

    expect(result).toEqual([{ id: 'pay1' }]);
  });

  it('does not send pageSize param', async () => {
    mockGet.mockResolvedValue({ data: [] });

    await paymentsApi.getAll(undefined, ORG_ID);

    const calledUrl = mockGet.mock.calls[0][0] as string;
    expect(calledUrl).not.toContain('pageSize');
  });
});

// ═══════════════════════════════════════════════════════════════════
// organization-users
// ═══════════════════════════════════════════════════════════════════
describe('organizationUsersApi', () => {
  let organizationUsersApi: typeof import('../organization-users').organizationUsersApi;

  beforeEach(async () => {
    vi.clearAllMocks();
    ({ organizationUsersApi } = await import('../organization-users'));
  });

  it('unwraps paginated response', async () => {
    mockGet.mockResolvedValue({ data: [{ user_id: 'u1', role_id: 'r1' }] });

    const result = await organizationUsersApi.getAll(undefined, ORG_ID);

    expect(result).toEqual([{ user_id: 'u1', role_id: 'r1' }]);
  });

  it('returns empty array on missing data', async () => {
    mockGet.mockResolvedValue({});
    expect(await organizationUsersApi.getAll(undefined, ORG_ID)).toEqual([]);
  });

  it('does not send pageSize param', async () => {
    mockGet.mockResolvedValue({ data: [] });

    await organizationUsersApi.getAll(undefined, ORG_ID);

    const calledUrl = mockGet.mock.calls[0][0] as string;
    expect(calledUrl).not.toContain('pageSize');
  });
});

// ═══════════════════════════════════════════════════════════════════
// compliance (corrective actions)
// ═══════════════════════════════════════════════════════════════════
describe('complianceApi.getCorrectiveActions', () => {
  let complianceApi: typeof import('../compliance').complianceApi;

  beforeEach(async () => {
    vi.clearAllMocks();
    ({ complianceApi } = await import('../compliance'));
  });

  it('unwraps paginated response', async () => {
    mockGet.mockResolvedValue({ data: [{ id: 'ca1' }] });

    const result = await complianceApi.getCorrectiveActions(ORG_ID);

    expect(result).toEqual([{ id: 'ca1' }]);
  });

  it('returns empty array on missing data', async () => {
    mockGet.mockResolvedValue({});
    expect(await complianceApi.getCorrectiveActions(ORG_ID)).toEqual([]);
  });

  it('does not send pageSize param', async () => {
    mockGet.mockResolvedValue({ data: [] });

    await complianceApi.getCorrectiveActions(ORG_ID);

    const calledUrl = mockGet.mock.calls[0][0] as string;
    expect(calledUrl).not.toContain('pageSize');
  });
});

// ═══════════════════════════════════════════════════════════════════
// tasks
// ═══════════════════════════════════════════════════════════════════
describe('tasksApi', () => {
  let tasksApi: typeof import('../tasks').tasksApi;

  beforeEach(async () => {
    vi.clearAllMocks();
    ({ tasksApi } = await import('../tasks'));
  });

  it('getAll returns full PaginatedResponse envelope', async () => {
    const envelope = paginated([{ id: 't1', title: 'Task 1' }]);
    mockGet.mockResolvedValue(envelope);

    const result = await tasksApi.getAll(ORG_ID);

    expect(result).toEqual(envelope);
    expect(result.data).toHaveLength(1);
  });

  it('getMyTasks unwraps paginated response', async () => {
    mockGet.mockResolvedValue({ data: [{ id: 't1' }] });

    const result = await tasksApi.getMyTasks();

    expect(result).toEqual([{ id: 't1' }]);
  });

  it('getMyTasks returns empty array on missing data', async () => {
    mockGet.mockResolvedValue({});
    expect(await tasksApi.getMyTasks()).toEqual([]);
  });

  it('getAll does not send pageSize by default', async () => {
    mockGet.mockResolvedValue(paginated([]));

    await tasksApi.getAll(ORG_ID);

    const calledUrl = mockGet.mock.calls[0][0] as string;
    expect(calledUrl).not.toContain('pageSize');
  });
});

// ═══════════════════════════════════════════════════════════════════
// items
// ═══════════════════════════════════════════════════════════════════
describe('itemsApi', () => {
  let itemsApi: typeof import('../items').itemsApi;

  beforeEach(async () => {
    vi.clearAllMocks();
    ({ itemsApi } = await import('../items'));
  });

  it('getAll (from createCrudApi) unwraps paginated response', async () => {
    mockGet.mockResolvedValue({ data: [{ id: 'i1', item_name: 'Fertilizer' }] });

    const result = await itemsApi.getAll(undefined, ORG_ID);

    expect(result).toEqual([{ id: 'i1', item_name: 'Fertilizer' }]);
  });

  it('getAllGroups unwraps paginated response', async () => {
    mockGet.mockResolvedValue({ data: [{ id: 'g1', name: 'Seeds' }] });

    const result = await itemsApi.getAllGroups(undefined, ORG_ID);

    expect(result).toEqual([{ id: 'g1', name: 'Seeds' }]);
  });

  it('getAllGroups returns empty array on missing data', async () => {
    mockGet.mockResolvedValue({});
    expect(await itemsApi.getAllGroups(undefined, ORG_ID)).toEqual([]);
  });

  it('getAllGroups does not send pageSize param', async () => {
    mockGet.mockResolvedValue({ data: [] });

    await itemsApi.getAllGroups(undefined, ORG_ID);

    const calledUrl = mockGet.mock.calls[0][0] as string;
    expect(calledUrl).not.toContain('pageSize');
  });
});

// ═══════════════════════════════════════════════════════════════════
// sales-orders (variable reference bug fix)
// ═══════════════════════════════════════════════════════════════════
describe('salesOrdersApi', () => {
  let salesOrdersApi: typeof import('../sales-orders').salesOrdersApi;

  beforeEach(async () => {
    vi.clearAllMocks();
    ({ salesOrdersApi } = await import('../sales-orders'));
  });

  it('updateSalesOrder passes input param correctly (not undefined data)', async () => {
    mockPatch.mockResolvedValue({ id: 'so1', status: 'confirmed' });

    await salesOrdersApi.updateSalesOrder(
      'so1',
      { status: 'confirmed' } as any,
      ORG_ID,
    );

    // Should have called patch with the input data, not undefined
    expect(mockPatch).toHaveBeenCalled();
    const patchArgs = mockPatch.mock.calls[0];
    expect(patchArgs[1]).toEqual({ status: 'confirmed' });
  });
});

// ═══════════════════════════════════════════════════════════════════
// Whitelist safety: no forbidden query params
// ═══════════════════════════════════════════════════════════════════
describe('whitelist safety — no forbidden query params', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const forbiddenParams = ['pageSize', 'orderBy', 'order', 'limit', 'offset'];

  const testCases = [
    { name: 'cropsApi.getAll', fn: async () => { const { cropsApi } = await import('../crops'); mockGet.mockResolvedValue({ data: [] }); await cropsApi.getAll(ORG_ID); } },
    { name: 'deliveriesApi.getAll', fn: async () => { const { deliveriesApi } = await import('../deliveries'); mockGet.mockResolvedValue({ data: [] }); await deliveriesApi.getAll(undefined, ORG_ID); } },
    { name: 'workersApi.getAll', fn: async () => { const { workersApi } = await import('../workers'); mockGet.mockResolvedValue({ data: [] }); await workersApi.getAll(undefined, ORG_ID); } },
    { name: 'stockEntriesApi.getAll', fn: async () => { const { stockEntriesApi } = await import('../stock'); mockGet.mockResolvedValue({ data: [] }); await stockEntriesApi.getAll(undefined, ORG_ID); } },
    { name: 'utilitiesApi.getAll', fn: async () => { const { utilitiesApi } = await import('../utilities'); mockGet.mockResolvedValue({ data: [] }); await utilitiesApi.getAll(ORG_ID, FARM_ID); } },
    { name: 'workUnitsApi.getAll', fn: async () => { const { workUnitsApi } = await import('../work-units'); mockGet.mockResolvedValue({ data: [] }); await workUnitsApi.getAll(undefined, ORG_ID); } },
    { name: 'soilAnalysesApi.getAll', fn: async () => { const { soilAnalysesApi } = await import('../soil-analyses'); mockGet.mockResolvedValue({ data: [] }); await soilAnalysesApi.getAll(undefined, ORG_ID); } },
    { name: 'paymentRecordsApi.getAll', fn: async () => { const { paymentRecordsApi } = await import('../payment-records'); mockGet.mockResolvedValue({ data: [] }); await paymentRecordsApi.getAll(undefined, ORG_ID); } },
    { name: 'paymentsApi.getAll', fn: async () => { const { paymentsApi } = await import('../payments'); mockGet.mockResolvedValue({ data: [] }); await paymentsApi.getAll(undefined, ORG_ID); } },
    { name: 'organizationUsersApi.getAll', fn: async () => { const { organizationUsersApi } = await import('../organization-users'); mockGet.mockResolvedValue({ data: [] }); await organizationUsersApi.getAll(undefined, ORG_ID); } },
  ];

  for (const tc of testCases) {
    it(`${tc.name} does not send forbidden params`, async () => {
      await tc.fn();

      const calledUrl = mockGet.mock.calls[0][0] as string;
      for (const param of forbiddenParams) {
        expect(calledUrl).not.toContain(`${param}=`);
      }
    });
  }
});
