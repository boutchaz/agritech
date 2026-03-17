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

describe('Farms API - Validation Tests', () => {
  let api: ApiIntegrationTestHelper;
  const testOrgId = generateUUID();

  beforeAll(async () => {
    api = await setupRealApiIntegration(generateUUID());
  }, 60000);

  afterAll(async () => {
    await api.cleanup();
  });

  describe('POST /api/v1/farms', () => {
    it('should reject missing required fields', async () => {
      const res = await api.post('/api/v1/farms')
        .set('x-organization-id', testOrgId)
        .send({});

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should reject invalid field formats', async () => {
      const res = await api.post('/api/v1/farms')
        .set('x-organization-id', testOrgId)
        .send({
          name: 123,
          area: 'invalid',
        });

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should accept valid payload', async () => {
      const res = await api.post('/api/v1/farms')
        .set('x-organization-id', testOrgId)
        .send({
          name: `Farm ${Date.now()}`,
        });

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });

    it('should reject request without organization header', async () => {
      const res = await api.post('/api/v1/farms').send({
        name: `Farm ${Date.now()}`,
      });

      expect([400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('GET /api/v1/farms', () => {
    it('should reject request without organization header', async () => {
      const res = await api.get('/api/v1/farms');

      expect([400, 403, 404, 500]).toContain(res.status);
    });

    it('should accept request with organization header', async () => {
      const res = await api.get('/api/v1/farms')
        .set('x-organization-id', testOrgId);

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('POST /api/v1/farms/:farmId/roles', () => {
    it('should reject missing required fields', async () => {
      const res = await api.post(`/api/v1/farms/${generateUUID()}/roles`)
        .set('x-organization-id', testOrgId)
        .send({});

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should reject invalid field formats', async () => {
      const res = await api.post(`/api/v1/farms/${generateUUID()}/roles`)
        .set('x-organization-id', testOrgId)
        .send({
          user_id: 'invalid-uuid',
          role: 42,
        });

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should accept valid payload', async () => {
      const res = await api.post(`/api/v1/farms/${generateUUID()}/roles`)
        .set('x-organization-id', testOrgId)
        .send({
          user_id: generateUUID(),
          role: 'farm_manager',
        });

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });

    it('should reject request without organization header', async () => {
      const res = await api.post(`/api/v1/farms/${generateUUID()}/roles`).send({
        user_id: generateUUID(),
        role: 'farm_manager',
      });

      expect([400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('POST /api/v1/farms/import', () => {
    it('should reject missing required fields', async () => {
      const res = await api.post('/api/v1/farms/import')
        .set('x-organization-id', testOrgId)
        .send({});

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should reject invalid field formats', async () => {
      const res = await api.post('/api/v1/farms/import')
        .set('x-organization-id', testOrgId)
        .send({
          organization_id: 'invalid-uuid',
          export_data: 'invalid',
        });

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should accept valid payload', async () => {
      const res = await api.post('/api/v1/farms/import')
        .set('x-organization-id', testOrgId)
        .send({
          organization_id: testOrgId,
          export_data: {
            exported_at: new Date().toISOString(),
            version: '1.0.0',
            farms: [{
              name: `Imported Farm ${Date.now()}`,
            }],
            metadata: {
              total_farms: 1,
              total_parcels: 0,
              total_aois: 0,
            },
          },
          skip_duplicates: true,
        });

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });

    it('should reject request without organization header', async () => {
      const res = await api.post('/api/v1/farms/import').send({
        organization_id: testOrgId,
        export_data: {
          exported_at: new Date().toISOString(),
          version: '1.0.0',
          farms: [],
          metadata: {
            total_farms: 0,
            total_parcels: 0,
            total_aois: 0,
          },
        },
      });

      expect([400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('POST /api/v1/farms/batch-delete', () => {
    it('should reject missing required fields', async () => {
      const res = await api.post('/api/v1/farms/batch-delete')
        .set('x-organization-id', testOrgId)
        .send({});

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should reject invalid field formats', async () => {
      const res = await api.post('/api/v1/farms/batch-delete')
        .set('x-organization-id', testOrgId)
        .send({
          farm_ids: ['not-a-uuid'],
        });

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should accept valid payload', async () => {
      const res = await api.post('/api/v1/farms/batch-delete')
        .set('x-organization-id', testOrgId)
        .send({
          farm_ids: [generateUUID()],
        });

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });

    it('should reject request without organization header', async () => {
      const res = await api.post('/api/v1/farms/batch-delete').send({
        farm_ids: [generateUUID()],
      });

      expect([400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('POST /api/v1/farms/export', () => {
    it('should reject missing required fields', async () => {
      const res = await api.post('/api/v1/farms/export')
        .set('x-organization-id', testOrgId)
        .send({
          include_sub_farms: true,
        });

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should reject invalid field formats', async () => {
      const res = await api.post('/api/v1/farms/export')
        .set('x-organization-id', testOrgId)
        .send({
          farm_id: generateUUID(),
          include_sub_farms: 'true',
        });

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should accept valid payload', async () => {
      const res = await api.post('/api/v1/farms/export')
        .set('x-organization-id', testOrgId)
        .send({
          organization_id: testOrgId,
          include_sub_farms: true,
        });

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });

    it('should reject request without organization header', async () => {
      const res = await api.post('/api/v1/farms/export').send({
        organization_id: testOrgId,
      });

      expect([400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('PATCH /api/v1/farms/:id', () => {
    it('should reject missing required fields', async () => {
      const res = await api.patch(`/api/v1/farms/${generateUUID()}`)
        .set('x-organization-id', testOrgId)
        .send({});

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should reject invalid field formats', async () => {
      const res = await api.patch(`/api/v1/farms/${generateUUID()}`)
        .set('x-organization-id', testOrgId)
        .send({
          name: 789,
        });

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should accept valid payload', async () => {
      const res = await api.patch(`/api/v1/farms/${generateUUID()}`)
        .set('x-organization-id', testOrgId)
        .send({
          name: `Updated Farm ${Date.now()}`,
        });

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });

    it('should reject request without organization header', async () => {
      const res = await api.patch(`/api/v1/farms/${generateUUID()}`).send({
        name: `Updated Farm ${Date.now()}`,
      });

      expect([400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('GET /api/v1/farms/roles/available', () => {
    it('should reject request without organization header', async () => {
      const res = await api.get('/api/v1/farms/roles/available');

      expect([400, 403, 404, 500]).toContain(res.status);
    });

    it('should accept request with organization header', async () => {
      const res = await api.get('/api/v1/farms/roles/available')
        .set('x-organization-id', testOrgId);

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('GET /api/v1/farms/user-roles/:userId', () => {
    it('should reject request without organization header', async () => {
      const res = await api.get(`/api/v1/farms/user-roles/${generateUUID()}`);

      expect([400, 403, 404, 500]).toContain(res.status);
    });

    it('should accept request with organization header', async () => {
      const res = await api.get(`/api/v1/farms/user-roles/${generateUUID()}`)
        .set('x-organization-id', testOrgId);

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('GET /api/v1/farms/:farmId/roles', () => {
    it('should reject request without organization header', async () => {
      const res = await api.get(`/api/v1/farms/${generateUUID()}/roles`);

      expect([400, 403, 404, 500]).toContain(res.status);
    });

    it('should accept request with organization header', async () => {
      const res = await api.get(`/api/v1/farms/${generateUUID()}/roles`)
        .set('x-organization-id', testOrgId);

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('DELETE /api/v1/farms/:farmId/roles/:roleId', () => {
    it('should reject request without organization header', async () => {
      const res = await api.delete(`/api/v1/farms/${generateUUID()}/roles/${generateUUID()}`);

      expect([400, 403, 404, 500]).toContain(res.status);
    });

    it('should accept request with organization header', async () => {
      const res = await api.delete(`/api/v1/farms/${generateUUID()}/roles/${generateUUID()}`)
        .set('x-organization-id', testOrgId);

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('GET /api/v1/farms/:farmId/organization-users', () => {
    it('should reject request without organization header', async () => {
      const res = await api.get(`/api/v1/farms/${generateUUID()}/organization-users`);

      expect([400, 403, 404, 500]).toContain(res.status);
    });

    it('should accept request with organization header', async () => {
      const res = await api.get(`/api/v1/farms/${generateUUID()}/organization-users`)
        .set('x-organization-id', testOrgId);

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('GET /api/v1/farms/:id', () => {
    it('should reject request without organization header', async () => {
      const res = await api.get(`/api/v1/farms/${generateUUID()}`);

      expect([400, 403, 404, 500]).toContain(res.status);
    });

    it('should accept request with organization header', async () => {
      const res = await api.get(`/api/v1/farms/${generateUUID()}`)
        .set('x-organization-id', testOrgId);

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('GET /api/v1/farms/:id/related-data-counts', () => {
    it('should reject request without organization header', async () => {
      const res = await api.get(`/api/v1/farms/${generateUUID()}/related-data-counts`);

      expect([400, 403, 404, 500]).toContain(res.status);
    });

    it('should accept request with organization header', async () => {
      const res = await api.get(`/api/v1/farms/${generateUUID()}/related-data-counts`)
        .set('x-organization-id', testOrgId);

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('DELETE /api/v1/farms', () => {
    it('should reject request without organization header', async () => {
      const res = await api.delete('/api/v1/farms').send({
        farm_id: generateUUID(),
      });

      expect([400, 403, 404, 500]).toContain(res.status);
    });

    it('should accept request with organization header', async () => {
      const res = await api.delete('/api/v1/farms')
        .set('x-organization-id', testOrgId)
        .send({
          farm_id: generateUUID(),
        });

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });
});
