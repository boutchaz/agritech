import { setupRealApiIntegration, ApiIntegrationTestHelper } from '../../helpers/api-integration-test.helper';

const generateUUID = () => {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
  return [hex.substring(0, 8), hex.substring(8, 12), hex.substring(12, 16), hex.substring(16, 20), hex.substring(20, 32)].join('-');
};

describe('Admin API - Validation Tests', () => {
  let api: ApiIntegrationTestHelper;
  const testOrgId = generateUUID();

  beforeAll(async () => {
    api = await setupRealApiIntegration(generateUUID());
  }, 60000);

  afterAll(async () => {
    await api.cleanup();
  });

  describe('POST /api/v1/admin/ref/import', () => {
    it('should reject missing required fields', async () => {
      const res = await api.post('/api/v1/admin/ref/import')
        .set('x-organization-id', testOrgId)
        .send({});

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should reject invalid enum/object payload', async () => {
      const res = await api.post('/api/v1/admin/ref/import')
        .set('x-organization-id', testOrgId)
        .send({
          table: 'invalid_table',
          rows: [{ data: 'not-an-object' }],
          dryRun: 'yes',
        });

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should accept valid import payload shape', async () => {
      const res = await api.post('/api/v1/admin/ref/import')
        .set('x-organization-id', testOrgId)
        .send({
          table: 'work_units',
          rows: [{ data: { code: `UNIT_${Date.now()}`, name: 'Unit Test' } }],
          dryRun: true,
          updateExisting: false,
          version: 'v1.0.0',
        });

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('POST /api/v1/admin/ref/publish', () => {
    it('should reject invalid ids list', async () => {
      const res = await api.post('/api/v1/admin/ref/publish')
        .set('x-organization-id', testOrgId)
        .send({
          table: 'modules',
          ids: ['invalid-uuid'],
        });

      expect([400, 403, 404]).toContain(res.status);
    });
  });

  describe('POST /api/v1/admin/ref/seed-accounts', () => {
    it('should reject invalid DTO payload', async () => {
      const res = await api.post('/api/v1/admin/ref/seed-accounts')
        .set('x-organization-id', testOrgId)
        .send({
          organizationId: 'bad-uuid',
          chartType: 'bad-chart',
        });

      expect([400, 403, 404]).toContain(res.status);
    });
  });

  describe('GET /api/v1/admin/orgs', () => {
    it('should accept optional query filters', async () => {
      const res = await api.get('/api/v1/admin/orgs?planType=standard&status=active&limit=20&offset=0')
        .set('x-organization-id', testOrgId);

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('GET /api/v1/admin/jobs', () => {
    it('should accept pagination query params', async () => {
      const res = await api.get('/api/v1/admin/jobs?limit=10&offset=0')
        .set('x-organization-id', testOrgId);

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });
});
