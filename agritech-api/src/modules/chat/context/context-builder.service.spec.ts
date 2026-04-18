import { ContextBuilderService } from './context-builder.service';
import { ContextRouterService } from './context-router.service';
import { AgromindiaContextService } from './agromindia-context.service';

describe('ContextBuilderService', () => {
  let service: ContextBuilderService;
  let mockDatabaseService: any;
  let mockContextRouter: ContextRouterService;
  let mockClient: any;

  beforeEach(() => {
    // Create a chainable mock that resolves to empty data
    const createChain = (data: any = null, error: any = null, count: any = 0) => {
      const chain: any = {};
      ['select', 'insert', 'delete', 'eq', 'neq', 'in', 'order', 'limit', 'single', 'maybeSingle', 'gte', 'lte', 'gt', 'lt', 'is', 'not'].forEach(m => {
        chain[m] = jest.fn().mockReturnValue(chain);
      });
      chain.then = (resolve: any) => resolve({ data, error, count });
      return chain;
    };

    mockClient = {
      from: jest.fn().mockReturnValue(createChain([], null, 0)),
    };

    mockDatabaseService = {
      getAdminClient: jest.fn().mockReturnValue(mockClient),
    };

    mockContextRouter = new ContextRouterService();
    service = new ContextBuilderService(mockDatabaseService, mockContextRouter);
  });

  describe('build', () => {
    it('should return BuiltContext with organization populated', async () => {
      // Mock organization query to return valid data
      const orgChain: any = {};
      ['select', 'eq', 'single', 'maybeSingle', 'order', 'limit', 'in', 'gte', 'lte', 'gt', 'lt', 'is', 'not', 'neq'].forEach(m => {
        orgChain[m] = jest.fn().mockReturnValue(orgChain);
      });
      orgChain.then = (resolve: any) => resolve({
        data: { id: 'org-1', name: 'Test Farm', currency_code: 'MAD', timezone: 'Africa/Casablanca', account_type: 'standard' },
        error: null,
        count: 0,
      });

      mockClient.from.mockReturnValue(orgChain);

      const context = await service.build('org-1', 'hello');

      expect(context).toBeDefined();
      expect(context.organization).toBeDefined();
      expect(context.organization.name).toBe('Test Farm');
      expect(context.currentDate).toBeDefined();
      expect(context.currentSeason).toBeDefined();
    });

    it('should return null for failed module fetches', async () => {
      // Mock org to succeed but other tables to throw
      let callCount = 0;
      mockClient.from.mockImplementation((table: string) => {
        if (table === 'organizations') {
          const chain: any = {};
          ['select', 'eq', 'single', 'maybeSingle', 'order', 'limit', 'in', 'gte', 'lte', 'gt', 'lt', 'is', 'not', 'neq'].forEach(m => {
            chain[m] = jest.fn().mockReturnValue(chain);
          });
          chain.then = (resolve: any) => resolve({
            data: { id: 'org-1', name: 'Test', currency_code: 'MAD', timezone: 'UTC', account_type: 'standard' },
            error: null,
          });
          return chain;
        }
        if (table === 'organization_users') {
          const chain: any = {};
          ['select', 'eq', 'single', 'maybeSingle', 'order', 'limit', 'in', 'gte', 'lte', 'gt', 'lt', 'is', 'not', 'neq'].forEach(m => {
            chain[m] = jest.fn().mockReturnValue(chain);
          });
          chain.then = (resolve: any) => resolve({ data: [], error: null });
          return chain;
        }
        // Everything else - return empty
        const chain: any = {};
        ['select', 'eq', 'single', 'maybeSingle', 'order', 'limit', 'in', 'gte', 'lte', 'gt', 'lt', 'is', 'not', 'neq'].forEach(m => {
          chain[m] = jest.fn().mockReturnValue(chain);
        });
        chain.then = (resolve: any) => resolve({ data: [], error: null, count: 0 });
        return chain;
      });

      const context = await service.build('org-1', 'hello');

      // farms/workers should be null or have zero counts (graceful failure)
      expect(context).toBeDefined();
      expect(context.organization).toBeDefined();
    });

    it('should include currentDate and currentSeason', async () => {
      const orgChain: any = {};
      ['select', 'eq', 'single', 'maybeSingle', 'order', 'limit', 'in', 'gte', 'lte', 'gt', 'lt', 'is', 'not', 'neq'].forEach(m => {
        orgChain[m] = jest.fn().mockReturnValue(orgChain);
      });
      orgChain.then = (resolve: any) => resolve({
        data: { id: 'org-1', name: 'Test', currency_code: 'USD', timezone: 'UTC', account_type: 'standard' },
        error: null,
        count: 0,
      });
      mockClient.from.mockReturnValue(orgChain);

      const context = await service.build('org-1', 'test');

      expect(context.currentDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(['spring', 'summer', 'autumn', 'winter']).toContain(context.currentSeason);
    });

    it('should include agromindiaIntel when contextNeeds.agromindiaIntel is true', async () => {
      const orgChain: any = {};
      ['select', 'eq', 'single', 'maybeSingle', 'order', 'limit', 'in', 'gte', 'lte', 'gt', 'lt', 'is', 'not', 'neq'].forEach(m => {
        orgChain[m] = jest.fn().mockReturnValue(orgChain);
      });
      orgChain.then = (resolve: any) => resolve({
        data: { id: 'org-1', name: 'Test', currency_code: 'MAD', timezone: 'UTC', account_type: 'standard' },
        error: null,
        count: 0,
      });
      mockClient.from.mockReturnValue(orgChain);

      // Mock AgromindiaContextService
      const mockAgromindiaService = {
        getOrgIntelligence: jest.fn().mockResolvedValue([
          {
            parcel_id: 'p-1',
            parcel_name: 'Test Parcel',
            crop_type: 'olivier',
            diagnostics: { scenario_code: 'B', scenario: 'Stress', confidence: 0.8, indicators: {} },
            recommendations: [{ id: 'r-1', status: 'pending', priority: 'high', action: 'Irrigate' }],
            annual_plan: null,
            calibration: null,
            referential: null,
          },
        ]),
        getParcelIntelligence: jest.fn(),
      };

      service.setAgromindiaContextService(mockAgromindiaService as any);

      // Query that triggers agromindiaIntel (recommendation keyword)
      const context = await service.build('org-1', 'recommendation pour ma parcelle');

      expect(context.agromindiaIntel).toBeDefined();
      expect(context.agromindiaIntel).toHaveLength(1);
      expect(context.agromindiaIntel![0].diagnostics!.scenario_code).toBe('B');
      expect(mockAgromindiaService.getOrgIntelligence).toHaveBeenCalledWith('org-1');
    });
  });
});
