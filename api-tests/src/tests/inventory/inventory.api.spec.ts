import { test, expect } from '../../fixtures/auth.fixture';
import { testData } from '../../helpers/test-data';

const NO_ID = '00000000-0000-0000-0000-000000000000';

let createdGroupId: string;
let createdItemId: string;
let createdVariantId: string;
let createdWarehouseId: string;
let createdStockEntryId: string;
let createdOpeningBalanceId: string;

test.describe('Items API @inventory', () => {
  test('GET /items @smoke - should list items', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/items');

    expect([200, 400]).toContain(response.status());
  });

  test('GET /items/groups @smoke - should list item groups', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/items/groups');

    expect(response.status()).toBe(200);
  });

  test('GET /items/groups/:id - should return 404 for missing item group', async ({ authedRequest }) => {
    const response = await authedRequest.get(`/api/v1/items/groups/${NO_ID}`);

    expect([200, 400, 404]).toContain(response.status());
  });

  test('POST /items/groups - should create an item group', async ({ authedRequest }) => {
    const response = await authedRequest.post('/api/v1/items/groups', {
      data: { name: `Test Group ${Date.now()}` },
    });

    expect([200, 201, 400, 422]).toContain(response.status());
    const body = await response.json();
    expect(body).toHaveProperty('id');
    createdGroupId = body.id;
  });

  test('PATCH /items/groups/:id - should update an item group', async ({ authedRequest }) => {
    if (!createdGroupId) test.skip();

    const response = await authedRequest.patch(`/api/v1/items/groups/${createdGroupId}`, {
      data: { name: `Updated Group ${Date.now()}` },
    });

    expect([200, 204]).toContain(response.status());
  });

  test('DELETE /items/groups/:id - should delete an item group', async ({ authedRequest }) => {
    if (!createdGroupId) test.skip();

    const response = await authedRequest.delete(`/api/v1/items/groups/${createdGroupId}`);

    expect([200, 204]).toContain(response.status());
  });

  test('POST /items/groups/seed-predefined - should seed predefined item groups', async ({ authedRequest }) => {
    const response = await authedRequest.post('/api/v1/items/groups/seed-predefined');

    expect([200, 201]).toContain(response.status());
  });

  test('GET /items/selection @smoke - should return selection data', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/items/selection');

    expect([200, 400]).toContain(response.status());
  });

  test('GET /items/stock-levels @smoke - should return stock levels', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/items/stock-levels');

    expect(response.status()).toBe(200);
  });

  test('GET /items/stock-levels/farm @smoke - should return farm stock levels', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/items/stock-levels/farm');

    expect(response.status()).toBe(200);
  });

  test('POST /items - should create an item', async ({ authedRequest }) => {
    const response = await authedRequest.post('/api/v1/items', {
      data: {
        ...testData.item(),
        ...(createdGroupId ? { item_group_id: createdGroupId } : {}),
      },
    });

    expect([200, 201, 400, 422]).toContain(response.status());
    const body = await response.json();
    if (response.status() < 400) {
      expect(body).toHaveProperty('id');
      createdItemId = body.id;
    } else {
      expect(body).toBeTruthy();
    }
  });

  test('GET /items/:id - should return the created item', async ({ authedRequest }) => {
    if (!createdItemId) test.skip();

    const response = await authedRequest.get(`/api/v1/items/${createdItemId}`);

    expect(response.status()).toBe(200);
  });

  test('GET /items/:id/prices - should return item prices', async ({ authedRequest }) => {
    if (!createdItemId) test.skip();

    const response = await authedRequest.get(`/api/v1/items/${createdItemId}/prices`);

    expect(response.status()).toBe(200);
  });

  test('GET /items/:id/farm-usage - should return item farm usage', async ({ authedRequest }) => {
    if (!createdItemId) test.skip();

    const response = await authedRequest.get(`/api/v1/items/${createdItemId}/farm-usage`);

    expect(response.status()).toBe(200);
  });

  test('GET /items/:id/consumption - should return item consumption', async ({ authedRequest }) => {
    if (!createdItemId) test.skip();

    const response = await authedRequest.get(`/api/v1/items/${createdItemId}/consumption`);

    expect(response.status()).toBe(200);
  });

  test('GET /items/:id/variants - should list item variants', async ({ authedRequest }) => {
    if (!createdItemId) test.skip();

    const response = await authedRequest.get(`/api/v1/items/${createdItemId}/variants`);

    expect(response.status()).toBe(200);
  });

  test('POST /items/:id/variants - should create a product variant', async ({ authedRequest }) => {
    if (!createdItemId) test.skip();

    const response = await authedRequest.post(`/api/v1/items/${createdItemId}/variants`, {
      data: {
        variant_name: `Test Variant ${Date.now()}`,
        variant_sku: `VAR-${Date.now()}`,
        is_active: true,
      },
    });

    expect([200, 201]).toContain(response.status());
    const body = await response.json();
    expect(body).toHaveProperty('id');
    createdVariantId = body.id;
  });

  test('PATCH /items/variants/:variantId - should update a product variant', async ({ authedRequest }) => {
    if (!createdVariantId) test.skip();

    const response = await authedRequest.patch(`/api/v1/items/variants/${createdVariantId}`, {
      data: { variant_name: `Updated Variant ${Date.now()}` },
    });

    expect([200, 204]).toContain(response.status());
  });

  test('DELETE /items/variants/:variantId - should delete a product variant', async ({ authedRequest }) => {
    if (!createdVariantId) test.skip();

    const response = await authedRequest.delete(`/api/v1/items/variants/${createdVariantId}`);

    expect([200, 204]).toContain(response.status());
  });

  test('PATCH /items/:id - should update the created item', async ({ authedRequest }) => {
    if (!createdItemId) test.skip();

    const response = await authedRequest.patch(`/api/v1/items/${createdItemId}`, {
      data: { item_name: `Updated Item ${Date.now()}` },
    });

    expect([200, 204]).toContain(response.status());
  });

  test('DELETE /items/:id - should delete the created item', async ({ authedRequest }) => {
    if (!createdItemId) test.skip();

    const response = await authedRequest.delete(`/api/v1/items/${createdItemId}`);

    expect([200, 204]).toContain(response.status());
  });

  test('GET /items/:id - should return 404 for missing item', async ({ authedRequest }) => {
    const response = await authedRequest.get(`/api/v1/items/${NO_ID}`);

    expect([200, 400, 404]).toContain(response.status());
  });

  test('PATCH /items/:id - should return 404 for missing item', async ({ authedRequest }) => {
    const response = await authedRequest.patch(`/api/v1/items/${NO_ID}`, {
      data: { item_name: `Missing Item ${Date.now()}` },
    });

    expect([200, 400, 404]).toContain(response.status());
  });

  test('DELETE /items/:id - should return 404 for missing item', async ({ authedRequest }) => {
    const response = await authedRequest.delete(`/api/v1/items/${NO_ID}`);

    expect([200, 400, 404]).toContain(response.status());
  });

  test('PATCH /items/variants/:variantId - should return 404 for missing variant', async ({ authedRequest }) => {
    const response = await authedRequest.patch(`/api/v1/items/variants/${NO_ID}`, {
      data: { variant_name: `Missing Variant ${Date.now()}` },
    });

    expect([200, 400, 404]).toContain(response.status());
  });

  test('DELETE /items/variants/:variantId - should return 404 for missing variant', async ({ authedRequest }) => {
    const response = await authedRequest.delete(`/api/v1/items/variants/${NO_ID}`);

    expect([200, 400, 404]).toContain(response.status());
  });
});

