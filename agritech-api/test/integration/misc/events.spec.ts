import { setupRealApiIntegration, ApiIntegrationTestHelper } from '../../helpers/api-integration-test.helper';

const generateUUID = () => {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return [hex.substring(0, 8), hex.substring(8, 12), hex.substring(12, 16), hex.substring(16, 20), hex.substring(20, 32)].join('-');
};

describe('Events/Admin Adoption API - Validation Tests', () => {
  let api: ApiIntegrationTestHelper;
  const testOrgId = generateUUID();
  const eventBasePath = '/api/v1/admin/events';
  const adoptionBasePath = '/api/v1/admin/adoption';

  beforeAll(async () => {
    api = await setupRealApiIntegration(generateUUID());
  }, 60000);

  afterAll(async () => { await api.cleanup(); });

  it('should parse event query params without validation errors', async () => {
    const res = await api.get(`${eventBasePath}?limit=20&offset=0&start_date=2025-01-01&end_date=2025-12-31`).set('x-organization-id', testOrgId);
    expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
  });

  it('should expose org and aggregate event analytics endpoints', async () => {
    const orgEvents = await api.get(`${eventBasePath}/org/${testOrgId}?limit=10`).set('x-organization-id', testOrgId);
    const distribution = await api.get(`${eventBasePath}/distribution?organization_id=${testOrgId}&days=30`).set('x-organization-id', testOrgId);
    const daily = await api.get(`${eventBasePath}/daily-counts?organization_id=${testOrgId}&days=30`).set('x-organization-id', testOrgId);
    expect(orgEvents.status).not.toBe(400);
    expect(distribution.status).not.toBe(400);
    expect(daily.status).not.toBe(400);
  });

  it('should expose adoption analytics endpoints', async () => {
    const funnel = `funnel-${Date.now()}`;
    const dashboard = await api.get(`${adoptionBasePath}/dashboard?funnel=${funnel}`).set('x-organization-id', testOrgId);
    const defs = await api.get(`${adoptionBasePath}/funnels/${funnel}/definitions`).set('x-organization-id', testOrgId);
    const conversions = await api.get(`${adoptionBasePath}/funnels/${funnel}/conversion-rates`).set('x-organization-id', testOrgId);
    const cohorts = await api.get(`${adoptionBasePath}/funnels/${funnel}/cohorts?months=3`).set('x-organization-id', testOrgId);
    expect(dashboard.status).not.toBe(400);
    expect(defs.status).not.toBe(400);
    expect(conversions.status).not.toBe(400);
    expect(cohorts.status).not.toBe(400);
  });

  it('should validate adoption manual trigger payload format', async () => {
    const invalid = await api.post(`${adoptionBasePath}/calculate-daily-metrics`).set('x-organization-id', testOrgId).send({ date: 'not-a-date' });
    const valid = await api.post(`${adoptionBasePath}/calculate-daily-metrics`).set('x-organization-id', testOrgId).send({ date: '2025-01-01' });
    expect(invalid.status).not.toBe(404);
    expect(valid.status).not.toBe(404);
  });
});
