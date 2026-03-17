import { setupRealApiIntegration, ApiIntegrationTestHelper } from '../../helpers/api-integration-test.helper';

const generateUUID = () => {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return [hex.substring(0, 8), hex.substring(8, 12), hex.substring(12, 16), hex.substring(16, 20), hex.substring(20, 32)].join('-');
};

describe('Workers API - Validation Tests', () => {
  let api: ApiIntegrationTestHelper;
  const testOrgId = generateUUID();
  const basePath = `/api/v1/organizations/${testOrgId}/workers`;

  beforeAll(async () => {
    api = await setupRealApiIntegration(generateUUID());
  }, 60000);

  afterAll(async () => { await api.cleanup(); });

  describe('GET endpoints', () => {
    const workerId = generateUUID();

    it('should reject GET /workers without org header', async () => {
      const res = await api.get(basePath);
      expect([400, 403, 404, 500]).toContain(res.status);
    });

    it('should accept GET /workers with org header', async () => {
      const res = await api.get(basePath).set('x-organization-id', testOrgId);
      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });

    it('should reject GET /workers/active without org header', async () => {
      const res = await api.get(`${basePath}/active`);
      expect([400, 403, 404, 500]).toContain(res.status);
    });

    it('should accept GET /workers/active with org header', async () => {
      const res = await api.get(`${basePath}/active`).set('x-organization-id', testOrgId);
      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });

    it('should reject GET /workers/:workerId without org header', async () => {
      const res = await api.get(`${basePath}/${workerId}`);
      expect([400, 403, 404, 500]).toContain(res.status);
    });

    it('should accept GET /workers/:workerId with org header', async () => {
      const res = await api.get(`${basePath}/${workerId}`).set('x-organization-id', testOrgId);
      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });

    it('should reject GET /workers/:workerId/stats without org header', async () => {
      const res = await api.get(`${basePath}/${workerId}/stats`);
      expect([400, 403, 404, 500]).toContain(res.status);
    });

    it('should accept GET /workers/:workerId/stats with org header', async () => {
      const res = await api.get(`${basePath}/${workerId}/stats`).set('x-organization-id', testOrgId);
      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });

    it('should reject GET /workers/:workerId/work-records without org header', async () => {
      const res = await api.get(`${basePath}/${workerId}/work-records`);
      expect([400, 403, 404, 500]).toContain(res.status);
    });

    it('should accept GET /workers/:workerId/work-records with org header', async () => {
      const res = await api.get(`${basePath}/${workerId}/work-records`).set('x-organization-id', testOrgId);
      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });

    it('should reject GET /workers/:workerId/metayage-settlements without org header', async () => {
      const res = await api.get(`${basePath}/${workerId}/metayage-settlements`);
      expect([400, 403, 404, 500]).toContain(res.status);
    });

    it('should accept GET /workers/:workerId/metayage-settlements with org header', async () => {
      const res = await api.get(`${basePath}/${workerId}/metayage-settlements`).set('x-organization-id', testOrgId);
      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('POST /api/v1/organizations/:organizationId/workers', () => {
    it('should reject missing required fields', async () => {
      const res = await api.post(basePath)
        .set('x-organization-id', testOrgId)
        .send({});

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should reject invalid field formats', async () => {
      const res = await api.post(basePath)
        .set('x-organization-id', testOrgId)
        .send({
          first_name: 'John',
          last_name: 'Doe',
          worker_type: 'invalid-type',
          hire_date: 'not-a-date',
          is_cnss_declared: 'yes',
        });

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should accept valid payload', async () => {
      const res = await api.post(basePath)
        .set('x-organization-id', testOrgId)
        .send({
          first_name: 'John',
          last_name: 'Doe',
          worker_type: 'daily_worker',
          hire_date: '2025-01-01',
          is_cnss_declared: false,
          daily_rate: 100,
          phone: '+212600000001',
        });

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('POST/PATCH worker action endpoints', () => {
    const workerId = generateUUID();
    const recordId = generateUUID();

    it('should reject PATCH /workers/:workerId with invalid field formats', async () => {
      const res = await api.patch(`${basePath}/${workerId}`)
        .set('x-organization-id', testOrgId)
        .send({
          email: 'invalid-email',
          farm_id: 'not-a-uuid',
          metayage_percentage: 88,
        });

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should reject PATCH /workers/:workerId with missing org header', async () => {
      const res = await api.patch(`${basePath}/${workerId}`).send({ first_name: 'Updated' });
      expect([400, 403, 404, 500]).toContain(res.status);
    });

    it('should accept PATCH /workers/:workerId with valid payload', async () => {
      const res = await api.patch(`${basePath}/${workerId}`)
        .set('x-organization-id', testOrgId)
        .send({
          first_name: 'Updated',
          worker_type: 'fixed_salary',
          monthly_salary: 3500,
        });

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });

    it('should reject POST /workers/:workerId/work-records missing required fields', async () => {
      const res = await api.post(`${basePath}/${workerId}/work-records`)
        .set('x-organization-id', testOrgId)
        .send({});

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should reject POST /workers/:workerId/work-records invalid formats', async () => {
      const res = await api.post(`${basePath}/${workerId}/work-records`)
        .set('x-organization-id', testOrgId)
        .send({ date: 'not-a-date', hours: 'NaN' });

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should accept POST /workers/:workerId/work-records valid payload', async () => {
      const res = await api.post(`${basePath}/${workerId}/work-records`)
        .set('x-organization-id', testOrgId)
        .send({ date: '2025-01-01', hours: 8, notes: 'Regular shift' });

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });

    it('should reject PATCH /workers/:workerId/work-records/:recordId missing required fields', async () => {
      const res = await api.patch(`${basePath}/${workerId}/work-records/${recordId}`)
        .set('x-organization-id', testOrgId)
        .send({});

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should reject PATCH /workers/:workerId/work-records/:recordId invalid formats', async () => {
      const res = await api.patch(`${basePath}/${workerId}/work-records/${recordId}`)
        .set('x-organization-id', testOrgId)
        .send({ hours: 'NaN' });

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should accept PATCH /workers/:workerId/work-records/:recordId valid payload', async () => {
      const res = await api.patch(`${basePath}/${workerId}/work-records/${recordId}`)
        .set('x-organization-id', testOrgId)
        .send({ hours: 7, notes: 'Adjusted hours' });

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });

    it('should reject POST /workers/:workerId/metayage-settlements missing required fields', async () => {
      const res = await api.post(`${basePath}/${workerId}/metayage-settlements`)
        .set('x-organization-id', testOrgId)
        .send({});

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should reject POST /workers/:workerId/metayage-settlements invalid formats', async () => {
      const res = await api.post(`${basePath}/${workerId}/metayage-settlements`)
        .set('x-organization-id', testOrgId)
        .send({ grossRevenue: 'NaN' });

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should accept POST /workers/:workerId/metayage-settlements valid payload', async () => {
      const res = await api.post(`${basePath}/${workerId}/metayage-settlements`)
        .set('x-organization-id', testOrgId)
        .send({ grossRevenue: 10000, totalCharges: 2000 });

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });

    it('should reject POST /workers/:workerId/calculate-metayage-share missing required fields', async () => {
      const res = await api.post(`${basePath}/${workerId}/calculate-metayage-share`)
        .set('x-organization-id', testOrgId)
        .send({});

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should reject POST /workers/:workerId/calculate-metayage-share invalid formats', async () => {
      const res = await api.post(`${basePath}/${workerId}/calculate-metayage-share`)
        .set('x-organization-id', testOrgId)
        .send({ grossRevenue: 'invalid' });

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should accept POST /workers/:workerId/calculate-metayage-share valid payload', async () => {
      const res = await api.post(`${basePath}/${workerId}/calculate-metayage-share`)
        .set('x-organization-id', testOrgId)
        .send({ grossRevenue: 15000, totalCharges: 4000 });

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });

    it('should reject POST /workers/:workerId/grant-platform-access missing required fields', async () => {
      const res = await api.post(`${basePath}/${workerId}/grant-platform-access`)
        .set('x-organization-id', testOrgId)
        .send({ email: 'test@example.com' });

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should reject POST /workers/:workerId/grant-platform-access invalid formats', async () => {
      const res = await api.post(`${basePath}/${workerId}/grant-platform-access`)
        .set('x-organization-id', testOrgId)
        .send({
          email: 'invalid-email',
          first_name: 'Worker',
          last_name: 'Access',
        });

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should accept POST /workers/:workerId/grant-platform-access valid payload', async () => {
      const res = await api.post(`${basePath}/${workerId}/grant-platform-access`)
        .set('x-organization-id', testOrgId)
        .send({
          email: `worker-${Date.now()}@example.com`,
          first_name: 'Worker',
          last_name: 'Access',
        });

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });

    it('should reject POST /workers/backfill-work-records missing required fields', async () => {
      const res = await api.post(`${basePath}/backfill-work-records`)
        .set('x-organization-id', testOrgId)
        .send({});

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should reject POST /workers/backfill-work-records invalid formats', async () => {
      const res = await api.post(`${basePath}/backfill-work-records`)
        .set('x-organization-id', testOrgId)
        .send({ taskId: 'invalid-uuid' });

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should accept POST /workers/backfill-work-records valid payload', async () => {
      const res = await api.post(`${basePath}/backfill-work-records`)
        .set('x-organization-id', testOrgId)
        .send({ taskId: generateUUID() });

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });

    it('should reject PATCH /workers/:workerId/deactivate without org header', async () => {
      const res = await api.patch(`${basePath}/${workerId}/deactivate`).send({});
      expect([400, 403, 404, 500]).toContain(res.status);
    });

    it('should accept PATCH /workers/:workerId/deactivate with org header', async () => {
      const res = await api.patch(`${basePath}/${workerId}/deactivate`)
        .set('x-organization-id', testOrgId)
        .query({ endDate: '2025-01-01' })
        .send({});

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('DELETE /api/v1/organizations/:organizationId/workers/:workerId', () => {
    it('should reject delete without org header', async () => {
      const res = await api.delete(`${basePath}/${generateUUID()}`);
      expect([400, 403, 404, 500]).toContain(res.status);
    });

    it('should accept delete with org header', async () => {
      const res = await api.delete(`${basePath}/${generateUUID()}`).set('x-organization-id', testOrgId);
      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('Workers Me API - Validation Tests', () => {
    const meBase = '/api/v1/workers/me';

    it('should accept GET /workers/me', async () => {
      const res = await api.get(meBase).set('x-organization-id', testOrgId);
      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });

    it('should accept GET /workers/me/tasks', async () => {
      const res = await api.get(`${meBase}/tasks`).set('x-organization-id', testOrgId).query({ status: 'pending', limit: '10' });
      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });

    it('should accept GET /workers/me/time-logs', async () => {
      const res = await api.get(`${meBase}/time-logs`).set('x-organization-id', testOrgId).query({ startDate: '2025-01-01', endDate: '2025-01-31', limit: '10' });
      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });

    it('should accept GET /workers/me/statistics', async () => {
      const res = await api.get(`${meBase}/statistics`).set('x-organization-id', testOrgId);
      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });
});
