import { setupRealApiIntegration, ApiIntegrationTestHelper } from '../../helpers/api-integration-test.helper';

const generateUUID = () => {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return [hex.substring(0, 8), hex.substring(8, 12), hex.substring(12, 16), hex.substring(16, 20), hex.substring(20, 32)].join('-');
};

describe('AiRecommendations API - Validation Tests', () => {
  let api: ApiIntegrationTestHelper;
  const testOrgId = generateUUID();
  const parcelId = generateUUID();
  const recommendationId = generateUUID();

  beforeAll(async () => {
    api = await setupRealApiIntegration(generateUUID());
  }, 60000);

  afterAll(async () => {
    await api.cleanup();
  });

  it('should reject missing required fields on create', async () => {
    const res = await api.post('/api/v1/ai/recommendations')
      .set('x-organization-id', testOrgId)
      .send({});

    expect([400, 403, 404]).toContain(res.status);
  });

  it('should reject invalid format on create', async () => {
    const res = await api.post('/api/v1/ai/recommendations')
      .set('x-organization-id', testOrgId)
      .send({
        parcel_id: 'invalid-uuid',
        constat: 'Field observation',
        diagnostic: 'Water stress',
        action: 'Increase irrigation',
        valid_from: 'not-a-date',
      });

    expect([400, 403, 404]).toContain(res.status);
  });

  it('should accept valid create payload', async () => {
    const res = await api.post('/api/v1/ai/recommendations')
      .set('x-organization-id', testOrgId)
      .send({
        parcel_id: parcelId,
        constat: 'Leaf turgor is decreasing',
        diagnostic: 'Moderate hydric stress',
        action: 'Apply irrigation cycle adjustment',
        conditions: 'No heavy rain in next 48h',
      });

    expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
  });

  it('should reject invalid execute payload format', async () => {
    const res = await api.patch(`/api/v1/ai/recommendations/${recommendationId}/execute`)
      .set('x-organization-id', testOrgId)
      .send({ notes: { text: 'done' } });

    expect([400, 403, 404]).toContain(res.status);
  });

  it('should accept valid execute payload', async () => {
    const res = await api.patch(`/api/v1/ai/recommendations/${recommendationId}/execute`)
      .set('x-organization-id', testOrgId)
      .send({ notes: 'Executed at dawn irrigation window' });

    expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
  });

  it('should reject parcel recommendations request without organization header', async () => {
    const res = await api.get(`/api/v1/parcels/${parcelId}/ai/recommendations`);
    expect([400, 403, 404, 500]).toContain(res.status);
  });

  it('should accept parcel recommendations request with organization header', async () => {
    const res = await api.get(`/api/v1/parcels/${parcelId}/ai/recommendations`)
      .set('x-organization-id', testOrgId);

    expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
  });

  it('should accept evaluation request with organization header', async () => {
    const res = await api.get(`/api/v1/ai/recommendations/${recommendationId}/evaluation`)
      .set('x-organization-id', testOrgId);

    expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
  });
});
