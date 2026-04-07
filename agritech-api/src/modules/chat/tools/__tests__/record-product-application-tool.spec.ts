import { getChatToolsServiceMockProviders } from './test-helpers';
import { Test, TestingModule } from '@nestjs/testing';
import { ChatToolsService } from '../chat-tools.service';
import { PendingActionService } from '../pending-action.service';
import { TasksService } from '../../../tasks/tasks.service';
import { AnnualPlanService } from '../../../annual-plan/annual-plan.service';
import { CaslAbilityFactory } from '../../../casl/casl-ability.factory';
import { DatabaseService } from '../../../database/database.service';

describe('record_product_application tool', () => {
  let service: ChatToolsService;
  let mockPendingActionService: jest.Mocked<PendingActionService>;

  const userId = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';
  const orgId = 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e';
  const productId = 'c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f';
  const parcelId = 'd4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f80';
  const farmId = 'e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8091';

  const buildLookupChain = (data: any) => {
    const singleMock = jest.fn().mockResolvedValue({ data, error: null });
    return {
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({ single: singleMock, maybeSingle: singleMock }),
          single: singleMock,
        }),
      }),
    };
  };

  beforeEach(async () => {
    mockPendingActionService = {
      upsert: jest.fn().mockResolvedValue({ id: 'pending-id' }),
      load: jest.fn(),
      delete: jest.fn(),
    } as any;

    const mockSupabase = {
      from: jest.fn((table: string) => {
        if (table === 'items') return buildLookupChain({ id: productId, item_name: 'NPK 15-15-15' });
        if (table === 'parcels') return buildLookupChain({ id: parcelId, name: 'B3' });
        return buildLookupChain(null);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatToolsService,
        { provide: PendingActionService, useValue: mockPendingActionService },
        { provide: TasksService, useValue: { create: jest.fn() } },
        { provide: AnnualPlanService, useValue: { executeIntervention: jest.fn() } },
        { provide: CaslAbilityFactory, useValue: { hasPermission: jest.fn().mockResolvedValue(true) } },
        { provide: DatabaseService, useValue: { getAdminClient: jest.fn().mockReturnValue(mockSupabase) } },
        ...getChatToolsServiceMockProviders(),
      ],
    }).compile();

    service = module.get<ChatToolsService>(ChatToolsService);
  });

  it('should resolve product name and parcel name in preview', async () => {
    const result = await service.executeTool(
      'record_product_application',
      { mode: 'preview', product_id: productId, parcel_id: parcelId, farm_id: farmId, quantity_used: 50, area_treated: 2 },
      userId, orgId,
    );

    expect(result.success).toBe(true);
    expect(result.preview_data.product_name).toBe('NPK 15-15-15');
    expect(result.preview_data.parcel_name).toBe('B3');
    expect(result.preview_data.application_date).toBeDefined();
    expect(mockPendingActionService.upsert).toHaveBeenCalled();
  });

  it('should return error for non-existent product', async () => {
    const mockSupabase = {
      from: jest.fn(() => buildLookupChain(null)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatToolsService,
        { provide: PendingActionService, useValue: mockPendingActionService },
        { provide: TasksService, useValue: { create: jest.fn() } },
        { provide: AnnualPlanService, useValue: { executeIntervention: jest.fn() } },
        { provide: CaslAbilityFactory, useValue: { hasPermission: jest.fn().mockResolvedValue(true) } },
        { provide: DatabaseService, useValue: { getAdminClient: jest.fn().mockReturnValue(mockSupabase) } },
        ...getChatToolsServiceMockProviders(),
      ],
    }).compile();

    const svc = module.get<ChatToolsService>(ChatToolsService);
    const result = await svc.executeTool(
      'record_product_application',
      { mode: 'preview', product_id: productId, parcel_id: parcelId, farm_id: farmId, quantity_used: 50, area_treated: 2 },
      userId, orgId,
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('not found');
  });
});
