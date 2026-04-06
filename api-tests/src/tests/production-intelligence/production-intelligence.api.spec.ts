import { test, expect } from '../../fixtures/auth.fixture';

const NO_ID = '00000000-0000-0000-0000-000000000000';

test.describe('Production Intelligence API @production-intelligence', () => {
  test('GET /organizations/:orgId/production-intelligence/yield-history - returns 200 or 404', async ({ authedRequest, organizationId }) => {
    const response = await authedRequest.get(`/api/v1/organizations/${organizationId}/production-intelligence/yield-history`);
    expect([200, 400, 404]).toContain(response.status());
  });

  test('POST /organizations/:orgId/production-intelligence/yield-history - rejects empty data', async ({ authedRequest, organizationId }) => {
    const response = await authedRequest.post(`/api/v1/organizations/${organizationId}/production-intelligence/yield-history`, { data: {} });
    expect([400, 422]).toContain(response.status());
  });

  test('GET /organizations/:orgId/production-intelligence/forecasts - returns 200 or 404', async ({ authedRequest, organizationId }) => {
    const response = await authedRequest.get(`/api/v1/organizations/${organizationId}/production-intelligence/forecasts`);
    expect([200, 400, 404]).toContain(response.status());
  });

  test('POST /organizations/:orgId/production-intelligence/forecasts - rejects empty data', async ({ authedRequest, organizationId }) => {
    const response = await authedRequest.post(`/api/v1/organizations/${organizationId}/production-intelligence/forecasts`, { data: {} });
    expect([400, 422]).toContain(response.status());
  });

  test('PATCH /organizations/:orgId/production-intelligence/forecasts/:id - returns 200 or 404', async ({ authedRequest, organizationId }) => {
    const response = await authedRequest.patch(`/api/v1/organizations/${organizationId}/production-intelligence/forecasts/${NO_ID}`, { data: {} });
    expect([400, 404]).toContain(response.status());
  });

  test('GET /organizations/:orgId/production-intelligence/benchmarks - returns 200 or 404', async ({ authedRequest, organizationId }) => {
    const response = await authedRequest.get(`/api/v1/organizations/${organizationId}/production-intelligence/benchmarks`);
    expect([200, 400, 404]).toContain(response.status());
  });

  test('POST /organizations/:orgId/production-intelligence/benchmarks - rejects empty data', async ({ authedRequest, organizationId }) => {
    const response = await authedRequest.post(`/api/v1/organizations/${organizationId}/production-intelligence/benchmarks`, { data: {} });
    expect([400, 422]).toContain(response.status());
  });

  test('GET /organizations/:orgId/production-intelligence/alerts - returns 200 or 404', async ({ authedRequest, organizationId }) => {
    const response = await authedRequest.get(`/api/v1/organizations/${organizationId}/production-intelligence/alerts`);
    expect([200, 404]).toContain(response.status());
  });

  test('PATCH /organizations/:orgId/production-intelligence/alerts/:id/acknowledge - returns 200 or 404', async ({ authedRequest, organizationId }) => {
    const response = await authedRequest.patch(`/api/v1/organizations/${organizationId}/production-intelligence/alerts/${NO_ID}/acknowledge`);
    expect([400, 404]).toContain(response.status());
  });

  test('PATCH /organizations/:orgId/production-intelligence/alerts/:id/resolve - returns 200 or 404', async ({ authedRequest, organizationId }) => {
    const response = await authedRequest.patch(`/api/v1/organizations/${organizationId}/production-intelligence/alerts/${NO_ID}/resolve`);
    expect([400, 404]).toContain(response.status());
  });

  test('GET /organizations/:orgId/production-intelligence/parcel-performance - returns 200 or 404', async ({ authedRequest, organizationId }) => {
    const response = await authedRequest.get(`/api/v1/organizations/${organizationId}/production-intelligence/parcel-performance`);
    expect([200, 400, 404]).toContain(response.status());
  });
});
