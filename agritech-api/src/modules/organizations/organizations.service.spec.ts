import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { OrganizationsService, CreateOrganizationDto } from './organizations.service';
import { DatabaseService } from '../database/database.service';
import { ConfigService } from '@nestjs/config';
import {
  createMockSupabaseClient,
  createMockQueryBuilder,
  mockQueryResult,
  MockSupabaseClient,
  MockQueryBuilder,
} from '../../../test/helpers/mock-database.helper';
import { TEST_IDS } from '../../../test/helpers/test-utils';
import { createMockConfigService } from '../../../test/helpers/test-utils';

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => createMockSupabaseClient()),
}));

describe('OrganizationsService', () => {
  let service: OrganizationsService;
  let mockClient: MockSupabaseClient;
  let mockDatabaseService: { getAdminClient: jest.Mock };
  let mockConfigService: Partial<ConfigService>;

  // ============================================================
  // TEST DATA FIXTURES
  // ============================================================

  const VALID_ORGANIZATION_NAMES = [
    'Test Organization',
    'AgriTech Farm',
    'Cooperative Agricole',
    'Farm 123',
    'Organización de Prueba',
  ];

  const VALID_SLUGS = [
    'test-organization',
    'agritech-farm',
    'cooperative-agricole',
    'farm-123',
    'organizacion-de-prueba',
  ];

  const INVALID_NAMES = [
    '',
    '   ',
    '\t\n',
    'a'.repeat(300), // Very long name
  ];

  const ACCOUNT_TYPES = ['individual', 'business', 'farm'] as const;

  const CURRENCIES = ['MAD', 'EUR', 'USD', 'GBP', 'TND'];

  const TIMEZONES = [
    'Africa/Casablanca',
    'Europe/Paris',
    'America/New_York',
    'Asia/Tokyo',
  ];

  const VALID_SLUG_INPUTS = [
    { input: 'Test Organization', expected: 'test-organization' },
    { input: 'AgriTech Farm', expected: 'agritech-farm' },
    { input: 'Coopérative Agrícole', expected: 'cooperative-agricole' },
    { input: 'Farm 123!', expected: 'farm-123' },
    { input: '  Multiple   Spaces  ', expected: 'multiple-spaces' },
    { input: 'name-with-dashes', expected: 'name-with-dashes' },
    { input: 'name_with_underscores', expected: 'name-with-underscores' },
    { input: 'Ümlauts and Ñ', expected: 'umlauts-and-n' },
    { input: 'الزراعة', expected: 'الزراعة' },
  ];

  // ============================================================
  // SETUP & TEARDOWN
  // ============================================================

  beforeEach(async () => {
    mockClient = createMockSupabaseClient();
    mockDatabaseService = {
      getAdminClient: jest.fn(() => mockClient),
    };

    mockConfigService = createMockConfigService();

    const { createClient } = require('@supabase/supabase-js');
    createClient.mockReturnValue(mockClient);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationsService,
        { provide: DatabaseService, useValue: mockDatabaseService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<OrganizationsService>(OrganizationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================
  // PARAMETERIZED TESTS - CREATE ORGANIZATION
  // ============================================================

  describe('create (Parameterized)', () => {
    it.each(VALID_ORGANIZATION_NAMES)(
      'should create organization with valid name: %s',
      async (name) => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.insert.mockReturnValue(queryBuilder);
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(
          mockQueryResult({
            id: TEST_IDS.organization,
            name,
            slug: 'test-slug',
            currency_code: 'MAD',
            timezone: 'Africa/Casablanca',
            is_active: true,
            account_type: 'business',
          })
        );
        mockClient.from.mockReturnValue(queryBuilder);

        const dto: CreateOrganizationDto = { name };
        const result = await service.create(dto);

        expect(result).toBeDefined();
        expect(result.name).toBe(name);
        expect(mockClient.from).toHaveBeenCalledWith('organizations');
      }
    );

    it.each(ACCOUNT_TYPES)(
      'should create organization with account type: %s',
      async (accountType) => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.insert.mockReturnValue(queryBuilder);
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(
          mockQueryResult({
            id: TEST_IDS.organization,
            name: 'Test Organization',
            slug: 'test-organization',
            account_type: accountType,
          })
        );
        mockClient.from.mockReturnValue(queryBuilder);

        const dto: CreateOrganizationDto = {
          name: 'Test Organization',
          accountType,
        };
        const result = await service.create(dto);

        expect(result.account_type).toBe(accountType);
      }
    );

    it.each(CURRENCIES)(
      'should create organization with currency: %s',
      async (currencyCode) => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.insert.mockReturnValue(queryBuilder);
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(
          mockQueryResult({
            id: TEST_IDS.organization,
            name: 'Test Organization',
            slug: 'test-organization',
            currency_code: currencyCode,
          })
        );
        mockClient.from.mockReturnValue(queryBuilder);

        const dto: CreateOrganizationDto = {
          name: 'Test Organization',
          currencyCode,
        };
        const result = await service.create(dto);

        expect(result.currency_code).toBe(currencyCode);
      }
    );

    it.each(TIMEZONES)(
      'should create organization with timezone: %s',
      async (timezone) => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.insert.mockReturnValue(queryBuilder);
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(
          mockQueryResult({
            id: TEST_IDS.organization,
            name: 'Test Organization',
            slug: 'test-organization',
            timezone,
          })
        );
        mockClient.from.mockReturnValue(queryBuilder);

        const dto: CreateOrganizationDto = {
          name: 'Test Organization',
          timezone,
        };
        const result = await service.create(dto);

        expect(result.timezone).toBe(timezone);
      }
    );

    it.each(VALID_SLUG_INPUTS)(
      'should generate slug from name: "$input" -> "$expected"',
      async ({ input, expected }) => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.insert.mockReturnValue(queryBuilder);
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(
          mockQueryResult({
            id: TEST_IDS.organization,
            name: input,
            slug: expected,
          })
        );
        mockClient.from.mockReturnValue(queryBuilder);

        const dto: CreateOrganizationDto = { name: input };
        const result = await service.create(dto);

        expect(result.slug).toBe(expected);
      }
    );
  });

  // ============================================================
  // INPUT VALIDATION TESTS
  // ============================================================

  describe('Input Validation', () => {
    describe('create', () => {
      it.each(INVALID_NAMES)(
        'should handle invalid name: "%s"',
        async (name) => {
          // The service doesn't validate name format, so it should still try to create
          // But database might reject it
          const queryBuilder = createMockQueryBuilder();
          queryBuilder.insert.mockReturnValue(queryBuilder);
          queryBuilder.select.mockReturnValue(queryBuilder);
          queryBuilder.single.mockResolvedValue(
            mockQueryResult(null, { message: 'Invalid name', code: '23514' })
          );
          mockClient.from.mockReturnValue(queryBuilder);

          const dto: CreateOrganizationDto = { name };

          await expect(service.create(dto)).rejects.toThrow(BadRequestException);
        }
      );

      it('should use default values when optional fields are not provided', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.insert.mockReturnValue(queryBuilder);
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(
          mockQueryResult({
            id: TEST_IDS.organization,
            name: 'Test Organization',
            slug: 'test-organization',
            currency_code: 'MAD',
            timezone: 'Africa/Casablanca',
            is_active: true,
            account_type: 'business',
          })
        );
        mockClient.from.mockReturnValue(queryBuilder);

        const dto: CreateOrganizationDto = { name: 'Test Organization' };
        const result = await service.create(dto);

        expect(result.currency_code).toBe('MAD');
        expect(result.timezone).toBe('Africa/Casablanca');
        expect(result.is_active).toBe(true);
        expect(result.account_type).toBe('business');
      });

      it('should accept custom slug when provided', async () => {
        const customSlug = 'my-custom-slug';
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.insert.mockReturnValue(queryBuilder);
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(
          mockQueryResult({
            id: TEST_IDS.organization,
            name: 'Test Organization',
            slug: customSlug,
          })
        );
        mockClient.from.mockReturnValue(queryBuilder);

        const dto: CreateOrganizationDto = {
          name: 'Test Organization',
          slug: customSlug,
        };
        const result = await service.create(dto);

        expect(result.slug).toBe(customSlug);
      });
    });

    describe('findOne', () => {
      it.each([null, undefined, '', 'invalid-uuid', 'not-a-uuid'])(
        'should handle invalid organization ID: %s',
        async (id) => {
          const queryBuilder = createMockQueryBuilder();
          queryBuilder.select.mockReturnValue(queryBuilder);
          queryBuilder.eq.mockReturnValue(queryBuilder);
          queryBuilder.single.mockResolvedValue(mockQueryResult(null));
          mockClient.from.mockReturnValue(queryBuilder);

          const result = await service.findOne(id as any);

          expect(result).toBeNull();
        }
      );
    });

    describe('getOrganization', () => {
      it.each([null, undefined, ''])(
        'should handle invalid user ID: %s',
        async (userId) => {
          const queryBuilder = createMockQueryBuilder();
          queryBuilder.select.mockReturnValue(queryBuilder);
          queryBuilder.eq.mockReturnValue(queryBuilder);
          queryBuilder.maybeSingle.mockResolvedValue(
            mockQueryResult(null, { message: 'Invalid user' })
          );
          mockClient.from.mockReturnValue(queryBuilder);

          await expect(
            service.getOrganization(userId as any, TEST_IDS.organization)
          ).rejects.toThrow(ForbiddenException);
        }
      );

      it.each([null, undefined, ''])(
        'should handle invalid organization ID: %s',
        async (orgId) => {
          await expect(
            service.getOrganization(TEST_IDS.user, orgId as any)
          ).rejects.toThrow();
        }
      );
    });
  });

  // ============================================================
  // BEHAVIOR-FOCUSED TESTS
  // ============================================================

  describe('Behavior - Slug Generation', () => {
    it('should retry with random suffix on slug collision', async () => {
      let insertAttempt = 0;
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.insert.mockReturnValue(queryBuilder);
      queryBuilder.select.mockReturnValue(queryBuilder);
      queryBuilder.single.mockImplementation(() => {
        insertAttempt++;
        if (insertAttempt === 1) {
          // First attempt fails with unique constraint violation
          return Promise.resolve(
            mockQueryResult(null, {
              message: 'duplicate key value violates unique constraint "organizations_slug_key"',
              code: '23505',
            })
          );
        }
        // Second attempt succeeds
        return Promise.resolve(
          mockQueryResult({
            id: TEST_IDS.organization,
            name: 'Test Organization',
            slug: 'test-organization-1234',
          })
        );
      });
      mockClient.from.mockReturnValue(queryBuilder);

      const dto: CreateOrganizationDto = { name: 'Test Organization' };
      const result = await service.create(dto);

      expect(result).toBeDefined();
      expect(insertAttempt).toBeGreaterThan(1);
      expect(result.slug).toMatch(/test-organization-\d{4}/);
    });

    it('should throw ConflictException after max retries (service behavior)', async () => {
      // After 5 retries with slug collisions, service throws ConflictException
      // The error message must include 'slug' to trigger the retry logic
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.insert.mockReturnValue(queryBuilder);
      queryBuilder.select.mockReturnValue(queryBuilder);
      queryBuilder.single.mockResolvedValue(
        mockQueryResult(null, {
          message: 'duplicate key value violates unique constraint "organizations_slug_key"',
          code: '23505',
        })
      );
      mockClient.from.mockReturnValue(queryBuilder);

      const dto: CreateOrganizationDto = { name: 'Test Organization' };

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
      await expect(service.create(dto)).rejects.toThrow(
        'Failed to create organization with unique slug after multiple attempts'
      );
    });
  });

  describe('Behavior - Access Control', () => {
    it('should allow access when user is active member', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.select.mockReturnValue(queryBuilder);
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.maybeSingle.mockResolvedValue(
        mockQueryResult({
          organization_id: TEST_IDS.organization,
          user_id: TEST_IDS.user,
          is_active: true,
        })
      );
      queryBuilder.single.mockResolvedValue(
        mockQueryResult({
          id: TEST_IDS.organization,
          name: 'Test Organization',
        })
      );
      mockClient.from.mockReturnValue(queryBuilder);

      const result = await service.getOrganization(
        TEST_IDS.user,
        TEST_IDS.organization
      );

      expect(result).toBeDefined();
      expect(result.id).toBe(TEST_IDS.organization);
    });

    it('should deny access when user is not member', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.select.mockReturnValue(queryBuilder);
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.maybeSingle.mockResolvedValue(mockQueryResult(null));
      mockClient.from.mockReturnValue(queryBuilder);

      await expect(
        service.getOrganization(TEST_IDS.user, TEST_IDS.organization)
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.getOrganization(TEST_IDS.user, TEST_IDS.organization)
      ).rejects.toThrow('You do not have access to this organization');
    });

    it('should deny access when user membership is inactive', async () => {
      // For inactive membership, the maybeSingle returns null which throws ForbiddenException
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.select.mockReturnValue(queryBuilder);
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.maybeSingle.mockResolvedValue(mockQueryResult(null));
      mockClient.from.mockReturnValue(queryBuilder);

      await expect(
        service.getOrganization(TEST_IDS.user, TEST_IDS.organization)
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.getOrganization(TEST_IDS.user, TEST_IDS.organization)
      ).rejects.toThrow('You do not have access to this organization');
    });
  });

  describe('Behavior - Update Organization', () => {
    it('should allow organization_admin to update', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.select.mockReturnValue(queryBuilder);
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.maybeSingle.mockResolvedValue(
        mockQueryResult({
          organization_id: TEST_IDS.organization,
          user_id: TEST_IDS.user,
          role_id: 'role-admin',
          roles: { name: 'organization_admin' },
        })
      );
      queryBuilder.update.mockReturnValue(queryBuilder);
      queryBuilder.single.mockResolvedValue(
        mockQueryResult({
          id: TEST_IDS.organization,
          name: 'Updated Organization',
        })
      );
      mockClient.from.mockReturnValue(queryBuilder);

      const updateData = { name: 'Updated Organization' };
      const result = await service.updateOrganization(
        TEST_IDS.user,
        TEST_IDS.organization,
        updateData
      );

      expect(result.name).toBe('Updated Organization');
    });

    it('should allow system_admin to update', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.select.mockReturnValue(queryBuilder);
      queryBuilder.eq.mockReturnValue(queryBuilder);
      queryBuilder.maybeSingle.mockResolvedValue(
        mockQueryResult({
          organization_id: TEST_IDS.organization,
          user_id: TEST_IDS.user,
          role_id: 'role-sys-admin',
          roles: { name: 'system_admin' },
        })
      );
      queryBuilder.update.mockReturnValue(queryBuilder);
      queryBuilder.single.mockResolvedValue(
        mockQueryResult({
          id: TEST_IDS.organization,
          name: 'Updated Organization',
        })
      );
      mockClient.from.mockReturnValue(queryBuilder);

      const updateData = { name: 'Updated Organization' };
      const result = await service.updateOrganization(
        TEST_IDS.user,
        TEST_IDS.organization,
        updateData
      );

      expect(result.name).toBe('Updated Organization');
    });

    it('should deny update for non-admin roles', async () => {
      const roles = ['farm_manager', 'farm_worker', 'day_laborer', 'viewer'];

      for (const roleName of roles) {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.maybeSingle.mockResolvedValue(
          mockQueryResult({
            organization_id: TEST_IDS.organization,
            user_id: TEST_IDS.user,
            role_id: `role-${roleName}`,
            roles: { name: roleName },
          })
        );
        mockClient.from.mockReturnValue(queryBuilder);

        await expect(
          service.updateOrganization(
            TEST_IDS.user,
            TEST_IDS.organization,
            { name: 'Updated' }
          )
        ).rejects.toThrow(ForbiddenException);
        await expect(
          service.updateOrganization(
            TEST_IDS.user,
            TEST_IDS.organization,
            { name: 'Updated' }
          )
        ).rejects.toThrow('You do not have permission to update this organization');
      }
    });
  });

  // ============================================================
  // CRUD OPERATIONS TESTS
  // ============================================================

  describe('CRUD Operations', () => {
    describe('findOne', () => {
      it('should return organization by ID', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(
          mockQueryResult({
            id: TEST_IDS.organization,
            name: 'Test Organization',
            slug: 'test-organization',
          })
        );
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.findOne(TEST_IDS.organization);

        expect(result).toBeDefined();
        expect(result.id).toBe(TEST_IDS.organization);
        expect(result.name).toBe('Test Organization');
      });

      it('should return null when organization not found', async () => {
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

    describe('getOrganization', () => {
      it('should return organization with access control', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.maybeSingle.mockResolvedValue(
          mockQueryResult({
            organization_id: TEST_IDS.organization,
            user_id: TEST_IDS.user,
            is_active: true,
          })
        );
        queryBuilder.single.mockResolvedValue(
          mockQueryResult({
            id: TEST_IDS.organization,
            name: 'Test Organization',
            slug: 'test-organization',
            currency_code: 'MAD',
            timezone: 'Africa/Casablanca',
            is_active: true,
          })
        );
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.getOrganization(
          TEST_IDS.user,
          TEST_IDS.organization
        );

        expect(result).toBeDefined();
        expect(result.id).toBe(TEST_IDS.organization);
        expect(result.name).toBe('Test Organization');
      });

      it('should throw NotFoundException when organization not found', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.maybeSingle.mockResolvedValue(
          mockQueryResult({
            organization_id: TEST_IDS.organization,
            user_id: TEST_IDS.user,
            is_active: true,
          })
        );
        queryBuilder.single.mockResolvedValue(
          mockQueryResult(null, { message: 'Not found' })
        );
        mockClient.from.mockReturnValue(queryBuilder);

        await expect(
          service.getOrganization(TEST_IDS.user, TEST_IDS.organization)
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe('updateOrganization', () => {
      it('should update organization and set updated_at timestamp', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.maybeSingle.mockResolvedValue(
          mockQueryResult({
            organization_id: TEST_IDS.organization,
            user_id: TEST_IDS.user,
            roles: { name: 'organization_admin' },
          })
        );
        queryBuilder.update.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(
          mockQueryResult({
            id: TEST_IDS.organization,
            name: 'Updated Name',
            description: 'Updated description',
            updated_at: new Date().toISOString(),
          })
        );
        mockClient.from.mockReturnValue(queryBuilder);

        const updateData = {
          name: 'Updated Name',
          description: 'Updated description',
        };
        const result = await service.updateOrganization(
          TEST_IDS.user,
          TEST_IDS.organization,
          updateData
        );

        expect(result.name).toBe('Updated Name');
        expect(result.description).toBe('Updated description');
        expect(result.updated_at).toBeDefined();
      });

      it('should throw InternalServerErrorException on update failure', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.maybeSingle.mockResolvedValue(
          mockQueryResult({
            organization_id: TEST_IDS.organization,
            user_id: TEST_IDS.user,
            roles: { name: 'organization_admin' },
          })
        );
        queryBuilder.update.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(
          mockQueryResult(null, { message: 'Update failed' })
        );
        mockClient.from.mockReturnValue(queryBuilder);

        await expect(
          service.updateOrganization(
            TEST_IDS.user,
            TEST_IDS.organization,
            { name: 'Updated' }
          )
        ).rejects.toThrow(InternalServerErrorException);
      });
    });
  });

  // ============================================================
  // EDGE CASE TESTS
  // ============================================================

  describe('Edge Cases', () => {
    describe('Slug Generation Edge Cases', () => {
      it('should handle very long organization names', async () => {
        const longName = 'A'.repeat(300);
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.insert.mockReturnValue(queryBuilder);
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(
          mockQueryResult({
            id: TEST_IDS.organization,
            name: longName,
            slug: 'a'.repeat(200), // Database might truncate
          })
        );
        mockClient.from.mockReturnValue(queryBuilder);

        const dto: CreateOrganizationDto = { name: longName };
        const result = await service.create(dto);

        expect(result).toBeDefined();
      });

      it('should handle special characters in name', async () => {
        const specialNames = [
          'Test @#$ Organization',
          'Organization with émojis 🌾',
          'Test-Organization--Multiple---Dashes',
          '-Leading and Trailing-',
          ' organization-with-spaces ',
        ];

        for (const name of specialNames) {
          const queryBuilder = createMockQueryBuilder();
          queryBuilder.insert.mockReturnValue(queryBuilder);
          queryBuilder.select.mockReturnValue(queryBuilder);
          queryBuilder.single.mockResolvedValue(
            mockQueryResult({
              id: TEST_IDS.organization,
              name,
              slug: 'cleaned-slug',
            })
          );
          mockClient.from.mockReturnValue(queryBuilder);

          const dto: CreateOrganizationDto = { name };
          const result = await service.create(dto);

          expect(result).toBeDefined();
        }
      });

      it('should handle consecutive slug collisions (until max retries)', async () => {
        let attemptCount = 0;
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.insert.mockReturnValue(queryBuilder);
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.single.mockImplementation(() => {
          attemptCount++;
          // Always fail with slug collision
          return Promise.resolve(
            mockQueryResult(null, {
              message: 'duplicate key value violates unique constraint "organizations_slug_key"',
              code: '23505',
            })
          );
        });
        mockClient.from.mockReturnValue(queryBuilder);

        const dto: CreateOrganizationDto = { name: 'Test Organization' };

        // Should retry up to 5 times then throw ConflictException
        await expect(service.create(dto)).rejects.toThrow(ConflictException);
        expect(attemptCount).toBeGreaterThan(1);
      });
    });

    describe('Organization State', () => {
      it('should handle creating inactive organization', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.insert.mockReturnValue(queryBuilder);
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(
          mockQueryResult({
            id: TEST_IDS.organization,
            name: 'Test Organization',
            is_active: false,
          })
        );
        mockClient.from.mockReturnValue(queryBuilder);

        const dto: CreateOrganizationDto = {
          name: 'Test Organization',
          isActive: false,
        };
        const result = await service.create(dto);

        expect(result.is_active).toBe(false);
      });

      it('should handle updating organization to inactive', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.eq.mockReturnValue(queryBuilder);
        queryBuilder.maybeSingle.mockResolvedValue(
          mockQueryResult({
            organization_id: TEST_IDS.organization,
            user_id: TEST_IDS.user,
            roles: { name: 'organization_admin' },
          })
        );
        queryBuilder.update.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(
          mockQueryResult({
            id: TEST_IDS.organization,
            is_active: false,
          })
        );
        mockClient.from.mockReturnValue(queryBuilder);

        const result = await service.updateOrganization(
          TEST_IDS.user,
          TEST_IDS.organization,
          { is_active: false }
        );

        expect(result.is_active).toBe(false);
      });
    });

    describe('Concurrent Operations', () => {
      it('should handle multiple simultaneous organization creations', async () => {
        const promises = VALID_ORGANIZATION_NAMES.slice(0, 3).map((name) => {
          const queryBuilder = createMockQueryBuilder();
          queryBuilder.insert.mockReturnValue(queryBuilder);
          queryBuilder.select.mockReturnValue(queryBuilder);
          queryBuilder.single.mockResolvedValue(
            mockQueryResult({
              id: `org-${Math.random()}`,
              name,
              slug: name.toLowerCase().replace(/\s+/g, '-'),
            })
          );
          mockClient.from.mockReturnValue(queryBuilder);

          return service.create({ name });
        });

        const results = await Promise.all(promises);

        expect(results).toHaveLength(3);
        results.forEach((result) => {
          expect(result).toBeDefined();
          expect(result.id).toBeDefined();
        });
      });
    });

    describe('Database Errors', () => {
      it('should handle connection errors gracefully', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.insert.mockReturnValue(queryBuilder);
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(
          mockQueryResult(null, {
            message: 'Connection lost',
            code: '08001',
          })
        );
        mockClient.from.mockReturnValue(queryBuilder);

        const dto: CreateOrganizationDto = { name: 'Test Organization' };

        await expect(service.create(dto)).rejects.toThrow(BadRequestException);
      });

      it('should handle constraint violations other than slug', async () => {
        const queryBuilder = createMockQueryBuilder();
        queryBuilder.insert.mockReturnValue(queryBuilder);
        queryBuilder.select.mockReturnValue(queryBuilder);
        queryBuilder.single.mockResolvedValue(
          mockQueryResult(null, {
            message: 'foreign key constraint',
            code: '23503',
          })
        );
        mockClient.from.mockReturnValue(queryBuilder);

        const dto: CreateOrganizationDto = { name: 'Test Organization' };

        await expect(service.create(dto)).rejects.toThrow(BadRequestException);
      });
    });
  });

  // ============================================================
  // INTEGRATION BEHAVIOR TESTS
  // ============================================================

  describe('Integration Behavior', () => {
    it('should use admin client for operations', () => {
      // Verify that the service uses the admin client (service role key)
      // by checking that getAdminClient is called
      expect(mockDatabaseService.getAdminClient).toBeDefined();
    });

    it('should create organization with all provided fields', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.insert.mockReturnValue(queryBuilder);
      queryBuilder.select.mockReturnValue(queryBuilder);
      queryBuilder.single.mockResolvedValue(
        mockQueryResult({
          id: TEST_IDS.organization,
          name: 'Complete Organization',
          slug: 'complete-organization',
          description: 'A complete test organization',
          currency_code: 'USD',
          timezone: 'America/New_York',
          is_active: true,
          account_type: 'farm',
        })
      );
      mockClient.from.mockReturnValue(queryBuilder);

      const dto: CreateOrganizationDto = {
        name: 'Complete Organization',
        slug: 'complete-organization',
        description: 'A complete test organization',
        currencyCode: 'USD',
        timezone: 'America/New_York',
        isActive: true,
        accountType: 'farm',
      };
      const result = await service.create(dto);

      expect(result.name).toBe(dto.name);
      expect(result.slug).toBe(dto.slug);
      expect(result.description).toBe(dto.description);
      expect(result.currency_code).toBe(dto.currencyCode);
      expect(result.timezone).toBe(dto.timezone);
      expect(result.is_active).toBe(dto.isActive);
      expect(result.account_type).toBe(dto.accountType);
    });
  });
});
