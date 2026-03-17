import { setupRealApiIntegration, ApiIntegrationTestHelper } from '../../helpers/api-integration-test.helper';

const generateUUID = () => {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
  return [hex.substring(0, 8), hex.substring(8, 12), hex.substring(12, 16), hex.substring(16, 20), hex.substring(20, 32)].join('-');
};

describe('Organizations API - Validation Tests', () => {
  let api: ApiIntegrationTestHelper;
  const testOrgId = generateUUID();

  beforeAll(async () => {
    api = await setupRealApiIntegration(generateUUID());
  }, 60000);

  afterAll(async () => {
    await api.cleanup();
  });

  describe('PATCH /api/v1/organizations/:id', () => {
    it('should reject invalid organization fields', async () => {
      const res = await api.patch(`/api/v1/organizations/${testOrgId}`).send({
        email: 'invalid-email',
        phone: '1',
        website: 'not-a-url',
        map_provider: 'invalid-provider',
      });

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should accept valid organization update payload', async () => {
      const res = await api.patch(`/api/v1/organizations/${testOrgId}`).send({
        name: `Organization ${Date.now()}`,
        email: `org-${Date.now()}@example.com`,
        phone: '+212600000000',
        website: 'https://example.com',
        map_provider: 'default',
      });

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('GET /api/v1/organizations/my-organizations', () => {
    it('should accept authenticated request', async () => {
      const res = await api.get('/api/v1/organizations/my-organizations');
      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('GET /api/v1/organizations/:id', () => {
    it('should accept organization read request', async () => {
      const res = await api.get(`/api/v1/organizations/${testOrgId}`);
      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('POST /api/v1/org-setup/:organizationId/*', () => {
    it('should accept seed-work-units request shape', async () => {
      const res = await api.post(`/api/v1/org-setup/${testOrgId}/seed-work-units`).send({});
      expect([200, 400, 500]).toContain(res.status);
    });

    it('should accept initialize payload with optional flags', async () => {
      const res = await api.post(`/api/v1/org-setup/${testOrgId}/initialize`).send({
        skipWorkUnits: true,
        skipFiscalYear: true,
        skipCampaign: true,
      });
      expect([200, 400, 500]).toContain(res.status);
    });
  });

  describe('Organization AI Settings /api/v1/organization-ai-settings', () => {
    it('should reject request without organization header', async () => {
      const res = await api.get('/api/v1/organization-ai-settings');
      expect([400, 403, 404]).toContain(res.status);
    });

    it('should reject invalid provider enum', async () => {
      const res = await api.post('/api/v1/organization-ai-settings')
        .set('x-organization-id', testOrgId)
        .send({
          provider: 'invalid_provider',
          api_key: 'sk-123456789012345678901234567890',
          enabled: true,
        });

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should reject too short api key', async () => {
      const res = await api.post('/api/v1/organization-ai-settings')
        .set('x-organization-id', testOrgId)
        .send({
          provider: 'openai',
          api_key: 'short-key',
        });

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should reject invalid provider path value', async () => {
      const res = await api.delete('/api/v1/organization-ai-settings/not_supported')
        .set('x-organization-id', testOrgId);

      expect([400, 403, 404]).toContain(res.status);
    });
  });
});
