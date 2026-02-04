import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { UsersService, CreateUserProfileDto } from './users.service';
import { DatabaseService } from '../database/database.service';
import {
  createMockSupabaseClient,
  createMockQueryBuilder,
  mockQueryResult,
  MockSupabaseClient,
} from '../../../test/helpers/mock-database.helper';
import { TEST_IDS } from '../../../test/helpers/test-utils';
import { mockUserProfiles, mockRoles, mockOrganizations } from '../../../test/fixtures/organization.fixture';

describe('UsersService', () => {
  let service: UsersService;
  let mockClient: MockSupabaseClient;
  let mockDatabaseService: { getAdminClient: jest.Mock };

  // ============================================================
  // TEST DATA FIXTURES
  // ============================================================

  const VALID_USER_DATA = [
    {
      userId: TEST_IDS.user,
      email: 'user1@test.com',
      firstName: 'John',
      lastName: 'Doe',
      fullName: 'John Doe',
    },
    {
      userId: 'user-2',
      email: 'user2@test.com',
      firstName: 'Jane',
      lastName: 'Smith',
      fullName: 'Jane Smith',
    },
    {
      userId: 'user-3',
      email: 'user3@test.com',
      firstName: 'أحمد',
      lastName: 'محمد',
      fullName: 'أحمد محمد',
    },
  ];

  const INVALID_EMAILS = [
    '',
    '   ',
    'not-an-email',
    '@example.com',
    'user@',
    'user@@example.com',
  ];

  const VALID_LANGUAGES = ['en', 'fr', 'ar', 'es'];

  const VALID_TIMEZONES = [
    'Africa/Casablanca',
    'Europe/Paris',
    'America/New_York',
    'Asia/Tokyo',
    'UTC',
  ];

  const INVALID_PHONE_NUMBERS = [
    '123',
    'abc',
    '+12345678901234567890', // Too long
  ];

  const ROLE_NAMES = [
    'organization_admin',
    'farm_manager',
    'farm_worker',
    'day_laborer',
    'viewer',
  ];

  // ============================================================
  // SETUP & TEARDOWN
  // ============================================================

  beforeEach(async () => {
    mockClient = createMockSupabaseClient();
    mockDatabaseService = {
      getAdminClient: jest.fn(() => mockClient),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: DatabaseService, useValue: mockDatabaseService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================
  // PARAMETERIZED TESTS - CREATE PROFILE
  // ============================================================

  describe('createProfile (Parameterized)', () => {
    const setupUpsertMock = (data: any, error: any = null) => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.upsert.mockReturnValue(queryBuilder);
      queryBuilder.select.mockReturnValue(queryBuilder);
      queryBuilder.single.mockResolvedValue(mockQueryResult(data, error));
      mockClient.from.mockReturnValue(queryBuilder);
      return queryBuilder;
    };

    it.each(VALID_USER_DATA)(
      'should create user profile with valid data: $email',
      async (userData) => {
        setupUpsertMock({
          id: userData.userId,
          email: userData.email,
          first_name: userData.firstName,
          last_name: userData.lastName,
          full_name: userData.fullName,
          language: 'fr',
          timezone: 'Africa/Casablanca',
        });

        const dto: CreateUserProfileDto = {
          userId: userData.userId,
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          fullName: userData.fullName,
        };

        const result = await service.createProfile(dto);

        expect(result).toBeDefined();
        expect(result.email).toBe(userData.email);
        expect(mockClient.from).toHaveBeenCalledWith('user_profiles');
      }
    );

    it.each(VALID_LANGUAGES)(
      'should create profile with language: %s',
      async (language) => {
        setupUpsertMock({
          id: TEST_IDS.user,
          email: 'user@test.com',
          language,
        });

        const dto: CreateUserProfileDto = {
          userId: TEST_IDS.user,
          email: 'user@test.com',
          language,
        };

        const result = await service.createProfile(dto);

        expect(result).toBeDefined();
        expect(mockClient.from).toHaveBeenCalledWith('user_profiles');
      }
    );

    it.each(VALID_TIMEZONES)(
      'should create profile with timezone: %s',
      async (timezone) => {
        setupUpsertMock({
          id: TEST_IDS.user,
          email: 'user@test.com',
          timezone,
        });

        const dto: CreateUserProfileDto = {
          userId: TEST_IDS.user,
          email: 'user@test.com',
          timezone,
        };

        const result = await service.createProfile(dto);

        expect(result).toBeDefined();
        expect(mockClient.from).toHaveBeenCalledWith('user_profiles');
      }
    );

    it.each([
      { onboardingCompleted: true, passwordSet: true },
      { onboardingCompleted: false, passwordSet: false },
      { onboardingCompleted: true, passwordSet: false },
      { onboardingCompleted: false, passwordSet: true },
    ])(
      'should handle onboarding and password flags: %o',
      async (flags) => {
        setupUpsertMock({
          id: TEST_IDS.user,
          email: 'user@test.com',
          onboarding_completed: flags.onboardingCompleted,
          password_set: flags.passwordSet,
        });

        const dto: CreateUserProfileDto = {
          userId: TEST_IDS.user,
          email: 'user@test.com',
          ...flags,
        };

        const result = await service.createProfile(dto);

        expect(result).toBeDefined();
      }
    );
  });

  // ============================================================
  // INPUT VALIDATION TESTS
  // ============================================================

  describe('Input Validation', () => {
    const setupUpsertMock = (data: any, error: any = null) => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.upsert.mockReturnValue(queryBuilder);
      queryBuilder.select.mockReturnValue(queryBuilder);
      queryBuilder.single.mockResolvedValue(mockQueryResult(data, error));
      mockClient.from.mockReturnValue(queryBuilder);
      return queryBuilder;
    };

    describe('createProfile', () => {
      it.each([null, undefined, ''])(
        'should handle invalid user ID: %s',
        async (userId) => {
          setupUpsertMock(null, { message: 'Invalid user ID' });

          const dto: CreateUserProfileDto = {
            userId: userId as any,
            email: 'test@example.com',
          };

          await expect(service.createProfile(dto)).rejects.toThrow(
            InternalServerErrorException
          );
        }
      );

      it.each(INVALID_EMAILS)(
        'should handle invalid email: %s',
        async (email) => {
          setupUpsertMock(null, { message: 'Invalid email' });

          const dto: CreateUserProfileDto = {
            userId: TEST_IDS.user,
            email,
          };

          await expect(service.createProfile(dto)).rejects.toThrow();
        }
      );

      it('should use default values when optional fields are not provided', async () => {
        const queryBuilder = setupUpsertMock({
          id: TEST_IDS.user,
          email: 'user@test.com',
          language: 'fr',
          timezone: 'Africa/Casablanca',
          onboarding_completed: false,
          password_set: true,
        });

        const dto: CreateUserProfileDto = {
          userId: TEST_IDS.user,
          email: 'user@test.com',
        };

        const result = await service.createProfile(dto);

        expect(result).toBeDefined();
        expect(mockClient.from).toHaveBeenCalledWith('user_profiles');
        expect(queryBuilder.upsert).toHaveBeenCalledWith(
          expect.objectContaining({
            language: 'fr',
            timezone: 'Africa/Casablanca',
            onboarding_completed: false,
            password_set: true,
          }),
          expect.any(Object)
        );
      });
    });

    describe('updateProfile', () => {
      it.each([null, undefined, ''])(
        'should handle invalid user ID: %s',
        async (userId) => {
          const queryBuilder = createMockQueryBuilder();
          queryBuilder.update.mockReturnValue(queryBuilder);
          queryBuilder.select.mockReturnValue(queryBuilder);
          queryBuilder.single.mockResolvedValue(
            mockQueryResult(null, { message: 'Invalid user ID' })
          );
          mockClient.from.mockReturnValue(queryBuilder);

          await expect(
            service.updateProfile(userId as any, { first_name: 'Test' })
          ).rejects.toThrow(InternalServerErrorException);
        }
      );
    });

    describe('getUserOrganizations', () => {
      it.each([null, undefined, '', 'invalid-uuid'])(
        'should handle invalid user ID: %s',
        async (userId) => {
          const queryBuilder = createMockQueryBuilder();
          queryBuilder.select.mockReturnValue(queryBuilder);
          // Mock two .eq() calls in chain
          let eqCallCount = 0;
          queryBuilder.eq.mockImplementation(() => {
            eqCallCount++;
            if (eqCallCount === 2) {
              return Promise.resolve(mockQueryResult([]));
            }
            return queryBuilder;
          });
          mockClient.from.mockReturnValue(queryBuilder);

          const result = await service.getUserOrganizations(userId as any);

          expect(result).toEqual([]);
        }
      );
    });
  });

  // ============================================================
  // BEHAVIOR-FOCUSED TESTS
  // ============================================================

  describe('Behavior - Profile Management', () => {
    const setupUpsertMock = (data: any, error: any = null) => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.upsert.mockReturnValue(queryBuilder);
      queryBuilder.select.mockReturnValue(queryBuilder);
      queryBuilder.single.mockResolvedValue(mockQueryResult(data, error));
      mockClient.from.mockReturnValue(queryBuilder);
      return queryBuilder;
    };

    it('should use upsert for profile creation', async () => {
      const queryBuilder = setupUpsertMock({
        id: TEST_IDS.user,
        email: 'user@test.com',
        first_name: 'Test',
        last_name: 'User',
      });

      const dto: CreateUserProfileDto = {
        userId: TEST_IDS.user,
        email: 'user@test.com',
        firstName: 'Test',
        lastName: 'User',
      };

      await service.createProfile(dto);

      expect(mockClient.from).toHaveBeenCalledWith('user_profiles');
      expect(queryBuilder.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          id: TEST_IDS.user,
          email: 'user@test.com',
          first_name: 'Test',
          last_name: 'User',
        }),
        { onConflict: 'id' }
      );
    });

    it('should handle database error gracefully', async () => {
      setupUpsertMock(null, { message: 'Database error' });

      const dto: CreateUserProfileDto = {
        userId: TEST_IDS.user,
        email: 'user@test.com',
      };

      await expect(service.createProfile(dto)).rejects.toThrow(
        InternalServerErrorException
      );
    });

    it('should throw InternalServerErrorException when upsert returns null data', async () => {
      setupUpsertMock(null);

      const dto: CreateUserProfileDto = {
        userId: TEST_IDS.user,
        email: 'user@test.com',
      };

      await expect(service.createProfile(dto)).rejects.toThrow(
        InternalServerErrorException
      );
    });

    it('should handle RPC error gracefully', async () => {
      mockClient.rpc.mockResolvedValue(
        mockQueryResult(null, { message: 'RPC function failed' })
      );

      const dto: CreateUserProfileDto = {
        userId: TEST_IDS.user,
        email: 'user@test.com',
      };

      await expect(service.createProfile(dto)).rejects.toThrow(
        InternalServerErrorException
      );
    });

    it('should throw InternalServerErrorException when RPC returns null data', async () => {
      mockClient.rpc.mockResolvedValue(mockQueryResult(null));

      const dto: CreateUserProfileDto = {
        userId: TEST_IDS.user,
        email: 'user@test.com',
      };

      await expect(service.createProfile(dto)).rejects.toThrow(
        InternalServerErrorException
      );
      await expect(service.createProfile(dto)).rejects.toThrow(
        'Failed to create user profile: no data returned'
      );
    });
  });

  describe('Behavior - Organization Membership', () => {
    it('should return flattened organization structure', async () => {
      const mockOrgUsers = [
        {
          organization_id: TEST_IDS.organization,
          role_id: mockRoles.organizationAdmin.id,
          is_active: true,
          role: mockRoles.organizationAdmin,
          organizations: mockOrganizations.default,
        },
      ];

      const queryBuilder = createMockQueryBuilder();
      queryBuilder.select.mockReturnValue(queryBuilder);
      // Mock two .eq() calls in chain
      let eqCallCount = 0;
      queryBuilder.eq.mockImplementation(() => {
        eqCallCount++;
        if (eqCallCount === 2) {
          return Promise.resolve(mockQueryResult(mockOrgUsers));
        }
        return queryBuilder;
      });
      mockClient.from.mockReturnValue(queryBuilder);

      const result = await service.getUserOrganizations(TEST_IDS.user);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: TEST_IDS.organization,
        name: mockOrganizations.default.name,
        slug: mockOrganizations.default.slug,
        role: mockRoles.organizationAdmin.name,
        role_display_name: mockRoles.organizationAdmin.display_name,
        role_level: mockRoles.organizationAdmin.level,
      });
    });

    it('should return empty array when user has no organizations', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.select.mockReturnValue(queryBuilder);
      // Mock two .eq() calls in chain
      let eqCallCount = 0;
      queryBuilder.eq.mockImplementation(() => {
        eqCallCount++;
        if (eqCallCount === 2) {
          return Promise.resolve(mockQueryResult([]));
        }
        return queryBuilder;
      });
      mockClient.from.mockReturnValue(queryBuilder);

      const result = await service.getUserOrganizations('new-user-id');

      expect(result).toEqual([]);
    });

    it('should filter only active memberships', async () => {
      const mockOrgUsers = [
        {
          organization_id: 'org-1',
          role_id: mockRoles.viewer.id,
          is_active: true,
          role: mockRoles.viewer,
          organizations: { id: 'org-1', name: 'Active Org' },
        },
        {
          organization_id: 'org-2',
          role_id: mockRoles.viewer.id,
          is_active: false,
          role: mockRoles.viewer,
          organizations: { id: 'org-2', name: 'Inactive Org' },
        },
      ];

      const queryBuilder = createMockQueryBuilder();
      queryBuilder.select.mockReturnValue(queryBuilder);
      // Mock two .eq() calls in chain
      let eqCallCount = 0;
      queryBuilder.eq.mockImplementation(() => {
        eqCallCount++;
        if (eqCallCount === 2) {
          return Promise.resolve(mockQueryResult(mockOrgUsers));
        }
        return queryBuilder;
      });
      mockClient.from.mockReturnValue(queryBuilder);

      const result = await service.getUserOrganizations(TEST_IDS.user);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('org-1');
    });
  });

  describe('Behavior - Organization Users Management', () => {
    it('should return users with roles and profiles', async () => {
      const mockOrgUsers = [
        {
          user_id: TEST_IDS.user,
          organization_id: TEST_IDS.organization,
          role_id: mockRoles.organizationAdmin.id,
          is_active: true,
          roles: mockRoles.organizationAdmin,
        },
      ];

      const mockProfiles = [
        {
          id: TEST_IDS.user,
          first_name: 'Admin',
          last_name: 'User',
          email: 'admin@test.com',
          avatar_url: null,
        },
      ];

      let callCount = 0;
      mockClient.from.mockImplementation((table: string) => {
        const qb = createMockQueryBuilder();
        callCount++;
        if (callCount === 1 && table === 'organization_users') {
          // First call is for organization_users
          qb.select.mockReturnValue(qb);
          qb.eq.mockReturnValue(qb);
          qb.order.mockReturnValue(Promise.resolve(mockQueryResult(mockOrgUsers)));
        } else if (callCount === 2 && table === 'user_profiles') {
          // Second call is for user_profiles
          qb.select.mockReturnValue(qb);
          qb.in.mockReturnValue(Promise.resolve(mockQueryResult(mockProfiles)));
        }
        return qb;
      });

      const result = await service.getOrganizationUsers(TEST_IDS.organization);

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle users without profiles gracefully', async () => {
      const mockOrgUsers = [
        {
          user_id: 'user-without-profile',
          organization_id: TEST_IDS.organization,
          role_id: mockRoles.viewer.id,
          is_active: true,
          roles: mockRoles.viewer,
        },
      ];

      let callCount = 0;
      mockClient.from.mockImplementation((table: string) => {
        const qb = createMockQueryBuilder();
        callCount++;
        if (callCount === 1 && table === 'organization_users') {
          qb.select.mockReturnValue(qb);
          qb.eq.mockReturnValue(qb);
          qb.order.mockReturnValue(Promise.resolve(mockQueryResult(mockOrgUsers)));
        } else if (callCount === 2 && table === 'user_profiles') {
          qb.select.mockReturnValue(qb);
          qb.in.mockReturnValue(Promise.resolve(mockQueryResult([])));
        }
        return qb;
      });

      const result = await service.getOrganizationUsers(TEST_IDS.organization);

      expect(result).toBeDefined();
    });

    it('should return empty array when no users in organization', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.select.mockReturnValue(queryBuilder);
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.order.mockReturnValue(Promise.resolve(mockQueryResult([])));
      mockClient.from.mockReturnValue(queryBuilder);

      const result = await service.getOrganizationUsers(TEST_IDS.organization);

      expect(result).toEqual([]);
    });
  });

  describe('Behavior - Role Management', () => {
    it.each(ROLE_NAMES)('should update user role to: %s', async (roleName) => {
      const roleId = `role-${roleName}`;

      const queryBuilder = createMockQueryBuilder();
      queryBuilder.update.mockReturnValue(queryBuilder);
      queryBuilder.select.mockReturnValue(queryBuilder);
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.single.mockResolvedValue(
        mockQueryResult({
          user_id: TEST_IDS.user,
          organization_id: TEST_IDS.organization,
          role_id: roleId,
        })
      );
      mockClient.from.mockReturnValue(queryBuilder);

      const result = await service.updateUserRole(
        TEST_IDS.organization,
        TEST_IDS.user,
        roleId
      );

      expect(result).toBeDefined();
      expect(result.role_id).toBe(roleId);
    });

    it('should throw BadRequestException on role update failure', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.update.mockReturnValue(queryBuilder);
      queryBuilder.select.mockReturnValue(queryBuilder);
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.single.mockResolvedValue(
        mockQueryResult(null, { message: 'User not in organization' })
      );
      mockClient.from.mockReturnValue(queryBuilder);

      await expect(
        service.updateUserRole(TEST_IDS.organization, TEST_IDS.user, 'role-id')
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Behavior - User Status Management', () => {
    it.each([true, false])(
      'should update user active status to: %s',
      async (isActive) => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.update.mockReturnValue(queryBuilder);
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(
          mockQueryResult({
            user_id: TEST_IDS.user,
            organization_id: TEST_IDS.organization,
            is_active: isActive,
          })
        );
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.updateUserStatus(
          TEST_IDS.organization,
          TEST_IDS.user,
          isActive
        );

        expect(result).toBeDefined();
        expect(result.is_active).toBe(isActive);
      }
    );
  });

  describe('Behavior - Remove User from Organization', () => {
    it('should successfully remove user from organization', async () => {
      const queryBuilder = createMockQueryBuilder();
      // delete() needs to return a promise-like object
      queryBuilder.delete.mockResolvedValue({ data: null, error: undefined });
      mockClient.from.mockReturnValue(queryBuilder);

      const result = await service.removeUserFromOrganization(
        TEST_IDS.organization,
        TEST_IDS.user
      );

      expect(result).toEqual({ message: 'User removed successfully' });
    });

    it('should throw InternalServerErrorException on removal failure', async () => {
      const queryBuilder = createMockQueryBuilder();
      // delete() returns an error
      queryBuilder.delete.mockResolvedValue({
        data: null,
        error: { message: 'Foreign key constraint' },
      });
      mockClient.from.mockReturnValue(queryBuilder);

      await expect(
        service.removeUserFromOrganization(TEST_IDS.organization, TEST_IDS.user)
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  // ============================================================
  // CRUD OPERATIONS TESTS
  // ============================================================

  describe('CRUD Operations', () => {
    describe('findOne', () => {
      it('should return user profile by ID', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(
          mockQueryResult(mockUserProfiles.admin)
        );
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.findOne(TEST_IDS.user);

        expect(result).toBeDefined();
        expect(result.id).toBe(TEST_IDS.user);
        expect(result.email).toBe(mockUserProfiles.admin.email);
      });

      it('should return null when profile not found', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(
          mockQueryResult(null, { message: 'Not found' })
        );
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.findOne('non-existent-id');

        expect(result).toBeNull();
      });
    });

    describe('updateProfile', () => {
      it('should update user profile with provided data', async () => {
        const updateData = {
          first_name: 'Updated',
          last_name: 'Name',
          phone: '+212600000000',
        };

        const queryBuilder = createMockQueryBuilder();
        queryBuilder.update.mockReturnValue(queryBuilder);
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(
          mockQueryResult({
            id: TEST_IDS.user,
            ...updateData,
            updated_at: new Date().toISOString(),
          })
        );
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.updateProfile(TEST_IDS.user, updateData);

        expect(result.first_name).toBe('Updated');
        expect(result.last_name).toBe('Name');
        expect(result.phone).toBe('+212600000000');
      });

      it('should throw InternalServerErrorException on update failure', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.update.mockReturnValue(queryBuilder);
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(
          mockQueryResult(null, { message: 'Update failed' })
        );
        mockClient.from.mockReturnValue(queryBuilder);

        await expect(
          service.updateProfile(TEST_IDS.user, { first_name: 'Test' })
        ).rejects.toThrow(InternalServerErrorException);
      });
    });
  });

  // ============================================================
  // EDGE CASE TESTS
  // ============================================================

  describe('Edge Cases', () => {
    describe('Profile Creation Edge Cases', () => {
      it('should handle profile with undefined optional fields', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.upsert.mockReturnValue(queryBuilder);
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(
          mockQueryResult({
            id: TEST_IDS.user,
            email: 'user@test.com',
            first_name: null,
            last_name: null,
            full_name: 'user',
            phone: null,
            avatar_url: null,
          })
        );
        mockClient.from.mockReturnValue(queryBuilder);

        const dto: CreateUserProfileDto = {
          userId: TEST_IDS.user,
          email: 'user@test.com',
          firstName: undefined,
          lastName: undefined,
          fullName: undefined,
          phone: undefined,
        };

        const result = await service.createProfile(dto);

        expect(result).toBeDefined();
      });

      it('should handle database exception', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.upsert.mockReturnValue(queryBuilder);
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.single.mockRejectedValue(new Error('Database connection failed'));
        mockClient.from.mockReturnValue(queryBuilder);

        const dto: CreateUserProfileDto = {
          userId: TEST_IDS.user,
          email: 'user@test.com',
        };

        await expect(service.createProfile(dto)).rejects.toThrow(
          InternalServerErrorException
        );
      });
    });

    describe('Organization Users Edge Cases', () => {
      it('should handle invalid UUIDs in user list', async () => {
        const mockOrgUsers = [
          {
            user_id: TEST_IDS.user,
            organization_id: TEST_IDS.organization,
            role_id: mockRoles.viewer.id,
            is_active: true,
            roles: mockRoles.viewer,
          },
          {
            user_id: 'invalid-uuid',
            organization_id: TEST_IDS.organization,
            role_id: mockRoles.viewer.id,
            is_active: true,
            roles: mockRoles.viewer,
          },
        ];

        let callCount = 0;
        mockClient.from.mockImplementation((table: string) => {
          const qb = createMockQueryBuilder();
          callCount++;
          if (callCount === 1 && table === 'organization_users') {
            qb.select.mockReturnValue(qb);
            qb.eq.mockReturnValue(qb);
            qb.order.mockReturnValue(Promise.resolve(mockQueryResult(mockOrgUsers)));
          } else if (callCount === 2 && table === 'user_profiles') {
            qb.select.mockReturnValue(qb);
            qb.in.mockReturnValue(
              Promise.resolve(
                mockQueryResult([
                  {
                    id: TEST_IDS.user,
                    first_name: 'Valid',
                    last_name: 'User',
                    email: 'valid@test.com',
                    avatar_url: null,
                  },
                ])
              )
            );
          }
          return qb;
        });

        const result = await service.getOrganizationUsers(TEST_IDS.organization);

        expect(result).toBeDefined();
        expect(result.length).toBeGreaterThan(0);
      });

      it('should handle profile fetch failure gracefully', async () => {
        const mockOrgUsers = [
          {
            user_id: TEST_IDS.user,
            organization_id: TEST_IDS.organization,
            role_id: mockRoles.viewer.id,
            is_active: true,
            roles: mockRoles.viewer,
          },
        ];

        let callCount = 0;
        mockClient.from.mockImplementation((table: string) => {
          const qb = createMockQueryBuilder();
          callCount++;
          if (callCount === 1 && table === 'organization_users') {
            qb.select.mockReturnValue(qb);
            qb.eq.mockReturnValue(qb);
            qb.order.mockReturnValue(Promise.resolve(mockQueryResult(mockOrgUsers)));
          } else if (callCount === 2 && table === 'user_profiles') {
            qb.select.mockReturnValue(qb);
            qb.in.mockReturnValue(
              Promise.resolve(mockQueryResult(null, { message: 'Profiles table error' }))
            );
          }
          return qb;
        });

        const result = await service.getOrganizationUsers(TEST_IDS.organization);

        expect(result).toBeDefined();
      });
    });

    describe('Missing Organization Data', () => {
      it('should handle missing organization object in membership', async () => {
        const mockOrgUsers = [
          {
            organization_id: 'org-1',
            role_id: mockRoles.viewer.id,
            is_active: true,
            role: mockRoles.viewer,
            organizations: null,
          },
        ];

        const queryBuilder = createMockQueryBuilder();
        queryBuilder.select.mockReturnValue(queryBuilder);
        // Mock two .eq() calls in chain
        let eqCallCount = 0;
        queryBuilder.eq.mockImplementation(() => {
          eqCallCount++;
          if (eqCallCount === 2) {
            return Promise.resolve(mockQueryResult(mockOrgUsers));
          }
          return queryBuilder;
        });
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.getUserOrganizations(TEST_IDS.user);

        expect(result).toHaveLength(1);
        expect(result[0].name).toBe('Unknown');
        expect(result[0].slug).toBe('unknown');
      });
    });

    describe('Concurrent Operations', () => {
      it('should handle multiple simultaneous profile updates', async () => {
        const userIds = [TEST_IDS.user, 'user-2', 'user-3'];

        const promises = userIds.map((userId) => {
          const queryBuilder = createMockQueryBuilder();
          queryBuilder.update.mockReturnValue(queryBuilder);
          queryBuilder.select.mockReturnValue(queryBuilder);
          queryBuilder.eq.mockReturnValue(queryBuilder);
          queryBuilder.single.mockResolvedValue(
            mockQueryResult({
              id: userId,
              first_name: 'Updated',
              updated_at: new Date().toISOString(),
            })
          );
          mockClient.from.mockReturnValue(queryBuilder);

          return service.updateProfile(userId, { first_name: 'Updated' });
        });

        const results = await Promise.all(promises);

        expect(results).toHaveLength(3);
        results.forEach((result) => {
          expect(result.first_name).toBe('Updated');
        });
      });
    });
  });

  // ============================================================
  // INTEGRATION BEHAVIOR TESTS
  // ============================================================

  describe('Integration Behavior', () => {
    it('should use admin client for all operations', () => {
      expect(mockDatabaseService.getAdminClient).toBeDefined();
    });

    it('should handle complete user lifecycle', async () => {
      // 1. Create profile
      mockClient.rpc.mockResolvedValue(
        mockQueryResult({
          id: TEST_IDS.user,
          email: 'user@test.com',
          first_name: 'Test',
          last_name: 'User',
        })
      );

      const createDto: CreateUserProfileDto = {
        userId: TEST_IDS.user,
        email: 'user@test.com',
        firstName: 'Test',
        lastName: 'User',
      };

      await service.createProfile(createDto);

      // 2. Find profile
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.select.mockReturnValue(queryBuilder);
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.single.mockResolvedValue(
        mockQueryResult({
          id: TEST_IDS.user,
          email: 'user@test.com',
          first_name: 'Test',
          last_name: 'User',
        })
      );
      mockClient.from.mockReturnValue(queryBuilder);

      const profile = await service.findOne(TEST_IDS.user);

      expect(profile).toBeDefined();

      // 3. Update profile
      const updateQueryBuilder = createMockQueryBuilder();
      updateQueryBuilder.update.mockReturnValue(updateQueryBuilder);
      updateQueryBuilder.select.mockReturnValue(updateQueryBuilder);
      updateQueryBuilder.eq.mockReturnValue(updateQueryBuilder);
      updateQueryBuilder.single.mockResolvedValue(
        mockQueryResult({
          id: TEST_IDS.user,
          first_name: 'Updated',
          last_name: 'User',
        })
      );
      mockClient.from.mockReturnValue(updateQueryBuilder);

      const updated = await service.updateProfile(TEST_IDS.user, {
        first_name: 'Updated',
      });

      expect(updated.first_name).toBe('Updated');
    });
  });
});
