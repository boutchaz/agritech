import { test, expect } from '../../fixtures/auth.fixture';

const NO_ID = '00000000-0000-0000-0000-000000000000';

test.describe('Deliveries API @delivery-reception', () => {
  test('GET /organizations/:orgId/deliveries - should list deliveries', async ({ authedRequest, organizationId }) => {
    const response = await authedRequest.get(`/api/v1/organizations/${organizationId}/deliveries`);
    expect(response.status()).toBe(200);
  });

  test('GET /organizations/:orgId/deliveries/:deliveryId - returns 200 or 404', async ({ authedRequest, organizationId }) => {
    const response = await authedRequest.get(`/api/v1/organizations/${organizationId}/deliveries/${NO_ID}`);
    expect([200, 404]).toContain(response.status());
  });

  test('GET /organizations/:orgId/deliveries/:deliveryId/items - returns 200 or 404', async ({ authedRequest, organizationId }) => {
    const response = await authedRequest.get(`/api/v1/organizations/${organizationId}/deliveries/${NO_ID}/items`);
    expect([200, 404]).toContain(response.status());
  });

  test('GET /organizations/:orgId/deliveries/:deliveryId/tracking - returns 200 or 404', async ({ authedRequest, organizationId }) => {
    const response = await authedRequest.get(`/api/v1/organizations/${organizationId}/deliveries/${NO_ID}/tracking`);
    expect([200, 404]).toContain(response.status());
  });

  test('POST /organizations/:orgId/deliveries - rejects empty data', async ({ authedRequest, organizationId }) => {
    const response = await authedRequest.post(`/api/v1/organizations/${organizationId}/deliveries`, { data: {} });
    expect([400, 422, 500]).toContain(response.status());
  });

  test('PATCH /organizations/:orgId/deliveries/:deliveryId/status - returns 200 or 404', async ({ authedRequest, organizationId }) => {
    const response = await authedRequest.patch(`/api/v1/organizations/${organizationId}/deliveries/${NO_ID}/status`, { data: {} });
    expect([400, 404]).toContain(response.status());
  });

  test('PATCH /organizations/:orgId/deliveries/:deliveryId/complete - returns 200 or 404', async ({ authedRequest, organizationId }) => {
    const response = await authedRequest.patch(`/api/v1/organizations/${organizationId}/deliveries/${NO_ID}/complete`, { data: {} });
    expect([400, 404]).toContain(response.status());
  });

  test('PATCH /organizations/:orgId/deliveries/:deliveryId/payment - returns 200 or 404', async ({ authedRequest, organizationId }) => {
    const response = await authedRequest.patch(`/api/v1/organizations/${organizationId}/deliveries/${NO_ID}/payment`, { data: {} });
    expect([400, 404]).toContain(response.status());
  });

  test('PATCH /organizations/:orgId/deliveries/:deliveryId/cancel - returns 200 or 404', async ({ authedRequest, organizationId }) => {
    const response = await authedRequest.patch(`/api/v1/organizations/${organizationId}/deliveries/${NO_ID}/cancel`, { data: {} });
    expect([400, 404]).toContain(response.status());
  });
});

test.describe('Reception Batches API @delivery-reception', () => {
  test('GET /organizations/:orgId/reception-batches - should list reception batches', async ({ authedRequest, organizationId }) => {
    const response = await authedRequest.get(`/api/v1/organizations/${organizationId}/reception-batches`);
    expect(response.status()).toBe(200);
  });

  test('GET /organizations/:orgId/reception-batches/:id - returns 200 or 404', async ({ authedRequest, organizationId }) => {
    const response = await authedRequest.get(`/api/v1/organizations/${organizationId}/reception-batches/${NO_ID}`);
    expect([200, 404]).toContain(response.status());
  });

  test('POST /organizations/:orgId/reception-batches - rejects empty data', async ({ authedRequest, organizationId }) => {
    const response = await authedRequest.post(`/api/v1/organizations/${organizationId}/reception-batches`, { data: {} });
    expect([400, 422]).toContain(response.status());
  });

  test('PATCH /organizations/:orgId/reception-batches/:id/quality-control - returns 200 or 404', async ({ authedRequest, organizationId }) => {
    const response = await authedRequest.patch(`/api/v1/organizations/${organizationId}/reception-batches/${NO_ID}/quality-control`, { data: {} });
    expect([400, 404]).toContain(response.status());
  });

  test('PATCH /organizations/:orgId/reception-batches/:id/decision - returns 200 or 404', async ({ authedRequest, organizationId }) => {
    const response = await authedRequest.patch(`/api/v1/organizations/${organizationId}/reception-batches/${NO_ID}/decision`, { data: {} });
    expect([400, 404]).toContain(response.status());
  });

  test('POST /organizations/:orgId/reception-batches/:id/process-payment - returns 200 or 404', async ({ authedRequest, organizationId }) => {
    const response = await authedRequest.post(`/api/v1/organizations/${organizationId}/reception-batches/${NO_ID}/process-payment`, { data: {} });
    expect([400, 404]).toContain(response.status());
  });

  test('PATCH /organizations/:orgId/reception-batches/:id - returns 200 or 404', async ({ authedRequest, organizationId }) => {
    const response = await authedRequest.patch(`/api/v1/organizations/${organizationId}/reception-batches/${NO_ID}`, { data: {} });
    expect([400, 404]).toContain(response.status());
  });

  test('DELETE /organizations/:orgId/reception-batches/:id - returns 200 or 404', async ({ authedRequest, organizationId }) => {
    const response = await authedRequest.delete(`/api/v1/organizations/${organizationId}/reception-batches/${NO_ID}`);
    expect([200, 204, 404]).toContain(response.status());
  });
});
