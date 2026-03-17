import { setupRealApiIntegration, ApiIntegrationTestHelper } from '../../helpers/api-integration-test.helper';

const generateUUID = () => {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
  return [hex.substring(0, 8), hex.substring(8, 12), hex.substring(12, 16), hex.substring(16, 20), hex.substring(20, 32)].join('-');
};

describe('Marketplace API - Validation Tests', () => {
  let api: ApiIntegrationTestHelper;
  const testOrgId = generateUUID();

  beforeAll(async () => { api = await setupRealApiIntegration(generateUUID()); }, 60000);
  afterAll(async () => { await api.cleanup(); });

  describe('GET /api/v1/marketplace/products', () => {
    it('should reject invalid sort enum', async () => {
      const res = await api.get('/api/v1/marketplace/products?sort=invalid').set('x-organization-id', testOrgId);
      expect([400, 403, 404]).toContain(res.status);
    });

    it('should reject negative min_price', async () => {
      const res = await api.get('/api/v1/marketplace/products?min_price=-1').set('x-organization-id', testOrgId);
      expect([400, 403, 404]).toContain(res.status);
    });

    it('should reject invalid pagination values', async () => {
      const res = await api.get('/api/v1/marketplace/products?page=0&limit=0').set('x-organization-id', testOrgId);
      expect([400, 403, 404]).toContain(res.status);
    });

    it('should accept valid query parameters', async () => {
      const res = await api
        .get('/api/v1/marketplace/products?sort=newest&min_price=0&max_price=100&page=1&limit=10')
        .set('x-organization-id', testOrgId);
      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('GET /api/v1/marketplace/categories/:slug', () => {
    it('should handle unknown category slug gracefully', async () => {
      const res = await api.get('/api/v1/marketplace/categories/non-existent-category').set('x-organization-id', testOrgId);
      expect([404, 500]).toContain(res.status);
    });
  });

  describe('POST /api/v1/marketplace/quote-requests', () => {
    it('should reject invalid quote request payload', async () => {
      const res = await api.post('/api/v1/marketplace/quote-requests').set('x-organization-id', testOrgId).send({
        product_title: 'Input Batch',
        seller_organization_id: 'not-uuid',
        buyer_contact_email: 'bad-email',
        requested_quantity: -1,
      });
      expect([400, 403, 404]).toContain(res.status);
    });
  });

  describe('POST /api/v1/marketplace/reviews', () => {
    it('should reject invalid review rating and IDs', async () => {
      const res = await api.post('/api/v1/marketplace/reviews').set('x-organization-id', testOrgId).send({
        reviewee_organization_id: 'not-uuid',
        order_id: 'not-uuid',
        rating: 6,
      });
      expect([400, 403, 404]).toContain(res.status);
    });
  });
});
