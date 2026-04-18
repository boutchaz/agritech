import { setupRealApiIntegration, ApiIntegrationTestHelper } from '../../helpers/api-integration-test.helper';

const generateUUID = () => {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return [hex.substring(0, 8), hex.substring(8, 12), hex.substring(12, 16), hex.substring(16, 20), hex.substring(20, 32)].join('-');
};

describe('Email API - Validation Tests', () => {
  let api: ApiIntegrationTestHelper;
  const testOrgId = generateUUID();
  const basePath = '/api/v1/email';

  beforeAll(async () => {
    api = await setupRealApiIntegration(generateUUID());
  }, 60000);

  afterAll(async () => { await api.cleanup(); });

  it('should handle test email payloads', async () => {
    const invalid = await api.post(`${basePath}/test`).set('x-organization-id', testOrgId).send({});
    const valid = await api.post(`${basePath}/test`).set('x-organization-id', testOrgId).send({ to: 'qa@example.com' });
    expect(invalid.status).not.toBe(404);
    expect(valid.status).not.toBe(404);
  });

  it('should handle user-created and password-reset email payloads', async () => {
    const userCreated = await api.post(`${basePath}/user-created`).set('x-organization-id', testOrgId).send({
      to: 'new.user@example.com',
      firstName: 'Test',
      lastName: 'User',
      tempPassword: 'Temp1234!',
      organizationName: 'Agri QA',
    });

    const reset = await api.post(`${basePath}/password-reset`).set('x-organization-id', testOrgId).send({
      to: 'existing.user@example.com',
      firstName: 'Existing',
      tempPassword: 'Reset1234!',
    });

    expect(userCreated.status).not.toBe(404);
    expect(reset.status).not.toBe(404);
  });
});
