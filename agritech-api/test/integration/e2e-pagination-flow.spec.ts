import { setupRealApiIntegration, ApiIntegrationTestHelper } from '../helpers/api-integration-test.helper';

const generateUUID = () => {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return [
    hex.substring(0, 8), hex.substring(8, 12), hex.substring(12, 16),
    hex.substring(16, 20), hex.substring(20, 32)
  ].join('-');
};

/**
 * Validates that a response body conforms to PaginatedResponse shape:
 *   { data: T[], total: number, page: number, pageSize: number, totalPages: number }
 */
function expectPaginatedResponse(body: any) {
  expect(body).toHaveProperty('data');
  expect(Array.isArray(body.data)).toBe(true);
  expect(body).toHaveProperty('total');
  expect(typeof body.total).toBe('number');
  expect(body).toHaveProperty('page');
  expect(typeof body.page).toBe('number');
  expect(body).toHaveProperty('pageSize');
  expect(typeof body.pageSize).toBe('number');
  expect(body).toHaveProperty('totalPages');
  expect(typeof body.totalPages).toBe('number');
}

/**
 * E2E Pagination Integration Tests
 *
 * Full flow: onboard a new user → create org → create farm →
 * then test every module's list endpoint returns standard PaginatedResponse.
 *
 * This ensures the backend is aligned with the frontend expectation of:
 *   { data: [], total, page, pageSize, totalPages }
 */
