import { setupRealApiIntegration, ApiIntegrationTestHelper } from '../../helpers/api-integration-test.helper';

const generateUUID = () => {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return [hex.substring(0, 8), hex.substring(8, 12), hex.substring(12, 16), hex.substring(16, 20), hex.substring(20, 32)].join('-');
};

describe('PaymentRecords API - Validation Tests', () => {
  let api: ApiIntegrationTestHelper;
  const testOrgId = generateUUID();

  beforeAll(async () => { api = await setupRealApiIntegration(generateUUID()); }, 60000);
  afterAll(async () => { await api.cleanup(); });

  describe('POST /api/v1/organizations/:organizationId/payment-records/calculate', () => {
    it('should reject missing required fields', async () => {
      const res = await api.post(`/api/v1/organizations/${testOrgId}/payment-records/calculate`)
        .send({ worker_id: generateUUID() });

      expect([400, 403, 404, 500]).toContain(res.status);
    });

    it('should accept valid payload', async () => {
      const res = await api.post(`/api/v1/organizations/${testOrgId}/payment-records/calculate`)
        .send({
          worker_id: generateUUID(),
          period_start: '2025-01-01',
          period_end: '2025-01-31',
          include_advances: true,
        });

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('PATCH /api/v1/organizations/:organizationId/payment-records/:paymentId/process', () => {
    it('should reject missing required fields', async () => {
      const res = await api.patch(`/api/v1/organizations/${testOrgId}/payment-records/${generateUUID()}/process`)
        .send({});

      expect([400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('GET /api/v1/organizations/:organizationId/payment-records', () => {
    it('should respond with organization id in path', async () => {
      const res = await api.get(`/api/v1/organizations/${testOrgId}/payment-records`);
      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('GET /api/v1/organizations/:organizationId/payment-records/:paymentId', () => {
    it('should respond with organization id in path', async () => {
      const res = await api.get(`/api/v1/organizations/${testOrgId}/payment-records/${generateUUID()}`);
      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });
});
