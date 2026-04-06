import { test as base, APIRequestContext } from '@playwright/test';

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  userId: string;
  email: string;
}

interface AuthFixture {
  authTokens: AuthTokens;
  organizationId: string;
  authedRequest: APIRequestContext;
}

export const test = base.extend<AuthFixture>({
  authTokens: async ({ request }, use) => {
    const email = process.env.TEST_USER_EMAIL;
    const password = process.env.TEST_USER_PASSWORD;

    if (!email || !password) {
      throw new Error(
        'TEST_USER_EMAIL and TEST_USER_PASSWORD must be set in .env.test'
      );
    }

    const response = await request.post('/api/v1/auth/login', {
      data: { email, password },
    });

    if (!response.ok()) {
      const body = await response.text();
      throw new Error(
        `Login failed (${response.status()}): ${body}`
      );
    }

    const data = await response.json();

    await use({
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      userId: data.user.id,
      email: data.user.email,
    });
  },

  organizationId: async ({ request, authTokens }, use) => {
    const envOrgId = process.env.TEST_ORGANIZATION_ID;
    if (envOrgId) {
      await use(envOrgId);
      return;
    }

    const response = await request.get('/api/v1/users/me/organizations', {
      headers: {
        Authorization: `Bearer ${authTokens.accessToken}`,
      },
    });

    if (!response.ok()) {
      throw new Error(
        `Failed to fetch organizations: ${response.status()}`
      );
    }

    const orgs = await response.json();
    if (!orgs.length) {
      throw new Error('Test user has no organizations');
    }

    await use(orgs[0].id);
  },

  authedRequest: async ({ playwright, baseURL, authTokens, organizationId }, use) => {
    const context = await playwright.request.newContext({
      baseURL,
      extraHTTPHeaders: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${authTokens.accessToken}`,
        'x-organization-id': organizationId,
      },
    });

    await use(context);
    await context.dispose();
  },
});

export { expect } from '@playwright/test';
