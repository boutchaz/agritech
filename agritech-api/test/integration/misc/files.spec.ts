import { setupRealApiIntegration, ApiIntegrationTestHelper } from '../../helpers/api-integration-test.helper';

const generateUUID = () => {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return [hex.substring(0, 8), hex.substring(8, 12), hex.substring(12, 16), hex.substring(16, 20), hex.substring(20, 32)].join('-');
};

describe('Files API - Validation Tests', () => {
  let api: ApiIntegrationTestHelper;
  const testOrgId = generateUUID();
  const basePath = '/api/v1/files';
  const fileId = generateUUID();

  beforeAll(async () => {
    api = await setupRealApiIntegration(generateUUID());
  }, 60000);

  afterAll(async () => { await api.cleanup(); });

  it('should validate required storage query parameters', async () => {
    const download = await api.get(`${basePath}/storage/download`).set('x-organization-id', testOrgId);
    const remove = await api.post(`${basePath}/storage/remove`).set('x-organization-id', testOrgId).send({ bucket: 'files', paths: [] });
    expect(download.status).toBe(400);
    expect(remove.status).toBe(400);
  });

  it('should validate register file payload', async () => {
    const invalid = await api.post(`${basePath}/register`).set('x-organization-id', testOrgId).send({ bucket_name: 123, entity_id: 'bad-id' });
    const valid = await api.post(`${basePath}/register`).set('x-organization-id', testOrgId).send({
      bucket_name: 'documents',
      file_path: `tests/${Date.now()}.pdf`,
      file_name: 'test.pdf',
      entity_type: 'farm',
      entity_id: generateUUID(),
    });
    expect(invalid.status).toBe(400);
    expect(valid.status).not.toBe(400);
  });

  it('should validate update file payload', async () => {
    const invalid = await api.patch(`${basePath}/${fileId}`).set('x-organization-id', testOrgId).send({ entity_id: 'not-uuid' });
    const valid = await api.patch(`${basePath}/${fileId}`).set('x-organization-id', testOrgId).send({ marked_for_deletion: true, is_orphan: false });
    expect(invalid.status).toBe(400);
    expect(valid.status).not.toBe(400);
  });

  it('should expose query and action endpoints', async () => {
    const list = await api.get(`${basePath}?bucket=documents&orphansOnly=true`).set('x-organization-id', testOrgId);
    const stats = await api.get(`${basePath}/stats`).set('x-organization-id', testOrgId);
    const orphaned = await api.get(`${basePath}/orphaned`).set('x-organization-id', testOrgId);
    const track = await api.post(`${basePath}/${fileId}/access`).set('x-organization-id', testOrgId).send({});
    expect(list.status).not.toBe(400);
    expect(stats.status).not.toBe(400);
    expect(orphaned.status).not.toBe(400);
    expect(track.status).not.toBe(400);
  });
});
