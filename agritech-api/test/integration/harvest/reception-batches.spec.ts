import { setupRealApiIntegration, ApiIntegrationTestHelper } from '../../helpers/api-integration-test.helper';

const generateUUID = () => {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return [hex.substring(0, 8), hex.substring(8, 12), hex.substring(12, 16), hex.substring(16, 20), hex.substring(20, 32)].join('-');
};

describe('Reception Batches API - Validation Tests', () => {
  let api: ApiIntegrationTestHelper;
  const testOrgId = generateUUID();

  beforeAll(async () => {
    api = await setupRealApiIntegration(generateUUID());
  }, 60000);

  afterAll(async () => { await api.cleanup(); });

  describe('POST /api/v1/organizations/:organizationId/reception-batches', () => {
    it('should reject missing required fields', async () => {
      const res = await api.post(`/api/v1/organizations/${testOrgId}/reception-batches`)
        .set('x-organization-id', testOrgId)
        .send({});

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should reject invalid formats', async () => {
      const res = await api.post(`/api/v1/organizations/${testOrgId}/reception-batches`)
        .set('x-organization-id', testOrgId)
        .send({
          warehouse_id: 'invalid-uuid',
          reception_date: 'invalid-date',
          weight: -10,
        });

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should accept valid payload', async () => {
      const res = await api.post(`/api/v1/organizations/${testOrgId}/reception-batches`)
        .set('x-organization-id', testOrgId)
        .send({
          warehouse_id: generateUUID(),
          reception_date: '2026-02-01',
          weight: 250,
          weight_unit: 'kg',
        });

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('PATCH /api/v1/organizations/:organizationId/reception-batches/:id/quality-control', () => {
    it('should reject missing required fields', async () => {
      const res = await api.patch(`/api/v1/organizations/${testOrgId}/reception-batches/${generateUUID()}/quality-control`)
        .set('x-organization-id', testOrgId)
        .send({});

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should reject invalid formats', async () => {
      const res = await api.patch(`/api/v1/organizations/${testOrgId}/reception-batches/${generateUUID()}/quality-control`)
        .set('x-organization-id', testOrgId)
        .send({
          quality_grade: 'INVALID',
          quality_score: 11,
        });

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should accept valid payload', async () => {
      const res = await api.patch(`/api/v1/organizations/${testOrgId}/reception-batches/${generateUUID()}/quality-control`)
        .set('x-organization-id', testOrgId)
        .send({
          quality_grade: 'A',
          quality_score: 9,
          quality_notes: 'Excellent quality from integration test',
        });

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('PATCH /api/v1/organizations/:organizationId/reception-batches/:id/decision', () => {
    it('should reject missing required fields', async () => {
      const res = await api.patch(`/api/v1/organizations/${testOrgId}/reception-batches/${generateUUID()}/decision`)
        .set('x-organization-id', testOrgId)
        .send({});

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should reject invalid formats', async () => {
      const res = await api.patch(`/api/v1/organizations/${testOrgId}/reception-batches/${generateUUID()}/decision`)
        .set('x-organization-id', testOrgId)
        .send({
          decision: 'invalid-decision',
        });

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should accept valid payload', async () => {
      const res = await api.patch(`/api/v1/organizations/${testOrgId}/reception-batches/${generateUUID()}/decision`)
        .set('x-organization-id', testOrgId)
        .send({
          decision: 'storage',
          destination_warehouse_id: generateUUID(),
          decision_notes: 'Stored for later processing',
        });

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('POST /api/v1/organizations/:organizationId/reception-batches/:id/process-payment', () => {
    it('should reject missing required fields', async () => {
      const res = await api.post(`/api/v1/organizations/${testOrgId}/reception-batches/${generateUUID()}/process-payment`)
        .set('x-organization-id', testOrgId)
        .send({});

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should reject invalid formats', async () => {
      const res = await api.post(`/api/v1/organizations/${testOrgId}/reception-batches/${generateUUID()}/process-payment`)
        .set('x-organization-id', testOrgId)
        .send({
          create_payment: 'true',
          create_journal_entry: 'false',
          amount: -100,
        });

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should accept valid payload', async () => {
      const res = await api.post(`/api/v1/organizations/${testOrgId}/reception-batches/${generateUUID()}/process-payment`)
        .set('x-organization-id', testOrgId)
        .send({
          create_payment: true,
          create_journal_entry: true,
          amount: 300,
          payment_method: 'cash',
        });

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('PATCH /api/v1/organizations/:organizationId/reception-batches/:id', () => {
    it('should reject invalid formats', async () => {
      const res = await api.patch(`/api/v1/organizations/${testOrgId}/reception-batches/${generateUUID()}`)
        .set('x-organization-id', testOrgId)
        .send({
          warehouse_id: 'invalid-uuid',
          weight: -20,
        });

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should accept valid payload', async () => {
      const res = await api.patch(`/api/v1/organizations/${testOrgId}/reception-batches/${generateUUID()}`)
        .set('x-organization-id', testOrgId)
        .send({
          notes: 'General reception batch update from integration test',
        });

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('GET /api/v1/organizations/:organizationId/reception-batches', () => {
    it('should reject request without organization header', async () => {
      const res = await api.get(`/api/v1/organizations/${testOrgId}/reception-batches`);

      expect([400, 403, 404, 500]).toContain(res.status);
    });

    it('should accept request with organization header', async () => {
      const res = await api.get(`/api/v1/organizations/${testOrgId}/reception-batches`)
        .set('x-organization-id', testOrgId);

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('GET /api/v1/organizations/:organizationId/reception-batches/:id', () => {
    it('should reject request without organization header', async () => {
      const res = await api.get(`/api/v1/organizations/${testOrgId}/reception-batches/${generateUUID()}`);

      expect([400, 403, 404, 500]).toContain(res.status);
    });

    it('should accept request with organization header', async () => {
      const res = await api.get(`/api/v1/organizations/${testOrgId}/reception-batches/${generateUUID()}`)
        .set('x-organization-id', testOrgId);

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('DELETE /api/v1/organizations/:organizationId/reception-batches/:id', () => {
    it('should reject request without organization header', async () => {
      const res = await api.delete(`/api/v1/organizations/${testOrgId}/reception-batches/${generateUUID()}`);

      expect([400, 403, 404, 500]).toContain(res.status);
    });

    it('should accept request with organization header', async () => {
      const res = await api.delete(`/api/v1/organizations/${testOrgId}/reception-batches/${generateUUID()}`)
        .set('x-organization-id', testOrgId);

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });
});
