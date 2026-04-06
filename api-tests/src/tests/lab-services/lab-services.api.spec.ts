import { test, expect } from '../../fixtures/auth.fixture';

const NO_ID = '00000000-0000-0000-0000-000000000000';

test.describe('Lab Services API @lab-services', () => {
  test('GET /lab-services/providers - should list lab providers', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/lab-services/providers');
    expect(response.status()).toBe(200);
  });

  test('GET /lab-services/providers/:id - returns 200 or 404', async ({ authedRequest }) => {
    const response = await authedRequest.get(`/api/v1/lab-services/providers/${NO_ID}`);
    expect([200, 404]).toContain(response.status());
  });

  test('GET /lab-services/types - should list lab test types', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/lab-services/types');
    expect(response.status()).toBe(200);
  });

  test('GET /lab-services/types/:id - returns 200 or 404', async ({ authedRequest }) => {
    const response = await authedRequest.get(`/api/v1/lab-services/types/${NO_ID}`);
    expect([200, 404]).toContain(response.status());
  });
});

test.describe('Lab Services Orders API @lab-services', () => {
  test('GET /organizations/:orgId/lab-services/orders - should list lab orders', async ({ authedRequest, organizationId }) => {
    const response = await authedRequest.get(`/api/v1/organizations/${organizationId}/lab-services/orders`);
    expect(response.status()).toBe(200);
  });

  test('GET /organizations/:orgId/lab-services/orders/:id - returns 200 or 404', async ({ authedRequest, organizationId }) => {
    const response = await authedRequest.get(`/api/v1/organizations/${organizationId}/lab-services/orders/${NO_ID}`);
    expect([200, 404]).toContain(response.status());
  });

  test('POST /organizations/:orgId/lab-services/orders - rejects empty order', async ({ authedRequest, organizationId }) => {
    const response = await authedRequest.post(`/api/v1/organizations/${organizationId}/lab-services/orders`, { data: {} });
    expect([400, 422]).toContain(response.status());
  });

  test('PATCH /organizations/:orgId/lab-services/orders/:id - returns 200 or 404', async ({ authedRequest, organizationId }) => {
    const response = await authedRequest.patch(`/api/v1/organizations/${organizationId}/lab-services/orders/${NO_ID}`, { data: {} });
    expect([400, 404]).toContain(response.status());
  });
});

test.describe('Lab Services Results API @lab-services', () => {
  test('GET /organizations/:orgId/lab-services/orders/:orderId/results - returns 200 or 404', async ({ authedRequest, organizationId }) => {
    const response = await authedRequest.get(`/api/v1/organizations/${organizationId}/lab-services/orders/${NO_ID}/results`);
    expect([200, 404]).toContain(response.status());
  });

  test('POST /organizations/:orgId/lab-services/orders/:orderId/results - rejects empty results', async ({ authedRequest, organizationId }) => {
    const response = await authedRequest.post(`/api/v1/organizations/${organizationId}/lab-services/orders/${NO_ID}/results`, { data: {} });
    expect([400, 404]).toContain(response.status());
  });
});

test.describe('Lab Services Recommendations API @lab-services', () => {
  test('GET /organizations/:orgId/lab-services/recommendations - should list recommendations', async ({ authedRequest, organizationId }) => {
    const response = await authedRequest.get(`/api/v1/organizations/${organizationId}/lab-services/recommendations`);
    expect(response.status()).toBe(200);
  });

  test('POST /organizations/:orgId/lab-services/recommendations - rejects empty data', async ({ authedRequest, organizationId }) => {
    const response = await authedRequest.post(`/api/v1/organizations/${organizationId}/lab-services/recommendations`, { data: {} });
    expect([400, 422]).toContain(response.status());
  });

  test('PATCH /organizations/:orgId/lab-services/recommendations/:id - returns 200 or 404', async ({ authedRequest, organizationId }) => {
    const response = await authedRequest.patch(`/api/v1/organizations/${organizationId}/lab-services/recommendations/${NO_ID}`, { data: {} });
    expect([400, 404]).toContain(response.status());
  });
});

test.describe('Lab Services Schedules API @lab-services', () => {
  test('GET /organizations/:orgId/lab-services/schedules - should list schedules', async ({ authedRequest, organizationId }) => {
    const response = await authedRequest.get(`/api/v1/organizations/${organizationId}/lab-services/schedules`);
    expect(response.status()).toBe(200);
  });

  test('POST /organizations/:orgId/lab-services/schedules - rejects empty data', async ({ authedRequest, organizationId }) => {
    const response = await authedRequest.post(`/api/v1/organizations/${organizationId}/lab-services/schedules`, { data: {} });
    expect([400, 422]).toContain(response.status());
  });

  test('PATCH /organizations/:orgId/lab-services/schedules/:id - returns 200 or 404', async ({ authedRequest, organizationId }) => {
    const response = await authedRequest.patch(`/api/v1/organizations/${organizationId}/lab-services/schedules/${NO_ID}`, { data: {} });
    expect([400, 404]).toContain(response.status());
  });

  test('DELETE /organizations/:orgId/lab-services/schedules/:id - returns 200 or 404', async ({ authedRequest, organizationId }) => {
    const response = await authedRequest.delete(`/api/v1/organizations/${organizationId}/lab-services/schedules/${NO_ID}`);
    expect([400, 404]).toContain(response.status());
  });
});
