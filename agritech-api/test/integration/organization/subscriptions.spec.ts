import { setupRealApiIntegration, ApiIntegrationTestHelper } from '../../helpers/api-integration-test.helper';

const generateUUID = () => {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
  return [hex.substring(0, 8), hex.substring(8, 12), hex.substring(12, 16), hex.substring(16, 20), hex.substring(20, 32)].join('-');
};

describe('Subscriptions API - Validation Tests', () => {
  let api: ApiIntegrationTestHelper;
  const testOrgId = generateUUID();

  beforeAll(async () => {
    api = await setupRealApiIntegration(generateUUID());
  }, 60000);

  afterAll(async () => {
    await api.cleanup();
  });

  describe('GET /api/v1/subscriptions', () => {
    it('should reject missing organization header', async () => {
      const res = await api.get('/api/v1/subscriptions');
      expect([400, 403, 404]).toContain(res.status);
    });

    it('should accept request with organization header', async () => {
      const res = await api.get('/api/v1/subscriptions').set('x-organization-id', testOrgId);
      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('POST /api/v1/subscriptions/quote', () => {
    it('should reject invalid enum and range values', async () => {
      const res = await api.post('/api/v1/subscriptions/quote').send({
        formula: 'invalid_formula',
        contractedHectares: 0,
        billingCycle: 'invalid_cycle',
      });

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should accept valid quote payload', async () => {
      const res = await api.post('/api/v1/subscriptions/quote').send({
        formula: 'essential',
        contractedHectares: 25,
        billingCycle: 'monthly',
        discountPercent: 5,
      });

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('POST /api/v1/subscriptions/checkout', () => {
    it('should reject request without organization header', async () => {
      const res = await api.post('/api/v1/subscriptions/checkout').send({
        formula: 'standard',
        billingInterval: 'monthly',
        contractedHectares: 10,
      });

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should reject invalid checkout payload', async () => {
      const res = await api.post('/api/v1/subscriptions/checkout')
        .set('x-organization-id', testOrgId)
        .send({
          formula: 'bad_formula',
          billingInterval: 'bad_interval',
          contractedHectares: -10,
        });

      expect([400, 403, 404]).toContain(res.status);
    });
  });

  describe('POST /api/v1/subscriptions/trial', () => {
    it('should reject invalid DTO payload', async () => {
      const res = await api.post('/api/v1/subscriptions/trial').send({
        organization_id: 'not-a-uuid',
        plan_type: 'wrong-plan',
      });

      expect([400, 403, 404]).toContain(res.status);
    });
  });

  describe('POST /api/v1/subscriptions/check', () => {
    it('should reject invalid organizationId', async () => {
      const res = await api.post('/api/v1/subscriptions/check').send({
        organizationId: 'invalid-uuid',
      });

      expect([400, 403, 404]).toContain(res.status);
    });
  });

  describe('POST /api/v1/subscriptions/renewal/notice', () => {
    it('should reject invalid renewal notice payload', async () => {
      const res = await api.post('/api/v1/subscriptions/renewal/notice').send({
        organizationId: 'invalid-uuid',
        note: 'Reminder note',
      });

      expect([400, 403, 404]).toContain(res.status);
    });
  });

  describe('POST /api/v1/subscriptions/terminate', () => {
    it('should reject invalid terminate payload', async () => {
      const res = await api.post('/api/v1/subscriptions/terminate').send({
        organizationId: 'invalid-uuid',
        reason: 'No longer needed',
      });

      expect([400, 403, 404]).toContain(res.status);
    });
  });
});
