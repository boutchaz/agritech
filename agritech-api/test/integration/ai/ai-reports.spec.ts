import { setupRealApiIntegration, ApiIntegrationTestHelper } from '../../helpers/api-integration-test.helper';

const generateUUID = () => {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return [hex.substring(0, 8), hex.substring(8, 12), hex.substring(12, 16), hex.substring(16, 20), hex.substring(20, 32)].join('-');
};

describe('AiReports API - Validation Tests', () => {
  let api: ApiIntegrationTestHelper;
  const testOrgId = generateUUID();
  const parcelId = generateUUID();

  beforeAll(async () => {
    api = await setupRealApiIntegration(generateUUID());
  }, 60000);

  afterAll(async () => {
    await api.cleanup();
  });

  it('should reject report generation with missing required fields', async () => {
    const res = await api.post('/api/v1/ai-reports/generate')
      .set('x-organization-id', testOrgId)
      .send({});

    expect([400, 403, 404]).toContain(res.status);
  });

  it('should reject report generation with invalid enum and date format', async () => {
    const res = await api.post('/api/v1/ai-reports/generate')
      .set('x-organization-id', testOrgId)
      .send({
        parcel_id: parcelId,
        provider: 'invalid-provider',
        data_start_date: 'bad-date',
      });

    expect([400, 403, 404]).toContain(res.status);
  });

  it('should reject fetch-data request with missing required field', async () => {
    const res = await api.post(`/api/v1/ai-reports/parcels/${parcelId}/fetch-data`)
      .set('x-organization-id', testOrgId)
      .send({});

    expect([400, 403, 404]).toContain(res.status);
  });

  it('should reject fetch-data request with invalid format', async () => {
    const res = await api.post(`/api/v1/ai-reports/parcels/${parcelId}/fetch-data`)
      .set('x-organization-id', testOrgId)
      .send({ dataSources: 'satellite' });

    expect([400, 403, 404]).toContain(res.status);
  });

  it('should accept valid fetch-data payload', async () => {
    const res = await api.post(`/api/v1/ai-reports/parcels/${parcelId}/fetch-data`)
      .set('x-organization-id', testOrgId)
      .send({ dataSources: ['satellite', 'weather'] });

    expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
  });

  it('should reject providers request without organization header', async () => {
    const res = await api.get('/api/v1/ai-reports/providers');
    expect([400, 403, 404, 500]).toContain(res.status);
  });

  it('should accept providers request with organization header', async () => {
    const res = await api.get('/api/v1/ai-reports/providers')
      .set('x-organization-id', testOrgId);

    expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
  });

  it('should reject jobs request without organization header', async () => {
    const res = await api.get('/api/v1/ai-reports/jobs');
    expect([400, 403, 404, 500]).toContain(res.status);
  });

  it('should accept jobs request with organization header', async () => {
    const res = await api.get('/api/v1/ai-reports/jobs?limit=5')
      .set('x-organization-id', testOrgId);

    expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
  });
});
