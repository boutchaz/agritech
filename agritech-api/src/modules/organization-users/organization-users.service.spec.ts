import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { OrganizationUsersService } from './organization-users.service';
import { DatabaseService } from '../database/database.service';
import { EmailService } from '../email/email.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/dto/notification.dto';
import {
  createMockQueryBuilder,
  createMockSupabaseClient,
  mockQueryResult,
  setupTableMock,
  MockQueryBuilder,
  MockSupabaseClient,
} from '../../../test/helpers/mock-database.helper';
import { TEST_IDS } from '../../../test/helpers/test-utils';

describe('OrganizationUsersService', () => {
  let service: OrganizationUsersService;
  let mockClient: MockSupabaseClient;
  let mockDatabaseService: { getAdminClient: jest.Mock };
  let mockEmailService: {
    sendPasswordResetEmail: jest.Mock<Promise<boolean>, [string, string, string]>;
  };
  let mockNotificationsService: {
    createNotificationsForUsers: jest.Mock<Promise<void>, [string[], string, NotificationType, string, string, Record<string, unknown>]>;
    createNotification: jest.Mock<Promise<void>, [Record<string, unknown>]>;
  };

  const roleId = '550e8400-e29b-41d4-a716-446655440101';
  const secondRoleId = '550e8400-e29b-41d4-a716-446655440102';
  const orgUserRecord = {
    id: 'org-user-1',
    organization_id: TEST_IDS.organization,
    user_id: TEST_IDS.user,
    role_id: roleId,
    is_active: true,
    created_at: '2026-04-16T10:00:00.000Z',
  };

  const createThenableResult = <T>(
    builder: MockQueryBuilder,
    result: T,
  ): MockQueryBuilder => {
    builder.then.mockImplementation(
      (resolve: (value: T) => void, reject?: (reason?: unknown) => void) => {
        resolve(result);
        return Promise.resolve(result).then(resolve, reject);
      },
    );
    return builder;
  };

  const configureFromMocks = (
    tableMap: Record<string, MockQueryBuilder | MockQueryBuilder[]>,
  ): void => {
    const counts = new Map<string, number>();

    mockClient.from.mockImplementation((table: string) => {
      const entry = tableMap[table];
      if (Array.isArray(entry)) {
        const index = counts.get(table) ?? 0;
        counts.set(table, index + 1);
        return entry[index] ?? entry[entry.length - 1] ?? createMockQueryBuilder();
      }

      return entry ?? createMockQueryBuilder();
    });
  };

  beforeEach(async () => {
    mockClient = createMockSupabaseClient();
    mockDatabaseService = {
      getAdminClient: jest.fn(() => mockClient),
    };
    mockEmailService = {
      sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
    };
    mockNotificationsService = {
      createNotificationsForUsers: jest.fn().mockResolvedValue(undefined),
      createNotification: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationUsersService,
        { provide: DatabaseService, useValue: mockDatabaseService },
        { provide: EmailService, useValue: mockEmailService },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    service = module.get<OrganizationUsersService>(OrganizationUsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('returns paginated organization users with filters and worker enrichment', async () => {
      const countBuilder = createThenableResult(createMockQueryBuilder(), {
        count: 2,
        data: null,
        error: null,
      });
      const dataBuilder = createThenableResult(createMockQueryBuilder(), {
        data: [
          {
            ...orgUserRecord,
            user_profiles: {
              id: TEST_IDS.user,
              first_name: 'Karim',
              last_name: 'Benali',
              email: 'karim@example.com',
            },
            roles: { id: roleId, name: 'farm_manager', display_name: 'Farm Manager' },
          },
          {
            ...orgUserRecord,
            id: 'org-user-2',
            user_id: '550e8400-e29b-41d4-a716-446655440201',
            user_profiles: {
              id: '550e8400-e29b-41d4-a716-446655440201',
              first_name: 'Fatima',
              last_name: 'Idrissi',
              email: 'fatima@example.com',
            },
            roles: { id: secondRoleId, name: 'viewer', display_name: 'Viewer' },
          },
        ],
        error: null,
      });
      const workersBuilder = setupTableMock(mockClient, 'workers');
      workersBuilder.select.mockReturnValue(workersBuilder);
      workersBuilder.in.mockReturnValue(workersBuilder);
      createThenableResult(workersBuilder, {
        data: [
          {
            id: TEST_IDS.worker,
            user_id: TEST_IDS.user,
            position: 'Supervisor',
            is_active: true,
          },
        ],
        error: null,
      });

      configureFromMocks({
        organization_users: [countBuilder, dataBuilder],
        workers: workersBuilder,
      });

      const result = await service.findAll(TEST_IDS.organization, {
        is_active: true,
        role_id: roleId,
        user_id: TEST_IDS.user,
        page: 2,
        limit: 1,
      });

      expect(result).toEqual({
        data: [
          expect.objectContaining({
            user_id: TEST_IDS.user,
            full_name: 'Karim Benali',
            workers: [
              expect.objectContaining({ id: TEST_IDS.worker, position: 'Supervisor' }),
            ],
          }),
          expect.objectContaining({
            user_id: '550e8400-e29b-41d4-a716-446655440201',
            full_name: 'Fatima Idrissi',
            workers: [],
          }),
        ],
        total: 2,
        page: 2,
        pageSize: 1,
        totalPages: 2,
      });
      expect(countBuilder.eq).toHaveBeenCalledWith('organization_id', TEST_IDS.organization);
      expect(dataBuilder.eq).toHaveBeenCalledWith('organization_id', TEST_IDS.organization);
      expect(dataBuilder.eq).toHaveBeenCalledWith('is_active', true);
      expect(dataBuilder.eq).toHaveBeenCalledWith('role_id', roleId);
      expect(dataBuilder.eq).toHaveBeenCalledWith('user_id', TEST_IDS.user);
      expect(dataBuilder.order).toHaveBeenCalledWith('created_at', { ascending: false });
      expect(dataBuilder.range).toHaveBeenCalledWith(1, 1);
      expect(workersBuilder.in).toHaveBeenCalledWith('user_id', [
        TEST_IDS.user,
        '550e8400-e29b-41d4-a716-446655440201',
      ]);
    });

    it('returns an empty paginated response when no users exist', async () => {
      const countBuilder = createThenableResult(createMockQueryBuilder(), {
        count: 0,
        data: null,
        error: null,
      });
      const dataBuilder = createThenableResult(createMockQueryBuilder(), {
        data: [],
        error: null,
      });

      configureFromMocks({ organization_users: [countBuilder, dataBuilder] });

      const result = await service.findAll(TEST_IDS.organization);

      expect(result).toEqual({ data: [], total: 0, page: 1, pageSize: 50, totalPages: 0 });
    });

    it('throws BadRequestException when the data query fails', async () => {
      const countBuilder = createThenableResult(createMockQueryBuilder(), {
        count: 1,
        data: null,
        error: null,
      });
      const dataBuilder = createThenableResult(createMockQueryBuilder(), {
        data: null,
        error: { message: 'select failed' },
      });

      configureFromMocks({ organization_users: [countBuilder, dataBuilder] });

      await expect(service.findAll(TEST_IDS.organization)).rejects.toThrow(
        new BadRequestException('Failed to fetch organization users: select failed'),
      );
    });
  });

  describe('findOne', () => {
    it('returns a scoped organization user with worker enrichment', async () => {
      const orgUsersBuilder = setupTableMock(mockClient, 'organization_users');
      orgUsersBuilder.select.mockReturnValue(orgUsersBuilder);
      orgUsersBuilder.eq.mockReturnValue(orgUsersBuilder);
      orgUsersBuilder.maybeSingle.mockResolvedValue(
        mockQueryResult({
          ...orgUserRecord,
          user_profiles: {
            id: TEST_IDS.user,
            first_name: 'Karim',
            last_name: 'Benali',
            email: 'karim@example.com',
          },
          roles: { id: roleId, name: 'farm_manager', display_name: 'Farm Manager' },
        }),
      );

      const workersBuilder = setupTableMock(mockClient, 'workers');
      workersBuilder.select.mockReturnValue(workersBuilder);
      workersBuilder.eq.mockReturnValue(workersBuilder);
      workersBuilder.maybeSingle.mockResolvedValue(
        mockQueryResult({ id: TEST_IDS.worker, position: 'Supervisor', is_active: true }),
      );

      configureFromMocks({ organization_users: orgUsersBuilder, workers: workersBuilder });

      const result = await service.findOne(TEST_IDS.user, TEST_IDS.organization);

      expect(result.full_name).toBe('Karim Benali');
      expect(result.workers).toEqual([
        expect.objectContaining({ id: TEST_IDS.worker, position: 'Supervisor' }),
      ]);
      expect(orgUsersBuilder.eq).toHaveBeenCalledWith('organization_id', TEST_IDS.organization);
      expect(orgUsersBuilder.eq).toHaveBeenCalledWith('user_id', TEST_IDS.user);
      expect(workersBuilder.eq).toHaveBeenCalledWith('user_id', TEST_IDS.user);
    });

    it('throws NotFoundException when the organization user does not exist', async () => {
      const orgUsersBuilder = setupTableMock(mockClient, 'organization_users');
      orgUsersBuilder.select.mockReturnValue(orgUsersBuilder);
      orgUsersBuilder.eq.mockReturnValue(orgUsersBuilder);
      orgUsersBuilder.maybeSingle.mockResolvedValue(mockQueryResult(null));

      await expect(service.findOne(TEST_IDS.user, TEST_IDS.organization)).rejects.toThrow(
        new NotFoundException('Organization user not found'),
      );
    });
  });

  describe('create', () => {
    it('creates a member, enforces organization scope, and sends notifications', async () => {
      const subscriptionsBuilder = setupTableMock(mockClient, 'subscriptions');
      subscriptionsBuilder.select.mockReturnValue(subscriptionsBuilder);
      subscriptionsBuilder.eq.mockReturnValue(subscriptionsBuilder);
      subscriptionsBuilder.maybeSingle.mockResolvedValue(mockQueryResult({ max_users: 10 }));

      const countBuilder = createMockQueryBuilder();
      countBuilder.select.mockReturnValue(countBuilder);
      countBuilder.eq.mockReturnValue(countBuilder);
      createThenableResult(countBuilder, { count: 1, data: null, error: null });

      const insertBuilder = createMockQueryBuilder();
      insertBuilder.insert.mockReturnValue(insertBuilder);
      insertBuilder.select.mockReturnValue(insertBuilder);
      insertBuilder.single.mockResolvedValue(mockQueryResult(orgUserRecord));

      const orgUsersListBuilder = createThenableResult(createMockQueryBuilder(), {
        data: [
          { user_id: TEST_IDS.user },
          { user_id: '550e8400-e29b-41d4-a716-446655440301' },
          { user_id: TEST_IDS.user },
        ],
        error: null,
      });

      const profilesBuilder = createMockQueryBuilder();
      profilesBuilder.select.mockReturnValue(profilesBuilder);
      profilesBuilder.eq.mockReturnValue(profilesBuilder);
      profilesBuilder.maybeSingle.mockResolvedValue(
        mockQueryResult({ first_name: 'Karim', last_name: 'Benali' }),
      );

      configureFromMocks({
        subscriptions: subscriptionsBuilder,
        organization_users: [countBuilder, insertBuilder, orgUsersListBuilder],
        user_profiles: profilesBuilder,
      });

      const result = await service.create(
        { user_id: TEST_IDS.user, role_id: roleId, is_active: true },
        TEST_IDS.organization,
        '550e8400-e29b-41d4-a716-446655440999',
      );

      expect(result).toEqual(orgUserRecord);
      expect(insertBuilder.insert).toHaveBeenCalledWith({
        organization_id: TEST_IDS.organization,
        user_id: TEST_IDS.user,
        role_id: roleId,
        is_active: true,
        created_by: '550e8400-e29b-41d4-a716-446655440999',
      });
      expect(countBuilder.eq).toHaveBeenCalledWith('organization_id', TEST_IDS.organization);
      expect(mockNotificationsService.createNotificationsForUsers).toHaveBeenCalledWith(
        ['550e8400-e29b-41d4-a716-446655440301'],
        TEST_IDS.organization,
        NotificationType.MEMBER_ADDED,
        'Karim Benali joined the organization',
        'Karim Benali has been added to the organization',
        { userId: TEST_IDS.user, memberName: 'Karim Benali' },
      );
      expect(mockNotificationsService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: TEST_IDS.user,
          organizationId: TEST_IDS.organization,
          type: NotificationType.MEMBER_ADDED,
        }),
      );
    });

    it('throws ForbiddenException when the subscription user limit is reached', async () => {
      const subscriptionsBuilder = setupTableMock(mockClient, 'subscriptions');
      subscriptionsBuilder.select.mockReturnValue(subscriptionsBuilder);
      subscriptionsBuilder.eq.mockReturnValue(subscriptionsBuilder);
      subscriptionsBuilder.maybeSingle.mockResolvedValue(mockQueryResult({ max_users: 1 }));

      const countBuilder = createMockQueryBuilder();
      countBuilder.select.mockReturnValue(countBuilder);
      countBuilder.eq.mockReturnValue(countBuilder);
      createThenableResult(countBuilder, { count: 1, data: null, error: null });

      configureFromMocks({
        subscriptions: subscriptionsBuilder,
        organization_users: countBuilder,
      });

      await expect(
        service.create({ user_id: TEST_IDS.user, role_id: roleId }, TEST_IDS.organization, TEST_IDS.user),
      ).rejects.toThrow(
        new ForbiddenException('Subscription limit reached: maximum 1 users for your plan'),
      );
    });
  });

  describe('inviteUser', () => {
    it('throws a conflict-style BadRequestException when the user is already active in the organization', async () => {
      const subscriptionsBuilder = setupTableMock(mockClient, 'subscriptions');
      subscriptionsBuilder.select.mockReturnValue(subscriptionsBuilder);
      subscriptionsBuilder.eq.mockReturnValue(subscriptionsBuilder);
      subscriptionsBuilder.maybeSingle.mockResolvedValue(mockQueryResult({ max_users: 5 }));

      const countBuilder = createMockQueryBuilder();
      countBuilder.select.mockReturnValue(countBuilder);
      countBuilder.eq.mockReturnValue(countBuilder);
      createThenableResult(countBuilder, { count: 1, data: null, error: null });

      const profilesBuilder = createMockQueryBuilder();
      profilesBuilder.select.mockReturnValue(profilesBuilder);
      profilesBuilder.eq.mockReturnValue(profilesBuilder);
      profilesBuilder.maybeSingle.mockResolvedValue(
        mockQueryResult({ id: TEST_IDS.user, email: 'karim@example.com' }),
      );

      const existingOrgUserBuilder = createMockQueryBuilder();
      existingOrgUserBuilder.select.mockReturnValue(existingOrgUserBuilder);
      existingOrgUserBuilder.eq.mockReturnValue(existingOrgUserBuilder);
      existingOrgUserBuilder.maybeSingle.mockResolvedValue(
        mockQueryResult({ user_id: TEST_IDS.user, is_active: true }),
      );

      configureFromMocks({
        subscriptions: subscriptionsBuilder,
        user_profiles: profilesBuilder,
        organization_users: [countBuilder, existingOrgUserBuilder],
      });

      await expect(
        service.inviteUser(
          'karim@example.com',
          roleId,
          TEST_IDS.organization,
          '550e8400-e29b-41d4-a716-446655440999',
          'Karim',
          'Benali',
        ),
      ).rejects.toThrow(new BadRequestException('User is already a member of this organization'));
    });

    it('reactivates an inactive existing member instead of creating a duplicate', async () => {
      const subscriptionsBuilder = setupTableMock(mockClient, 'subscriptions');
      subscriptionsBuilder.select.mockReturnValue(subscriptionsBuilder);
      subscriptionsBuilder.eq.mockReturnValue(subscriptionsBuilder);
      subscriptionsBuilder.maybeSingle.mockResolvedValue(mockQueryResult({ max_users: 5 }));

      const countBuilder = createMockQueryBuilder();
      countBuilder.select.mockReturnValue(countBuilder);
      countBuilder.eq.mockReturnValue(countBuilder);
      createThenableResult(countBuilder, { count: 1, data: null, error: null });

      const profilesBuilder = createMockQueryBuilder();
      profilesBuilder.select.mockReturnValue(profilesBuilder);
      profilesBuilder.eq.mockReturnValue(profilesBuilder);
      profilesBuilder.maybeSingle.mockResolvedValue(
        mockQueryResult({ id: TEST_IDS.user, email: 'karim@example.com' }),
      );

      const existingOrgUserBuilder = createMockQueryBuilder();
      existingOrgUserBuilder.select.mockReturnValue(existingOrgUserBuilder);
      existingOrgUserBuilder.eq.mockReturnValue(existingOrgUserBuilder);
      existingOrgUserBuilder.maybeSingle.mockResolvedValue(
        mockQueryResult({ user_id: TEST_IDS.user, is_active: false }),
      );

      const reactivateBuilder = createMockQueryBuilder();
      reactivateBuilder.update.mockReturnValue(reactivateBuilder);
      reactivateBuilder.eq.mockReturnValue(reactivateBuilder);
      createThenableResult(reactivateBuilder, { data: null, error: null });

      configureFromMocks({
        subscriptions: subscriptionsBuilder,
        user_profiles: profilesBuilder,
        organization_users: [countBuilder, existingOrgUserBuilder, reactivateBuilder],
      });

      const result = await service.inviteUser(
        'karim@example.com',
        roleId,
        TEST_IDS.organization,
        '550e8400-e29b-41d4-a716-446655440999',
      );

      expect(result).toEqual({
        success: true,
        message: 'User has been re-activated in the organization',
      });
      expect(reactivateBuilder.update).toHaveBeenCalledWith({ is_active: true, role_id: roleId });
      expect(reactivateBuilder.eq).toHaveBeenCalledWith('organization_id', TEST_IDS.organization);
      expect(mockEmailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('updates the scoped organization user and sends a role change notification', async () => {
      const orgUserLookupBuilder = createMockQueryBuilder();
      orgUserLookupBuilder.select.mockReturnValue(orgUserLookupBuilder);
      orgUserLookupBuilder.eq.mockReturnValue(orgUserLookupBuilder);
      orgUserLookupBuilder.maybeSingle.mockResolvedValue(
        mockQueryResult({
          ...orgUserRecord,
          user_profiles: {
            first_name: 'Karim',
            last_name: 'Benali',
            email: 'karim@example.com',
          },
        }),
      );

      const workersBuilder = createMockQueryBuilder();
      workersBuilder.select.mockReturnValue(workersBuilder);
      workersBuilder.eq.mockReturnValue(workersBuilder);
      workersBuilder.maybeSingle.mockResolvedValue(mockQueryResult(null));

      const updateBuilder = createMockQueryBuilder();
      updateBuilder.update.mockReturnValue(updateBuilder);
      updateBuilder.eq.mockReturnValue(updateBuilder);
      updateBuilder.select.mockReturnValue(updateBuilder);
      updateBuilder.single.mockResolvedValue(
        mockQueryResult({ ...orgUserRecord, role_id: secondRoleId }),
      );

      const rolesBuilder = setupTableMock(mockClient, 'roles');
      rolesBuilder.select.mockReturnValue(rolesBuilder);
      rolesBuilder.eq.mockReturnValue(rolesBuilder);
      rolesBuilder.maybeSingle.mockResolvedValue(mockQueryResult({ name: 'organization_admin' }));

      configureFromMocks({
        organization_users: [orgUserLookupBuilder, updateBuilder],
        workers: workersBuilder,
        roles: rolesBuilder,
      });

      const result = await service.update(TEST_IDS.user, TEST_IDS.organization, {
        role_id: secondRoleId,
        is_active: false,
      });

      expect(result).toEqual({ ...orgUserRecord, role_id: secondRoleId });
      expect(updateBuilder.eq).toHaveBeenCalledWith('organization_id', TEST_IDS.organization);
      expect(updateBuilder.eq).toHaveBeenCalledWith('user_id', TEST_IDS.user);
      expect(mockNotificationsService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: TEST_IDS.user,
          organizationId: TEST_IDS.organization,
          type: NotificationType.ROLE_CHANGED,
          title: 'Your role has been changed to organization_admin',
        }),
      );
    });

    it('throws BadRequestException when the update fails', async () => {
      const orgUserLookupBuilder = createMockQueryBuilder();
      orgUserLookupBuilder.select.mockReturnValue(orgUserLookupBuilder);
      orgUserLookupBuilder.eq.mockReturnValue(orgUserLookupBuilder);
      orgUserLookupBuilder.maybeSingle.mockResolvedValue(
        mockQueryResult({ ...orgUserRecord, user_profiles: { first_name: 'Karim', last_name: 'Benali' } }),
      );

      const workersBuilder = createMockQueryBuilder();
      workersBuilder.select.mockReturnValue(workersBuilder);
      workersBuilder.eq.mockReturnValue(workersBuilder);
      workersBuilder.maybeSingle.mockResolvedValue(mockQueryResult(null));

      const updateBuilder = createMockQueryBuilder();
      updateBuilder.update.mockReturnValue(updateBuilder);
      updateBuilder.eq.mockReturnValue(updateBuilder);
      updateBuilder.select.mockReturnValue(updateBuilder);
      updateBuilder.single.mockResolvedValue(mockQueryResult(null, { message: 'update failed' }));

      configureFromMocks({
        organization_users: [orgUserLookupBuilder, updateBuilder],
        workers: workersBuilder,
      });

      await expect(
        service.update(TEST_IDS.user, TEST_IDS.organization, { is_active: false }),
      ).rejects.toThrow(
        new BadRequestException('Failed to update organization user: update failed'),
      );
    });
  });

  describe('delete', () => {
    it('soft deletes the scoped organization user and returns a success message', async () => {
      const orgUserLookupBuilder = createMockQueryBuilder();
      orgUserLookupBuilder.select.mockReturnValue(orgUserLookupBuilder);
      orgUserLookupBuilder.eq.mockReturnValue(orgUserLookupBuilder);
      orgUserLookupBuilder.maybeSingle.mockResolvedValue(
        mockQueryResult({ ...orgUserRecord, user_profiles: { first_name: 'Karim', last_name: 'Benali' } }),
      );

      const workersBuilder = createMockQueryBuilder();
      workersBuilder.select.mockReturnValue(workersBuilder);
      workersBuilder.eq.mockReturnValue(workersBuilder);
      workersBuilder.maybeSingle.mockResolvedValue(mockQueryResult(null));

      const deleteBuilder = createThenableResult(createMockQueryBuilder(), {
        data: null,
        error: null,
      });
      deleteBuilder.update.mockReturnValue(deleteBuilder);
      deleteBuilder.eq.mockReturnValue(deleteBuilder);

      configureFromMocks({
        organization_users: [orgUserLookupBuilder, deleteBuilder],
        workers: workersBuilder,
      });

      const result = await service.delete(TEST_IDS.user, TEST_IDS.organization);

      expect(result).toEqual({ message: 'User removed from organization successfully' });
      expect(deleteBuilder.update).toHaveBeenCalledWith({ is_active: false });
      expect(deleteBuilder.eq).toHaveBeenCalledWith('organization_id', TEST_IDS.organization);
      expect(mockNotificationsService.createNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: TEST_IDS.user,
          organizationId: TEST_IDS.organization,
          type: NotificationType.MEMBER_REMOVED,
        }),
      );
    });
  });

  describe('getAssignableUsers', () => {
    it('returns assignable users scoped to the organization with role and worker enrichment', async () => {
      const orgUsersBuilder = createMockQueryBuilder();
      orgUsersBuilder.select.mockReturnValue(orgUsersBuilder);
      orgUsersBuilder.eq.mockReturnValue(orgUsersBuilder);
      orgUsersBuilder.not.mockReturnValue(orgUsersBuilder);
      orgUsersBuilder.then.mockImplementation(
        (resolve: (value: { data: any[]; error: { message: string } | null }) => void) => {
          resolve({
            data: [
              {
                user_id: TEST_IDS.user,
                organization_id: TEST_IDS.organization,
                role_id: roleId,
                roles: { name: 'farm_manager', display_name: 'Farm Manager' },
              },
              {
                user_id: '550e8400-e29b-41d4-a716-446655440201',
                organization_id: TEST_IDS.organization,
                role_id: secondRoleId,
                roles: { name: 'farm_worker', display_name: 'Farm Worker' },
              },
            ],
            error: null,
          });
          return Promise.resolve({ data: [], error: null });
        },
      );

      const profilesBuilder = createMockQueryBuilder();
      profilesBuilder.select.mockReturnValue(profilesBuilder);
      profilesBuilder.in.mockReturnValue(profilesBuilder);
      profilesBuilder.then.mockImplementation(
        (resolve: (value: { data: any[]; error: { message: string } | null }) => void) => {
          resolve({
            data: [
              {
                id: TEST_IDS.user,
                first_name: 'Karim',
                last_name: 'Benali',
              },
              {
                id: '550e8400-e29b-41d4-a716-446655440201',
                first_name: 'Fatima',
                last_name: 'Idrissi',
              },
            ],
            error: null,
          });
          return Promise.resolve({ data: [], error: null });
        },
      );

      const workersBuilder = createMockQueryBuilder();
      workersBuilder.select.mockReturnValue(workersBuilder);
      workersBuilder.in.mockReturnValue(workersBuilder);
      workersBuilder.eq.mockReturnValue(workersBuilder);
      workersBuilder.then.mockImplementation(
        (resolve: (value: { data: any[]; error: { message: string } | null }) => void) => {
          resolve({
            data: [
              {
                id: TEST_IDS.worker,
                user_id: TEST_IDS.user,
                position: 'Supervisor',
                is_active: true,
              },
            ],
            error: null,
          });
          return Promise.resolve({ data: [], error: null });
        },
      );

      configureFromMocks({
        organization_users: orgUsersBuilder,
        user_profiles: profilesBuilder,
        workers: workersBuilder,
      });

      const result = await service.getAssignableUsers(TEST_IDS.organization);

      expect(result).toEqual([
        {
          user_id: TEST_IDS.user,
          first_name: 'Karim',
          last_name: 'Benali',
          full_name: 'Karim Benali',
          organization_id: TEST_IDS.organization,
          role: 'farm_manager',
          worker_id: TEST_IDS.worker,
          worker_position: 'Supervisor',
          user_type: 'worker',
        },
        {
          user_id: '550e8400-e29b-41d4-a716-446655440201',
          first_name: 'Fatima',
          last_name: 'Idrissi',
          full_name: 'Fatima Idrissi',
          organization_id: TEST_IDS.organization,
          role: 'farm_worker',
          worker_id: null,
          worker_position: null,
          user_type: 'user',
        },
      ]);
      expect(orgUsersBuilder.eq).toHaveBeenCalledWith('organization_id', TEST_IDS.organization);
      expect(orgUsersBuilder.eq).toHaveBeenCalledWith('is_active', true);
      expect(orgUsersBuilder.not).toHaveBeenCalledWith('roles.name', 'in', '(viewer,day_laborer)');
      expect(profilesBuilder.in).toHaveBeenCalledWith('id', [TEST_IDS.user, '550e8400-e29b-41d4-a716-446655440201']);
      expect(workersBuilder.in).toHaveBeenCalledWith('user_id', [TEST_IDS.user, '550e8400-e29b-41d4-a716-446655440201']);
      expect(workersBuilder.eq).toHaveBeenCalledWith('is_active', true);
    });

    it('returns an empty array when no assignable users exist', async () => {
      const orgUsersBuilder = createMockQueryBuilder();
      orgUsersBuilder.select.mockReturnValue(orgUsersBuilder);
      orgUsersBuilder.eq.mockReturnValue(orgUsersBuilder);
      orgUsersBuilder.not.mockReturnValue(orgUsersBuilder);
      orgUsersBuilder.then.mockImplementation(
        (resolve: (value: { data: any[]; error: { message: string } | null }) => void) => {
          resolve({ data: [], error: null });
          return Promise.resolve({ data: [], error: null });
        },
      );

      configureFromMocks({ organization_users: orgUsersBuilder });

      await expect(service.getAssignableUsers(TEST_IDS.organization)).resolves.toEqual([]);
    });
  });

  describe('getTempPassword', () => {
    it('returns the temporary password for a user when one exists', async () => {
      const orgUsersBuilder = setupTableMock(mockClient, 'organization_users');
      orgUsersBuilder.select.mockReturnValue(orgUsersBuilder);
      orgUsersBuilder.eq.mockReturnValue(orgUsersBuilder);
      orgUsersBuilder.maybeSingle.mockResolvedValue(mockQueryResult({ user_id: TEST_IDS.user }));

      const workersBuilder = setupTableMock(mockClient, 'workers');
      workersBuilder.select.mockReturnValue(workersBuilder);
      workersBuilder.eq.mockReturnValue(workersBuilder);
      workersBuilder.maybeSingle.mockResolvedValue(
        mockQueryResult({
          temp_password: 'Temp1234!',
          temp_password_expires_at: '2026-04-23T10:00:00.000Z',
        }),
      );

      configureFromMocks({ organization_users: orgUsersBuilder, workers: workersBuilder });

      await expect(service.getTempPassword(TEST_IDS.user, TEST_IDS.organization)).resolves.toEqual({
        temp_password: 'Temp1234!',
        expires_at: '2026-04-23T10:00:00.000Z',
      });
      expect(orgUsersBuilder.eq).toHaveBeenCalledWith('user_id', TEST_IDS.user);
      expect(orgUsersBuilder.eq).toHaveBeenCalledWith('organization_id', TEST_IDS.organization);
      expect(workersBuilder.eq).toHaveBeenCalledWith('user_id', TEST_IDS.user);
    });

    it('throws NotFoundException when no temporary password exists', async () => {
      const orgUsersBuilder = setupTableMock(mockClient, 'organization_users');
      orgUsersBuilder.select.mockReturnValue(orgUsersBuilder);
      orgUsersBuilder.eq.mockReturnValue(orgUsersBuilder);
      orgUsersBuilder.maybeSingle.mockResolvedValue(mockQueryResult({ user_id: TEST_IDS.user }));

      const workersBuilder = setupTableMock(mockClient, 'workers');
      workersBuilder.select.mockReturnValue(workersBuilder);
      workersBuilder.eq.mockReturnValue(workersBuilder);
      workersBuilder.maybeSingle.mockResolvedValue(mockQueryResult({ temp_password: null }));

      configureFromMocks({ organization_users: orgUsersBuilder, workers: workersBuilder });

      await expect(service.getTempPassword(TEST_IDS.user, TEST_IDS.organization)).rejects.toThrow(
        new NotFoundException(
          'No temporary password available. The password may have been used or expired.',
        ),
      );
    });

    it('throws NotFoundException when the user does not belong to the organization', async () => {
      const orgUsersBuilder = setupTableMock(mockClient, 'organization_users');
      orgUsersBuilder.select.mockReturnValue(orgUsersBuilder);
      orgUsersBuilder.eq.mockReturnValue(orgUsersBuilder);
      orgUsersBuilder.maybeSingle.mockResolvedValue(mockQueryResult(null));

      await expect(service.getTempPassword(TEST_IDS.user, TEST_IDS.organization)).rejects.toThrow(
        new NotFoundException('User not found in organization'),
      );
    });
  });

  describe('resetPassword', () => {
    it('successfully resets the password and clears temp password state for a worker', async () => {
      const crypto = require('crypto');
      jest.spyOn(crypto, 'randomInt').mockReturnValue(0);

      const orgUsersBuilder = setupTableMock(mockClient, 'organization_users');
      orgUsersBuilder.select.mockReturnValue(orgUsersBuilder);
      orgUsersBuilder.eq.mockReturnValue(orgUsersBuilder);
      orgUsersBuilder.maybeSingle.mockResolvedValue(
        mockQueryResult({
          ...orgUserRecord,
          user_profiles: { first_name: 'Karim', last_name: 'Benali', email: 'karim@example.com' },
        }),
      );

      const workerLookupBuilder = createMockQueryBuilder();
      workerLookupBuilder.select.mockReturnValue(workerLookupBuilder);
      workerLookupBuilder.eq.mockReturnValue(workerLookupBuilder);
      workerLookupBuilder.maybeSingle.mockResolvedValue(mockQueryResult({ id: TEST_IDS.worker }));

      const workerCheckBuilder = createMockQueryBuilder();
      workerCheckBuilder.select.mockReturnValue(workerCheckBuilder);
      workerCheckBuilder.eq.mockReturnValue(workerCheckBuilder);
      workerCheckBuilder.maybeSingle.mockResolvedValue(mockQueryResult({ id: TEST_IDS.worker }));

      const workerUpdateBuilder = createMockQueryBuilder();
      workerUpdateBuilder.update.mockReturnValue(workerUpdateBuilder);
      workerUpdateBuilder.eq.mockReturnValue(workerUpdateBuilder);
      workerUpdateBuilder.then.mockImplementation(
        (resolve: (value: { data: null; error: { message: string } | null }) => void) => {
          resolve({ data: null, error: null });
          return Promise.resolve({ data: null, error: null });
        },
      );

      const profileBuilder = createMockQueryBuilder();
      profileBuilder.select.mockReturnValue(profileBuilder);
      profileBuilder.eq.mockReturnValue(profileBuilder);
      profileBuilder.maybeSingle.mockResolvedValue(
        mockQueryResult({ email: 'karim@example.com', first_name: 'Karim' }),
      );

      mockClient.auth.admin.updateUserById.mockResolvedValue({ error: null });

      configureFromMocks({
        organization_users: orgUsersBuilder,
        workers: [workerLookupBuilder, workerCheckBuilder, workerUpdateBuilder],
        user_profiles: profileBuilder,
      });

      const result = await service.resetPassword(TEST_IDS.user, TEST_IDS.organization);

      expect(result.success).toBe(true);
      expect(result.temp_password).toBe('aaaaaaaaaaaaaaaa');
      expect(result.message).toBe(
        'Password has been reset. Please share the new temporary password with the user.',
      );
      expect(mockClient.auth.admin.updateUserById).toHaveBeenCalledWith(TEST_IDS.user, {
        password: 'aaaaaaaaaaaaaaaa',
      });
      expect(workerUpdateBuilder.update).toHaveBeenCalledWith({
        temp_password: 'aaaaaaaaaaaaaaaa',
        temp_password_expires_at: expect.any(String),
      });
      expect(mockEmailService.sendPasswordResetEmail).toHaveBeenCalledWith(
        'karim@example.com',
        'Karim',
        'aaaaaaaaaaaaaaaa',
      );
    });

    it('throws a BadRequestException when the auth password update fails', async () => {
      const crypto = require('crypto');
      jest.spyOn(crypto, 'randomInt').mockReturnValue(0);

      const orgUsersBuilder = setupTableMock(mockClient, 'organization_users');
      orgUsersBuilder.select.mockReturnValue(orgUsersBuilder);
      orgUsersBuilder.eq.mockReturnValue(orgUsersBuilder);
      orgUsersBuilder.maybeSingle.mockResolvedValue(
        mockQueryResult({
          ...orgUserRecord,
          user_profiles: { first_name: 'Karim', last_name: 'Benali', email: 'karim@example.com' },
        }),
      );

      const workerLookupBuilder = createMockQueryBuilder();
      workerLookupBuilder.select.mockReturnValue(workerLookupBuilder);
      workerLookupBuilder.eq.mockReturnValue(workerLookupBuilder);
      workerLookupBuilder.maybeSingle.mockResolvedValue(mockQueryResult(null));

      const profileBuilder = createMockQueryBuilder();
      profileBuilder.select.mockReturnValue(profileBuilder);
      profileBuilder.eq.mockReturnValue(profileBuilder);
      profileBuilder.maybeSingle.mockResolvedValue(
        mockQueryResult({ email: 'karim@example.com', first_name: 'Karim' }),
      );

      mockClient.auth.admin.updateUserById.mockResolvedValue({ error: { message: 'update failed' } });

      configureFromMocks({
        organization_users: orgUsersBuilder,
        workers: workerLookupBuilder,
        user_profiles: profileBuilder,
      });

      await expect(service.resetPassword(TEST_IDS.user, TEST_IDS.organization)).rejects.toThrow(
        new BadRequestException('Failed to reset password: update failed'),
      );
    });
  });
});
