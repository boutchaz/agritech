import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { DatabaseService } from '../database/database.service';
import { UsersService } from '../users/users.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { DemoDataService } from '../demo-data/demo-data.service';
import { AdoptionService } from '../adoption/adoption.service';
import { CaslAbilityFactory } from '../casl/casl-ability.factory';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import {
  createMockSupabaseClient,
  createMockQueryBuilder,
  mockQueryResult,
  MockSupabaseClient,
} from '../../../test/helpers/mock-database.helper';
import { TEST_IDS } from '../../../test/helpers/test-utils';
import {
  mockUserProfiles,
  mockOrganizations,
  mockOrganizationUsers,
  mockRoles,
  mockAuthUser,
  createSignupDto,
} from '../../../test/fixtures/organization.fixture';

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => createMockSupabaseClient()),
}));

describe('AuthService', () => {
  let service: AuthService;
  let mockClient: MockSupabaseClient;
  let mockDatabaseService: { getAdminClient: jest.Mock; getClient: jest.Mock };
  let mockUsersService: { createProfile: jest.Mock };
  let mockOrganizationsService: { create: jest.Mock };
  let mockDemoDataService: { seedDemoData: jest.Mock };
  let mockAdoptionService: { recordMilestone: jest.Mock };
  let mockCaslAbilityFactory: { getAbilitiesForUser: jest.Mock };
  let mockSubscriptionsService: { createTrialSubscription: jest.Mock };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        SUPABASE_URL: 'https://test.supabase.co',
        SUPABASE_ANON_KEY: 'test-anon-key',
        SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
        JWT_SECRET: 'test-jwt-secret',
        FRONTEND_URL: 'https://agritech-dashboard.thebzlab.online',
        CORS_ORIGIN: 'https://agritech-dashboard.thebzlab.online,http://localhost:5173',
        NODE_ENV: 'test',
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    mockClient = createMockSupabaseClient();
    mockDatabaseService = {
      getAdminClient: jest.fn(() => mockClient),
      getClient: jest.fn(() => mockClient),
    };
    mockUsersService = {
      createProfile: jest.fn().mockResolvedValue(mockUserProfiles.admin),
    };
    mockOrganizationsService = {
      create: jest.fn().mockResolvedValue(mockOrganizations.default),
    };
    mockDemoDataService = {
      seedDemoData: jest.fn().mockResolvedValue(undefined),
    };
    mockAdoptionService = {
      recordMilestone: jest.fn().mockResolvedValue(undefined),
    };
    mockCaslAbilityFactory = {
      getAbilitiesForUser: jest.fn().mockResolvedValue([]),
    };
    mockSubscriptionsService = {
      createTrialSubscription: jest.fn().mockResolvedValue(undefined),
    };

    const { createClient } = require('@supabase/supabase-js');
    createClient.mockReturnValue(mockClient);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: DatabaseService, useValue: mockDatabaseService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: UsersService, useValue: mockUsersService },
        { provide: OrganizationsService, useValue: mockOrganizationsService },
        { provide: DemoDataService, useValue: mockDemoDataService },
        { provide: AdoptionService, useValue: mockAdoptionService },
        { provide: CaslAbilityFactory, useValue: mockCaslAbilityFactory },
        { provide: SubscriptionsService, useValue: mockSubscriptionsService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should return tokens on successful login', async () => {
      const mockSession = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expires_in: 3600,
      };
      const testEmail = 'test@example.com';
      const mockUser = mockAuthUser({ email: testEmail });

      mockClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      const result = await service.login(testEmail, 'password123');

      expect(result.access_token).toBe('test-access-token');
      expect(result.refresh_token).toBe('test-refresh-token');
      expect(result.user.email).toBe(testEmail);
    });

    it('should throw UnauthorizedException on invalid credentials', async () => {
      mockClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid credentials' },
      });

      await expect(
        service.login('test@example.com', 'wrongpassword'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('redirect validation', () => {
    it('should allow OAuth redirects on configured origins', async () => {
      const result = await service.getOAuthUrl(
        'google',
        'https://agritech-dashboard.thebzlab.online/auth/callback',
      );

      expect(result.url).toContain(
        encodeURIComponent('https://agritech-dashboard.thebzlab.online/auth/callback'),
      );
    });

    it('should reject OAuth redirects outside the allowlist', async () => {
      await expect(
        service.getOAuthUrl('google', 'https://evil.example.com/auth/callback'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject password reset redirects outside the allowlist', async () => {
      await expect(
        service.forgotPassword('user@example.com', 'https://evil.example.com/reset'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('exchange code', () => {
    it('should generate and redeem a stateless exchange code', async () => {
      const mockUser = mockAuthUser({ email: 'exchange@example.com' });

      mockClient.auth.admin.getUserById.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });
      mockClient.auth.admin.generateLink.mockResolvedValue({
        data: { properties: { hashed_token: 'hashed-token-123' } },
        error: null,
      });
      mockClient.auth.verifyOtp.mockResolvedValue({
        data: {
          session: {
            access_token: 'access-token',
            refresh_token: 'refresh-token',
            expires_in: 3600,
          },
        },
        error: null,
      });

      const generated = await service.generateExchangeCode(TEST_IDS.user);
      const redeemed = await service.redeemExchangeCode(generated.code);

      expect(generated.expiresIn).toBe(30);
      expect(mockClient.auth.verifyOtp).toHaveBeenCalledWith({
        token_hash: 'hashed-token-123',
        type: 'magiclink',
      });
      expect(redeemed.access_token).toBe('access-token');
      expect(redeemed.refresh_token).toBe('refresh-token');
    });
  });

  describe('validateToken', () => {
    it('should return user on valid token', async () => {
      const mockUser = mockAuthUser();

      mockClient.auth.setSession.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const result = await service.validateToken('valid-token');

      expect(result.id).toBe(TEST_IDS.user);
    });

    it('should fallback to admin client when setSession fails', async () => {
      const mockUser = mockAuthUser();

      mockClient.auth.setSession.mockResolvedValue({
        data: { user: null },
        error: { message: 'Session error' },
      });

      mockClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const result = await service.validateToken('valid-token');

      expect(result.id).toBe(TEST_IDS.user);
    });

    it('should throw UnauthorizedException on invalid token', async () => {
      mockClient.auth.setSession.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid token' },
      });

      mockClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid token' },
      });

      await expect(service.validateToken('invalid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('getUserProfile', () => {
    it('should return user profile with organization info', async () => {
      const profile = {
        ...mockUserProfiles.admin,
        organization_users: [mockOrganizationUsers.adminMembership],
      };

      const queryBuilder = createMockQueryBuilder();
      queryBuilder.single.mockResolvedValue(mockQueryResult(profile));
      mockClient.from.mockReturnValue(queryBuilder);

      const result = await service.getUserProfile(TEST_IDS.user);

      expect(result.id).toBe(TEST_IDS.user);
      expect(result.organization_users).toBeDefined();
    });

    it('should fallback to auth user when profile not found', async () => {
      const authUser = mockAuthUser();

      const queryBuilder = createMockQueryBuilder();
      queryBuilder.single.mockResolvedValue(
        mockQueryResult(null, { message: 'Not found' }),
      );
      mockClient.from.mockReturnValue(queryBuilder);

      mockClient.auth.admin.getUserById.mockResolvedValue({
        data: { user: authUser },
        error: null,
      });

      const result = await service.getUserProfile(TEST_IDS.user);

      expect(result.id).toBe(TEST_IDS.user);
      expect(result.email).toBe(authUser.email);
    });
  });

  describe('hasRequiredRole', () => {
    it('should return true when user has sufficient role level', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.single.mockResolvedValue(
        mockQueryResult({
          role_id: mockRoles.farmManager.id,
          roles: { level: 3 },
        }),
      );
      mockClient.from.mockReturnValue(queryBuilder);

      const result = await service.hasRequiredRole(
        TEST_IDS.user,
        TEST_IDS.organization,
        4,
      );

      expect(result).toBe(true);
    });

    it('should return false when user has insufficient role level', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.single.mockResolvedValue(
        mockQueryResult({
          role_id: mockRoles.viewer.id,
          roles: { level: 6 },
        }),
      );
      mockClient.from.mockReturnValue(queryBuilder);

      const result = await service.hasRequiredRole(
        TEST_IDS.user,
        TEST_IDS.organization,
        3,
      );

      expect(result).toBe(false);
    });

    it('should return false when user not in organization', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.single.mockResolvedValue(
        mockQueryResult(null, { message: 'Not found' }),
      );
      mockClient.from.mockReturnValue(queryBuilder);

      const result = await service.hasRequiredRole(
        TEST_IDS.user,
        'other-org-id',
        3,
      );

      expect(result).toBe(false);
    });
  });

  describe('getUserOrganizations', () => {
    it('should return list of user organizations', async () => {
      const orgs = [
        {
          organization_id: TEST_IDS.organization,
          role_id: mockRoles.organizationAdmin.id,
          is_active: true,
          organizations: mockOrganizations.default,
          roles: mockRoles.organizationAdmin,
        },
      ];

      const queryBuilder = createMockQueryBuilder();
      let eqCallCount = 0;
      queryBuilder.eq.mockImplementation(() => {
        eqCallCount++;
        if (eqCallCount >= 2) {
          return Promise.resolve(mockQueryResult(orgs));
        }
        return queryBuilder;
      });
      mockClient.from.mockReturnValue(queryBuilder);

      const result = await service.getUserOrganizations(TEST_IDS.user);

      expect(result).toEqual(orgs);
    });

    it('should return empty array when user has no organizations', async () => {
      const queryBuilder = createMockQueryBuilder();
      let eqCallCount = 0;
      queryBuilder.eq.mockImplementation(() => {
        eqCallCount++;
        if (eqCallCount >= 2) {
          return Promise.resolve(mockQueryResult([]));
        }
        return queryBuilder;
      });
      mockClient.from.mockReturnValue(queryBuilder);

      const result = await service.getUserOrganizations('new-user-id');

      expect(result).toEqual([]);
    });
  });

  describe('signup', () => {
    it('should create user, profile, and organization', async () => {
      const dto = createSignupDto();
      const createdUser = mockAuthUser({ email: dto.email });

      mockClient.auth.admin.createUser.mockResolvedValue({
        data: { user: createdUser },
        error: null,
      });

      mockClient.from.mockImplementation((table: string) => {
        const qb = createMockQueryBuilder();
        if (table === 'roles') {
          qb.single.mockResolvedValue(
            mockQueryResult({ id: mockRoles.organizationAdmin.id }),
          );
        } else if (table === 'organization_users') {
          qb.single.mockResolvedValue(mockQueryResult({ id: 'org-user-id' }));
        }
        return qb;
      });

      const result = await service.signup(dto);

      expect(result.user.email).toBe(dto.email);
      expect(result.organization).toBeDefined();
      expect(mockUsersService.createProfile).toHaveBeenCalled();
      expect(mockOrganizationsService.create).toHaveBeenCalled();
    });

    it('should handle invited user signup', async () => {
      const dto = createSignupDto({
        invitedToOrganization: TEST_IDS.organization,
        invitedWithRole: mockRoles.farmManager.id,
      });
      const createdUser = mockAuthUser({ email: dto.email });

      mockClient.auth.admin.createUser.mockResolvedValue({
        data: { user: createdUser },
        error: null,
      });

      mockClient.from.mockImplementation((table: string) => {
        const qb = createMockQueryBuilder();
        if (table === 'organizations') {
          qb.single.mockResolvedValue(mockQueryResult(mockOrganizations.default));
        } else if (table === 'organization_users') {
          qb.single.mockResolvedValue(mockQueryResult({ id: 'org-user-id' }));
        }
        return qb;
      });

      const result = await service.signup(dto);

      expect(result.organization.id).toBe(TEST_IDS.organization);
      expect(mockOrganizationsService.create).not.toHaveBeenCalled();
    });

    it('should rollback on failure', async () => {
      const dto = createSignupDto();
      const createdUser = mockAuthUser({ email: dto.email });

      mockClient.auth.admin.createUser.mockResolvedValue({
        data: { user: createdUser },
        error: null,
      });

      mockUsersService.createProfile.mockRejectedValue(
        new Error('Profile creation failed'),
      );

      mockClient.auth.admin.deleteUser.mockResolvedValue({ error: null });

      await expect(service.signup(dto)).rejects.toThrow();
      expect(mockClient.auth.admin.deleteUser).toHaveBeenCalledWith(
        createdUser.id,
      );
    });

    it('should seed demo data when requested', async () => {
      const dto = createSignupDto({ includeDemoData: true });
      const createdUser = mockAuthUser({ email: dto.email });

      mockClient.auth.admin.createUser.mockResolvedValue({
        data: { user: createdUser },
        error: null,
      });

      mockClient.from.mockImplementation((table: string) => {
        const qb = createMockQueryBuilder();
        if (table === 'roles') {
          qb.single.mockResolvedValue(
            mockQueryResult({ id: mockRoles.organizationAdmin.id }),
          );
        } else if (table === 'organization_users') {
          qb.single.mockResolvedValue(mockQueryResult({ id: 'org-user-id' }));
        }
        return qb;
      });

      await service.signup(dto);

      expect(mockDemoDataService.seedDemoData).toHaveBeenCalled();
    });

    it('should throw BadRequestException when user creation fails', async () => {
      const dto = createSignupDto();

      mockClient.auth.admin.createUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Email already exists' },
      });

      await expect(service.signup(dto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('getUserRoleAndPermissions', () => {
    it('should return role and permissions', async () => {
      mockClient.from.mockImplementation((table: string) => {
        const qb = createMockQueryBuilder();
        if (table === 'organization_users') {
          qb.maybeSingle.mockResolvedValue(
            mockQueryResult({
              role_id: mockRoles.organizationAdmin.id,
              roles: mockRoles.organizationAdmin,
            }),
          );
        } else if (table === 'role_permissions') {
          qb.eq.mockResolvedValue(
            mockQueryResult([
              {
                permissions: {
                  name: 'manage_users',
                  display_name: 'Manage Users',
                  resource: 'users',
                  action: 'manage',
                },
              },
            ]),
          );
        }
        return qb;
      });

      const result = await service.getUserRoleAndPermissions(
        TEST_IDS.user,
        TEST_IDS.organization,
      );

      expect(result.role.role_name).toBe('organization_admin');
      expect(result.permissions).toBeDefined();
    });

    it('should return empty when user not in organization', async () => {
      mockClient.from.mockImplementation((table: string) => {
        const qb = createMockQueryBuilder();
        if (table === 'organization_users') {
          qb.maybeSingle.mockResolvedValue(mockQueryResult(null));
        }
        return qb;
      });

      const result = await service.getUserRoleAndPermissions(
        TEST_IDS.user,
        'other-org-id',
      );

      expect(result.role).toBeNull();
      expect(result.permissions).toEqual([]);
    });
  });
});
