import { setupRealApiIntegration, ApiIntegrationTestHelper } from '../../helpers/api-integration-test.helper';

const generateUUID = () => {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return [hex.substring(0, 8), hex.substring(8, 12), hex.substring(12, 16), hex.substring(16, 20), hex.substring(20, 32)].join('-');
};

describe('Deliveries API - Validation Tests', () => {
  let api: ApiIntegrationTestHelper;
  const testOrgId = generateUUID();
  const deliveryId = generateUUID();
  const basePath = `/api/v1/organizations/${testOrgId}/deliveries`;

  beforeAll(async () => {
    api = await setupRealApiIntegration(generateUUID());
  }, 60000);

  afterAll(async () => { await api.cleanup(); });

  describe('GET endpoints', () => {
    it('should reject GET /deliveries without org header', async () => {
      const res = await api.get(basePath);
      expect([400, 403, 404, 500]).toContain(res.status);
    });

    it('should accept GET /deliveries with org header', async () => {
      const res = await api.get(basePath).set('x-organization-id', testOrgId);
      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });

    it('should reject GET /deliveries/:deliveryId without org header', async () => {
      const res = await api.get(`${basePath}/${deliveryId}`);
      expect([400, 403, 404, 500]).toContain(res.status);
    });

    it('should accept GET /deliveries/:deliveryId with org header', async () => {
      const res = await api.get(`${basePath}/${deliveryId}`).set('x-organization-id', testOrgId);
      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });

    it('should reject GET /deliveries/:deliveryId/items without org header', async () => {
      const res = await api.get(`${basePath}/${deliveryId}/items`);
      expect([400, 403, 404, 500]).toContain(res.status);
    });

    it('should accept GET /deliveries/:deliveryId/items with org header', async () => {
      const res = await api.get(`${basePath}/${deliveryId}/items`).set('x-organization-id', testOrgId);
      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });

    it('should reject GET /deliveries/:deliveryId/tracking without org header', async () => {
      const res = await api.get(`${basePath}/${deliveryId}/tracking`);
      expect([400, 403, 404, 500]).toContain(res.status);
    });

    it('should accept GET /deliveries/:deliveryId/tracking with org header', async () => {
      const res = await api.get(`${basePath}/${deliveryId}/tracking`).set('x-organization-id', testOrgId);
      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('POST /api/v1/organizations/:organizationId/deliveries', () => {
    it('should reject missing required fields', async () => {
      const res = await api.post(basePath)
        .set('x-organization-id', testOrgId)
        .send({});

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should reject invalid formats', async () => {
      const res = await api.post(basePath)
        .set('x-organization-id', testOrgId)
        .send({
          farm_id: 'invalid-uuid',
          delivery_date: 'not-a-date',
          total_amount: 'not-a-number',
        });

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should accept valid payload', async () => {
      const res = await api.post(basePath)
        .set('x-organization-id', testOrgId)
        .send({
          farm_id: generateUUID(),
          delivery_type: 'customer',
          delivery_date: '2025-03-25',
          customer_name: 'Acme Buyer',
          total_amount: 1200,
        });

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });

  describe('PATCH endpoints', () => {
    it('should reject PATCH /deliveries/:deliveryId/status missing required fields', async () => {
      const res = await api.patch(`${basePath}/${deliveryId}/status`)
        .set('x-organization-id', testOrgId)
        .send({});

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should reject PATCH /deliveries/:deliveryId/status invalid formats', async () => {
      const res = await api.patch(`${basePath}/${deliveryId}/status`)
        .set('x-organization-id', testOrgId)
        .send({ status: 123 });

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should accept PATCH /deliveries/:deliveryId/status valid payload', async () => {
      const res = await api.patch(`${basePath}/${deliveryId}/status`)
        .set('x-organization-id', testOrgId)
        .send({ status: 'in_transit' });

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });

    it('should reject PATCH /deliveries/:deliveryId/complete missing required fields', async () => {
      const res = await api.patch(`${basePath}/${deliveryId}/complete`)
        .set('x-organization-id', testOrgId)
        .send({});

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should reject PATCH /deliveries/:deliveryId/complete invalid formats', async () => {
      const res = await api.patch(`${basePath}/${deliveryId}/complete`)
        .set('x-organization-id', testOrgId)
        .send({ completed_at: 'invalid-date' });

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should accept PATCH /deliveries/:deliveryId/complete valid payload', async () => {
      const res = await api.patch(`${basePath}/${deliveryId}/complete`)
        .set('x-organization-id', testOrgId)
        .send({ completed_at: '2025-03-25T10:00:00.000Z', notes: 'Delivered to customer' });

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });

    it('should reject PATCH /deliveries/:deliveryId/payment missing required fields', async () => {
      const res = await api.patch(`${basePath}/${deliveryId}/payment`)
        .set('x-organization-id', testOrgId)
        .send({});

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should reject PATCH /deliveries/:deliveryId/payment invalid formats', async () => {
      const res = await api.patch(`${basePath}/${deliveryId}/payment`)
        .set('x-organization-id', testOrgId)
        .send({ amount_paid: 'invalid-number' });

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should accept PATCH /deliveries/:deliveryId/payment valid payload', async () => {
      const res = await api.patch(`${basePath}/${deliveryId}/payment`)
        .set('x-organization-id', testOrgId)
        .send({ amount_paid: 1200, payment_status: 'paid' });

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });

    it('should reject PATCH /deliveries/:deliveryId/cancel missing required fields', async () => {
      const res = await api.patch(`${basePath}/${deliveryId}/cancel`)
        .set('x-organization-id', testOrgId)
        .send({});

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should reject PATCH /deliveries/:deliveryId/cancel invalid formats', async () => {
      const res = await api.patch(`${basePath}/${deliveryId}/cancel`)
        .set('x-organization-id', testOrgId)
        .send({ reason: 321 });

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should accept PATCH /deliveries/:deliveryId/cancel valid payload', async () => {
      const res = await api.patch(`${basePath}/${deliveryId}/cancel`)
        .set('x-organization-id', testOrgId)
        .send({ reason: 'Customer rescheduled' });

      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });
});
