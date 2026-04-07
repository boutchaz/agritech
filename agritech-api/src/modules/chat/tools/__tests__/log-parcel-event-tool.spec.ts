import { getChatToolsServiceMockProviders } from './test-helpers';
import { Test, TestingModule } from '@nestjs/testing';
import { ChatToolsService } from '../chat-tools.service';
import { PendingActionService } from '../pending-action.service';
import { TasksService } from '../../../tasks/tasks.service';
import { AnnualPlanService } from '../../../annual-plan/annual-plan.service';
import { CaslAbilityFactory } from '../../../casl/casl-ability.factory';
import { DatabaseService } from '../../../database/database.service';

describe('log_parcel_event tool', () => {
  let service: ChatToolsService;
  let mockPendingActionService: jest.Mocked<PendingActionService>;

  const userId = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';
  const orgId = 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e';
  const parcelId = 'c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f';

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

  it('should show event type, parcel name, and recalibrage warning flag', async () => {
    const result = await service.executeTool(
      'log_parcel_event',
      { mode: 'preview', parcel_id: parcelId, type: 'disease', description: 'Verticillium wilt detected', recalibrage_requis: true },
      userId, orgId,
    );

    expect(result.success).toBe(true);
    expect(result.preview_data.action_type).toBe('log_parcel_event');
    expect(result.preview_data.parcel_name).toBe('B3');
    expect(result.preview_data.event_type).toBe('disease');
    expect(result.preview_data.recalibrage_warning).toBe(true);
    expect(mockPendingActionService.upsert).toHaveBeenCalled();
  });

  it('should default recalibrage_requis to false', async () => {
    const result = await service.executeTool(
      'log_parcel_event',
      { mode: 'preview', parcel_id: parcelId, type: 'frost' },
      userId, orgId,
    );

    expect(result.success).toBe(true);
    expect(result.preview_data.recalibrage_warning).toBe(false);
  });
});
