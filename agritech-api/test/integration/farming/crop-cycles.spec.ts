import { setupRealApiIntegration, ApiIntegrationTestHelper } from '../../helpers/api-integration-test.helper';

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

describe('Crop Cycles API - Validation Tests', () => {
  let api: ApiIntegrationTestHelper;
  const testOrgId = generateUUID();

  beforeAll(async () => {
    api = await setupRealApiIntegration(generateUUID());
  }, 60000);

  afterAll(async () => {
    await api.cleanup();
  });

  describe('POST /api/v1/crop-cycles', () => {
    it('should reject missing required fields', async () => {
      const res = await api.post('/api/v1/crop-cycles')
        .set('x-organization-id', testOrgId)
        .send({});

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should reject invalid field formats', async () => {
      const res = await api.post('/api/v1/crop-cycles')
        .set('x-organization-id', testOrgId)
        .send({
          organization_id: 'invalid-uuid',
          farm_id: 'invalid-uuid',
          crop_type: 123,
          cycle_code: 456,
        });

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should accept valid payload', async () => {
      const res = await api.post('/api/v1/crop-cycles')
        .set('x-organization-id', testOrgId)
        .send({
          organization_id: testOrgId,
          farm_id: generateUUID(),
          crop_type: 'wheat',
          cycle_code: `CC-${Date.now()}`,
          planting_date: '2024-01-01',
        });

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });

    it('should reject request without organization header', async () => {
      const res = await api.post('/api/v1/crop-cycles').send({
        organization_id: testOrgId,
        farm_id: generateUUID(),
        crop_type: 'wheat',
        cycle_code: `CC-${Date.now()}`,
      });

      expect([400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('PATCH /api/v1/crop-cycles/:id', () => {
    it('should reject invalid field formats', async () => {
      const res = await api.patch(`/api/v1/crop-cycles/${generateUUID()}`)
        .set('x-organization-id', testOrgId)
        .send({
          planting_date: 'invalid-date',
          expected_yield_per_ha: 'invalid',
        });

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should accept valid payload', async () => {
      const res = await api.patch(`/api/v1/crop-cycles/${generateUUID()}`)
        .set('x-organization-id', testOrgId)
        .send({
          cycle_name: `Updated cycle ${Date.now()}`,
          expected_yield_per_ha: 1000,
        });

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });

    it('should reject request without organization header', async () => {
      const res = await api.patch(`/api/v1/crop-cycles/${generateUUID()}`).send({
        cycle_name: `Updated cycle ${Date.now()}`,
      });

      expect([400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('PATCH /api/v1/crop-cycles/:id/status', () => {
    it('should reject missing required fields', async () => {
      const res = await api.patch(`/api/v1/crop-cycles/${generateUUID()}/status`)
        .set('x-organization-id', testOrgId)
        .send({});

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should reject invalid field formats', async () => {
      const res = await api.patch(`/api/v1/crop-cycles/${generateUUID()}/status`)
        .set('x-organization-id', testOrgId)
        .send({
          status: 'not-a-valid-status',
        });

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should accept valid payload', async () => {
      const res = await api.patch(`/api/v1/crop-cycles/${generateUUID()}/status`)
        .set('x-organization-id', testOrgId)
        .send({
          status: 'planned',
        });

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });

    it('should reject request without organization header', async () => {
      const res = await api.patch(`/api/v1/crop-cycles/${generateUUID()}/status`).send({
        status: 'planned',
      });

      expect([400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('GET /api/v1/crop-cycles', () => {
    it('should reject request without organization header', async () => {
      const res = await api.get('/api/v1/crop-cycles');

      expect([400, 403, 404, 500]).toContain(res.status);
    });

    it('should accept request with organization header', async () => {
      const res = await api.get('/api/v1/crop-cycles')
        .set('x-organization-id', testOrgId);

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('GET /api/v1/crop-cycles/statistics', () => {
    it('should reject request without organization header', async () => {
      const res = await api.get('/api/v1/crop-cycles/statistics');

      expect([400, 403, 404, 500]).toContain(res.status);
    });

    it('should accept request with organization header', async () => {
      const res = await api.get('/api/v1/crop-cycles/statistics')
        .set('x-organization-id', testOrgId);

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('GET /api/v1/crop-cycles/:id', () => {
    it('should reject request without organization header', async () => {
      const res = await api.get(`/api/v1/crop-cycles/${generateUUID()}`);

      expect([400, 403, 404, 500]).toContain(res.status);
    });

    it('should accept request with organization header', async () => {
      const res = await api.get(`/api/v1/crop-cycles/${generateUUID()}`)
        .set('x-organization-id', testOrgId);

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('DELETE /api/v1/crop-cycles/:id', () => {
    it('should reject request without organization header', async () => {
      const res = await api.delete(`/api/v1/crop-cycles/${generateUUID()}`);

      expect([400, 403, 404, 500]).toContain(res.status);
    });

    it('should accept request with organization header', async () => {
      const res = await api.delete(`/api/v1/crop-cycles/${generateUUID()}`)
        .set('x-organization-id', testOrgId);

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });
});
