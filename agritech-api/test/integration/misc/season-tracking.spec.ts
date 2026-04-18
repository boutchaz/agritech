import { setupRealApiIntegration, ApiIntegrationTestHelper } from '../../helpers/api-integration-test.helper';

const generateUUID = () => {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return [hex.substring(0, 8), hex.substring(8, 12), hex.substring(12, 16), hex.substring(16, 20), hex.substring(20, 32)].join('-');
};

describe('Season Tracking API - Validation Tests', () => {
  let api: ApiIntegrationTestHelper;
  const testOrgId = generateUUID();
  const parcelId = generateUUID();
  const seasonId = generateUUID();
  const basePath = `/api/v1/parcels/${parcelId}/seasons`;

  beforeAll(async () => {
    api = await setupRealApiIntegration(generateUUID());
  }, 60000);

  afterAll(async () => { await api.cleanup(); });

  it('should validate create season payload', async () => {
    const invalid = await api.post(basePath).set('x-organization-id', testOrgId).send({ saison: 2025 });
    const valid = await api.post(basePath).set('x-organization-id', testOrgId).send({ saison: '2025-2026' });
    expect(invalid.status).toBe(400);
    expect(valid.status).not.toBe(400);
  });

  it('should expose season listing and details', async () => {
    const list = await api.get(basePath).set('x-organization-id', testOrgId);
    const one = await api.get(`${basePath}/${seasonId}`).set('x-organization-id', testOrgId);
    expect(list.status).not.toBe(400);
    expect(one.status).not.toBe(400);
  });

  it('should validate close season payload', async () => {
    const invalid = await api.post(`${basePath}/${seasonId}/close`).set('x-organization-id', testOrgId).send({ rendement_reel_t_ha: -1, applications: 'bad-array' });
    const valid = await api.post(`${basePath}/${seasonId}/close`).set('x-organization-id', testOrgId).send({
      rendement_reel_t_ha: 5.2,
      rendement_reel_kg_arbre: 18,
      qualite_recolte: 'good',
      applications: [{ type: 'fertilizer' }],
    });
    expect(invalid.status).toBe(400);
    expect(valid.status).not.toBe(400);
  });
});
