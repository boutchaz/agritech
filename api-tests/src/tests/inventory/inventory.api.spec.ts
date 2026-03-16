import { test, expect } from '../../fixtures/auth.fixture';
import { testData } from '../../helpers/test-data';

test.describe('Items API @inventory @smoke', () => {
  let createdItemId: string;

  test('GET /items - should list items', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/items');

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('data');
  });

  test('POST /items - should create an item', async ({ authedRequest }) => {
    const response = await authedRequest.post('/api/v1/items', {
      data: testData.item(),
    });

    expect([200, 201]).toContain(response.status());
    const body = await response.json();
    expect(body).toHaveProperty('id');
    createdItemId = body.id;
  });

  test('GET /items/:id - should get item by id', async ({ authedRequest }) => {
    if (!createdItemId) test.skip();

    const response = await authedRequest.get(`/api/v1/items/${createdItemId}`);

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.id).toBe(createdItemId);
  });

  test('PATCH /items/:id - should update an item', async ({ authedRequest }) => {
    if (!createdItemId) test.skip();

    const response = await authedRequest.patch(`/api/v1/items/${createdItemId}`, {
      data: { item_name: `Updated Item ${Date.now()}` },
    });

    expect([200, 204]).toContain(response.status());
  });

  test('DELETE /items/:id - should delete an item', async ({ authedRequest }) => {
    if (!createdItemId) test.skip();

    const response = await authedRequest.delete(`/api/v1/items/${createdItemId}`);

    expect([200, 204]).toContain(response.status());
  });
});

test.describe('Warehouses API @inventory @smoke', () => {
  let createdWarehouseId: string;

  test('GET /warehouses - should list warehouses', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/warehouses');

    expect(response.status()).toBe(200);
  });

  test('POST /warehouses - should create a warehouse', async ({ authedRequest }) => {
    const response = await authedRequest.post('/api/v1/warehouses', {
      data: testData.warehouse(),
    });

    expect([200, 201]).toContain(response.status());
    const body = await response.json();
    if (body.id) createdWarehouseId = body.id;
  });

  test('GET /warehouses/:id - should get warehouse by id', async ({ authedRequest }) => {
    if (!createdWarehouseId) test.skip();

    const response = await authedRequest.get(`/api/v1/warehouses/${createdWarehouseId}`);

    expect(response.status()).toBe(200);
  });

  test('DELETE /warehouses/:id - should delete a warehouse', async ({ authedRequest }) => {
    if (!createdWarehouseId) test.skip();

    const response = await authedRequest.delete(`/api/v1/warehouses/${createdWarehouseId}`);

    expect([200, 204]).toContain(response.status());
  });
});

test.describe('Stock Entries API @inventory', () => {
  test('GET /stock-entries - should list stock entries', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/stock-entries');

    expect(response.status()).toBe(200);
  });
});
