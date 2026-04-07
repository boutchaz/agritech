import { test, expect } from '../../fixtures/auth.fixture';

test.describe('Campaigns API @campaigns @smoke', () => {
  test('GET /campaigns - should list campaigns', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/campaigns');

    expect(response.status()).toBe(200);
  });

  test('GET /campaigns/statistics - should return campaign statistics', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/campaigns/statistics');

    expect(response.status()).toBe(200);
  });
});

test.describe('Campaign Summary API @campaigns', () => {
  test('GET /campaign-summary - should return campaign summary', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/campaign-summary');

    expect([200, 404]).toContain(response.status());
  });
});

test.describe('Annual Plan API @campaigns', () => {
  test('GET /parcels/:parcelId/ai/plan - should handle missing parcel gracefully', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/parcels/00000000-0000-0000-0000-000000000000/ai/plan');

    expect([200, 404]).toContain(response.status());
  });

  test('GET /parcels/:parcelId/ai/plan/summary - should handle missing parcel gracefully', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/parcels/00000000-0000-0000-0000-000000000000/ai/plan/summary');

    expect([200, 404]).toContain(response.status());
  });
});
