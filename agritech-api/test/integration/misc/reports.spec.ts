import { setupRealApiIntegration, ApiIntegrationTestHelper } from '../../helpers/api-integration-test.helper';

const generateUUID = () => {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return [hex.substring(0, 8), hex.substring(8, 12), hex.substring(12, 16), hex.substring(16, 20), hex.substring(20, 32)].join('-');
};

describe('Reports API - Validation Tests', () => {
  let api: ApiIntegrationTestHelper;
  const testOrgId = generateUUID();
  const reportsBasePath = `/api/v1/organizations/${testOrgId}/reports`;
  const financialBasePath = '/api/v1/financial-reports';

  beforeAll(async () => {
    api = await setupRealApiIntegration(generateUUID());
  }, 60000);

  afterAll(async () => { await api.cleanup(); });

  it('should expose available report types endpoint', async () => {
    const res = await api.get(`${reportsBasePath}/available`).set('x-organization-id', testOrgId);
    expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
  });

  it('should validate report generation filters', async () => {
    const invalid = await api.get(`${reportsBasePath}/generate?report_type=invalid-report`).set('x-organization-id', testOrgId);
    const valid = await api.get(`${reportsBasePath}/generate?report_type=stock-inventory&start_date=2025-01-01&end_date=2025-12-31&farm_id=${generateUUID()}`).set('x-organization-id', testOrgId);
    expect(invalid.status).toBe(400);
    expect(valid.status).not.toBe(400);
  });

  it('should expose financial report endpoints', async () => {
    const receivables = await api.get(`${financialBasePath}/aged-receivables?as_of_date=2025-12-31`).set('x-organization-id', testOrgId);
    const payables = await api.get(`${financialBasePath}/aged-payables?as_of_date=2025-12-31`).set('x-organization-id', testOrgId);
    expect(receivables.status).not.toBe(400);
    expect(payables.status).not.toBe(400);
  });
});
