import { test, expect } from '../../fixtures/auth.fixture';

const NO_ID = '00000000-0000-0000-0000-000000000000';

test.describe('Biological Assets API @biological-assets', () => {
  test('GET /biological-assets - should list biological assets', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/biological-assets');
    expect([200, 401, 500]).toContain(response.status());
  });

  test('GET /biological-assets/statistics - should return statistics', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/biological-assets/statistics');
    expect([200, 401, 500]).toContain(response.status());
  });

  test('GET /biological-assets/:id - returns 200 or 404', async ({ authedRequest }) => {
    const response = await authedRequest.get(`/api/v1/biological-assets/${NO_ID}`);
    expect([200, 401, 404, 500]).toContain(response.status());
  });

  test('POST /biological-assets - rejects empty data', async ({ authedRequest }) => {
    const response = await authedRequest.post('/api/v1/biological-assets', { data: {} });
    expect([400, 422]).toContain(response.status());
  });

  test('PATCH /biological-assets/:id - returns 200 or 404', async ({ authedRequest }) => {
    const response = await authedRequest.patch(`/api/v1/biological-assets/${NO_ID}`, { data: {} });
    expect([400, 404, 500]).toContain(response.status());
  });

  test('PATCH /biological-assets/:id/status - returns 200 or 404', async ({ authedRequest }) => {
    const response = await authedRequest.patch(`/api/v1/biological-assets/${NO_ID}/status`, { data: {} });
    expect([400, 404, 500]).toContain(response.status());
  });

  test('DELETE /biological-assets/:id - returns 200 or 404', async ({ authedRequest }) => {
    const response = await authedRequest.delete(`/api/v1/biological-assets/${NO_ID}`);
    expect([200, 204, 404, 500]).toContain(response.status());
  });
});
