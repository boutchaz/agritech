import { test, expect } from '../../fixtures/auth.fixture';

test.describe('Reference Data - Crop & Plant @reference-data @smoke', () => {
  test('GET /reference-data/all - should return all reference data', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/reference-data/all');
    expect(response.status()).toBe(200);
  });

  test('GET /reference-data/crop-categories - should list crop categories', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/reference-data/crop-categories');
    expect(response.status()).toBe(200);
  });

  test('GET /reference-data/crop-categories/:id - should get crop category by id', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/reference-data/crop-categories/1');
    expect([200, 404]).toContain(response.status());
  });

  test('GET /reference-data/crop-types - should list crop types', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/reference-data/crop-types');
    expect(response.status()).toBe(200);
  });

  test('GET /reference-data/varieties - should list varieties', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/reference-data/varieties');
    expect(response.status()).toBe(200);
  });

  test('GET /reference-data/crop-diseases - should list crop diseases', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/reference-data/crop-diseases');
    expect(response.status()).toBe(200);
  });

  test('GET /reference-data/crop-index-thresholds - should list index thresholds', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/reference-data/crop-index-thresholds');
    expect(response.status()).toBe(200);
  });

  test('GET /reference-data/crop-kc-coefficients - should list KC coefficients', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/reference-data/crop-kc-coefficients');
    expect(response.status()).toBe(200);
  });

  test('GET /reference-data/crop-mineral-exports - should list mineral exports', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/reference-data/crop-mineral-exports');
    expect(response.status()).toBe(200);
  });

  test('GET /reference-data/tree-categories - should list tree categories', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/reference-data/tree-categories');
    expect(response.status()).toBe(200);
  });

  test('GET /reference-data/tree-categories/:id - should get tree category by id', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/reference-data/tree-categories/1');
    expect([200, 404]).toContain(response.status());
  });

  test('GET /reference-data/trees - should list trees', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/reference-data/trees');
    expect(response.status()).toBe(200);
  });

  test('GET /reference-data/plantation-types - should list plantation types', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/reference-data/plantation-types');
    expect(response.status()).toBe(200);
  });

  test('GET /reference-data/plantation-types/:id - should get plantation type by id', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/reference-data/plantation-types/1');
    expect([200, 404]).toContain(response.status());
  });
});

test.describe('Reference Data - Soil & Irrigation @reference-data', () => {
  test('GET /reference-data/soil-types - should list soil types', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/reference-data/soil-types');
    expect(response.status()).toBe(200);
  });

  test('GET /reference-data/soil-textures - should list soil textures', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/reference-data/soil-textures');
    expect(response.status()).toBe(200);
  });

  test('GET /reference-data/irrigation-types - should list irrigation types', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/reference-data/irrigation-types');
    expect(response.status()).toBe(200);
  });
});

test.describe('Reference Data - Products & Inventory @reference-data', () => {
  test('GET /reference-data/product-categories - should list product categories', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/reference-data/product-categories');
    expect(response.status()).toBe(200);
  });

  test('GET /reference-data/product-categories/:id - should get product category by id', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/reference-data/product-categories/1');
    expect([200, 404]).toContain(response.status());
  });

  test('GET /reference-data/product-subcategories - should list product subcategories', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/reference-data/product-subcategories');
    expect(response.status()).toBe(200);
  });

  test('GET /reference-data/units-of-measure - should list units of measure', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/reference-data/units-of-measure');
    expect(response.status()).toBe(200);
  });

  test('GET /reference-data/quality-grades - should list quality grades', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/reference-data/quality-grades');
    expect(response.status()).toBe(200);
  });
});

test.describe('Reference Data - Harvest & Sale @reference-data', () => {
  test('GET /reference-data/harvest-statuses - should list harvest statuses', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/reference-data/harvest-statuses');
    expect(response.status()).toBe(200);
  });

  test('GET /reference-data/intended-uses - should list intended uses', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/reference-data/intended-uses');
    expect(response.status()).toBe(200);
  });

  test('GET /reference-data/sale-types - should list sale types', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/reference-data/sale-types');
    expect(response.status()).toBe(200);
  });

  test('GET /reference-data/seasonalities - should list seasonalities', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/reference-data/seasonalities');
    expect(response.status()).toBe(200);
  });
});

test.describe('Reference Data - Infrastructure @reference-data', () => {
  test('GET /reference-data/utility-types - should list utility types', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/reference-data/utility-types');
    expect(response.status()).toBe(200);
  });

  test('GET /reference-data/infrastructure-types - should list infrastructure types', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/reference-data/infrastructure-types');
    expect(response.status()).toBe(200);
  });

  test('GET /reference-data/basin-shapes - should list basin shapes', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/reference-data/basin-shapes');
    expect(response.status()).toBe(200);
  });
});

test.describe('Reference Data - Workforce @reference-data', () => {
  test('GET /reference-data/task-priorities - should list task priorities', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/reference-data/task-priorities');
    expect(response.status()).toBe(200);
  });

  test('GET /reference-data/worker-types - should list worker types', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/reference-data/worker-types');
    expect(response.status()).toBe(200);
  });

  test('GET /reference-data/metayage-types - should list metayage types', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/reference-data/metayage-types');
    expect(response.status()).toBe(200);
  });

  test('GET /reference-data/experience-levels - should list experience levels', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/reference-data/experience-levels');
    expect(response.status()).toBe(200);
  });
});

test.describe('Reference Data - Financial @reference-data', () => {
  test('GET /reference-data/payment-methods - should list payment methods', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/reference-data/payment-methods');
    expect(response.status()).toBe(200);
  });

  test('GET /reference-data/payment-statuses - should list payment statuses', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/reference-data/payment-statuses');
    expect(response.status()).toBe(200);
  });

  test('GET /reference-data/cost-categories - should list cost categories', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/reference-data/cost-categories');
    expect(response.status()).toBe(200);
  });

  test('GET /reference-data/revenue-categories - should list revenue categories', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/reference-data/revenue-categories');
    expect(response.status()).toBe(200);
  });
});

test.describe('Reference Data - Lab & Testing @reference-data', () => {
  test('GET /reference-data/test-types - should list test types', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/reference-data/test-types');
    expect(response.status()).toBe(200);
  });

  test('GET /reference-data/test-types/:id - should get test type by id', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/reference-data/test-types/1');
    expect([200, 404]).toContain(response.status());
  });

  test('GET /reference-data/lab-service-categories - should list lab service categories', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/reference-data/lab-service-categories');
    expect(response.status()).toBe(200);
  });
});

test.describe('Reference Data - Delivery @reference-data', () => {
  test('GET /reference-data/delivery-types - should list delivery types', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/reference-data/delivery-types');
    expect(response.status()).toBe(200);
  });

  test('GET /reference-data/delivery-statuses - should list delivery statuses', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/reference-data/delivery-statuses');
    expect(response.status()).toBe(200);
  });
});

test.describe('Reference Data - General @reference-data', () => {
  test('GET /reference-data/document-types - should list document types', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/reference-data/document-types');
    expect(response.status()).toBe(200);
  });

  test('GET /reference-data/currencies - should list currencies', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/reference-data/currencies');
    expect(response.status()).toBe(200);
  });

  test('GET /reference-data/timezones - should list timezones', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/reference-data/timezones');
    expect(response.status()).toBe(200);
  });

  test('GET /reference-data/languages - should list languages', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/reference-data/languages');
    expect(response.status()).toBe(200);
  });
});
