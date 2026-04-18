import { getChatToolsServiceMockProviders } from './test-helpers';
import { Test, TestingModule } from '@nestjs/testing';
import { ChatToolsService } from '../chat-tools.service';
import { PendingActionService } from '../pending-action.service';
import { TasksService } from '../../../tasks/tasks.service';
import { AnnualPlanService } from '../../../annual-plan/annual-plan.service';
import { CaslAbilityFactory } from '../../../casl/casl-ability.factory';
import { DatabaseService } from '../../../database/database.service';

describe('record_stock_entry tool', () => {
  let service: ChatToolsService;
  let mockPendingActionService: jest.Mocked<PendingActionService>;

  const userId = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';
  const orgId = 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e';
  const itemId = 'c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f';
  const warehouseId = 'd4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f80';

  beforeEach(async () => {
    mockPendingActionService = {
      upsert: jest.fn().mockResolvedValue({ id: 'pending-id' }),
      load: jest.fn(),
      delete: jest.fn(),
    } as any;

    const buildLookupChain = (data: any) => {
      const singleMock = jest.fn().mockResolvedValue({ data, error: null });
      return { select: jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue({ single: singleMock }), single: singleMock }) }) };
    };

    const mockSupabase = {
      from: jest.fn((table: string) => {
        if (table === 'items') return buildLookupChain({ id: itemId, item_name: 'Engrais NPK' });
        if (table === 'warehouses') return buildLookupChain({ id: warehouseId, name: 'Magasin Principal' });
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

  it('should resolve item names and warehouse names in preview', async () => {
    const result = await service.executeTool(
      'record_stock_entry',
      {
        mode: 'preview',
        entry_type: 'Material Receipt',
        items: [{ item_id: itemId, quantity: 500, unit: 'kg' }],
        to_warehouse_id: warehouseId,
      },
      userId, orgId,
    );

    expect(result.success).toBe(true);
    expect(result.preview_data.action_type).toBe('record_stock_entry');
    expect(result.preview_data.entry_type).toBe('Material Receipt');
    expect(result.preview_data.items[0].item_name).toBe('Engrais NPK');
    expect(result.preview_data.items[0].quantity).toBe(500);
    expect(result.preview_data.to_warehouse_name).toBe('Magasin Principal');
    expect(mockPendingActionService.upsert).toHaveBeenCalled();
  });

  it('should return error for invalid item', async () => {
    const mockSupabase = {
      from: jest.fn(() => ({
        select: jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue({ eq: jest.fn().mockReturnValue({ single: jest.fn().mockResolvedValue({ data: null, error: null }) }) }) }),
      })),
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
      'record_stock_entry',
      { mode: 'preview', entry_type: 'Material Receipt', items: [{ item_id: 'bad-id', quantity: 100, unit: 'kg' }] },
      userId, orgId,
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('Item not found');
  });
});
