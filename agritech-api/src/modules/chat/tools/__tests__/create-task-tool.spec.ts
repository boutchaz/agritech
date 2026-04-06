import { getChatToolsServiceMockProviders } from './test-helpers';
import { Test, TestingModule } from '@nestjs/testing';
import { ChatToolsService } from '../chat-tools.service';
import { PendingActionService } from '../pending-action.service';
import { TasksService } from '../../../tasks/tasks.service';
import { AnnualPlanService } from '../../../annual-plan/annual-plan.service';
import { CaslAbilityFactory } from '../../../casl/casl-ability.factory';
import { DatabaseService } from '../../../database/database.service';

describe('create_task tool with mode=preview', () => {
  let service: ChatToolsService;
  let mockPendingActionService: jest.Mocked<PendingActionService>;
  let mockTasksService: jest.Mocked<Partial<TasksService>>;
  let mockSupabase: any;

  const userId = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';
  const orgId = 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e';
  const parcelId = 'c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f';
  const farmId = 'd4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f80';
  const workerId = 'e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8091';

  beforeEach(async () => {
    mockPendingActionService = {
      upsert: jest.fn().mockResolvedValue({
        id: 'pending-id',
        user_id: userId,
        organization_id: orgId,
        tool_name: 'create_task',
        parameters: {},
        preview_data: {},
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      }),
      load: jest.fn(),
      delete: jest.fn(),
    } as any;

    mockTasksService = {
      create: jest.fn().mockResolvedValue({ id: 'task-123' }),
    };

    const mockAnnualPlanService = {
      executeIntervention: jest.fn(),
    };

    const mockCaslAbilityFactory = {
      hasPermission: jest.fn().mockResolvedValue(true),
    };

    // Build supabase mock that resolves parcel, farm, and worker lookups
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
            maybeSingle: singleMock,
          }),
        }),
      };
    };

    mockSupabase = {
      from: jest.fn((table: string) => {
        if (table === 'parcels') {
          return buildLookupChain({ id: parcelId, name: 'B3', crop_type: 'olives', farm_id: farmId });
        }
        if (table === 'farms') {
          return buildLookupChain({ id: farmId, name: 'Farm Meknes' });
        }
        if (table === 'workers') {
          return buildLookupChain({ id: workerId, first_name: 'Ahmed', last_name: 'Benali' });
        }
        return buildLookupChain(null);
      }),
    };

    const mockDatabaseService = {
      getAdminClient: jest.fn().mockReturnValue(mockSupabase),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatToolsService,
        { provide: PendingActionService, useValue: mockPendingActionService },
        { provide: TasksService, useValue: mockTasksService },
        { provide: AnnualPlanService, useValue: mockAnnualPlanService },
        { provide: CaslAbilityFactory, useValue: mockCaslAbilityFactory },
        { provide: DatabaseService, useValue: mockDatabaseService },
        ...getChatToolsServiceMockProviders(),
      ],
    }).compile();

    service = module.get<ChatToolsService>(ChatToolsService);
  });

  it('should return preview_data with resolved names and store pending action (NOT execute)', async () => {
    const result = await service.executeTool(
      'create_task',
      {
        mode: 'preview',
        parcel_id: parcelId,
        farm_id: farmId,
        title: 'Irriguer B3',
        description: 'Irrigation urgente',
        priority: 'high',
        task_type: 'irrigation',
        assigned_to: workerId,
      },
      userId,
      orgId,
    );

    expect(result.success).toBe(true);
    expect(result.preview_data).toBeDefined();
    expect(result.preview_data.parcel_name).toBe('B3');
    expect(result.preview_data.farm_name).toBe('Farm Meknes');
    expect(result.preview_data.worker_name).toBe('Ahmed Benali');
    expect(result.preview_data.title).toBe('Irriguer B3');

    // Should store pending action
    expect(mockPendingActionService.upsert).toHaveBeenCalledWith(
      userId,
      orgId,
      'create_task',
      expect.objectContaining({ title: 'Irriguer B3' }),
      expect.objectContaining({ parcel_name: 'B3' }),
    );

    // Should NOT have called TasksService.create
    expect(mockTasksService.create).not.toHaveBeenCalled();
  });

  it('should include mode param in tool definition', () => {
    const defs = service.getToolDefinitions();
    const createTask = defs.find((d) => d.function.name === 'create_task');
    expect(createTask).toBeDefined();
    expect(createTask!.function.parameters.properties.mode).toBeDefined();
    expect(createTask!.function.parameters.properties.mode.enum).toContain('preview');
  });
});
