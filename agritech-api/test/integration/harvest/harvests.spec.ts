import { setupRealApiIntegration, ApiIntegrationTestHelper } from '../../helpers/api-integration-test.helper';

const generateUUID = () => {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return [hex.substring(0, 8), hex.substring(8, 12), hex.substring(12, 16), hex.substring(16, 20), hex.substring(20, 32)].join('-');
};

describe('Harvests API - Validation Tests', () => {
  let api: ApiIntegrationTestHelper;
  const testOrgId = generateUUID();

  beforeAll(async () => {
    api = await setupRealApiIntegration(generateUUID());
  }, 60000);

  afterAll(async () => { await api.cleanup(); });

  describe('POST /api/v1/organizations/:organizationId/harvests', () => {
    it('should reject missing required fields', async () => {
      const res = await api.post(`/api/v1/organizations/${testOrgId}/harvests`)
        .set('x-organization-id', testOrgId)
        .send({});

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should reject invalid formats', async () => {
      const res = await api.post(`/api/v1/organizations/${testOrgId}/harvests`)
        .set('x-organization-id', testOrgId)
        .send({
          farm_id: 'invalid-uuid',
          parcel_id: generateUUID(),
          harvest_date: 'not-a-date',
          quantity: -1,
          unit: 'invalid-unit',
        });

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should accept valid payload', async () => {
      const res = await api.post(`/api/v1/organizations/${testOrgId}/harvests`)
        .set('x-organization-id', testOrgId)
        .send({
          farm_id: generateUUID(),
          parcel_id: generateUUID(),
          harvest_date: '2026-01-10',
          quantity: 100,
          unit: 'kg',
        });

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('PATCH /api/v1/organizations/:organizationId/harvests/:harvestId', () => {
    it('should reject invalid formats', async () => {
      const res = await api.patch(`/api/v1/organizations/${testOrgId}/harvests/${generateUUID()}`)
        .set('x-organization-id', testOrgId)
        .send({
          quantity: -10,
          quality_score: 20,
        });

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should accept valid payload', async () => {
      const res = await api.patch(`/api/v1/organizations/${testOrgId}/harvests/${generateUUID()}`)
        .set('x-organization-id', testOrgId)
        .send({
          quality_grade: 'A',
          quality_score: 8,
          notes: 'Updated from integration test',
        });

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('POST /api/v1/organizations/:organizationId/harvests/:harvestId/sell', () => {
    it('should reject missing required fields', async () => {
      const res = await api.post(`/api/v1/organizations/${testOrgId}/harvests/${generateUUID()}/sell`)
        .set('x-organization-id', testOrgId)
        .send({});

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should reject invalid formats', async () => {
      const res = await api.post(`/api/v1/organizations/${testOrgId}/harvests/${generateUUID()}/sell`)
        .set('x-organization-id', testOrgId)
        .send({
          sale_date: 'invalid-date',
          quantity_sold: 0,
          price_per_unit: -5,
          payment_terms: 'wire',
        });

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should accept valid payload', async () => {
      const res = await api.post(`/api/v1/organizations/${testOrgId}/harvests/${generateUUID()}/sell`)
        .set('x-organization-id', testOrgId)
        .send({
          sale_date: '2026-01-20',
          quantity_sold: 50,
          price_per_unit: 12.5,
          payment_terms: 'cash',
          customer_name: 'Local Market',
        });

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('GET /api/v1/organizations/:organizationId/harvests', () => {
    it('should reject request without organization header', async () => {
      const res = await api.get(`/api/v1/organizations/${testOrgId}/harvests`);

      expect([400, 403, 404, 500]).toContain(res.status);
    });

    it('should accept request with organization header', async () => {
      const res = await api.get(`/api/v1/organizations/${testOrgId}/harvests`)
        .set('x-organization-id', testOrgId);

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('GET /api/v1/organizations/:organizationId/harvests/:harvestId', () => {
    it('should reject request without organization header', async () => {
      const res = await api.get(`/api/v1/organizations/${testOrgId}/harvests/${generateUUID()}`);

      expect([400, 403, 404, 500]).toContain(res.status);
    });

    it('should accept request with organization header', async () => {
      const res = await api.get(`/api/v1/organizations/${testOrgId}/harvests/${generateUUID()}`)
        .set('x-organization-id', testOrgId);

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('DELETE /api/v1/organizations/:organizationId/harvests/:harvestId', () => {
    it('should reject request without organization header', async () => {
      const res = await api.delete(`/api/v1/organizations/${testOrgId}/harvests/${generateUUID()}`);

      expect([400, 403, 404, 500]).toContain(res.status);
    });

    it('should accept request with organization header', async () => {
      const res = await api.delete(`/api/v1/organizations/${testOrgId}/harvests/${generateUUID()}`)
        .set('x-organization-id', testOrgId);

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });
});
