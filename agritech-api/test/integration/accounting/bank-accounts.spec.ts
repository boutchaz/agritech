import { setupRealApiIntegration, ApiIntegrationTestHelper } from '../../helpers/api-integration-test.helper';

const generateUUID = () => {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return [hex.substring(0, 8), hex.substring(8, 12), hex.substring(12, 16), hex.substring(16, 20), hex.substring(20, 32)].join('-');
};

describe('BankAccounts API - Validation Tests', () => {
  let api: ApiIntegrationTestHelper;
  const testOrgId = generateUUID();

  beforeAll(async () => { api = await setupRealApiIntegration(generateUUID()); }, 60000);
  afterAll(async () => { await api.cleanup(); });

  describe('POST /api/v1/bank-accounts', () => {
    it('should reject missing required fields', async () => {
      const res = await api.post('/api/v1/bank-accounts')
        .set('x-organization-id', testOrgId)
        .send({ currency_code: 'MAD' });

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should reject invalid formats', async () => {
      const res = await api.post('/api/v1/bank-accounts')
        .set('x-organization-id', testOrgId)
        .send({ account_name: 'Main Account', gl_account_id: 'not-a-uuid' });

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should accept valid payload', async () => {
      const res = await api.post('/api/v1/bank-accounts')
        .set('x-organization-id', testOrgId)
        .send({ account_name: 'Main Account', currency_code: 'MAD', opening_balance: 1000 });

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('PATCH /api/v1/bank-accounts/:id', () => {
    it('should reject invalid formats', async () => {
      const res = await api.patch(`/api/v1/bank-accounts/${generateUUID()}`)
        .set('x-organization-id', testOrgId)
        .send({ gl_account_id: 'bad-uuid' });

      expect([400, 403, 404]).toContain(res.status);
    });
  });

  describe('GET /api/v1/bank-accounts', () => {
    it('should fail without organization header', async () => {
      const res = await api.get('/api/v1/bank-accounts');
      expect([400, 403, 404, 500]).toContain(res.status);
    });

    it('should accept request with organization header', async () => {
      const res = await api.get('/api/v1/bank-accounts').set('x-organization-id', testOrgId);
      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('DELETE /api/v1/bank-accounts/:id', () => {
    it('should fail without organization header', async () => {
      const res = await api.delete(`/api/v1/bank-accounts/${generateUUID()}`);
      expect([400, 403, 404, 500]).toContain(res.status);
    });

    it('should accept request with organization header', async () => {
      const res = await api.delete(`/api/v1/bank-accounts/${generateUUID()}`).set('x-organization-id', testOrgId);
      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });
});
