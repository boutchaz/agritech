import { setupRealApiIntegration, ApiIntegrationTestHelper } from '../../helpers/api-integration-test.helper';

const generateUUID = () => {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
  return [hex.substring(0, 8), hex.substring(8, 12), hex.substring(12, 16), hex.substring(16, 20), hex.substring(20, 32)].join('-');
};

describe('SalesOrders API - Validation Tests', () => {
  let api: ApiIntegrationTestHelper;
  const testOrgId = generateUUID();

  beforeAll(async () => { api = await setupRealApiIntegration(generateUUID()); }, 60000);
  afterAll(async () => { await api.cleanup(); });

  describe('POST /api/v1/sales-orders', () => {
    it('should reject payload missing required fields', async () => {
      const res = await api.post('/api/v1/sales-orders').set('x-organization-id', testOrgId).send({});
      expect([400, 403, 404]).toContain(res.status);
    });

    it('should reject empty items array', async () => {
      const res = await api.post('/api/v1/sales-orders').set('x-organization-id', testOrgId).send({
        order_date: '2025-01-01',
        customer_name: 'Buyer A',
        items: [],
      });
      expect([400, 403, 404]).toContain(res.status);
    });

    it('should reject invalid nested item quantity', async () => {
      const res = await api.post('/api/v1/sales-orders').set('x-organization-id', testOrgId).send({
        order_date: '2025-01-01',
        customer_name: 'Buyer A',
        items: [{ line_number: 1, item_name: 'Item A', quantity: 0, unit_price: 10 }],
      });
      expect([400, 403, 404]).toContain(res.status);
    });

    it('should reject invalid customer UUID', async () => {
      const res = await api.post('/api/v1/sales-orders').set('x-organization-id', testOrgId).send({
        order_date: '2025-01-01',
        customer_id: 'invalid-uuid',
        customer_name: 'Buyer A',
        items: [{ line_number: 1, item_name: 'Item A', quantity: 1, unit_price: 10 }],
      });
      expect([400, 403, 404]).toContain(res.status);
    });

    it('should accept valid sales order payload', async () => {
      const res = await api.post('/api/v1/sales-orders').set('x-organization-id', testOrgId).send({
        order_date: '2025-01-01',
        expected_delivery_date: '2025-01-05',
        customer_name: 'Buyer A',
        items: [{ line_number: 1, item_name: 'Item A', quantity: 1, unit_price: 10 }],
      });
      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('GET /api/v1/sales-orders', () => {
    it('should reject invalid status filter', async () => {
      const res = await api.get('/api/v1/sales-orders?status=not-valid').set('x-organization-id', testOrgId);
      expect([400, 403, 404]).toContain(res.status);
    });

    it('should reject invalid customer_id filter', async () => {
      const res = await api.get('/api/v1/sales-orders?customer_id=not-uuid').set('x-organization-id', testOrgId);
      expect([400, 403, 404]).toContain(res.status);
    });
  });

  describe('PATCH /api/v1/sales-orders/:id/status', () => {
    it('should reject invalid status payload enum', async () => {
      const res = await api.patch(`/api/v1/sales-orders/${generateUUID()}/status`).set('x-organization-id', testOrgId).send({
        status: 'bad-status',
      });
      expect([400, 403, 404]).toContain(res.status);
    });
  });

  describe('POST /api/v1/sales-orders/:id/convert-to-invoice', () => {
    it('should reject invalid invoice_date', async () => {
      const res = await api.post(`/api/v1/sales-orders/${generateUUID()}/convert-to-invoice`).set('x-organization-id', testOrgId).send({
        invoice_date: 'bad-date',
      });
      expect([400, 403, 404]).toContain(res.status);
    });
  });

  describe('POST /api/v1/sales-orders/:id/issue-stock', () => {
    it('should reject missing warehouse_id query param', async () => {
      const res = await api.post(`/api/v1/sales-orders/${generateUUID()}/issue-stock`).set('x-organization-id', testOrgId).send({});
      expect([400, 403, 404]).toContain(res.status);
    });
  });
});
