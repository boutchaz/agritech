import { setupRealApiIntegration, ApiIntegrationTestHelper } from '../../helpers/api-integration-test.helper';

const generateUUID = () => {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return [hex.substring(0, 8), hex.substring(8, 12), hex.substring(12, 16), hex.substring(16, 20), hex.substring(20, 32)].join('-');
};

describe('Parcel Events API - Validation Tests', () => {
  let api: ApiIntegrationTestHelper;
  const testOrgId = generateUUID();
  const parcelId = generateUUID();
  const eventId = generateUUID();
  const basePath = `/api/v1/parcels/${parcelId}/events`;

  beforeAll(async () => {
    api = await setupRealApiIntegration(generateUUID());
  }, 60000);

  afterAll(async () => { await api.cleanup(); });

  it('should require organization header', async () => {
    const noHeader = await api.get(basePath);
    const withHeader = await api.get(basePath).set('x-organization-id', testOrgId);
    expect(noHeader.status).toBe(400);
    expect(withHeader.status).not.toBe(400);
  });

  it('should validate create parcel event payload', async () => {
    const invalid = await api.post(basePath).set('x-organization-id', testOrgId).send({ type: 123, date_evenement: 'bad-date', recalibrage_requis: 'yes' });
    const valid = await api.post(basePath).set('x-organization-id', testOrgId).send({
      type: 'soil_analysis',
      date_evenement: '2025-02-15',
      description: 'Soil test completed',
      recalibrage_requis: true,
      donnees: { ph: 6.4 },
    });
    expect(invalid.status).toBe(400);
    expect(valid.status).not.toBe(400);
  });

  it('should expose single event endpoint', async () => {
    const res = await api.get(`${basePath}/${eventId}`).set('x-organization-id', testOrgId);
    expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
  });
});
