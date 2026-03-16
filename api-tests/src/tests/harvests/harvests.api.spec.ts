import { test, expect } from '../../fixtures/auth.fixture';

test.describe('Harvests API @harvests @smoke', () => {
  test('GET /harvests - should list harvests', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/harvests');

    expect(response.status()).toBe(200);
  });

  test('POST /harvests - should reject harvest without parcel_id', async ({ authedRequest }) => {
    const response = await authedRequest.post('/api/v1/harvests', {
      data: {
        crop_type: 'tomatoes',
        quantity: 100,
        unit: 'kg',
      },
    });

    expect(response.status()).toBe(400);
  });

  test('GET /harvests - should reject unauthenticated', async ({ request }) => {
    const response = await request.get('/api/v1/harvests');

    expect(response.status()).toBe(401);
  });
});

test.describe('Reception Batches API @harvests @smoke', () => {
  test('GET /reception-batches - should list reception batches', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/reception-batches');

    expect(response.status()).toBe(200);
  });
});

test.describe('Deliveries API @harvests', () => {
  test('GET /deliveries - should list deliveries', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/deliveries');

    expect(response.status()).toBe(200);
  });
});

test.describe('Harvest Events API @harvests', () => {
  test('GET /harvest-events - should list harvest events', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/harvest-events');

    expect(response.status()).toBe(200);
  });
});

test.describe('Quality Control API @harvests', () => {
  test('GET /quality-control - should list quality inspections', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/quality-control');

    expect(response.status()).toBe(200);
  });
});

test.describe('Crop Cycles API @harvests', () => {
  test('GET /crop-cycles - should list crop cycles', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/crop-cycles');

    expect(response.status()).toBe(200);
  });
});

test.describe('Crops API @harvests', () => {
  test('GET /crops - should list crops', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/crops');

    expect(response.status()).toBe(200);
  });
});

test.describe('Product Applications API @harvests', () => {
  test('GET /product-applications - should list product applications', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/product-applications');

    expect(response.status()).toBe(200);
  });
});

test.describe('Production Intelligence API @harvests', () => {
  test('GET /production-intelligence/summary - should return production summary', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/production-intelligence/summary');

    expect([200, 404]).toContain(response.status());
  });
});

test.describe('Profitability API @harvests', () => {
  test('GET /profitability - should return profitability data', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/profitability');

    expect([200, 400]).toContain(response.status());
  });
});
