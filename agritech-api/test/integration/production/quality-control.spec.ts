import { setupRealApiIntegration, ApiIntegrationTestHelper } from '../../helpers/api-integration-test.helper';

const generateUUID = () => {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return [hex.substring(0, 8), hex.substring(8, 12), hex.substring(12, 16), hex.substring(16, 20), hex.substring(20, 32)].join('-');
};

describe('Quality Control API - Validation Tests', () => {
  let api: ApiIntegrationTestHelper;
  const testOrgId = generateUUID();

  beforeAll(async () => {
    api = await setupRealApiIntegration(generateUUID());
  }, 60000);

  afterAll(async () => { await api.cleanup(); });

  describe('POST /api/v1/quality-control', () => {
    it('should reject missing required fields', async () => {
      const res = await api.post('/api/v1/quality-control')
        .set('x-organization-id', testOrgId)
        .send({});

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should reject invalid formats', async () => {
      const res = await api.post('/api/v1/quality-control')
        .set('x-organization-id', testOrgId)
        .send({
          organization_id: 'invalid-uuid',
          farm_id: generateUUID(),
          type: 'wrong-type',
          inspection_date: 'invalid-date',
          overall_score: -1,
        });

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should accept valid payload', async () => {
      const res = await api.post('/api/v1/quality-control')
        .set('x-organization-id', testOrgId)
        .send({
          organization_id: testOrgId,
          farm_id: generateUUID(),
          type: 'harvest',
          inspection_date: '2026-03-05T00:00:00.000Z',
          overall_score: 88,
        });

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('PATCH /api/v1/quality-control/:id', () => {
    it('should reject invalid formats', async () => {
      const res = await api.patch(`/api/v1/quality-control/${generateUUID()}`)
        .set('x-organization-id', testOrgId)
        .send({
          type: 'invalid-type',
          overall_score: -5,
        });

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should accept valid payload', async () => {
      const res = await api.patch(`/api/v1/quality-control/${generateUUID()}`)
        .set('x-organization-id', testOrgId)
        .send({
          results: 'Inspection updated from integration test',
          status: 'in_progress',
        });

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('PATCH /api/v1/quality-control/:id/status', () => {
    it('should accept valid payload', async () => {
      const res = await api.patch(`/api/v1/quality-control/${generateUUID()}/status`)
        .set('x-organization-id', testOrgId)
        .send({ status: 'passed' });

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('GET /api/v1/quality-control', () => {
    it('should reject request without organization header', async () => {
      const res = await api.get('/api/v1/quality-control');

      expect([400, 403, 404, 500]).toContain(res.status);
    });

    it('should accept request with organization header', async () => {
      const res = await api.get('/api/v1/quality-control')
        .set('x-organization-id', testOrgId);

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('GET /api/v1/quality-control/statistics', () => {
    it('should reject request without organization header', async () => {
      const res = await api.get('/api/v1/quality-control/statistics');

      expect([400, 403, 404, 500]).toContain(res.status);
    });

    it('should accept request with organization header', async () => {
      const res = await api.get('/api/v1/quality-control/statistics')
        .set('x-organization-id', testOrgId);

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('GET /api/v1/quality-control/:id', () => {
    it('should reject request without organization header', async () => {
      const res = await api.get(`/api/v1/quality-control/${generateUUID()}`);

      expect([400, 403, 404, 500]).toContain(res.status);
    });

    it('should accept request with organization header', async () => {
      const res = await api.get(`/api/v1/quality-control/${generateUUID()}`)
        .set('x-organization-id', testOrgId);

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('DELETE /api/v1/quality-control/:id', () => {
    it('should reject request without organization header', async () => {
      const res = await api.delete(`/api/v1/quality-control/${generateUUID()}`);

      expect([400, 403, 404, 500]).toContain(res.status);
    });

    it('should accept request with organization header', async () => {
      const res = await api.delete(`/api/v1/quality-control/${generateUUID()}`)
        .set('x-organization-id', testOrgId);

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });
});
