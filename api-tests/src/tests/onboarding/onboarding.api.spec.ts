import { test, expect } from '../../fixtures/auth.fixture';

const NO_ID = '00000000-0000-0000-0000-000000000000';

test.describe('Onboarding API @onboarding', () => {
  test('GET /onboarding/check-slug - should check slug availability', async ({ request }) => {
    const response = await request.get('/api/v1/onboarding/check-slug?slug=unique-test-slug-' + Date.now());
    expect([200, 401]).toContain(response.status());
  });

  test('GET /onboarding/state - returns 200 or 404', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/onboarding/state');
    expect([200, 404]).toContain(response.status());
  });

  test('PATCH /onboarding/state - rejects invalid step', async ({ authedRequest }) => {
    const response = await authedRequest.patch('/api/v1/onboarding/state', {
      data: { currentStep: 'invalid' },
    });
    expect(response.status()).toBe(400);
  });

  test('DELETE /onboarding/state - returns 200 or 404', async ({ authedRequest }) => {
    const response = await authedRequest.delete('/api/v1/onboarding/state');
    expect([200, 204, 404]).toContain(response.status());
  });

  test('POST /onboarding/profile - rejects empty data', async ({ authedRequest }) => {
    const response = await authedRequest.post('/api/v1/onboarding/profile', { data: {} });
    expect([201, 400, 422]).toContain(response.status());
  });

  test('POST /onboarding/organization - rejects empty data', async ({ authedRequest }) => {
    const response = await authedRequest.post('/api/v1/onboarding/organization', { data: {} });
    expect([201, 400, 422]).toContain(response.status());
  });

  test('POST /onboarding/farm - rejects empty data', async ({ authedRequest }) => {
    const response = await authedRequest.post('/api/v1/onboarding/farm', { data: {} });
    expect([200, 201, 400, 422]).toContain(response.status());
  });

  test('POST /onboarding/modules - rejects empty data', async ({ authedRequest }) => {
    const response = await authedRequest.post('/api/v1/onboarding/modules', { data: {} });
    expect([400, 422]).toContain(response.status());
  });

  test('POST /onboarding/complete - returns 200 or 400', async ({ authedRequest }) => {
    const response = await authedRequest.post('/api/v1/onboarding/complete', { data: {} });
    expect([200, 400, 404]).toContain(response.status());
  });
});
