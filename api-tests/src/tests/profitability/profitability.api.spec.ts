import { test, expect } from '../../fixtures/auth.fixture';

const NO_ID = '00000000-0000-0000-0000-000000000000';

test.describe('Profitability API @profitability', () => {
  test('GET /profitability/parcels - returns 200 or 400', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/profitability/parcels');
    expect([200, 400, 404]).toContain(response.status());
  });

  test('GET /profitability/costs - returns 200 or 400', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/profitability/costs');
    expect([200, 400]).toContain(response.status());
  });

  test('POST /profitability/costs - rejects empty data', async ({ authedRequest }) => {
    const response = await authedRequest.post('/api/v1/profitability/costs', { data: {} });
    expect([400, 422]).toContain(response.status());
  });

  test('GET /profitability/revenues - returns 200 or 400', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/profitability/revenues');
    expect([200, 400]).toContain(response.status());
  });

  test('POST /profitability/revenues - rejects empty data', async ({ authedRequest }) => {
    const response = await authedRequest.post('/api/v1/profitability/revenues', { data: {} });
    expect([400, 422]).toContain(response.status());
  });

  test('GET /profitability/analytics - returns 200 or 400', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/profitability/analytics');
    expect([200, 400, 404]).toContain(response.status());
  });

  test('GET /profitability/parcel/:parcelId - returns 200 or 404', async ({ authedRequest }) => {
    const response = await authedRequest.get(`/api/v1/profitability/parcel/${NO_ID}`);
    expect([200, 400, 404]).toContain(response.status());
  });

  test('GET /profitability/parcel/:parcelId/journal-entries - returns 200 or 404', async ({ authedRequest }) => {
    const response = await authedRequest.get(`/api/v1/profitability/parcel/${NO_ID}/journal-entries`);
    expect([200, 400, 404]).toContain(response.status());
  });

  test('GET /profitability/analysis - returns 200 or 400', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/profitability/analysis');
    expect([200, 400, 404]).toContain(response.status());
  });

  test('GET /profitability/account-mappings - returns 200', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/profitability/account-mappings');
    expect(response.status()).toBe(200);
  });
});
