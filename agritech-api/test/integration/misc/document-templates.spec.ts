import { setupRealApiIntegration, ApiIntegrationTestHelper } from '../../helpers/api-integration-test.helper';

const generateUUID = () => {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return [hex.substring(0, 8), hex.substring(8, 12), hex.substring(12, 16), hex.substring(16, 20), hex.substring(20, 32)].join('-');
};

describe('Document Templates API - Validation Tests', () => {
  let api: ApiIntegrationTestHelper;
  const testOrgId = generateUUID();
  const basePath = `/api/v1/organizations/${testOrgId}/document-templates`;
  const templateId = generateUUID();

  beforeAll(async () => {
    api = await setupRealApiIntegration(generateUUID());
  }, 60000);

  afterAll(async () => { await api.cleanup(); });

  it('should validate create template payload', async () => {
    const invalid = await api.post(basePath).set('x-organization-id', testOrgId).send({ name: '', document_type: 'unknown', html_content: 10 });
    const valid = await api.post(basePath).set('x-organization-id', testOrgId).send({
      name: `Invoice Template ${Date.now()}`,
      document_type: 'invoice',
      html_content: '<h1>Invoice</h1>',
      css_styles: 'h1{color:#111;}',
      is_default: true,
    });
    expect(invalid.status).toBe(400);
    expect(valid.status).not.toBe(400);
  });

  it('should validate update template payload', async () => {
    const invalid = await api.patch(`${basePath}/${templateId}`).set('x-organization-id', testOrgId).send({ document_type: 'bad-type', is_default: 'yes' });
    const valid = await api.patch(`${basePath}/${templateId}`).set('x-organization-id', testOrgId).send({ name: 'Updated Template', is_active: true });
    expect(invalid.status).toBe(400);
    expect(valid.status).not.toBe(400);
  });

  it('should expose template retrieval/action endpoints', async () => {
    const list = await api.get(`${basePath}?document_type=invoice`).set('x-organization-id', testOrgId);
    const one = await api.get(`${basePath}/${templateId}`).set('x-organization-id', testOrgId);
    const setDefault = await api.post(`${basePath}/${templateId}/set-default`).set('x-organization-id', testOrgId).send({});
    const duplicate = await api.post(`${basePath}/${templateId}/duplicate`).set('x-organization-id', testOrgId).send({ name: 'Copy Template' });
    expect(list.status).not.toBe(400);
    expect(one.status).not.toBe(400);
    expect(setDefault.status).not.toBe(400);
    expect(duplicate.status).not.toBe(400);
  });
});
