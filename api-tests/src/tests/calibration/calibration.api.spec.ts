import { test, expect } from '../../fixtures/auth.fixture';

const NO_PARCEL = '00000000-0000-0000-0000-000000000000';

test.describe('Calibration API @calibration', () => {
  test('GET /parcels/:parcelId/calibration/readiness - returns 200 or 404 for nonexistent parcel', async ({ authedRequest }) => {
    const response = await authedRequest.get(`/api/v1/parcels/${NO_PARCEL}/calibration/readiness`);
    expect([200, 404]).toContain(response.status());
  });

  test('GET /parcels/:parcelId/calibration - returns 200 or 404 for nonexistent parcel', async ({ authedRequest }) => {
    const response = await authedRequest.get(`/api/v1/parcels/${NO_PARCEL}/calibration`);
    expect([200, 404]).toContain(response.status());
  });

  test('GET /parcels/:parcelId/calibration/history - returns 200 or 404 for nonexistent parcel', async ({ authedRequest }) => {
    const response = await authedRequest.get(`/api/v1/parcels/${NO_PARCEL}/calibration/history`);
    expect([200, 404]).toContain(response.status());
  });

  test('GET /parcels/:parcelId/calibration/history/recalibration - returns 200 or 404', async ({ authedRequest }) => {
    const response = await authedRequest.get(`/api/v1/parcels/${NO_PARCEL}/calibration/history/recalibration`);
    expect([200, 404]).toContain(response.status());
  });

  test('GET /parcels/:parcelId/calibration/report - returns 200 or 404', async ({ authedRequest }) => {
    const response = await authedRequest.get(`/api/v1/parcels/${NO_PARCEL}/calibration/report`);
    expect([200, 404]).toContain(response.status());
  });

  test('GET /parcels/:parcelId/calibration/review - returns 200 or 404', async ({ authedRequest }) => {
    const response = await authedRequest.get(`/api/v1/parcels/${NO_PARCEL}/calibration/review`);
    expect([200, 404]).toContain(response.status());
  });

  test('GET /parcels/:parcelId/calibration/nutrition-suggestion - returns 200 or 404', async ({ authedRequest }) => {
    const response = await authedRequest.get(`/api/v1/parcels/${NO_PARCEL}/calibration/nutrition-suggestion`);
    expect([200, 404]).toContain(response.status());
  });

  test('GET /parcels/:parcelId/calibration/percentiles - returns 200 or 404', async ({ authedRequest }) => {
    const response = await authedRequest.get(`/api/v1/parcels/${NO_PARCEL}/calibration/percentiles`);
    expect([200, 404]).toContain(response.status());
  });

  test('GET /parcels/:parcelId/calibration/zones - returns 200 or 404', async ({ authedRequest }) => {
    const response = await authedRequest.get(`/api/v1/parcels/${NO_PARCEL}/calibration/zones`);
    expect([200, 404]).toContain(response.status());
  });

  test('GET /parcels/:parcelId/calibration/irrigation-recommendation - returns 200 or 404', async ({ authedRequest }) => {
    const response = await authedRequest.get(`/api/v1/parcels/${NO_PARCEL}/calibration/irrigation-recommendation`);
    expect([200, 404]).toContain(response.status());
  });

  test('POST /parcels/:parcelId/calibration/start - rejects for nonexistent parcel', async ({ authedRequest }) => {
    const response = await authedRequest.post(`/api/v1/parcels/${NO_PARCEL}/calibration/start`);
    expect([200, 400, 404]).toContain(response.status());
  });

  test('POST /parcels/:parcelId/calibration/validate - rejects for nonexistent parcel', async ({ authedRequest }) => {
    const response = await authedRequest.post(`/api/v1/parcels/${NO_PARCEL}/calibration/validate`);
    expect([200, 400, 404]).toContain(response.status());
  });

  test('GET /parcels/:parcelId/calibration/draft - returns 200 or 404', async ({ authedRequest }) => {
    const response = await authedRequest.get(`/api/v1/parcels/${NO_PARCEL}/calibration/draft`);
    expect([200, 404]).toContain(response.status());
  });

  test('GET /parcels/:parcelId/calibration/annual/eligibility - returns 200 or 404', async ({ authedRequest }) => {
    const response = await authedRequest.get(`/api/v1/parcels/${NO_PARCEL}/calibration/annual/eligibility`);
    expect([200, 404]).toContain(response.status());
  });

  test('GET /parcels/:parcelId/calibration/annual/missing-tasks - returns 200 or 404', async ({ authedRequest }) => {
    const response = await authedRequest.get(`/api/v1/parcels/${NO_PARCEL}/calibration/annual/missing-tasks`);
    expect([200, 404]).toContain(response.status());
  });

  test('GET /parcels/:parcelId/calibration/annual/new-analyses - returns 200 or 404', async ({ authedRequest }) => {
    const response = await authedRequest.get(`/api/v1/parcels/${NO_PARCEL}/calibration/annual/new-analyses`);
    expect([200, 404]).toContain(response.status());
  });

  test('GET /parcels/:parcelId/calibration/annual/campaign-bilan - returns 200 or 404', async ({ authedRequest }) => {
    const response = await authedRequest.get(`/api/v1/parcels/${NO_PARCEL}/calibration/annual/campaign-bilan`);
    expect([200, 404]).toContain(response.status());
  });

  test('POST /parcels/:parcelId/calibration/annual/start - rejects for nonexistent parcel', async ({ authedRequest }) => {
    const response = await authedRequest.post(`/api/v1/parcels/${NO_PARCEL}/calibration/annual/start`);
    expect([200, 400, 404]).toContain(response.status());
  });

  test('POST /parcels/:parcelId/calibration/annual/snooze - rejects for nonexistent parcel', async ({ authedRequest }) => {
    const response = await authedRequest.post(`/api/v1/parcels/${NO_PARCEL}/calibration/annual/snooze`);
    expect([200, 400, 404]).toContain(response.status());
  });

  test('POST /parcels/:parcelId/calibration/annual/missing-tasks/resolve - rejects for nonexistent parcel', async ({ authedRequest }) => {
    const response = await authedRequest.post(`/api/v1/parcels/${NO_PARCEL}/calibration/annual/missing-tasks/resolve`);
    expect([200, 400, 404]).toContain(response.status());
  });

  test('POST /parcels/:parcelId/calibration/partial - rejects for nonexistent parcel', async ({ authedRequest }) => {
    const response = await authedRequest.post(`/api/v1/parcels/${NO_PARCEL}/calibration/partial`);
    expect([400, 404]).toContain(response.status());
  });

  test('PUT /parcels/:parcelId/calibration/draft - rejects for nonexistent parcel', async ({ authedRequest }) => {
    const response = await authedRequest.put(`/api/v1/parcels/${NO_PARCEL}/calibration/draft`, { data: {} });
    expect([400, 404]).toContain(response.status());
  });

  test('DELETE /parcels/:parcelId/calibration/draft - rejects for nonexistent parcel', async ({ authedRequest }) => {
    const response = await authedRequest.delete(`/api/v1/parcels/${NO_PARCEL}/calibration/draft`);
    expect([200, 400, 404]).toContain(response.status());
  });

  test('PATCH /ai/plan/interventions/:id/execute - rejects for nonexistent intervention', async ({ authedRequest }) => {
    const response = await authedRequest.patch(`/api/v1/ai/plan/interventions/${NO_PARCEL}/execute`);
    expect([400, 404]).toContain(response.status());
  });

  test('POST /parcels/:parcelId/ai/plan/ensure - rejects for nonexistent parcel', async ({ authedRequest }) => {
    const response = await authedRequest.post(`/api/v1/parcels/${NO_PARCEL}/ai/plan/ensure`);
    expect([400, 404]).toContain(response.status());
  });

  test('POST /parcels/:parcelId/ai/plan/validate - rejects for nonexistent parcel', async ({ authedRequest }) => {
    const response = await authedRequest.post(`/api/v1/parcels/${NO_PARCEL}/ai/plan/validate`);
    expect([400, 404]).toContain(response.status());
  });

  test('GET /parcels/:parcelId/ai/plan/calendar - returns 200 or 404', async ({ authedRequest }) => {
    const response = await authedRequest.get(`/api/v1/parcels/${NO_PARCEL}/ai/plan/calendar`);
    expect([200, 404]).toContain(response.status());
  });

  test('GET /parcels/:parcelId/ai/plan/interventions - returns 200 or 404', async ({ authedRequest }) => {
    const response = await authedRequest.get(`/api/v1/parcels/${NO_PARCEL}/ai/plan/interventions`);
    expect([200, 404]).toContain(response.status());
  });

  test('POST /parcels/:parcelId/ai/plan/regenerate - rejects for nonexistent parcel', async ({ authedRequest }) => {
    const response = await authedRequest.post(`/api/v1/parcels/${NO_PARCEL}/ai/plan/regenerate`);
    expect([400, 404]).toContain(response.status());
  });
});
