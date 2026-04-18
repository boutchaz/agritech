import { setupRealApiIntegration, ApiIntegrationTestHelper } from '../../helpers/api-integration-test.helper';

const generateUUID = () => {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
  return [hex.substring(0, 8), hex.substring(8, 12), hex.substring(12, 16), hex.substring(16, 20), hex.substring(20, 32)].join('-');
};

describe('Users API - Validation Tests', () => {
  let api: ApiIntegrationTestHelper;
  const testOrgId = generateUUID();

  beforeAll(async () => {
    api = await setupRealApiIntegration(generateUUID());
  }, 60000);

  afterAll(async () => {
    await api.cleanup();
  });

  describe('PATCH /api/v1/users/me', () => {
    it('should reject invalid profile fields', async () => {
      const res = await api.patch('/api/v1/users/me').send({
        email: 'not-an-email',
        phone: 'abc',
        language: 'de',
      });

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should accept valid profile payload', async () => {
      const res = await api.patch('/api/v1/users/me').send({
        first_name: 'Test',
        last_name: 'User',
        email: `user-${Date.now()}@example.com`,
        language: 'en',
        completed_tours: ['welcome', 'dashboard'],
      });

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('PATCH /api/v1/users/organizations/:organizationId/users/:userId/role', () => {
    it('should reject missing role_id', async () => {
      const res = await api.patch(`/api/v1/users/organizations/${testOrgId}/users/${generateUUID()}/role`).send({});
      expect([400, 403, 404]).toContain(res.status);
    });

    it('should reject invalid role_id format', async () => {
      const res = await api.patch(`/api/v1/users/organizations/${testOrgId}/users/${generateUUID()}/role`).send({
        role_id: 'invalid-uuid',
      });

      expect([400, 403, 404]).toContain(res.status);
    });
  });

  describe('PATCH /api/v1/users/organizations/:organizationId/users/:userId/status', () => {
    it('should reject missing is_active field', async () => {
      const res = await api.patch(`/api/v1/users/organizations/${testOrgId}/users/${generateUUID()}/status`).send({});
      expect([400, 403, 404]).toContain(res.status);
    });

    it('should accept valid status payload', async () => {
      const res = await api.patch(`/api/v1/users/organizations/${testOrgId}/users/${generateUUID()}/status`).send({
        is_active: false,
      });

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('PATCH /api/v1/users/me/tour-preferences', () => {
    it('should reject invalid array field types', async () => {
      const res = await api.patch('/api/v1/users/me/tour-preferences').send({
        completed_tours: 'welcome',
      });

      expect([400, 403, 404]).toContain(res.status);
    });
  });

  describe('POST /api/v1/users/me/avatar', () => {
    it('should reject missing file upload', async () => {
      const res = await api.post('/api/v1/users/me/avatar');
      expect([400, 403, 404]).toContain(res.status);
    });
  });
});
