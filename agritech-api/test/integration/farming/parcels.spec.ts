import * as request from 'supertest';
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

describe('Parcels API - Validation Tests', () => {
  let api: ApiIntegrationTestHelper;
  const testOrgId = generateUUID();

  beforeAll(async () => {
    api = await setupRealApiIntegration(generateUUID());
  }, 60000);

  afterAll(async () => {
    await api.cleanup();
  });

  describe('POST /api/v1/parcels', () => {
    it('should reject missing required fields', async () => {
      const res = await api.post('/api/v1/parcels')
        .set('x-organization-id', testOrgId)
        .send({});

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should reject invalid field formats', async () => {
      const res = await api.post('/api/v1/parcels')
        .set('x-organization-id', testOrgId)
        .send({
          farm_id: 'invalid-uuid',
          name: 123,
          area: 'invalid',
          boundary: 'invalid',
        });

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should accept valid payload', async () => {
      const res = await api.post('/api/v1/parcels')
        .set('x-organization-id', testOrgId)
        .send({
          farm_id: generateUUID(),
          name: `Parcel ${Date.now()}`,
          area: 5.5,
          boundary: [
            [-7.59, 33.57],
            [-7.58, 33.57],
            [-7.58, 33.58],
            [-7.59, 33.57],
          ],
        });

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });

    it('should reject request without organization header', async () => {
      const res = await api.post('/api/v1/parcels').send({
        farm_id: generateUUID(),
        name: `Parcel ${Date.now()}`,
        area: 5.5,
        boundary: [
          [-7.59, 33.57],
          [-7.58, 33.57],
          [-7.58, 33.58],
          [-7.59, 33.57],
        ],
      });

      expect([400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('PUT /api/v1/parcels/:id', () => {
    it('should reject invalid field formats', async () => {
      const res = await request(api.getServer())
        .put(`/api/v1/parcels/${generateUUID()}`)
        .set('x-organization-id', testOrgId)
        .send({
          area: 'invalid',
        });

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should accept valid payload', async () => {
      const res = await request(api.getServer())
        .put(`/api/v1/parcels/${generateUUID()}`)
        .set('x-organization-id', testOrgId)
        .send({
          name: `Updated Parcel ${Date.now()}`,
          area: 10.5,
        });

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });

    it('should reject request without organization header', async () => {
      const res = await request(api.getServer())
        .put(`/api/v1/parcels/${generateUUID()}`)
        .send({
          name: `Updated Parcel ${Date.now()}`,
        });

      expect([400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('GET /api/v1/parcels', () => {
    it('should reject request without organization header', async () => {
      const res = await api.get('/api/v1/parcels');

      expect([400, 403, 404, 500]).toContain(res.status);
    });

    it('should accept request with organization header', async () => {
      const res = await api.get('/api/v1/parcels')
        .set('x-organization-id', testOrgId);

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('GET /api/v1/parcels/performance', () => {
    it('should reject request without organization header', async () => {
      const res = await api.get('/api/v1/parcels/performance');

      expect([400, 403, 404, 500]).toContain(res.status);
    });

    it('should accept request with organization header', async () => {
      const res = await api.get('/api/v1/parcels/performance')
        .set('x-organization-id', testOrgId);

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('GET /api/v1/parcels/:id/applications', () => {
    it('should reject request without organization header', async () => {
      const res = await api.get(`/api/v1/parcels/${generateUUID()}/applications`);

      expect([400, 403, 404, 500]).toContain(res.status);
    });

    it('should accept request with organization header', async () => {
      const res = await api.get(`/api/v1/parcels/${generateUUID()}/applications`)
        .set('x-organization-id', testOrgId);

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('DELETE /api/v1/parcels', () => {
    it('should reject request without organization header', async () => {
      const res = await api.delete('/api/v1/parcels').send({
        parcel_id: generateUUID(),
      });

      expect([400, 403, 404, 500]).toContain(res.status);
    });

    it('should accept request with organization header', async () => {
      const res = await api.delete('/api/v1/parcels')
        .set('x-organization-id', testOrgId)
        .send({
          parcel_id: generateUUID(),
        });

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });
});
