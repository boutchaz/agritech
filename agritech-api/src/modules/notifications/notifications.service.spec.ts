import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { DatabaseService } from '../database/database.service';
import { NotificationsGateway } from './notifications.gateway';
import {
  createMockSupabaseClient,
  createMockQueryBuilder,
  mockQueryResult,
  MockSupabaseClient,
  MockQueryBuilder,
} from '../../../test/helpers/mock-database.helper';
import { TEST_IDS } from '../../../test/helpers/test-utils';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let mockClient: MockSupabaseClient;
  let mockDatabaseService: { getAdminClient: jest.Mock };
  let mockGateway: Partial<NotificationsGateway>;

  const MOCK_NOTIFICATIONS = [
    {
      id: 'notif-1',
      user_id: TEST_IDS.user,
      organization_id: TEST_IDS.organization,
      type: 'task_assigned',
      title: 'New task assigned',
      message: 'You have been assigned a new task',
      is_read: false,
      data: {},
      created_at: '2024-06-01T10:00:00Z',
    },
    {
      id: 'notif-2',
      user_id: TEST_IDS.user,
      organization_id: TEST_IDS.organization,
      type: 'delivery_completed',
      title: 'Delivery completed',
      message: 'Your delivery has been marked as complete',
      is_read: true,
      data: {},
      created_at: '2024-06-02T10:00:00Z',
    },
  ];

  beforeEach(async () => {
    mockClient = createMockSupabaseClient();
    mockDatabaseService = {
      getAdminClient: jest.fn(() => mockClient),
    };
    mockGateway = {
      sendToUser: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: DatabaseService, useValue: mockDatabaseService },
        { provide: NotificationsGateway, useValue: mockGateway },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Helper for getNotifications: count query + data query
  function setupGetNotificationsMock(data: any[], count: number, error: any = null) {
    const countBuilder = createMockQueryBuilder();
    countBuilder.then.mockImplementation((resolve) => {
      const result = { data: null, error: null, count };
      resolve(result);
      return Promise.resolve(result);
    });

    const dataBuilder = createMockQueryBuilder();
    dataBuilder.then.mockImplementation((resolve) => {
      const result = { data, error };
      resolve(result);
      return Promise.resolve(result);
    });

    let callIndex = 0;
    mockClient.from.mockImplementation(() => {
      callIndex++;
      if (callIndex % 2 === 1) return countBuilder;
      return dataBuilder;
    });

    return { countBuilder, dataBuilder };
  }

  // ============================================================
  // getNotifications
  // ============================================================

  describe('getNotifications', () => {
    it('should return PaginatedResponse shape', async () => {
      setupGetNotificationsMock(MOCK_NOTIFICATIONS, 2);

      const result = await service.getNotifications(TEST_IDS.user, TEST_IDS.organization);

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('page');
      expect(result).toHaveProperty('pageSize');
      expect(result).toHaveProperty('totalPages');
      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
    });

    it('should handle empty results', async () => {
      setupGetNotificationsMock([], 0);

      const result = await service.getNotifications(TEST_IDS.user, TEST_IDS.organization);

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
    });

    it('should throw on database error', async () => {
      setupGetNotificationsMock(null as any, 0, { message: 'DB failure' });

      await expect(
        service.getNotifications(TEST_IDS.user, TEST_IDS.organization),
      ).rejects.toThrow('Failed to fetch notifications');
    });

    it('should apply isRead filter', async () => {
      const { countBuilder, dataBuilder } = setupGetNotificationsMock([MOCK_NOTIFICATIONS[0]], 1);

      await service.getNotifications(TEST_IDS.user, TEST_IDS.organization, { isRead: false });

      expect(countBuilder.eq).toHaveBeenCalledWith('is_read', false);
      expect(dataBuilder.eq).toHaveBeenCalledWith('is_read', false);
    });

    it('should apply type filter', async () => {
      const { countBuilder, dataBuilder } = setupGetNotificationsMock([MOCK_NOTIFICATIONS[0]], 1);

      await service.getNotifications(TEST_IDS.user, TEST_IDS.organization, { type: 'task_assigned' as any });

      expect(countBuilder.eq).toHaveBeenCalledWith('type', 'task_assigned');
      expect(dataBuilder.eq).toHaveBeenCalledWith('type', 'task_assigned');
    });

    it('should filter by user_id and organization_id', async () => {
      const { countBuilder, dataBuilder } = setupGetNotificationsMock(MOCK_NOTIFICATIONS, 2);

      await service.getNotifications(TEST_IDS.user, TEST_IDS.organization);

      expect(countBuilder.eq).toHaveBeenCalledWith('user_id', TEST_IDS.user);
      expect(countBuilder.eq).toHaveBeenCalledWith('organization_id', TEST_IDS.organization);
      expect(dataBuilder.eq).toHaveBeenCalledWith('user_id', TEST_IDS.user);
      expect(dataBuilder.eq).toHaveBeenCalledWith('organization_id', TEST_IDS.organization);
    });
  });

  // ============================================================
  // createNotification
  // ============================================================

  describe('createNotification', () => {
    it('should insert notification and emit via gateway', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.insert.mockReturnValue(queryBuilder);
      queryBuilder.select.mockReturnValue(queryBuilder);
      queryBuilder.single.mockResolvedValue(mockQueryResult(MOCK_NOTIFICATIONS[0]));
      mockClient.from.mockReturnValue(queryBuilder);

      const result = await service.createNotification({
        userId: TEST_IDS.user,
        organizationId: TEST_IDS.organization,
        type: 'task_assigned' as any,
        title: 'New task assigned',
        message: 'You have been assigned a new task',
      });

      expect(result).toHaveProperty('id', 'notif-1');
      expect(mockGateway.sendToUser).toHaveBeenCalledWith(TEST_IDS.user, MOCK_NOTIFICATIONS[0]);
    });
  });

  // ============================================================
  // getUnreadCount
  // ============================================================

  describe('getUnreadCount', () => {
    it('should return unread count', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.then.mockImplementation((resolve) => {
        const result = { data: null, error: null, count: 5 };
        resolve(result);
        return Promise.resolve(result);
      });
      mockClient.from.mockReturnValue(queryBuilder);

      const result = await service.getUnreadCount(TEST_IDS.user, TEST_IDS.organization);

      expect(result).toBe(5);
    });
  });

  // ============================================================
  // markAsRead
  // ============================================================

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.update.mockReturnValue(queryBuilder);
      queryBuilder.then.mockImplementation((resolve) => {
        const result = { data: null, error: null };
        resolve(result);
        return Promise.resolve(result);
      });
      mockClient.from.mockReturnValue(queryBuilder);

      await service.markAsRead('notif-1', TEST_IDS.user);

      expect(queryBuilder.update).toHaveBeenCalledWith(
        expect.objectContaining({ is_read: true }),
      );
      expect(queryBuilder.eq).toHaveBeenCalledWith('id', 'notif-1');
      expect(queryBuilder.eq).toHaveBeenCalledWith('user_id', TEST_IDS.user);
    });
  });
});
