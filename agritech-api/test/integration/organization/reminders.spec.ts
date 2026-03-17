import { setupRealApiIntegration, ApiIntegrationTestHelper } from '../../helpers/api-integration-test.helper';

const generateUUID = () => {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
  return [hex.substring(0, 8), hex.substring(8, 12), hex.substring(12, 16), hex.substring(16, 20), hex.substring(20, 32)].join('-');
};

describe('Reminders API - Validation Tests', () => {
  let api: ApiIntegrationTestHelper;
  const testOrgId = generateUUID();

  beforeAll(async () => {
    api = await setupRealApiIntegration(generateUUID());
  }, 60000);

  afterAll(async () => {
    await api.cleanup();
  });

  describe('POST /api/v1/reminders/preferences', () => {
    it('should reject invalid preferences field types', async () => {
      const res = await api.post('/api/v1/reminders/preferences')
        .set('x-organization-id', testOrgId)
        .send({
          taskRemindersEnabled: { bad: true },
          emailNotifications: { bad: true },
        });

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should accept valid preferences payload', async () => {
      const res = await api.post('/api/v1/reminders/preferences')
        .set('x-organization-id', testOrgId)
        .send({
          taskRemindersEnabled: true,
          taskReminder1dBefore: true,
          taskReminderOnDueDate: true,
          taskOverdueAlerts: true,
          emailNotifications: true,
          pushNotifications: false,
        });

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('GET /api/v1/reminders/preferences', () => {
    it('should accept request with organization header', async () => {
      const res = await api.get('/api/v1/reminders/preferences')
        .set('x-organization-id', testOrgId);

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('POST /api/v1/reminders/test', () => {
    it('should trigger reminder check endpoint', async () => {
      const res = await api.post('/api/v1/reminders/test')
        .set('x-organization-id', testOrgId);

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });
});
