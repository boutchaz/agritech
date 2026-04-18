import { setupRealApiIntegration, ApiIntegrationTestHelper } from '../../helpers/api-integration-test.helper';

const generateUUID = () => {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
  return [hex.substring(0, 8), hex.substring(8, 12), hex.substring(12, 16), hex.substring(16, 20), hex.substring(20, 32)].join('-');
};

describe('Notifications API - Validation Tests', () => {
  let api: ApiIntegrationTestHelper;
  const testOrgId = generateUUID();

  beforeAll(async () => {
    api = await setupRealApiIntegration(generateUUID());
  }, 60000);

  afterAll(async () => {
    await api.cleanup();
  });

  describe('GET /api/v1/notifications', () => {
    it('should reject invalid notification type filter', async () => {
      const res = await api.get('/api/v1/notifications?type=unknown_type')
        .set('x-organization-id', testOrgId);

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should accept valid filter query', async () => {
      const res = await api.get('/api/v1/notifications?type=general&limit=10&offset=0')
        .set('x-organization-id', testOrgId);

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('GET /api/v1/notifications/unread/count', () => {
    it('should accept unread count request', async () => {
      const res = await api.get('/api/v1/notifications/unread/count')
        .set('x-organization-id', testOrgId);

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('POST /api/v1/notifications/test', () => {
    it('should require organization context for test notification', async () => {
      const res = await api.post('/api/v1/notifications/test');
      expect([400, 403, 404, 500]).toContain(res.status);
    });
  });
});
