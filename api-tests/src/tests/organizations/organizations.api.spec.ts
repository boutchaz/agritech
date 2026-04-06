import { test, expect } from '../../fixtures/auth.fixture';

const NO_ID = '00000000-0000-0000-0000-000000000000';

test.describe('Organizations API @organizations', () => {
  test('GET /organizations/my-organizations returns the authenticated organizations', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/organizations/my-organizations');

    expect(response.status()).toBe(200);
    expect(Array.isArray(await response.json())).toBe(true);
  });

  test('GET /organizations/:id returns an organization or not found', async ({ authedRequest, organizationId }) => {
    const response = await authedRequest.get(`/api/v1/organizations/${organizationId}`);

    expect([200, 400, 404]).toContain(response.status());
  });

  test('PATCH /organizations/:id updates an organization or validates the payload', async ({ authedRequest, organizationId }) => {
    const response = await authedRequest.patch(`/api/v1/organizations/${organizationId}`, {
      data: {},
    });

    expect([200, 201, 400, 422]).toContain(response.status());
  });
});

test.describe('Users API @organizations', () => {
  test('GET /users/me returns the authenticated user', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/users/me');

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('id');
  });

  test('PATCH /users/me updates the authenticated user or validates the payload', async ({ authedRequest }) => {
    const response = await authedRequest.patch('/api/v1/users/me', {
      data: {},
    });

    expect([200, 201, 400, 422]).toContain(response.status());
  });

  test('GET /users/me/organizations returns the authenticated user organizations', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/users/me/organizations');

    expect(response.status()).toBe(200);
    expect(Array.isArray(await response.json())).toBe(true);
  });

  test('POST /users/me/activity accepts an activity payload', async ({ authedRequest }) => {
    const response = await authedRequest.post('/api/v1/users/me/activity', {
      data: {},
    });

    expect([200, 201, 400, 422]).toContain(response.status());
  });

  test('GET /users/me/tour-preferences returns tour preferences or not found', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/users/me/tour-preferences');

    expect([200, 400, 404]).toContain(response.status());
  });

  test('PATCH /users/me/tour-preferences updates tour preferences or validates the payload', async ({ authedRequest }) => {
    const response = await authedRequest.patch('/api/v1/users/me/tour-preferences', {
      data: {},
    });

    expect([200, 201, 400, 404, 422]).toContain(response.status());
  });

  test('POST /users/me/tours/:tourId/dismiss accepts a tour dismissal request', async ({ authedRequest }) => {
    const response = await authedRequest.post(`/api/v1/users/me/tours/${NO_ID}/dismiss`, {
      data: {},
    });

    expect([200, 201, 400, 404, 422]).toContain(response.status());
  });

  test('POST /users/me/tours/:tourId/complete accepts a tour completion request', async ({ authedRequest }) => {
    const response = await authedRequest.post(`/api/v1/users/me/tours/${NO_ID}/complete`, {
      data: {},
    });

    expect([200, 201, 400, 404, 422]).toContain(response.status());
  });

  test('POST /users/me/tours/:tourId/reset accepts a tour reset request', async ({ authedRequest }) => {
    const response = await authedRequest.post(`/api/v1/users/me/tours/${NO_ID}/reset`, {
      data: {},
    });

    expect([200, 201, 400, 404, 422]).toContain(response.status());
  });

  test('POST /users/me/tours/reset-all resets all tours or validates the request', async ({ authedRequest }) => {
    const response = await authedRequest.post('/api/v1/users/me/tours/reset-all', {
      data: {},
    });

    expect([200, 201, 400, 422]).toContain(response.status());
  });

  test('POST /users/me/avatar uploads an avatar or validates the payload', async ({ authedRequest }) => {
    const response = await authedRequest.post('/api/v1/users/me/avatar', {
      data: {},
    });

    expect([200, 201, 400, 422]).toContain(response.status());
  });

  test('DELETE /users/me/avatar removes the avatar or returns a missing resource response', async ({ authedRequest }) => {
    const response = await authedRequest.delete('/api/v1/users/me/avatar');

    expect([200, 404]).toContain(response.status());
  });

  test('GET /users/organizations/:organizationId/users returns organization users or not found', async ({ authedRequest, organizationId }) => {
    const response = await authedRequest.get(`/api/v1/users/organizations/${organizationId}/users`);

    expect(response.status()).toBe(200);
  });

  test('PATCH /users/organizations/:organizationId/users/:userId/role updates a member role or validates the payload', async ({ authedRequest, organizationId }) => {
    const response = await authedRequest.patch(`/api/v1/users/organizations/${organizationId}/users/${NO_ID}/role`, {
      data: {},
    });

    expect([200, 201, 400, 404, 422]).toContain(response.status());
  });

  test('PATCH /users/organizations/:organizationId/users/:userId/status updates a member status or validates the payload', async ({ authedRequest, organizationId }) => {
    const response = await authedRequest.patch(`/api/v1/users/organizations/${organizationId}/users/${NO_ID}/status`, {
      data: {},
    });

    expect([200, 201, 400, 404, 422]).toContain(response.status());
  });

  test('DELETE /users/organizations/:organizationId/users/:userId removes a member or returns a missing resource response', async ({ authedRequest, organizationId }) => {
    const response = await authedRequest.delete(`/api/v1/users/organizations/${organizationId}/users/${NO_ID}`);

    expect([200, 404]).toContain(response.status());
  });
});

