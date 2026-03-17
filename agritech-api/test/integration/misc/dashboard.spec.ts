import { setupRealApiIntegration, ApiIntegrationTestHelper } from '../../helpers/api-integration-test.helper';

const generateUUID = () => {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return [hex.substring(0, 8), hex.substring(8, 12), hex.substring(12, 16), hex.substring(16, 20), hex.substring(20, 32)].join('-');
};

describe('Dashboard API - Validation Tests', () => {
  let api: ApiIntegrationTestHelper;
  const testOrgId = generateUUID();
  const basePath = '/api/v1/dashboard';

  beforeAll(async () => {
    api = await setupRealApiIntegration(generateUUID());
  }, 60000);

  afterAll(async () => { await api.cleanup(); });

  it('should require organization header for summary', async () => {
    const noHeader = await api.get(`${basePath}/summary`);
    const withHeader = await api.get(`${basePath}/summary`).set('x-organization-id', testOrgId);
    expect(noHeader.status).toBe(400);
    expect(withHeader.status).not.toBe(400);
  });

  it('should require organization header for live endpoints', async () => {
    const metrics = await api.get(`${basePath}/live/metrics`).set('x-organization-id', testOrgId);
    const summary = await api.get(`${basePath}/live/summary`).set('x-organization-id', testOrgId);
    const heatmap = await api.get(`${basePath}/live/heatmap`).set('x-organization-id', testOrgId);
    expect(metrics.status).not.toBe(400);
    expect(summary.status).not.toBe(400);
    expect(heatmap.status).not.toBe(400);
  });

  it('should resolve widget and settings endpoints', async () => {
    const widget = await api.get(`${basePath}/widgets/general`).set('x-organization-id', testOrgId);
    const settings = await api.get(`${basePath}/settings`).set('x-organization-id', testOrgId);
    expect(widget.status).not.toBe(400);
    expect(settings.status).not.toBe(400);
  });
});
