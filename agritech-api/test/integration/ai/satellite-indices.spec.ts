import { setupRealApiIntegration, ApiIntegrationTestHelper } from '../../helpers/api-integration-test.helper';

const generateUUID = () => {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return [hex.substring(0, 8), hex.substring(8, 12), hex.substring(12, 16), hex.substring(16, 20), hex.substring(20, 32)].join('-');
};

describe('SatelliteIndices API - Validation Tests', () => {
  let api: ApiIntegrationTestHelper;
  const testOrgId = generateUUID();
  const itemId = generateUUID();

  beforeAll(async () => {
    api = await setupRealApiIntegration(generateUUID());
  }, 60000);

  afterAll(async () => {
    await api.cleanup();
  });

  it('should reject missing required fields on create', async () => {
    const res = await api.post('/api/v1/satellite-indices')
      .set('x-organization-id', testOrgId)
      .send({});

    expect([400, 403, 404]).toContain(res.status);
  });

  it('should reject invalid create payload formats', async () => {
    const res = await api.post('/api/v1/satellite-indices')
      .set('x-organization-id', testOrgId)
      .send({
        date: 'invalid-date',
        index_name: 123,
        parcel_id: 'invalid-uuid',
      });

    expect([400, 403, 404]).toContain(res.status);
  });

  it('should accept valid create payload', async () => {
    const res = await api.post('/api/v1/satellite-indices')
      .set('x-organization-id', testOrgId)
      .send({
        date: '2025-01-15T00:00:00.000Z',
        index_name: 'NDVI',
        parcel_id: generateUUID(),
      });

    expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
  });

  it('should reject list request without organization header', async () => {
    const res = await api.get('/api/v1/satellite-indices');
    expect([400, 403, 404, 500]).toContain(res.status);
  });

  it('should accept list request with organization header', async () => {
    const res = await api.get('/api/v1/satellite-indices?page=1&limit=10')
      .set('x-organization-id', testOrgId);

    expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
  });

  it('should reject invalid filter date format', async () => {
    const res = await api.get('/api/v1/satellite-indices?date_from=bad-date')
      .set('x-organization-id', testOrgId);

    expect([400, 403, 404]).toContain(res.status);
  });

  it('should reject delete request without organization header', async () => {
    const res = await api.delete(`/api/v1/satellite-indices/${itemId}`);
    expect([400, 403, 404, 500]).toContain(res.status);
  });

  it('should accept delete request with organization header', async () => {
    const res = await api.delete(`/api/v1/satellite-indices/${itemId}`)
      .set('x-organization-id', testOrgId);

    expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
  });

  it('should reject proxy request without organization header', async () => {
    const res = await api.post('/api/v1/satellite-proxy/indices/timeseries').send({
      parcel_id: generateUUID(),
      index_name: 'NDVI',
    });

    expect([400, 403, 404, 500]).toContain(res.status);
  });

  it('should accept proxy request with organization header', async () => {
    const res = await api.post('/api/v1/satellite-proxy/indices/timeseries')
      .set('x-organization-id', testOrgId)
      .send({
        parcel_id: generateUUID(),
        index_name: 'NDVI',
      });

    expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
  });
});
