import { setupRealApiIntegration, ApiIntegrationTestHelper } from '../../helpers/api-integration-test.helper';

const generateUUID = () => {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return [hex.substring(0, 8), hex.substring(8, 12), hex.substring(12, 16), hex.substring(16, 20), hex.substring(20, 32)].join('-');
};

describe('Lab Services API - Validation Tests', () => {
  let api: ApiIntegrationTestHelper;
  const testOrgId = generateUUID();
  const orgPath = `/api/v1/organizations/${testOrgId}/lab-services`;
  const orderId = generateUUID();
  const recommendationId = generateUUID();
  const scheduleId = generateUUID();

  beforeAll(async () => {
    api = await setupRealApiIntegration(generateUUID());
  }, 60000);

  afterAll(async () => { await api.cleanup(); });

  it('should validate order payloads', async () => {
    const invalid = await api.post(`${orgPath}/orders`).set('x-organization-id', testOrgId).send({ service_type_id: 'bad' });
    const valid = await api.post(`${orgPath}/orders`).set('x-organization-id', testOrgId).send({
      service_type_id: generateUUID(),
      provider_id: generateUUID(),
      status: 'pending',
      cost: 120,
    });
    expect(invalid.status).toBe(400);
    expect(valid.status).not.toBe(400);
  });

  it('should validate result parameter payloads', async () => {
    const invalid = await api.post(`${orgPath}/orders/${orderId}/results`).set('x-organization-id', testOrgId).send({ parameters: [{ order_id: 'bad' }] });
    const valid = await api.post(`${orgPath}/orders/${orderId}/results`).set('x-organization-id', testOrgId).send({
      parameters: [{ order_id: orderId, parameter_name: 'pH', value: 6.5, unit: 'pH' }],
    });
    expect(invalid.status).toBe(400);
    expect(valid.status).not.toBe(400);
  });

  it('should validate recommendation payloads', async () => {
    const invalid = await api.post(`${orgPath}/recommendations`).set('x-organization-id', testOrgId).send({ order_id: 'bad', title: 123 });
    const valid = await api.post(`${orgPath}/recommendations`).set('x-organization-id', testOrgId).send({
      order_id: orderId,
      parcel_id: generateUUID(),
      title: 'Adjust nutrient plan',
      priority: 2,
      status: 'pending',
    });
    const patch = await api.patch(`${orgPath}/recommendations/${recommendationId}`).set('x-organization-id', testOrgId).send({ status: 'completed' });
    expect(invalid.status).toBe(400);
    expect(valid.status).not.toBe(400);
    expect(patch.status).not.toBe(400);
  });

  it('should validate schedule payloads and filters', async () => {
    const invalid = await api.post(`${orgPath}/schedules`).set('x-organization-id', testOrgId).send({ next_collection_date: 'bad-date' });
    const valid = await api.post(`${orgPath}/schedules`).set('x-organization-id', testOrgId).send({
      service_type_id: generateUUID(),
      name: 'Monthly soil sample',
      next_collection_date: '2025-12-20',
      frequency: 'monthly',
    });
    const list = await api.get(`${orgPath}/schedules?farmId=${generateUUID()}`).set('x-organization-id', testOrgId);
    const patch = await api.patch(`${orgPath}/schedules/${scheduleId}`).set('x-organization-id', testOrgId).send({ is_active: false });
    expect(invalid.status).toBe(400);
    expect(valid.status).not.toBe(400);
    expect(list.status).not.toBe(400);
    expect(patch.status).not.toBe(400);
  });

  it('should expose providers and service types endpoints', async () => {
    const providers = await api.get('/api/v1/lab-services/providers').set('x-organization-id', testOrgId);
    const types = await api.get('/api/v1/lab-services/types?category=soil').set('x-organization-id', testOrgId);
    expect(providers.status).not.toBe(400);
    expect(types.status).not.toBe(400);
  });
});
