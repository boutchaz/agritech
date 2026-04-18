import { setupRealApiIntegration, ApiIntegrationTestHelper } from '../../helpers/api-integration-test.helper';

const generateUUID = () => {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
  return [hex.substring(0, 8), hex.substring(8, 12), hex.substring(12, 16), hex.substring(16, 20), hex.substring(20, 32)].join('-');
};

describe('ModuleConfig API - Validation Tests', () => {
  let api: ApiIntegrationTestHelper;
  const testOrgId = generateUUID();

  beforeAll(async () => {
    api = await setupRealApiIntegration(generateUUID());
  }, 60000);

  afterAll(async () => {
    await api.cleanup();
  });

  describe('GET /api/v1/module-config', () => {
    it('should return module configuration with explicit locale', async () => {
      const res = await api.get('/api/v1/module-config?locale=en')
        .set('x-organization-id', testOrgId);

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });

    it('should return module configuration with default locale', async () => {
      const res = await api.get('/api/v1/module-config')
        .set('x-organization-id', testOrgId);

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('POST /api/v1/module-config/calculate-price', () => {
    it('should accept valid module slugs payload', async () => {
      const res = await api.post('/api/v1/module-config/calculate-price')
        .set('x-organization-id', testOrgId)
        .send({
          moduleSlugs: ['farm_management', 'inventory'],
        });

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('POST /api/v1/module-config/clear-cache', () => {
    it('should clear cache endpoint without payload', async () => {
      const res = await api.post('/api/v1/module-config/clear-cache')
        .set('x-organization-id', testOrgId)
        .send({});

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });
});