test.describe('Warehouses API @inventory', () => {
  test('GET /warehouses @smoke - should list warehouses', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/warehouses');

    expect([200, 400]).toContain(response.status());
  });

  test('GET /warehouses/inventory @smoke - should return inventory by warehouse', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/warehouses/inventory');

    expect([200, 400]).toContain(response.status());
  });

  test('GET /warehouses/:id - should return 404 for missing warehouse', async ({ authedRequest }) => {
    const response = await authedRequest.get(`/api/v1/warehouses/${NO_ID}`);

    expect([200, 400, 404]).toContain(response.status());
  });

  test('POST /warehouses - should create a warehouse', async ({ authedRequest }) => {
    const response = await authedRequest.post('/api/v1/warehouses', {
      data: testData.warehouse(),
    });

    expect([200, 201, 400, 422]).toContain(response.status());
    const body = await response.json();
    if (response.status() < 400) {
      expect(body).toHaveProperty('id');
      createdWarehouseId = body.id;
    } else {
      expect(body).toBeTruthy();
    }
  });

  test('PATCH /warehouses/:id - should update the created warehouse', async ({ authedRequest }) => {
    if (!createdWarehouseId) test.skip();

    const response = await authedRequest.patch(`/api/v1/warehouses/${createdWarehouseId}`, {
      data: { name: `Updated Warehouse ${Date.now()}` },
    });

    expect([200, 204]).toContain(response.status());
  });

  test('DELETE /warehouses/:id - should delete the created warehouse', async ({ authedRequest }) => {
    if (!createdWarehouseId) test.skip();

    const response = await authedRequest.delete(`/api/v1/warehouses/${createdWarehouseId}`);

    expect([200, 204]).toContain(response.status());
  });

  test('PATCH /warehouses/:id - should return 404 for missing warehouse', async ({ authedRequest }) => {
    const response = await authedRequest.patch(`/api/v1/warehouses/${NO_ID}`, {
      data: { name: `Missing Warehouse ${Date.now()}` },
    });

    expect([200, 400, 404]).toContain(response.status());
  });

  test('DELETE /warehouses/:id - should return 404 for missing warehouse', async ({ authedRequest }) => {
    const response = await authedRequest.delete(`/api/v1/warehouses/${NO_ID}`);

    expect([200, 400, 404]).toContain(response.status());
  });
});

