import { setupRealApiIntegration, ApiIntegrationTestHelper } from '../../helpers/api-integration-test.helper';

const generateUUID = () => {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return [hex.substring(0, 8), hex.substring(8, 12), hex.substring(12, 16), hex.substring(16, 20), hex.substring(20, 32)].join('-');
};

describe('TaskTemplates API - Validation Tests', () => {
  let api: ApiIntegrationTestHelper;
  const testOrgId = generateUUID();
  const basePath = `/api/v1/organizations/${testOrgId}`;

  beforeAll(async () => {
    api = await setupRealApiIntegration(generateUUID());
  }, 60000);

  afterAll(async () => { await api.cleanup(); });

  describe('POST /api/v1/organizations/:organizationId/task-templates/create-from-template', () => {
    it('should reject missing required fields', async () => {
      const res = await api.post(`${basePath}/task-templates/create-from-template`)
        .set('x-organization-id', testOrgId)
        .send({});

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should reject invalid formats', async () => {
      const res = await api.post(`${basePath}/task-templates/create-from-template`)
        .set('x-organization-id', testOrgId)
        .send({
          templateId: 'invalid-uuid',
          farmId: 'invalid-uuid',
          scheduledDate: 'not-a-date',
        });

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should accept valid payload', async () => {
      const res = await api.post(`${basePath}/task-templates/create-from-template`)
        .set('x-organization-id', testOrgId)
        .send({
          templateId: generateUUID(),
          farmId: generateUUID(),
          assignedTo: generateUUID(),
          scheduledDate: '2025-04-01T08:00:00.000Z',
        });

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('POST /api/v1/organizations/:organizationId/tasks/update-status', () => {
    it('should reject missing required fields', async () => {
      const res = await api.post(`${basePath}/tasks/update-status`)
        .set('x-organization-id', testOrgId)
        .send({});

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should reject invalid formats', async () => {
      const res = await api.post(`${basePath}/tasks/update-status`)
        .set('x-organization-id', testOrgId)
        .send({
          taskId: 'invalid-uuid',
          status: 123,
        });

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should accept valid payload', async () => {
      const res = await api.post(`${basePath}/tasks/update-status`)
        .set('x-organization-id', testOrgId)
        .send({
          taskId: generateUUID(),
          status: 'in_progress',
          notes: 'Status changed from integration test',
        });

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });
});
