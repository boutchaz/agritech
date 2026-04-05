import { Test, TestingModule } from '@nestjs/testing';
import {
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SubscriptionsService } from './subscriptions.service';
import { TrialPlanInput } from './dto/create-trial-subscription.dto';
import { SubscriptionPricingService } from './subscription-pricing.service';
import {
  createMockSupabaseClient,
  createMockQueryBuilder,
  mockQueryResult,
  MockSupabaseClient,
} from '../../../test/helpers/mock-database.helper';
import { TEST_IDS } from '../../../test/helpers/test-utils';
import {
  mockOrganizations,
  mockOrganizationUsers,
  mockSubscriptions,
} from '../../../test/fixtures/organization.fixture';

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => createMockSupabaseClient()),
}));

describe('SubscriptionsService', () => {
  let service: SubscriptionsService;
  let mockClient: MockSupabaseClient;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        SUPABASE_URL: 'https://test.supabase.co',
        SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    mockClient = createMockSupabaseClient();
    const { createClient } = require('@supabase/supabase-js');
    createClient.mockReturnValue(mockClient);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionsService,
        SubscriptionPricingService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<SubscriptionsService>(SubscriptionsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createTrialSubscription', () => {
    it('should create a trial subscription for user in organization', async () => {
      const dto = {
        organization_id: TEST_IDS.organization,
        plan_type: TrialPlanInput.PROFESSIONAL,
      };

      mockClient.from.mockImplementation((table: string) => {
        const qb = createMockQueryBuilder();
        if (table === 'organization_users') {
          qb.single.mockResolvedValue(
            mockQueryResult(mockOrganizationUsers.adminMembership),
          );
        } else if (table === 'subscriptions') {
          qb.maybeSingle.mockResolvedValue(mockQueryResult(null));
          qb.single.mockResolvedValue(
            mockQueryResult({
              id: 'new-sub-id',
              organization_id: dto.organization_id,
              plan_id: 'standard-trial',
              status: 'trialing',
            }),
          );
        }
        return qb;
      });

      const result = await service.createTrialSubscription(TEST_IDS.user, dto);

      expect(result.success).toBe(true);
      expect(result.subscription.status).toBe('trialing');
    });

    it('should reject if user does not belong to organization', async () => {
      const dto = {
        organization_id: 'other-org-id',
        plan_type: TrialPlanInput.PROFESSIONAL,
      };

      mockClient.from.mockImplementation((table: string) => {
        const qb = createMockQueryBuilder();
        if (table === 'organization_users') {
          qb.single.mockResolvedValue(
            mockQueryResult(null, { message: 'Not found' }),
          );
        }
        return qb;
      });

      await expect(
        service.createTrialSubscription(TEST_IDS.user, dto),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should return existing subscription idempotently when already active or trialing', async () => {
      const dto = {
        organization_id: TEST_IDS.organization,
        plan_type: TrialPlanInput.PROFESSIONAL,
      };

      const existingRow = {
        id: 'existing-sub',
        organization_id: TEST_IDS.organization,
        status: 'active',
        formula: 'professional',
      };

      mockClient.from.mockImplementation((table: string) => {
        const qb = createMockQueryBuilder();
        if (table === 'organization_users') {
          qb.single.mockResolvedValue(
            mockQueryResult(mockOrganizationUsers.adminMembership),
          );
        } else if (table === 'subscriptions') {
          qb.maybeSingle.mockResolvedValue(mockQueryResult(existingRow));
        }
        return qb;
      });

      const result = await service.createTrialSubscription(TEST_IDS.user, dto);

      expect(result.success).toBe(true);
      expect(result.subscription).toEqual(existingRow);
    });

    it('should update existing inactive subscription', async () => {
      const dto = {
        organization_id: TEST_IDS.organization,
        plan_type: TrialPlanInput.STARTER,
      };

      const existingCancelledSub = { id: 'cancelled-sub', status: 'canceled' };

      mockClient.from.mockImplementation((table: string) => {
        const qb = createMockQueryBuilder();
        if (table === 'organization_users') {
          qb.single.mockResolvedValue(
            mockQueryResult(mockOrganizationUsers.adminMembership),
          );
        } else if (table === 'subscriptions') {
          qb.maybeSingle.mockResolvedValue(mockQueryResult(existingCancelledSub));
          qb.single.mockResolvedValue(
            mockQueryResult({
              ...existingCancelledSub,
              status: 'trialing',
              plan_id: 'starter-trial',
            }),
          );
        }
        return qb;
      });

      const result = await service.createTrialSubscription(TEST_IDS.user, dto);

      expect(result.success).toBe(true);
      expect(result.subscription.status).toBe('trialing');
    });
  });

  describe('hasValidSubscription', () => {
    it('should return true for active subscription', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.maybeSingle.mockResolvedValue(
        mockQueryResult({
          status: 'active',
          current_period_end: new Date(Date.now() + 86400000).toISOString(),
        }),
      );
      mockClient.from.mockReturnValue(queryBuilder);

      const result = await service.hasValidSubscription(TEST_IDS.organization);

      expect(result).toBe(true);
    });

    it('should return true for trialing subscription', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.maybeSingle.mockResolvedValue(
        mockQueryResult({
          status: 'trialing',
          current_period_end: new Date(Date.now() + 14 * 86400000).toISOString(),
        }),
      );
      mockClient.from.mockReturnValue(queryBuilder);

      const result = await service.hasValidSubscription(TEST_IDS.organization);

      expect(result).toBe(true);
    });

    it('should return false for expired subscription', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.maybeSingle.mockResolvedValue(
        mockQueryResult({
          status: 'active',
          current_period_end: new Date(Date.now() - 5 * 86400000).toISOString(),
        }),
      );
      mockClient.from.mockReturnValue(queryBuilder);

      const result = await service.hasValidSubscription(TEST_IDS.organization);

      expect(result).toBe(false);
    });

    it('should return false for canceled subscription', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.maybeSingle.mockResolvedValue(
        mockQueryResult({
          status: 'canceled',
          current_period_end: new Date(Date.now() + 86400000).toISOString(),
        }),
      );
      mockClient.from.mockReturnValue(queryBuilder);

      const result = await service.hasValidSubscription(TEST_IDS.organization);

      expect(result).toBe(false);
    });

    it('should return false for past_due subscription', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.maybeSingle.mockResolvedValue(
        mockQueryResult({
          status: 'past_due',
          current_period_end: new Date(Date.now() + 86400000).toISOString(),
        }),
      );
      mockClient.from.mockReturnValue(queryBuilder);

      const result = await service.hasValidSubscription(TEST_IDS.organization);

      expect(result).toBe(false);
    });

    it('should return false when no subscription exists', async () => {
      const queryBuilder = createMockQueryBuilder();
      queryBuilder.maybeSingle.mockResolvedValue(mockQueryResult(null));
      mockClient.from.mockReturnValue(queryBuilder);

      const result = await service.hasValidSubscription(TEST_IDS.organization);

      expect(result).toBe(false);
    });
  });

  describe('checkSubscription', () => {
    it('should return subscription status with usage', async () => {
      const dto = { organizationId: TEST_IDS.organization };

      mockClient.from.mockImplementation((table: string) => {
        const qb = createMockQueryBuilder();
        if (table === 'organization_users') {
          qb.single.mockResolvedValue(
            mockQueryResult(mockOrganizationUsers.adminMembership),
          );
          qb.maybeSingle.mockResolvedValue(
            mockQueryResult(mockOrganizationUsers.adminMembership),
          );
        } else if (table === 'subscriptions') {
          qb.maybeSingle.mockResolvedValue(
            mockQueryResult({
              ...mockSubscriptions.basic,
              status: 'active',
              current_period_end: new Date(Date.now() + 86400000).toISOString(),
            }),
          );
        } else if (table === 'farms') {
          qb.eq.mockResolvedValue({ count: 2, error: null });
        } else if (table === 'parcels') {
          qb.eq.mockResolvedValue({
            count: 10,
            data: [{ area: 12 }, { area: 8 }],
            error: null,
          });
        }
        return qb;
      });

      mockClient.rpc.mockResolvedValue(mockQueryResult(true));

      const result = await service.checkSubscription(TEST_IDS.user, dto);

      expect(result.isValid).toBe(true);
      expect(result.subscription).toBeDefined();
    });

    it('should reject if user does not have access', async () => {
      const dto = { organizationId: 'other-org-id' };

      mockClient.from.mockImplementation((table: string) => {
        const qb = createMockQueryBuilder();
        if (table === 'organization_users') {
          qb.single.mockResolvedValue(
            mockQueryResult(null, { message: 'Not found' }),
          );
        }
        return qb;
      });

      await expect(
        service.checkSubscription(TEST_IDS.user, dto),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should check specific feature access', async () => {
      const dto = { organizationId: TEST_IDS.organization, feature: 'analytics' };

      mockClient.from.mockImplementation((table: string) => {
        const qb = createMockQueryBuilder();
        if (table === 'organization_users') {
          qb.single.mockResolvedValue(
            mockQueryResult(mockOrganizationUsers.adminMembership),
          );
          qb.maybeSingle.mockResolvedValue(
            mockQueryResult(mockOrganizationUsers.adminMembership),
          );
        } else if (table === 'subscriptions') {
          qb.maybeSingle.mockResolvedValue(
            mockQueryResult({
              status: 'active',
              plan_type: 'essential',
              current_period_end: new Date(Date.now() + 86400000).toISOString(),
            }),
          );
        } else if (table === 'modules') {
          qb.or.mockReturnValue(qb);
          qb.maybeSingle.mockResolvedValue(
            mockQueryResult({
              id: 'module-1',
              required_plan: 'essential',
              is_active: true,
              is_available: true,
              is_required: false,
            }),
          );
        } else if (table === 'organization_modules') {
          qb.eq.mockReturnValue(qb);
          qb.maybeSingle.mockResolvedValue(
            mockQueryResult({ is_active: true }),
          );
        }
        return qb;
      });

      const result = await service.checkSubscription(TEST_IDS.user, dto);

      expect(result.hasFeature).toBe(true);
    });
  });

  describe('getSubscription', () => {
    it('should return subscription for valid user', async () => {
      const subscription = mockSubscriptions.basic;

      mockClient.from.mockImplementation((table: string) => {
        const qb = createMockQueryBuilder();
        if (table === 'organization_users') {
          qb.maybeSingle.mockResolvedValue(
            mockQueryResult(mockOrganizationUsers.adminMembership),
          );
        } else if (table === 'subscriptions') {
          qb.maybeSingle.mockResolvedValue(mockQueryResult(subscription));
        }
        return qb;
      });

      const result = await service.getSubscription(
        TEST_IDS.user,
        TEST_IDS.organization,
      );

      expect(result).toEqual(subscription);
    });

    it('should return null for user without organization membership', async () => {
      mockClient.from.mockImplementation((table: string) => {
        const qb = createMockQueryBuilder();
        if (table === 'organization_users') {
          qb.maybeSingle.mockResolvedValue(mockQueryResult(null));
        }
        return qb;
      });

      const result = await service.getSubscription(
        TEST_IDS.user,
        'other-org-id',
      );

      expect(result).toBeNull();
    });

    it('should return null when no subscription exists', async () => {
      mockClient.from.mockImplementation((table: string) => {
        const qb = createMockQueryBuilder();
        if (table === 'organization_users') {
          qb.maybeSingle.mockResolvedValue(
            mockQueryResult(mockOrganizationUsers.adminMembership),
          );
        } else if (table === 'subscriptions') {
          qb.maybeSingle.mockResolvedValue(mockQueryResult(null));
        }
        return qb;
      });

      const result = await service.getSubscription(
        TEST_IDS.user,
        TEST_IDS.organization,
      );

      expect(result).toBeNull();
    });
  });

  describe('getUsageCounts', () => {
    it('should return usage counts for organization', async () => {
      mockClient.from.mockImplementation((table: string) => {
        const qb = createMockQueryBuilder();
        if (table === 'organization_users') {
          qb.single.mockResolvedValue(
            mockQueryResult(mockOrganizationUsers.adminMembership),
          );
        } else if (table === 'farms') {
          qb.eq.mockResolvedValue({
            count: 3,
            data: [{ id: 'f1' }, { id: 'f2' }, { id: 'f3' }],
            error: null,
          });
        } else if (table === 'parcels') {
          qb.in = jest.fn().mockResolvedValue({ count: 15, error: null });
        }
        return qb;
      });

      const result = await service.getUsageCounts(
        TEST_IDS.user,
        TEST_IDS.organization,
      );

      expect(result.farms_count).toBeDefined();
      expect(result.parcels_count).toBeDefined();
      expect(result.users_count).toBeDefined();
    });

    it('should reject if user does not have access', async () => {
      mockClient.from.mockImplementation((table: string) => {
        const qb = createMockQueryBuilder();
        if (table === 'organization_users') {
          qb.single.mockResolvedValue(
            mockQueryResult(null, { message: 'Not found' }),
          );
        }
        return qb;
      });

      await expect(
        service.getUsageCounts(TEST_IDS.user, 'other-org-id'),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
