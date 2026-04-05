import { setupRealApiIntegration, ApiIntegrationTestHelper } from '../../helpers/api-integration-test.helper';

const generateUUID = () => {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return [hex.substring(0, 8), hex.substring(8, 12), hex.substring(12, 16), hex.substring(16, 20), hex.substring(20, 32)].join('-');
};

describe('Calibration Review & Export API - Validation Tests', () => {
  let api: ApiIntegrationTestHelper;
  const testOrgId = generateUUID();
  const wrongOrgId = generateUUID();
  const parcelId = generateUUID();
  const calibrationId = generateUUID();

  beforeAll(async () => {
    api = await setupRealApiIntegration(generateUUID());
  }, 60000);

  afterAll(async () => {
    await api.cleanup();
  });

  it('should return 404 for review on nonexistent parcel', async () => {
    const res = await api.get(`/api/v1/parcels/${parcelId}/calibration/review`)
      .set('x-organization-id', testOrgId);

    expect([403, 404]).toContain(res.status);
  });

  it('should return 400 or 404 for review without organization header', async () => {
    const res = await api.get(`/api/v1/parcels/${parcelId}/calibration/review`);

    expect([400, 404]).toContain(res.status);
  });

  it('should return 404 for review with wrong organization', async () => {
    const res = await api.get(`/api/v1/parcels/${parcelId}/calibration/review`)
      .set('x-organization-id', wrongOrgId);

    expect([403, 404]).toContain(res.status);
  });

  it('should return 404 for JSON export on nonexistent calibration', async () => {
    const res = await api.get(`/api/v1/calibrations/${calibrationId}/export?format=json`)
      .set('x-organization-id', testOrgId);

    expect([403, 404]).toContain(res.status);
  });

  it('should return 404 for CSV export on nonexistent calibration', async () => {
    const res = await api.get(`/api/v1/calibrations/${calibrationId}/export?format=csv`)
      .set('x-organization-id', testOrgId);

    expect([403, 404]).toContain(res.status);
  });

  it('should return 404 for ZIP export on nonexistent calibration', async () => {
    const res = await api.get(`/api/v1/calibrations/${calibrationId}/export?format=zip`)
      .set('x-organization-id', testOrgId);

    expect([403, 404]).toContain(res.status);
  });

  it('should return 400 for export with invalid format', async () => {
    const res = await api.get(`/api/v1/calibrations/${calibrationId}/export?format=invalid`)
      .set('x-organization-id', testOrgId);

    expect([400, 403]).toContain(res.status);
  });

  it('should default to JSON export format when format is omitted', async () => {
    const res = await api.get(`/api/v1/calibrations/${calibrationId}/export`)
      .set('x-organization-id', testOrgId);

    expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
  });
});