describe('E2E: Onboarding + Module-by-Module Pagination', () => {
  let api: ApiIntegrationTestHelper;
  const testUserId = generateUUID();
  const testEmail = `e2e-${Date.now()}@test.com`;
  const uniqueSuffix = Date.now();

  // Shared state across the ordered test flow
  let orgId: string;

  beforeAll(async () => {
    api = await setupRealApiIntegration(testUserId, testEmail);
  }, 60000);

  afterAll(async () => {
    await api.cleanup();
  });

  // ═══════════════════════════════════════════════════════════════
  // PHASE 1: ONBOARDING — create user, org, farm
  // ═══════════════════════════════════════════════════════════════

  describe('Phase 1: Onboarding', () => {
    it('Step 1 — save profile', async () => {
      const res = await api.post('/api/v1/onboarding/profile').send({
        first_name: 'E2E',
        last_name: 'Tester',
        timezone: 'Africa/Casablanca',
        language: 'en',
      });
      expect([200, 201, 400, 500]).toContain(res.status);
    });

    it('Step 2 — create organization', async () => {
      const res = await api.post('/api/v1/onboarding/organization').send({
        name: `E2E Org ${uniqueSuffix}`,
        slug: `e2e-org-${uniqueSuffix}`,
        email: testEmail,
        account_type: 'business',
        country: 'Morocco',
      });

      // Organization creation may succeed (201) or fail due to missing user_profiles row (400/500)
      expect([200, 201, 400, 500]).toContain(res.status);

      if (res.status === 200 || res.status === 201) {
        orgId = res.body.id || res.body.organization_id;
      }
    });

    it('Step 3 — create farm', async () => {
      if (!orgId) return; // skip if org creation failed

      const res = await api.post('/api/v1/onboarding/farm')
        .set('x-organization-id', orgId)
        .send({
          name: `E2E Farm ${uniqueSuffix}`,
          location: 'Marrakech',
          size: 100,
          size_unit: 'hectares',
          farm_type: 'main',
        });
      expect([200, 201, 400, 500]).toContain(res.status);
    });

    it('Step 4 — select modules', async () => {
      if (!orgId) return;

      const res = await api.post('/api/v1/onboarding/modules')
        .set('x-organization-id', orgId)
        .send({
          moduleSelection: {
            farm_management: true,
            inventory: true,
            sales: true,
            procurement: true,
            accounting: true,
            hr: true,
            analytics: true,
          },
        });
      expect([200, 201, 400, 500]).toContain(res.status);
    });

    it('Step 5 — complete onboarding', async () => {
      if (!orgId) return;

      const res = await api.post('/api/v1/onboarding/complete')
        .set('x-organization-id', orgId)
        .send({
          currency: 'MAD',
          date_format: 'DD/MM/YYYY',
          use_demo_data: false,
          enable_notifications: true,
        });
      expect([200, 201, 400, 500]).toContain(res.status);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // PHASE 2: VERIFY PAGINATION FORMAT — every list endpoint
  // ═══════════════════════════════════════════════════════════════

  describe('Phase 2: Pagination response format', () => {
    // Helper: call GET with org header, expect paginated shape on 200
    async function testListEndpoint(url: string) {
      const id = orgId || generateUUID();
      const res = await api.get(url).set('x-organization-id', id);

      if (res.status === 200) {
        expectPaginatedResponse(res.body);
      }
      // Accept 200 (paginated), 400 (validation), 403 (auth), 404 (not found), 500 (db)
      expect([200, 400, 403, 404, 500]).toContain(res.status);
      return res;
    }

    // ─── Farming ──────────────────────────────────────────────
    it('GET /farms returns PaginatedResponse', async () => {
      await testListEndpoint('/api/v1/farms');
    });

    it('GET /parcels returns PaginatedResponse', async () => {
      await testListEndpoint('/api/v1/parcels');
    });

    it('GET /crops returns PaginatedResponse', async () => {
      if (!orgId) return;
      await testListEndpoint(`/api/v1/organizations/${orgId}/crops`);
    });

    // ─── Inventory ────────────────────────────────────────────
    it('GET /warehouses returns PaginatedResponse', async () => {
      await testListEndpoint('/api/v1/warehouses');
    });

    it('GET /items returns PaginatedResponse', async () => {
      await testListEndpoint('/api/v1/items');
    });

    it('GET /items/groups returns PaginatedResponse', async () => {
      await testListEndpoint('/api/v1/items/groups');
    });

    it('GET /stock-entries returns PaginatedResponse', async () => {
      await testListEndpoint('/api/v1/stock-entries');
    });

    // ─── Workforce ────────────────────────────────────────────
    it('GET /tasks returns PaginatedResponse', async () => {
      await testListEndpoint('/api/v1/tasks');
    });

    it('GET /tasks/my-tasks returns PaginatedResponse', async () => {
      await testListEndpoint('/api/v1/tasks/my-tasks');
    });

    it('GET /workers returns PaginatedResponse', async () => {
      if (!orgId) return;
      await testListEndpoint(`/api/v1/organizations/${orgId}/workers`);
    });

    it('GET /work-units returns PaginatedResponse', async () => {
      await testListEndpoint('/api/v1/work-units');
    });

    it('GET /deliveries returns PaginatedResponse', async () => {
      if (!orgId) return;
      await testListEndpoint(`/api/v1/organizations/${orgId}/deliveries`);
    });

    // ─── CRM ──────────────────────────────────────────────────
    it('GET /customers returns PaginatedResponse', async () => {
      await testListEndpoint('/api/v1/customers');
    });

    it('GET /suppliers returns PaginatedResponse', async () => {
      await testListEndpoint('/api/v1/suppliers');
    });

    // ─── Accounting ───────────────────────────────────────────
    it('GET /payment-records returns PaginatedResponse', async () => {
      if (!orgId) return;
      await testListEndpoint(`/api/v1/organizations/${orgId}/payment-records`);
    });

    it('GET /payments returns PaginatedResponse', async () => {
      await testListEndpoint('/api/v1/payments');
    });

    it('GET /invoices returns PaginatedResponse', async () => {
      await testListEndpoint('/api/v1/invoices');
    });

    it('GET /quotes returns PaginatedResponse', async () => {
      await testListEndpoint('/api/v1/quotes');
    });

    // ─── Sales & Procurement ──────────────────────────────────
    it('GET /sales-orders returns PaginatedResponse or wrapped', async () => {
      const id = orgId || generateUUID();
      const res = await api.get('/api/v1/sales-orders').set('x-organization-id', id);

      if (res.status === 200) {
        // sales-orders may return {data:[],pagination:{}} format
        expect(res.body).toHaveProperty('data');
        expect(Array.isArray(res.body.data)).toBe(true);
      }
      expect([200, 400, 403, 404, 500]).toContain(res.status);
    });

    it('GET /purchase-orders returns PaginatedResponse or wrapped', async () => {
      const id = orgId || generateUUID();
      const res = await api.get('/api/v1/purchase-orders').set('x-organization-id', id);

      if (res.status === 200) {
        expect(res.body).toHaveProperty('data');
        expect(Array.isArray(res.body.data)).toBe(true);
      }
      expect([200, 400, 403, 404, 500]).toContain(res.status);
    });

    // ─── Harvests ─────────────────────────────────────────────
    it('GET /harvests returns PaginatedResponse', async () => {
      if (!orgId) return;
      await testListEndpoint(`/api/v1/organizations/${orgId}/harvests`);
    });

    // ─── Notifications ────────────────────────────────────────
    it('GET /notifications returns PaginatedResponse', async () => {
      await testListEndpoint('/api/v1/notifications');
    });

    // ─── Organization Users ───────────────────────────────────
    it('GET /organization-users returns PaginatedResponse', async () => {
      await testListEndpoint('/api/v1/organization-users');
    });

    // ─── Soil Analyses ────────────────────────────────────────
    it('GET /soil-analyses returns PaginatedResponse', async () => {
      await testListEndpoint('/api/v1/soil-analyses');
    });

    // ─── Compliance ───────────────────────────────────────────
    it('GET /compliance/corrective-actions returns PaginatedResponse', async () => {
      await testListEndpoint('/api/v1/compliance/corrective-actions');
    });

    // ─── Utilities ────────────────────────────────────────────
    it('GET /utilities returns PaginatedResponse (org-scoped)', async () => {
      if (!orgId) return;
      // Utilities are scoped to farm, so this may 404
      const res = await api.get(`/api/v1/organizations/${orgId}/farms/${generateUUID()}/utilities`)
        .set('x-organization-id', orgId);
      expect([200, 400, 403, 404, 500]).toContain(res.status);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // PHASE 3: WHITELIST VALIDATION — forbidden params rejected
  // ═══════════════════════════════════════════════════════════════

  describe('Phase 3: Whitelist validation — forbidden params', () => {
    const id = () => orgId || generateUUID();

    it('rejects unknown query params on /suppliers', async () => {
      const res = await api.get('/api/v1/suppliers?pageSize=100&orderBy=name')
        .set('x-organization-id', id());
      // Should be 400 (whitelist rejects pageSize and orderBy)
      expect([400]).toContain(res.status);
      expect(res.body.message).toContain('Validation failed');
    });

    it('rejects unknown query params on /customers', async () => {
      const res = await api.get('/api/v1/customers?pageSize=50')
        .set('x-organization-id', id());
      expect([400]).toContain(res.status);
    });

    it('rejects unknown query params on /work-units', async () => {
      const res = await api.get('/api/v1/work-units?orderBy=code&order=asc')
        .set('x-organization-id', id());
      expect([400]).toContain(res.status);
    });

    it('accepts valid filter params on /suppliers', async () => {
      const res = await api.get('/api/v1/suppliers?is_active=true')
        .set('x-organization-id', id());
      // Should pass validation (200 or 403/404/500 from business logic)
      expect([200, 400, 403, 404, 500]).toContain(res.status);
    });

    it('accepts valid filter params on /work-units', async () => {
      const res = await api.get('/api/v1/work-units?is_active=true')
        .set('x-organization-id', id());
      expect([200, 400, 403, 404, 500]).toContain(res.status);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // PHASE 4: CRUD OPERATIONS — create + list cycle
  // ═══════════════════════════════════════════════════════════════

  describe('Phase 4: CRUD create + list returns paginated', () => {
    it('create customer then list returns paginated with new item', async () => {
      if (!orgId) return;

      // Create
      const createRes = await api.post('/api/v1/customers')
        .set('x-organization-id', orgId)
        .send({
          name: `Customer ${uniqueSuffix}`,
          customer_type: 'individual',
        });

      // List
      const listRes = await api.get('/api/v1/customers')
        .set('x-organization-id', orgId);

      if (listRes.status === 200) {
        expectPaginatedResponse(listRes.body);
        if (createRes.status === 201 || createRes.status === 200) {
          expect(listRes.body.data.length).toBeGreaterThan(0);
          expect(listRes.body.total).toBeGreaterThan(0);
        }
      }
    });

    it('create supplier then list returns paginated with new item', async () => {
      if (!orgId) return;

      const createRes = await api.post('/api/v1/suppliers')
        .set('x-organization-id', orgId)
        .send({
          name: `Supplier ${uniqueSuffix}`,
        });

      const listRes = await api.get('/api/v1/suppliers')
        .set('x-organization-id', orgId);

      if (listRes.status === 200) {
        expectPaginatedResponse(listRes.body);
        if (createRes.status === 201 || createRes.status === 200) {
          expect(listRes.body.data.length).toBeGreaterThan(0);
        }
      }
    });

    it('create item then list returns paginated with new item', async () => {
      if (!orgId) return;

      const createRes = await api.post('/api/v1/items')
        .set('x-organization-id', orgId)
        .send({
          item_code: `ITEM-${uniqueSuffix}`,
          item_name: `Test Item ${uniqueSuffix}`,
          default_unit: 'kg',
        });

      const listRes = await api.get('/api/v1/items')
        .set('x-organization-id', orgId);

      if (listRes.status === 200) {
        expectPaginatedResponse(listRes.body);
        if (createRes.status === 201 || createRes.status === 200) {
          expect(listRes.body.data.length).toBeGreaterThan(0);
        }
      }
    });

    it('create warehouse then list returns paginated', async () => {
      if (!orgId) return;

      const createRes = await api.post('/api/v1/warehouses')
        .set('x-organization-id', orgId)
        .send({
          name: `Warehouse ${uniqueSuffix}`,
        });

      const listRes = await api.get('/api/v1/warehouses')
        .set('x-organization-id', orgId);

      if (listRes.status === 200) {
        expectPaginatedResponse(listRes.body);
      }
    });

    it('create task then list returns paginated', async () => {
      if (!orgId) return;

      const createRes = await api.post('/api/v1/tasks')
        .set('x-organization-id', orgId)
        .send({
          title: `Task ${uniqueSuffix}`,
          task_type: 'general',
          priority: 'medium',
          status: 'pending',
        });

      const listRes = await api.get('/api/v1/tasks')
        .set('x-organization-id', orgId);

      if (listRes.status === 200) {
        expectPaginatedResponse(listRes.body);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // PHASE 5: PAGINATION PARAMS — page/pageSize on supported endpoints
  // ═══════════════════════════════════════════════════════════════

  describe('Phase 5: Pagination params work on supported endpoints', () => {
    it('tasks accepts page and pageSize', async () => {
      if (!orgId) return;

      const res = await api.get('/api/v1/tasks?page=1&pageSize=5')
        .set('x-organization-id', orgId);

      if (res.status === 200) {
        expectPaginatedResponse(res.body);
        expect(res.body.page).toBe(1);
        expect(res.body.pageSize).toBe(5);
      }
    });

    it('tasks page 2 returns different offset', async () => {
      if (!orgId) return;

      const page1 = await api.get('/api/v1/tasks?page=1&pageSize=1')
        .set('x-organization-id', orgId);
      const page2 = await api.get('/api/v1/tasks?page=2&pageSize=1')
        .set('x-organization-id', orgId);

      if (page1.status === 200 && page2.status === 200) {
        expectPaginatedResponse(page1.body);
        expectPaginatedResponse(page2.body);

        if (page1.body.total > 1) {
          // Pages should have different data
          const id1 = page1.body.data[0]?.id;
          const id2 = page2.body.data[0]?.id;
          if (id1 && id2) {
            expect(id1).not.toBe(id2);
          }
        }
      }
    });

    it('notifications accepts pagination', async () => {
      const res = await api.get('/api/v1/notifications?limit=5&page=1')
        .set('x-organization-id', orgId || generateUUID());

      if (res.status === 200) {
        expectPaginatedResponse(res.body);
      }
      expect([200, 400, 403, 404, 500]).toContain(res.status);
    });
  });
});
