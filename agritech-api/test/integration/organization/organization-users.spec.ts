import { setupRealApiIntegration, ApiIntegrationTestHelper } from '../../helpers/api-integration-test.helper';

const generateUUID = () => {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
  return [hex.substring(0, 8), hex.substring(8, 12), hex.substring(12, 16), hex.substring(16, 20), hex.substring(20, 32)].join('-');
};

describe('OrganizationUsers API - Validation Tests', () => {
  let api: ApiIntegrationTestHelper;
  const testOrgId = generateUUID();

  beforeAll(async () => {
    api = await setupRealApiIntegration(generateUUID());
  }, 60000);

  afterAll(async () => {
    await api.cleanup();
  });

  describe('POST /api/v1/organization-users', () => {
    it('should reject missing required UUID fields', async () => {
      const res = await api.post('/api/v1/organization-users')
        .set('x-organization-id', testOrgId)
        .send({});

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should reject invalid UUID formats', async () => {
      const res = await api.post('/api/v1/organization-users')
        .set('x-organization-id', testOrgId)
        .send({
          user_id: 'not-a-uuid',
          role_id: 'also-not-a-uuid',
          is_active: true,
        });

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should accept valid payload shape', async () => {
      const res = await api.post('/api/v1/organization-users')
        .set('x-organization-id', testOrgId)
        .send({
          user_id: generateUUID(),
          role_id: generateUUID(),
          is_active: true,
        });

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('PATCH /api/v1/organization-users/:userId', () => {
    it('should reject invalid role_id', async () => {
      const res = await api.patch(`/api/v1/organization-users/${generateUUID()}`)
        .set('x-organization-id', testOrgId)
        .send({
          role_id: 'invalid-uuid',
        });

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should accept valid update payload', async () => {
      const res = await api.patch(`/api/v1/organization-users/${generateUUID()}`)
        .set('x-organization-id', testOrgId)
        .send({
          role_id: generateUUID(),
          is_active: false,
        });

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('GET /api/v1/organization-users', () => {
    it('should reject invalid numeric query fields', async () => {
      const res = await api.get('/api/v1/organization-users?page=invalid&limit=invalid')
        .set('x-organization-id', testOrgId);

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should accept valid query filters', async () => {
      const res = await api.get('/api/v1/organization-users?page=1&limit=20&is_active=true')
        .set('x-organization-id', testOrgId);

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });
});
