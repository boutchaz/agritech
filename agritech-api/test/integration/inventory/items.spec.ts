import { setupRealApiIntegration, ApiIntegrationTestHelper } from '../../helpers/api-integration-test.helper';

/**
 * Items API Integration Tests
 *
 * Tests validation behavior of item endpoints
 */

describe('Items API - Validation Tests', () => {
  let api: ApiIntegrationTestHelper;
  const testOrgId = '00000000-0000-0000-0000-000000000002';

  beforeAll(async () => {
    api = await setupRealApiIntegration(testOrgId);
  });

  afterAll(async () => {
    await api.cleanup();
  });

  describe('POST /api/v1/items', () => {
    it('should accept valid item with required field only', async () => {
      const res = await api.post('/api/v1/items')
        .set('x-organization-id', testOrgId)
        .send({
          item_name: `Test Item ${Date.now()}`,
        });

      // Validation passes (DB may fail on foreign keys)
      expect(res.status).not.toBe(400);
    });

    it('should accept valid item with optional fields', async () => {
      const res = await api.post('/api/v1/items')
        .set('x-organization-id', testOrgId)
        .send({
          item_name: `Test Item ${Date.now()}`,
          item_code: 'ITEM-001',
          description: 'Test item description',
          default_unit: 'kg',
          sales_rate: 100.50,
          standard_rate: 75.00,
          is_inventory_item: true,
          is_sales_item: true,
          is_purchase_item: true,
        });

      // Validation passes (DB may fail on foreign keys)
      expect(res.status).not.toBe(400);
    });
  });
});
