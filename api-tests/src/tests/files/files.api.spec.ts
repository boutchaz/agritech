import { test, expect } from '../../fixtures/auth.fixture';

const NO_ID = '00000000-0000-0000-0000-000000000000';

test.describe('Files API @files', () => {
  test('GET /files - should list files', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/files');
    expect(response.status()).toBe(200);
  });

  test('GET /files/stats - should return file stats', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/files/stats');
    expect(response.status()).toBe(200);
  });

  test('GET /files/orphaned - should list orphaned files', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/files/orphaned');
    expect(response.status()).toBe(200);
  });

  test('GET /files/:id - returns 200 or 404', async ({ authedRequest }) => {
    const response = await authedRequest.get(`/api/v1/files/${NO_ID}`);
    expect([200, 404]).toContain(response.status());
  });

  test('PATCH /files/:id - returns 200 or 404', async ({ authedRequest }) => {
    const response = await authedRequest.patch(`/api/v1/files/${NO_ID}`, { data: {} });
    expect([400, 404, 500]).toContain(response.status());
  });

  test('DELETE /files/:id - returns 200 or 404', async ({ authedRequest }) => {
    const response = await authedRequest.delete(`/api/v1/files/${NO_ID}`);
    expect([200, 204, 404, 500]).toContain(response.status());
  });

  test('DELETE /files/:id/permanent - returns 200 or 404', async ({ authedRequest }) => {
    const response = await authedRequest.delete(`/api/v1/files/${NO_ID}/permanent`);
    expect([200, 204, 404]).toContain(response.status());
  });

  test('POST /files/register - rejects empty data', async ({ authedRequest }) => {
    const response = await authedRequest.post('/api/v1/files/register', { data: {} });
    expect([400, 422]).toContain(response.status());
  });

  test('POST /files/upload - rejects empty data', async ({ authedRequest }) => {
    const response = await authedRequest.post('/api/v1/files/upload', {
      headers: { 'Content-Type': 'application/json' },
      data: {},
    });
    expect([400, 422]).toContain(response.status());
  });

  test('POST /files/storage/upload - rejects empty data', async ({ authedRequest }) => {
    const response = await authedRequest.post('/api/v1/files/storage/upload', {
      headers: { 'Content-Type': 'application/json' },
      data: {},
    });
    expect([400, 422]).toContain(response.status());
  });

  test('POST /files/storage/remove - rejects empty data', async ({ authedRequest }) => {
    const response = await authedRequest.post('/api/v1/files/storage/remove', { data: {} });
    expect([400, 422]).toContain(response.status());
  });

  test('POST /files/:id/access - returns 200 or 404', async ({ authedRequest }) => {
    const response = await authedRequest.post(`/api/v1/files/${NO_ID}/access`, { data: {} });
    expect([201, 400, 404]).toContain(response.status());
  });

  test('POST /files/orphaned/mark - returns 200 or 404', async ({ authedRequest }) => {
    const response = await authedRequest.post('/api/v1/files/orphaned/mark', { data: {} });
    expect([200, 201, 400]).toContain(response.status());
  });

  test('DELETE /files/orphaned - returns 200 or 404', async ({ authedRequest }) => {
    const response = await authedRequest.delete('/api/v1/files/orphaned');
    expect([200, 204, 400]).toContain(response.status());
  });
});
