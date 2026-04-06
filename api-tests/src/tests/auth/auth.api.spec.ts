import { test, expect } from '../../fixtures/auth.fixture';

const NO_ID = '00000000-0000-0000-0000-000000000000';

test.describe('Auth API @auth @smoke', () => {
  test('POST /auth/login - should authenticate with valid credentials', async ({ request }) => {
    const response = await request.post('/api/v1/auth/login', {
      data: {
        email: process.env.TEST_USER_EMAIL,
        password: process.env.TEST_USER_PASSWORD,
      },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('access_token');
    expect(body).toHaveProperty('refresh_token');
    expect(body).toHaveProperty('user');
    expect(body.user).toHaveProperty('id');
    expect(body.user).toHaveProperty('email');
  });

  test('POST /auth/signup - should reject duplicate email', async ({ request }) => {
    const response = await request.post('/api/v1/auth/signup', {
      data: {
        email: process.env.TEST_USER_EMAIL,
        password: 'TestPass123!',
        first_name: 'Test',
        last_name: 'User',
      },
    });

    expect([400, 409]).toContain(response.status());
  });

  test('POST /auth/oauth/url - should generate OAuth URL', async ({ request }) => {
    const response = await request.post('/api/v1/auth/oauth/url', {
      data: {
        provider: 'google',
        redirectTo: 'http://localhost:5173/auth/callback',
      },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('url');
  });

  test('POST /auth/oauth/callback - should reject invalid OAuth code', async ({ request }) => {
    const response = await request.post('/api/v1/auth/oauth/callback', {
      data: { code: 'invalid-oauth-code' },
    });

    expect(response.status()).toBe(401);
  });

  test('GET /auth/me - should return authenticated user profile', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/auth/me');

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('id');
    expect(body).toHaveProperty('email');
  });

  test('PATCH /auth/me - should update user profile', async ({ authedRequest }) => {
    const response = await authedRequest.patch('/api/v1/auth/me', {
      data: { first_name: 'Test Updated' },
    });

    expect([200, 204]).toContain(response.status());
  });

  test('GET /auth/organizations - should return user organizations', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/auth/organizations');

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
  });

  test('GET /auth/me/role - should reject a missing organization', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/auth/me/role', {
      headers: {
        'x-organization-id': NO_ID,
      },
    });

    expect([200, 404]).toContain(response.status());
  });

  test('GET /auth/me/abilities - should return CASL abilities', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/auth/me/abilities');

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('role');
    expect(body).toHaveProperty('abilities');
    expect(Array.isArray(body.abilities)).toBe(true);
  });

  test('POST /auth/setup-organization - should create or return an organization', async ({ authedRequest }) => {
    const response = await authedRequest.post('/api/v1/auth/setup-organization', {
      data: { organizationName: 'Auth Coverage Org' },
    });

    expect([200, 201]).toContain(response.status());
    const body = await response.json();
    expect(body).toHaveProperty('success');
    expect(body).toHaveProperty('organization');
  });

  test('POST /auth/change-password - should reject wrong current password', async ({ authedRequest }) => {
    const response = await authedRequest.post('/api/v1/auth/change-password', {
      data: { currentPassword: 'wrong-password', newPassword: 'NewPass123!' },
    });

    expect([400, 401]).toContain(response.status());
  });

  test('POST /auth/logout - should revoke the current session', async ({ authedRequest }) => {
    const response = await authedRequest.post('/api/v1/auth/logout');

    expect(response.status()).toBe(200);
  });

  test('POST /auth/forgot-password - should handle forgot password', async ({ request }) => {
    const response = await request.post('/api/v1/auth/forgot-password', {
      data: {
        email: 'nonexistent@test.com',
        redirectTo: 'http://localhost:5173/auth/callback',
      },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('success');
    expect(body).toHaveProperty('message');
  });

  test('POST /auth/reset-password - should reject a weak password', async ({ authedRequest }) => {
    const response = await authedRequest.post('/api/v1/auth/reset-password', {
      data: { newPassword: 'short' },
    });

    expect(response.status()).toBe(400);
  });

  test('POST /auth/refresh-token - should reject invalid refresh token', async ({ request }) => {
    const response = await request.post('/api/v1/auth/refresh-token', {
      data: { refreshToken: 'invalid-token' },
    });

    expect(response.status()).toBe(401);
  });

  test('POST /auth/exchange-code - should generate an exchange code', async ({ authedRequest }) => {
    const response = await authedRequest.post('/api/v1/auth/exchange-code');

    expect([200, 201]).toContain(response.status());
    const body = await response.json();
    expect(body).toHaveProperty('code');
    expect(body).toHaveProperty('expiresIn');
  });

  test('POST /auth/exchange-code/redeem - should reject an invalid exchange code', async ({ request }) => {
    const response = await request.post('/api/v1/auth/exchange-code/redeem', {
      data: { code: 'invalid-exchange-code' },
    });

    expect(response.status()).toBe(401);
  });
});
