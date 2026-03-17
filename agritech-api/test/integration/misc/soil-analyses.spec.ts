import { setupRealApiIntegration, ApiIntegrationTestHelper } from '../../helpers/api-integration-test.helper';

const generateUUID = () => {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return [hex.substring(0, 8), hex.substring(8, 12), hex.substring(12, 16), hex.substring(16, 20), hex.substring(20, 32)].join('-');
};

describe('Soil/Analyses API - Validation Tests', () => {
  let api: ApiIntegrationTestHelper;
  const testOrgId = generateUUID();
  const soilPath = '/api/v1/soil-analyses';
  const analysesPath = '/api/v1/analyses';

  beforeAll(async () => {
    api = await setupRealApiIntegration(generateUUID());
  }, 60000);

  afterAll(async () => { await api.cleanup(); });

  it('should validate soil analysis creation payload', async () => {
    const invalid = await api.post(soilPath).set('x-organization-id', testOrgId).send({ analysis_date: 'bad-date', parcel_id: 'bad' });
    const valid = await api.post(soilPath).set('x-organization-id', testOrgId).send({
      analysis_date: '2025-01-10',
      parcel_id: generateUUID(),
      notes: 'Initial sample',
      physical: { density: 1.2 },
    });
    expect(invalid.status).toBe(400);
    expect(valid.status).not.toBe(400);
  });

  it('should validate soil query filters', async () => {
    const invalid = await api.get(`${soilPath}?date_from=invalid-date`).set('x-organization-id', testOrgId);
    const valid = await api.get(`${soilPath}?parcel_ids=${generateUUID()},${generateUUID()}&page=1&limit=10`).set('x-organization-id', testOrgId);
    expect(invalid.status).toBe(400);
    expect(valid.status).not.toBe(400);
  });

  it('should validate analyses creation and recommendation payloads', async () => {
    const analysisId = generateUUID();
    const invalidAnalysis = await api.post(analysesPath).set('x-organization-id', testOrgId).send({ parcel_id: '', analysis_type: 'invalid' });
    const validAnalysis = await api.post(analysesPath).set('x-organization-id', testOrgId).send({
      parcel_id: generateUUID(),
      analysis_type: 'soil',
      analysis_date: '2025-01-15',
      data: { ph_level: 6.4 },
    });
    const invalidRec = await api.post(`${analysesPath}/${analysisId}/recommendations`).set('x-organization-id', testOrgId).send({ title: 55, priority: 9 });
    const validRec = await api.post(`${analysesPath}/${analysisId}/recommendations`).set('x-organization-id', testOrgId).send({
      title: 'Adjust irrigation and nitrogen',
      priority: 3,
      status: 'pending',
    });
    expect(invalidAnalysis.status).toBe(400);
    expect(validAnalysis.status).not.toBe(400);
    expect(invalidRec.status).toBe(400);
    expect(validRec.status).not.toBe(400);
  });

  it('should expose analyses filters and recommendation update endpoint', async () => {
    const recommendationId = generateUUID();
    const list = await api.get(`${analysesPath}?analysis_type=soil&date_from=2025-01-01&date_to=2025-12-31&page=1`).set('x-organization-id', testOrgId);
    const patchRec = await api.patch(`${analysesPath}/recommendations/${recommendationId}`).set('x-organization-id', testOrgId).send({ status: 'in_progress' });
    expect(list.status).not.toBe(400);
    expect(patchRec.status).not.toBe(400);
  });
});
