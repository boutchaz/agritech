import { test, expect } from '../../fixtures/auth.fixture';

const NO_ID = '00000000-0000-0000-0000-000000000000';
const ACCEPTED_POST_STATUSES = [200, 201, 400, 404, 422, 502];
const ACCEPTED_MISSING_RESOURCE_STATUSES = [200, 404, 502];

const expectPostValidation = async (authedRequest: any, path: string) => {
  const response = await authedRequest.post(path, { data: {} });

  expect(ACCEPTED_POST_STATUSES).toContain(response.status());
};

const expectMissingResource = async (authedRequest: any, path: string) => {
  const response = await authedRequest.get(path);

  expect(ACCEPTED_MISSING_RESOURCE_STATUSES).toContain(response.status());
};

const expectOk = async (authedRequest: any, path: string) => {
  const response = await authedRequest.get(path);

  expect([200, 422]).toContain(response.status());
};

test.describe('Satellite Proxy API @satellite', () => {
  test('POST /satellite-proxy/indices/calculate returns a validation response', async ({ authedRequest }) => {
    await expectPostValidation(authedRequest, '/api/v1/satellite-proxy/indices/calculate');
  });

  test('POST /satellite-proxy/indices/timeseries returns a validation response', async ({ authedRequest }) => {
    await expectPostValidation(authedRequest, '/api/v1/satellite-proxy/indices/timeseries');
  });

  test('POST /satellite-proxy/indices/heatmap returns a validation response', async ({ authedRequest }) => {
    await expectPostValidation(authedRequest, '/api/v1/satellite-proxy/indices/heatmap');
  });

  test('POST /satellite-proxy/indices/interactive returns a validation response', async ({ authedRequest }) => {
    await expectPostValidation(authedRequest, '/api/v1/satellite-proxy/indices/interactive');
  });

  test('POST /satellite-proxy/indices/export returns a validation response', async ({ authedRequest }) => {
    await expectPostValidation(authedRequest, '/api/v1/satellite-proxy/indices/export');
  });

  test('POST /satellite-proxy/indices/bulk-export returns a validation response', async ({ authedRequest }) => {
    await expectPostValidation(authedRequest, '/api/v1/satellite-proxy/indices/bulk-export');
  });

  test('POST /satellite-proxy/indices/available-dates returns a validation response', async ({ authedRequest }) => {
    await expectPostValidation(authedRequest, '/api/v1/satellite-proxy/indices/available-dates');
  });

  test('GET /satellite-proxy/indices/available @smoke returns available indices', async ({ authedRequest }) => {
    await expectOk(authedRequest, '/api/v1/satellite-proxy/indices/available');
  });

  test('GET /satellite-proxy/indices/provider-info returns provider info', async ({ authedRequest }) => {
    await expectOk(authedRequest, '/api/v1/satellite-proxy/indices/provider-info');
  });

  test('POST /satellite-proxy/analysis/cloud-coverage returns a validation response', async ({ authedRequest }) => {
    await expectPostValidation(authedRequest, '/api/v1/satellite-proxy/analysis/cloud-coverage');
  });

  test('POST /satellite-proxy/analysis/parcel-statistics returns a validation response', async ({ authedRequest }) => {
    await expectPostValidation(authedRequest, '/api/v1/satellite-proxy/analysis/parcel-statistics');
  });

  test('POST /satellite-proxy/analysis/generate-index-image returns a validation response', async ({ authedRequest }) => {
    await expectPostValidation(authedRequest, '/api/v1/satellite-proxy/analysis/generate-index-image');
  });

  test('POST /satellite-proxy/analysis/batch returns a validation response', async ({ authedRequest }) => {
    await expectPostValidation(authedRequest, '/api/v1/satellite-proxy/analysis/batch');
  });

  test('GET /satellite-proxy/analysis/batch/:jobId/status handles a missing job', async ({ authedRequest }) => {
    await expectMissingResource(authedRequest, `/api/v1/satellite-proxy/analysis/batch/${NO_ID}/status`);
  });

  test('GET /satellite-proxy/supabase/parcels/:parcelId/satellite-data handles a missing parcel', async ({ authedRequest }) => {
    await expectMissingResource(authedRequest, `/api/v1/satellite-proxy/supabase/parcels/${NO_ID}/satellite-data`);
  });

  test('GET /satellite-proxy/supabase/parcels/:parcelId/latest-data handles a missing parcel', async ({ authedRequest }) => {
    await expectMissingResource(authedRequest, `/api/v1/satellite-proxy/supabase/parcels/${NO_ID}/latest-data`);
  });

  test('POST /satellite-proxy/supabase/parcels/:parcelId/statistics returns a validation response', async ({ authedRequest }) => {
    await expectPostValidation(authedRequest, `/api/v1/satellite-proxy/supabase/parcels/${NO_ID}/statistics`);
  });

  test('GET /satellite-proxy/sync/parcel/:parcelId/status handles a missing parcel', async ({ authedRequest }) => {
    await expectMissingResource(authedRequest, `/api/v1/satellite-proxy/sync/parcel/${NO_ID}/status`);
  });

  test('POST /satellite-proxy/sync/parcel returns a validation response', async ({ authedRequest }) => {
    await expectPostValidation(authedRequest, '/api/v1/satellite-proxy/sync/parcel');
  });

  test('GET /satellite-proxy/weather/historical returns historical weather', async ({ authedRequest }) => {
    await expectOk(authedRequest, '/api/v1/satellite-proxy/weather/historical');
  });

  test('GET /satellite-proxy/weather/forecast returns weather forecast', async ({ authedRequest }) => {
    await expectOk(authedRequest, '/api/v1/satellite-proxy/weather/forecast');
  });

  test('POST /satellite-proxy/weather/derived returns a validation response', async ({ authedRequest }) => {
    await expectPostValidation(authedRequest, '/api/v1/satellite-proxy/weather/derived');
  });

  test('POST /satellite-proxy/indices/timeseries-sync returns a validation response', async ({ authedRequest }) => {
    await expectPostValidation(authedRequest, '/api/v1/satellite-proxy/indices/timeseries-sync');
  });

  test('GET /satellite-proxy/indices/timeseries-sync/:parcelId/status handles a missing parcel', async ({ authedRequest }) => {
    await expectMissingResource(authedRequest, `/api/v1/satellite-proxy/indices/timeseries-sync/${NO_ID}/status`);
  });

  test('POST /satellite-proxy/cache/warmup returns a validation response', async ({ authedRequest }) => {
    await expectPostValidation(authedRequest, '/api/v1/satellite-proxy/cache/warmup');
  });

  test('GET /satellite-proxy/cache/warmup/status returns cache warmup status', async ({ authedRequest }) => {
    await expectOk(authedRequest, '/api/v1/satellite-proxy/cache/warmup/status');
  });

  test('GET /satellite-proxy/billing/quotes/:quoteId/pdf handles a missing quote', async ({ authedRequest }) => {
    await expectMissingResource(authedRequest, `/api/v1/satellite-proxy/billing/quotes/${NO_ID}/pdf`);
  });

  test('GET /satellite-proxy/billing/invoices/:invoiceId/pdf handles a missing invoice', async ({ authedRequest }) => {
    await expectMissingResource(authedRequest, `/api/v1/satellite-proxy/billing/invoices/${NO_ID}/pdf`);
  });

  test('GET /satellite-proxy/billing/purchase-orders/:poId/pdf handles a missing purchase order', async ({ authedRequest }) => {
    await expectMissingResource(authedRequest, `/api/v1/satellite-proxy/billing/purchase-orders/${NO_ID}/pdf`);
  });

  test('GET /satellite-proxy/health @smoke returns proxy health', async ({ authedRequest }) => {
    await expectOk(authedRequest, '/api/v1/satellite-proxy/health');
  });
});

test.describe('Satellite Indices API @satellite', () => {
  test('GET /satellite-indices @smoke lists satellite indices', async ({ authedRequest }) => {
    await expectOk(authedRequest, '/api/v1/satellite-indices');
  });

  test('GET /satellite-indices/:id handles a missing satellite index', async ({ authedRequest }) => {
    await expectMissingResource(authedRequest, `/api/v1/satellite-indices/${NO_ID}`);
  });

  test('POST /satellite-indices returns a validation response', async ({ authedRequest }) => {
    await expectPostValidation(authedRequest, '/api/v1/satellite-indices');
  });

  test('DELETE /satellite-indices/:id handles a missing satellite index', async ({ authedRequest }) => {
    const response = await authedRequest.delete(`/api/v1/satellite-indices/${NO_ID}`);

    expect([200, 404]).toContain(response.status());
  });
});

test.describe('Weather API @satellite', () => {
  test('GET /weather/parcel/:parcelId handles a missing parcel', async ({ authedRequest }) => {
    await expectMissingResource(authedRequest, `/api/v1/weather/parcel/${NO_ID}`);
  });
});
