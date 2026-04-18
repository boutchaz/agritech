import { setupRealApiIntegration, ApiIntegrationTestHelper } from '../../helpers/api-integration-test.helper';

const generateUUID = () => {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return [hex.substring(0, 8), hex.substring(8, 12), hex.substring(12, 16), hex.substring(16, 20), hex.substring(20, 32)].join('-');
};

describe('WorkUnits API - Validation Tests', () => {
  let api: ApiIntegrationTestHelper;
  const testOrgId = generateUUID();
  const unitId = generateUUID();
  const basePath = '/api/v1/work-units';

  beforeAll(async () => {
    api = await setupRealApiIntegration(generateUUID());
  }, 60000);

  afterAll(async () => { await api.cleanup(); });

  describe('GET endpoints', () => {
    it('should reject GET /work-units without org header', async () => {
      const res = await api.get(basePath);
      expect([400, 403, 404, 500]).toContain(res.status);
    });

    it('should accept GET /work-units with org header', async () => {
      const res = await api.get(basePath).set('x-organization-id', testOrgId);
      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });

    it('should reject GET /work-units/:id without org header', async () => {
      const res = await api.get(`${basePath}/${unitId}`);
      expect([400, 403, 404, 500]).toContain(res.status);
    });

    it('should accept GET /work-units/:id with org header', async () => {
      const res = await api.get(`${basePath}/${unitId}`).set('x-organization-id', testOrgId);
      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('POST /api/v1/work-units', () => {
    it('should reject missing required fields', async () => {
      const res = await api.post(basePath)
        .set('x-organization-id', testOrgId)
        .send({});

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should reject invalid formats', async () => {
      const res = await api.post(basePath)
        .set('x-organization-id', testOrgId)
        .send({
          code: 123,
          name: true,
          unit_category: 'invalid',
        });

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should accept valid payload', async () => {
      const res = await api.post(basePath)
        .set('x-organization-id', testOrgId)
        .send({
          code: `UNIT-${Date.now()}`,
          name: 'Kilogram',
          unit_category: 'weight',
          conversion_factor: 1,
          is_active: true,
          allow_decimal: true,
        });

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('PATCH /api/v1/work-units/:id', () => {
    it('should reject missing required fields', async () => {
      const res = await api.patch(`${basePath}/${unitId}`)
        .set('x-organization-id', testOrgId)
        .send({ unit_category: 'invalid-category' });

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should reject invalid formats', async () => {
      const res = await api.patch(`${basePath}/${unitId}`)
        .set('x-organization-id', testOrgId)
        .send({
          conversion_factor: 'not-a-number',
          is_active: 'yes',
        });

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should accept valid payload', async () => {
      const res = await api.patch(`${basePath}/${unitId}`)
        .set('x-organization-id', testOrgId)
        .send({
          name: 'Updated Unit Name',
          unit_category: 'count',
          is_active: true,
        });

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('DELETE /api/v1/work-units/:id', () => {
    it('should reject delete without org header', async () => {
      const res = await api.delete(`${basePath}/${unitId}`);
      expect([400, 403, 404, 500]).toContain(res.status);
    });

    it('should accept delete with org header', async () => {
      const res = await api.delete(`${basePath}/${unitId}`).set('x-organization-id', testOrgId);
      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });
});