test.describe('Organization Users API @organizations', () => {
  test('GET /organization-users returns the organization user list', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/organization-users');

    expect(response.status()).toBe(200);
  });

  test('GET /organization-users/assignable returns assignable users', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/organization-users/assignable');

    expect(response.status()).toBe(200);
  });

  test('POST /organization-users/invite sends an invitation or validates the payload', async ({ authedRequest }) => {
    const response = await authedRequest.post('/api/v1/organization-users/invite', {
      data: {},
    });

    expect([200, 201, 400, 422]).toContain(response.status());
  });

  test('GET /organization-users/:userId returns an organization user or not found', async ({ authedRequest }) => {
    const response = await authedRequest.get(`/api/v1/organization-users/${NO_ID}`);

    expect([200, 404]).toContain(response.status());
  });

  test('POST /organization-users creates an organization user or validates the payload', async ({ authedRequest }) => {
    const response = await authedRequest.post('/api/v1/organization-users', {
      data: {},
    });

    expect([200, 201, 400, 422]).toContain(response.status());
  });

  test('PATCH /organization-users/:userId updates an organization user or validates the payload', async ({ authedRequest }) => {
    const response = await authedRequest.patch(`/api/v1/organization-users/${NO_ID}`, {
      data: {},
    });

    expect([200, 201, 400, 404, 422]).toContain(response.status());
  });

  test('DELETE /organization-users/:userId removes an organization user or returns a missing resource response', async ({ authedRequest }) => {
    const response = await authedRequest.delete(`/api/v1/organization-users/${NO_ID}`);

    expect([200, 404]).toContain(response.status());
  });

  test('GET /organization-users/:userId/temp-password returns a temporary password or not found', async ({ authedRequest }) => {
    const response = await authedRequest.get(`/api/v1/organization-users/${NO_ID}/temp-password`);

    expect([200, 404]).toContain(response.status());
  });

  test('POST /organization-users/:userId/reset-password resets the password or validates the request', async ({ authedRequest }) => {
    const response = await authedRequest.post(`/api/v1/organization-users/${NO_ID}/reset-password`, {
      data: {},
    });

    expect([200, 201, 400, 404, 422]).toContain(response.status());
  });
});

test.describe('Roles API @organizations', () => {
  test('GET /roles returns the available roles', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/roles');

    expect(response.status()).toBe(200);
  });

  test('GET /roles/:id returns a role or not found', async ({ authedRequest }) => {
    const response = await authedRequest.get(`/api/v1/roles/${NO_ID}`);

    expect([200, 400, 404]).toContain(response.status());
  });

  test('GET /roles/name/:name returns a role by name or not found', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/roles/name/nonexistent-role');

    expect([200, 400, 404]).toContain(response.status());
  });
});

test.describe('Subscriptions API @organizations', () => {
  test('GET /subscriptions returns the subscription list', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/subscriptions');

    expect(response.status()).toBe(200);
  });

  test('GET /subscriptions/current returns the current subscription or not found', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/subscriptions/current');

    expect([200, 404]).toContain(response.status());
  });

  test('GET /subscriptions/usage returns subscription usage', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/subscriptions/usage');

    expect(response.status()).toBe(200);
  });

  test('GET /subscriptions/catalog returns the subscription catalog', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/subscriptions/catalog');

    expect(response.status()).toBe(200);
  });

  test('POST /subscriptions/quote accepts a quote request or validates the payload', async ({ authedRequest }) => {
    const response = await authedRequest.post('/api/v1/subscriptions/quote', {
      data: {},
    });

    expect([200, 201, 400, 422]).toContain(response.status());
  });

  test('POST /subscriptions/checkout accepts a checkout request or validates the payload', async ({ authedRequest }) => {
    const response = await authedRequest.post('/api/v1/subscriptions/checkout', {
      data: {},
    });

    expect([200, 201, 400, 422]).toContain(response.status());
  });

  test('POST /subscriptions/trial accepts a trial request or validates the payload', async ({ authedRequest }) => {
    const response = await authedRequest.post('/api/v1/subscriptions/trial', {
      data: {},
    });

    expect([200, 201, 400, 422]).toContain(response.status());
  });

  test('POST /subscriptions/check accepts a check request or validates the payload', async ({ authedRequest }) => {
    const response = await authedRequest.post('/api/v1/subscriptions/check', {
      data: {},
    });

    expect([200, 201, 400, 422]).toContain(response.status());
  });

  test('POST /subscriptions/renewal/notice accepts a renewal notice request or validates the payload', async ({ authedRequest }) => {
    const response = await authedRequest.post('/api/v1/subscriptions/renewal/notice', {
      data: {},
    });

    expect([200, 201, 400, 422]).toContain(response.status());
  });

  test('POST /subscriptions/terminate accepts a termination request or validates the payload', async ({ authedRequest }) => {
    const response = await authedRequest.post('/api/v1/subscriptions/terminate', {
      data: {},
    });

    expect([200, 201, 202, 400, 404, 422]).toContain(response.status());
  });

  test('POST /subscriptions/polar accepts a Polar request or validates the payload', async ({ authedRequest }) => {
    const response = await authedRequest.post('/api/v1/subscriptions/polar', {
      data: {},
    });

    expect([200, 201, 202, 400, 404, 422]).toContain(response.status());
  });
});
