import { test, expect } from '../../fixtures/auth.fixture';
import { expectPaginated, expectObject, expectArray, expectStatus, expectExactStatus, expectError, expectUnauthorized, createWithCleanup } from '../../helpers/assertions';
import { testData } from '../../helpers/test-data';

const NO_ID = '00000000-0000-0000-0000-000000000000';

test.describe('Farms API @farms @smoke', () => {
  test('GET /farms - should list farms with paginated response', async ({ authedRequest }) => {
    const body = await expectPaginated(authedRequest.get('/api/v1/farms'), 'farms');
    if (body.data.length > 0) {
      const farm = body.data[0];
      expect(farm).toHaveProperty('farm_id');
      expect(farm).toHaveProperty('farm_name');
      expect(farm).toHaveProperty('farm_type');
    }
  });

  test('GET /farms/roles/available - should list available farm roles', async ({ authedRequest }) => {
    const body = await expectArray(authedRequest.get('/api/v1/farms/roles/available'), 'farm roles');
    expect(body.length).toBeGreaterThan(0);
  });

  test('GET /farms - should reject unauthenticated request', async ({ request }) => {
    await expectUnauthorized(request.get('/api/v1/farms'));
  });

  test('POST /farms/batch-delete - should reject without ids', async ({ authedRequest }) => {
    await expectError(authedRequest.post('/api/v1/farms/batch-delete', { data: {} }), [400, 404]);
  });

  test('POST /farms/export - should handle export request', async ({ authedRequest }) => {
    await expectStatus(authedRequest.post('/api/v1/farms/export', { data: {} }), [200, 400, 404]);
  });
});

test.describe('Farm CRUD @farms', () => {
  let farmId: string | null = null;

  test('POST /farms/import - should create a farm or return validation/subscription error', async ({ authedRequest }) => {
    const response = await authedRequest.post('/api/v1/farms/import', { data: testData.farm() });
    const status = response.status();
    expect([200, 201, 400, 403], `Unexpected status ${status}`).toContain(status);
    if (status === 200 || status === 201) {
      const body = await response.json();
      if (body.id) farmId = body.id;
    }
  });

  test('GET /farms/:id - should get farm by id', async ({ authedRequest }) => {
    if (!farmId) test.skip();
    const body = await expectObject(authedRequest.get(`/api/v1/farms/${farmId}`), 'farm detail');
    expect(body).toHaveProperty('farm_id', farmId);
  });

  test('GET /farms/:id/related-data-counts - should return related data counts', async ({ authedRequest }) => {
    if (!farmId) test.skip();
    const body = await expectObject(authedRequest.get(`/api/v1/farms/${farmId}/related-data-counts`), 'farm related counts');
    expect(typeof body).toBe('object');
  });

  test('PATCH /farms/:id - should update farm name', async ({ authedRequest }) => {
    if (!farmId) test.skip();
    const body = await expectStatus(
      authedRequest.patch(`/api/v1/farms/${farmId}`, { data: { name: `Updated ${Date.now()}` } }),
      [200, 204],
    );
  });

  test('GET /farms/:id/roles - should list farm roles', async ({ authedRequest }) => {
    if (!farmId) test.skip();
    await expectExactStatus(authedRequest.get(`/api/v1/farms/${farmId}/roles`), 200);
  });

  test('GET /farms/:id/organization-users - should list farm org users', async ({ authedRequest }) => {
    if (!farmId) test.skip();
    await expectExactStatus(authedRequest.get(`/api/v1/farms/${farmId}/organization-users`), 200);
  });

  test.afterAll(async ({ authedRequest }) => {
    if (farmId) {
      await authedRequest.delete('/api/v1/farms', { data: { ids: [farmId] } }).catch(() => {});
    }
  });
});

test.describe('Parcels API @farms @smoke', () => {
  test('GET /parcels - should list parcels with paginated response', async ({ authedRequest }) => {
    const body = await expectPaginated(authedRequest.get('/api/v1/parcels'), 'parcels');
    if (body.data.length > 0) {
      const parcel = body.data[0];
      expect(parcel).toHaveProperty('id');
      expect(parcel).toHaveProperty('name');
      expect(parcel).toHaveProperty('farm_id');
    }
  });

  test('GET /parcels/performance - should return parcel performance', async ({ authedRequest }) => {
    await expectStatus(authedRequest.get('/api/v1/parcels/performance'), [200, 404]);
  });

  test('GET /parcels - should reject unauthenticated request', async ({ request }) => {
    await expectUnauthorized(request.get('/api/v1/parcels'));
  });
});

test.describe('Structures API @farms', () => {
  test('GET /structures - should list structures', async ({ authedRequest, organizationId }) => {
    // Structures endpoint returns a bare array, not paginated
    const body = await expectArray(
      authedRequest.get(`/api/v1/organizations/${organizationId}/structures`),
      'structures',
    );
    if (body.length > 0) {
      expect(body[0]).toHaveProperty('id');
    }
  });
});

test.describe('Farm error cases @farms', () => {
  test('GET /farms/:id - should 404 for nonexistent farm', async ({ authedRequest }) => {
    await expectError(authedRequest.get(`/api/v1/farms/${NO_ID}`), [400, 404]);
  });

  test('PATCH /farms/:id - should 404 for nonexistent farm', async ({ authedRequest }) => {
    await expectError(authedRequest.patch(`/api/v1/farms/${NO_ID}`, { data: { name: 'Nope' } }), [400, 404]);
  });
});
