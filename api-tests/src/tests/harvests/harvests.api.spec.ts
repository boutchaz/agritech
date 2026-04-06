import { test, expect } from '../../fixtures/auth.fixture';

test.describe('Harvests API @harvests @smoke', () => {
  test('GET /harvests - should list harvests', async ({ authedRequest, organizationId }) => {
    const response = await authedRequest.get(`/api/v1/organizations/${organizationId}/harvests`);

    expect(response.status()).toBe(200);
  });

  test('POST /harvests - should reject harvest without parcel_id', async ({ authedRequest, organizationId }) => {
    const response = await authedRequest.post(`/api/v1/organizations/${organizationId}/harvests`, {
      data: { crop_type: 'tomatoes', quantity: 100, unit: 'kg' },
    });

    expect(response.status()).toBe(400);
  });

  test('GET /harvests - should reject unauthenticated', async ({ request }) => {
    const response = await request.get('/api/v1/organizations/test-org/harvests');

    expect([401, 403]).toContain(response.status());
  });
});

test.describe('Reception Batches API @harvests @smoke', () => {
  test('GET /reception-batches - should list reception batches', async ({ authedRequest, organizationId }) => {
    const response = await authedRequest.get(`/api/v1/organizations/${organizationId}/reception-batches`);

    expect(response.status()).toBe(200);
  });
});

test.describe('Deliveries API @harvests', () => {
  test('GET /deliveries - should list deliveries', async ({ authedRequest, organizationId }) => {
    const response = await authedRequest.get(`/api/v1/organizations/${organizationId}/deliveries`);

    expect(response.status()).toBe(200);
  });
});

test.describe('Harvest Events API @harvests', () => {
  test('GET /harvest-events/cycle/:cropCycleId - should handle missing cycle', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/harvest-events/cycle/00000000-0000-0000-0000-000000000000');

    expect([200, 404]).toContain(response.status());
  });

  test('GET /harvest-events/cycle/:cropCycleId/stats - should handle missing cycle', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/harvest-events/cycle/00000000-0000-0000-0000-000000000000/stats');

    expect([200, 404]).toContain(response.status());
  });
});

test.describe('Quality Control API @harvests', () => {
  test('GET /quality-control - should list quality inspections', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/quality-control');

    expect(response.status()).toBe(200);
  });

  test('GET /quality-control/statistics - should return quality statistics', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/quality-control/statistics');

    expect(response.status()).toBe(200);
  });
});

test.describe('Crop Cycles API @harvests', () => {
  test('GET /crop-cycles - should list crop cycles', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/crop-cycles');

    expect(response.status()).toBe(200);
  });

  test('GET /crop-cycles/statistics - should return crop cycle statistics', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/crop-cycles/statistics');

    expect(response.status()).toBe(200);
  });
});

test.describe('Crop Cycle Stages API @harvests', () => {
  test('GET /crop-cycle-stages/cycle/:cropCycleId - should handle missing cycle', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/crop-cycle-stages/cycle/00000000-0000-0000-0000-000000000000');

    expect([200, 404]).toContain(response.status());
  });
});

test.describe('Crops API @harvests', () => {
  test('GET /crops - should list crops', async ({ authedRequest, organizationId }) => {
    const response = await authedRequest.get(`/api/v1/organizations/${organizationId}/crops`);

    expect(response.status()).toBe(200);
  });
});

test.describe('Product Applications API @harvests', () => {
  test('GET /product-applications - should list product applications', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/product-applications');

    expect(response.status()).toBe(200);
  });

  test('GET /product-applications/available-products - should list available products', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/product-applications/available-products');

    expect(response.status()).toBe(200);
  });
});
