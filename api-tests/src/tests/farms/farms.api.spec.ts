import { test, expect } from '../../fixtures/auth.fixture';
import { testData } from '../../helpers/test-data';

test.describe('Farms API @farms @smoke', () => {
  test('GET /farms - should list farms', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/farms');

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body)).toBe(true);
  });

  test('GET /farms/roles/available - should list available farm roles', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/farms/roles/available');

    expect(response.status()).toBe(200);
  });

  test('POST /farms/import - should create a farm', async ({ authedRequest }) => {
    const response = await authedRequest.post('/api/v1/farms/import', {
      data: testData.farm(),
    });

    expect([200, 201]).toContain(response.status());
    const body = await response.json();
    expect(body).toHaveProperty('id');
  });

  test('GET /farms - should include newly created farm', async ({ authedRequest }) => {
    const createRes = await authedRequest.post('/api/v1/farms/import', {
      data: testData.farm({ name: `List-Check Farm ${Date.now()}` }),
    });
    const created = await createRes.json();

    const listRes = await authedRequest.get('/api/v1/farms');
    const farms = await listRes.json();

    expect(farms.some((f: { id: string }) => f.id === created.id)).toBe(true);
  });
});

test.describe('Parcels API @farms @smoke', () => {
  let farmId: string;

  test.beforeAll(async ({ authedRequest }) => {
    const res = await authedRequest.post('/api/v1/farms/import', {
      data: testData.farm({ name: `Parcel-Test Farm ${Date.now()}` }),
    });
    const farm = await res.json();
    farmId = farm.id;
  });

  test('GET /parcels - should list parcels', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/parcels');

    expect(response.status()).toBe(200);
  });

  test('POST /parcels - should create a parcel', async ({ authedRequest }) => {
    const response = await authedRequest.post('/api/v1/parcels', {
      data: testData.parcel(farmId),
    });

    expect([200, 201]).toContain(response.status());
  });

  test('GET /parcels - should reject unauthenticated request', async ({ request }) => {
    const response = await request.get('/api/v1/parcels');

    expect(response.status()).toBe(401);
  });
});

test.describe('Structures API @farms', () => {
  test('GET /structures - should list structures', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/structures');

    expect(response.status()).toBe(200);
  });
});
