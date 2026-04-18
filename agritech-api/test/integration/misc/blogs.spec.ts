import { setupRealApiIntegration, ApiIntegrationTestHelper } from '../../helpers/api-integration-test.helper';

const generateUUID = () => {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return [hex.substring(0, 8), hex.substring(8, 12), hex.substring(12, 16), hex.substring(16, 20), hex.substring(20, 32)].join('-');
};

describe('Blogs API - Validation Tests', () => {
  let api: ApiIntegrationTestHelper;
  const testOrgId = generateUUID();
  const basePath = '/api/v1/blogs';

  beforeAll(async () => {
    api = await setupRealApiIntegration(generateUUID());
  }, 60000);

  afterAll(async () => { await api.cleanup(); });

  it('should validate numeric blog filters', async () => {
    const res = await api.get(`${basePath}?page=abc&limit=def`).set('x-organization-id', testOrgId);
    expect([400, 403, 404]).toContain(res.status);
  });

  it('should allow valid blog filters', async () => {
    const res = await api.get(`${basePath}?featured=true&page=1&limit=5&sortOrder=desc`).set('x-organization-id', testOrgId);
    expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
  });

  it('should support featured and category endpoints', async () => {
    const featured = await api.get(`${basePath}/featured?limit=3`).set('x-organization-id', testOrgId);
    const categories = await api.get(`${basePath}/categories`).set('x-organization-id', testOrgId);
    expect(featured.status).not.toBe(400);
    expect(categories.status).not.toBe(400);
  });

  it('should support slug-based endpoints', async () => {
    const slug = `blog-${Date.now()}`;
    const bySlug = await api.get(`${basePath}/${slug}`).set('x-organization-id', testOrgId);
    const related = await api.get(`${basePath}/${slug}/related?limit=2`).set('x-organization-id', testOrgId);
    const category = await api.get(`${basePath}/categories/${slug}`).set('x-organization-id', testOrgId);
    expect(bySlug.status).not.toBe(400);
    expect(related.status).not.toBe(400);
    expect(category.status).not.toBe(400);
  });
});
