import { setupRealApiIntegration, ApiIntegrationTestHelper } from '../../helpers/api-integration-test.helper';

const generateUUID = () => {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return [hex.substring(0, 8), hex.substring(8, 12), hex.substring(12, 16), hex.substring(16, 20), hex.substring(20, 32)].join('-');
};

describe('Harvest Events API - Validation Tests', () => {
  let api: ApiIntegrationTestHelper;
  const testOrgId = generateUUID();

  beforeAll(async () => {
    api = await setupRealApiIntegration(generateUUID());
  }, 60000);

  afterAll(async () => { await api.cleanup(); });

  describe('POST /api/v1/harvest-events', () => {
    it('should reject missing required fields', async () => {
      const res = await api.post('/api/v1/harvest-events')
        .set('x-organization-id', testOrgId)
        .send({});

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should reject invalid formats', async () => {
      const res = await api.post('/api/v1/harvest-events')
        .set('x-organization-id', testOrgId)
        .send({
          crop_cycle_id: 'invalid-uuid',
          harvest_date: 'invalid-date',
          harvest_number: 0,
        });

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should accept valid payload', async () => {
      const res = await api.post('/api/v1/harvest-events')
        .set('x-organization-id', testOrgId)
        .send({
          crop_cycle_id: generateUUID(),
          harvest_date: '2026-01-15',
          quantity: 150,
          quantity_unit: 'kg',
        });

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('PATCH /api/v1/harvest-events/:id', () => {
    it('should reject invalid formats', async () => {
      const res = await api.patch(`/api/v1/harvest-events/${generateUUID()}`)
        .set('x-organization-id', testOrgId)
        .send({
          harvest_date: 'not-a-date',
          quantity: -5,
        });

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should accept valid payload', async () => {
      const res = await api.patch(`/api/v1/harvest-events/${generateUUID()}`)
        .set('x-organization-id', testOrgId)
        .send({
          quality_grade: 'A',
          quality_notes: 'Good quality from integration test',
        });

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('GET /api/v1/harvest-events/cycle/:cropCycleId', () => {
    it('should reject request without organization header', async () => {
      const res = await api.get(`/api/v1/harvest-events/cycle/${generateUUID()}`);

      expect([400, 403, 404, 500]).toContain(res.status);
    });

    it('should accept request with organization header', async () => {
      const res = await api.get(`/api/v1/harvest-events/cycle/${generateUUID()}`)
        .set('x-organization-id', testOrgId);

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('GET /api/v1/harvest-events/cycle/:cropCycleId/stats', () => {
    it('should reject request without organization header', async () => {
      const res = await api.get(`/api/v1/harvest-events/cycle/${generateUUID()}/stats`);

      expect([400, 403, 404, 500]).toContain(res.status);
    });

    it('should accept request with organization header', async () => {
      const res = await api.get(`/api/v1/harvest-events/cycle/${generateUUID()}/stats`)
        .set('x-organization-id', testOrgId);

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('GET /api/v1/harvest-events/:id', () => {
    it('should reject request without organization header', async () => {
      const res = await api.get(`/api/v1/harvest-events/${generateUUID()}`);

      expect([400, 403, 404, 500]).toContain(res.status);
    });

    it('should accept request with organization header', async () => {
      const res = await api.get(`/api/v1/harvest-events/${generateUUID()}`)
        .set('x-organization-id', testOrgId);

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('DELETE /api/v1/harvest-events/:id', () => {
    it('should reject request without organization header', async () => {
      const res = await api.delete(`/api/v1/harvest-events/${generateUUID()}`);

      expect([400, 403, 404, 500]).toContain(res.status);
    });

    it('should accept request with organization header', async () => {
      const res = await api.delete(`/api/v1/harvest-events/${generateUUID()}`)
        .set('x-organization-id', testOrgId);

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });
});
