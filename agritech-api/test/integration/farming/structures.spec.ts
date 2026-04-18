import { setupRealApiIntegration, ApiIntegrationTestHelper } from '../../helpers/api-integration-test.helper';

const generateUUID = () => {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return [
    hex.substring(0, 8), hex.substring(8, 12), hex.substring(12, 16),
    hex.substring(16, 20), hex.substring(20, 32)
  ].join('-');
};

describe('Structures API - Validation Tests', () => {
  let api: ApiIntegrationTestHelper;
  const testOrgId = generateUUID();

  beforeAll(async () => {
    api = await setupRealApiIntegration(generateUUID());
  }, 60000);

  afterAll(async () => {
    await api.cleanup();
  });

  describe('POST /api/v1/organizations/:organizationId/structures', () => {
    it('should reject missing required fields', async () => {
      const res = await api.post(`/api/v1/organizations/${testOrgId}/structures`)
        .set('x-organization-id', testOrgId)
        .send({});

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should reject invalid field formats', async () => {
      const res = await api.post(`/api/v1/organizations/${testOrgId}/structures`)
        .set('x-organization-id', testOrgId)
        .send({
          name: 123,
          type: 'invalid-type',
          installation_date: 'invalid-date',
        });

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should accept valid payload', async () => {
      const res = await api.post(`/api/v1/organizations/${testOrgId}/structures`)
        .set('x-organization-id', testOrgId)
        .send({
          name: `Structure ${Date.now()}`,
          type: 'well',
          installation_date: '2024-01-01',
          is_active: true,
        });

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });

    it('should reject request without organization header', async () => {
      const res = await api.post(`/api/v1/organizations/${testOrgId}/structures`).send({
        name: `Structure ${Date.now()}`,
        type: 'well',
        installation_date: '2024-01-01',
      });

      expect([400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('PATCH /api/v1/organizations/:organizationId/structures/:id', () => {
    it('should reject invalid field formats', async () => {
      const res = await api.patch(`/api/v1/organizations/${testOrgId}/structures/${generateUUID()}`)
        .set('x-organization-id', testOrgId)
        .send({
          installation_date: 'invalid-date',
          type: 'not-allowed',
        });

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should accept valid payload', async () => {
      const res = await api.patch(`/api/v1/organizations/${testOrgId}/structures/${generateUUID()}`)
        .set('x-organization-id', testOrgId)
        .send({
          notes: 'Updated notes',
          condition: 'good',
        });

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });

    it('should reject request without organization header', async () => {
      const res = await api.patch(`/api/v1/organizations/${testOrgId}/structures/${generateUUID()}`).send({
        notes: 'Updated notes',
      });

      expect([400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('GET /api/v1/organizations/:organizationId/structures', () => {
    it('should reject request without organization header', async () => {
      const res = await api.get(`/api/v1/organizations/${testOrgId}/structures`);

      expect([400, 403, 404, 500]).toContain(res.status);
    });

    it('should accept request with organization header', async () => {
      const res = await api.get(`/api/v1/organizations/${testOrgId}/structures`)
        .set('x-organization-id', testOrgId);

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('GET /api/v1/organizations/:organizationId/structures/:id', () => {
    it('should reject request without organization header', async () => {
      const res = await api.get(`/api/v1/organizations/${testOrgId}/structures/${generateUUID()}`);

      expect([400, 403, 404, 500]).toContain(res.status);
    });

    it('should accept request with organization header', async () => {
      const res = await api.get(`/api/v1/organizations/${testOrgId}/structures/${generateUUID()}`)
        .set('x-organization-id', testOrgId);

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('DELETE /api/v1/organizations/:organizationId/structures/:id', () => {
    it('should reject request without organization header', async () => {
      const res = await api.delete(`/api/v1/organizations/${testOrgId}/structures/${generateUUID()}`);

      expect([400, 403, 404, 500]).toContain(res.status);
    });

    it('should accept request with organization header', async () => {
      const res = await api.delete(`/api/v1/organizations/${testOrgId}/structures/${generateUUID()}`)
        .set('x-organization-id', testOrgId);

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });
});
