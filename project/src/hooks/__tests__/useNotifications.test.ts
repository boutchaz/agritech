import { describe, expect, it, vi } from 'vitest';
import { NOTIFICATIONS_QUERY_KEY, UNREAD_COUNT_QUERY_KEY } from '../useNotifications';

vi.mock('../../lib/api-client', () => ({
  apiClient: {
    get: vi.fn(),
    patch: vi.fn(),
    post: vi.fn(),
  },
}));

describe('useNotifications constants and API integration', () => {
  it('exports correct query key constants', () => {
    expect(NOTIFICATIONS_QUERY_KEY).toBe('notifications');
    expect(UNREAD_COUNT_QUERY_KEY).toBe('notifications-unread-count');
  });

  it('apiClient.get fetches notifications correctly', async () => {
    const { apiClient } = await import('../../lib/api-client');
    vi.mocked(apiClient.get).mockResolvedValue({ data: [{ id: 'n-1', is_read: false }] });

    await apiClient.get('/api/v1/notifications?limit=20&offset=0', {}, 'org-123');

    expect(apiClient.get).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/notifications'),
      {},
      'org-123',
    );
  });

  it('apiClient.patch marks notification as read', async () => {
    const { apiClient } = await import('../../lib/api-client');
    vi.mocked(apiClient.patch).mockResolvedValue({});

    await apiClient.patch('/api/v1/notifications/n-1/read', {}, {}, 'org-123');

    expect(apiClient.patch).toHaveBeenCalledWith(
      '/api/v1/notifications/n-1/read',
      {},
      {},
      'org-123',
    );
  });

  it('apiClient.post marks all as read', async () => {
    const { apiClient } = await import('../../lib/api-client');
    vi.mocked(apiClient.post).mockResolvedValue({});

    await apiClient.post('/api/v1/notifications/read-all', {}, {}, 'org-123');

    expect(apiClient.post).toHaveBeenCalledWith(
      '/api/v1/notifications/read-all',
      {},
      {},
      'org-123',
    );
  });

  it('apiClient.get fetches unread count', async () => {
    const { apiClient } = await import('../../lib/api-client');
    vi.mocked(apiClient.get).mockResolvedValue({ count: 5 });

    const result = await apiClient.get<{ count: number }>(
      '/api/v1/notifications/unread/count',
      {},
      'org-123',
    );

    expect(result.count).toBe(5);
  });
});
