import { test, expect } from '../../fixtures/auth.fixture';

test.describe('Marketplace API @marketplace @smoke', () => {
  test('GET /marketplace/categories - should list marketplace categories', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/marketplace/categories');

    expect(response.status()).toBe(200);
  });

  test('GET /marketplace/categories/featured - should list featured categories', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/marketplace/categories/featured');

    expect(response.status()).toBe(200);
  });

  test('GET /marketplace/products - should list marketplace products', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/marketplace/products');

    expect(response.status()).toBe(200);
  });

  test('GET /marketplace/dashboard/stats - should return marketplace stats', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/marketplace/dashboard/stats');

    expect([200, 404]).toContain(response.status());
  });

  test('GET /marketplace/my-listings - should list user listings', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/marketplace/my-listings');

    expect(response.status()).toBe(200);
  });
});

test.describe('Marketplace Sellers API @marketplace', () => {
  test('GET /marketplace/sellers - should list sellers', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/marketplace/sellers');

    expect(response.status()).toBe(200);
  });

  test('GET /marketplace/sellers/cities - should list seller cities', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/marketplace/sellers/cities');

    expect(response.status()).toBe(200);
  });
});

test.describe('Marketplace Quote Requests API @marketplace', () => {
  test('GET /marketplace/quote-requests/sent - should list sent quote requests', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/marketplace/quote-requests/sent');

    expect(response.status()).toBe(200);
  });

  test('GET /marketplace/quote-requests/received - should list received quote requests', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/marketplace/quote-requests/received');

    expect(response.status()).toBe(200);
  });

  test('GET /marketplace/quote-requests/stats - should return quote request stats', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/marketplace/quote-requests/stats');

    expect(response.status()).toBe(200);
  });
});

test.describe('Marketplace Orders API @marketplace', () => {
  test('GET /marketplace/orders - should list marketplace orders', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/marketplace/orders');

    expect(response.status()).toBe(200);
  });
});

test.describe('Marketplace Cart API @marketplace', () => {
  test('GET /marketplace/cart - should return cart contents', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/marketplace/cart');

    expect(response.status()).toBe(200);
  });
});

test.describe('Marketplace Reviews API @marketplace', () => {
  test('GET /marketplace/reviews/can-review/:sellerId - should check review eligibility', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/marketplace/reviews/can-review/00000000-0000-0000-0000-000000000000');

    expect([200, 404]).toContain(response.status());
  });
});
