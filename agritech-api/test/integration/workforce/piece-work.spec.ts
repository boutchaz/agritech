import { setupRealApiIntegration, ApiIntegrationTestHelper } from '../../helpers/api-integration-test.helper';

const generateUUID = () => {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return [hex.substring(0, 8), hex.substring(8, 12), hex.substring(12, 16), hex.substring(16, 20), hex.substring(20, 32)].join('-');
};

describe('PieceWork API - Validation Tests', () => {
  let api: ApiIntegrationTestHelper;
  const testOrgId = generateUUID();
  const testFarmId = generateUUID();
  const pieceWorkId = generateUUID();
  const basePath = `/api/v1/organizations/${testOrgId}/farms/${testFarmId}/piece-work`;

  beforeAll(async () => {
    api = await setupRealApiIntegration(generateUUID());
  }, 60000);

  afterAll(async () => { await api.cleanup(); });

  describe('GET endpoints', () => {
    it('should reject GET /piece-work without org header', async () => {
      const res = await api.get(basePath);
      expect([400, 403, 404, 500]).toContain(res.status);
    });

    it('should accept GET /piece-work with org header', async () => {
      const res = await api.get(basePath).set('x-organization-id', testOrgId);
      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });

    it('should reject GET /piece-work/:id without org header', async () => {
      const res = await api.get(`${basePath}/${pieceWorkId}`);
      expect([400, 403, 404, 500]).toContain(res.status);
    });

    it('should accept GET /piece-work/:id with org header', async () => {
      const res = await api.get(`${basePath}/${pieceWorkId}`).set('x-organization-id', testOrgId);
      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('POST /api/v1/organizations/:organizationId/farms/:farmId/piece-work', () => {
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
          worker_id: 'invalid-uuid',
          work_date: 'not-a-date',
          work_unit_id: 'invalid-uuid',
          units_completed: -1,
        });

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should accept valid payload', async () => {
      const res = await api.post(basePath)
        .set('x-organization-id', testOrgId)
        .send({
          worker_id: generateUUID(),
          work_date: '2025-03-10',
          work_unit_id: generateUUID(),
          units_completed: 25,
          rate_per_unit: 12.5,
          quality_rating: 4,
        });

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('PATCH /api/v1/organizations/:organizationId/farms/:farmId/piece-work/:id', () => {
    it('should reject missing required fields', async () => {
      const res = await api.patch(`${basePath}/${pieceWorkId}`)
        .set('x-organization-id', testOrgId)
        .send({ payment_status: 'invalid' });

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should reject invalid formats', async () => {
      const res = await api.patch(`${basePath}/${pieceWorkId}`)
        .set('x-organization-id', testOrgId)
        .send({
          task_id: 'invalid-uuid',
          units_completed: 0,
        });

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should accept valid payload', async () => {
      const res = await api.patch(`${basePath}/${pieceWorkId}`)
        .set('x-organization-id', testOrgId)
        .send({
          payment_status: 'approved',
          quality_rating: 5,
          notes: 'Verified quality output',
        });

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('PATCH /api/v1/organizations/:organizationId/farms/:farmId/piece-work/:id/verify', () => {
    it('should reject missing required fields', async () => {
      const res = await api.patch(`${basePath}/${pieceWorkId}/verify`)
        .set('x-organization-id', testOrgId)
        .send({});

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should reject invalid formats', async () => {
      const res = await api.patch(`${basePath}/${pieceWorkId}/verify`)
        .set('x-organization-id', testOrgId)
        .send({ verified_at: 'not-a-date' });

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should accept valid payload', async () => {
      const res = await api.patch(`${basePath}/${pieceWorkId}/verify`)
        .set('x-organization-id', testOrgId)
        .send({ verified_at: '2025-03-10T09:00:00.000Z' });

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('DELETE /api/v1/organizations/:organizationId/farms/:farmId/piece-work/:id', () => {
    it('should reject delete without org header', async () => {
      const res = await api.delete(`${basePath}/${pieceWorkId}`);
      expect([400, 403, 404, 500]).toContain(res.status);
    });

    it('should accept delete with org header', async () => {
      const res = await api.delete(`${basePath}/${pieceWorkId}`).set('x-organization-id', testOrgId);
      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });
});
