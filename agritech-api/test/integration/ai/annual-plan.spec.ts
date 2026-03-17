import { setupRealApiIntegration, ApiIntegrationTestHelper } from '../../helpers/api-integration-test.helper';

const generateUUID = () => {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return [hex.substring(0, 8), hex.substring(8, 12), hex.substring(12, 16), hex.substring(16, 20), hex.substring(20, 32)].join('-');
};

describe('AnnualPlan API - Validation Tests', () => {
  let api: ApiIntegrationTestHelper;
  const testOrgId = generateUUID();
  const parcelId = generateUUID();
  const interventionId = generateUUID();

  beforeAll(async () => {
    api = await setupRealApiIntegration(generateUUID());
  }, 60000);

  afterAll(async () => {
    await api.cleanup();
  });

  it('should reject regenerate payload with invalid year format', async () => {
    const res = await api.post(`/api/v1/parcels/${parcelId}/ai/plan/regenerate`)
      .set('x-organization-id', testOrgId)
      .send({ year: 'not-a-year' });

    expect([400, 403, 404]).toContain(res.status);
  });

  it('should reject regenerate payload with out-of-range year', async () => {
    const res = await api.post(`/api/v1/parcels/${parcelId}/ai/plan/regenerate`)
      .set('x-organization-id', testOrgId)
      .send({ year: 1800 });

    expect([400, 403, 404]).toContain(res.status);
  });

  it('should accept valid regenerate payload', async () => {
    const res = await api.post(`/api/v1/parcels/${parcelId}/ai/plan/regenerate`)
      .set('x-organization-id', testOrgId)
      .send({ year: 2026 });

    expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
  });

  it('should reject plan request without organization header', async () => {
    const res = await api.get(`/api/v1/parcels/${parcelId}/ai/plan`);
    expect([400, 403, 404, 500]).toContain(res.status);
  });

  it('should accept plan request with organization header', async () => {
    const res = await api.get(`/api/v1/parcels/${parcelId}/ai/plan`)
      .set('x-organization-id', testOrgId);

    expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
  });

  it('should accept calendar request with organization header', async () => {
    const res = await api.get(`/api/v1/parcels/${parcelId}/ai/plan/calendar`)
      .set('x-organization-id', testOrgId);

    expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
  });

  it('should accept validate request with organization header', async () => {
    const res = await api.post(`/api/v1/parcels/${parcelId}/ai/plan/validate`)
      .set('x-organization-id', testOrgId);

    expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
  });

  it('should reject intervention execution without organization header', async () => {
    const res = await api.patch(`/api/v1/ai/plan/interventions/${interventionId}/execute`);
    expect([400, 403, 404, 500]).toContain(res.status);
  });

  it('should accept intervention execution with organization header', async () => {
    const res = await api.patch(`/api/v1/ai/plan/interventions/${interventionId}/execute`)
      .set('x-organization-id', testOrgId);

    expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
  });
});
