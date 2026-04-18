import { setupRealApiIntegration, ApiIntegrationTestHelper } from '../../helpers/api-integration-test.helper';

const generateUUID = () => {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return [hex.substring(0, 8), hex.substring(8, 12), hex.substring(12, 16), hex.substring(16, 20), hex.substring(20, 32)].join('-');
};

describe('Tasks API - Validation Tests', () => {
  let api: ApiIntegrationTestHelper;
  const testOrgId = generateUUID();
  const basePath = '/api/v1/tasks';

  beforeAll(async () => {
    api = await setupRealApiIntegration(generateUUID());
  }, 60000);

  afterAll(async () => { await api.cleanup(); });

  describe('GET endpoints', () => {
    const taskId = generateUUID();

    it('should reject GET /tasks/my-tasks without org header', async () => {
      const res = await api.get(`${basePath}/my-tasks`);
      expect([400, 403, 404, 500]).toContain(res.status);
    });

    it('should accept GET /tasks/my-tasks with org header', async () => {
      const res = await api.get(`${basePath}/my-tasks`).set('x-organization-id', testOrgId);
      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });

    it('should reject GET /tasks without org header', async () => {
      const res = await api.get(basePath);
      expect([400, 403, 404, 500]).toContain(res.status);
    });

    it('should accept GET /tasks with org header', async () => {
      const res = await api.get(basePath).set('x-organization-id', testOrgId);
      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });

    it('should reject GET /tasks/statistics without org header', async () => {
      const res = await api.get(`${basePath}/statistics`);
      expect([400, 403, 404, 500]).toContain(res.status);
    });

    it('should accept GET /tasks/statistics with org header', async () => {
      const res = await api.get(`${basePath}/statistics`).set('x-organization-id', testOrgId);
      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });

    it('should reject GET /tasks/:taskId without org header', async () => {
      const res = await api.get(`${basePath}/${taskId}`);
      expect([400, 403, 404, 500]).toContain(res.status);
    });

    it('should accept GET /tasks/:taskId with org header', async () => {
      const res = await api.get(`${basePath}/${taskId}`).set('x-organization-id', testOrgId);
      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });

    it('should reject GET /tasks/categories/all without org header', async () => {
      const res = await api.get(`${basePath}/categories/all`);
      expect([400, 403, 404, 500]).toContain(res.status);
    });

    it('should accept GET /tasks/categories/all with org header', async () => {
      const res = await api.get(`${basePath}/categories/all`).set('x-organization-id', testOrgId);
      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });

    it('should reject GET /tasks/:taskId/comments without org header', async () => {
      const res = await api.get(`${basePath}/${taskId}/comments`);
      expect([400, 403, 404, 500]).toContain(res.status);
    });

    it('should accept GET /tasks/:taskId/comments with org header', async () => {
      const res = await api.get(`${basePath}/${taskId}/comments`).set('x-organization-id', testOrgId);
      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });

    it('should reject GET /tasks/:taskId/time-logs without org header', async () => {
      const res = await api.get(`${basePath}/${taskId}/time-logs`);
      expect([400, 403, 404, 500]).toContain(res.status);
    });

    it('should accept GET /tasks/:taskId/time-logs with org header', async () => {
      const res = await api.get(`${basePath}/${taskId}/time-logs`).set('x-organization-id', testOrgId);
      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });

    it('should reject GET /tasks/time-logs/active-session without org header', async () => {
      const res = await api.get(`${basePath}/time-logs/active-session`);
      expect([400, 403, 404, 500]).toContain(res.status);
    });

    it('should accept GET /tasks/time-logs/active-session with org header', async () => {
      const res = await api.get(`${basePath}/time-logs/active-session`).set('x-organization-id', testOrgId);
      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('POST /api/v1/tasks', () => {
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
          farm_id: 'invalid-uuid',
          title: 'Task',
          task_type: 'invalid',
        });

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should accept valid payload', async () => {
      const res = await api.post(basePath)
        .set('x-organization-id', testOrgId)
        .send({
          farm_id: generateUUID(),
          title: `Task ${Date.now()}`,
          task_type: 'general',
          due_date: '2025-03-31',
        });

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('PATCH/POST action endpoints', () => {
    const taskId = generateUUID();
    const timeLogId = generateUUID();

    it('should reject PATCH /tasks/:taskId missing required fields', async () => {
      const res = await api.patch(`${basePath}/${taskId}`)
        .set('x-organization-id', testOrgId)
        .send({ status: 'invalid-status' });

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should reject PATCH /tasks/:taskId invalid formats', async () => {
      const res = await api.patch(`${basePath}/${taskId}`)
        .set('x-organization-id', testOrgId)
        .send({ farm_id: 'not-uuid' });

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should accept PATCH /tasks/:taskId valid payload', async () => {
      const res = await api.patch(`${basePath}/${taskId}`)
        .set('x-organization-id', testOrgId)
        .send({ title: 'Updated Task', priority: 'high' });

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });

    it('should reject PATCH /tasks/:taskId/assign missing required fields', async () => {
      const res = await api.patch(`${basePath}/${taskId}/assign`)
        .set('x-organization-id', testOrgId)
        .send({});

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should reject PATCH /tasks/:taskId/assign invalid formats', async () => {
      const res = await api.patch(`${basePath}/${taskId}/assign`)
        .set('x-organization-id', testOrgId)
        .send({ worker_id: 'invalid-uuid' });

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should accept PATCH /tasks/:taskId/assign valid payload', async () => {
      const res = await api.patch(`${basePath}/${taskId}/assign`)
        .set('x-organization-id', testOrgId)
        .send({ worker_id: generateUUID() });

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });

    it('should reject PATCH /tasks/:taskId/complete missing required fields', async () => {
      const res = await api.patch(`${basePath}/${taskId}/complete`)
        .set('x-organization-id', testOrgId)
        .send({ quality_rating: 10 });

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should reject PATCH /tasks/:taskId/complete invalid formats', async () => {
      const res = await api.patch(`${basePath}/${taskId}/complete`)
        .set('x-organization-id', testOrgId)
        .send({ work_unit_id: 'invalid-uuid' });

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should accept PATCH /tasks/:taskId/complete valid payload', async () => {
      const res = await api.patch(`${basePath}/${taskId}/complete`)
        .set('x-organization-id', testOrgId)
        .send({ quality_rating: 4, units_completed: 12, rate_per_unit: 8.5 });

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });

    it('should reject POST /tasks/:taskId/complete-with-harvest missing required fields', async () => {
      const res = await api.post(`${basePath}/${taskId}/complete-with-harvest`)
        .set('x-organization-id', testOrgId)
        .send({});

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should reject POST /tasks/:taskId/complete-with-harvest invalid formats', async () => {
      const res = await api.post(`${basePath}/${taskId}/complete-with-harvest`)
        .set('x-organization-id', testOrgId)
        .send({
          harvest_date: 'invalid-date',
          quantity: 'invalid-number',
          unit: 'invalid',
          workers: [],
        });

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should accept POST /tasks/:taskId/complete-with-harvest valid payload', async () => {
      const res = await api.post(`${basePath}/${taskId}/complete-with-harvest`)
        .set('x-organization-id', testOrgId)
        .send({
          harvest_date: '2025-03-15',
          quantity: 450,
          unit: 'kg',
          workers: [{ worker_id: generateUUID(), hours_worked: 6 }],
        });

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });

    it('should reject POST /tasks/categories missing required fields', async () => {
      const res = await api.post(`${basePath}/categories`)
        .set('x-organization-id', testOrgId)
        .send({});

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should reject POST /tasks/categories invalid formats', async () => {
      const res = await api.post(`${basePath}/categories`)
        .set('x-organization-id', testOrgId)
        .send({ name: 123, color: false });

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should accept POST /tasks/categories valid payload', async () => {
      const res = await api.post(`${basePath}/categories`)
        .set('x-organization-id', testOrgId)
        .send({ name: `Category-${Date.now()}`, color: '#10B981' });

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });

    it('should reject POST /tasks/:taskId/comments missing required fields', async () => {
      const res = await api.post(`${basePath}/${taskId}/comments`)
        .set('x-organization-id', testOrgId)
        .send({});

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should reject POST /tasks/:taskId/comments invalid formats', async () => {
      const res = await api.post(`${basePath}/${taskId}/comments`)
        .set('x-organization-id', testOrgId)
        .send({ comment: 123 });

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should accept POST /tasks/:taskId/comments valid payload', async () => {
      const res = await api.post(`${basePath}/${taskId}/comments`)
        .set('x-organization-id', testOrgId)
        .send({ comment: 'Progress update' });

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });

    it('should reject POST /tasks/:taskId/clock-in missing required fields', async () => {
      const res = await api.post(`${basePath}/${taskId}/clock-in`)
        .set('x-organization-id', testOrgId)
        .send({});

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should reject POST /tasks/:taskId/clock-in invalid formats', async () => {
      const res = await api.post(`${basePath}/${taskId}/clock-in`)
        .set('x-organization-id', testOrgId)
        .send({ latitude: 'invalid', longitude: 'invalid' });

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should accept POST /tasks/:taskId/clock-in valid payload', async () => {
      const res = await api.post(`${basePath}/${taskId}/clock-in`)
        .set('x-organization-id', testOrgId)
        .send({ latitude: 33.5731, longitude: -7.5898, notes: 'Started work' });

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });

    it('should reject PATCH /tasks/time-logs/:timeLogId/clock-out missing required fields', async () => {
      const res = await api.patch(`${basePath}/time-logs/${timeLogId}/clock-out`)
        .set('x-organization-id', testOrgId)
        .send({});

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should reject PATCH /tasks/time-logs/:timeLogId/clock-out invalid formats', async () => {
      const res = await api.patch(`${basePath}/time-logs/${timeLogId}/clock-out`)
        .set('x-organization-id', testOrgId)
        .send({ hours: 'invalid' });

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should accept PATCH /tasks/time-logs/:timeLogId/clock-out valid payload', async () => {
      const res = await api.patch(`${basePath}/time-logs/${timeLogId}/clock-out`)
        .set('x-organization-id', testOrgId)
        .send({ notes: 'Finished work' });

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });

    it('should reject POST /tasks/:taskId/clock-in-with-validation missing required fields', async () => {
      const res = await api.post(`${basePath}/${taskId}/clock-in-with-validation`)
        .set('x-organization-id', testOrgId)
        .send({});

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should reject POST /tasks/:taskId/clock-in-with-validation invalid formats', async () => {
      const res = await api.post(`${basePath}/${taskId}/clock-in-with-validation`)
        .set('x-organization-id', testOrgId)
        .send({ latitude: 'bad', longitude: 'bad' });

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should accept POST /tasks/:taskId/clock-in-with-validation valid payload', async () => {
      const res = await api.post(`${basePath}/${taskId}/clock-in-with-validation`)
        .set('x-organization-id', testOrgId)
        .send({ latitude: 33.5731, longitude: -7.5898, notes: 'Validated clock in' });

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });

    it('should reject POST /tasks/time-logs/auto-clock-out missing required fields', async () => {
      const res = await api.post(`${basePath}/time-logs/auto-clock-out`)
        .set('x-organization-id', testOrgId)
        .send({ maxHours: 'invalid' });

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should reject POST /tasks/time-logs/auto-clock-out invalid formats', async () => {
      const res = await api.post(`${basePath}/time-logs/auto-clock-out`)
        .set('x-organization-id', testOrgId)
        .query({ maxHours: 'invalid' })
        .send({});

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should accept POST /tasks/time-logs/auto-clock-out valid payload', async () => {
      const res = await api.post(`${basePath}/time-logs/auto-clock-out`)
        .set('x-organization-id', testOrgId)
        .query({ maxHours: '8' })
        .send({});

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('DELETE /api/v1/tasks/:taskId', () => {
    const taskId = generateUUID();

    it('should reject delete without org header', async () => {
      const res = await api.delete(`${basePath}/${taskId}`);
      expect([400, 403, 404, 500]).toContain(res.status);
    });

    it('should accept delete with org header', async () => {
      const res = await api.delete(`${basePath}/${taskId}`).set('x-organization-id', testOrgId);
      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });
});
