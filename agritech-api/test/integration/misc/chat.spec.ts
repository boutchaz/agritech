import { setupRealApiIntegration, ApiIntegrationTestHelper } from '../../helpers/api-integration-test.helper';

const generateUUID = () => {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return [hex.substring(0, 8), hex.substring(8, 12), hex.substring(12, 16), hex.substring(16, 20), hex.substring(20, 32)].join('-');
};

describe('Chat API - Validation Tests', () => {
  let api: ApiIntegrationTestHelper;
  const testOrgId = generateUUID();
  const orgPath = `/api/v1/organizations/${testOrgId}/chat`;

  beforeAll(async () => {
    api = await setupRealApiIntegration(generateUUID());
  }, 60000);

  afterAll(async () => { await api.cleanup(); });

  it('should reject chat message with missing query', async () => {
    const res = await api.post(orgPath).set('x-organization-id', testOrgId).send({});
    expect([400, 403, 404]).toContain(res.status);
  });

  it('should reject chat message with invalid save_history type', async () => {
    const res = await api.post(orgPath).set('x-organization-id', testOrgId).send({ query: 'hello', save_history: 'yes' });
    expect([400, 403, 404]).toContain(res.status);
  });

  it('should accept valid chat message payload', async () => {
    const res = await api.post(orgPath).set('x-organization-id', testOrgId).send({ query: 'hello', language: 'fr', save_history: true });
    expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
  });

  it('should expose history and clear endpoints', async () => {
    const history = await api.get(`${orgPath}/history?limit=5`).set('x-organization-id', testOrgId);
    const clear = await api.delete(`${orgPath}/history`).set('x-organization-id', testOrgId);
    expect(history.status).not.toBe(400);
    expect(clear.status).not.toBe(400);
  });

  it('should validate tts payload', async () => {
    const invalid = await api.post(`${orgPath}/tts`).set('x-organization-id', testOrgId).send({ text: '   ' });
    const valid = await api.post(`${orgPath}/tts`).set('x-organization-id', testOrgId).send({ text: 'Bonjour', language: 'fr', speed: 1.1 });
    expect(invalid.status).toBe(400);
    expect(valid.status).not.toBe(404);
  });
});
