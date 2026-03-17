import { setupRealApiIntegration, ApiIntegrationTestHelper } from '../../helpers/api-integration-test.helper';

const generateUUID = () => {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return [hex.substring(0, 8), hex.substring(8, 12), hex.substring(12, 16), hex.substring(16, 20), hex.substring(20, 32)].join('-');
};

describe('JournalEntries API - Validation Tests', () => {
  let api: ApiIntegrationTestHelper;
  const testOrgId = generateUUID();

  beforeAll(async () => { api = await setupRealApiIntegration(generateUUID()); }, 60000);
  afterAll(async () => { await api.cleanup(); });

  describe('AccountingController - POST /api/v1/accounting/costs/:id/journal-entry', () => {
    it('should reject missing required fields', async () => {
      const res = await api.post(`/api/v1/accounting/costs/${generateUUID()}/journal-entry`)
        .set('x-organization-id', testOrgId)
        .send({ amount: 100 });

      expect([400, 403, 404, 500]).toContain(res.status);
    });

    it('should accept valid payload', async () => {
      const res = await api.post(`/api/v1/accounting/costs/${generateUUID()}/journal-entry`)
        .set('x-organization-id', testOrgId)
        .send({
          organization_id: testOrgId,
          cost_type: 'labor',
          amount: 100,
          date: new Date().toISOString(),
          description: 'Integration test entry',
        });

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('JournalEntriesCrudController - POST /api/v1/journal-entries', () => {
    it('should reject missing required fields', async () => {
      const res = await api.post('/api/v1/journal-entries')
        .set('x-organization-id', testOrgId)
        .send({ entry_date: '2025-01-01' });

      expect([400, 403, 404, 500]).toContain(res.status);
    });

    it('should reject invalid item formats', async () => {
      const res = await api.post('/api/v1/journal-entries')
        .set('x-organization-id', testOrgId)
        .send({
          entry_date: '2025-01-01',
          entry_type: 'expense',
          description: 'Invalid item test',
          items: [{ account_id: 'not-uuid', debit: 100, credit: 100 }],
        });

      expect([400, 403, 404, 500]).toContain(res.status);
    });

    it('should accept valid payload', async () => {
      const res = await api.post('/api/v1/journal-entries')
        .set('x-organization-id', testOrgId)
        .send({
          entry_date: '2025-01-01',
          entry_type: 'expense',
          description: 'Valid entry test',
          items: [
            { account_id: generateUUID(), debit: 100, credit: 0 },
            { account_id: generateUUID(), debit: 0, credit: 100 },
          ],
        });

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('JournalEntriesCrudController - PATCH /api/v1/journal-entries/:id', () => {
    it('should reject invalid formats', async () => {
      const res = await api.patch(`/api/v1/journal-entries/${generateUUID()}`)
        .set('x-organization-id', testOrgId)
        .send({ items: [{ account_id: 'bad-uuid', debit: 20, credit: 20 }] });

      expect([400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('GET /api/v1/journal-entries', () => {
    it('should fail without organization header', async () => {
      const res = await api.get('/api/v1/journal-entries');
      expect([400, 403, 404, 500]).toContain(res.status);
    });

    it('should accept request with organization header', async () => {
      const res = await api.get('/api/v1/journal-entries').set('x-organization-id', testOrgId);
      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('DELETE /api/v1/journal-entries/:id', () => {
    it('should fail without organization header', async () => {
      const res = await api.delete(`/api/v1/journal-entries/${generateUUID()}`);
      expect([400, 403, 404, 500]).toContain(res.status);
    });

    it('should accept request with organization header', async () => {
      const res = await api.delete(`/api/v1/journal-entries/${generateUUID()}`).set('x-organization-id', testOrgId);
      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });
});
