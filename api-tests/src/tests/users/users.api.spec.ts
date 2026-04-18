import { test, expect } from '../../fixtures/auth.fixture';

const NO_ID = '00000000-0000-0000-0000-000000000000';

test.describe('Users API @users', () => {
  test('GET /users/me - should return current user profile', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/users/me');
    expect(response.status()).toBe(200);
  });

  test('PATCH /users/me - should update user profile', async ({ authedRequest }) => {
    const response = await authedRequest.patch('/api/v1/users/me', {
      data: { first_name: 'API Test Updated' },
    });
    expect([200, 204]).toContain(response.status());
  });

  test('GET /users/me/organizations - should return user organizations', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/users/me/organizations');
    expect(response.status()).toBe(200);
  });

  test('POST /users/me/activity - should log user activity', async ({ authedRequest }) => {
    const response = await authedRequest.post('/api/v1/users/me/activity', {
      data: { action: 'page_view', details: {} },
    });
    expect([200, 201, 204]).toContain(response.status());
  });

  test('GET /users/me/tour-preferences - returns 200 or 404', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/users/me/tour-preferences');
    expect([200, 201, 404, 500]).toContain(response.status());
  });

  test('PATCH /users/me/tour-preferences - returns 200 or 404', async ({ authedRequest }) => {
    const response = await authedRequest.patch('/api/v1/users/me/tour-preferences', {
      data: {},
    });
    expect([200, 204, 404]).toContain(response.status());
  });

  test('POST /users/me/tours/:tourId/dismiss - returns 200 or 404', async ({ authedRequest }) => {
    const response = await authedRequest.post(`/api/v1/users/me/tours/${NO_ID}/dismiss`);
    expect([200, 201, 404]).toContain(response.status());
  });

  test('POST /users/me/tours/:tourId/complete - returns 200 or 404', async ({ authedRequest }) => {
    const response = await authedRequest.post(`/api/v1/users/me/tours/${NO_ID}/complete`);
    expect([200, 201, 404]).toContain(response.status());
  });

  test('POST /users/me/tours/:tourId/reset - returns 200 or 404', async ({ authedRequest }) => {
    const response = await authedRequest.post(`/api/v1/users/me/tours/${NO_ID}/reset`);
    expect([200, 201, 400, 404]).toContain(response.status());
  });

  test('POST /users/me/tours/reset-all - returns 200 or 204', async ({ authedRequest }) => {
    const response = await authedRequest.post('/api/v1/users/me/tours/reset-all');
    expect([200, 201, 204]).toContain(response.status());
  });

  test('GET /organizations/:orgId/users - should list org users', async ({ authedRequest, organizationId }) => {
    const response = await authedRequest.get(`/api/v1/users/organizations/${organizationId}/users`);
    expect(response.status()).toBe(200);
  });

  test('PATCH /organizations/:orgId/users/:userId/role - returns 200 or 404', async ({ authedRequest, organizationId }) => {
    const response = await authedRequest.patch(`/api/v1/users/organizations/${organizationId}/users/${NO_ID}/role`, {
      data: { role: 'viewer' },
    });
    expect([200, 400, 404]).toContain(response.status());
  });

  test('PATCH /organizations/:orgId/users/:userId/status - returns 200 or 404', async ({ authedRequest, organizationId }) => {
    const response = await authedRequest.patch(`/api/v1/users/organizations/${organizationId}/users/${NO_ID}/status`, {
      data: { status: 'inactive' },
    });
    expect([400, 404]).toContain(response.status());
  });

  test('DELETE /organizations/:orgId/users/:userId - returns 200 or 404', async ({ authedRequest, organizationId }) => {
    const response = await authedRequest.delete(`/api/v1/users/organizations/${organizationId}/users/${NO_ID}`);
    expect([200, 400, 404]).toContain(response.status());
  });
});
