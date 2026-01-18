import { setupRealApiIntegration, ApiIntegrationTestHelper } from '../../helpers/api-integration-test.helper';

/**
 * Warehouses API Integration Tests
 *
 * Tests validation behavior of warehouse endpoints
 */

describe('Warehouses API - Validation Tests', () => {
  let api: ApiIntegrationTestHelper;
  const testOrgId = '00000000-0000-0000-0000-000000000003';

  beforeAll(async () => {
    api = await setupRealApiIntegration(testOrgId);
  });

  afterAll(async () => {
    await api.cleanup();
  });

  describe('POST /api/v1/warehouses', () => {
    it('should accept valid warehouse with required field only', async () => {
      const res = await api.post('/api/v1/warehouses')
        .set('x-organization-id', testOrgId)
        .send({
          name: `Test Warehouse ${Date.now()}`,
        });

      // Validation passes (DB may fail)
      expect(res.status).not.toBe(400);
    });

    it('should accept valid warehouse with optional fields', async () => {
      const res = await api.post('/api/v1/warehouses')
        .set('x-organization-id', testOrgId)
        .send({
          name: `Test Warehouse ${Date.now()}`,
          description: 'Test warehouse',
          location: 'Main Site',
          address: '123 Warehouse St',
          city: 'Casablanca',
          postal_code: '20250',
          capacity: 1000,
          capacity_unit: 'kg',
          temperature_controlled: true,
          humidity_controlled: false,
        });

      // Validation passes (DB may fail)
      expect(res.status).not.toBe(400);
    });
  });
});
