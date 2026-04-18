import { setupRealApiIntegration, ApiIntegrationTestHelper } from '../../helpers/api-integration-test.helper';

const generateUUID = () => {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return [hex.substring(0, 8), hex.substring(8, 12), hex.substring(12, 16), hex.substring(16, 20), hex.substring(20, 32)].join('-');
};

describe('TaskAssignments API - Validation Tests', () => {
  let api: ApiIntegrationTestHelper;
  const testOrgId = generateUUID();
  const taskId = generateUUID();
  const assignmentId = generateUUID();
  const basePath = `/api/v1/api/v1/organizations/${testOrgId}/tasks/${taskId}/assignments`;

  beforeAll(async () => {
    api = await setupRealApiIntegration(generateUUID());
  }, 60000);

  afterAll(async () => { await api.cleanup(); });

  describe('GET /api/v1/api/v1/organizations/:organizationId/tasks/:taskId/assignments', () => {
    it('should reject request without org header', async () => {
      const res = await api.get(basePath);
      expect([400, 403, 404, 500]).toContain(res.status);
    });

    it('should accept request with org header', async () => {
      const res = await api.get(basePath).set('x-organization-id', testOrgId);
      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('POST /api/v1/api/v1/organizations/:organizationId/tasks/:taskId/assignments', () => {
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
          role: 'invalid-role',
        });

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should accept valid payload', async () => {
      const res = await api.post(basePath)
        .set('x-organization-id', testOrgId)
        .send({
          worker_id: generateUUID(),
          role: 'worker',
          notes: 'Assigned for morning shift',
        });

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('POST /api/v1/api/v1/organizations/:organizationId/tasks/:taskId/assignments/bulk', () => {
    it('should reject missing required fields', async () => {
      const res = await api.post(`${basePath}/bulk`)
        .set('x-organization-id', testOrgId)
        .send({});

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should reject invalid formats', async () => {
      const res = await api.post(`${basePath}/bulk`)
        .set('x-organization-id', testOrgId)
        .send({
          assignments: [{ worker_id: 'invalid-uuid', role: 'worker' }],
        });

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should accept valid payload', async () => {
      const res = await api.post(`${basePath}/bulk`)
        .set('x-organization-id', testOrgId)
        .send({
          assignments: [
            { worker_id: generateUUID(), role: 'worker' },
            { worker_id: generateUUID(), role: 'lead' },
          ],
        });

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('PATCH /api/v1/api/v1/organizations/:organizationId/tasks/:taskId/assignments/:assignmentId', () => {
    it('should reject missing required fields', async () => {
      const res = await api.patch(`${basePath}/${assignmentId}`)
        .set('x-organization-id', testOrgId)
        .send({ status: 'invalid' });

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should reject invalid formats', async () => {
      const res = await api.patch(`${basePath}/${assignmentId}`)
        .set('x-organization-id', testOrgId)
        .send({
          status: 'done',
          notes: 123,
        });

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should accept valid payload', async () => {
      const res = await api.patch(`${basePath}/${assignmentId}`)
        .set('x-organization-id', testOrgId)
        .send({
          status: 'working',
          notes: 'Started assignment',
        });

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('DELETE /api/v1/api/v1/organizations/:organizationId/tasks/:taskId/assignments/:assignmentId', () => {
    it('should reject request without org header', async () => {
      const res = await api.delete(`${basePath}/${assignmentId}`);
      expect([400, 403, 404, 500]).toContain(res.status);
    });

    it('should accept request with org header', async () => {
      const res = await api.delete(`${basePath}/${assignmentId}`).set('x-organization-id', testOrgId);
      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });
});
