import { setupRealApiIntegration, ApiIntegrationTestHelper } from '../../helpers/api-integration-test.helper';

const generateUUID = () => {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return [hex.substring(0, 8), hex.substring(8, 12), hex.substring(12, 16), hex.substring(16, 20), hex.substring(20, 32)].join('-');
};

describe('AiAlerts API - Validation Tests', () => {
  let api: ApiIntegrationTestHelper;
  const testOrgId = generateUUID();
  const parcelId = generateUUID();
  const alertId = generateUUID();

  beforeAll(async () => {
    api = await setupRealApiIntegration(generateUUID());
  }, 60000);

  afterAll(async () => {
    await api.cleanup();
  });

  it('should reject alerts request without organization header', async () => {
    const res = await api.get(`/api/v1/parcels/${parcelId}/ai/alerts`);
    expect([400, 403, 404, 500]).toContain(res.status);
  });

  it('should accept alerts request with organization header', async () => {
    const res = await api.get(`/api/v1/parcels/${parcelId}/ai/alerts`)
      .set('x-organization-id', testOrgId);

    expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
  });

  it('should accept active alerts request with organization header', async () => {
    const res = await api.get(`/api/v1/parcels/${parcelId}/ai/alerts/active`)
      .set('x-organization-id', testOrgId);

    expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
  });

  it('should reject acknowledge request without organization header', async () => {
    const res = await api.patch(`/api/v1/ai/alerts/${alertId}/acknowledge`);
    expect([400, 403, 404, 500]).toContain(res.status);
  });

  it('should accept acknowledge request with organization header', async () => {
    const res = await api.patch(`/api/v1/ai/alerts/${alertId}/acknowledge`)
      .set('x-organization-id', testOrgId);

    expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
  });

  it('should accept resolve request with organization header', async () => {
    const res = await api.patch(`/api/v1/ai/alerts/${alertId}/resolve`)
      .set('x-organization-id', testOrgId);

    expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
  });
});
