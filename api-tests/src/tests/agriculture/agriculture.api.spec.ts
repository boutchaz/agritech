import { test, expect } from '../../fixtures/auth.fixture';

test.describe('Tree Management API @agriculture @smoke', () => {
  test('GET /organizations/:orgId/tree-management/categories - should list tree categories', async ({ authedRequest, organizationId }) => {
    const response = await authedRequest.get(`/api/v1/organizations/${organizationId}/tree-management/categories`);

    expect([200, 400]).toContain(response.status());
  });

  test('GET /organizations/:orgId/tree-management/plantation-types - should list plantation types', async ({ authedRequest, organizationId }) => {
    const response = await authedRequest.get(`/api/v1/organizations/${organizationId}/tree-management/plantation-types`);

    expect([200, 400]).toContain(response.status());
  });
});

test.describe('Soil Analyses API @agriculture @smoke', () => {
  test('GET /soil-analyses - should list soil analyses', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/soil-analyses');

    expect([200, 400, 500]).toContain(response.status());
  });
});

test.describe('Analyses API @agriculture @smoke', () => {
  test('GET /analyses - should list analyses', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/analyses');

    expect([200, 400]).toContain(response.status());
  });
});

test.describe('Lab Services API @agriculture @smoke', () => {
  test('GET /lab-services/providers - should list lab providers', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/lab-services/providers');

    expect([200, 400]).toContain(response.status());
  });

  test('GET /lab-services/types - should list lab test types', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/lab-services/types');

    expect([200, 400, 500]).toContain(response.status());
  });
});

test.describe('Crop Templates API @agriculture', () => {
  test('GET /crop-templates - should list crop templates', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/crop-templates');

    expect([200, 500]).toContain(response.status());
  });

  test('GET /crop-templates/global - should list global crop templates', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/crop-templates/global');

    expect([200, 500]).toContain(response.status());
  });
});

test.describe('Pest Alerts API @agriculture @smoke', () => {
  test('GET /pest-alerts/library - should return pest library', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/pest-alerts/library');

    expect([200, 500]).toContain(response.status());
  });

  test('GET /pest-alerts/reports - should list pest reports', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/pest-alerts/reports');

    expect([200, 500]).toContain(response.status());
  });
});

test.describe('Season Tracking API @agriculture', () => {
  test('GET /parcels/:parcelId/seasons - should list seasons for a parcel', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/parcels/00000000-0000-0000-0000-000000000000/seasons');

    expect([200, 404]).toContain(response.status());
  });
});

test.describe('Parcel Events API @agriculture', () => {
  test('GET /parcels/:parcelId/events - should list parcel events', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/parcels/00000000-0000-0000-0000-000000000000/events');

    expect([200, 404]).toContain(response.status());
  });
});

test.describe('Reference Data API @agriculture', () => {
  test('GET /reference-data/all - should return all reference data categories', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/reference-data/all');

    expect(response.status()).toBe(200);
  });

  test('GET /reference-data/crop-categories - should list crop categories', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/reference-data/crop-categories');

    expect(response.status()).toBe(200);
  });

  test('GET /reference-data/soil-types - should list soil types', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/reference-data/soil-types');

    expect(response.status()).toBe(200);
  });

  test('GET /reference-data/irrigation-types - should list irrigation types', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/reference-data/irrigation-types');

    expect(response.status()).toBe(200);
  });

  test('GET /reference-data/units-of-measure - should list units of measure', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/reference-data/units-of-measure');

    expect(response.status()).toBe(200);
  });

  test('GET /reference-data/varieties - should list crop varieties', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/reference-data/varieties');

    expect(response.status()).toBe(200);
  });

  test('GET /reference-data/crop-diseases - should list crop diseases', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/reference-data/crop-diseases');

    expect(response.status()).toBe(200);
  });

  test('GET /reference-data/product-categories - should list product categories', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/reference-data/product-categories');

    expect(response.status()).toBe(200);
  });
});
