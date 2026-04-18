import { setupRealApiIntegration, ApiIntegrationTestHelper } from '../../helpers/api-integration-test.helper';

const generateUUID = () => {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return [hex.substring(0, 8), hex.substring(8, 12), hex.substring(12, 16), hex.substring(16, 20), hex.substring(20, 32)].join('-');
};

describe('Entities/Demo Data API - Validation Tests', () => {
  let api: ApiIntegrationTestHelper;
  const testOrgId = generateUUID();
  const entitiesPath = `/api/v1/organizations/${testOrgId}/entities`;
  const demoDataPath = `/api/v1/organizations/${testOrgId}/demo-data`;

  beforeAll(async () => {
    api = await setupRealApiIntegration(generateUUID());
  }, 60000);

  afterAll(async () => { await api.cleanup(); });

  it('should validate entity registration payloads', async () => {
    const invalid = await api.post(`${entitiesPath}/register`).set('x-organization-id', testOrgId).send({ entityType: 123, entityId: true });
    const valid = await api.post(`${entitiesPath}/register`).set('x-organization-id', testOrgId).send({
      entityType: 'farm',
      entityId: generateUUID(),
      metadata: { name: 'Farm A' },
      tags: ['active'],
    });
    expect(invalid.status).not.toBe(404);
    expect(valid.status).not.toBe(404);
  });

  it('should validate entity event payloads and search endpoint', async () => {
    const entityId = generateUUID();
    const invalidEvent = await api.post(`${entitiesPath}/farm/${entityId}/events`).set('x-organization-id', testOrgId).send({ eventType: 777 });
    const validEvent = await api.post(`${entitiesPath}/farm/${entityId}/events`).set('x-organization-id', testOrgId).send({ eventType: 'inspection_completed' });
    const search = await api.get(`${entitiesPath}/search?searchTerm=farm&entityTypes=farm,parcel&limit=10`).set('x-organization-id', testOrgId);
    expect(invalidEvent.status).not.toBe(404);
    expect(validEvent.status).not.toBe(404);
    expect(search.status).not.toBe(400);
  });

  it('should expose demo-data control endpoints', async () => {
    const stats = await api.get(`${demoDataPath}/stats`).set('x-organization-id', testOrgId);
    const seed = await api.post(`${demoDataPath}/seed`).set('x-organization-id', testOrgId).send({});
    const clearDemoOnly = await api.delete(`${demoDataPath}/clear-demo-only`).set('x-organization-id', testOrgId);
    const importData = await api.post(`${demoDataPath}/import`).set('x-organization-id', testOrgId).send({ farms: [], parcels: [] });
    expect(stats.status).not.toBe(400);
    expect(seed.status).not.toBe(404);
    expect(clearDemoOnly.status).not.toBe(404);
    expect(importData.status).not.toBe(404);
  });
});
