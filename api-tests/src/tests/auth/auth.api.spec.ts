import { test, expect } from '../../fixtures/auth.fixture';

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

  test('POST /auth/login - should reject invalid credentials', async ({ request }) => {
    const response = await request.post('/api/v1/auth/login', {
      data: {
        email: 'nonexistent@test.com',
        password: 'wrongpassword',
      },
    });

    expect(response.status()).toBe(401);
  });

  test('POST /auth/login - should reject missing fields', async ({ request }) => {
    const response = await request.post('/api/v1/auth/login', {
      data: { email: 'test@test.com' },
    });

    expect(response.status()).toBe(400);
  });

  test('GET /auth/me - should return authenticated user profile', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/auth/me');

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('id');
    expect(body).toHaveProperty('email');
  });

  test('GET /auth/organizations - should return user organizations', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/auth/organizations');

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
  });

  test('GET /auth/me/role - should return user role in organization', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/auth/me/role');

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('role');
  });

  test('GET /auth/me/abilities - should return CASL abilities', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/auth/me/abilities');

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('abilities');
    expect(Array.isArray(body.abilities)).toBe(true);
  });

  test('POST /auth/refresh-token - should reject invalid refresh token', async ({ request }) => {
    const response = await request.post('/api/v1/auth/refresh-token', {
      data: { refreshToken: 'invalid-token' },
    });

    expect(response.status()).toBe(401);
  });

  test('GET /auth/me - should reject unauthenticated request', async ({ request }) => {
    const response = await request.get('/api/v1/auth/me');

    expect(response.status()).toBe(401);
  });
});

test.describe('Onboarding API @auth', () => {
  test('PATCH /onboarding/state - should reject invalid step type', async ({ authedRequest }) => {
    const response = await authedRequest.patch('/api/v1/onboarding/state', {
      data: { currentStep: 'not-a-number' },
    });

    expect(response.status()).toBe(400);
  });

  test('GET /onboarding/state - should return onboarding state', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/onboarding/state');

    // 200 if onboarding exists, 404 if not — both are valid for an existing user
    expect([200, 404]).toContain(response.status());
  });
});
