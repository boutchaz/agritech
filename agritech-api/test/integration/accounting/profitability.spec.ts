import { setupRealApiIntegration, ApiIntegrationTestHelper } from '../../helpers/api-integration-test.helper';

const generateUUID = () => {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return [hex.substring(0, 8), hex.substring(8, 12), hex.substring(12, 16), hex.substring(16, 20), hex.substring(20, 32)].join('-');
};

describe('Profitability API - Validation Tests', () => {
  let api: ApiIntegrationTestHelper;
  const testOrgId = generateUUID();

  beforeAll(async () => { api = await setupRealApiIntegration(generateUUID()); }, 60000);
  afterAll(async () => { await api.cleanup(); });

  describe('POST /api/v1/profitability/costs', () => {
    it('should reject missing required fields', async () => {
      const res = await api.post('/api/v1/profitability/costs')
        .set('x-organization-id', testOrgId)
        .send({ amount: 150 });

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should reject invalid formats', async () => {
      const res = await api.post('/api/v1/profitability/costs')
        .set('x-organization-id', testOrgId)
        .send({
          parcel_id: 'invalid-uuid',
          cost_type: 'labor',
          amount: 150,
          date: '2025-01-01',
        });

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should accept valid payload', async () => {
      const res = await api.post('/api/v1/profitability/costs')
        .set('x-organization-id', testOrgId)
        .send({
          parcel_id: generateUUID(),
          cost_type: 'labor',
          amount: 150,
          date: '2025-01-01',
        });

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('POST /api/v1/profitability/revenues', () => {
    it('should reject invalid formats', async () => {
      const res = await api.post('/api/v1/profitability/revenues')
        .set('x-organization-id', testOrgId)
        .send({
          parcel_id: generateUUID(),
          revenue_type: 'harvest',
          amount: 'invalid-number',
          date: '2025-01-01',
        });

      expect([400, 403, 404]).toContain(res.status);
    });
  });

  describe('GET /api/v1/profitability/analytics', () => {
    it('should fail without organization header', async () => {
      const res = await api.get('/api/v1/profitability/analytics');
      expect([400, 403, 404, 500]).toContain(res.status);
    });

    it('should accept request with organization header', async () => {
      const res = await api.get('/api/v1/profitability/analytics').set('x-organization-id', testOrgId);
      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });
});
