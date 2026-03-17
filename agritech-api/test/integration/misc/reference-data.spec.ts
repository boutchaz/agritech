import { setupRealApiIntegration, ApiIntegrationTestHelper } from '../../helpers/api-integration-test.helper';

const generateUUID = () => {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return [hex.substring(0, 8), hex.substring(8, 12), hex.substring(12, 16), hex.substring(16, 20), hex.substring(20, 32)].join('-');
};

describe('Reference Data/Utilities/Addons API - Validation Tests', () => {
  let api: ApiIntegrationTestHelper;
  const testOrgId = generateUUID();
  const farmId = generateUUID();

  beforeAll(async () => {
    api = await setupRealApiIntegration(generateUUID());
  }, 60000);

  afterAll(async () => { await api.cleanup(); });

  it('should expose major reference-data endpoints', async () => {
    const all = await api.get('/api/v1/reference-data/all?locale=en').set('x-organization-id', testOrgId);
    const trees = await api.get('/api/v1/reference-data/tree-categories?locale=fr').set('x-organization-id', testOrgId);
    const crops = await api.get('/api/v1/reference-data/crop-types?locale=ar').set('x-organization-id', testOrgId);
    const units = await api.get('/api/v1/reference-data/units-of-measure').set('x-organization-id', testOrgId);
    expect(all.status).not.toBe(400);
    expect(trees.status).not.toBe(400);
    expect(crops.status).not.toBe(400);
    expect(units.status).not.toBe(400);
  });

  it('should validate utility create payload and expose utility account lookup', async () => {
    const utilityBase = `/api/v1/organizations/${testOrgId}/farms/${farmId}/utilities`;
    const invalid = await api.post(utilityBase).set('x-organization-id', testOrgId).send({
      farm_id: farmId,
      type: 'invalid',
      amount: 'bad-number',
      billing_date: 'invalid-date',
    });
    const valid = await api.post(utilityBase).set('x-organization-id', testOrgId).send({
      farm_id: farmId,
      type: 'electricity',
      amount: 240.5,
      billing_date: '2025-02-10',
      payment_status: 'pending',
      is_recurring: true,
    });
    const accountLookup = await api.get(`${utilityBase}/accounts/by-type?accountType=Expense&accountSubtype=Operating Expense`).set('x-organization-id', testOrgId);
    expect(invalid.status).toBe(400);
    expect(valid.status).not.toBe(400);
    expect(accountLookup.status).not.toBe(400);
  });

  it('should validate addon and product application payloads', async () => {
    const invalidAddon = await api.post('/api/v1/addons/purchase').set('x-organization-id', testOrgId).send({ module_id: 'bad-id' });
    const validAddon = await api.post('/api/v1/addons/purchase').set('x-organization-id', testOrgId).send({ module_id: generateUUID() });

    const invalidProductApplication = await api.post('/api/v1/product-applications').set('x-organization-id', testOrgId).send({
      product_id: 'bad',
      application_date: 'bad',
      quantity_used: 'x',
    });
    const validProductApplication = await api.post('/api/v1/product-applications').set('x-organization-id', testOrgId).send({
      product_id: generateUUID(),
      farm_id: farmId,
      application_date: '2025-03-05',
      quantity_used: 12,
      area_treated: 3.5,
    });

    expect(invalidAddon.status).toBe(400);
    expect(validAddon.status).not.toBe(400);
    expect(invalidProductApplication.status).toBe(400);
    expect(validProductApplication.status).not.toBe(400);
  });

  it('should expose addon/product listing and product image endpoints', async () => {
    const addons = await api.get('/api/v1/addons').set('x-organization-id', testOrgId);
    const applications = await api.get('/api/v1/product-applications').set('x-organization-id', testOrgId);
    const availableProducts = await api.get('/api/v1/product-applications/available-products').set('x-organization-id', testOrgId);
    const productImage = await api.get('/api/v1/products/images/sample.png');
    expect(addons.status).not.toBe(400);
    expect(applications.status).not.toBe(400);
    expect(availableProducts.status).not.toBe(400);
    expect(productImage.status).not.toBe(400);
  });
});
