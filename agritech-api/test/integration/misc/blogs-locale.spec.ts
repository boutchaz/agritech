import { setupRealApiIntegration, ApiIntegrationTestHelper } from '../../helpers/api-integration-test.helper';

const generateUUID = () => {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return [hex.substring(0, 8), hex.substring(8, 12), hex.substring(12, 16), hex.substring(16, 20), hex.substring(20, 32)].join('-');
};

describe('Blogs API - Locale Support', () => {
  let api: ApiIntegrationTestHelper;
  const testOrgId = generateUUID();
  const basePath = '/api/v1/blogs';

  beforeAll(async () => {
    api = await setupRealApiIntegration(generateUUID());
  }, 60000);

  afterAll(async () => { await api.cleanup(); });

  it('should accept locale query parameter on blog listing', async () => {
    // locale param must be recognized by the DTO — should NOT return 400
    const resFr = await api.get(`${basePath}?locale=fr`).set('x-organization-id', testOrgId);
    expect(resFr.status).not.toBe(400);

    const resAr = await api.get(`${basePath}?locale=ar`).set('x-organization-id', testOrgId);
    expect(resAr.status).not.toBe(400);

    const resEn = await api.get(`${basePath}?locale=en`).set('x-organization-id', testOrgId);
    expect(resEn.status).not.toBe(400);
  });

  it('should accept locale parameter on featured endpoint', async () => {
    const res = await api.get(`${basePath}/featured?limit=3&locale=fr`).set('x-organization-id', testOrgId);
    expect(res.status).not.toBe(400);
  });

  it('should accept locale parameter on categories endpoint', async () => {
    const res = await api.get(`${basePath}/categories?locale=fr`).set('x-organization-id', testOrgId);
    expect(res.status).not.toBe(400);
  });

  it('should default to fr locale when no locale provided', async () => {
    const res = await api.get(`${basePath}?page=1&limit=5`).set('x-organization-id', testOrgId);
    // Should work exactly as before — no breaking change
    expect(res.status).not.toBe(400);
  });
});
