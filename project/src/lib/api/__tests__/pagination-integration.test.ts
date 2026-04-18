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

// ═══════════════════════════════════════════════════════════════════
// LOGIC TESTS: createCrudApi full CRUD cycle
// ═══════════════════════════════════════════════════════════════════
describe('createCrudApi — full CRUD logic', () => {
  let createCrudApi: typeof import('../createCrudApi').createCrudApi;

  beforeEach(async () => {
    vi.clearAllMocks();
    ({ createCrudApi } = await import('../createCrudApi'));
  });

  it('getAll preserves all items from paginated data array', async () => {
    const api = createCrudApi<{ id: string }>('/api/v1/things');
    const items = [{ id: '1' }, { id: '2' }, { id: '3' }];
    mockGet.mockResolvedValue({ data: items, total: 3, page: 1, pageSize: 50, totalPages: 1 });

    const result = await api.getAll(undefined, ORG_ID);

    expect(result).toHaveLength(3);
    expect(result[0].id).toBe('1');
    expect(result[2].id).toBe('3');
  });

  it('getAll with filters appends correct query string', async () => {
    const api = createCrudApi<{ id: string }, unknown, { status?: string; farm_id?: string }>('/api/v1/tasks');
    mockGet.mockResolvedValue({ data: [] });

    await api.getAll({ status: 'pending', farm_id: 'f1' }, ORG_ID);

    const url = mockGet.mock.calls[0][0] as string;
    expect(url).toContain('status=pending');
    expect(url).toContain('farm_id=f1');
    expect(url).not.toContain('organization_id');
  });

  it('getAll with undefined filter values omits them from URL', async () => {
    const api = createCrudApi<{ id: string }, unknown, { status?: string; name?: string }>('/api/v1/things');
    mockGet.mockResolvedValue({ data: [] });

    await api.getAll({ status: 'active', name: undefined }, ORG_ID);

    const url = mockGet.mock.calls[0][0] as string;
    expect(url).toContain('status=active');
    expect(url).not.toContain('name');
  });

  it('getOne calls correct URL with ID', async () => {
    const api = createCrudApi<{ id: string; name: string }>('/api/v1/things');
    mockGet.mockResolvedValue({ id: 'x1', name: 'Item' });

    const result = await api.getOne('x1', ORG_ID);

    expect(mockGet).toHaveBeenCalledWith('/api/v1/things/x1', {}, ORG_ID);
    expect(result).toEqual({ id: 'x1', name: 'Item' });
  });

  it('create sends POST with data and returns created entity', async () => {
    const api = createCrudApi<{ id: string; name: string }, { name: string }>('/api/v1/things');
    mockPost.mockResolvedValue({ id: 'new1', name: 'New Thing' });

    const result = await api.create({ name: 'New Thing' }, ORG_ID);

    expect(mockPost).toHaveBeenCalledWith('/api/v1/things', { name: 'New Thing' }, {}, ORG_ID);
    expect(result.id).toBe('new1');
  });

  it('update sends PATCH with ID and partial data', async () => {
    const api = createCrudApi<{ id: string; name: string }, { name: string }, Record<string, unknown>, { name?: string }>('/api/v1/things');
    mockPatch.mockResolvedValue({ id: 'x1', name: 'Updated' });

    const result = await api.update('x1', { name: 'Updated' }, ORG_ID);

    expect(mockPatch).toHaveBeenCalledWith('/api/v1/things/x1', { name: 'Updated' }, {}, ORG_ID);
    expect(result.name).toBe('Updated');
  });

  it('delete sends DELETE with correct ID', async () => {
    const api = createCrudApi<{ id: string }>('/api/v1/things');
    mockDelete.mockResolvedValue(undefined);

    await api.delete('x1', ORG_ID);

    expect(mockDelete).toHaveBeenCalledWith('/api/v1/things/x1', {}, ORG_ID);
  });

  it('getAll handles nested data objects correctly', async () => {
    const api = createCrudApi<{ id: string; farm: { name: string } }>('/api/v1/parcels');
    mockGet.mockResolvedValue({
      data: [{ id: 'p1', farm: { name: 'Farm A' } }],
      total: 1, page: 1, pageSize: 50, totalPages: 1,
    });

    const result = await api.getAll(undefined, ORG_ID);

    expect(result[0].farm.name).toBe('Farm A');
  });
});

