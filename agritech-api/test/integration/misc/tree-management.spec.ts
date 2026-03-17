import { setupRealApiIntegration, ApiIntegrationTestHelper } from '../../helpers/api-integration-test.helper';

const generateUUID = () => {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return [hex.substring(0, 8), hex.substring(8, 12), hex.substring(12, 16), hex.substring(16, 20), hex.substring(20, 32)].join('-');
};

describe('Tree Management API - Validation Tests', () => {
  let api: ApiIntegrationTestHelper;
  const testOrgId = generateUUID();
  const basePath = `/api/v1/organizations/${testOrgId}/tree-management`;

  beforeAll(async () => {
    api = await setupRealApiIntegration(generateUUID());
  }, 60000);

  afterAll(async () => { await api.cleanup(); });

  it('should validate category payloads', async () => {
    const invalid = await api.post(`${basePath}/categories`).set('x-organization-id', testOrgId).send({ category: 123 });
    const valid = await api.post(`${basePath}/categories`).set('x-organization-id', testOrgId).send({ category: `Category-${Date.now()}` });
    expect(invalid.status).toBe(400);
    expect(valid.status).not.toBe(400);
  });

  it('should validate tree payloads', async () => {
    const invalid = await api.post(`${basePath}/trees`).set('x-organization-id', testOrgId).send({ category_id: 'bad', name: 123 });
    const valid = await api.post(`${basePath}/trees`).set('x-organization-id', testOrgId).send({ category_id: generateUUID(), name: 'Olive Tree' });
    expect(invalid.status).toBe(400);
    expect(valid.status).not.toBe(400);
  });

  it('should validate plantation type payloads', async () => {
    const invalid = await api.post(`${basePath}/plantation-types`).set('x-organization-id', testOrgId).send({ type: 'Dense', spacing: '4x4', trees_per_ha: 0 });
    const valid = await api.post(`${basePath}/plantation-types`).set('x-organization-id', testOrgId).send({ type: 'Standard', spacing: '6x6', trees_per_ha: 278 });
    expect(invalid.status).toBe(400);
    expect(valid.status).not.toBe(400);
  });

  it('should expose list and mutation endpoints', async () => {
    const id = generateUUID();
    const listCategories = await api.get(`${basePath}/categories`).set('x-organization-id', testOrgId);
    const listTypes = await api.get(`${basePath}/plantation-types`).set('x-organization-id', testOrgId);
    const patchTree = await api.patch(`${basePath}/trees/${id}`).set('x-organization-id', testOrgId).send({ name: 'Updated Name' });
    expect(listCategories.status).not.toBe(400);
    expect(listTypes.status).not.toBe(400);
    expect(patchTree.status).not.toBe(400);
  });
});
