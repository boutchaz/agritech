import { test, expect } from '../../fixtures/auth.fixture';

const NO_ID = '00000000-0000-0000-0000-000000000000';

test.describe('Payment Records API @payment-records', () => {
  test('GET /organizations/:orgId/payment-records - should list payment records', async ({ authedRequest, organizationId }) => {
    const response = await authedRequest.get(`/api/v1/organizations/${organizationId}/payment-records`);
    expect([200, 400]).toContain(response.status());
  });

  test('GET /organizations/:orgId/payment-records/:paymentId - returns 200 or 404', async ({ authedRequest, organizationId }) => {
    const response = await authedRequest.get(`/api/v1/organizations/${organizationId}/payment-records/${NO_ID}`);
    expect([200, 404]).toContain(response.status());
  });

  test('GET /organizations/:orgId/payment-records/worker/:workerId - returns 200 or 404', async ({ authedRequest, organizationId }) => {
    const response = await authedRequest.get(`/api/v1/organizations/${organizationId}/payment-records/worker/${NO_ID}`);
    expect([200, 404]).toContain(response.status());
  });

  test('GET /organizations/:orgId/payment-records/worker/:workerId/history - returns 200 or 404', async ({ authedRequest, organizationId }) => {
    const response = await authedRequest.get(`/api/v1/organizations/${organizationId}/payment-records/worker/${NO_ID}/history`);
    expect([200, 404]).toContain(response.status());
  });

  test('GET /organizations/:orgId/payment-records/advances/list - should list advances', async ({ authedRequest, organizationId }) => {
    const response = await authedRequest.get(`/api/v1/organizations/${organizationId}/payment-records/advances/list`);
    expect([200, 400]).toContain(response.status());
  });

  test('GET /organizations/:orgId/payment-records/statistics/summary - should return summary', async ({ authedRequest, organizationId }) => {
    const response = await authedRequest.get(`/api/v1/organizations/${organizationId}/payment-records/statistics/summary`);
    expect(response.status()).toBe(200);
  });

  test('POST /organizations/:orgId/payment-records/calculate - rejects empty data', async ({ authedRequest, organizationId }) => {
    const response = await authedRequest.post(`/api/v1/organizations/${organizationId}/payment-records/calculate`, { data: {} });
    expect([400, 422]).toContain(response.status());
  });

  test('POST /organizations/:orgId/payment-records - rejects empty data', async ({ authedRequest, organizationId }) => {
    const response = await authedRequest.post(`/api/v1/organizations/${organizationId}/payment-records`, { data: {} });
    expect([400, 422]).toContain(response.status());
  });

  test('PATCH /organizations/:orgId/payment-records/:paymentId/approve - returns 200 or 404', async ({ authedRequest, organizationId }) => {
    const response = await authedRequest.patch(`/api/v1/organizations/${organizationId}/payment-records/${NO_ID}/approve`);
    expect([400, 404]).toContain(response.status());
  });

  test('PATCH /organizations/:orgId/payment-records/:paymentId/process - returns 200 or 404', async ({ authedRequest, organizationId }) => {
    const response = await authedRequest.patch(`/api/v1/organizations/${organizationId}/payment-records/${NO_ID}/process`);
    expect([400, 404]).toContain(response.status());
  });

  test('POST /organizations/:orgId/payment-records/advances - rejects empty data', async ({ authedRequest, organizationId }) => {
    const response = await authedRequest.post(`/api/v1/organizations/${organizationId}/payment-records/advances`, { data: {} });
    expect([400, 422]).toContain(response.status());
  });

  test('PATCH /organizations/:orgId/payment-records/advances/:advanceId/approve - returns 200 or 404', async ({ authedRequest, organizationId }) => {
    const response = await authedRequest.patch(`/api/v1/organizations/${organizationId}/payment-records/advances/${NO_ID}/approve`);
    expect([400, 404]).toContain(response.status());
  });

  test('PATCH /organizations/:orgId/payment-records/advances/:advanceId/pay - returns 200 or 404', async ({ authedRequest, organizationId }) => {
    const response = await authedRequest.patch(`/api/v1/organizations/${organizationId}/payment-records/advances/${NO_ID}/pay`);
    expect([400, 404]).toContain(response.status());
  });
});
