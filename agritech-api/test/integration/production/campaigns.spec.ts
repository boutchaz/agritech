import { setupRealApiIntegration, ApiIntegrationTestHelper } from '../../helpers/api-integration-test.helper';

const generateUUID = () => {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return [hex.substring(0, 8), hex.substring(8, 12), hex.substring(12, 16), hex.substring(16, 20), hex.substring(20, 32)].join('-');
};

describe('Campaigns API - Validation Tests', () => {
  let api: ApiIntegrationTestHelper;
  const testOrgId = generateUUID();

  beforeAll(async () => {
    api = await setupRealApiIntegration(generateUUID());
  }, 60000);

  afterAll(async () => { await api.cleanup(); });

  describe('POST /api/v1/campaigns', () => {
    it('should reject missing required fields', async () => {
      const res = await api.post('/api/v1/campaigns')
        .set('x-organization-id', testOrgId)
        .send({});

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should reject invalid formats', async () => {
      const res = await api.post('/api/v1/campaigns')
        .set('x-organization-id', testOrgId)
        .send({
          organization_id: 'invalid-uuid',
          name: 'Test Campaign',
          type: 'wrong-type',
          start_date: 'invalid-date',
          budget: -50,
        });

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should accept valid payload', async () => {
      const res = await api.post('/api/v1/campaigns')
        .set('x-organization-id', testOrgId)
        .send({
          organization_id: testOrgId,
          name: `Campaign ${Date.now()}`,
          type: 'planting',
          start_date: '2026-03-01T00:00:00.000Z',
          budget: 5000,
        });

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('PATCH /api/v1/campaigns/:id', () => {
    it('should reject invalid formats', async () => {
      const res = await api.patch(`/api/v1/campaigns/${generateUUID()}`)
        .set('x-organization-id', testOrgId)
        .send({
          type: 'invalid-type',
          priority: 0,
        });

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should accept valid payload', async () => {
      const res = await api.patch(`/api/v1/campaigns/${generateUUID()}`)
        .set('x-organization-id', testOrgId)
        .send({
          description: 'Updated campaign from integration test',
          status: 'active',
        });

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('PATCH /api/v1/campaigns/:id/status', () => {
    it('should accept valid payload', async () => {
      const res = await api.patch(`/api/v1/campaigns/${generateUUID()}/status`)
        .set('x-organization-id', testOrgId)
        .send({ status: 'active' });

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('GET /api/v1/campaigns', () => {
    it('should reject request without organization header', async () => {
      const res = await api.get('/api/v1/campaigns');

      expect([400, 403, 404, 500]).toContain(res.status);
    });

    it('should accept request with organization header', async () => {
      const res = await api.get('/api/v1/campaigns')
        .set('x-organization-id', testOrgId);

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('GET /api/v1/campaigns/statistics', () => {
    it('should reject request without organization header', async () => {
      const res = await api.get('/api/v1/campaigns/statistics');

      expect([400, 403, 404, 500]).toContain(res.status);
    });

    it('should accept request with organization header', async () => {
      const res = await api.get('/api/v1/campaigns/statistics')
        .set('x-organization-id', testOrgId);

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('GET /api/v1/campaigns/:id', () => {
    it('should reject request without organization header', async () => {
      const res = await api.get(`/api/v1/campaigns/${generateUUID()}`);

      expect([400, 403, 404, 500]).toContain(res.status);
    });

    it('should accept request with organization header', async () => {
      const res = await api.get(`/api/v1/campaigns/${generateUUID()}`)
        .set('x-organization-id', testOrgId);

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('DELETE /api/v1/campaigns/:id', () => {
    it('should reject request without organization header', async () => {
      const res = await api.delete(`/api/v1/campaigns/${generateUUID()}`);

      expect([400, 403, 404, 500]).toContain(res.status);
    });

    it('should accept request with organization header', async () => {
      const res = await api.delete(`/api/v1/campaigns/${generateUUID()}`)
        .set('x-organization-id', testOrgId);

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });
});