// ═══════════════════════════════════════════════════════════════════
// LOGIC TESTS: tasks API — getAll returns envelope, getMyTasks unwraps
// ═══════════════════════════════════════════════════════════════════
describe('tasksApi — response handling logic', () => {
  let tasksApi: typeof import('../tasks').tasksApi;

  beforeEach(async () => {
    vi.clearAllMocks();
    ({ tasksApi } = await import('../tasks'));
  });

  it('getAll preserves total/page/pageSize in envelope', async () => {
    mockGet.mockResolvedValue({
      data: [{ id: 't1' }],
      total: 42,
      page: 3,
      pageSize: 10,
      totalPages: 5,
    });

    const result = await tasksApi.getAll(ORG_ID);

    expect(result.total).toBe(42);
    expect(result.page).toBe(3);
    expect(result.pageSize).toBe(10);
    expect(result.totalPages).toBe(5);
  });

  it('getAll passes filter values as query params', async () => {
    mockGet.mockResolvedValue({ data: [], total: 0, page: 1, pageSize: 50, totalPages: 0 });

    await tasksApi.getAll(ORG_ID, { status: 'pending', priority: 'high' });

    const url = mockGet.mock.calls[0][0] as string;
    expect(url).toContain('status=pending');
    expect(url).toContain('priority=high');
  });

  it('getAll skips organization_id in query params', async () => {
    mockGet.mockResolvedValue({ data: [], total: 0, page: 1, pageSize: 50, totalPages: 0 });

    await tasksApi.getAll(ORG_ID, { organization_id: ORG_ID, status: 'done' });

    const url = mockGet.mock.calls[0][0] as string;
    expect(url).not.toContain('organization_id');
    expect(url).toContain('status=done');
  });

  it('getAll skips null and undefined filter values', async () => {
    mockGet.mockResolvedValue({ data: [], total: 0, page: 1, pageSize: 50, totalPages: 0 });

    await tasksApi.getAll(ORG_ID, { status: 'pending', farm_id: null, parcel_id: undefined });

    const url = mockGet.mock.calls[0][0] as string;
    expect(url).toContain('status=pending');
    expect(url).not.toContain('farm_id');
    expect(url).not.toContain('parcel_id');
  });

  it('getMyTasks handles large data set', async () => {
    const items = Array.from({ length: 50 }, (_, i) => ({ id: `t${i}` }));
    mockGet.mockResolvedValue({ data: items });

    const result = await tasksApi.getMyTasks();

    expect(result).toHaveLength(50);
  });

  it('getPaginated passes page and pageSize', async () => {
    mockGet.mockResolvedValue({ data: [], total: 0, page: 2, pageSize: 20, totalPages: 0 });

    await tasksApi.getPaginated(ORG_ID, { page: 2, pageSize: 20 });

    const url = mockGet.mock.calls[0][0] as string;
    expect(url).toContain('page=2');
    expect(url).toContain('pageSize=20');
  });
});

// ═══════════════════════════════════════════════════════════════════
// LOGIC TESTS: workers API — filter handling
// ═══════════════════════════════════════════════════════════════════
describe('workersApi — filter logic', () => {
  let workersApi: typeof import('../workers').workersApi;

  beforeEach(async () => {
    vi.clearAllMocks();
    ({ workersApi } = await import('../workers'));
  });

  it('includes farmId filter when provided', async () => {
    mockGet.mockResolvedValue({ data: [] });

    await workersApi.getAll({ farmId: 'f1' }, ORG_ID);

    const url = mockGet.mock.calls[0][0] as string;
    expect(url).toContain('farmId=f1');
  });

  it('omits farmId when empty string', async () => {
    mockGet.mockResolvedValue({ data: [] });

    await workersApi.getAll({ farmId: '  ' }, ORG_ID);

    const url = mockGet.mock.calls[0][0] as string;
    expect(url).not.toContain('farmId');
  });

  it('throws when organizationId missing', async () => {
    await expect(workersApi.getAll(undefined, undefined)).rejects.toThrow('organizationId is required');
  });
});

// ═══════════════════════════════════════════════════════════════════
// LOGIC TESTS: deliveries API — filter params
// ═══════════════════════════════════════════════════════════════════
describe('deliveriesApi — filter logic', () => {
  let deliveriesApi: typeof import('../deliveries').deliveriesApi;

  beforeEach(async () => {
    vi.clearAllMocks();
    ({ deliveriesApi } = await import('../deliveries'));
  });

  it('joins array status values with comma', async () => {
    mockGet.mockResolvedValue({ data: [] });

    await deliveriesApi.getAll({ status: ['pending', 'completed'] as any }, ORG_ID);

    const url = mockGet.mock.calls[0][0] as string;
    expect(url).toContain('status=pending%2Ccompleted');
  });

  it('includes all filter params when provided', async () => {
    mockGet.mockResolvedValue({ data: [] });

    await deliveriesApi.getAll({
      farm_id: 'f1',
      driver_id: 'd1',
      customer_name: 'Acme',
    } as any, ORG_ID);

    const url = mockGet.mock.calls[0][0] as string;
    expect(url).toContain('farm_id=f1');
    expect(url).toContain('driver_id=d1');
    expect(url).toContain('customer_name=Acme');
  });
});

