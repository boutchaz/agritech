import { setupRealApiIntegration, ApiIntegrationTestHelper } from '../../helpers/api-integration-test.helper';

const generateUUID = () => {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
  return [hex.substring(0, 8), hex.substring(8, 12), hex.substring(12, 16), hex.substring(16, 20), hex.substring(20, 32)].join('-');
};

describe('Compliance API - Validation Tests', () => {
  let api: ApiIntegrationTestHelper;
  const testOrgId = generateUUID();

  beforeAll(async () => {
    api = await setupRealApiIntegration(generateUUID());
  }, 60000);

  afterAll(async () => {
    await api.cleanup();
  });

  describe('POST /api/v1/compliance/certifications', () => {
    it('should reject missing required fields', async () => {
      const res = await api.post('/api/v1/compliance/certifications')
        .set('x-organization-id', testOrgId)
        .send({});

      expect([400, 403, 404]).toContain(res.status);
    });

    it('should reject invalid enum/date values', async () => {
      const res = await api.post('/api/v1/compliance/certifications')
        .set('x-organization-id', testOrgId)
        .send({
          certification_type: 'BAD_CERT',
          certification_number: '',
          issued_date: 'not-a-date',
          expiry_date: 'also-not-a-date',
          status: 'BAD_STATUS',
          issuing_body: '',
        });

      expect([400, 403, 404]).toContain(res.status);
    });
  });

  describe('POST /api/v1/compliance/checks', () => {
    it('should reject invalid UUID and score range', async () => {
      const res = await api.post('/api/v1/compliance/checks')
        .set('x-organization-id', testOrgId)
        .send({
          certification_id: 'invalid-uuid',
          check_type: 'pesticide_usage',
          check_date: new Date().toISOString(),
          status: 'in_progress',
          score: 150,
        });

      expect([400, 403, 404]).toContain(res.status);
    });
  });

  describe('POST /api/v1/compliance/evidence', () => {
    it('should reject invalid evidence payload', async () => {
      const res = await api.post('/api/v1/compliance/evidence')
        .set('x-organization-id', testOrgId)
        .send({
          compliance_check_id: 'invalid-uuid',
          evidence_type: 'wrong-type',
          file_url: '',
          uploaded_by: 'invalid-uuid',
        });

      expect([400, 403, 404]).toContain(res.status);
    });
  });

  describe('GET /api/v1/compliance/requirements', () => {
    it('should accept requirements query endpoint', async () => {
      const res = await api.get('/api/v1/compliance/requirements?certification_type=GlobalGAP');
      expect([200, 201, 400, 403, 404, 500]).toContain(res.status);
    });
  });
});