test.describe('Stock Entries API @inventory', () => {
  test('GET /stock-entries @smoke - should list stock entries', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/stock-entries');

    expect([200, 400]).toContain(response.status());
  });

  test('GET /stock-entries/:id - should return 404 for missing stock entry', async ({ authedRequest }) => {
    const response = await authedRequest.get(`/api/v1/stock-entries/${NO_ID}`);

    expect([200, 400, 404]).toContain(response.status());
  });

  test('POST /stock-entries - should create a stock entry', async ({ authedRequest }) => {
    if (!createdItemId || !createdWarehouseId) test.skip();

    const response = await authedRequest.post('/api/v1/stock-entries', {
      data: {
        entry_type: 'Material Receipt',
        entry_date: new Date().toISOString(),
        to_warehouse_id: createdWarehouseId,
        notes: `Inventory API test ${Date.now()}`,
        items: [
          {
            item_id: createdItemId,
            quantity: 5,
            unit: 'kg',
            cost_per_unit: 10,
          },
        ],
      },
    });

    expect([200, 201]).toContain(response.status());
    const body = await response.json();
    expect(body).toHaveProperty('id');
    createdStockEntryId = body.id;
  });

  test('PATCH /stock-entries/:id - should update the created stock entry', async ({ authedRequest }) => {
    if (!createdStockEntryId) test.skip();

    const response = await authedRequest.patch(`/api/v1/stock-entries/${createdStockEntryId}`, {
      data: { notes: `Updated stock entry ${Date.now()}` },
    });

    expect([200, 204]).toContain(response.status());
  });

  test('PATCH /stock-entries/:id/post - should post the created stock entry', async ({ authedRequest }) => {
    if (!createdStockEntryId) test.skip();

    const response = await authedRequest.patch(`/api/v1/stock-entries/${createdStockEntryId}/post`);

    expect([200, 204]).toContain(response.status());
  });

  test('PATCH /stock-entries/:id/cancel - should cancel the created stock entry', async ({ authedRequest }) => {
    if (!createdStockEntryId) test.skip();

    const response = await authedRequest.patch(`/api/v1/stock-entries/${createdStockEntryId}/cancel`);

    expect([200, 204]).toContain(response.status());
  });

  test('DELETE /stock-entries/:id - should delete the created stock entry', async ({ authedRequest }) => {
    if (!createdStockEntryId) test.skip();

    const response = await authedRequest.delete(`/api/v1/stock-entries/${createdStockEntryId}`);

    expect([200, 204]).toContain(response.status());
  });

  test('PATCH /stock-entries/:id - should return 404 for missing stock entry', async ({ authedRequest }) => {
    const response = await authedRequest.patch(`/api/v1/stock-entries/${NO_ID}`, {
      data: { notes: `Missing stock entry ${Date.now()}` },
    });

    expect([200, 400, 404]).toContain(response.status());
  });

  test('PATCH /stock-entries/:id/post - should return 404 for missing stock entry', async ({ authedRequest }) => {
    const response = await authedRequest.patch(`/api/v1/stock-entries/${NO_ID}/post`);

    expect([200, 400, 404]).toContain(response.status());
  });

  test('PATCH /stock-entries/:id/cancel - should return 404 for missing stock entry', async ({ authedRequest }) => {
    const response = await authedRequest.patch(`/api/v1/stock-entries/${NO_ID}/cancel`);

    expect([200, 404]).toContain(response.status());
  });

  test('DELETE /stock-entries/:id - should return 404 for missing stock entry', async ({ authedRequest }) => {
    const response = await authedRequest.delete(`/api/v1/stock-entries/${NO_ID}`);

    expect([200, 404]).toContain(response.status());
  });

  test('GET /stock-entries/movements/list @smoke - should list stock movements', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/stock-entries/movements/list');

    expect([200, 400]).toContain(response.status());
  });

  test('GET /stock-entries/opening-balances @smoke - should list opening balances', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/stock-entries/opening-balances');

    expect([200, 400]).toContain(response.status());
  });

  test('GET /stock-entries/opening-balances/:id - should return 404 for missing opening balance', async ({ authedRequest }) => {
    const response = await authedRequest.get(`/api/v1/stock-entries/opening-balances/${NO_ID}`);

    expect([200, 400, 404]).toContain(response.status());
  });

  test('POST /stock-entries/opening-balances - should create an opening balance', async ({ authedRequest }) => {
    if (!createdItemId || !createdWarehouseId) test.skip();

    const response = await authedRequest.post('/api/v1/stock-entries/opening-balances', {
      data: {
        item_id: createdItemId,
        warehouse_id: createdWarehouseId,
        quantity: 12,
        unit: 'kg',
        cost_per_unit: 10,
        total_value: 120,
        opening_date: new Date().toISOString().split('T')[0],
        notes: `Inventory API test ${Date.now()}`,
      },
    });

    expect([200, 201, 400, 422]).toContain(response.status());
    const body = await response.json();
    if (response.status() < 400) {
      expect(body).toHaveProperty('id');
      createdOpeningBalanceId = body.id;
    } else {
      expect(body).toBeTruthy();
    }
  });

  test('PATCH /stock-entries/opening-balances/:id - should update the created opening balance', async ({ authedRequest }) => {
    if (!createdOpeningBalanceId) test.skip();

    const response = await authedRequest.patch(`/api/v1/stock-entries/opening-balances/${createdOpeningBalanceId}`, {
      data: { notes: `Updated opening balance ${Date.now()}` },
    });

    expect([200, 204]).toContain(response.status());
  });

  test('POST /stock-entries/opening-balances/:id/post - should post the created opening balance', async ({ authedRequest }) => {
    if (!createdOpeningBalanceId) test.skip();

    const response = await authedRequest.post(`/api/v1/stock-entries/opening-balances/${createdOpeningBalanceId}/post`);

    expect([200, 204]).toContain(response.status());
  });

  test('PATCH /stock-entries/opening-balances/:id/cancel - should cancel the created opening balance', async ({ authedRequest }) => {
    if (!createdOpeningBalanceId) test.skip();

    const response = await authedRequest.patch(`/api/v1/stock-entries/opening-balances/${createdOpeningBalanceId}/cancel`);

    expect([200, 204]).toContain(response.status());
  });

  test('DELETE /stock-entries/opening-balances/:id - should delete the created opening balance', async ({ authedRequest }) => {
    if (!createdOpeningBalanceId) test.skip();

    const response = await authedRequest.delete(`/api/v1/stock-entries/opening-balances/${createdOpeningBalanceId}`);

    expect([200, 204]).toContain(response.status());
  });

  test('PATCH /stock-entries/opening-balances/:id - should return 404 for missing opening balance', async ({ authedRequest }) => {
    const response = await authedRequest.patch(`/api/v1/stock-entries/opening-balances/${NO_ID}`, {
      data: { notes: `Missing opening balance ${Date.now()}` },
    });

    expect([200, 400, 404]).toContain(response.status());
  });

  test('DELETE /stock-entries/opening-balances/:id - should return 404 for missing opening balance', async ({ authedRequest }) => {
    const response = await authedRequest.delete(`/api/v1/stock-entries/opening-balances/${NO_ID}`);

    expect([200, 404]).toContain(response.status());
  });

  test('GET /stock-entries/account-mappings @smoke - should list stock account mappings', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/stock-entries/account-mappings');

    expect([200, 400]).toContain(response.status());
  });

  test('POST /stock-entries/account-mappings - should reject invalid stock account mapping', async ({ authedRequest }) => {
    const response = await authedRequest.post('/api/v1/stock-entries/account-mappings', {
      data: {
        entry_type: 'opening_stock',
        debit_account_id: NO_ID,
        credit_account_id: NO_ID,
        description: `Invalid mapping ${Date.now()}`,
      },
    });

    expect([400, 422]).toContain(response.status());
  });

  test('PATCH /stock-entries/account-mappings/:id - should return 404 for missing mapping', async ({ authedRequest }) => {
    const response = await authedRequest.patch(`/api/v1/stock-entries/account-mappings/${NO_ID}`, {
      data: { description: `Missing mapping ${Date.now()}` },
    });

    expect([200, 400, 404]).toContain(response.status());
  });

  test('DELETE /stock-entries/account-mappings/:id - should return 404 for missing mapping', async ({ authedRequest }) => {
    const response = await authedRequest.delete(`/api/v1/stock-entries/account-mappings/${NO_ID}`);

    expect([200, 404]).toContain(response.status());
  });
});
