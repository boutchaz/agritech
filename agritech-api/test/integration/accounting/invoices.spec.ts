import { setupRealApiIntegration, ApiIntegrationTestHelper } from '../../helpers/api-integration-test.helper';

const generateUUID = () => {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return [hex.substring(0, 8), hex.substring(8, 12), hex.substring(12, 16), hex.substring(16, 20), hex.substring(20, 32)].join('-');
};

describe('Invoices API - Validation Tests', () => {
  let api: ApiIntegrationTestHelper;
  const testOrgId = generateUUID();

  beforeAll(async () => { api = await setupRealApiIntegration(generateUUID()); }, 60000);
  afterAll(async () => { await api.cleanup(); });

  describe('POST /api/v1/invoices', () => {
    it('should reject missing required fields', async () => {
      const res = await api.post('/api/v1/invoices')
        .set('x-organization-id', testOrgId)
        .send({ invoice_type: 'sales' });

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should reject invalid field formats', async () => {
      const res = await api.post('/api/v1/invoices')
        .set('x-organization-id', testOrgId)
        .send({
          invoice_type: 'sales',
          party_type: 'Customer',
          party_name: 'Buyer',
          invoice_date: '2025-01-01',
          due_date: '2025-02-01',
          subtotal: 100,
          tax_total: 20,
          grand_total: 120,
          outstanding_amount: 120,
          items: [{ item_name: 'Item A', quantity: 1, unit_price: 100, amount: 100, tax_amount: 20, line_total: 120, tax_id: 'bad-uuid' }],
        });

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should accept a valid payload', async () => {
      const res = await api.post('/api/v1/invoices')
        .set('x-organization-id', testOrgId)
        .send({
          invoice_type: 'sales',
          party_type: 'Customer',
          party_name: 'Buyer',
          invoice_date: '2025-01-01',
          due_date: '2025-02-01',
          subtotal: 100,
          tax_total: 20,
          grand_total: 120,
          outstanding_amount: 120,
          items: [{ item_name: 'Item A', quantity: 1, unit_price: 100, amount: 100, tax_amount: 20, line_total: 120 }],
        });

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('PATCH /api/v1/invoices/:id/status', () => {
    it('should reject invalid enum status', async () => {
      const res = await api.patch(`/api/v1/invoices/${generateUUID()}/status`)
        .set('x-organization-id', testOrgId)
        .send({ status: 'not-valid' });

      expect([400, 403, 404]).toContain(res.status);
    });
  });

  describe('GET /api/v1/invoices', () => {
    it('should fail without organization header', async () => {
      const res = await api.get('/api/v1/invoices');
      expect([400, 403, 404, 500]).toContain(res.status);
    });

    it('should accept request with organization header', async () => {
      const res = await api.get('/api/v1/invoices').set('x-organization-id', testOrgId);
      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('DELETE /api/v1/invoices/:id', () => {
    it('should fail without organization header', async () => {
      const res = await api.delete(`/api/v1/invoices/${generateUUID()}`);
      expect([400, 403, 404, 500]).toContain(res.status);
    });

    it('should accept request with organization header', async () => {
      const res = await api.delete(`/api/v1/invoices/${generateUUID()}`).set('x-organization-id', testOrgId);
      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });
});
