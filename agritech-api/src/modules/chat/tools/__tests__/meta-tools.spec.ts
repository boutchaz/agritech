import { getChatToolsServiceMockProviders } from './test-helpers';
import { Test, TestingModule } from '@nestjs/testing';
import { ChatToolsService } from '../chat-tools.service';
import { PendingActionService, PendingAction } from '../pending-action.service';
import { TasksService } from '../../../tasks/tasks.service';
import { AnnualPlanService } from '../../../annual-plan/annual-plan.service';
import { CaslAbilityFactory } from '../../../casl/casl-ability.factory';
import { DatabaseService } from '../../../database/database.service';

describe('Meta-tools: confirm & cancel pending action', () => {
  let service: ChatToolsService;
  let mockPendingActionService: jest.Mocked<PendingActionService>;
  let mockTasksService: jest.Mocked<Partial<TasksService>>;

  const userId = '11111111-1111-1111-1111-111111111111';
  const orgId = '22222222-2222-2222-2222-222222222222';

  const makePendingAction = (overrides?: Partial<PendingAction>): PendingAction => ({
    id: 'pending-id',
    user_id: userId,
    organization_id: orgId,
    tool_name: 'create_task',
    parameters: {
      farm_id: 'farm-1',
      parcel_id: 'parcel-1',
      title: 'Irriguer B3',
      description: 'Irrigation test',
      priority: 'high',
      task_type: 'irrigation',
    },
    preview_data: { title: 'Irriguer B3', parcel_name: 'B3' },
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    ...overrides,
  });

  beforeEach(async () => {
    mockPendingActionService = {
      upsert: jest.fn(),
      load: jest.fn(),
      delete: jest.fn(),
    } as any;

    mockTasksService = {
      create: jest.fn().mockResolvedValue({ id: 'task-123' }),
    };

    const mockAnnualPlanService = {
      executeIntervention: jest.fn().mockResolvedValue(undefined),
    };

    const mockCaslAbilityFactory = {
      hasPermission: jest.fn().mockResolvedValue(true),
    };

    const mockDatabaseService = {
      getAdminClient: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: null, error: null }),
                maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
          }),
        }),
      }),
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

  describe('tool definitions', () => {
    it('should include confirm_pending_action and cancel_pending_action', () => {
      const defs = service.getToolDefinitions();
      const names = defs.map((d) => d.function.name);
      expect(names).toContain('confirm_pending_action');
      expect(names).toContain('cancel_pending_action');
    });
  });

  describe('confirm_pending_action', () => {
    it('should execute the pending action and delete it on success', async () => {
      const pending = makePendingAction();
      mockPendingActionService.load.mockResolvedValue(pending);

      const result = await service.executeTool(
        'confirm_pending_action',
        {},
        userId,
        orgId,
      );

      expect(mockPendingActionService.load).toHaveBeenCalledWith(userId, orgId);
      expect(mockTasksService.create).toHaveBeenCalledWith(
        userId,
        orgId,
        expect.objectContaining({ title: 'Irriguer B3' }),
      );
      expect(mockPendingActionService.delete).toHaveBeenCalledWith(userId, orgId);
      expect(result).toEqual(
        expect.objectContaining({ success: true }),
      );
    });

    it('should return error when no pending action exists', async () => {
      mockPendingActionService.load.mockResolvedValue(null);

      const result = await service.executeTool(
        'confirm_pending_action',
        {},
        userId,
        orgId,
      );

      expect(result).toEqual(
        expect.objectContaining({
          success: false,
          error: expect.stringContaining('No pending action'),
        }),
      );
      expect(mockTasksService.create).not.toHaveBeenCalled();
    });
  });

  describe('cancel_pending_action', () => {
    it('should delete the pending action and confirm cancellation', async () => {
      mockPendingActionService.load.mockResolvedValue(makePendingAction());

      const result = await service.executeTool(
        'cancel_pending_action',
        {},
        userId,
        orgId,
      );

      expect(mockPendingActionService.delete).toHaveBeenCalledWith(userId, orgId);
      expect(result).toEqual(
        expect.objectContaining({ success: true }),
      );
    });
  });
});