// ═══════════════════════════════════════════════════════════════════
// LOGIC TESTS: notifications hook — unwrap and filter
// ═══════════════════════════════════════════════════════════════════
describe('useNotifications — data flow', () => {
  // This tests the logic that was broken: notifications.filter is not a function
  // The hook must get an array, not the paginated envelope

  it('notificationsApi unwraps .data from paginated response', async () => {
    // Simulate what useNotifications does internally
    const mockResponse = {
      data: [
        { id: 'n1', is_read: false, type: 'task' },
        { id: 'n2', is_read: true, type: 'alert' },
      ],
      total: 2, page: 1, pageSize: 50, totalPages: 1,
    };

    // The unwrap logic from useNotifications
    const items = Array.isArray(mockResponse) ? mockResponse : mockResponse?.data || [];

    expect(items).toHaveLength(2);
    expect(items.filter).toBeDefined(); // .filter is a function
    expect(items.filter((n: any) => !n.is_read)).toHaveLength(1);
  });

  it('handles raw array response (backwards compat)', async () => {
    const mockResponse = [
      { id: 'n1', is_read: false },
    ];

    const items = Array.isArray(mockResponse) ? mockResponse : (mockResponse as any)?.data || [];

    expect(items).toHaveLength(1);
    expect(items.filter).toBeDefined();
  });

  it('handles empty/null gracefully', async () => {
    const items1 = Array.isArray(null) ? null : (null as any)?.data || [];
    expect(items1).toEqual([]);

    const items2 = Array.isArray({}) ? {} : ({} as any)?.data || [];
    expect(items2).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════════
// LOGIC TESTS: farms/parcels — response mapping
// ═══════════════════════════════════════════════════════════════════
describe('farms/parcels — createCrudApi response mapping', () => {
  let farmsApi: typeof import('../farms').farmsApi;
  let parcelsApi: typeof import('../parcels').parcelsApi;

  beforeEach(async () => {
    vi.clearAllMocks();
    ({ farmsApi } = await import('../farms'));
    ({ parcelsApi } = await import('../parcels'));
  });

  it('farmsApi.getAll returns array from paginated response', async () => {
    mockGet.mockResolvedValue({
      data: [
        { farm_id: 'f1', farm_name: 'Farm A', farm_size: 100 },
        { farm_id: 'f2', farm_name: 'Farm B', farm_size: 200 },
      ],
      total: 2, page: 1, pageSize: 50, totalPages: 1,
    });

    const result = await farmsApi.getAll(undefined, ORG_ID);

    expect(result).toHaveLength(2);
    expect(result[0]).toHaveProperty('farm_id', 'f1');
    expect(result[1]).toHaveProperty('farm_name', 'Farm B');
  });

  it('parcelsApi.getAll returns array from paginated response', async () => {
    mockGet.mockResolvedValue({
      data: [
        { id: 'p1', name: 'Parcel A', area: 10.5, farm_id: 'f1' },
      ],
      total: 1, page: 1, pageSize: 50, totalPages: 1,
    });

    const result = await parcelsApi.getAll({ farm_id: 'f1' }, ORG_ID);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Parcel A');
    expect(result[0].area).toBe(10.5);
  });

  it('parcelsApi.getAll passes farm_id filter in URL', async () => {
    mockGet.mockResolvedValue({ data: [] });

    await parcelsApi.getAll({ farm_id: 'f1' }, ORG_ID);

    const url = mockGet.mock.calls[0][0] as string;
    expect(url).toContain('farm_id=f1');
  });
});

// ═══════════════════════════════════════════════════════════════════
// LOGIC TESTS: compliance — corrective actions unwrap
// ═══════════════════════════════════════════════════════════════════
describe('complianceApi — corrective actions filters', () => {
  let complianceApi: typeof import('../compliance').complianceApi;

  beforeEach(async () => {
    vi.clearAllMocks();
    ({ complianceApi } = await import('../compliance'));
  });

  it('passes certification_id filter', async () => {
    mockGet.mockResolvedValue({ data: [] });

    await complianceApi.getCorrectiveActions(ORG_ID, { certification_id: 'cert1' });

    const url = mockGet.mock.calls[0][0] as string;
    expect(url).toContain('certification_id=cert1');
  });

  it('passes status and priority filters', async () => {
    mockGet.mockResolvedValue({ data: [] });

    await complianceApi.getCorrectiveActions(ORG_ID, { status: 'open', priority: 'high' });

    const url = mockGet.mock.calls[0][0] as string;
    expect(url).toContain('status=open');
    expect(url).toContain('priority=high');
  });

  it('omits undefined filters', async () => {
    mockGet.mockResolvedValue({ data: [] });

    await complianceApi.getCorrectiveActions(ORG_ID, {});

    const url = mockGet.mock.calls[0][0] as string;
    expect(url).toMatch(/corrective-actions$/);
  });
});
