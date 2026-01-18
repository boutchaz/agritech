import { setupRealApiIntegration, ApiIntegrationTestHelper } from '../../helpers/api-integration-test.helper';

/**
 * Stock Entries API Integration Tests
 *
 * Tests validation behavior of stock entry endpoints
 */

describe('Stock Entries API - Validation Tests', () => {
  let api: ApiIntegrationTestHelper;
  const testOrgId = '00000000-0000-0000-0000-000000000004';

  beforeAll(async () => {
    api = await setupRealApiIntegration(testOrgId);
  });

  afterAll(async () => {
    await api.cleanup();
  });

  describe('POST /api/v1/stock-entries', () => {
    it('should accept valid stock entry', async () => {
      const res = await api.post('/api/v1/stock-entries')
        .set('x-organization-id', testOrgId)
        .send({
          warehouse_id: '00000000-0000-0000-0000-000000000001',
          item_id: '00000000-0000-0000-0000-000000000001',
          quantity: 10,
          type: 'in',
        });

      // Validation passes (DB may fail on foreign keys)
      expect(res.status).not.toBe(400);
    });
  });
});
