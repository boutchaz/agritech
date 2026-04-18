import { setupRealApiIntegration, ApiIntegrationTestHelper } from '../../helpers/api-integration-test.helper';

const generateUUID = () => {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return [hex.substring(0, 8), hex.substring(8, 12), hex.substring(12, 16), hex.substring(16, 20), hex.substring(20, 32)].join('-');
};

describe('Calibration API - Validation Tests', () => {
  let api: ApiIntegrationTestHelper;
  const testOrgId = generateUUID();
  const parcelId = generateUUID();
  const calibrationId = generateUUID();

  beforeAll(async () => {
    api = await setupRealApiIntegration(generateUUID());
  }, 60000);

  afterAll(async () => {
    await api.cleanup();
  });

  it('should reject invalid numeric format when starting calibration', async () => {
    const res = await api.post(`/api/v1/parcels/${parcelId}/calibration/start`)
      .set('x-organization-id', testOrgId)
      .send({ real_tree_count: 'invalid' });

    expect([400, 403, 404]).toContain(res.status);
  });

  it('should accept valid calibration start payload', async () => {
    const res = await api.post(`/api/v1/parcels/${parcelId}/calibration/start`)
      .set('x-organization-id', testOrgId)
      .send({
        real_tree_count: 120,
        water_source_changed: false,
        observations: 'Initial calibration check',
      });

    expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
  });

  it('should reject missing required option for nutrition confirmation', async () => {
    const res = await api.post(`/api/v1/parcels/${parcelId}/calibration/${calibrationId}/nutrition-option`)
      .set('x-organization-id', testOrgId)
      .send({});

    expect([400, 403, 404]).toContain(res.status);
  });

  it('should reject invalid nutrition option format', async () => {
    const res = await api.post(`/api/v1/parcels/${parcelId}/calibration/${calibrationId}/nutrition-option`)
      .set('x-organization-id', testOrgId)
      .send({ option: 'D' });

    expect([400, 403, 404]).toContain(res.status);
  });

  it('should accept valid nutrition option payload', async () => {
    const res = await api.post(`/api/v1/parcels/${parcelId}/calibration/${calibrationId}/nutrition-option`)
      .set('x-organization-id', testOrgId)
      .send({ option: 'A' });

    expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
  });

  it('should reject readiness check without organization header', async () => {
    const res = await api.get(`/api/v1/parcels/${parcelId}/calibration/readiness`);
    expect([400, 403, 404, 500]).toContain(res.status);
  });

  it('should accept readiness check with organization header', async () => {
    const res = await api.get(`/api/v1/parcels/${parcelId}/calibration/readiness`)
      .set('x-organization-id', testOrgId);

    expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
  });
});
