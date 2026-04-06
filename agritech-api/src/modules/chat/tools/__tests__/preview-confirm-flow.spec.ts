import { getChatToolsServiceMockProviders } from './test-helpers';
import { Test, TestingModule } from '@nestjs/testing';
import { ChatToolsService } from '../chat-tools.service';
import { PendingActionService, PendingAction } from '../pending-action.service';
import { TasksService } from '../../../tasks/tasks.service';
import { AnnualPlanService } from '../../../annual-plan/annual-plan.service';
import { CaslAbilityFactory } from '../../../casl/casl-ability.factory';
import { DatabaseService } from '../../../database/database.service';
import { HarvestsService } from '../../../harvests/harvests.service';

describe('Preview → Refine → Confirm flow (integration)', () => {
  let service: ChatToolsService;
  let pendingStore: PendingAction | null = null;
  let mockHarvestsService: { create: jest.Mock };

  const userId = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';
  const orgId = 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e';
  const parcelId = 'c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f';
  const farmId = 'd4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f80';

  beforeEach(async () => {
    pendingStore = null;
    mockHarvestsService = { create: jest.fn().mockResolvedValue({ id: 'harvest-123' }) };

    // Simulate real pending action storage in-memory
    const mockPendingActionService = {
      upsert: jest.fn().mockImplementation((_uid, _oid, toolName, params, preview) => {
        pendingStore = {
          id: 'pending-id',
          user_id: _uid,
          organization_id: _oid,
          tool_name: toolName,
          parameters: params,
          preview_data: preview,
          created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        };
        return Promise.resolve(pendingStore);
      }),
      load: jest.fn().mockImplementation(() => Promise.resolve(pendingStore)),
      delete: jest.fn().mockImplementation(() => {
        pendingStore = null;
        return Promise.resolve();
      }),
    };

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

    const mockSupabase = {
      from: jest.fn((table: string) => {
        if (table === 'parcels') return buildLookupChain({ id: parcelId, name: 'B3', crop_type: 'olives', farm_id: farmId });
        if (table === 'farms') return buildLookupChain({ id: farmId, name: 'Farm Meknes' });
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
        { provide: HarvestsService, useValue: mockHarvestsService },
        ...getChatToolsServiceMockProviders().filter(p => (p as any).provide !== HarvestsService),
      ],
    }).compile();

    service = module.get<ChatToolsService>(ChatToolsService);
  });

  it('should preview → refine → confirm a harvest', async () => {
    // Step 1: Preview with quantity=3
    const preview1 = await service.executeTool(
      'record_harvest',
      { mode: 'preview', parcel_id: parcelId, quantity: 3, unit: 'tons' },
      userId,
      orgId,
    );

    expect(preview1.success).toBe(true);
    expect(preview1.preview_data.quantity).toBe(3);
    expect(pendingStore).not.toBeNull();
    expect(pendingStore!.parameters.quantity).toBe(3);

    // Step 2: Refine — user says "non, 5 tonnes"
    const preview2 = await service.executeTool(
      'record_harvest',
      { mode: 'preview', parcel_id: parcelId, quantity: 5, unit: 'tons' },
      userId,
      orgId,
    );

    expect(preview2.success).toBe(true);
    expect(preview2.preview_data.quantity).toBe(5);
    expect(pendingStore!.parameters.quantity).toBe(5); // updated

    // Step 3: Confirm
    const confirm = await service.executeTool(
      'confirm_pending_action',
      {},
      userId,
      orgId,
    );

    expect(confirm.success).toBe(true);
    expect(confirm.result.harvest_id).toBe('harvest-123');

    // Verify HarvestService.create was called with quantity=5
    expect(mockHarvestsService.create).toHaveBeenCalledWith(
      userId,
      orgId,
      expect.objectContaining({ quantity: 5 }),
    );

    // Pending action should be deleted
    expect(pendingStore).toBeNull();
  });

  it('should cancel a pending action', async () => {
    // Preview
    await service.executeTool(
      'record_harvest',
      { mode: 'preview', parcel_id: parcelId, quantity: 3, unit: 'tons' },
      userId,
      orgId,
    );

    expect(pendingStore).not.toBeNull();

    // Cancel
    const cancel = await service.executeTool('cancel_pending_action', {}, userId, orgId);

    expect(cancel.success).toBe(true);
    expect(pendingStore).toBeNull();
    expect(mockHarvestsService.create).not.toHaveBeenCalled();
  });
});
