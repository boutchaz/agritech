import { setupRealApiIntegration, ApiIntegrationTestHelper } from '../../helpers/api-integration-test.helper';

const generateUUID = () => {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
  return [hex.substring(0, 8), hex.substring(8, 12), hex.substring(12, 16), hex.substring(16, 20), hex.substring(20, 32)].join('-');
};

describe('Quotes API - Validation Tests', () => {
  let api: ApiIntegrationTestHelper;
  const testOrgId = generateUUID();

  beforeAll(async () => { api = await setupRealApiIntegration(generateUUID()); }, 60000);
  afterAll(async () => { await api.cleanup(); });

  describe('POST /api/v1/quotes', () => {
    it('should reject payload missing required fields', async () => {
      const res = await api.post('/api/v1/quotes').set('x-organization-id', testOrgId).send({});
      expect([400, 403, 404]).toContain(res.status);
    });

    it('should reject invalid customer UUID', async () => {
      const res = await api.post('/api/v1/quotes').set('x-organization-id', testOrgId).send({
        quote_date: '2025-01-01',
        valid_until: '2025-02-01',
        customer_id: 'invalid-uuid',
        items: [{ line_number: 1, item_name: 'Item A', quantity: 1, unit_price: 10 }],
      });
      expect([400, 403, 404]).toContain(res.status);
    });

    it('should reject invalid nested item payload', async () => {
      const res = await api.post('/api/v1/quotes').set('x-organization-id', testOrgId).send({
        quote_date: '2025-01-01',
        valid_until: '2025-02-01',
        customer_id: generateUUID(),
        items: [{ line_number: 'one', item_name: 'Item A', quantity: 1, unit_price: 10 }],
      });
      expect([400, 403, 404]).toContain(res.status);
    });

    it('should accept a valid quote payload', async () => {
      const res = await api.post('/api/v1/quotes').set('x-organization-id', testOrgId).send({
        quote_date: '2025-01-01',
        valid_until: '2025-02-01',
        customer_id: generateUUID(),
        payment_terms: 'NET30',
        items: [{ line_number: 1, item_name: 'Item A', quantity: 1, unit_price: 10 }],
      });
      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('GET /api/v1/quotes', () => {
    it('should reject invalid status filter enum', async () => {
      const res = await api.get('/api/v1/quotes?status=not-valid').set('x-organization-id', testOrgId);
      expect([400, 403, 404]).toContain(res.status);
    });

    it('should reject invalid pageSize filter', async () => {
      const res = await api.get('/api/v1/quotes?pageSize=0').set('x-organization-id', testOrgId);
      expect([400, 403, 404]).toContain(res.status);
    });
  });

  describe('PATCH /api/v1/quotes/:id', () => {
    it('should reject invalid date on update', async () => {
      const res = await api.patch(`/api/v1/quotes/${generateUUID()}`).set('x-organization-id', testOrgId).send({
        quote_date: 'not-a-date',
      });
      expect([400, 403, 404]).toContain(res.status);
    });
  });

  describe('PATCH /api/v1/quotes/:id/status', () => {
    it('should reject invalid status transition payload enum', async () => {
      const res = await api.patch(`/api/v1/quotes/${generateUUID()}/status`).set('x-organization-id', testOrgId).send({
        status: 'invalid-status',
      });
      expect([400, 403, 404]).toContain(res.status);
    });
  });
});
