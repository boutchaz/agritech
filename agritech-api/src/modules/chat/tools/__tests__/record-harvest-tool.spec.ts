import { getChatToolsServiceMockProviders } from './test-helpers';
import { Test, TestingModule } from '@nestjs/testing';
import { ChatToolsService } from '../chat-tools.service';
import { PendingActionService } from '../pending-action.service';
import { TasksService } from '../../../tasks/tasks.service';
import { AnnualPlanService } from '../../../annual-plan/annual-plan.service';
import { CaslAbilityFactory } from '../../../casl/casl-ability.factory';
import { DatabaseService } from '../../../database/database.service';

describe('record_harvest tool', () => {
  let service: ChatToolsService;
  let mockPendingActionService: jest.Mocked<PendingActionService>;

  const userId = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';
  const orgId = 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e';
  const parcelId = 'c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f';
  const farmId = 'd4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f80';

  beforeEach(async () => {
    mockPendingActionService = {
      upsert: jest.fn().mockResolvedValue({ id: 'pending-id' }),
      load: jest.fn(),
      delete: jest.fn(),
    } as any;

    const buildLookupChain = (data: any) => {
      const singleMock = jest.fn().mockResolvedValue({ data, error: null });
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: singleMock,
              maybeSingle: singleMock,
            }),
            single: singleMock,
          }),
        }),
      };
    };

    const mockSupabase = {
      from: jest.fn((table: string) => {
        if (table === 'parcels') {
          return buildLookupChain({ id: parcelId, name: 'B3', crop_type: 'olives', farm_id: farmId });
        }
        if (table === 'farms') {
          return buildLookupChain({ id: farmId, name: 'Farm Meknes' });
        }
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

  it('should return preview_data with resolved parcel name, crop type, and defaults', async () => {
    const result = await service.executeTool(
      'record_harvest',
      {
        mode: 'preview',
        parcel_id: parcelId,
        quantity: 3,
        unit: 'tons',
      },
      userId,
      orgId,
    );

    expect(result.success).toBe(true);
    expect(result.preview_data).toBeDefined();
    expect(result.preview_data.action_type).toBe('record_harvest');
    expect(result.preview_data.parcel_name).toBe('B3');
    expect(result.preview_data.crop_type).toBe('olives');
    expect(result.preview_data.quantity).toBe(3);
    expect(result.preview_data.unit).toBe('tons');
    expect(result.preview_data.harvest_date).toBeDefined(); // defaults to today

    expect(mockPendingActionService.upsert).toHaveBeenCalled();
  });

  it('should return error for missing parcel', async () => {
    const mockSupabase = {
      from: jest.fn(() => ({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        }),
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
      'record_harvest',
      { mode: 'preview', parcel_id: parcelId, quantity: 3, unit: 'tons' },
      userId,
      orgId,
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('Parcel not found');
  });

  it('should be in tool definitions', () => {
    const defs = service.getToolDefinitions();
    const tool = defs.find((d) => d.function.name === 'record_harvest');
    expect(tool).toBeDefined();
    expect(tool!.function.parameters.required).toContain('mode');
    expect(tool!.function.parameters.required).toContain('parcel_id');
    expect(tool!.function.parameters.required).toContain('quantity');
    expect(tool!.function.parameters.required).toContain('unit');
  });
});
