import { test, expect } from '../../fixtures/auth.fixture';

const NO_ID = '00000000-0000-0000-0000-000000000000';

test.describe('Notifications API @notifications', () => {
  test('GET /notifications - should list notifications', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/notifications');
    expect(response.status()).toBe(200);
  });

  test('GET /notifications/unread/count - should return unread count', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/notifications/unread/count');
    expect(response.status()).toBe(200);
  });

  test('PATCH /notifications/:id/read - returns 200 or 404', async ({ authedRequest }) => {
    const response = await authedRequest.patch(`/api/v1/notifications/${NO_ID}/read`);
    expect([200, 204, 404]).toContain(response.status());
  });

  test('POST /notifications/read-all - should mark all as read', async ({ authedRequest }) => {
    const response = await authedRequest.post('/api/v1/notifications/read-all');
    expect([200, 204]).toContain(response.status());
  });

  test('GET /notifications/connection-status - should return connection status', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/notifications/connection-status');
    expect(response.status()).toBe(200);
  });

  test('POST /notifications/test - should send test notification', async ({ authedRequest }) => {
    const response = await authedRequest.post('/api/v1/notifications/test');
    expect([200, 201, 400]).toContain(response.status());
  });

  test('POST /notifications/stock/check - should check stock levels', async ({ authedRequest }) => {
    const response = await authedRequest.post('/api/v1/notifications/stock/check');
    expect([200, 204]).toContain(response.status());
  });

  test('GET /notifications/stock/low - should list low stock alerts', async ({ authedRequest }) => {
    const response = await authedRequest.get('/api/v1/notifications/stock/low');
    expect(response.status()).toBe(200);
  });
});
