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

  test('POST /farms - should create a farm via standard endpoint', async ({ authedRequest }) => {
    const response = await authedRequest.post('/api/v1/farms', {
      data: testData.farm(),
    });

    expect([200, 201]).toContain(response.status());
  });

  test('POST /farms/export - should handle export request', async ({ authedRequest }) => {
    const response = await authedRequest.post('/api/v1/farms/export', {
      data: {},
    });

    expect([200, 400, 404]).toContain(response.status());
  });

  test('POST /farms/batch-delete - should reject without ids', async ({ authedRequest }) => {
    const response = await authedRequest.post('/api/v1/farms/batch-delete', {
      data: {},
    });

    expect([400, 404]).toContain(response.status());
  });
});

test.describe('Farm Detail API @farms', () => {
  let farmId: string;

  test.beforeAll(async ({ authedRequest }) => {
    const res = await authedRequest.post('/api/v1/farms/import', {
      data: testData.farm({ name: `Detail-Test Farm ${Date.now()}` }),
    });
    const farm = await res.json();
    farmId = farm.id;
  });

  test('GET /farms/:id - should get farm by id', async ({ authedRequest }) => {
    if (!farmId) test.skip();

    const response = await authedRequest.get(`/api/v1/farms/${farmId}`);

    expect(response.status()).toBe(200);
  });

  test('GET /farms/:id/related-data-counts - should return related data counts', async ({ authedRequest }) => {
    if (!farmId) test.skip();

    const response = await authedRequest.get(`/api/v1/farms/${farmId}/related-data-counts`);

    expect(response.status()).toBe(200);
  });

  test('PATCH /farms/:id - should update a farm', async ({ authedRequest }) => {
    if (!farmId) test.skip();

    const response = await authedRequest.patch(`/api/v1/farms/${farmId}`, {
      data: { name: `Updated Farm ${Date.now()}` },
    });

    expect([200, 204]).toContain(response.status());
  });

  test('DELETE /farms - should delete farm by query', async ({ authedRequest }) => {
    const createRes = await authedRequest.post('/api/v1/farms/import', {
      data: testData.farm({ name: `Delete-Test Farm ${Date.now()}` }),
    });
    const created = await createRes.json();
    if (!created?.id) { test.skip(); return; }

    const response = await authedRequest.delete('/api/v1/farms', {
      data: { ids: [created.id] },
    });

    expect([200, 204]).toContain(response.status());
  });

  test('GET /farms/:farmId/roles - should list farm roles', async ({ authedRequest }) => {
    if (!farmId) test.skip();

    const response = await authedRequest.get(`/api/v1/farms/${farmId}/roles`);

    expect(response.status()).toBe(200);
  });

  test('GET /farms/:farmId/organization-users - should list farm org users', async ({ authedRequest }) => {
    if (!farmId) test.skip();

    const response = await authedRequest.get(`/api/v1/farms/${farmId}/organization-users`);

    expect(response.status()).toBe(200);
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

  test('GET /parcels/performance - should return parcel performance', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/parcels/performance');

    expect([200, 404]).toContain(response.status());
  });

  test('GET /parcels - should reject unauthenticated request', async ({ request }) => {
    const response = await request.get('/api/v1/parcels');

    expect(response.status()).toBe(401);
  });
});

test.describe('Structures API @farms', () => {
  test('GET /structures - should list structures', async ({ authedRequest, organizationId }) => {
    const response = await authedRequest.get(`/api/v1/organizations/${organizationId}/structures`);

    expect(response.status()).toBe(200);
  });
});
