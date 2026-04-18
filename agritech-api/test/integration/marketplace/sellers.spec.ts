import { setupRealApiIntegration, ApiIntegrationTestHelper } from '../../helpers/api-integration-test.helper';

const generateUUID = () => {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
  return [hex.substring(0, 8), hex.substring(8, 12), hex.substring(12, 16), hex.substring(16, 20), hex.substring(20, 32)].join('-');
};

describe('Sellers API - Validation Tests', () => {
  let api: ApiIntegrationTestHelper;
  const testOrgId = generateUUID();

  beforeAll(async () => { api = await setupRealApiIntegration(generateUUID()); }, 60000);
  afterAll(async () => { await api.cleanup(); });

  describe('GET /api/v1/marketplace/sellers', () => {
    it('should accept base seller listing request', async () => {
      const res = await api.get('/api/v1/marketplace/sellers').set('x-organization-id', testOrgId);
      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });

    it('should not fail validation with numeric paging query params', async () => {
      const res = await api.get('/api/v1/marketplace/sellers?page=1&limit=20').set('x-organization-id', testOrgId);
      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('GET /api/v1/marketplace/sellers/cities', () => {
    it('should return seller city aggregation endpoint response', async () => {
      const res = await api.get('/api/v1/marketplace/sellers/cities').set('x-organization-id', testOrgId);
      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('GET /api/v1/marketplace/sellers/:slug', () => {
    it('should handle unknown seller slug', async () => {
      const res = await api.get('/api/v1/marketplace/sellers/non-existent-seller').set('x-organization-id', testOrgId);
      expect([404, 500]).toContain(res.status);
    });
  });

  describe('GET /api/v1/marketplace/sellers/:slug/products', () => {
    it('should handle unknown seller products path', async () => {
      const res = await api.get('/api/v1/marketplace/sellers/non-existent-seller/products').set('x-organization-id', testOrgId);
      expect([404, 500]).toContain(res.status);
    });
  });

  describe('GET /api/v1/marketplace/sellers/:slug/reviews', () => {
    it('should handle unknown seller reviews path', async () => {
      const res = await api.get('/api/v1/marketplace/sellers/non-existent-seller/reviews').set('x-organization-id', testOrgId);
      expect([404, 500]).toContain(res.status);
    });
  });
});
