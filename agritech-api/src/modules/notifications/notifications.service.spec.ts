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
      emitRead: jest.fn(),
      emitReadAll: jest.fn(),
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

  // ============================================================
  // createNotificationsForRoles
  // ============================================================

  describe('createNotificationsForRoles', () => {
    const ACTOR_ID = 'actor-user-id';
    const ADMIN_USER_ID = 'admin-user-id';
    const MANAGER_USER_ID = 'manager-user-id';

    function setupRoleQueryMock(users: Array<{ user_id: string }>, error: any = null) {
      const roleQueryBuilder = createMockQueryBuilder();
      roleQueryBuilder.then.mockImplementation((resolve) => {
        const result = { data: error ? null : users, error };
        resolve(result);
        return Promise.resolve(result);
      });
      return roleQueryBuilder;
    }

    function setupInsertMock(insertedData: any[]) {
      const insertBuilder = createMockQueryBuilder();
      insertBuilder.insert.mockReturnValue(insertBuilder);
      insertBuilder.select.mockResolvedValue({ data: insertedData, error: null });
      return insertBuilder;
    }

    it('should resolve users by role and send notifications excluding actor', async () => {
      const roleUsers = [
        { user_id: ADMIN_USER_ID },
        { user_id: MANAGER_USER_ID },
        { user_id: ACTOR_ID },
      ];

      const roleQueryBuilder = setupRoleQueryMock(roleUsers);
      const insertBuilder = setupInsertMock(
        roleUsers
          .filter(u => u.user_id !== ACTOR_ID)
          .map(u => ({
            id: `notif-${u.user_id}`,
            user_id: u.user_id,
            organization_id: TEST_IDS.organization,
            type: 'task_assigned',
            title: 'Test',
            message: null,
            data: {},
            is_read: false,
            created_at: '2024-06-01T10:00:00Z',
          })),
      );

      let callIndex = 0;
      mockClient.from.mockImplementation((table: string) => {
        callIndex++;
        if (table === 'organization_users') return roleQueryBuilder;
        if (table === 'notifications') return insertBuilder;
        return createMockQueryBuilder();
      });

      await service.createNotificationsForRoles(
        TEST_IDS.organization,
        ['organization_admin', 'farm_manager'],
        ACTOR_ID,
        'task_assigned' as any,
        'Test notification',
        'Test message',
        { key: 'value' },
      );

      // Should query organization_users with role join
      expect(mockClient.from).toHaveBeenCalledWith('organization_users');
      expect(roleQueryBuilder.eq).toHaveBeenCalledWith('organization_id', TEST_IDS.organization);
      expect(roleQueryBuilder.eq).toHaveBeenCalledWith('is_active', true);

      // Should insert notifications for non-actor users only
      expect(mockClient.from).toHaveBeenCalledWith('notifications');
      expect(insertBuilder.insert).toHaveBeenCalled();
      const insertedNotifs = insertBuilder.insert.mock.calls[0][0];
      const insertedUserIds = insertedNotifs.map((n: any) => n.user_id);
      expect(insertedUserIds).toContain(ADMIN_USER_ID);
      expect(insertedUserIds).toContain(MANAGER_USER_ID);
      expect(insertedUserIds).not.toContain(ACTOR_ID);
    });

    it('should not crash when no users match the role filter', async () => {
      const roleQueryBuilder = setupRoleQueryMock([]);
      mockClient.from.mockReturnValue(roleQueryBuilder);

      await expect(
        service.createNotificationsForRoles(
          TEST_IDS.organization,
          ['organization_admin'],
          ACTOR_ID,
          'task_assigned' as any,
          'Test',
        ),
      ).resolves.not.toThrow();
    });

    it('should not crash when role query fails', async () => {
      const roleQueryBuilder = setupRoleQueryMock([], { message: 'DB error' });
      mockClient.from.mockReturnValue(roleQueryBuilder);

      await expect(
        service.createNotificationsForRoles(
          TEST_IDS.organization,
          ['organization_admin'],
          ACTOR_ID,
          'task_assigned' as any,
          'Test',
        ),
      ).resolves.not.toThrow();
    });

    it('should send to all matching users when excludeUserId is null', async () => {
      const roleUsers = [
        { user_id: ADMIN_USER_ID },
        { user_id: MANAGER_USER_ID },
      ];

      const roleQueryBuilder = setupRoleQueryMock(roleUsers);
      const insertBuilder = setupInsertMock(
        roleUsers.map(u => ({
          id: `notif-${u.user_id}`,
          user_id: u.user_id,
          organization_id: TEST_IDS.organization,
          type: 'task_assigned',
          title: 'Test',
          message: null,
          data: {},
          is_read: false,
          created_at: '2024-06-01T10:00:00Z',
        })),
      );

      mockClient.from.mockImplementation((table: string) => {
        if (table === 'organization_users') return roleQueryBuilder;
        if (table === 'notifications') return insertBuilder;
        return createMockQueryBuilder();
      });

      await service.createNotificationsForRoles(
        TEST_IDS.organization,
        ['organization_admin', 'farm_manager'],
        null,
        'task_assigned' as any,
        'AI generated',
      );

      expect(insertBuilder.insert).toHaveBeenCalled();
      const insertedNotifs = insertBuilder.insert.mock.calls[0][0];
      expect(insertedNotifs).toHaveLength(2);
    });
  });
});
