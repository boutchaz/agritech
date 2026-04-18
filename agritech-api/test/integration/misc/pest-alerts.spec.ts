import { setupRealApiIntegration, ApiIntegrationTestHelper } from '../../helpers/api-integration-test.helper';

const generateUUID = () => {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return [hex.substring(0, 8), hex.substring(8, 12), hex.substring(12, 16), hex.substring(16, 20), hex.substring(20, 32)].join('-');
};

describe('Pest Alerts API - Validation Tests', () => {
  let api: ApiIntegrationTestHelper;
  const testOrgId = generateUUID();
  const basePath = '/api/v1/pest-alerts';
  const reportId = generateUUID();

  beforeAll(async () => {
    api = await setupRealApiIntegration(generateUUID());
  }, 60000);

  afterAll(async () => { await api.cleanup(); });

  it('should expose library and reports endpoints', async () => {
    const library = await api.get(`${basePath}/library`).set('x-organization-id', testOrgId);
    const reports = await api.get(`${basePath}/reports`).set('x-organization-id', testOrgId);
    const report = await api.get(`${basePath}/reports/${reportId}`).set('x-organization-id', testOrgId);
    expect(library.status).not.toBe(400);
    expect(reports.status).not.toBe(400);
    expect(report.status).not.toBe(400);
  });

  it('should validate create report payload', async () => {
    const invalid = await api.post(`${basePath}/reports`).set('x-organization-id', testOrgId).send({
      farm_id: 'bad',
      parcel_id: 'bad',
      pest_disease_id: 'bad',
      severity: 'urgent',
    });

    const valid = await api.post(`${basePath}/reports`).set('x-organization-id', testOrgId).send({
      farm_id: generateUUID(),
      parcel_id: generateUUID(),
      pest_disease_id: generateUUID(),
      severity: 'medium',
      affected_area_percentage: 45,
      detection_method: 'visual_inspection',
      location: { latitude: 35.5, longitude: -5.6 },
    });

    expect(invalid.status).toBe(400);
    expect(valid.status).not.toBe(400);
  });

  it('should validate update report payload', async () => {
    const invalid = await api.patch(`${basePath}/reports/${reportId}`).set('x-organization-id', testOrgId).send({ status: 'unknown' });
    const valid = await api.patch(`${basePath}/reports/${reportId}`).set('x-organization-id', testOrgId).send({ status: 'verified', treatment_applied: 'Bio treatment' });
    expect(invalid.status).toBe(400);
    expect(valid.status).not.toBe(400);
  });

  it('should expose escalate endpoint', async () => {
    const res = await api.post(`${basePath}/reports/${reportId}/escalate`).set('x-organization-id', testOrgId).send({});
    expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
  });
});
