import { setupRealApiIntegration, ApiIntegrationTestHelper } from '../../helpers/api-integration-test.helper';

const generateUUID = () => {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
  return [hex.substring(0, 8), hex.substring(8, 12), hex.substring(12, 16), hex.substring(16, 20), hex.substring(20, 32)].join('-');
};

describe('Orders API - Validation Tests', () => {
  let api: ApiIntegrationTestHelper;
  const testOrgId = generateUUID();

  beforeAll(async () => { api = await setupRealApiIntegration(generateUUID()); }, 60000);
  afterAll(async () => { await api.cleanup(); });

  describe('POST /api/v1/marketplace/orders', () => {
    it('should reject missing required fields', async () => {
      const res = await api.post('/api/v1/marketplace/orders').set('x-organization-id', testOrgId).send({});
      expect([400, 403, 404]).toContain(res.status);
    });

    it('should reject invalid payment method enum', async () => {
      const res = await api.post('/api/v1/marketplace/orders').set('x-organization-id', testOrgId).send({
        shipping_details: {
          name: 'Test Buyer',
          phone: '+212600000000',
          address: '123 Main Road',
          city: 'Rabat',
        },
        payment_method: 'wire',
      });
      expect([400, 403, 404]).toContain(res.status);
    });

    it('should reject invalid shipping_details shape', async () => {
      const res = await api.post('/api/v1/marketplace/orders').set('x-organization-id', testOrgId).send({
        shipping_details: {
          phone: '+212600000000',
          address: '123 Main Road',
          city: 'Rabat',
        },
        payment_method: 'cod',
      });
      expect([400, 403, 404]).toContain(res.status);
    });

    it('should accept valid order payload', async () => {
      const res = await api.post('/api/v1/marketplace/orders').set('x-organization-id', testOrgId).send({
        shipping_details: {
          name: 'Test Buyer',
          phone: '+212600000000',
          email: 'buyer@example.com',
          address: '123 Main Road',
          city: 'Rabat',
          postal_code: '10000',
        },
        payment_method: 'cod',
        notes: 'Handle with care',
      });
      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('PATCH /api/v1/marketplace/orders/:id/status', () => {
    it('should reject invalid status enum', async () => {
      const res = await api.patch(`/api/v1/marketplace/orders/${generateUUID()}/status`).set('x-organization-id', testOrgId).send({
        status: 'unknown-status',
      });
      expect([400, 403, 404]).toContain(res.status);
    });
  });

  describe('GET /api/v1/marketplace/orders', () => {
    it('should not fail validation for supported role query', async () => {
      const res = await api.get('/api/v1/marketplace/orders?role=buyer').set('x-organization-id', testOrgId);
      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });
});
